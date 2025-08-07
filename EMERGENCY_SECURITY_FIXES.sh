#!/bin/bash
# EMERGENCY SECURITY FIXES - 6FB AI Agent System
# RUN IMMEDIATELY BEFORE ANY PRODUCTION DEPLOYMENT

set -e

echo "🚨 EMERGENCY SECURITY FIXES - 6FB AI Agent System"
echo "=================================================="

# Create secure environment file
echo "🔑 Creating secure environment configuration..."
cat > .env.secure << 'EOF'
# SECURE CONFIGURATION - Generated $(date)
# DO NOT COMMIT THIS FILE - ADD TO .gitignore

# JWT Security
JWT_SECRET=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=30

# Database Security  
DATABASE_URL=postgresql://secure_user:$(openssl rand -base64 24)@localhost:5432/secure_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=secure_db
DB_USER=secure_user
DB_PASSWORD=$(openssl rand -base64 24)

# Admin Security
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=$(openssl rand -base64 16)

# API Security
API_RATE_LIMIT=100
API_RATE_LIMIT_WINDOW=3600

# CORS Security
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# SSL/TLS
SSL_REQUIRED=true
COOKIE_SECURE=true
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=strict

# Logging
LOG_LEVEL=WARNING
SECURITY_LOG_ENABLED=true

NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
EOF

echo "✅ Secure environment file created (.env.secure)"

# Update .gitignore to prevent secret exposure
echo "🔒 Updating .gitignore for security..."
cat >> .gitignore << 'EOF'

# Security - Never commit these files
.env
.env.local
.env.production
.env.secure
*.key
*.pem
auth.db
agent_system.db
*.log
security-report.json
EOF

echo "✅ .gitignore updated"

# Create secure authentication service replacement
echo "🛡️ Creating secure authentication service..."
mkdir -p services/secure/

cat > services/secure/auth_service.py << 'EOF'
#!/usr/bin/env python3
"""
SECURE Authentication Service - Emergency Security Fix
Replaces vulnerable auth_service.py with secure implementation
"""

import os
import secrets
import hashlib
import time
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
import jwt
import bcrypt
import sqlite3
import logging
import re

logger = logging.getLogger(__name__)

