#!/bin/bash

# Copy Staff Invitations Migration to Clipboard
# This script copies the SQL migration for easy deployment to Supabase Dashboard

echo "📋 COPYING STAFF INVITATIONS MIGRATION TO CLIPBOARD"
echo "=================================================="

# Check if the migration file exists
if [ ! -f "database/migrations/009_staff_invitations.sql" ]; then
    echo "❌ Migration file not found: database/migrations/009_staff_invitations.sql"
    exit 1
fi

# Copy to clipboard based on OS
if command -v pbcopy >/dev/null 2>&1; then
    # macOS
    cat database/migrations/009_staff_invitations.sql | pbcopy
    echo "✅ Migration copied to clipboard (macOS)"
elif command -v xclip >/dev/null 2>&1; then
    # Linux with xclip
    cat database/migrations/009_staff_invitations.sql | xclip -selection clipboard
    echo "✅ Migration copied to clipboard (Linux - xclip)"
elif command -v xsel >/dev/null 2>&1; then
    # Linux with xsel
    cat database/migrations/009_staff_invitations.sql | xsel --clipboard --input
    echo "✅ Migration copied to clipboard (Linux - xsel)"
else
    echo "❌ No clipboard utility found. Please install pbcopy (macOS), xclip, or xsel (Linux)"
    echo ""
    echo "Alternative: Copy the content manually from database/migrations/009_staff_invitations.sql"
    exit 1
fi

echo ""
echo "🚀 NEXT STEPS:"
echo "1. Open Supabase Dashboard: https://app.supabase.com"
echo "2. Navigate to your project: dfhqjdoydihajmjxniee"  
echo "3. Go to SQL Editor"
echo "4. Paste the migration (Cmd+V / Ctrl+V)"
echo "5. Click 'Run' to execute the SQL"
echo "6. Test Add Staff button at: http://localhost:9999/shop/settings/staff"
echo ""
echo "📝 MIGRATION CONTENT PREVIEW:"
echo "- Creates staff_invitations table with full schema"
echo "- Adds RLS policies for security"
echo "- Creates indexes for performance"
echo "- Includes trigger functions for automation"
echo "- Ready for production use"
echo ""
echo "🎯 This will fix the Add Staff button functionality!"