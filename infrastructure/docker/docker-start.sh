#!/bin/bash
# Docker Environment Launcher
# Version: 1.0 - Infrastructure Consolidation
# Date: 2025-08-25

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Determine environment
ENV=${1:-dev}
PROFILE=${2:-default}

# Change to infrastructure/docker directory
cd "$(dirname "$0")"

echo -e "${BLUE}🐳 6FB AI Agent System - Docker Environment Manager${NC}"
echo -e "${BLUE}=================================================${NC}"

case $ENV in
  dev|development)
    echo -e "${GREEN}Starting Development Environment...${NC}"
    
    # Check if .env.local exists
    if [ ! -f "../../.env.local" ]; then
      echo -e "${YELLOW}Warning: .env.local not found. Copying from .env.local.example${NC}"
      cp ../../.env.local.example ../../.env.local
    fi
    
    # Start development stack
    if [ "$PROFILE" == "debug" ]; then
      echo -e "${YELLOW}Starting with debug tools (Adminer, Redis Commander, Mailcatcher)${NC}"
      docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml --profile debug up -d
    else
      docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d
    fi
    
    echo -e "${GREEN}✅ Development environment started!${NC}"
    echo -e "Frontend: ${BLUE}http://localhost:9999${NC}"
    echo -e "Backend API: ${BLUE}http://localhost:8001${NC}"
    echo -e "Redis: ${BLUE}localhost:6379${NC}"
    
    if [ "$PROFILE" == "debug" ]; then
      echo -e "Adminer (DB): ${BLUE}http://localhost:8080${NC}"
      echo -e "Redis Commander: ${BLUE}http://localhost:8081${NC}"
      echo -e "Mailcatcher: ${BLUE}http://localhost:1080${NC}"
    fi
    ;;
    
  prod|production)
    echo -e "${GREEN}Starting Production Environment...${NC}"
    
    # Check if .env.production exists
    if [ ! -f "../../.env.production" ]; then
      echo -e "${RED}Error: .env.production not found!${NC}"
      echo -e "${YELLOW}Please create .env.production with your production credentials${NC}"
      exit 1
    fi
    
    # Validate required production variables
    required_vars=("DATABASE_URL" "REDIS_PASSWORD" "DOMAIN_NAME" "STRIPE_SECRET_KEY")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
      if ! grep -q "^${var}=" "../../.env.production"; then
        missing_vars+=("$var")
      fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
      echo -e "${RED}Error: Missing required production variables:${NC}"
      printf '%s\n' "${missing_vars[@]}"
      exit 1
    fi
    
    # Start production stack
    if [ "$PROFILE" == "monitoring" ]; then
      echo -e "${YELLOW}Starting with monitoring stack (Prometheus, Grafana)${NC}"
      docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml --profile monitoring up -d
    else
      docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d
    fi
    
    echo -e "${GREEN}✅ Production environment started!${NC}"
    echo -e "Nginx: ${BLUE}http://localhost (port 80/443)${NC}"
    
    if [ "$PROFILE" == "monitoring" ]; then
      echo -e "Prometheus: ${BLUE}http://localhost:9090${NC}"
      echo -e "Grafana: ${BLUE}http://localhost:3000${NC}"
    fi
    ;;
    
  staging)
    echo -e "${GREEN}Starting Staging Environment...${NC}"
    # Staging uses production config with staging env file
    if [ ! -f "../../.env.staging" ]; then
      echo -e "${YELLOW}Warning: .env.staging not found. Using .env.production${NC}"
      ENV_FILE="../../.env.production"
    else
      ENV_FILE="../../.env.staging"
    fi
    
    docker-compose -f docker-compose.base.yml -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d
    echo -e "${GREEN}✅ Staging environment started!${NC}"
    ;;
    
  stop)
    echo -e "${YELLOW}Stopping all containers...${NC}"
    docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml --profile debug --profile monitoring down
    echo -e "${GREEN}✅ All containers stopped${NC}"
    ;;
    
  clean)
    echo -e "${RED}Cleaning up all containers and volumes...${NC}"
    echo -e "${YELLOW}This will delete all data! Press Ctrl+C to cancel...${NC}"
    sleep 5
    docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml --profile debug --profile monitoring down -v
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    ;;
    
  status)
    echo -e "${BLUE}Container Status:${NC}"
    docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml ps
    ;;
    
  logs)
    SERVICE=${2:-all}
    if [ "$SERVICE" == "all" ]; then
      docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml logs -f
    else
      docker-compose -f docker-compose.base.yml -f docker-compose.dev.yml -f docker-compose.prod.yml logs -f $SERVICE
    fi
    ;;
    
  *)
    echo -e "${YELLOW}Usage: $0 [dev|prod|staging|stop|clean|status|logs] [profile]${NC}"
    echo ""
    echo "Commands:"
    echo "  dev [debug]      - Start development environment"
    echo "  prod [monitoring]- Start production environment"
    echo "  staging         - Start staging environment"
    echo "  stop            - Stop all containers"
    echo "  clean           - Remove all containers and volumes"
    echo "  status          - Show container status"
    echo "  logs [service]  - Show logs (all services or specific)"
    echo ""
    echo "Profiles:"
    echo "  debug      - Include debug tools (dev only)"
    echo "  monitoring - Include monitoring stack (prod only)"
    ;;
esac