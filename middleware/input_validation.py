"""
Comprehensive Input Validation Middleware
Protects against injection attacks, XSS, and malicious inputs
"""

import re
import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import html

logger = logging.getLogger(__name__)

class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive input validation middleware for all API endpoints
    """
    
    def __init__(self, app, max_content_length: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_content_length = max_content_length
        self.sql_injection_patterns = [
            r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)",
            r"([\'\"](\s)*(OR|AND)(\s)*[\'\"])",
            r"([\'\"](\s)*(\d)+(\s)*=(\s)*[\'\"])",
            r"(--|\#|\/\*|\*\/)",
            r"(\bxp_|\bsp_|\bfn_)",
            r"(\b(SYSOBJECTS|SYSCOLUMNS|SYSTABLES)\b)"
        ]
        
        self.xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"<iframe[^>]*>.*?</iframe>",
            r"javascript:",
            r"vbscript:",
            r"onload\s*=",
            r"onerror\s*=",
            r"onclick\s*=",
            r"onmouseover\s*=",
            r"<object[^>]*>.*?</object>",
            r"<embed[^>]*>.*?</embed>"
        ]
        
        self.allowed_content_types = [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data",
            "text/plain"
        ]
    
    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Main validation dispatch method
        """
        
        try:
            # Skip validation for health check and basic endpoints
            if self._should_skip_validation(request.url.path):
                return await call_next(request)
            
            # Validate request size
            if hasattr(request, "headers") and "content-length" in request.headers:
                content_length = int(request.headers.get("content-length", 0))
                if content_length > self.max_content_length:
                    logger.warning(f"Request too large: {content_length} bytes from {request.client.host}")
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Request too large"
                    )
            
            # Only validate content type for POST/PUT/PATCH requests
            if request.method in ["POST", "PUT", "PATCH"]:
                await self._validate_content_type(request)
                await self._validate_request_body(request)
            
            # Only validate headers for potentially dangerous requests
            if request.method not in ["GET", "HEAD", "OPTIONS"]:
                await self._validate_headers(request)
            
            # Only validate query parameters if they exist and request isn't basic
            if request.url.query and not self._is_basic_request(request):
                await self._validate_query_params(request)
            
            # Process request
            response = await call_next(request)
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Input validation error: {e}")
            # For development, be more permissive
            if "development" in str(request.headers.get("host", "")).lower():
                logger.warning("Skipping validation error in development")
                return await call_next(request)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request format"
            )
    
    async def _validate_content_type(self, request: Request):
        """Validate request content type"""
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "").lower()
            
            # Extract base content type (without charset, etc.)
            base_content_type = content_type.split(";")[0].strip()
            
            if base_content_type and base_content_type not in self.allowed_content_types:
                logger.warning(f"Invalid content type: {content_type} from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail="Unsupported content type"
                )
    
    async def _validate_headers(self, request: Request):
        """Validate HTTP headers for malicious content"""
        dangerous_headers = ["x-forwarded-for", "x-real-ip", "user-agent", "referer"]
        
        for header_name, header_value in request.headers.items():
            if header_name.lower() in dangerous_headers:
                # Check for injection patterns in headers
                if self._contains_malicious_patterns(header_value):
                    logger.warning(f"Malicious header detected: {header_name} from {request.client.host}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid header content"
                    )
    
    async def _validate_query_params(self, request: Request):
        """Validate query parameters for injection attacks"""
        if request.url.query:
            query_string = str(request.url.query)
            
            # Check for malicious patterns in query string
            if self._contains_malicious_patterns(query_string):
                logger.warning(f"Malicious query parameters detected from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid query parameters"
                )
            
            # Validate individual parameters
            for param_name, param_value in request.query_params.items():
                if self._contains_malicious_patterns(f"{param_name}={param_value}"):
                    logger.warning(f"Malicious query parameter: {param_name} from {request.client.host}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid parameter: {param_name}"
                    )
    
    async def _validate_request_body(self, request: Request):
        """Validate request body for malicious content"""
        try:
            # Get request body
            body = await request.body()
            
            if not body:
                return
            
            # Decode body content
            try:
                body_str = body.decode('utf-8')
            except UnicodeDecodeError:
                logger.warning(f"Invalid UTF-8 encoding in request body from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid encoding"
                )
            
            # Check for malicious patterns in body
            if self._contains_malicious_patterns(body_str):
                logger.warning(f"Malicious content detected in request body from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid request content"
                )
            
            # If JSON, validate structure
            content_type = request.headers.get("content-type", "").lower()
            if "application/json" in content_type:
                await self._validate_json_body(body_str, request)
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Body validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid request body"
            )
    
    async def _validate_json_body(self, body_str: str, request: Request):
        """Validate JSON body structure and content"""
        try:
            # Parse JSON
            json_data = json.loads(body_str)
            
            # Validate JSON structure recursively
            self._validate_json_recursive(json_data, request)
            
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON format from {request.client.host}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON format"
            )
    
    def _validate_json_recursive(self, data: Any, request: Request, max_depth: int = 10, current_depth: int = 0):
        """Recursively validate JSON data structure"""
        if current_depth > max_depth:
            logger.warning(f"JSON depth exceeded from {request.client.host}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON structure too deep"
            )
        
        if isinstance(data, dict):
            # Validate dictionary keys and values
            for key, value in data.items():
                if isinstance(key, str) and self._contains_malicious_patterns(key):
                    logger.warning(f"Malicious JSON key detected: {key} from {request.client.host}")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid JSON key"
                    )
                
                self._validate_json_recursive(value, request, max_depth, current_depth + 1)
        
        elif isinstance(data, list):
            # Validate list items
            if len(data) > 1000:  # Prevent large array attacks
                logger.warning(f"JSON array too large from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Array too large"
                )
            
            for item in data:
                self._validate_json_recursive(item, request, max_depth, current_depth + 1)
        
        elif isinstance(data, str):
            # Validate string content
            if len(data) > 10000:  # Prevent large string attacks
                logger.warning(f"JSON string too large from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="String too large"
                )
            
            if self._contains_malicious_patterns(data):
                logger.warning(f"Malicious JSON string detected from {request.client.host}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid string content"
                )
    
    def _contains_malicious_patterns(self, text: str) -> bool:
        """Check if text contains malicious patterns"""
        if not isinstance(text, str):
            return False
        
        text_lower = text.lower()
        
        # Check SQL injection patterns
        for pattern in self.sql_injection_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        # Check XSS patterns
        for pattern in self.xss_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        # Check for suspicious characters/sequences
        suspicious_patterns = [
            r"[\x00-\x1f]",  # Control characters
            r"\.\.\/",       # Path traversal
            r"\\x[0-9a-f]{2}",  # Hex encoding
            r"%[0-9a-f]{2}",    # URL encoding of suspicious chars
            r"@@",               # SQL Server variables
            r"\$\{",            # Expression language injection
            r"#{",              # Expression language injection
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    def sanitize_string(self, text: str) -> str:
        """Sanitize string by escaping HTML and removing dangerous characters"""
        if not isinstance(text, str):
            return str(text)
        
        # HTML escape
        text = html.escape(text)
        
        # Remove null bytes and control characters
        text = re.sub(r'[\x00-\x1f]', '', text)
        
        # Limit length
        if len(text) > 10000:
            text = text[:10000]
        
        return text