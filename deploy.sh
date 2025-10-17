#!/bin/bash

# 6FB AI Agent System - Production Deployment Script
# Usage: ./deploy.sh [vercel|railway|manual]

set -e  # Exit on error

echo "🚀 6FB AI Agent System - Production Deployment"
echo "=============================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Error: .env.production not found${NC}"
    echo "Please copy .env.production.template to .env.production and fill in your values"
    exit 1
fi

# Run pre-deployment checks
echo -e "${YELLOW}📋 Running pre-deployment checks...${NC}"

# 1. Lint check
echo "1. Running lint check..."
if npm run lint > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Lint check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Lint has warnings (non-blocking)${NC}"
fi

# 2. Build check
echo "2. Running production build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# 3. Environment variables check
echo "3. Checking required environment variables..."
required_vars=("NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "SUPABASE_SERVICE_ROLE_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" .env.production; then
        missing_vars+=($var)
    fi
done

if [ ${#missing_vars[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All required environment variables set${NC}"
else
    echo -e "${RED}❌ Missing environment variables:${NC}"
    printf '%s\n' "${missing_vars[@]}"
    exit 1
fi

# Deployment method
DEPLOY_METHOD=${1:-manual}

echo ""
echo -e "${YELLOW}🚀 Deploying with method: $DEPLOY_METHOD${NC}"
echo ""

case $DEPLOY_METHOD in
    vercel)
        echo "Deploying to Vercel..."
        if command -v vercel &> /dev/null; then
            vercel --prod --env-file .env.production
        else
            echo -e "${RED}❌ Vercel CLI not installed${NC}"
            echo "Install with: npm i -g vercel"
            exit 1
        fi
        ;;
    
    railway)
        echo "Deploying to Railway..."
        if command -v railway &> /dev/null; then
            railway up --environment production
        else
            echo -e "${RED}❌ Railway CLI not installed${NC}"
            echo "Install with: npm i -g @railway/cli"
            exit 1
        fi
        ;;
    
    manual)
        echo "Manual deployment selected"
        echo ""
        echo "To deploy manually:"
        echo "1. Build is ready in .next folder"
        echo "2. Start production server with: npm start"
        echo "3. Or deploy .next folder to your hosting provider"
        echo ""
        echo "Starting production server locally..."
        npm start
        ;;
    
    *)
        echo -e "${RED}❌ Unknown deployment method: $DEPLOY_METHOD${NC}"
        echo "Usage: ./deploy.sh [vercel|railway|manual]"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Post-deployment checklist:"
echo "[ ] Test login functionality"
echo "[ ] Verify OAuth works"
echo "[ ] Check database connection"
echo "[ ] Test a booking flow"
echo "[ ] Monitor error logs"
echo ""
echo "Remember: No CSRF tokens needed - Supabase auth is sufficient!"
echo "See SECURITY-GUIDELINES.md for security philosophy"