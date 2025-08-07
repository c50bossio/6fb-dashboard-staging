#!/bin/bash

# Production Monitoring Service Startup Script
# Starts monitoring, alerting, and observability services for 6FB AI Agent System

set -e  # Exit on any error

echo "🔍 Starting production monitoring services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MONITORING_DIR="$PROJECT_ROOT/monitoring"
LOGS_DIR="$PROJECT_ROOT/logs"
PIDS_DIR="$PROJECT_ROOT/pids"

# Environment
ENVIRONMENT=${NODE_ENV:-development}
IS_PRODUCTION=false
if [[ "$ENVIRONMENT" == "production" ]]; then
    IS_PRODUCTION=true
fi

echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Create required directories
create_directories() {
    echo -e "\n${BLUE}Creating monitoring directories...${NC}"
    
    mkdir -p "$LOGS_DIR"
    mkdir -p "$PIDS_DIR"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/data/prometheus"
    mkdir -p "$PROJECT_ROOT/data/grafana"
    mkdir -p "$PROJECT_ROOT/data/loki"
    
    print_status "Monitoring directories created"
}

# Check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}Checking monitoring prerequisites...${NC}"
    
    # Check Python dependencies
    if ! python3 -c "import psutil, aiohttp" 2>/dev/null; then
        print_warning "Installing monitoring dependencies..."
        pip3 install psutil aiohttp
        print_status "Monitoring dependencies installed"
    else
        print_status "Monitoring dependencies available"
    fi
    
    # Check if database exists
    if [[ -f "$PROJECT_ROOT/agent_system.db" ]]; then
        print_status "Database found"
    else
        print_warning "Database not found - monitoring will create basic structure"
    fi
    
    # Check monitoring configuration
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        print_status "Environment configuration found"
    else
        print_warning "No .env.local found - using defaults"
    fi
}

# Start monitoring service
start_monitoring_service() {
    echo -e "\n${BLUE}Starting monitoring service...${NC}"
    
    # Create monitoring service script
    cat > "$PROJECT_ROOT/start_monitoring_service.py" << 'EOF'
#!/usr/bin/env python3
import asyncio
import logging
import signal
import sys
import os
from monitoring.alerts_config import get_monitoring_service

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/monitoring.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Global monitoring service
monitoring_service = None

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}, shutting down...")
    if monitoring_service:
        monitoring_service.stop()
    sys.exit(0)

async def main():
    global monitoring_service
    
    try:
        # Set up signal handlers
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Start monitoring service
        monitoring_service = get_monitoring_service()
        logger.info("6FB AI Agent System monitoring service starting...")
        
        await monitoring_service.start()
        
    except Exception as e:
        logger.error(f"Monitoring service failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
EOF
    
    # Make script executable
    chmod +x "$PROJECT_ROOT/start_monitoring_service.py"
    
    # Start monitoring service in background
    cd "$PROJECT_ROOT"
    nohup python3 start_monitoring_service.py > "$LOGS_DIR/monitoring_startup.log" 2>&1 &
    MONITORING_PID=$!
    
    # Save PID
    echo $MONITORING_PID > "$PIDS_DIR/monitoring.pid"
    
    # Wait a moment to check if it started successfully
    sleep 3
    
    if kill -0 $MONITORING_PID 2>/dev/null; then
        print_status "Monitoring service started (PID: $MONITORING_PID)"
    else
        print_error "Monitoring service failed to start"
        cat "$LOGS_DIR/monitoring_startup.log"
        exit 1
    fi
}

