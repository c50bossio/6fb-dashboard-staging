#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Main deployment function
main() {
    echo "🚀 Automated Coder Cloud Deployment Starting..."
    echo "================================================"
    
    # Step 1: Check prerequisites
    print_status "Checking prerequisites..."
    
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Installing..."
        install_railway_cli
    else
        print_success "Railway CLI found: $(railway --version)"
    fi
    
    # Step 2: Check if logged in
    print_status "Checking Railway authentication..."
    if ! railway whoami &> /dev/null; then
        print_warning "Not logged into Railway. Starting authentication..."
        authenticate_railway
    else
        print_success "Already authenticated with Railway: $(railway whoami)"
    fi
    
    # Step 3: Initialize or link project
    print_status "Setting up Railway project..."
    setup_railway_project
    
    # Step 4: Configure environment variables
    print_status "Configuring environment variables..."
    configure_environment
    
    # Step 5: Deploy the application
    print_status "Deploying Coder to Railway..."
    deploy_application
    
    # Step 6: Wait for deployment and get URL
    print_status "Waiting for deployment to complete..."
    wait_for_deployment
    
    # Step 7: Display final information
    show_deployment_info
}

install_railway_cli() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install railway
    else
        # Linux
        curl -fsSL https://railway.app/install.sh | sh
    fi
    print_success "Railway CLI installed successfully"
}

authenticate_railway() {
    print_status "Opening Railway authentication in browser..."
    railway login --browser
    
    # Wait for authentication to complete
    sleep 3
    
    if railway whoami &> /dev/null; then
        print_success "Authentication successful: $(railway whoami)"
    else
        print_error "Authentication failed. Please run 'railway login' manually."
        exit 1
    fi
}

setup_railway_project() {
    if [ -f "railway.toml" ]; then
        print_success "Using existing Railway project"
    else
        print_status "Creating new Railway project..."
        railway init --name "coder-6fb-ai-agent-$(date +%s)"
        print_success "Railway project created"
    fi
}

configure_environment() {
    print_status "Setting environment variables..."
    
    # Set basic environment variables
    railway variables set CODER_TELEMETRY=false
    railway variables set PORT=7080
    railway variables set CODER_HTTP_ADDRESS="0.0.0.0:7080"
    
    # Get the Railway domain for access URL
    local domain=$(railway status --json 2>/dev/null | jq -r '.deployments[0].url // empty' 2>/dev/null || echo "")
    if [ -n "$domain" ]; then
        railway variables set CODER_ACCESS_URL="$domain"
        print_success "Environment variables configured with domain: $domain"
    else
        print_warning "Domain not available yet, will be set after first deployment"
    fi
}

deploy_application() {
    print_status "Starting deployment..."
    
    # Deploy with Railway
    railway up --detach
    
    print_success "Deployment initiated successfully"
}

wait_for_deployment() {
    print_status "Waiting for deployment to become available..."
    
    local max_attempts=30
    local attempt=1
    local url=""
    
    while [ $attempt -le $max_attempts ]; do
        print_status "Checking deployment status (attempt $attempt/$max_attempts)..."
        
        # Get deployment URL
        url=$(railway status --json 2>/dev/null | jq -r '.deployments[0].url // empty' 2>/dev/null || echo "")
        
        if [ -n "$url" ] && [ "$url" != "null" ]; then
            print_status "Found deployment URL: $url"
            
            # Test if the service is responding
            if curl -s --max-time 10 "$url" > /dev/null 2>&1; then
                print_success "Deployment is live and responding!"
                DEPLOYMENT_URL="$url"
                return 0
            else
                print_status "Service not ready yet, waiting..."
            fi
        fi
        
        sleep 10
        attempt=$((attempt + 1))
    done
    
    print_warning "Deployment may still be starting. Check Railway dashboard for status."
    DEPLOYMENT_URL="$url"
}

show_deployment_info() {
    echo ""
    echo "🎉 DEPLOYMENT COMPLETE!"
    echo "======================"
    
    if [ -n "$DEPLOYMENT_URL" ]; then
        echo -e "${GREEN}🌐 Your Coder instance is available at:${NC}"
        echo -e "${BLUE}   $DEPLOYMENT_URL${NC}"
        echo ""
        echo -e "${YELLOW}📋 Next Steps:${NC}"
        echo "1. Visit the URL above to set up your admin account"
        echo "2. Wait 2-3 minutes for full service initialization"
        echo "3. Create a workspace using the '6fb-ai-agent-enhanced' template"
        echo "4. Start coding from any device!"
        echo ""
        echo -e "${YELLOW}📱 Device Access:${NC}"
        echo "• Desktop/Laptop: Full VS Code experience"
        echo "• Tablet: Touch-friendly coding interface"
        echo "• Phone: View and edit code on the go"
        echo ""
        echo -e "${YELLOW}💡 Bookmark this URL - you can access it from anywhere!${NC}"
        echo ""
        
        # Try to open in browser
        if command -v open &> /dev/null; then
            print_status "Opening deployment in browser..."
            open "$DEPLOYMENT_URL"
        fi
    else
        print_warning "Could not retrieve deployment URL automatically."
        echo "Check your Railway dashboard at: https://railway.app/dashboard"
    fi
    
    echo -e "${GREEN}✅ Automated deployment completed successfully!${NC}"
}

# Error handling
trap 'print_error "Deployment failed at line $LINENO. Check the error above."' ERR

# Run main function
main "$@"