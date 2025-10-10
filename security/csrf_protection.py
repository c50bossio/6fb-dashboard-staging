#!/usr/bin/env python3
"""
CSRF Protection Middleware for 6FB AI Agent Booking System
Security Specialist Implementation

Provides comprehensive CSRF protection with special focus on payment forms,
booking operations, and sensitive user actions. Implements double-submit cookies,
synchronizer tokens, and SameSite cookie protections.
"""

import os
import hmac
import hashlib
import secrets
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import json
import base64
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class CSRFConfig:
    """Configuration for CSRF protection"""
    
    # Token settings
    TOKEN_LENGTH = 32
    TOKEN_LIFETIME = 3600  # 1 hour in seconds
    COOKIE_NAME = '6fb_csrf_token'
    HEADER_NAME = 'X-CSRF-Token'
    FORM_FIELD_NAME = 'csrf_token'
    
    # Security settings
    SECURE_COOKIES = True
    SAMESITE_STRICT = True
    HTTPONLY_COOKIES = False  # Must be False for JavaScript access
    
    # Protected endpoints - payment and booking related
    PROTECTED_ENDPOINTS = {
        '/api/bookings',
        '/api/payments', 
        '/api/user/profile',
        '/api/user/settings',
        '/api/admin',
        '/api/auth/password-reset',
        '/api/staff/schedule',
        '/api/services',
    }
    
    # High-risk endpoints requiring additional validation
    HIGH_RISK_ENDPOINTS = {
        '/api/payments/process',
        '/api/payments/refund',
        '/api/bookings/cancel',
        '/api/user/delete',
        '/api/admin/users',
        '/api/admin/settings',
    }
    
    # Methods that require CSRF protection
    PROTECTED_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    
    # Safe methods that don't modify state
    SAFE_METHODS = {'GET', 'HEAD', 'OPTIONS', 'TRACE'}

