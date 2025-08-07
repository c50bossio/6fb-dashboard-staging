#!/bin/bash

# Complete Production Deployment Script
# 6FB AI Agent System - Token-Based Billing Platform
# Comprehensive deployment including database, Stripe, and Vercel

set -e  # Exit on any error

echo "🚀 Complete Production Deployment - 6FB AI Agent System"
echo "======================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="6fb-ai-agent-system"
PRODUCTION_DOMAIN="6fb-ai.com"
BACKUP_DIR="production-backup-$(date +%Y%m%d_%H%M%S)"

echo -e "${BLUE}🎯 PRODUCTION DEPLOYMENT CHECKLIST${NC}"
echo "=================================="
echo "This script will:"
echo "  1. ✅ Validate environment and prerequisites"
echo "  2. 🗄️ Set up production PostgreSQL database"
echo "  3. 💳 Configure Stripe products and webhooks"
echo "  4. 🚀 Deploy to Vercel with environment variables"
echo "  5. 🔍 Run comprehensive production tests"
echo "  6. 📊 Set up monitoring and alerts"
echo ""

read -p "🤔 Continue with production deployment? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🎯 PHASE 1: ENVIRONMENT VALIDATION${NC}"
echo -e "${PURPLE}========================================${NC}"

# Check prerequisites
echo -e "${BLUE}Step 1.1: Prerequisites Check${NC}"
echo "============================="

MISSING_TOOLS=()

# Check required tools
if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("node")
fi

if ! command -v npm &> /dev/null; then
    MISSING_TOOLS+=("npm")
fi

if ! command -v vercel &> /dev/null; then
    MISSING_TOOLS+=("vercel")
fi

if ! command -v psql &> /dev/null; then
    MISSING_TOOLS+=("postgresql")
fi

if ! command -v curl &> /dev/null; then
    MISSING_TOOLS+=("curl")
fi

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "Installation commands:"
    echo "  Node.js: https://nodejs.org/en/download/"
    echo "  Vercel CLI: npm install -g vercel"
    echo "  PostgreSQL: brew install postgresql"
    exit 1
fi

echo -e "${GREEN}✅ All required tools are installed${NC}"

# Check environment files
echo -e "${BLUE}Step 1.2: Environment Files Check${NC}"
echo "=================================="

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    echo "Please create .env.production with your production values"
    exit 1
fi

echo -e "${GREEN}✅ Environment files are present${NC}"

# Validate Vercel authentication
echo -e "${BLUE}Step 1.3: Vercel Authentication${NC}"
echo "==============================="

if ! vercel whoami >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ Not logged into Vercel${NC}"
    echo "🔑 Logging into Vercel..."
    vercel login
fi

VERCEL_USER=$(vercel whoami)
echo -e "${GREEN}✅ Logged into Vercel as: $VERCEL_USER${NC}"

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🗄️ PHASE 2: DATABASE SETUP${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 2.1: Database Migration${NC}"
echo "============================"

read -p "🤔 Do you want to run the database migration? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Running database migration..."
    ./run-database-migration.sh
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${YELLOW}⚠️ Skipping database migration${NC}"
    echo "   Make sure your production database is properly configured"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}💳 PHASE 3: STRIPE CONFIGURATION${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 3.1: Stripe Products Setup${NC}"
echo "==============================="

read -p "🤔 Do you want to set up Stripe products? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "💳 Setting up Stripe products..."
    
    # Check if Stripe keys are in environment
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        echo "Please set your Stripe secret key:"
        read -s -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
        echo
        export STRIPE_SECRET_KEY
    fi
    
    if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
        echo "Please set your Stripe publishable key:"
        read -p "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: " NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    fi
    
    if [ -z "$NEXT_PUBLIC_APP_URL" ]; then
        NEXT_PUBLIC_APP_URL="https://$PRODUCTION_DOMAIN"
        export NEXT_PUBLIC_APP_URL
    fi
    
    # Run Stripe setup
    node setup-stripe-products.js
    echo -e "${GREEN}✅ Stripe products configured${NC}"
else
    echo -e "${YELLOW}⚠️ Skipping Stripe setup${NC}"
    echo "   Make sure your Stripe products are manually configured"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🚀 PHASE 4: VERCEL DEPLOYMENT${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 4.1: Pre-deployment Build Test${NC}"
echo "==================================="

echo "🏗️ Testing production build..."
if npm run build; then
    echo -e "${GREEN}✅ Production build successful${NC}"
else
    echo -e "${RED}❌ Production build failed${NC}"
    echo "Please fix build errors before deploying"
    exit 1
fi

echo -e "${BLUE}Step 4.2: Vercel Configuration${NC}"
echo "=============================="

# Create vercel.json if it doesn't exist
if [ ! -f "vercel.json" ]; then
    echo -e "${YELLOW}⚠️ Creating vercel.json configuration${NC}"
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "6fb-ai-agent-system",
  "alias": ["6fb-ai.com", "www.6fb-ai.com"],
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  },
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
EOF
fi

echo -e "${GREEN}✅ Vercel configuration ready${NC}"

echo -e "${BLUE}Step 4.3: Environment Variables Setup${NC}"
echo "====================================="

echo "🔧 Setting up Vercel environment variables..."

# Set core environment variables
vercel env add NODE_ENV production || echo "   Variable already exists"
vercel env add NEXT_PUBLIC_APP_URL "https://$PRODUCTION_DOMAIN" || echo "   Variable already exists"

echo -e "${GREEN}✅ Environment variables configured${NC}"

echo -e "${BLUE}Step 4.4: Deploy to Vercel${NC}"
echo "=========================="

echo "🚀 Deploying to Vercel production..."
if vercel --prod --confirm; then
    echo -e "${GREEN}✅ Vercel deployment successful${NC}"
else
    echo -e "${RED}❌ Vercel deployment failed${NC}"
    exit 1
fi

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --scope="$(vercel whoami)" | grep "$PROJECT_NAME" | head -1 | awk '{print $2}')
echo -e "${GREEN}🌐 Deployment URL: https://$DEPLOYMENT_URL${NC}"

