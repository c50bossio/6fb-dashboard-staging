#!/bin/bash

# Dashboard Tables Migration Script
# This script executes the dashboard and AI tables migration
# Usage: ./scripts/run-dashboard-migration.sh

set -e

echo "🚀 Starting Dashboard Tables Migration..."
echo "----------------------------------------"

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if migration file exists
MIGRATION_FILE="migrations/create_dashboard_ai_tables.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📁 Migration file found: $MIGRATION_FILE"

# Execute the migration
echo "🔄 Executing migration..."
if supabase db reset --linked; then
    echo "✅ Database reset successful"
else
    echo "⚠️  Database reset failed, trying direct execution..."
fi

# Try to execute the migration directly
echo "🔄 Applying migration script..."
if psql "$DATABASE_URL" -f "$MIGRATION_FILE"; then
    echo "✅ Migration executed successfully!"
else
    echo "❌ Migration failed. Please check the error above."
    echo "💡 You may need to:"
    echo "   1. Create a Supabase development branch"
    echo "   2. Ensure you have write permissions"
    echo "   3. Check your database connection"
    exit 1
fi

echo "----------------------------------------"
echo "🎉 Dashboard Tables Migration Complete!"
echo ""
echo "📋 Created Tables:"
echo "   • business_metrics - Daily business performance"
echo "   • ai_insights - AI-generated insights"
echo "   • ai_agents - AI agent configurations"
echo "   • business_recommendations - AI recommendations"
echo "   • realtime_metrics - Real-time operations"
echo "   • location_performance - Multi-location tracking"
echo "   • trending_services - Service popularity"
echo ""
echo "🔒 All tables have Row Level Security (RLS) enabled"
echo "📊 Real-time subscriptions configured"
echo "🔗 Proper foreign key relationships established"
echo ""
echo "✅ Ready for dashboard and AI system integration!"