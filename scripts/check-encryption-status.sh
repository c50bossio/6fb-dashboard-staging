#!/bin/bash

# Database Encryption Status Check
# Monitors encryption coverage and key rotation status

set -e

DATABASE_FILE="${DATABASE_FILE:-./agent_system.db}"

echo "=== Database Encryption Status Report ==="
echo "Database: $DATABASE_FILE"
echo "Timestamp: $(date)"
echo

# Check encryption configuration
echo "=== Encryption Configuration ==="
sqlite3 "$DATABASE_FILE" "SELECT table_name, field_name, encryption_type, is_active FROM encryption_config WHERE is_active = 1;"
echo

# Check encryption coverage
echo "=== Encryption Coverage ==="
sqlite3 "$DATABASE_FILE" "SELECT * FROM encryption_integrity_check;"
echo

# Check key rotation status
echo "=== Key Rotation Status ==="
sqlite3 "$DATABASE_FILE" "SELECT key_version, rotation_date, status, notes FROM encryption_key_rotation ORDER BY rotation_date DESC LIMIT 5;"
echo

# Check for unencrypted sensitive data (basic validation)
echo "=== Data Validation ==="
USER_COUNT=$(sqlite3 "$DATABASE_FILE" "SELECT COUNT(*) FROM users WHERE email IS NOT NULL;")
SESSION_COUNT=$(sqlite3 "$DATABASE_FILE" "SELECT COUNT(*) FROM sessions WHERE user_agent IS NOT NULL;" 2>/dev/null || echo "0")
echo "Users with email data: $USER_COUNT"
echo "Sessions with user agent data: $SESSION_COUNT"
echo

echo "=== Encryption Status Check Complete ==="
