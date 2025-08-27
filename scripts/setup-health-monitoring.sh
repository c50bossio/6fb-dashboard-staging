#!/bin/bash

# Setup script for Profile Health Monitoring System
# This script configures automated health checks for production deployment

set -e

echo "🏥 Setting up Profile Health Monitoring System"

# Configuration
SERVICE_NAME="profile-health-monitor"
INSTALL_DIR="/var/www/6fb-ai-agent"
LOG_DIR="/var/log/6fb-ai-agent"
CONFIG_DIR="/etc/6fb-ai-agent"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Create system user if it doesn't exist
if ! id "6fb-agent" &>/dev/null; then
    echo "👤 Creating system user '6fb-agent'..."
    useradd --system --no-create-home --shell /usr/sbin/nologin 6fb-agent
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$CONFIG_DIR"
mkdir -p "$INSTALL_DIR/logs/health-checks"

# Set permissions
echo "🔐 Setting permissions..."
chown -R 6fb-agent:6fb-agent "$INSTALL_DIR"
chown -R 6fb-agent:6fb-agent "$LOG_DIR"
chmod 755 "$INSTALL_DIR"
chmod 755 "$LOG_DIR"
chmod 644 "$INSTALL_DIR/scripts"/*

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# Copy service files
echo "⚙️  Installing service configuration..."
cp "$PWD/scripts/profile-health-monitor.service" "/etc/systemd/system/"

# Create default configuration
echo "📝 Creating default configuration..."
cat > "/etc/default/6fb-health-monitor" << EOF
# Profile Health Monitor Configuration
# Generated $(date)

# Health check intervals (seconds)
HEALTH_CHECK_INTERVAL=300
CRITICAL_CHECK_INTERVAL=60

# Thresholds
CRITICAL_HEALTH_THRESHOLD=80
WARNING_HEALTH_THRESHOLD=90

# Auto-fix settings
MAX_AUTO_FIX_COUNT=10
AUTO_FIX_ENABLED=true

# Notification settings (optional)
# SLACK_HEALTH_WEBHOOK=https://hooks.slack.com/services/...
# DISCORD_WEBHOOK=https://discord.com/api/webhooks/...

# Supabase connection (production)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Logging
LOG_LEVEL=info
MAX_LOG_FILES=30
EOF

# Install dependencies
echo "📦 Installing Node.js dependencies..."
cd "$INSTALL_DIR"
if [ -f "package.json" ]; then
    npm install --production
else
    echo "⚠️  Warning: package.json not found. Please ensure dependencies are installed."
fi

# Enable and start service
echo "🚀 Enabling and starting service..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# Create log rotation configuration
echo "📋 Setting up log rotation..."
cat > "/etc/logrotate.d/6fb-health-monitor" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 6fb-agent 6fb-agent
    postrotate
        systemctl reload-or-restart profile-health-monitor
    endscript
}
EOF

# Create monitoring script
echo "🔍 Creating monitoring convenience script..."
cat > "/usr/local/bin/6fb-health" << 'EOF'
#!/bin/bash
# 6FB Health Monitor Control Script

case "$1" in
    status)
        systemctl status profile-health-monitor
        ;;
    start)
        systemctl start profile-health-monitor
        echo "Health monitor started"
        ;;
    stop)
        systemctl stop profile-health-monitor
        echo "Health monitor stopped"
        ;;
    restart)
        systemctl restart profile-health-monitor
        echo "Health monitor restarted"
        ;;
    logs)
        journalctl -u profile-health-monitor -f
        ;;
    check)
        cd /var/www/6fb-ai-agent
        node scripts/automated-health-check.js --once
        ;;
    test)
        cd /var/www/6fb-ai-agent
        node scripts/automated-health-check.js --once --dry-run
        ;;
    *)
        echo "Usage: 6fb-health {status|start|stop|restart|logs|check|test}"
        echo ""
        echo "Commands:"
        echo "  status   - Show service status"
        echo "  start    - Start health monitoring"
        echo "  stop     - Stop health monitoring"
        echo "  restart  - Restart health monitoring"
        echo "  logs     - View live logs"
        echo "  check    - Run one-time health check"
        echo "  test     - Run dry-run health check"
        exit 1
        ;;
esac
EOF

chmod +x "/usr/local/bin/6fb-health"

# Test configuration
echo "🧪 Testing configuration..."
if ! node "$INSTALL_DIR/scripts/automated-health-check.js" --once --dry-run; then
    echo "❌ Configuration test failed. Please check your environment variables."
    exit 1
fi

echo ""
echo "✅ Profile Health Monitoring System installed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Configure environment variables in /etc/default/6fb-health-monitor"
echo "2. Test the configuration: 6fb-health test"
echo "3. Start monitoring: 6fb-health start"
echo ""
echo "🔧 Management commands:"
echo "  6fb-health status   # Check service status"
echo "  6fb-health logs     # View live logs"
echo "  6fb-health check    # Run manual health check"
echo "  6fb-health test     # Test configuration"
echo ""
echo "📊 Monitoring will run every 5 minutes and auto-fix minor issues"
echo "🚨 Configure SLACK_HEALTH_WEBHOOK for alerts"

# Show final status
echo ""
echo "🏥 Service Status:"
systemctl status profile-health-monitor --no-pager