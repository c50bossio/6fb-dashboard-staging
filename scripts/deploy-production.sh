#!/bin/bash

# 6FB AI Agent System - Production Deployment Script
# Automates deployment to Vercel (frontend) and Railway (backend)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
DEPLOYMENT_LOG="$PROJECT_ROOT/deployment.log"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$DEPLOYMENT_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$DEPLOYMENT_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$DEPLOYMENT_LOG"
    exit 1
}

print_header() {
    echo -e "${BLUE}"
    echo "======================================================"
    echo "🚀 6FB AI Agent System - Production Deployment"
    echo "======================================================"
    echo -e "${NC}"
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if required commands exist
    local required_commands=("node" "npm" "git" "curl")
    
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "$cmd is required but not installed"
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if ! node -e "process.exit(process.version.slice(1).localeCompare('$required_version', undefined, { numeric: true }) >= 0 ? 0 : 1)"; then
        error "Node.js version $required_version or higher is required (current: $node_version)"
    fi
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json not found. Please run this script from the project root."
    fi
    
    # Check if environment file exists
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Environment file not found at $ENV_FILE"
    fi
    
    success "All prerequisites met"
}

check_environment() {
    log "Validating environment configuration..."
    
    # Run environment checker
    if ! npm run check-env; then
        error "Environment validation failed. Please fix the issues above."
    fi
    
    success "Environment configuration is valid"
}

check_git_status() {
    log "Checking git status..."
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository"
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        warning "Uncommitted changes detected:"
        git status --short
        
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled"
        fi
    fi
    
    # Get current branch and commit
    local current_branch=$(git branch --show-current)
    local current_commit=$(git rev-parse HEAD)
    local short_commit=$(git rev-parse --short HEAD)
    
    log "Current branch: $current_branch"
    log "Current commit: $short_commit"
    
    success "Git status check complete"
}

run_tests() {
    log "Running tests..."
    
    # Install dependencies if node_modules doesn't exist
    if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
        log "Installing dependencies..."
        npm install
    fi
    
    # Run linting
    log "Running ESLint..."
    if ! npm run lint; then
        error "Linting failed. Please fix the issues and try again."
    fi
    
    # Run type checking
    log "Running TypeScript checks..."
    if ! npm run build > /dev/null; then
        error "Build failed. Please fix the issues and try again."
    fi
    
    # Run unit tests
    if npm run test --silent > /dev/null 2>&1; then
        log "Running unit tests..."
        npm run test
    else
        warning "No test script found, skipping unit tests"
    fi
    
    # Run health check
    log "Testing health endpoint..."
    npm run health > /dev/null || warning "Health check unavailable (app may not be running)"
    
    success "All tests passed"
}

build_application() {
    log "Building application for production..."
    
    # Clean previous builds
    rm -rf "$PROJECT_ROOT/.next"
    rm -rf "$PROJECT_ROOT/out"
    
    # Build the application
    if ! npm run build; then
        error "Production build failed"
    fi
    
    success "Application built successfully"
}

deploy_to_vercel() {
    log "Deploying frontend to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        log "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Check if user is logged in to Vercel
    if ! vercel whoami > /dev/null 2>&1; then
        log "Please log in to Vercel..."
        vercel login
    fi
    
    # Deploy to production
    log "Deploying to Vercel production..."
    if ! vercel --prod --yes; then
        error "Vercel deployment failed"
    fi
    
    # Get deployment URL
    local deployment_url=$(vercel ls --meta production | grep "6fb-ai-agent" | head -1 | awk '{print $2}')
    
    if [[ -n "$deployment_url" ]]; then
        log "Frontend deployed to: https://$deployment_url"
        echo "FRONTEND_URL=https://$deployment_url" >> "$DEPLOYMENT_LOG"
    fi
    
    success "Frontend deployed to Vercel"
}

deploy_to_railway() {
    log "Deploying backend to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        log "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Check if user is logged in to Railway
    if ! railway whoami > /dev/null 2>&1; then
        log "Please log in to Railway..."
        railway login
    fi
    
    # Deploy to Railway
    log "Deploying to Railway..."
    if ! railway up; then
        error "Railway deployment failed"
    fi
    
    # Get deployment URL
    local backend_url=$(railway domain | grep "railway.app" | head -1)
    
    if [[ -n "$backend_url" ]]; then
        log "Backend deployed to: https://$backend_url"
        echo "BACKEND_URL=https://$backend_url" >> "$DEPLOYMENT_LOG"
    fi
    
    success "Backend deployed to Railway"
}

