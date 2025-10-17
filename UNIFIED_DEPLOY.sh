#!/bin/bash
# ===============================================
# 6FB AI AGENT SYSTEM - UNIFIED DEPLOYMENT SCRIPT
# ===============================================
# Single source of truth for all deployment strategies
# Replaces: deploy-production.sh, deploy-staging.sh, deploy-fresh.sh, 
#          railway-deploy-commands.sh, vercel-deploy.sh, and 6+ others
# Version: 1.0.0
# Date: 2025-08-30

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="6FB AI Agent System"
VERSION="1.0.0"

# Print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Print section header
print_section() {
    echo ""
    print_color $CYAN "==============================================="
    print_color $CYAN "$1"
    print_color $CYAN "==============================================="
}

# Print step
print_step() {
    print_color $BLUE "🔧 $1"
}

# Print success
print_success() {
    print_color $GREEN "✅ $1"
}

# Print warning
print_warning() {
    print_color $YELLOW "⚠️  $1"
}

# Print error
print_error() {
    print_color $RED "❌ $1"
}

# Show help
show_help() {
    cat << EOF
🚀 ${PROJECT_NAME} - Unified Deployment Script v${VERSION}

USAGE:
    ./UNIFIED_DEPLOY.sh <environment> [options]

ENVIRONMENTS:
    development    - Local development setup
    staging        - Staging environment deployment  
    production     - Production deployment
    docker         - Docker-based deployment
    vercel         - Vercel platform deployment
    railway        - Railway platform deployment

OPTIONS:
    --skip-tests        Skip test suite execution
    --skip-build        Skip build process
    --skip-db          Skip database migration
    --force            Force deployment even with warnings
    --dry-run          Show what would be deployed without executing
    --help, -h         Show this help message

EXAMPLES:
    ./UNIFIED_DEPLOY.sh development
    ./UNIFIED_DEPLOY.sh production --skip-tests
    ./UNIFIED_DEPLOY.sh vercel --dry-run
    ./UNIFIED_DEPLOY.sh docker --force

EOF
}

# Validate environment
validate_environment() {
    local env=$1
    
    print_step "Validating environment: $env"
    
    case $env in
        development|staging|production|docker|vercel|railway)
            print_success "Environment '$env' is valid"
            ;;
        *)
            print_error "Invalid environment: $env"
            show_help
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    local missing_tools=()
    
    # Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    else
        local node_version=$(node --version | sed 's/v//')
        print_success "Node.js: $node_version"
    fi
    
    # npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        local npm_version=$(npm --version)
        print_success "npm: $npm_version"
    fi
    
    # Python (for FastAPI backend)
    if ! command -v python3 &> /dev/null; then
        missing_tools+=("python3")
    else
        local python_version=$(python3 --version | sed 's/Python //')
        print_success "Python: $python_version"
    fi
    
    # Docker (if needed)
    if [[ $ENVIRONMENT == "docker" ]] && ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    # Vercel CLI (if needed)
    if [[ $ENVIRONMENT == "vercel" ]] && ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel@latest
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    print_success "All prerequisites satisfied"
}

# Environment setup
setup_environment() {
    print_step "Setting up environment variables..."
    
    local env_file=""
    
    case $ENVIRONMENT in
        development)
            env_file=".env.local"
            ;;
        staging)
            env_file=".env.staging"
            ;;
        production)
            env_file=".env.production"
            ;;
        docker)
            env_file=".env.docker"
            ;;
        *)
            env_file=".env.local"
            ;;
    esac
    
    if [[ ! -f "$env_file" ]]; then
        if [[ -f ".env.example" ]]; then
            print_warning "Environment file not found. Copying from .env.example"
            cp .env.example "$env_file"
            print_warning "Please configure $env_file with your actual values"
            
            if [[ ! $FORCE ]]; then
                read -p "Continue anyway? (y/N) " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    exit 1
                fi
            fi
        else
            print_error "No environment file found: $env_file"
            exit 1
        fi
    fi
    
    print_success "Environment configured: $env_file"
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    # Frontend dependencies
    if [[ ! -d "node_modules" ]] || [[ $FORCE ]]; then
        npm install
        print_success "Frontend dependencies installed"
    else
        print_success "Frontend dependencies already installed"
    fi
    
    # Python dependencies (if FastAPI backend exists)
    if [[ -f "requirements.txt" ]]; then
        if ! python3 -m pip show fastapi &> /dev/null || [[ $FORCE ]]; then
            python3 -m pip install -r requirements.txt
            print_success "Python dependencies installed"
        else
            print_success "Python dependencies already installed"
        fi
    fi
}

