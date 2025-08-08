#!/usr/bin/env python3
"""
Enhanced Security Middleware for 6FB AI Agent System
Integrates comprehensive security controls including input validation,
authentication monitoring, GDPR compliance, and threat detection.
"""

import os
import re
import time
import json
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import hashlib
import asyncio
from collections import defaultdict
import ipaddress

logger = logging.getLogger(__name__)

class ThreatDetectionService:
    """Advanced threat detection and prevention"""
    
    def __init__(self):
        self.suspicious_ips = set()
        self.blocked_ips = set()
        self.request_patterns = defaultdict(list)
        self.last_cleanup = time.time()
        
        # Load known bad IP ranges (you can extend this with threat intelligence feeds)
        self.malicious_ip_ranges = [
            # Add known malicious IP ranges here
            # Example: ipaddress.ip_network('192.168.1.0/24')
        ]
        
        # Suspicious patterns
        self.attack_patterns = [
            # SQL injection patterns
            r"(\b(union|select|insert|update|delete|drop|create|alter|exec)\b.*\b(from|where|order|group)\b)",
            r"(--|#|/\*|\*/)",
            r"(\b(xp_|sp_)\w+\b)",
            
            # XSS patterns
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            
            # Path traversal
            r"(\.\./){2,}",
            r"(\\\.\\\.\\)",
            
            # Command injection
            r"[;&|`]",
            r"\b(cat|ls|pwd|whoami|id|uname)\b",
            
            # LDAP injection
            r"[()=*&|!]",
            
            # NoSQL injection
            r"(\$where|\$ne|\$gt|\$lt)",
        ]
        
        # Compile patterns for performance
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.attack_patterns]
    
    def _is_malicious_ip(self, ip: str) -> bool:
        """Check if IP is from known malicious ranges"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            for network in self.malicious_ip_ranges:
                if ip_obj in network:
                    return True
        except ValueError:
            pass
        return False
    
    def _detect_attack_patterns(self, text: str) -> List[str]:
        """Detect attack patterns in input text"""
        detected_patterns = []
        
        for i, pattern in enumerate(self.compiled_patterns):
            if pattern.search(text):
                detected_patterns.append(f"attack_pattern_{i}")
        
        return detected_patterns
    
    def _analyze_request_frequency(self, ip: str) -> bool:
        """Analyze request frequency for potential DoS"""
        now = time.time()
        
        # Clean old entries every 5 minutes
        if now - self.last_cleanup > 300:
            self._cleanup_old_entries(now)
            self.last_cleanup = now
        
        # Get recent requests from this IP
        recent_requests = self.request_patterns[ip]
        
        # Remove requests older than 1 minute
        cutoff_time = now - 60
        recent_requests[:] = [req_time for req_time in recent_requests if req_time > cutoff_time]
        
        # Add current request
        recent_requests.append(now)
        
        # Check if too many requests (more than 100 per minute)
        return len(recent_requests) > 100
    
    def _cleanup_old_entries(self, now: float):
        """Clean up old request tracking entries"""
        cutoff_time = now - 3600  # Keep 1 hour of data
        
        for ip in list(self.request_patterns.keys()):
            self.request_patterns[ip][:] = [
                req_time for req_time in self.request_patterns[ip] 
                if req_time > cutoff_time
            ]
            
            # Remove empty entries
            if not self.request_patterns[ip]:
                del self.request_patterns[ip]
    
    async def analyze_request(self, request: Request) -> Dict[str, any]:
        """Comprehensive request analysis for threats"""
        
        threats = []
        risk_score = 0
        client_ip = self._get_client_ip(request)
        
        # Check if IP is blocked
        if client_ip in self.blocked_ips:
            threats.append("blocked_ip")
            risk_score += 100
        
        # Check for malicious IP ranges
        if self._is_malicious_ip(client_ip):
            threats.append("malicious_ip_range")
            risk_score += 50
            self.suspicious_ips.add(client_ip)
        
        # Check request frequency for DoS
        if self._analyze_request_frequency(client_ip):
            threats.append("dos_pattern")
            risk_score += 30
            self.suspicious_ips.add(client_ip)
        
        # Analyze URL for attack patterns
        url_threats = self._detect_attack_patterns(str(request.url))
        if url_threats:
            threats.extend(url_threats)
            risk_score += len(url_threats) * 20
        
        # Analyze headers for suspicious content
        for header_name, header_value in request.headers.items():
            header_threats = self._detect_attack_patterns(f"{header_name}:{header_value}")
            if header_threats:
                threats.extend([f"header_{threat}" for threat in header_threats])
                risk_score += len(header_threats) * 10
        
        # Analyze query parameters
        if request.query_params:
            for param_name, param_value in request.query_params.items():
                param_threats = self._detect_attack_patterns(f"{param_name}={param_value}")
                if param_threats:
                    threats.extend([f"query_{threat}" for threat in param_threats])
                    risk_score += len(param_threats) * 15
        
        # Analyze request body if present
        try:
            if hasattr(request, '_body') and request._body:
                body_content = request._body.decode('utf-8')
                body_threats = self._detect_attack_patterns(body_content)
                if body_threats:
                    threats.extend([f"body_{threat}" for threat in body_threats])
                    risk_score += len(body_threats) * 25
        except Exception:
            pass  # Ignore body analysis errors
        
        # Check user agent for suspicious patterns
        user_agent = request.headers.get('user-agent', '')
        if not user_agent or len(user_agent) < 10:
            threats.append("suspicious_user_agent")
            risk_score += 10
        
        # Block IP if risk score is too high
        if risk_score >= 80:
            self.blocked_ips.add(client_ip)
            logger.critical(f"IP {client_ip} blocked due to high threat score: {risk_score}")
        elif risk_score >= 40:
            self.suspicious_ips.add(client_ip)
            logger.warning(f"IP {client_ip} marked suspicious, threat score: {risk_score}")
        
        return {
            'client_ip': client_ip,
            'threats': threats,
            'risk_score': risk_score,
            'blocked': client_ip in self.blocked_ips,
            'suspicious': client_ip in self.suspicious_ips
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy support"""
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'

