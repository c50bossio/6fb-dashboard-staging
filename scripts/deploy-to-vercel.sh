#!/bin/bash

# Vercel Deployment Script for 6FB AI Agent System
# This script sets up environment variables and deploys to Vercel

echo "🚀 6FB AI Agent System - Vercel Deployment"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please ensure .env.production exists with all your production variables"
    exit 1
fi

echo "📝 Setting up Vercel environment variables from .env.production..."
echo ""

# Function to add environment variable to Vercel
add_vercel_env() {
    local key=$1
    local value=$2
    
    # Skip empty values
    if [ -z "$value" ] || [ "$value" = "" ]; then
        echo -e "${YELLOW}⚠️  Skipping $key (empty value)${NC}"
        return
    fi
    
    # Add to production environment
    echo "$value" | vercel env add "$key" production --force 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Added: $key${NC}"
    else
        echo -e "${YELLOW}ℹ️  Already exists or updated: $key${NC}"
    fi
}

# Read .env.production and add each variable to Vercel
echo "Adding environment variables to Vercel..."
echo "----------------------------------------"

while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key == \#* ]] || [ -z "$key" ]; then
        continue
    fi
    
    # Remove quotes from value if present
    value="${value%\"}"
    value="${value#\"}"
    
    # Skip section headers (lines with only comments)
    if [[ $key == *"="* ]] && [[ ! $key == *" "* ]]; then
        add_vercel_env "$key" "$value"
    fi
done < .env.production

echo ""
echo "✅ Environment variables configured!"
echo ""

# Check if this is linked to a Vercel project
echo "🔗 Checking Vercel project link..."
if vercel link --yes 2>/dev/null; then
    echo -e "${GREEN}✅ Project linked to Vercel${NC}"
else
    echo "Setting up new Vercel project..."
    vercel link
fi

echo ""
echo "🏗️  Starting deployment to Vercel..."
echo "----------------------------------------"

# Deploy to production
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Visit your production URL to test the deployment"
    echo "2. Configure your custom domain (bookedbarber.com) in Vercel dashboard"
    echo "3. Test the booking flow with a real payment"
    echo "4. Monitor the deployment at: https://vercel.com/dashboard"
else
    echo ""
    echo -e "${RED}❌ Deployment failed!${NC}"
    echo "Please check the error messages above and try again."
    exit 1
fi

echo ""
echo "📊 Deployment Summary"
echo "===================="
echo "Project: 6FB AI Agent System"
echo "Domain: bookedbarber.com (needs configuration)"
echo "Status: LIVE"
echo ""