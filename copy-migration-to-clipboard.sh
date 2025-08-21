#!/bin/bash

# Script to copy the database migration to clipboard
echo "📋 Copying database migration script to clipboard..."

# Copy the TRULY FINAL migration file content to clipboard (every column existence verified)
cat "/Users/bossio/6FB AI Agent System/migrations/fix_shop_management_truly_final.sql" | pbcopy

echo "✅ Database migration script copied to clipboard!"
echo ""
echo "📝 Next steps:"
echo "1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql/new"
echo "2. Paste the migration (Cmd+V)"
echo "3. Click 'Run' to apply the migration"
echo ""
echo "The migration includes:"
echo "- Fixed RLS policies with proper role targeting"
echo "- Performance indexes on all foreign keys"
echo "- Updated_at triggers for audit trails"
echo "- Stored procedures for complex operations"