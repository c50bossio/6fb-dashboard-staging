#!/bin/bash
# ===============================================
# 6FB AI Agent System - Critical Cleanup Script
# ===============================================
# This script removes backup, disabled, and redundant files
# Version: 1.0.0
# Date: 2025-08-30

set -e  # Exit on any error

echo "🧹 Starting critical cleanup of 6FB AI Agent System..."
echo "==============================================="

# Create backup of current state before cleanup
BACKUP_DIR="./cleanup-backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup at: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# Counter for tracking cleanup
REMOVED_COUNT=0

# Function to safely remove file/directory with backup
safe_remove() {
    local file="$1"
    local reason="$2"
    
    if [ -e "$file" ]; then
        echo "🗑️  Removing $file ($reason)"
        
        # Create directory structure in backup
        local backup_path="$BACKUP_DIR/$(dirname "$file")"
        mkdir -p "$backup_path"
        
        # Move to backup (don't just delete)
        mv "$file" "$BACKUP_DIR/$file" 2>/dev/null || {
            cp -r "$file" "$BACKUP_DIR/$file" 2>/dev/null
            rm -rf "$file"
        }
        
        ((REMOVED_COUNT++))
    else
        echo "⚠️  File not found: $file"
    fi
}

echo ""
echo "🔍 Phase 1: Removing backup and disabled files..."
echo "==============================================="

# Remove explicit backup files
safe_remove "components/ui/Button.js.backup" "Backup file"
safe_remove "components/ui/dialog.js.backup" "Backup file"  
safe_remove "components/ui/tabs.js.backup" "Backup file"
safe_remove "components/settings/page.js.backup" "Backup file"
safe_remove "app/login/page.js.backup" "Backup file"
safe_remove "app/auth/callback/route.js.backup" "Backup file"
safe_remove "_app.js.backup" "Backup file"
safe_remove "next.config.mjs.backup" "Backup file"

# Remove .bak files
safe_remove "app/api/admin/check-subscription/route.js.bak" "BAK file"
safe_remove "app/api/admin/tenants/route.js.bak" "BAK file" 
safe_remove "app/api/admin/users/route.js.bak" "BAK file"

# Remove disabled files
find . -name "*.disabled" -type f | while read file; do
    safe_remove "$file" "Disabled file"
done

# Remove .save files
safe_remove "deploy-customer-management-complete.sh.save" "Save file"

echo ""
echo "🔍 Phase 2: Removing redundant schema files..."
echo "==============================================="

# Keep only MASTER_SCHEMA.sql, remove competing schemas
safe_remove "database/complete-schema.sql" "Redundant - consolidated into MASTER_SCHEMA.sql"
safe_remove "database/supabase-schema.sql" "Redundant - consolidated into MASTER_SCHEMA.sql" 
safe_remove "database/init.sql" "Redundant - consolidated into MASTER_SCHEMA.sql"
safe_remove "database/postgresql_init.sql" "Redundant - consolidated into MASTER_SCHEMA.sql"

echo ""
echo "🔍 Phase 3: Removing redundant backend implementations..."
echo "==============================================="

# Keep main.py (smart dispatcher) and fastapi_backend.py (primary)
# Remove alternative implementations
safe_remove "simple_backend.py" "Redundant backend - use fastapi_backend.py"
safe_remove "main_unified.py" "Redundant backend - use main.py"
safe_remove "main_complex.py" "Redundant backend"
safe_remove "main_simple.py" "Redundant backend" 
safe_remove "main_render.py" "Redundant backend"

echo ""
echo "🔍 Phase 4: Removing duplicate test and debug files..."
echo "==============================================="

# Remove duplicate testing files
safe_remove "comprehensive_payment_testing_suite.js" "Redundant - use __tests__ directory"
safe_remove "simple-nextjs-server.js" "Debug/test file"

# Remove debug HTML files  
safe_remove "test_frontend_login.html" "Debug file"
safe_remove "public/login-static.html" "Debug file"
safe_remove "public/login-fetch.html" "Debug file"

echo ""
echo "🔍 Phase 5: Removing temporary and generated files..."
echo "==============================================="

# Remove log files (should not be in git)
safe_remove "dev-server.log" "Log file"
safe_remove "dev.log" "Log file"

# Remove temporary databases
safe_remove "agent_system.db" "Temporary database"
safe_remove "agent_system.db-wal" "Temporary database"
safe_remove "booking_demo.db" "Temporary database"
safe_remove "staging_6fb_booking.db" "Temporary database"
safe_remove "team_votes.db" "Temporary database"
safe_remove "marketplace.db" "Temporary database"

# Remove cookies files
safe_remove "cookies.txt" "Temporary file"

echo ""
echo "🔍 Phase 6: Removing documentation duplication..."
echo "==============================================="

# Remove redundant documentation (keep essential ones)
safe_remove "BUG_FIXES_DEPLOYMENT_GUIDE.md" "Redundant docs"
safe_remove "INFRASTRUCTURE_CONSOLIDATION.md" "Redundant docs"
safe_remove "INFRASTRUCTURE_CONSOLIDATION_COMPLETE.md" "Redundant docs"

# Remove archived test reports
safe_remove "backup/onboarding-cleanup-20250823" "Archived backup directory"

echo ""
echo "🔍 Phase 7: Removing unused scripts and tools..."
echo "==============================================="

# Remove redundant deployment scripts (keep main ones)
safe_remove "deploy-staging.sh" "Redundant - use main deployment script"
safe_remove "deploy-fresh.sh" "Redundant - use main deployment script"

# Remove CLI tools that are no longer needed
safe_remove "cli_v2.1.4" "Old CLI tool"
safe_remove "render-cli" "Old CLI tool"
safe_remove "render-cli.zip" "Old CLI tool"

echo ""
echo "🔍 Phase 8: Removing redundant configuration files..."
echo "==============================================="

# Remove duplicate config files
safe_remove "jest.config.broken.js" "Broken config file"
safe_remove "playwright.debug.config.js" "Debug config - use main config"
safe_remove "playwright.simple.config.js" "Redundant config"
safe_remove "next.config.bundle-analyzer.js" "Specialized config - merge into main"

echo ""
echo "✅ CLEANUP COMPLETE!"
echo "==============================================="
echo "📊 Summary:"
echo "   - Files removed: $REMOVED_COUNT"
echo "   - Backup created at: $BACKUP_DIR"
echo ""
echo "🎯 Next Steps:"
echo "   1. Test the application to ensure nothing is broken"
echo "   2. Run: npm run lint && npm run build"
echo "   3. If everything works, you can remove the backup directory"
echo "   4. Continue with API endpoint consolidation"
echo ""
echo "⚠️  If you encounter issues, restore from: $BACKUP_DIR"
echo "==============================================="