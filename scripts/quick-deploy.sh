#!/bin/bash

# Quick Deployment Helper for 6FB AI Agent System
# Simplified deployment script for common scenarios

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

print_usage() {
    echo "6FB AI Agent System - Quick Deploy"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     - Set up deployment environment"
    echo "  check     - Check environment and health"
    echo "  frontend  - Deploy frontend only (Vercel)"
    echo "  backend   - Deploy backend only (Railway)"
    echo "  full      - Full production deployment"
    echo "  status    - Check deployment status"
    echo "  help      - Show this help"
    echo ""
}

setup_deployment() {
    log "Setting up deployment environment..."
    
    # Install required CLI tools
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    if ! command -v railway &> /dev/null; then
        log "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Check authentication
    log "Checking Vercel authentication..."
    if ! vercel whoami > /dev/null 2>&1; then
        log "Please log in to Vercel:"
        vercel login
    else
        success "Vercel: $(vercel whoami)"
    fi
    
    log "Checking Railway authentication..."
    if ! railway whoami > /dev/null 2>&1; then
        log "Please log in to Railway:"
        railway login
    else
        success "Railway: $(railway whoami)"
    fi
    
    success "Deployment environment ready"
}

check_environment() {
    log "Checking environment configuration..."
    
    # Run environment check
    if command -v npm &> /dev/null && npm run check-env; then
        success "Environment configuration is valid"
    else
        error "Environment check failed"
    fi
    
    # Check health if app is running
    if curl -s http://localhost:9999/api/health > /dev/null 2>&1; then
        success "Local health check passed"
    else
        warning "Local app not running (this is normal for deployment)"
    fi
}

deploy_frontend() {
    log "Deploying frontend to Vercel..."
    
    # Build and deploy
    log "Building application..."
    npm run build
    
    log "Deploying to Vercel production..."
    vercel --prod --yes
    
    success "Frontend deployed successfully"
}

deploy_backend() {
    log "Deploying backend to Railway..."
    
    log "Deploying to Railway..."
    railway up
    
    success "Backend deployed successfully"
}

full_deployment() {
    log "Starting full production deployment..."
    
    # Run the comprehensive deployment script
    if [[ -f "./scripts/deploy-production.sh" ]]; then
        ./scripts/deploy-production.sh
    else
        error "Full deployment script not found"
    fi
}

check_status() {
    log "Checking deployment status..."
    
    # Check Vercel deployments
    log "Vercel deployments:"
    vercel ls 2>/dev/null || warning "Cannot list Vercel deployments"
    
    echo ""
    
    # Check Railway deployments
    log "Railway deployments:"
    railway status 2>/dev/null || warning "Cannot check Railway status"
    
    echo ""
    
    # Test health endpoints if available
    log "Testing health endpoints..."
    
    # Try to get deployment URLs
    local vercel_url=$(vercel ls --meta production 2>/dev/null | grep "6fb-ai-agent" | head -1 | awk '{print $2}' || echo "")
    
    if [[ -n "$vercel_url" ]]; then
        log "Testing frontend: https://$vercel_url"
        if curl -s --max-time 10 "https://$vercel_url" > /dev/null; then
            success "Frontend is responding"
        else
            warning "Frontend health check failed"
        fi
        
        log "Testing API: https://$vercel_url/api/health"
        if curl -s --max-time 10 "https://$vercel_url/api/health" | grep -q "ok\|healthy"; then
            success "API health check passed"
        else
            warning "API health check failed"
        fi
    else
        warning "Cannot determine Vercel URL"
    fi
}

main() {
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]]; then
        error "Please run this script from the project root directory"
    fi
    
    case "${1:-help}" in
        setup)
            setup_deployment
            ;;
        check)
            check_environment
            ;;
        frontend)
            check_environment
            deploy_frontend
            ;;
        backend)
            check_environment
            deploy_backend
            ;;
        full)
            check_environment
            full_deployment
            ;;
        status)
            check_status
            ;;
        help|--help|-h)
            print_usage
            ;;
        *)
            error "Unknown command: $1\n$(print_usage)"
            ;;
    esac
}

main "$@"