#!/bin/bash

# Production Deployment Script for 6FB AI Agent System
# Automated deployment script with safety checks and rollback capability

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/production-deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOYMENT_NAME="deployment-${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Colored output functions
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log "INFO" "$1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    log "WARN" "$1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log "ERROR" "$1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log "SUCCESS" "$1"
}

# Error handling
error_exit() {
    error "$1"
    send_notification "FAILED" "Deployment failed: $1"
    exit 1
}

# Send notification function
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification (if configured)
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 6FB AI Agent System Deployment [$status]: $message\"}" \
            "$SLACK_WEBHOOK" 2>/dev/null || warn "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "${DEPLOYMENT_EMAIL:-}" ]] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "6FB AI Agent System Deployment [$status]" "$DEPLOYMENT_EMAIL" || \
            warn "Failed to send email notification"
    fi
}

# Usage information
usage() {
    cat << EOF
6FB AI Agent System Production Deployment Script

Usage: $0 [OPTIONS]

Options:
    -e, --environment ENV     Target environment (staging, production) [default: production]
    -b, --branch BRANCH       Git branch to deploy [default: main]
    -v, --version VERSION     Specific version/tag to deploy
    -r, --rollback            Rollback to previous deployment
    -f, --force               Force deployment without confirmations
    -t, --test-only           Run pre-deployment tests only
    -h, --help               Show this help message

Examples:
    $0                                    # Deploy main branch to production
    $0 -e staging -b develop             # Deploy develop branch to staging
    $0 -v v1.2.3 -e production          # Deploy specific version
    $0 --rollback                        # Rollback to previous deployment
    $0 --test-only                       # Run tests without deploying

EOF
}

# Parse command line arguments
parse_args() {
    ENVIRONMENT="production"
    BRANCH="main"
    VERSION=""
    ROLLBACK=false
    FORCE=false
    TEST_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--environment)
                ENVIRONMENT="$2"
                shift 2
                ;;
            -b|--branch)
                BRANCH="$2"
                shift 2
                ;;
            -v|--version)
                VERSION="$2"
                shift 2
                ;;
            -r|--rollback)
                ROLLBACK=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -t|--test-only)
                TEST_ONLY=true
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate environment
    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        error_exit "Invalid environment: $ENVIRONMENT. Must be 'staging' or 'production'"
    fi
}

# Load environment configuration
load_environment() {
    info "Loading environment configuration for: $ENVIRONMENT"
    
    # Load environment-specific configuration
    if [[ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]]; then
        source "${PROJECT_ROOT}/.env.${ENVIRONMENT}"
        info "Loaded $ENVIRONMENT environment configuration"
    else
        warn "$ENVIRONMENT environment file not found, using defaults"
    fi
    
    # Set deployment-specific variables
    COMPOSE_FILE="docker-compose.prod.yml"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        COMPOSE_FILE="docker-compose.staging.yml"
    fi
    
    # Verify required environment variables
    local required_vars=("DATABASE_URL" "REDIS_URL")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error_exit "Required environment variable $var is not set"
        fi
    done
}

# Pre-deployment checks
pre_deployment_checks() {
    info "Running pre-deployment checks..."
    
    # Check if we're in the correct directory
    if [[ ! -f "${PROJECT_ROOT}/docker-compose.prod.yml" ]]; then
        error_exit "docker-compose.prod.yml not found. Are you in the correct directory?"
    fi
    
    # Check Docker and Docker Compose
    if ! command -v docker >/dev/null 2>&1; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose >/dev/null 2>&1; then
        error_exit "Docker Compose is not installed or not in PATH"
    fi
    
    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        error_exit "Docker daemon is not running"
    fi
    
    # Check disk space (need at least 5GB free)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then
        error_exit "Insufficient disk space. Need at least 5GB free."
    fi
    
    # Check network connectivity
    if ! curl -sf https://api.github.com >/dev/null 2>&1; then
        error_exit "No internet connectivity. Cannot pull Docker images."
    fi
    
    success "Pre-deployment checks passed"
}

