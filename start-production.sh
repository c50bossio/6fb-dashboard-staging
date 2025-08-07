#!/bin/bash
# 6FB AI Agent System - Production Environment Startup
# Full production stack with monitoring, security, and backup

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting 6FB AI Agent System (Production)${NC}"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"; exit 1; }

# Check if .env exists and contains production values
if [[ ! -f .env ]]; then
    echo -e "${RED}❌ .env file not found. Please create from .env.template${NC}"
    exit 1
fi

# Check for placeholder values
if grep -q "your-.*-key" .env; then
    echo -e "${YELLOW}⚠️  Warning: .env contains placeholder values. Please update with real API keys.${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Use the production deployment script
echo -e "${BLUE}🏗️  Deploying production stack...${NC}"
./infrastructure/scripts/deploy.sh

echo -e "${GREEN}🎉 Production environment is ready!${NC}"
echo ""
echo "🌐 Frontend:     http://localhost:9999 (HTTP) / https://localhost (HTTPS)"
echo "🔧 Backend API:  http://localhost:8001"
echo "📊 API Docs:     http://localhost:8001/docs"
echo "📈 Prometheus:   http://localhost:9090"
echo "📊 Grafana:      http://localhost:3000"
echo "🗄️  PostgreSQL:  localhost:5432"
echo "💾 Redis:        localhost:6379"
echo ""
echo "🔍 View logs:    docker-compose -f docker-compose.production.yml logs -f"
echo "🛑 Stop:         docker-compose -f docker-compose.production.yml down"
echo "📋 Status:       docker-compose -f docker-compose.production.yml ps"
echo ""