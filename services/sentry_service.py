#!/usr/bin/env python3
"""
Sentry Error Monitoring Service for 6FB AI Agent System
Production-grade error tracking and performance monitoring for FastAPI backend
"""

import os
import logging
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class SentryService:
    """
    Production-grade Sentry integration for FastAPI backend
    Addresses critical error monitoring gaps identified in production readiness report
    """
    
    def __init__(self):
        self.initialized = False
        self.dsn = os.getenv('SENTRY_DSN') or os.getenv('NEXT_PUBLIC_SENTRY_DSN')
        self.environment = os.getenv('NODE_ENV', 'development')
        self.release = os.getenv('APP_VERSION', 'unknown')
        self.server_name = os.getenv('SERVER_NAME', 'fastapi-backend')
        
    def initialize(self, app=None):
        """Initialize Sentry with production-grade configuration"""
        if self.initialized:
            logger.info("Sentry already initialized")
            return
        
        if not self.dsn:
            logger.warning("⚠️ Sentry DSN not configured - error tracking disabled")
            return
        
        try:
            # Configure logging integration
            logging_integration = LoggingIntegration(
                level=logging.INFO,  # Capture info and above
                event_level=logging.ERROR  # Send errors as events
            )
            
            # Initialize Sentry
            sentry_sdk.init(
                dsn=self.dsn,
                environment=self.environment,
                release=self.release,
                server_name=self.server_name,
                
                # Integrations
                integrations=[
                    FastApiIntegration(
                        transaction_style="endpoint",
                        failed_request_status_codes=[400, 401, 403, 404, 405, 500, 502, 503, 504]
                    ),
                    StarletteIntegration(
                        transaction_style="endpoint"
                    ),
                    logging_integration,
                    SqlalchemyIntegration(),
                ],
                
                # Performance monitoring
                traces_sample_rate=0.1 if self.environment == 'production' else 1.0,
                profiles_sample_rate=0.1 if self.environment == 'production' else 1.0,
                
                # Session tracking
                release_health=True,
                
                # Error filtering
                before_send=self._before_send,
                before_send_transaction=self._before_send_transaction,
                
                # Additional options
                attach_stacktrace=True,
                send_default_pii=False,  # Don't send personally identifiable information
                max_breadcrumbs=50,
                debug=self.environment == 'development',
                
                # OAuth callback monitoring
                # Track OAuth performance issues specifically
                traces_sampler=self._traces_sampler,
            )
            
            self.initialized = True
            logger.info(f"✅ Sentry initialized for {self.environment} environment")
            
            # Set initial context
            self._set_initial_context()
            
            # Test Sentry connection
            if self.environment == 'development':
                logger.info("🧪 Testing Sentry connection...")
                sentry_sdk.capture_message("Sentry initialized successfully", level="info")
                
        except Exception as e:
            logger.error(f"❌ Failed to initialize Sentry: {e}")
            self.initialized = False
    
    def _before_send(self, event, hint):
        """Filter and enrich error events before sending to Sentry"""
        # Don't send events in development unless explicitly enabled
        if self.environment == 'development' and not os.getenv('SENTRY_ENABLE_DEV'):
            return None
        
        # Filter out specific errors
        if 'exc_info' in hint:
            exc_type, exc_value, tb = hint['exc_info']
            
            # Ignore specific error types
            ignored_errors = [
                'CancelledError',
                'ConnectionResetError',
                'BrokenPipeError',
            ]
            
            if exc_type.__name__ in ignored_errors:
                return None
            
            # Add OAuth context for authentication errors
            if 'oauth' in str(exc_value).lower() or 'auth' in str(exc_value).lower():
                event['tags'] = event.get('tags', {})
                event['tags']['category'] = 'authentication'
                event['tags']['oauth_error'] = True
                
                # Add memory context for OAuth errors
                try:
                    from services.memory_manager import get_memory_stats
                    memory_stats = get_memory_stats()
                    event['contexts'] = event.get('contexts', {})
                    event['contexts']['memory'] = {
                        'pressure': memory_stats.memory_pressure,
                        'process_memory_mb': memory_stats.process_memory,
                        'status': 'critical' if memory_stats.memory_pressure > 0.9 else 'normal'
                    }
                except:
                    pass
        
        # Sanitize sensitive data
        event = self._sanitize_event(event)
        
        return event
    
    def _before_send_transaction(self, event, hint):
        """Filter and enrich transaction events (performance monitoring)"""
        # Add performance context
        transaction = event.get('transaction')
        
        if transaction:
            # Track OAuth callback performance specifically
            if 'oauth' in transaction.lower() or 'callback' in transaction.lower():
                event['tags'] = event.get('tags', {})
                event['tags']['transaction_type'] = 'oauth_callback'
                
                # Flag slow OAuth callbacks
                duration = event.get('timestamp', 0) - event.get('start_timestamp', 0)
                if duration > 3.0:  # 3 seconds threshold
                    event['tags']['slow_oauth'] = True
        
        return event
    
    def _traces_sampler(self, sampling_context):
        """Custom sampling for performance monitoring"""
        transaction_context = sampling_context.get("transaction_context", {})
        transaction_name = transaction_context.get("name", "")
        
        # Always sample OAuth and authentication transactions
        if any(keyword in transaction_name.lower() for keyword in ['oauth', 'auth', 'callback', 'login', 'signup']):
            return 1.0  # 100% sampling for auth flows
        
        # Higher sampling for critical endpoints
        if any(keyword in transaction_name.lower() for keyword in ['payment', 'booking', 'health']):
            return 0.5  # 50% sampling for critical endpoints
        
        # Default sampling rate
        return 0.1 if self.environment == 'production' else 1.0
    
    def _sanitize_event(self, event):
        """Remove sensitive data from events"""
        sensitive_fields = [
            'password', 'token', 'api_key', 'secret', 
            'credit_card', 'ssn', 'authorization', 'cookie'
        ]
        
        # Sanitize request data
        if 'request' in event and 'data' in event['request']:
            for field in sensitive_fields:
                if field in event['request']['data']:
                    event['request']['data'][field] = '[REDACTED]'
        
        # Sanitize extra context
        if 'extra' in event:
            for field in sensitive_fields:
                if field in event['extra']:
                    event['extra'][field] = '[REDACTED]'
        
        # Sanitize headers
        if 'request' in event and 'headers' in event['request']:
            headers = event['request']['headers']
            for header in ['authorization', 'cookie', 'x-api-key']:
                if header in headers:
                    headers[header] = '[REDACTED]'
        
        return event
    
    def _set_initial_context(self):
        """Set initial Sentry context"""
        # Set app context
        sentry_sdk.set_context("app", {
            "app_name": "6FB AI Agent System",
            "backend": "FastAPI",
            "version": self.release,
            "environment": self.environment
        })
        
        # Set server context
        sentry_sdk.set_context("server", {
            "name": self.server_name,
            "runtime": f"Python {os.sys.version}",
            "pid": os.getpid()
        })
    
    def capture_exception(self, exception, context: Optional[Dict[str, Any]] = None):
        """Capture an exception with additional context"""
        if not self.initialized:
            logger.error(f"Sentry not initialized, logging locally: {exception}")
            return None
        
        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_extra(key, value)
            
            # Add memory context for critical errors
            if self._is_critical_error(exception):
                try:
                    from services.memory_manager import get_memory_stats
                    memory_stats = get_memory_stats()
                    scope.set_context("memory", {
                        "pressure": memory_stats.memory_pressure,
                        "process_memory_mb": memory_stats.process_memory,
                        "available_gb": memory_stats.available_memory
                    })
                except:
                    pass
            
            return sentry_sdk.capture_exception(exception)
    
    def capture_message(self, message: str, level: str = "info", context: Optional[Dict[str, Any]] = None):
        """Capture a message with additional context"""
        if not self.initialized:
            logger.log(getattr(logging, level.upper()), f"Sentry not initialized: {message}")
            return None
        
        with sentry_sdk.push_scope() as scope:
            if context:
                for key, value in context.items():
                    scope.set_extra(key, value)
            
            return sentry_sdk.capture_message(message, level=level)
    
    def set_user(self, user_id: str, email: Optional[str] = None, username: Optional[str] = None):
        """Set user context for error tracking"""
        if not self.initialized:
            return
        
        sentry_sdk.set_user({
            "id": user_id,
            "email": email,
            "username": username
        })
    
    def set_tag(self, key: str, value: str):
        """Set a tag for categorizing errors"""
        if not self.initialized:
            return
        
        sentry_sdk.set_tag(key, value)
    
    def add_breadcrumb(self, message: str, category: str = "custom", level: str = "info", data: Optional[Dict] = None):
        """Add a breadcrumb for error context"""
        if not self.initialized:
            return
        
        sentry_sdk.add_breadcrumb(
            message=message,
            category=category,
            level=level,
            data=data or {},
            timestamp=datetime.now()
        )
    
    def _is_critical_error(self, exception):
        """Check if an error is critical"""
        critical_keywords = [
            'memory', 'oauth', 'authentication', 'database',
            'payment', 'security', 'critical', 'fatal'
        ]
        
        error_str = str(exception).lower()
        return any(keyword in error_str for keyword in critical_keywords)
    
    def start_transaction(self, name: str, op: str = "http.server"):
        """Start a performance monitoring transaction"""
        if not self.initialized:
            return None
        
        return sentry_sdk.start_transaction(name=name, op=op)
    
    def flush(self, timeout: int = 2):
        """Flush pending events to Sentry"""
        if not self.initialized:
            return
        
        sentry_sdk.flush(timeout=timeout)
    
    def test_sentry(self):
        """Test Sentry integration"""
        if not self.initialized:
            logger.warning("Sentry not initialized - cannot test")
            return False
        
        try:
            # Test message
            self.capture_message("Sentry test message", level="info", context={
                "test": True,
                "timestamp": datetime.now().isoformat()
            })
            
            # Test exception
            try:
                1 / 0
            except ZeroDivisionError as e:
                self.capture_exception(e, context={"test": True})
            
            logger.info("✅ Sentry test completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Sentry test failed: {e}")
            return False

# Global Sentry service instance
sentry_service = SentryService()

# Helper functions for easy access
def initialize_sentry(app=None):
    """Initialize Sentry service"""
    sentry_service.initialize(app)

def capture_exception(exception, context=None):
    """Capture an exception"""
    return sentry_service.capture_exception(exception, context)

def capture_message(message, level="info", context=None):
    """Capture a message"""
    return sentry_service.capture_message(message, level, context)

def set_user(user_id, email=None, username=None):
    """Set user context"""
    sentry_service.set_user(user_id, email, username)

def add_breadcrumb(message, category="custom", level="info", data=None):
    """Add breadcrumb"""
    sentry_service.add_breadcrumb(message, category, level, data)

def test_sentry():
    """Test Sentry integration"""
    return sentry_service.test_sentry()