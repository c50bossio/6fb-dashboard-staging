"""
Sentry configuration for FastAPI backend
"""
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging
import os

def init_sentry(app=None):
    """Initialize Sentry for the FastAPI backend"""
    
    sentry_dsn = os.getenv("SENTRY_DSN") or os.getenv("NEXT_PUBLIC_SENTRY_DSN")
    
    if not sentry_dsn:
        logging.warning("Sentry DSN not found - error tracking disabled")
        return
    
    # Configure logging integration
    logging_integration = LoggingIntegration(
        level=logging.INFO,  # Capture info and above as breadcrumbs
        event_level=logging.ERROR  # Send errors as events
    )
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            FastApiIntegration(
                transaction_style="endpoint",
                failed_request_status_codes={400, 401, 403, 404, 422, 500, 502, 503}
            ),
            SqlalchemyIntegration(),
            logging_integration,
        ],
        
        # Performance monitoring
        traces_sample_rate=0.1 if os.getenv("ENVIRONMENT") == "production" else 1.0,
        profiles_sample_rate=1.0,
        
        # Environment
        environment=os.getenv("ENVIRONMENT", "development"),
        
        # Release tracking
        release=os.getenv("APP_VERSION", "1.0.0"),
        
        # Filter sensitive data
        before_send=before_send_filter,
        
        # Attach additional context
        attach_stacktrace=True,
        send_default_pii=False,  # Don't send personally identifiable information
        
        # Debug mode
        debug=os.getenv("SENTRY_DEBUG", "false").lower() == "true",
    )
    
    # Set app context if provided
    if app:
        with sentry_sdk.configure_scope() as scope:
            scope.set_context("app", {
                "name": "6FB AI Agent System",
                "type": "fastapi",
                "version": os.getenv("APP_VERSION", "1.0.0")
            })
    
    logging.info("✅ Sentry initialized for Python backend")

def before_send_filter(event, hint):
    """Filter events before sending to Sentry"""
    
    # Don't send events in development unless explicitly enabled
    if os.getenv("ENVIRONMENT") == "development" and not os.getenv("SENTRY_ENABLE_DEV"):
        return None
    
    # Filter out specific exceptions
    if 'exc_info' in hint:
        exc_type, exc_value, tb = hint['exc_info']
        
        # Ignore client disconnections
        if exc_type.__name__ in ['ConnectionError', 'BrokenPipeError']:
            return None
        
        # Ignore specific HTTP exceptions
        if hasattr(exc_value, 'status_code'):
            if exc_value.status_code in [404, 401]:
                return None
    
    # Remove sensitive data from request
    if 'request' in event and event['request']:
        if 'data' in event['request']:
            # Remove password fields
            for field in ['password', 'token', 'secret', 'api_key']:
                if field in event['request']['data']:
                    event['request']['data'][field] = '[FILTERED]'
        
        # Remove authorization headers
        if 'headers' in event['request']:
            headers = event['request']['headers']
            for header in ['authorization', 'x-api-key', 'cookie']:
                if header in headers:
                    headers[header] = '[FILTERED]'
    
    return event

def capture_exception(error, context=None, user=None):
    """Capture exception with additional context"""
    with sentry_sdk.push_scope() as scope:
        # Add custom context
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        
        # Add user context
        if user:
            scope.set_user({
                "id": str(user.get('id')),
                "email": user.get('email'),
                "username": user.get('barbershop_name')
            })
        
        # Capture the exception
        sentry_sdk.capture_exception(error)

def capture_message(message, level='info', context=None):
    """Capture a message with context"""
    with sentry_sdk.push_scope() as scope:
        # Add custom context
        if context:
            for key, value in context.items():
                scope.set_context(key, value)
        
        # Capture the message
        sentry_sdk.capture_message(message, level=level)

def add_breadcrumb(message, category=None, level='info', data=None):
    """Add a breadcrumb for debugging"""
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data or {}
    )

def set_user_context(user):
    """Set user context for all subsequent events"""
    if user:
        sentry_sdk.set_user({
            "id": str(user.get('id')),
            "email": user.get('email'),
            "username": user.get('barbershop_name', user.get('full_name'))
        })
    else:
        sentry_sdk.set_user(None)

def measure_performance(transaction_name):
    """Context manager for performance monitoring"""
    return sentry_sdk.start_transaction(
        op="function",
        name=transaction_name
    )