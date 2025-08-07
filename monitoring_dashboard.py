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
