#!/bin/bash

# 6FB AI Agent System - System Restoration Script
# Restores complete system from backup archive

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_ROOT="/backup"

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

# Show help
show_help() {
    cat << EOF
6FB AI Agent System - System Restoration Script

Usage: $0 [OPTIONS] <backup-file>

OPTIONS:
    -h, --help              Show this help message
    --database-only         Restore only database components
    --application-only      Restore only application files
    --configuration-only    Restore only configuration files
    --skip-services-stop    Don't stop running services
    --dry-run              Show what would be restored without making changes
    --force                Force restore without confirmation

Examples:
    $0 /backup/6fb_ai_system_backup_20240108_143022.tar.gz
    $0 --database-only backup_file.tar.gz
    $0 --dry-run backup_file.tar.gz

Available backups:
EOF

    if [[ -d "$BACKUP_ROOT" ]]; then
        ls -lht "$BACKUP_ROOT"/*backup*.tar.gz 2>/dev/null | head -10 || echo "    No backups found in $BACKUP_ROOT"
    else
        echo "    Backup directory $BACKUP_ROOT not found"
    fi
}

# Validate backup file
validate_backup() {
    local backup_file=$1
    
    log_info "Validating backup file: $backup_file"
    
    # Check if file exists
    if [[ ! -f "$backup_file" ]]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Check if file is a valid tar.gz
    if ! tar -tzf "$backup_file" > /dev/null 2>&1; then
        log_error "Invalid backup file: $backup_file"
        return 1
    fi
    
    # Check if backup contains expected structure
    if ! tar -tzf "$backup_file" | grep -q "BACKUP_MANIFEST.txt"; then
        log_error "Backup file does not contain manifest: $backup_file"
        return 1
    fi
    
    log_success "Backup file validation passed"
}

# Extract backup
extract_backup() {
    local backup_file=$1
    local temp_dir="/tmp/restore_$(date +%s)"
    
    log_info "Extracting backup to temporary directory..."
    
    mkdir -p "$temp_dir"
    cd "$temp_dir"
    
    tar -xzf "$backup_file"
    
    # Find the extracted backup directory
    local backup_dir=$(find . -maxdepth 1 -name "full_backup_*" -type d | head -1)
    
    if [[ -z "$backup_dir" ]]; then
        log_error "Could not find backup directory in extracted archive"
        rm -rf "$temp_dir"
        return 1
    fi
    
    echo "$temp_dir/$backup_dir"
}

# Show backup information
show_backup_info() {
    local backup_dir=$1
    
    log_info "Backup Information:"
    
    if [[ -f "$backup_dir/BACKUP_MANIFEST.txt" ]]; then
        echo ""
        head -20 "$backup_dir/BACKUP_MANIFEST.txt"
        echo ""
    else
        log_warning "Backup manifest not found"
    fi
}

# Stop running services
stop_services() {
    log_info "Stopping running services..."
    
    cd "$PROJECT_ROOT"
    
    # Stop main application services
    if [[ -f "docker-compose.production.yml" ]]; then
        docker-compose -f docker-compose.production.yml down --timeout 30 || true
    fi
    
    if [[ -f "docker-compose.yml" ]]; then
        docker-compose -f docker-compose.yml down --timeout 30 || true
    fi
    
    # Stop monitoring services
    if [[ -f "monitoring/docker-compose.monitoring.yml" ]]; then
        docker-compose -f monitoring/docker-compose.monitoring.yml down --timeout 30 || true
    fi
    
    log_success "Services stopped"
}

# Restore database
restore_database() {
    local backup_dir=$1
    
    log_info "Restoring database..."
    
    cd "$PROJECT_ROOT"
    
    # Start only PostgreSQL for restore
    if [[ -f "docker-compose.production.yml" ]]; then
        docker-compose -f docker-compose.production.yml up -d postgres
        
        # Wait for database to be ready
        log_info "Waiting for database to be ready..."
        sleep 10
        
        # Check if database backup exists
        local db_backup=$(find "$backup_dir/database" -name "*barbershop_ai*.sql.gz" | head -1)
        
        if [[ -n "$db_backup" ]]; then
            log_info "Restoring database from: $(basename "$db_backup")"
            
            # Drop existing database and recreate
            docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -c "
                SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'barbershop_ai';
                DROP DATABASE IF EXISTS barbershop_ai;
                CREATE DATABASE barbershop_ai;
            " || {
                log_warning "Could not drop/create database, continuing with restore..."
            }
            
            # Restore database
            gunzip -c "$db_backup" | docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -d barbershop_ai
            
            log_success "Database restored successfully"
        else
            log_warning "No database backup found in backup archive"
        fi
        
        # Restore Redis if backup exists
        local redis_backup=$(find "$backup_dir/database" -name "*redis*.rdb" | head -1)
        if [[ -n "$redis_backup" ]]; then
            log_info "Restoring Redis data..."
            
            # Start Redis
            docker-compose -f docker-compose.production.yml up -d redis
            sleep 5
            
            # Copy Redis dump (this is simplified, may need adjustment)
            docker-compose -f docker-compose.production.yml exec -T redis redis-cli FLUSHALL
            
            log_info "Redis backup found but restore requires manual intervention"
            log_info "Redis backup location: $redis_backup"
        fi
    else
        log_warning "docker-compose.production.yml not found, skipping database restore"
    fi
}

# Restore application files
restore_application() {
    local backup_dir=$1
    
    log_info "Restoring application files..."
    
    # Find application backup
    local app_backup=$(find "$backup_dir/application" -name "*application*.tar.gz" | head -1)
    
    if [[ -n "$app_backup" ]]; then
        log_info "Restoring application from: $(basename "$app_backup")"
        
        # Create backup of current application
        if [[ -d "$PROJECT_ROOT" ]]; then
            local current_backup="/tmp/current_app_backup_$(date +%s).tar.gz"
            tar -czf "$current_backup" -C "$(dirname "$PROJECT_ROOT")" "$(basename "$PROJECT_ROOT")" 2>/dev/null || true
            log_info "Current application backed up to: $current_backup"
        fi
        
        # Extract application backup
        cd "$(dirname "$PROJECT_ROOT")"
        tar -xzf "$app_backup"
        
        log_success "Application files restored"
    else
        log_warning "No application backup found in backup archive"
    fi
    
    # Restore package files
    if [[ -f "$backup_dir/application/package.json" ]]; then
        cp "$backup_dir/application/package.json" "$PROJECT_ROOT/"
        log_info "Package.json restored"
    fi
    
    if [[ -f "$backup_dir/application/package-lock.json" ]]; then
        cp "$backup_dir/application/package-lock.json" "$PROJECT_ROOT/"
        log_info "Package-lock.json restored"
    fi
}

# Restore configuration files
restore_configuration() {
    local backup_dir=$1
    
    log_info "Restoring configuration files..."
    
    cd "$PROJECT_ROOT"
    
    # Docker Compose files
    if [[ -f "$backup_dir/configuration/docker-compose.production.yml" ]]; then
        cp "$backup_dir/configuration/docker-compose.production.yml" .
        log_info "Docker Compose production configuration restored"
    fi
    
    if [[ -f "$backup_dir/configuration/docker-compose.yml" ]]; then
        cp "$backup_dir/configuration/docker-compose.yml" .
        log_info "Docker Compose development configuration restored"
    fi
    
    # Nginx configuration
    if [[ -d "$backup_dir/configuration/nginx" ]]; then
        cp -r "$backup_dir/configuration/nginx" .
        log_info "Nginx configuration restored"
    fi
    
    # Next.js configuration
    if [[ -f "$backup_dir/configuration/next.config.js" ]]; then
        cp "$backup_dir/configuration/next.config.js" .
        log_info "Next.js configuration restored"
    fi
    
    # Testing configuration
    if [[ -f "$backup_dir/configuration/playwright.config.js" ]]; then
        cp "$backup_dir/configuration/playwright.config.js" .
        log_info "Playwright configuration restored"
    fi
    
    if [[ -f "$backup_dir/configuration/jest.config.js" ]]; then
        cp "$backup_dir/configuration/jest.config.js" .
        log_info "Jest configuration restored"
    fi
    
    # Dockerfile configurations
    for dockerfile in "$backup_dir/configuration/Dockerfile"*; do
        if [[ -f "$dockerfile" ]]; then
            cp "$dockerfile" .
            log_info "$(basename "$dockerfile") restored"
        fi
    done
    
    log_success "Configuration files restored"
}

# Restore logs
restore_logs() {
    local backup_dir=$1
    
    log_info "Restoring logs..."
    
    cd "$PROJECT_ROOT"
    
    # Application logs
    if [[ -d "$backup_dir/logs/application_logs" ]]; then
        mkdir -p logs
        cp -r "$backup_dir/logs/application_logs"/* logs/ 2>/dev/null || true
        log_info "Application logs restored"
    fi
    
    # Container logs are informational only, not restored
    
    log_success "Logs restored"
}

# Restore monitoring configuration
restore_monitoring() {
    local backup_dir=$1
    
    log_info "Restoring monitoring configuration..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -d "$backup_dir/monitoring" ]]; then
        cp -r "$backup_dir/monitoring" .
        log_info "Monitoring configuration restored"
    else
        log_warning "No monitoring configuration found in backup"
    fi
    
    log_success "Monitoring configuration restored"
}

# Reinstall dependencies
reinstall_dependencies() {
    log_info "Reinstalling dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "package.json" ]]; then
        npm install
        log_success "Node.js dependencies installed"
    fi
    
    # Rebuild Docker images
    if [[ -f "docker-compose.production.yml" ]]; then
        docker-compose -f docker-compose.production.yml build --no-cache
        log_success "Docker images rebuilt"
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "docker-compose.production.yml" ]]; then
        docker-compose -f docker-compose.production.yml up -d
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        sleep 30
        
        # Check service health
        local health_checks=(
            "http://localhost:3000/api/health"
            "http://localhost:8000/health"
        )
        
        for endpoint in "${health_checks[@]}"; do
            if curl -sf "$endpoint" > /dev/null 2>&1; then
                log_success "Health check passed: $endpoint"
            else
                log_warning "Health check failed: $endpoint"
            fi
        done
    fi
    
    log_success "Services started"
}

# Verify restoration
verify_restoration() {
    local backup_dir=$1
    
    log_info "Verifying restoration..."
    
    cd "$PROJECT_ROOT"
    
    # Check if key files exist
    local key_files=(
        "package.json"
        "docker-compose.production.yml"
        "app/page.js"
    )
    
    for file in "${key_files[@]}"; do
        if [[ -f "$file" ]]; then
            log_success "✓ $file exists"
        else
            log_warning "✗ $file missing"
        fi
    done
    
    # Check if services are running
    if [[ -f "docker-compose.production.yml" ]]; then
        local running_services=$(docker-compose -f docker-compose.production.yml ps --services --filter status=running | wc -l)
        log_info "Running services: $running_services"
    fi
    
    # Check database connectivity
    if docker-compose -f docker-compose.production.yml exec -T postgres pg_isready -U barbershop > /dev/null 2>&1; then
        log_success "✓ Database connectivity verified"
    else
        log_warning "✗ Database connectivity failed"
    fi
    
    log_success "Restoration verification completed"
}

# Main restore function
restore_system() {
    local backup_file=$1
    local database_only=${2:-false}
    local application_only=${3:-false}
    local configuration_only=${4:-false}
    local skip_services_stop=${5:-false}
    local dry_run=${6:-false}
    
    log_info "Starting system restoration..."
    log_info "Backup file: $backup_file"
    
    # Validate backup
    validate_backup "$backup_file"
    
    # Extract backup
    local backup_dir
    backup_dir=$(extract_backup "$backup_file")
    
    # Show backup information
    show_backup_info "$backup_dir"
    
    if [[ $dry_run == true ]]; then
        log_info "DRY RUN - Would restore the following components:"
        [[ $database_only == true || ($database_only == false && $application_only == false && $configuration_only == false) ]] && echo "  - Database"
        [[ $application_only == true || ($database_only == false && $application_only == false && $configuration_only == false) ]] && echo "  - Application files"
        [[ $configuration_only == true || ($database_only == false && $application_only == false && $configuration_only == false) ]] && echo "  - Configuration files"
        echo "  - Logs"
        echo "  - Monitoring configuration"
        
        # Cleanup and exit
        rm -rf "$(dirname "$backup_dir")"
        return 0
    fi
    
    # Confirm restoration
    echo ""
    log_warning "This will restore the system from backup and may overwrite existing data."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoration cancelled"
        rm -rf "$(dirname "$backup_dir")"
        return 0
    fi
    
    # Stop services unless skipped
    if [[ $skip_services_stop == false ]]; then
        stop_services
    fi
    
    # Perform restoration based on options
    if [[ $database_only == true ]]; then
        restore_database "$backup_dir"
    elif [[ $application_only == true ]]; then
        restore_application "$backup_dir"
        reinstall_dependencies
    elif [[ $configuration_only == true ]]; then
        restore_configuration "$backup_dir"
    else
        # Full restoration
        restore_database "$backup_dir"
        restore_application "$backup_dir"
        restore_configuration "$backup_dir"
        restore_logs "$backup_dir"
        restore_monitoring "$backup_dir"
        reinstall_dependencies
    fi
    
    # Start services
    if [[ $skip_services_stop == false ]]; then
        start_services
    fi
    
    # Verify restoration
    verify_restoration "$backup_dir"
    
    # Cleanup
    rm -rf "$(dirname "$backup_dir")"
    
    log_success "System restoration completed successfully!"
    
    # Show post-restoration information
    echo ""
    log_info "🎯 Post-Restoration Steps:"
    log_info "1. Verify environment variables in .env.production"
    log_info "2. Check service logs: npm run deploy:logs"
    log_info "3. Run health checks: curl http://localhost/health"
    log_info "4. Test application functionality"
    log_info "5. Start monitoring: npm run monitoring:start"
}

# Parse command line arguments
BACKUP_FILE=""
DATABASE_ONLY=false
APPLICATION_ONLY=false
CONFIGURATION_ONLY=false
SKIP_SERVICES_STOP=false
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --database-only)
            DATABASE_ONLY=true
            shift
            ;;
        --application-only)
            APPLICATION_ONLY=true
            shift
            ;;
        --configuration-only)
            CONFIGURATION_ONLY=true
            shift
            ;;
        --skip-services-stop)
            SKIP_SERVICES_STOP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        *)
            if [[ -z "$BACKUP_FILE" ]]; then
                BACKUP_FILE=$1
            else
                log_error "Unknown option: $1"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# Check if backup file was provided
if [[ -z "$BACKUP_FILE" ]]; then
    log_error "Backup file not specified"
    show_help
    exit 1
fi

# Run restoration
restore_system "$BACKUP_FILE" "$DATABASE_ONLY" "$APPLICATION_ONLY" "$CONFIGURATION_ONLY" "$SKIP_SERVICES_STOP" "$DRY_RUN"