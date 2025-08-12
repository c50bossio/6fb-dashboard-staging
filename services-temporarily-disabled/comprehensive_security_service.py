#!/usr/bin/env python3
"""
Comprehensive Security Service for 6FB AI Agent System
Implements enterprise-grade security controls including authentication,
authorization, input validation, encryption, and audit logging.
"""

import os
import re
import jwt
import bcrypt
import secrets
import hashlib
import logging
import asyncio
import bleach
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import sqlite3
from contextlib import contextmanager
from pydantic import BaseModel, validator, EmailStr
from fastapi import HTTPException, Request
import json

logger = logging.getLogger(__name__)

class SecurityConfig:
    """Central security configuration management"""
    
    def __init__(self):
        self.jwt_secret = self._get_secure_secret('JWT_SECRET')
        self.encryption_key = self._get_encryption_key()
        self.admin_password_hash = self._get_admin_password_hash()
        self.session_secret = self._get_secure_secret('SESSION_SECRET')
        
        # Security settings
        self.jwt_expiration_hours = int(os.getenv('JWT_EXPIRATION_HOURS', '24'))
        self.max_login_attempts = int(os.getenv('MAX_LOGIN_ATTEMPTS', '5'))
        self.lockout_duration_minutes = int(os.getenv('LOCKOUT_DURATION_MINUTES', '30'))
        self.password_min_length = int(os.getenv('PASSWORD_MIN_LENGTH', '12'))
        
        # Database encryption
        self.encrypt_sensitive_fields = os.getenv('ENCRYPT_SENSITIVE_FIELDS', 'true').lower() == 'true'
        
    def _get_secure_secret(self, env_var: str) -> str:
        """Get secure secret from environment or secure file"""
        
        # First try environment variable
        secret = os.getenv(env_var)
        if secret and len(secret) >= 32:
            return secret
            
        # Try secure credentials file
        secure_file_path = f"secure-credentials/{env_var.lower().replace('_', '-')}.env"
        if os.path.exists(secure_file_path):
            try:
                with open(secure_file_path, 'r') as f:
                    content = f.read().strip()
                    if '=' in content:
                        secret = content.split('=', 1)[1].strip()
                    else:
                        secret = content
                    
                    if len(secret) >= 32:
                        return secret
            except Exception as e:
                logger.error(f"Error reading secure file {secure_file_path}: {e}")
        
        # Generate new secure secret if none exists
        new_secret = secrets.token_urlsafe(32)
        logger.warning(f"Generated new secret for {env_var}. Store securely!")
        
        # Try to save to secure credentials file
        try:
            os.makedirs("secure-credentials", exist_ok=True)
            with open(secure_file_path, 'w') as f:
                f.write(f"{env_var}={new_secret}\n")
            os.chmod(secure_file_path, 0o600)  # Read-only for owner
            logger.info(f"Saved new secret to {secure_file_path}")
        except Exception as e:
            logger.error(f"Could not save secret to file: {e}")
        
        return new_secret
    
    def _get_encryption_key(self) -> bytes:
        """Get or generate database encryption key"""
        
        key_file = "secure-credentials/database-encryption.key"
        
        if os.path.exists(key_file):
            try:
                with open(key_file, 'rb') as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Error reading encryption key: {e}")
        
        # Generate new key
        password = os.getenv('DB_ENCRYPTION_PASSWORD', 'default-password').encode()
        salt = os.urandom(16)
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        
        # Save key securely
        try:
            os.makedirs("secure-credentials", exist_ok=True)
            with open(key_file, 'wb') as f:
                f.write(salt + key)
            os.chmod(key_file, 0o600)
            logger.info("Generated new database encryption key")
        except Exception as e:
            logger.error(f"Could not save encryption key: {e}")
        
        return key
    
    def _get_admin_password_hash(self) -> str:
        """Get secure admin password hash"""
        
        admin_password = os.getenv('ADMIN_PASSWORD')
        if not admin_password:
            # Generate secure admin password
            admin_password = secrets.token_urlsafe(16)
            logger.critical(f"Generated admin password: {admin_password}")
            logger.critical("STORE THIS PASSWORD SECURELY!")
        
        # Hash the password
        return bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

