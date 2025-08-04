#!/bin/bash
set -e

echo "🚀 One-Click Coder Cloud Deployment"
echo "===================================="

cd "$(dirname "$0")"

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    echo "📦 Installing jq for JSON parsing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    else
        sudo apt-get update && sudo apt-get install -y jq
    fi
fi

echo "🔐 Authenticating with Railway..."
railway login

echo "📦 Creating Railway project..."
railway init --name "coder-6fb-$(date +%s)"

echo "⚙️ Setting environment variables..."
railway variables set CODER_TELEMETRY=false
railway variables set PORT=7080
railway variables set CODER_HTTP_ADDRESS="0.0.0.0:7080"

echo "🚀 Deploying to Railway..."
railway up --detach

echo "⏳ Waiting for deployment..."
sleep 30

echo "🌐 Getting deployment URL..."
URL=$(railway status --json | jq -r '.deployments[0].url // empty')

if [ -n "$URL" ] && [ "$URL" != "null" ]; then
    echo ""
    echo "🎉 SUCCESS! Your Coder instance is deploying..."
    echo "📍 URL: $URL"
    echo ""
    echo "⏰ Allow 2-3 minutes for full startup, then:"
    echo "1. Visit the URL above"
    echo "2. Create your admin account"
    echo "3. Start coding from any device!"
    echo ""
    
    # Open in browser
    if command -v open &> /dev/null; then
        open "$URL"
    fi
else
    echo "⚠️ Check Railway dashboard: https://railway.app/dashboard"
fi