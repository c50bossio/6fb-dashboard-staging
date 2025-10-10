#!/usr/bin/env python3
"""
Comprehensive Input Validation and Sanitization System
for 6FB AI Agent Booking System - Security Specialist Implementation

This module provides enterprise-level input validation, sanitization, and XSS protection
with specialized handling for booking forms, payment data, and user inputs.
"""

import re
import html
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date, time
from decimal import Decimal, InvalidOperation
from email_validator import validate_email, EmailNotValidError
from urllib.parse import urlparse
import phonenumbers
from phonenumbers import NumberParseException
import bleach
from bleach.css_sanitizer import CSSSanitizer
import validators
from pydantic import BaseModel, ValidationError
import hashlib

logger = logging.getLogger(__name__)

class ValidationResult:
    """Results of input validation with sanitized data and security metadata"""
    def __init__(self, is_valid: bool, sanitized_value: Any = None, 
                 errors: List[str] = None, security_flags: List[str] = None):
        self.is_valid = is_valid
        self.sanitized_value = sanitized_value
        self.errors = errors or []
        self.security_flags = security_flags or []
        self.timestamp = datetime.utcnow()

class SecurityConfig:
    """Security configuration for input validation"""
    
    # XSS Prevention
    ALLOWED_HTML_TAGS = [
        'p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h3', 'h4', 'h5', 'h6'
    ]
    ALLOWED_HTML_ATTRIBUTES = {
        '*': ['class'],
        'a': ['href', 'title'],
    }
    
    # SQL Injection Patterns
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b|\bEXEC\b)",
        r"(--|#|/\*|\*/)",
        r"(\bxp_|\bsp_)\w+",
        r"'(\s*;\s*|\s*\|\s*|\s*&\s*)",
        r"\b(SELECT|UNION|INSERT|UPDATE|DELETE)\b.*\b(FROM|WHERE|ORDER|GROUP)\b",
    ]
    
    # NoSQL Injection Patterns
    NOSQL_INJECTION_PATTERNS = [
        r"\$where",
        r"\$eval",
        r"\$regex",
        r"\$ne",
        r"\$gt",
        r"\$lt",
    ]
    
    # Script and Event Handler Patterns
    SCRIPT_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"vbscript:",
        r"on\w+\s*=",
        r"data:text/html",
        r"eval\s*\(",
        r"expression\s*\(",
    ]
    
    # Booking-specific patterns
    SUSPICIOUS_BOOKING_PATTERNS = [
        r"(\btest\b|\bdummy\b|\bfake\b).*booking",
        r"(script|alert|prompt|confirm)\s*\(",
        r"<.*?>.*<\/.*?>",
    ]

