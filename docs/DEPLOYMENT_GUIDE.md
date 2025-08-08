# 6FB AI Agent System - Deployment Guide

Complete deployment guide for production-ready barbershop management platform.

## 🚀 Quick Deploy (Production)

```bash
# 1. Clone and setup
git clone <repository>
cd "6FB AI Agent System"

# 2. Configure environment
cp .env.production.template .env.production
# Edit .env.production with your settings

# 3. Deploy production stack
npm run deploy:production

# 4. Start monitoring
npm run monitoring:start

# 5. Verify deployment
npm run health
```

## 📋 Pre-Deployment Checklist

### ✅ Requirements
- [ ] Docker 20.10+ installed and running
- [ ] Docker Compose 1.29+ available
- [ ] Minimum 4GB RAM, 20GB disk space
- [ ] Ports available: 80, 443, 3000, 8000, 9090, 3001
- [ ] SSL certificates prepared (optional)
- [ ] Domain DNS configured (optional)

### ✅ Configuration Files
- [ ] `.env.production` configured with real values
- [ ] `nginx/ssl/` certificates in place (if using HTTPS)
- [ ] `monitoring/alertmanager/alertmanager.yml` email settings
- [ ] Database connection strings verified
- [ ] API keys for AI services added

### ✅ Security Setup
- [ ] Change default passwords (Grafana, PostgreSQL, Redis)
- [ ] Configure rate limiting thresholds
- [ ] Set up SSL/TLS certificates
- [ ] Review firewall rules
- [ ] Enable security monitoring alerts

## 🏗️ Architecture Overview

```
                    ┌─────────────────┐
                    │   Nginx Proxy   │
                    │   (80/443)      │
                    └─────────┬───────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │Frontend │         │Backend  │         │Monitoring│
    │Next.js  │         │FastAPI  │         │Stack     │
    │(3000)   │         │(8000)   │         │(various) │
    └─────────┘         └─────────┘         └─────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │PostgreSQL│        │ Redis   │         │Prometheus│
    │Database │         │ Cache   │         │Grafana   │
    │(5432)   │         │(6379)   │         │AlertMgr  │
    └─────────┘         └─────────┘         └─────────┘
```

## 🔧 Environment Configuration

### Required Variables (.env.production)

```bash
# Core Application
NODE_ENV=production
NEXT_PUBLIC_FRONTEND_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-domain.com

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@postgres:5432/barbershop_ai
POSTGRES_DB=barbershop_ai
POSTGRES_USER=barbershop
POSTGRES_PASSWORD=your-secure-password

# Cache (Redis)
REDIS_URL=redis://:password@redis:6379/0
REDIS_PASSWORD=your-secure-password

# Authentication (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# AI Services (Optional but Recommended)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key

# Security & Monitoring
GRAFANA_PASSWORD=your-secure-password
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
```

### Optional Variables

```bash
# Payment Processing
STRIPE_SECRET_KEY=sk_live_your-stripe-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key

# Error Tracking & Analytics
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key

# Notifications
SMTP_HOST=your-smtp-server
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

## 📦 Deployment Methods

### Method 1: Automated Production Deployment (Recommended)

```bash
# Full production deployment with all services
./scripts/deploy/production-deploy.sh

# Options:
./scripts/deploy/production-deploy.sh --skip-tests    # Skip validation tests
./scripts/deploy/production-deploy.sh --no-backup    # Skip backup creation
./scripts/deploy/production-deploy.sh --force        # Force deployment
```

**What it does:**
- Pre-deployment environment validation
- Creates automatic backup of current deployment
- Builds optimized production Docker images
- Deploys all services in dependency order
- Runs comprehensive health checks
- Sets up monitoring and log rotation
- Generates deployment report

### Method 2: Manual Step-by-Step Deployment

```bash
# 1. Build production images
npm run deploy:build

# 2. Start services
npm run deploy:up

# 3. Check status
npm run deploy:status

# 4. View logs
npm run deploy:logs

# 5. Start monitoring
npm run monitoring:start
```

### Method 3: Development/Testing Deployment

```bash
# Quick development deployment
npm run docker:dev

# Or start individual services
npm run dev          # Frontend only
python fastapi_backend.py  # Backend only
```

## 🔍 Service Configuration

### Frontend (Next.js)
- **Port**: 3000 (internal), 80/443 (external via Nginx)
- **Build**: Multi-stage Docker build with optimization
- **Features**: Static asset optimization, ISR, API routes
- **Health Check**: `/api/health` endpoint

### Backend (FastAPI)
- **Port**: 8000 (internal), proxied via Nginx
- **Features**: AI agent integration, async processing
- **Security**: Rate limiting, CORS, input validation
- **Health Check**: `/health` endpoint

### Database (PostgreSQL)
- **Port**: 5432 (internal only)
- **Features**: Row Level Security (RLS), pgvector extension
- **Backup**: Automated daily backups via deployment script
- **Monitoring**: Custom metrics via PostgreSQL Exporter

### Cache (Redis)
- **Port**: 6379 (internal only)
- **Features**: Session management, rate limiting storage
- **Persistence**: AOF and RDB snapshots
- **Monitoring**: Redis Exporter metrics

### Reverse Proxy (Nginx)
- **Ports**: 80 (HTTP), 443 (HTTPS), 8080 (metrics)
- **Features**: SSL termination, rate limiting, static caching
- **Security**: Security headers, DDoS protection
- **Monitoring**: Access logs, performance metrics

## 🛡️ Security Hardening

### SSL/TLS Configuration

```bash
# 1. Generate SSL certificates (Let's Encrypt recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com

