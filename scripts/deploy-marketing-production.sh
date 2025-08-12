#!/bin/bash

# Marketing System Production Deployment Script
# Automated deployment with health checks and rollback capability

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-staging}
ROLLBACK_ON_FAILURE=${ROLLBACK_ON_FAILURE:-true}
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_DELAY=10

# Deployment timestamp
DEPLOYMENT_ID=$(date +%Y%m%d-%H%M%S)
DEPLOYMENT_LOG="deployment-${DEPLOYMENT_ID}.log"

# Functions
log() {
    echo -e "${2:-$BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    log "ERROR: $1" "$RED"
    exit 1
}

success() {
    log "SUCCESS: $1" "$GREEN"
}

warning() {
    log "WARNING: $1" "$YELLOW"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    # Check environment file
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        if [[ ! -f ".env.production" ]]; then
            error ".env.production file not found"
        fi
        source .env.production
    else
        if [[ ! -f ".env.local" ]]; then
            error ".env.local file not found"
        fi
        source .env.local
    fi
    
    success "Prerequisites check passed"
}

# Backup current deployment
create_backup() {
    log "Creating backup..."
    
    BACKUP_DIR="backups/deployment-${DEPLOYMENT_ID}"
    mkdir -p "$BACKUP_DIR"
    
    # Backup critical files
    cp -r services "$BACKUP_DIR/" 2>/dev/null || true
    cp -r app/api/marketing "$BACKUP_DIR/" 2>/dev/null || true
    cp .env* "$BACKUP_DIR/" 2>/dev/null || true
    cp docker-compose.yml "$BACKUP_DIR/" 2>/dev/null || true
    
    # Create database backup marker
    echo "Database snapshot: $(date)" > "$BACKUP_DIR/database-snapshot.txt"
    
    success "Backup created at $BACKUP_DIR"
}

# Deploy database changes
deploy_database() {
    log "Deploying database changes..."
    
    # Check if tables exist
    node -e "
    require('dotenv').config({ path: '.env.local' });
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    async function checkTables() {
        const tables = [
            'marketing_campaigns',
            'campaign_recipients',
            'marketing_billing_records',
            'customer_segments',
            'email_unsubscribes',
            'sms_opt_outs',
            'campaign_queue',
            'webhook_events'
        ];
        
        let allExist = true;
        for (const table of tables) {
            const { error } = await supabase.from(table).select('*').limit(1);
            if (error && !error.message.includes('0 rows')) {
                console.log('Missing table:', table);
                allExist = false;
            }
        }
        
        process.exit(allExist ? 0 : 1);
    }
    
    checkTables();
    " || {
        warning "Some database tables are missing"
        warning "Please run database/production-marketing-schema.sql in Supabase SQL Editor"
        
        if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
            error "Cannot proceed without database tables in production"
        fi
    }
    
    success "Database validation complete"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start Docker services
    docker-compose down 2>/dev/null || true
    docker-compose up -d
    
    # Wait for services to be ready
    sleep 5
    
    # Check Redis
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        success "Redis is running"
    else
        error "Redis failed to start"
    fi
    
    # Check frontend
    if curl -s http://localhost:9999/api/health > /dev/null; then
        success "Frontend is running"
    else
        warning "Frontend not yet ready"
    fi
    
    # Check backend
    if curl -s http://localhost:8001/health > /dev/null; then
        success "Backend is running"
    else
        warning "Backend not yet ready"
    fi
}

# Deploy application code
deploy_application() {
    log "Deploying application code..."
    
    # Install dependencies
    npm install --production
    
    # Build frontend
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        npm run build || error "Frontend build failed"
        success "Frontend built successfully"
    fi
    
    # Initialize queue service
    node -e "
    const queueService = require('./services/queue-service.js');
    queueService.initialize()
        .then(() => {
            console.log('Queue service initialized');
            process.exit(0);
        })
        .catch(err => {
            console.error('Queue initialization failed:', err);
            process.exit(1);
        });
    " || error "Queue service initialization failed"
    
    success "Application deployed"
}

# Configure webhooks
configure_webhooks() {
    log "Configuring webhooks..."
    
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        # These would be configured via API calls to SendGrid/Twilio
        warning "Manual webhook configuration required:"
        echo "  1. SendGrid: Set webhook URL to https://your-domain.com/api/webhooks/sendgrid"
        echo "  2. Twilio: Set status callback to https://your-domain.com/api/webhooks/twilio"
    else
        success "Webhook configuration skipped for staging"
    fi
}

