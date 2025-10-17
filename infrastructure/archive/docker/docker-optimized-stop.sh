#!/bin/bash

# Optimized Docker Stop Script for 6FB AI Agent System

set -e

echo "🛑 Stopping 6FB AI Agent System..."

# Stop containers gracefully
docker compose -f docker-compose.optimized.yml stop

# Remove containers but preserve volumes
docker compose -f docker-compose.optimized.yml down

echo "✅ Services stopped successfully!"
echo ""
echo "📊 Resources freed:"
docker system df
echo ""
echo "💡 To completely remove all data and volumes, run:"
echo "   docker compose -f docker-compose.optimized.yml down -v"