class ComprehensiveInputValidator:
    """
    Enterprise-level input validation and sanitization system
    with specialized handlers for booking system data
    """
    
    def __init__(self, config: SecurityConfig = None):
        self.config = config or SecurityConfig()
        self.bleach_cleaner = bleach.Cleaner(
            tags=self.config.ALLOWED_HTML_TAGS,
            attributes=self.config.ALLOWED_HTML_ATTRIBUTES,
            css_sanitizer=CSSSanitizer(allowed_css_properties=[]),
            strip=True
        )
        
        # Compile regex patterns for performance
        self.compiled_patterns = {
            'sql_injection': [re.compile(pattern, re.IGNORECASE) for pattern in self.config.SQL_INJECTION_PATTERNS],
            'nosql_injection': [re.compile(pattern, re.IGNORECASE) for pattern in self.config.NOSQL_INJECTION_PATTERNS],
            'script_patterns': [re.compile(pattern, re.IGNORECASE | re.DOTALL) for pattern in self.config.SCRIPT_PATTERNS],
            'booking_suspicious': [re.compile(pattern, re.IGNORECASE) for pattern in self.config.SUSPICIOUS_BOOKING_PATTERNS],
        }
        
        logger.info("ComprehensiveInputValidator initialized with security patterns")

    def sanitize_string(self, value: str, max_length: int = None, 
                       allow_html: bool = False, booking_context: bool = False) -> ValidationResult:
        """
        Comprehensive string sanitization with XSS protection
        
        Args:
            value: Input string to sanitize
            max_length: Maximum allowed length
            allow_html: Whether to allow safe HTML tags
            booking_context: Apply booking-specific validation
        """
        if not isinstance(value, str):
            return ValidationResult(False, None, ["Input must be a string"])
        
        security_flags = []
        errors = []
        
        # Length validation
        if max_length and len(value) > max_length:
            errors.append(f"Input exceeds maximum length of {max_length}")
            value = value[:max_length]
            security_flags.append("length_truncated")
        
        # Check for malicious patterns
        self._detect_malicious_patterns(value, security_flags)
        
        # HTML sanitization
        if allow_html:
            sanitized = self.bleach_cleaner.clean(value)
        else:
            sanitized = html.escape(value, quote=True)
        
        # Booking-specific validation
        if booking_context:
            self._validate_booking_context(sanitized, security_flags, errors)
        
        # Additional encoding for dangerous characters
        sanitized = self._encode_dangerous_chars(sanitized)
        
        # Final security check
        if sanitized != value and not allow_html:
            security_flags.append("content_sanitized")
        
        is_valid = len(errors) == 0
        
        if security_flags:
            logger.warning(f"Security flags detected: {security_flags}")
        
        return ValidationResult(is_valid, sanitized, errors, security_flags)

    def validate_email(self, email: str) -> ValidationResult:
        """Validate and sanitize email addresses"""
        try:
            # Basic string sanitization first
            result = self.sanitize_string(email, max_length=254)
            if not result.is_valid:
                return result
            
            # Email validation
            validated = validate_email(result.sanitized_value)
            sanitized_email = validated.email
            
            # Additional security checks for email
            security_flags = result.security_flags.copy()
            if self._has_suspicious_email_patterns(sanitized_email):
                security_flags.append("suspicious_email_pattern")
            
            return ValidationResult(True, sanitized_email, [], security_flags)
            
        except EmailNotValidError as e:
            return ValidationResult(False, None, [f"Invalid email format: {str(e)}"])

    def validate_phone(self, phone: str, region: str = "US") -> ValidationResult:
        """Validate and format phone numbers"""
        try:
            result = self.sanitize_string(phone, max_length=20)
            if not result.is_valid:
                return result
            
            parsed = phonenumbers.parse(result.sanitized_value, region)
            
            if not phonenumbers.is_valid_number(parsed):
                return ValidationResult(False, None, ["Invalid phone number"])
            
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            
            return ValidationResult(True, formatted, [], result.security_flags)
            
        except NumberParseException as e:
            return ValidationResult(False, None, [f"Phone parsing error: {str(e)}"])

    def validate_booking_data(self, booking_data: Dict[str, Any]) -> ValidationResult:
        """
        Comprehensive validation for booking form data
        with PCI compliance considerations
        """
        sanitized_data = {}
        all_errors = []
        all_security_flags = []
        
        # Define booking field validations
        field_validations = {
            'customer_name': {
                'required': True,
                'max_length': 100,
                'booking_context': True
            },
            'email': {
                'required': True,
                'validator': 'email'
            },
            'phone': {
                'required': True,
                'validator': 'phone'
            },
            'service_name': {
                'required': True,
                'max_length': 200,
                'booking_context': True
            },
            'appointment_date': {
                'required': True,
                'validator': 'date'
            },
            'appointment_time': {
                'required': True,
                'validator': 'time'
            },
            'notes': {
                'required': False,
                'max_length': 1000,
                'allow_html': False,
                'booking_context': True
            },
            'special_requests': {
                'required': False,
                'max_length': 500,
                'booking_context': True
            }
        }
        
        for field, config in field_validations.items():
            value = booking_data.get(field)
            
            # Required field check
            if config.get('required', False) and not value:
                all_errors.append(f"Field '{field}' is required")
                continue
            
            if not value:  # Skip validation for empty optional fields
                sanitized_data[field] = None
                continue
            
            # Apply appropriate validator
            if config.get('validator') == 'email':
                result = self.validate_email(value)
            elif config.get('validator') == 'phone':
                result = self.validate_phone(value)
            elif config.get('validator') == 'date':
                result = self.validate_date(value)
            elif config.get('validator') == 'time':
                result = self.validate_time(value)
            else:
                # String validation
                result = self.sanitize_string(
                    value,
                    max_length=config.get('max_length'),
                    allow_html=config.get('allow_html', False),
                    booking_context=config.get('booking_context', False)
                )
            
            if result.is_valid:
                sanitized_data[field] = result.sanitized_value
            else:
                all_errors.extend([f"{field}: {error}" for error in result.errors])
            
            all_security_flags.extend(result.security_flags)
        
        is_valid = len(all_errors) == 0
        
        # Additional booking-specific security checks
        if is_valid:
            self._validate_booking_integrity(sanitized_data, all_security_flags, all_errors)
        
        return ValidationResult(is_valid, sanitized_data, all_errors, all_security_flags)

    def validate_payment_data(self, payment_data: Dict[str, Any]) -> ValidationResult:
        """
        PCI-compliant validation for payment form data
        Note: Never store actual card data - this validates structure only
        """
        sanitized_data = {}
        all_errors = []
        all_security_flags = []
        
        # Payment validation (structure only for PCI compliance)
        field_validations = {
            'cardholder_name': {
                'required': True,
                'max_length': 100,
                'pattern': r'^[A-Za-z\s\-\.]+$'
            },
            'billing_address_line1': {
                'required': True,
                'max_length': 100
            },
            'billing_city': {
                'required': True,
                'max_length': 50
            },
            'billing_state': {
                'required': True,
                'max_length': 50
            },
            'billing_zip': {
                'required': True,
                'pattern': r'^\d{5}(-\d{4})?$'
            },
            'amount': {
                'required': True,
                'validator': 'currency'
            }
        }
        
        for field, config in field_validations.items():
            value = payment_data.get(field)
            
            if config.get('required', False) and not value:
                all_errors.append(f"Payment field '{field}' is required")
                continue
                
            if not value:
                sanitized_data[field] = None
                continue
            
            if config.get('validator') == 'currency':
                result = self.validate_currency_amount(value)
            else:
                result = self.sanitize_string(value, max_length=config.get('max_length'))
                
                # Pattern validation
                if result.is_valid and config.get('pattern'):
                    pattern = re.compile(config['pattern'])
                    if not pattern.match(result.sanitized_value):
                        result.is_valid = False
                        result.errors.append(f"Invalid format for {field}")
            
            if result.is_valid:
                sanitized_data[field] = result.sanitized_value
            else:
                all_errors.extend([f"{field}: {error}" for error in result.errors])
            
            all_security_flags.extend(result.security_flags)
        
        # Critical: Flag any attempt to include actual card data
        sensitive_patterns = [
            r'\b4[0-9]{12}(?:[0-9]{3})?\b',  # Visa
            r'\b5[1-5][0-9]{14}\b',         # Mastercard
            r'\b3[47][0-9]{13}\b',          # American Express
            r'\b6(?:011|5[0-9]{2})[0-9]{12}\b'  # Discover
        ]
        
        raw_data = json.dumps(payment_data, default=str)
        for pattern in sensitive_patterns:
            if re.search(pattern, raw_data):
                all_security_flags.append("CRITICAL_CARD_DATA_DETECTED")
                all_errors.append("Card data must not be transmitted - use secure tokenization")
                logger.critical("Attempted transmission of card data detected")
        
        is_valid = len(all_errors) == 0
        return ValidationResult(is_valid, sanitized_data, all_errors, all_security_flags)

    def validate_date(self, date_str: str) -> ValidationResult:
        """Validate date strings with security checks"""
        result = self.sanitize_string(date_str, max_length=20)
        if not result.is_valid:
            return result
        
        try:
            # Try multiple date formats
            formats = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']
            parsed_date = None
            
            for fmt in formats:
                try:
                    parsed_date = datetime.strptime(result.sanitized_value, fmt).date()
                    break
                except ValueError:
                    continue
            
            if not parsed_date:
                return ValidationResult(False, None, ["Invalid date format"])
            
            # Business rule: no bookings more than 1 year in future
            max_future = datetime.now().date().replace(year=datetime.now().year + 1)
            if parsed_date > max_future:
                return ValidationResult(False, None, ["Date too far in future"])
            
            # No bookings in the past (except today)
            if parsed_date < datetime.now().date():
                return ValidationResult(False, None, ["Cannot book appointments in the past"])
            
            return ValidationResult(True, parsed_date.isoformat(), [], result.security_flags)
            
        except (ValueError, OverflowError) as e:
            return ValidationResult(False, None, [f"Date validation error: {str(e)}"])

    def validate_time(self, time_str: str) -> ValidationResult:
        """Validate time strings"""
        result = self.sanitize_string(time_str, max_length=10)
        if not result.is_valid:
            return result
        
        try:
            # Try multiple time formats
            formats = ['%H:%M', '%I:%M %p', '%H:%M:%S']
            parsed_time = None
            
            for fmt in formats:
                try:
                    parsed_time = datetime.strptime(result.sanitized_value, fmt).time()
                    break
                except ValueError:
                    continue
            
            if not parsed_time:
                return ValidationResult(False, None, ["Invalid time format"])
            
            return ValidationResult(True, parsed_time.strftime('%H:%M'), [], result.security_flags)
            
        except (ValueError, OverflowError) as e:
            return ValidationResult(False, None, [f"Time validation error: {str(e)}"])

    def validate_currency_amount(self, amount: Union[str, float, Decimal]) -> ValidationResult:
        """Validate currency amounts with precision handling"""
        try:
            if isinstance(amount, str):
                # Remove currency symbols and spaces
                cleaned = re.sub(r'[$,\s]', '', amount)
                amount_decimal = Decimal(cleaned)
            else:
                amount_decimal = Decimal(str(amount))
            
            # Business rules
            if amount_decimal <= 0:
                return ValidationResult(False, None, ["Amount must be greater than zero"])
            
            if amount_decimal > Decimal('10000.00'):  # Max booking amount
                return ValidationResult(False, None, ["Amount exceeds maximum allowed"])
            
            # Ensure proper decimal places
            if amount_decimal.as_tuple().exponent < -2:
                return ValidationResult(False, None, ["Amount cannot have more than 2 decimal places"])
            
            return ValidationResult(True, float(amount_decimal), [])
            
        except (InvalidOperation, ValueError) as e:
            return ValidationResult(False, None, [f"Invalid currency amount: {str(e)}"])

    def _detect_malicious_patterns(self, value: str, security_flags: List[str]):
        """Detect malicious patterns in input"""
        for pattern_type, patterns in self.compiled_patterns.items():
            for pattern in patterns:
                if pattern.search(value):
                    security_flags.append(f"suspicious_{pattern_type}")
                    logger.warning(f"Suspicious {pattern_type} pattern detected in input")

    def _validate_booking_context(self, value: str, security_flags: List[str], errors: List[str]):
        """Additional validation for booking-specific contexts"""
        # Check for automated/bot-like patterns
        bot_patterns = [
            r'\b(test|dummy|fake|bot|automated)\b',
            r'\b\d{10,}\b',  # Long number sequences
            r'(.)\1{10,}',   # Repeated characters
        ]
        
        for pattern in bot_patterns:
            if re.search(pattern, value, re.IGNORECASE):
                security_flags.append("suspicious_booking_pattern")

    def _validate_booking_integrity(self, booking_data: Dict[str, Any], 
                                  security_flags: List[str], errors: List[str]):
        """Validate booking data integrity and business rules"""
        # Check for reasonable appointment timing
        if booking_data.get('appointment_date') and booking_data.get('appointment_time'):
            try:
                appointment_datetime = datetime.fromisoformat(
                    f"{booking_data['appointment_date']} {booking_data['appointment_time']}"
                )
                
                # Business hours check (9 AM to 8 PM)
                hour = appointment_datetime.hour
                if hour < 9 or hour >= 20:
                    errors.append("Appointment must be during business hours (9 AM - 8 PM)")
                
                # No appointments on Sundays (example business rule)
                if appointment_datetime.weekday() == 6:
                    errors.append("Appointments not available on Sundays")
                    
            except ValueError:
                errors.append("Invalid appointment date/time combination")

    def _has_suspicious_email_patterns(self, email: str) -> bool:
        """Check for suspicious email patterns"""
        suspicious_patterns = [
            r'\+.*\+.*@',  # Multiple plus signs
            r'\.{2,}',     # Multiple dots
            r'^[0-9]+@',   # Starts with numbers only
            r'(noreply|no-reply|test|dummy)@',  # Common fake patterns
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, email, re.IGNORECASE):
                return True
        return False

    def _encode_dangerous_chars(self, value: str) -> str:
        """Additional encoding for dangerous characters"""
        dangerous_chars = {
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;',
            '\\': '&#x5C;',
            '`': '&#x60;',
        }
        
        for char, encoded in dangerous_chars.items():
            value = value.replace(char, encoded)
        
        return value

    def create_security_hash(self, data: Dict[str, Any]) -> str:
        """Create security hash for data integrity verification"""
        # Sort keys for consistent hashing
        sorted_data = json.dumps(data, sort_keys=True, default=str)
        return hashlib.sha256(sorted_data.encode()).hexdigest()

