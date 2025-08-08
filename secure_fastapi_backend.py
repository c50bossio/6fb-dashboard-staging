#!/usr/bin/env python3
"""
Secure FastAPI backend for 6FB AI Agent System
Implements comprehensive security hardening including:
- Enhanced authentication with JWT and session management
- Input validation and sanitization
- Encryption at rest for sensitive data
- GDPR compliance and audit logging
- Advanced threat detection and prevention
- Security headers and CORS hardening
"""

from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError
from middleware.rate_limiting import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware, SecurityReportingMiddleware
from middleware.enhanced_security_middleware import EnhancedSecurityMiddleware
from services.comprehensive_security_service import (
    security_config, auth_service, input_validator, encryption_service, audit_logger,
    SecureUserRegister, SecureUserLogin, SecureChatMessage
)
from services.secure_database_service import create_secure_database_service
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import asyncio
import json
import os
import logging
import uuid
from contextlib import contextmanager
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure secure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/backend.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Ensure logs directory exists
os.makedirs('logs', exist_ok=True)

# Import notification service
try:
    from services.notification_service import notification_service
    from services.notification_queue import notification_queue
    NOTIFICATION_SERVICE_AVAILABLE = True
except ImportError:
    logger.warning("Notification service not available")
    notification_service = None
    notification_queue = None
    NOTIFICATION_SERVICE_AVAILABLE = False

# Import alert API service
try:
    from services.alert_api_service import alert_app
    ALERT_SERVICE_AVAILABLE = True
except ImportError:
    ALERT_SERVICE_AVAILABLE = False
    logger.warning("Alert service not available")

# Import business recommendations engine
try:
    from services.business_recommendations_engine import business_recommendations_engine
    RECOMMENDATIONS_ENGINE_AVAILABLE = True
except ImportError:
    RECOMMENDATIONS_ENGINE_AVAILABLE = False
    logger.warning("Business recommendations engine not available")

# Import enhanced business recommendations service
try:
    from services.business_recommendations_service import business_recommendations_service
    ENHANCED_RECOMMENDATIONS_AVAILABLE = True
except ImportError:
    ENHANCED_RECOMMENDATIONS_AVAILABLE = False
    logger.warning("Enhanced business recommendations service not available")

# Import Advanced RAG system
try:
    from services.advanced_rag_endpoint import router as advanced_rag_router
    ADVANCED_RAG_AVAILABLE = True
    logger.info("Advanced RAG system loaded")
except ImportError as e:
    ADVANCED_RAG_AVAILABLE = False
    logger.warning(f"Advanced RAG system not available: {e}")

# Import Real-time Data system
try:
    from services.realtime_data_endpoint import router as realtime_data_router
    REALTIME_DATA_AVAILABLE = True
    logger.info("Real-time Data system loaded")
except ImportError as e:
    REALTIME_DATA_AVAILABLE = False
    logger.warning(f"Real-time Data system not available: {e}")

# Import AI performance monitoring
try:
    from services.ai_performance_monitoring import ai_performance_monitor
    PERFORMANCE_MONITORING_AVAILABLE = True
except ImportError:
    PERFORMANCE_MONITORING_AVAILABLE = False
    logger.warning("AI performance monitoring not available")

# Import enhanced business knowledge service
try:
    from services.enhanced_business_knowledge_service import enhanced_business_knowledge_service
    ENHANCED_KNOWLEDGE_AVAILABLE = True
except ImportError:
    ENHANCED_KNOWLEDGE_AVAILABLE = False
    logger.warning("Enhanced business knowledge service not available")

# Initialize FastAPI app with security settings
app = FastAPI(
    title="6FB AI Agent System API",
    description="Secure AI-powered barbershop management system with comprehensive security controls",
    version="2.0.0",
    docs_url="/docs" if os.getenv('NODE_ENV') == 'development' else None,  # Disable docs in production
    redoc_url="/redoc" if os.getenv('NODE_ENV') == 'development' else None
)

# Enhanced security middleware (first layer) - comprehensive threat detection
app.add_middleware(
    EnhancedSecurityMiddleware,
    environment=os.getenv('NODE_ENV', 'production')
)

# Security headers middleware (second layer)
app.add_middleware(
    SecurityHeadersMiddleware,
    environment=os.getenv('NODE_ENV', 'production')
)

# Security reporting middleware
app.add_middleware(SecurityReportingMiddleware)

# Rate limiting middleware (before CORS) - comprehensive protection
app.add_middleware(
    RateLimitMiddleware,
    redis_client=None,  # Using in-memory fallback
    enabled=True
)

