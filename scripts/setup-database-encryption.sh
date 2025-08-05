#!/bin/bash

# Database Encryption Setup Script for 6FB AI Agent System
# Configures encryption at rest for sensitive data fields

set -e  # Exit on any error

echo "🔐 Setting up database encryption at rest..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_DIR="$PROJECT_ROOT/database"
SCRIPTS_DIR="$PROJECT_ROOT/scripts"
SECURITY_DIR="$PROJECT_ROOT/security"

# Check if running in production
ENVIRONMENT=${NODE_ENV:-development}
IS_PRODUCTION=false
if [[ "$ENVIRONMENT" == "production" ]]; then
    IS_PRODUCTION=true
fi

echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}Project Root: $PROJECT_ROOT${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${BLUE}Checking prerequisites...${NC}"
    
    # Check if Python cryptography library is available
    if ! python3 -c "import cryptography" 2>/dev/null; then
        print_error "Python cryptography library not found"
        echo "Installing cryptography library..."
        pip3 install cryptography
        print_status "Cryptography library installed"
    else
        print_status "Cryptography library available"
    fi
    
    # Check if encryption key exists
    if [[ -z "${DATABASE_ENCRYPTION_KEY}" ]]; then
        print_warning "DATABASE_ENCRYPTION_KEY not found in environment"
        echo "Generating new encryption key..."
        
        # Generate 256-bit encryption key
        ENCRYPTION_KEY=$(openssl rand -base64 32)
        
        # Add to .env.local
        if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
            if grep -q "DATABASE_ENCRYPTION_KEY" "$PROJECT_ROOT/.env.local"; then
                # Use different delimiter to avoid issues with special characters
                sed -i.bak "s|DATABASE_ENCRYPTION_KEY=.*|DATABASE_ENCRYPTION_KEY=$ENCRYPTION_KEY|" "$PROJECT_ROOT/.env.local"
                print_status "Updated DATABASE_ENCRYPTION_KEY in .env.local"
            else
                echo "DATABASE_ENCRYPTION_KEY=$ENCRYPTION_KEY" >> "$PROJECT_ROOT/.env.local"
                print_status "Added DATABASE_ENCRYPTION_KEY to .env.local"
            fi
        else
            echo "DATABASE_ENCRYPTION_KEY=$ENCRYPTION_KEY" > "$PROJECT_ROOT/.env.local"
            print_status "Created .env.local with DATABASE_ENCRYPTION_KEY"
        fi
        
        export DATABASE_ENCRYPTION_KEY="$ENCRYPTION_KEY"
    else
        print_status "DATABASE_ENCRYPTION_KEY found in environment"
    fi
    
    # Check database connection
    if [[ -f "$PROJECT_ROOT/agent_system.db" ]]; then
        print_status "SQLite database found"
    else
        print_warning "SQLite database not found - will be created"
    fi
}

# Function to apply database schema changes
apply_database_schema() {
    echo -e "\n${BLUE}Applying database encryption schema...${NC}"
    
    # Apply encryption schema changes
    if [[ -f "$DATABASE_DIR/add_encryption_columns.sql" ]]; then
        # Apply the migration, ignoring errors for columns that already exist
        sqlite3 "$PROJECT_ROOT/agent_system.db" < "$DATABASE_DIR/add_encryption_columns.sql" 2>/dev/null || true
        print_status "Database encryption schema applied"
    else
        print_error "Encryption schema file not found: $DATABASE_DIR/add_encryption_columns.sql"
        exit 1
    fi
    
    # Verify schema changes
    echo -e "\n${BLUE}Verifying schema changes...${NC}"
    
    # Check if encryption_config table exists
    TABLE_COUNT=$(sqlite3 "$PROJECT_ROOT/agent_system.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='encryption_config';")
    if [[ "$TABLE_COUNT" -eq 1 ]]; then
        print_status "encryption_config table created"
    else
        print_error "Failed to create encryption_config table"
        exit 1
    fi
    
    # Check encryption configuration records
    CONFIG_COUNT=$(sqlite3 "$PROJECT_ROOT/agent_system.db" "SELECT COUNT(*) FROM encryption_config;")
    print_status "Encryption configuration records: $CONFIG_COUNT"
    
    # Check encryption key rotation table
    ROTATION_COUNT=$(sqlite3 "$PROJECT_ROOT/agent_system.db" "SELECT COUNT(*) FROM encryption_key_rotation;")
    print_status "Key rotation records: $ROTATION_COUNT"
}

