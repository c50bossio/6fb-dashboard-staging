# 6FB AI Agent System - Monitoring & Observability Guide

## Overview

This document provides comprehensive guidance for monitoring the 6FB AI Agent System using a modern observability stack built on Prometheus, Grafana, and AlertManager. The monitoring setup follows SRE best practices with proper SLO/SLI definitions, tiered alerting, and business-focused metrics.

## Table of Contents

- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
- [Dashboards](#dashboards)
- [Alerting](#alerting)
- [Metrics Guide](#metrics-guide)
- [Runbooks](#runbooks)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    6FB AI Agent System                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   FastAPI   │  │   Next.js   │  │  PostgreSQL │            │
│  │   Backend   │  │  Frontend   │  │  Database   │            │
│  │    :8000    │  │    :3000    │  │    :5432    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┼─────────────────┐  │
│                         │                │                 │  │
├─────────────────────────────────────────────────────────────────┤
│                  Monitoring Stack                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │ Prometheus  │  │   Grafana   │  │AlertManager │            │
│  │    :9090    │  │    :3000    │  │    :9093    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│         │                │                │                    │
│         └────────────────┼────────────────┘                    │
│                         │                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Blackbox  │  │Redis Export │  │Node Export  │            │
│  │   Exporter  │  │     :9121   │  │    :9100    │            │
│  │    :9115    │  └─────────────┘  └─────────────┘            │
│  └─────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Components

- **Prometheus**: Time-series database and monitoring system
- **Grafana**: Visualization and dashboarding platform
- **AlertManager**: Alert routing and notification management
- **Blackbox Exporter**: Endpoint monitoring and health checks
- **Node Exporter**: System-level metrics collection
- **Redis Exporter**: Redis cache metrics
- **Postgres Exporter**: Database performance metrics

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Environment variables configured
- Network access between services

### 1. Environment Setup

```bash
# Copy environment template
cp infrastructure/monitoring/.env.template infrastructure/monitoring/.env

# Edit configuration
vim infrastructure/monitoring/.env
```

Required environment variables:
```bash
# Email configuration
SMTP_SMARTHOST=smtp.gmail.com:587
SMTP_FROM=alerts@6fb.ai
SMTP_USERNAME=alerts@6fb.ai
SMTP_PASSWORD=your_app_password

# Alert destinations
ONCALL_EMAIL=oncall@6fb.ai
SECURITY_EMAIL=security@6fb.ai
BUSINESS_EMAIL=business@6fb.ai

# External URLs
PROMETHEUS_EXTERNAL_URL=http://prometheus:9090
GRAFANA_URL=http://grafana:3000
```

### 2. Deploy Monitoring Stack

```bash
# Deploy with Docker Compose
cd infrastructure/monitoring
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f prometheus
```

### 3. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **AlertManager**: http://localhost:9093

### 4. Configure Data Sources

Grafana will automatically provision Prometheus as a data source. Verify by:

1. Navigate to Configuration → Data Sources
2. Confirm Prometheus is configured and working
3. Test connection with "Test" button

## Service Level Objectives (SLOs)

The 6FB AI Agent System maintains the following SLOs:

### 🎯 Availability SLO: 99.9%

- **Measurement**: Percentage of successful HTTP requests
- **Time Window**: Rolling 30-day period
- **Error Budget**: 0.1% (43.2 minutes/month)

**Query**: `sixfb:sli_availability_ratio`

### ⚡ Latency SLO: 95% of requests < 2 seconds

- **Measurement**: 95th percentile response time
- **Time Window**: Rolling 24-hour period
- **Threshold**: 2000ms

**Query**: `sixfb:sli_latency_95th_percentile < 2`

### 🚫 Error Rate SLO: < 0.1%

- **Measurement**: Percentage of 5xx HTTP responses
- **Time Window**: Rolling 24-hour period
- **Threshold**: 0.1%

**Query**: `sixfb:sli_error_rate < 0.001`

### 💰 Business Continuity SLO: Commission Processing < 1 hour

- **Measurement**: Time from booking completion to commission calculation
- **Time Window**: Per transaction
- **Threshold**: 3600 seconds (1 hour)

## Dashboards

### 📊 Application Overview Dashboard

**URL**: `/d/sixfb-app-overview`

**Purpose**: High-level system health and SLO tracking

**Key Panels**:
- System Availability (SLO gauge)
- Response Time (SLO gauge)  
- Error Rate (SLO gauge)
- Request Throughput
- Business Metrics (Bookings, Revenue)
- AI System Performance

**Refresh Rate**: 30 seconds

### 🖥️ Infrastructure Metrics Dashboard

**URL**: `/d/sixfb-infrastructure`

**Purpose**: System resource monitoring and capacity planning

**Key Panels**:
- CPU Usage by Instance
- Memory Usage by Instance
- Disk Usage by Instance
- Network I/O
- Database Connections
- Redis Cache Performance
- Container Metrics

**Refresh Rate**: 30 seconds

### 💰 Business Metrics Dashboard

**URL**: `/d/sixfb-business-metrics`

**Purpose**: Revenue tracking and business KPI monitoring

**Key Panels**:
- Daily Revenue & Bookings
- Average Booking Value
- Conversion Rates
- Active Barbers
- Commission Processing
- Growth Metrics
- Customer Retention

**Refresh Rate**: 30 seconds

## Alerting

### Alert Severity Levels

| Severity | Response Time | Escalation | Example |
|----------|---------------|------------|---------|
| **Critical** | 5 minutes | Immediate pager | Service Down, SLO Breach |
| **Warning** | 30 minutes | Email/Slack | High CPU, Slow Response |
| **Info** | 2 hours | Daily digest | Deployment, New Users |

### Alert Categories

#### 🚨 System Health Alerts

- **ServiceDown**: Any service becomes unavailable
- **HighCPUUsage**: CPU > 80% for 5 minutes
- **HighMemoryUsage**: Memory > 85% for 5 minutes
- **HighDiskUsage**: Disk > 85% for 5 minutes

#### 📊 SLO Breach Alerts

- **SLO_AvailabilityBreach**: Availability < 99.9%
- **SLO_ResponseTimeBreach**: 95th percentile > 2s
- **SLO_ErrorRateBreach**: Error rate > 0.1%

#### 🔒 Security Alerts

- **HighFailedAuthentications**: > 20 failed logins/5min
- **SQLInjectionAttempt**: SQL injection detected
- **SuspiciousUserAgents**: Suspicious traffic patterns

#### 💰 Business Alerts

- **HighAITokenUsage**: AI costs > $100/hour
- **CommissionProcessingFailures**: Commission failures
- **BookingRateAnomaly**: Unusual booking patterns

### Alert Routing

```yaml
# Critical alerts → Immediate pager/phone
severity="critical" → oncall@6fb.ai + PagerDuty

# Security alerts → Security team
category="security" → security@6fb.ai

# Business alerts → Business stakeholders  
category="business" → business@6fb.ai

# Performance alerts → Operations team
category="performance" → ops@6fb.ai
```

### Notification Channels

1. **Email**: Primary notification method
2. **Slack**: Real-time team notifications (optional)
3. **PagerDuty**: Critical alert escalation (optional)
4. **Webhooks**: Custom integrations (optional)

## Metrics Guide

### Infrastructure Metrics

#### CPU Usage
```promql
# Current CPU usage percentage
100 - (avg by(instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# CPU usage by core
100 - (irate(node_cpu_seconds_total{mode="idle"}[5m]) * 100)
```

#### Memory Usage
```promql
# Memory usage percentage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / 
node_memory_MemTotal_bytes * 100

# Available memory
node_memory_MemAvailable_bytes
```

#### Disk Usage
```promql
# Disk usage percentage
(node_filesystem_size_bytes{fstype!="tmpfs"} - 
 node_filesystem_avail_bytes{fstype!="tmpfs"}) / 
node_filesystem_size_bytes{fstype!="tmpfs"} * 100
```

### Application Metrics

#### HTTP Requests
```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / 
rate(http_requests_total[5m])

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

#### Database Metrics
```promql
# Active connections
pg_stat_database_numbackends

# Query rate
rate(pg_stat_database_xact_commit[5m]) + 
rate(pg_stat_database_xact_rollback[5m])

# Cache hit ratio
(sum(pg_stat_database_blks_hit) / 
 (sum(pg_stat_database_blks_hit) + sum(pg_stat_database_blks_read))) * 100
```

### Business Metrics

#### Revenue Tracking
```promql
# Hourly revenue
rate(sixfb_revenue_generated_total[1h]) * 3600

# Daily bookings
increase(sixfb_bookings_created_total[24h])

# Average booking value
rate(sixfb_booking_total_value_dollars[1h]) / 
rate(sixfb_bookings_created_total[1h])
```

#### AI System Metrics
```promql
# AI request rate
rate(sixfb_ai_requests_total[5m])

# AI token consumption
rate(sixfb_ai_tokens_consumed_total[5m]) * 60

# AI cost per hour
(rate(sixfb_ai_tokens_consumed_total[1h]) * 3600 *
 on() group_left() sixfb_ai_cost_per_token_dollars)
```

## Runbooks

### 🚨 Service Down Response

**Alert**: `ServiceDown`

**Immediate Actions**:
1. Check service logs: `docker logs <container_name>`
2. Verify network connectivity
3. Check resource availability (CPU/Memory/Disk)
4. Restart service if needed: `docker restart <container_name>`
5. Scale horizontally if load-related

**Investigation**:
- Review recent deployments
- Check dependency health (database, Redis)
- Analyze error patterns in logs
- Verify configuration changes

**Resolution**:
- Fix underlying cause
- Document incident in post-mortem
- Update monitoring if needed

### 📊 SLO Breach Response

**Alert**: `SLO_AvailabilityBreach`, `SLO_ResponseTimeBreach`, `SLO_ErrorRateBreach`

**Immediate Actions**:
1. Assess error budget consumption
2. Identify contributing factors
3. Implement temporary mitigation
4. Notify stakeholders of SLO impact

**Investigation**:
- Analyze traffic patterns
- Review performance metrics
- Check for infrastructure issues
- Examine recent changes

**Resolution**:
- Address root cause
- Consider feature rollback if needed
- Update SLO if unrealistic
- Review error budget policy

### 🔒 Security Incident Response

**Alert**: `SQLInjectionAttempt`, `HighFailedAuthentications`

**Immediate Actions**:
1. **DO NOT PANIC** - Follow security protocol
2. Assess threat severity
3. Block suspicious IP addresses
4. Notify security team immediately
5. Preserve evidence (logs, metrics)

**Investigation**:
- Analyze attack patterns
- Review access logs
- Check for data breach indicators
- Assess system integrity

**Resolution**:
- Implement security patches
- Update WAF rules
- Conduct security review
- Document incident for compliance

### 💰 Business Critical Response

**Alert**: `CommissionProcessingFailures`, `HighAITokenUsage`

**Immediate Actions**:
1. Assess business impact
2. Notify business stakeholders
3. Implement cost controls if needed
4. Check financial system integrity

**Investigation**:
- Review transaction logs
- Analyze cost patterns
- Check payment processor status
- Verify commission calculations

**Resolution**:
- Fix processing issues
- Optimize AI usage if needed
- Update business alerts
- Review cost controls

## Troubleshooting

### Common Issues

#### 1. Prometheus Not Scraping Targets

**Symptoms**: Missing metrics in Grafana, targets down in Prometheus

**Diagnosis**:
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check service health
curl http://localhost:8000/metrics
curl http://localhost:3000/api/metrics
```

**Solutions**:
- Verify service URLs in `prometheus.yml`
- Check network connectivity
- Confirm metrics endpoints are enabled
- Review service logs for errors

#### 2. Alerts Not Firing

**Symptoms**: Expected alerts not received

**Diagnosis**:
```bash
# Check AlertManager status
curl http://localhost:9093/api/v1/status

# Review alert rules
curl http://localhost:9090/api/v1/rules

# Check alert history
curl http://localhost:9093/api/v1/alerts
```

**Solutions**:
- Verify alert rule syntax
- Check AlertManager routing configuration
- Confirm email/notification settings
- Test notification channels

#### 3. High Memory Usage in Prometheus

**Symptoms**: Prometheus consuming excessive memory

**Diagnosis**:
```bash
# Check Prometheus metrics
curl http://localhost:9090/metrics | grep prometheus_tsdb

# Review retention settings
curl http://localhost:9090/api/v1/label/__name__/values | wc -l
```

**Solutions**:
- Reduce retention period
- Optimize recording rules
- Remove high-cardinality metrics
- Increase memory allocation

#### 4. Missing Business Metrics

**Symptoms**: Business dashboards showing no data

**Diagnosis**:
```bash
# Check application metrics
curl http://localhost:8000/metrics/business

# Verify database connectivity
docker exec -it postgres psql -U postgres -c "\\dt"
```

**Solutions**:
- Enable business metrics in application
- Verify database queries
- Check metric naming conventions
- Review application logs

### Performance Optimization

#### Prometheus Optimization

```yaml
# Optimize scrape intervals
global:
  scrape_interval: 15s  # Default
  
scrape_configs:
  - job_name: 'high-frequency'
    scrape_interval: 5s   # Critical services
    
  - job_name: 'low-frequency'  
    scrape_interval: 60s  # Less critical metrics
```

#### Query Performance

```promql
# Use recording rules for expensive queries
sixfb:http_error_rate_5m = 
  rate(http_requests_total{status=~"5.."}[5m]) / 
  rate(http_requests_total[5m])

# Avoid high-cardinality labels
rate(http_requests_total[5m])  # Good
rate(http_requests_total{user_id="123"}[5m])  # Bad - high cardinality
```

#### Grafana Optimization

- Use template variables for filtering
- Limit time ranges for heavy queries
- Enable query caching
- Use appropriate refresh intervals

## Advanced Configuration

### Custom Metrics

#### Application Metrics

```python
# FastAPI application metrics
from prometheus_client import Counter, Histogram, Gauge

# Business metrics
bookings_created = Counter('sixfb_bookings_created_total', 
                          'Total bookings created', ['barber_id', 'service_type'])

revenue_generated = Counter('sixfb_revenue_generated_total',
                           'Total revenue generated in USD')

commission_processing_time = Histogram('sixfb_commission_processing_seconds',
                                      'Commission processing time')

active_barbers = Gauge('sixfb_active_barbers_total',
                      'Number of currently active barbers')
```

#### Recording Rules

```yaml
# Complex business metrics
groups:
  - name: business_metrics
    interval: 60s
    rules:
      - record: sixfb:booking_conversion_rate
        expr: |
          (
            rate(sixfb_bookings_completed_total[1h]) /
            rate(sixfb_booking_attempts_total[1h])
          ) * 100
          
      - record: sixfb:customer_lifetime_value
        expr: |
          (
            sum(rate(sixfb_revenue_generated_total[30d])) by (customer_id) /
            count(rate(sixfb_bookings_created_total[30d])) by (customer_id)
          )
```

### Integration Examples

#### Slack Notifications

```yaml
# alertmanager.yml
receivers:
  - name: 'slack-critical'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#critical-alerts'
        title: '🚨 Critical Alert'
        text: |
          {{ range .Alerts }}
          *{{ .Annotations.summary }}*
          {{ .Annotations.description }}
          {{ end }}
        actions:
          - type: 'button'
            text: 'View Dashboard'
            url: 'https://grafana.6fb.ai/d/sixfb-app-overview'
```

#### PagerDuty Integration

```yaml
# alertmanager.yml  
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
        description: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
        severity: 'critical'
        client: '6FB AI Agent System'
```

### Security Configuration

#### TLS/SSL Setup

```yaml
# prometheus.yml
global:
  external_labels:
    cluster: '6fb-ai-system'
    
tls_config:
  cert_file: '/etc/ssl/certs/prometheus.crt'
  key_file: '/etc/ssl/private/prometheus.key'
  ca_file: '/etc/ssl/certs/ca.crt'
```

#### Authentication

```yaml
# grafana.ini
[auth]
disable_login_form = false
disable_signout_menu = false

[auth.basic]
enabled = true

[auth.oauth]
enabled = true
allow_sign_up = true
```

### Backup & Recovery

#### Prometheus Data Backup

```bash
# Create backup
docker exec prometheus tar -czf /tmp/prometheus-backup.tar.gz /prometheus/data

# Copy backup
docker cp prometheus:/tmp/prometheus-backup.tar.gz ./backups/

# Restore backup (service must be stopped)
docker cp ./backups/prometheus-backup.tar.gz prometheus:/tmp/
docker exec prometheus tar -xzf /tmp/prometheus-backup.tar.gz -C /
```

#### Grafana Backup

```bash
# Export dashboards
curl -X GET http://admin:admin@localhost:3000/api/search?query=& | \
jq -r '.[] | select(.type == "dash-db") | .uid' | \
while read uid; do
  curl -X GET http://admin:admin@localhost:3000/api/dashboards/uid/$uid | \
  jq '.dashboard' > "dashboards/$uid.json"
done
```

---

## Support & Maintenance

### Regular Maintenance Tasks

#### Daily
- [ ] Review critical alerts
- [ ] Check SLO compliance
- [ ] Monitor system resource usage

#### Weekly  
- [ ] Review alert noise and tune thresholds
- [ ] Check retention policies
- [ ] Update dashboard content
- [ ] Validate backup procedures

#### Monthly
- [ ] Review and update SLOs
- [ ] Performance optimization
- [ ] Security audit of monitoring
- [ ] Update documentation

### Contact Information

- **Monitoring Team**: monitoring@6fb.ai
- **On-Call Engineer**: oncall@6fb.ai  
- **Security Team**: security@6fb.ai
- **Documentation**: https://docs.6fb.ai/monitoring

### Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [SRE Best Practices](https://sre.google/books/)

---

**Last Updated**: December 2024  
**Version**: 2.0  
**Maintainer**: 6FB SRE Team