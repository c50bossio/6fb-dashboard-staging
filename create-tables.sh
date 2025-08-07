#!/bin/bash

# Load environment variables
source .env.local

# Extract project reference from URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed -n 's/https:\/\/\([^.]*\)\.supabase\.co/\1/p')

echo "🔄 Creating database tables for project: $PROJECT_REF"

# Read SQL content
SQL_CONTENT=$(cat database/RUN_THIS_IN_SUPABASE.sql)

# Try to execute SQL via Supabase Management API
# Note: This requires a personal access token, not the service role key

echo "📝 Attempting to create tables..."

# Alternative: Use psql directly with connection string
# Supabase provides a direct connection string in the dashboard

# For now, let's generate a clickable link and instructions
echo ""
echo "🔗 Click this link to open your SQL editor:"
echo "   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new"
echo ""
echo "📋 Then follow these steps:"
echo "   1. Copy ALL contents from: database/RUN_THIS_IN_SUPABASE.sql"
echo "   2. Paste into the SQL editor"
echo "   3. Click the 'RUN' button"
echo ""
echo "✨ The SQL will create all necessary tables with proper security policies."

# Open the link in default browser (macOS)
open "https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new" 2>/dev/null || true