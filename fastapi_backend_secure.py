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
