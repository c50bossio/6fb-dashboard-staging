#!/bin/bash

# Load environment variables
source .env.local

# Extract project reference from Supabase URL
PROJECT_REF=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's/https:\/\///' | cut -d'.' -f1)

echo "🚀 Setting up database using psql..."
echo "Project Reference: $PROJECT_REF"
echo ""
echo "📝 To complete setup, you need the database password from Supabase:"
echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "2. Find 'Database Password' section"
echo "3. Copy your password"
echo ""
echo "Then run this command with your password:"
echo ""
echo "PGPASSWORD='[YOUR-PASSWORD]' psql -h aws-0-us-west-1.pooler.supabase.com -p 5432 -d postgres -U postgres.$PROJECT_REF < database/RUN_THIS_IN_SUPABASE.sql"
echo ""
echo "Or use the connection string:"
echo "psql \"postgresql://postgres.$PROJECT_REF:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres\" < database/RUN_THIS_IN_SUPABASE.sql"