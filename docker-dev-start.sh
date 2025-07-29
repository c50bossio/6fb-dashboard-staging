#!/bin/bash

echo "🐳 Starting 6FB AI Agent System Development Environment..."

# Create data directory for SQLite database
mkdir -p data

# Stop any existing containers
docker-compose down

# Build and start services
docker-compose up --build -d

echo "✅ Services started successfully!"
echo ""
echo "🌐 Frontend: http://localhost:9999"
echo "🔧 Backend API: http://localhost:8001"
echo "📊 API Docs: http://localhost:8001/docs"
echo ""
echo "📋 Useful commands:"
echo "  docker-compose logs -f          # View logs"
echo "  docker-compose down             # Stop services"
echo "  docker-compose restart          # Restart services"
echo ""
echo "🎯 Ready for development!"