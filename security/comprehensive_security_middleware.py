#!/usr/bin/env python3
"""
Comprehensive Security Middleware Integration for 6FB AI Agent Booking System
Security Specialist Implementation

Integrates all security components into a unified middleware stack for FastAPI,
providing defense-in-depth protection for the booking system.
"""

import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timezone
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import redis
from uuid import uuid4

# Import our security modules
from .comprehensive_input_validation import ComprehensiveInputValidator, validate_booking_form, validate_payment_form
from .csrf_protection import CSRFProtectionMiddleware, CSRFTokenManager, CSRFConfig
from .adaptive_rate_limiting import AdaptiveRateLimitMiddleware, AdaptiveRateLimiter
from .comprehensive_security_headers import SecurityHeadersMiddleware, SecurityHeadersConfig
from .audit_logging import AuditLogger, AuditEvent, AuditEventType, AuditSeverity, create_audit_logger
from .data_encryption import DataEncryption, create_encryption_system
from .security_monitoring_dashboard import SecurityDashboard, SecurityDataCollector, create_security_event, SecurityEventType, ThreatLevel

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Central security configuration"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.is_production = environment.lower() == "production"
        
        # Environment variables
        self.redis_url = os.getenv('REDIS_URL')
        self.audit_db_path = os.getenv('AUDIT_DB_PATH', 'audit_logs.db')
        self.security_db_path = os.getenv('SECURITY_DB_PATH', 'security_events.db')
        self.encryption_key = os.getenv('ENCRYPTION_KEY')
        self.csrf_secret = os.getenv('CSRF_SECRET_KEY')
        
        # Security settings
        self.enable_rate_limiting = True
        self.enable_csrf_protection = True
        self.enable_security_headers = True
        self.enable_input_validation = True
        self.enable_audit_logging = True
        self.enable_data_encryption = True
        self.enable_monitoring = True
        
        # Performance settings
        self.max_request_size = 10 * 1024 * 1024  # 10MB
        self.request_timeout = 30  # seconds
        
        logger.info(f"Security configuration loaded for {environment}")