class InputValidator:
    """Comprehensive input validation and sanitization"""
    
    # Dangerous patterns to detect
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)",
        r"(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)",
        r"(--|#|/\*|\*/)",
        r"(\b(xp_|sp_)\w+\b)",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>.*?</iframe>",
        r"<object[^>]*>.*?</object>",
        r"<embed[^>]*>",
    ]
    
    @staticmethod
    def sanitize_html(text: str) -> str:
        """Remove HTML tags and scripts"""
        if not text:
            return ""
        
        # Use bleach to clean HTML
        cleaned = bleach.clean(
            text,
            tags=[],  # No tags allowed
            attributes={},  # No attributes allowed
            strip=True  # Strip tags instead of escaping
        )
        
        return cleaned.strip()
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Enhanced email validation"""
        if not email or len(email) > 254:
            return False
        
        # Basic regex pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False
        
        # Additional checks
        if '..' in email or email.startswith('.') or email.endswith('.'):
            return False
        
        return True
    
    @staticmethod
    def validate_password(password: str) -> Tuple[bool, List[str]]:
        """Comprehensive password validation"""
        errors = []
        
        if len(password) < 12:
            errors.append("Password must be at least 12 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        # Check for common patterns
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password cannot contain more than 2 consecutive identical characters")
        
        # Check for common weak passwords
        weak_patterns = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if any(weak in password.lower() for weak in weak_patterns):
            errors.append("Password contains common weak patterns")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def detect_sql_injection(text: str) -> bool:
        """Detect potential SQL injection attempts"""
        if not text:
            return False
        
        text_lower = text.lower()
        for pattern in InputValidator.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    @staticmethod
    def detect_xss(text: str) -> bool:
        """Detect potential XSS attempts"""
        if not text:
            return False
        
        text_lower = text.lower()
        for pattern in InputValidator.XSS_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    @staticmethod
    def validate_and_sanitize_input(
        text: str,
        max_length: int = 1000,
        allow_html: bool = False,
        check_injection: bool = True
    ) -> Tuple[bool, str, List[str]]:
        """Comprehensive input validation and sanitization"""
        
        errors = []
        
        if not text:
            return True, "", []
        
        # Length check
        if len(text) > max_length:
            errors.append(f"Input too long (max {max_length} characters)")
            text = text[:max_length]
        
        # Injection detection
        if check_injection:
            if InputValidator.detect_sql_injection(text):
                errors.append("Potential SQL injection detected")
                return False, "", errors
            
            if InputValidator.detect_xss(text):
                errors.append("Potential XSS attack detected")
                return False, "", errors
        
        # Sanitization
        if not allow_html:
            text = InputValidator.sanitize_html(text)
        
        return True, text, errors

class SecureAuthService:
    """Enhanced authentication service with security monitoring"""
    
    def __init__(self, security_config: SecurityConfig):
        self.config = security_config
        self.failed_attempts = {}  # IP -> {count, last_attempt, locked_until}
        self.blacklisted_tokens = set()
        self.active_sessions = {}  # token -> session_info
        
    def _get_client_identifier(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Check for forwarded headers
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else 'unknown'
    
    def _is_account_locked(self, identifier: str) -> bool:
        """Check if account is locked due to failed attempts"""
        if identifier not in self.failed_attempts:
            return False
        
        attempt_info = self.failed_attempts[identifier]
        if 'locked_until' in attempt_info:
            if datetime.now() < attempt_info['locked_until']:
                return True
            else:
                # Unlock expired lockout
                del self.failed_attempts[identifier]
        
        return False
    
    def _record_failed_attempt(self, identifier: str):
        """Record failed login attempt"""
        now = datetime.now()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = {'count': 0, 'last_attempt': now}
        
        attempt_info = self.failed_attempts[identifier]
        
        # Reset count if last attempt was more than 1 hour ago
        if now - attempt_info['last_attempt'] > timedelta(hours=1):
            attempt_info['count'] = 0
        
        attempt_info['count'] += 1
        attempt_info['last_attempt'] = now
        
        # Lock account if too many attempts
        if attempt_info['count'] >= self.config.max_login_attempts:
            attempt_info['locked_until'] = now + timedelta(
                minutes=self.config.lockout_duration_minutes
            )
            logger.warning(f"Account locked for {identifier} due to {attempt_info['count']} failed attempts")
    
    def _clear_failed_attempts(self, identifier: str):
        """Clear failed attempts on successful login"""
        if identifier in self.failed_attempts:
            del self.failed_attempts[identifier]
    
    def create_access_token(self, user_data: Dict) -> str:
        """Create secure JWT access token"""
        now = datetime.utcnow()
        
        payload = {
            'user_id': user_data['id'],
            'email': user_data['email'],
            'user_type': user_data.get('user_type', 'CLIENT'),
            'shop_name': user_data.get('shop_name'),
            'iat': now,
            'exp': now + timedelta(hours=self.config.jwt_expiration_hours),
            'jti': secrets.token_urlsafe(16),  # JWT ID for revocation
            'nbf': now,  # Not before
        }
        
        token = jwt.encode(payload, self.config.jwt_secret, algorithm='HS256')
        
        # Store session info
        self.active_sessions[payload['jti']] = {
            'user_id': payload['user_id'],
            'created_at': now,
            'expires_at': payload['exp'],
            'ip': user_data.get('ip', 'unknown')
        }
        
        return token
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token with comprehensive validation"""
        try:
            # Check if token is blacklisted
            payload = jwt.decode(token, self.config.jwt_secret, algorithms=['HS256'])
            jti = payload.get('jti')
            
            if jti in self.blacklisted_tokens:
                raise HTTPException(status_code=401, detail="Token has been revoked")
            
            # Check if session is still active
            if jti and jti in self.active_sessions:
                session_info = self.active_sessions[jti]
                if datetime.utcnow() > session_info['expires_at']:
                    self.revoke_token(token)
                    raise HTTPException(status_code=401, detail="Token has expired")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise HTTPException(status_code=401, detail="Token verification failed")
    
    def revoke_token(self, token: str):
        """Revoke JWT token"""
        try:
            payload = jwt.decode(
                token, 
                self.config.jwt_secret, 
                algorithms=['HS256'],
                options={"verify_exp": False}  # Allow expired tokens for revocation
            )
            jti = payload.get('jti')
            if jti:
                self.blacklisted_tokens.add(jti)
                if jti in self.active_sessions:
                    del self.active_sessions[jti]
        except Exception as e:
            logger.error(f"Token revocation error: {e}")
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    async def authenticate_user(self, email: str, password: str, request: Request) -> Optional[Dict]:
        """Authenticate user with security monitoring"""
        
        client_id = self._get_client_identifier(request)
        
        # Check if account is locked
        if self._is_account_locked(client_id):
            logger.warning(f"Login attempt on locked account: {client_id}")
            raise HTTPException(
                status_code=429, 
                detail="Account temporarily locked due to multiple failed attempts"
            )
        
        # Validate inputs
        if not InputValidator.validate_email(email):
            self._record_failed_attempt(client_id)
            raise HTTPException(status_code=400, detail="Invalid email format")
        
        try:
            # Database lookup (implement based on your database structure)
            # This is a placeholder - implement actual database lookup
            user = await self._lookup_user_by_email(email)
            
            if not user or not self.verify_password(password, user['password_hash']):
                self._record_failed_attempt(client_id)
                logger.warning(f"Failed login attempt for {email} from {client_id}")
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # Clear failed attempts on successful login
            self._clear_failed_attempts(client_id)
            
            # Add IP to user data for token creation
            user['ip'] = client_id
            
            logger.info(f"Successful login for {email} from {client_id}")
            return user
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            self._record_failed_attempt(client_id)
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    async def _lookup_user_by_email(self, email: str) -> Optional[Dict]:
        """Placeholder for user lookup - implement based on your database"""
        # This should be implemented based on your actual database structure
        # For now, returning None to indicate not found
        return None

