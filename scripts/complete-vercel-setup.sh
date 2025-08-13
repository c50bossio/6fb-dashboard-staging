#!/bin/bash

# Complete Vercel Setup - Final Configuration
echo "🎯 Completing Vercel Deployment Setup"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Current Configuration:${NC}"
echo "Project: bookedbarber-app"
echo "Team: 6fb"
echo "GitHub: c50bossio/6fb-dashboard-staging"
echo "Current URL: https://bookedbarber-k7n0wgcz0-6fb.vercel.app"

echo -e "\n${GREEN}✅ What's Already Done:${NC}"
echo "• Vercel project created and linked"
echo "• GitHub repository connected"
echo "• Staging branch exists"
echo "• Deployment pipeline ready"
echo "• GitHub Actions workflow configured"

echo -e "\n${YELLOW}🔧 Manual Steps Required:${NC}"
echo ""
echo "1. Add Production Domain:"
echo "   → Go to: https://vercel.com/6fb/bookedbarber-app/settings/domains"
echo "   → Add: bookedbarber.com"
echo "   → Add: www.bookedbarber.com"
echo ""
echo "2. Configure DNS Records:"
echo "   → Type: A, Name: @, Value: 76.76.21.21"
echo "   → Type: CNAME, Name: www, Value: cname.vercel-dns.com"
echo ""
echo "3. Add GitHub Secrets:"
echo "   → Go to: https://github.com/c50bossio/6fb-dashboard-staging/settings/secrets/actions"
echo "   → Add: VERCEL_TOKEN (get from vercel.com/account/tokens)"
echo "   → Add: VERCEL_ORG_ID=team_EWNbQ0KmQeOpej81bL7TINVY"
echo "   → Add: VERCEL_PROJECT_ID=prj_KIHvAYXDWJViEh8lF7yLSAxIs8mB"
echo ""
echo "4. Set Environment Variables:"
echo "   → Go to: https://vercel.com/6fb/bookedbarber-app/settings/environment-variables"
echo "   → Add production environment variables (see VERCEL_DEPLOYMENT_SETUP.md)"

echo -e "\n${GREEN}🚀 After Manual Setup, Test With:${NC}"
echo "git push origin main    # Deploy to production"
echo "git push origin staging # Deploy to staging"

echo -e "\n${BLUE}📚 Full Documentation:${NC}"
echo "See: ./VERCEL_DEPLOYMENT_SETUP.md"

echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo "After manual configuration, automatic deployments will work:"
echo "• main branch → https://bookedbarber.com"
echo "• staging branch → Preview URL"
echo "• feature branches → Preview URLs"