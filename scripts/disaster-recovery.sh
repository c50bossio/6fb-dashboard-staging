#!/bin/bash

# Disaster Recovery Script for 6FB AI Agent System
# Comprehensive disaster recovery and restoration procedures

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
RECOVERY_DIR="/opt/agent-system/recovery"
LOG_FILE="/var/log/agent-system-recovery.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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
    exit 1
}

# Usage information
usage() {
    cat << EOF
6FB AI Agent System Disaster Recovery Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    backup-list             List available backups
    restore-full           Full system restore from backup
    restore-database       Restore database only
    restore-files          Restore application files only
    restore-configs        Restore configurations only
    health-check           Check system health after recovery
    rollback               Rollback to previous state
    
Options:
    -b, --backup NAME      Backup name to restore from
    -s, --source TYPE      Source type (local, s3)
    -e, --encryption-key   Encryption key for backup decryption
    -y, --yes             Skip confirmation prompts
    -h, --help            Show this help message

Examples:
    $0 backup-list
    $0 restore-full --backup agent-system-backup-20240101_120000
    $0 restore-database --backup agent-system-backup-20240101_120000 --source s3
    $0 health-check

EOF
}

# Parse command line arguments
parse_args() {
    COMMAND=""
    BACKUP_NAME=""
    SOURCE_TYPE="local"
    ENCRYPTION_KEY=""
    SKIP_CONFIRMATION=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            backup-list|restore-full|restore-database|restore-files|restore-configs|health-check|rollback)
                COMMAND="$1"
                shift
                ;;
            -b|--backup)
                BACKUP_NAME="$2"
                shift 2
                ;;
            -s|--source)
                SOURCE_TYPE="$2"
                shift 2
                ;;
            -e|--encryption-key)
                ENCRYPTION_KEY="$2"
                shift 2
                ;;
            -y|--yes)
                SKIP_CONFIRMATION=true
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
    
    if [[ -z "$COMMAND" ]]; then
        error "No command specified"
        usage
        exit 1
    fi
}

# Load environment variables
load_environment() {
    info "Loading environment configuration..."
    
    # Try to load production environment
    if [[ -f "${PROJECT_ROOT}/.env.production" ]]; then
        source "${PROJECT_ROOT}/.env.production"
        info "Loaded production environment"
    else
        warn "Production environment file not found, using defaults"
    fi
    
    # Set encryption key from environment if not provided
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"
    fi
    
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        error_exit "Encryption key not provided and BACKUP_ENCRYPTION_KEY not set"
    fi
}

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    mkdir -p "$RECOVERY_DIR"
    
    local required_tools=("docker" "pg_restore" "gpg" "tar" "gzip" "aws")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    success "Prerequisites check passed"
}

# List available backups
list_backups() {
    info "Listing available backups..."
    
    echo -e "\n${BLUE}Local Backups:${NC}"
    echo "=============="
    if ls /opt/agent-system/backups/agent-system-backup-* >/dev/null 2>&1; then
        for backup in /opt/agent-system/backups/agent-system-backup-*; do
            local backup_name=$(basename "$backup" | sed 's/\(.*\)\-[^-]*\.gpg$/\1/')
            local backup_date=$(echo "$backup_name" | sed 's/agent-system-backup-\(.*\)/\1/')
            local formatted_date=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$backup_date")
            local size=$(du -sh "$backup"* 2>/dev/null | head -1 | cut -f1 || echo "Unknown")
            printf "  %-40s %s (%s)\n" "$backup_name" "$formatted_date" "$size"
        done
    else
        echo "  No local backups found"
    fi
    
    if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
        echo -e "\n${BLUE}S3 Backups:${NC}"
        echo "==========="
        aws s3 ls "s3://${BACKUP_S3_BUCKET}/backups/" | grep "agent-system-backup-" | while read -r line; do
            local filename=$(echo "$line" | awk '{print $4}')
            local backup_name=$(echo "$filename" | sed 's/\(.*\)\-[^-]*\.gpg$/\1/')
            local backup_date=$(echo "$backup_name" | sed 's/agent-system-backup-\(.*\)/\1/')
            local formatted_date=$(date -d "${backup_date:0:8} ${backup_date:9:2}:${backup_date:11:2}:${backup_date:13:2}" '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "$backup_date")
            local size=$(echo "$line" | awk '{print $3}')
            printf "  %-40s %s (%s bytes)\n" "$backup_name" "$formatted_date" "$size"
        done
    fi
    
    echo ""
}

# Download backup from S3
download_from_s3() {
    local backup_name="$1"
    info "Downloading backup from S3: $backup_name"
    
    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY}"
    export AWS_DEFAULT_REGION="${BACKUP_S3_REGION:-us-east-1}"
    
    # Download all backup components
    local components=("database.sql.gz.gpg" "files.tar.gz.gpg" "docker.tar.gz.gpg" "configs.tar.gz.gpg" "logs.tar.gz.gpg")
    
    for component in "${components[@]}"; do
        local s3_key="backups/${backup_name}-${component}"
        local local_file="${RECOVERY_DIR}/${backup_name}-${component}"
        
        if aws s3 ls "s3://${BACKUP_S3_BUCKET}/${s3_key}" >/dev/null 2>&1; then
            aws s3 cp "s3://${BACKUP_S3_BUCKET}/${s3_key}" "$local_file" || warn "Failed to download $component"
            info "Downloaded: $component"
        else
            warn "Component not found in S3: $component"
        fi
    done
    
    success "S3 download completed"
}

