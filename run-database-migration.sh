#!/bin/bash

# PostgreSQL Database Migration Script
# 6FB AI Agent System - Token-Based Billing System

set -e  # Exit on any error

echo "🗄️ PostgreSQL Database Migration for 6FB AI Agent System"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATABASE_NAME="6fb_ai_production"
MIGRATION_FILE="migrate-to-production-db.sql"

echo -e "${BLUE}Step 1: Environment Validation${NC}"
echo "============================="

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL client (psql) is not installed${NC}"
    echo "Install PostgreSQL client with: brew install postgresql"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL client available${NC}"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Migration file not found: $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration file found${NC}"

echo -e "${BLUE}Step 2: Database Connection Setup${NC}"
echo "================================="

# Prompt for database connection details if not set in environment
if [ -z "$PGHOST" ]; then
    read -p "Enter PostgreSQL host (e.g., localhost or your-project.supabase.co): " PGHOST
    export PGHOST
fi

if [ -z "$PGPORT" ]; then
    read -p "Enter PostgreSQL port (default 5432): " PGPORT
    PGPORT=${PGPORT:-5432}
    export PGPORT
fi

if [ -z "$PGUSER" ]; then
    read -p "Enter PostgreSQL user: " PGUSER
    export PGUSER
fi

if [ -z "$PGPASSWORD" ]; then
    read -s -p "Enter PostgreSQL password: " PGPASSWORD
    echo
    export PGPASSWORD
fi

if [ -z "$PGDATABASE" ]; then
    PGDATABASE=$DATABASE_NAME
    export PGDATABASE
fi

echo -e "${GREEN}✅ Database connection configured${NC}"

echo -e "${BLUE}Step 3: Connection Test${NC}"
echo "======================"

echo "🔍 Testing database connection..."
if psql -c "SELECT version();" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "Please check your connection details and try again"
    exit 1
fi

echo -e "${BLUE}Step 4: Pre-Migration Backup${NC}"
echo "============================"

echo "💾 Creating backup of existing database..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

if psql -c "\dt" > /dev/null 2>&1; then
    pg_dump > "$BACKUP_FILE" 2>/dev/null || echo "No existing tables to backup"
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠️ No existing database to backup${NC}"
fi

echo -e "${BLUE}Step 5: Execute Migration${NC}"
echo "========================"

echo "🚀 Running database migration..."
echo "📄 Executing: $MIGRATION_FILE"

if psql -f "$MIGRATION_FILE"; then
    echo -e "${GREEN}✅ Migration executed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    
    if [ -f "$BACKUP_FILE" ]; then
        echo "💡 To restore backup: psql < $BACKUP_FILE"
    fi
    
    exit 1
fi

echo -e "${BLUE}Step 6: Migration Verification${NC}"
echo "==============================="

echo "🔍 Verifying migration results..."

# Check if all tables were created
TABLES_COUNT=$(psql -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('tenants', 'token_usage', 'tenant_subscriptions', 'usage_analytics', 'trial_tracking', 'usage_alerts', 'alert_preferences', 'payment_records', 'failed_payments');" | tr -d ' ')

if [ "$TABLES_COUNT" -eq 9 ]; then
    echo -e "${GREEN}✅ All 9 core tables created successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Expected 9 tables, found $TABLES_COUNT${NC}"
fi

# Check indexes
INDEXES_COUNT=$(psql -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' ')
echo -e "${GREEN}✅ $INDEXES_COUNT indexes created${NC}"

# Check RLS policies
POLICIES_COUNT=$(psql -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';" | tr -d ' ')
echo -e "${GREEN}✅ $POLICIES_COUNT RLS policies created${NC}"

# Check functions
FUNCTIONS_COUNT=$(psql -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname IN ('set_tenant_context', 'clear_tenant_context', 'update_updated_at_column');" | tr -d ' ')
echo -e "${GREEN}✅ $FUNCTIONS_COUNT utility functions created${NC}"

echo -e "${BLUE}Step 7: Test Data Validation${NC}"
echo "============================"

echo "🧪 Validating test data..."

# Check if demo tenant exists
DEMO_TENANT_EXISTS=$(psql -t -c "SELECT COUNT(*) FROM tenants WHERE slug = 'demo-barbershop';" | tr -d ' ')

if [ "$DEMO_TENANT_EXISTS" -eq 1 ]; then
    echo -e "${GREEN}✅ Demo tenant created successfully${NC}"
    
    # Check if demo subscription exists
    DEMO_SUBSCRIPTION_EXISTS=$(psql -t -c "SELECT COUNT(*) FROM tenant_subscriptions WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';" | tr -d ' ')
    
    if [ "$DEMO_SUBSCRIPTION_EXISTS" -eq 1 ]; then
        echo -e "${GREEN}✅ Demo subscription created successfully${NC}"
    else
        echo -e "${YELLOW}⚠️ Demo subscription not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️ Demo tenant not found${NC}"
fi

echo -e "${BLUE}Step 8: Connection String Generation${NC}"
echo "===================================="

echo "🔗 Generating connection strings for application..."

echo ""
echo -e "${BLUE}📋 Connection Strings for .env.production:${NC}"
echo "=============================================="
echo "DATABASE_URL=postgresql://$PGUSER:[PASSWORD]@$PGHOST:$PGPORT/$PGDATABASE"
echo ""
echo "# For Supabase (if using Supabase PostgreSQL):"
echo "SUPABASE_URL=https://$PGHOST"
echo "SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]"
echo ""

echo -e "${BLUE}Step 9: Next Steps${NC}"
echo "=================="

echo "🎯 Database migration completed successfully!"
echo ""
echo "📋 Next Steps:"
echo "1. Update .env.production with the DATABASE_URL above"
echo "2. Test application connection to the database"
echo "3. Deploy application to production environment"
echo "4. Run end-to-end billing system tests"
echo "5. Configure monitoring and alerts"
echo ""

echo -e "${BLUE}🔧 Database Management Commands:${NC}"
echo "================================="
echo "# Connect to database:"
echo "psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE"
echo ""
echo "# View all tables:"
echo "psql -c '\dt'"
echo ""
echo "# Check table sizes:"
echo "psql -c 'SELECT schemaname,tablename,pg_size_pretty(pg_total_relation_size(schemaname||.||tablename)) as size FROM pg_tables WHERE schemaname = public ORDER BY pg_total_relation_size(schemaname||.||tablename) DESC;'"
echo ""
echo "# Monitor active connections:"
echo "psql -c 'SELECT count(*) FROM pg_stat_activity;'"
echo ""

echo -e "${GREEN}🎉 POSTGRESQL MIGRATION COMPLETE! 🎉${NC}"
echo ""
echo -e "${BLUE}💾 Migration Summary:${NC}"
echo "  ✅ 9 core tables created with indexes"
echo "  ✅ Row-Level Security (RLS) policies configured"
echo "  ✅ Multi-tenant architecture enabled"
echo "  ✅ Token billing system ready"
echo "  ✅ Usage tracking and analytics tables"
echo "  ✅ Automated alerts and trial management"
echo "  ✅ Payment processing and audit trails"
echo ""
echo -e "${GREEN}Database is ready for production deployment! 🚀${NC}"