# Start Prometheus (if in production)
start_prometheus() {
    if [[ "$IS_PRODUCTION" == "true" ]] && command -v docker &> /dev/null; then
        echo -e "\n${BLUE}Starting Prometheus monitoring...${NC}"
        
        # Create Prometheus configuration
        mkdir -p "$PROJECT_ROOT/configs/prometheus"
        
        cat > "$PROJECT_ROOT/configs/prometheus/prometheus.yml" << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: '6fb-ai-agent-system'
    static_configs:
      - targets: ['localhost:8001']  # FastAPI backend
    metrics_path: '/metrics'
    scrape_interval: 30s
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']
    scrape_interval: 30s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
EOF
        
        # Create alert rules
        cat > "$PROJECT_ROOT/configs/prometheus/alerts.yml" << 'EOF'
groups:
- name: 6fb-ai-agent-system
  rules:
  - alert: HighCPUUsage
    expr: cpu_usage_percent > 80
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage detected"
      description: "CPU usage is {{ $value }}%"
      
  - alert: HighMemoryUsage
    expr: memory_usage_percent > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage detected"  
      description: "Memory usage is {{ $value }}%"
      
  - alert: ServiceDown
    expr: up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Service is down"
      description: "{{ $labels.instance }} is down"
EOF
        
        print_status "Prometheus configuration created"
        
        # Start Prometheus via Docker Compose (if available)
        if [[ -f "$PROJECT_ROOT/docker-compose.production.yml" ]]; then
            docker-compose -f docker-compose.production.yml up -d prometheus
            print_status "Prometheus started via Docker Compose"
        else
            print_warning "Docker Compose not available - Prometheus not started"
        fi
    else
        print_warning "Production mode not enabled or Docker not available - skipping Prometheus"
    fi
}

