#!/bin/bash

echo "🚀 Quick Template Upload to Cloud Coder"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "coder-templates/6fb-ai-agent" ]; then
    echo "❌ Error: Template directory not found"
    echo "   Please run this from: /Users/bossio/6FB AI Agent System/"
    exit 1
fi

echo "📋 Step 1: Get your CLI token"
echo "   1. Open: http://143.244.173.119/cli-auth"
echo "   2. Copy the token that appears"
echo "   3. Paste it below when prompted"
echo ""

# Interactive token input
echo "🔑 Authenticating with cloud Coder..."
coder login http://143.244.173.119

echo ""
echo "📤 Step 2: Upload template"
cd coder-templates/6fb-ai-agent

echo "Uploading 6FB AI Agent template..."
coder templates push 6fb-ai-agent --yes

echo ""
echo "✅ Template uploaded successfully!"
echo ""
echo "🎯 Next steps:"
echo "   1. Go to: http://143.244.173.119"
echo "   2. Click 'Workspaces' → 'Create Workspace'" 
echo "   3. Select '6fb-ai-agent' template"
echo "   4. Create your workspace!"
echo ""
echo "🌟 Your workspace will include:"
echo "   • VS Code Server (browser-based)"
echo "   • Node.js + Python development environment"
echo "   • FastAPI backend setup"
echo "   • Pre-configured development tools"