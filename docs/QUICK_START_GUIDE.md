# 6FB AI Agent System - Quick Start Guide

Get your barbershop management platform running in minutes.

## 🚀 One-Command Production Deployment

```bash
# Clone repository
git clone <repository>
cd "6FB AI Agent System"

# Configure environment
cp .env.production.template .env.production
nano .env.production  # Add your database credentials and API keys

# Deploy everything
npm run deploy:production

# Start monitoring
npm run monitoring:start

# Verify deployment
npm run health
```

**🎯 Result**: Full production system running on your server in ~10 minutes.

---

## 🔧 Essential Commands

### Deployment Management
```bash
npm run deploy:production    # Full production deployment
npm run deploy:status        # Check service status
npm run deploy:logs          # View application logs
npm run deploy:stop          # Stop all services
npm run deploy:restart       # Restart all services
```

### Monitoring & Alerts
```bash
npm run monitoring:start     # Start monitoring stack
npm run monitoring:status    # Check monitoring services
npm run monitoring:logs      # View monitoring logs
npm run monitoring:stop      # Stop monitoring
```

### Backup & Recovery
```bash
npm run backup:create        # Create full system backup
npm run backup:list          # List available backups
npm run backup:restore       # Restore from backup
```

### Health & Testing
```bash
npm run health               # Check system health
npm run test:all             # Run all tests
npm run test:security        # Security validation
npm run performance:test     # Performance benchmarks
```

---

## 📊 System Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Main Application** | http://localhost | Barbershop management platform |
| **Frontend Direct** | http://localhost:3000 | Next.js application |
| **API Backend** | http://localhost:8000 | FastAPI backend |
| **Monitoring** | http://localhost:3001 | Grafana dashboards |
| **Metrics** | http://localhost:9090 | Prometheus metrics |
| **Alerts** | http://localhost:9093 | Alertmanager |

**Default Credentials:**
- Grafana: admin / admin123

---

## ⚙️ Quick Configuration

### Minimum Required Configuration (.env.production)
```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@postgres:5432/barbershop_ai
POSTGRES_PASSWORD=your-secure-password

# Authentication (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Cache (Required)
REDIS_PASSWORD=your-secure-password

# Security (Required)
GRAFANA_PASSWORD=your-secure-password
```

### Optional Enhancements
```bash
# AI Services (Recommended)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_AI_API_KEY=your-google-key

# Payment Processing
STRIPE_SECRET_KEY=sk_live_your-stripe-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-key

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

---

## 🏥 Health Check

### Verify Everything is Working
```bash
# 1. Check service status
npm run deploy:status

# 2. Test health endpoints
curl http://localhost/health
curl http://localhost:3000/api/health
curl http://localhost:8000/health

# 3. Check database connectivity
docker-compose -f docker-compose.production.yml exec postgres pg_isready -U barbershop

# 4. Verify monitoring
curl http://localhost:9090/api/v1/targets
curl http://localhost:3001/api/health
```

### Expected Results ✅
- All services showing "Up" status
- Health endpoints returning "healthy"
- Database connectivity confirmed
- Monitoring targets active

---

## 🚨 Troubleshooting

### Services Not Starting
```bash
# Check Docker status
docker info

# View service logs
npm run deploy:logs

# Check port conflicts
netstat -tulpn | grep -E "(3000|8000|80)"

# Restart services
npm run deploy:restart
```

### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose -f docker-compose.production.yml logs postgres

# Test database connection
docker-compose -f docker-compose.production.yml exec postgres psql -U barbershop -d barbershop_ai -c "SELECT 1;"

# Reset database
docker-compose -f docker-compose.production.yml restart postgres
```

### Performance Issues
```bash
# Check resource usage
docker stats

# Monitor system resources
htop
free -h
df -h

# Check application metrics
curl http://localhost:9999/api/metrics
```

---

## 📈 First Steps After Deployment

### 1. Verify Core Functionality
- [ ] Access main application at http://localhost
- [ ] Test user authentication
- [ ] Create a test booking
- [ ] Check AI agent responses
- [ ] Verify calendar functionality

### 2. Configure Monitoring
- [ ] Open Grafana: http://localhost:3001
- [ ] Change admin password
- [ ] Review main dashboard
- [ ] Test alert notifications
- [ ] Import additional dashboards

### 3. Security Setup
- [ ] Review security headers: `curl -I http://localhost`
- [ ] Test rate limiting
- [ ] Configure SSL certificates (production)
- [ ] Set up firewall rules
- [ ] Enable fail2ban (optional)

### 4. Business Configuration
- [ ] Configure barbershop details
- [ ] Set up services and pricing
- [ ] Configure working hours
- [ ] Test booking flow
- [ ] Set up staff accounts

---

## 🎯 Production Checklist

### Before Going Live
- [ ] **Domain & SSL**: Configure production domain and SSL certificates
- [ ] **Email Setup**: Configure SMTP for alerts and notifications
- [ ] **Backups**: Schedule automated backups (`crontab -e`)
- [ ] **Monitoring**: Set up alert notifications (email/Slack)
- [ ] **Security**: Review and harden security settings
- [ ] **Performance**: Run load tests and optimize
- [ ] **Documentation**: Train staff on system usage

### Automated Daily Tasks (Optional)
```bash
# Add to crontab (crontab -e):
0 3 * * * cd "/path/to/6FB AI Agent System" && npm run backup:create
0 9 * * * cd "/path/to/6FB AI Agent System" && ./scripts/daily-health-check.sh
```

---

## 🆘 Emergency Procedures

### Complete System Failure
```bash
# 1. Stop all services
npm run deploy:stop
npm run monitoring:stop

# 2. Check system resources
df -h
free -h
docker system df

# 3. Clean up Docker resources
docker system prune -f

# 4. Restart everything
npm run deploy:production
npm run monitoring:start
```

### Restore from Backup
```bash
# 1. List available backups
npm run backup:list

# 2. Restore specific backup
npm run backup:restore /backup/6fb_ai_system_backup_YYYYMMDD_HHMMSS.tar.gz

# 3. Verify restoration
npm run health
```

---

## 📞 Support & Resources

### Documentation
- **Full Deployment Guide**: `docs/DEPLOYMENT_GUIDE.md`
- **Operations Runbooks**: `docs/RUNBOOKS.md`
- **Production Checklist**: `docs/PRODUCTION_READINESS_CHECKLIST.md`
- **Monitoring Guide**: `monitoring/README.md`

### Logs & Debugging
```bash
# Application logs
npm run deploy:logs

# Monitoring logs
npm run monitoring:logs

# System logs
journalctl -u docker.service --since "1 hour ago"
```

### Performance Monitoring
- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **System Metrics**: `htop`, `iotop`, `nethogs`

---

**🚀 You're ready to go! Your barbershop management platform is now running and ready for customers.**