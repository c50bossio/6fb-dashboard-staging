#!/usr/bin/env python3
"""
Security Middleware Stack
Comprehensive security middleware for FastAPI with rate limiting, security headers, and protection
"""

import time
import asyncio
import logging
from typing import Dict, Optional, Callable, Any, List
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field
from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
import ipaddress
import re
import json
import hashlib
import secrets

logger = logging.getLogger(__name__)

@dataclass
class RateLimitRule:
    """Rate limiting rule configuration"""
    requests_per_window: int
    window_seconds: int
    burst_limit: Optional[int] = None  # Allow burst requests
    whitelist_ips: List[str] = field(default_factory=list)
    blacklist_ips: List[str] = field(default_factory=list)

@dataclass 
class SecurityConfig:
    """Security middleware configuration"""
    # Rate limiting
    global_rate_limit: RateLimitRule = field(default_factory=lambda: RateLimitRule(100, 900))  # 100 req/15min
    auth_rate_limit: RateLimitRule = field(default_factory=lambda: RateLimitRule(5, 300))      # 5 req/5min
    api_rate_limit: RateLimitRule = field(default_factory=lambda: RateLimitRule(1000, 3600))   # 1000 req/hour
    
    # Security headers
    enable_security_headers: bool = True
    enable_cors_protection: bool = True
    allowed_origins: List[str] = field(default_factory=lambda: ["http://localhost:9999"])
    
    # Content security
    max_request_size: int = 10 * 1024 * 1024  # 10MB
    block_suspicious_patterns: bool = True
    enable_request_logging: bool = True
    
    # DDoS protection
    enable_ddos_protection: bool = True
    ddos_threshold: int = 50  # requests per second
    ddos_ban_duration: int = 3600  # 1 hour

class RateLimiter:
    """Advanced rate limiter with multiple algorithms"""
    
    def __init__(self):
        # Token bucket implementation
        self.buckets = defaultdict(dict)  # ip -> {endpoint: bucket}
        self.request_history = defaultdict(deque)  # ip -> deque of timestamps
        self.blocked_ips = {}  # ip -> block_until_timestamp
        
    def is_allowed(self, ip: str, endpoint: str, rule: RateLimitRule) -> tuple[bool, Dict[str, Any]]:
        """
        Check if request is allowed under rate limit
        
        Returns:
            (allowed, metadata)
        """
        now = time.time()
        
        # Check if IP is blocked
        if ip in self.blocked_ips and now < self.blocked_ips[ip]:
            return False, {
                'error': 'IP_BLOCKED',
                'blocked_until': self.blocked_ips[ip],
                'remaining_time': int(self.blocked_ips[ip] - now)
            }
        
        # Remove expired blocks
        if ip in self.blocked_ips and now >= self.blocked_ips[ip]:
            del self.blocked_ips[ip]
        
        # Check whitelist
        if self._is_whitelisted(ip, rule):
            return True, {'status': 'whitelisted'}
        
        # Check blacklist
        if self._is_blacklisted(ip, rule):
            return False, {'error': 'IP_BLACKLISTED'}
        
        # Token bucket algorithm
        bucket_key = f"{ip}:{endpoint}"
        bucket = self.buckets[ip].get(endpoint, {
            'tokens': rule.requests_per_window,
            'last_refill': now,
            'total_requests': 0
        })
        
        # Refill tokens based on time elapsed
        time_elapsed = now - bucket['last_refill']
        refill_rate = rule.requests_per_window / rule.window_seconds
        tokens_to_add = time_elapsed * refill_rate
        
        bucket['tokens'] = min(
            rule.requests_per_window,
            bucket['tokens'] + tokens_to_add
        )
        bucket['last_refill'] = now
        
        # Check if request can be processed
        if bucket['tokens'] >= 1:
            bucket['tokens'] -= 1
            bucket['total_requests'] += 1
            self.buckets[ip][endpoint] = bucket
            
            # Track request history for DDoS detection
            self.request_history[ip].append(now)
            self._clean_old_requests(ip, now)
            
            return True, {
                'remaining_tokens': int(bucket['tokens']),
                'total_requests': bucket['total_requests'],
                'reset_time': bucket['last_refill'] + rule.window_seconds
            }
        else:
            # Rate limit exceeded
            return False, {
                'error': 'RATE_LIMIT_EXCEEDED',
                'retry_after': int(1 / refill_rate),
                'reset_time': bucket['last_refill'] + rule.window_seconds
            }
    
    def detect_ddos(self, ip: str, threshold: int, ban_duration: int) -> bool:
        """Detect and handle DDoS attacks"""
        now = time.time()
        
        # Count requests in the last second
        recent_requests = sum(1 for timestamp in self.request_history[ip] 
                            if now - timestamp <= 1.0)
        
        if recent_requests > threshold:
            # Block IP for ban duration
            self.blocked_ips[ip] = now + ban_duration
            logger.warning(f"DDoS detected from {ip}, blocking for {ban_duration} seconds")
            return True
        
        return False
    
    def _is_whitelisted(self, ip: str, rule: RateLimitRule) -> bool:
        """Check if IP is whitelisted"""
        for whitelisted_ip in rule.whitelist_ips:
            try:
                if ipaddress.ip_address(ip) in ipaddress.ip_network(whitelisted_ip, strict=False):
                    return True
            except ValueError:
                if ip == whitelisted_ip:
                    return True
        return False
    
    def _is_blacklisted(self, ip: str, rule: RateLimitRule) -> bool:
        """Check if IP is blacklisted"""
        for blacklisted_ip in rule.blacklist_ips:
            try:
                if ipaddress.ip_address(ip) in ipaddress.ip_network(blacklisted_ip, strict=False):
                    return True
            except ValueError:
                if ip == blacklisted_ip:
                    return True
        return False
    
    def _clean_old_requests(self, ip: str, current_time: float) -> None:
        """Clean old request timestamps"""
        cutoff = current_time - 60  # Keep last minute
        history = self.request_history[ip]
        while history and history[0] < cutoff:
            history.popleft()