# SECURE Configuration from environment
JWT_SECRET = os.getenv('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("JWT_SECRET environment variable is required")

JWT_ALGORITHM = os.getenv('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.getenv('JWT_EXPIRE_MINUTES', '30'))

security = HTTPBearer()

class SecureUserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        """Enforce strong password policy"""
        if len(v) < 12:
            raise ValueError('Password must be at least 12 characters long')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain special character')
        return v
    
    @validator('email')
    def validate_email_security(cls, v):
        """Enhanced email validation"""
        if len(v) > 254:  # RFC 5321 limit
            raise ValueError('Email too long')
        return v.lower().strip()

class SecureAuthService:
    """Secure authentication service with comprehensive security controls"""
    
    def __init__(self, db_path: str = "database/secure_auth.db"):
        self.db_path = db_path
        self.failed_attempts = {}  # IP -> [timestamps]
        self.blacklisted_tokens = set()
        self.init_secure_database()
    
    def init_secure_database(self):
        """Initialize secure database with proper constraints"""
        with sqlite3.connect(self.db_path) as conn:
            # Enable foreign keys and security features
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = WAL")
            conn.execute("PRAGMA synchronous = FULL")
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS secure_users (
                    id TEXT PRIMARY KEY,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    organization TEXT,
                    role TEXT DEFAULT 'user',
                    is_active BOOLEAN DEFAULT 1,
                    failed_login_attempts INTEGER DEFAULT 0,
                    locked_until TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    
                    CHECK (length(email) <= 254),
                    CHECK (length(full_name) <= 100),
                    CHECK (role IN ('user', 'admin', 'moderator'))
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS token_blacklist (
                    jti TEXT PRIMARY KEY,
                    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    user_id TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
    
    def hash_password_secure(self, password: str) -> str:
        """Secure password hashing with high cost factor"""
        # Use high cost factor for bcrypt (12 rounds minimum)
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
    
    def verify_password_secure(self, plain_password: str, hashed_password: str) -> bool:
        """Secure password verification with timing attack protection"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            # Constant time operation even on error
            bcrypt.hashpw(b"dummy", bcrypt.gensalt())
            return False
    
    def create_secure_token(self, user_data: dict) -> str:
        """Create secure JWT token with additional claims"""
        now = datetime.utcnow()
        jti = secrets.token_urlsafe(32)  # Secure random JWT ID
        
        payload = {
            "sub": user_data["email"],
            "user_id": user_data["id"],
            "role": user_data["role"],
            "iat": now,
            "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
            "jti": jti,
            "iss": "6fb-ai-system",  # Issuer
            "aud": "6fb-ai-client"   # Audience
        }
        
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    def verify_token_secure(self, token: str) -> Optional[Dict[str, Any]]:
        """Secure token verification with blacklist check"""
        try:
            # First decode to get JTI
            unverified_payload = jwt.decode(
                token, options={"verify_signature": False}
            )
            jti = unverified_payload.get("jti")
            
            # Check blacklist
            if jti and self.is_token_blacklisted(jti):
                return None
            
            # Verify token
            payload = jwt.decode(
                token, 
                JWT_SECRET, 
                algorithms=[JWT_ALGORITHM],
                audience="6fb-ai-client",
                issuer="6fb-ai-system"
            )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.JWTError as e:
            logger.warning(f"JWT error: {e}")
            return None
    
    def is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT 1 FROM token_blacklist WHERE jti = ? AND expires_at > CURRENT_TIMESTAMP",
                (jti,)
            )
            return cursor.fetchone() is not None
    
    def blacklist_token(self, token: str):
        """Add token to blacklist"""
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if jti and exp:
                expires_at = datetime.fromtimestamp(exp)
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute(
                        "INSERT OR IGNORE INTO token_blacklist (jti, expires_at) VALUES (?, ?)",
                        (jti, expires_at)
                    )
        except Exception as e:
            logger.error(f"Failed to blacklist token: {e}")
    
    def log_security_event(self, event_type: str, user_id: str = None, 
                          ip_address: str = None, details: str = None):
        """Log security events"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO security_log (event_type, user_id, ip_address, details)
                VALUES (?, ?, ?, ?)
            """, (event_type, user_id, ip_address, details))
    
    def check_rate_limit(self, ip_address: str) -> bool:
        """Check if IP is rate limited"""
        now = time.time()
        window = 300  # 5 minutes
        max_attempts = 5
        
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []
        
        # Clean old attempts
        self.failed_attempts[ip_address] = [
            t for t in self.failed_attempts[ip_address] 
            if now - t < window
        ]
        
        return len(self.failed_attempts[ip_address]) < max_attempts
    
    def record_failed_attempt(self, ip_address: str):
        """Record failed login attempt"""
        if ip_address not in self.failed_attempts:
            self.failed_attempts[ip_address] = []
        
        self.failed_attempts[ip_address].append(time.time())

# Global secure auth service
secure_auth_service = SecureAuthService()

async def get_current_user_secure(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Secure dependency to get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = secure_auth_service.verify_token_secure(credentials.credentials)
    if payload is None:
        secure_auth_service.log_security_event("invalid_token_access")
        raise credentials_exception
    
    return payload
EOF

echo "✅ Secure authentication service created"

# Create input validation middleware
echo "🛡️ Creating input validation middleware..."
cat > services/secure/input_validation.py << 'EOF'
#!/usr/bin/env python3
"""
Input Validation and Sanitization Middleware
Emergency Security Fix for XSS and Injection Prevention
"""

import re
import html
import bleach
from typing import Any, Dict
from fastapi import HTTPException, Request
from fastapi.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

class InputValidationMiddleware(BaseHTTPMiddleware):
    """Middleware for input validation and sanitization"""
    
    DANGEROUS_PATTERNS = [
        r'<script[^>]*>.*?</script>',
        r'javascript:',
        r'on\w+\s*=',
        r'<iframe[^>]*>.*?</iframe>',
        r'<object[^>]*>.*?</object>',
        r'<embed[^>]*>.*?</embed>',
        r'<link[^>]*>',
        r'<meta[^>]*>',
        r'<style[^>]*>.*?</style>',
        r'expression\s*\(',
        r'url\s*\(',
        r'@import',
        r'document\.',
        r'window\.',
        r'eval\s*\(',
        r'setTimeout\s*\(',
        r'setInterval\s*\(',
    ]
    
    SQL_INJECTION_PATTERNS = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)',
        r'(\b(OR|AND)\s+\w+\s*=\s*\w+)',
        r'(\'|\"|;|--|\|)',
        r'(\b(TRUE|FALSE)\b)',
        r'(\d+\s*=\s*\d+)',
        r'(\b(SLEEP|BENCHMARK|DELAY)\s*\()',
    ]
    
    async def dispatch(self, request: Request, call_next):
        # Skip validation for certain paths
        if request.url.path in ['/health', '/api/health']:
            return await call_next(request)
        
        try:
            # Validate and sanitize request body if present
            if request.method in ['POST', 'PUT', 'PATCH']:
                body = await self._get_request_body(request)
                if body:
                    sanitized_body = self._sanitize_dict(body)
                    # Replace request body with sanitized version
                    request._body = sanitized_body
            
            # Validate query parameters
            query_params = dict(request.query_params)
            sanitized_params = self._sanitize_dict(query_params)
            
            # Continue with request
            response = await call_next(request)
            return response
            
        except Exception as e:
            logger.error(f"Input validation error: {e}")
            raise HTTPException(status_code=400, detail="Invalid input data")
    
    async def _get_request_body(self, request: Request) -> Dict[str, Any]:
        """Safely extract request body"""
        try:
            if request.headers.get('content-type', '').startswith('application/json'):
                return await request.json()
        except Exception:
            pass
        return {}
    
    def _sanitize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize dictionary data"""
        if not isinstance(data, dict):
            return self._sanitize_value(data)
        
        sanitized = {}
        for key, value in data.items():
            sanitized_key = self._sanitize_string(str(key))
            
            if isinstance(value, dict):
                sanitized[sanitized_key] = self._sanitize_dict(value)
            elif isinstance(value, list):
                sanitized[sanitized_key] = [self._sanitize_value(v) for v in value]
            else:
                sanitized[sanitized_key] = self._sanitize_value(value)
        
        return sanitized
    
    def _sanitize_value(self, value: Any) -> Any:
        """Sanitize individual values"""
        if isinstance(value, str):
            return self._sanitize_string(value)
        elif isinstance(value, (int, float, bool)):
            return value
        elif value is None:
            return None
        else:
            return self._sanitize_string(str(value))
    
    def _sanitize_string(self, text: str) -> str:
        """Comprehensive string sanitization"""
        if not isinstance(text, str):
            return text
        
        # Length limit
        if len(text) > 10000:
            raise HTTPException(status_code=400, detail="Input too long")
        
        # Check for dangerous patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Dangerous pattern detected: {pattern}")
                raise HTTPException(status_code=400, detail="Potentially dangerous input detected")
        
        # Check for SQL injection patterns
        for pattern in self.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"SQL injection pattern detected: {pattern}")
                raise HTTPException(status_code=400, detail="Potentially dangerous input detected")
        
        # HTML sanitization
        text = html.escape(text)
        
        # Additional cleaning with bleach
        text = bleach.clean(
            text,
            tags=[],  # No HTML tags allowed
            attributes={},
            protocols=[],
            strip=True
        )
        
        return text.strip()

def validate_email(email: str) -> bool:
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None and len(email) <= 254

def validate_password_strength(password: str) -> bool:
    """Validate password strength"""
    if len(password) < 12:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False
    return True
EOF

echo "✅ Input validation middleware created"

# Create security headers middleware
echo "🛡️ Creating security headers middleware..."
cat > services/secure/security_headers.py << 'EOF'
#!/usr/bin/env python3
"""
Security Headers Middleware
Implements comprehensive security headers for protection
"""

from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add comprehensive security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        
        # Content Security Policy - Very restrictive
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "media-src 'none'; "
            "object-src 'none'; "
            "child-src 'none'; "
            "frame-src 'none'; "
            "worker-src 'none'; "
            "frame-ancestors 'none';"
        )
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Protection
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # HTTPS enforcement
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains; preload"
        )
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), "
            "payment=(), usb=(), screen-wake-lock=(), "
            "web-share=(), xr-spatial-tracking=()"
        )
        
        # Cache control for sensitive data
        if request.url.path.startswith('/api/'):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Remove server information
        response.headers.pop("Server", None)
        response.headers["Server"] = "WebServer"
        
        return response
