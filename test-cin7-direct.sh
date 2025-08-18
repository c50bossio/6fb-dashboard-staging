#!/bin/bash

# Direct test of Cin7 API credentials
# This tests the credentials directly against Cin7's API

ACCOUNT_ID="1fd319f3-0a8b-4314-bb82-603f47fe2069"
API_KEY="509db449-eafc-66bd-ac73-f02c7392426a"

echo "🔍 Testing Cin7 Core API directly..."
echo "Account ID: ${ACCOUNT_ID:0:8}..."
echo "API Key: ${API_KEY:0:8}..."
echo ""

echo "Testing /externalapi/me endpoint..."
curl -X GET "https://inventory.dearsystems.com/externalapi/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v 2>&1 | grep -E "< HTTP|< |{|Incorrect"

echo ""
echo "Testing /ExternalAPI/v2/me endpoint (v2 API)..."
curl -X GET "https://inventory.dearsystems.com/ExternalAPI/v2/me" \
  -H "api-auth-accountid: $ACCOUNT_ID" \
  -H "api-auth-applicationkey: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -v 2>&1 | grep -E "< HTTP|< |{|Incorrect"