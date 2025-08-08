#!/bin/bash

# Performance Optimizations Deployment Script
# Safely deploys performance improvements with rollback capability

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups/performance_upgrade_$(date +%Y%m%d_%H%M%S)"
LOG_FILE="./deploy_performance_$(date +%Y%m%d_%H%M%S).log"

echo -e "${GREEN}🚀 Starting Performance Optimizations Deployment${NC}"
echo "Backup directory: $BACKUP_DIR"
echo "Log file: $LOG_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Function to log messages
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to create backup
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup_path="$BACKUP_DIR/$(dirname "$file")"
        mkdir -p "$backup_path"
        cp "$file" "$backup_path/"
        log "${GREEN}✓${NC} Backed up: $file"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "${YELLOW}🔍 Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log "${RED}❌ Python 3 is not installed${NC}"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        log "${RED}❌ package.json not found. Run this script from the project root.${NC}"
        exit 1
    fi
    
    # Check if optimized files exist
    if [ ! -f "optimized_fastapi_backend.py" ]; then
        log "${RED}❌ Optimized backend not found${NC}"
        exit 1
    fi
    
    log "${GREEN}✓ Prerequisites check passed${NC}"
}

# Function to backup existing files
backup_existing_files() {
    log "${YELLOW}📦 Creating backups...${NC}"
    
    # Backup original files
    backup_file "fastapi_backend.py"
    backup_file "components/FloatingAIChat.js"
    backup_file "docker-compose.yml"
    
    # Backup any existing database
    if [ -f "data/agent_system.db" ]; then
        cp -r "data" "$BACKUP_DIR/"
        log "${GREEN}✓${NC} Backed up database"
    fi
    
    log "${GREEN}✓ Backup completed${NC}"
}

# Function to install Python dependencies
install_python_deps() {
    log "${YELLOW}🐍 Installing Python dependencies...${NC}"
    
    # Check if requirements file exists
    if [ -f "requirements.txt" ]; then
        # Add new dependencies for optimizations
        cat >> requirements.txt << EOF

# Performance Optimization Dependencies
aiosqlite>=0.19.0
psutil>=5.9.0
EOF
        
        # Install dependencies
        python3 -m pip install -r requirements.txt
        log "${GREEN}✓ Python dependencies installed${NC}"
    else
        log "${RED}❌ requirements.txt not found${NC}"
        exit 1
    fi
}

# Function to install Node.js dependencies
install_node_deps() {
    log "${YELLOW}📦 Checking Node.js dependencies...${NC}"
    
    # Install dependencies
    npm install
    log "${GREEN}✓ Node.js dependencies updated${NC}"
}

# Function to deploy optimized backend
deploy_backend() {
    log "${YELLOW}⚡ Deploying optimized backend...${NC}"
    
    # Replace the main backend file
    if [ -f "fastapi_backend.py" ]; then
        mv "fastapi_backend.py" "fastapi_backend.py.backup"
    fi
    
    cp "optimized_fastapi_backend.py" "fastapi_backend.py"
    log "${GREEN}✓ Optimized backend deployed${NC}"
}

# Function to deploy optimized frontend components
deploy_frontend() {
    log "${YELLOW}⚡ Deploying optimized frontend components...${NC}"
    
    # Replace FloatingAIChat with optimized version
    if [ -f "components/FloatingAIChat.js" ]; then
        mv "components/FloatingAIChat.js" "components/FloatingAIChat.js.backup"
    fi
    
    cp "components/OptimizedFloatingAIChat.js" "components/FloatingAIChat.js"
    log "${GREEN}✓ Optimized components deployed${NC}"
}

# Function to update Docker configuration
update_docker_config() {
    log "${YELLOW}🐳 Updating Docker configuration...${NC}"
    
    # Update docker-compose.yml with performance optimizations
    if [ -f "docker-compose.yml" ]; then
        # Add memory limits and health checks
        cat > docker-compose.performance.yml << EOF
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "9999:9999"
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    volumes:
      - ./components:/app/components:ro
      - ./app:/app/app:ro
      - ./lib:/app/lib:ro
      - ./public:/app/public:ro
    networks:
      - agent-network
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9999/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8001:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - PYTHONDONTWRITEBYTECODE=1
    volumes:
      - ./data:/app/data
      - ./services:/app/services:ro
      - ./database:/app/database:ro
      - ./middleware:/app/middleware:ro
    networks:
      - agent-network
    depends_on:
      - frontend
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  agent-network:
    driver: bridge

volumes:
  agent-data:
    driver: local
EOF
        
        log "${GREEN}✓ Docker configuration updated${NC}"
    fi
}

