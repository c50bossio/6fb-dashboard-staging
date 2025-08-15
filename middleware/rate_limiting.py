#!/usr/bin/env python3
"""
Advanced Rate Limiting Middleware for 6FB AI Agent System
Implements sliding window rate limiting with Redis backend and fallback to in-memory storage.
"""

import time
import json
import logging
from typing import Dict, Optional, Tuple, List
from datetime import datetime, timedelta
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import hashlib
import asyncio
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class RateLimitConfig:
    """Rate limiting configuration for different endpoints and user types"""
    
    # Default rate limits (requests per time window)
    DEFAULT_LIMITS = {
        # Authentication endpoints - stricter limits with OAuth protection
        '/api/v1/auth/login': {'requests': 5, 'window': 300, 'burst': 10},  # 5 req/5min, burst 10
        '/api/v1/auth/register': {'requests': 3, 'window': 300, 'burst': 5},  # 3 req/5min, burst 5
        '/api/v1/auth/reset-password': {'requests': 3, 'window': 3600, 'burst': 5},  # 3 req/hour
        '/auth/callback': {'requests': 10, 'window': 60, 'burst': 5},  # OAuth callback protection
        '/api/auth/callback': {'requests': 10, 'window': 60, 'burst': 5},  # OAuth API protection
        
        # AI endpoints - moderate limits with cost control
        '/api/v1/ai/chat': {'requests': 100, 'window': 3600, 'burst': 20},  # 100 req/hour, burst 20
        '/api/v1/ai/enhanced-chat': {'requests': 50, 'window': 3600, 'burst': 10},  # 50 req/hour
        '/api/v1/agents/': {'requests': 200, 'window': 3600, 'burst': 30},  # 200 req/hour
        '/api/ai/': {'requests': 150, 'window': 3600, 'burst': 25},  # Generic AI endpoints
        
        # Dashboard endpoints - generous limits
        '/api/v1/dashboard/': {'requests': 1000, 'window': 3600, 'burst': 50},  # 1000 req/hour
        '/api/health': {'requests': 60, 'window': 60, 'burst': 10},  # 60 req/min health checks
        
        # File upload endpoints - strict limits
        '/api/v1/upload/': {'requests': 10, 'window': 300, 'burst': 3},  # 10 req/5min
        
        # Admin endpoints - very strict
        '/api/v1/admin/': {'requests': 100, 'window': 3600, 'burst': 10},  # 100 req/hour
        
        # Error reporting - allow reasonable error reporting
        '/api/errors': {'requests': 100, 'window': 300, 'burst': 20},  # 100 errors/5min
        
        # Critical production endpoints
        '/api/stripe/': {'requests': 50, 'window': 60, 'burst': 10},  # Payment processing
        '/api/webhooks/': {'requests': 100, 'window': 60, 'burst': 20},  # Webhook reception
    }
    
    # User type multipliers
    USER_TYPE_MULTIPLIERS = {
        'CLIENT': 1.0,
        'BARBER': 1.5,
        'SHOP_OWNER': 2.0,
        'ENTERPRISE_OWNER': 3.0,
        'SUPER_ADMIN': 10.0  # Admins get higher limits
    }
    
    # IP-based limits (fallback when no user authentication)
    IP_LIMITS = {
        'default': {'requests': 1000, 'window': 3600, 'burst': 100},  # 1000 req/hour per IP
        'strict': {'requests': 100, 'window': 3600, 'burst': 20},   # For sensitive endpoints
    }

