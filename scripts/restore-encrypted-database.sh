#!/bin/bash

# Encrypted Database Restore Script
# Restores from encrypted database backups

set -e

if [[ -z "$1" ]]; then
    echo "Usage: $0 <encrypted_backup_file>"
    exit 1
fi

BACKUP_FILE="$1"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [[ -z "$DATABASE_ENCRYPTION_KEY" ]]; then
    echo "ERROR: DATABASE_ENCRYPTION_KEY not found - cannot decrypt backup"
    exit 1
fi

# Decrypt backup
echo "Decrypting database backup..."
openssl enc -aes-256-cbc -d -salt -in "$BACKUP_FILE" -out "/tmp/database_restore_$TIMESTAMP.sql" -k "$DATABASE_ENCRYPTION_KEY"

# Create backup of current database
if [[ -f "./agent_system.db" ]]; then
    cp "./agent_system.db" "./agent_system.db.backup_$TIMESTAMP"
    echo "Current database backed up to: ./agent_system.db.backup_$TIMESTAMP"
fi

# Restore database
echo "Restoring database..."
sqlite3 "./agent_system.db" < "/tmp/database_restore_$TIMESTAMP.sql"

# Clean up temporary file
rm "/tmp/database_restore_$TIMESTAMP.sql"

echo "Database restored successfully from: $BACKUP_FILE"
