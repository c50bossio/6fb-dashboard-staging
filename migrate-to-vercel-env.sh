#!/bin/bash

# Script to migrate environment variables to Vercel
# This helps move secrets from .env.vercel.production to Vercel's secure environment

echo "🔐 Vercel Environment Variable Migration Tool"
echo "============================================"
echo ""
echo "This script will help you add your production secrets to Vercel."
echo "You'll need to have the Vercel CLI installed and be logged in."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed."
    echo "Install it with: npm i -g vercel"
    echo "Then login with: vercel login"
    exit 1
fi

# Check if .env.vercel.production exists
if [ ! -f ".env.vercel.production" ]; then
    echo "❌ .env.vercel.production file not found"
    exit 1
fi

echo "📋 Found the following environment variables to migrate:"
echo ""

# Parse and display variables (without showing values)
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ "$key" =~ ^#.*$ ]] || [ -z "$key" ]; then
        continue
    fi
    
    # Clean the key name
    key=$(echo "$key" | xargs)
    
    # Display the key (hiding the value for security)
    echo "  • $key"
done < .env.vercel.production

echo ""
echo "📝 To add these to Vercel, you have two options:"
echo ""
echo "OPTION 1: Use Vercel Dashboard (Recommended)"
echo "--------------------------------------------"
echo "1. Go to: https://vercel.com/dashboard"
echo "2. Select your project: 6fb-dashboard-staging"
echo "3. Go to Settings → Environment Variables"
echo "4. Add each variable with these settings:"
echo "   - Key: [variable name]"
echo "   - Value: [variable value from .env.vercel.production]"
echo "   - Environment: ✓ Production, ✓ Preview, ✓ Development"
echo ""

echo "OPTION 2: Use Vercel CLI Commands"
echo "----------------------------------"
echo "Run these commands (you'll need to replace the values):"
echo ""

# Generate Vercel CLI commands
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ "$key" =~ ^#.*$ ]] || [ -z "$key" ]; then
        continue
    fi
    
    # Clean the key name
    key=$(echo "$key" | xargs)
    
    # Remove quotes and newlines from value
    value=$(echo "$value" | sed 's/^"//;s/"$//' | tr -d '\n' | xargs)
    
    # Create the Vercel command (showing placeholder for security)
    echo "vercel env add $key production"
    
done < .env.vercel.production

echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "----------------------------"
echo "1. After adding to Vercel, we'll remove .env.vercel.production from the repo"
echo "2. Consider rotating these API keys after migration:"
echo "   - ANTHROPIC_API_KEY"
echo "   - GOOGLE_CLIENT_SECRET"
echo "   - STRIPE_SECRET_KEY"
echo "   - TWILIO_AUTH_TOKEN"
echo "   - SENDGRID_API_KEY"
echo ""
echo "3. Never commit .env files with real secrets to git"
echo ""

read -p "Have you added all variables to Vercel? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "✅ Great! Now let's remove the file from git tracking:"
    echo ""
    echo "Run these commands:"
    echo "  git rm --cached .env.vercel.production"
    echo "  git commit -m 'chore: remove production secrets from repository'"
    echo "  git push"
    echo ""
    echo "The file will remain on your local system but won't be in the repository."
else
    echo ""
    echo "👍 No problem! Add the variables to Vercel first, then run this script again."
fi