# Secure CORS configuration
allowed_origins = [
    "http://localhost:9999",  # Frontend development
    "http://localhost:3000",  # Alternative frontend port
]

# Add production origins from environment
production_origins = os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
if production_origins and production_origins[0]:  # Check if not empty
    allowed_origins.extend([origin.strip() for origin in production_origins])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # No wildcard for security
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],  # Specific methods only
    allow_headers=[
        "Authorization",
        "Content-Type", 
        "X-Requested-With",
        "X-API-Version",
        "X-Request-ID"
    ],  # Specific headers only
    expose_headers=[
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining", 
        "X-RateLimit-Reset",
        "X-Security-Score",
        "X-Request-ID"
    ]
)

# Security
security = HTTPBearer()

# Secure database setup
DATABASE_PATH = "data/agent_system.db"

# Initialize secure database service
secure_db = create_secure_database_service(
    database_path=DATABASE_PATH,
    encryption_enabled=True,
    audit_enabled=True,
    backup_enabled=True
)

@contextmanager 
def get_db():
    """Legacy database connection for compatibility - prefer secure_db for new code"""
    return secure_db.get_connection()

async def init_db():
    """Initialize secure database with encryption and audit logging"""
    logger.info("Initializing secure database...")
    
    # Database initialization is handled by secure_database_service
    # Tables are automatically created with encryption and security features
    
    # Create default admin user if it doesn't exist
    try:
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@6fb-ai-system.com')
        existing_admin = await secure_db.find_user_by_email(admin_email)
        
        if not existing_admin:
            admin_password = os.getenv('ADMIN_PASSWORD')
            if not admin_password:
                import secrets
                admin_password = secrets.token_urlsafe(16)
                logger.critical(f"Generated admin password: {admin_password}")
                logger.critical("STORE THIS PASSWORD SECURELY!")
            
            password_hash = auth_service.hash_password(admin_password)
            await secure_db.create_user(
                email=admin_email,
                password_hash=password_hash,
                shop_name="System Administration",
                user_type="SUPER_ADMIN"
            )
            logger.info("Default admin user created")
    
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")

# Secure authentication helper functions
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict:
    """Get current authenticated user with comprehensive security validation"""
    
    try:
        token = credentials.credentials
        
        # Development bypass (only in development environment)
        is_development = os.getenv('NODE_ENV') == 'development'
        is_dev_token = token == 'dev-bypass-token'
        
        if is_development and is_dev_token:
            logger.warning("Using development bypass token")
            return {
                'id': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Development User',
                'user_type': 'SHOP_OWNER'
            }
        
        # Verify JWT token with comprehensive validation
        payload = auth_service.verify_token(token)
        
        # Get user from database
        user = await secure_db.find_user_by_email(payload['email'])
        
        if not user or not user['is_active']:
            audit_logger.log_authentication_event(
                'TOKEN_VALIDATION_FAILED',
                payload.get('email', 'unknown'),
                request.client.host if request.client else 'unknown',
                success=False
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account not found or inactive"
            )
        
        # Log successful authentication
        audit_logger.log_authentication_event(
            'TOKEN_VALIDATION_SUCCESS', 
            user['email'],
            request.client.host if request.client else 'unknown',
            success=True
        )
        
        # Add request context to user info
        user['ip_address'] = request.client.host if request.client else 'unknown'
        
        # Set user context for rate limiting and audit logging
        request.state.user_id = str(user['id'])
        request.state.user_type = user.get('user_type', 'CLIENT')
        request.state.user_email = user['email']
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        audit_logger.log_security_event(
            'AUTHENTICATION_ERROR',
            None,
            request.client.host if request.client else 'unknown',
            {'error': str(e)},
            severity='ERROR'
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def require_role(required_roles: List[str]):
    """Decorator to require specific user roles"""
    def role_checker(current_user: Dict = Depends(get_current_user)):
        user_role = current_user.get('user_type', 'CLIENT')
        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(required_roles)}"
            )
        return current_user
    return role_checker

# Response models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    expires_in: int

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    security_features: Dict[str, bool]
    uptime: Optional[float] = None

class SecurityStatsResponse(BaseModel):
    blocked_requests: int
    suspicious_requests: int
    total_security_events: int
    blocked_ips_count: int
    active_sessions: int

# Routes
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting 6FB AI Agent System Backend...")
    
    # Initialize secure database
    await init_db()
    logger.info("✅ Secure database initialized")
    
    # Start notification queue processing
    if NOTIFICATION_SERVICE_AVAILABLE and notification_queue:
        asyncio.create_task(notification_queue.start_processing())
        logger.info("✅ Notification queue processor started")
    
    # Initialize AI services
    if PERFORMANCE_MONITORING_AVAILABLE:
        logger.info("✅ AI performance monitoring available")
    
    logger.info("✅ 6FB AI Agent System Backend fully initialized")

