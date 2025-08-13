#!/bin/bash

# Vercel Deployment Setup Script
# This script configures your Vercel project for proper deployment

echo "🚀 Setting up Vercel Deployment Configuration"
echo "============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

echo -e "${GREEN}✅ Vercel CLI is installed${NC}"

# Get Vercel project info
echo -e "\n${YELLOW}📋 Current Vercel Project Configuration:${NC}"
vercel inspect --token=$VERCEL_TOKEN 2>/dev/null || echo "Not linked to Vercel yet"

# Function to add domain
add_domain() {
    local domain=$1
    echo -e "${YELLOW}Adding domain: $domain${NC}"
    vercel domains add $domain --yes 2>/dev/null || echo "Domain may already exist or requires DNS configuration"
}

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local env=$3
    echo -e "${YELLOW}Setting $key for $env environment${NC}"
    vercel env add $key $env --yes < <(echo "$value") 2>/dev/null || echo "Variable may already exist"
}

echo -e "\n${GREEN}1. Setting up Production Domain${NC}"
echo "================================="
add_domain "bookedbarber.com"
add_domain "www.bookedbarber.com"

echo -e "\n${GREEN}2. Setting up Staging Domain${NC}"
echo "=============================="
add_domain "staging.bookedbarber.com"

echo -e "\n${GREEN}3. Configuring Environment Variables${NC}"
echo "======================================"

# Production environment variables
echo -e "\n${YELLOW}Production Environment:${NC}"
set_env_var "NEXT_PUBLIC_ENV" "production" "production"
set_env_var "NEXT_PUBLIC_API_URL" "https://api.bookedbarber.com" "production"
set_env_var "NODE_ENV" "production" "production"

# Staging environment variables
echo -e "\n${YELLOW}Staging Environment:${NC}"
set_env_var "NEXT_PUBLIC_ENV" "staging" "preview"
set_env_var "NEXT_PUBLIC_API_URL" "https://staging-api.bookedbarber.com" "preview"
set_env_var "NODE_ENV" "production" "preview"

# Development environment variables
echo -e "\n${YELLOW}Development Environment:${NC}"
set_env_var "NEXT_PUBLIC_ENV" "development" "development"
set_env_var "NEXT_PUBLIC_API_URL" "http://localhost:8001" "development"
set_env_var "NODE_ENV" "development" "development"

echo -e "\n${GREEN}4. Setting up Git Integration${NC}"
echo "================================"
echo -e "${YELLOW}Configuring production branch...${NC}"
vercel git connect --yes 2>/dev/null || echo "Git may already be connected"

echo -e "\n${GREEN}5. Creating Staging Branch (if needed)${NC}"
echo "========================================"
git show-ref --verify --quiet refs/heads/staging
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Creating staging branch...${NC}"
    git checkout -b staging
    git push -u origin staging
    git checkout main
    echo -e "${GREEN}✅ Staging branch created${NC}"
else
    echo -e "${GREEN}✅ Staging branch already exists${NC}"
fi

echo -e "\n${GREEN}6. Deployment URLs${NC}"
echo "==================="
echo "Production: https://bookedbarber.com"
echo "Staging: https://staging.bookedbarber.com"
echo "Preview: https://[branch]-bookedbarber.vercel.app"

echo -e "\n${GREEN}7. Required GitHub Secrets${NC}"
echo "============================"
echo "Add these secrets to your GitHub repository:"
echo "  - VERCEL_TOKEN (Get from: https://vercel.com/account/tokens)"
echo "  - VERCEL_ORG_ID (Get from: vercel whoami)"
echo "  - VERCEL_PROJECT_ID (Get from: .vercel/project.json)"

# Display project ID if available
if [ -f ".vercel/project.json" ]; then
    echo -e "\n${YELLOW}Your Project Configuration:${NC}"
    cat .vercel/project.json | grep -E '(projectId|orgId)'
fi

echo -e "\n${GREEN}8. DNS Configuration Required${NC}"
echo "==============================="
echo "Add these DNS records to your domain provider:"
echo ""
echo "For bookedbarber.com:"
echo "  Type: A"
echo "  Name: @"
echo "  Value: 76.76.21.21"
echo ""
echo "For www.bookedbarber.com:"
echo "  Type: CNAME"
echo "  Name: www"
echo "  Value: cname.vercel-dns.com"
echo ""
echo "For staging.bookedbarber.com:"
echo "  Type: CNAME"
echo "  Name: staging"
echo "  Value: cname.vercel-dns.com"

echo -e "\n${GREEN}✅ Setup Complete!${NC}"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Add the GitHub secrets listed above"
echo "2. Configure DNS records with your domain provider"
echo "3. Push to main branch to trigger production deployment"
echo "4. Create and push to staging branch for staging deployment"
echo ""
echo "Deployment will happen automatically when you push to:"
echo "  - main → Production (bookedbarber.com)"
echo "  - staging → Staging (staging.bookedbarber.com)"
echo "  - feature/* → Preview deployments"