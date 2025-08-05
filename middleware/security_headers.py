#!/usr/bin/env python3
"""
Comprehensive Security Headers Middleware for 6FB AI Agent System
Implements industry-standard security headers for protection against common web vulnerabilities.
"""

import os
import logging
from typing import Dict, List, Optional
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import time

logger = logging.getLogger(__name__)

class SecurityHeadersConfig:
    """Security headers configuration with environment-aware settings"""
    
    def __init__(self, environment: str = "development"):
        self.environment = environment
        self.is_production = environment.lower() == "production"
        self.is_development = environment.lower() == "development"
    
    def get_content_security_policy(self, request: Request) -> str:
        """Generate Content Security Policy based on environment"""
        
        if self.is_development:
            # More permissive CSP for development
            return (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://cdn.jsdelivr.net https://unpkg.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com "
                "https://*.supabase.co https://api.stripe.com https://us.i.posthog.com wss://realtime.supabase.co; "
                "media-src 'self' blob: data:; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'none'; "
                "upgrade-insecure-requests"
            )
        else:
            # Strict CSP for production
            return (
                "default-src 'self'; "
                "script-src 'self' https://vercel.live; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self' https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com "
                "https://*.supabase.co https://api.stripe.com https://us.i.posthog.com wss://realtime.supabase.co; "
                "media-src 'self'; "
                "object-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "frame-ancestors 'none'; "
                "upgrade-insecure-requests"
            )
    
    def get_permissions_policy(self) -> str:
        """Generate Permissions Policy (Feature Policy)"""
        
        return (
            "accelerometer=(), "
            "ambient-light-sensor=(), "
            "autoplay=(), "
            "battery=(), "
            "camera=(), "
            "cross-origin-isolated=(), "
            "display-capture=(), "
            "document-domain=(), "
            "encrypted-media=(), "
            "execution-while-not-rendered=(), "
            "execution-while-out-of-viewport=(), "
            "fullscreen=(self), "
            "geolocation=(), "
            "gyroscope=(), "
            "keyboard-map=(), "
            "magnetometer=(), "
            "microphone=(), "
            "midi=(), "
            "navigation-override=(), "
            "payment=(self), "
            "picture-in-picture=(), "
            "publickey-credentials-get=(), "
            "screen-wake-lock=(), "
            "sync-xhr=(), "
            "usb=(), "
            "web-share=(), "
            "xr-spatial-tracking=()"
        )
    
    def get_referrer_policy(self) -> str:
        """Get referrer policy based on environment"""
        
        if self.is_production:
            return "strict-origin-when-cross-origin"
        else:
            return "strict-origin-when-cross-origin"

class SecurityHeadersMiddleware:
    """
    Comprehensive security headers middleware
    
    Implements:
    - Content Security Policy (CSP)
    - HTTP Strict Transport Security (HSTS)
    - X-Frame-Options
    - X-Content-Type-Options
    - X-XSS-Protection
    - Referrer-Policy
    - Permissions-Policy
    - Cross-Origin-Embedder-Policy (COEP)
    - Cross-Origin-Opener-Policy (COOP)
    - Cross-Origin-Resource-Policy (CORP)
    """
    
    def __init__(self, 
                 app,
                 environment: str = None,
                 custom_csp: str = None,
                 enable_hsts: bool = True,
                 hsts_max_age: int = 31536000,  # 1 year
                 enable_preload: bool = True):
        
        self.app = app
        self.environment = environment or os.getenv('NODE_ENV', 'development')
        self.config = SecurityHeadersConfig(self.environment)
        self.custom_csp = custom_csp
        self.enable_hsts = enable_hsts
        self.hsts_max_age = hsts_max_age
        self.enable_preload = enable_preload
        
        # Paths that should skip certain security headers
        self.skip_csp_paths = {
            '/api/health',
            '/api/metrics',
            '/favicon.ico',
            '/robots.txt'
        }
        
        # API-only paths that need different headers
        self.api_paths = {
            '/api/',
            '/auth/',
            '/webhook/'
        }
    
    def _is_api_request(self, path: str) -> bool:
        """Check if request is for API endpoint"""
        return any(path.startswith(api_path) for api_path in self.api_paths)
    
    def _should_skip_csp(self, path: str) -> bool:
        """Check if CSP should be skipped for this path"""
        return path in self.skip_csp_paths
    
    def _get_security_headers(self, request: Request) -> Dict[str, str]:
        """Generate security headers for request"""
        
        headers = {}
        path = request.url.path
        is_api = self._is_api_request(path)
        is_secure = request.url.scheme == 'https'
        
        # Content Security Policy
        if not self._should_skip_csp(path):
            if self.custom_csp:
                headers['Content-Security-Policy'] = self.custom_csp
            else:
                headers['Content-Security-Policy'] = self.config.get_content_security_policy(request)
        
        # HTTP Strict Transport Security (HTTPS only)
        if self.enable_hsts and (is_secure or self.config.is_production):
            hsts_value = f"max-age={self.hsts_max_age}; includeSubDomains"
            if self.enable_preload:
                hsts_value += "; preload"
            headers['Strict-Transport-Security'] = hsts_value
        
        # X-Frame-Options - prevent clickjacking
        if is_api:
            headers['X-Frame-Options'] = 'DENY'
        else:
            headers['X-Frame-Options'] = 'SAMEORIGIN'
        
        # X-Content-Type-Options - prevent MIME sniffing
        headers['X-Content-Type-Options'] = 'nosniff'
        
        # X-XSS-Protection - legacy XSS protection
        headers['X-XSS-Protection'] = '1; mode=block'
        
        # Referrer Policy
        headers['Referrer-Policy'] = self.config.get_referrer_policy()
        
        # Permissions Policy (Feature Policy)
        headers['Permissions-Policy'] = self.config.get_permissions_policy()
        
        # Cross-Origin Policies
        if is_api:
            # API endpoints - strict cross-origin policies
            headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
            headers['Cross-Origin-Opener-Policy'] = 'same-origin'
            headers['Cross-Origin-Resource-Policy'] = 'same-origin'
        else:
            # Web pages - more permissive for embedded content
            headers['Cross-Origin-Embedder-Policy'] = 'unsafe-none'
            headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
            headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
        
        # Security-related cache headers
        if is_api and 'auth' in path:
            # Prevent caching of authentication endpoints
            headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
            headers['Pragma'] = 'no-cache'
            headers['Expires'] = '0'
        
        # Server information disclosure prevention
        headers['Server'] = 'nginx'  # Generic server header
        
        # Additional security headers for production
        if self.config.is_production:
            # Expect-CT for certificate transparency
            headers['Expect-CT'] = 'max-age=86400, enforce'
            
            # NEL (Network Error Logging) for monitoring
            headers['NEL'] = '{"report_to":"default","max_age":31536000,"include_subdomains":true}'
            
            # Report-To for security reporting
            headers['Report-To'] = ('{"group":"default","max_age":31536000,"endpoints":'
                                  '[{"url":"https://your-domain.com/api/security-reports"}],'
                                  '"include_subdomains":true}')
        
        return headers
    
    async def __call__(self, request: Request, call_next):
        """Process request and add security headers to response"""
        
        try:
            # Process the request
            response = await call_next(request)
            
            # Get security headers for this request
            security_headers = self._get_security_headers(request)
            
            # Add security headers to response
            for header_name, header_value in security_headers.items():
                response.headers[header_name] = header_value
            
            # Add security timing headers for monitoring
            if hasattr(request.state, 'start_time'):
                process_time = time.time() - request.state.start_time
                response.headers['X-Process-Time'] = str(round(process_time, 4))
            
            # Add custom security headers for API responses
            if self._is_api_request(request.url.path):
                response.headers['X-API-Version'] = '2.0.0'
                response.headers['X-Powered-By'] = '6FB-AI-System'
            
            return response
            
        except Exception as e:
            logger.error(f"Security headers middleware error: {e}")
            # Don't block requests if security headers fail
            response = await call_next(request)
            
            # Add minimal security headers even on error
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-Content-Type-Options'] = 'nosniff'
            
            return response