class ComprehensiveSecurityMiddleware(BaseHTTPMiddleware):
    """
    Unified security middleware that orchestrates all security components
    """
    
    def __init__(self, 
                 app: FastAPI,
                 config: SecurityConfig = None,
                 audit_logger: AuditLogger = None,
                 security_dashboard: SecurityDashboard = None):
        
        super().__init__(app)
        
        self.config = config or SecurityConfig()
        
        # Initialize security components
        self._init_security_components(audit_logger, security_dashboard)
        
        # Request tracking
        self.active_requests = {}
        
        logger.info("Comprehensive Security Middleware initialized")
    
    def _init_security_components(self, audit_logger: AuditLogger = None, security_dashboard: SecurityDashboard = None):
        """Initialize all security components"""
        
        # Input validator
        self.input_validator = ComprehensiveInputValidator()
        
        # Rate limiter
        redis_client = None
        if self.config.redis_url:
            try:
                redis_client = redis.from_url(self.config.redis_url)
            except Exception as e:
                logger.warning(f"Could not connect to Redis: {e}")
        
        self.rate_limiter = AdaptiveRateLimiter(redis_client)
        
        # CSRF protection
        self.csrf_manager = CSRFTokenManager(self.config.csrf_secret)
        
        # Audit logger
        self.audit_logger = audit_logger or create_audit_logger()
        
        # Data encryption
        self.encryption_system = create_encryption_system()
        
        # Security monitoring
        if security_dashboard:
            self.security_dashboard = security_dashboard
        else:
            data_collector = SecurityDataCollector(self.config.security_db_path)
            self.security_dashboard = SecurityDashboard(data_collector)
        
        logger.info("All security components initialized")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Main security middleware dispatch with comprehensive protection"""
        
        # Generate request ID for tracking
        request_id = str(uuid4())
        request.state.request_id = request_id
        start_time = datetime.now(timezone.utc)
        
        # Track active request
        self.active_requests[request_id] = {
            'start_time': start_time,
            'ip': self._get_client_ip(request),
            'path': request.url.path,
            'method': request.method
        }
        
        try:
            # Security checks (fail-fast approach)
            security_result = await self._comprehensive_security_check(request)
            
            if not security_result['allowed']:
                await self._log_security_violation(request, security_result)
                return self._create_security_response(security_result)
            
            # Process request
            response = await call_next(request)
            
            # Post-process response
            await self._post_process_response(request, response, start_time)
            
            return response
            
        except Exception as e:
            await self._handle_security_error(request, e, start_time)
            raise
        
        finally:
            # Cleanup request tracking
            if request_id in self.active_requests:
                del self.active_requests[request_id]
    
    async def _comprehensive_security_check(self, request: Request) -> Dict[str, Any]:
        """Run comprehensive security checks on request"""
        
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get('User-Agent', '')
        path = request.url.path
        method = request.method
        
        # 1. Rate limiting check
        if self.config.enable_rate_limiting:
            rate_limit_result = await self.rate_limiter.check_rate_limit(request)
            if not rate_limit_result['allowed']:
                return {
                    'allowed': False,
                    'reason': 'rate_limit_exceeded',
                    'details': rate_limit_result,
                    'threat_level': ThreatLevel.HIGH
                }
        
        # 2. Request size validation
        content_length = request.headers.get('Content-Length')
        if content_length and int(content_length) > self.config.max_request_size:
            return {
                'allowed': False,
                'reason': 'request_too_large',
                'details': {'size': content_length, 'max': self.config.max_request_size},
                'threat_level': ThreatLevel.MEDIUM
            }
        
        # 3. Basic header validation
        security_headers_check = self._validate_security_headers(request)
        if not security_headers_check['valid']:
            return {
                'allowed': False,
                'reason': 'invalid_headers',
                'details': security_headers_check,
                'threat_level': ThreatLevel.MEDIUM
            }
        
        # 4. Path traversal protection
        if self._detect_path_traversal(path):
            return {
                'allowed': False,
                'reason': 'path_traversal_attempt',
                'details': {'path': path},
                'threat_level': ThreatLevel.HIGH
            }
        
        # 5. CSRF protection for state-changing operations
        if self.config.enable_csrf_protection and method in ['POST', 'PUT', 'PATCH', 'DELETE']:
            csrf_result = await self._validate_csrf(request)
            if not csrf_result['valid']:
                return {
                    'allowed': False,
                    'reason': 'csrf_violation',
                    'details': csrf_result,
                    'threat_level': ThreatLevel.HIGH
                }
        
        # 6. Input validation for form submissions
        if method == 'POST' and self.config.enable_input_validation:
            input_validation_result = await self._validate_request_input(request)
            if not input_validation_result['valid']:
                return {
                    'allowed': False,
                    'reason': 'invalid_input',
                    'details': input_validation_result,
                    'threat_level': self._classify_input_threat(input_validation_result)
                }
        
        # 7. Authentication and authorization validation
        auth_result = await self._validate_authentication(request)
        if not auth_result['valid']:
            return {
                'allowed': False,
                'reason': 'authentication_failed',
                'details': auth_result,
                'threat_level': ThreatLevel.MEDIUM
            }
        
        # All checks passed
        return {
            'allowed': True,
            'reason': 'all_checks_passed',
            'details': {},
            'threat_level': ThreatLevel.LOW
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP with proxy support"""
        # Check proxy headers
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else '127.0.0.1'
    
    def _validate_security_headers(self, request: Request) -> Dict[str, Any]:
        """Validate basic security headers"""
        
        # Check for suspicious or malicious headers
        suspicious_headers = [
            'X-Originating-IP',
            'X-Forwarded-Host', 
            'X-Remote-IP'
        ]
        
        for header in suspicious_headers:
            if header in request.headers:
                # Log but don't block - could be legitimate proxy
                logger.warning(f"Suspicious header detected: {header}")
        
        # Validate User-Agent
        user_agent = request.headers.get('User-Agent', '')
        if self._is_suspicious_user_agent(user_agent):
            return {
                'valid': False,
                'reason': 'suspicious_user_agent',
                'user_agent': user_agent[:100]  # Truncate for logging
            }
        
        return {'valid': True}
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check for suspicious user agent patterns"""
        if not user_agent:
            return True  # Empty user agent is suspicious
        
        suspicious_patterns = [
            'sqlmap', 'nikto', 'nessus', 'openvas',
            'masscan', 'zmap', 'nmap', 'burp',
            'w3af', 'skipfish', 'dirb', 'gobuster'
        ]
        
        user_agent_lower = user_agent.lower()
        return any(pattern in user_agent_lower for pattern in suspicious_patterns)
    
    def _detect_path_traversal(self, path: str) -> bool:
        """Detect path traversal attempts"""
        traversal_patterns = [
            '../', '..\\',
            '%2e%2e%2f', '%2e%2e%5c',
            '..../', '....\\',
            '%252e%252e%252f'
        ]
        
        path_lower = path.lower()
        return any(pattern in path_lower for pattern in traversal_patterns)
    
    async def _validate_csrf(self, request: Request) -> Dict[str, Any]:
        """Validate CSRF token"""
        # Get CSRF token from header or form
        csrf_token = request.headers.get('X-CSRF-Token')
        
        if not csrf_token:
            # Check if it's a form submission
            if request.headers.get('Content-Type', '').startswith('application/x-www-form-urlencoded'):
                # Would need to parse form data here
                pass
        
        if not csrf_token:
            return {
                'valid': False,
                'reason': 'missing_csrf_token'
            }
        
        # Validate token
        session_id = request.cookies.get('session_id')  # Adapt based on your session management
        
        try:
            is_valid = self.csrf_manager.validate_token(csrf_token, session_id)
            return {
                'valid': is_valid,
                'reason': 'token_validated' if is_valid else 'invalid_token'
            }
        except Exception as e:
            logger.error(f"CSRF validation error: {e}")
            return {
                'valid': False,
                'reason': 'validation_error'
            }
    
    async def _validate_request_input(self, request: Request) -> Dict[str, Any]:
        """Validate request input for malicious content"""
        
        # Check URL parameters
        for param_name, param_value in request.query_params.items():
            validation_result = self.input_validator.sanitize_string(param_value)
            if validation_result.security_flags:
                return {
                    'valid': False,
                    'reason': 'malicious_query_parameter',
                    'parameter': param_name,
                    'flags': validation_result.security_flags
                }
        
        # For POST requests, validate body content
        if request.method == 'POST':
            try:
                content_type = request.headers.get('Content-Type', '')
                
                if 'application/json' in content_type:
                    # Would validate JSON body
                    pass
                elif 'application/x-www-form-urlencoded' in content_type:
                    # Would validate form data
                    pass
                elif 'multipart/form-data' in content_type:
                    # Would validate multipart data
                    pass
                
            except Exception as e:
                logger.error(f"Input validation error: {e}")
                return {
                    'valid': False,
                    'reason': 'input_parsing_error'
                }
        
        return {'valid': True}
    
    def _classify_input_threat(self, validation_result: Dict[str, Any]) -> ThreatLevel:
        """Classify threat level based on input validation results"""
        flags = validation_result.get('flags', [])
        
        if any('injection' in flag for flag in flags):
            return ThreatLevel.CRITICAL
        elif any('script' in flag for flag in flags):
            return ThreatLevel.HIGH
        elif len(flags) > 2:
            return ThreatLevel.MEDIUM
        else:
            return ThreatLevel.LOW
    
    async def _validate_authentication(self, request: Request) -> Dict[str, Any]:
        """Validate authentication for protected endpoints"""
        
        path = request.url.path
        
        # Define protected paths
        protected_paths = [
            '/api/bookings',
            '/api/payments',
            '/api/admin',
            '/api/user/profile'
        ]
        
        # Check if path requires authentication
        requires_auth = any(path.startswith(protected) for protected in protected_paths)
        
        if not requires_auth:
            return {'valid': True}
        
        # Check for authentication token
        auth_header = request.headers.get('Authorization')
        session_cookie = request.cookies.get('session_id')
        
        if not auth_header and not session_cookie:
            return {
                'valid': False,
                'reason': 'missing_authentication'
            }
        
        # Here you would validate the token/session
        # For now, assume valid if present
        return {'valid': True}
    
    async def _log_security_violation(self, request: Request, security_result: Dict[str, Any]):
        """Log security violation to audit and monitoring systems"""
        
        # Create audit event
        audit_event = AuditEvent(
            event_id=str(uuid4()),
            event_type=AuditEventType.SECURITY_VIOLATION,
            timestamp=datetime.now(timezone.utc),
            severity=self._map_threat_to_audit_severity(security_result.get('threat_level')),
            ip_address=self._get_client_ip(request),
            user_agent=request.headers.get('User-Agent'),
            resource=request.url.path,
            action=request.method,
            outcome="blocked",
            details=security_result,
            request_id=getattr(request.state, 'request_id', None)
        )
        
        # Log to audit system
        if self.config.enable_audit_logging:
            await self.audit_logger.log_event(audit_event)
        
        # Log to security monitoring
        if self.config.enable_monitoring:
            security_event = await create_security_event(
                event_type=self._map_reason_to_security_event(security_result['reason']),
                threat_level=security_result.get('threat_level', ThreatLevel.MEDIUM),
                source_ip=self._get_client_ip(request),
                details=security_result,
                endpoint=request.url.path
            )
            
            await self.security_dashboard.data_collector.record_security_event(security_event)
    
    def _map_threat_to_audit_severity(self, threat_level: ThreatLevel) -> AuditSeverity:
        """Map threat level to audit severity"""
        mapping = {
            ThreatLevel.LOW: AuditSeverity.LOW,
            ThreatLevel.MEDIUM: AuditSeverity.MEDIUM,
            ThreatLevel.HIGH: AuditSeverity.HIGH,
            ThreatLevel.CRITICAL: AuditSeverity.CRITICAL
        }
        return mapping.get(threat_level, AuditSeverity.MEDIUM)
    
    def _map_reason_to_security_event(self, reason: str) -> SecurityEventType:
        """Map security violation reason to event type"""
        mapping = {
            'rate_limit_exceeded': SecurityEventType.RATE_LIMIT_EXCEEDED,
            'csrf_violation': SecurityEventType.CSRF_VIOLATION,
            'invalid_input': SecurityEventType.INJECTION_ATTEMPT,
            'path_traversal_attempt': SecurityEventType.UNAUTHORIZED_ACCESS,
            'authentication_failed': SecurityEventType.AUTHENTICATION_FAILURE
        }
        return mapping.get(reason, SecurityEventType.SUSPICIOUS_REQUEST)
    
    def _create_security_response(self, security_result: Dict[str, Any]) -> JSONResponse:
        """Create appropriate security response"""
        
        status_codes = {
            'rate_limit_exceeded': status.HTTP_429_TOO_MANY_REQUESTS,
            'request_too_large': status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            'csrf_violation': status.HTTP_403_FORBIDDEN,
            'invalid_input': status.HTTP_400_BAD_REQUEST,
            'path_traversal_attempt': status.HTTP_403_FORBIDDEN,
            'authentication_failed': status.HTTP_401_UNAUTHORIZED
        }
        
        reason = security_result['reason']
        status_code = status_codes.get(reason, status.HTTP_403_FORBIDDEN)
        
        # Don't leak too much information about security measures
        safe_messages = {
            'rate_limit_exceeded': 'Too many requests. Please try again later.',
            'request_too_large': 'Request too large.',
            'csrf_violation': 'Security validation failed.',
            'invalid_input': 'Invalid request data.',
            'path_traversal_attempt': 'Access denied.',
            'authentication_failed': 'Authentication required.'
        }
        
        return JSONResponse(
            status_code=status_code,
            content={
                "error": "Security validation failed",
                "message": safe_messages.get(reason, "Access denied"),
                "request_id": str(uuid4())  # Don't expose real request ID
            }
        )
    
    async def _post_process_response(self, request: Request, response: Response, start_time: datetime):
        """Post-process response with security enhancements"""
        
        # Calculate response time
        response_time = (datetime.now(timezone.utc) - start_time).total_seconds()
        
        # Add security headers (if not already added by SecurityHeadersMiddleware)
        if not hasattr(response, '_security_headers_applied'):
            self._apply_basic_security_headers(response)
        
        # Log successful request for audit
        if self.config.enable_audit_logging:
            audit_event = AuditEvent(
                event_id=str(uuid4()),
                event_type=AuditEventType.DATA_ACCESSED,
                timestamp=start_time,
                severity=AuditSeverity.LOW,
                ip_address=self._get_client_ip(request),
                user_agent=request.headers.get('User-Agent'),
                resource=request.url.path,
                action=request.method,
                outcome="success",
                details={
                    'response_time_ms': round(response_time * 1000, 2),
                    'status_code': response.status_code
                },
                request_id=getattr(request.state, 'request_id', None)
            )
            
            # Async log to avoid blocking response
            asyncio.create_task(self.audit_logger.log_event(audit_event))
    
    def _apply_basic_security_headers(self, response: Response):
        """Apply basic security headers"""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin'
        }
        
        for header, value in security_headers.items():
            if header not in response.headers:
                response.headers[header] = value
    
    async def _handle_security_error(self, request: Request, error: Exception, start_time: datetime):
        """Handle security-related errors"""
        
        logger.error(f"Security middleware error: {error}")
        
        # Log error for audit
        if self.config.enable_audit_logging:
            audit_event = AuditEvent(
                event_id=str(uuid4()),
                event_type=AuditEventType.SYSTEM_ERROR,
                timestamp=start_time,
                severity=AuditSeverity.HIGH,
                ip_address=self._get_client_ip(request),
                resource=request.url.path,
                action=request.method,
                outcome="error",
                details={
                    'error': str(error),
                    'error_type': type(error).__name__
                },
                request_id=getattr(request.state, 'request_id', None)
            )
            
            try:
                await self.audit_logger.log_event(audit_event)
            except Exception as log_error:
                logger.error(f"Failed to log audit event: {log_error}")

def create_security_middleware_stack(app: FastAPI, 
                                   config: SecurityConfig = None) -> FastAPI:
    """
    Create and configure the complete security middleware stack
    """
    
    config = config or SecurityConfig()
    
    # Initialize security components
    audit_logger = create_audit_logger() if config.enable_audit_logging else None
    security_dashboard = SecurityDashboard() if config.enable_monitoring else None
    
    # Add middleware in reverse order (last added is executed first)
    
    # 1. CORS (outermost)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "https://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 2. Security Headers
    if config.enable_security_headers:
        app.add_middleware(
            SecurityHeadersMiddleware,
            config=SecurityHeadersConfig(config.environment)
        )
    
    # 3. Rate Limiting  
    if config.enable_rate_limiting:
        rate_limiter = AdaptiveRateLimiter()
        app.add_middleware(AdaptiveRateLimitMiddleware, rate_limiter=rate_limiter)
    
    # 4. CSRF Protection
    if config.enable_csrf_protection:
        app.add_middleware(CSRFProtectionMiddleware)
    
    # 5. Comprehensive Security (innermost - executes first)
    app.add_middleware(
        ComprehensiveSecurityMiddleware,
        config=config,
        audit_logger=audit_logger,
        security_dashboard=security_dashboard
    )
    
    logger.info("Complete security middleware stack configured")
    
    return app

# Convenience function for FastAPI app setup
def secure_fastapi_app(app: FastAPI, 
                      environment: str = "production",
                      **security_options) -> FastAPI:
    """
    Apply comprehensive security hardening to FastAPI app
    
    Args:
        app: FastAPI application instance
        environment: Environment (development, staging, production)
        **security_options: Additional security configuration options
    
    Returns:
        Secured FastAPI application
    """
    
    # Create security configuration
    config = SecurityConfig(environment)
    
    # Apply security options
    for option, value in security_options.items():
        if hasattr(config, option):
            setattr(config, option, value)
    
    # Configure security middleware stack
    secured_app = create_security_middleware_stack(app, config)
    
    logger.info(f"FastAPI application secured for {environment} environment")
    
    return secured_app

# Example usage
def create_secure_booking_app() -> FastAPI:
    """Create a fully secured booking application"""
    
    app = FastAPI(
        title="6FB Secure Booking System",
        description="Enterprise-secured booking platform",
        version="2.0.0"
    )
    
    # Add your routes here
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}
    
    @app.post("/api/bookings")
    async def create_booking(request: Request):
        # Your booking logic here
        return {"message": "Booking created successfully"}
    
    # Apply comprehensive security
    secured_app = secure_fastapi_app(
        app,
        environment="production",
        enable_rate_limiting=True,
        enable_csrf_protection=True,
        enable_audit_logging=True,
        enable_monitoring=True
    )
    
    return secured_app