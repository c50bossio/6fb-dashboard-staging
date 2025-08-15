#!/bin/bash

# Deployment Status Check Script
# Run this after deployment to verify everything is working

echo "🚀 BookedBarber Production Deployment Checker"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="https://bookedbarber.com"

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL$endpoint" 2>/dev/null)
    
    if [ "$response" == "200" ] || [ "$response" == "304" ]; then
        echo -e "${GREEN}✓${NC} ($response)"
        return 0
    elif [ "$response" == "307" ] || [ "$response" == "308" ]; then
        echo -e "${YELLOW}→${NC} (Redirect: $response)"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $response)"
        return 1
    fi
}

# Function to check API health
check_api() {
    local endpoint=$1
    local description=$2
    
    echo -n "Checking API: $description... "
    
    response=$(curl -s "$PROD_URL$endpoint" 2>/dev/null)
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL$endpoint" 2>/dev/null)
    
    if [ "$http_code" == "200" ]; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $http_code)"
        return 1
    fi
}

echo "1. Checking Core Pages"
echo "----------------------"
check_endpoint "/" "Homepage"
check_endpoint "/login" "Login page"
check_endpoint "/register" "Register page"
check_endpoint "/pricing" "Pricing page"
echo ""

echo "2. Checking API Endpoints"
echo "-------------------------"
check_api "/api/health" "Health check"
echo ""

echo "3. Checking Static Assets"
echo "-------------------------"
check_endpoint "/_next/static/css/" "CSS assets"
check_endpoint "/favicon.ico" "Favicon"
echo ""

echo "4. Checking Authentication Flow"
echo "--------------------------------"
check_endpoint "/auth/callback" "OAuth callback"
check_endpoint "/welcome" "Welcome page"
echo ""

echo "5. SSL Certificate Check"
echo "------------------------"
echo -n "Checking SSL certificate... "
if curl -s -I "$PROD_URL" 2>&1 | grep -q "SSL certificate problem"; then
    echo -e "${RED}✗${NC} SSL issues detected"
else
    echo -e "${GREEN}✓${NC} SSL valid"
fi
echo ""

echo "6. Response Time Check"
echo "----------------------"
echo -n "Measuring homepage load time... "
time=$(curl -s -o /dev/null -w "%{time_total}" "$PROD_URL")
time_ms=$(echo "$time * 1000" | bc | cut -d. -f1)

if [ "$time_ms" -lt 1000 ]; then
    echo -e "${GREEN}✓${NC} ${time_ms}ms (Excellent)"
elif [ "$time_ms" -lt 3000 ]; then
    echo -e "${YELLOW}→${NC} ${time_ms}ms (Good)"
else
    echo -e "${RED}✗${NC} ${time_ms}ms (Slow)"
fi
echo ""

echo "=============================================="
echo "Deployment check complete!"
echo ""
echo "Next Steps:"
echo "1. Test OAuth login manually"
echo "2. Check Supabase dashboard for auth events"
echo "3. Monitor Vercel dashboard for errors"
echo "4. Test critical user flows"
echo ""
echo "Support:"
echo "- Vercel Dashboard: https://vercel.com/dashboard"
echo "- Supabase Dashboard: https://app.supabase.com"
echo "- GitHub Repo: https://github.com/c50bossio/6fb-dashboard-staging"