class SecurityReportingMiddleware:
    """
    Middleware for handling Content Security Policy violation reports
    and other security-related reports
    """
    
    def __init__(self, app, report_endpoint: str = '/api/security-reports'):
        self.app = app
        self.report_endpoint = report_endpoint
    
    async def __call__(self, request: Request, call_next):
        """Handle security reports"""
        
        # Check if this is a security report
        if (request.url.path == self.report_endpoint and 
            request.method == 'POST'):
            
            try:
                # Log security violation report
                report_data = await request.json()
                logger.warning(f"Security violation report: {report_data}")
                
                # Process specific types of reports
                if 'csp-report' in report_data:
                    await self._handle_csp_report(report_data['csp-report'])
                elif 'nel' in report_data:
                    await self._handle_nel_report(report_data)
                
                return JSONResponse(
                    status_code=204,
                    content={"status": "report received"}
                )
                
            except Exception as e:
                logger.error(f"Security report processing error: {e}")
                return JSONResponse(
                    status_code=400,
                    content={"error": "Invalid report format"}
                )
        
        return await call_next(request)
    
    async def _handle_csp_report(self, csp_report: Dict):
        """Handle Content Security Policy violation reports"""
        
        blocked_uri = csp_report.get('blocked-uri', 'unknown')
        violated_directive = csp_report.get('violated-directive', 'unknown')
        source_file = csp_report.get('source-file', 'unknown')
        
        logger.warning(
            f"CSP Violation: {violated_directive} blocked {blocked_uri} "
            f"from {source_file}"
        )
        
        # Here you could:
        # 1. Send alerts for repeated violations
        # 2. Update CSP policy if legitimate content is blocked
        # 3. Track violation trends for security monitoring
    
    async def _handle_nel_report(self, nel_report: Dict):
        """Handle Network Error Logging reports"""
        
        logger.info(f"Network Error Report: {nel_report}")
        
        # Process network errors for monitoring
        # Could integrate with monitoring systems like Sentry or DataDog

# Utility functions for custom security header management

def add_security_headers_to_response(response: Response, environment: str = "production") -> Response:
    """
    Add security headers to a specific response
    Useful for custom endpoints that need specific security headers
    """
    
    config = SecurityHeadersConfig(environment)
    
    # Add essential security headers
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Referrer-Policy'] = config.get_referrer_policy()
    
    return response

def create_secure_json_response(data: Dict, status_code: int = 200) -> JSONResponse:
    """
    Create a JSON response with security headers
    """
    
    response = JSONResponse(content=data, status_code=status_code)
    return add_security_headers_to_response(response)

# Export main components
__all__ = [
    'SecurityHeadersMiddleware',
    'SecurityReportingMiddleware',
    'SecurityHeadersConfig',
    'add_security_headers_to_response',
    'create_secure_json_response'
]