class SecurityHeadersMiddleware:
    """Security headers middleware"""
    
    def __init__(self, config: SecurityConfig):
        self.config = config
        
    def add_security_headers(self, response: Response) -> Response:
        """Add security headers to response"""
        
        if not self.config.enable_security_headers:
            return response
        
        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # HTTPS security (if using HTTPS)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        
        # Content Security Policy
        csp_policy = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        response.headers["Content-Security-Policy"] = csp_policy
        
        # Additional security headers
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=(), "
            "gyroscope=(), "
            "accelerometer=()"
        )
        
        # Remove server information
        response.headers.pop("Server", None)
        
        return response

class ThreatDetectionMiddleware:
    """Advanced threat detection and prevention"""
    
    def __init__(self):
        # Suspicious patterns
        self.suspicious_patterns = [
            # SQL Injection
            r"(?i)(union\s+select|select\s+\*|drop\s+table|delete\s+from)",
            r"(?i)(\'\s*;\s*--|--\s*$|\/\*.*\*\/)",
            
            # XSS
            r"(?i)(<script|javascript:|vbscript:|onload=|onerror=)",
            r"(?i)(eval\s*\(|setTimeout\s*\(|alert\s*\()",
            
            # Command Injection
            r"(?i)(;\s*rm\s|;\s*wget\s|;\s*curl\s|&&\s*rm\s)",
            r"(?i)(\|\s*nc\s|\|\s*netcat\s)",
            
            # Path Traversal
            r"(\.\.\/|\.\.\\\\|%2e%2e%2f)",
            r"(?i)(\/etc\/passwd|\/etc\/shadow)",
            
            # Generic malicious patterns
            r"(?i)(<iframe|<object|<embed|<applet)",
            r"(?i)(base64\s*-d|python\s*-c|perl\s*-e)"
        ]
        
        self.compiled_patterns = [re.compile(pattern) for pattern in self.suspicious_patterns]
        self.threat_scores = defaultdict(float)  # ip -> threat_score
        
    def scan_request(self, request: Request) -> tuple[bool, Optional[str]]:
        """
        Scan request for threats
        
        Returns:
            (is_malicious, threat_type)
        """
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Scan URL path
        if self._contains_suspicious_patterns(request.url.path):
            self.threat_scores[client_ip] += 0.5
            return True, "suspicious_url_path"
        
        # Scan query parameters
        for key, value in request.query_params.items():
            if self._contains_suspicious_patterns(f"{key}={value}"):
                self.threat_scores[client_ip] += 0.3
                return True, "suspicious_query_params"
        
        # Scan headers
        for header_name, header_value in request.headers.items():
            if self._contains_suspicious_patterns(f"{header_name}: {header_value}"):
                self.threat_scores[client_ip] += 0.2
                return True, "suspicious_headers"
        
        # Check user agent
        user_agent = request.headers.get("user-agent", "")
        if self._is_suspicious_user_agent(user_agent):
            self.threat_scores[client_ip] += 0.1
            return True, "suspicious_user_agent"
        
        return False, None
    
    def scan_request_body(self, body: bytes) -> tuple[bool, Optional[str]]:
        """Scan request body for threats"""
        
        if not body:
            return False, None
        
        try:
            # Decode body
            body_str = body.decode('utf-8', errors='ignore')
            
            # Scan for suspicious patterns
            if self._contains_suspicious_patterns(body_str):
                return True, "suspicious_request_body"
            
            # Check for excessive size
            if len(body) > 10 * 1024 * 1024:  # 10MB
                return True, "request_too_large"
            
        except Exception:
            # If we can't decode, it might be binary - less suspicious
            pass
        
        return False, None
    
    def _contains_suspicious_patterns(self, text: str) -> bool:
        """Check if text contains suspicious patterns"""
        for pattern in self.compiled_patterns:
            if pattern.search(text):
                return True
        return False
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check for suspicious user agents"""
        if not user_agent or len(user_agent) < 10:
            return True
        
        suspicious_agents = [
            'sqlmap', 'nikto', 'nmap', 'masscan', 'zap',
            'bot', 'crawler', 'scraper', 'spider'
        ]
        
        user_agent_lower = user_agent.lower()
        return any(agent in user_agent_lower for agent in suspicious_agents)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers (in case of proxy)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        forwarded = request.headers.get("x-forwarded")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to direct connection
        return getattr(request.client, 'host', '127.0.0.1')

class SecurityMiddleware(BaseHTTPMiddleware):
    """Main security middleware that combines all security features"""
    
    def __init__(self, app, config: Optional[SecurityConfig] = None):
        super().__init__(app)
        self.config = config or SecurityConfig()
        self.rate_limiter = RateLimiter()
        self.headers_middleware = SecurityHeadersMiddleware(self.config)
        self.threat_detector = ThreatDetectionMiddleware()
        
        # Track request metrics
        self.request_count = defaultdict(int)
        self.blocked_requests = defaultdict(int)
        
        logger.info("Security middleware initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main middleware dispatch method"""
        
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        endpoint = f"{request.method} {request.url.path}"
        
        try:
            # 1. DDoS Protection
            if self.config.enable_ddos_protection:
                if self.rate_limiter.detect_ddos(
                    client_ip, 
                    self.config.ddos_threshold, 
                    self.config.ddos_ban_duration
                ):
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "error": "DDoS_PROTECTION_TRIGGERED",
                            "message": "Too many requests detected"
                        }
                    )
            
            # 2. Rate Limiting
            rate_limit_rule = self._get_rate_limit_rule(request)
            allowed, rate_limit_info = self.rate_limiter.is_allowed(client_ip, endpoint, rate_limit_rule)
            
            if not allowed:
                self.blocked_requests[client_ip] += 1
                response = JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests",
                        **rate_limit_info
                    }
                )
                response.headers["Retry-After"] = str(rate_limit_info.get('retry_after', 60))
                return self.headers_middleware.add_security_headers(response)
            
            # 3. Threat Detection
            if self.config.block_suspicious_patterns:
                is_malicious, threat_type = self.threat_detector.scan_request(request)
                if is_malicious:
                    logger.warning(f"Malicious request detected from {client_ip}: {threat_type}")
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={
                            "error": "MALICIOUS_REQUEST_DETECTED",
                            "message": "Request blocked by security filter"
                        }
                    )
            
            # 4. Request Size Check
            content_length = request.headers.get("content-length")
            if content_length and int(content_length) > self.config.max_request_size:
                return JSONResponse(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    content={
                        "error": "REQUEST_TOO_LARGE",
                        "message": f"Request size exceeds {self.config.max_request_size} bytes"
                    }
                )
            
            # 5. Process Request
            self.request_count[client_ip] += 1
            response = await call_next(request)
            
            # 6. Add Security Headers
            response = self.headers_middleware.add_security_headers(response)
            
            # 7. Add Rate Limit Headers
            response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get('remaining_tokens', 0))
            response.headers["X-RateLimit-Reset"] = str(int(rate_limit_info.get('reset_time', time.time())))
            
            # 8. Request Logging
            if self.config.enable_request_logging:
                duration = time.time() - start_time
                logger.info(f"{client_ip} {endpoint} {response.status_code} {duration:.3f}s")
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            # Return generic error to avoid information disclosure
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "error": "INTERNAL_SERVER_ERROR", 
                    "message": "An error occurred processing your request"
                }
            )
    
    def _get_rate_limit_rule(self, request: Request) -> RateLimitRule:
        """Determine appropriate rate limit rule for request"""
        
        path = request.url.path.lower()
        
        # Authentication endpoints get stricter limits
        if any(auth_path in path for auth_path in ['/auth', '/login', '/register', '/password']):
            return self.config.auth_rate_limit
        
        # API endpoints get API limits
        if path.startswith('/api/'):
            return self.config.api_rate_limit
        
        # Default global rate limit
        return self.config.global_rate_limit
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        return self.threat_detector._get_client_ip(request)
    
    def get_security_stats(self) -> Dict[str, Any]:
        """Get security middleware statistics"""
        return {
            'total_ips_tracked': len(self.request_count),
            'blocked_ips': len(self.rate_limiter.blocked_ips),
            'total_requests': sum(self.request_count.values()),
            'total_blocked': sum(self.blocked_requests.values()),
            'active_buckets': sum(len(buckets) for buckets in self.rate_limiter.buckets.values()),
            'threat_scores': dict(self.threat_detector.threat_scores)
        }

