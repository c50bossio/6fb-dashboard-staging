#!/bin/bash
set -e

echo "🌊 DigitalOcean Coder Setup Guide"
echo "================================="

# Check if doctl is installed
if command -v doctl &> /dev/null; then
    echo "✅ DigitalOcean CLI (doctl) is installed"
else
    echo "❌ DigitalOcean CLI not found"
    echo "Installing doctl..."
    brew install doctl
    echo "✅ doctl installed successfully"
fi

# Check if authenticated
if doctl account get &> /dev/null; then
    echo "✅ Already authenticated with DigitalOcean"
    echo "Account: $(doctl account get --format Email --no-header)"
    echo ""
    echo "🚀 Ready to deploy! Run:"
    echo "   ./deploy-digitalocean-auto.sh"
else
    echo ""
    echo "🔑 Authentication Required"
    echo "========================="
    echo ""
    echo "Step 1: Get your DigitalOcean API token"
    echo "   • Go to: https://cloud.digitalocean.com/account/api/tokens"
    echo "   • Click 'Generate New Token'"
    echo "   • Name: 'Coder Deployment'"
    echo "   • Permissions: Read & Write"
    echo "   • Copy the token"
    echo ""
    echo "Step 2: Authenticate doctl"
    echo "   Run: doctl auth init"
    echo "   Paste your token when prompted"
    echo ""
    echo "Step 3: Deploy"
    echo "   Run: ./deploy-digitalocean-auto.sh"
    echo ""
    echo "💡 Want me to open the token page?"
    read -p "Press Y to open token page, or any key to continue: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "https://cloud.digitalocean.com/account/api/tokens"
    fi
fi