class DataEncryptionService:
    """Service for encrypting sensitive data at rest"""
    
    def __init__(self, security_config: SecurityConfig):
        self.encryption_key = security_config.encryption_key
        self.cipher_suite = Fernet(self.encryption_key)
    
    def encrypt_data(self, data: str) -> str:
        """Encrypt sensitive data"""
        if not data:
            return data
        
        try:
            encrypted = self.cipher_suite.encrypt(data.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt_data(self, encrypted_data: str) -> str:
        """Decrypt sensitive data"""
        if not encrypted_data:
            return encrypted_data
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_data.encode('utf-8'))
            decrypted = self.cipher_suite.decrypt(decoded)
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise

class SecurityAuditLogger:
    """Comprehensive security audit logging"""
    
    def __init__(self):
        self.logger = logging.getLogger('security_audit')
        
        # Create separate security log handler if not exists
        if not self.logger.handlers:
            handler = logging.FileHandler('logs/security_audit.log', encoding='utf-8')
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def log_security_event(
        self,
        event_type: str,
        user_id: Optional[str],
        ip_address: str,
        details: Dict,
        severity: str = 'INFO'
    ):
        """Log security-related events"""
        
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'details': details,
            'severity': severity
        }
        
        log_message = json.dumps(log_entry)
        
        if severity == 'CRITICAL':
            self.logger.critical(log_message)
        elif severity == 'ERROR':
            self.logger.error(log_message)
        elif severity == 'WARNING':
            self.logger.warning(log_message)
        else:
            self.logger.info(log_message)
    
    def log_authentication_event(self, event_type: str, email: str, ip_address: str, success: bool):
        """Log authentication events"""
        self.log_security_event(
            event_type=f"AUTH_{event_type}",
            user_id=email,
            ip_address=ip_address,
            details={'success': success, 'email': email},
            severity='WARNING' if not success else 'INFO'
        )
    
    def log_authorization_event(self, user_id: str, resource: str, action: str, allowed: bool, ip_address: str):
        """Log authorization events"""
        self.log_security_event(
            event_type="AUTHORIZATION",
            user_id=user_id,
            ip_address=ip_address,
            details={
                'resource': resource,
                'action': action,
                'allowed': allowed
            },
            severity='WARNING' if not allowed else 'INFO'
        )
    
    def log_data_access_event(self, user_id: str, data_type: str, action: str, ip_address: str):
        """Log data access events for GDPR compliance"""
        self.log_security_event(
            event_type="DATA_ACCESS",
            user_id=user_id,
            ip_address=ip_address,
            details={
                'data_type': data_type,
                'action': action
            }
        )

