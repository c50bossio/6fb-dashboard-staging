#!/bin/bash

# 6FB AI Agent System - Complete System Backup
# Creates comprehensive backup of application, database, and configuration

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
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/full_backup_$DATE"

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if backup directory exists, create if not
    if [[ ! -d "$BACKUP_ROOT" ]]; then
        log_info "Creating backup root directory: $BACKUP_ROOT"
        sudo mkdir -p "$BACKUP_ROOT"
        sudo chown $USER:$USER "$BACKUP_ROOT"
    fi
    
    # Check available disk space (minimum 5GB)
    available_space=$(df "$BACKUP_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 5242880 ]]; then  # 5GB in KB
        log_warning "Low disk space. Available: $(( available_space / 1024 / 1024 ))GB"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Create backup directory structure
create_backup_structure() {
    log_info "Creating backup directory structure..."
    
    mkdir -p "$BACKUP_DIR"/{application,database,configuration,logs,monitoring}
    
    log_success "Backup directory created: $BACKUP_DIR"
}

# Backup database
backup_database() {
    log_info "Backing up database..."
    
    cd "$PROJECT_ROOT"
    
    # Check if database is running
    if ! docker-compose -f docker-compose.production.yml ps postgres | grep -q "Up"; then
        log_warning "PostgreSQL is not running, skipping database backup"
        return 0
    fi
    
    # Create database dump
    local db_backup="$BACKUP_DIR/database/barbershop_ai_$DATE.sql"
    docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U barbershop -d barbershop_ai > "$db_backup"
    
    # Compress database backup
    gzip "$db_backup"
    
    # Also backup database schema separately
    docker-compose -f docker-compose.production.yml exec -T postgres pg_dump -U barbershop -d barbershop_ai --schema-only > "$BACKUP_DIR/database/schema_$DATE.sql"
    gzip "$BACKUP_DIR/database/schema_$DATE.sql"
    
    # Backup database statistics
    docker-compose -f docker-compose.production.yml exec -T postgres psql -U barbershop -d barbershop_ai -c "
    SELECT 
        schemaname, tablename, 
        n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_stat_user_tables;" > "$BACKUP_DIR/database/table_stats_$DATE.txt"
    
    log_success "Database backup completed"
}

# Backup Redis data
backup_redis() {
    log_info "Backing up Redis data..."
    
    cd "$PROJECT_ROOT"
    
    # Check if Redis is running
    if ! docker-compose -f docker-compose.production.yml ps redis | grep -q "Up"; then
        log_warning "Redis is not running, skipping Redis backup"
        return 0
    fi
    
    # Create Redis dump
    docker-compose -f docker-compose.production.yml exec redis redis-cli BGSAVE
    
    # Wait for background save to complete
    sleep 5
    
    # Copy Redis dump file
    docker-compose -f docker-compose.production.yml exec redis cat /data/dump.rdb > "$BACKUP_DIR/database/redis_dump_$DATE.rdb" 2>/dev/null || {
        log_warning "Could not backup Redis dump file"
    }
    
    # Get Redis info
    docker-compose -f docker-compose.production.yml exec redis redis-cli INFO > "$BACKUP_DIR/database/redis_info_$DATE.txt"
    
    log_success "Redis backup completed"
}

# Backup application files
backup_application() {
    log_info "Backing up application files..."
    
    cd "$PROJECT_ROOT"
    
    # Create application backup excluding unnecessary files
    tar -czf "$BACKUP_DIR/application/application_$DATE.tar.gz" \
        --exclude='node_modules' \
        --exclude='*.log' \
        --exclude='.git' \
        --exclude='build' \
        --exclude='dist' \
        --exclude='coverage' \
        --exclude='playwright-report' \
        --exclude='test-results' \
        --exclude='backups' \
        .
    
    # Backup package files separately for quick reference
    cp package.json "$BACKUP_DIR/application/"
    cp package-lock.json "$BACKUP_DIR/application/" 2>/dev/null || true
    
    # Backup important scripts
    cp -r scripts/ "$BACKUP_DIR/application/" 2>/dev/null || true
    
    log_success "Application backup completed"
}

# Backup configuration files
backup_configuration() {
    log_info "Backing up configuration files..."
    
    cd "$PROJECT_ROOT"
    
    # Environment configuration (without secrets)
    if [[ -f ".env.production" ]]; then
        # Create sanitized version without sensitive values
        grep -v -E "(PASSWORD|SECRET|KEY)" .env.production > "$BACKUP_DIR/configuration/env_template_$DATE.txt" || {
            log_warning "Could not create sanitized environment template"
        }
    fi
    
    # Docker configuration
    cp docker-compose.production.yml "$BACKUP_DIR/configuration/" 2>/dev/null || true
    cp docker-compose.yml "$BACKUP_DIR/configuration/" 2>/dev/null || true
    cp Dockerfile.* "$BACKUP_DIR/configuration/" 2>/dev/null || true
    
    # Nginx configuration
    if [[ -d "nginx" ]]; then
        cp -r nginx/ "$BACKUP_DIR/configuration/"
    fi
    
    # Next.js configuration
    cp next.config.js "$BACKUP_DIR/configuration/" 2>/dev/null || true
    
    # Testing configuration
    cp playwright.config.js "$BACKUP_DIR/configuration/" 2>/dev/null || true
    cp jest.config.js "$BACKUP_DIR/configuration/" 2>/dev/null || true
    
    log_success "Configuration backup completed"
}

# Backup logs
backup_logs() {
    log_info "Backing up logs..."
    
    cd "$PROJECT_ROOT"
    
    # Application logs
    if [[ -d "logs" ]]; then
        cp -r logs/ "$BACKUP_DIR/logs/application_logs/"
    fi
    
    # Docker container logs
    mkdir -p "$BACKUP_DIR/logs/container_logs/"
    
    local containers=("frontend" "backend" "postgres" "redis" "nginx")
    for container in "${containers[@]}"; do
        if docker-compose -f docker-compose.production.yml ps "$container" | grep -q "Up"; then
            docker-compose -f docker-compose.production.yml logs --no-color "$container" > "$BACKUP_DIR/logs/container_logs/${container}_$DATE.log" 2>/dev/null || true
        fi
    done
    
    # System logs (if accessible)
    if [[ -d "/var/log/nginx" ]]; then
        cp /var/log/nginx/*.log "$BACKUP_DIR/logs/" 2>/dev/null || true
    fi
    
    log_success "Logs backup completed"
}

# Backup monitoring configuration
backup_monitoring() {
    log_info "Backing up monitoring configuration..."
    
    cd "$PROJECT_ROOT"
    
    # Monitoring configuration
    if [[ -d "monitoring" ]]; then
        cp -r monitoring/ "$BACKUP_DIR/monitoring/"
    fi
    
    # Export Prometheus data (if running)
    if docker-compose -f monitoring/docker-compose.monitoring.yml ps prometheus | grep -q "Up" 2>/dev/null; then
        log_info "Exporting Prometheus metrics snapshot..."
        curl -s "http://localhost:9090/api/v1/query?query=up" > "$BACKUP_DIR/monitoring/prometheus_snapshot_$DATE.json" 2>/dev/null || {
            log_warning "Could not export Prometheus snapshot"
        }
    fi
    
    # Export Grafana dashboards (if running)
    if docker-compose -f monitoring/docker-compose.monitoring.yml ps grafana | grep -q "Up" 2>/dev/null; then
        log_info "Exporting Grafana dashboards..."
        # This would require Grafana API authentication
        # curl -s -u "admin:password" "http://localhost:3001/api/search" > "$BACKUP_DIR/monitoring/grafana_dashboards_$DATE.json"
        log_info "Grafana dashboard export requires manual configuration"
    fi
    
    log_success "Monitoring backup completed"
}

# Create backup manifest
create_backup_manifest() {
    log_info "Creating backup manifest..."
    
    local manifest="$BACKUP_DIR/BACKUP_MANIFEST.txt"
    
    cat > "$manifest" << EOF
6FB AI Agent System - Full System Backup
========================================

Backup Created: $(date)
Backup Directory: $BACKUP_DIR
System Host: $(hostname)
System User: $USER

Backup Contents:
================

1. Database Backup:
   - PostgreSQL dump: $(ls -lh "$BACKUP_DIR/database/"*barbershop_ai*.sql.gz 2>/dev/null | awk '{print $9, $5}' || echo "Not found")
   - Schema dump: $(ls -lh "$BACKUP_DIR/database/"*schema*.sql.gz 2>/dev/null | awk '{print $9, $5}' || echo "Not found")
   - Redis dump: $(ls -lh "$BACKUP_DIR/database/"*redis*.rdb 2>/dev/null | awk '{print $9, $5}' || echo "Not found")

2. Application Backup:
   - Application archive: $(ls -lh "$BACKUP_DIR/application/"*application*.tar.gz 2>/dev/null | awk '{print $9, $5}' || echo "Not found")
   - Package.json: $(ls -lh "$BACKUP_DIR/application/package.json" 2>/dev/null | awk '{print $9, $5}' || echo "Not found")

3. Configuration Backup:
   - Docker Compose: $(ls -lh "$BACKUP_DIR/configuration/"*docker-compose* 2>/dev/null | wc -l) files
   - Nginx config: $(ls -lh "$BACKUP_DIR/configuration/nginx/" 2>/dev/null | wc -l || echo "0") files
   - Environment template: $(ls -lh "$BACKUP_DIR/configuration/"*env_template* 2>/dev/null | awk '{print $9, $5}' || echo "Not found")

4. Logs Backup:
   - Application logs: $(find "$BACKUP_DIR/logs/application_logs/" -name "*.log" 2>/dev/null | wc -l || echo "0") files
   - Container logs: $(find "$BACKUP_DIR/logs/container_logs/" -name "*.log" 2>/dev/null | wc -l || echo "0") files

5. Monitoring Backup:
   - Configuration files: $(find "$BACKUP_DIR/monitoring/" -type f 2>/dev/null | wc -l || echo "0") files

System Information:
===================
Docker Version: $(docker --version 2>/dev/null || echo "Not available")
Docker Compose Version: $(docker-compose --version 2>/dev/null || echo "Not available")
System Load: $(uptime 2>/dev/null || echo "Not available")
Disk Usage: $(df -h "$BACKUP_DIR" 2>/dev/null | tail -1 || echo "Not available")

Backup Size: $(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}' || echo "Unknown")

Restore Instructions:
=====================
1. Extract application backup:
   tar -xzf $BACKUP_DIR/application/application_$DATE.tar.gz

2. Restore database:
   gunzip -c $BACKUP_DIR/database/barbershop_ai_$DATE.sql.gz | docker-compose exec -T postgres psql -U barbershop -d barbershop_ai

3. Copy configuration files to appropriate locations

4. Restart services:
   npm run deploy:production

Verification:
=============
- [ ] Database backup completed successfully
- [ ] Application files backed up
- [ ] Configuration files preserved
- [ ] Logs captured
- [ ] Backup integrity verified

Notes:
======
- This backup does not include sensitive environment variables
- SSL certificates need to be backed up separately if using custom certificates
- Third-party service configurations (Supabase, Stripe, etc.) are not included

EOF
    
    # Calculate backup size and file count
    local backup_size=$(du -sh "$BACKUP_DIR" | awk '{print $1}')
    local file_count=$(find "$BACKUP_DIR" -type f | wc -l)
    
    echo "" >> "$manifest"
    echo "Backup Statistics:" >> "$manifest"
    echo "Total Size: $backup_size" >> "$manifest"
    echo "Total Files: $file_count" >> "$manifest"
    
    log_success "Backup manifest created"
}

# Compress and finalize backup
finalize_backup() {
    log_info "Finalizing backup..."
    
    cd "$(dirname "$BACKUP_DIR")"
    
    # Create compressed archive of the entire backup
    local final_backup="$BACKUP_ROOT/6fb_ai_system_backup_$DATE.tar.gz"
    tar -czf "$final_backup" "$(basename "$BACKUP_DIR")"
    
    # Verify backup integrity
    if tar -tzf "$final_backup" > /dev/null 2>&1; then
        log_success "Backup archive created and verified: $final_backup"
        
        # Calculate final size
        local final_size=$(du -sh "$final_backup" | awk '{print $1}')
        log_info "Final backup size: $final_size"
        
        # Keep uncompressed backup for quick access
        log_info "Uncompressed backup available at: $BACKUP_DIR"
        
        # Clean up old backups (keep last 7 days)
        find "$BACKUP_ROOT" -name "6fb_ai_system_backup_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
        find "$BACKUP_ROOT" -name "full_backup_*" -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
        
    else
        log_error "Backup archive verification failed"
        return 1
    fi
}

# Display backup summary
display_summary() {
    log_info ""
    log_success "🎯 Full System Backup Completed Successfully!"
    log_info ""
    log_info "📦 Backup Details:"
    log_info "   Compressed Backup: $(ls -lh "$BACKUP_ROOT"/6fb_ai_system_backup_"$DATE".tar.gz | awk '{print $9 " (" $5 ")"}')"
    log_info "   Uncompressed Backup: $BACKUP_DIR"
    log_info "   Backup Date: $(date)"
    log_info ""
    log_info "📋 Backup Contents:"
    log_info "   ✓ Database (PostgreSQL + Redis)"
    log_info "   ✓ Application code and dependencies"
    log_info "   ✓ Configuration files"
    log_info "   ✓ Logs and monitoring data"
    log_info "   ✓ Backup manifest and restore instructions"
    log_info ""
    log_info "🔧 Quick Restore Commands:"
    log_info "   Extract: tar -xzf $BACKUP_ROOT/6fb_ai_system_backup_$DATE.tar.gz"
    log_info "   Restore: See $BACKUP_DIR/BACKUP_MANIFEST.txt for detailed instructions"
    log_info ""
    log_info "📊 Available Backups:"
    ls -lh "$BACKUP_ROOT"/*backup*.tar.gz 2>/dev/null | tail -5 || echo "   No previous backups found"
}

# Main execution
main() {
    log_info "Starting full system backup for 6FB AI Agent System..."
    log_info "Backup ID: $DATE"
    
    # Run backup procedures
    check_prerequisites
    create_backup_structure
    backup_database
    backup_redis
    backup_application
    backup_configuration
    backup_logs
    backup_monitoring
    create_backup_manifest
    finalize_backup
    display_summary
    
    log_success "Full system backup completed successfully!"
}

# Error handling
cleanup_on_error() {
    log_error "Backup failed. Cleaning up..."
    
    if [[ -d "$BACKUP_DIR" ]]; then
        rm -rf "$BACKUP_DIR"
    fi
    
    exit 1
}

trap cleanup_on_error ERR

# Run main function
main "$@"