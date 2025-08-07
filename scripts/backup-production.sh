#!/bin/bash

# Production Backup Script for 6FB AI Agent System
# Comprehensive backup solution with encryption, compression, and cloud storage

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/opt/agent-system/backups"
LOG_FILE="/var/log/agent-system-backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="agent-system-backup-${TIMESTAMP}"

# Load environment variables
source "${PROJECT_ROOT}/.env.production" 2>/dev/null || {
    echo "ERROR: Could not load production environment variables"
    exit 1
}

# Backup configuration
DB_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}-database.sql"
FILES_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}-files.tar.gz"
DOCKER_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}-docker.tar"
CONFIG_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}-configs.tar.gz"
LOGS_BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}-logs.tar.gz"

# Encryption key from environment
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-}"

# S3 configuration
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_REGION="${BACKUP_S3_REGION:-us-east-1}"
AWS_ACCESS_KEY="${BACKUP_S3_ACCESS_KEY:-}"
AWS_SECRET_KEY="${BACKUP_S3_SECRET_KEY:-}"

# Notification configuration
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"
EMAIL_RECIPIENT="${BACKUP_EMAIL_RECIPIENT:-}"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    send_notification "FAILED" "Backup failed: $1"
    exit 1
}

# Success notification
success_notification() {
    log "INFO" "Backup completed successfully"
    send_notification "SUCCESS" "Backup completed successfully: $BACKUP_NAME"
}

# Send notification function
send_notification() {
    local status="$1"
    local message="$2"
    
    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🔐 6FB AI Agent System Backup [$status]: $message\"}" \
            "$SLACK_WEBHOOK" || log "WARN" "Failed to send Slack notification"
    fi
    
    # Email notification (if configured)
    if [[ -n "$EMAIL_RECIPIENT" ]] && command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "6FB AI Agent System Backup [$status]" "$EMAIL_RECIPIENT" || \
            log "WARN" "Failed to send email notification"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Check disk space (need at least 10GB free)
    local available_space=$(df "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 10485760 ]]; then
        error_exit "Insufficient disk space. Need at least 10GB free."
    fi
    
    # Check required tools
    local required_tools=("docker" "pg_dump" "aws" "gpg" "tar" "gzip")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" >/dev/null 2>&1; then
            error_exit "Required tool '$tool' is not installed"
        fi
    done
    
    # Check encryption key
    if [[ -z "$ENCRYPTION_KEY" ]]; then
        error_exit "BACKUP_ENCRYPTION_KEY environment variable is not set"
    fi
    
    log "INFO" "Prerequisites check passed"
}

# Database backup
backup_database() {
    log "INFO" "Starting database backup..."
    
    # Get database connection details
    local db_host=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\).*/\1/p')
    local db_port=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
    local db_pass=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/[^:]*:\([^@]*\).*/\1/p')
    
    # Export password for pg_dump
    export PGPASSWORD="$db_pass"
    
    # Create database backup
    pg_dump -h "$db_host" -p "$db_port" -U "$db_user" -d "$db_name" \
        --verbose --clean --if-exists --create --format=custom \
        --file="$DB_BACKUP_FILE" || error_exit "Database backup failed"
    
    # Compress and encrypt
    gzip "$DB_BACKUP_FILE" || error_exit "Database backup compression failed"
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
        --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
        --passphrase "$ENCRYPTION_KEY" --batch --yes \
        "${DB_BACKUP_FILE}.gz" || error_exit "Database backup encryption failed"
    
    # Remove unencrypted backup
    rm -f "${DB_BACKUP_FILE}.gz"
    
    log "INFO" "Database backup completed: ${DB_BACKUP_FILE}.gz.gpg"
}

# Application files backup
backup_files() {
    log "INFO" "Starting application files backup..."
    
    # Backup application data, configs, and persistent volumes
    tar -czf "$FILES_BACKUP_FILE" \
        -C "$PROJECT_ROOT" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='backups' \
        --exclude='data/postgres' \
        --exclude='data/redis' \
        . || error_exit "Files backup failed"
    
    # Encrypt backup
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
        --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
        --passphrase "$ENCRYPTION_KEY" --batch --yes \
        "$FILES_BACKUP_FILE" || error_exit "Files backup encryption failed"
    
    # Remove unencrypted backup
    rm -f "$FILES_BACKUP_FILE"
    
    log "INFO" "Files backup completed: ${FILES_BACKUP_FILE}.gpg"
}

