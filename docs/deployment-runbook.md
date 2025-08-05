# 6FB AI Agent System - Production Deployment Runbook

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Deployment Procedures](#deployment-procedures)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Rollback Procedures](#rollback-procedures)
7. [Troubleshooting](#troubleshooting)
8. [Emergency Contacts](#emergency-contacts)

## Overview

This runbook provides step-by-step procedures for deploying the 6FB AI Agent System to production environments. It covers all aspects from initial setup to ongoing maintenance.

### System Architecture
- **Frontend**: Next.js 14 application (port 9999)
- **Backend**: FastAPI Python application (port 8001)
- **Database**: PostgreSQL with Supabase
- **Cache**: Redis for session storage
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Prometheus, Grafana, Loki stack
- **Container Orchestration**: Docker Compose / Kubernetes

## Prerequisites

### System Requirements
- **OS**: Ubuntu 20.04+ LTS or RHEL 8+
- **Memory**: Minimum 8GB RAM (16GB recommended)
- **Storage**: Minimum 100GB SSD (500GB recommended)
- **CPU**: Minimum 4 cores (8 cores recommended)
- **Network**: Static IP address with domain name

### Required Software
- Docker 20.10+
- Docker Compose 2.0+
- Git 2.30+
- OpenSSL 1.1.1+
- Nginx 1.18+ (if not using containerized version)

### Access Requirements
- Root/sudo access to production servers
- SSH key-based authentication configured
- Docker registry access (GitHub Container Registry)
- Domain registrar access for DNS configuration
- SSL certificate authority access

## Pre-Deployment Checklist

### Infrastructure Preparation
- [ ] Server provisioned with required specifications
- [ ] Operating system updated and hardened
- [ ] SSH keys configured for secure access
- [ ] Firewall rules configured (ports 22, 80, 443, 9999, 8001)
- [ ] DNS records pointing to server IP
- [ ] SSL certificates obtained and validated

### Environment Configuration
- [ ] Production environment variables configured
- [ ] Database connection tested
- [ ] External API keys validated (OpenAI, Anthropic, etc.)
- [ ] Backup storage configured (S3 or equivalent)
- [ ] Monitoring endpoints accessible

### Security Verification
- [ ] Security hardening script executed
- [ ] Fail2Ban configured and active
- [ ] Automatic security updates enabled
- [ ] File permissions properly set
- [ ] Audit logging configured

### Code Preparation
- [ ] Latest stable code merged to main branch
- [ ] All tests passing in CI/CD pipeline
- [ ] Security scans completed with no critical issues
- [ ] Database migrations prepared (if applicable)
- [ ] Configuration files updated for production

## Deployment Procedures

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/agent-system
sudo chown $USER:$USER /opt/agent-system
cd /opt/agent-system
```

### 2. Deploy Application Code

```bash
# Clone repository
git clone https://github.com/your-org/6fb-ai-agent-system.git .
git checkout main

# Generate production secrets
./scripts/generate-production-secrets.sh

# Configure environment variables
cp .env.production.template .env.production
# Edit .env.production with actual values

# Set proper permissions
chmod 600 .env.production
chmod 600 secure-credentials/*.env
```

### 3. SSL Certificate Setup

```bash
# Using Let's Encrypt (recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Or copy existing certificates
sudo mkdir -p /opt/agent-system/configs/nginx/ssl
sudo cp /path/to/your/cert.pem /opt/agent-system/configs/nginx/ssl/
sudo cp /path/to/your/private.key /opt/agent-system/configs/nginx/ssl/
sudo chown -R 1000:1000 /opt/agent-system/configs/nginx/ssl
sudo chmod 600 /opt/agent-system/configs/nginx/ssl/*
```

### 4. Database Setup

```bash
# Configure PostgreSQL connection
# Update DATABASE_URL in .env.production

# Run database migrations (if needed)
docker-compose -f docker-compose.prod.yml run --rm backend python -m alembic upgrade head
```

### 5. Deploy Services

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
sleep 60

# Check service status
docker-compose -f docker-compose.prod.yml ps
```

### 6. Configure Monitoring

```bash
# Start monitoring stack
docker-compose -f docker-compose.prod.yml up -d prometheus grafana loki promtail

# Import Grafana dashboards
curl -X POST http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @configs/grafana/dashboards/system-overview.json

# Configure alert rules
docker-compose -f docker-compose.prod.yml exec prometheus promtool check rules /etc/prometheus/alerts.yml
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Frontend health check
curl -f https://yourdomain.com/api/health || echo "Frontend health check failed"

# Backend health check
curl -f https://api.yourdomain.com/health || echo "Backend health check failed"

# Database connectivity
docker-compose -f docker-compose.prod.yml exec backend python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    print('Database connection successful')
    conn.close()
except Exception as e:
    print(f'Database connection failed: {e}')
"

# Redis connectivity
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

### 2. Functional Testing

```bash
# Run automated tests against production
npm run test:e2e -- --config playwright.config.prod.js

# Test user registration
curl -X POST https://api.yourdomain.com/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123!"}'

# Test AI functionality
curl -X POST https://api.yourdomain.com/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"message":"Hello, test message"}'
```

### 3. Performance Verification

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/

# Check response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com/

# Monitor resource usage
docker stats --no-stream
```

### 4. Security Validation

```bash
# SSL certificate validation
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

# Security headers check
curl -I https://yourdomain.com/ | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"

# Port scan validation
nmap -sS yourdomain.com
```

### 5. Monitoring Verification

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.targets[] | select(.health != "up")'

# Verify Grafana dashboards
curl -s http://admin:${GRAFANA_PASSWORD}@localhost:3000/api/dashboards/home

# Test alerting
# Trigger a test alert and verify notification delivery
```

## Rollback Procedures

### 1. Emergency Rollback (< 5 minutes)

```bash
# Stop current services
docker-compose -f docker-compose.prod.yml down

# Rollback to previous version
git checkout HEAD~1  # or specific commit/tag

# Restart services
docker-compose -f docker-compose.prod.yml up -d

# Verify rollback
curl -f https://yourdomain.com/api/health
```

### 2. Database Rollback

```bash
# Stop application services
docker-compose -f docker-compose.prod.yml stop frontend backend

# Restore from backup
./scripts/disaster-recovery.sh restore-database --backup BACKUP_NAME --source s3

# Restart services
docker-compose -f docker-compose.prod.yml start frontend backend
```

### 3. Full System Rollback

```bash
# Use disaster recovery script
./scripts/disaster-recovery.sh restore-full --backup BACKUP_NAME --source s3

# Verify system health
./scripts/disaster-recovery.sh health-check
```

## Troubleshooting

### Common Issues

#### 1. Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs SERVICE_NAME

# Check resource usage
docker system df
df -h

# Free up space
docker system prune -a
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
pg_isready -h DATABASE_HOST -p 5432 -U USERNAME

# Check database logs
docker-compose -f docker-compose.prod.yml logs database

# Verify connection string
echo $DATABASE_URL | sed 's/:[^:@]*@/:***@/g'
```

#### 3. SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /path/to/cert.pem -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew --dry-run

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

#### 4. Performance Issues
```bash
# Check resource usage
docker stats
htop

# Analyze slow queries
docker-compose -f docker-compose.prod.yml exec database psql -U USERNAME -d DATABASE -c "
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;"

# Check application logs for errors
docker-compose -f docker-compose.prod.yml logs backend | grep ERROR
```

#### 5. AI Service Issues
```bash
# Test AI endpoints directly
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"test"}]}'

# Check rate limits
docker-compose -f docker-compose.prod.yml logs backend | grep "rate limit"

# Verify API keys
./scripts/verify-api-keys.sh
```

### Debugging Commands

```bash
# Enter container for debugging
docker-compose -f docker-compose.prod.yml exec backend bash
docker-compose -f docker-compose.prod.yml exec frontend sh

# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f SERVICE_NAME

# Check container health
docker inspect $(docker-compose -f docker-compose.prod.yml ps -q SERVICE_NAME) | jq '.[0].State.Health'

# Network debugging
docker network inspect 6fb-ai-agent-system_agent-network

# Resource monitoring
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
```

## Maintenance Procedures

### Daily Tasks
- [ ] Check system health dashboard
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Monitor resource usage

### Weekly Tasks
- [ ] Update Docker images
- [ ] Run security scans
- [ ] Review access logs
- [ ] Test disaster recovery procedures

### Monthly Tasks
- [ ] Update SSL certificates (if needed)
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Backup retention cleanup

## Emergency Contacts

### Primary Contacts
- **System Administrator**: admin@yourdomain.com, +1-XXX-XXX-XXXX
- **DevOps Lead**: devops@yourdomain.com, +1-XXX-XXX-XXXX
- **Security Team**: security@yourdomain.com, +1-XXX-XXX-XXXX

### Service Providers
- **Cloud Provider**: AWS/GCP/Azure Support
- **DNS Provider**: Cloudflare/Route53 Support
- **Monitoring**: DataDog/New Relic Support
- **SSL Provider**: Let's Encrypt/DigiCert Support

### Escalation Matrix
1. **Level 1**: On-call engineer
2. **Level 2**: DevOps team lead
3. **Level 3**: System architect
4. **Level 4**: CTO/Technical leadership

---

**Document Version**: 1.0  
**Last Updated**: $(date)  
**Next Review**: $(date -d '+3 months')  
**Owner**: DevOps Team