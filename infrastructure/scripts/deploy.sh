#!/bin/bash
# 6FB AI Agent System - Production Deployment Script
# Comprehensive deployment with health checks and rollback capability

set -euo pipefail

# Configuration
PROJECT_NAME="6fb-ai-agent-system"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env"
BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./logs/deploy-$(date +%Y%m%d_%H%M%S).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Check if required files exist
    [[ -f "$COMPOSE_FILE" ]] || error "Docker Compose file not found: $COMPOSE_FILE"
    [[ -f "$ENV_FILE" ]] || error "Environment file not found: $ENV_FILE"
    
    # Check Docker and Docker Compose
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    
    # Check Docker daemon
    docker info >/dev/null 2>&1 || error "Docker daemon is not running"
    
    # Check available disk space (minimum 5GB)
    available_space=$(df / | awk 'NR==2 {print $4}')
    [[ $available_space -gt 5242880 ]] || warn "Low disk space available: ${available_space}KB"
    
    success "Pre-deployment checks completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup volumes if they exist
    if docker volume ls | grep -q "${PROJECT_NAME}"; then
        docker run --rm -v "${PROJECT_NAME}_postgres_data:/backup-source" -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
            tar czf "/backup/postgres_data.tar.gz" -C /backup-source .
        docker run --rm -v "${PROJECT_NAME}_app_data:/backup-source" -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
            tar czf "/backup/app_data.tar.gz" -C /backup-source .
    fi
    
    # Backup configuration files
    cp "$COMPOSE_FILE" "$BACKUP_DIR/"
    cp "$ENV_FILE" "$BACKUP_DIR/"
    
    success "Backup created: $BACKUP_DIR"
}

# Build images
build_images() {
    log "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --parallel --pull
    success "Images built successfully"
}

# Deploy services
deploy_services() {
    log "Deploying services..."
    
    # Create volumes directory
    mkdir -p volumes/{postgres,redis,backend,logs,nginx,prometheus,grafana}
    
    # Start services with dependency order
    docker-compose -f "$COMPOSE_FILE" up -d postgres redis
    sleep 30  # Wait for databases to initialize
    
    docker-compose -f "$COMPOSE_FILE" up -d backend
    sleep 30  # Wait for backend to be ready
    
    docker-compose -f "$COMPOSE_FILE" up -d frontend nginx
    sleep 30  # Wait for frontend and proxy
    
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana
    
    success "Services deployed"
}

# Health checks
health_checks() {
    log "Running health checks..."
    
    local max_attempts=10
    local attempt=1
    
    # Check backend health
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:8001/health >/dev/null 2>&1; then
            success "Backend health check passed"
            break
        fi
        warn "Backend health check failed (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    [[ $attempt -le $max_attempts ]] || error "Backend health check failed after $max_attempts attempts"
    
    # Check frontend health
    attempt=1
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:9999 >/dev/null 2>&1; then
            success "Frontend health check passed"
            break
        fi
        warn "Frontend health check failed (attempt $attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    [[ $attempt -le $max_attempts ]] || error "Frontend health check failed after $max_attempts attempts"
    
    # Check database connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-agent_user}" >/dev/null 2>&1; then
        success "Database connectivity check passed"
    else
        error "Database connectivity check failed"
    fi
    
    success "All health checks passed"
}

# Rollback function
rollback() {
    error "Deployment failed. Initiating rollback..."
    
    log "Stopping current deployment..."
    docker-compose -f "$COMPOSE_FILE" down
    
    if [[ -d "$BACKUP_DIR" ]]; then
        log "Restoring from backup..."
        # Restore volumes if backup exists
        if [[ -f "$BACKUP_DIR/postgres_data.tar.gz" ]]; then
            docker volume create "${PROJECT_NAME}_postgres_data" || true
            docker run --rm -v "${PROJECT_NAME}_postgres_data:/restore-target" -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
                tar xzf "/backup/postgres_data.tar.gz" -C /restore-target
        fi
        
        if [[ -f "$BACKUP_DIR/app_data.tar.gz" ]]; then
            docker volume create "${PROJECT_NAME}_app_data" || true
            docker run --rm -v "${PROJECT_NAME}_app_data:/restore-target" -v "$(pwd)/$BACKUP_DIR:/backup" alpine \
                tar xzf "/backup/app_data.tar.gz" -C /restore-target
        fi
    fi
    
    error "Rollback completed. Please check logs and resolve issues before retrying deployment."
}

# Cleanup old images and volumes
cleanup() {
    log "Cleaning up old images and volumes..."
    docker image prune -f
    docker volume prune -f
    success "Cleanup completed"
}

# Main deployment flow
main() {
    log "Starting deployment of $PROJECT_NAME..."
    
    # Create logs directory
    mkdir -p logs
    
    # Set trap for rollback on error
    trap rollback ERR
    
    pre_deployment_checks
    create_backup
    build_images
    deploy_services
    health_checks
    cleanup
    
    # Remove trap on successful completion
    trap - ERR
    
    success "Deployment completed successfully!"
    log "Services are running on:"
    log "  Frontend: http://localhost:9999"
    log "  Backend API: http://localhost:8001"
    log "  Prometheus: http://localhost:9090"
    log "  Grafana: http://localhost:3000"
    log "  PostgreSQL: localhost:5432"
    log "  Redis: localhost:6379"
}

# Command line options
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    health-check)
        health_checks
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|health-check|cleanup}"
        exit 1
        ;;
esac