#!/usr/bin/env python3
"""
Adaptive Rate Limiting System for 6FB AI Agent Booking System
Security Specialist Implementation

Provides intelligent, adaptive rate limiting with behavioral analysis,
booking-specific protections, and DDoS prevention capabilities.
"""

import os
import time
import json
import logging
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
import hashlib
import ipaddress
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis
from redis.exceptions import ConnectionError as RedisConnectionError

logger = logging.getLogger(__name__)

@dataclass
class RateLimitRule:
    """Rate limiting rule configuration"""
    endpoint_pattern: str
    requests_per_minute: int
    requests_per_hour: int
    requests_per_day: int
    burst_limit: int
    window_size: int = 60  # seconds
    priority: int = 1  # Higher priority rules are checked first

@dataclass
class ClientBehaviorProfile:
    """Client behavior analysis profile"""
    ip_address: str
    user_agent_hash: str
    first_seen: datetime
    last_seen: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    booking_attempts: int
    successful_bookings: int
    suspicious_patterns: List[str]
    trust_score: float
    rate_limit_violations: int
    last_violation: Optional[datetime]

class AdaptiveRateLimiter:
    """
    Intelligent rate limiting with behavioral analysis and adaptive thresholds
    """
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.local_cache = defaultdict(lambda: defaultdict(deque))
        self.behavior_profiles = {}
        self.blocked_ips = set()
        self.trusted_ips = set()
        
        # Load configuration
        self.rules = self._load_rate_limit_rules()
        self.global_config = self._load_global_config()
        
        # Cleanup task
        self.last_cleanup = time.time()
        self.cleanup_interval = 300  # 5 minutes
        
        logger.info("Adaptive Rate Limiter initialized")
    
    def _load_rate_limit_rules(self) -> List[RateLimitRule]:
        """Load rate limiting rules for different endpoints"""
        return [
            # Booking endpoints - strict limits
            RateLimitRule(
                endpoint_pattern="/api/bookings",
                requests_per_minute=10,
                requests_per_hour=50,
                requests_per_day=200,
                burst_limit=3,
                priority=1
            ),
            RateLimitRule(
                endpoint_pattern="/api/bookings/create",
                requests_per_minute=5,
                requests_per_hour=20,
                requests_per_day=50,
                burst_limit=2,
                priority=1
            ),
            
            # Payment endpoints - very strict
            RateLimitRule(
                endpoint_pattern="/api/payments",
                requests_per_minute=5,
                requests_per_hour=15,
                requests_per_day=30,
                burst_limit=1,
                priority=1
            ),
            
            # Authentication endpoints
            RateLimitRule(
                endpoint_pattern="/api/auth/login",
                requests_per_minute=10,
                requests_per_hour=30,
                requests_per_day=100,
                burst_limit=3,
                priority=1
            ),
            RateLimitRule(
                endpoint_pattern="/api/auth/register",
                requests_per_minute=5,
                requests_per_hour=10,
                requests_per_day=20,
                burst_limit=2,
                priority=1
            ),
            
            # General API endpoints
            RateLimitRule(
                endpoint_pattern="/api/",
                requests_per_minute=100,
                requests_per_hour=1000,
                requests_per_day=10000,
                burst_limit=20,
                priority=2
            ),
            
            # Admin endpoints - moderate limits
            RateLimitRule(
                endpoint_pattern="/api/admin",
                requests_per_minute=30,
                requests_per_hour=200,
                requests_per_day=1000,
                burst_limit=5,
                priority=1
            ),
        ]
    
    def _load_global_config(self) -> Dict[str, Any]:
        """Load global rate limiting configuration"""
        return {
            'enable_behavioral_analysis': True,
            'enable_adaptive_limits': True,
            'trust_score_threshold': 0.7,
            'suspicious_score_threshold': 0.3,
            'auto_block_threshold': 10,  # violations before auto-block
            'block_duration': 3600,  # 1 hour
            'burst_detection_window': 10,  # seconds
            'max_requests_per_second': 20,
            'enable_geolocation_blocking': False,
            'enable_user_agent_analysis': True,
        }
    
    async def check_rate_limit(self, request: Request) -> Dict[str, Any]:
        """
        Main rate limiting check with adaptive behavior analysis
        
        Returns:
            dict: Contains 'allowed', 'reason', 'retry_after', 'headers'
        """
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('User-Agent', '')
        endpoint = request.url.path
        method = request.method
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            return self._create_blocked_response("IP blocked due to abuse")
        
        # Get or create behavior profile
        profile = await self._get_behavior_profile(client_ip, user_agent)
        
        # Update profile with current request
        await self._update_behavior_profile(profile, request)
        
        # Find applicable rate limit rule
        rule = self._find_applicable_rule(endpoint)
        if not rule:
            return {'allowed': True, 'reason': 'no_rule', 'retry_after': None, 'headers': {}}
        
        # Apply adaptive rate limiting based on behavior
        adapted_rule = self._adapt_rule_to_behavior(rule, profile)
        
        # Check rate limits
        rate_limit_result = await self._check_rule_limits(client_ip, endpoint, adapted_rule)
        
        # Behavioral analysis
        if self.global_config['enable_behavioral_analysis']:
            behavioral_result = await self._analyze_request_behavior(request, profile)
            if not behavioral_result['allowed']:
                await self._record_violation(profile, "behavioral_anomaly")
                return behavioral_result
        
        # Burst detection
        burst_result = await self._check_burst_detection(client_ip, endpoint)
        if not burst_result['allowed']:
            await self._record_violation(profile, "burst_detected")
            return burst_result
        
        # Record successful check
        if rate_limit_result['allowed']:
            await self._record_successful_request(client_ip, endpoint, adapted_rule)
        else:
            await self._record_violation(profile, "rate_limit_exceeded")
        
        return rate_limit_result
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy header support"""
        # Check for proxy headers (in order of preference)
        proxy_headers = [
            'CF-Connecting-IP',  # Cloudflare
            'X-Forwarded-For',
            'X-Real-IP',
            'X-Client-IP',
        ]
        
        for header in proxy_headers:
            value = request.headers.get(header)
            if value:
                # Take first IP if multiple (comma-separated)
                return value.split(',')[0].strip()
        
        # Fallback to direct connection
        return request.client.host if request.client else '127.0.0.1'
    
    async def _get_behavior_profile(self, ip_address: str, user_agent: str) -> ClientBehaviorProfile:
        """Get or create client behavior profile"""
        profile_key = f"{ip_address}:{hashlib.md5(user_agent.encode()).hexdigest()[:8]}"
        
        if profile_key in self.behavior_profiles:
            profile = self.behavior_profiles[profile_key]
            profile.last_seen = datetime.utcnow()
            return profile
        
        # Create new profile
        profile = ClientBehaviorProfile(
            ip_address=ip_address,
            user_agent_hash=hashlib.md5(user_agent.encode()).hexdigest(),
            first_seen=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            total_requests=0,
            successful_requests=0,
            failed_requests=0,
            booking_attempts=0,
            successful_bookings=0,
            suspicious_patterns=[],
            trust_score=0.5,  # Neutral starting score
            rate_limit_violations=0,
            last_violation=None
        )
        
        self.behavior_profiles[profile_key] = profile
        return profile
    
    async def _update_behavior_profile(self, profile: ClientBehaviorProfile, request: Request):
        """Update behavior profile with current request data"""
        profile.total_requests += 1
        profile.last_seen = datetime.utcnow()
        
        # Analyze request patterns
        if '/bookings' in request.url.path:
            profile.booking_attempts += 1
        
        # User agent analysis
        if self.global_config['enable_user_agent_analysis']:
            self._analyze_user_agent(profile, request.headers.get('User-Agent', ''))
        
        # Update trust score
        profile.trust_score = self._calculate_trust_score(profile)
    
    def _analyze_user_agent(self, profile: ClientBehaviorProfile, user_agent: str):
        """Analyze user agent for suspicious patterns"""
        suspicious_patterns = [
            'bot', 'crawler', 'spider', 'scraper',
            'curl', 'wget', 'python', 'requests',
            'automated', 'script', 'headless'
        ]
        
        ua_lower = user_agent.lower()
        for pattern in suspicious_patterns:
            if pattern in ua_lower and pattern not in profile.suspicious_patterns:
                profile.suspicious_patterns.append(f"suspicious_ua:{pattern}")
                logger.warning(f"Suspicious user agent pattern detected: {pattern}")
    
    def _calculate_trust_score(self, profile: ClientBehaviorProfile) -> float:
        """Calculate trust score based on behavior patterns"""
        score = 0.5  # Base score
        
        # Positive factors
        if profile.total_requests > 0:
            success_rate = profile.successful_requests / profile.total_requests
            score += success_rate * 0.3
        
        if profile.booking_attempts > 0:
            booking_success_rate = profile.successful_bookings / profile.booking_attempts
            score += booking_success_rate * 0.2
        
        # Account age factor
        account_age_days = (datetime.utcnow() - profile.first_seen).days
        if account_age_days > 7:
            score += min(account_age_days / 30, 0.2)  # Max 0.2 bonus for 30+ days
        
        # Negative factors
        if profile.suspicious_patterns:
            score -= len(profile.suspicious_patterns) * 0.1
        
        if profile.rate_limit_violations > 0:
            score -= profile.rate_limit_violations * 0.05
        
        # Normalize score
        return max(0.0, min(1.0, score))
    
    def _find_applicable_rule(self, endpoint: str) -> Optional[RateLimitRule]:
        """Find the most specific rate limit rule for endpoint"""
        applicable_rules = [
            rule for rule in self.rules
            if endpoint.startswith(rule.endpoint_pattern)
        ]
        
        if not applicable_rules:
            return None
        
        # Return highest priority rule (lowest priority number)
        return min(applicable_rules, key=lambda r: r.priority)
    
    def _adapt_rule_to_behavior(self, rule: RateLimitRule, profile: ClientBehaviorProfile) -> RateLimitRule:
        """Adapt rate limit rule based on client behavior"""
        if not self.global_config['enable_adaptive_limits']:
            return rule
        
        # Create adaptive rule copy
        adapted_rule = RateLimitRule(
            endpoint_pattern=rule.endpoint_pattern,
            requests_per_minute=rule.requests_per_minute,
            requests_per_hour=rule.requests_per_hour,
            requests_per_day=rule.requests_per_day,
            burst_limit=rule.burst_limit,
            window_size=rule.window_size,
            priority=rule.priority
        )
        
        # Adjust limits based on trust score
        if profile.trust_score > self.global_config['trust_score_threshold']:
            # Trusted clients get higher limits
            multiplier = 1.5
            adapted_rule.requests_per_minute = int(rule.requests_per_minute * multiplier)
            adapted_rule.requests_per_hour = int(rule.requests_per_hour * multiplier)
            adapted_rule.burst_limit = int(rule.burst_limit * multiplier)
        
        elif profile.trust_score < self.global_config['suspicious_score_threshold']:
            # Suspicious clients get lower limits
            multiplier = 0.5
            adapted_rule.requests_per_minute = max(1, int(rule.requests_per_minute * multiplier))
            adapted_rule.requests_per_hour = max(5, int(rule.requests_per_hour * multiplier))
            adapted_rule.burst_limit = max(1, int(rule.burst_limit * multiplier))
        
        return adapted_rule
    
    async def _check_rule_limits(self, client_ip: str, endpoint: str, rule: RateLimitRule) -> Dict[str, Any]:
        """Check rate limits against rule thresholds"""
        current_time = time.time()
        
        # Create rate limit keys
        minute_key = f"rl:{client_ip}:{endpoint}:m:{int(current_time // 60)}"
        hour_key = f"rl:{client_ip}:{endpoint}:h:{int(current_time // 3600)}"
        day_key = f"rl:{client_ip}:{endpoint}:d:{int(current_time // 86400)}"
        
        # Get current counts
        minute_count = await self._get_request_count(minute_key)
        hour_count = await self._get_request_count(hour_key)
        day_count = await self._get_request_count(day_key)
        
        # Check limits
        if minute_count >= rule.requests_per_minute:
            return self._create_rate_limit_response("Minute limit exceeded", 60)
        
        if hour_count >= rule.requests_per_hour:
            return self._create_rate_limit_response("Hour limit exceeded", 3600)
        
        if day_count >= rule.requests_per_day:
            return self._create_rate_limit_response("Day limit exceeded", 86400)
        
        return {
            'allowed': True,
            'reason': 'within_limits',
            'retry_after': None,
            'headers': {
                'X-RateLimit-Limit-Minute': str(rule.requests_per_minute),
                'X-RateLimit-Remaining-Minute': str(rule.requests_per_minute - minute_count - 1),
                'X-RateLimit-Limit-Hour': str(rule.requests_per_hour),
                'X-RateLimit-Remaining-Hour': str(rule.requests_per_hour - hour_count - 1),
                'X-RateLimit-Limit-Day': str(rule.requests_per_day),
                'X-RateLimit-Remaining-Day': str(rule.requests_per_day - day_count - 1),
            }
        }
    
    async def _check_burst_detection(self, client_ip: str, endpoint: str) -> Dict[str, Any]:
        """Check for burst/DDoS patterns"""
        current_time = time.time()
        burst_key = f"burst:{client_ip}:{endpoint}"
        
        # Get recent request timestamps
        recent_requests = await self._get_burst_requests(burst_key, current_time)
        
        # Count requests in burst window
        burst_window = self.global_config['burst_detection_window']
        recent_count = sum(1 for req_time in recent_requests 
                          if current_time - req_time <= burst_window)
        
        max_burst = self.global_config['max_requests_per_second'] * burst_window
        
        if recent_count >= max_burst:
            return self._create_rate_limit_response("Burst limit exceeded", burst_window)
        
        # Record current request
        await self._record_burst_request(burst_key, current_time)
        
        return {'allowed': True, 'reason': 'burst_ok', 'retry_after': None, 'headers': {}}
    
    async def _analyze_request_behavior(self, request: Request, profile: ClientBehaviorProfile) -> Dict[str, Any]:
        """Analyze request for behavioral anomalies"""
        anomalies = []
        
        # Check for rapid booking attempts
        if '/bookings' in request.url.path:
            if profile.booking_attempts > profile.successful_bookings * 5:
                anomalies.append("excessive_failed_bookings")
        
        # Check request timing patterns
        if hasattr(profile, 'request_intervals'):
            intervals = profile.request_intervals
            if len(intervals) > 10:
                avg_interval = sum(intervals) / len(intervals)
                if avg_interval < 1.0:  # Less than 1 second average
                    anomalies.append("rapid_fire_requests")
        
        # Check for suspicious patterns
        if len(profile.suspicious_patterns) > 3:
            anomalies.append("multiple_suspicious_patterns")
        
        if anomalies:
            return self._create_behavioral_block_response(anomalies)
        
        return {'allowed': True, 'reason': 'behavior_ok', 'retry_after': None, 'headers': {}}
    
    async def _get_request_count(self, key: str) -> int:
        """Get request count from storage"""
        if self.redis_client:
            try:
                count = await self.redis_client.get(key)
                return int(count) if count else 0
            except RedisConnectionError:
                logger.warning("Redis connection failed, using local cache")
        
        # Fallback to local cache
        return len(self.local_cache[key])
    
    async def _record_successful_request(self, client_ip: str, endpoint: str, rule: RateLimitRule):
        """Record successful request for rate limiting"""
        current_time = time.time()
        
        # Create keys for different time windows
        minute_key = f"rl:{client_ip}:{endpoint}:m:{int(current_time // 60)}"
        hour_key = f"rl:{client_ip}:{endpoint}:h:{int(current_time // 3600)}"
        day_key = f"rl:{client_ip}:{endpoint}:d:{int(current_time // 86400)}"
        
        if self.redis_client:
            try:
                # Increment counters with expiration
                await self.redis_client.incr(minute_key)
                await self.redis_client.expire(minute_key, 60)
                
                await self.redis_client.incr(hour_key)
                await self.redis_client.expire(hour_key, 3600)
                
                await self.redis_client.incr(day_key)
                await self.redis_client.expire(day_key, 86400)
                
            except RedisConnectionError:
                # Fallback to local cache
                self._record_local_request(minute_key, current_time)
                self._record_local_request(hour_key, current_time)
                self._record_local_request(day_key, current_time)
        else:
            # Use local cache
            self._record_local_request(minute_key, current_time)
            self._record_local_request(hour_key, current_time)
            self._record_local_request(day_key, current_time)
    
    def _record_local_request(self, key: str, timestamp: float):
        """Record request in local cache"""
        cache = self.local_cache[key]
        cache.append(timestamp)
        
        # Clean old entries
        cutoff = timestamp - 86400  # Keep 24 hours
        while cache and cache[0] < cutoff:
            cache.popleft()
    
    async def _get_burst_requests(self, key: str, current_time: float) -> List[float]:
        """Get recent burst requests"""
        if self.redis_client:
            try:
                requests = await self.redis_client.lrange(key, 0, -1)
                return [float(r) for r in requests if current_time - float(r) <= 60]
            except RedisConnectionError:
                pass
        
        # Fallback to local cache
        cache = self.local_cache[key]
        return [ts for ts in cache if current_time - ts <= 60]
    
    async def _record_burst_request(self, key: str, timestamp: float):
        """Record burst request"""
        if self.redis_client:
            try:
                await self.redis_client.lpush(key, timestamp)
                await self.redis_client.ltrim(key, 0, 99)  # Keep last 100
                await self.redis_client.expire(key, 300)  # 5 minutes
            except RedisConnectionError:
                pass
        
        # Also record locally
        cache = self.local_cache[key]
        cache.append(timestamp)
        if len(cache) > 100:
            cache.popleft()
    
    async def _record_violation(self, profile: ClientBehaviorProfile, violation_type: str):
        """Record rate limit violation"""
        profile.rate_limit_violations += 1
        profile.last_violation = datetime.utcnow()
        
        logger.warning(f"Rate limit violation: IP {profile.ip_address}, Type: {violation_type}")
        
        # Auto-block if too many violations
        if profile.rate_limit_violations >= self.global_config['auto_block_threshold']:
            self.blocked_ips.add(profile.ip_address)
            logger.error(f"Auto-blocked IP {profile.ip_address} due to repeated violations")
    
    def _create_rate_limit_response(self, reason: str, retry_after: int) -> Dict[str, Any]:
        """Create rate limit exceeded response"""
        return {
            'allowed': False,
            'reason': reason,
            'retry_after': retry_after,
            'headers': {
                'Retry-After': str(retry_after),
                'X-RateLimit-Reason': reason
            }
        }
    
    def _create_behavioral_block_response(self, anomalies: List[str]) -> Dict[str, Any]:
        """Create behavioral anomaly block response"""
        return {
            'allowed': False,
            'reason': 'behavioral_anomaly',
            'retry_after': 300,  # 5 minutes
            'headers': {
                'Retry-After': '300',
                'X-Block-Reason': 'Behavioral anomaly detected',
                'X-Anomalies': ', '.join(anomalies)
            }
        }
    
    def _create_blocked_response(self, reason: str) -> Dict[str, Any]:
        """Create blocked IP response"""
        return {
            'allowed': False,
            'reason': 'ip_blocked',
            'retry_after': self.global_config['block_duration'],
            'headers': {
                'Retry-After': str(self.global_config['block_duration']),
                'X-Block-Reason': reason
            }
        }

class AdaptiveRateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI middleware for adaptive rate limiting
    """
    
    def __init__(self, app, rate_limiter: AdaptiveRateLimiter = None):
        super().__init__(app)
        self.rate_limiter = rate_limiter or AdaptiveRateLimiter()
        
        logger.info("Adaptive Rate Limit Middleware initialized")
    
    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limiting(request):
            return await call_next(request)
        
        # Check rate limits
        rate_limit_result = await self.rate_limiter.check_rate_limit(request)
        
        if not rate_limit_result['allowed']:
            # Return rate limit response
            headers = rate_limit_result.get('headers', {})
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": rate_limit_result['reason'],
                    "retry_after": rate_limit_result['retry_after']
                },
                headers=headers
            )
        
        # Add rate limit headers to successful responses
        response = await call_next(request)
        
        # Add rate limit headers
        headers = rate_limit_result.get('headers', {})
        for header, value in headers.items():
            response.headers[header] = value
        
        return response
    
    def _should_skip_rate_limiting(self, request: Request) -> bool:
        """Determine if rate limiting should be skipped"""
        skip_paths = [
            '/health',
            '/metrics',
            '/docs',
            '/openapi.json',
            '/static/',
            '/favicon.ico'
        ]
        
        path = request.url.path
        return any(path.startswith(skip_path) for skip_path in skip_paths)

# Utility functions
def create_rate_limiter(redis_url: str = None) -> AdaptiveRateLimiter:
    """Create rate limiter with optional Redis backend"""
    redis_client = None
    
    if redis_url:
        try:
            redis_client = redis.from_url(redis_url, decode_responses=True)
            logger.info("Connected to Redis for rate limiting")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    return AdaptiveRateLimiter(redis_client)

# FastAPI dependency for manual rate limit checking
async def check_rate_limit(request: Request, rate_limiter: AdaptiveRateLimiter = None):
    """FastAPI dependency for rate limit checking"""
    if not rate_limiter:
        rate_limiter = AdaptiveRateLimiter()
    
    result = await rate_limiter.check_rate_limit(request)
    
    if not result['allowed']:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers=result.get('headers', {})
        )
    
    return result