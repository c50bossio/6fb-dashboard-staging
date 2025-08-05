#!/bin/bash

# Encrypted Database Backup Script
# Creates encrypted backups of the database with sensitive data

set -e

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/database_backup_$TIMESTAMP.sql.enc"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create SQL dump
echo "Creating database backup..."
sqlite3 ./agent_system.db ".dump" > "/tmp/database_backup_$TIMESTAMP.sql"

# Encrypt backup using the same encryption key
if [[ -n "$DATABASE_ENCRYPTION_KEY" ]]; then
    # Use openssl for backup encryption
    openssl enc -aes-256-cbc -salt -in "/tmp/database_backup_$TIMESTAMP.sql" -out "$BACKUP_FILE" -k "$DATABASE_ENCRYPTION_KEY"
    
    # Remove unencrypted temporary file
    rm "/tmp/database_backup_$TIMESTAMP.sql"
    
    echo "Encrypted backup created: $BACKUP_FILE"
    echo "Backup size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo "ERROR: DATABASE_ENCRYPTION_KEY not found - cannot create encrypted backup"
    exit 1
fi
