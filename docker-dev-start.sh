#!/bin/bash
# Legacy compatibility script - redirects to new infrastructure
# This file maintains backward compatibility while using the new consolidated infrastructure

echo "🔄 Redirecting to new consolidated infrastructure..."
echo "Using: infrastructure/deploy.sh dev docker"
echo ""

exec ./infrastructure/deploy.sh dev docker "$@"