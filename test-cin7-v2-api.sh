#!/bin/bash

ACCOUNT_ID="1fd319f3-0a8b-4314-bb82-603f47fe2069"
API_KEY="509db449-eafc-66bd-ac73-f02c7392426a"

echo "Testing Cin7 v2 API endpoints..."
echo ""

echo "1. Testing /ExternalApi/v2/me (account info):"
curl -s -X GET "https://inventory.dearsystems.com/ExternalApi/v2/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" | head -20
echo ""

echo "2. Testing /ExternalApi/v2/product/list:"
curl -s -X GET "https://inventory.dearsystems.com/ExternalApi/v2/product/list?limit=1&page=1" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" | head -20
echo ""

echo "3. Testing /ExternalApi/v2/ref/product (might be the correct endpoint):"
curl -s -X GET "https://inventory.dearsystems.com/ExternalApi/v2/ref/product?limit=1&page=1" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" | head -20
echo ""

echo "4. Testing /ExternalApi/v2/product (without /list):"
curl -s -X GET "https://inventory.dearsystems.com/ExternalApi/v2/product?limit=1&page=1" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" | head -20