# 2. Copy certificates to nginx directory
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/key.pem

# 3. Update nginx configuration for your domain
sed -i 's/_/your-domain.com/g' nginx/nginx.conf
```

### Firewall Configuration

```bash
# UFW firewall rules (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 3000/tcp   # Block direct frontend access
sudo ufw deny 8000/tcp   # Block direct backend access
sudo ufw enable

# Docker firewall considerations
# Add to /etc/docker/daemon.json:
{
  "iptables": false
}
```

### Environment Security

```bash
# Secure .env.production file permissions
chmod 600 .env.production
chown root:root .env.production

# Use Docker secrets for sensitive data (advanced)
echo "your-db-password" | docker secret create postgres_password -
echo "your-redis-password" | docker secret create redis_password -
```

## 📊 Monitoring Setup

### Start Monitoring Stack

```bash
# Start comprehensive monitoring
npm run monitoring:start

# Access monitoring services
open http://localhost:9090   # Prometheus
open http://localhost:3001   # Grafana (admin/admin123)
open http://localhost:9093   # Alertmanager
```

### Configure Alerting

```bash
# Edit email settings
nano monitoring/alertmanager/alertmanager.yml

# Test alert configuration
curl -X POST http://localhost:9093/api/v1/alerts -H "Content-Type: application/json" -d '[{
  "labels": {"alertname": "TestAlert", "severity": "warning"},
  "annotations": {"summary": "Test alert from deployment"}
}]'
```

### Import Grafana Dashboards

1. Open Grafana: http://localhost:3001
2. Login: admin / admin123 (change password)
3. Go to Dashboards → Import
4. Import these dashboard IDs:
   - **Node Exporter Full**: 1860
   - **Docker Container Metrics**: 14282
   - **PostgreSQL Database**: 9628

## 🔧 Troubleshooting

### Common Issues

**Services not starting:**
```bash
# Check Docker daemon
systemctl status docker

# Check available ports
netstat -tulpn | grep -E "(3000|8000|80|443)"

# View service logs
npm run deploy:logs

# Check resource usage
docker system df
free -h
```

**Database connection issues:**
```bash
# Test database connectivity
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U barbershop

# Check database logs
docker-compose -f docker-compose.production.yml logs postgres

# Connect to database directly
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai
```

**SSL/HTTPS issues:**
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443

# Check certificate expiry
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Verify nginx configuration
docker-compose -f docker-compose.production.yml exec nginx nginx -t
```

**Performance issues:**
```bash
# Check resource usage
docker stats

# Monitor database performance
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;"

# Check Redis memory usage
docker-compose -f docker-compose.production.yml exec redis redis-cli info memory
```

### Emergency Procedures

**Rollback deployment:**
```bash
# Automatic rollback (if deployment failed)
# The deployment script automatically creates backups

# Manual rollback
docker-compose -f docker-compose.production.yml down
# Restore from backup directory (shown in deployment logs)
```

**Scale services:**
```bash
# Scale frontend replicas
docker-compose -f docker-compose.production.yml up -d --scale frontend=3

# Scale backend replicas
docker-compose -f docker-compose.production.yml up -d --scale backend=2
```

## 📈 Performance Optimization

### Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_bookings_created_at ON bookings(created_at);
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_ai_logs_created_at ON ai_agent_logs(created_at);

-- Update table statistics
ANALYZE;

-- Configure PostgreSQL settings in docker-compose.production.yml
```

### Nginx Optimization

```nginx
# Add to nginx.conf for better performance
worker_rlimit_nofile 65535;
events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

# Enable HTTP/2 and optimize keepalive
keepalive_timeout 65;
keepalive_requests 100;
```

### Application Optimization

```bash
# Enable production optimizations
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Use PM2 for process management (optional)
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🔄 Maintenance

### Regular Maintenance Tasks

```bash
# Weekly maintenance script
#!/bin/bash

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Clean Docker resources
docker system prune -f --volumes

# 3. Backup database
./scripts/backup-database.sh

# 4. Rotate logs
logrotate -f /etc/logrotate.d/6fb-ai-agent-system

# 5. Check SSL certificate expiry
./scripts/check-ssl-expiry.sh

# 6. Update Docker images
docker-compose -f docker-compose.production.yml pull
npm run deploy:production
```

### Backup Strategy

```bash
# Database backup
docker-compose -f docker-compose.production.yml exec postgres pg_dump -U barbershop barbershop_ai > backup-$(date +%Y%m%d).sql

# Application backup
tar -czf application-backup-$(date +%Y%m%d).tar.gz \
  .env.production \
  docker-compose.production.yml \
  nginx/ \
  monitoring/ \
  data/

# Restore from backup
docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -d barbershop_ai < backup.sql
```

## 🎯 Production Checklist

### Pre-Go-Live
- [ ] All services starting successfully
- [ ] Health checks passing (frontend, backend, database, redis)
- [ ] SSL certificates installed and valid
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Performance benchmarks established
- [ ] Security scan completed
- [ ] Load testing performed
- [ ] DNS configuration verified
- [ ] CDN setup (if applicable)

### Post-Deployment
- [ ] Monitor logs for 24 hours
- [ ] Verify alert notifications working
- [ ] Test all critical user workflows
- [ ] Check database performance
- [ ] Verify backup creation
- [ ] Document any custom configuration
- [ ] Train operations team
- [ ] Set up maintenance schedule

---

**Support**: For deployment issues, check logs first (`npm run deploy:logs`), then review this guide's troubleshooting section.