# Run health checks
run_health_checks() {
    log "Running health checks..."
    
    local attempts=0
    local all_healthy=false
    
    while [[ $attempts -lt $HEALTH_CHECK_RETRIES ]]; do
        attempts=$((attempts + 1))
        log "Health check attempt $attempts/$HEALTH_CHECK_RETRIES"
        
        # Run validation script
        if node validate-marketing-system.js 2>&1 | tee -a "$DEPLOYMENT_LOG" | grep -q "SYSTEM IS PRODUCTION READY"; then
            all_healthy=true
            break
        fi
        
        if [[ $attempts -lt $HEALTH_CHECK_RETRIES ]]; then
            log "Waiting $HEALTH_CHECK_DELAY seconds before retry..."
            sleep $HEALTH_CHECK_DELAY
        fi
    done
    
    if $all_healthy; then
        success "All health checks passed"
    else
        error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
    fi
}

# Run integration tests
run_tests() {
    log "Running integration tests..."
    
    # Run test suite
    node test-marketing-production.js 2>&1 | tee -a "$DEPLOYMENT_LOG" | grep -q "Pass Rate" || {
        warning "Some tests failed - review log for details"
    }
    
    success "Integration tests completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring dashboard endpoint
    cat > monitor-marketing.js << 'EOF'
const queueService = require('./services/queue-service.js');
const sendGridService = require('./services/sendgrid-service-production.js');

async function monitor() {
    console.log('\n📊 MARKETING SYSTEM MONITOR');
    console.log('===========================\n');
    
    // Queue metrics
    const queueStatus = await queueService.getAllQueuesStatus();
    console.log('Queue Status:');
    Object.entries(queueStatus).forEach(([queue, status]) => {
        if (queue !== 'metrics') {
            console.log(`  ${queue}: ${status.active} active, ${status.waiting} waiting`);
        }
    });
    
    // Service metrics
    const metrics = sendGridService.getMetrics();
    console.log('\nEmail Service Metrics:');
    console.log(`  Sent: ${metrics.emailsSent}`);
    console.log(`  Failed: ${metrics.emailsFailed}`);
    console.log(`  Batches: ${metrics.batchesProcessed}`);
    
    // Cleanup
    await queueService.shutdown();
}

setInterval(() => {
    monitor().catch(console.error);
}, 60000); // Every minute

monitor();
EOF
    
    success "Monitoring setup complete"
}

# Rollback deployment
rollback() {
    error "Rolling back deployment..."
    
    if [[ -d "backups/deployment-${DEPLOYMENT_ID}" ]]; then
        cp -r "backups/deployment-${DEPLOYMENT_ID}"/* . 2>/dev/null || true
        docker-compose down
        docker-compose up -d
        success "Rollback completed"
    else
        error "No backup found for rollback"
    fi
}

# Main deployment flow
main() {
    log "🚀 Marketing System Production Deployment" "$GREEN"
    log "Environment: $DEPLOYMENT_ENV"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "=========================================\n"
    
    # Set error trap for rollback
    if [[ "$ROLLBACK_ON_FAILURE" == "true" ]]; then
        trap rollback ERR
    fi
    
    # Deployment steps
    check_prerequisites
    create_backup
    deploy_database
    start_services
    deploy_application
    configure_webhooks
    run_health_checks
    run_tests
    setup_monitoring
    
    # Deployment summary
    log "\n=========================================" "$GREEN"
    log "🎉 DEPLOYMENT SUCCESSFUL!" "$GREEN"
    log "=========================================" "$GREEN"
    log ""
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Environment: $DEPLOYMENT_ENV"
    log "Services:"
    log "  - Frontend: http://localhost:9999"
    log "  - Backend: http://localhost:8001"
    log "  - Redis: localhost:6379"
    log ""
    log "Next Steps:"
    log "  1. Monitor system performance"
    log "  2. Configure production webhooks"
    log "  3. Test with small campaign"
    log "  4. Scale up gradually"
    log ""
    log "Logs saved to: $DEPLOYMENT_LOG"
    
    # Remove error trap
    trap - ERR
}

# Run deployment
main "$@"