#!/bin/bash
# 6FB AI Agent System - Unified Infrastructure Deployment Manager
# Version: 1.0 - Infrastructure Consolidation Complete
# Date: 2025-08-25

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
cat << "EOF"
    ____  ______ ____     ___    ____   _____ __  __ _______
   /_  _||  ____| __ )   / _ \  |  _ \ |_  _| / _\|__|  _____|  |  |
    | |  | |_   |  _ \  | (_) | | |_) |  | | | |__ | |_   | |_| |_| 
    | |  |  _|  | |_) |  > _ <  |  _ <   | | |___  ||  _|  |__   __| 
   _| |_ | |    |____/  | (_) | | | \ \  | |  ___| || |_   |  | |   
  |___| |_|            \___/  |_|  \_\ |_| |____/ |_____|  |_| |_|  
                                                                    
             AI AGENT SYSTEM - INFRASTRUCTURE MANAGER
EOF
echo -e "${NC}"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Configuration
ENVIRONMENT=${1:-help}
PLATFORM=${2:-docker}
ACTION=${3:-deploy}

# Helper functions
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

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check Docker
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker: $(docker --version)"
    else
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl if Kubernetes deployment
    if [ "$PLATFORM" == "k8s" ] || [ "$PLATFORM" == "kubernetes" ]; then
        if command -v kubectl >/dev/null 2>&1; then
            log_info "kubectl: $(kubectl version --client --short 2>/dev/null || echo 'Available')"
        else
            log_error "kubectl is not installed or not in PATH"
            exit 1
        fi
    fi
    
    # Check kustomize for Kubernetes
    if [ "$PLATFORM" == "k8s" ] || [ "$PLATFORM" == "kubernetes" ]; then
        if command -v kustomize >/dev/null 2>&1; then
            log_info "kustomize: $(kustomize version --short 2>/dev/null || echo 'Available')"
        else
            log_warning "kustomize not found, using kubectl kustomize"
        fi
    fi
    
    log_success "Prerequisites check completed"
}

# Deploy Docker environment
deploy_docker() {
    local env=$1
    log_step "Deploying Docker environment: $env"
    
    cd "$SCRIPT_DIR/docker"
    
    case $env in
        dev|development)
            log_info "Starting development environment with hot reload..."
            ./docker-start.sh dev
            ;;
        prod|production)
            log_info "Starting production environment..."
            ./docker-start.sh prod
            ;;
        staging)
            log_info "Starting staging environment..."
            ./docker-start.sh staging
            ;;
        monitoring)
            log_info "Starting development environment with monitoring..."
            ./docker-start.sh dev debug
            cd "../monitoring"
            docker-compose up -d
            ;;
        *)
            log_error "Unknown Docker environment: $env"
            exit 1
            ;;
    esac
    
    log_success "Docker deployment completed"
    show_docker_endpoints "$env"
}

# Deploy Kubernetes environment
deploy_kubernetes() {
    local env=$1
    log_step "Deploying Kubernetes environment: $env"
    
    cd "$SCRIPT_DIR/kubernetes"
    
    case $env in
        dev|development)
            log_info "Applying development Kubernetes configurations..."
            kubectl apply -k overlays/development/
            ;;
        prod|production)
            log_info "Applying production Kubernetes configurations..."
            kubectl apply -k overlays/production/
            ;;
        monitoring)
            log_info "Deploying monitoring stack to Kubernetes..."
            kubectl apply -k overlays/production/
            # Additional monitoring setup would go here
            ;;
        *)
            log_error "Unknown Kubernetes environment: $env"
            exit 1
            ;;
    esac
    
    log_success "Kubernetes deployment completed"
    show_kubernetes_status "$env"
}

# Show Docker endpoints
show_docker_endpoints() {
    local env=$1
    echo ""
    log_info "🌐 Service Endpoints:"
    
    case $env in
        dev|development)
            echo -e "  Frontend: ${GREEN}http://localhost:9999${NC}"
            echo -e "  Backend API: ${GREEN}http://localhost:8001${NC}"
            echo -e "  Redis: ${GREEN}localhost:6379${NC}"
            ;;
        prod|production)
            echo -e "  Main Site: ${GREEN}http://localhost${NC} (via Nginx)"
            echo -e "  HTTPS: ${GREEN}https://localhost${NC} (if SSL configured)"
            ;;
        monitoring)
            echo -e "  Frontend: ${GREEN}http://localhost:9999${NC}"
            echo -e "  Backend API: ${GREEN}http://localhost:8001${NC}"
            echo -e "  Grafana: ${GREEN}http://localhost:3001${NC} (admin/admin)"
            echo -e "  Prometheus: ${GREEN}http://localhost:9090${NC}"
            echo -e "  AlertManager: ${GREEN}http://localhost:9093${NC}"
            ;;
    esac
    echo ""
}