class GDPRComplianceMiddleware:
    """GDPR compliance monitoring and enforcement"""
    
    def __init__(self):
        self.data_processing_log = []
        self.consent_tracking = {}
        
        # Define what constitutes personal data processing
        self.personal_data_endpoints = {
            '/api/v1/auth/register',
            '/api/v1/auth/login',
            '/api/v1/users/',
            '/api/v1/profile/',
            '/api/v1/bookings/',
            '/api/v1/customers/'
        }
        
        # Endpoints that require explicit consent
        self.marketing_endpoints = {
            '/api/v1/marketing/',
            '/api/v1/newsletters/',
            '/api/v1/analytics/'
        }
    
    def _is_personal_data_processing(self, request: Request) -> bool:
        """Check if request involves personal data processing"""
        path = request.url.path
        return any(path.startswith(endpoint) for endpoint in self.personal_data_endpoints)
    
    def _requires_marketing_consent(self, request: Request) -> bool:
        """Check if request requires marketing consent"""
        path = request.url.path
        return any(path.startswith(endpoint) for endpoint in self.marketing_endpoints)
    
    async def log_data_processing(self, request: Request, user_id: Optional[str] = None):
        """Log data processing activities for GDPR compliance"""
        
        if not self._is_personal_data_processing(request):
            return
        
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'ip_address': request.client.host if request.client else 'unknown',
            'endpoint': request.url.path,
            'method': request.method,
            'purpose': self._determine_processing_purpose(request),
            'legal_basis': self._determine_legal_basis(request),
            'data_categories': self._identify_data_categories(request),
        }
        
        self.data_processing_log.append(log_entry)
        
        # Keep only last 90 days of logs (GDPR requirement)
        cutoff_date = datetime.utcnow() - timedelta(days=90)
        self.data_processing_log = [
            entry for entry in self.data_processing_log
            if datetime.fromisoformat(entry['timestamp']) > cutoff_date
        ]
    
    def _determine_processing_purpose(self, request: Request) -> str:
        """Determine the purpose of data processing"""
        path = request.url.path.lower()
        
        if 'auth' in path:
            return 'authentication'
        elif 'booking' in path:
            return 'booking_management'
        elif 'profile' in path:
            return 'user_profile_management'
        elif 'marketing' in path:
            return 'marketing_communications'
        else:
            return 'service_provision'
    
    def _determine_legal_basis(self, request: Request) -> str:
        """Determine legal basis for processing under GDPR"""
        path = request.url.path.lower()
        
        if 'auth' in path or 'booking' in path:
            return 'contract'  # Article 6(1)(b) - contract performance
        elif 'marketing' in path:
            return 'consent'  # Article 6(1)(a) - consent
        elif 'security' in path or 'audit' in path:
            return 'legitimate_interest'  # Article 6(1)(f) - legitimate interest
        else:
            return 'contract'
    
    def _identify_data_categories(self, request: Request) -> List[str]:
        """Identify categories of personal data being processed"""
        path = request.url.path.lower()
        categories = []
        
        if 'auth' in path or 'user' in path:
            categories.extend(['contact_data', 'identity_data'])
        if 'booking' in path:
            categories.extend(['transaction_data', 'usage_data'])
        if 'profile' in path:
            categories.extend(['profile_data', 'preference_data'])
        if 'marketing' in path:
            categories.append('marketing_data')
        
        return categories

