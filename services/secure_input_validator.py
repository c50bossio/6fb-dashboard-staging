#!/usr/bin/env python3
"""
Secure Input Validation and Sanitization Service
Comprehensive protection against injection attacks, XSS, and malicious input
"""

import re
import html
import bleach
import hashlib
import logging
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, validator, Field
from datetime import datetime
import sqlparse
import json

logger = logging.getLogger(__name__)

class SecurityError(Exception):
    """Security-related validation error"""
    pass

class InputValidator:
    """
    Comprehensive input validation and sanitization
    """
    
    # Dangerous patterns that should be blocked
    DANGEROUS_PATTERNS = [
        # SQL Injection patterns
        r"(?i)(union\s+select|select\s+\*|drop\s+table|delete\s+from|insert\s+into)",
        r"(?i)(exec\s*\(|execute\s*\(|sp_executesql)",
        r"(?i)(\'\s*;\s*--|--\s*$|\/\*.*\*\/)",
        
        # XSS patterns
        r"(?i)(<script|<\/script>|javascript:|vbscript:|onload=|onerror=)",
        r"(?i)(eval\s*\(|setTimeout\s*\(|setInterval\s*\()",
        r"(?i)(<iframe|<object|<embed|<applet)",
        
        # Command injection patterns
        r"(?i)(;\s*rm\s|;\s*wget\s|;\s*curl\s|&&\s*rm\s)",
        r"(?i)(\|\s*nc\s|\|\s*netcat\s|>\s*/dev/)",
        r"(?i)(base64\s*-d|python\s*-c|perl\s*-e)",
        
        # Path traversal patterns
        r"(\.\.\/|\.\.\\\\|%2e%2e%2f|%2e%2e%5c)",
        r"(?i)(\/etc\/passwd|\/etc\/shadow|c:\\\\windows\\\\system32)",
        
        # LDAP injection patterns
        r"(?i)(\*\)\(|\)\(\*|\*\)\(\&|\&\(\*)",
        
        # XML/XXE patterns
        r"(?i)(<!entity|<!doctype.*system|<!doctype.*public)",
        
        # NoSQL injection patterns
        r"(?i)(\$ne|\$gt|\$lt|\$regex|\$where)"
    ]
    
    # Compiled regex patterns for performance
    COMPILED_PATTERNS = [re.compile(pattern) for pattern in DANGEROUS_PATTERNS]
    
    # HTML tags allowed for rich text content
    ALLOWED_HTML_TAGS = [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a'
    ]
    
    ALLOWED_HTML_ATTRIBUTES = {
        'a': ['href', 'title'],
        'blockquote': ['cite'],
        'pre': ['class'],
        'code': ['class']
    }
    
    def __init__(self):
        self.max_input_length = 10000  # Maximum input length
        self.max_file_size = 10 * 1024 * 1024  # 10MB max file size
        
    def validate_and_sanitize(self, input_data: Any, 
                            field_type: str = "text", 
                            allow_html: bool = False,
                            max_length: Optional[int] = None) -> Any:
        """
        Main validation and sanitization method
        
        Args:
            input_data: Input to validate and sanitize
            field_type: Type of field (text, email, url, phone, etc.)
            allow_html: Whether to allow HTML content (sanitized)
            max_length: Maximum allowed length
            
        Returns:
            Sanitized and validated input
            
        Raises:
            SecurityError: If input contains dangerous patterns
        """
        
        if input_data is None:
            return None
            
        # Convert to string for processing
        input_str = str(input_data)
        
        # Check maximum length
        max_len = max_length or self.max_input_length
        if len(input_str) > max_len:
            raise SecurityError(f"Input too long: {len(input_str)} > {max_len}")
        
        # Check for dangerous patterns
        self._check_dangerous_patterns(input_str)
        
        # Sanitize based on field type
        if field_type == "email":
            return self._sanitize_email(input_str)
        elif field_type == "url":
            return self._sanitize_url(input_str)
        elif field_type == "phone":
            return self._sanitize_phone(input_str)
        elif field_type == "html" or allow_html:
            return self._sanitize_html(input_str)
        elif field_type == "json":
            return self._sanitize_json(input_str)
        else:
            return self._sanitize_text(input_str)
    
    def _check_dangerous_patterns(self, input_str: str) -> None:
        """Check for dangerous injection patterns"""
        
        for pattern in self.COMPILED_PATTERNS:
            if pattern.search(input_str):
                # Log security violation
                logger.warning(f"Dangerous pattern detected: {pattern.pattern[:50]}...")
                raise SecurityError("Input contains potentially dangerous content")
        
        # Check for excessive special characters (potential obfuscation)
        special_char_ratio = sum(1 for c in input_str if not c.isalnum() and not c.isspace()) / len(input_str)
        if special_char_ratio > 0.5 and len(input_str) > 50:
            logger.warning(f"High special character ratio: {special_char_ratio}")
            raise SecurityError("Input contains suspicious character patterns")
    
    def _sanitize_text(self, input_str: str) -> str:
        """Sanitize plain text input"""
        
        # Remove null bytes and control characters
        sanitized = input_str.replace('\x00', '').replace('\r', '')
        
        # HTML encode to prevent XSS
        sanitized = html.escape(sanitized, quote=True)
        
        # Normalize whitespace
        sanitized = re.sub(r'\s+', ' ', sanitized.strip())
        
        return sanitized
    
    def _sanitize_html(self, input_str: str) -> str:
        """Sanitize HTML content using bleach"""
        
        # Use bleach to sanitize HTML
        sanitized = bleach.clean(
            input_str,
            tags=self.ALLOWED_HTML_TAGS,
            attributes=self.ALLOWED_HTML_ATTRIBUTES,
            strip=True,
            strip_comments=True
        )
        
        # Additional check for javascript: protocol in links
        sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)
        
        return sanitized
    
    def _sanitize_email(self, input_str: str) -> str:
        """Sanitize and validate email address"""
        
        # Basic email format validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        # Remove whitespace
        email = input_str.strip().lower()
        
        # Check format
        if not re.match(email_pattern, email):
            raise SecurityError("Invalid email format")
        
        # Check for dangerous characters
        if any(char in email for char in ['<', '>', '"', "'"]):
            raise SecurityError("Email contains invalid characters")
        
        return email
    
    def _sanitize_url(self, input_str: str) -> str:
        """Sanitize and validate URL"""
        
        # Remove whitespace
        url = input_str.strip()
        
        # Check for allowed protocols
        allowed_protocols = ['http:', 'https:', 'ftp:', 'ftps:']
        if not any(url.lower().startswith(protocol) for protocol in allowed_protocols):
            raise SecurityError("URL must use http, https, ftp, or ftps protocol")
        
        # Check for dangerous characters
        dangerous_chars = ['<', '>', '"', "'", '`', '\n', '\r', '\t']
        if any(char in url for char in dangerous_chars):
            raise SecurityError("URL contains invalid characters")
        
        # Basic URL format validation
        url_pattern = r'^https?:\/\/[^\s\/$.?#].[^\s]*$'
        if not re.match(url_pattern, url, re.IGNORECASE):
            raise SecurityError("Invalid URL format")
        
        return url
    
    def _sanitize_phone(self, input_str: str) -> str:
        """Sanitize phone number"""
        
        # Remove all non-digit characters except + and spaces
        phone = re.sub(r'[^\d\+\s\-\(\)]', '', input_str.strip())
        
        # Remove excessive formatting
        phone = re.sub(r'[-\(\)\s]', '', phone)
        
        # Basic validation (10-15 digits, optional country code)
        if not re.match(r'^(\+1?)?[0-9]{10,15}$', phone):
            raise SecurityError("Invalid phone number format")
        
        return phone
    
    def _sanitize_json(self, input_str: str) -> dict:
        """Sanitize and validate JSON input"""
        
        try:
            # Parse JSON
            data = json.loads(input_str)
            
            # Recursively sanitize JSON values
            return self._sanitize_json_recursive(data)
            
        except json.JSONDecodeError as e:
            raise SecurityError(f"Invalid JSON format: {e}")
    
    def _sanitize_json_recursive(self, data: Any) -> Any:
        """Recursively sanitize JSON data structure"""
        
        if isinstance(data, dict):
            return {
                self._sanitize_text(str(k)): self._sanitize_json_recursive(v)
                for k, v in data.items()
            }
        elif isinstance(data, list):
            return [self._sanitize_json_recursive(item) for item in data]
        elif isinstance(data, str):
            return self._sanitize_text(data)
        else:
            return data

