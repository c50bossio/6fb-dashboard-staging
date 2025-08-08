#!/bin/bash

# 6FB AI Agent System - Start Monitoring Stack
# Comprehensive monitoring stack startup with health validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
MONITORING_DIR="${PROJECT_ROOT}/monitoring"

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running"
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose > /dev/null 2>&1; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    # Check if monitoring directory exists
    if [[ ! -d "$MONITORING_DIR" ]]; then
        log_error "Monitoring directory not found: $MONITORING_DIR"
        exit 1
    fi
    
    # Check if .env.production exists (for passwords)
    if [[ ! -f "${PROJECT_ROOT}/.env.production" ]]; then
        log_warning ".env.production not found, using default passwords"
        log_info "Copy .env.production.template to .env.production for production deployment"
    fi
    
    log_success "Prerequisites check passed"
}

# Setup monitoring configuration
setup_monitoring_config() {
    log_info "Setting up monitoring configuration..."
    
    cd "$MONITORING_DIR"
    
    # Create necessary directories
    mkdir -p prometheus/rules
    mkdir -p grafana/provisioning/datasources
    mkdir -p grafana/provisioning/dashboards
    mkdir -p alertmanager
    mkdir -p blackbox
    mkdir -p postgres-exporter
    
    # Set proper permissions for Grafana
    if [[ -d "grafana" ]]; then
        # Grafana runs as user 472
        sudo chown -R 472:472 grafana/provisioning 2>/dev/null || {
            log_warning "Could not set Grafana permissions, may need manual setup"
        }
    fi
    
    log_success "Monitoring configuration setup completed"
}

# Start monitoring stack
start_monitoring_stack() {
    log_info "Starting monitoring stack..."
    
    cd "$MONITORING_DIR"
    
    # Load environment variables if available
    if [[ -f "${PROJECT_ROOT}/.env.production" ]]; then
        source "${PROJECT_ROOT}/.env.production"
        export GRAFANA_PASSWORD POSTGRES_PASSWORD REDIS_PASSWORD
    fi
    
    # Start monitoring services
    docker-compose -f docker-compose.monitoring.yml up -d --build
    
    log_success "Monitoring stack started"
}

# Wait for services to be healthy
wait_for_services() {
    log_info "Waiting for monitoring services to be ready..."
    
    local services=("prometheus:9090" "grafana:3001" "alertmanager:9093" "node-exporter:9100")
    local timeout=300  # 5 minutes
    local elapsed=0
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        log_info "Waiting for $service on port $port..."
        
        local service_ready=false
        local service_timeout=60
        local service_elapsed=0
        
        while [[ $service_elapsed -lt $service_timeout ]]; do
            if curl -s "http://localhost:$port" > /dev/null 2>&1; then
                log_success "$service is ready"
                service_ready=true
                break
            fi
            
            sleep 5
            service_elapsed=$((service_elapsed + 5))
            echo -n "."
        done
        
        echo ""
        
        if [[ $service_ready == false ]]; then
            log_error "$service failed to start within ${service_timeout}s"
            # Show logs for debugging
            docker-compose -f docker-compose.monitoring.yml logs --tail=20 "$service"
            return 1
        fi
    done
    
    log_success "All monitoring services are ready"
}

# Validate monitoring setup
validate_monitoring() {
    log_info "Validating monitoring setup..."
    
    # Check Prometheus targets
    local prometheus_targets
    prometheus_targets=$(curl -s "http://localhost:9090/api/v1/targets" | jq -r '.data.activeTargets | length' 2>/dev/null || echo "0")
    
    if [[ $prometheus_targets -gt 0 ]]; then
        log_success "Prometheus has $prometheus_targets active targets"
    else
        log_warning "Prometheus has no active targets"
    fi
    
    # Check Grafana datasources
    if curl -s -u "admin:${GRAFANA_PASSWORD:-admin123}" "http://localhost:3001/api/datasources" | grep -q "prometheus"; then
        log_success "Grafana Prometheus datasource configured"
    else
        log_warning "Grafana Prometheus datasource not found"
    fi
    
    # Check Alertmanager config
    if curl -s "http://localhost:9093/api/v1/status" | grep -q "ready"; then
        log_success "Alertmanager is ready"
    else
        log_warning "Alertmanager may not be properly configured"
    fi
    
    log_success "Monitoring validation completed"
}

