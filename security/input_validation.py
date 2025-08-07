#!/usr/bin/env python3
"""
Comprehensive Input Validation for 6FB AI Agent System
Centralized validation functions for all user inputs to prevent XSS, injection attacks, and data corruption.
"""

import re
import html
import bleach
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, validator, Field
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

# Security constants  
MAX_STRING_LENGTH = 1000
MAX_TEXT_LENGTH = 10000
ALLOWED_HTML_TAGS = ['b', 'i', 'u', 'em', 'strong', 'p', 'br']
PHONE_PATTERN = re.compile(r'^\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$')
SAFE_FILENAME_PATTERN = re.compile(r'^[a-zA-Z0-9._-]+$')

class ValidationError(Exception):
    """Custom validation error"""
    pass

def sanitize_string(input_str: str, max_length: int = MAX_STRING_LENGTH) -> str:
    """
    Sanitize string input to prevent XSS attacks
    """
    if not input_str:
        return ""
    
    # Limit length
    if len(input_str) > max_length:
        raise ValidationError(f"Input too long. Maximum {max_length} characters allowed.")
    
    # HTML escape
    sanitized = html.escape(input_str.strip())
    
    # Remove potentially dangerous characters
    sanitized = re.sub(r'[<>"\']', '', sanitized)
    
    return sanitized

def sanitize_html(input_html: str, max_length: int = MAX_TEXT_LENGTH) -> str:
    """
    Sanitize HTML content using bleach library
    """
    if not input_html:
        return ""
    
    if len(input_html) > max_length:
        raise ValidationError(f"HTML content too long. Maximum {max_length} characters allowed.")
    
    # Use bleach to sanitize HTML
    clean_html = bleach.clean(
        input_html,
        tags=ALLOWED_HTML_TAGS,
        attributes={},
        strip=True
    )
    
    return clean_html

def validate_email(email: str) -> str:
    """
    Enhanced email validation
    """
    if not email:
        raise ValidationError("Email is required.")
    
    email = email.strip().lower()
    
    # Basic format check
    email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    if not email_pattern.match(email):
        raise ValidationError("Invalid email format.")
    
    # Length check
    if len(email) > 254:  # RFC 5321 limit
        raise ValidationError("Email address too long.")
    
    # Dangerous patterns
    if '..' in email or email.startswith('.') or email.endswith('.'):
        raise ValidationError("Invalid email format.")
    
    return email

def validate_phone_number(phone: str) -> str:
    """
    Validate and normalize phone number
    """
    if not phone:
        return ""
    
    phone = phone.strip()
    
    if not PHONE_PATTERN.match(phone):
        raise ValidationError("Invalid phone number format. Use format: (555) 123-4567")
    
    # Normalize to digits only for storage
    digits_only = re.sub(r'[^\d]', '', phone)
    
    if len(digits_only) not in [10, 11]:  # US numbers
        raise ValidationError("Phone number must be 10 or 11 digits.")
    
    return phone

def validate_barbershop_name(name: str) -> str:
    """
    Validate barbershop/business name
    """
    if not name:
        raise ValidationError("Business name is required.")
    
    name = sanitize_string(name, 100)
    
    if len(name) < 2:
        raise ValidationError("Business name must be at least 2 characters long.")
    
    # Only allow letters, numbers, spaces, and basic punctuation
    if not re.match(r'^[a-zA-Z0-9\s\-\'\.&]+$', name):
        raise ValidationError("Business name contains invalid characters.")
    
    return name

def validate_currency_amount(amount: str) -> float:
    """
    Validate and convert currency amount
    """
    if not amount:
        raise ValidationError("Amount is required.")
    
    # Remove currency symbols and whitespace
    amount_str = re.sub(r'[$,\s]', '', str(amount))
    
    try:
        amount_float = float(amount_str)
    except ValueError:
        raise ValidationError("Invalid amount format.")
    
    if amount_float < 0:
        raise ValidationError("Amount cannot be negative.")
    
    if amount_float > 9999.99:  # Max service price
        raise ValidationError("Amount too large.")
    
    return round(amount_float, 2)

def validate_filename(filename: str) -> str:
    """
    Validate uploaded filename for security
    """
    if not filename:
        raise ValidationError("Filename is required.")
    
    filename = filename.strip()
    
    if not SAFE_FILENAME_PATTERN.match(filename):
        raise ValidationError("Filename contains invalid characters. Use only letters, numbers, dots, hyphens, and underscores.")
    
    if len(filename) > 255:
        raise ValidationError("Filename too long.")
    
    # Check for dangerous extensions
    dangerous_extensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.vbs', '.js', '.jar', '.php', '.asp']
    file_extension = '.' + filename.split('.')[-1].lower() if '.' in filename else ''
    
    if file_extension in dangerous_extensions:
        raise ValidationError(f"File type {file_extension} not allowed.")
    
    return filename

def validate_service_description(description: str) -> str:
    """
    Validate service description with HTML sanitization
    """
    if not description:
        return ""
    
    # Allow limited HTML for rich text descriptions
    sanitized = sanitize_html(description, 2000)
    
    if len(sanitized.strip()) < 10:
        raise ValidationError("Service description must be at least 10 characters long.")
    
    return sanitized

def validate_appointment_notes(notes: str) -> str:
    """
    Validate appointment notes
    """
    if not notes:
        return ""
    
    notes = sanitize_string(notes, 500)
    
    # Remove excessive whitespace
    notes = re.sub(r'\s+', ' ', notes).strip()
    
    return notes