# Initialize global security services
security_config = SecurityConfig()
input_validator = InputValidator()
auth_service = SecureAuthService(security_config)
encryption_service = DataEncryptionService(security_config)
audit_logger = SecurityAuditLogger()

# Pydantic models for secure API requests
class SecureUserRegister(BaseModel):
    email: EmailStr
    password: str
    shop_name: Optional[str] = None
    
    @validator('email')
    def validate_email_format(cls, v):
        if not InputValidator.validate_email(v):
            raise ValueError('Invalid email format')
        return v.lower()
    
    @validator('password')
    def validate_password_strength(cls, v):
        is_valid, errors = InputValidator.validate_password(v)
        if not is_valid:
            raise ValueError(f"Password validation failed: {'; '.join(errors)}")
        return v
    
    @validator('shop_name')
    def validate_shop_name(cls, v):
        if v:
            is_valid, sanitized, errors = InputValidator.validate_and_sanitize_input(
                v, max_length=100, allow_html=False, check_injection=True
            )
            if not is_valid:
                raise ValueError(f"Shop name validation failed: {'; '.join(errors)}")
            return sanitized
        return v

class SecureUserLogin(BaseModel):
    email: EmailStr
    password: str
    
    @validator('email')
    def validate_email_format(cls, v):
        if not InputValidator.validate_email(v):
            raise ValueError('Invalid email format')
        return v.lower()

class SecureChatMessage(BaseModel):
    message: str
    agent_id: Optional[str] = None
    
    @validator('message')
    def validate_message(cls, v):
        is_valid, sanitized, errors = InputValidator.validate_and_sanitize_input(
            v, max_length=2000, allow_html=False, check_injection=True
        )
        if not is_valid:
            raise ValueError(f"Message validation failed: {'; '.join(errors)}")
        return sanitized
    
    @validator('agent_id')
    def validate_agent_id(cls, v):
        if v:
            is_valid, sanitized, errors = InputValidator.validate_and_sanitize_input(
                v, max_length=50, allow_html=False, check_injection=True
            )
            if not is_valid:
                raise ValueError(f"Agent ID validation failed: {'; '.join(errors)}")
            return sanitized
        return v

# Export main components
__all__ = [
    'SecurityConfig',
    'InputValidator',
    'SecureAuthService',
    'DataEncryptionService',
    'SecurityAuditLogger',
    'SecureUserRegister',
    'SecureUserLogin',
    'SecureChatMessage',
    'security_config',
    'input_validator',
    'auth_service',
    'encryption_service',
    'audit_logger'
]