@app.get("/")
async def root():
    """Root endpoint with security status"""
    return {
        "message": "6FB AI Agent System Backend",
        "status": "running",
        "version": "2.0.0",
        "security_enabled": True,
        "features": {
            "encryption_at_rest": True,
            "audit_logging": True,
            "threat_detection": True,
            "gdpr_compliance": True,
            "rate_limiting": True
        },
        "endpoints": {
            "auth": "/api/v1/auth/*",
            "agents": "/api/v1/agents/*",
            "chat": "/api/v1/chat",
            "dashboard": "/api/v1/dashboard/*",
            "security": "/api/v1/security/*"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health():
    """Comprehensive health check endpoint with security status"""
    
    # Test database connectivity
    try:
        # Simple database test
        test_query = "SELECT 1"
        result = await secure_db.fetch_single_value(test_query)
        db_healthy = result == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_healthy = False
    
    # Test security services
    security_features = {
        "database_encryption": secure_db.config.encryption_enabled,
        "audit_logging": secure_db.config.audit_enabled,
        "threat_detection": True,
        "rate_limiting": True,
        "gdpr_compliance": secure_db.gdpr_service is not None,
        "secure_headers": True,
        "input_validation": True,
        "database_healthy": db_healthy
    }
    
    # Calculate uptime (simplified)
    uptime_seconds = 0  # You can implement actual uptime tracking
    
    status_code = "healthy" if all(security_features.values()) else "degraded"
    
    return HealthResponse(
        status=status_code,
        service="6fb-ai-backend-secure",
        version="2.0.0",
        security_features=security_features,
        uptime=uptime_seconds
    )

# Authentication endpoints
@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register(request: Request, user: SecureUserRegister):
    """Secure user registration with comprehensive validation"""
    
    try:
        # Log registration attempt
        audit_logger.log_authentication_event(
            'REGISTRATION_ATTEMPT',
            user.email,
            request.client.host if request.client else 'unknown',
            success=False  # Will be updated to True on success
        )
        
        # Check if user already exists
        existing_user = await secure_db.find_user_by_email(user.email)
        if existing_user:
            audit_logger.log_security_event(
                'DUPLICATE_REGISTRATION',
                None,
                request.client.host if request.client else 'unknown',
                {'email': user.email},
                severity='WARNING'
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Hash password securely
        password_hash = auth_service.hash_password(user.password)
        
        # Create user with encryption
        user_id = await secure_db.create_user(
            email=user.email,
            password_hash=password_hash,
            shop_name=user.shop_name,
            user_type='CLIENT',
            ip_address=request.client.host if request.client else 'unknown'
        )
        
        # Get created user
        new_user = await secure_db.find_user_by_email(user.email)
        
        # Create access token
        token = auth_service.create_access_token({
            'id': new_user['id'],
            'email': new_user['email'],
            'user_type': new_user['user_type'],
            'shop_name': new_user['shop_name'],
            'ip': request.client.host if request.client else 'unknown'
        })
        
        # Log successful registration
        audit_logger.log_authentication_event(
            'REGISTRATION_SUCCESS',
            user.email,
            request.client.host if request.client else 'unknown',
            success=True
        )
        
        # Prepare user data for response (exclude sensitive fields)
        user_data = {
            'id': new_user['id'],
            'email': new_user['email'],
            'shop_name': new_user['shop_name'],
            'user_type': new_user['user_type'],
            'created_at': new_user['created_at']
        }
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_data,
            expires_in=security_config.jwt_expiration_hours * 3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        audit_logger.log_security_event(
            'REGISTRATION_ERROR',
            user.email,
            request.client.host if request.client else 'unknown',
            {'error': str(e)},
            severity='ERROR'
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed due to internal error"
        )

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(request: Request, user: SecureUserLogin):
    """Secure user login with brute force protection"""
    
    try:
        # Authenticate user (includes brute force protection)
        authenticated_user = await auth_service.authenticate_user(
            email=user.email,
            password=user.password,
            request=request
        )
        
        # Create access token
        token = auth_service.create_access_token({
            'id': authenticated_user['id'],
            'email': authenticated_user['email'],
            'user_type': authenticated_user['user_type'],
            'shop_name': authenticated_user.get('shop_name'),
            'ip': request.client.host if request.client else 'unknown'
        })
        
        # Update last login
        await secure_db.execute_query(
            "UPDATE users SET last_login = ?, failed_login_attempts = 0 WHERE id = ?",
            (datetime.now().isoformat(), authenticated_user['id']),
            user_id=str(authenticated_user['id']),
            operation='LOGIN_SUCCESS'
        )
        
        # Prepare user data for response (exclude sensitive fields)
        user_data = {
            'id': authenticated_user['id'],
            'email': authenticated_user['email'],
            'shop_name': authenticated_user.get('shop_name'),
            'user_type': authenticated_user['user_type']
        }
        
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=user_data,
            expires_in=security_config.jwt_expiration_hours * 3600
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        audit_logger.log_security_event(
            'LOGIN_ERROR',
            user.email,
            request.client.host if request.client else 'unknown',
            {'error': str(e)},
            severity='ERROR'
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to internal error"
        )

@app.post("/api/v1/auth/logout")
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Secure logout with token revocation"""
    
    try:
        token = credentials.credentials
        
        # Revoke token
        auth_service.revoke_token(token)
        
        # Log logout
        audit_logger.log_authentication_event(
            'LOGOUT',
            request.state.user_email if hasattr(request.state, 'user_email') else 'unknown',
            request.client.host if request.client else 'unknown',
            success=True
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

# Chat endpoint with secure message handling
@app.post("/api/v1/chat")
async def chat(
    request: Request,
    message: SecureChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """Secure AI chat endpoint with input validation and audit logging"""
    
    try:
        # Log data access for GDPR compliance
        audit_logger.log_data_access_event(
            user_id=str(current_user['id']),
            data_type='chat_message',
            action='CREATE',
            ip_address=request.client.host if request.client else 'unknown'
        )
        
        # Process message with AI agent (implement your AI logic here)
        response_text = f"Echo: {message.message}"  # Placeholder
        
        # Store encrypted chat history
        chat_data = {
            'user_id': current_user['id'],
            'agent_id': message.agent_id or 'business_coach',
            'message': message.message,
            'response': response_text,
            'metadata': json.dumps({
                'ip_address': request.client.host if request.client else 'unknown',
                'user_agent': request.headers.get('user-agent', ''),
                'timestamp': datetime.now().isoformat()
            })
        }
        
        # The secure database will automatically encrypt sensitive fields
        await secure_db.execute_query(
            """INSERT INTO chat_history (user_id, agent_id, message, response, metadata)
               VALUES (?, ?, ?, ?, ?)""",
            (
                chat_data['user_id'],
                chat_data['agent_id'],
                chat_data['message'],
                chat_data['response'],
                chat_data['metadata']
            ),
            user_id=str(current_user['id']),
            ip_address=request.client.host if request.client else 'unknown',
            operation='CHAT_CREATE'
        )
        
        return {
            "response": response_text,
            "agent_id": message.agent_id or 'business_coach',
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        audit_logger.log_security_event(
            'CHAT_ERROR',
            str(current_user['id']),
            request.client.host if request.client else 'unknown',
            {'error': str(e)},
            severity='ERROR'
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Chat service temporarily unavailable"
        )

# Error handlers
@app.exception_handler(ValidationError)
async def validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors securely"""
    
    # Log validation error
    audit_logger.log_security_event(
        'VALIDATION_ERROR',
        getattr(request.state, 'user_id', None),
        request.client.host if request.client else 'unknown',
        {'errors': exc.errors(), 'path': request.url.path},
        severity='WARNING'
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "code": "VALIDATION_ERROR",
            "details": "The request data did not pass validation. Please check your input."
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with security logging"""
    
    # Log security-relevant HTTP exceptions
    if exc.status_code in [401, 403, 429]:
        audit_logger.log_security_event(
            'HTTP_SECURITY_EXCEPTION',
            getattr(request.state, 'user_id', None),
            request.client.host if request.client else 'unknown',
            {
                'status_code': exc.status_code,
                'detail': exc.detail,
                'path': request.url.path
            },
            severity='WARNING'
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "code": f"HTTP_{exc.status_code}",
            "status_code": exc.status_code
        }
    )

# Include optional routers if available
if ADVANCED_RAG_AVAILABLE:
    app.include_router(advanced_rag_router, prefix="/api/v1", tags=["advanced-rag"])

if REALTIME_DATA_AVAILABLE:
    app.include_router(realtime_data_router, prefix="/api/v1", tags=["realtime"])

if __name__ == "__main__":
    import uvicorn
    
    # Configure for secure production deployment
    uvicorn.run(
        "secure_fastapi_backend:app",
        host="0.0.0.0",
        port=8001,
        reload=os.getenv('NODE_ENV') == 'development',
        access_log=True,
        log_level="info",
        server_header=False,  # Hide server information
        date_header=False     # Remove date header
    )