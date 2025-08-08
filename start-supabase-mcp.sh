#!/bin/bash

# Start Supabase MCP Server for Claude Code
echo "🚀 Starting Supabase MCP Server..."
echo "=================================="

# Load environment variables
source .env.local

# Verify required environment variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN not found in .env.local"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    exit 1
fi

# Extract project reference from URL (macOS compatible)
PROJECT_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed -n 's/https:\/\/\([^.]*\).*/\1/p')

echo "✅ Project Reference: $PROJECT_REF"
echo "✅ Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo "✅ Access Token: ${SUPABASE_ACCESS_TOKEN:0:20}..."
echo ""

# Set environment variable and start the server
export SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN"

echo "📡 Starting MCP Server (use Ctrl+C to stop)..."
echo "🔗 Claude Code will now have access to 19+ database tools!"
echo ""

# Start the MCP server
npx mcp-server-supabase --access-token "$SUPABASE_ACCESS_TOKEN" --project-ref "$PROJECT_REF"