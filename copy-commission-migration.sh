#!/bin/bash

# Copy commission migration SQL to clipboard for easy pasting in Supabase

echo "📋 Copying commission migration SQL to clipboard..."

# Check if pbcopy exists (macOS)
if command -v pbcopy &> /dev/null; then
    cat migrations/create_complete_commission_system.sql | pbcopy
    echo "✅ Migration SQL copied to clipboard!"
    echo ""
    echo "📖 Next steps:"
    echo "1. Go to your Supabase project dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Paste (⌘+V) and execute the SQL"
    echo "4. Refresh your application to test the commission features"
else
    echo "⚠️  pbcopy not available. Here's the SQL to copy manually:"
    echo ""
    cat migrations/create_complete_commission_system.sql
fi