# 6FB AI Agent System - Site Reliability Engineering (SRE) Framework

A comprehensive Site Reliability Engineering framework implementing industry best practices for monitoring, alerting, incident response, and system reliability.

## 🎯 Overview

This SRE framework provides:

- **Service Level Objectives (SLOs) & Service Level Indicators (SLIs)** with automated tracking
- **Error Budget calculation and monitoring** with burn rate alerting
- **Comprehensive health checking** with circuit breaker patterns
- **Auto-recovery mechanisms** with intelligent failure handling
- **Incident response procedures** with automated escalation
- **Capacity planning** with predictive scaling recommendations
- **Performance baselines** with anomaly detection
- **Multi-channel alerting** with smart routing and correlation
- **Real-time dashboards** with WebSocket updates
- **Uptime monitoring** with 99.9% availability targets

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SRE Dashboard │    │  Alert Manager  │    │ Health Checks   │
│   (FastAPI)     │◄──►│  (Multi-channel)│◄──►│ (Circuit Breaker│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ SRE Framework   │    │ Incident Mgmt   │    │ Auto Recovery   │
│ (Orchestrator)  │◄──►│ (Runbooks)      │◄──►│ (Self-healing)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ SLO Manager     │    │ Capacity Planner│    │ Performance     │
│ (Error Budgets) │    │ (Scaling)       │    │ Baselines       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Start the SRE Framework

```python
from monitoring.sre_framework import SREFramework
import asyncio

async def main():
    # Initialize SRE framework
    sre = SREFramework()
    
    # Start monitoring
    await sre.start()
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(60)
    finally:
        await sre.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

### 2. Launch the Dashboard

```bash
# Start the SRE dashboard
cd monitoring
python sre_dashboard.py --host 0.0.0.0 --port 8080
```

Access dashboard at: `http://localhost:8080`

### 3. Configure Environment Variables

```bash
# Email notifications
export SMTP_SERVER="smtp.gmail.com"
export SMTP_USERNAME="alerts@6fb.ai"
export SMTP_PASSWORD="your-password"
export SECURITY_ALERT_EMAILS="sre-team@6fb.ai,oncall@6fb.ai"

# Slack notifications
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# Webhook notifications
export SECURITY_WEBHOOK_URL="https://your-webhook-endpoint.com/alerts"
export WEBHOOK_SECRET="your-secret-key"
```

## 📊 Service Level Objectives (SLOs)

### Default SLOs

| Service | SLI | Target | Time Window | Error Budget |
|---------|-----|--------|-------------|--------------|
| Backend API | Availability | 99.9% | 30 days | 0.1% |
| Backend API | Latency P95 | <500ms | 1 day | 5% |
| Frontend | Load Time P90 | <2s | 1 day | 10% |
| Database | Query P95 | <100ms | 1 day | 5% |
| AI Service | Availability | 99.5% | 7 days | 0.5% |
| System | Error Rate | <0.1% | 1 hour | 0.1% |

### Adding Custom SLOs

```python
from monitoring.sre_framework import SLO, SLI, SLIType, TimeWindow
from monitoring.sre_framework import SREFramework

sre = SREFramework()

# Define custom SLI
custom_sli = SLI(
    name="custom_metric",
    type=SLIType.LATENCY,
    description="Custom service latency",
    query="histogram_quantile(0.95, rate(custom_service_duration_bucket[5m]))",
    unit="seconds"
)

# Define custom SLO
custom_slo = SLO(
    name="custom_service_latency",
    service="custom-service",
    sli=custom_sli,
    target_percentage=95.0,
    time_window=TimeWindow.DAY,
    description="95% of requests complete within threshold"
)

# Add to SRE framework
sre.slo_manager.add_slo(custom_slo)
```

## 🚨 Alerting Strategy

### Alert Severity Levels

- **Critical (P1)**: Service completely down, immediate SMS/Slack/Email + 15min escalation
- **High (P2)**: Major feature down, Email/Slack + 30min escalation  
- **Medium (P3)**: Minor degradation, Slack only + 60min escalation
- **Low (P4)**: Performance issues, Slack only (business hours)
- **Info (P5)**: Informational only, Slack only

### Alert Routing Rules

```python
# Critical alerts (24/7)
- Channels: Email + Slack + SMS
- Escalation: 15min → PagerDuty
- Throttling: Max 5/hour, 1 hour cooldown

# High severity (business hours)  
- Channels: Email + Slack
- Escalation: 30min → SMS
- Throttling: Max 3/hour, 30min cooldown

# Medium/Low (business hours only)
- Channels: Slack
- No escalation
- Throttling: Max 10/hour, 15min cooldown
```

### Adding Custom Alert Rules

```python
from monitoring.alerting_strategy import AlertRule, AlertSeverity, AlertChannel, ThresholdType

rule = AlertRule(
    name="custom_high_latency",
    description="Custom service latency is high",
    metric_query="histogram_quantile(0.95, rate(custom_duration_bucket[5m])) > 1",
    severity=AlertSeverity.HIGH,
    threshold_type=ThresholdType.STATIC,
    threshold_value=1.0,  # 1 second
    evaluation_interval_seconds=60,
    for_duration_seconds=300,  # 5 minutes
    channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
    escalation_channels={30: [AlertChannel.SMS]},  # 30min escalation
    labels={"service": "custom", "type": "latency"}
)

alert_manager.add_alert_rule(rule)
```

## 🏥 Health Checks

### Default Health Checks

- **Backend API**: HTTP endpoint check (`/health`)
- **Frontend**: HTTP endpoint check (`/api/health`) 
- **Database**: Connection and query test
- **Redis**: Ping and memory usage
- **System Resources**: CPU, Memory, Disk usage
- **External APIs**: OpenAI, Anthropic availability

### Adding Custom Health Checks

```python
from monitoring.health_checks import BaseHealthCheck, HealthCheckResult, HealthStatus
import aiohttp

class CustomServiceHealthCheck(BaseHealthCheck):
    def __init__(self, service_url: str, **kwargs):
        super().__init__("custom_service", CheckType.HTTP, **kwargs)
        self.service_url = service_url
    
    async def _check_health(self) -> HealthCheckResult:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.service_url}/health") as response:
                if response.status == 200:
                    return HealthCheckResult(
                        name=self.name,
                        status=HealthStatus.HEALTHY,
                        message="Service responsive",
                        response_time_ms=100,
                        timestamp=datetime.utcnow()
                    )
                else:
                    return HealthCheckResult(
                        name=self.name,
                        status=HealthStatus.UNHEALTHY,
                        message=f"HTTP {response.status}",
                        response_time_ms=0,
                        timestamp=datetime.utcnow()
                    )

# Add to health manager
health_manager.add_health_check(
    CustomServiceHealthCheck("http://custom-service:8080")
)
```

## 🔄 Auto-Recovery

### Default Recovery Rules

| Trigger | Actions | Cooldown | Max Attempts |
|---------|---------|----------|--------------|
| Health Check Failed | Restart Service | 5 min | 3 |
| High Error Rate | Clear Cache + Restart | 10 min | 2 |
| High Memory | Cleanup + Restart Workers | 5 min | 2 |
| Circuit Breaker Open | Restart + Reset CB | 10 min | 2 |
| SLO Violation | Scale Up + Clear Cache | 15 min | 1 |

### Adding Custom Recovery Rules

```python
from monitoring.auto_recovery import RecoveryRule, RecoveryAction, TriggerCondition

custom_rule = RecoveryRule(
    name="custom_service_recovery",
    description="Restart custom service on failure",
    trigger_condition=TriggerCondition.SERVICE_UNAVAILABLE,
    actions=[RecoveryAction.RESTART_SERVICE, RecoveryAction.CLEAR_CACHE],
    cooldown_seconds=300,
    max_attempts=3,
    timeout_seconds=60,
    conditions={"service": "custom-service"},
    tags={"service": "custom", "action": "restart"}
)

recovery_orchestrator.add_recovery_rule(custom_rule)
```

## 📋 Incident Response

### Incident Severity Classification

- **P1 (Critical)**: Complete service outage, customer-facing impact
- **P2 (High)**: Major feature down, significant customer impact  
- **P3 (Medium)**: Minor feature down, limited customer impact
- **P4 (Low)**: Degraded performance, minimal customer impact
- **P5 (Info)**: Information only, no customer impact

### Runbooks

Built-in runbooks for common incidents:

- **Service Outage Response** (P1/P2) - 30 min estimated
- **Performance Degradation** (P2/P3) - 45 min estimated  
- **Database Issues** (P1/P2/P3) - 40 min estimated
- **API Failures** (P1/P2) - 25 min estimated
- **Security Incidents** (P1/P2) - 60 min estimated

### Creating Incidents

```python
from monitoring.incident_response import IncidentSeverity, IncidentType

incident = await incident_manager.create_incident(
    title="API Response Time Degraded",
    description="95th percentile response time above 2 seconds",
    severity=IncidentSeverity.P2_HIGH,
    incident_type=IncidentType.PERFORMANCE_DEGRADATION,
    affected_services=["backend-api"],
    detected_by="monitoring_system"
)

# Execute runbook
await incident_manager.execute_runbook(
    incident.id, 
    "performance_degradation_response", 
    "sre_engineer"
)

# Update incident
await incident_manager.update_incident(
    incident.id,
    status=IncidentStatus.INVESTIGATING,
    update_message="Identified high database query latency",
    updated_by="sre_engineer"
)

# Resolve incident
await incident_manager.resolve_incident(
    incident.id,
    resolution_summary="Optimized slow database queries, response time normalized",
    resolved_by="sre_engineer"
)
```

## 📈 Capacity Planning

### Monitored Resources

- **CPU**: Current, peak, average utilization + growth trends
- **Memory**: Usage patterns and growth projections
- **Disk**: Storage consumption and projected capacity needs
- **Database Connections**: Pool utilization and scaling needs
- **Redis Memory**: Cache usage and eviction patterns
- **API Throughput**: Request volume and capacity limits

### Scaling Recommendations

- **Immediate**: Resource >85% utilization
- **Urgent**: Resource >75% with high growth rate
- **Moderate**: Peak utilization >80%  
- **Proactive**: High growth rate (>2%/day) with <30 days to critical

### Example Capacity Metrics

```python
# Get capacity analysis
capacity_status = sre.capacity_planner.get_capacity_summary()

print(f"Overall Status: {capacity_status['overall_status']}")
print(f"Critical Resources: {capacity_status['critical_resources']}")

for resource_name, resource_data in capacity_status['resources'].items():
    print(f"{resource_name}: {resource_data['current_utilization']:.1f}%")
    if resource_data['projected_saturation_days']:
        print(f"  → Saturation in {resource_data['projected_saturation_days']} days")
    if resource_data['recommendation']:
        print(f"  → {resource_data['recommendation']}")
```

## 🎯 Performance Baselines

### Tracked Metrics

- **API Response Time**: P50, P95 with trend analysis
- **Database Query Time**: P95 with optimization recommendations
- **Frontend Load Time**: P90 with performance insights
- **AI Response Time**: Average with complexity correlation  
- **System Resources**: CPU, Memory with baseline comparison
- **Error Rates**: Trend analysis and anomaly detection
- **Throughput**: RPS trends and capacity planning

### Anomaly Detection

```python
# Get performance analysis
perf_summary = sre.baseline_manager.get_performance_summary()

# Check for anomalies
anomalies = perf_summary['anomalies']
for anomaly in anomalies:
    print(f"Anomaly in {anomaly['metric']}: {anomaly['severity']}")
    print(f"  Current: {anomaly['current_value']}")
    print(f"  Baseline: {anomaly['baseline_value']}")
    print(f"  Deviation: {anomaly['deviation_percentage']:.1f}%")
    print(f"  Trend: {anomaly['trend']}")
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="sqlite:///./agent_system.db"

# Redis
REDIS_URL="redis://localhost:6379"

# Email Notifications  
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USERNAME="alerts@6fb.ai"
SMTP_PASSWORD="app-password"
FROM_EMAIL="sre@6fb.ai"
SECURITY_ALERT_EMAILS="team@6fb.ai,oncall@6fb.ai"

# Webhook Notifications
SECURITY_WEBHOOK_URL="https://hooks.slack.com/services/..."
WEBHOOK_SECRET="your-webhook-secret"

# Slack Integration
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# External APIs
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="AIza..."

# Monitoring
PROMETHEUS_URL="http://localhost:9090"
GRAFANA_URL="http://localhost:3000"
```

### Monitoring Intervals

- **Health Checks**: 30 seconds
- **SLO Evaluation**: 5 minutes  
- **Capacity Analysis**: 5 minutes
- **Performance Baselines**: 5 minutes
- **Alert Evaluation**: 1 minute
- **Dashboard Updates**: 30 seconds

## 📊 Dashboards

### SRE Dashboard (`http://localhost:8080`)

Real-time dashboard showing:

- **System Health Overview**: Health score and status
- **SLO Status**: Healthy/Warning/Critical SLOs
- **Active Alerts**: Current alerts by severity
- **Performance Metrics**: Response time, error rate, throughput
- **Incidents**: Open incidents and MTTR
- **Capacity Status**: Resource utilization and warnings
- **Auto-Recovery**: Recovery success rate and active rules

### API Endpoints

- `GET /api/health` - Health check
- `GET /api/metrics` - Dashboard metrics
- `GET /api/slo-status` - SLO status and error budgets
- `GET /api/health-checks` - Health check results
- `GET /api/alerts` - Active alerts and summary
- `GET /api/incidents` - Open incidents and metrics
- `GET /api/capacity` - Capacity planning data
- `GET /api/performance` - Performance baselines
- `GET /api/recovery-status` - Auto-recovery status
- `POST /api/alerts/{alert_id}/acknowledge` - Acknowledge alert
- `POST /api/recovery/trigger` - Manual recovery trigger
- `POST /api/health-checks/{check_name}/run` - Run health check

### WebSocket Updates

Real-time updates via WebSocket at `/ws`:

```javascript
const ws = new WebSocket('ws://localhost:8080/ws');
ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    if (data.type === 'metrics_update') {
        updateDashboard(data.metrics);
    }
};
```

## 🛠️ Integration

### With FastAPI Backend

```python
# Add to fastapi_backend.py
from monitoring.sre_framework import SREFramework
from monitoring.health_checks import HealthCheckManager

app = FastAPI()
sre_framework = SREFramework()
health_manager = HealthCheckManager()

@app.on_event("startup")
async def startup_event():
    await sre_framework.start()

@app.on_event("shutdown") 
async def shutdown_event():
    await sre_framework.stop()

@app.get("/health")
async def health_check():
    health_summary = health_manager.get_health_summary()
    return {
        "status": health_summary['overall_status'],
        "checks": health_summary['checks']
    }
```

### With Next.js Frontend

```javascript
// Add to app/api/health/route.js
export async function GET() {
  try {
    const healthResponse = await fetch('http://localhost:8001/health');
    const healthData = await healthResponse.json();
    
    return Response.json({
      status: healthData.status,
      timestamp: new Date().toISOString(),
      frontend: 'healthy'
    });
  } catch (error) {
    return Response.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 });
  }
}
```

## 🔍 Troubleshooting

### Common Issues

**SRE Framework won't start:**
```bash
# Check dependencies
pip install -r requirements.txt

# Check database permissions
ls -la agent_system.db

# Check port availability
lsof -i :8080
```

**Alerts not sending:**
```bash
# Verify SMTP settings
export SMTP_SERVER="smtp.gmail.com"
export SMTP_USERNAME="your-email@domain.com"
export SMTP_PASSWORD="app-password"

# Test email connectivity
python -c "import smtplib; s=smtplib.SMTP('smtp.gmail.com', 587); s.starttls(); print('SMTP OK')"
```

**Health checks failing:**
```bash
# Check service endpoints
curl http://localhost:8001/health
curl http://localhost:9999/api/health

# Check Redis connection
redis-cli ping

# Check database
sqlite3 agent_system.db ".tables"
```

**Dashboard not loading:**
```bash
# Check dashboard process
ps aux | grep sre_dashboard

# Check port binding
netstat -tulpn | grep 8080

# Check logs
tail -f /var/log/sre_dashboard.log
```

### Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Or set environment variable
export LOG_LEVEL=DEBUG
```

### Performance Tuning

Adjust monitoring intervals based on system load:

```python
# Reduce frequency for high-load systems
sre_config = {
    'health_check_interval': 60,  # Default: 30 seconds
    'slo_evaluation_interval': 300,  # Default: 300 seconds  
    'capacity_analysis_interval': 600,  # Default: 300 seconds
}
```

## 🔒 Security

### Authentication

Dashboard authentication (if enabled):

```python
# Add to sre_dashboard.py
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, HTTPException

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != os.getenv('SRE_DASHBOARD_TOKEN'):
        raise HTTPException(status_code=403, detail="Invalid token")
    return credentials
```

### Network Security

```bash
# Firewall rules (example)
ufw allow from 10.0.0.0/8 to any port 8080  # Internal network only
ufw deny 8080  # Block external access
```

### Secrets Management

Store sensitive configuration in secure locations:

```bash
# Use environment files
source /etc/sre/secrets.env

# Or use secrets management
export SMTP_PASSWORD=$(aws secretsmanager get-secret-value --secret-id sre/smtp --query SecretString --output text)
```

## 📚 Additional Resources

- **Prometheus Query Examples**: `/monitoring/prometheus-queries.md`
- **Grafana Dashboards**: `/monitoring/grafana/`  
- **Runbook Templates**: `/monitoring/runbooks/`
- **Alert Rule Examples**: `/monitoring/alert-examples.md`
- **Capacity Planning Guide**: `/monitoring/capacity-planning.md`

## 🤝 Contributing

1. Follow the existing code patterns
2. Add tests for new features
3. Update documentation
4. Test with real scenarios
5. Submit PR with detailed description

## 📄 License

MIT License - see LICENSE file for details.

---

**🛡️ Production-Ready SRE Framework for 6FB AI Agent System**

*Implementing Google SRE principles with automated reliability engineering.*