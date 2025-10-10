#!/usr/bin/env python3
"""
Comprehensive Security Headers Middleware for 6FB AI Agent Booking System
Security Specialist Implementation

Implements enterprise-level security headers including CSP, HSTS, CSRF protection,
clickjacking prevention, and PCI compliance headers for payment processing.
"""

import os
import json
import uuid
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import secrets

logger = logging.getLogger(__name__)

class SecurityHeadersConfig:
    """Configuration for security headers"""
    
    def __init__(self, environment: str = "production"):
        self.environment = environment
        self.is_production = environment.lower() == "production"
        self.domain = os.getenv('DOMAIN_NAME', 'localhost:3000')
        self.api_domain = os.getenv('API_DOMAIN', 'localhost:8001')
        
        # CSP Configuration
        self.csp_nonce = None  # Generated per request
        
        # HSTS Configuration
        self.hsts_max_age = 31536000  # 1 year in seconds
        self.hsts_include_subdomains = True
        self.hsts_preload = self.is_production
        
        # Content Type Options
        self.nosniff_enabled = True
        
        # Frame Options
        self.frame_options = "DENY"  # DENY, SAMEORIGIN, or ALLOW-FROM
        
        # XSS Protection
        self.xss_protection = "1; mode=block"
        
        # Referrer Policy
        self.referrer_policy = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature Policy)
        self.permissions_policy_enabled = True
        
        # Cross-Origin Embedder Policy
        self.coep_enabled = False  # Set to True if you need cross-origin isolation
        
        # Cross-Origin Opener Policy
        self.coop_policy = "same-origin-allow-popups"  # For payment popups
        
        # Expect-CT (deprecated but still used)
        self.expect_ct_enabled = self.is_production
        self.expect_ct_max_age = 86400
        
        logger.info(f"Security Headers Config initialized for {environment} environment")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security headers middleware with booking system optimizations
    """
    
    def __init__(self, app, config: SecurityHeadersConfig = None):
        super().__init__(app)
        self.config = config or SecurityHeadersConfig()
        
        # Initialize security reporting
        self.violation_reports = []
        self.nonce_store = {}
        
        logger.info("Comprehensive Security Headers Middleware initialized")
    
    async def dispatch(self, request: Request, call_next):
        """Apply security headers to responses"""
        
        # Generate nonce for CSP
        nonce = self._generate_nonce()
        request.state.csp_nonce = nonce
        
        # Process request
        response = await call_next(request)
        
        # Apply security headers
        self._apply_security_headers(request, response, nonce)
        
        return response
    
    def _apply_security_headers(self, request: Request, response: Response, nonce: str):
        """Apply comprehensive security headers to response"""
        
        # Content Security Policy
        self._apply_csp_headers(request, response, nonce)
        
        # HTTP Strict Transport Security
        self._apply_hsts_headers(response)
        
        # X-Frame-Options (Clickjacking Protection)
        self._apply_frame_options(response)
        
        # X-Content-Type-Options
        self._apply_content_type_options(response)
        
        # X-XSS-Protection
        self._apply_xss_protection(response)
        
        # Referrer-Policy
        self._apply_referrer_policy(response)
        
        # Permissions-Policy (Feature-Policy)
        self._apply_permissions_policy(response)
        
        # Cross-Origin Policies
        self._apply_cross_origin_policies(response)
        
        # Security-specific headers
        self._apply_additional_security_headers(response)
        
        # PCI Compliance headers (for payment processing)
        if self._is_payment_related(request):
            self._apply_pci_compliance_headers(response)
        
        # Cache control for sensitive pages
        if self._is_sensitive_page(request):
            self._apply_sensitive_cache_headers(response)
    
    def _apply_csp_headers(self, request: Request, response: Response, nonce: str):
        """Apply Content Security Policy headers"""
        
        # Base CSP policy
        csp_directives = {
            'default-src': ["'self'"],
            'script-src': [
                "'self'",
                f"'nonce-{nonce}'",
                "'unsafe-inline'",  # Needed for some payment processors
                'https://js.stripe.com',
                'https://checkout.stripe.com',
                'https://www.google.com/recaptcha/',
                'https://www.gstatic.com/recaptcha/',
                'https://apis.google.com',
            ],
            'style-src': [
                "'self'",
                "'unsafe-inline'",  # Needed for dynamic styles
                'https://fonts.googleapis.com',
                'https://cdn.jsdelivr.net',
            ],
            'img-src': [
                "'self'",
                'data:',
                'blob:',
                'https:',  # Allow HTTPS images
                'https://www.gravatar.com',
                'https://images.unsplash.com',
            ],
            'font-src': [
                "'self'",
                'https://fonts.gstatic.com',
                'https://cdn.jsdelivr.net',
            ],
            'connect-src': [
                "'self'",
                f'https://{self.config.api_domain}',
                f'wss://{self.config.api_domain}',
                'https://api.stripe.com',
                'https://checkout.stripe.com',
                'https://www.google-analytics.com',
                'https://analytics.google.com',
            ],
            'frame-src': [
                "'none'"  # Prevent framing by default
            ],
            'frame-ancestors': [
                "'none'"  # Prevent being framed
            ],
            'form-action': [
                "'self'",
                'https://checkout.stripe.com',  # Allow Stripe form submissions
            ],
            'base-uri': [
                "'self'"
            ],
            'object-src': [
                "'none'"
            ],
            'media-src': [
                "'self'",
                'blob:',
                'data:',
            ],
            'worker-src': [
                "'self'",
                'blob:',
            ],
            'child-src': [
                "'self'",
                'blob:',
            ],
            'manifest-src': [
                "'self'"
            ]
        }
        
        # Payment-specific CSP adjustments
        if self._is_payment_related(request):
            csp_directives['frame-src'] = [
                'https://js.stripe.com',
                'https://hooks.stripe.com',
                'https://checkout.stripe.com',
            ]
        
        # Admin pages get stricter CSP
        if self._is_admin_page(request):
            csp_directives['script-src'] = ["'self'", f"'nonce-{nonce}'"]
            csp_directives['style-src'] = ["'self'"]
        
        # Build CSP string
        csp_parts = []
        for directive, sources in csp_directives.items():
            csp_parts.append(f"{directive} {' '.join(sources)}")
        
        csp_policy = '; '.join(csp_parts)
        
        # Apply CSP header
        if self.config.is_production:
            response.headers['Content-Security-Policy'] = csp_policy
        else:
            # Use report-only in development
            response.headers['Content-Security-Policy-Report-Only'] = csp_policy
        
        # CSP Reporting
        if self._should_enable_csp_reporting():
            report_uri = f"/api/security/csp-report"
            response.headers['Content-Security-Policy'] += f"; report-uri {report_uri}"
    
    def _apply_hsts_headers(self, response: Response):
        """Apply HTTP Strict Transport Security headers"""
        if not self.config.is_production:
            return  # Don't apply HSTS in development
        
        hsts_value = f"max-age={self.config.hsts_max_age}"
        
        if self.config.hsts_include_subdomains:
            hsts_value += "; includeSubDomains"
        
        if self.config.hsts_preload:
            hsts_value += "; preload"
        
        response.headers['Strict-Transport-Security'] = hsts_value
    
    def _apply_frame_options(self, response: Response):
        """Apply X-Frame-Options header"""
        response.headers['X-Frame-Options'] = self.config.frame_options
    
    def _apply_content_type_options(self, response: Response):
        """Apply X-Content-Type-Options header"""
        if self.config.nosniff_enabled:
            response.headers['X-Content-Type-Options'] = 'nosniff'
    
    def _apply_xss_protection(self, response: Response):
        """Apply X-XSS-Protection header"""
        response.headers['X-XSS-Protection'] = self.config.xss_protection
    
    def _apply_referrer_policy(self, response: Response):
        """Apply Referrer-Policy header"""
        response.headers['Referrer-Policy'] = self.config.referrer_policy
    
    def _apply_permissions_policy(self, response: Response):
        """Apply Permissions-Policy header"""
        if not self.config.permissions_policy_enabled:
            return
        
        # Define permissions for booking system
        permissions = {
            'camera': '()',  # Disabled
            'microphone': '()',  # Disabled
            'geolocation': '(self)',  # Allow for location-based services
            'payment': '(self)',  # Allow payment processing
            'usb': '()',  # Disabled
            'magnetometer': '()',  # Disabled
            'gyroscope': '()',  # Disabled
            'accelerometer': '()',  # Disabled
            'fullscreen': '(self)',  # Allow fullscreen for booking forms
            'autoplay': '()',  # Disabled
        }
        
        policy_parts = [f"{feature}={value}" for feature, value in permissions.items()]
        response.headers['Permissions-Policy'] = ', '.join(policy_parts)
    
    def _apply_cross_origin_policies(self, response: Response):
        """Apply Cross-Origin policies"""
        
        # Cross-Origin-Opener-Policy
        response.headers['Cross-Origin-Opener-Policy'] = self.config.coop_policy
        
        # Cross-Origin-Embedder-Policy (if enabled)
        if self.config.coep_enabled:
            response.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
        
        # Cross-Origin-Resource-Policy
        response.headers['Cross-Origin-Resource-Policy'] = 'same-origin'
    
    def _apply_additional_security_headers(self, response: Response):
        """Apply additional security headers"""
        
        # Server header removal/obfuscation
        response.headers['Server'] = '6FB-Booking-System'
        
        # X-Powered-By header removal (if present)
        if 'X-Powered-By' in response.headers:
            del response.headers['X-Powered-By']
        
        # Custom security headers
        response.headers['X-Security-Framework'] = '6FB-Enterprise-Security'
        response.headers['X-Request-ID'] = str(uuid.uuid4())
        
        # Expect-CT (for certificate transparency)
        if self.config.expect_ct_enabled:
            expect_ct = f"max-age={self.config.expect_ct_max_age}, enforce"
            response.headers['Expect-CT'] = expect_ct
    
    def _apply_pci_compliance_headers(self, response: Response):
        """Apply PCI compliance specific headers for payment processing"""
        
        # Strict cache control for payment pages
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        
        # Enhanced frame protection for payment forms
        response.headers['X-Frame-Options'] = 'DENY'
        
        # PCI-specific security headers
        response.headers['X-Payment-Security'] = 'PCI-DSS-Compliant'
        response.headers['X-Content-Security'] = 'Enhanced'
        
        # Disable certain features for payment security
        response.headers['Permissions-Policy'] = (
            'camera=(), microphone=(), geolocation=(), '
            'payment=(self), usb=(), bluetooth=(), serial=()'
        )
    
    def _apply_sensitive_cache_headers(self, response: Response):
        """Apply cache headers for sensitive pages"""
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, private'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    
    def _generate_nonce(self) -> str:
        """Generate cryptographically secure nonce for CSP"""
        nonce = secrets.token_urlsafe(16)
        self.nonce_store[nonce] = datetime.utcnow()
        return nonce
    
    def _is_payment_related(self, request: Request) -> bool:
        """Check if request is payment-related"""
        path = request.url.path.lower()
        return any(keyword in path for keyword in [
            '/payment', '/checkout', '/billing', '/card', '/stripe'
        ])
    
    def _is_admin_page(self, request: Request) -> bool:
        """Check if request is for admin pages"""
        path = request.url.path.lower()
        return '/admin' in path or '/dashboard' in path
    
    def _is_sensitive_page(self, request: Request) -> bool:
        """Check if page contains sensitive information"""
        path = request.url.path.lower()
        sensitive_paths = [
            '/admin', '/dashboard', '/profile', '/settings',
            '/payment', '/billing', '/booking', '/appointments'
        ]
        return any(sensitive_path in path for sensitive_path in sensitive_paths)
    
    def _should_enable_csp_reporting(self) -> bool:
        """Determine if CSP reporting should be enabled"""
        return self.config.is_production or os.getenv('ENABLE_CSP_REPORTING', 'false').lower() == 'true'

class CSPReportHandler:
    """Handler for CSP violation reports"""
    
    def __init__(self):
        self.violation_count = 0
        self.violations = []
        self.max_stored_violations = 1000
        
    async def handle_csp_report(self, report_data: dict):
        """Process CSP violation report"""
        self.violation_count += 1
        
        # Log violation
        logger.warning(f"CSP Violation #{self.violation_count}: {json.dumps(report_data, indent=2)}")
        
        # Store violation (with rotation)
        violation = {
            'timestamp': datetime.utcnow().isoformat(),
            'report': report_data,
            'violation_id': str(uuid.uuid4())
        }
        
        self.violations.append(violation)
        
        # Rotate old violations
        if len(self.violations) > self.max_stored_violations:
            self.violations = self.violations[-self.max_stored_violations:]
        
        # Check for attack patterns
        await self._analyze_violation_patterns(report_data)
    
    async def _analyze_violation_patterns(self, report_data: dict):
        """Analyze violations for potential attacks"""
        
        # Extract key information
        blocked_uri = report_data.get('blocked-uri', '')
        violated_directive = report_data.get('violated-directive', '')
        document_uri = report_data.get('document-uri', '')
        
        # Check for common attack patterns
        suspicious_patterns = [
            'javascript:', 'data:', 'vbscript:', 'eval(',
            'alert(', 'prompt(', 'confirm(', '<script'
        ]
        
        is_suspicious = any(pattern in blocked_uri.lower() for pattern in suspicious_patterns)
        
        if is_suspicious:
            logger.error(f"Suspicious CSP violation detected: {blocked_uri}")
            # Here you could trigger additional security measures
            # such as rate limiting, IP blocking, or alerting
    
    def get_violation_summary(self) -> dict:
        """Get summary of CSP violations"""
        if not self.violations:
            return {'total_violations': 0, 'recent_violations': []}
        
        # Recent violations (last 10)
        recent = self.violations[-10:]
        
        # Group by directive
        directive_counts = {}
        for violation in self.violations:
            directive = violation['report'].get('violated-directive', 'unknown')
            directive_counts[directive] = directive_counts.get(directive, 0) + 1
        
        return {
            'total_violations': len(self.violations),
            'recent_violations': recent,
            'violations_by_directive': directive_counts,
            'last_violation': self.violations[-1]['timestamp'] if self.violations else None
        }

# Security Headers Utility Functions
class SecurityHeadersUtils:
    """Utility functions for security headers management"""
    
    @staticmethod
    def get_security_score(headers: dict) -> dict:
        """Calculate security score based on headers present"""
        score = 0
        max_score = 100
        
        security_checks = {
            'Content-Security-Policy': 25,
            'Strict-Transport-Security': 20,
            'X-Frame-Options': 15,
            'X-Content-Type-Options': 10,
            'X-XSS-Protection': 10,
            'Referrer-Policy': 10,
            'Permissions-Policy': 10,
        }
        
        present_headers = []
        missing_headers = []
        
        for header, points in security_checks.items():
            if header in headers:
                score += points
                present_headers.append(header)
            else:
                missing_headers.append(header)
        
        return {
            'score': score,
            'max_score': max_score,
            'percentage': (score / max_score) * 100,
            'present_headers': present_headers,
            'missing_headers': missing_headers,
            'grade': SecurityHeadersUtils._get_security_grade(score, max_score)
        }
    
    @staticmethod
    def _get_security_grade(score: int, max_score: int) -> str:
        """Get letter grade for security score"""
        percentage = (score / max_score) * 100
        
        if percentage >= 90:
            return 'A'
        elif percentage >= 80:
            return 'B'
        elif percentage >= 70:
            return 'C'
        elif percentage >= 60:
            return 'D'
        else:
            return 'F'
    
    @staticmethod
    def generate_security_report(headers: dict, request_path: str = None) -> dict:
        """Generate comprehensive security headers report"""
        score_data = SecurityHeadersUtils.get_security_score(headers)
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'request_path': request_path,
            'security_score': score_data,
            'headers_analysis': {
                'total_headers': len(headers),
                'security_headers': len(score_data['present_headers']),
                'recommendations': SecurityHeadersUtils._get_recommendations(score_data['missing_headers'])
            },
            'compliance_check': {
                'pci_dss': SecurityHeadersUtils._check_pci_compliance(headers),
                'owasp_top10': SecurityHeadersUtils._check_owasp_compliance(headers),
                'general_security': score_data['grade']
            }
        }
    
    @staticmethod
    def _get_recommendations(missing_headers: List[str]) -> List[str]:
        """Get security recommendations for missing headers"""
        recommendations = []
        
        header_recommendations = {
            'Content-Security-Policy': 'Implement CSP to prevent XSS and code injection attacks',
            'Strict-Transport-Security': 'Add HSTS to enforce secure connections',
            'X-Frame-Options': 'Add X-Frame-Options to prevent clickjacking',
            'X-Content-Type-Options': 'Add X-Content-Type-Options to prevent MIME sniffing',
            'X-XSS-Protection': 'Add XSS protection header for legacy browser support',
            'Referrer-Policy': 'Control referrer information leakage',
            'Permissions-Policy': 'Restrict browser features and APIs',
        }
        
        for header in missing_headers:
            if header in header_recommendations:
                recommendations.append(header_recommendations[header])
        
        return recommendations
    
    @staticmethod
    def _check_pci_compliance(headers: dict) -> dict:
        """Check PCI DSS compliance requirements"""
        required_for_pci = {
            'Strict-Transport-Security': 'HTTPS enforcement required',
            'X-Frame-Options': 'Clickjacking protection required',
            'Content-Security-Policy': 'XSS prevention required',
        }
        
        compliant = True
        missing_requirements = []
        
        for header, requirement in required_for_pci.items():
            if header not in headers:
                compliant = False
                missing_requirements.append(requirement)
        
        return {
            'compliant': compliant,
            'missing_requirements': missing_requirements
        }
    
    @staticmethod
    def _check_owasp_compliance(headers: dict) -> dict:
        """Check OWASP Top 10 compliance"""
        owasp_headers = {
            'Content-Security-Policy': 'A03:2021 - Injection',
            'X-Frame-Options': 'A04:2021 - Insecure Design',
            'Strict-Transport-Security': 'A02:2021 - Cryptographic Failures',
        }
        
        protected_against = []
        vulnerable_to = []
        
        for header, owasp_category in owasp_headers.items():
            if header in headers:
                protected_against.append(owasp_category)
            else:
                vulnerable_to.append(owasp_category)
        
        return {
            'protected_against': protected_against,
            'potentially_vulnerable_to': vulnerable_to
        }