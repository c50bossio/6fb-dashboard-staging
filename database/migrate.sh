#!/bin/bash

# Database Migration Runner for 6FB AI Agent System
# Safely executes schema consolidation with full rollback capability

set -euo pipefail  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR/migrations"
LOG_FILE="$SCRIPT_DIR/migration.log"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        INFO)  echo -e "${BLUE}[INFO]${NC} $message" ;;
        WARN)  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        ERROR) echo -e "${RED}[ERROR]${NC} $message" ;;
        SUCCESS) echo -e "${GREEN}[SUCCESS]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Check if Supabase CLI is available
check_supabase() {
    if ! command -v supabase &> /dev/null; then
        log ERROR "Supabase CLI not found. Please install: npm install -g supabase"
        log INFO "Alternative: Use direct psql connection"
        return 1
    fi
    return 0
}

# Get database connection string
get_db_connection() {
    if [[ -f "$SCRIPT_DIR/../.env.local" ]]; then
        # Try to get from .env.local
        local db_url=$(grep "^SUPABASE_DB_URL=" "$SCRIPT_DIR/../.env.local" 2>/dev/null | cut -d '=' -f2- | tr -d '"')
        if [[ -n "$db_url" ]]; then
            echo "$db_url"
            return 0
        fi
    fi
    
    # Default to Supabase local
    if check_supabase; then
        echo "postgresql://postgres:postgres@localhost:54322/postgres"
    else
        log ERROR "Could not determine database connection"
        return 1
    fi
}

# Create database backup
create_backup() {
    local backup_name="backup_before_migration_$(date +%Y%m%d_%H%M%S)"
    local backup_file="$BACKUP_DIR/$backup_name.sql"
    
    log INFO "Creating database backup: $backup_name"
    
    local db_url=$(get_db_connection)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Create backup using pg_dump
    if pg_dump "$db_url" > "$backup_file" 2>/dev/null; then
        log SUCCESS "Backup created: $backup_file"
        echo "$backup_file"
        return 0
    else
        log ERROR "Failed to create backup"
        return 1
    fi
}

# Execute SQL file
execute_sql() {
    local sql_file=$1
    local db_url=$(get_db_connection)
    
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    log INFO "Executing: $(basename "$sql_file")"
    
    if psql "$db_url" -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        log SUCCESS "Successfully executed: $(basename "$sql_file")"
        return 0
    else
        log ERROR "Failed to execute: $(basename "$sql_file")"
        log ERROR "Check $LOG_FILE for details"
        return 1
    fi
}

# Verify migration prerequisites
verify_prerequisites() {
    log INFO "Verifying migration prerequisites..."
    
    # Check if migration files exist
    if [[ ! -f "$MIGRATIONS_DIR/001_consolidate_schema.sql" ]]; then
        log ERROR "Migration file not found: 001_consolidate_schema.sql"
        return 1
    fi
    
    if [[ ! -f "$MIGRATIONS_DIR/001_rollback_consolidate_schema.sql" ]]; then
        log ERROR "Rollback file not found: 001_rollback_consolidate_schema.sql"
        return 1
    fi
    
    # Check database connection
    local db_url=$(get_db_connection)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    if ! psql "$db_url" -c "SELECT 1" &>/dev/null; then
        log ERROR "Cannot connect to database"
        return 1
    fi
    
    log SUCCESS "Prerequisites verified"
    return 0
}

# Create migration log table
setup_migration_logging() {
    local db_url=$(get_db_connection)
    
    local setup_sql="
    CREATE TABLE IF NOT EXISTS migration_log (
        id SERIAL PRIMARY KEY,
        migration_name TEXT NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT NOW(),
        notes TEXT
    );
    "
    
    if echo "$setup_sql" | psql "$db_url" &>/dev/null; then
        log INFO "Migration logging table ready"
        return 0
    else
        log WARN "Could not setup migration logging table"
        return 1
    fi
}

