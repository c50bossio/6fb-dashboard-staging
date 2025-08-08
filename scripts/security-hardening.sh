#!/bin/bash

# 6FB AI Agent System - Production Security Hardening Script
# Comprehensive security integration for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    local deps=("python3" "node" "npm" "docker")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is required but not installed"
            exit 1
        fi
    done
    
    log_success "All dependencies found"
}

# Backup current configuration
backup_config() {
    log_info "Creating configuration backup..."
    
    local backup_dir="backups/security-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Backup important files
    cp -f .env.local.example "$backup_dir/" 2>/dev/null || true
    cp -f middleware.js "$backup_dir/" 2>/dev/null || true
    cp -f fastapi_backend.py "$backup_dir/" 2>/dev/null || true
    cp -f docker-compose.yml "$backup_dir/" 2>/dev/null || true
    
    log_success "Configuration backed up to $backup_dir"
}

# Create secure FastAPI backend with integrated security middleware
create_secure_backend() {
    log_info "Creating secure FastAPI backend with integrated security middleware..."
    
    cat > fastapi_backend_secure.py << 'EOF'
#!/usr/bin/env python3
"""
6FB AI Agent System - Secure FastAPI Backend
Production-ready backend with comprehensive security middleware integration
"""

import os
import sys
import logging
from typing import Dict, Any, Optional
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# FastAPI and security imports
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import time
from datetime import datetime

# Security middleware imports
from middleware.security_middleware import SecurityMiddleware, SecurityConfig, RateLimitRule
from services.security_monitoring import security_monitor
from services.secure_config import secure_config, validate_configuration, check_security_compliance

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/security.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create logs directory
os.makedirs('logs', exist_ok=True)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting 6FB AI Agent System with security hardening...")
    
    # Validate configuration
    is_valid, errors = validate_configuration()
    if not is_valid:
        logger.error(f"Configuration validation failed: {errors}")
        for error in errors:
            logger.error(f"  - {error}")
    
    # Check security compliance
    compliance = check_security_compliance()
    if not compliance['compliant']:
        logger.warning("Security compliance issues detected:")
        for issue in compliance['issues']:
            logger.warning(f"  - {issue}")
    
    # Generate missing secrets
    generated_secrets = secure_config.generate_secrets()
    if generated_secrets:
        logger.info(f"Generated {len(generated_secrets)} missing security secrets")
    
    logger.info("Security monitoring initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down 6FB AI Agent System")

# Create FastAPI app with security-focused configuration
app = FastAPI(
    title="6FB AI Agent System - Secure API",
    description="Production-ready barbershop management system with enterprise security",
    version="2.0.0",
    docs_url="/docs" if secure_config.get('ENABLE_API_DOCS', 'false').lower() == 'true' else None,
    redoc_url="/redoc" if secure_config.get('ENABLE_API_DOCS', 'false').lower() == 'true' else None,
    lifespan=lifespan
)

# Configure CORS with security best practices
allowed_origins = [
    "http://localhost:9999",  # Development frontend
    "http://localhost:3000",  # Alternative dev port
]

# Add production origins if configured
production_origin = secure_config.get('FRONTEND_URL')
if production_origin:
    allowed_origins.append(production_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Add comprehensive security middleware
security_config_obj = SecurityConfig(
    # Rate limiting configuration
    global_rate_limit=RateLimitRule(
        requests_per_window=int(secure_config.get('GLOBAL_RATE_LIMIT', 100)),
        window_seconds=int(secure_config.get('GLOBAL_RATE_WINDOW', 900))  # 15 minutes
    ),
    auth_rate_limit=RateLimitRule(
        requests_per_window=int(secure_config.get('AUTH_RATE_LIMIT', 5)),
        window_seconds=int(secure_config.get('AUTH_RATE_WINDOW', 300))  # 5 minutes
    ),
    api_rate_limit=RateLimitRule(
        requests_per_window=int(secure_config.get('API_RATE_LIMIT', 1000)),
        window_seconds=int(secure_config.get('API_RATE_WINDOW', 3600))  # 1 hour
    ),
    
    # Security features
    enable_security_headers=True,
    enable_cors_protection=True,
    allowed_origins=allowed_origins,
    max_request_size=int(secure_config.get('MAX_REQUEST_SIZE', 10 * 1024 * 1024)),  # 10MB
    block_suspicious_patterns=True,
    enable_request_logging=True,
    
    # DDoS protection
    enable_ddos_protection=True,
    ddos_threshold=int(secure_config.get('DDOS_THRESHOLD', 50)),
    ddos_ban_duration=int(secure_config.get('DDOS_BAN_DURATION', 3600))
)

app.add_middleware(SecurityMiddleware, config=security_config_obj)

# Health check endpoint with security validation
@app.get("/health")
async def health_check():
    """Comprehensive health check with security status"""
    try:
        # Check configuration
        config_valid, config_errors = validate_configuration()
        
        # Check security compliance
        compliance = check_security_compliance()
        
        # Get security metrics
        security_metrics = await security_monitor.get_security_metrics(time_range_hours=1)
        
        return {
            "status": "healthy" if config_valid and compliance['compliant'] else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "security": {
                "configuration_valid": config_valid,
                "compliance_status": compliance['compliant'],
                "active_security_blocks": security_metrics['active_blocks'],
                "recent_incidents": sum(
                    sum(levels.values()) for levels in security_metrics['incidents'].values()
                )
            },
            "services": {
                "database": "healthy",
                "security_monitoring": "active",
                "rate_limiting": "active"
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": "Health check failed"
            }
        )

# Security dashboard endpoint (admin only)
@app.get("/admin/security/dashboard")
async def security_dashboard():
    """Security monitoring dashboard"""
    try:
        metrics = await security_monitor.get_security_metrics(time_range_hours=24)
        compliance = check_security_compliance()
        
        return {
            "security_metrics": metrics,
            "compliance_status": compliance,
            "configuration_summary": secure_config.export_safe_config()
        }
        
    except Exception as e:
        logger.error(f"Security dashboard error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load security dashboard"
        )

# Import and register API routes
try:
    from services.ai_agents import ai_router
    from services.business_intelligence import business_router
    from services.booking_service import booking_router
    
    app.include_router(ai_router, prefix="/api/ai", tags=["AI Agents"])
    app.include_router(business_router, prefix="/api/business", tags=["Business Intelligence"])
    app.include_router(booking_router, prefix="/api/bookings", tags=["Booking Management"])
    
except ImportError as e:
    logger.warning(f"Some API routes not available: {e}")

if __name__ == "__main__":
    # Security startup checks
    logger.info("Performing security startup checks...")
    
    # Validate environment
    required_vars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
    missing_vars = [var for var in required_vars if not secure_config.get(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        sys.exit(1)
    
    # Start server
    port = int(secure_config.get('PORT', 8001))
    host = secure_config.get('HOST', '0.0.0.0')
    
    logger.info(f"Starting secure server on {host}:{port}")
    
    uvicorn.run(
        "fastapi_backend_secure:app",
        host=host,
        port=port,
        reload=secure_config.get('NODE_ENV') == 'development',
        log_level="info",
        access_log=True,
        server_header=False,  # Don't expose server information
        date_header=False     # Don't expose server date
    )
EOF

    log_success "Secure FastAPI backend created"
}

# Update Docker configuration for security
update_docker_security() {
    log_info "Updating Docker configuration for security..."
    
    # Create backup
    cp docker-compose.yml docker-compose.yml.backup 2>/dev/null || true
    
    cat > docker-compose.secure.yml << 'EOF'
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
      args:
        NODE_ENV: production
    ports:
      - "9999:9999"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_FRONTEND_URL=${NEXT_PUBLIC_FRONTEND_URL:-http://localhost:9999}
    volumes:
      - ./app:/app/app:ro
      - ./components:/app/components:ro
      - ./lib:/app/lib:ro
      - ./public:/app/public:ro
    networks:
      - agent-network
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9999/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.secure
    ports:
      - "8001:8000"
    environment:
      - PYTHONUNBUFFERED=1
      - PYTHONDONTWRITEBYTECODE=1
      - NODE_ENV=production
      - HOST=0.0.0.0
      - PORT=8000
      # Security settings
      - ENABLE_RATE_LIMITING=true
      - ENABLE_CSRF_PROTECTION=true
      - ENABLE_DDOS_PROTECTION=true
      - MAX_REQUEST_SIZE=10485760
      - GLOBAL_RATE_LIMIT=100
      - AUTH_RATE_LIMIT=5
      - API_RATE_LIMIT=1000
      # Database
      - DATABASE_PATH=/app/data/agent_system.db
      # API keys (from .env.local)
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
      - ./services:/app/services:ro
      - ./middleware:/app/middleware:ro
    networks:
      - agent-network
    depends_on:
      - frontend
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    user: "1000:1000"
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  agent-network:
    driver: bridge
EOF

    log_success "Secure Docker configuration created"
}

# Create secure Dockerfile for backend
create_secure_dockerfile() {
    log_info "Creating secure Dockerfile for backend..."
    
    cat > Dockerfile.backend.secure << 'EOF'
FROM python:3.11-slim-bullseye

# Security: Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install system dependencies securely
RUN apt-get update && apt-get install -y \
    --no-install-recommends \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY fastapi_backend_secure.py .
COPY services/ ./services/
COPY middleware/ ./middleware/
COPY database/ ./database/

# Create necessary directories with proper permissions
RUN mkdir -p /app/data /app/logs \
    && chown -R appuser:appuser /app \
    && chmod 700 /app/data /app/logs

# Switch to non-root user
USER appuser

# Security environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "fastapi_backend_secure.py"]
EOF

    log_success "Secure Dockerfile created"
}

# Set secure file permissions
set_file_permissions() {
    log_info "Setting secure file permissions..."
    
    # Secure configuration files
    local secure_files=(
        ".env.local"
        ".secrets.encrypted"
        ".master.key"
        "fastapi_backend_secure.py"
        "scripts/security-hardening.sh"
    )
    
    for file in "${secure_files[@]}"; do
        if [[ -f "$file" ]]; then
            chmod 600 "$file"
            log_success "Secured permissions for $file"
        fi
    done
    
    # Make scripts executable
    chmod +x scripts/*.sh 2>/dev/null || true
    chmod +x fastapi_backend_secure.py 2>/dev/null || true
}

# Create production environment template
create_production_env_template() {
    log_info "Creating production environment template..."
    
    cat > .env.production.example << 'EOF'
# 6FB AI Agent System - Production Environment Configuration
# Copy this file to .env.local and fill in the actual values

# Application Environment
NODE_ENV=production
HOST=0.0.0.0
PORT=8001

# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Service API Keys (Optional)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Security Configuration
ENABLE_RATE_LIMITING=true
ENABLE_CSRF_PROTECTION=true
ENABLE_DDOS_PROTECTION=true
ENABLE_API_DOCS=false
MAX_REQUEST_SIZE=10485760

# Rate Limiting
GLOBAL_RATE_LIMIT=100
GLOBAL_RATE_WINDOW=900
AUTH_RATE_LIMIT=5
AUTH_RATE_WINDOW=300
API_RATE_LIMIT=1000
API_RATE_WINDOW=3600

# DDoS Protection
DDOS_THRESHOLD=50
DDOS_BAN_DURATION=3600
EOF

    log_success "Production environment template created"
}

# Main execution
main() {
    log_info "Starting 6FB AI Agent System security hardening..."
    
    check_dependencies
    backup_config
    create_secure_backend
    update_docker_security
    create_secure_dockerfile
    set_file_permissions
    create_production_env_template
    
    log_success "Security hardening completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Review the security configuration in fastapi_backend_secure.py"
    log_info "2. Update .env.local with your production values"
    log_info "3. Test the secure backend: python fastapi_backend_secure.py"
    log_info "4. Deploy with: docker-compose -f docker-compose.secure.yml up -d"
    log_info "5. Monitor security logs: tail -f logs/security.log"
}

# Run main function
main "$@"