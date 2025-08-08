# 6FB AI Agent System - Operations Runbooks

Operational procedures for managing the production barbershop management platform.

## 🚨 Emergency Response Procedures

### Service Outage Response

**Severity: Critical**
**Response Time: < 5 minutes**

```bash
# 1. Immediate Assessment
npm run deploy:status
npm run monitoring:status

# 2. Check Service Health
curl http://localhost/health
curl http://localhost:3000/api/health
curl http://localhost:8000/health

# 3. View Recent Logs
npm run deploy:logs --tail=50

# 4. If services are down, restart
npm run deploy:down
npm run deploy:up

# 5. Monitor recovery
watch -n 5 'npm run deploy:status'
```

**Escalation Path:**
1. On-call engineer (immediate)
2. Senior engineer (15 minutes)
3. Engineering manager (30 minutes)

### Database Connection Failure

**Symptoms:**
- Applications showing database connection errors
- Health checks failing
- User authentication issues

```bash
# 1. Check PostgreSQL status
docker-compose -f docker-compose.production.yml ps postgres
docker-compose -f docker-compose.production.yml logs postgres --tail=20

# 2. Test database connectivity
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U barbershop

# 3. Check database connections
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT state, count(*) 
FROM pg_stat_activity 
WHERE state IS NOT NULL 
GROUP BY state;"

# 4. If connection pool exhausted, restart services
docker-compose -f docker-compose.production.yml restart backend
docker-compose -f docker-compose.production.yml restart frontend

# 5. If database is corrupted, restore from backup
./scripts/restore-database.sh backup-YYYYMMDD.sql
```

### High CPU/Memory Usage

**Symptoms:**
- Application slowness
- Server unresponsive
- High load alerts

```bash
# 1. Identify resource-heavy containers
docker stats --no-stream

# 2. Check system resources
htop
free -h
df -h

# 3. Review application logs for errors
npm run deploy:logs | grep -E "(ERROR|CRITICAL|OutOfMemory)"

# 4. Scale services if needed
docker-compose -f docker-compose.production.yml up -d --scale backend=3 --scale frontend=2

# 5. If memory leak suspected, restart services
docker-compose -f docker-compose.production.yml restart backend frontend
```

### SSL Certificate Expiry

**Symptoms:**
- Browser SSL warnings
- Monitoring alerts about certificate expiry

```bash
# 1. Check certificate expiry date
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# 2. Renew Let's Encrypt certificate
sudo certbot renew --force-renewal

# 3. Copy new certificates
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 4. Restart nginx
docker-compose -f docker-compose.production.yml restart nginx

# 5. Verify new certificate
curl -I https://your-domain.com
```

## 🔧 Routine Maintenance Procedures

### Daily Health Checks

**Schedule: Every day at 9:00 AM**

```bash
#!/bin/bash
# daily-health-check.sh

echo "=== Daily Health Check $(date) ==="

# 1. Service Status
echo "--- Service Status ---"
npm run deploy:status

# 2. Resource Usage
echo "--- Resource Usage ---"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# 3. Database Health
echo "--- Database Health ---"
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT 
    'Database Size' as metric,
    pg_size_pretty(pg_database_size('barbershop_ai')) as value
UNION ALL
SELECT 
    'Active Connections',
    count(*)::text
FROM pg_stat_activity 
WHERE state = 'active';"

# 4. Error Rates (last 24 hours)
echo "--- Error Rates ---"
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[24h])" | jq '.data.result[0].value[1] // "0"'

# 5. Backup Status
echo "--- Backup Status ---"
ls -la backups/ | head -5

# 6. Certificate Expiry
echo "--- SSL Certificate ---"
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates | grep "notAfter"

echo "=== Health Check Complete ==="
```

### Weekly Maintenance

**Schedule: Every Sunday at 2:00 AM**

```bash
#!/bin/bash
# weekly-maintenance.sh

echo "=== Weekly Maintenance $(date) ==="

# 1. System Updates
echo "--- Updating System ---"
sudo apt update && sudo apt upgrade -y

# 2. Docker Cleanup
echo "--- Docker Cleanup ---"
docker system prune -f --volumes

# 3. Database Maintenance
echo "--- Database Maintenance ---"
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
VACUUM ANALYZE;
REINDEX DATABASE barbershop_ai;"

# 4. Log Rotation
echo "--- Log Rotation ---"
find logs/ -name "*.log" -mtime +7 -delete
logrotate -f /etc/logrotate.d/6fb-ai-agent-system

# 5. Backup Creation
echo "--- Creating Backup ---"
./scripts/create-full-backup.sh

# 6. Performance Report
echo "--- Performance Report ---"
curl -s "http://localhost:9090/api/v1/query?query=avg_over_time(http_request_duration_seconds{quantile=\"0.95\"}[7d])" | jq '.data.result[0].value[1]' | xargs printf "Average 95th percentile response time (7d): %.3fs\n"

# 7. Security Scan
echo "--- Security Scan ---"
npm run test:security:quick

echo "=== Weekly Maintenance Complete ==="
```

