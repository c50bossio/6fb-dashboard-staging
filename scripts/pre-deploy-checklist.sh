#!/bin/bash

# Pre-deployment Checklist for BookedBarber Production
# Ensures all Stripe configurations are live mode before deployment

echo "=================================================="
echo "🚀 BOOKEDBARBER PRODUCTION DEPLOYMENT CHECKLIST"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track if deployment should proceed
DEPLOY_READY=true

echo -e "${BLUE}📋 Step 1: Checking Node Environment${NC}"
if [ "$NODE_ENV" = "production" ]; then
    echo -e "${GREEN}✅ NODE_ENV is set to production${NC}"
else
    echo -e "${YELLOW}⚠️  NODE_ENV is not production (current: ${NODE_ENV:-not set})${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 2: Validating Stripe Configuration${NC}"

# Check for Stripe keys
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY is not set${NC}"
    DEPLOY_READY=false
elif [[ "$STRIPE_SECRET_KEY" == sk_live_* ]]; then
    echo -e "${GREEN}✅ STRIPE_SECRET_KEY is in LIVE mode${NC}"
elif [[ "$STRIPE_SECRET_KEY" == sk_test_* ]]; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY is in TEST mode - not suitable for production${NC}"
    DEPLOY_READY=false
else
    echo -e "${YELLOW}⚠️  STRIPE_SECRET_KEY format unrecognized${NC}"
fi

if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set${NC}"
    DEPLOY_READY=false
elif [[ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" == pk_live_* ]]; then
    echo -e "${GREEN}✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is in LIVE mode${NC}"
elif [[ "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" == pk_test_* ]]; then
    echo -e "${RED}❌ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is in TEST mode - not suitable for production${NC}"
    DEPLOY_READY=false
else
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY format unrecognized${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 3: Checking Application URL${NC}"
if [ "$NEXT_PUBLIC_APP_URL" = "https://bookedbarber.com" ]; then
    echo -e "${GREEN}✅ NEXT_PUBLIC_APP_URL correctly set to https://bookedbarber.com${NC}"
elif [ -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo -e "${RED}❌ NEXT_PUBLIC_APP_URL is not set${NC}"
    DEPLOY_READY=false
else
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_APP_URL is set to: $NEXT_PUBLIC_APP_URL${NC}"
fi

echo ""
echo -e "${BLUE}📋 Step 4: Running Node.js validation script${NC}"
node scripts/validate-stripe-live-mode.js --production
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js validation passed${NC}"
else
    echo -e "${RED}❌ Node.js validation failed${NC}"
    DEPLOY_READY=false
fi

echo ""
echo -e "${BLUE}📋 Step 5: Checking build${NC}"
npm run build --quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    DEPLOY_READY=false
fi

echo ""
echo -e "${BLUE}📋 Step 6: Running tests${NC}"
npm run test --quiet
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  Some tests failed (review before deploying)${NC}"
fi

echo ""
echo "=================================================="
echo "📊 DEPLOYMENT READINESS SUMMARY"
echo "=================================================="

if [ "$DEPLOY_READY" = true ]; then
    echo -e "${GREEN}✅ ALL CRITICAL CHECKS PASSED${NC}"
    echo ""
    echo "Ready to deploy to production!"
    echo ""
    echo "Next steps:"
    echo "1. Commit your changes: git add . && git commit -m 'Deploy: Live Stripe configuration'"
    echo "2. Push to main: git push origin main"
    echo "3. Verify on Vercel dashboard that deployment uses live env vars"
    echo "4. Test payment flow on production with a real card (small amount)"
    exit 0
else
    echo -e "${RED}❌ DEPLOYMENT BLOCKED - Critical issues found${NC}"
    echo ""
    echo "Fix the issues above before deploying to production."
    echo "Common fixes:"
    echo "1. Set STRIPE_SECRET_KEY to your live key (sk_live_...)"
    echo "2. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your live key (pk_live_...)"
    echo "3. Set NEXT_PUBLIC_APP_URL to https://bookedbarber.com"
    echo "4. Ensure these are set in Vercel Environment Variables"
    exit 1
fi