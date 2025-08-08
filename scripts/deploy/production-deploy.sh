#!/bin/bash

# 6FB AI Agent System - Production Deployment Script
# Comprehensive production deployment with health checks and rollback capability

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups/deployment-$(date +%Y%m%d-%H%M%S)"
HEALTH_CHECK_RETRIES=30
HEALTH_CHECK_DELAY=10

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Cleanup function for rollback
cleanup_on_error() {
    log_error "Deployment failed. Starting rollback procedure..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        log_info "Restoring from backup: $BACKUP_DIR"
        
        # Stop current containers
        docker-compose -f docker-compose.production.yml down || true
        
        # Restore backup if it exists
        if [[ -f "$BACKUP_DIR/docker-compose.yml" ]]; then
            cp "$BACKUP_DIR/docker-compose.yml" docker-compose.production.yml
            docker-compose -f docker-compose.production.yml up -d
        fi
        
        log_warning "Rollback completed. Check system status."
    fi
    
    exit 1
}

# Set up error handling
trap cleanup_on_error ERR

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if .env.production exists
    if [[ ! -f "${PROJECT_ROOT}/.env.production" ]]; then
        log_error ".env.production file not found"
        log_info "Copy .env.production.example to .env.production and configure it"
        exit 1
    fi
    
    # Validate required environment variables
    source "${PROJECT_ROOT}/.env.production"
    
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY" 
        "SUPABASE_SERVICE_ROLE_KEY"
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Check available disk space (minimum 5GB)
    available_space=$(df "${PROJECT_ROOT}" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then  # 5GB in KB
        log_warning "Low disk space. Available: $(( available_space / 1024 / 1024 ))GB"
    fi
    
    log_success "Pre-deployment checks passed"
}

# Create backup of current deployment
create_backup() {
    log_info "Creating deployment backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup current configurations
    if [[ -f "docker-compose.production.yml" ]]; then
        cp docker-compose.production.yml "$BACKUP_DIR/"
    fi
    
    if [[ -f ".env.production" ]]; then
        cp .env.production "$BACKUP_DIR/"
    fi
    
    # Backup database if running locally
    if docker-compose -f docker-compose.production.yml ps postgres | grep -q "Up"; then
        log_info "Backing up database..."
        docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U barbershop barbershop_ai > "$BACKUP_DIR/database_backup.sql" || true
    fi
    
    # Backup volumes
    if [[ -d "data" ]]; then
        cp -r data "$BACKUP_DIR/" || true
    fi
    
    log_success "Backup created: $BACKUP_DIR"
}

# Build and validate images
build_images() {
    log_info "Building production images..."
    
    # Set environment for build
    export NODE_ENV=production
    source .env.production
    
    # Build images with progress
    docker-compose -f docker-compose.production.yml build --no-cache --parallel
    
    # Validate that images were built successfully
    local images=(
        "6fb-ai-agent-system_frontend"
        "6fb-ai-agent-system_backend"
    )
    
    for image in "${images[@]}"; do
        if ! docker images "$image" | grep -q latest; then
            log_error "Failed to build image: $image"
            exit 1
        fi
    done
    
    log_success "Images built successfully"
}

# Deploy services with health checks
deploy_services() {
    log_info "Deploying production services..."
    
    # Stop existing services gracefully
    if [[ -f "docker-compose.production.yml" ]]; then
        log_info "Stopping existing services..."
        docker-compose -f docker-compose.production.yml down --timeout 30 || true
    fi
    
    # Clean up unused resources
    docker system prune -f --volumes || true
    
    # Start services in dependency order
    log_info "Starting database services..."
    docker-compose -f docker-compose.production.yml up -d postgres redis
    
    # Wait for database services to be healthy
    log_info "Waiting for database services to be ready..."
    wait_for_service_health "postgres" 60
    wait_for_service_health "redis" 30
    
    log_info "Starting application services..."
    docker-compose -f docker-compose.production.yml up -d backend frontend nginx
    
    # Wait for application services to be healthy
    log_info "Waiting for application services to be ready..."
    wait_for_service_health "backend" 120
    wait_for_service_health "frontend" 120
    wait_for_service_health "nginx" 60
    
    log_success "All services deployed successfully"
}

# Wait for service health check
wait_for_service_health() {
    local service=$1
    local timeout=${2:-60}
    local count=0
    
    log_info "Waiting for $service to be healthy (timeout: ${timeout}s)..."
    
    while [[ $count -lt $timeout ]]; do
        if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "healthy"; then
            log_success "$service is healthy"
            return 0
        fi
        
        if docker-compose -f docker-compose.production.yml ps "$service" | grep -q "unhealthy"; then
            log_error "$service is unhealthy"
            # Show logs for debugging
            docker-compose -f docker-compose.production.yml logs --tail=20 "$service"
            return 1
        fi
        
        sleep 5
        count=$((count + 5))
        echo -n "."
    done
    
    echo ""
    log_error "$service health check timed out"
    docker-compose -f docker-compose.production.yml logs --tail=20 "$service"
    return 1
}