### Monthly Security Review

**Schedule: First Monday of each month**

```bash
#!/bin/bash
# monthly-security-review.sh

echo "=== Monthly Security Review $(date) ==="

# 1. Security Updates
echo "--- Security Updates ---"
sudo unattended-upgrades --dry-run

# 2. Access Log Analysis
echo "--- Access Log Analysis ---"
tail -10000 logs/nginx/access.log | awk '{print $1}' | sort | uniq -c | sort -rn | head -20

# 3. Failed Authentication Attempts
echo "--- Failed Authentication Attempts ---"
grep -c "authentication failed" logs/app/*.log

# 4. SSL Configuration Check
echo "--- SSL Configuration ---"
sslscan your-domain.com | grep -E "(Certificate|Protocol|Cipher)"

# 5. Dependency Vulnerability Scan
echo "--- Dependency Vulnerabilities ---"
npm audit --audit-level high
pip list --format=json | safety check --json

# 6. Firewall Status
echo "--- Firewall Status ---"
sudo ufw status verbose

echo "=== Security Review Complete ==="
```

## 📊 Monitoring and Alerting Procedures

### Alert Response Procedures

#### Critical Alert: ServiceDown

**Response Time: < 2 minutes**

```bash
# 1. Identify which service is down
curl http://localhost:9090/api/v1/query?query=up==0

# 2. Check service logs
SERVICE_NAME=$(curl -s "http://localhost:9090/api/v1/query?query=up==0" | jq -r '.data.result[0].labels.job')
docker-compose -f docker-compose.production.yml logs $SERVICE_NAME --tail=50

# 3. Attempt service restart
docker-compose -f docker-compose.production.yml restart $SERVICE_NAME

# 4. Monitor recovery
watch -n 10 "curl -s http://localhost:9090/api/v1/query?query=up{job=\"$SERVICE_NAME\"}"

# 5. If restart fails, check dependencies and escalate
```

#### Warning Alert: HighErrorRate

**Response Time: < 10 minutes**

```bash
# 1. Check error rate details
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq '.data.result'

# 2. Identify error patterns in logs
npm run deploy:logs | grep -E "ERROR|5[0-9][0-9]" | tail -20

# 3. Check if specific endpoints are failing
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m]) by (handler)" | jq '.data.result'

# 4. Investigate root cause (database, external APIs, etc.)
# 5. Apply fix or scale services if needed
```

#### Business Alert: LowBookingConversionRate

**Response Time: < 30 minutes**

```bash
# 1. Check current conversion metrics
curl -s "http://localhost:9090/api/v1/query?query=booking_conversion_rate" | jq '.data.result[0].value[1]'

# 2. Review recent bookings in database
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT status, count(*), avg(extract(epoch from (updated_at - created_at))) 
FROM bookings 
WHERE created_at > NOW() - INTERVAL '2 hours' 
GROUP BY status;"

# 3. Check for system issues affecting booking flow
npm run test:e2e:booking-flow

# 4. Review user feedback and error reports
# 5. Coordinate with product team if needed
```

### Custom Monitoring Queries

**Useful Prometheus queries for troubleshooting:**

```promql
# Service availability over time
avg_over_time(up[1h])

# Error rate by service
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) * 100

# Response time percentiles
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Database connection pool usage
postgres_stat_database_numbackends / postgres_settings_max_connections * 100

# Memory usage trend
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Disk space usage
(node_filesystem_size_bytes - node_filesystem_avail_bytes) / node_filesystem_size_bytes * 100

# AI service success rate
sum(rate(ai_service_requests_total{status="success"}[5m])) / sum(rate(ai_service_requests_total[5m])) * 100

# Active user sessions
sum(user_sessions_active)
```

## 🔄 Backup and Recovery Procedures

### Database Backup

**Schedule: Daily at 3:00 AM**

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backup/database"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/barbershop_ai_$DATE.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Create database dump
docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U barbershop -d barbershop_ai > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

# Upload to remote storage (optional)
# aws s3 cp $BACKUP_FILE.gz s3://your-backup-bucket/database/