class SlidingWindowRateLimiter:
    """
    Production-grade sliding window rate limiter with Redis backend support
    Falls back to in-memory storage if Redis is unavailable
    Includes DDoS protection and automatic blocking for abusive clients
    """
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_storage = defaultdict(lambda: deque())
        self.config = RateLimitConfig()
        self.cleanup_interval = 300  # Clean up every 5 minutes
        self.last_cleanup = time.time()
        
        # DDoS protection
        self.blocked_ips = set()
        self.violation_counts = defaultdict(int)
        self.block_duration = 3600  # Block for 1 hour
        self.max_violations = 10  # Block after 10 violations
        
        # Sentry integration for monitoring
        try:
            from services.sentry_service import sentry_service
            self.sentry = sentry_service
        except:
            self.sentry = None
    
    def _get_client_key(self, request: Request, endpoint: str) -> Tuple[str, str]:
        """Generate unique client key for rate limiting"""
        
        # Try to get authenticated user ID
        user_id = getattr(request.state, 'user_id', None)
        user_type = getattr(request.state, 'user_type', 'CLIENT')
        
        if user_id:
            client_key = f"user:{user_id}"
            client_type = user_type
        else:
            # Fall back to IP address
            client_ip = self._get_client_ip(request)
            client_key = f"ip:{client_ip}"
            client_type = 'IP'
        
        return f"rate_limit:{endpoint}:{client_key}", client_type
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address with proxy support"""
        
        # Check for forwarded headers (common in production)
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Take the first IP in the chain
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fallback to direct connection IP
        return request.client.host if request.client else '127.0.0.1'
    
    def _get_rate_limit(self, endpoint: str, client_type: str) -> Dict:
        """Get rate limit configuration for endpoint and client type"""
        
        # Find matching endpoint pattern
        endpoint_config = None
        for pattern, config in self.config.DEFAULT_LIMITS.items():
            if endpoint.startswith(pattern):
                endpoint_config = config.copy()
                break
        
        if not endpoint_config:
            # Default limits for unmatched endpoints
            endpoint_config = {'requests': 1000, 'window': 3600, 'burst': 100}
        
        # Apply user type multiplier
        if client_type in self.config.USER_TYPE_MULTIPLIERS:
            multiplier = self.config.USER_TYPE_MULTIPLIERS[client_type]
            endpoint_config['requests'] = int(endpoint_config['requests'] * multiplier)
            endpoint_config['burst'] = int(endpoint_config['burst'] * multiplier)
        
        return endpoint_config
    
    async def _check_redis_limit(self, key: str, limit_config: Dict) -> Tuple[bool, Dict]:
        """Check rate limit using Redis sliding window"""
        
        if not self.redis_client:
            return await self._check_memory_limit(key, limit_config)
        
        try:
            now = time.time()
            window = limit_config['window']
            max_requests = limit_config['requests']
            burst_limit = limit_config['burst']
            
            # Use Redis sorted set for sliding window
            pipe = self.redis_client.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, now - window)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiration
            pipe.expire(key, int(window) + 60)
            
            results = await pipe.execute()
            current_requests = results[1]
            
            # Check burst limit first (short-term)
            recent_key = f"{key}:burst"
            pipe = self.redis_client.pipeline()
            pipe.zremrangebyscore(recent_key, 0, now - 60)  # 1-minute burst window
            pipe.zcard(recent_key)
            pipe.zadd(recent_key, {str(now): now})
            pipe.expire(recent_key, 120)
            
            burst_results = await pipe.execute()
            burst_requests = burst_results[1]
            
            # Check limits
            burst_exceeded = burst_requests > burst_limit
            limit_exceeded = current_requests > max_requests
            
            return not (burst_exceeded or limit_exceeded), {
                'requests': current_requests,
                'limit': max_requests,
                'burst_requests': burst_requests,
                'burst_limit': burst_limit,
                'window': window,
                'reset_time': now + window
            }
            
        except Exception as e:
            logger.warning(f"Redis rate limiting failed, falling back to memory: {e}")
            return await self._check_memory_limit(key, limit_config)
    
    async def _check_memory_limit(self, key: str, limit_config: Dict) -> Tuple[bool, Dict]:
        """Check rate limit using in-memory storage"""
        
        now = time.time()
        window = limit_config['window']
        max_requests = limit_config['requests']
        burst_limit = limit_config['burst']
        
        # Clean up old entries
        if now - self.last_cleanup > self.cleanup_interval:
            await self._cleanup_memory_storage(now)
            self.last_cleanup = now
        
        # Get or create request log for this key
        request_log = self.memory_storage[key]
        
        # Remove requests outside the window
        while request_log and request_log[0] < now - window:
            request_log.popleft()
        
        # Check burst limit (last minute)
        burst_requests = sum(1 for req_time in request_log if req_time > now - 60)
        burst_exceeded = burst_requests >= burst_limit
        
        # Check window limit
        current_requests = len(request_log)
        limit_exceeded = current_requests >= max_requests
        
        if not (burst_exceeded or limit_exceeded):
            # Add current request
            request_log.append(now)
        
        return not (burst_exceeded or limit_exceeded), {
            'requests': current_requests,
            'limit': max_requests,
            'burst_requests': burst_requests,
            'burst_limit': burst_limit,
            'window': window,
            'reset_time': now + window
        }
    
    async def _cleanup_memory_storage(self, now: float):
        """Clean up expired entries from memory storage"""
        
        keys_to_remove = []
        for key, request_log in self.memory_storage.items():
            # Remove old entries
            while request_log and request_log[0] < now - 3600:  # Keep 1 hour of history
                request_log.popleft()
            
            # Remove empty logs
            if not request_log:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.memory_storage[key]
    
    async def check_rate_limit(self, request: Request, endpoint: str) -> Tuple[bool, Dict]:
        """
        Production-grade rate limit check with DDoS protection
        Returns (allowed, limit_info)
        """
        
        # Check if IP is blocked
        client_ip = self._get_client_ip(request)
        if client_ip in self.blocked_ips:
            return False, {
                'blocked': True,
                'reason': 'IP blocked due to abuse',
                'reset_time': time.time() + self.block_duration
            }
        
        client_key, client_type = self._get_client_key(request, endpoint)
        limit_config = self._get_rate_limit(endpoint, client_type)
        
        # Log rate limit check for monitoring
        logger.debug(f"Rate limit check: {client_key} -> {endpoint} (type: {client_type})")
        
        # Check rate limit
        allowed, limit_info = await self._check_redis_limit(client_key, limit_config)
        
        # Track violations for DDoS protection
        if not allowed:
            self.violation_counts[client_ip] += 1
            
            # Auto-block after max violations
            if self.violation_counts[client_ip] >= self.max_violations:
                self.blocked_ips.add(client_ip)
                logger.warning(f"🚫 Blocking IP {client_ip} due to {self.max_violations} rate limit violations")
                
                # Report to Sentry
                if self.sentry and self.sentry.initialized:
                    self.sentry.capture_message(
                        f"IP blocked for rate limit abuse: {client_ip}",
                        level="warning",
                        context={
                            'ip': client_ip,
                            'violations': self.violation_counts[client_ip],
                            'endpoint': endpoint
                        }
                    )
                
                # Schedule unblock
                asyncio.create_task(self._schedule_unblock(client_ip))
        
        return allowed, limit_info
    
    async def _schedule_unblock(self, ip: str):
        """Schedule IP unblock after block duration"""
        await asyncio.sleep(self.block_duration)
        if ip in self.blocked_ips:
            self.blocked_ips.remove(ip)
            self.violation_counts[ip] = 0
            logger.info(f"🔓 Unblocked IP {ip} after {self.block_duration} seconds")

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Production-grade FastAPI middleware for rate limiting with monitoring"""
    
    def __init__(self, app, redis_client=None, enabled: bool = True):
        super().__init__(app)
        self.limiter = SlidingWindowRateLimiter(redis_client)
        self.enabled = enabled
        
        # Endpoints to skip rate limiting
        self.skip_paths = {
            '/favicon.ico',
            '/robots.txt',
            '/health',
            '/metrics',
            '/_next/',  # Next.js static assets
            '/static/',  # Static assets
        }
        
        # Metrics for monitoring
        self.request_counts = defaultdict(int)
        self.blocked_requests = 0
        self.total_requests = 0
        
        # Sentry integration
        try:
            from services.sentry_service import sentry_service
            self.sentry = sentry_service
        except:
            self.sentry = None
    
    def _should_skip_rate_limiting(self, path: str) -> bool:
        """Check if path should skip rate limiting"""
        
        return any(path.startswith(skip_path) for skip_path in self.skip_paths)
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        if not self.enabled or self._should_skip_rate_limiting(request.url.path):
            return await call_next(request)
        
        try:
            # Check rate limit
            allowed, limit_info = await self.limiter.check_rate_limit(
                request, request.url.path
            )
            
            if not allowed:
                # Track metrics
                self.blocked_requests += 1
                self.request_counts['blocked'] += 1
                
                # Check if IP is blocked
                if limit_info.get('blocked'):
                    error_response = {
                        'error': 'Access denied',
                        'message': 'Your IP has been temporarily blocked due to excessive requests.',
                        'code': 'IP_BLOCKED',
                        'details': {
                            'reason': limit_info.get('reason'),
                            'retry_after': self.limiter.block_duration
                        }
                    }
                    
                    return JSONResponse(
                        status_code=status.HTTP_403_FORBIDDEN,
                        content=error_response
                    )
                
                # Rate limit exceeded
                retry_after = int(limit_info.get('reset_time', time.time()) - time.time())
                
                error_response = {
                    'error': 'Rate limit exceeded',
                    'message': f"Too many requests. Try again in {retry_after} seconds.",
                    'code': 'RATE_LIMIT_EXCEEDED',
                    'details': {
                        'requests': limit_info.get('requests', 0),
                        'limit': limit_info.get('limit', 0),
                        'window': limit_info.get('window', 0),
                        'retry_after': retry_after
                    }
                }
                
                headers = {
                    'X-RateLimit-Limit': str(limit_info.get('limit', 0)),
                    'X-RateLimit-Remaining': str(max(0, limit_info.get('limit', 0) - limit_info.get('requests', 0))),
                    'X-RateLimit-Reset': str(int(limit_info.get('reset_time', time.time()))),
                    'Retry-After': str(retry_after)
                }
                
                logger.warning(f"Rate limit exceeded for {request.url.path}: {limit_info}")
                
                # Report repeated violations to Sentry
                client_ip = self.limiter._get_client_ip(request)
                if self.sentry and self.limiter.violation_counts[client_ip] > 5:
                    self.sentry.capture_message(
                        f"Repeated rate limit violations from {client_ip}",
                        level="warning",
                        context={
                            'ip': client_ip,
                            'path': request.url.path,
                            'violations': self.limiter.violation_counts[client_ip]
                        }
                    )
                
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content=error_response,
                    headers=headers
                )
            
            # Add rate limit headers to successful responses
            response = await call_next(request)
            
            # Add rate limit information to response headers
            response.headers['X-RateLimit-Limit'] = str(limit_info.get('limit', 0))
            response.headers['X-RateLimit-Remaining'] = str(max(0, limit_info.get('limit', 0) - limit_info.get('requests', 0)))
            response.headers['X-RateLimit-Reset'] = str(int(limit_info.get('reset_time', time.time())))
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting middleware error: {e}")
            # Don't block requests if rate limiting fails
            return await call_next(request)