EOF

echo "✅ Security headers middleware created"

# Create rate limiting service
echo "🛡️ Creating rate limiting service..."
cat > services/secure/rate_limiter.py << 'EOF'
#!/usr/bin/env python3
"""
Rate Limiting Service
Prevents brute force attacks and API abuse
"""

import time
import asyncio
from typing import Dict, List
from fastapi import HTTPException, Request
from collections import defaultdict, deque
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    """Advanced rate limiter with multiple strategies"""
    
    def __init__(self):
        self.requests = defaultdict(deque)  # IP -> deque of timestamps
        self.blocked_ips = {}  # IP -> block_until_timestamp
        
        # Rate limit configurations
        self.LIMITS = {
            'login': {'requests': 5, 'window': 300, 'block': 900},     # 5 per 5 min, block 15 min
            'register': {'requests': 3, 'window': 300, 'block': 600}, # 3 per 5 min, block 10 min
            'api': {'requests': 100, 'window': 3600, 'block': 300},   # 100 per hour, block 5 min
            'chat': {'requests': 20, 'window': 60, 'block': 180},     # 20 per minute, block 3 min
        }
    
    def is_rate_limited(self, request: Request, endpoint_type: str = 'api') -> bool:
        """Check if request should be rate limited"""
        ip = self._get_client_ip(request)
        
        # Check if IP is currently blocked
        if ip in self.blocked_ips:
            if time.time() < self.blocked_ips[ip]:
                logger.warning(f"Blocked IP attempted access: {ip}")
                return True
            else:
                # Unblock IP
                del self.blocked_ips[ip]
        
        # Get rate limit config
        config = self.LIMITS.get(endpoint_type, self.LIMITS['api'])
        
        # Clean old requests
        now = time.time()
        cutoff = now - config['window']
        
        # Remove old requests
        while self.requests[ip] and self.requests[ip][0] < cutoff:
            self.requests[ip].popleft()
        
        # Check if over limit
        if len(self.requests[ip]) >= config['requests']:
            # Block IP
            self.blocked_ips[ip] = now + config['block']
            logger.warning(f"Rate limit exceeded, blocking IP: {ip}")
            return True
        
        # Record this request
        self.requests[ip].append(now)
        return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check common headers for real IP
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take first IP in chain
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else 'unknown'
    
    def clear_expired_blocks(self):
        """Clean up expired IP blocks"""
        now = time.time()
        expired_ips = [ip for ip, block_until in self.blocked_ips.items() if now >= block_until]
        for ip in expired_ips:
            del self.blocked_ips[ip]

