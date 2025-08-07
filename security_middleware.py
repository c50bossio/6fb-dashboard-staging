#!/usr/bin/env python3
"""
Comprehensive Security Middleware for 6FB AI Agent System
Implements all critical security measures to prevent vulnerabilities
"""

import time
import hashlib
import secrets
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Dict, Set, Optional
import logging
import re
import html
from datetime import datetime, timedelta
from collections import defaultdict
import jwt
import os

# Configure logger
logger = logging.getLogger(__name__)

# Token blacklist for logout functionality
TOKEN_BLACKLIST: Set[str] = set()

# Rate limiting storage
RATE_LIMIT_STORAGE: Dict[str, Dict] = defaultdict(lambda: {"count": 0, "reset_time": time.time() + 60})

# CSRF token storage
CSRF_TOKENS: Dict[str, float] = {}

class SecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware implementing all security best practices"""
    
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key
        
        # Security configuration
        self.rate_limit_requests = 100  # requests per minute per IP
        self.rate_limit_window = 60     # seconds
        self.max_content_length = 10 * 1024 * 1024  # 10MB
        
        # XSS prevention patterns
        self.xss_patterns = [
            r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>',
            r'javascript:',
            r'on\w+\s*=',
            r'expression\s*\(',
            r'@import',
            r'<iframe',
            r'<embed',
            r'<object'
        ]
        
        # SQL injection patterns
        self.sql_patterns = [
            r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
            r'(\b(OR|AND)\s+\d+\s*=\s*\d+)',
            r'(--|/\*|\*/)',
            r'(\bxp_cmdshell\b)',
            r'(\bsp_executesql\b)'
        ]
    
    async def dispatch(self, request: Request, call_next):
        """Main security middleware dispatch"""
        start_time = time.time()
        
        try:
            # 1. Rate limiting
            await self._check_rate_limit(request)
            
            # 2. Content length validation
            await self._validate_content_length(request)
            
            # 3. Input validation and sanitization
            await self._validate_and_sanitize_input(request)
            
            # 4. CSRF protection for state-changing operations
            await self._check_csrf_protection(request)
            
            # 5. JWT token blacklist check
            await self._check_token_blacklist(request)
            
            # Process request
            response = await call_next(request)
            
            # 6. Add security headers
            response = self._add_security_headers(response)
            
            # 7. Log security events
            process_time = time.time() - start_time
            await self._log_security_event(request, response, process_time)
            
            return response
            
        except HTTPException as e:
            # Log security violations
            await self._log_security_violation(request, str(e.detail))
            raise
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal security error"
            )
    
    async def _check_rate_limit(self, request: Request):
        """Implement rate limiting to prevent brute force attacks"""
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean expired entries
        if current_time > RATE_LIMIT_STORAGE[client_ip]["reset_time"]:
            RATE_LIMIT_STORAGE[client_ip] = {
                "count": 0,
                "reset_time": current_time + self.rate_limit_window
            }
        
        # Check rate limit
        RATE_LIMIT_STORAGE[client_ip]["count"] += 1
        
        if RATE_LIMIT_STORAGE[client_ip]["count"] > self.rate_limit_requests:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
    
    async def _validate_content_length(self, request: Request):
        """Validate content length to prevent DoS attacks"""
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_content_length:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request too large"
            )
    
    async def _validate_and_sanitize_input(self, request: Request):
        """Comprehensive input validation and sanitization"""
        # Skip validation for GET requests without query parameters
        if request.method == "GET" and not request.query_params:
            return
        
        # Get request data
        request_data = await self._get_request_data(request)
        
        if request_data:
            # Check for XSS attacks
            self._check_xss_patterns(request_data)
            
            # Check for SQL injection
            self._check_sql_injection_patterns(request_data)
            
            # Validate specific fields
            self._validate_specific_fields(request_data)
    
    async def _get_request_data(self, request: Request) -> Optional[str]:
        """Safely extract request data for validation"""
        try:
            if request.method in ["POST", "PUT", "PATCH"]:
                # Clone the request body for validation
                body = await request.body()
                if body:
                    return body.decode("utf-8", errors="ignore")
            
            # Check query parameters
            if request.query_params:
                return str(dict(request.query_params))
                
        except Exception as e:
            logger.warning(f"Error reading request data: {e}")
            
        return None
    
    def _check_xss_patterns(self, data: str):
        """Check for XSS attack patterns"""
        data_lower = data.lower()
        
        for pattern in self.xss_patterns:
            if re.search(pattern, data_lower, re.IGNORECASE):
                logger.warning(f"XSS attempt detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
    
    def _check_sql_injection_patterns(self, data: str):
        """Check for SQL injection attack patterns"""
        data_upper = data.upper()
        
        for pattern in self.sql_patterns:
            if re.search(pattern, data_upper, re.IGNORECASE):
                logger.warning(f"SQL injection attempt detected: {pattern}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected"
                )
    
    def _validate_specific_fields(self, data: str):
        """Validate specific field patterns"""
        # Email validation pattern
        if "email" in data.lower():
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, data)
            for email in emails:
                if len(email) > 254:  # RFC 5321 limit
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email address too long"
                    )
        
        # Password validation
        if "password" in data.lower():
            # Don't log passwords, just validate length
            if len(data) > 10000:  # Reasonable password length limit
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password too long"
                )
    
    async def _check_csrf_protection(self, request: Request):
        """CSRF protection for state-changing operations"""
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            # Skip CSRF for API authentication endpoints (they use other protection)
            if request.url.path.startswith("/api/v1/auth/"):
                return
                
            csrf_token = request.headers.get("X-CSRF-Token")
            if not csrf_token:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token missing"
                )
            
            # Validate CSRF token
            if not self._validate_csrf_token(csrf_token):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid CSRF token"
                )
    
    def _validate_csrf_token(self, token: str) -> bool:
        """Validate CSRF token"""
        try:
            token_time = CSRF_TOKENS.get(token)
            if not token_time:
                return False
            
            # Check if token is expired (1 hour)
            if time.time() - token_time > 3600:
                del CSRF_TOKENS[token]
                return False
            
            return True
        except Exception:
            return False
    
    async def _check_token_blacklist(self, request: Request):
        """Check if JWT token is blacklisted"""
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
            if token in TOKEN_BLACKLIST:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
    
    def _add_security_headers(self, response: Response) -> Response:
        """Add comprehensive security headers"""
        security_headers = {
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Prevent MIME type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # XSS protection
            "X-XSS-Protection": "1; mode=block",
            
            # Referrer policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Content Security Policy
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' http://localhost:8001 ws://localhost:9999; "
                "frame-ancestors 'none';"
            ),
            
            # HSTS (if using HTTPS)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            
            # Permissions policy
            "Permissions-Policy": (
                "geolocation=(), microphone=(), camera=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=()"
            ),
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers (proxy/load balancer)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    async def _log_security_event(self, request: Request, response: Response, process_time: float):
        """Log security events for monitoring"""
        client_ip = self._get_client_ip(request)
        
        # Only log important security events, not every request
        if (response.status_code >= 400 or 
            request.method in ["POST", "PUT", "PATCH", "DELETE"] or
            "auth" in request.url.path):
            
            logger.info(
                f"Security Event - IP: {client_ip}, "
                f"Method: {request.method}, "
                f"Path: {request.url.path}, "
                f"Status: {response.status_code}, "
                f"Time: {process_time:.3f}s"
            )
    
    async def _log_security_violation(self, request: Request, violation: str):
        """Log security violations"""
        client_ip = self._get_client_ip(request)
        
        logger.warning(
            f"SECURITY VIOLATION - IP: {client_ip}, "
            f"Method: {request.method}, "
            f"Path: {request.url.path}, "
            f"Violation: {violation}, "
            f"Time: {datetime.now().isoformat()}"
        )

# Utility functions for security management

def generate_csrf_token() -> str:
    """Generate a new CSRF token"""
    token = secrets.token_urlsafe(32)
    CSRF_TOKENS[token] = time.time()
    return token

def blacklist_token(token: str):
    """Add token to blacklist"""
    TOKEN_BLACKLIST.add(token)

def sanitize_input(input_string: str) -> str:
    """Sanitize user input"""
    if not input_string:
        return ""
    
    # HTML escape
    sanitized = html.escape(input_string)
    
    # Remove null bytes
    sanitized = sanitized.replace('\x00', '')
    
    # Limit length
    if len(sanitized) > 10000:
        sanitized = sanitized[:10000]
    
    return sanitized.strip()

def validate_jwt_token(token: str, secret_key: str) -> bool:
    """Validate JWT token with additional security checks"""
    try:
        # Check blacklist first
        if token in TOKEN_BLACKLIST:
            return False
        
        # Decode and validate
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        
        # Check expiration
        exp = payload.get('exp')
        if not exp or datetime.utcnow() > datetime.fromtimestamp(exp):
            return False
        
        # Check required fields
        if not payload.get('sub'):
            return False
        
        return True
        
    except jwt.InvalidTokenError:
        return False
    except Exception as e:
        logger.error(f"JWT validation error: {e}")
        return False

# Password security utilities

def validate_password_strength(password: str) -> bool:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False
    
    # Check for at least one uppercase, lowercase, digit, and special character
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    return has_upper and has_lower and has_digit and has_special

def generate_secure_secret_key() -> str:
    """Generate a cryptographically secure secret key"""
    return secrets.token_urlsafe(64)