# Decrypt backup file
decrypt_backup() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.gpg}"
    
    info "Decrypting: $(basename "$encrypted_file")"
    
    gpg --quiet --batch --yes --decrypt --passphrase "$ENCRYPTION_KEY" \
        --output "$decrypted_file" "$encrypted_file" || error_exit "Failed to decrypt $encrypted_file"
    
    success "Decrypted: $(basename "$decrypted_file")"
    echo "$decrypted_file"
}

# Stop application services
stop_services() {
    info "Stopping application services..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "docker-compose.prod.yml" ]]; then
        docker-compose -f docker-compose.prod.yml down || warn "Failed to stop some services"
    fi
    
    success "Services stopped"
}

# Start application services
start_services() {
    info "Starting application services..."
    
    cd "$PROJECT_ROOT"
    
    if [[ -f "docker-compose.prod.yml" ]]; then
        docker-compose -f docker-compose.prod.yml up -d || error_exit "Failed to start services"
    fi
    
    success "Services started"
}

# Restore database
restore_database() {
    local backup_name="$1"
    local db_backup_file
    
    info "Restoring database from backup: $backup_name"
    
    # Get database backup file
    if [[ "$SOURCE_TYPE" == "s3" ]]; then
        download_from_s3 "$backup_name"
        db_backup_file="${RECOVERY_DIR}/${backup_name}-database.sql.gz.gpg"
    else
        db_backup_file="/opt/agent-system/backups/${backup_name}-database.sql.gz.gpg"
    fi
    
    if [[ ! -f "$db_backup_file" ]]; then
        error_exit "Database backup file not found: $db_backup_file"
    fi
    
    # Decrypt and decompress
    local decrypted_file=$(decrypt_backup "$db_backup_file")
    local decompressed_file="${decrypted_file%.gz}"
    
    gunzip "$decrypted_file" || error_exit "Failed to decompress database backup"
    
    # Parse database connection details
    local db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    local db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
    local db_pass=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/[^:]*:\([^@]*\).*/\1/p')
    
    # Set password for PostgreSQL
    export PGPASSWORD="$db_pass"
    
    # Drop and recreate database (if needed)
    if [[ "$SKIP_CONFIRMATION" == false ]]; then
        warn "This will drop and recreate the database. All current data will be lost!"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Database restore cancelled"
        fi
    fi
    
    # Restore database
    pg_restore -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
        --clean --if-exists --create --verbose \
        "$decompressed_file" || error_exit "Database restore failed"
    
    # Cleanup
    rm -f "$decrypted_file" "$decompressed_file"
    
    success "Database restore completed"
}

# Restore application files
restore_files() {
    local backup_name="$1"
    local files_backup_file
    
    info "Restoring application files from backup: $backup_name"
    
    # Get files backup file
    if [[ "$SOURCE_TYPE" == "s3" ]]; then
        download_from_s3 "$backup_name"
        files_backup_file="${RECOVERY_DIR}/${backup_name}-files.tar.gz.gpg"
    else
        files_backup_file="/opt/agent-system/backups/${backup_name}-files.tar.gz.gpg"
    fi
    
    if [[ ! -f "$files_backup_file" ]]; then
        error_exit "Files backup file not found: $files_backup_file"
    fi
    
    # Create backup of current files
    local current_backup="${RECOVERY_DIR}/current-files-backup-${TIMESTAMP}.tar.gz"
    tar -czf "$current_backup" -C "$PROJECT_ROOT" . || warn "Failed to backup current files"
    
    # Decrypt files backup
    local decrypted_file=$(decrypt_backup "$files_backup_file")
    
    # Extract files
    tar -xzf "$decrypted_file" -C "$PROJECT_ROOT" || error_exit "Failed to extract files backup"
    
    # Cleanup
    rm -f "$decrypted_file"
    
    success "Application files restore completed"
}

# Restore configurations
restore_configs() {
    local backup_name="$1"
    local configs_backup_file
    
    info "Restoring configurations from backup: $backup_name"
    
    # Get configs backup file
    if [[ "$SOURCE_TYPE" == "s3" ]]; then
        download_from_s3 "$backup_name"
        configs_backup_file="${RECOVERY_DIR}/${backup_name}-configs.tar.gz.gpg"
    else
        configs_backup_file="/opt/agent-system/backups/${backup_name}-configs.tar.gz.gpg"
    fi
    
    if [[ ! -f "$configs_backup_file" ]]; then
        error_exit "Configs backup file not found: $configs_backup_file"
    fi
    
    # Decrypt configs backup
    local decrypted_file=$(decrypt_backup "$configs_backup_file")
    
    # Extract configs
    tar -xzf "$decrypted_file" -C "$PROJECT_ROOT" || error_exit "Failed to extract configs backup"
    
    # Cleanup
    rm -f "$decrypted_file"
    
    success "Configurations restore completed"
}