echo "Database backup completed: $BACKUP_FILE.gz"
```

### Database Recovery

```bash
#!/bin/bash
# restore-database.sh

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file>"
    echo "Available backups:"
    ls -la /backup/database/*.sql.gz
    exit 1
fi

BACKUP_FILE=$1

# Stop application services
docker-compose -f docker-compose.production.yml stop frontend backend

# Drop and recreate database
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -c "
DROP DATABASE barbershop_ai;
CREATE DATABASE barbershop_ai;
"

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
    gunzip -c $BACKUP_FILE | docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -d barbershop_ai
else
    cat $BACKUP_FILE | docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -d barbershop_ai
fi

# Restart services
docker-compose -f docker-compose.production.yml start backend frontend

echo "Database restored from $BACKUP_FILE"
```

### Application Data Backup

```bash
#!/bin/bash
# backup-application.sh

BACKUP_DIR="/backup/application"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/application_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Create application backup
tar -czf $BACKUP_FILE \
  --exclude='node_modules' \
  --exclude='logs/*.log' \
  --exclude='.git' \
  .env.production \
  docker-compose.production.yml \
  nginx/ \
  monitoring/ \
  data/ \
  uploads/

# Keep only last 7 days of application backups
find $BACKUP_DIR -name "application_*.tar.gz" -mtime +7 -delete

echo "Application backup completed: $BACKUP_FILE"
```

## 🔒 Security Incident Response

### Security Alert Response

**Response Time: < 15 minutes**

```bash
# 1. Assess the security alert
curl -s "http://localhost:9090/api/v1/alerts" | jq '.data[] | select(.labels.category=="security")'

# 2. Check recent access logs for suspicious activity
tail -1000 logs/nginx/access.log | grep -E "(40[1-4]|50[0-3])" | tail -20

# 3. Review authentication logs
grep -i "auth" logs/app/*.log | tail -20

# 4. If DDoS attack suspected, implement rate limiting
# Edit nginx configuration or use fail2ban

# 5. Document incident and preserve logs
cp logs/nginx/access.log logs/incident-$(date +%Y%m%d_%H%M%S)-access.log
```

### Data Breach Response

**Immediate Actions:**

```bash
# 1. Isolate affected systems
docker-compose -f docker-compose.production.yml stop

# 2. Preserve evidence
tar -czf incident-$(date +%Y%m%d_%H%M%S)-logs.tar.gz logs/

# 3. Check database for unauthorized access
docker-compose -f docker-compose.production.yml start postgres
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT usename, application_name, client_addr, state, query_start, query 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start DESC;"

# 4. Change all passwords and API keys
# 5. Notify stakeholders and authorities as required
# 6. Implement additional security measures
```

## 📈 Performance Optimization Procedures

### Performance Issue Investigation

```bash
# 1. Check current performance metrics
curl -s "http://localhost:9090/api/v1/query?query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))" | jq '.data.result[0].value[1]'

# 2. Identify slow database queries
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# 3. Check resource utilization
docker stats --no-stream

# 4. Review application logs for performance warnings
npm run deploy:logs | grep -E "(SLOW|PERFORMANCE|TIMEOUT)" | tail -10

# 5. Run performance tests
npm run performance:test
```

### Database Performance Tuning

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public' 
AND n_distinct > 100 
AND correlation < 0.1;

-- Check table bloat
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_dead_tup, n_live_tup,
  ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2) as dead_percentage
FROM pg_stat_user_tables 
WHERE n_dead_tup > 0
ORDER BY dead_percentage DESC;

-- Optimize table statistics
ANALYZE;

-- Consider vacuum if dead tuple percentage is high
VACUUM ANALYZE table_name;
```

## 📞 Escalation Procedures

### Escalation Matrix

| Severity | Response Time | Primary Contact | Secondary Contact |
|----------|---------------|-----------------|-------------------|
| **Critical** | < 5 minutes | On-call Engineer | Senior Engineer |
| **High** | < 15 minutes | On-call Engineer | Team Lead |
| **Medium** | < 1 hour | Assigned Engineer | Team Lead |
| **Low** | Next business day | Assigned Engineer | - |

### Communication Templates

#### Critical Incident Notification

```
Subject: [CRITICAL] 6FB AI System Service Outage

Service: 6FB AI Agent System
Status: Service Outage
Impact: All users unable to access the system
Start Time: [TIME]
Estimated Recovery: [TIME]

Current Actions:
- [Action 1]
- [Action 2]

Next Update: [TIME]
Incident Commander: [NAME]
```

#### Resolution Notification

```
Subject: [RESOLVED] 6FB AI System Service Restored

The service outage affecting 6FB AI Agent System has been resolved.

Resolution Time: [TIME]
Duration: [DURATION]
Root Cause: [BRIEF DESCRIPTION]

Post-Incident Actions:
- [ ] Complete root cause analysis
- [ ] Implement preventive measures
- [ ] Update monitoring and alerts
- [ ] Schedule post-mortem meeting

Post-mortem scheduled for: [DATE/TIME]
```

---

**Emergency Contacts:**
- On-call Engineer: [PHONE]
- Engineering Manager: [PHONE]
- Operations Team: [EMAIL]
- Security Team: [EMAIL]