# Display monitoring information
display_monitoring_info() {
    log_info ""
    log_success "🚀 6FB AI Agent System Monitoring Stack Started Successfully!"
    log_info ""
    log_info "📊 Monitoring Services:"
    log_info "   Prometheus:    http://localhost:9090"
    log_info "   Grafana:       http://localhost:3001 (admin/${GRAFANA_PASSWORD:-admin123})"
    log_info "   Alertmanager:  http://localhost:9093"
    log_info "   Node Exporter: http://localhost:9100"
    log_info "   cAdvisor:      http://localhost:8080"
    log_info ""
    log_info "🔧 Useful Commands:"
    log_info "   View logs:     docker-compose -f monitoring/docker-compose.monitoring.yml logs -f"
    log_info "   Stop stack:    docker-compose -f monitoring/docker-compose.monitoring.yml down"
    log_info "   Restart:       ${BASH_SOURCE[0]}"
    log_info ""
    log_info "📈 Default Dashboards:"
    log_info "   Main Dashboard: Grafana > Dashboards > 6FB AI Agent System"
    log_info "   System Metrics: Node Exporter Full dashboard (ID: 1860)"
    log_info "   Container Metrics: cAdvisor dashboard (ID: 14282)"
    log_info ""
    log_info "🚨 Alerting:"
    log_info "   Configure email alerts in: monitoring/alertmanager/alertmanager.yml"
    log_info "   Test alerts: curl -X POST http://localhost:9093/api/v1/alerts"
    log_info ""
    
    # Show service status
    log_info "📊 Current Service Status:"
    docker-compose -f "$MONITORING_DIR/docker-compose.monitoring.yml" ps
}

# Error handling
cleanup_on_error() {
    log_error "Monitoring setup failed. Cleaning up..."
    
    cd "$MONITORING_DIR"
    docker-compose -f docker-compose.monitoring.yml down --remove-orphans
    
    exit 1
}

# Set up error handling
trap cleanup_on_error ERR

# Main execution
main() {
    log_info "Starting 6FB AI Agent System monitoring stack..."
    
    cd "$PROJECT_ROOT"
    
    # Run setup steps
    check_prerequisites
    setup_monitoring_config
    start_monitoring_stack
    wait_for_services
    validate_monitoring
    display_monitoring_info
    
    log_success "Monitoring stack setup completed successfully!"
}

# Help function
show_help() {
    cat << EOF
6FB AI Agent System - Start Monitoring Stack

Usage: $0 [OPTIONS]

OPTIONS:
    -h, --help          Show this help message
    --skip-validation   Skip service validation
    --quiet            Suppress detailed output

Examples:
    $0                  # Start monitoring stack with full validation
    $0 --skip-validation # Start without waiting for service validation
    $0 --quiet          # Start with minimal output

Services included:
    - Prometheus (metrics collection)
    - Grafana (visualization)
    - Alertmanager (alert routing)
    - Node Exporter (system metrics)
    - cAdvisor (container metrics)
    - Blackbox Exporter (endpoint monitoring)
    - PostgreSQL Exporter (database metrics)
    - Redis Exporter (cache metrics)
EOF
}

# Parse command line arguments
SKIP_VALIDATION=false
QUIET=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --quiet)
            QUIET=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function with options
if [[ $SKIP_VALIDATION == true ]]; then
    # Skip service validation for faster startup
    main() {
        log_info "Starting 6FB AI Agent System monitoring stack (skip validation)..."
        cd "$PROJECT_ROOT"
        check_prerequisites
        setup_monitoring_config
        start_monitoring_stack
        display_monitoring_info
        log_success "Monitoring stack started (validation skipped)!"
    }
fi

main "$@"