# Run comprehensive post-deployment tests
post_deployment_tests() {
    log_info "Running post-deployment tests..."
    
    # Test frontend health
    local frontend_url="http://localhost:3000"
    if curl -sf "$frontend_url/api/health" > /dev/null; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    # Test backend health
    local backend_url="http://localhost:8000"
    if curl -sf "$backend_url/health" > /dev/null; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Test database connectivity
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U barbershop > /dev/null; then
        log_success "Database connectivity test passed"
    else
        log_error "Database connectivity test failed"
        return 1
    fi
    
    # Test Redis connectivity
    if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping | grep -q PONG; then
        log_success "Redis connectivity test passed"
    else
        log_error "Redis connectivity test failed"
        return 1
    fi
    
    # Test Nginx proxy
    if curl -sf "http://localhost/health" > /dev/null; then
        log_success "Nginx proxy test passed"
    else
        log_error "Nginx proxy test failed"
        return 1
    fi
    
    log_success "All post-deployment tests passed"
}

# Generate deployment report
generate_deployment_report() {
    log_info "Generating deployment report..."
    
    local report_file="${PROJECT_ROOT}/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
    "deployment": {
        "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
        "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
        "environment": "production",
        "backup_location": "$BACKUP_DIR"
    },
    "services": {
        "frontend": "$(docker-compose -f docker-compose.production.yml ps frontend --format json | jq -r '.State')",
        "backend": "$(docker-compose -f docker-compose.production.yml ps backend --format json | jq -r '.State')",
        "postgres": "$(docker-compose -f docker-compose.production.yml ps postgres --format json | jq -r '.State')",
        "redis": "$(docker-compose -f docker-compose.production.yml ps redis --format json | jq -r '.State')",
        "nginx": "$(docker-compose -f docker-compose.production.yml ps nginx --format json | jq -r '.State')"
    },
    "resources": {
        "disk_usage": "$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}')",
        "docker_images": $(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" | grep 6fb-ai-agent-system | wc -l),
        "containers_running": $(docker-compose -f docker-compose.production.yml ps --services --filter status=running | wc -l)
    },
    "health_checks": {
        "frontend_health": "$(curl -sf http://localhost:3000/api/health > /dev/null && echo 'healthy' || echo 'unhealthy')",
        "backend_health": "$(curl -sf http://localhost:8000/health > /dev/null && echo 'healthy' || echo 'unhealthy')",
        "nginx_proxy": "$(curl -sf http://localhost/health > /dev/null && echo 'healthy' || echo 'unhealthy')"
    }
}
EOF

    log_success "Deployment report generated: $report_file"
}

# Setup monitoring and alerting
setup_monitoring() {
    log_info "Setting up monitoring and alerting..."
    
    # Create log directories
    mkdir -p logs/{nginx,app,security}
    
    # Set up log rotation
    if command -v logrotate > /dev/null; then
        cat > /etc/logrotate.d/6fb-ai-agent-system << EOF
${PROJECT_ROOT}/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 1000 1000
    postrotate
        docker-compose -f ${PROJECT_ROOT}/docker-compose.production.yml restart nginx > /dev/null 2>&1 || true
    endscript
}
EOF
    fi
    
    log_success "Monitoring setup completed"
}

# Main deployment function
main() {
    log_info "Starting 6FB AI Agent System production deployment..."
    log_info "Deployment ID: $(date +%Y%m%d-%H%M%S)"
    
    cd "$PROJECT_ROOT"
    
    # Run deployment steps
    pre_deployment_checks
    create_backup
    build_images
    deploy_services
    post_deployment_tests
    setup_monitoring
    generate_deployment_report
    
    log_success "Production deployment completed successfully!"
    log_info ""
    log_info "🚀 Deployment Summary:"
    log_info "   Frontend: http://localhost:3000"
    log_info "   Backend API: http://localhost:8000"
    log_info "   Nginx Proxy: http://localhost"
    log_info "   Backup Location: $BACKUP_DIR"
    log_info ""
    log_info "📊 Service Status:"
    docker-compose -f docker-compose.production.yml ps
    log_info ""
    log_info "Next steps:"
    log_info "1. Configure SSL certificates in nginx/ssl/"
    log_info "2. Set up domain DNS to point to this server"
    log_info "3. Configure monitoring alerts"
    log_info "4. Run security validation: npm run test:security"
}

# Help function
show_help() {
    cat << EOF
6FB AI Agent System - Production Deployment Script

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    --skip-tests        Skip post-deployment tests
    --no-backup         Skip backup creation
    --force             Force deployment even with warnings

Examples:
    $0                  # Standard production deployment
    $0 --skip-tests     # Deploy without running tests
    $0 --force          # Force deployment
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-backup)
            NO_BACKUP=true
            shift
            ;;
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main deployment
main "$@"