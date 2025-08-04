#!/usr/bin/env python3
"""
Enhanced Authentication Service with Security Hardening
Production-ready authentication with bcrypt, JWT, rate limiting, and audit logging
"""

import bcrypt
import jwt
import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import json
import re
from collections import defaultdict, deque
import ipaddress

logger = logging.getLogger(__name__)

class UserRole(Enum):
    CLIENT = "client"
    BARBER = "barber"
    SHOP_OWNER = "shop_owner"
    ENTERPRISE_OWNER = "enterprise_owner"
    SUPER_ADMIN = "super_admin"

class AuthEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILED = "login_failed"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    ACCOUNT_LOCKED = "account_locked"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    TOKEN_REFRESH = "token_refresh"
    PERMISSION_DENIED = "permission_denied"

@dataclass
class User:
    id: str
    email: str
    password_hash: str
    role: UserRole
    is_active: bool = True
    is_verified: bool = False
    failed_login_attempts: int = 0
    last_login: Optional[datetime] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    password_changed_at: Optional[datetime] = None
    last_ip: Optional[str] = None
    session_token: Optional[str] = None
    mfa_enabled: bool = False
    mfa_secret: Optional[str] = None

@dataclass
class AuthEvent:
    user_id: Optional[str]
    event_type: AuthEventType
    ip_address: str
    user_agent: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    success: bool = True
    details: Dict[str, Any] = field(default_factory=dict)
    risk_score: float = 0.0

@dataclass
class JWTPayload:
    user_id: str
    email: str
    role: str
    session_id: str
    issued_at: datetime
    expires_at: datetime
    permissions: List[str] = field(default_factory=list)

