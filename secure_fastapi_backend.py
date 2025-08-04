#!/usr/bin/env python3
"""
Production-Ready Secure FastAPI Backend for 6FB AI Agent System
Comprehensive security integration with middleware, monitoring, and compliance
"""

import os
import logging
import asyncio
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, validator
import uvicorn

# Security imports
from middleware.security_middleware import SecurityMiddleware, SecurityConfig, RateLimitRule
from services.secure_auth_service import SecureAuthService
from services.secure_input_validator import SecureInputValidator
from services.security_audit_logger import SecurityAuditLogger
from services.gdpr_master_service import GDPRMasterService
from monitoring.comprehensive_monitoring_system import SecurityMonitoringService

# Database imports
from database.postgresql_config import PostgreSQLService
from database.async_connection_pool import AsyncDatabasePool

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/security.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Security configuration
SECURITY_CONFIG = SecurityConfig(
    # Rate limiting - production values
    global_rate_limit=RateLimitRule(1000, 3600),  # 1000 requests per hour
    auth_rate_limit=RateLimitRule(10, 300),       # 10 auth attempts per 5 min
    api_rate_limit=RateLimitRule(5000, 3600),     # 5000 API calls per hour
    
    # CORS - restrict to production domains
    allowed_origins=[
        os.getenv('FRONTEND_URL', 'http://localhost:9999'),
        os.getenv('PRODUCTION_URL', 'https://agent.6fb.ai'),
        os.getenv('STAGING_URL', 'https://staging-agent.6fb.ai')
    ],
    
    # Security features
    enable_security_headers=True,
    enable_cors_protection=True,
    max_request_size=5 * 1024 * 1024,  # 5MB max request
    block_suspicious_patterns=True,
    enable_request_logging=True,
    enable_ddos_protection=True,
    ddos_threshold=100,  # 100 requests per second triggers protection
    ddos_ban_duration=3600  # 1 hour ban
)

