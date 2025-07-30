#!/usr/bin/env python3
"""
Enhanced FastAPI Middleware Stack
Production-ready middleware configuration with performance monitoring,
security hardening, rate limiting, and request/response optimization.
"""

import time
import logging
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Callable
from collections import defaultdict, deque
import hashlib
import gzip
from io import BytesIO

from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.responses import JSONResponse
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO level
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)


class PerformanceMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Advanced performance monitoring with request tracing, metrics collection,
    and automatic performance alerts for slow endpoints.
    """
    
    def __init__(self, app: FastAPI, slow_threshold: float = 1.0):
        super().__init__(app)
        self.slow_threshold = slow_threshold
        self.request_metrics = defaultdict(list)
        self.endpoint_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0,
            'avg_time': 0,
            'slow_requests': 0,
            'errors': 0
        })
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = hashlib.md5(f"{start_time}{request.url}".encode()).hexdigest()[:8]
        
        # Add request ID to headers for tracing
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            
            # Calculate request duration
            duration = time.time() - start_time
            endpoint = f"{request.method} {request.url.path}"
            
            # Update metrics
            self._update_metrics(endpoint, duration, response.status_code)
            
            # Log performance data
            logger.info(
                "request_completed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration=round(duration, 3),
                slow_request=duration > self.slow_threshold
            )
            
            # Add performance headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = str(round(duration * 1000, 2))
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            endpoint = f"{request.method} {request.url.path}"
            
            self._update_metrics(endpoint, duration, 500, error=True)
            
            logger.error(
                "request_failed",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                duration=round(duration, 3),
                error=str(e)
            )
            
            raise
    
    def _update_metrics(self, endpoint: str, duration: float, status_code: int, error: bool = False):
        """Update endpoint performance metrics"""
        stats = self.endpoint_stats[endpoint]
        stats['count'] += 1
        stats['total_time'] += duration
        stats['avg_time'] = stats['total_time'] / stats['count']
        
        if duration > self.slow_threshold:
            stats['slow_requests'] += 1
        
        if error or status_code >= 400:
            stats['errors'] += 1
        
        # Keep rolling window of recent requests (last 1000)
        self.request_metrics[endpoint].append({
            'timestamp': datetime.now(),
            'duration': duration,
            'status_code': status_code
        })
        
        if len(self.request_metrics[endpoint]) > 1000:
            self.request_metrics[endpoint] = self.request_metrics[endpoint][-1000:]
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        return {
            'endpoint_stats': dict(self.endpoint_stats),
            'total_requests': sum(stats['count'] for stats in self.endpoint_stats.values()),
            'slow_requests': sum(stats['slow_requests'] for stats in self.endpoint_stats.values()),
            'error_requests': sum(stats['errors'] for stats in self.endpoint_stats.values()),
            'avg_response_time': sum(stats['avg_time'] for stats in self.endpoint_stats.values()) / len(self.endpoint_stats) if self.endpoint_stats else 0
        }


class RateLimitingMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting with different strategies per endpoint,
    user-based limits, and automatic DDoS protection.
    """
    
    def __init__(self, app: FastAPI, default_rate_limit: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.default_rate_limit = default_rate_limit
        self.window_seconds = window_seconds
        self.client_requests = defaultdict(lambda: deque())
        self.endpoint_limits = {
            '/api/v1/auth/login': {'limit': 5, 'window': 300},  # 5 attempts per 5 minutes
            '/api/v1/auth/register': {'limit': 3, 'window': 3600},  # 3 registrations per hour
            '/api/v1/agentic-coach/chat': {'limit': 50, 'window': 60},  # 50 chat requests per minute
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # Check rate limits
        if not await self._check_rate_limit(client_ip, endpoint):
            logger.warning(
                "rate_limit_exceeded",
                client_ip=client_ip,
                endpoint=endpoint,
                request_id=getattr(request.state, 'request_id', 'unknown')
            )
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": self._get_retry_after(endpoint),
                    "endpoint": endpoint
                },
                headers={"Retry-After": str(self._get_retry_after(endpoint))}
            )
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy support"""
        if forwarded_for := request.headers.get("X-Forwarded-For"):
            return forwarded_for.split(",")[0].strip()
        elif real_ip := request.headers.get("X-Real-IP"):
            return real_ip
        else:
            return request.client.host if request.client else "unknown"
    
    async def _check_rate_limit(self, client_ip: str, endpoint: str) -> bool:
        """Check if request is within rate limits"""
        now = time.time()
        key = f"{client_ip}:{endpoint}"
        
        # Get limits for this endpoint
        limits = self.endpoint_limits.get(endpoint, {
            'limit': self.default_rate_limit,
            'window': self.window_seconds
        })
        
        # Clean old requests
        requests = self.client_requests[key]
        while requests and now - requests[0] > limits['window']:
            requests.popleft()
        
        # Check if under limit
        if len(requests) >= limits['limit']:
            return False
        
        # Add current request
        requests.append(now)
        return True
    
    def _get_retry_after(self, endpoint: str) -> int:
        """Get retry-after seconds for endpoint"""
        return self.endpoint_limits.get(endpoint, {}).get('window', self.window_seconds)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Security hardening middleware with comprehensive security headers,
    content validation, and attack prevention.
    """
    
    def __init__(self, app: FastAPI):
        super().__init__(app)
        self.security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Validate request headers for suspicious patterns
        if not self._validate_request(request):
            logger.warning(
                "suspicious_request_blocked",
                client_ip=self._get_client_ip(request),
                user_agent=request.headers.get("User-Agent", ""),
                path=request.url.path
            )
            
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={"error": "Invalid request"}
            )
        
        response = await call_next(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        return response
    
    def _validate_request(self, request: Request) -> bool:
        """Validate request for security threats"""
        # Check for common attack patterns
        suspicious_patterns = [
            '<script', 'javascript:', 'onload=', 'onerror=',
            'union select', 'drop table', '../../../',
            '<?php', '<%', '${', 'eval('
        ]
        
        # Check URL and query parameters
        url_str = str(request.url).lower()
        for pattern in suspicious_patterns:
            if pattern in url_str:
                return False
        
        # Check User-Agent for bot patterns
        user_agent = request.headers.get("User-Agent", "").lower()
        if any(bot in user_agent for bot in ['bot', 'crawler', 'spider', 'scraper']) and 'api' in str(request.url):
            return False
        
        return True
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP"""
        if forwarded_for := request.headers.get("X-Forwarded-For"):
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"


class RequestCompressionMiddleware(BaseHTTPMiddleware):
    """
    Advanced request/response compression with adaptive compression levels
    based on content type and size.
    """
    
    def __init__(self, app: FastAPI, minimum_size: int = 1024, compression_level: int = 6):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compression_level = compression_level
        self.compressible_types = {
            'application/json',
            'application/javascript',
            'text/html',
            'text/css',
            'text/plain',
            'text/xml',
            'application/xml'
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Check if compression should be applied
        if not self._should_compress(request, response):
            return response
        
        # Compress response body
        if hasattr(response, 'body') and response.body:
            compressed_body = self._compress_content(response.body)
            if compressed_body and len(compressed_body) < len(response.body):
                response.body = compressed_body
                response.headers["Content-Encoding"] = "gzip"
                response.headers["Content-Length"] = str(len(compressed_body))
        
        return response
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """Determine if response should be compressed"""
        # Check accept-encoding
        accept_encoding = request.headers.get("Accept-Encoding", "")
        if "gzip" not in accept_encoding:
            return False
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        if not any(ct in content_type for ct in self.compressible_types):
            return False
        
        # Check response size
        if hasattr(response, 'body') and response.body:
            if len(response.body) < self.minimum_size:
                return False
        
        return True
    
    def _compress_content(self, content: bytes) -> Optional[bytes]:
        """Compress content using gzip"""
        try:
            buffer = BytesIO()
            with gzip.GzipFile(fileobj=buffer, mode='wb', compresslevel=self.compression_level) as gz_file:
                gz_file.write(content)
            return buffer.getvalue()
        except Exception as e:
            logger.error("compression_failed", error=str(e))
            return None


def setup_enhanced_middleware_stack(app: FastAPI, config: Dict[str, Any] = None) -> FastAPI:
    """
    Configure comprehensive middleware stack with production-ready settings.
    
    Args:
        app: FastAPI application instance
        config: Optional configuration overrides
    
    Returns:
        Configured FastAPI app with enhanced middleware
    """
    config = config or {}
    
    # Security middleware (first in stack)
    if config.get('enable_https_redirect', True):
        app.add_middleware(HTTPSRedirectMiddleware)
    
    # Trusted hosts
    trusted_hosts = config.get('trusted_hosts', ['localhost', '127.0.0.1', '*.bookedbarber.com'])
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)
    
    # Security headers
    app.add_middleware(SecurityHeadersMiddleware)
    
    # Rate limiting
    app.add_middleware(
        RateLimitingMiddleware,
        default_rate_limit=config.get('default_rate_limit', 100),
        window_seconds=config.get('rate_limit_window', 60)
    )
    
    # Performance monitoring
    app.add_middleware(
        PerformanceMonitoringMiddleware,
        slow_threshold=config.get('slow_threshold', 1.0)
    )
    
    # Compression (before CORS)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(RequestCompressionMiddleware)
    
    # CORS (last, closest to application)
    cors_origins = config.get('cors_origins', [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:9999",
        "https://bookedbarber.com",
        "https://staging.bookedbarber.com"
    ])
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Response-Time"]
    )
    
    logger.info("Enhanced middleware stack configured", middleware_count=len(app.user_middleware))
    return app


def get_middleware_metrics(app: FastAPI) -> Dict[str, Any]:
    """
    Extract performance metrics from middleware stack.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        Dictionary containing middleware performance metrics
    """
    metrics = {}
    
    for middleware in app.user_middleware:
        if isinstance(middleware.cls, type) and hasattr(middleware.cls, 'get_performance_stats'):
            try:
                # Get metrics from performance monitoring middleware
                if hasattr(middleware, 'get_performance_stats'):
                    metrics['performance'] = middleware.get_performance_stats()
            except Exception as e:
                logger.error("failed_to_get_middleware_metrics", error=str(e))
    
    return metrics