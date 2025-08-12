#!/bin/bash

# BookedBarber.com Vercel Deployment Script
# This script automates the deployment process to Vercel

echo "🚀 BookedBarber.com Deployment Script"
echo "====================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

# Build the project first
echo -e "${YELLOW}Building production version...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed! Please fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"
echo ""

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
echo "Please follow the prompts to complete deployment."
echo ""

vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Configure your domain in Vercel dashboard"
    echo "2. Set environment variables in Vercel settings"
    echo "3. Test authentication at https://bookedbarber.com/login"
    echo ""
    echo "Environment variables to set in Vercel:"
    echo "- NEXT_PUBLIC_SUPABASE_URL"
    echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "- SUPABASE_SERVICE_ROLE_KEY"
    echo "- OPENAI_API_KEY"
    echo "- STRIPE_SECRET_KEY"
    echo "- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "- TWILIO_ACCOUNT_SID"
    echo "- TWILIO_AUTH_TOKEN"
    echo "- SENDGRID_API_KEY"
    echo ""
    echo "Visit: https://vercel.com/dashboard to manage your deployment"
else
    echo -e "${RED}Deployment failed. Please check the error messages above.${NC}"
    exit 1
fi