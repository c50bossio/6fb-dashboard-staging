#!/usr/bin/env python3
"""
Comprehensive Security Service for 6FB AI Agent System
Implements authentication, session management, CSRF protection, encryption, and audit logging.
"""

import os
import secrets
import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Tuple, List, Any
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
import base64
import sqlite3
from contextlib import contextmanager
from fastapi import HTTPException, status
import jwt
import re
from enum import Enum

logger = logging.getLogger(__name__)

class SecurityEventType(Enum):
    """Types of security events for audit logging"""
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PASSWORD_RESET = "password_reset"
    PERMISSION_DENIED = "permission_denied"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    API_KEY_CREATED = "api_key_created"
    API_KEY_REVOKED = "api_key_revoked"
    CSRF_VIOLATION = "csrf_violation"
    SESSION_EXPIRED = "session_expired"
    BRUTE_FORCE_ATTEMPT = "brute_force_attempt"

class SecurityService:
    """Comprehensive security service for authentication, encryption, and audit logging"""
    
    def __init__(self, database_path: str = "data/agent_system.db"):
        self.database_path = database_path
        self.jwt_secret = os.getenv('JWT_SECRET', self._generate_secure_secret())
        self.csrf_secret = os.getenv('CSRF_SECRET', self._generate_secure_secret())
        self.encryption_key = self._get_or_generate_encryption_key()
        self.fernet = Fernet(self.encryption_key)
        self.chacha_key = ChaCha20Poly1305.generate_key()
        self.session_timeout = timedelta(hours=24)
        self.api_key_prefix = "6fb_"
        self._init_security_tables()
    
    def _generate_secure_secret(self) -> str:
        """Generate a cryptographically secure secret"""
        return secrets.token_urlsafe(32)
    
    def _get_or_generate_encryption_key(self) -> bytes:
        """Get or generate encryption key for data at rest"""
        key_file = "data/.encryption_key"
        os.makedirs(os.path.dirname(key_file), exist_ok=True)
        
        if os.path.exists(key_file):
            with open(key_file, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, 'wb') as f:
                f.write(key)
            os.chmod(key_file, 0o600)  # Restrict file permissions
            return key
    
    @contextmanager
    def get_db(self):
        """Database connection context manager"""
        os.makedirs(os.path.dirname(self.database_path), exist_ok=True)
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_security_tables(self):
        """Initialize security-related database tables"""
        with self.get_db() as conn:
            # Enhanced sessions table with security features
            conn.execute("""
                CREATE TABLE IF NOT EXISTS secure_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    csrf_token TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # API keys table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    key_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    permissions TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_used TIMESTAMP,
                    expires_at TIMESTAMP,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Security audit log
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    user_id INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    event_data TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    severity TEXT DEFAULT 'info'
                )
            """)
            
            # Brute force protection
            conn.execute("""
                CREATE TABLE IF NOT EXISTS login_attempts (
                    ip_address TEXT,
                    email TEXT,
                    attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    success BOOLEAN DEFAULT 0,
                    PRIMARY KEY (ip_address, email, attempt_time)
                )
            """)
            
            # Encrypted sensitive data storage
            conn.execute("""
                CREATE TABLE IF NOT EXISTS encrypted_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    data_key TEXT UNIQUE NOT NULL,
                    encrypted_value TEXT NOT NULL,
                    nonce TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            conn.commit()
    
    # Password Security
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt with salt"""
        # Using PBKDF2 with SHA256 for consistent cross-platform support
        salt = secrets.token_bytes(32)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = kdf.derive(password.encode())
        return base64.b64encode(salt + key).decode()
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            decoded = base64.b64decode(password_hash.encode())
            salt = decoded[:32]
            stored_key = decoded[32:]
            
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            test_key = kdf.derive(password.encode())
            
            return hmac.compare_digest(stored_key, test_key)
        except Exception:
            return False
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password meets security requirements"""
        errors = []
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        return len(errors) == 0, errors
    
    # Session Management
    def create_session(self, user_id: int, ip_address: str = None, user_agent: str = None) -> Dict[str, str]:
        """Create secure session with CSRF token"""
        session_id = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + self.session_timeout
        
        # Create JWT token
        jwt_payload = {
            'session_id': session_id,
            'user_id': user_id,
            'exp': expires_at.timestamp(),
            'iat': datetime.now(timezone.utc).timestamp()
        }
        jwt_token = jwt.encode(jwt_payload, self.jwt_secret, algorithm='HS256')
        
        # Store session in database
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO secure_sessions 
                (session_id, user_id, csrf_token, ip_address, user_agent, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (session_id, user_id, csrf_token, ip_address, user_agent, expires_at))
            conn.commit()
        
        # Log security event
        self.log_security_event(
            SecurityEventType.LOGIN_SUCCESS,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {
            'token': jwt_token,
            'csrf_token': csrf_token,
            'expires_at': expires_at.isoformat()
        }
    
    def validate_session(self, token: str, csrf_token: str = None, validate_csrf: bool = True) -> Optional[Dict]:
        """Validate session and CSRF token"""
        try:
            # Decode JWT
            payload = jwt.decode(token, self.jwt_secret, algorithms=['HS256'])
            session_id = payload.get('session_id')
            user_id = payload.get('user_id')
            
            # Check session in database
            with self.get_db() as conn:
                cursor = conn.execute("""
                    SELECT * FROM secure_sessions 
                    WHERE session_id = ? AND user_id = ? AND is_active = 1
                """, (session_id, user_id))
                session = cursor.fetchone()
                
                if not session:
                    return None
                
                # Check expiration
                expires_at = datetime.fromisoformat(session['expires_at'].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    self.revoke_session(session_id)
                    self.log_security_event(
                        SecurityEventType.SESSION_EXPIRED,
                        user_id=user_id
                    )
                    return None
                
                # Validate CSRF token if required
                if validate_csrf and csrf_token != session['csrf_token']:
                    self.log_security_event(
                        SecurityEventType.CSRF_VIOLATION,
                        user_id=user_id,
                        data={'provided_csrf': csrf_token}
                    )
                    return None
                
                # Update last activity
                conn.execute("""
                    UPDATE secure_sessions 
                    SET last_activity = CURRENT_TIMESTAMP 
                    WHERE session_id = ?
                """, (session_id,))
                conn.commit()
                
                return {
                    'user_id': user_id,
                    'session_id': session_id,
                    'csrf_token': session['csrf_token']
                }
                
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    def revoke_session(self, session_id: str):
        """Revoke a session"""
        with self.get_db() as conn:
            conn.execute("""
                UPDATE secure_sessions 
                SET is_active = 0 
                WHERE session_id = ?
            """, (session_id,))
            conn.commit()
    
    def revoke_all_sessions(self, user_id: int):
        """Revoke all sessions for a user"""
        with self.get_db() as conn:
            conn.execute("""
                UPDATE secure_sessions 
                SET is_active = 0 
                WHERE user_id = ?
            """, (user_id,))
            conn.commit()
    
    # API Key Management
    def create_api_key(self, user_id: int, name: str, permissions: List[str] = None) -> str:
        """Create new API key with permissions"""
        api_key = f"{self.api_key_prefix}{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO api_keys 
                (key_hash, user_id, name, permissions)
                VALUES (?, ?, ?, ?)
            """, (key_hash, user_id, name, json.dumps(permissions or [])))
            conn.commit()
        
        self.log_security_event(
            SecurityEventType.API_KEY_CREATED,
            user_id=user_id,
            data={'key_name': name}
        )
        
        return api_key
    
    def validate_api_key(self, api_key: str) -> Optional[Dict]:
        """Validate API key and return user info"""
        if not api_key.startswith(self.api_key_prefix):
            return None
        
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        with self.get_db() as conn:
            cursor = conn.execute("""
                SELECT * FROM api_keys 
                WHERE key_hash = ? AND is_active = 1
            """, (key_hash,))
            key_data = cursor.fetchone()
            
            if not key_data:
                return None
            
            # Check expiration
            if key_data['expires_at']:
                expires_at = datetime.fromisoformat(key_data['expires_at'].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    return None
            
            # Update last used
            conn.execute("""
                UPDATE api_keys 
                SET last_used = CURRENT_TIMESTAMP 
                WHERE key_hash = ?
            """, (key_hash,))
            conn.commit()
            
            return {
                'user_id': key_data['user_id'],
                'permissions': json.loads(key_data['permissions'])
            }
    
    def revoke_api_key(self, api_key: str, user_id: int):
        """Revoke an API key"""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        with self.get_db() as conn:
            conn.execute("""
                UPDATE api_keys 
                SET is_active = 0 
                WHERE key_hash = ? AND user_id = ?
            """, (key_hash, user_id))
            conn.commit()
        
        self.log_security_event(
            SecurityEventType.API_KEY_REVOKED,
            user_id=user_id
        )
    
    # Data Encryption
    def encrypt_sensitive_data(self, data: str, data_key: str) -> Dict[str, str]:
        """Encrypt sensitive data for storage"""
        # Generate nonce for ChaCha20Poly1305
        nonce = os.urandom(12)
        
        # Encrypt data
        cipher = ChaCha20Poly1305(self.chacha_key)
        encrypted = cipher.encrypt(nonce, data.encode(), None)
        
        # Store encrypted data
        with self.get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO encrypted_data 
                (data_key, encrypted_value, nonce, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            """, (data_key, base64.b64encode(encrypted).decode(), 
                  base64.b64encode(nonce).decode()))
            conn.commit()
        
        return {
            'data_key': data_key,
            'status': 'encrypted'
        }
    
    def decrypt_sensitive_data(self, data_key: str) -> Optional[str]:
        """Decrypt sensitive data"""
        with self.get_db() as conn:
            cursor = conn.execute("""
                SELECT encrypted_value, nonce 
                FROM encrypted_data 
                WHERE data_key = ?
            """, (data_key,))
            row = cursor.fetchone()
            
            if not row:
                return None
            
            try:
                # Decrypt data
                cipher = ChaCha20Poly1305(self.chacha_key)
                encrypted = base64.b64decode(row['encrypted_value'])
                nonce = base64.b64decode(row['nonce'])
                decrypted = cipher.decrypt(nonce, encrypted, None)
                
                return decrypted.decode()
            except Exception as e:
                logger.error(f"Decryption failed for key {data_key}: {e}")
                return None
    
    # Brute Force Protection
    def check_brute_force(self, ip_address: str, email: str = None) -> bool:
        """Check if IP/email is blocked due to brute force attempts"""
        # Check last 5 minutes
        time_threshold = datetime.now(timezone.utc) - timedelta(minutes=5)
        
        with self.get_db() as conn:
            # Check IP-based attempts
            cursor = conn.execute("""
                SELECT COUNT(*) as attempts, SUM(success) as successes
                FROM login_attempts 
                WHERE ip_address = ? AND attempt_time > ?
            """, (ip_address, time_threshold))
            ip_data = cursor.fetchone()
            
            # Block if more than 5 failed attempts from IP
            if ip_data['attempts'] - (ip_data['successes'] or 0) > 5:
                self.log_security_event(
                    SecurityEventType.BRUTE_FORCE_ATTEMPT,
                    ip_address=ip_address,
                    data={'email': email}
                )
                return True
            
            # Check email-based attempts if provided
            if email:
                cursor = conn.execute("""
                    SELECT COUNT(*) as attempts, SUM(success) as successes
                    FROM login_attempts 
                    WHERE email = ? AND attempt_time > ?
                """, (email, time_threshold))
                email_data = cursor.fetchone()
                
                # Block if more than 3 failed attempts for email
                if email_data['attempts'] - (email_data['successes'] or 0) > 3:
                    self.log_security_event(
                        SecurityEventType.BRUTE_FORCE_ATTEMPT,
                        ip_address=ip_address,
                        data={'email': email}
                    )
                    return True
        
        return False
    
    def record_login_attempt(self, ip_address: str, email: str, success: bool):
        """Record login attempt for brute force protection"""
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO login_attempts (ip_address, email, success)
                VALUES (?, ?, ?)
            """, (ip_address, email, 1 if success else 0))
            conn.commit()
    
    # Security Audit Logging
    def log_security_event(
        self, 
        event_type: SecurityEventType, 
        user_id: int = None,
        ip_address: str = None,
        user_agent: str = None,
        data: Dict = None,
        severity: str = 'info'
    ):
        """Log security event for audit trail"""
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO security_audit_log 
                (event_type, user_id, ip_address, user_agent, event_data, severity)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (event_type.value, user_id, ip_address, user_agent, 
                  json.dumps(data) if data else None, severity))
            conn.commit()
        
        # Log to system logger as well
        log_message = f"Security Event: {event_type.value}"
        if user_id:
            log_message += f" | User: {user_id}"
        if ip_address:
            log_message += f" | IP: {ip_address}"
        if data:
            log_message += f" | Data: {json.dumps(data)}"
        
        if severity == 'error':
            logger.error(log_message)
        elif severity == 'warning':
            logger.warning(log_message)
        else:
            logger.info(log_message)
    
    def get_security_audit_log(
        self, 
        user_id: int = None, 
        event_type: SecurityEventType = None,
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100
    ) -> List[Dict]:
        """Retrieve security audit logs with filtering"""
        query = "SELECT * FROM security_audit_log WHERE 1=1"
        params = []
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        if event_type:
            query += " AND event_type = ?"
            params.append(event_type.value)
        
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        with self.get_db() as conn:
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    # Input Validation
    def sanitize_input(self, input_string: str, input_type: str = 'general') -> str:
        """Sanitize user input to prevent injection attacks"""
        if not input_string:
            return ""
        
        # Remove null bytes
        sanitized = input_string.replace('\x00', '')
        
        if input_type == 'email':
            # Basic email sanitization
            sanitized = sanitized.lower().strip()
            # Remove potentially dangerous characters
            sanitized = re.sub(r'[<>\"\'%;()&+]', '', sanitized)
        
        elif input_type == 'username':
            # Allow only alphanumeric, underscore, dash
            sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', sanitized)
        
        elif input_type == 'general':
            # Escape HTML entities
            sanitized = sanitized.replace('&', '&amp;')
            sanitized = sanitized.replace('<', '&lt;')
            sanitized = sanitized.replace('>', '&gt;')
            sanitized = sanitized.replace('"', '&quot;')
            sanitized = sanitized.replace("'", '&#x27;')
        
        return sanitized[:1000]  # Limit length to prevent DoS
    
    # GDPR Compliance
    def export_user_data(self, user_id: int) -> Dict:
        """Export all user data for GDPR compliance"""
        data = {
            'user_id': user_id,
            'exported_at': datetime.now(timezone.utc).isoformat(),
            'data': {}
        }
        
        with self.get_db() as conn:
            # Get user info
            cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
            user = cursor.fetchone()
            if user:
                data['data']['user'] = dict(user)
            
            # Get sessions
            cursor = conn.execute(
                "SELECT * FROM secure_sessions WHERE user_id = ?", 
                (user_id,)
            )
            data['data']['sessions'] = [dict(row) for row in cursor.fetchall()]
            
            # Get security audit log
            cursor = conn.execute(
                "SELECT * FROM security_audit_log WHERE user_id = ?", 
                (user_id,)
            )
            data['data']['security_log'] = [dict(row) for row in cursor.fetchall()]
            
            # Get chat history
            cursor = conn.execute(
                "SELECT * FROM chat_history WHERE user_id = ?", 
                (user_id,)
            )
            data['data']['chat_history'] = [dict(row) for row in cursor.fetchall()]
        
        return data
    
    def delete_user_data(self, user_id: int) -> bool:
        """Delete all user data for GDPR compliance"""
        try:
            with self.get_db() as conn:
                # Delete from all tables
                tables = [
                    'secure_sessions', 'api_keys', 'security_audit_log',
                    'login_attempts', 'chat_history', 'shop_profiles'
                ]
                
                for table in tables:
                    conn.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
                
                # Finally delete user
                conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
                conn.commit()
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete user data: {e}")
            return False

# Singleton instance
security_service = SecurityService()

# Export main components
__all__ = [
    'SecurityService',
    'security_service',
    'SecurityEventType'
]