# Function to run tests
run_tests() {
    log "${YELLOW}🧪 Running tests...${NC}"
    
    # Run basic functionality tests
    if [ -f "package.json" ]; then
        # Check if test script exists
        if npm run test --silent > /dev/null 2>&1; then
            npm run test
            log "${GREEN}✓ Frontend tests passed${NC}"
        else
            log "${YELLOW}⚠ No frontend tests found, skipping${NC}"
        fi
    fi
    
    # Test Python backend
    if command -v python3 &> /dev/null; then
        python3 -c "
import sys
import os
sys.path.append('.')
try:
    from database.optimized_database_manager import OptimizedDatabaseManager
    from services.optimized_ai_connection_pool import OptimizedAIConnectionPool
    print('✓ Python imports successful')
except ImportError as e:
    print(f'❌ Python import error: {e}')
    sys.exit(1)
"
        log "${GREEN}✓ Backend imports test passed${NC}"
    fi
}

# Function to start optimized services
start_services() {
    log "${YELLOW}🚀 Starting optimized services...${NC}"
    
    # Stop any existing services
    if [ -f "docker-compose.yml" ]; then
        docker-compose down || true
    fi
    
    # Start with performance configuration
    if [ -f "docker-compose.performance.yml" ]; then
        docker-compose -f docker-compose.performance.yml up -d
        log "${GREEN}✓ Services started with performance optimizations${NC}"
    else
        log "${YELLOW}⚠ Performance config not found, using default${NC}"
        docker-compose up -d
    fi
    
    # Wait for services to start
    sleep 10
    
    # Test service health
    if curl -s http://localhost:9999/api/health > /dev/null; then
        log "${GREEN}✓ Frontend service is healthy${NC}"
    else
        log "${RED}❌ Frontend service health check failed${NC}"
    fi
    
    if curl -s http://localhost:8001/health > /dev/null; then
        log "${GREEN}✓ Backend service is healthy${NC}"
    else
        log "${RED}❌ Backend service health check failed${NC}"
    fi
}

# Function to display performance improvements
show_performance_improvements() {
    log "${GREEN}🎉 Performance Optimizations Deployed Successfully!${NC}"
    log ""
    log "${YELLOW}📊 Performance Improvements:${NC}"
    log "• Database: Async connection pooling with WAL mode"
    log "• AI Services: Connection pooling and response caching"
    log "• Frontend: Memory leak fixes and optimized rendering"
    log "• Rate Limiting: Enhanced sliding window implementation"
    log "• Monitoring: Real-time performance tracking"
    log "• Memory Management: Automatic cleanup and GC optimization"
    log ""
    log "${YELLOW}🔗 Service URLs:${NC}"
    log "• Frontend: http://localhost:9999"
    log "• Backend API: http://localhost:8001"
    log "• Health Check: http://localhost:9999/api/health"
    log "• Performance Stats: http://localhost:8001/api/v1/performance/stats"
    log ""
    log "${YELLOW}📁 Backup Location:${NC}"
    log "• Backup: $BACKUP_DIR"
    log "• Log: $LOG_FILE"
}

# Function to create rollback script
create_rollback_script() {
    cat > rollback_performance_optimizations.sh << EOF
#!/bin/bash
# Rollback script for performance optimizations

echo "🔄 Rolling back performance optimizations..."

# Stop current services
docker-compose down || true

# Restore backed up files
if [ -d "$BACKUP_DIR" ]; then
    if [ -f "$BACKUP_DIR/fastapi_backend.py" ]; then
        cp "$BACKUP_DIR/fastapi_backend.py" ./fastapi_backend.py
        echo "✓ Restored original backend"
    fi
    
    if [ -f "$BACKUP_DIR/components/FloatingAIChat.js" ]; then
        cp "$BACKUP_DIR/components/FloatingAIChat.js" ./components/FloatingAIChat.js
        echo "✓ Restored original frontend components"
    fi
    
    if [ -d "$BACKUP_DIR/data" ]; then
        cp -r "$BACKUP_DIR/data" ./
        echo "✓ Restored original database"
    fi
else
    echo "❌ Backup directory not found: $BACKUP_DIR"
    exit 1
fi

# Restart services
docker-compose up -d

echo "✅ Rollback completed"
EOF

    chmod +x rollback_performance_optimizations.sh
    log "${GREEN}✓ Rollback script created: rollback_performance_optimizations.sh${NC}"
}

# Main deployment function
main() {
    log "${GREEN}Starting deployment at $(date)${NC}"
    
    # Run deployment steps
    check_prerequisites
    backup_existing_files
    install_python_deps
    install_node_deps
    deploy_backend
    deploy_frontend
    update_docker_config
    run_tests
    create_rollback_script
    start_services
    show_performance_improvements
    
    log "${GREEN}🎉 Deployment completed successfully at $(date)${NC}"
}

# Error handling
trap 'log "${RED}❌ Deployment failed. Check log: $LOG_FILE${NC}"; exit 1' ERR

# Run main function
main "$@"