# Utility function to create configured middleware
def create_security_middleware(
    allowed_origins: List[str] = None,
    rate_limit_requests: int = 100,
    rate_limit_window: int = 900,
    enable_ddos_protection: bool = True
) -> SecurityMiddleware:
    """Create security middleware with custom configuration"""
    
    config = SecurityConfig(
        allowed_origins=allowed_origins or ["http://localhost:9999"],
        global_rate_limit=RateLimitRule(rate_limit_requests, rate_limit_window),
        enable_ddos_protection=enable_ddos_protection
    )
    
    return SecurityMiddleware(None, config)

if __name__ == "__main__":
    # Test the security middleware components
    
    # Test rate limiter
    rate_limiter = RateLimiter()
    rule = RateLimitRule(5, 60)  # 5 requests per minute
    
    for i in range(7):
        allowed, info = rate_limiter.is_allowed("127.0.0.1", "/test", rule)
        print(f"Request {i+1}: Allowed={allowed}, Info={info}")
        time.sleep(0.1)
    
    # Test threat detection
    from unittest.mock import Mock
    
    threat_detector = ThreatDetectionMiddleware()
    
    # Mock malicious request
    mock_request = Mock()
    mock_request.url.path = "/api/users?id=1' OR '1'='1"
    mock_request.query_params = {"id": "1' OR '1'='1"}
    mock_request.headers = {"user-agent": "Mozilla/5.0"}
    mock_request.client.host = "127.0.0.1"
    
    is_malicious, threat_type = threat_detector.scan_request(mock_request)
    print(f"Threat detection: Malicious={is_malicious}, Type={threat_type}")