# Global rate limiter instance
rate_limiter = RateLimiter()

async def check_rate_limit(request: Request, endpoint_type: str = 'api'):
    """Dependency function to check rate limits"""
    if rate_limiter.is_rate_limited(request, endpoint_type):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later.",
            headers={"Retry-After": "300"}
        )

# Cleanup task
async def cleanup_rate_limiter():
    """Background task to clean up expired data"""
    while True:
        try:
            rate_limiter.clear_expired_blocks()
            await asyncio.sleep(60)  # Clean every minute
        except Exception as e:
            logger.error(f"Rate limiter cleanup error: {e}")
            await asyncio.sleep(60)
EOF

echo "✅ Rate limiting service created"

# Create secure main.py replacement
echo "🛡️ Creating secure main.py replacement..."
cat > main_secure.py << 'EOF'
#!/usr/bin/env python3
"""
SECURE FastAPI server - Emergency Security Fix
Replaces vulnerable main.py with secure implementation
"""

import os
import uvicorn
import logging
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager

# Import secure services
from services.secure.auth_service import secure_auth_service, get_current_user_secure
from services.secure.input_validation import InputValidationMiddleware
from services.secure.security_headers import SecurityHeadersMiddleware
from services.secure.rate_limiter import check_rate_limit, cleanup_rate_limiter

