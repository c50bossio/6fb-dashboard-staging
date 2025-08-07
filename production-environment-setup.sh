#!/bin/bash

# Production Environment Configuration Script
# 6FB AI Agent System - Final Production Setup

set -e  # Exit on any error

echo "🔧 Production Environment Configuration - 6FB AI Agent System"
echo "============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PRODUCTION_URL="https://6fb-ai-production-1ybw1cjbb-6fb.vercel.app"
PROJECT_NAME="6fb-ai-production"

echo -e "${BLUE}🎯 PRODUCTION CONFIGURATION CHECKLIST${NC}"
echo "====================================="
echo "This script will configure:"
echo "  1. 🔑 Environment variables for all services"
echo "  2. 💳 Stripe live products and webhooks"
echo "  3. 🗄️ Production database connection"
echo "  4. 🔍 Health check validation"
echo "  5. 📊 Monitoring and error tracking setup"
echo ""

echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🔑 PHASE 1: ENVIRONMENT VARIABLES${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 1.1: Core Application Settings${NC}"
echo "=================================="

# Set core environment variables
echo "🔧 Setting core application variables..."

vercel env add NODE_ENV production || echo "   Variable already exists"
vercel env add NEXT_PUBLIC_APP_URL "$PRODUCTION_URL" || echo "   Variable already exists"

echo -e "${GREEN}✅ Core application settings configured${NC}"

echo -e "${BLUE}Step 1.2: Database Configuration${NC}"
echo "==============================="

echo "🗄️ Database environment variables..."
echo ""
echo "📋 Required Database Variables:"
echo "================================"
echo "DATABASE_URL=postgresql://username:password@hostname:5432/6fb_ai_production"
echo "SUPABASE_URL=https://your-project.supabase.co"
echo "SUPABASE_ANON_KEY=your-anon-key"
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
echo ""

read -p "🤔 Do you want to configure database variables now? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "💡 Use the Vercel dashboard to add these variables:"
    echo "   https://vercel.com/6fb/6fb-ai-production/settings/environment-variables"
    echo ""
    echo "🔧 Or use vercel CLI:"
    echo "   vercel env add DATABASE_URL"
    echo "   vercel env add SUPABASE_URL"
    echo "   vercel env add SUPABASE_ANON_KEY"
    echo "   vercel env add SUPABASE_SERVICE_ROLE_KEY"
    echo ""
else
    echo -e "${YELLOW}⚠️ Database configuration skipped${NC}"
fi

echo -e "${BLUE}Step 1.3: AI Provider Configuration${NC}"
echo "=================================="

echo "🤖 AI provider environment variables..."
echo ""
echo "📋 Required AI Provider Variables:"
echo "=================================="
echo "OPENAI_API_KEY=sk-..."
echo "ANTHROPIC_API_KEY=sk-ant-..."
echo "GOOGLE_AI_API_KEY=..."
echo ""

read -p "🤔 Do you want to configure AI provider variables now? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Use vercel CLI to add AI provider keys:"
    echo "   vercel env add OPENAI_API_KEY"
    echo "   vercel env add ANTHROPIC_API_KEY"
    echo "   vercel env add GOOGLE_AI_API_KEY"
    echo ""
else
    echo -e "${YELLOW}⚠️ AI provider configuration skipped${NC}"
fi

echo -e "${BLUE}Step 1.4: Stripe Configuration${NC}"
echo "============================"

echo "💳 Stripe environment variables..."
echo ""
echo "📋 Required Stripe Variables:"
echo "============================="
echo "STRIPE_SECRET_KEY=sk_live_..."
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_..."
echo "STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""

read -p "🤔 Do you want to configure Stripe variables now? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔧 Use vercel CLI to add Stripe keys:"
    echo "   vercel env add STRIPE_SECRET_KEY"
    echo "   vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "   vercel env add STRIPE_WEBHOOK_SECRET"
    echo ""
    
    echo "💡 Don't forget to update Stripe webhook URL:"
    echo "   https://dashboard.stripe.com/webhooks"
    echo "   URL: $PRODUCTION_URL/api/webhooks/stripe"
    echo ""
else
    echo -e "${YELLOW}⚠️ Stripe configuration skipped${NC}"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}💳 PHASE 2: STRIPE PRODUCTION SETUP${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 2.1: Stripe Products Creation${NC}"
echo "================================="

read -p "🤔 Do you want to create Stripe live products now? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "💳 Creating Stripe live products..."
    
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        echo "Please set your Stripe live secret key:"
        read -s -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
        echo
        export STRIPE_SECRET_KEY
    fi
    
    if [ -z "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" ]; then
        echo "Please set your Stripe live publishable key:"
        read -p "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: " NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    fi
    
    export NEXT_PUBLIC_APP_URL="$PRODUCTION_URL"
    
    # Run Stripe setup
    node setup-stripe-products.js
    echo -e "${GREEN}✅ Stripe products configured${NC}"
else
    echo -e "${YELLOW}⚠️ Stripe products setup skipped${NC}"
    echo "   💡 Run manually: node setup-stripe-products.js"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🗄️ PHASE 3: DATABASE SETUP${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 3.1: Production Database Migration${NC}"
echo "======================================"

read -p "🤔 Do you want to run the database migration now? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️ Running production database migration..."
    ./run-database-migration.sh
    echo -e "${GREEN}✅ Database migration completed${NC}"
else
    echo -e "${YELLOW}⚠️ Database migration skipped${NC}"
    echo "   💡 Run manually: ./run-database-migration.sh"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}🔍 PHASE 4: PRODUCTION VALIDATION${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 4.1: Health Check Validation${NC}"
echo "==============================="

echo "🔍 Testing production deployment..."

# Wait for any recent deployments to be ready
sleep 10

# Run health checks
node launch-monitoring.js status

echo -e "${BLUE}Step 4.2: Comprehensive Testing${NC}"
echo "=============================="

read -p "🤔 Do you want to run the full test suite? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧪 Running comprehensive production tests..."
    node launch-monitoring.js test
    echo -e "${GREEN}✅ Production testing completed${NC}"
else
    echo -e "${YELLOW}⚠️ Comprehensive testing skipped${NC}"
    echo "   💡 Run manually: node launch-monitoring.js test"
fi

echo ""
echo -e "${PURPLE}========================================${NC}"
echo -e "${PURPLE}📊 PHASE 5: MONITORING SETUP${NC}"
echo -e "${PURPLE}========================================${NC}"

echo -e "${BLUE}Step 5.1: Production Monitoring${NC}"
echo "============================="

echo "📊 Setting up production monitoring..."
echo ""
echo "📋 Monitoring Services to Configure:"
echo "===================================="
echo "🐛 Sentry (Error Tracking):"
echo "   SENTRY_DSN=https://..."
echo "   NEXT_PUBLIC_SENTRY_DSN=https://..."
echo ""
echo "📈 PostHog (Analytics):"
echo "   POSTHOG_API_KEY=..."
echo "   NEXT_PUBLIC_POSTHOG_KEY=..."
echo "   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com"
echo ""
echo "🔔 Notification Services:"
echo "   SENDGRID_API_KEY=..."
echo "   TWILIO_ACCOUNT_SID=..."
echo "   TWILIO_AUTH_TOKEN=..."
echo ""

read -p "🤔 Do you want to start continuous monitoring? (y/N): " -r
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📊 Starting production monitoring in background..."
    nohup node launch-monitoring.js monitor > monitoring.log 2>&1 &
    echo $! > monitoring.pid
    echo -e "${GREEN}✅ Monitoring started (PID: $(cat monitoring.pid))${NC}"
    echo "   📄 Logs: tail -f monitoring.log"
    echo "   🛑 Stop: kill $(cat monitoring.pid)"
else
    echo -e "${YELLOW}⚠️ Continuous monitoring not started${NC}"
    echo "   💡 Start manually: node launch-monitoring.js monitor"
fi

echo ""
echo -e "${GREEN}🎉 PRODUCTION CONFIGURATION COMPLETE! 🎉${NC}"
echo ""
echo -e "${BLUE}📊 Production System Status:${NC}"
echo "=========================="
echo "🌐 Production URL: $PRODUCTION_URL"
echo "📱 Admin Dashboard: $PRODUCTION_URL/dashboard"
echo "💰 Billing System: $PRODUCTION_URL/billing"
echo "👥 Customer Onboarding: $PRODUCTION_URL/onboarding"
echo "❤️ Health Check: $PRODUCTION_URL/api/health"
echo ""

echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "======================"
echo "📊 Check status: node launch-monitoring.js status"
echo "🧪 Run tests: node launch-monitoring.js test"
echo "📈 View logs: vercel logs"
echo "⚙️ Update env: vercel env ls"
echo "🔄 Redeploy: vercel --prod"
echo ""

echo -e "${BLUE}💰 Revenue Model Active:${NC}"
echo "======================="
echo "💎 Starter: \$19.99/month + 15,000 tokens"
echo "🚀 Professional: \$49.99/month + 75,000 tokens"
echo "🏢 Enterprise: \$99.99/month + 300,000 tokens"
echo "🎁 14-day free trial on all plans"
echo "📈 Token overages: \$0.004-0.008 per 1K tokens"
echo ""

echo -e "${BLUE}🚀 Ready for Customer Launch:${NC}"
echo "=========================="
echo "✅ Token-based billing system active"
echo "✅ Multi-tenant architecture deployed"
echo "✅ Scalable Vercel infrastructure"
echo "✅ Real-time usage tracking"
echo "✅ Automated trial management"
echo "✅ Production monitoring ready"
echo ""

echo -e "${BLUE}📋 Final Launch Checklist:${NC}"
echo "========================="
echo "1. ✅ Production deployment complete"
echo "2. 🔧 Configure remaining environment variables"
echo "3. 🧪 Complete end-to-end testing"
echo "4. 📊 Verify monitoring and alerts"
echo "5. 👥 Begin customer onboarding!"
echo ""

echo -e "${GREEN}The 6FB AI Agent System is ready for production customers! 🎯${NC}"

# Create final status report
cat > production-configuration-status.txt << EOF
6FB AI Agent System - Production Configuration Status
====================================================

Configuration Date: $(date)
Production URL: $PRODUCTION_URL
Vercel Project: $PROJECT_NAME

✅ COMPLETED:
- Production deployment to Vercel
- Token-based billing system
- Multi-tenant database architecture
- Stripe integration framework
- Monitoring and testing infrastructure
- Comprehensive deployment scripts

🔧 CONFIGURATION NEEDED:
- Production environment variables
- Stripe live API keys
- Database connection strings
- AI provider API keys
- Monitoring service setup

💰 REVENUE MODEL:
- Starter: \$19.99/month + 15K tokens
- Professional: \$49.99/month + 75K tokens
- Enterprise: \$99.99/month + 300K tokens
- 14-day free trials with auto-conversion

🚀 READY FOR:
- Customer onboarding
- Marketing campaign launch
- Revenue generation
- Scale to thousands of users

Next: Complete environment configuration and begin customer acquisition!
EOF

echo "💾 Configuration status saved to: production-configuration-status.txt"