# Global services
auth_service = None
input_validator = None
audit_logger = None
gdpr_service = None
monitoring_service = None
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager with proper startup/shutdown"""
    global auth_service, input_validator, audit_logger, gdpr_service, monitoring_service, db_pool
    
    try:
        # Initialize database connection pool
        logger.info("Initializing database connection pool...")
        db_pool = AsyncDatabasePool(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5432')),
            database=os.getenv('DB_NAME', 'agent_system'),
            user=os.getenv('DB_USER', 'agent_user'),
            password=os.getenv('DB_PASSWORD'),
            min_connections=5,
            max_connections=20
        )
        await db_pool.initialize()
        
        # Initialize security services
        logger.info("Initializing security services...")
        auth_service = SecureAuthService(db_pool)
        input_validator = SecureInputValidator()
        audit_logger = SecurityAuditLogger(db_pool)
        gdpr_service = GDPRMasterService(db_pool)
        monitoring_service = SecurityMonitoringService(db_pool)
        
        # Start background services
        logger.info("Starting background security monitoring...")
        asyncio.create_task(monitoring_service.start_monitoring())
        asyncio.create_task(gdpr_service.start_compliance_monitoring())
        
        logger.info("✅ All security services initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize security services: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down security services...")
        if db_pool:
            await db_pool.close()
        if monitoring_service:
            await monitoring_service.stop_monitoring()
        logger.info("✅ Security services shut down complete")

# Initialize FastAPI with security configuration
app = FastAPI(
    title="6FB AI Agent System - Secure API",
    description="Production-ready secure AI agent system with comprehensive security controls",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if os.getenv('ENVIRONMENT') != 'production' else None,
    redoc_url="/api/redoc" if os.getenv('ENVIRONMENT') != 'production' else None
)

# Security middleware stack
app.add_middleware(SecurityMiddleware, config=SECURITY_CONFIG)

# Trusted host middleware (production security)
if os.getenv('ENVIRONMENT') == 'production':
    allowed_hosts = [
        'agent.6fb.ai',
        'api.6fb.ai',
        '*.6fb.ai'
    ]
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

# CORS middleware with strict production settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=SECURITY_CONFIG.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-Requested-With",
        "X-CSRF-Token"
    ],
    expose_headers=["X-RateLimit-Remaining", "X-RateLimit-Reset"]
)

# Security bearer token handler
security = HTTPBearer(auto_error=False)

# Pydantic models with enhanced validation
class SecureUserRegister(BaseModel):
    email: EmailStr
    password: str
    shop_name: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if not SecureInputValidator.validate_password_strength(v):
            raise ValueError('Password does not meet security requirements')
        return v
    
    @validator('shop_name')
    def validate_shop_name(cls, v):
        if v:
            return SecureInputValidator.sanitize_input(v)[:100]
        return v

class SecureUserLogin(BaseModel):
    email: EmailStr
    password: str
    
    @validator('email', 'password')
    def sanitize_inputs(cls, v):
        return SecureInputValidator.sanitize_input(v)

class SecureChatMessage(BaseModel):
    message: str
    agent_id: Optional[str] = "business_coach"
    context: Optional[dict] = {}
    
    @validator('message')
    def validate_message(cls, v):
        # Length validation
        if len(v) > 2000:
            raise ValueError('Message too long')
        
        # Content validation and sanitization
        sanitized = SecureInputValidator.sanitize_input(v)
        if SecureInputValidator.contains_malicious_content(sanitized):
            raise ValueError('Message contains prohibited content')
        
        return sanitized
    
    @validator('agent_id')
    def validate_agent_id(cls, v):
        allowed_agents = [
            'business_coach', 'marketing_expert', 'financial_advisor',
            'customer_intelligence', 'content_generator', 'booking_manager'
        ]
        if v not in allowed_agents:
            raise ValueError('Invalid agent ID')
        return v

# Dependency for authentication
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Enhanced authentication with security monitoring"""
    
    if not credentials:
        await audit_logger.log_security_event(
            event_type="AUTH_MISSING_TOKEN",
            ip_address=request.client.host,
            details={"endpoint": str(request.url)}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
    
    try:
        user = await auth_service.verify_token(credentials.credentials)
        if not user:
            await audit_logger.log_security_event(
                event_type="AUTH_INVALID_TOKEN",
                ip_address=request.client.host,
                details={"token_prefix": credentials.credentials[:10]}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Log successful authentication
        await audit_logger.log_security_event(
            event_type="AUTH_SUCCESS",
            user_id=user.get('id'),
            ip_address=request.client.host,
            details={"endpoint": str(request.url)}
        )
        
        return user
        
    except Exception as e:
        await audit_logger.log_security_event(
            event_type="AUTH_ERROR",
            ip_address=request.client.host,
            details={"error": str(e), "endpoint": str(request.url)}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

# Health check endpoints
@app.get("/health")
async def health_check():
    """Comprehensive health check with security status"""
    try:
        # Check database connectivity
        db_healthy = await db_pool.check_health() if db_pool else False
        
        # Check security services
        security_status = {
            "auth_service": auth_service is not None,
            "input_validator": input_validator is not None,
            "audit_logger": audit_logger is not None,
            "gdpr_service": gdpr_service is not None,
            "monitoring_service": monitoring_service is not None
        }
        
        all_healthy = db_healthy and all(security_status.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "database": "healthy" if db_healthy else "unhealthy",
                "security": security_status
            },
            "version": "3.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unhealthy", "error": "Service unavailable"}
        )

@app.get("/security/status")
async def security_status(current_user: dict = Depends(get_current_user)):
    """Security system status (authenticated users only)"""
    try:
        if not monitoring_service:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Security monitoring service unavailable"
            )
        
        status_info = await monitoring_service.get_security_status()
        return {
            "security_status": "active",
            "timestamp": datetime.utcnow().isoformat(),
            **status_info
        }
    except Exception as e:
        logger.error(f"Security status check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security status"
        )