# Docker images backup
backup_docker_images() {
    log "INFO" "Starting Docker images backup..."
    
    # Get list of running containers
    local images=$(docker ps --format "table {{.Image}}" | tail -n +2 | sort -u)
    
    if [[ -n "$images" ]]; then
        # Save Docker images
        echo "$images" | xargs docker save -o "$DOCKER_BACKUP_FILE" || \
            error_exit "Docker images backup failed"
        
        # Compress and encrypt
        gzip "$DOCKER_BACKUP_FILE" || error_exit "Docker backup compression failed"
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
            --passphrase "$ENCRYPTION_KEY" --batch --yes \
            "${DOCKER_BACKUP_FILE}.gz" || error_exit "Docker backup encryption failed"
        
        # Remove unencrypted backup
        rm -f "${DOCKER_BACKUP_FILE}.gz"
        
        log "INFO" "Docker images backup completed: ${DOCKER_BACKUP_FILE}.gz.gpg"
    else
        log "WARN" "No Docker images found to backup"
    fi
}

# Configuration backup
backup_configs() {
    log "INFO" "Starting configuration backup..."
    
    # Backup configurations (excluding secrets)
    tar -czf "$CONFIG_BACKUP_FILE" \
        -C "$PROJECT_ROOT" \
        configs/ \
        docker-compose.prod.yml \
        infrastructure/ \
        scripts/ \
        .github/ || error_exit "Configuration backup failed"
    
    # Encrypt backup
    gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
        --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
        --passphrase "$ENCRYPTION_KEY" --batch --yes \
        "$CONFIG_BACKUP_FILE" || error_exit "Configuration backup encryption failed"
    
    # Remove unencrypted backup
    rm -f "$CONFIG_BACKUP_FILE"
    
    log "INFO" "Configuration backup completed: ${CONFIG_BACKUP_FILE}.gpg"
}

# Logs backup
backup_logs() {
    log "INFO" "Starting logs backup..."
    
    # Backup logs from the last 7 days
    find /var/log -name "*agent-system*" -mtime -7 -type f | \
        tar -czf "$LOGS_BACKUP_FILE" -T - 2>/dev/null || log "WARN" "Some logs could not be backed up"
    
    # Include Docker logs
    docker logs agent-system-frontend-prod > "${BACKUP_DIR}/frontend-${TIMESTAMP}.log" 2>&1 || log "WARN" "Frontend logs backup failed"
    docker logs agent-system-backend-prod > "${BACKUP_DIR}/backend-${TIMESTAMP}.log" 2>&1 || log "WARN" "Backend logs backup failed"
    
    # Add Docker logs to archive
    tar -czf "${LOGS_BACKUP_FILE}.tmp" \
        "$LOGS_BACKUP_FILE" \
        "${BACKUP_DIR}/frontend-${TIMESTAMP}.log" \
        "${BACKUP_DIR}/backend-${TIMESTAMP}.log" 2>/dev/null || true
    
    mv "${LOGS_BACKUP_FILE}.tmp" "$LOGS_BACKUP_FILE" 2>/dev/null || true
    
    # Cleanup individual log files
    rm -f "${BACKUP_DIR}/frontend-${TIMESTAMP}.log" "${BACKUP_DIR}/backend-${TIMESTAMP}.log"
    
    # Encrypt backup
    if [[ -f "$LOGS_BACKUP_FILE" ]]; then
        gpg --symmetric --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 \
            --s2k-digest-algo SHA512 --s2k-count 65536 --force-mdc \
            --passphrase "$ENCRYPTION_KEY" --batch --yes \
            "$LOGS_BACKUP_FILE" || error_exit "Logs backup encryption failed"
        
        # Remove unencrypted backup
        rm -f "$LOGS_BACKUP_FILE"
        
        log "INFO" "Logs backup completed: ${LOGS_BACKUP_FILE}.gpg"
    fi
}