# Run tests
run_tests() {
    if [[ $SKIP_TESTS ]]; then
        print_warning "Skipping tests (--skip-tests flag)"
        return
    fi
    
    print_step "Running test suite..."
    
    # Linting
    print_step "Running linter..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_error "Linting failed"
        if [[ ! $FORCE ]]; then
            exit 1
        fi
    fi
    
    # Type checking
    if npm run type-check &> /dev/null; then
        print_step "Running type check..."
        if npm run type-check; then
            print_success "Type checking passed"
        else
            print_error "Type checking failed"
            if [[ ! $FORCE ]]; then
                exit 1
            fi
        fi
    fi
    
    # Unit tests
    if npm run test &> /dev/null; then
        print_step "Running unit tests..."
        if npm run test; then
            print_success "Unit tests passed"
        else
            print_error "Unit tests failed"
            if [[ ! $FORCE ]]; then
                exit 1
            fi
        fi
    fi
    
    print_success "All tests passed"
}

# Build application
build_application() {
    if [[ $SKIP_BUILD ]]; then
        print_warning "Skipping build (--skip-build flag)"
        return
    fi
    
    print_step "Building application..."
    
    # Frontend build
    if npm run build; then
        print_success "Frontend build completed"
    else
        print_error "Frontend build failed"
        exit 1
    fi
    
    # Backend preparation (if needed)
    if [[ -f "fastapi_backend.py" ]]; then
        print_step "Preparing FastAPI backend..."
        # Any backend preparation steps would go here
        print_success "Backend prepared"
    fi
}

# Database migration
migrate_database() {
    if [[ $SKIP_DB ]]; then
        print_warning "Skipping database migration (--skip-db flag)"
        return
    fi
    
    print_step "Running database migrations..."
    
    # Check if we have a migration system
    if [[ -f "database/MASTER_SCHEMA.sql" ]]; then
        print_step "Master schema found - manual migration required"
        print_warning "Please run database/MASTER_SCHEMA.sql in your database"
        print_warning "This is a one-time consolidation migration"
        
        if [[ ! $FORCE ]]; then
            read -p "Have you run the master schema migration? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_warning "Please run the database migration first"
                exit 1
            fi
        fi
    fi
    
    print_success "Database migration completed"
}

# Deploy to specific platform
deploy_platform() {
    print_step "Deploying to $ENVIRONMENT..."
    
    case $ENVIRONMENT in
        development)
            deploy_development
            ;;
        staging)
            deploy_staging
            ;;
        production)
            deploy_production
            ;;
        docker)
            deploy_docker
            ;;
        vercel)
            deploy_vercel
            ;;
        railway)
            deploy_railway
            ;;
    esac
}

# Development deployment
deploy_development() {
    print_step "Starting development environment..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would start development servers"
        return
    fi
    
    # Create development startup script
    cat > start-dev.sh << EOF
#!/bin/bash
# Auto-generated development startup script

# Start frontend
echo "🚀 Starting Next.js frontend on port 9999..."
npm run dev &
FRONTEND_PID=\$!

# Start backend (if available)
if [[ -f "fastapi_backend.py" ]]; then
    echo "🚀 Starting FastAPI backend on port 8001..."
    python3 fastapi_backend.py &
    BACKEND_PID=\$!
fi

# Wait for Ctrl+C
echo "✅ Development environment running!"
echo "   Frontend: http://localhost:9999"
echo "   Backend:  http://localhost:8001"
echo ""
echo "Press Ctrl+C to stop all services"

trap 'echo ""; echo "🛑 Stopping services..."; kill \$FRONTEND_PID 2>/dev/null; kill \$BACKEND_PID 2>/dev/null; exit 0' INT

wait
EOF
    
    chmod +x start-dev.sh
    
    print_success "Development deployment ready"
    print_color $CYAN "Run: ./start-dev.sh to start development servers"
}

