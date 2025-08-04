#!/bin/bash
set -e

echo "🚀 Deploying Coder to Railway Cloud"
echo "=================================="

# Check if already authenticated
if railway whoami &> /dev/null; then
    echo "✅ Already authenticated with Railway: $(railway whoami)"
else
    echo "🔐 Please authenticate with Railway first:"
    echo "   Open a new terminal and run: railway login"
    echo "   Then come back and run this script again."
    exit 1
fi

echo "📦 Creating Railway project..."
PROJECT_NAME="coder-6fb-$(date +%s)"
railway init --name "$PROJECT_NAME"

echo "⚙️ Setting environment variables..."
railway variables set CODER_TELEMETRY=false
railway variables set PORT=7080  
railway variables set CODER_HTTP_ADDRESS="0.0.0.0:7080"

echo "🚀 Starting deployment..."
railway up --detach

echo "⏳ Waiting for deployment to initialize..."
sleep 20

echo "🌐 Getting deployment information..."
railway status

echo ""
echo "🎉 Deployment initiated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 2-3 minutes for the service to fully start"
echo "2. Run 'railway status' to get your deployment URL"
echo "3. Visit the URL to set up your Coder admin account"
echo "4. Start coding from any device!"
echo ""
echo "💡 To get your URL anytime: railway status"