# Run migration
run_migration() {
    log INFO "==================================================="
    log INFO "Starting Schema Consolidation Migration"
    log INFO "==================================================="
    
    # Verify prerequisites
    if ! verify_prerequisites; then
        log ERROR "Prerequisites check failed"
        return 1
    fi
    
    # Setup migration logging
    setup_migration_logging
    
    # Create backup
    local backup_file
    backup_file=$(create_backup)
    if [[ $? -ne 0 ]]; then
        log ERROR "Backup creation failed - aborting migration"
        return 1
    fi
    
    # Execute migration
    if execute_sql "$MIGRATIONS_DIR/001_consolidate_schema.sql"; then
        log SUCCESS "==================================================="
        log SUCCESS "Migration completed successfully!"
        log SUCCESS "==================================================="
        log INFO "Backup available at: $backup_file"
        log INFO "To rollback: $0 rollback"
        return 0
    else
        log ERROR "Migration failed!"
        log ERROR "Database backup available at: $backup_file"
        log ERROR "You can restore using: psql \$DB_URL < $backup_file"
        return 1
    fi
}

# Run rollback
run_rollback() {
    log WARN "==================================================="
    log WARN "Starting Schema Consolidation Rollback"
    log WARN "==================================================="
    
    # Create pre-rollback backup
    local backup_file
    backup_file=$(create_backup)
    if [[ $? -ne 0 ]]; then
        log ERROR "Backup creation failed - aborting rollback"
        return 1
    fi
    
    # Execute rollback
    if execute_sql "$MIGRATIONS_DIR/001_rollback_consolidate_schema.sql"; then
        log SUCCESS "==================================================="
        log SUCCESS "Rollback completed successfully!"
        log SUCCESS "==================================================="
        log INFO "Pre-rollback backup available at: $backup_file"
        return 0
    else
        log ERROR "Rollback failed!"
        log ERROR "Database backup available at: $backup_file"
        return 1
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 {migrate|rollback|status|help}"
    echo ""
    echo "Commands:"
    echo "  migrate   - Run the schema consolidation migration"
    echo "  rollback  - Rollback the schema consolidation"
    echo "  status    - Check migration status"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 migrate    # Run migration"
    echo "  $0 rollback   # Undo migration"
    echo "  $0 status     # Check status"
}

# Check migration status
check_status() {
    log INFO "Checking migration status..."
    
    local db_url=$(get_db_connection)
    if [[ $? -ne 0 ]]; then
        return 1
    fi
    
    # Check if new tables exist
    local new_tables_exist=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_name IN ('profiles_new', 'barbershops_new', 'barbershop_staff_new', 'subscriptions_new')
    " 2>/dev/null | tr -d ' ')
    
    # Check migration log
    local migration_logged=$(psql "$db_url" -t -c "
        SELECT COUNT(*) FROM migration_log 
        WHERE migration_name = '001_consolidate_schema'
    " 2>/dev/null | tr -d ' ' || echo "0")
    
    if [[ "$new_tables_exist" == "4" ]] && [[ "$migration_logged" == "1" ]]; then
        log SUCCESS "Migration is COMPLETED"
        log INFO "New unified tables are active"
    elif [[ "$new_tables_exist" == "0" ]] && [[ "$migration_logged" == "0" ]]; then
        log INFO "Migration is PENDING"
        log INFO "Original schema is active"
    else
        log WARN "Migration is in PARTIAL state"
        log WARN "Manual intervention may be required"
    fi
}

# Main execution
main() {
    case "${1:-}" in
        migrate)
            run_migration
            ;;
        rollback)
            run_rollback
            ;;
        status)
            check_status
            ;;
        help|--help|-h)
            show_usage
            ;;
        "")
            log ERROR "No command specified"
            show_usage
            exit 1
            ;;
        *)
            log ERROR "Unknown command: $1"
            show_usage
            exit 1
            ;;
    esac
}

# Initialize log
echo "Migration started at $(date)" > "$LOG_FILE"

# Run main function
main "$@"