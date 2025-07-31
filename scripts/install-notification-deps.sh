#!/bin/bash

# Install Notification Dependencies Script
# Installs required packages for real email and SMS notifications

echo "🔧 Installing notification dependencies..."

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "📦 Installing in Docker container..."
    pip install aiosmtplib==3.0.1 httpx==0.25.2 jinja2==3.1.2
else
    echo "🐳 Installing in Docker container via docker exec..."
    docker exec agent-system-backend-dev pip install aiosmtplib==3.0.1 httpx==0.25.2 jinja2==3.1.2
fi

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Configure your .env file with email/SMS credentials"
    echo "2. Restart the backend: docker-compose restart backend"
    echo "3. Test notifications at: http://localhost:9999/dashboard/notifications"
    echo ""
    echo "📖 See NOTIFICATION_SETUP.md for detailed configuration guide"
else
    echo "❌ Installation failed. Check Docker containers are running:"
    echo "   docker-compose ps"
    exit 1
fi