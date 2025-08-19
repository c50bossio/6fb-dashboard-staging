#!/bin/bash

echo "Please paste your Supabase access token (get it from https://supabase.com/dashboard/account/tokens):"
read -s SUPABASE_ACCESS_TOKEN

echo ""
echo "Testing token..."

# Test the token by fetching project info
PROJECT_REF="dfhqjdoydihajmjxniee"
RESPONSE=$(curl -s -X GET "https://api.supabase.com/v1/projects/$PROJECT_REF" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json")

if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ Invalid token or no access to project"
    exit 1
else
    echo "✅ Token is valid!"
    
    # Save token to file for future use
    echo "$SUPABASE_ACCESS_TOKEN" > ~/.supabase-access-token
    chmod 600 ~/.supabase-access-token
    
    echo "Token saved to ~/.supabase-access-token"
    echo ""
    echo "Now updating redirect URLs..."
    
    # Update the redirect URLs
    REDIRECT_URLS="https://bookedbarber.com,https://bookedbarber.com/auth/callback,https://www.bookedbarber.com,https://www.bookedbarber.com/auth/callback,https://bookedibarber.com,https://bookedibarber.com/auth/callback,https://www.bookedibarber.com,https://www.bookedibarber.com/auth/callback,http://localhost:9999/auth/callback,http://localhost:3000/auth/callback"
    
    UPDATE_RESPONSE=$(curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"URI_ALLOW_LIST\": \"$REDIRECT_URLS\"
      }")
    
    if echo "$UPDATE_RESPONSE" | grep -q "error"; then
        echo "❌ Error updating redirect URLs:"
        echo "$UPDATE_RESPONSE"
    else
        echo "✅ Redirect URLs updated successfully!"
        echo ""
        echo "OAuth will now work on:"
        echo "  • bookedbarber.com"
        echo "  • bookedibarber.com"  
        echo "  • localhost:9999"
        echo "  • localhost:3000"
    fi
fi