# Restore Docker images
restore_docker_images() {
    local backup_name="$1"
    local docker_backup_file
    
    info "Restoring Docker images from backup: $backup_name"
    
    # Get Docker backup file
    if [[ "$SOURCE_TYPE" == "s3" ]]; then
        download_from_s3 "$backup_name"
        docker_backup_file="${RECOVERY_DIR}/${backup_name}-docker.tar.gz.gpg"
    else
        docker_backup_file="/opt/agent-system/backups/${backup_name}-docker.tar.gz.gpg"
    fi
    
    if [[ ! -f "$docker_backup_file" ]]; then
        warn "Docker backup file not found: $docker_backup_file"
        return 0
    fi
    
    # Decrypt and decompress
    local decrypted_file=$(decrypt_backup "$docker_backup_file")
    local decompressed_file="${decrypted_file%.gz}"
    
    gunzip "$decrypted_file" || error_exit "Failed to decompress Docker backup"
    
    # Load Docker images
    docker load -i "$decompressed_file" || error_exit "Failed to load Docker images"
    
    # Cleanup
    rm -f "$decrypted_file" "$decompressed_file"
    
    success "Docker images restore completed"
}

# Full system restore
restore_full() {
    local backup_name="$1"
    
    info "Starting full system restore from backup: $backup_name"
    
    if [[ "$SKIP_CONFIRMATION" == false ]]; then
        warn "This will restore the entire system from backup. Current data will be overwritten!"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Full restore cancelled"
        fi
    fi
    
    # Stop services
    stop_services
    
    # Restore components
    restore_database "$backup_name"
    restore_files "$backup_name"
    restore_configs "$backup_name"
    restore_docker_images "$backup_name"
    
    # Start services
    start_services
    
    # Wait for services to be ready
    info "Waiting for services to start..."
    sleep 30
    
    success "Full system restore completed"
    
    # Run health check
    health_check
}

# System health check
health_check() {
    info "Running system health check..."
    
    local health_status=0
    
    # Check if containers are running
    info "Checking container status..."
    if docker ps | grep -q "agent-system"; then
        success "✓ Containers are running"
    else
        error "✗ Containers are not running"
        health_status=1
    fi
    
    # Check database connectivity
    info "Checking database connectivity..."
    if docker exec agent-system-backend-prod python -c "import psycopg2; conn = psycopg2.connect('$DATABASE_URL'); conn.close()" 2>/dev/null; then
        success "✓ Database is accessible"
    else
        error "✗ Database is not accessible"
        health_status=1
    fi
    
    # Check Redis connectivity
    info "Checking Redis connectivity..."
    if docker exec agent-system-redis-prod redis-cli ping | grep -q "PONG"; then
        success "✓ Redis is accessible"
    else
        error "✗ Redis is not accessible"
        health_status=1
    fi
    
    # Check application endpoints
    info "Checking application endpoints..."
    if curl -sf http://localhost:9999/api/health >/dev/null 2>&1; then
        success "✓ Frontend health check passed"
    else
        error "✗ Frontend health check failed"
        health_status=1
    fi
    
    if curl -sf http://localhost:8001/health >/dev/null 2>&1; then
        success "✓ Backend health check passed"
    else
        error "✗ Backend health check failed"
        health_status=1
    fi
    
    # Overall status
    if [[ $health_status -eq 0 ]]; then
        success "🎉 All health checks passed!"
    else
        error "❌ Some health checks failed. Check logs for details."
    fi
    
    return $health_status
}

# Main execution
main() {
    parse_args "$@"
    load_environment
    check_prerequisites
    
    case "$COMMAND" in
        backup-list)
            list_backups
            ;;
        restore-full)
            [[ -z "$BACKUP_NAME" ]] && error_exit "Backup name required for full restore"
            restore_full "$BACKUP_NAME"
            ;;
        restore-database)
            [[ -z "$BACKUP_NAME" ]] && error_exit "Backup name required for database restore"
            restore_database "$BACKUP_NAME"
            ;;
        restore-files)
            [[ -z "$BACKUP_NAME" ]] && error_exit "Backup name required for files restore"
            restore_files "$BACKUP_NAME"
            ;;
        restore-configs)
            [[ -z "$BACKUP_NAME" ]] && error_exit "Backup name required for configs restore"
            restore_configs "$BACKUP_NAME"
            ;;
        health-check)
            health_check
            ;;
        rollback)
            warn "Rollback functionality coming soon"
            ;;
        *)
            error "Unknown command: $COMMAND"
            usage
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"