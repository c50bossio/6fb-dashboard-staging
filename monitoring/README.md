# 6FB AI Agent System - Monitoring & Alerting

Comprehensive production monitoring stack with Prometheus, Grafana, and Alertmanager.

## Quick Start

```bash
# Start monitoring stack
npm run monitoring:start

# Stop monitoring stack
npm run monitoring:stop

# View logs
npm run monitoring:logs

# Check status
npm run monitoring:status
```

## Services Overview

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| **Prometheus** | 9090 | Metrics collection & storage | http://localhost:9090 |
| **Grafana** | 3001 | Visualization & dashboards | http://localhost:3001 |
| **Alertmanager** | 9093 | Alert routing & notifications | http://localhost:9093 |
| **Node Exporter** | 9100 | System metrics | http://localhost:9100 |
| **cAdvisor** | 8080 | Container metrics | http://localhost:8080 |
| **Blackbox Exporter** | 9115 | Endpoint monitoring | http://localhost:9115 |
| **PostgreSQL Exporter** | 9187 | Database metrics | http://localhost:9187 |
| **Redis Exporter** | 9121 | Cache metrics | http://localhost:9121 |

## Default Credentials

- **Grafana**: admin / admin123 (change in production)
- **Environment**: Configure passwords in `.env.production`

## Key Features

### 📊 Metrics Collection
- **System Metrics**: CPU, memory, disk, network via Node Exporter
- **Container Metrics**: Docker resource usage via cAdvisor
- **Application Metrics**: Custom business metrics via `/api/metrics`
- **Database Metrics**: PostgreSQL performance via custom queries
- **Cache Metrics**: Redis performance and usage
- **External Monitoring**: Health checks via Blackbox Exporter

### 🚨 Comprehensive Alerting
- **Critical Alerts**: Service downtime, resource exhaustion
- **Security Alerts**: Failed logins, DDoS indicators, SSL expiry
- **Performance Alerts**: High CPU/memory, slow responses
- **Business Alerts**: Booking conversion rates, AI accuracy
- **Custom Routing**: Different notification channels by severity

### 📈 Pre-built Dashboards
- **Main Dashboard**: System overview with key metrics
- **Performance Dashboard**: Response times, error rates
- **Security Dashboard**: Security events and trends
- **Business Dashboard**: Booking metrics, user activity
- **Infrastructure Dashboard**: Container and network metrics

## Configuration

### Environment Variables
```bash
# Required for production
GRAFANA_PASSWORD=your-secure-password
POSTGRES_PASSWORD=your-db-password
REDIS_PASSWORD=your-cache-password

# Optional - Email alerts
SMTP_HOST=your-smtp-server
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

### Alert Routing
Edit `monitoring/alertmanager/alertmanager.yml` to configure:
- Email recipients
- Slack/Discord webhooks
- PagerDuty integration
- Alert grouping and timing

### Custom Metrics
Add business metrics in `app/api/metrics/route.js`:
```javascript
// Example: Track booking conversions
export function trackBookingConversion(success) {
  if (success) {
    incrementMetric('booking_conversions_total');
  }
  incrementMetric('booking_attempts_total');
}
```

## Alert Rules

### Critical Alerts (Immediate Action)
- **ServiceDown**: Service unavailable for 1+ minutes
- **HighCPUUsage**: CPU >90% for 5+ minutes
- **HighMemoryUsage**: Memory >90% for 5+ minutes
- **DiskSpaceCritical**: Disk space <10%
- **DatabaseConnectionFailure**: DB unreachable for 30+ seconds

### Warning Alerts (Review Required)
- **HighErrorRate**: 5xx errors >5% for 3+ minutes
- **SlowResponseTime**: 95th percentile >2 seconds
- **AIServiceFailure**: AI service errors >10%
- **HighFailedLoginRate**: >10 failed logins/minute

### Security Alerts (Security Review)
- **PossibleDDoSAttack**: >1000 requests/minute
- **SSLCertificateExpiring**: Certificate expires in <7 days
- **SecurityViolation**: Pattern-based security violations

## Grafana Dashboards

### Import Community Dashboards
1. Go to Grafana → Dashboards → Import
2. Use these dashboard IDs:
   - **Node Exporter Full**: 1860
   - **Docker Container Metrics**: 14282
   - **PostgreSQL Database**: 9628
   - **Redis**: 763

### Custom Dashboard Variables
- `$instance`: Filter by server instance
- `$job`: Filter by service type
- `$timerange`: Adjust time window

## Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker daemon
docker info

# Check logs
npm run monitoring:logs

# Reset monitoring stack
npm run monitoring:stop
docker system prune -f
npm run monitoring:start
```

**Grafana permission errors:**
```bash
# Fix Grafana permissions
sudo chown -R 472:472 monitoring/grafana/
npm run monitoring:restart
```

**No metrics in Prometheus:**
```bash
# Check targets status
curl http://localhost:9090/api/v1/targets

# Verify application metrics
curl http://localhost:9999/api/metrics
curl http://localhost:8001/metrics
```

**Alerts not firing:**
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Test alertmanager
curl -X POST http://localhost:9093/api/v1/alerts

# Verify email config
docker-compose -f monitoring/docker-compose.monitoring.yml logs alertmanager
```

### Performance Optimization

**High resource usage:**
- Reduce scrape intervals in `prometheus/prometheus.yml`
- Limit retention period: `--storage.tsdb.retention.time=15d`
- Disable unnecessary metrics collection

**Slow queries:**
- Optimize PromQL queries in dashboards
- Use recording rules for complex calculations
- Implement metric caching

## Production Considerations

### Security
- Change default passwords
- Enable HTTPS for external access
- Configure firewall rules
- Use secrets management

### High Availability
- Deploy Prometheus in HA mode
- Set up Grafana clustering
- Configure external storage
- Implement backup strategies

### Scaling
- Use remote storage (Thanos, Cortex)
- Implement federation for multiple sites
- Use recording rules for heavy queries
- Set up metric sharding

## Integration with Main Application

### Automatic Startup
Add to `docker-compose.production.yml`:
```yaml
depends_on:
  - prometheus
  - grafana
```

### Custom Metrics
Application automatically exposes metrics at:
- Frontend: `http://localhost:9999/api/metrics`
- Backend: `http://localhost:8001/metrics`

### Health Checks
Monitoring stack monitors:
- Application health endpoints
- Database connectivity
- External service availability
- SSL certificate status

## Support

For monitoring-related issues:
1. Check service logs: `npm run monitoring:logs`
2. Verify configuration files in `monitoring/`
3. Test individual components at their endpoints
4. Review alert rules and dashboard queries

---

**Note**: This monitoring stack is designed for production use with comprehensive alerting and business metric tracking. For development, consider using `--skip-validation` flag for faster startup.