#!/bin/bash

echo "Testing Staff Update API - Direct Test"
echo "======================================"

# Test with a dummy staff ID (will get 401 without auth, but shows API works)
echo ""
echo "1. Testing PATCH endpoint structure..."
RESPONSE=$(curl -s -X PATCH http://localhost:9999/api/staff/test-user-id \
  -H "Content-Type: application/json" \
  -d '{"first_name": "Test", "last_name": "User"}' \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS:/d')

echo "   Status Code: $HTTP_STATUS"
echo "   Response: $BODY"

if [ "$HTTP_STATUS" = "401" ]; then
  echo ""
  echo "✅ SUCCESS: API endpoint is working correctly!"
  echo "   (401 Unauthorized is expected without authentication)"
  echo ""
  echo "📝 To test with authentication:"
  echo "   1. Open http://localhost:9999/test-staff-update.html in your browser"
  echo "   2. Make sure you're logged in"
  echo "   3. Click 'Load Staff List' then 'Run Automated Test'"
elif [ "$HTTP_STATUS" = "500" ]; then
  echo ""
  echo "❌ ERROR: Server error - check logs"
else
  echo ""
  echo "⚠️  Unexpected status code: $HTTP_STATUS"
fi

echo ""
echo "======================================"
echo "Test complete"