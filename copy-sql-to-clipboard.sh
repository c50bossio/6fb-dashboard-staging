#!/bin/bash

echo "📋 Copying SQL to your clipboard..."

# Copy SQL content to clipboard (macOS)
cat database/RUN_THIS_IN_SUPABASE.sql | pbcopy

echo "✅ SQL copied to clipboard!"
echo ""
echo "📍 Now just:"
echo "   1. Go to the Supabase SQL editor (should be open in your browser)"
echo "   2. Press Cmd+V to paste"
echo "   3. Click the green 'RUN' button"
echo ""
echo "🎯 That's it! Your database will be ready in seconds."

# Also open the SQL editor if not already open
open "https://supabase.com/dashboard/project/dfhqjdoydihajmjxniee/sql/new" 2>/dev/null || true