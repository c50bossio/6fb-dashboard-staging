#!/bin/bash
set -e

echo "🚀 Deploying Coder (Authentication Required)"
echo "============================================"

echo "🔑 Step 1: Authenticate with Railway"
echo "Please run this in a NEW terminal window:"
echo "  railway login"
echo ""
echo "Then press ENTER here to continue..."
read -p "Press ENTER after you've authenticated with Railway: "

# Check authentication
if ! railway whoami &> /dev/null; then
    echo "❌ Authentication failed. Please run 'railway login' in a new terminal."
    exit 1
fi

echo "✅ Authenticated as: $(railway whoami)"

echo "📦 Creating Railway project..."
PROJECT_NAME="coder-6fb-$(date +%s)"
railway init --name "$PROJECT_NAME"

echo "⚙️ Setting environment variables..."
railway variables set CODER_TELEMETRY=false
railway variables set PORT=7080
railway variables set CODER_HTTP_ADDRESS="0.0.0.0:7080"

echo "🚀 Deploying to Railway..."
railway up --detach

echo "⏳ Getting deployment status..."
sleep 10
railway status

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Wait 2-3 minutes for service to fully start"
echo "2. Visit your Railway URL (shown above)"
echo "3. Create your Coder admin account"
echo "4. Start coding from any device!"