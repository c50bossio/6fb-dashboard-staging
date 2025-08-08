#!/usr/bin/env python3
"""
API Security Middleware and Decorators for 6FB AI Agent System
Implements input validation, sanitization, and API-specific security measures.
"""

import re
import json
import logging
from typing import Dict, List, Optional, Any, Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
import bleach
from urllib.parse import urlparse
import ipaddress
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class InputValidationConfig:
    """Configuration for input validation rules"""
    
    # Maximum input lengths to prevent DoS
    MAX_LENGTHS = {
        'email': 254,
        'password': 128,
        'username': 50,
        'shop_name': 100,
        'message': 5000,
        'description': 1000,
        'url': 2083,
        'phone': 20,
        'address': 500,
        'general': 10000
    }
    
    # Regex patterns for validation
    PATTERNS = {
        'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
        'username': re.compile(r'^[a-zA-Z0-9_-]{3,50}$'),
        'phone': re.compile(r'^[\d\s\-\+\(\)]{7,20}$'),
        'alphanumeric': re.compile(r'^[a-zA-Z0-9\s]+$'),
        'numeric': re.compile(r'^\d+$'),
        'uuid': re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
    }
    
    # SQL injection patterns to block
    SQL_INJECTION_PATTERNS = [
        re.compile(r'(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)', re.I),
        re.compile(r'(--|#|\/\*|\*\/)', re.I),
        re.compile(r'(\bor\b\s*\d+\s*=\s*\d+)', re.I),
        re.compile(r'(\band\b\s*\d+\s*=\s*\d+)', re.I),
        re.compile(r'(;|\||`)', re.I),
    ]
    
    # XSS patterns to block
    XSS_PATTERNS = [
        re.compile(r'<script[^>]*>.*?</script>', re.I | re.S),
        re.compile(r'javascript:', re.I),
        re.compile(r'on\w+\s*=', re.I),
        re.compile(r'<iframe[^>]*>', re.I),
        re.compile(r'<object[^>]*>', re.I),
        re.compile(r'<embed[^>]*>', re.I),
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        re.compile(r'\.\.\/'),
        re.compile(r'\.\.\\'),
        re.compile(r'%2e%2e'),
        re.compile(r'%252e%252e'),
    ]

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    def __init__(self):
        self.config = InputValidationConfig()
    
    def validate_email(self, email: str) -> str:
        """Validate and sanitize email address"""
        if not email:
            raise ValueError("Email is required")
        
        email = email.strip().lower()
        
        # Check length
        if len(email) > self.config.MAX_LENGTHS['email']:
            raise ValueError("Email address too long")
        
        # Check format
        if not self.config.PATTERNS['email'].match(email):
            raise ValueError("Invalid email format")
        
        # Check for dangerous patterns
        if self._contains_dangerous_pattern(email):
            raise ValueError("Email contains invalid characters")
        
        return email
    
    def validate_password(self, password: str) -> str:
        """Validate password (don't sanitize to preserve special chars)"""
        if not password:
            raise ValueError("Password is required")
        
        # Check length
        if len(password) > self.config.MAX_LENGTHS['password']:
            raise ValueError("Password too long")
        
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        return password
    
    def validate_username(self, username: str) -> str:
        """Validate and sanitize username"""
        if not username:
            raise ValueError("Username is required")
        
        username = username.strip()
        
        # Check length
        if len(username) > self.config.MAX_LENGTHS['username']:
            raise ValueError("Username too long")
        
        # Check format
        if not self.config.PATTERNS['username'].match(username):
            raise ValueError("Username must be 3-50 characters, alphanumeric, underscore, or dash")
        
        return username
    
    def validate_url(self, url: str, allowed_schemes: List[str] = None) -> str:
        """Validate and sanitize URL"""
        if not url:
            raise ValueError("URL is required")
        
        url = url.strip()
        
        # Check length
        if len(url) > self.config.MAX_LENGTHS['url']:
            raise ValueError("URL too long")
        
        # Parse URL
        try:
            parsed = urlparse(url)
        except Exception:
            raise ValueError("Invalid URL format")
        
        # Check scheme
        allowed_schemes = allowed_schemes or ['http', 'https']
        if parsed.scheme not in allowed_schemes:
            raise ValueError(f"URL scheme must be one of: {', '.join(allowed_schemes)}")
        
        # Check for localhost/private IPs in production
        if parsed.hostname:
            try:
                ip = ipaddress.ip_address(parsed.hostname)
                if ip.is_private or ip.is_loopback:
                    raise ValueError("URL cannot point to private or local addresses")
            except ValueError:
                # Not an IP address, check domain
                if parsed.hostname in ['localhost', '127.0.0.1', '0.0.0.0']:
                    raise ValueError("URL cannot point to localhost")
        
        return url
    
    def sanitize_html(self, html: str, allowed_tags: List[str] = None) -> str:
        """Sanitize HTML content"""
        if not html:
            return ""
        
        # Default allowed tags
        allowed_tags = allowed_tags or [
            'p', 'br', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre'
        ]
        
        # Allowed attributes
        allowed_attrs = {
            'a': ['href', 'title'],
            'span': ['class'],
            'div': ['class'],
            'code': ['class']
        }
        
        # Clean HTML
        cleaned = bleach.clean(
            html,
            tags=allowed_tags,
            attributes=allowed_attrs,
            strip=True,
            strip_comments=True
        )
        
        return cleaned
    
    def validate_json(self, json_str: str, max_size: int = 1048576) -> Dict:
        """Validate and parse JSON input"""
        if not json_str:
            raise ValueError("JSON input is required")
        
        # Check size (default 1MB)
        if len(json_str) > max_size:
            raise ValueError("JSON input too large")
        
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError("Invalid JSON format")
        
        # Validate it's a dict/list
        if not isinstance(data, (dict, list)):
            raise ValueError("JSON must be an object or array")
        
        return data
    
    def validate_file_upload(
        self, 
        filename: str, 
        content_type: str, 
        file_size: int,
        allowed_extensions: List[str] = None,
        allowed_types: List[str] = None,
        max_size: int = 10485760  # 10MB default
    ) -> bool:
        """Validate file upload parameters"""
        
        # Check filename
        if not filename or '..' in filename or '/' in filename or '\\' in filename:
            raise ValueError("Invalid filename")
        
        # Check extension
        if allowed_extensions:
            ext = filename.lower().split('.')[-1]
            if ext not in allowed_extensions:
                raise ValueError(f"File type not allowed. Allowed: {', '.join(allowed_extensions)}")
        
        # Check content type
        if allowed_types and content_type not in allowed_types:
            raise ValueError(f"Content type not allowed. Allowed: {', '.join(allowed_types)}")
        
        # Check file size
        if file_size > max_size:
            raise ValueError(f"File too large. Maximum size: {max_size} bytes")
        
        return True
    
    def validate_api_key(self, api_key: str) -> str:
        """Validate API key format"""
        if not api_key:
            raise ValueError("API key is required")
        
        # Remove Bearer prefix if present
        if api_key.startswith('Bearer '):
            api_key = api_key[7:]
        
        api_key = api_key.strip()
        
        # Check length (adjust based on your key format)
        if len(api_key) < 32 or len(api_key) > 128:
            raise ValueError("Invalid API key format")
        
        # Check for valid characters (alphanumeric + common separators)
        if not re.match(r'^[a-zA-Z0-9_-]+$', api_key):
            raise ValueError("API key contains invalid characters")
        
        return api_key
    
    def _contains_dangerous_pattern(self, input_str: str) -> bool:
        """Check if input contains dangerous patterns"""
        
        # Check SQL injection patterns
        for pattern in self.config.SQL_INJECTION_PATTERNS:
            if pattern.search(input_str):
                logger.warning(f"SQL injection pattern detected: {input_str[:50]}...")
                return True
        
        # Check XSS patterns
        for pattern in self.config.XSS_PATTERNS:
            if pattern.search(input_str):
                logger.warning(f"XSS pattern detected: {input_str[:50]}...")
                return True
        
        # Check path traversal
        for pattern in self.config.PATH_TRAVERSAL_PATTERNS:
            if pattern.search(input_str):
                logger.warning(f"Path traversal pattern detected: {input_str[:50]}...")
                return True
        
        return False
    
    def sanitize_for_logging(self, data: Any) -> Any:
        """Sanitize data for safe logging"""
        if isinstance(data, dict):
            sanitized = {}
            sensitive_keys = ['password', 'token', 'api_key', 'secret', 'credit_card']
            
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in sensitive_keys):
                    sanitized[key] = '***REDACTED***'
                else:
                    sanitized[key] = self.sanitize_for_logging(value)
            
            return sanitized
        elif isinstance(data, list):
            return [self.sanitize_for_logging(item) for item in data]
        elif isinstance(data, str):
            # Truncate long strings
            return data[:100] + '...' if len(data) > 100 else data
        else:
            return data

