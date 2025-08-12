#!/usr/bin/env python3
"""
Secure Authentication Service for 6FB AI Agent System
Implements comprehensive security controls for JWT authentication with token blacklisting,
secure secret management, and enhanced security monitoring.
"""

from fastapi import HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, Dict, Any, Set
from datetime import datetime, timedelta
import jwt
import bcrypt
import sqlite3
import uuid
import logging
import os
import re
import asyncio
from pathlib import Path
import hashlib
import secrets

logger = logging.getLogger(__name__)

# Security Configuration - All secrets from environment variables
class SecurityConfig:
    def __init__(self):
        self.jwt_secret = self._get_secret('JWT_SECRET')
        self.database_password = self._get_secret('DATABASE_PASSWORD', required=False)
        self.admin_password = self._get_secret('ADMIN_PASSWORD')
        self.encryption_key = self._get_secret('ENCRYPTION_KEY', required=False)
        
        # Security settings
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30  # Shortened from 24 hours to 30 minutes
        self.refresh_token_expire_days = 7
        self.max_failed_attempts = 5
        self.lockout_duration_minutes = 15
        self.password_min_length = 12
        
    def _get_secret(self, key: str, required: bool = True) -> str:
        """Securely retrieve secrets from environment variables"""
        value = os.getenv(key)
        if required and not value:
            # Generate secure fallback for development only
            if os.getenv('ENVIRONMENT') == 'development':
                logger.warning(f"Missing {key}, generating secure random value for development")
                return secrets.token_urlsafe(32)
            else:
                raise ValueError(f"Required environment variable {key} not found")
        return value or ""

config = SecurityConfig()

# Security
security = HTTPBearer()

# User Models with Enhanced Validation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    organization: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        """Enforce strong password policy"""
        if len(v) < config.password_min_length:
            raise ValueError(f'Password must be at least {config.password_min_length} characters long')
        
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        """Sanitize and validate full name"""
        if len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters long')
        
        # Remove potentially dangerous characters
        sanitized = re.sub(r'[<>"\']', '', v.strip())
        if len(sanitized) > 100:
            raise ValueError('Full name too long')
        
        return sanitized

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
    @validator('password')
    def validate_password_format(cls, v):
        """Basic password validation for login"""
        if len(v) > 200:  # Prevent excessive password length
            raise ValueError('Password too long')
        return v

