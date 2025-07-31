# 6FB AI Agent System - Deployment Guide

## Overview
This is the **OFFICIAL** deployment guide for the 6FB AI Agent System. All other deployment configurations have been deprecated and moved to `deprecated-configs/`.

## Production Deployment (Recommended)

### Prerequisites
- Docker 20.10+ and Docker Compose 2.0+
- Minimum 4GB RAM, 10GB storage
- SSL certificates (for production HTTPS)

### Quick Start
```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd "6FB AI Agent System"

# 2. Configure environment
cp .env.template .env
# Edit .env with your actual API keys and secrets

# 3. Create required directories
mkdir -p volumes/{postgres,redis,backend,logs,nginx,prometheus,grafana}

# 4. Deploy production stack
./infrastructure/scripts/deploy.sh

# 5. Access services
# Frontend: http://localhost:9999
# Backend API: http://localhost:8001
# Monitoring: http://localhost:3000 (Grafana)
```

### Production Configuration

#### Environment Variables
Edit `.env` file with your actual values:
```bash
# Database (PostgreSQL for production)
DATABASE_URL=postgresql://agent_user:SECURE_PASSWORD@postgres:5432/agent_system
POSTGRES_PASSWORD=SECURE_PASSWORD

# API Keys (use secrets management)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
TWILIO_ACCOUNT_SID=your-twilio-sid
# ... other API keys
```

#### SSL Configuration
Place SSL certificates in `infrastructure/nginx/ssl/`:
```bash
mkdir -p infrastructure/nginx/ssl/
cp your-cert.pem infrastructure/nginx/ssl/cert.pem
cp your-key.pem infrastructure/nginx/ssl/key.pem
```

### Services Architecture
- **Frontend**: Next.js 14 (Port 9999)
- **Backend**: FastAPI (Port 8001)
- **Database**: PostgreSQL 15 (Port 5432)
- **Cache**: Redis 7 (Port 6379)
- **Proxy**: Nginx (Ports 80/443)
- **Monitoring**: Prometheus + Grafana (Ports 9090/3000)

## Development Deployment

### Quick Development Setup
```bash
# 1. Start development services (SQLite-based)
docker-compose up -d

# 2. Access services
# Frontend: http://localhost:9999
# Backend API: http://localhost:8001
```

The development setup uses:
- SQLite database (simpler, no PostgreSQL container)
- Hot reload for both frontend and backend
- Development-optimized Docker images

## Monitoring and Observability

### Grafana Dashboards
Access Grafana at http://localhost:3000
- Default credentials: admin/admin (change on first login)
- Pre-configured dashboards for system metrics
- Prometheus data source auto-configured

### Prometheus Metrics
Access Prometheus at http://localhost:9090
- Application metrics from backend API
- System metrics from containers
- Custom business logic metrics

### Health Checks
All services have built-in health checks:
```bash
# Check backend health
curl http://localhost:8001/health

# Check frontend health  
curl http://localhost:9999

# Check all services
docker-compose ps
```

## Backup and Recovery

### Automated Backups
The deployment script automatically creates backups:
```bash
# Backups stored in: ./backups/YYYYMMDD_HHMMSS/
# Contains: database dumps, volumes, configurations
```

### Manual Backup
```bash
# Create backup
./infrastructure/scripts/deploy.sh backup

# Restore from backup
./infrastructure/scripts/deploy.sh restore /path/to/backup
```

## Security Features

### Container Security
- Non-root user execution
- Read-only filesystems where possible
- Security context constraints
- Resource limits and requests

### Network Security
- Internal Docker network isolation
- Nginx rate limiting
- SSL/TLS termination
- Security headers (HSTS, CSP, etc.)

### Secrets Management
- Environment variable injection
- Docker secrets support
- API key rotation ready

## Scaling and Performance

### Horizontal Scaling
```bash
# Scale backend instances
docker-compose up -d --scale backend=3

# Scale frontend instances
docker-compose up -d --scale frontend=2
```

### Resource Optimization
- Multi-stage Docker builds
- Image layer caching
- Gzip compression
- Static asset optimization

## Troubleshooting

### Common Issues

1. **PostgreSQL won't start**
   ```bash
   # Clean corrupted data
   rm -rf volumes/postgres/*
   docker-compose up -d postgres
   ```

2. **Frontend build failures**
   ```bash
   # Clear build cache
   docker-compose build --no-cache frontend
   ```

3. **API connection errors**
   ```bash
   # Check network connectivity
   docker-compose exec frontend curl backend:8000/health
   ```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Migration from Legacy Deployments

### From Render/Railway/Vercel
1. Export your data from the legacy platform
2. Update environment variables in `.env`
3. Run the Docker deployment
4. Import your data using backup/restore scripts

### From Previous Docker Configs
1. Stop old containers: `docker-compose down`
2. Remove old volumes if needed
3. Deploy new stack: `./infrastructure/scripts/deploy.sh`

## CI/CD Integration

### GitHub Actions (Recommended)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy
        run: ./infrastructure/scripts/deploy.sh
```

## Support

### Health Check URLs
- Frontend: `GET /`
- Backend: `GET /health` 
- Database: `docker-compose exec postgres pg_isready`

### Monitoring URLs
- Grafana: http://localhost:3000
- Prometheus: http://localhost:9090
- Nginx status: http://localhost/nginx_status

---

**Note**: All legacy deployment configurations (Render, Railway, Vercel, Fly.io, etc.) have been deprecated and moved to `deprecated-configs/`. This Docker-based deployment is now the single source of truth for all environments.