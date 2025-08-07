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