class User(BaseModel):
    id: str
    email: str
    full_name: str
    organization: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime
    last_login: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class SecurityMonitor:
    """Monitors and tracks security events"""
    def __init__(self):
        self.failed_attempts: Dict[str, list] = {}
        self.suspicious_ips: Set[str] = set()
        self.blocked_ips: Set[str] = set()
    
    def record_failed_login(self, ip: str, email: str):
        """Record failed login attempt"""
        if ip not in self.failed_attempts:
            self.failed_attempts[ip] = []
        
        self.failed_attempts[ip].append({
            'email': email,
            'timestamp': datetime.now(),
            'type': 'failed_login'
        })
        
        # Clean old attempts (older than 1 hour)
        cutoff = datetime.now() - timedelta(hours=1)
        self.failed_attempts[ip] = [
            attempt for attempt in self.failed_attempts[ip]
            if attempt['timestamp'] > cutoff
        ]
        
        # Check if IP should be blocked
        recent_failures = len(self.failed_attempts[ip])
        if recent_failures >= config.max_failed_attempts:
            self.blocked_ips.add(ip)
            logger.warning(f"IP {ip} blocked due to {recent_failures} failed login attempts")
            self._send_security_alert(f"IP {ip} blocked - multiple failed logins")
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is currently blocked"""
        return ip in self.blocked_ips
    
    def unblock_ip(self, ip: str):
        """Unblock an IP address"""
        self.blocked_ips.discard(ip)
        if ip in self.failed_attempts:
            del self.failed_attempts[ip]
    
    def _send_security_alert(self, message: str):
        """Send security alert (implement based on notification system)"""
        logger.critical(f"SECURITY ALERT: {message}")
        # TODO: Implement email/webhook notifications

security_monitor = SecurityMonitor()

class SecureAuthService:
    """Comprehensive secure authentication service"""
    
    def __init__(self):
        self.blacklisted_tokens: Set[str] = set()
        self.db_path = 'database/auth.db'
        self._init_database()
    
    def _init_database(self):
        """Initialize secure database with proper constraints"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Users table with enhanced security fields
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                organization TEXT,
                role TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                mfa_enabled BOOLEAN DEFAULT FALSE,
                mfa_secret TEXT
            )
        ''')
        
        # Security events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS security_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                event_type TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                severity TEXT DEFAULT 'info',
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Token blacklist table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS token_blacklist (
                jti TEXT PRIMARY KEY,
                user_id TEXT,
                blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                reason TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _hash_password(self, password: str) -> str:
        """Hash password with secure salt"""
        # Use higher cost factor for better security
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    def _generate_secure_token(self, data: dict, expires_delta: Optional[timedelta] = None, token_type: str = "access") -> str:
        """Generate secure JWT token with additional claims"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            if token_type == "access":
                expire = datetime.utcnow() + timedelta(minutes=config.access_token_expire_minutes)
            else:  # refresh token
                expire = datetime.utcnow() + timedelta(days=config.refresh_token_expire_days)
        
        # Add security claims
        jti = str(uuid.uuid4())  # JWT ID for revocation
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": jti,
            "type": token_type,
            "iss": "6fb-ai-agent-system"  # Issuer claim
        })
        
        return jwt.encode(to_encode, config.jwt_secret, algorithm=config.algorithm)
    
    def _verify_token(self, token: str) -> Optional[Dict]:
        """Verify JWT token with comprehensive validation"""
        try:
            # Decode token
            payload = jwt.decode(token, config.jwt_secret, algorithms=[config.algorithm])
            
            # Check if token is blacklisted
            jti = payload.get("jti")
            if jti and self._is_token_blacklisted(jti):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
            
            # Verify issuer
            if payload.get("iss") != "6fb-ai-agent-system":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token issuer"
                )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.JWTError as e:
            logger.warning(f"JWT validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def _is_token_blacklisted(self, jti: str) -> bool:
        """Check if token is blacklisted"""
        if jti in self.blacklisted_tokens:
            return True
        
        # Check database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM token_blacklist WHERE jti = ? AND expires_at > ?", 
                      (jti, datetime.utcnow()))
        result = cursor.fetchone()
        conn.close()
        
        return result is not None
    
    def revoke_token(self, token: str, reason: str = "User logout"):
        """Add token to blacklist"""
        try:
            payload = jwt.decode(token, config.jwt_secret, algorithms=[config.algorithm])
            jti = payload.get("jti")
            user_id = payload.get("sub")
            expires_at = datetime.fromtimestamp(payload.get("exp", 0))
            
            if jti:
                self.blacklisted_tokens.add(jti)
                
                # Store in database
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT OR REPLACE INTO token_blacklist 
                    (jti, user_id, expires_at, reason) 
                    VALUES (?, ?, ?, ?)
                ''', (jti, user_id, expires_at, reason))
                conn.commit()
                conn.close()
                
        except jwt.JWTError:
            pass  # Invalid token, already invalid
    
    def log_security_event(self, user_id: Optional[str], event_type: str, 
                          ip_address: Optional[str], user_agent: Optional[str],
                          details: str, severity: str = "info"):
        """Log security events for monitoring"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO security_events 
            (user_id, event_type, ip_address, user_agent, details, severity)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, event_type, ip_address, user_agent, details, severity))
        conn.commit()
        conn.close()
    
    async def register_user(self, user: UserCreate, request: Request) -> Dict[str, Any]:
        """Register new user with security validation"""
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Check if IP is blocked
        if security_monitor.is_ip_blocked(ip_address):
            self.log_security_event(None, "blocked_registration", ip_address, 
                                   user_agent, f"Registration blocked from {ip_address}", "warning")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Please try again later."
            )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if user exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (user.email,))
            if cursor.fetchone():
                self.log_security_event(None, "duplicate_registration", ip_address,
                                       user_agent, f"Duplicate registration attempt for {user.email}", "info")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
            
            # Create user
            user_id = str(uuid.uuid4())
            hashed_password = self._hash_password(user.password)
            
            cursor.execute('''
                INSERT INTO users (id, email, hashed_password, full_name, organization)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, user.email, hashed_password, user.full_name, user.organization))
            
            conn.commit()
            
            # Log successful registration
            self.log_security_event(user_id, "user_registered", ip_address,
                                   user_agent, f"User {user.email} registered successfully", "info")
            
            return {"user_id": user_id, "email": user.email, "message": "User registered successfully"}
            
        except sqlite3.IntegrityError:
            self.log_security_event(None, "registration_error", ip_address,
                                   user_agent, f"Registration integrity error for {user.email}", "warning")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User registration failed"
            )
        finally:
            conn.close()
    
    async def authenticate_user(self, credentials: UserLogin, request: Request) -> Token:
        """Authenticate user with comprehensive security checks"""
        ip_address = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Check if IP is blocked
        if security_monitor.is_ip_blocked(ip_address):
            self.log_security_event(None, "blocked_login", ip_address,
                                   user_agent, f"Login blocked from {ip_address}", "warning")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Please try again later."
            )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get user
            cursor.execute('''
                SELECT id, email, hashed_password, full_name, organization, role, 
                       is_active, failed_login_attempts, locked_until
                FROM users WHERE email = ?
            ''', (credentials.email,))
            
            user_row = cursor.fetchone()
            
            if not user_row:
                # Record failed attempt for non-existent user
                security_monitor.record_failed_login(ip_address, credentials.email)
                self.log_security_event(None, "failed_login", ip_address,
                                       user_agent, f"Login attempt for non-existent user {credentials.email}", "warning")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            user_id, email, hashed_password, full_name, organization, role, is_active, failed_attempts, locked_until = user_row
            
            # Check if user is locked
            if locked_until and datetime.fromisoformat(locked_until) > datetime.utcnow():
                self.log_security_event(user_id, "locked_login_attempt", ip_address,
                                       user_agent, f"Login attempt for locked user {email}", "warning")
                raise HTTPException(
                    status_code=status.HTTP_423_LOCKED,
                    detail="Account is temporarily locked. Please try again later."
                )
            
            # Check if user is active
            if not is_active:
                self.log_security_event(user_id, "inactive_login_attempt", ip_address,
                                       user_agent, f"Login attempt for inactive user {email}", "warning")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Account is disabled"
                )
            
            # Verify password
            if not self._verify_password(credentials.password, hashed_password):
                # Increment failed attempts
                failed_attempts = (failed_attempts or 0) + 1
                locked_until_time = None
                
                if failed_attempts >= config.max_failed_attempts:
                    locked_until_time = datetime.utcnow() + timedelta(minutes=config.lockout_duration_minutes)
                
                cursor.execute('''
                    UPDATE users 
                    SET failed_login_attempts = ?, locked_until = ?
                    WHERE id = ?
                ''', (failed_attempts, locked_until_time, user_id))
                conn.commit()
                
                # Record failed attempt
                security_monitor.record_failed_login(ip_address, credentials.email)
                self.log_security_event(user_id, "failed_login", ip_address,
                                       user_agent, f"Failed login attempt {failed_attempts}", "warning")
                
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )
            
            # Successful login - reset failed attempts and update last login
            cursor.execute('''
                UPDATE users 
                SET failed_login_attempts = 0, locked_until = NULL, last_login = ?
                WHERE id = ?
            ''', (datetime.utcnow(), user_id))
            conn.commit()
            
            # Generate tokens
            access_token = self._generate_secure_token(
                {"sub": user_id, "email": email, "role": role}, 
                token_type="access"
            )
            refresh_token = self._generate_secure_token(
                {"sub": user_id, "email": email}, 
                token_type="refresh"
            )
            
            # Log successful login
            self.log_security_event(user_id, "successful_login", ip_address,
                                   user_agent, f"User {email} logged in successfully", "info")
            
            return Token(
                access_token=access_token,
                refresh_token=refresh_token,
                token_type="bearer",
                expires_in=config.access_token_expire_minutes * 60
            )
            
        finally:
            conn.close()
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
        """Get current authenticated user"""
        token = credentials.credentials
        payload = self._verify_token(token)
        
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, email, full_name, organization, role, is_active, 
                       created_at, last_login, failed_login_attempts, locked_until
                FROM users WHERE id = ?
            ''', (user_id,))
            
            user_row = cursor.fetchone()
            if not user_row:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            user_id, email, full_name, organization, role, is_active, created_at, last_login, failed_attempts, locked_until = user_row
            
            return User(
                id=user_id,
                email=email,
                full_name=full_name,
                organization=organization,
                role=role,
                is_active=is_active,
                created_at=datetime.fromisoformat(created_at),
                last_login=datetime.fromisoformat(last_login) if last_login else None,
                failed_login_attempts=failed_attempts or 0,
                locked_until=datetime.fromisoformat(locked_until) if locked_until else None
            )
            
        finally:
            conn.close()
    
    async def logout_user(self, credentials: HTTPAuthorizationCredentials = Depends(security), request: Request = None):
        """Logout user and revoke token"""
        token = credentials.credentials
        
        # Revoke the token
        self.revoke_token(token, "User logout")
        
        # Log logout event
        if request:
            payload = self._verify_token(token)
            user_id = payload.get("sub")
            ip_address = request.client.host if request.client else "unknown"
            user_agent = request.headers.get("user-agent", "unknown")
            
            self.log_security_event(user_id, "user_logout", ip_address,
                                   user_agent, "User logged out", "info")
        
        return {"message": "Successfully logged out"}

# Global instance
auth_service = SecureAuthService()