# Convenience functions for common validations
def validate_booking_form(form_data: Dict[str, Any]) -> ValidationResult:
    """Quick validation for booking forms"""
    validator = ComprehensiveInputValidator()
    return validator.validate_booking_data(form_data)

def validate_payment_form(payment_data: Dict[str, Any]) -> ValidationResult:
    """Quick validation for payment forms (PCI compliant)"""
    validator = ComprehensiveInputValidator()
    return validator.validate_payment_data(payment_data)

def sanitize_user_input(input_str: str, max_length: int = None, allow_html: bool = False) -> ValidationResult:
    """Quick sanitization for user inputs"""
    validator = ComprehensiveInputValidator()
    return validator.sanitize_string(input_str, max_length, allow_html)

# Security testing function
def run_security_tests():
    """Run comprehensive security tests"""
    validator = ComprehensiveInputValidator()
    
    test_cases = [
        # SQL Injection tests
        "'; DROP TABLE users; --",
        "admin'--",
        "1' OR '1'='1",
        
        # XSS tests
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        
        # Normal inputs
        "John Doe",
        "john@example.com",
        "+1-555-123-4567",
    ]
    
    print("Running security validation tests...")
    for test_input in test_cases:
        result = validator.sanitize_string(test_input)
        print(f"Input: {test_input}")
        print(f"Valid: {result.is_valid}")
        print(f"Sanitized: {result.sanitized_value}")
        print(f"Security Flags: {result.security_flags}")
        print("-" * 50)

if __name__ == "__main__":
    run_security_tests()