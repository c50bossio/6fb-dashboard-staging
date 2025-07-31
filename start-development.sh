#!/bin/bash
# 6FB AI Agent System - Development Environment Startup
# Simple, reliable development setup with SQLite

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting 6FB AI Agent System (Development)${NC}"

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker not found. Please install Docker.${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"; exit 1; }

# Create required directories
mkdir -p data logs

# Check if .env exists
if [[ ! -f .env ]]; then
    echo -e "${BLUE}📝 Creating .env from template...${NC}"
    cp .env.template .env
    echo -e "${BLUE}⚠️  Please edit .env with your API keys before continuing${NC}"
    read -p "Press Enter to continue after editing .env..."
fi

# Start development services
echo -e "${BLUE}🐳 Starting Docker containers...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 30

# Health checks
echo -e "${BLUE}🏥 Running health checks...${NC}"

# Check backend
if curl -f http://localhost:8001/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose logs backend
    exit 1
fi

# Check frontend
if curl -f http://localhost:9999 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is healthy${NC}"
else
    echo -e "${RED}❌ Frontend health check failed${NC}"
    docker-compose logs frontend
    exit 1
fi

echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo ""
echo "📱 Frontend:     http://localhost:9999"
echo "🔧 Backend API:  http://localhost:8001"
echo "📊 API Docs:     http://localhost:8001/docs"
echo ""
echo "🔍 View logs:    docker-compose logs -f"
echo "🛑 Stop:         docker-compose down"
echo ""