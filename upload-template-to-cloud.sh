#!/bin/bash

echo "=== 6FB AI Agent Template Upload Script ==="
echo ""
echo "📋 Instructions:"
echo "1. In your browser, go to: http://143.244.173.119/cli-auth"
echo "2. Copy the CLI authentication token"
echo "3. Run this script with the token as an argument"
echo ""
echo "Usage: ./upload-template-to-cloud.sh <YOUR_TOKEN>"
echo ""

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your CLI authentication token"
    echo "   Get it from: http://143.244.173.119/cli-auth"
    exit 1
fi

TOKEN="$1"
TEMPLATE_DIR="/Users/bossio/6FB AI Agent System/coder-templates/6fb-ai-agent"

echo "🔑 Authenticating with cloud Coder instance..."
echo "$TOKEN" | coder login http://143.244.173.119

echo ""
echo "📤 Uploading 6FB AI Agent template..."
cd "$TEMPLATE_DIR"
coder templates push 6fb-ai-agent

echo ""
echo "✅ Template upload completed!"
echo ""
echo "🚀 Next steps:"
echo "1. Go back to your browser: http://143.244.173.119"
echo "2. Click 'Workspaces' → 'Create Workspace'"
echo "3. Select '6fb-ai-agent' template"
echo "4. Create your workspace and start coding!"
echo ""
echo "🎯 Once your workspace is created, you'll have:"
echo "   • VS Code in browser (code-server)"
echo "   • Node.js + Python development environment"
echo "   • Your 6FB AI Agent System project pre-loaded"
echo "   • Frontend on port 9999, Backend on port 8001"