# Authentication endpoints with enhanced security
@app.post("/api/v1/auth/register")
async def register_user(
    request: Request,
    user_data: SecureUserRegister
):
    """Secure user registration with comprehensive validation"""
    try:
        # Rate limiting is handled by middleware
        client_ip = request.client.host
        
        # Log registration attempt
        await audit_logger.log_security_event(
            event_type="REGISTRATION_ATTEMPT",
            ip_address=client_ip,
            details={"email": user_data.email}
        )
        
        # Register user through secure service
        result = await auth_service.register_user(
            email=user_data.email,
            password=user_data.password,
            shop_name=user_data.shop_name,
            ip_address=client_ip
        )
        
        # Log successful registration
        await audit_logger.log_security_event(
            event_type="REGISTRATION_SUCCESS",
            user_id=result['user']['id'],
            ip_address=client_ip,
            details={"email": user_data.email}
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        await audit_logger.log_security_event(
            event_type="REGISTRATION_ERROR",
            ip_address=request.client.host,
            details={"error": str(e), "email": user_data.email}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/api/v1/auth/login")
async def login_user(
    request: Request,
    credentials: SecureUserLogin
):
    """Secure user login with brute force protection"""
    try:
        client_ip = request.client.host
        
        # Log login attempt
        await audit_logger.log_security_event(
            event_type="LOGIN_ATTEMPT",
            ip_address=client_ip,
            details={"email": credentials.email}
        )
        
        # Authenticate through secure service
        result = await auth_service.authenticate_user(
            email=credentials.email,
            password=credentials.password,
            ip_address=client_ip
        )
        
        # Log successful login
        await audit_logger.log_security_event(
            event_type="LOGIN_SUCCESS",
            user_id=result['user']['id'],
            ip_address=client_ip,
            details={"email": credentials.email}
        )
        
        return result
        
    except HTTPException:
        # Log failed login
        await audit_logger.log_security_event(
            event_type="LOGIN_FAILED",
            ip_address=request.client.host,
            details={"email": credentials.email}
        )
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        await audit_logger.log_security_event(
            event_type="LOGIN_ERROR",
            ip_address=request.client.host,
            details={"error": str(e), "email": credentials.email}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@app.post("/api/v1/auth/logout")
async def logout_user(
    request: Request,
    current_user: dict = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Secure logout with token invalidation"""
    try:
        # Revoke token
        await auth_service.revoke_token(credentials.credentials)
        
        # Log logout
        await audit_logger.log_security_event(
            event_type="LOGOUT_SUCCESS",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={"email": current_user.get('email')}
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

# Secure AI chat endpoint
@app.post("/api/v1/chat")
async def secure_chat(
    request: Request,
    message: SecureChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """Secure AI chat with content filtering and monitoring"""
    try:
        # Log chat attempt
        await audit_logger.log_security_event(
            event_type="CHAT_REQUEST",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={
                "agent_id": message.agent_id,
                "message_length": len(message.message)
            }
        )
        
        # Process chat through secure AI service
        # This would integrate with your existing AI agents
        response = {
            "agent_id": message.agent_id,
            "response": f"Secure response to: {message.message[:50]}...",
            "timestamp": datetime.utcnow().isoformat(),
            "security_checked": True
        }
        
        # Log successful chat
        await audit_logger.log_security_event(
            event_type="CHAT_SUCCESS",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={"agent_id": message.agent_id}
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        await audit_logger.log_security_event(
            event_type="CHAT_ERROR",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={"error": str(e), "agent_id": message.agent_id}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat request failed"
        )

# GDPR compliance endpoints
@app.get("/api/v1/gdpr/my-data")
async def get_my_data(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get all user data for GDPR compliance"""
    try:
        user_data = await gdpr_service.export_user_data(current_user['id'])
        
        # Log data export
        await audit_logger.log_security_event(
            event_type="GDPR_DATA_EXPORT",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={"data_types": list(user_data.keys())}
        )
        
        return user_data
        
    except Exception as e:
        logger.error(f"GDPR data export error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Data export failed"
        )

@app.delete("/api/v1/gdpr/delete-account")
async def delete_my_account(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Delete user account and all data (Right to be Forgotten)"""
    try:
        # Execute right to be forgotten
        await gdpr_service.execute_right_to_be_forgotten(current_user['id'])
        
        # Log account deletion
        await audit_logger.log_security_event(
            event_type="GDPR_ACCOUNT_DELETION",
            user_id=current_user['id'],
            ip_address=request.client.host,
            details={"email": current_user.get('email')}
        )
        
        return {"message": "Account and all associated data has been deleted"}
        
    except Exception as e:
        logger.error(f"Account deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed"
        )

# Security monitoring endpoints (admin only)
@app.get("/api/v1/security/alerts")
async def get_security_alerts(
    current_user: dict = Depends(get_current_user)
):
    """Get recent security alerts (admin users only)"""
    try:
        # Check admin permissions
        if current_user.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        alerts = await monitoring_service.get_recent_alerts()
        return {"alerts": alerts}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Security alerts error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security alerts"
        )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Secure error handling that doesn't expose internal details"""
    
    # Log the error for internal monitoring
    logger.warning(f"HTTP Exception: {exc.status_code} - {exc.detail} - {request.url}")
    
    # Return sanitized error response
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "message": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions securely"""
    
    # Log detailed error internally
    logger.error(f"Unexpected error: {str(exc)} - {request.url}", exc_info=True)
    
    # Return generic error to client (no internal details)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": True,
            "status_code": 500,
            "message": "An internal server error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    # Production server configuration
    config = {
        "host": "0.0.0.0",
        "port": int(os.getenv("PORT", 8000)),
        "reload": False,  # Never reload in production
        "workers": int(os.getenv("WORKERS", 4)),
        "log_level": "info",
        "access_log": True,
        "server_header": False,  # Don't expose server details
        "date_header": False     # Don't expose date header
    }
    
    # SSL configuration for production
    if os.getenv("SSL_KEYFILE") and os.getenv("SSL_CERTFILE"):
        config.update({
            "ssl_keyfile": os.getenv("SSL_KEYFILE"),
            "ssl_certfile": os.getenv("SSL_CERTFILE"),
            "ssl_ca_certs": os.getenv("SSL_CA_CERTS")
        })
    
    logger.info("🚀 Starting secure FastAPI backend...")
    logger.info(f"🔒 Security features: Rate limiting, DDoS protection, Input validation, Audit logging")
    logger.info(f"🛡️ GDPR compliance: Data export, Right to be forgotten, Consent management")
    logger.info(f"📊 Monitoring: Real-time threat detection, Security alerts, Performance metrics")
    
    uvicorn.run("secure_fastapi_backend:app", **config)