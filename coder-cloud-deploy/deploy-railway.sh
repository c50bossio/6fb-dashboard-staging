#!/bin/bash
set -e

echo "🚄 Deploying Coder to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    
    # Install Railway CLI
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -fsSL https://railway.app/install.sh | sh
    else
        # Linux
        curl -fsSL https://railway.app/install.sh | sh
    fi
    
    echo "✅ Railway CLI installed"
fi

# Login to Railway
echo "🔐 Please login to Railway..."
railway login

# Create new project or link existing
echo "📦 Setting up Railway project..."
if [ -f "railway.toml" ]; then
    echo "Using existing Railway project"
else
    railway init
fi

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set CODER_TELEMETRY=false
railway variables set PORT=7080

# Deploy
echo "🚀 Deploying to Railway..."
railway up --detach

# Get deployment URL
echo "🌐 Getting deployment URL..."
RAILWAY_URL=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)

if [ -n "$RAILWAY_URL" ]; then
    echo ""
    echo "🎉 Deployment successful!"
    echo "📍 Your Coder instance is available at: $RAILWAY_URL"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Wait 2-3 minutes for the service to fully start"
    echo "2. Visit $RAILWAY_URL to set up your admin account"
    echo "3. Upload your 6FB AI Agent template"
    echo "4. Create workspaces and code from anywhere!"
    echo ""
    echo "💡 Save this URL - you can access it from any device!"
else
    echo "❌ Could not retrieve deployment URL. Check Railway dashboard."
fi