# Upload to cloud storage
upload_to_cloud() {
    if [[ -z "$S3_BUCKET" ]]; then
        log "WARN" "S3_BUCKET not configured, skipping cloud upload"
        return 0
    fi
    
    log "INFO" "Starting cloud upload to S3..."
    
    # Configure AWS CLI
    export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY"
    export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_KEY"
    export AWS_DEFAULT_REGION="$S3_REGION"
    
    # Upload all backup files
    for backup_file in "${BACKUP_DIR}/${BACKUP_NAME}"*.gpg; do
        if [[ -f "$backup_file" ]]; then
            local filename=$(basename "$backup_file")
            aws s3 cp "$backup_file" "s3://${S3_BUCKET}/backups/${filename}" \
                --storage-class STANDARD_IA || error_exit "Failed to upload $filename to S3"
            log "INFO" "Uploaded $filename to S3"
        fi
    done
    
    log "INFO" "Cloud upload completed"
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups..."
    
    # Keep local backups for 7 days
    find "$BACKUP_DIR" -name "agent-system-backup-*" -mtime +7 -delete || log "WARN" "Failed to delete some old local backups"
    
    # Keep S3 backups for 30 days (if S3 is configured)
    if [[ -n "$S3_BUCKET" ]]; then
        local cutoff_date=$(date -d '30 days ago' '+%Y%m%d')
        aws s3 ls "s3://${S3_BUCKET}/backups/" | while read -r line; do
            local file_date=$(echo "$line" | awk '{print $4}' | sed -n 's/agent-system-backup-\([0-9]\{8\}\).*/\1/p')
            if [[ -n "$file_date" && "$file_date" < "$cutoff_date" ]]; then
                local filename=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://${S3_BUCKET}/backups/${filename}" || log "WARN" "Failed to delete old S3 backup: $filename"
            fi
        done
    fi
    
    log "INFO" "Cleanup completed"
}

# Generate backup report
generate_report() {
    local report_file="${BACKUP_DIR}/${BACKUP_NAME}-report.txt"
    
    cat > "$report_file" << EOF
6FB AI Agent System Backup Report
=================================

Backup Name: $BACKUP_NAME
Timestamp: $(date)
Status: SUCCESS

Backup Components:
------------------
Database: ${DB_BACKUP_FILE}.gz.gpg ($(du -h "${DB_BACKUP_FILE}.gz.gpg" 2>/dev/null | cut -f1 || echo "N/A"))
Files: ${FILES_BACKUP_FILE}.gpg ($(du -h "${FILES_BACKUP_FILE}.gpg" 2>/dev/null | cut -f1 || echo "N/A"))
Docker Images: ${DOCKER_BACKUP_FILE}.gz.gpg ($(du -h "${DOCKER_BACKUP_FILE}.gz.gpg" 2>/dev/null | cut -f1 || echo "N/A"))
Configurations: ${CONFIG_BACKUP_FILE}.gpg ($(du -h "${CONFIG_BACKUP_FILE}.gpg" 2>/dev/null | cut -f1 || echo "N/A"))
Logs: ${LOGS_BACKUP_FILE}.gpg ($(du -h "${LOGS_BACKUP_FILE}.gpg" 2>/dev/null | cut -f1 || echo "N/A"))

Total Backup Size: $(du -sh "${BACKUP_DIR}/${BACKUP_NAME}"* 2>/dev/null | awk '{sum += $1} END {print sum "B"}' || echo "N/A")

Cloud Storage: $([ -n "$S3_BUCKET" ] && echo "Uploaded to s3://$S3_BUCKET/backups/" || echo "Not configured")

Recovery Instructions:
---------------------
1. Decrypt files: gpg --decrypt --passphrase [KEY] [FILE].gpg > [FILE]
2. Restore database: pg_restore -h [HOST] -U [USER] -d [DB] [DB_BACKUP_FILE]
3. Extract files: tar -xzf [FILES_BACKUP_FILE] -C [DESTINATION]
4. Load Docker images: docker load -i [DOCKER_BACKUP_FILE]

For detailed recovery procedures, see: /docs/disaster-recovery.md
EOF

    log "INFO" "Backup report generated: $report_file"
}

# Main execution
main() {
    log "INFO" "Starting 6FB AI Agent System backup: $BACKUP_NAME"
    
    # Trap for cleanup on exit
    trap 'log "ERROR" "Backup interrupted"; exit 1' INT TERM
    
    check_prerequisites
    backup_database
    backup_files
    backup_docker_images
    backup_configs
    backup_logs
    upload_to_cloud
    cleanup_old_backups
    generate_report
    
    success_notification
    
    log "INFO" "Backup completed successfully: $BACKUP_NAME"
    log "INFO" "Total backup size: $(du -sh "${BACKUP_DIR}/${BACKUP_NAME}"* | awk '{sum += $1} END {print sum}')"
}

# Execute main function
main "$@"