class CSRFTokenManager:
    """Manages CSRF token generation, validation, and lifecycle"""
    
    def __init__(self, secret_key: str = None):
        self.secret_key = secret_key or os.getenv('CSRF_SECRET_KEY') or secrets.token_urlsafe(32)
        self.token_store = {}  # In production, use Redis or database
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = datetime.utcnow()
        
        logger.info("CSRF Token Manager initialized")
    
    def generate_token(self, session_id: str = None) -> Dict[str, str]:
        """
        Generate CSRF token with session binding
        
        Returns:
            dict: Contains 'token', 'expires_at', and 'hash'
        """
        # Generate random token
        raw_token = secrets.token_urlsafe(CSRFConfig.TOKEN_LENGTH)
        
        # Create timestamp
        expires_at = datetime.utcnow() + timedelta(seconds=CSRFConfig.TOKEN_LIFETIME)
        timestamp = int(expires_at.timestamp())
        
        # Create session-bound token if session_id provided
        if session_id:
            token_data = f"{raw_token}:{session_id}:{timestamp}"
        else:
            token_data = f"{raw_token}:{timestamp}"
        
        # Create HMAC signature
        signature = hmac.new(
            self.secret_key.encode(),
            token_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Combine token and signature
        full_token = f"{raw_token}:{timestamp}:{signature}"
        
        # Store token hash for double-verification
        token_hash = hashlib.sha256(full_token.encode()).hexdigest()
        
        self.token_store[token_hash] = {
            'token': full_token,
            'session_id': session_id,
            'created_at': datetime.utcnow(),
            'expires_at': expires_at,
            'used': False
        }
        
        # Cleanup old tokens periodically
        self._cleanup_expired_tokens()
        
        return {
            'token': full_token,
            'expires_at': expires_at.isoformat(),
            'hash': token_hash
        }
    
    def validate_token(self, token: str, session_id: str = None, 
                      single_use: bool = False) -> bool:
        """
        Validate CSRF token with timing-safe comparison
        
        Args:
            token: The CSRF token to validate
            session_id: Optional session binding
            single_use: Whether token should be invalidated after use
        """
        try:
            # Parse token components
            parts = token.split(':')
            if len(parts) != 3:
                logger.warning("CSRF token format invalid")
                return False
            
            raw_token, timestamp_str, provided_signature = parts
            timestamp = int(timestamp_str)
            
            # Check expiration
            if datetime.utcnow().timestamp() > timestamp:
                logger.warning("CSRF token expired")
                return False
            
            # Recreate expected signature
            if session_id:
                token_data = f"{raw_token}:{session_id}:{timestamp_str}"
            else:
                token_data = f"{raw_token}:{timestamp_str}"
            
            expected_signature = hmac.new(
                self.secret_key.encode(),
                token_data.encode(),
                hashlib.sha256
            ).hexdigest()
            
            # Timing-safe comparison
            if not hmac.compare_digest(provided_signature, expected_signature):
                logger.warning("CSRF token signature invalid")
                return False
            
            # Check against stored tokens
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            stored_token = self.token_store.get(token_hash)
            
            if not stored_token:
                logger.warning("CSRF token not found in store")
                return False
            
            if stored_token['used'] and single_use:
                logger.warning("CSRF token already used")
                return False
            
            # Validate session binding if provided
            if session_id and stored_token['session_id'] != session_id:
                logger.warning("CSRF token session mismatch")
                return False
            
            # Mark as used if single-use
            if single_use:
                stored_token['used'] = True
            
            logger.info("CSRF token validated successfully")
            return True
            
        except (ValueError, TypeError) as e:
            logger.error(f"CSRF token validation error: {e}")
            return False
    
    def _cleanup_expired_tokens(self):
        """Remove expired tokens from store"""
        if (datetime.utcnow() - self.last_cleanup).seconds < self.cleanup_interval:
            return
        
        current_time = datetime.utcnow()
        expired_tokens = [
            token_hash for token_hash, token_data in self.token_store.items()
            if token_data['expires_at'] < current_time
        ]
        
        for token_hash in expired_tokens:
            del self.token_store[token_hash]
        
        self.last_cleanup = current_time
        
        if expired_tokens:
            logger.info(f"Cleaned up {len(expired_tokens)} expired CSRF tokens")

class CSRFProtectionMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive CSRF Protection Middleware
    
    Features:
    - Double-submit cookies
    - Synchronizer tokens
    - SameSite cookies
    - Origin validation
    - Referer checking
    - Special protection for payment forms
    """
    
    def __init__(self, app, config: CSRFConfig = None, token_manager: CSRFTokenManager = None):
        super().__init__(app)
        self.config = config or CSRFConfig()
        self.token_manager = token_manager or CSRFTokenManager()
        
        logger.info("CSRF Protection Middleware initialized")
    
    async def dispatch(self, request: Request, call_next):
        """Main middleware dispatch logic"""
        
        # Skip CSRF protection for safe methods
        if request.method in self.config.SAFE_METHODS:
            return await call_next(request)
        
        # Check if endpoint requires CSRF protection
        if not self._requires_csrf_protection(request):
            return await call_next(request)
        
        # Validate CSRF token
        csrf_result = await self._validate_csrf_request(request)
        
        if not csrf_result['valid']:
            logger.warning(f"CSRF validation failed: {csrf_result['reason']}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "error": "CSRF validation failed",
                    "message": "Invalid or missing CSRF token",
                    "code": "CSRF_TOKEN_INVALID"
                },
                headers={
                    "X-CSRF-Failure-Reason": csrf_result['reason']
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add new CSRF token to response if needed
        if self._should_refresh_token(request):
            await self._add_csrf_token_to_response(request, response)
        
        return response
    
    def _requires_csrf_protection(self, request: Request) -> bool:
        """Determine if request requires CSRF protection"""
        
        # Check method
        if request.method not in self.config.PROTECTED_METHODS:
            return False
        
        # Check endpoint patterns
        path = request.url.path
        
        # Direct match
        if path in self.config.PROTECTED_ENDPOINTS:
            return True
        
        # Pattern matching for API endpoints
        for protected_path in self.config.PROTECTED_ENDPOINTS:
            if path.startswith(protected_path):
                return True
        
        return False
    
    async def _validate_csrf_request(self, request: Request) -> Dict[str, any]:
        """Comprehensive CSRF request validation"""
        
        # Get session ID from request (implement based on your session management)
        session_id = self._get_session_id(request)
        
        # 1. Origin/Referer validation
        origin_valid = self._validate_origin(request)
        if not origin_valid:
            return {"valid": False, "reason": "invalid_origin"}
        
        # 2. Extract CSRF token from multiple sources
        token = self._extract_csrf_token(request)
        if not token:
            return {"valid": False, "reason": "missing_token"}
        
        # 3. Validate token
        is_high_risk = self._is_high_risk_endpoint(request)
        token_valid = self.token_manager.validate_token(
            token, 
            session_id=session_id,
            single_use=is_high_risk  # High-risk operations use single-use tokens
        )
        
        if not token_valid:
            return {"valid": False, "reason": "invalid_token"}
        
        # 4. Additional validation for payment endpoints
        if self._is_payment_endpoint(request):
            payment_valid = await self._validate_payment_csrf(request, token)
            if not payment_valid:
                return {"valid": False, "reason": "payment_validation_failed"}
        
        return {"valid": True, "reason": "validated"}
    
    def _validate_origin(self, request: Request) -> bool:
        """Validate request origin and referer headers"""
        
        # Get allowed origins
        allowed_origins = self._get_allowed_origins()
        
        # Check Origin header (preferred)
        origin = request.headers.get('Origin')
        if origin:
            parsed_origin = urlparse(origin)
            origin_host = f"{parsed_origin.scheme}://{parsed_origin.netloc}"
            return origin_host in allowed_origins
        
        # Fallback to Referer header
        referer = request.headers.get('Referer')
        if referer:
            parsed_referer = urlparse(referer)
            referer_host = f"{parsed_referer.scheme}://{parsed_referer.netloc}"
            return referer_host in allowed_origins
        
        # No origin/referer - potentially suspicious
        logger.warning("Request missing Origin and Referer headers")
        return False
    
    def _extract_csrf_token(self, request: Request) -> Optional[str]:
        """Extract CSRF token from multiple sources"""
        
        # 1. Check custom header
        token = request.headers.get(self.config.HEADER_NAME)
        if token:
            return token
        
        # 2. Check form data (for form submissions)
        if hasattr(request, '_form'):
            form_data = request._form
            if self.config.FORM_FIELD_NAME in form_data:
                return form_data[self.config.FORM_FIELD_NAME]
        
        # 3. Check query parameters (less secure, avoid for sensitive operations)
        if self.config.FORM_FIELD_NAME in request.query_params:
            return request.query_params[self.config.FORM_FIELD_NAME]
        
        return None
    
    def _get_session_id(self, request: Request) -> Optional[str]:
        """Extract session ID from request"""
        # Implement based on your session management
        # This could be from cookies, JWT, or other session store
        session_cookie = request.cookies.get('session_id')
        return session_cookie
    
    def _is_high_risk_endpoint(self, request: Request) -> bool:
        """Check if endpoint is high-risk requiring single-use tokens"""
        path = request.url.path
        return any(path.startswith(endpoint) for endpoint in self.config.HIGH_RISK_ENDPOINTS)
    
    def _is_payment_endpoint(self, request: Request) -> bool:
        """Check if endpoint is payment-related"""
        path = request.url.path
        return '/payments' in path or '/billing' in path
    
    async def _validate_payment_csrf(self, request: Request, token: str) -> bool:
        """Additional validation for payment-related requests"""
        
        # Enhanced validation for payment forms
        # Could include additional factors like:
        # - Time-based validation (payment forms expire quickly)
        # - User agent consistency
        # - IP address validation
        # - Additional entropy checks
        
        # For now, ensure double-submit cookie matches
        cookie_token = request.cookies.get(self.config.COOKIE_NAME)
        if not cookie_token:
            return False
        
        return hmac.compare_digest(token, cookie_token)
    
    def _should_refresh_token(self, request: Request) -> bool:
        """Determine if CSRF token should be refreshed in response"""
        # Refresh tokens for authenticated users after successful operations
        return request.method in {'POST', 'PUT', 'PATCH'} and self._is_authenticated(request)
    
    def _is_authenticated(self, request: Request) -> bool:
        """Check if request is from authenticated user"""
        # Implement based on your authentication system
        auth_header = request.headers.get('Authorization')
        session_cookie = request.cookies.get('session_id')
        return bool(auth_header or session_cookie)
    
    async def _add_csrf_token_to_response(self, request: Request, response: Response):
        """Add new CSRF token to response"""
        session_id = self._get_session_id(request)
        token_data = self.token_manager.generate_token(session_id)
        
        # Set cookie with secure attributes
        response.set_cookie(
            key=self.config.COOKIE_NAME,
            value=token_data['token'],
            max_age=self.config.TOKEN_LIFETIME,
            secure=self.config.SECURE_COOKIES,
            httponly=self.config.HTTPONLY_COOKIES,
            samesite='strict' if self.config.SAMESITE_STRICT else 'lax'
        )
        
        # Also provide token in header for JavaScript access
        response.headers['X-CSRF-Token'] = token_data['token']
    
    def _get_allowed_origins(self) -> Set[str]:
        """Get list of allowed origins for the application"""
        # Configure based on your deployment
        allowed = {
            'http://localhost:3000',
            'https://localhost:3000',
            'http://127.0.0.1:3000',
        }
        
        # Add production domains
        production_domain = os.getenv('PRODUCTION_DOMAIN')
        if production_domain:
            allowed.add(f'https://{production_domain}')
            allowed.add(f'http://{production_domain}')  # Only if HTTP is allowed
        
        return allowed

# Utility functions for CSRF token management
class CSRFUtils:
    """Utility functions for CSRF protection"""
    
    @staticmethod
    def generate_token_for_form(session_id: str = None) -> str:
        """Generate CSRF token for embedding in forms"""
        token_manager = CSRFTokenManager()
        token_data = token_manager.generate_token(session_id)
        return token_data['token']
    
    @staticmethod
    def create_hidden_input(session_id: str = None) -> str:
        """Create hidden input HTML for forms"""
        token = CSRFUtils.generate_token_for_form(session_id)
        return f'<input type="hidden" name="{CSRFConfig.FORM_FIELD_NAME}" value="{token}" />'
    
    @staticmethod
    def validate_form_token(token: str, session_id: str = None) -> bool:
        """Validate CSRF token from form submission"""
        token_manager = CSRFTokenManager()
        return token_manager.validate_token(token, session_id)

# FastAPI dependency for CSRF protection
async def verify_csrf_token(request: Request) -> bool:
    """FastAPI dependency for CSRF verification"""
    # This would be used as a dependency in FastAPI routes
    # Example: @app.post("/protected", dependencies=[Depends(verify_csrf_token)])
    
    csrf_middleware = CSRFProtectionMiddleware(None)
    result = await csrf_middleware._validate_csrf_request(request)
    
    if not result['valid']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token validation failed"
        )
    
    return True

# Example usage in FastAPI routes
"""
from fastapi import FastAPI, Depends, Form
from security.csrf_protection import verify_csrf_token

app = FastAPI()

@app.post("/api/bookings", dependencies=[Depends(verify_csrf_token)])
async def create_booking(
    customer_name: str = Form(...),
    csrf_token: str = Form(...)
):
    # Booking logic here
    pass

@app.post("/api/payments/process", dependencies=[Depends(verify_csrf_token)])
async def process_payment(
    amount: float = Form(...),
    csrf_token: str = Form(...)
):
    # Payment processing logic here
    pass
"""