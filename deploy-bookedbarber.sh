#!/bin/bash

# Deploy to bookedbarber.com via Vercel
# Usage: ./deploy-bookedbarber.sh

echo "🚀 Deploying to bookedbarber.com via Vercel"
echo "============================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Build the project first
echo "📦 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to Vercel
echo "🔄 Deploying to Vercel..."
echo ""
echo "IMPORTANT: During deployment, Vercel will ask you to:"
echo "1. Log in (if not already logged in)"
echo "2. Set up and deploy the project"
echo "3. Link to existing project or create new one"
echo ""
echo "Choose these options:"
echo "- Set up and deploy: Y"
echo "- Which scope: Choose your account"
echo "- Link to existing project: N (first time) or Y (if already exists)"
echo "- Project name: bookedbarber"
echo "- Directory: ./ (current directory)"
echo "- Override settings: N"
echo ""

# Deploy to production
vercel --prod

echo ""
echo "============================================"
echo "📝 NEXT STEPS TO COMPLETE SETUP:"
echo "============================================"
echo ""
echo "1. ADD ENVIRONMENT VARIABLES IN VERCEL:"
echo "   - Go to: https://vercel.com/your-account/bookedbarber/settings/environment-variables"
echo "   - Add all variables from .env.production file"
echo "   - Especially add your OPENAI_API_KEY and ANTHROPIC_API_KEY for AI features"
echo ""
echo "2. CONFIGURE CUSTOM DOMAIN (bookedbarber.com):"
echo "   - Go to: https://vercel.com/your-account/bookedbarber/settings/domains"
echo "   - Add domain: bookedbarber.com"
echo "   - Add domain: www.bookedbarber.com"
echo ""
echo "3. UPDATE YOUR DNS RECORDS:"
echo "   Add these records to your domain provider (GoDaddy, Namecheap, etc.):"
echo ""
echo "   For bookedbarber.com (root domain):"
echo "   Type: A"
echo "   Name: @"
echo "   Value: 76.76.21.21"
echo ""
echo "   For www.bookedbarber.com:"
echo "   Type: CNAME"
echo "   Name: www"
echo "   Value: cname.vercel-dns.com"
echo ""
echo "4. WAIT FOR DNS PROPAGATION:"
echo "   - DNS changes can take 5 minutes to 48 hours"
echo "   - Vercel will automatically provision SSL certificate"
echo ""
echo "5. VERIFY DEPLOYMENT:"
echo "   - Your app is immediately available at: https://bookedbarber.vercel.app"
echo "   - Once DNS propagates: https://bookedbarber.com"
echo ""
echo "============================================"
echo "✅ Deployment script completed!"
echo "============================================"