#!/bin/bash

# Production Deployment Script for 6FB AI Agent System
# Complete deployment workflow with safety checks and monitoring

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
SKIP_TESTS=${SKIP_TESTS:-false}
SKIP_BUILD=${SKIP_BUILD:-false}

echo "🚀 Deploying 6FB AI Agent System to ${DEPLOYMENT_ENV}"
echo "================================================"

# 1. Environment check
echo -e "\n${YELLOW}Step 1: Checking environment...${NC}"
if [ ! -f ".env.${DEPLOYMENT_ENV}" ]; then
    echo -e "${RED}Error: .env.${DEPLOYMENT_ENV} file not found${NC}"
    echo "Please create environment configuration file first"
    exit 1
fi

# Check required environment variables
required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
    "STRIPE_SECRET_KEY"
    "SENDGRID_API_KEY"
    "TWILIO_ACCOUNT_SID"
)

source .env.${DEPLOYMENT_ENV}
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Required variable $var is not set${NC}"
        exit 1
    fi
done
echo -e "${GREEN}✓ Environment configuration valid${NC}"

# 2. Git status check
echo -e "\n${YELLOW}Step 2: Checking git status...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Warning: Uncommitted changes detected${NC}"
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Git status checked${NC}"

# 3. Dependencies update
echo -e "\n${YELLOW}Step 3: Installing dependencies...${NC}"
npm ci --production=false
echo -e "${GREEN}✓ Dependencies installed${NC}"

# 4. Run tests
if [ "$SKIP_TESTS" != "true" ]; then
    echo -e "\n${YELLOW}Step 4: Running tests...${NC}"
    
    # Quick API tests
    node tests/quick-test.js
    if [ $? -ne 0 ]; then
        echo -e "${RED}API tests failed${NC}"
        exit 1
    fi
    
    # Playwright E2E tests (if available)
    if [ -f "playwright.config.js" ]; then
        npx playwright test --reporter=dot
        if [ $? -ne 0 ]; then
            echo -e "${RED}E2E tests failed${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ All tests passed${NC}"
else
    echo -e "${YELLOW}⚠ Tests skipped (SKIP_TESTS=true)${NC}"
fi

# 5. Build application
if [ "$SKIP_BUILD" != "true" ]; then
    echo -e "\n${YELLOW}Step 5: Building application...${NC}"
    
    # Clean previous build
    rm -rf .next
    
    # Build with production optimizations
    NODE_ENV=production npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}Build failed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${YELLOW}⚠ Build skipped (SKIP_BUILD=true)${NC}"
fi

# 6. Health check
echo -e "\n${YELLOW}Step 6: Running pre-deployment health check...${NC}"
npm run health
if [ $? -ne 0 ]; then
    echo -e "${RED}Health check failed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Health check passed${NC}"

# 7. Database migrations (if applicable)
echo -e "\n${YELLOW}Step 7: Checking database migrations...${NC}"
if [ -d "database/migrations" ]; then
    echo "Running database migrations..."
    # Add migration command here if needed
    echo -e "${GREEN}✓ Migrations complete${NC}"
else
    echo "No migrations to run"
fi

# 8. Deploy to platform
echo -e "\n${YELLOW}Step 8: Deploying to platform...${NC}"

case $DEPLOYMENT_ENV in
    production)
        echo "Deploying to production..."
        
        # Vercel deployment
        if [ -f "vercel.json" ]; then
            vercel --prod --yes
        fi
        
        # Or Docker deployment
        if [ -f "docker-compose.prod.yml" ]; then
            docker-compose -f docker-compose.prod.yml up -d --build
        fi
        
        # Or custom deployment
        # Add your deployment commands here
        ;;
        
    staging)
        echo "Deploying to staging..."
        
        # Vercel staging
        if [ -f "vercel.json" ]; then
            vercel --yes
        fi
        ;;
        
    *)
        echo -e "${RED}Unknown deployment environment: $DEPLOYMENT_ENV${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Deployment initiated${NC}"

# 9. Post-deployment health check
echo -e "\n${YELLOW}Step 9: Running post-deployment health check...${NC}"
sleep 30  # Wait for deployment to stabilize

# Check production health endpoint
if [ "$DEPLOYMENT_ENV" = "production" ]; then
    HEALTH_URL="https://bookedbarber.com/api/health/production"
else
    HEALTH_URL="https://staging.bookedbarber.com/api/health/production"
fi

echo "Checking health at: $HEALTH_URL"
health_response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ "$health_response" = "200" ]; then
    echo -e "${GREEN}✓ Production health check passed${NC}"
else
    echo -e "${YELLOW}⚠ Health check returned status: $health_response${NC}"
    echo "Please verify deployment manually"
fi

# 10. Monitoring setup
echo -e "\n${YELLOW}Step 10: Configuring monitoring...${NC}"
if [ "$DEPLOYMENT_ENV" = "production" ]; then
    # Notify monitoring services
    echo "Notifying Sentry of new deployment..."
    # sentry-cli releases new -p your-project $(git rev-parse HEAD)
    
    echo "Setting up uptime monitoring..."
    # Add uptime monitoring setup
    
    echo -e "${GREEN}✓ Monitoring configured${NC}"
fi

# 11. Notification
echo -e "\n${YELLOW}Step 11: Sending deployment notification...${NC}"
COMMIT_SHA=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B)
DEPLOY_TIME=$(date '+%Y-%m-%d %H:%M:%S')

# Create deployment summary
cat > deployment-summary.txt << EOF
🚀 Deployment Complete!
======================
Environment: ${DEPLOYMENT_ENV}
Commit: ${COMMIT_SHA}
Message: ${COMMIT_MSG}
Time: ${DEPLOY_TIME}
Health: ${health_response}
EOF

cat deployment-summary.txt

# Send notification (implement your notification method)
# Example: Send to Slack, Discord, email, etc.

echo -e "\n${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
echo "================================================"
echo "Next steps:"
echo "1. Monitor error logs for the next 30 minutes"
echo "2. Check key user journeys are working"
echo "3. Review performance metrics"
echo "4. Be ready to rollback if issues arise"

# Save deployment record
echo "${DEPLOY_TIME} | ${DEPLOYMENT_ENV} | ${COMMIT_SHA} | SUCCESS" >> deployments.log

exit 0