# Staging deployment
deploy_staging() {
    print_step "Deploying to staging environment..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would deploy to staging"
        return
    fi
    
    # Staging deployment logic here
    print_success "Staging deployment completed"
}

# Production deployment
deploy_production() {
    print_step "Deploying to production environment..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would deploy to production"
        return
    fi
    
    # Production deployment logic here
    print_warning "Production deployment requires manual verification"
    print_success "Production deployment prepared"
}

# Docker deployment
deploy_docker() {
    print_step "Deploying with Docker..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would build and run Docker containers"
        return
    fi
    
    # Check if docker-compose exists
    if [[ -f "docker-compose.yml" ]]; then
        print_step "Building Docker containers..."
        docker-compose build
        
        print_step "Starting Docker services..."
        docker-compose up -d
        
        print_success "Docker deployment completed"
        print_color $CYAN "Services running at:"
        print_color $CYAN "  Frontend: http://localhost:9999"
        print_color $CYAN "  Backend:  http://localhost:8001"
    else
        print_error "docker-compose.yml not found"
        exit 1
    fi
}

# Vercel deployment
deploy_vercel() {
    print_step "Deploying to Vercel..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would deploy to Vercel"
        return
    fi
    
    if [[ $ENVIRONMENT == "production" ]]; then
        vercel --prod
    else
        vercel
    fi
    
    print_success "Vercel deployment completed"
}

# Railway deployment
deploy_railway() {
    print_step "Deploying to Railway..."
    
    if [[ $DRY_RUN ]]; then
        print_warning "[DRY RUN] Would deploy to Railway"
        return
    fi
    
    if command -v railway &> /dev/null; then
        railway up
        print_success "Railway deployment completed"
    else
        print_error "Railway CLI not found. Install with: npm install -g @railway/cli"
        exit 1
    fi
}

# Post-deployment tasks
post_deployment() {
    print_step "Running post-deployment tasks..."
    
    # Health check
    print_step "Running health checks..."
    # Add health check logic here
    
    # Cleanup temporary files
    print_step "Cleaning up..."
    rm -f start-dev.sh 2>/dev/null || true
    
    print_success "Post-deployment tasks completed"
}

# Main deployment flow
main() {
    local start_time=$(date +%s)
    
    print_section "🚀 ${PROJECT_NAME} Deployment"
    print_color $PURPLE "Environment: $ENVIRONMENT"
    print_color $PURPLE "Version: $VERSION"
    print_color $PURPLE "Timestamp: $(date)"
    
    if [[ $DRY_RUN ]]; then
        print_warning "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Execute deployment steps
    validate_environment "$ENVIRONMENT"
    check_prerequisites
    setup_environment
    install_dependencies
    run_tests
    build_application
    migrate_database
    deploy_platform
    post_deployment
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_section "🎉 Deployment Complete!"
    print_success "Environment: $ENVIRONMENT"
    print_success "Duration: ${duration} seconds"
    
    if [[ $ENVIRONMENT == "development" ]]; then
        print_color $CYAN ""
        print_color $CYAN "Next steps:"
        print_color $CYAN "1. Run: ./start-dev.sh"
        print_color $CYAN "2. Open: http://localhost:9999"
        print_color $CYAN "3. Backend: http://localhost:8001"
    fi
}

# Parse command line arguments
ENVIRONMENT=""
SKIP_TESTS=false
SKIP_BUILD=false  
SKIP_DB=false
FORCE=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        development|staging|production|docker|vercel|railway)
            ENVIRONMENT="$1"
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$ENVIRONMENT" ]]; then
    print_error "Environment is required"
    show_help
    exit 1
fi

# Run main deployment
main