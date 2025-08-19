#!/usr/bin/env python3
"""
SRE Dashboard and Visualization System for 6FB AI Agent System

This module provides comprehensive dashboards and visualizations for:
- SLO/SLI monitoring and error budget tracking
- System health overview
- Performance metrics and baselines
- Capacity planning insights
- Alert status and incident tracking
- Real-time monitoring dashboards
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
from pathlib import Path

# Import our SRE components
from sre_framework import SREFramework
from health_checks import HealthCheckManager
from auto_recovery import RecoveryOrchestrator
from incident_response import IncidentManager
from alerting_strategy import AlertManager

logger = logging.getLogger(__name__)


@dataclass
class DashboardMetrics:
    """Consolidated metrics for dashboard display"""
    timestamp: datetime
    
    # System health
    overall_health: str
    health_score: int
    
    # SLO status
    slos_healthy: int
    slos_warning: int
    slos_critical: int
    
    # Alerts
    active_alerts: int
    critical_alerts: int
    
    # Incidents
    open_incidents: int
    mttr_hours: float
    
    # Capacity
    capacity_critical: int
    capacity_warning: int
    
    # Performance
    api_response_time_p95: float
    error_rate_percent: float
    throughput_rps: float


class WebSocketManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, data: Dict[str, Any]):
        """Broadcast data to all connected clients"""
        if not self.active_connections:
            return
        
        message = json.dumps(data, default=str)
        disconnected = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.warning(f"Failed to send WebSocket message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)


class SREDashboard:
    """Main SRE dashboard application"""
    
    def __init__(self, host: str = "0.0.0.0", port: int = 8080):
        self.host = host
        self.port = port
        
        # Initialize FastAPI app
        self.app = FastAPI(title="6FB AI Agent System - SRE Dashboard", version="1.0.0")
        
        # Initialize SRE components
        self.sre_framework = SREFramework()
        self.health_manager = HealthCheckManager()
        self.recovery_orchestrator = RecoveryOrchestrator()
        self.incident_manager = IncidentManager()
        self.alert_manager = AlertManager()
        
        # WebSocket manager for real-time updates
        self.websocket_manager = WebSocketManager()
        
        # Metrics cache
        self.metrics_cache: Dict[str, Any] = {}
        self.cache_ttl_seconds = 30
        
        # Set up routes and static files
        self._setup_routes()
        self._setup_templates()
        
        # Background tasks
        self.monitoring_task: Optional[asyncio.Task] = None
        self.is_running = False
    
    def _setup_routes(self):
        """Set up FastAPI routes"""
        
        # Serve static files
        static_path = Path(__file__).parent / "static"
        static_path.mkdir(exist_ok=True)
        self.app.mount("/static", StaticFiles(directory=static_path), name="static")
        
        # WebSocket endpoint for real-time updates
        @self.app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            await self.websocket_manager.connect(websocket)
            try:
                while True:
                    # Keep connection alive and handle client messages
                    data = await websocket.receive_text()
                    # Echo back for connection testing
                    await websocket.send_text(f"Echo: {data}")
            except WebSocketDisconnect:
                self.websocket_manager.disconnect(websocket)
        
        # Main dashboard
        @self.app.get("/", response_class=HTMLResponse)
        async def dashboard_home(request: Request):
            return await self.render_dashboard(request)
        
        # API endpoints
        @self.app.get("/api/health")
        async def health_check():
            return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
        
        @self.app.get("/api/metrics")
        async def get_metrics():
            return await self.get_dashboard_metrics()
        
        @self.app.get("/api/slo-status")
        async def get_slo_status():
            return self.sre_framework.slo_manager.get_all_slo_status()
        
        @self.app.get("/api/health-checks")
        async def get_health_checks():
            return self.health_manager.get_health_summary()
        
        @self.app.get("/api/alerts")
        async def get_alerts():
            return {
                "active_alerts": [alert.to_dict() for alert in self.alert_manager.get_active_alerts()],
                "summary": self.alert_manager.get_alert_summary()
            }
        
        @self.app.get("/api/incidents")
        async def get_incidents():
            return {
                "open_incidents": [incident.to_dict() for incident in self.incident_manager.get_open_incidents()],
                "metrics": self.incident_manager.get_incident_metrics()
            }
        
        @self.app.get("/api/capacity")
        async def get_capacity():
            return self.sre_framework.capacity_planner.get_capacity_summary()
        
        @self.app.get("/api/performance")
        async def get_performance():
            return self.sre_framework.baseline_manager.get_performance_summary()
        
        @self.app.get("/api/recovery-status")
        async def get_recovery_status():
            return self.recovery_orchestrator.get_recovery_status()
        
        # Control endpoints
        @self.app.post("/api/alerts/{alert_id}/acknowledge")
        async def acknowledge_alert(alert_id: str, request: Request):
            body = await request.json()
            acknowledged_by = body.get("acknowledged_by", "dashboard")
            
            success = self.alert_manager.acknowledge_alert(alert_id, acknowledged_by)
            if success:
                return {"status": "acknowledged", "alert_id": alert_id}
            else:
                raise HTTPException(status_code=404, detail="Alert not found")
        
        @self.app.post("/api/recovery/trigger")
        async def trigger_recovery(request: Request):
            body = await request.json()
            rule_name = body.get("rule_name")
            metadata = body.get("metadata", {})
            
            execution_id = await self.recovery_orchestrator.manual_recovery(rule_name, metadata)
            if execution_id:
                return {"status": "triggered", "execution_id": execution_id}
            else:
                raise HTTPException(status_code=400, detail="Failed to trigger recovery")
        
        @self.app.post("/api/health-checks/{check_name}/run")
        async def run_health_check(check_name: str):
            result = await self.health_manager.run_specific_check(check_name)
            if result:
                return result.to_dict()
            else:
                raise HTTPException(status_code=404, detail="Health check not found")
    
    def _setup_templates(self):
        """Set up Jinja2 templates"""
        templates_path = Path(__file__).parent / "templates"
        templates_path.mkdir(exist_ok=True)
        self.templates = Jinja2Templates(directory=templates_path)
        
        # Create default dashboard template if it doesn't exist
        dashboard_template_path = templates_path / "dashboard.html"
        if not dashboard_template_path.exists():
            self._create_dashboard_template(dashboard_template_path)
    
    def _create_dashboard_template(self, template_path: Path):
        """Create default dashboard HTML template"""
        template_content = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>6FB AI Agent System - SRE Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f7fa; }
        
        .header { background: #2c3e50; color: white; padding: 1rem 2rem; }
        .header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; }
        .header .subtitle { opacity: 0.8; font-size: 0.9rem; }
        
        .main-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; padding: 2rem; }
        .wide-section { grid-column: span 3; }
        .section { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        
        .metric-card { text-align: center; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; }
        .metric-card.healthy { background: #d4edda; color: #155724; }
        .metric-card.warning { background: #fff3cd; color: #856404; }
        .metric-card.critical { background: #f8d7da; color: #721c24; }
        
        .metric-value { font-size: 2rem; font-weight: bold; margin-bottom: 0.5rem; }
        .metric-label { font-size: 0.9rem; opacity: 0.8; }
        
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-healthy { background: #28a745; }
        .status-warning { background: #ffc107; }
        .status-critical { background: #dc3545; }
        
        .alert-item, .incident-item { 
            padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 4px; border-left: 4px solid;
        }
        .alert-critical { border-color: #dc3545; background: #f8d7da; }
        .alert-high { border-color: #fd7e14; background: #fff3cd; }
        .alert-medium { border-color: #ffc107; background: #fff3cd; }
        
        .chart-container { position: relative; height: 300px; margin-top: 1rem; }
        
        .refresh-time { text-align: center; margin-top: 1rem; font-size: 0.8rem; color: #666; }
        
        .btn { 
            background: #007bff; color: white; border: none; padding: 0.5rem 1rem; 
            border-radius: 4px; cursor: pointer; font-size: 0.9rem;
        }
        .btn:hover { background: #0056b3; }
        .btn-small { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
        
        .loading { opacity: 0.6; pointer-events: none; }
        
        @media (max-width: 768px) {
            .main-grid { grid-template-columns: 1fr; }
            .wide-section { grid-column: span 1; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ SRE Dashboard</h1>
        <div class="subtitle">6FB AI Agent System - Site Reliability Engineering</div>
    </div>
    
    <div class="main-grid">
        <!-- System Health Overview -->
        <div class="section">
            <h2>🎯 System Health</h2>
            <div id="health-metrics">
                <div class="metric-card healthy">
                    <div class="metric-value" id="health-score">--</div>
                    <div class="metric-label">Health Score</div>
                </div>
                <div id="health-status">
                    <span class="status-indicator status-healthy"></span>
                    <span id="overall-status">Loading...</span>
                </div>
            </div>
        </div>
        
        <!-- SLO Status -->
        <div class="section">
            <h2>📊 SLO Status</h2>
            <div id="slo-metrics">
                <div style="display: flex; justify-content: space-between;">
                    <div style="text-align: center;">
                        <div class="metric-value" id="slos-healthy" style="color: #28a745;">--</div>
                        <div class="metric-label">Healthy</div>
                    </div>
                    <div style="text-align: center;">
                        <div class="metric-value" id="slos-warning" style="color: #ffc107;">--</div>
                        <div class="metric-label">Warning</div>
                    </div>
                    <div style="text-align: center;">
                        <div class="metric-value" id="slos-critical" style="color: #dc3545;">--</div>
                        <div class="metric-label">Critical</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Active Alerts -->
        <div class="section">
            <h2>🚨 Active Alerts</h2>
            <div class="metric-card" id="alert-summary">
                <div class="metric-value" id="active-alerts-count">--</div>
                <div class="metric-label">Active Alerts</div>
            </div>
            <div id="alert-list" style="max-height: 200px; overflow-y: auto;">
                <!-- Alerts will be populated here -->
            </div>
        </div>
        
        <!-- Performance Metrics -->
        <div class="section wide-section">
            <h2>⚡ Performance Metrics</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
                <div class="metric-card healthy">
                    <div class="metric-value" id="response-time">--ms</div>
                    <div class="metric-label">API Response Time (P95)</div>
                </div>
                <div class="metric-card healthy">
                    <div class="metric-value" id="error-rate">--%</div>
                    <div class="metric-label">Error Rate</div>
                </div>
                <div class="metric-card healthy">
                    <div class="metric-value" id="throughput">-- RPS</div>
                    <div class="metric-label">Throughput</div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="performance-chart"></canvas>
            </div>
        </div>
        
        <!-- Incidents -->
        <div class="section">
            <h2>🔥 Incidents</h2>
            <div class="metric-card" id="incident-summary">
                <div class="metric-value" id="open-incidents">--</div>
                <div class="metric-label">Open Incidents</div>
            </div>
            <div style="text-align: center; margin-top: 1rem;">
                <div style="font-size: 1.2rem; font-weight: bold;" id="mttr">-- hours</div>
                <div class="metric-label">MTTR (30 days)</div>
            </div>
        </div>
        
        <!-- Capacity Planning -->
        <div class="section">
            <h2>📈 Capacity</h2>
            <div id="capacity-status">
                <div style="margin-bottom: 1rem;">
                    <span class="status-indicator" id="capacity-indicator"></span>
                    <span id="capacity-overall">Loading...</span>
                </div>
                <div style="font-size: 0.9rem;">
                    <div>Critical: <span id="capacity-critical">--</span></div>
                    <div>Warning: <span id="capacity-warning">--</span></div>
                </div>
            </div>
        </div>
        
        <!-- Recovery Status -->
        <div class="section">
            <h2>🔄 Auto-Recovery</h2>
            <div id="recovery-metrics">
                <div class="metric-card healthy">
                    <div class="metric-value" id="recovery-success-rate">--%</div>
                    <div class="metric-label">Success Rate (24h)</div>
                </div>
                <div style="margin-top: 1rem; font-size: 0.9rem;">
                    <div>Active: <span id="active-recoveries">--</span></div>
                    <div>Rules: <span id="recovery-rules">--</span></div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="refresh-time" id="last-updated">Last updated: --</div>
    
    <script>
        let ws = null;
        let performanceChart = null;
        
        // Initialize WebSocket connection
        function initWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws`;
            
            ws = new WebSocket(wsUrl);
            
            ws.onopen = function() {
                console.log('WebSocket connected');
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'metrics_update') {
                    updateDashboard(data.metrics);
                }
            };
            
            ws.onclose = function() {
                console.log('WebSocket disconnected, attempting to reconnect...');
                setTimeout(initWebSocket, 5000);
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }
        
        // Initialize performance chart
        function initPerformanceChart() {
            const ctx = document.getElementById('performance-chart').getContext('2d');
            performanceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: [],
                        borderColor: '#007bff',
                        backgroundColor: 'rgba(0, 123, 255, 0.1)',
                        tension: 0.1
                    }, {
                        label: 'Error Rate (%)',
                        data: [],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: { display: true, text: 'Response Time (ms)' }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: { display: true, text: 'Error Rate (%)' },
                            grid: { drawOnChartArea: false }
                        }
                    }
                }
            });
        }
        
        // Fetch and update dashboard data
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to fetch metrics:', error);
            }
        }
        
        // Update dashboard with new data
        function updateDashboard(data) {
            // System Health
            document.getElementById('health-score').textContent = data.health_score || '--';
            document.getElementById('overall-status').textContent = data.overall_health || 'Unknown';
            
            const healthCard = document.querySelector('#health-metrics .metric-card');
            healthCard.className = `metric-card ${data.overall_health || 'healthy'}`;
            
            // SLO Status
            document.getElementById('slos-healthy').textContent = data.slos_healthy || '--';
            document.getElementById('slos-warning').textContent = data.slos_warning || '--';
            document.getElementById('slos-critical').textContent = data.slos_critical || '--';
            
            // Alerts
            document.getElementById('active-alerts-count').textContent = data.active_alerts || '--';
            const alertCard = document.getElementById('alert-summary');
            if (data.critical_alerts > 0) {
                alertCard.className = 'metric-card critical';
            } else if (data.active_alerts > 0) {
                alertCard.className = 'metric-card warning';
            } else {
                alertCard.className = 'metric-card healthy';
            }
            
            // Performance
            document.getElementById('response-time').textContent = `${data.api_response_time_p95 || '--'}ms`;
            document.getElementById('error-rate').textContent = `${data.error_rate_percent || '--'}%`;
            document.getElementById('throughput').textContent = `${data.throughput_rps || '--'} RPS`;
            
            // Incidents
            document.getElementById('open-incidents').textContent = data.open_incidents || '--';
            document.getElementById('mttr').textContent = `${data.mttr_hours || '--'} hours`;
            
            // Capacity
            const capacityIndicator = document.getElementById('capacity-indicator');
            const capacityOverall = document.getElementById('capacity-overall');
            
            if (data.capacity_critical > 0) {
                capacityIndicator.className = 'status-indicator status-critical';
                capacityOverall.textContent = 'Critical';
            } else if (data.capacity_warning > 0) {
                capacityIndicator.className = 'status-indicator status-warning';
                capacityOverall.textContent = 'Warning';
            } else {
                capacityIndicator.className = 'status-indicator status-healthy';
                capacityOverall.textContent = 'Healthy';
            }
            
            document.getElementById('capacity-critical').textContent = data.capacity_critical || '--';
            document.getElementById('capacity-warning').textContent = data.capacity_warning || '--';
            
            // Recovery
            document.getElementById('recovery-success-rate').textContent = `${data.recovery_success_rate || '--'}%`;
            document.getElementById('active-recoveries').textContent = data.active_recoveries || '--';
            document.getElementById('recovery-rules').textContent = data.recovery_rules || '--';
            
            // Update chart if available
            if (performanceChart && data.performance_history) {
                updatePerformanceChart(data.performance_history);
            }
            
            // Update timestamp
            document.getElementById('last-updated').textContent = 
                `Last updated: ${new Date().toLocaleTimeString()}`;
        }
        
        // Update performance chart
        function updatePerformanceChart(history) {
            const labels = history.map(h => new Date(h.timestamp).toLocaleTimeString());
            const responseTime = history.map(h => h.response_time);
            const errorRate = history.map(h => h.error_rate);
            
            performanceChart.data.labels = labels;
            performanceChart.data.datasets[0].data = responseTime;
            performanceChart.data.datasets[1].data = errorRate;
            performanceChart.update('none');
        }
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            initWebSocket();
            initPerformanceChart();
            fetchMetrics();
            
            // Refresh every 30 seconds
            setInterval(fetchMetrics, 30000);
        });
    </script>
</body>
</html>
        """
        
        with open(template_path, 'w') as f:
            f.write(template_content)
    
    async def render_dashboard(self, request: Request) -> HTMLResponse:
        """Render the main dashboard page"""
        return self.templates.TemplateResponse("dashboard.html", {"request": request})
    
    async def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get consolidated metrics for dashboard"""
        try:
            # Get data from all SRE components
            sre_dashboard = self.sre_framework.get_sre_dashboard()
            health_summary = self.health_manager.get_health_summary()
            alert_summary = self.alert_manager.get_alert_summary()
            incident_metrics = self.incident_manager.get_incident_metrics()
            recovery_status = self.recovery_orchestrator.get_recovery_status()
            
            # Consolidate into dashboard metrics
            metrics = {
                'timestamp': datetime.utcnow().isoformat(),
                
                # System health
                'overall_health': sre_dashboard['overall_health']['status'],
                'health_score': sre_dashboard['overall_health']['score'],
                
                # SLO status
                'slos_healthy': sre_dashboard['slo_status']['summary']['healthy_slos'],
                'slos_warning': sre_dashboard['slo_status']['summary']['warning_slos'],
                'slos_critical': sre_dashboard['slo_status']['summary']['critical_slos'],
                
                # Alerts
                'active_alerts': alert_summary['total_active_alerts'],
                'critical_alerts': alert_summary['by_severity']['critical'],
                
                # Incidents
                'open_incidents': incident_metrics['open_incidents'],
                'mttr_hours': incident_metrics['mttr_average_minutes'] / 60,
                
                # Capacity
                'capacity_critical': sre_dashboard['capacity_status']['critical_resources'],
                'capacity_warning': sre_dashboard['capacity_status']['warning_resources'],
                
                # Performance
                'api_response_time_p95': 485.0,  # Would come from actual metrics
                'error_rate_percent': 0.15,
                'throughput_rps': 118.0,
                
                # Recovery
                'recovery_success_rate': recovery_status['success_rate'],
                'active_recoveries': recovery_status['active_recoveries'],
                'recovery_rules': recovery_status['enabled_rules']
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get dashboard metrics: {e}")
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'error': str(e)
            }
    
    async def start_monitoring(self):
        """Start background monitoring and real-time updates"""
        self.is_running = True
        
        # Start SRE framework
        await self.sre_framework.start()
        
        # Start monitoring loop
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("SRE Dashboard monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring"""
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
        
        await self.sre_framework.stop()
        
        logger.info("SRE Dashboard monitoring stopped")
    
    async def _monitoring_loop(self):
        """Background monitoring loop for real-time updates"""
        while self.is_running:
            try:
                # Get latest metrics
                metrics = await self.get_dashboard_metrics()
                
                # Broadcast to WebSocket clients
                await self.websocket_manager.broadcast({
                    'type': 'metrics_update',
                    'metrics': metrics
                })
                
                # Cache metrics
                self.metrics_cache = metrics
                
                # Sleep for update interval
                await asyncio.sleep(30)  # 30 second updates
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def run(self):
        """Run the dashboard server"""
        # Start monitoring
        await self.start_monitoring()
        
        try:
            # Run the FastAPI server
            config = uvicorn.Config(
                app=self.app,
                host=self.host,
                port=self.port,
                log_level="info"
            )
            server = uvicorn.Server(config)
            
            logger.info(f"Starting SRE Dashboard on {self.host}:{self.port}")
            await server.serve()
            
        finally:
            # Stop monitoring
            await self.stop_monitoring()


async def main():
    """Main entry point for the SRE dashboard"""
    import argparse
    
    parser = argparse.ArgumentParser(description="6FB AI Agent System SRE Dashboard")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8080, help="Port to bind to")
    parser.add_argument("--debug", action="store_true", help="Enable debug mode")
    
    args = parser.parse_args()
    
    # Set up logging
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and run dashboard
    dashboard = SREDashboard(host=args.host, port=args.port)
    await dashboard.run()


if __name__ == "__main__":
    asyncio.run(main())