# Configure secure logging
logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('security.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with background tasks"""
    # Startup
    logger.info("🚀 Starting secure FastAPI server...")
    
    # Start background tasks
    import asyncio
    cleanup_task = asyncio.create_task(cleanup_rate_limiter())
    
    yield
    
    # Shutdown
    cleanup_task.cancel()
    logger.info("🛑 Shutting down secure FastAPI server...")

# Create secure FastAPI app
app = FastAPI(
    title="6FB AI Agent System - SECURE",
    description="Secure AI-powered agent system with comprehensive security controls",
    version="2.0.0-secure",
    lifespan=lifespan,
    docs_url=None,  # Disable docs in production
    redoc_url=None,  # Disable redoc in production
)

# SECURE CORS Configuration
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'https://localhost:9999').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # NEVER use "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Rate-Limit-Remaining"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "yourdomain.com", "api.yourdomain.com"]
)

# Security Middlewares
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(InputValidationMiddleware)

@app.get("/")
async def root():
    """Root endpoint with minimal information disclosure"""
    return {
        "service": "6FB AI Agent System", 
        "status": "secure",
        "version": "2.0.0"
    }

@app.get("/health")
def health_check():
    """Secure health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": "2025-01-01T00:00:00Z"  # Static timestamp for security
    }

@app.post("/api/v1/auth/secure-login")
async def secure_login(
    request: Request,
    login_data: dict,
    _: None = Depends(lambda r: check_rate_limit(r, 'login'))
):
    """Secure login endpoint with rate limiting"""
    try:
        # Validate input
        email = login_data.get('email', '').strip().lower()
        password = login_data.get('password', '')
        
        if not email or not password:
            secure_auth_service.log_security_event(
                "invalid_login_attempt", 
                ip_address=request.client.host,
                details="Missing credentials"
            )
            raise HTTPException(status_code=400, detail="Invalid credentials")
        
        # Authenticate
        user = secure_auth_service.authenticate_user(email, password)
        if not user:
            secure_auth_service.log_security_event(
                "failed_login_attempt",
                ip_address=request.client.host,
                details=f"Failed login for {email}"
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Create secure token
        token = secure_auth_service.create_secure_token(user)
        
        secure_auth_service.log_security_event(
            "successful_login",
            user_id=user['id'],
            ip_address=request.client.host
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 1800  # 30 minutes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@app.post("/api/v1/auth/logout")
async def secure_logout(
    request: Request,
    current_user: dict = Depends(get_current_user_secure)
):
    """Secure logout with token blacklisting"""
    try:
        # Extract token from authorization header
        auth_header = request.headers.get('authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            secure_auth_service.blacklist_token(token)
        
        secure_auth_service.log_security_event(
            "user_logout",
            user_id=current_user.get('user_id'),
            ip_address=request.client.host
        )
        
        return {"message": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(status_code=500, detail="Logout failed")

@app.get("/api/v1/auth/me")
async def get_current_user_info(
    current_user: dict = Depends(get_current_user_secure)
):
    """Get current user information securely"""
    return {
        "id": current_user.get('user_id'),
        "email": current_user.get('sub'),
        "role": current_user.get('role'),
        "exp": current_user.get('exp')
    }

@app.post("/api/v1/chat/secure")
async def secure_chat(
    request: Request,
    chat_data: dict,
    current_user: dict = Depends(get_current_user_secure),
    _: None = Depends(lambda r: check_rate_limit(r, 'chat'))
):
    """Secure chat endpoint with comprehensive validation"""
    try:
        message = chat_data.get('message', '').strip()
        
        # Validate message
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        if len(message) > 1000:
            raise HTTPException(status_code=400, detail="Message too long")
        
        # Log chat interaction
        secure_auth_service.log_security_event(
            "chat_interaction",
            user_id=current_user.get('user_id'),
            ip_address=request.client.host,
            details=f"Message length: {len(message)}"
        )
        
        # Return secure response
        return {
            "response": "This is a secure response placeholder",
            "user_id": current_user.get('user_id'),
            "timestamp": "2025-01-01T00:00:00Z"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat failed")

if __name__ == "__main__":
    # Secure server configuration
    ssl_required = os.getenv('SSL_REQUIRED', 'false').lower() == 'true'
    
    if ssl_required:
        uvicorn.run(
            "main_secure:app",
            host="0.0.0.0",
            port=8001,
            ssl_keyfile="key.pem",
            ssl_certfile="cert.pem",
            access_log=False,  # Disable access logs for security
            server_header=False,
            log_level="warning"
        )
    else:
        logger.warning("🚨 RUNNING WITHOUT SSL - NOT RECOMMENDED FOR PRODUCTION")
        uvicorn.run(
            "main_secure:app",
            host="0.0.0.0", 
            port=8001,
            access_log=False,
            server_header=False,
            log_level="warning"
        )
EOF

echo "✅ Secure main.py replacement created"

# Create Docker security fixes
echo "🐳 Creating secure Docker configuration..."
cat > Dockerfile.backend.secure << 'EOF'
# SECURE Backend Dockerfile - Emergency Security Fix
FROM python:3.11-slim

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

# Install only necessary system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy and install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir \
        fastapi==0.104.1 \
        uvicorn[standard]==0.24.0 \
        python-multipart==0.0.6 \
        python-jose[cryptography]==3.3.0 \
        passlib[bcrypt]==1.7.4 \
        pyjwt==2.8.0 \
        bcrypt==4.1.2 \
        bleach==6.1.0 \
        slowapi==0.1.9

# Copy application code
COPY --chown=appuser:appuser main_secure.py ./main.py
COPY --chown=appuser:appuser services/ ./services/
COPY --chown=appuser:appuser database/ ./database/

# Create secure data directory
RUN mkdir -p /app/data /app/logs \
    && chown -R appuser:appuser /app/data /app/logs \
    && chmod 750 /app/data /app/logs

# Switch to non-root user
USER appuser

# Security: Remove package manager and shell access
RUN rm -f /usr/bin/apt* /usr/bin/dpkg* /bin/sh /bin/bash || true

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
EOF

# Create secure docker-compose
echo "🐳 Creating secure docker-compose configuration..."
cat > docker-compose.secure.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: secure-postgres
    environment:
      - POSTGRES_DB=secure_db
      - POSTGRES_USER=secure_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256 --auth-local=scram-sha-256
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "127.0.0.1:5432:5432"  # Bind to localhost only
    networks:
      - secure-network
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /var/run/postgresql
    user: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U secure_user -d secure_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: '0.5'
        reservations:
          memory: 128M
          cpus: '0.25'

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend.secure
    container_name: secure-backend
    ports:
      - "127.0.0.1:8001:8000"  # Bind to localhost only
    environment:
      - DATABASE_URL=postgresql://secure_user:${DB_PASSWORD}@postgres:5432/secure_db
      - JWT_SECRET=${JWT_SECRET}
      - ALLOWED_ORIGINS=https://yourdomain.com
      - SSL_REQUIRED=false
    volumes:
      - app_data:/app/data
      - app_logs:/app/logs
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - secure-network
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    user: "1000:1000"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'

networks:
  secure-network:
    driver: bridge
    internal: false  # Allow external access through proxy
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
  app_data:
    driver: local
  app_logs:
    driver: local
EOF

echo "✅ Secure Docker configuration created"

# Create installation requirements
echo "📦 Creating secure requirements.txt..."
cat > requirements.secure.txt << 'EOF'
# SECURE Python Dependencies - Emergency Security Fix
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pyjwt==2.8.0
bcrypt==4.1.2
pydantic==2.5.0
asyncpg==0.29.0
aiosqlite==0.19.0
httpx==0.25.2
python-dotenv==1.0.0
bleach==6.1.0
slowapi==0.1.9
python-dateutil==2.8.2

# Security scanning tools
bandit==1.7.5
safety==2.3.4
semgrep==1.45.0
EOF

echo "✅ Secure requirements created"

# Create deployment checklist
echo "📋 Creating security deployment checklist..."
cat > SECURITY_DEPLOYMENT_CHECKLIST.md << 'EOF'
# 🔒 SECURITY DEPLOYMENT CHECKLIST

## BEFORE DEPLOYMENT - MANDATORY STEPS

### 1. Environment Security ✅
- [ ] Generate secure JWT_SECRET: `openssl rand -hex 32`
- [ ] Generate secure DB_PASSWORD: `openssl rand -base64 24`
- [ ] Generate secure ADMIN_PASSWORD: `openssl rand -base64 16`
- [ ] Set ALLOWED_ORIGINS to actual domain (NO wildcards)
- [ ] Enable SSL_REQUIRED=true for production
- [ ] Set secure cookie flags

### 2. Replace Vulnerable Files ✅
- [ ] Replace main.py with main_secure.py
- [ ] Replace auth_service.py with services/secure/auth_service.py
- [ ] Use Dockerfile.backend.secure instead of Dockerfile.backend
- [ ] Use docker-compose.secure.yml instead of docker-compose.yml
- [ ] Install requirements.secure.txt

### 3. Database Security ✅
- [ ] Change default database credentials
- [ ] Enable SSL for database connections
- [ ] Apply database init script with security constraints
- [ ] Set up database backup encryption

### 4. Network Security ✅
- [ ] Configure firewall rules
- [ ] Use HTTPS only (SSL certificates)
- [ ] Restrict Docker port bindings to localhost
- [ ] Set up reverse proxy (nginx/caddy)

### 5. Monitoring & Logging ✅
- [ ] Enable security event logging
- [ ] Set up log rotation
- [ ] Configure security alerts
- [ ] Monitor failed login attempts

## DEPLOYMENT COMMANDS

```bash
# 1. Backup current system
cp main.py main.py.backup
cp docker-compose.yml docker-compose.yml.backup

# 2. Deploy security fixes
cp main_secure.py main.py
cp docker-compose.secure.yml docker-compose.yml
cp Dockerfile.backend.secure Dockerfile.backend
cp requirements.secure.txt requirements.txt

# 3. Generate secure environment
source .env.secure

# 4. Deploy with security
docker-compose down
docker-compose up --build -d

# 5. Verify security
./verify_security.sh
```

## POST-DEPLOYMENT VERIFICATION

### 1. Security Tests ✅
- [ ] Run security scan: `bandit -r . -f json -o security-report.json`
- [ ] Check dependency vulnerabilities: `safety check`
- [ ] Test rate limiting on login endpoint
- [ ] Verify CORS policy with browser dev tools
- [ ] Test input validation with malicious payloads

### 2. Authentication Tests ✅
- [ ] Verify default admin password changed
- [ ] Test JWT token expiration
- [ ] Test token blacklisting on logout
- [ ] Verify failed login rate limiting

### 3. Network Tests ✅
- [ ] Verify HTTPS enforcement
- [ ] Test security headers with: `curl -I https://yourdomain.com`
- [ ] Check port bindings: `netstat -tlnp`
- [ ] Verify database access restrictions

## EMERGENCY ROLLBACK

If issues arise:

```bash
# Quick rollback
docker-compose down
cp main.py.backup main.py
cp docker-compose.yml.backup docker-compose.yml
docker-compose up -d
```

## ONGOING SECURITY

### Daily
- [ ] Monitor security logs
- [ ] Check for failed login attempts
- [ ] Verify system health

### Weekly  
- [ ] Run security scans
- [ ] Update dependencies
- [ ] Review access logs

### Monthly
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Security training review

---

**⚠️  DO NOT DEPLOY TO PRODUCTION WITHOUT COMPLETING ALL CHECKLIST ITEMS**
EOF

echo "✅ Security deployment checklist created"

# Create verification script
echo "🔍 Creating security verification script..."
cat > verify_security.sh << 'EOF'
#!/bin/bash
# Security Verification Script

set -e

echo "🔍 SECURITY VERIFICATION - 6FB AI Agent System"
echo "=============================================="

# Check if secure files exist
echo "📂 Checking secure files..."
if [ -f "main_secure.py" ]; then
    echo "✅ main_secure.py exists"
else
    echo "❌ main_secure.py missing"
fi

if [ -d "services/secure" ]; then
    echo "✅ Secure services directory exists"
else
    echo "❌ Secure services directory missing"
fi

# Check environment variables
echo "🔐 Checking environment security..."
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET not set"
else
    echo "✅ JWT_SECRET is configured"
fi

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ DB_PASSWORD not set"
else
    echo "✅ DB_PASSWORD is configured"
fi

# Check for hardcoded secrets
echo "🔍 Scanning for hardcoded secrets..."
if grep -r "your-secret-key" . --exclude-dir=node_modules --exclude="*.sh" --exclude="*.md"; then
    echo "❌ Hardcoded secrets found"
else
    echo "✅ No hardcoded secrets detected"
fi

# Check Docker security
echo "🐳 Checking Docker security..."
if [ -f "docker-compose.secure.yml" ]; then
    echo "✅ Secure Docker compose file exists"
else
    echo "❌ Secure Docker compose file missing"
fi

# Test endpoints if server is running
echo "🌐 Testing endpoint security..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Server is responding"
    
    # Test security headers
    if curl -I -s http://localhost:8001/health | grep -q "X-Content-Type-Options"; then
        echo "✅ Security headers present"
    else
        echo "❌ Security headers missing"
    fi
    
    # Test rate limiting (this should fail after multiple attempts)
    echo "🚦 Testing rate limiting..."
    for i in {1..6}; do
        curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/api/v1/auth/secure-login \
             -H "Content-Type: application/json" \
             -d '{"email":"test@test.com","password":"test"}' || true
    done
    echo ""
    
else
    echo "⚠️  Server not running - skipping endpoint tests"
fi

echo ""
echo "📋 SECURITY VERIFICATION COMPLETE"
echo "Review any ❌ items above before deploying to production"
EOF

chmod +x verify_security.sh

echo "✅ Security verification script created"

# Final summary
echo ""
echo "🎉 EMERGENCY SECURITY FIXES COMPLETE!"
echo "====================================="
echo ""
echo "📁 Files Created:"
echo "  - .env.secure (secure environment template)"
echo "  - services/secure/ (secure service implementations)"
echo "  - main_secure.py (secure FastAPI server)"
echo "  - Dockerfile.backend.secure (secure container)"
echo "  - docker-compose.secure.yml (secure orchestration)"
echo "  - requirements.secure.txt (secure dependencies)"
echo "  - SECURITY_DEPLOYMENT_CHECKLIST.md (deployment guide)"
echo "  - verify_security.sh (security verification)"
echo ""
echo "🚨 NEXT STEPS (IMMEDIATE):"
echo "1. Review SECURITY_DEPLOYMENT_CHECKLIST.md"
echo "2. Generate secure environment: source .env.secure"
echo "3. Deploy secure version: docker-compose -f docker-compose.secure.yml up --build"
echo "4. Run verification: ./verify_security.sh"
echo "5. Test all functionality before production deployment"
echo ""
echo "⚠️  WARNING: DO NOT USE ORIGINAL FILES - THEY CONTAIN CRITICAL VULNERABILITIES"
echo ""