class EnhancedSecurityMiddleware(BaseHTTPMiddleware):
    """Comprehensive security middleware integrating all security controls"""
    
    def __init__(self, app, environment: str = "production"):
        super().__init__(app)
        self.environment = environment
        self.is_production = environment.lower() == "production"
        
        # Initialize security services
        self.threat_detector = ThreatDetectionService()
        self.gdpr_compliance = GDPRComplianceMiddleware()
        
        # Security monitoring
        self.security_events = []
        self.blocked_requests = 0
        self.suspicious_requests = 0
        
        # Paths to skip security checks
        self.skip_paths = {
            '/favicon.ico',
            '/robots.txt',
            '/_next/',
            '/static/',
            '/health',
            '/metrics'
        }
        
        # High-security endpoints that need extra protection
        self.high_security_endpoints = {
            '/api/v1/auth/',
            '/api/v1/admin/',
            '/api/v1/users/',
            '/api/v1/payments/'
        }
    
    def _should_skip_security_check(self, path: str) -> bool:
        """Check if path should skip security checks"""
        return any(path.startswith(skip_path) for skip_path in self.skip_paths)
    
    def _is_high_security_endpoint(self, path: str) -> bool:
        """Check if endpoint requires high security"""
        return any(path.startswith(endpoint) for endpoint in self.high_security_endpoints)
    
    async def _validate_content_type(self, request: Request) -> bool:
        """Validate content type for API requests"""
        if request.method in ['POST', 'PUT', 'PATCH']:
            content_type = request.headers.get('content-type', '').lower()
            
            # Allow only specific content types
            allowed_types = [
                'application/json',
                'application/x-www-form-urlencoded',
                'multipart/form-data'
            ]
            
            if not any(allowed_type in content_type for allowed_type in allowed_types):
                return False
        
        return True
    
    async def _check_request_size(self, request: Request) -> bool:
        """Check request size limits"""
        content_length = request.headers.get('content-length')
        if content_length:
            try:
                size = int(content_length)
                max_size = 10 * 1024 * 1024  # 10MB limit
                
                # Stricter limits for high-security endpoints
                if self._is_high_security_endpoint(request.url.path):
                    max_size = 1 * 1024 * 1024  # 1MB limit
                
                if size > max_size:
                    return False
            except ValueError:
                return False
        
        return True
    
    async def _validate_headers(self, request: Request) -> Tuple[bool, List[str]]:
        """Validate request headers for security"""
        issues = []
        
        # Check for required headers
        if request.method in ['POST', 'PUT', 'PATCH']:
            if not request.headers.get('content-type'):
                issues.append("Missing Content-Type header")
        
        # Check for suspicious headers
        suspicious_headers = ['x-forwarded-host', 'x-cluster-client-ip']
        for header in suspicious_headers:
            if header in request.headers:
                issues.append(f"Suspicious header: {header}")
        
        # Validate user-agent
        user_agent = request.headers.get('user-agent', '')
        if len(user_agent) > 1000:  # Unreasonably long user agent
            issues.append("Excessive user-agent length")
        
        return len(issues) == 0, issues
    
    async def _log_security_event(self, event_type: str, request: Request, details: Dict):
        """Log security events"""
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'ip': request.client.host if request.client else 'unknown',
            'path': request.url.path,
            'method': request.method,
            'user_agent': request.headers.get('user-agent', ''),
            'details': details
        }
        
        self.security_events.append(event)
        
        # Keep only last 1000 events in memory
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
        
        # Log to file for persistent storage
        logger.warning(f"Security Event: {json.dumps(event)}")
    
    async def dispatch(self, request: Request, call_next):
        """Main security middleware processing"""
        
        start_time = time.time()
        
        # Skip security checks for certain paths
        if self._should_skip_security_check(request.url.path):
            return await call_next(request)
        
        try:
            # 1. Threat Detection Analysis
            threat_analysis = await self.threat_detector.analyze_request(request)
            
            if threat_analysis['blocked']:
                self.blocked_requests += 1
                await self._log_security_event(
                    'REQUEST_BLOCKED',
                    request,
                    threat_analysis
                )
                return JSONResponse(
                    status_code=403,
                    content={
                        'error': 'Request blocked due to security concerns',
                        'code': 'SECURITY_BLOCK'
                    }
                )
            
            if threat_analysis['suspicious']:
                self.suspicious_requests += 1
                await self._log_security_event(
                    'SUSPICIOUS_REQUEST',
                    request,
                    threat_analysis
                )
            
            # 2. Request Validation
            if not await self._validate_content_type(request):
                return JSONResponse(
                    status_code=415,
                    content={'error': 'Unsupported content type'}
                )
            
            if not await self._check_request_size(request):
                return JSONResponse(
                    status_code=413,
                    content={'error': 'Request too large'}
                )
            
            headers_valid, header_issues = await self._validate_headers(request)
            if not headers_valid:
                await self._log_security_event(
                    'INVALID_HEADERS',
                    request,
                    {'issues': header_issues}
                )
                return JSONResponse(
                    status_code=400,
                    content={'error': 'Invalid request headers'}
                )
            
            # 3. GDPR Compliance Logging
            user_id = getattr(request.state, 'user_id', None)
            await self.gdpr_compliance.log_data_processing(request, user_id)
            
            # 4. Add security context to request
            request.state.security_analysis = threat_analysis
            request.state.security_start_time = start_time
            
            # 5. Process request
            response = await call_next(request)
            
            # 6. Add security headers to response
            response.headers['X-Security-Score'] = str(threat_analysis['risk_score'])
            response.headers['X-Request-ID'] = hashlib.md5(
                f"{start_time}{request.client.host}{request.url.path}".encode()
            ).hexdigest()[:16]
            
            # Add processing time
            process_time = time.time() - start_time
            response.headers['X-Process-Time'] = f"{process_time:.4f}"
            
            return response
            
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            
            # Log security middleware failures
            await self._log_security_event(
                'MIDDLEWARE_ERROR',
                request,
                {'error': str(e)}
            )
            
            # Continue processing but add security warning
            response = await call_next(request)
            response.headers['X-Security-Warning'] = 'Security middleware error'
            return response
    
    def get_security_statistics(self) -> Dict:
        """Get security statistics for monitoring"""
        return {
            'blocked_requests': self.blocked_requests,
            'suspicious_requests': self.suspicious_requests,
            'total_security_events': len(self.security_events),
            'blocked_ips_count': len(self.threat_detector.blocked_ips),
            'suspicious_ips_count': len(self.threat_detector.suspicious_ips),
            'gdpr_processing_logs': len(self.gdpr_compliance.data_processing_log)
        }
    
    def get_blocked_ips(self) -> List[str]:
        """Get list of blocked IPs"""
        return list(self.threat_detector.blocked_ips)
    
    def unblock_ip(self, ip: str) -> bool:
        """Manually unblock an IP address"""
        if ip in self.threat_detector.blocked_ips:
            self.threat_detector.blocked_ips.remove(ip)
            logger.info(f"IP {ip} manually unblocked")
            return True
        return False

# Export main components
__all__ = [
    'EnhancedSecurityMiddleware',
    'ThreatDetectionService',
    'GDPRComplianceMiddleware'
]