def validate_search_query(query: str) -> str:
    """
    Validate search query to prevent SQL injection
    """
    if not query:
        raise ValidationError("Search query is required.")
    
    query = query.strip()
    
    if len(query) > 100:
        raise ValidationError("Search query too long.")
    
    # Remove SQL injection patterns
    dangerous_patterns = [
        r'union\s+select', r'drop\s+table', r'delete\s+from', 
        r'insert\s+into', r'update\s+.*set', r'exec\s*\(',
        r'script\s*>', r'javascript:', r'vbscript:', r'onload=',
        r'onerror=', r'onclick='
    ]
    
    query_lower = query.lower()
    for pattern in dangerous_patterns:
        if re.search(pattern, query_lower):
            raise ValidationError("Invalid characters in search query.")
    
    # Only allow alphanumeric, spaces, and basic punctuation
    if not re.match(r'^[a-zA-Z0-9\s\-_\.\'\"]+$', query):
        raise ValidationError("Search query contains invalid characters.")
    
    return query

def validate_json_input(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate JSON input for depth and size
    """
    if not isinstance(data, dict):
        raise ValidationError("Input must be a JSON object.")
    
    # Check JSON depth to prevent deeply nested attacks
    def check_depth(obj, current_depth=0):
        if current_depth > 10:  # Max depth of 10
            raise ValidationError("JSON structure too deeply nested.")
        
        if isinstance(obj, dict):
            for value in obj.values():
                check_depth(value, current_depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                check_depth(item, current_depth + 1)
    
    check_depth(data)
    
    # Check total size (approximate)
    import json
    json_str = json.dumps(data)
    if len(json_str) > 100000:  # 100KB limit
        raise ValidationError("JSON payload too large.")
    
    return data

# Pydantic models with comprehensive validation
class SecureUserInput(BaseModel):
    """Base model for secure user input validation"""
    
    class Config:
        # Validate on assignment
        validate_assignment = True
        # Don't allow extra fields
        extra = "forbid"

class SecureAppointmentCreate(SecureUserInput):
    """Secure appointment creation model"""
    service_name: str = Field(..., min_length=2, max_length=100)
    duration_minutes: int = Field(..., ge=15, le=480)  # 15 min to 8 hours
    price: float = Field(..., ge=0, le=9999.99)
    notes: Optional[str] = Field(None, max_length=500)
    
    @validator('service_name')
    def validate_service_name(cls, v):
        return validate_barbershop_name(v)
    
    @validator('notes')
    def validate_notes_field(cls, v):
        return validate_appointment_notes(v) if v else ""

class SecureUserProfile(SecureUserInput):
    """Secure user profile model"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: str = Field(..., max_length=254)
    phone: Optional[str] = Field(None, max_length=20)
    business_name: Optional[str] = Field(None, max_length=100)
    
    @validator('full_name')
    def validate_name(cls, v):
        return sanitize_string(v, 100)
    
    @validator('email')
    def validate_email_field(cls, v):
        return validate_email(v)
    
    @validator('phone')
    def validate_phone_field(cls, v):
        return validate_phone_number(v) if v else None
    
    @validator('business_name')
    def validate_business_name_field(cls, v):
        return validate_barbershop_name(v) if v else None

class SecureSearchRequest(SecureUserInput):
    """Secure search request model"""
    query: str = Field(..., min_length=1, max_length=100)
    filters: Optional[Dict[str, Any]] = Field(None)
    limit: Optional[int] = Field(10, ge=1, le=100)
    
    @validator('query')
    def validate_search_query_field(cls, v):
        return validate_search_query(v)
    
    @validator('filters')
    def validate_filters_field(cls, v):
        if v is None:
            return {}
        return validate_json_input(v)

# Request validation middleware
def validate_request_size(content_length: Optional[int] = None):
    """Validate request size to prevent DoS attacks"""
    if content_length and content_length > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Request payload too large"
        )

def sanitize_request_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitize all string values in request data
    """
    sanitized = {}
    
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = sanitize_string(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_request_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_string(item) if isinstance(item, str) 
                else sanitize_request_data(item) if isinstance(item, dict)
                else item
                for item in value
            ]
        else:
            sanitized[key] = value
    
    return sanitized

# Rate limiting helpers
class RateLimitTracker:
    """Track API usage for rate limiting"""
    
    def __init__(self):
        self.requests = {}  # IP -> [(timestamp, endpoint), ...]
    
    def is_rate_limited(self, ip: str, endpoint: str, limit: int = 100, window: int = 3600) -> bool:
        """
        Check if IP is rate limited for endpoint
        limit: requests per window
        window: time window in seconds
        """
        import time
        now = time.time()
        
        if ip not in self.requests:
            self.requests[ip] = []
        
        # Clean old requests
        self.requests[ip] = [
            (timestamp, ep) for timestamp, ep in self.requests[ip]
            if now - timestamp < window
        ]
        
        # Count requests for this endpoint
        endpoint_requests = [
            req for req in self.requests[ip]
            if req[1] == endpoint
        ]
        
        if len(endpoint_requests) >= limit:
            logger.warning(f"Rate limit exceeded for IP {ip} on endpoint {endpoint}")
            return True
        
        # Add current request
        self.requests[ip].append((now, endpoint))
        return False

# Global rate limiter instance
rate_limiter = RateLimitTracker()

def check_rate_limit(ip: str, endpoint: str):
    """Middleware function to check rate limits"""
    if rate_limiter.is_rate_limited(ip, endpoint):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later."
        )