class SecurityMonitor:
    """Monitor and detect suspicious authentication activity"""
    
    def __init__(self):
        # Track failed login attempts by IP and user
        self.failed_attempts_by_ip = defaultdict(deque)  # IP -> deque of timestamps
        self.failed_attempts_by_user = defaultdict(deque)  # user_id -> deque of timestamps
        self.blocked_ips = {}  # IP -> block_until_timestamp
        self.suspicious_patterns = defaultdict(int)  # pattern -> count
        
        # Configuration
        self.max_failed_attempts_per_user = 5
        self.max_failed_attempts_per_ip = 10
        self.lockout_duration = timedelta(minutes=30)
        self.ip_lockout_duration = timedelta(hours=1)
        self.suspicious_activity_window = timedelta(minutes=15)
    
    def record_failed_login(self, user_id: Optional[str], ip_address: str) -> None:
        """Record a failed login attempt"""
        now = datetime.now(timezone.utc)
        
        # Clean old attempts
        self._clean_old_attempts()
        
        # Record by IP
        self.failed_attempts_by_ip[ip_address].append(now)
        
        # Record by user if available
        if user_id:
            self.failed_attempts_by_user[user_id].append(now)
        
        # Check for IP blocking
        if len(self.failed_attempts_by_ip[ip_address]) >= self.max_failed_attempts_per_ip:
            self.blocked_ips[ip_address] = now + self.ip_lockout_duration
            logger.warning(f"IP blocked for excessive failed attempts: {ip_address}")
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is currently blocked"""
        if ip_address in self.blocked_ips:
            if datetime.now(timezone.utc) < self.blocked_ips[ip_address]:
                return True
            else:
                # Unblock expired IP
                del self.blocked_ips[ip_address]
        return False
    
    def is_user_locked(self, user_id: str) -> bool:
        """Check if user account should be locked"""
        self._clean_old_attempts()
        return len(self.failed_attempts_by_user[user_id]) >= self.max_failed_attempts_per_user
    
    def calculate_risk_score(self, user_id: Optional[str], ip_address: str, 
                           user_agent: str) -> float:
        """Calculate risk score for authentication attempt"""
        risk_score = 0.0
        
        # IP-based risk
        if user_id:
            user_failed_attempts = len(self.failed_attempts_by_user[user_id])
            risk_score += min(user_failed_attempts * 0.2, 1.0)
        
        ip_failed_attempts = len(self.failed_attempts_by_ip[ip_address])
        risk_score += min(ip_failed_attempts * 0.1, 0.5)
        
        # Geographic risk (simplified - in production, use GeoIP)
        try:
            ip_obj = ipaddress.ip_address(ip_address)
            if ip_obj.is_private:
                risk_score += 0.1  # Local network
            elif str(ip_address).startswith('192.168.'):
                risk_score += 0.1
        except ValueError:
            risk_score += 0.2  # Invalid IP format
        
        # User agent risk (basic patterns)
        if not user_agent or len(user_agent) < 10:
            risk_score += 0.3
        elif 'bot' in user_agent.lower() or 'crawler' in user_agent.lower():
            risk_score += 0.5
        
        return min(risk_score, 1.0)
    
    def _clean_old_attempts(self) -> None:
        """Remove old failed login attempts outside the window"""
        cutoff = datetime.now(timezone.utc) - self.suspicious_activity_window
        
        # Clean IP attempts
        for ip in list(self.failed_attempts_by_ip.keys()):
            attempts = self.failed_attempts_by_ip[ip]
            while attempts and attempts[0] < cutoff:
                attempts.popleft()
            if not attempts:
                del self.failed_attempts_by_ip[ip]
        
        # Clean user attempts
        for user_id in list(self.failed_attempts_by_user.keys()):
            attempts = self.failed_attempts_by_user[user_id]
            while attempts and attempts[0] < cutoff:
                attempts.popleft()
            if not attempts:
                del self.failed_attempts_by_user[user_id]

class EnhancedAuthService:
    """Production-ready authentication service with security hardening"""
    
    def __init__(self, jwt_secret: str, jwt_algorithm: str = "HS256"):
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.security_monitor = SecurityMonitor()
        self.audit_log = deque(maxlen=10000)  # Keep last 10k events
        
        # Password policy
        self.min_password_length = 12
        self.require_mixed_case = True
        self.require_numbers = True
        self.require_special_chars = True
        
        # Session management
        self.jwt_expiry_hours = 24
        self.refresh_token_expiry_days = 30
        self.max_sessions_per_user = 5
        
        # Users storage (in production, use database)
        self.users = {}  # user_id -> User
        self.users_by_email = {}  # email -> User
        self.active_sessions = {}  # session_id -> user_id
        
        logger.info("Enhanced authentication service initialized")
    
    async def register_user(self, email: str, password: str, role: UserRole,
                          ip_address: str, user_agent: str) -> Tuple[bool, str, Optional[User]]:
        """
        Register a new user with security checks
        
        Returns:
            (success, message, user)
        """
        try:
            # Validate email format
            if not self._is_valid_email(email):
                await self._log_auth_event(None, AuthEventType.LOGIN_FAILED, 
                                         ip_address, user_agent, False,
                                         {"reason": "invalid_email_format"})
                return False, "Invalid email format", None
            
            # Check if user already exists
            if email.lower() in self.users_by_email:
                await self._log_auth_event(None, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "email_already_exists"})
                return False, "Email already registered", None
            
            # Validate password strength
            password_valid, password_message = self._validate_password_strength(password)
            if not password_valid:
                await self._log_auth_event(None, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "weak_password"})
                return False, password_message, None
            
            # Create user
            user_id = self._generate_secure_id()
            password_hash = self._hash_password(password)
            
            user = User(
                id=user_id,
                email=email.lower(),
                password_hash=password_hash,
                role=role,
                password_changed_at=datetime.now(timezone.utc),
                last_ip=ip_address
            )
            
            # Store user
            self.users[user_id] = user
            self.users_by_email[email.lower()] = user
            
            await self._log_auth_event(user_id, AuthEventType.LOGIN_SUCCESS,
                                     ip_address, user_agent, True,
                                     {"action": "user_registration"})
            
            logger.info(f"User registered successfully: {email}")
            return True, "User registered successfully", user
            
        except Exception as e:
            logger.error(f"Registration error: {e}")
            return False, "Registration failed", None
    
    async def authenticate_user(self, email: str, password: str,
                               ip_address: str, user_agent: str) -> Tuple[bool, str, Optional[str]]:
        """
        Authenticate user and return JWT token
        
        Returns:
            (success, message, jwt_token)
        """
        try:
            # Check IP blocking
            if self.security_monitor.is_ip_blocked(ip_address):
                await self._log_auth_event(None, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "ip_blocked"})
                return False, "IP temporarily blocked due to suspicious activity", None
            
            # Find user
            user = self.users_by_email.get(email.lower())
            if not user:
                self.security_monitor.record_failed_login(None, ip_address)
                await self._log_auth_event(None, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "user_not_found", "email": email})
                return False, "Invalid credentials", None
            
            # Check user account status
            if not user.is_active:
                await self._log_auth_event(user.id, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "account_disabled"})
                return False, "Account is disabled", None
            
            # Check if user is locked
            if self.security_monitor.is_user_locked(user.id):
                await self._log_auth_event(user.id, AuthEventType.ACCOUNT_LOCKED,
                                         ip_address, user_agent, False,
                                         {"reason": "account_locked"})
                return False, "Account temporarily locked due to failed login attempts", None
            
            # Verify password
            if not self._verify_password(password, user.password_hash):
                self.security_monitor.record_failed_login(user.id, ip_address)
                user.failed_login_attempts += 1
                await self._log_auth_event(user.id, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "invalid_password"})
                return False, "Invalid credentials", None
            
            # Calculate risk score
            risk_score = self.security_monitor.calculate_risk_score(user.id, ip_address, user_agent)
            
            # Reset failed attempts on successful login
            user.failed_login_attempts = 0
            user.last_login = datetime.now(timezone.utc)
            user.last_ip = ip_address
            
            # Generate JWT token
            session_id = self._generate_secure_id()
            jwt_token = self._generate_jwt_token(user, session_id)
            
            # Store active session
            self.active_sessions[session_id] = user.id
            user.session_token = session_id
            
            await self._log_auth_event(user.id, AuthEventType.LOGIN_SUCCESS,
                                     ip_address, user_agent, True,
                                     {"risk_score": risk_score})
            
            logger.info(f"User authenticated successfully: {email}")
            return True, "Authentication successful", jwt_token
            
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return False, "Authentication failed", None
    
    async def validate_jwt_token(self, token: str) -> Tuple[bool, Optional[JWTPayload]]:
        """
        Validate JWT token and return payload
        
        Returns:
            (valid, payload)
        """
        try:
            # Decode JWT
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            
            # Check expiration
            exp_timestamp = payload.get('exp')
            if not exp_timestamp:
                return False, None
            
            exp_datetime = datetime.fromtimestamp(exp_timestamp, timezone.utc)
            if datetime.now(timezone.utc) >= exp_datetime:
                return False, None
            
            # Check if session is still active
            session_id = payload.get('session_id')
            if session_id not in self.active_sessions:
                return False, None
            
            # Create JWT payload object
            jwt_payload = JWTPayload(
                user_id=payload['user_id'],
                email=payload['email'],
                role=payload['role'],
                session_id=session_id,
                issued_at=datetime.fromtimestamp(payload['iat'], timezone.utc),
                expires_at=exp_datetime,
                permissions=payload.get('permissions', [])
            )
            
            return True, jwt_payload
            
        except jwt.ExpiredSignatureError:
            return False, None
        except jwt.InvalidTokenError:
            return False, None
        except Exception as e:
            logger.error(f"JWT validation error: {e}")
            return False, None
    
    async def logout_user(self, session_id: str, ip_address: str, user_agent: str) -> bool:
        """Logout user and invalidate session"""
        try:
            if session_id in self.active_sessions:
                user_id = self.active_sessions[session_id]
                del self.active_sessions[session_id]
                
                # Clear user session token
                user = self.users.get(user_id)
                if user and user.session_token == session_id:
                    user.session_token = None
                
                await self._log_auth_event(user_id, AuthEventType.LOGOUT,
                                         ip_address, user_agent, True)
                return True
            return False
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    async def change_password(self, user_id: str, old_password: str, new_password: str,
                            ip_address: str, user_agent: str) -> Tuple[bool, str]:
        """Change user password with validation"""
        try:
            user = self.users.get(user_id)
            if not user:
                return False, "User not found"
            
            # Verify old password
            if not self._verify_password(old_password, user.password_hash):
                await self._log_auth_event(user_id, AuthEventType.LOGIN_FAILED,
                                         ip_address, user_agent, False,
                                         {"reason": "invalid_old_password"})
                return False, "Invalid current password"
            
            # Validate new password strength
            password_valid, password_message = self._validate_password_strength(new_password)
            if not password_valid:
                return False, password_message
            
            # Update password
            user.password_hash = self._hash_password(new_password)
            user.password_changed_at = datetime.now(timezone.utc)
            user.updated_at = datetime.now(timezone.utc)
            
            # Invalidate all existing sessions for security
            sessions_to_remove = [sid for sid, uid in self.active_sessions.items() if uid == user_id]
            for session_id in sessions_to_remove:
                del self.active_sessions[session_id]
            user.session_token = None
            
            await self._log_auth_event(user_id, AuthEventType.PASSWORD_CHANGE,
                                     ip_address, user_agent, True)
            
            logger.info(f"Password changed for user: {user.email}")
            return True, "Password changed successfully"
            
        except Exception as e:
            logger.error(f"Password change error: {e}")
            return False, "Password change failed"
    
    def _generate_secure_id(self) -> str:
        """Generate cryptographically secure ID"""
        return secrets.token_urlsafe(32)
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)  # Strong cost factor
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
        except Exception:
            return False
    
    def _validate_password_strength(self, password: str) -> Tuple[bool, str]:
        """Validate password meets security requirements"""
        
        if len(password) < self.min_password_length:
            return False, f"Password must be at least {self.min_password_length} characters long"
        
        if self.require_mixed_case:
            if not re.search(r'[a-z]', password) or not re.search(r'[A-Z]', password):
                return False, "Password must contain both uppercase and lowercase letters"
        
        if self.require_numbers:
            if not re.search(r'\d', password):
                return False, "Password must contain at least one number"
        
        if self.require_special_chars:
            if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
                return False, "Password must contain at least one special character"
        
        # Check for common weak passwords
        common_weak = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if password.lower() in common_weak:
            return False, "Password is too common"
        
        return True, "Password meets requirements"
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(email_pattern, email) is not None
    
    def _generate_jwt_token(self, user: User, session_id: str) -> str:
        """Generate JWT token for user"""
        
        now = datetime.now(timezone.utc)
        exp = now + timedelta(hours=self.jwt_expiry_hours)
        
        # Define permissions based on role
        permissions = self._get_role_permissions(user.role)
        
        payload = {
            'user_id': user.id,
            'email': user.email,
            'role': user.role.value,
            'session_id': session_id,
            'permissions': permissions,
            'iat': int(now.timestamp()),
            'exp': int(exp.timestamp()),
            'iss': '6fb-ai-agent-system',
            'aud': 'barbershop-management'
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _get_role_permissions(self, role: UserRole) -> List[str]:
        """Get permissions for user role"""
        
        permissions_map = {
            UserRole.CLIENT: [
                'book_appointment',
                'view_own_appointments',
                'update_own_profile'
            ],
            UserRole.BARBER: [
                'view_own_schedule',
                'update_own_availability',
                'view_assigned_appointments',
                'update_own_profile'
            ],
            UserRole.SHOP_OWNER: [
                'manage_shop_settings',
                'view_shop_analytics',
                'manage_barbers',
                'view_all_appointments',
                'manage_services',
                'view_financial_reports'
            ],
            UserRole.ENTERPRISE_OWNER: [
                'manage_multiple_shops',
                'view_enterprise_analytics',
                'manage_shop_owners',
                'view_consolidated_reports',
                'manage_enterprise_settings'
            ],
            UserRole.SUPER_ADMIN: [
                'manage_system',
                'view_all_data',
                'manage_users',
                'system_configuration',
                'security_management'
            ]
        }
        
        return permissions_map.get(role, [])
    
    async def _log_auth_event(self, user_id: Optional[str], event_type: AuthEventType,
                             ip_address: str, user_agent: str, success: bool = True,
                             details: Dict[str, Any] = None) -> None:
        """Log authentication event for audit trail"""
        
        risk_score = self.security_monitor.calculate_risk_score(user_id, ip_address, user_agent)
        
        event = AuthEvent(
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            details=details or {},
            risk_score=risk_score
        )
        
        self.audit_log.append(event)
        
        # Log to application logger
        log_level = logging.INFO if success else logging.WARNING
        logger.log(log_level, f"Auth event: {event_type.value} for user {user_id} "
                              f"from {ip_address}, success: {success}, risk: {risk_score:.2f}")
    
    def get_audit_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent audit logs"""
        recent_logs = list(self.audit_log)[-limit:]
        return [
            {
                'user_id': event.user_id,
                'event_type': event.event_type.value,
                'ip_address': event.ip_address,
                'user_agent': event.user_agent,
                'timestamp': event.timestamp.isoformat(),
                'success': event.success,
                'details': event.details,
                'risk_score': event.risk_score
            }
            for event in recent_logs
        ]
    
    def get_security_stats(self) -> Dict[str, Any]:
        """Get security monitoring statistics"""
        return {
            'active_sessions': len(self.active_sessions),
            'blocked_ips': len(self.security_monitor.blocked_ips),
            'failed_attempts_by_ip': len(self.security_monitor.failed_attempts_by_ip),
            'failed_attempts_by_user': len(self.security_monitor.failed_attempts_by_user),
            'total_users': len(self.users),
            'audit_log_entries': len(self.audit_log)
        }