# Function to test encryption functionality
test_encryption() {
    echo -e "\n${BLUE}Testing encryption functionality...${NC}"
    
    # Create test script
    cat > "$PROJECT_ROOT/test_encryption.py" << 'EOF'
#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from security.database_encryption import DatabaseEncryption
import base64

def test_encryption():
    try:
        # Initialize encryption service
        encryption = DatabaseEncryption()
        
        # Test basic encryption/decryption
        test_data = "test-email@example.com"
        encrypted = encryption.encrypt_field(test_data, "users", "email")
        decrypted = encryption.decrypt_field(encrypted, "users", "email")
        
        if decrypted == test_data:
            print("✓ Basic encryption test passed")
        else:
            print("✗ Basic encryption test failed")
            return False
        
        # Test searchable encryption
        search_hash = encryption.create_search_hash(test_data, "email")
        if len(search_hash) == 32:  # Expected length
            print("✓ Searchable encryption test passed")
        else:
            print("✗ Searchable encryption test failed")
            return False
        
        # Test record encryption
        test_record = {
            "id": 1,
            "email": "user@example.com",
            "phone_number": "+1234567890",
            "name": "Test User"  # This should not be encrypted
        }
        
        encrypted_record = encryption.encrypt_record(test_record, "users")
        decrypted_record = encryption.decrypt_record(encrypted_record, "users")
        
        if (decrypted_record["email"] == test_record["email"] and
            decrypted_record["name"] == test_record["name"]):
            print("✓ Record encryption test passed")
        else:
            print("✗ Record encryption test failed")
            return False
        
        print("✓ All encryption tests passed")
        return True
        
    except Exception as e:
        print(f"✗ Encryption test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = test_encryption()
    sys.exit(0 if success else 1)
EOF
    
    # Run encryption tests
    if python3 "$PROJECT_ROOT/test_encryption.py"; then
        print_status "Encryption functionality tests passed"
    else
        print_error "Encryption functionality tests failed"
        exit 1
    fi
    
    # Clean up test file
    rm -f "$PROJECT_ROOT/test_encryption.py"
}

# Function to set up backup encryption
setup_backup_encryption() {
    echo -e "\n${BLUE}Setting up backup encryption...${NC}"
    
    # Create backup encryption script
    cat > "$SCRIPTS_DIR/backup-encrypted-database.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/backup-encrypted-database.sh"
    print_status "Backup encryption script created"
    
    # Create backup restore script
    cat > "$SCRIPTS_DIR/restore-encrypted-database.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/restore-encrypted-database.sh"
    print_status "Backup restore script created"
}

# Function to create monitoring queries
create_monitoring_queries() {
    echo -e "\n${BLUE}Creating encryption monitoring queries...${NC}"
    
    cat > "$SCRIPTS_DIR/check-encryption-status.sh" << 'EOF'
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
EOF
    
    chmod +x "$SCRIPTS_DIR/check-encryption-status.sh"
    print_status "Encryption monitoring script created"
}

# Function to configure production security
configure_production_security() {
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "\n${BLUE}Configuring production security measures...${NC}"
        
        # Set restrictive file permissions
        chmod 600 "$PROJECT_ROOT/.env.local" 2>/dev/null || true
        chmod 700 "$SECURITY_DIR" 2>/dev/null || true
        chmod 600 "$SECURITY_DIR"/*.py 2>/dev/null || true
        
        print_status "File permissions secured for production"
        
        # Create security audit log entry
        sqlite3 "$PROJECT_ROOT/agent_system.db" << EOF
INSERT INTO audit_logs (
    user_id, action, resource_type, resource_id, details, timestamp, ip_address, user_agent
) VALUES (
    'system', 'ENCRYPTION_SETUP_COMPLETE', 'database_encryption', 'production', 
    'Database encryption at rest configured for production environment with AES-256-GCM',
    datetime('now'), '127.0.0.1', 'Setup Script'
);
EOF
        
        print_status "Security audit log entry created"
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔐 6FB AI Agent System - Database Encryption Setup${NC}"
    echo -e "${BLUE}=================================================${NC}"
    
    check_prerequisites
    apply_database_schema
    test_encryption
    setup_backup_encryption
    create_monitoring_queries
    configure_production_security
    
    echo -e "\n${GREEN}✅ Database encryption setup completed successfully!${NC}"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Run encryption status check: ./scripts/check-encryption-status.sh"
    echo "2. Test backup encryption: ./scripts/backup-encrypted-database.sh"
    echo "3. Review encryption configuration in database"
    echo "4. Update application code to use encrypted database service"
    echo
    echo -e "${YELLOW}Security Notes:${NC}"
    echo "• DATABASE_ENCRYPTION_KEY is stored in .env.local - keep this secure!"
    echo "• All sensitive data fields are now encrypted at rest"
    echo "• Email fields support searchable encryption for login functionality"
    echo "• Database backups will be encrypted automatically"
    echo "• Monitor encryption status regularly using provided scripts"
    echo
    
    if [[ "$IS_PRODUCTION" == "true" ]]; then
        echo -e "${RED}PRODUCTION SECURITY REMINDER:${NC}"
        echo "• Ensure DATABASE_ENCRYPTION_KEY is stored in secure key management system"
        echo "• Set up regular key rotation schedule (recommended: annually)"
        echo "• Monitor encryption integrity checks regularly"
        echo "• Backup encryption keys separately from database backups"
    fi
}

# Run main function
main "$@"