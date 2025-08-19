#!/bin/bash

# Script to update Supabase redirect URLs
# You need to get your access token from: https://supabase.com/dashboard/account/tokens

echo "Updating Supabase Auth Configuration..."
echo "======================================="
echo ""
echo "Please get your access token from: https://supabase.com/dashboard/account/tokens"
echo "Then set it as an environment variable:"
echo "export SUPABASE_ACCESS_TOKEN='your-token-here'"
echo ""

if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Error: SUPABASE_ACCESS_TOKEN not set"
    echo "Please run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
    exit 1
fi

PROJECT_REF="dfhqjdoydihajmjxniee"

# Get current auth configuration
echo "📥 Fetching current auth configuration..."
CURRENT_CONFIG=$(curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json")

echo "Current config fetched."
echo ""

# Update auth configuration with new redirect URLs
echo "🔄 Updating redirect URLs..."

# The redirect URLs need to be in a comma-separated format
REDIRECT_URLS="https://bookedbarber.com,https://bookedbarber.com/auth/callback,https://www.bookedbarber.com,https://www.bookedbarber.com/auth/callback,https://bookedibarber.com,https://bookedibarber.com/auth/callback,https://www.bookedibarber.com,https://www.bookedibarber.com/auth/callback,http://localhost:9999/auth/callback,http://localhost:3000/auth/callback,http://localhost:9999,http://localhost:3000"

RESPONSE=$(curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"URI_ALLOW_LIST\": \"$REDIRECT_URLS\"
  }")

# Check if the update was successful
if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Error updating redirect URLs:"
    echo "$RESPONSE" | jq '.'
    exit 1
else
    echo "✅ Redirect URLs updated successfully!"
    echo ""
    echo "Added the following URLs:"
    echo "  • https://bookedbarber.com"
    echo "  • https://bookedbarber.com/auth/callback"
    echo "  • https://www.bookedbarber.com"
    echo "  • https://www.bookedbarber.com/auth/callback"
    echo "  • https://bookedibarber.com"
    echo "  • https://bookedibarber.com/auth/callback"
    echo "  • https://www.bookedibarber.com"
    echo "  • https://www.bookedibarber.com/auth/callback"
    echo "  • http://localhost:9999/auth/callback"
    echo "  • http://localhost:3000/auth/callback"
    echo ""
    echo "🎉 OAuth will now work on all domain variations!"
fi