class SecureUserInput(BaseModel):
    """Pydantic model for secure user input validation"""
    
    message: str = Field(..., min_length=1, max_length=1000)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    url: Optional[str] = Field(None, max_length=500)
    metadata: Optional[Dict[str, Any]] = None
    
    @validator('message')
    def sanitize_message(cls, v):
        validator = InputValidator()
        return validator.validate_and_sanitize(v, field_type="text")
    
    @validator('email')
    def sanitize_email(cls, v):
        if v is None:
            return None
        validator = InputValidator()
        return validator.validate_and_sanitize(v, field_type="email")
    
    @validator('phone')
    def sanitize_phone(cls, v):
        if v is None:
            return None
        validator = InputValidator()
        return validator.validate_and_sanitize(v, field_type="phone")
    
    @validator('url')
    def sanitize_url(cls, v):
        if v is None:
            return None
        validator = InputValidator()
        return validator.validate_and_sanitize(v, field_type="url")
    
    @validator('metadata')
    def sanitize_metadata(cls, v):
        if v is None:
            return None
        validator = InputValidator()
        # Convert to JSON string and back to sanitize
        json_str = json.dumps(v)
        return validator.validate_and_sanitize(json_str, field_type="json")

class FileValidator:
    """Secure file upload validation"""
    
    ALLOWED_MIME_TYPES = {
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/json', 'application/xml'
    }
    
    DANGEROUS_EXTENSIONS = {
        '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js',
        '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl'
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def __init__(self):
        self.validator = InputValidator()
    
    def validate_file(self, filename: str, content: bytes, 
                     mime_type: str) -> Dict[str, Any]:
        """
        Validate uploaded file
        
        Args:
            filename: Original filename
            content: File content bytes
            mime_type: MIME type
            
        Returns:
            Validation result with sanitized filename and metadata
            
        Raises:
            SecurityError: If file fails security checks
        """
        
        # Check file size
        if len(content) > self.MAX_FILE_SIZE:
            raise SecurityError(f"File too large: {len(content)} bytes")
        
        # Sanitize filename
        safe_filename = self._sanitize_filename(filename)
        
        # Check MIME type
        if mime_type not in self.ALLOWED_MIME_TYPES:
            raise SecurityError(f"File type not allowed: {mime_type}")
        
        # Check file extension
        extension = '.' + safe_filename.split('.')[-1].lower()
        if extension in self.DANGEROUS_EXTENSIONS:
            raise SecurityError(f"Dangerous file extension: {extension}")
        
        # Generate secure hash
        file_hash = hashlib.sha256(content).hexdigest()
        
        # Check for malicious content patterns
        self._scan_file_content(content, mime_type)
        
        return {
            'original_filename': filename,
            'safe_filename': safe_filename,
            'size': len(content),
            'mime_type': mime_type,
            'sha256_hash': file_hash,
            'validated_at': datetime.utcnow().isoformat()
        }
    
    def _sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and other attacks"""
        
        # Remove path components
        safe_name = filename.split('/')[-1].split('\\')[-1]
        
        # Remove dangerous characters
        safe_name = re.sub(r'[^\w\-_\.]', '_', safe_name)
        
        # Prevent hidden files
        if safe_name.startswith('.'):
            safe_name = 'file_' + safe_name[1:]
        
        # Ensure reasonable length
        if len(safe_name) > 255:
            name_part = safe_name[:200]
            extension = safe_name[safe_name.rfind('.'):]
            safe_name = name_part + extension
        
        return safe_name
    
    def _scan_file_content(self, content: bytes, mime_type: str) -> None:
        """Scan file content for malicious patterns"""
        
        # Convert to string for text-based files
        if mime_type.startswith('text/') or mime_type == 'application/json':
            try:
                text_content = content.decode('utf-8', errors='ignore')
                
                # Check for script injection in text files
                dangerous_patterns = [
                    r'<script[^>]*>.*?</script>',
                    r'javascript:',
                    r'vbscript:',
                    r'on\w+\s*=',
                    r'eval\s*\(',
                    r'setTimeout\s*\(',
                    r'setInterval\s*\('
                ]
                
                for pattern in dangerous_patterns:
                    if re.search(pattern, text_content, re.IGNORECASE | re.DOTALL):
                        raise SecurityError("File contains potentially dangerous content")
                        
            except UnicodeDecodeError:
                pass  # Binary file, skip text-based checks
        
        # Check for embedded executables in any file type
        exe_signatures = [
            b'MZ',  # PE executable
            b'\x7fELF',  # ELF executable
            b'\xfe\xed\xfa',  # Mach-O executable (big endian)
            b'\xcf\xfa\xed\xfe',  # Mach-O executable (little endian)
        ]
        
        for signature in exe_signatures:
            if content.startswith(signature):
                raise SecurityError("File appears to contain executable code")

# Global validator instance
input_validator = InputValidator()
file_validator = FileValidator()

# Utility functions for easy access
def validate_text(text: str, max_length: int = 1000) -> str:
    """Quick text validation and sanitization"""
    return input_validator.validate_and_sanitize(text, "text", max_length=max_length)

def validate_email(email: str) -> str:
    """Quick email validation and sanitization"""
    return input_validator.validate_and_sanitize(email, "email")

def validate_url(url: str) -> str:
    """Quick URL validation and sanitization"""
    return input_validator.validate_and_sanitize(url, "url")

def validate_html(html_content: str, max_length: int = 5000) -> str:
    """Quick HTML validation and sanitization"""
    return input_validator.validate_and_sanitize(html_content, "html", allow_html=True, max_length=max_length)

def validate_json_input(json_str: str) -> dict:
    """Quick JSON validation and sanitization"""
    return input_validator.validate_and_sanitize(json_str, "json")

def validate_file_upload(filename: str, content: bytes, mime_type: str) -> Dict[str, Any]:
    """Quick file validation"""
    return file_validator.validate_file(filename, content, mime_type)

if __name__ == "__main__":
    # Test the validator
    validator = InputValidator()
    
    # Test dangerous input
    try:
        result = validator.validate_and_sanitize("'; DROP TABLE users; --", "text")
        print(f"Sanitized: {result}")
    except SecurityError as e:
        print(f"Security error caught: {e}")
    
    # Test normal input
    try:
        result = validator.validate_and_sanitize("Hello, this is a normal message!", "text")
        print(f"Sanitized: {result}")
    except SecurityError as e:
        print(f"Unexpected error: {e}")