# Git operations
handle_git_operations() {
    if [[ "$ROLLBACK" == true ]]; then
        info "Skipping git operations for rollback"
        return 0
    fi
    
    info "Handling git operations..."
    
    cd "$PROJECT_ROOT"
    
    # Check if we have uncommitted changes
    if [[ -n "$(git status --porcelain)" && "$FORCE" == false ]]; then
        error_exit "You have uncommitted changes. Commit or stash them before deployment."
    fi
    
    # Fetch latest changes
    git fetch origin || error_exit "Failed to fetch from origin"
    
    # Checkout target version
    if [[ -n "$VERSION" ]]; then
        info "Checking out version: $VERSION"
        git checkout "$VERSION" || error_exit "Failed to checkout version $VERSION"
    else
        info "Checking out branch: $BRANCH"
        git checkout "$BRANCH" || error_exit "Failed to checkout branch $BRANCH"
        git pull origin "$BRANCH" || error_exit "Failed to pull latest changes"
    fi
    
    # Get current commit hash
    CURRENT_COMMIT=$(git rev-parse HEAD)
    info "Deploying commit: $CURRENT_COMMIT"
    
    success "Git operations completed"
}

# Create deployment backup
create_deployment_backup() {
    info "Creating deployment backup..."
    
    local backup_dir="/opt/agent-system/backups/deployments"
    mkdir -p "$backup_dir"
    
    # Backup current environment file
    if [[ -f "${PROJECT_ROOT}/.env.${ENVIRONMENT}" ]]; then
        cp "${PROJECT_ROOT}/.env.${ENVIRONMENT}" "${backup_dir}/.env.${ENVIRONMENT}.${TIMESTAMP}" || \
            warn "Failed to backup environment file"
    fi
    
    # Backup current git commit
    echo "$CURRENT_COMMIT" > "${backup_dir}/commit.${TIMESTAMP}" || \
        warn "Failed to backup commit hash"
    
    # Export current Docker images
    if docker-compose -f "$COMPOSE_FILE" ps -q >/dev/null 2>&1; then
        docker-compose -f "$COMPOSE_FILE" config | grep 'image:' | awk '{print $2}' | \
            xargs -r docker save -o "${backup_dir}/images.${TIMESTAMP}.tar" || \
            warn "Failed to backup Docker images"
    fi
    
    success "Deployment backup created"
}

# Run tests
run_tests() {
    info "Running test suite..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    if [[ -f "package.json" ]]; then
        info "Running frontend tests..."
        npm test || error_exit "Frontend tests failed"
    fi
    
    # Run backend tests
    if [[ -f "requirements.txt" ]]; then
        info "Running backend tests..."
        docker-compose -f "$COMPOSE_FILE" run --rm backend pytest || error_exit "Backend tests failed"
    fi
    
    # Run integration tests
    info "Running integration tests..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend python -m pytest tests/integration/ || \
        warn "Some integration tests failed"
    
    success "Test suite completed"
}

# Build and pull images
build_images() {
    info "Building and pulling Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Pull base images first
    docker-compose -f "$COMPOSE_FILE" pull || error_exit "Failed to pull Docker images"
    
    # Build application images
    docker-compose -f "$COMPOSE_FILE" build --no-cache || error_exit "Failed to build Docker images"
    
    success "Docker images ready"
}

