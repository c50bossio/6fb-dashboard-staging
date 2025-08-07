#!/bin/bash
set -e

# Set default values
export CODER_HTTP_ADDRESS="${CODER_HTTP_ADDRESS:-0.0.0.0:7080}"
export CODER_ACCESS_URL="${CODER_ACCESS_URL:-http://localhost:7080}"
export CODER_POSTGRES_URL="${CODER_POSTGRES_URL:-}"

# If no external database, use built-in PostgreSQL
if [ -z "$CODER_POSTGRES_URL" ]; then
    echo "Using built-in PostgreSQL database"
    export CODER_PG_CONNECTION_URL=""
else
    echo "Using external PostgreSQL: $CODER_POSTGRES_URL"
fi

# Set up authentication
export CODER_OAUTH2_GITHUB_CLIENT_ID="${CODER_OAUTH2_GITHUB_CLIENT_ID:-}"
export CODER_OAUTH2_GITHUB_CLIENT_SECRET="${CODER_OAUTH2_GITHUB_CLIENT_SECRET:-}"

# Security settings for production
export CODER_TLS_ENABLE="${CODER_TLS_ENABLE:-false}"
export CODER_WILDCARD_ACCESS_URL="${CODER_WILDCARD_ACCESS_URL:-}"

# Telemetry settings
export CODER_TELEMETRY="${CODER_TELEMETRY:-false}"

echo "🚀 Starting Coder server..."
echo "📍 Access URL: $CODER_ACCESS_URL"
echo "🔗 HTTP Address: $CODER_HTTP_ADDRESS"

# Start Coder server
exec coder server \
    --http-address="$CODER_HTTP_ADDRESS" \
    --access-url="$CODER_ACCESS_URL" \
    --telemetry=false