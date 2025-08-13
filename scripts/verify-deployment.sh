#!/bin/bash

# Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [staging|production]

set -e

ENVIRONMENT=${1:-staging}
DOMAIN=""

if [ "$ENVIRONMENT" = "production" ]; then
    DOMAIN="bookedbarber.com"
else
    DOMAIN="staging.bookedbarber.com"
fi

echo "🔍 Verifying $ENVIRONMENT deployment at $DOMAIN"
echo "================================================"

# 1. Check DNS Resolution
echo -e "\n1️⃣ DNS Resolution:"
DNS_RESULT=$(nslookup $DOMAIN 8.8.8.8 2>/dev/null | grep -A 2 "Name:" | tail -1 || echo "DNS not found")
echo "   $DNS_RESULT"

# 2. Check HTTP Response
echo -e "\n2️⃣ HTTP Response:"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ HTTP Status: $HTTP_STATUS"
else
    echo "   ❌ HTTP Status: $HTTP_STATUS"
fi

# 3. Check SSL Certificate
echo -e "\n3️⃣ SSL Certificate:"
SSL_CHECK=$(curl -s -I https://$DOMAIN 2>/dev/null | grep -i "strict-transport-security" || echo "No HSTS")
if [[ $SSL_CHECK == *"strict-transport-security"* ]]; then
    echo "   ✅ SSL Active (HSTS enabled)"
else
    echo "   ⚠️  SSL may be provisioning"
fi

# 4. Check API Health
echo -e "\n4️⃣ API Health Check:"
API_STATUS=$(curl -s https://$DOMAIN/api/health 2>/dev/null | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('status', 'unknown'))" 2>/dev/null || echo "API unreachable")
if [[ $API_STATUS == *"healthy"* ]] || [[ $API_STATUS == *"partial"* ]]; then
    echo "   ✅ API Status: $API_STATUS"
else
    echo "   ❌ API Status: $API_STATUS"
fi

# 5. Check Response Time
echo -e "\n5️⃣ Response Time:"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" https://$DOMAIN 2>/dev/null || echo "N/A")
if [ "$RESPONSE_TIME" != "N/A" ]; then
    echo "   ⏱️  Total time: ${RESPONSE_TIME}s"
fi

# 6. Check Vercel Deployment
echo -e "\n6️⃣ Latest Deployment:"
if [ "$ENVIRONMENT" = "production" ]; then
    echo "   🔗 Check: https://vercel.com/c50bossios-projects/6fb-ai-dashboard?filter=production"
else
    echo "   🔗 Check: https://vercel.com/c50bossios-projects/6fb-ai-dashboard?filter=staging"
fi

# Summary
echo -e "\n📊 Summary for $ENVIRONMENT ($DOMAIN):"
echo "================================================"
if [ "$HTTP_STATUS" = "200" ] && [[ $API_STATUS == *"healthy"* || $API_STATUS == *"partial"* ]]; then
    echo "✅ Deployment is WORKING!"
    echo "🔗 Visit: https://$DOMAIN"
else
    echo "⚠️  Deployment may still be in progress"
    echo "   Wait 2-5 minutes and try again"
fi