# Utility functions for custom rate limiting
async def apply_custom_rate_limit(
    request: Request,
    max_requests: int,
    time_window: int,
    identifier: Optional[str] = None
) -> bool:
    """
    Apply custom rate limit to specific operations
    
    Args:
        request: FastAPI request object
        max_requests: Maximum requests allowed
        time_window: Time window in seconds
        identifier: Custom identifier (defaults to user ID or IP)
    
    Returns:
        True if request is allowed, False if rate limited
    """
    
    # This would use the same SlidingWindowRateLimiter
    # but with custom parameters for specific use cases
    limiter = SlidingWindowRateLimiter()
    
    # Create custom endpoint identifier
    endpoint = identifier or f"custom:{request.url.path}"
    
    # Custom limit configuration
    custom_config = {
        'requests': max_requests,
        'window': time_window,
        'burst': max(max_requests // 4, 1)
    }
    
    client_key, _ = limiter._get_client_key(request, endpoint)
    allowed, _ = await limiter._check_memory_limit(client_key, custom_config)
    
    return allowed

# Rate limiting decorators for specific endpoints
def rate_limit(max_requests: int, time_window: int, identifier: str = None):
    """
    Decorator for applying custom rate limits to specific endpoints
    
    Usage:
        @rate_limit(max_requests=10, time_window=300)  # 10 requests per 5 minutes
        async def sensitive_endpoint(request: Request):
            pass
    """
    
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            allowed = await apply_custom_rate_limit(
                request, max_requests, time_window, identifier
            )
            
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded: {max_requests} requests per {time_window} seconds"
                )
            
            return await func(request, *args, **kwargs)
        
        return wrapper
    return decorator

# Export main components
__all__ = [
    'RateLimitMiddleware',
    'SlidingWindowRateLimiter', 
    'RateLimitConfig',
    'apply_custom_rate_limit',
    'rate_limit'
]