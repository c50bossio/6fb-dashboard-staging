#!/usr/bin/env python3
"""
Comprehensive Health Monitoring and Alerting System
Implements full-stack monitoring with Prometheus, Grafana, and alerting
"""

import os
import asyncio
import logging
import json
import yaml
import requests
import psutil
import time
import sqlite3
import docker
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import subprocess
from concurrent.futures import ThreadPoolExecutor
import aiohttp
import socket

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/monitoring-system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    CRITICAL = "critical"
    WARNING = "warning"  
    INFO = "info"

class ServiceStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

@dataclass
class HealthMetric:
    """Health metric data structure"""
    name: str
    value: float
    unit: str
    timestamp: datetime
    labels: Dict[str, str] = None
    
@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    expression: str
    threshold: float
    severity: AlertSeverity
    duration: int  # seconds
    description: str
    runbook_url: Optional[str] = None
    
@dataclass
class ServiceHealth:
    """Service health status"""
    service_name: str
    status: ServiceStatus
    response_time: float
    error_rate: float
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    last_check: datetime
    errors: List[str] = None

class PrometheusManager:
    """Prometheus metrics and alerting manager"""
    
    def __init__(self, prometheus_url: str = "http://prometheus:9090"):
        self.prometheus_url = prometheus_url
        self.alert_rules = []
        
    async def push_metric(self, metric: HealthMetric, job: str = "6fb-ai-agent"):
        """Push metric to Prometheus pushgateway"""
        pushgateway_url = os.getenv('PUSHGATEWAY_URL', 'http://pushgateway:9091')
        
        try:
            labels = metric.labels or {}
            labels['job'] = job
            
            metric_data = f"{metric.name}{{{','.join([f'{k}=\"{v}\"' for k, v in labels.items()])}}} {metric.value}\n"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{pushgateway_url}/metrics/job/{job}",
                    data=metric_data,
                    headers={'Content-Type': 'text/plain'}
                ) as response:
                    if response.status != 200:
                        logger.error(f"Failed to push metric: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error pushing metric to Prometheus: {e}")
            
    async def query_metric(self, query: str) -> Dict[str, Any]:
        """Query Prometheus for metric data"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.prometheus_url}/api/v1/query",
                    params={'query': query}
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.error(f"Prometheus query failed: {response.status}")
                        return {}
                        
        except Exception as e:
            logger.error(f"Error querying Prometheus: {e}")
            return {}
            
    def add_alert_rule(self, rule: AlertRule):
        """Add alert rule"""
        self.alert_rules.append(rule)
        
    async def generate_alert_rules_config(self) -> str:
        """Generate Prometheus alert rules configuration"""
        config = {
            'groups': [{
                'name': '6fb-ai-agent-alerts',
                'rules': []
            }]
        }
        
        for rule in self.alert_rules:
            prometheus_rule = {
                'alert': rule.name,
                'expr': rule.expression,
                'for': f"{rule.duration}s",
                'labels': {
                    'severity': rule.severity.value
                },
                'annotations': {
                    'summary': rule.description,
                    'runbook_url': rule.runbook_url or 'https://docs.6fb-ai-agent.com/runbooks'
                }
            }
            config['groups'][0]['rules'].append(prometheus_rule)
            
        return yaml.dump(config)

class GrafanaManager:
    """Grafana dashboard manager"""
    
    def __init__(self, grafana_url: str = "http://grafana:3000"):
        self.grafana_url = grafana_url
        self.api_key = os.getenv('GRAFANA_API_KEY')
        
    async def create_dashboard(self, dashboard_config: Dict[str, Any]) -> bool:
        """Create Grafana dashboard"""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.grafana_url}/api/dashboards/db",
                    json=dashboard_config,
                    headers=headers
                ) as response:
                    if response.status == 200:
                        logger.info("Grafana dashboard created successfully")
                        return True
                    else:
                        logger.error(f"Failed to create Grafana dashboard: {response.status}")
                        return False
                        
        except Exception as e:
            logger.error(f"Error creating Grafana dashboard: {e}")
            return False
            
    def generate_system_dashboard(self) -> Dict[str, Any]:
        """Generate system monitoring dashboard"""
        return {
            "dashboard": {
                "id": None,
                "title": "6FB AI Agent System Overview",
                "tags": ["6fb-ai-agent", "system", "overview"],
                "timezone": "browser",
                "panels": [
                    {
                        "id": 1,
                        "title": "System Health Status",
                        "type": "stat",
                        "targets": [{
                            "expr": "up{job=\"6fb-ai-agent\"}",
                            "legendFormat": "{{instance}}"
                        }],
                        "fieldConfig": {
                            "defaults": {
                                "color": {"mode": "thresholds"},
                                "thresholds": {
                                    "steps": [
                                        {"color": "red", "value": 0},
                                        {"color": "green", "value": 1}
                                    ]
                                }
                            }
                        }
                    },
                    {
                        "id": 2,
                        "title": "CPU Usage",
                        "type": "graph",
                        "targets": [{
                            "expr": "rate(cpu_usage_total{job=\"6fb-ai-agent\"}[5m])",
                            "legendFormat": "{{instance}}"
                        }]
                    },
                    {
                        "id": 3,
                        "title": "Memory Usage",
                        "type": "graph", 
                        "targets": [{
                            "expr": "memory_usage_bytes{job=\"6fb-ai-agent\"}",
                            "legendFormat": "{{instance}}"
                        }]
                    },
                    {
                        "id": 4,
                        "title": "Response Time",
                        "type": "graph",
                        "targets": [{
                            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket{job=\"6fb-ai-agent\"})",
                            "legendFormat": "95th percentile"
                        }]
                    },
                    {
                        "id": 5,
                        "title": "Error Rate",
                        "type": "graph",
                        "targets": [{
                            "expr": "rate(http_requests_total{job=\"6fb-ai-agent\",status=~\"5..\"}[5m]) / rate(http_requests_total{job=\"6fb-ai-agent\"}[5m])",
                            "legendFormat": "Error Rate"
                        }]
                    },
                    {
                        "id": 6,
                        "title": "Database Connections",
                        "type": "graph",
                        "targets": [{
                            "expr": "database_connections_active{job=\"6fb-ai-agent\"}",
                            "legendFormat": "Active Connections"
                        }]
                    }
                ],
                "time": {"from": "now-1h", "to": "now"},
                "refresh": "30s"
            }
        }

class SystemHealthChecker:
    """System-wide health checker"""
    
    def __init__(self):
        self.services = {
            'frontend': {'url': 'http://localhost:9999/api/health', 'port': 9999},
            'backend': {'url': 'http://localhost:8001/health', 'port': 8001},
            'database': {'url': None, 'port': None}
        }
        
    async def check_system_health(self) -> Dict[str, ServiceHealth]:
        """Check health of all system components"""
        health_results = {}
        
        # Check services
        for service_name, config in self.services.items():
            if service_name == 'database':
                health_results[service_name] = await self._check_database_health()
            else:
                health_results[service_name] = await self._check_service_health(service_name, config)
                
        # Check system resources
        health_results['system'] = await self._check_system_resources()
        
        return health_results
        
    async def _check_service_health(self, service_name: str, config: Dict[str, Any]) -> ServiceHealth:
        """Check individual service health"""
        try:
            start_time = time.time()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(config['url'], timeout=30) as response:
                    response_time = (time.time() - start_time) * 1000
                    
                    if response.status == 200:
                        data = await response.json()
                        status = ServiceStatus.HEALTHY
                        errors = []
                    else:
                        status = ServiceStatus.UNHEALTHY
                        errors = [f"HTTP {response.status}"]
                        
        except asyncio.TimeoutError:
            response_time = 30000
            status = ServiceStatus.UNHEALTHY
            errors = ["Request timeout"]
        except Exception as e:
            response_time = 0
            status = ServiceStatus.UNHEALTHY
            errors = [str(e)]
            
        # Get process metrics if service is running
        cpu_usage, memory_usage = await self._get_process_metrics(config['port'])
        
        return ServiceHealth(
            service_name=service_name,
            status=status,
            response_time=response_time,
            error_rate=0.0,  # Would be calculated from metrics
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            disk_usage=0.0,
            last_check=datetime.now(),
            errors=errors
        )
        
    async def _check_database_health(self) -> ServiceHealth:
        """Check database health"""
        try:
            # SQLite health check
            db_path = "/app/data/agent_system.db"
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                conn.close()
                
                status = ServiceStatus.HEALTHY
                errors = []
            else:
                status = ServiceStatus.UNHEALTHY
                errors = ["Database file not found"]
                
        except Exception as e:
            status = ServiceStatus.UNHEALTHY
            errors = [str(e)]
            
        return ServiceHealth(
            service_name="database",
            status=status,
            response_time=0,
            error_rate=0.0,
            cpu_usage=0.0,
            memory_usage=0.0,
            disk_usage=0.0,
            last_check=datetime.now(),
            errors=errors
        )
        
    async def _check_system_resources(self) -> ServiceHealth:
        """Check system resource usage"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Determine status based on thresholds
            if cpu_percent > 90 or memory.percent > 90 or disk.percent > 90:
                status = ServiceStatus.UNHEALTHY
            elif cpu_percent > 75 or memory.percent > 75 or disk.percent > 75:
                status = ServiceStatus.DEGRADED
            else:
                status = ServiceStatus.HEALTHY
                
            errors = []
            if cpu_percent > 90:
                errors.append(f"High CPU usage: {cpu_percent}%")
            if memory.percent > 90:
                errors.append(f"High memory usage: {memory.percent}%")
            if disk.percent > 90:
                errors.append(f"High disk usage: {disk.percent}%")
                
        except Exception as e:
            status = ServiceStatus.UNKNOWN
            cpu_percent = 0
            memory_percent = 0
            disk_percent = 0
            errors = [str(e)]
            
        return ServiceHealth(
            service_name="system",
            status=status,
            response_time=0,
            error_rate=0.0,
            cpu_usage=cpu_percent,
            memory_usage=memory.percent,
            disk_usage=disk.percent,
            last_check=datetime.now(),
            errors=errors
        )
        
    async def _get_process_metrics(self, port: int) -> Tuple[float, float]:
        """Get CPU and memory usage for process listening on port"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    connections = proc.connections()
                    for conn in connections:
                        if conn.laddr.port == port:
                            return proc.info['cpu_percent'] or 0.0, proc.info['memory_percent'] or 0.0
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception:
            pass
            
        return 0.0, 0.0

class AlertManager:
    """Alert management and notification system"""
    
    def __init__(self):
        self.alert_history = []
        self.notification_channels = []
        
    def add_notification_channel(self, channel: Dict[str, Any]):
        """Add notification channel (email, Slack, PagerDuty, etc.)"""
        self.notification_channels.append(channel)
        
    async def send_alert(self, alert: Dict[str, Any]):
        """Send alert to all configured channels"""
        logger.info(f"Sending alert: {alert['title']}")
        
        # Store alert in history
        alert['timestamp'] = datetime.now().isoformat()
        self.alert_history.append(alert)
        
        # Send to each notification channel
        for channel in self.notification_channels:
            await self._send_to_channel(alert, channel)
            
    async def _send_to_channel(self, alert: Dict[str, Any], channel: Dict[str, Any]):
        """Send alert to specific notification channel"""
        try:
            if channel['type'] == 'webhook':
                await self._send_webhook(alert, channel)
            elif channel['type'] == 'email':
                await self._send_email(alert, channel)
            elif channel['type'] == 'slack':
                await self._send_slack(alert, channel)
            elif channel['type'] == 'pagerduty':
                await self._send_pagerduty(alert, channel)
                
        except Exception as e:
            logger.error(f"Failed to send alert to {channel['type']}: {e}")
            
    async def _send_webhook(self, alert: Dict[str, Any], channel: Dict[str, Any]):
        """Send alert via webhook"""
        async with aiohttp.ClientSession() as session:
            async with session.post(
                channel['url'],
                json=alert,
                headers=channel.get('headers', {})
            ) as response:
                if response.status != 200:
                    logger.error(f"Webhook alert failed: {response.status}")
                    
    async def _send_email(self, alert: Dict[str, Any], channel: Dict[str, Any]):
        """Send alert via email"""
        # Implementation would integrate with email service
        pass
        
    async def _send_slack(self, alert: Dict[str, Any], channel: Dict[str, Any]):
        """Send alert to Slack"""
        payload = {
            "text": f"🚨 {alert['title']}",
            "attachments": [{
                "color": "danger" if alert['severity'] == 'critical' else "warning",
                "fields": [
                    {"title": "Service", "value": alert['service'], "short": True},
                    {"title": "Severity", "value": alert['severity'], "short": True},
                    {"title": "Description", "value": alert['description'], "short": False}
                ]
            }]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(channel['webhook_url'], json=payload) as response:
                if response.status != 200:
                    logger.error(f"Slack alert failed: {response.status}")
                    
    async def _send_pagerduty(self, alert: Dict[str, Any], channel: Dict[str, Any]):
        """Send alert to PagerDuty"""
        payload = {
            "routing_key": channel['integration_key'],
            "event_action": "trigger",
            "payload": {
                "summary": alert['title'],
                "severity": alert['severity'],
                "source": alert['service'],
                "custom_details": {
                    "description": alert['description'],
                    "service": alert['service']
                }
            }
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "https://events.pagerduty.com/v2/enqueue",
                json=payload
            ) as response:
                if response.status != 202:
                    logger.error(f"PagerDuty alert failed: {response.status}")

class MonitoringOrchestrator:
    """Main monitoring system orchestrator"""
    
    def __init__(self):
        self.prometheus = PrometheusManager()
        self.grafana = GrafanaManager()
        self.health_checker = SystemHealthChecker()
        self.alert_manager = AlertManager()
        self.running = False
        
    async def initialize(self):
        """Initialize monitoring system"""
        logger.info("Initializing monitoring system")
        
        # Setup alert rules
        self._setup_alert_rules()
        
        # Setup notification channels
        self._setup_notification_channels()
        
        # Create Grafana dashboards
        await self._setup_dashboards()
        
        logger.info("Monitoring system initialized")
        
    def _setup_alert_rules(self):
        """Setup default alert rules"""
        rules = [
            AlertRule(
                name="HighCPUUsage",
                expression="cpu_usage_percent > 80",
                threshold=80,
                severity=AlertSeverity.WARNING,
                duration=300,
                description="High CPU usage detected"
            ),
            AlertRule(
                name="HighMemoryUsage",
                expression="memory_usage_percent > 85",
                threshold=85,
                severity=AlertSeverity.WARNING,
                duration=300,
                description="High memory usage detected"
            ),
            AlertRule(
                name="ServiceDown",
                expression="up == 0",
                threshold=0,
                severity=AlertSeverity.CRITICAL,
                duration=60,
                description="Service is down"
            ),
            AlertRule(
                name="HighErrorRate",
                expression="error_rate > 0.05",
                threshold=0.05,
                severity=AlertSeverity.CRITICAL,
                duration=300,
                description="High error rate detected"
            ),
            AlertRule(
                name="SlowResponseTime",
                expression="response_time_p95 > 2000",
                threshold=2000,
                severity=AlertSeverity.WARNING,
                duration=300,
                description="Slow response time detected"
            )
        ]
        
        for rule in rules:
            self.prometheus.add_alert_rule(rule)
            
    def _setup_notification_channels(self):
        """Setup notification channels"""
        # Webhook notification
        if os.getenv('ALERT_WEBHOOK_URL'):
            self.alert_manager.add_notification_channel({
                'type': 'webhook',
                'url': os.getenv('ALERT_WEBHOOK_URL'),
                'headers': {'Content-Type': 'application/json'}
            })
            
        # Slack notification
        if os.getenv('SLACK_WEBHOOK_URL'):
            self.alert_manager.add_notification_channel({
                'type': 'slack',
                'webhook_url': os.getenv('SLACK_WEBHOOK_URL')
            })
            
        # PagerDuty notification
        if os.getenv('PAGERDUTY_INTEGRATION_KEY'):
            self.alert_manager.add_notification_channel({
                'type': 'pagerduty',
                'integration_key': os.getenv('PAGERDUTY_INTEGRATION_KEY')
            })
            
    async def _setup_dashboards(self):
        """Setup Grafana dashboards"""
        # System overview dashboard
        system_dashboard = self.grafana.generate_system_dashboard()
        await self.grafana.create_dashboard(system_dashboard)
        
    async def start_monitoring(self):
        """Start the monitoring loop"""
        self.running = True
        logger.info("Starting monitoring loop")
        
        # Start monitoring tasks
        asyncio.create_task(self._health_monitoring_loop())
        asyncio.create_task(self._metrics_collection_loop())
        asyncio.create_task(self._alert_processing_loop())
        
    async def stop_monitoring(self):
        """Stop the monitoring loop"""
        self.running = False
        logger.info("Stopping monitoring loop")
        
    async def _health_monitoring_loop(self):
        """Main health monitoring loop"""
        while self.running:
            try:
                # Check system health
                health_results = await self.health_checker.check_system_health()
                
                # Process health results
                for service_name, health in health_results.items():
                    await self._process_health_result(service_name, health)
                    
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(60)
                
    async def _metrics_collection_loop(self):
        """Metrics collection loop"""
        while self.running:
            try:
                # Collect and push system metrics
                await self._collect_system_metrics()
                
                await asyncio.sleep(15)  # Collect every 15 seconds
                
            except Exception as e:
                logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(60)
                
    async def _alert_processing_loop(self):
        """Alert processing loop"""
        while self.running:
            try:
                # Check for alert conditions
                await self._check_alert_conditions()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Alert processing error: {e}")
                await asyncio.sleep(60)
                
    async def _process_health_result(self, service_name: str, health: ServiceHealth):
        """Process individual health check result"""
        # Push metrics to Prometheus
        await self.prometheus.push_metric(
            HealthMetric(
                name="service_up",
                value=1 if health.status == ServiceStatus.HEALTHY else 0,
                unit="",
                timestamp=health.last_check,
                labels={"service": service_name}
            )
        )
        
        await self.prometheus.push_metric(
            HealthMetric(
                name="response_time_ms",
                value=health.response_time,
                unit="ms", 
                timestamp=health.last_check,
                labels={"service": service_name}
            )
        )
        
        # Generate alerts for unhealthy services
        if health.status == ServiceStatus.UNHEALTHY:
            await self.alert_manager.send_alert({
                "title": f"Service {service_name} is unhealthy",
                "description": f"Service {service_name} is unhealthy. Errors: {', '.join(health.errors or [])}",
                "service": service_name,
                "severity": "critical"
            })
            
    async def _collect_system_metrics(self):
        """Collect system-wide metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent()
        await self.prometheus.push_metric(
            HealthMetric(
                name="cpu_usage_percent",
                value=cpu_percent,
                unit="%",
                timestamp=datetime.now()
            )
        )
        
        # Memory metrics
        memory = psutil.virtual_memory()
        await self.prometheus.push_metric(
            HealthMetric(
                name="memory_usage_percent",
                value=memory.percent,
                unit="%",
                timestamp=datetime.now()
            )
        )
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        await self.prometheus.push_metric(
            HealthMetric(
                name="disk_usage_percent",
                value=disk.percent,
                unit="%",
                timestamp=datetime.now()
            )
        )
        
    async def _check_alert_conditions(self):
        """Check for alert conditions"""
        # This would query Prometheus for alert conditions
        # and trigger alerts when thresholds are exceeded
        pass
        
    async def get_monitoring_status(self) -> Dict[str, Any]:
        """Get comprehensive monitoring system status"""
        health_results = await self.health_checker.check_system_health()
        
        return {
            "monitoring_active": self.running,
            "services": {name: asdict(health) for name, health in health_results.items()},
            "alert_rules_count": len(self.prometheus.alert_rules),
            "notification_channels_count": len(self.alert_manager.notification_channels),
            "recent_alerts": self.alert_manager.alert_history[-10:],  # Last 10 alerts
            "prometheus_url": self.prometheus.prometheus_url,
            "grafana_url": self.grafana.grafana_url
        }

# Usage example
async def main():
    # Initialize monitoring system
    monitoring = MonitoringOrchestrator()
    await monitoring.initialize()
    
    # Start monitoring
    await monitoring.start_monitoring()
    
    # Keep running
    try:
        while True:
            status = await monitoring.get_monitoring_status()
            logger.info(f"Monitoring status: {status['monitoring_active']}")
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await monitoring.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())