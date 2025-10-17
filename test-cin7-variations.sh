#!/bin/bash

# Test different variations of Cin7 API calls
# Testing with confirmed correct credentials

ACCOUNT_ID="1fd319f3-0a8b-4314-bb82-603f47fe2069"
API_KEY="4c9ed612-b13e-5c36-8d71-98e196068b54"

echo "🔍 Testing Cin7 Core API with different variations..."
echo "Account ID: ${ACCOUNT_ID:0:8}..."
echo "API Key: ${API_KEY:0:8}..."
echo ""

echo "1. Testing with lowercase headers (api-auth-accountid)..."
curl -s -X GET "https://inventory.dearsystems.com/externalapi/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "2. Testing with different case headers (Api-Auth-AccountId)..."
curl -s -X GET "https://inventory.dearsystems.com/externalapi/me" \
  -H "Api-Auth-AccountId: $ACCOUNT_ID" \
  -H "Api-Auth-ApplicationKey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "3. Testing v2 API endpoint..."
curl -s -X GET "https://inventory.dearsystems.com/ExternalAPI/v2/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "4. Testing products endpoint directly..."
curl -s -X GET "https://inventory.dearsystems.com/externalapi/products?limit=1" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "5. Testing without Content-Type header..."
curl -s -X GET "https://inventory.dearsystems.com/externalapi/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Accept: application/json" \
  -w "\nHTTP Status: %{http_code}\n"