# Global validator instance
input_validator = InputValidator()

# Pydantic models with built-in validation
class SecureEmailModel(BaseModel):
    """Email model with validation"""
    email: str
    
    @validator('email')
    def validate_email(cls, v):
        return input_validator.validate_email(v)

class SecurePasswordModel(BaseModel):
    """Password model with validation"""
    password: str
    
    @validator('password')
    def validate_password(cls, v):
        return input_validator.validate_password(v)

class SecureUserRegistration(SecureEmailModel, SecurePasswordModel):
    """User registration model with validation"""
    username: Optional[str] = None
    shop_name: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if v:
            return input_validator.validate_username(v)
        return v
    
    @validator('shop_name')
    def validate_shop_name(cls, v):
        if v and len(v) > 100:
            raise ValueError("Shop name too long")
        return v

# API Security Decorators
def validate_request_size(max_size: int = 1048576):  # 1MB default
    """Decorator to validate request body size"""
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            content_length = request.headers.get('content-length')
            if content_length and int(content_length) > max_size:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request body too large. Maximum size: {max_size} bytes"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def require_content_type(allowed_types: List[str]):
    """Decorator to enforce content type"""
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            content_type = request.headers.get('content-type', '').split(';')[0]
            if content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Content type must be one of: {', '.join(allowed_types)}"
                )
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