# Deploy services
deploy_services() {
    info "Deploying services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services
    info "Stopping existing services..."
    docker-compose -f "$COMPOSE_FILE" down || warn "Failed to stop some services"
    
    # Start database and cache first
    info "Starting infrastructure services..."
    docker-compose -f "$COMPOSE_FILE" up -d database redis || error_exit "Failed to start infrastructure"
    
    # Wait for database to be ready
    info "Waiting for database to be ready..."
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T database pg_isready >/dev/null 2>&1; then
            break
        fi
        sleep 2
        ((retries--))
    done
    
    if [[ $retries -eq 0 ]]; then
        error_exit "Database failed to start within timeout"
    fi
    
    # Run database migrations
    info "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" run --rm backend python -m alembic upgrade head || \
        warn "Database migrations failed or not applicable"
    
    # Start application services
    info "Starting application services..."
    docker-compose -f "$COMPOSE_FILE" up -d || error_exit "Failed to start application services"
    
    # Start monitoring services
    info "Starting monitoring services..."
    docker-compose -f "$COMPOSE_FILE" up -d prometheus grafana loki promtail || \
        warn "Failed to start some monitoring services"
    
    success "Services deployed successfully"
}

# Health checks
run_health_checks() {
    info "Running health checks..."
    
    local max_retries=30
    local retry_interval=10
    
    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 30
    
    # Check frontend health
    local retries=$max_retries
    while [[ $retries -gt 0 ]]; do
        if curl -sf "http://localhost:9999/api/health" >/dev/null 2>&1; then
            success "Frontend health check passed"
            break
        fi
        sleep $retry_interval
        ((retries--))
    done
    
    if [[ $retries -eq 0 ]]; then
        error_exit "Frontend health check failed"
    fi
    
    # Check backend health
    retries=$max_retries
    while [[ $retries -gt 0 ]]; do
        if curl -sf "http://localhost:8001/health" >/dev/null 2>&1; then
            success "Backend health check passed"
            break
        fi
        sleep $retry_interval
        ((retries--))
    done
    
    if [[ $retries -eq 0 ]]; then
        error_exit "Backend health check failed"
    fi
    
    # Check database connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.close()
    print('Database connection successful')
except Exception as e:
    print(f'Database connection failed: {e}')
    exit(1)
" >/dev/null 2>&1; then
        success "Database connectivity check passed"
    else
        error_exit "Database connectivity check failed"
    fi
    
    # Check Redis connectivity
    if docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping | grep -q "PONG"; then
        success "Redis connectivity check passed"
    else
        error_exit "Redis connectivity check failed"
    fi
    
    success "All health checks passed"
}

# Post-deployment tasks
post_deployment_tasks() {
    info "Running post-deployment tasks..."
    
    # Clear application caches
    info "Clearing application caches..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend python -c "
import redis
r = redis.from_url('$REDIS_URL')
r.flushdb()
print('Cache cleared')
" || warn "Failed to clear Redis cache"
    
    # Warm up application
    info "Warming up application..."
    curl -sf "http://localhost:9999/" >/dev/null 2>&1 || warn "Failed to warm up frontend"
    curl -sf "http://localhost:8001/docs" >/dev/null 2>&1 || warn "Failed to warm up backend"
    
    # Create deployment record
    local deployment_record="/var/log/deployments.log"
    echo "[$(date)] Deployment completed: $DEPLOYMENT_NAME, Commit: ${CURRENT_COMMIT:-unknown}, Environment: $ENVIRONMENT" >> "$deployment_record"
    
    success "Post-deployment tasks completed"
}

# Rollback to previous deployment
rollback_deployment() {
    info "Rolling back to previous deployment..."
    
    local backup_dir="/opt/agent-system/backups/deployments"
    
    # Find most recent backup
    local latest_backup=$(ls -t "${backup_dir}"/commit.* 2>/dev/null | head -1)
    if [[ -z "$latest_backup" ]]; then
        error_exit "No previous deployment found to rollback to"
    fi
    
    local backup_timestamp=$(basename "$latest_backup" | sed 's/commit\.//')
    local backup_commit=$(cat "$latest_backup")
    
    info "Rolling back to commit: $backup_commit (backup: $backup_timestamp)"
    
    # Stop current services
    docker-compose -f "$COMPOSE_FILE" down || warn "Failed to stop some services"
    
    # Checkout previous commit
    cd "$PROJECT_ROOT"
    git checkout "$backup_commit" || error_exit "Failed to checkout previous commit"
    
    # Restore environment file
    if [[ -f "${backup_dir}/.env.${ENVIRONMENT}.${backup_timestamp}" ]]; then
        cp "${backup_dir}/.env.${ENVIRONMENT}.${backup_timestamp}" "${PROJECT_ROOT}/.env.${ENVIRONMENT}" || \
            warn "Failed to restore environment file"
    fi
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d || error_exit "Failed to start services after rollback"
    
    # Run health checks
    run_health_checks
    
    success "Rollback completed successfully"
}