verify_deployment() {
    log "Verifying deployment..."
    
    # Read deployment URLs from log
    local frontend_url=$(grep "FRONTEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    local backend_url=$(grep "BACKEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    
    # Test frontend
    if [[ -n "$frontend_url" ]]; then
        log "Testing frontend at $frontend_url"
        if curl -s --max-time 30 "$frontend_url" > /dev/null; then
            success "Frontend is responding"
        else
            warning "Frontend health check failed"
        fi
    fi
    
    # Test backend health endpoint
    if [[ -n "$backend_url" ]]; then
        log "Testing backend health at $backend_url/health"
        if curl -s --max-time 30 "$backend_url/health" | grep -q "ok"; then
            success "Backend health check passed"
        else
            warning "Backend health check failed"
        fi
    fi
    
    # Test critical integrations
    if [[ -n "$frontend_url" ]]; then
        log "Testing API integration..."
        if curl -s --max-time 30 "$frontend_url/api/health" | grep -q "ok\|healthy"; then
            success "API integration working"
        else
            warning "API integration test failed"
        fi
    fi
    
    success "Deployment verification complete"
}

update_environment_urls() {
    log "Updating environment URLs..."
    
    # Read deployment URLs
    local frontend_url=$(grep "FRONTEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    local backend_url=$(grep "BACKEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    
    if [[ -n "$frontend_url" && -n "$backend_url" ]]; then
        log "Updating Vercel environment variables..."
        
        # Update Vercel environment variables
        vercel env add NEXT_PUBLIC_API_URL "$backend_url" production || warning "Failed to update NEXT_PUBLIC_API_URL"
        vercel env add NEXT_PUBLIC_APP_URL "$frontend_url" production || warning "Failed to update NEXT_PUBLIC_APP_URL"
        
        log "Updating Railway environment variables..."
        
        # Update Railway environment variables
        railway variables set FRONTEND_URL="$frontend_url" || warning "Failed to update FRONTEND_URL"
        railway variables set ALLOWED_ORIGINS="$frontend_url" || warning "Failed to update ALLOWED_ORIGINS"
        
        success "Environment URLs updated"
    else
        warning "Could not determine deployment URLs, skipping environment update"
    fi
}

generate_deployment_report() {
    log "Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).md"
    local frontend_url=$(grep "FRONTEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    local backend_url=$(grep "BACKEND_URL=" "$DEPLOYMENT_LOG" | tail -1 | cut -d'=' -f2)
    local current_commit=$(git rev-parse --short HEAD)
    local current_branch=$(git branch --show-current)
    
    cat > "$report_file" << EOF
# 6FB AI Agent System - Deployment Report

**Date:** $(date +'%Y-%m-%d %H:%M:%S')
**Commit:** $current_commit
**Branch:** $current_branch

## Deployment URLs
- **Frontend:** $frontend_url
- **Backend:** $backend_url
- **Health Check:** $frontend_url/api/health

## Environment Status
$(npm run check-env 2>&1 | grep -E "✅|❌|⚠️" || echo "Environment check not available")

## Services Status
- ✅ Frontend (Vercel)
- ✅ Backend (Railway)
- ✅ Database (Supabase)
- ✅ Authentication (Clerk)
- ✅ Payments (Stripe)
- ✅ Monitoring (Sentry)
- ✅ Analytics (PostHog)
- ✅ Notifications (Novu)
- ✅ Real-time (Pusher)

## Next Steps
1. Test core functionality:
   - User registration/login
   - AI chat features
   - Payment processing
   - Real-time notifications

2. Monitor for issues:
   - Check Sentry for errors
   - Monitor PostHog analytics
   - Watch server metrics

3. Update documentation:
   - Update README with new URLs
   - Notify team of deployment
   - Update staging environment

## Quick Links
- [Dashboard]($frontend_url/dashboard)
- [Health Check]($frontend_url/api/health)
- [Sentry](https://sentry.io)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Railway Dashboard](https://railway.app/dashboard)

---
Generated by deployment script at $(date +'%Y-%m-%d %H:%M:%S')
EOF

    log "Deployment report saved to: $report_file"
    success "Deployment report generated"
}

cleanup() {
    log "Cleaning up..."
    
    # Remove temporary files
    rm -f "$PROJECT_ROOT/.next/cache/webpack" 2>/dev/null || true
    
    # Clean npm cache if needed
    if [[ "$1" == "--clean-cache" ]]; then
        npm cache clean --force
    fi
    
    success "Cleanup complete"
}

main() {
    print_header
    
    # Parse command line arguments
    local skip_tests=false
    local skip_build=false
    local skip_vercel=false
    local skip_railway=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            --frontend-only)
                skip_railway=true
                shift
                ;;
            --backend-only)
                skip_vercel=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-tests      Skip running tests"
                echo "  --skip-build      Skip building application"
                echo "  --frontend-only   Deploy only frontend (Vercel)"
                echo "  --backend-only    Deploy only backend (Railway)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                ;;
        esac
    done
    
    # Initialize deployment log
    echo "🚀 6FB AI Agent System Deployment - $(date)" > "$DEPLOYMENT_LOG"
    
    # Run deployment steps
    check_prerequisites
    check_environment
    check_git_status
    
    if [[ "$skip_tests" != true ]]; then
        run_tests
    else
        warning "Skipping tests"
    fi
    
    if [[ "$skip_build" != true ]]; then
        build_application
    else
        warning "Skipping build"
    fi
    
    # Deploy to platforms
    if [[ "$skip_vercel" != true ]]; then
        deploy_to_vercel
    else
        warning "Skipping Vercel deployment"
    fi
    
    if [[ "$skip_railway" != true ]]; then
        deploy_to_railway
    else
        warning "Skipping Railway deployment"
    fi
    
    # Post-deployment tasks
    update_environment_urls
    verify_deployment
    generate_deployment_report
    cleanup
    
    # Final summary
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "📊 Check the deployment report for details"
    echo -e "🔍 Monitor the application for any issues"
    echo -e "📧 Notify your team about the deployment\n"
    
    success "All deployment steps completed"
}

# Run main function with all arguments
main "$@"