# Show Kubernetes status
show_kubernetes_status() {
    local env=$1
    echo ""
    log_info "📊 Kubernetes Status:"
    kubectl get pods -n agent-system -o wide
    
    echo ""
    log_info "🌐 Service Information:"
    kubectl get services -n agent-system
    
    if [ "$env" == "prod" ] || [ "$env" == "production" ]; then
        echo ""
        log_info "📈 HPA Status:"
        kubectl get hpa -n agent-system
    fi
    echo ""
}

# Stop services
stop_services() {
    local platform=$1
    log_step "Stopping services on $platform"
    
    case $platform in
        docker)
            cd "$SCRIPT_DIR/docker"
            ./docker-start.sh stop
            cd "$SCRIPT_DIR/monitoring"
            docker-compose down 2>/dev/null || true
            ;;
        k8s|kubernetes)
            kubectl delete namespace agent-system --ignore-not-found=true
            ;;
        all)
            stop_services docker
            stop_services kubernetes
            ;;
        *)
            log_error "Unknown platform: $platform"
            exit 1
            ;;
    esac
    
    log_success "Services stopped"
}

# Show status
show_status() {
    log_step "Checking system status..."
    
    echo ""
    log_info "🐳 Docker Status:"
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(agent-system|6fb)" 2>/dev/null; then
        echo "Docker services running"
    else
        echo "No Docker services running"
    fi
    
    echo ""
    log_info "☸️  Kubernetes Status:"
    if kubectl get namespace agent-system >/dev/null 2>&1; then
        kubectl get pods -n agent-system 2>/dev/null || echo "No pods in agent-system namespace"
    else
        echo "agent-system namespace not found"
    fi
    echo ""
}

# Show help
show_help() {
    echo -e "${YELLOW}6FB AI Agent System - Infrastructure Management${NC}"
    echo ""
    echo "Usage: $0 <environment> <platform> [action]"
    echo ""
    echo -e "${BLUE}Environments:${NC}"
    echo "  dev, development    - Development environment with hot reload"
    echo "  prod, production    - Production environment with scaling"
    echo "  staging            - Staging environment for testing"
    echo "  monitoring         - Full monitoring stack (Grafana, Prometheus)"
    echo ""
    echo -e "${BLUE}Platforms:${NC}"
    echo "  docker             - Docker Compose deployment (default)"
    echo "  k8s, kubernetes    - Kubernetes deployment"
    echo ""
    echo -e "${BLUE}Special Commands:${NC}"
    echo "  status             - Show current system status"
    echo "  stop <platform>    - Stop services (docker/k8s/all)"
    echo "  logs <service>     - Show service logs"
    echo "  help               - Show this help"
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 dev docker                  # Start development environment"
    echo "  $0 prod k8s                    # Deploy to production Kubernetes"
    echo "  $0 monitoring docker           # Start with full monitoring"
    echo "  $0 status                      # Check system status"
    echo "  $0 stop docker                 # Stop Docker services"
    echo ""
    echo -e "${BLUE}Infrastructure Files:${NC}"
    echo "  Docker configs: infrastructure/docker/"
    echo "  Kubernetes configs: infrastructure/kubernetes/"
    echo "  Monitoring configs: infrastructure/monitoring/"
}

# Show logs
show_logs() {
    local service=$1
    local platform=$2
    
    if [ "$platform" == "docker" ] || [ -z "$platform" ]; then
        cd "$SCRIPT_DIR/docker"
        ./docker-start.sh logs "$service"
    elif [ "$platform" == "k8s" ] || [ "$platform" == "kubernetes" ]; then
        if [ -z "$service" ]; then
            kubectl logs -n agent-system -l app=agent-system --tail=100 -f
        else
            kubectl logs -n agent-system -l app="$service" --tail=100 -f
        fi
    fi
}

# Main execution
main() {
    case $ENVIRONMENT in
        help|-h|--help)
            show_help
            ;;
        status)
            show_status
            ;;
        stop)
            stop_services "$PLATFORM"
            ;;
        logs)
            show_logs "$PLATFORM" "$ACTION"
            ;;
        dev|development|prod|production|staging|monitoring)
            check_prerequisites
            
            case $PLATFORM in
                docker)
                    deploy_docker "$ENVIRONMENT"
                    ;;
                k8s|kubernetes)
                    deploy_kubernetes "$ENVIRONMENT"
                    ;;
                *)
                    log_error "Unknown platform: $PLATFORM"
                    show_help
                    exit 1
                    ;;
            esac
            ;;
        *)
            log_error "Unknown command: $ENVIRONMENT"
            show_help
            exit 1
            ;;
    esac
}

# Execute main function
main "$@"