def sanitize_response(func: Callable) -> Callable:
    """Decorator to sanitize response data"""
    async def wrapper(*args, **kwargs):
        response = await func(*args, **kwargs)
        
        # If response is a dict or list, sanitize it
        if isinstance(response, (dict, list)):
            # Remove any potential sensitive data
            sanitized = input_validator.sanitize_for_logging(response)
            return sanitized
        
        return response
    return wrapper

# API Security Middleware
class APISecurityMiddleware:
    """Comprehensive API security middleware"""
    
    def __init__(self, app):
        self.app = app
        self.validator = InputValidator()
    
    async def __call__(self, request: Request, call_next):
        """Process request with security validations"""
        
        try:
            # Check for common attack patterns in URL
            if self._is_suspicious_url(request.url.path):
                logger.warning(f"Suspicious URL pattern: {request.url.path}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid request"}
                )
            
            # Validate headers
            if not self._validate_headers(request.headers):
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid headers"}
                )
            
            # Process request
            response = await call_next(request)
            
            return response
            
        except Exception as e:
            logger.error(f"API Security middleware error: {e}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Internal server error"}
            )
    
    def _is_suspicious_url(self, url_path: str) -> bool:
        """Check if URL contains suspicious patterns"""
        suspicious_patterns = [
            '..', '\\', '<', '>', '|', '`', '\x00', '\r', '\n',
            '.git', '.env', 'wp-admin', 'phpmyadmin'
        ]
        
        return any(pattern in url_path.lower() for pattern in suspicious_patterns)
    
    def _validate_headers(self, headers: Dict) -> bool:
        """Validate request headers"""
        
        # Check for header injection
        for key, value in headers.items():
            if '\r' in value or '\n' in value:
                logger.warning(f"Header injection attempt in {key}")
                return False
        
        # Check User-Agent
        user_agent = headers.get('user-agent', '')
        if len(user_agent) > 500 or not user_agent:
            return False
        
        return True

# Export main components
__all__ = [
    'InputValidator',
    'input_validator',
    'APISecurityMiddleware',
    'validate_request_size',
    'require_content_type',
    'sanitize_response',
    'SecureEmailModel',
    'SecurePasswordModel',
    'SecureUserRegistration'
]