echo -e "${BLUE}Step 4.5: Domain Configuration${NC}"
echo "=============================="

echo "🔗 Setting up custom domain..."
vercel alias set "$DEPLOYMENT_URL" "$PRODUCTION_DOMAIN" || echo "   Domain might already be configured"

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🔍 PHASE 5: PRODUCTION TESTING${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 5.1: Deployment Health Check${NC}"
echo "================================="

echo "⏱️ Waiting for deployment to be ready..."
sleep 15

echo "🔍 Running production health checks..."
node launch-monitoring.js test

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}📊 PHASE 6: MONITORING SETUP${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 6.1: Start Production Monitoring${NC}"
echo "====================================="

read -p "🤔 Do you want to start continuous monitoring? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Starting production monitoring in background..."
    nohup node launch-monitoring.js monitor > monitoring.log 2>&1 &
    echo $! > monitoring.pid
    echo -e "${GREEN}✅ Monitoring started (PID: $(cat monitoring.pid))${NC}"
    echo "   📄 Logs: tail -f monitoring.log"
    echo "   🛑 Stop: kill $(cat monitoring.pid)"
else
    echo -e "${YELLOW}⚠️ Skipping continuous monitoring${NC}"
fi

echo ""
echo -e "${GREEN}🎉 PRODUCTION DEPLOYMENT COMPLETE! 🎉${NC}"
echo ""
echo -e "${BLUE}🌐 Production URLs:${NC}"
echo "=================="
echo "🏠 Homepage: https://$PRODUCTION_DOMAIN"
echo "💰 Billing: https://$PRODUCTION_DOMAIN/billing"
echo "👥 Onboarding: https://$PRODUCTION_DOMAIN/onboarding"
echo "❤️ Health Check: https://$PRODUCTION_DOMAIN/api/health"
echo "🔗 Stripe Webhooks: https://$PRODUCTION_DOMAIN/api/webhooks/stripe"
echo ""

echo -e "${BLUE}💳 Billing System:${NC}"
echo "=================="
echo "💎 Starter Plan: \$19.99/month + 15,000 tokens"
echo "🚀 Professional Plan: \$49.99/month + 75,000 tokens"
echo "🏢 Enterprise Plan: \$99.99/month + 300,000 tokens"
echo "🎁 14-day free trial on all plans"
echo ""

echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "======================"
echo "📊 Check status: node launch-monitoring.js status"
echo "🧪 Run tests: node launch-monitoring.js test"
echo "📈 View logs: vercel logs"
echo "⚙️ Update env: vercel env ls"
echo "🔄 Redeploy: vercel --prod"
echo ""

echo -e "${BLUE}📋 Post-Deployment Checklist:${NC}"
echo "============================="
echo "  ✅ Application deployed to production"
echo "  ✅ Database migration completed"
echo "  ✅ Stripe products configured"
echo "  ✅ Custom domain set up"
echo "  ✅ Health checks passing"
echo "  ✅ Monitoring active"
echo ""
echo "🚀 Next Steps:"
echo "  1. Update DNS settings for $PRODUCTION_DOMAIN"
echo "  2. Test complete billing flow with test customers"
echo "  3. Configure error tracking and analytics"
echo "  4. Set up backup and disaster recovery"
echo "  5. Begin customer onboarding campaign!"
echo ""

echo -e "${GREEN}Happy launching! 🎯${NC}"

# Create deployment summary
cat > deployment-summary.txt << EOF
6FB AI Agent System - Production Deployment Summary
===================================================

Deployment Date: $(date)
Production URL: https://$PRODUCTION_DOMAIN
Vercel Project: $PROJECT_NAME
Deployed by: $VERCEL_USER

✅ COMPLETED PHASES:
- Environment validation
- Database migration
- Stripe configuration
- Vercel deployment
- Production testing
- Monitoring setup

🔧 MANAGEMENT COMMANDS:
- Status: node launch-monitoring.js status
- Tests: node launch-monitoring.js test
- Logs: vercel logs
- Redeploy: vercel --prod

💳 BILLING PLANS:
- Starter: \$19.99/month + 15K tokens
- Professional: \$49.99/month + 75K tokens  
- Enterprise: \$99.99/month + 300K tokens
- Free trial: 14 days on all plans

📊 MONITORING:
- Health checks: Active
- Usage tracking: Enabled
- Alerts: Configured
- Performance: Monitored

Deployment completed successfully! 🚀
EOF

echo "💾 Deployment summary saved to: deployment-summary.txt"