# Global authentication service instance
# In production, initialize with secure JWT secret from environment
auth_service = None

def initialize_auth_service(jwt_secret: str) -> EnhancedAuthService:
    """Initialize global authentication service"""
    global auth_service
    auth_service = EnhancedAuthService(jwt_secret)
    return auth_service

def get_auth_service() -> Optional[EnhancedAuthService]:
    """Get global authentication service instance"""
    return auth_service

if __name__ == "__main__":
    # Test the authentication service
    import asyncio
    
    async def test_auth():
        # Initialize service
        service = EnhancedAuthService("test-secret-key-12345")
        
        # Test user registration
        success, message, user = await service.register_user(
            "test@example.com", "SecurePassword123!",
            UserRole.CLIENT, "127.0.0.1", "Test-Agent/1.0"
        )
        print(f"Registration: {success}, {message}")
        
        if success:
            # Test authentication
            auth_success, auth_message, token = await service.authenticate_user(
                "test@example.com", "SecurePassword123!",
                "127.0.0.1", "Test-Agent/1.0"
            )
            print(f"Authentication: {auth_success}, {auth_message}")
            
            if token:
                # Test token validation
                valid, payload = await service.validate_jwt_token(token)
                print(f"Token validation: {valid}, {payload}")
    
    asyncio.run(test_auth())