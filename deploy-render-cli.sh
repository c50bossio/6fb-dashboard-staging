#!/bin/bash

# Render.com CLI Deployment Script
# Run this script to deploy the 6FB AI Agent System to Render

set -e

echo "🚀 Starting Render.com deployment..."

# Check if Render CLI is available
if ! command -v render &> /dev/null; then
    if [ -f "./cli_v2.1.4" ]; then
        echo "Using local Render CLI..."
        RENDER_CLI="./cli_v2.1.4"
    else
        echo "❌ Render CLI not found. Please install it first."
        echo "Run: curl -L -o render-cli.zip https://github.com/render-oss/cli/releases/download/v2.1.4/cli_2.1.4_darwin_arm64.zip"
        echo "Then: unzip render-cli.zip && chmod +x cli_v2.1.4"
        exit 1
    fi
else
    RENDER_CLI="render"
fi

echo "✅ Render CLI found: $RENDER_CLI"

# Check if user is logged in
echo "🔐 Checking authentication..."
if ! $RENDER_CLI whoami &> /dev/null; then
    echo "❌ Not logged in to Render. Logging in..."
    echo "🌐 This will open your browser for authentication..."
    $RENDER_CLI login
    
    # Verify login worked
    if ! $RENDER_CLI whoami &> /dev/null; then
        echo "❌ Login failed. Please try again."
        exit 1
    fi
fi

echo "✅ Authenticated successfully"
$RENDER_CLI whoami

# Create the service using render.yaml
echo "📋 Creating service from render.yaml..."

# Check if render.yaml exists
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found in current directory"
    echo "📁 Current directory: $(pwd)"
    echo "📂 Files: $(ls -la)"
    exit 1
fi

echo "✅ Found render.yaml configuration"
cat render.yaml

echo ""
echo "🚀 Deploying service..."

# Deploy using the render.yaml configuration
$RENDER_CLI services create --from-yaml render.yaml

echo ""
echo "📊 Checking deployment status..."

# List services to show the new deployment
$RENDER_CLI services list

echo ""
echo "🎉 Deployment initiated successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check deployment status in Render dashboard: https://dashboard.render.com"
echo "2. Add environment variables (API keys) via the dashboard"
echo "3. Monitor logs: render logs <service-name>"
echo "4. Test endpoints once deployment completes"
echo ""
echo "🔗 Expected URLs:"
echo "- Backend: https://6fb-ai-backend-staging.onrender.com"
echo "- Health: https://6fb-ai-backend-staging.onrender.com/health"
echo "- Docs: https://6fb-ai-backend-staging.onrender.com/docs"
echo ""
echo "🔑 Don't forget to add these environment variables in Render dashboard:"
echo "- ANTHROPIC_API_KEY"
echo "- OPENAI_API_KEY"
echo "- GOOGLE_AI_API_KEY"
echo "- GOOGLE_CLIENT_ID"
echo "- GOOGLE_CLIENT_SECRET"
echo "- STRIPE_PUBLIC_KEY"
echo "- STRIPE_SECRET_KEY"
echo "- JWT_SECRET_KEY"
echo "- SESSION_SECRET"
echo "- ENCRYPTION_KEY"