#!/bin/bash

# Production Startup Script for 6FB AI Agent System
# Starts all production services with proper configuration

set -e

echo "🚀 Starting 6FB AI Agent System in production mode..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Load production environment
if [[ -f ".env.production" ]]; then
    export $(cat .env.production | grep -v '^#' | xargs)
    echo "✓ Production environment loaded"
else
    echo "✗ .env.production file not found"
    exit 1
fi

# Pre-flight checks
echo "Running pre-flight checks..."

# Check Docker is available
if ! command -v docker &> /dev/null; then
    echo "✗ Docker not found - please install Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "✗ Docker Compose not found - please install Docker Compose"
    exit 1
fi

echo "✓ Docker and Docker Compose available"

# Check SSL certificates (if configured)
if [[ -n "$SSL_CERT_PATH" ]] && [[ ! -f "$SSL_CERT_PATH" ]]; then
    echo "⚠ SSL certificate not found at $SSL_CERT_PATH"
fi

# Start production services
echo "Starting production services..."

# Build and start containers
docker-compose -f docker-compose.production.yml build --no-cache
docker-compose -f docker-compose.production.yml up -d

# Wait for services to start
echo "Waiting for services to start..."
sleep 30

# Verify services are healthy
echo "Verifying service health..."

# Check database
if docker-compose -f docker-compose.production.yml exec postgres pg_isready -U "$DB_USER" -d "$DB_NAME"; then
    echo "✓ Database is healthy"
else
    echo "✗ Database health check failed"
fi

# Check backend API
if curl -s -f http://localhost:8001/api/health > /dev/null; then
    echo "✓ Backend API is healthy"
else
    echo "✗ Backend API health check failed"
fi

# Check frontend
if curl -s -f http://localhost:9999 > /dev/null; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend health check failed"
fi

# Start monitoring services
echo "Starting monitoring services..."
./scripts/start-monitoring.sh

# Run security validation
echo "Running security validation..."
./scripts/security-validation.sh

echo "🎉 Production deployment completed successfully!"
echo "Services available at:"
echo "• Frontend: http://localhost:9999 (configure reverse proxy for HTTPS)"
echo "• Backend API: http://localhost:8001"
echo "• Monitoring Dashboard: http://localhost:8002"
echo "• Prometheus: http://localhost:9090"
echo "• Grafana: http://localhost:3001"

echo ""
echo "Next steps:"
echo "1. Configure reverse proxy (Nginx) for HTTPS"
echo "2. Set up domain name and SSL certificates"
echo "3. Configure external monitoring services"
echo "4. Set up automated backups"
echo "5. Test all functionality thoroughly"