# Create monitoring dashboard
create_monitoring_dashboard() {
    echo -e "\n${BLUE}Creating monitoring dashboard...${NC}"
    
    cat > "$PROJECT_ROOT/monitoring_dashboard.py" << 'EOF'
#!/usr/bin/env python3
"""
Simple monitoring dashboard for 6FB AI Agent System
Provides web interface for viewing system health and alerts
"""

import asyncio
import json
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from monitoring.alerts_config import get_monitoring_service

app = FastAPI(title="6FB AI Agent System Monitoring")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def monitoring_dashboard(request: Request):
    """Main monitoring dashboard"""
    
    monitoring_service = get_monitoring_service()
    health_status = monitoring_service.get_health_status()
    
    # Simple HTML template
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>6FB AI Agent System - Monitoring</title>
        <meta http-equiv="refresh" content="30">
        <style>
            body {{ font-family: Arial, sans-serif; margin: 20px; }}
            .healthy {{ color: green; }}
            .degraded {{ color: orange; }}
            .unhealthy {{ color: red; }}
            .critical {{ color: darkred; font-weight: bold; }}
            .alert {{ background: #f8f9fa; border-left: 4px solid #007bff; padding: 10px; margin: 10px 0; }}
            .alert.warning {{ border-color: orange; }}
            .alert.error {{ border-color: red; }}
            .alert.critical {{ border-color: darkred; }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
        </style>
    </head>
    <body>
        <h1>6FB AI Agent System - Monitoring Dashboard</h1>
        <p>Last Updated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</p>
        
        <h2>System Health Status</h2>
        <p class="{health_status['status']}">
            Status: <strong>{health_status['status'].upper()}</strong>
        </p>
        <p>Active Alerts: {health_status['active_alerts_count']}</p>
        <p>Monitoring Enabled: {health_status['monitoring_enabled']}</p>
        
        <h2>Active Alerts</h2>
        {"<p>No active alerts</p>" if not health_status['active_alerts'] else ""}
        {"".join([f'''
        <div class="alert {alert['severity']}">
            <strong>{alert['title']}</strong><br>
            Severity: {alert['severity'].upper()}<br>
            Started: {alert['started_at']}<br>
            Value: {alert['metric_value']}, Threshold: {alert['threshold_value']}<br>
            Description: {alert['description']}
        </div>
        ''' for alert in health_status['active_alerts']])}
        
        <h2>Quick Actions</h2>
        <p>
            <a href="/api/health">System Health API</a> | 
            <a href="/metrics">Metrics Endpoint</a> |
            <a href="/">Refresh Dashboard</a>
        </p>
        
        <hr>
        <p><small>6FB AI Agent System Monitoring v1.0</small></p>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html_content)

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    
    monitoring_service = get_monitoring_service()
    return monitoring_service.get_health_status()

@app.get("/metrics")
async def metrics():
    """Basic metrics endpoint"""
    
    monitoring_service = get_monitoring_service()
    system_metrics = await monitoring_service.alert_manager.metrics_collector.collect_system_metrics()
    app_metrics = await monitoring_service.alert_manager.metrics_collector.collect_application_metrics()
    
    return {
        "system_metrics": system_metrics,
        "application_metrics": app_metrics,
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8002)
EOF
    
    chmod +x "$PROJECT_ROOT/monitoring_dashboard.py"
    print_status "Monitoring dashboard created"
}

# Start dashboard service
start_dashboard_service() {
    echo -e "\n${BLUE}Starting monitoring dashboard...${NC}"
    
    cd "$PROJECT_ROOT"
    nohup python3 monitoring_dashboard.py > "$LOGS_DIR/dashboard.log" 2>&1 &
    DASHBOARD_PID=$!
    
    # Save PID
    echo $DASHBOARD_PID > "$PIDS_DIR/dashboard.pid"
    
    # Wait a moment to check if it started successfully
    sleep 3
    
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        print_status "Monitoring dashboard started (PID: $DASHBOARD_PID)"
        print_status "Dashboard available at: http://localhost:8002"
    else
        print_error "Monitoring dashboard failed to start"
        cat "$LOGS_DIR/dashboard.log"
        exit 1
    fi
}

# Create monitoring status check script
create_status_script() {
    echo -e "\n${BLUE}Creating monitoring status script...${NC}"
    
    cat > "$PROJECT_ROOT/scripts/check-monitoring-status.sh" << 'EOF'
#!/bin/bash

# Monitoring Status Check Script
# Checks the status of all monitoring services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS_DIR="$PROJECT_ROOT/pids"

echo "=== 6FB AI Agent System Monitoring Status ==="
echo "Timestamp: $(date)"
echo

# Check monitoring service
if [[ -f "$PIDS_DIR/monitoring.pid" ]]; then
    MONITORING_PID=$(cat "$PIDS_DIR/monitoring.pid")
    if kill -0 $MONITORING_PID 2>/dev/null; then
        echo "✓ Monitoring Service: Running (PID: $MONITORING_PID)"
    else
        echo "✗ Monitoring Service: Not running"
    fi
else
    echo "✗ Monitoring Service: PID file not found"
fi

# Check dashboard service  
if [[ -f "$PIDS_DIR/dashboard.pid" ]]; then
    DASHBOARD_PID=$(cat "$PIDS_DIR/dashboard.pid")
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo "✓ Dashboard Service: Running (PID: $DASHBOARD_PID)"
        echo "  Dashboard URL: http://localhost:8002"
    else
        echo "✗ Dashboard Service: Not running"
    fi
else
    echo "✗ Dashboard Service: PID file not found"
fi

# Check Docker services (if running)
if command -v docker &> /dev/null; then
    echo
    echo "=== Docker Monitoring Services ==="
    
    if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(prometheus|grafana|loki)" &> /dev/null; then
        docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(prometheus|grafana|loki)"
    else
        echo "No Docker monitoring services running"
    fi
fi

echo
echo "=== Log Files ==="
echo "Monitoring Log: $PROJECT_ROOT/logs/monitoring.log"
echo "Dashboard Log: $PROJECT_ROOT/logs/dashboard.log"

echo
echo "=== Quick Health Check ==="
if command -v curl &> /dev/null; then
    if curl -s http://localhost:8002/api/health > /dev/null 2>&1; then
        echo "✓ Health API: Responding"
        curl -s http://localhost:8002/api/health | python3 -m json.tool 2>/dev/null || echo "Health API data available"
    else
        echo "✗ Health API: Not responding"
    fi
else
    echo "curl not available - install curl for health checks"
fi

echo
echo "=== Monitoring Status Check Complete ==="
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/check-monitoring-status.sh"
    print_status "Status check script created"
}

# Create stop monitoring script
create_stop_script() {
    echo -e "\n${BLUE}Creating stop monitoring script...${NC}"
    
    cat > "$PROJECT_ROOT/scripts/stop-monitoring.sh" << 'EOF'
#!/bin/bash

# Stop Monitoring Services Script
# Gracefully stops all monitoring services

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS_DIR="$PROJECT_ROOT/pids"

echo "🛑 Stopping 6FB AI Agent System monitoring services..."

# Stop monitoring service
if [[ -f "$PIDS_DIR/monitoring.pid" ]]; then
    MONITORING_PID=$(cat "$PIDS_DIR/monitoring.pid")
    if kill -0 $MONITORING_PID 2>/dev/null; then
        echo "Stopping monitoring service (PID: $MONITORING_PID)..."
        kill -TERM $MONITORING_PID
        sleep 5
        
        # Force kill if still running
        if kill -0 $MONITORING_PID 2>/dev/null; then
            echo "Force stopping monitoring service..."
            kill -KILL $MONITORING_PID
        fi
        
        rm -f "$PIDS_DIR/monitoring.pid"
        echo "✓ Monitoring service stopped"
    else
        echo "Monitoring service not running"
    fi
fi

# Stop dashboard service
if [[ -f "$PIDS_DIR/dashboard.pid" ]]; then
    DASHBOARD_PID=$(cat "$PIDS_DIR/dashboard.pid")
    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        echo "Stopping dashboard service (PID: $DASHBOARD_PID)..."
        kill -TERM $DASHBOARD_PID
        sleep 3
        
        # Force kill if still running
        if kill -0 $DASHBOARD_PID 2>/dev/null; then
            echo "Force stopping dashboard service..."
            kill -KILL $DASHBOARD_PID
        fi
        
        rm -f "$PIDS_DIR/dashboard.pid"
        echo "✓ Dashboard service stopped"
    else
        echo "Dashboard service not running"
    fi
fi

echo "✅ All monitoring services stopped"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/stop-monitoring.sh"
    print_status "Stop monitoring script created"
}

# Main execution
main() {
    echo -e "${BLUE}🔍 6FB AI Agent System - Production Monitoring Setup${NC}"
    echo -e "${BLUE}======================================================${NC}"
    
    create_directories
    check_prerequisites
    start_monitoring_service
    start_prometheus
    create_monitoring_dashboard
    start_dashboard_service
    create_status_script
    create_stop_script
    
    echo -e "\n${GREEN}✅ Monitoring services started successfully!${NC}"
    echo
    echo -e "${BLUE}Service Information:${NC}"
    echo "• Monitoring Service: Running in background"
    echo "• Dashboard: http://localhost:8002"
    echo "• Health API: http://localhost:8002/api/health"
    echo "• Metrics API: http://localhost:8002/metrics"
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo "• Prometheus: http://localhost:9090 (if Docker available)"
        echo "• Grafana: http://localhost:3001 (if Docker available)"
    fi
    echo
    echo -e "${BLUE}Management Commands:${NC}"
    echo "• Check Status: ./scripts/check-monitoring-status.sh"
    echo "• Stop Services: ./scripts/stop-monitoring.sh"
    echo "• View Logs: tail -f logs/monitoring.log"
    echo
    echo -e "${YELLOW}Important Notes:${NC}"
    echo "• Monitoring service runs in background and checks system every 60 seconds"
    echo "• Email alerts require SMTP configuration in .env.local"
    echo "• Webhook alerts require SECURITY_WEBHOOK_URL in .env.local"
    echo "• All alerts are logged to logs/monitoring.log"
    echo "• Dashboard auto-refreshes every 30 seconds"
    
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo
        echo -e "${RED}PRODUCTION NOTES:${NC}"
        echo "• Configure external monitoring tools (Datadog, New Relic, etc.)"
        echo "• Set up log aggregation (ELK stack, Splunk, etc.)"
        echo "• Configure PagerDuty or similar for critical alerts"
        echo "• Set up automated backup monitoring"
        echo "• Review and adjust alert thresholds for your workload"
    fi
}

# Run main function
main "$@"