# Cleanup old deployments
cleanup_old_deployments() {
    info "Cleaning up old deployments..."
    
    # Remove old Docker images (keep last 3)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | \
        grep -E "agent-system-(frontend|backend)" | \
        tail -n +4 | \
        awk '{print $3}' | \
        xargs -r docker rmi || warn "Failed to remove some old images"
    
    # Clean up old backup files (keep last 10)
    find /opt/agent-system/backups/deployments -name "commit.*" -type f | \
        sort -r | tail -n +11 | xargs -r rm || warn "Failed to remove old backup files"
    
    # Docker system cleanup
    docker system prune -f || warn "Failed to run docker system prune"
    
    success "Cleanup completed"
}

# Generate deployment report
generate_deployment_report() {
    info "Generating deployment report..."
    
    local report_file="/var/log/deployment-report-${TIMESTAMP}.txt"
    
    cat > "$report_file" << EOF
6FB AI Agent System Deployment Report
====================================

Deployment Name: $DEPLOYMENT_NAME
Date: $(date)
Environment: $ENVIRONMENT
Branch/Version: ${VERSION:-$BRANCH}
Commit: ${CURRENT_COMMIT:-unknown}
Operator: $(whoami)

Services Status:
---------------
$(docker-compose -f "$COMPOSE_FILE" ps)

System Resources:
----------------
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}")

Health Check Results:
--------------------
Frontend: $(curl -sf http://localhost:9999/api/health >/dev/null 2>&1 && echo "✓ Healthy" || echo "✗ Unhealthy")
Backend: $(curl -sf http://localhost:8001/health >/dev/null 2>&1 && echo "✓ Healthy" || echo "✗ Unhealthy")
Database: $(docker-compose -f "$COMPOSE_FILE" exec -T database pg_isready >/dev/null 2>&1 && echo "✓ Healthy" || echo "✗ Unhealthy")
Redis: $(docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG" && echo "✓ Healthy" || echo "✗ Unhealthy")

Deployment Log: $LOG_FILE
Report Location: $report_file
EOF

    success "Deployment report generated: $report_file"
}

# Main execution
main() {
    info "Starting 6FB AI Agent System deployment: $DEPLOYMENT_NAME"
    
    parse_args "$@"
    load_environment
    pre_deployment_checks
    
    if [[ "$ROLLBACK" == true ]]; then
        rollback_deployment
        send_notification "SUCCESS" "Rollback completed successfully"
        return 0
    fi
    
    if [[ "$TEST_ONLY" == true ]]; then
        run_tests
        success "Tests completed successfully"
        return 0
    fi
    
    # Confirmation prompt (unless forced)
    if [[ "$FORCE" == false ]]; then
        warn "About to deploy to $ENVIRONMENT environment"
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            info "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Execute deployment steps
    handle_git_operations
    create_deployment_backup
    run_tests
    build_images
    deploy_services
    run_health_checks
    post_deployment_tasks
    cleanup_old_deployments
    generate_deployment_report
    
    success "Deployment completed successfully: $DEPLOYMENT_NAME"
    send_notification "SUCCESS" "Deployment completed successfully: $DEPLOYMENT_NAME"
    
    info "Services are now running:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    info "Access URLs:"
    info "  Frontend: http://localhost:9999"
    info "  Backend API: http://localhost:8001"
    info "  API Documentation: http://localhost:8001/docs"
    info "  Monitoring: http://localhost:3000 (Grafana)"
}

# Execute main function
main "$@"