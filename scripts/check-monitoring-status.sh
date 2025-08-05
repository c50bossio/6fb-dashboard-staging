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
