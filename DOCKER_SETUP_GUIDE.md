# 6FB AI Agent System - Docker Setup Guide

## Overview
This guide documents the proper Docker setup for the 6FB AI Agent System. Docker provides a stable, isolated, and consistent environment for running the application.

## Why Docker?
- **Consistency**: Same environment across development, staging, and production
- **Isolation**: No conflicts with system dependencies
- **Reliability**: Containers restart automatically on failure
- **Scalability**: Easy to scale services up/down
- **Portability**: Works the same on any machine with Docker

## Architecture
The system uses two Docker containers:
- **Frontend Container**: Next.js application on port 9999
- **Backend Container**: Python/FastAPI server on port 8001

## Quick Start

### 1. Using the Provided Scripts (Recommended)
```bash
cd "/Users/bossio/6FB AI Agent System"

# Start containers
./docker-dev-start.sh

# Stop containers
./docker-stop.sh
```

### 2. Using Docker Compose Directly
```bash
cd "/Users/bossio/6FB AI Agent System"

# Start containers in detached mode
docker compose -f docker-compose.simple.yml up -d

# View logs
docker compose -f docker-compose.simple.yml logs -f

# Stop containers
docker compose -f docker-compose.simple.yml down
```

## Container Details

### Frontend Container
- **Image**: Node.js 18 Alpine
- **Port**: 9999
- **Features**:
  - Hot reload enabled
  - Volume mounts for live code updates
  - Health checks every 30s

### Backend Container  
- **Image**: Python 3.11 Slim
- **Port**: 8001 (mapped from internal 8000)
- **Features**:
  - Auto-reload on code changes
  - SQLite database with persistent volume
  - Health checks every 30s

## File Structure
```
6FB AI Agent System/
├── docker-compose.yml          # Original compose file (uses build stages)
├── docker-compose.simple.yml   # Simplified compose file
├── Dockerfile.frontend         # Frontend container definition
├── Dockerfile.backend          # Backend container definition
├── docker-dev-start.sh        # Start script
├── docker-stop.sh             # Stop script
└── requirements.txt           # Python dependencies
```

## Common Commands

### Check Container Status
```bash
docker compose -f docker-compose.simple.yml ps
```

### View Container Logs
```bash
# All containers
docker compose -f docker-compose.simple.yml logs -f

# Specific container
docker logs agent-system-frontend -f
docker logs agent-system-backend -f
```

### Access Container Shell
```bash
# Frontend
docker exec -it agent-system-frontend sh

# Backend
docker exec -it agent-system-backend bash
```

### Rebuild Containers (after dependency changes)
```bash
docker compose -f docker-compose.simple.yml build --no-cache
docker compose -f docker-compose.simple.yml up -d
```

## Troubleshooting

### Issue: Backend Missing Dependencies
**Problem**: ModuleNotFoundError for google-generativeai or other packages

**Solution**:
1. Ensure requirements.txt has all dependencies
2. Rebuild the backend container:
   ```bash
   docker compose -f docker-compose.simple.yml build --no-cache backend
   ```

### Issue: Port Already in Use
**Problem**: "Address already in use" error

**Solution**:
1. Check what's using the port:
   ```bash
   lsof -i :9999  # Frontend
   lsof -i :8001  # Backend
   ```
2. Kill the process or change the port in docker-compose.yml

### Issue: Containers Keep Restarting
**Problem**: Containers in restart loop

**Solution**:
1. Check logs for errors:
   ```bash
   docker logs agent-system-backend --tail 50
   ```
2. Ensure main.py or startup script exists and is executable

## Best Practices

1. **Always use Docker for production-like environments**
   - Provides consistency across environments
   - Easier debugging of environment-specific issues

2. **Use volume mounts for development**
   - Enables hot reload without rebuilding
   - Preserves database data between restarts

3. **Monitor container health**
   - Check `docker ps` regularly
   - Set up proper health checks in docker-compose.yml

4. **Keep images small**
   - Use Alpine Linux when possible
   - Multi-stage builds for production

5. **Version your images**
   - Tag images with version numbers
   - Use specific base image versions (not :latest)

## Environment Variables
Both containers use `.env` file for configuration:
- `NODE_ENV`: Development/production mode
- `NEXT_PUBLIC_API_URL`: Backend URL for frontend
- `DATABASE_URL`: Database connection string
- `PORT`: Server port (backend)

## Security Notes
- Never commit `.env` files with secrets
- Use Docker secrets for production
- Limit container permissions
- Keep base images updated

## Next Steps
1. Ensure all dependencies are in requirements.txt
2. Test the full Docker setup
3. Set up CI/CD pipelines with Docker
4. Configure production Docker deployment

---
Last Updated: July 31, 2025