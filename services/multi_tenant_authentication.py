"""
Multi-Tenant Authentication Service
Handles role-based access control, franchise isolation, and user permissions
across the multi-location franchise system
"""

import os
import sqlite3
import jwt
import bcrypt
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum
import logging
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# ENUMS AND DATA MODELS
# ==========================================

class UserRole(Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    FRANCHISE_OWNER = "FRANCHISE_OWNER"
    REGIONAL_MANAGER = "REGIONAL_MANAGER"
    SHOP_OWNER = "SHOP_OWNER"
    SHOP_MANAGER = "SHOP_MANAGER"
    BARBER = "BARBER"
    RECEPTIONIST = "RECEPTIONIST"
    CLIENT = "CLIENT"

class CrossLocationPermission(Enum):
    VIEW_ALL_LOCATIONS = "VIEW_ALL_LOCATIONS"
    MANAGE_ALL_LOCATIONS = "MANAGE_ALL_LOCATIONS"
    VIEW_REGION_LOCATIONS = "VIEW_REGION_LOCATIONS"
    MANAGE_REGION_LOCATIONS = "MANAGE_REGION_LOCATIONS"
    TRANSFER_CUSTOMERS = "TRANSFER_CUSTOMERS"
    VIEW_FRANCHISE_ANALYTICS = "VIEW_FRANCHISE_ANALYTICS"
    MANAGE_FRANCHISE_SETTINGS = "MANAGE_FRANCHISE_SETTINGS"

@dataclass
class UserSession:
    """User session data"""
    user_id: str
    email: str
    name: str
    role: UserRole
    primary_franchise_id: Optional[str]
    primary_location_id: Optional[str]
    primary_region_id: Optional[str]
    accessible_franchise_ids: List[str]
    accessible_location_ids: List[str]
    accessible_region_ids: List[str]
    cross_location_permissions: List[CrossLocationPermission]
    session_token: str
    expires_at: datetime
    is_system_admin: bool = False

@dataclass
class AuthenticationResult:
    """Authentication operation result"""
    success: bool
    user_session: Optional[UserSession] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    requires_2fa: bool = False
    temp_token: Optional[str] = None

@dataclass
class PermissionCheck:
    """Permission check result"""
    allowed: bool
    reason: Optional[str] = None
    required_permissions: Optional[List[str]] = None

# ==========================================
# ROLE-BASED PERMISSION SYSTEM
# ==========================================

class PermissionMatrix:
    """Defines permissions for each role"""
    
    ROLE_PERMISSIONS = {
        UserRole.SUPER_ADMIN: {
            'franchises': ['create', 'read', 'update', 'delete', 'list_all'],
            'locations': ['create', 'read', 'update', 'delete', 'list_all'],
            'users': ['create', 'read', 'update', 'delete', 'list_all', 'assign_roles'],
            'customers': ['read', 'update', 'delete', 'list_all', 'merge', 'export'],
            'appointments': ['read', 'update', 'cancel', 'list_all'],
            'analytics': ['read_all', 'export_all'],
            'settings': ['read', 'update', 'system_config'],
            'billing': ['read', 'update', 'process_payments']
        },
        
        UserRole.FRANCHISE_OWNER: {
            'franchises': ['read_own', 'update_own'],
            'locations': ['create', 'read_franchise', 'update_franchise', 'delete_own'],
            'users': ['create_staff', 'read_franchise', 'update_staff', 'delete_staff'],
            'customers': ['read_franchise', 'update_franchise', 'list_franchise', 'merge_franchise'],
            'appointments': ['read_franchise', 'update_franchise', 'list_franchise'],
            'analytics': ['read_franchise', 'export_franchise'],
            'settings': ['read_franchise', 'update_franchise'],
            'billing': ['read_franchise', 'view_statements']
        },
        
        UserRole.REGIONAL_MANAGER: {
            'franchises': ['read_assigned'],
            'locations': ['read_region', 'update_region'],
            'users': ['read_region', 'update_staff_region'],
            'customers': ['read_region', 'update_region', 'list_region'],
            'appointments': ['read_region', 'update_region', 'list_region'],
            'analytics': ['read_region', 'export_region'],
            'settings': ['read_region', 'update_operational']
        },
        
        UserRole.SHOP_OWNER: {
            'locations': ['read_own', 'update_own'],
            'users': ['create_staff_location', 'read_location', 'update_staff_location'],
            'customers': ['read_location', 'update_location', 'list_location'],
            'appointments': ['create', 'read_location', 'update_location', 'cancel_location'],
            'analytics': ['read_location'],
            'settings': ['read_location', 'update_location']
        },
        
        UserRole.SHOP_MANAGER: {
            'users': ['read_location', 'update_schedule'],
            'customers': ['create', 'read_location', 'update_location', 'list_location'],
            'appointments': ['create', 'read_location', 'update_location', 'cancel_location'],
            'analytics': ['read_location'],
            'settings': ['read_location']
        },
        
        UserRole.BARBER: {
            'customers': ['read_own_clients', 'update_own_clients'],
            'appointments': ['read_own', 'update_own', 'cancel_own'],
            'analytics': ['read_own_performance'],
            'settings': ['read_profile', 'update_profile']
        },
        
        UserRole.RECEPTIONIST: {
            'customers': ['create', 'read_location', 'update_basic'],
            'appointments': ['create', 'read_location', 'update_basic', 'cancel_location'],
            'settings': ['read_location']
        },
        
        UserRole.CLIENT: {
            'appointments': ['create_own', 'read_own', 'cancel_own'],
            'customers': ['read_own', 'update_own'],
            'settings': ['read_profile', 'update_profile']
        }
    }
    
    @classmethod
    def has_permission(cls, role: UserRole, resource: str, action: str) -> bool:
        """Check if role has permission for resource/action"""
        role_perms = cls.ROLE_PERMISSIONS.get(role, {})
        resource_perms = role_perms.get(resource, [])
        return action in resource_perms
    
    @classmethod
    def get_role_permissions(cls, role: UserRole) -> Dict[str, List[str]]:
        """Get all permissions for a role"""
        return cls.ROLE_PERMISSIONS.get(role, {})

# ==========================================
# MULTI-TENANT AUTHENTICATION SERVICE
# ==========================================

class MultiTenantAuthService:
    """
    Multi-tenant authentication service with franchise isolation
    """
    
    def __init__(
        self,
        db_path: str = "database/agent_system.db",
        jwt_secret: Optional[str] = None,
        session_duration_hours: int = 8
    ):
        self.db_path = db_path
        self.jwt_secret = jwt_secret or os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this')
        self.session_duration_hours = session_duration_hours
        self._init_database()
        
    def _init_database(self):
        """Initialize authentication tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Enhanced users table for multi-tenant auth
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                email_verified BOOLEAN DEFAULT 0,
                name TEXT NOT NULL,
                phone TEXT,
                hashed_password TEXT,
                role TEXT DEFAULT 'CLIENT',
                is_active BOOLEAN DEFAULT 1,
                is_system_admin BOOLEAN DEFAULT 0,
                
                -- Franchise Association
                primary_franchise_id TEXT,
                primary_location_id TEXT,
                primary_region_id TEXT,
                
                -- Cross-location Permissions (JSON array)
                cross_location_permissions TEXT,
                accessible_location_ids TEXT, -- JSON array
                accessible_region_ids TEXT,   -- JSON array
                
                -- Personal Information
                avatar_url TEXT,
                timezone TEXT DEFAULT 'UTC',
                preferred_language TEXT DEFAULT 'en',
                
                -- OAuth Integration
                google_id TEXT UNIQUE,
                facebook_id TEXT UNIQUE,
                
                -- Security
                password_reset_token TEXT,
                password_reset_expires TIMESTAMP,
                two_factor_secret TEXT,
                two_factor_enabled BOOLEAN DEFAULT 0,
                login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP,
                last_login TIMESTAMP,
                
                -- Employee Specific Fields
                employee_id TEXT,
                hire_date DATE,
                employment_status TEXT,
                hourly_rate DECIMAL(8,2),
                commission_rate DECIMAL(5,4) DEFAULT 0.20,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # User sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                session_token TEXT UNIQUE NOT NULL,
                refresh_token TEXT UNIQUE,
                
                -- Session metadata
                device_info TEXT,
                ip_address TEXT,
                user_agent TEXT,
                
                -- Tenant context
                current_franchise_id TEXT,
                current_location_id TEXT,
                current_region_id TEXT,
                
                -- Session lifecycle
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT 1
            )
        ''')
        
        # User location access table (many-to-many)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_location_access (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                location_id TEXT,
                franchise_id TEXT,
                
                -- Access Level
                access_level TEXT NOT NULL, -- 'FULL_ACCESS', 'READ_ONLY', 'APPOINTMENTS_ONLY'
                permissions TEXT, -- JSON object
                
                -- Employment Details (if staff)
                position_title TEXT,
                start_date DATE,
                end_date DATE,
                is_primary_location BOOLEAN DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(user_id, location_id)
            )
        ''')
        
        # Permission audit log
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS permission_audit_log (
                id TEXT PRIMARY KEY,
                user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
                action TEXT NOT NULL,
                resource TEXT NOT NULL,
                resource_id TEXT,
                
                -- Context
                franchise_id TEXT,
                location_id TEXT,
                
                -- Result
                allowed BOOLEAN NOT NULL,
                reason TEXT,
                
                -- Metadata
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_franchise ON users(primary_franchise_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_user_location_access_user ON user_location_access(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id)')
        
        conn.commit()
        conn.close()
        logger.info("Multi-tenant authentication database initialized")

    @contextmanager
    def get_db_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # ==========================================
    # AUTHENTICATION OPERATIONS
    # ==========================================

    def authenticate_user(
        self,
        email: str,
        password: str,
        device_info: Optional[Dict[str, str]] = None
    ) -> AuthenticationResult:
        """Authenticate user and create session"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get user by email
                cursor.execute('''
                    SELECT * FROM users 
                    WHERE email = ? AND is_active = 1
                ''', (email.lower().strip(),))
                
                user_row = cursor.fetchone()
                
                if not user_row:
                    self._log_auth_attempt(email, False, "User not found")
                    return AuthenticationResult(
                        success=False,
                        error="Invalid email or password",
                        error_code="INVALID_CREDENTIALS"
                    )
                
                # Check if account is locked
                if user_row['locked_until'] and datetime.fromisoformat(user_row['locked_until']) > datetime.utcnow():
                    return AuthenticationResult(
                        success=False,
                        error="Account is temporarily locked",
                        error_code="ACCOUNT_LOCKED"
                    )
                
                # Verify password
                if not bcrypt.checkpw(password.encode('utf-8'), user_row['hashed_password'].encode('utf-8')):
                    # Increment failed attempts
                    self._increment_failed_attempts(user_row['id'])
                    return AuthenticationResult(
                        success=False,
                        error="Invalid email or password",
                        error_code="INVALID_CREDENTIALS"
                    )
                
                # Check if 2FA is enabled
                if user_row['two_factor_enabled']:
                    # Generate temporary token for 2FA verification
                    temp_token = self._generate_temp_2fa_token(user_row['id'])
                    return AuthenticationResult(
                        success=True,
                        requires_2fa=True,
                        temp_token=temp_token
                    )
                
                # Create user session
                session_result = self._create_user_session(user_row, device_info)
                
                if not session_result.success:
                    return AuthenticationResult(
                        success=False,
                        error="Failed to create session",
                        error_code="SESSION_ERROR"
                    )
                
                # Reset failed attempts
                cursor.execute('''
                    UPDATE users 
                    SET login_attempts = 0, last_login = CURRENT_TIMESTAMP 
                    WHERE id = ?
                ''', (user_row['id'],))
                conn.commit()
                
                self._log_auth_attempt(email, True, "Successful login")
                
                return AuthenticationResult(
                    success=True,
                    user_session=session_result.data
                )
                
        except Exception as e:
            error_msg = f"Authentication failed: {str(e)}"
            logger.error(error_msg)
            return AuthenticationResult(
                success=False,
                error=error_msg,
                error_code="AUTH_ERROR"
            )

    def validate_session(self, session_token: str) -> AuthenticationResult:
        """Validate session token and return user session"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get session and user data
                cursor.execute('''
                    SELECT s.*, u.*
                    FROM user_sessions s
                    JOIN users u ON s.user_id = u.id
                    WHERE s.session_token = ? 
                      AND s.is_active = 1 
                      AND s.expires_at > CURRENT_TIMESTAMP
                      AND u.is_active = 1
                ''', (session_token,))
                
                session_row = cursor.fetchone()
                
                if not session_row:
                    return AuthenticationResult(
                        success=False,
                        error="Invalid or expired session",
                        error_code="INVALID_SESSION"
                    )
                
                # Update last used timestamp
                cursor.execute('''
                    UPDATE user_sessions 
                    SET last_used_at = CURRENT_TIMESTAMP 
                    WHERE session_token = ?
                ''', (session_token,))
                conn.commit()
                
                # Build user session object
                user_session = self._build_user_session_from_row(session_row)
                
                return AuthenticationResult(
                    success=True,
                    user_session=user_session
                )
                
        except Exception as e:
            error_msg = f"Session validation failed: {str(e)}"
            logger.error(error_msg)
            return AuthenticationResult(
                success=False,
                error=error_msg,
                error_code="VALIDATION_ERROR"
            )

    def check_permission(
        self,
        user_session: UserSession,
        resource: str,
        action: str,
        resource_id: Optional[str] = None,
        franchise_id: Optional[str] = None,
        location_id: Optional[str] = None
    ) -> PermissionCheck:
        """Check if user has permission for specific action"""
        try:
            # Super admin has all permissions
            if user_session.is_system_admin:
                return PermissionCheck(allowed=True, reason="System administrator")
            
            # Check basic role permissions
            if not PermissionMatrix.has_permission(user_session.role, resource, action):
                return PermissionCheck(
                    allowed=False,
                    reason=f"Role {user_session.role.value} does not have permission for {action} on {resource}",
                    required_permissions=[f"{resource}:{action}"]
                )
            
            # Check franchise isolation
            if franchise_id and not self._check_franchise_access(user_session, franchise_id):
                return PermissionCheck(
                    allowed=False,
                    reason="No access to specified franchise"
                )
            
            # Check location access
            if location_id and not self._check_location_access(user_session, location_id):
                return PermissionCheck(
                    allowed=False,
                    reason="No access to specified location"
                )
            
            return PermissionCheck(allowed=True)
            
        except Exception as e:
            logger.error(f"Permission check failed: {str(e)}")
            return PermissionCheck(
                allowed=False,
                reason=f"Permission check error: {str(e)}"
            )

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def _create_user_session(self, user_row: sqlite3.Row, device_info: Optional[Dict[str, str]] = None) -> Any:
        """Create new user session"""
        try:
            session_id = str(uuid.uuid4())
            session_token = self._generate_session_token()
            refresh_token = self._generate_refresh_token()
            expires_at = datetime.utcnow() + timedelta(hours=self.session_duration_hours)
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get user's accessible resources
                accessible_locations = self._get_user_accessible_locations(user_row['id'])
                accessible_franchises = self._get_user_accessible_franchises(user_row['id'])
                accessible_regions = self._get_user_accessible_regions(user_row['id'])
                
                # Create session record
                cursor.execute('''
                    INSERT INTO user_sessions (
                        id, user_id, session_token, refresh_token,
                        device_info, current_franchise_id, current_location_id,
                        expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    session_id,
                    user_row['id'],
                    session_token,
                    refresh_token,
                    json.dumps(device_info or {}),
                    user_row['primary_franchise_id'],
                    user_row['primary_location_id'],
                    expires_at
                ))
                conn.commit()
                
                # Build user session object
                user_session = UserSession(
                    user_id=user_row['id'],
                    email=user_row['email'],
                    name=user_row['name'],
                    role=UserRole(user_row['role']),
                    primary_franchise_id=user_row['primary_franchise_id'],
                    primary_location_id=user_row['primary_location_id'],
                    primary_region_id=user_row['primary_region_id'],
                    accessible_franchise_ids=accessible_franchises,
                    accessible_location_ids=accessible_locations,
                    accessible_region_ids=accessible_regions,
                    cross_location_permissions=self._parse_cross_location_permissions(user_row['cross_location_permissions']),
                    session_token=session_token,
                    expires_at=expires_at,
                    is_system_admin=bool(user_row['is_system_admin'])
                )
                
                return type('Result', (), {'success': True, 'data': user_session})()
                
        except Exception as e:
            logger.error(f"Failed to create user session: {str(e)}")
            return type('Result', (), {'success': False, 'error': str(e)})()

    def _build_user_session_from_row(self, row: sqlite3.Row) -> UserSession:
        """Build UserSession object from database row"""
        return UserSession(
            user_id=row['user_id'],
            email=row['email'],
            name=row['name'],
            role=UserRole(row['role']),
            primary_franchise_id=row['primary_franchise_id'],
            primary_location_id=row['primary_location_id'],
            primary_region_id=row['primary_region_id'],
            accessible_franchise_ids=self._get_user_accessible_franchises(row['user_id']),
            accessible_location_ids=self._get_user_accessible_locations(row['user_id']),
            accessible_region_ids=self._get_user_accessible_regions(row['user_id']),
            cross_location_permissions=self._parse_cross_location_permissions(row['cross_location_permissions']),
            session_token=row['session_token'],
            expires_at=datetime.fromisoformat(row['expires_at']),
            is_system_admin=bool(row['is_system_admin'])
        )

    def _check_franchise_access(self, user_session: UserSession, franchise_id: str) -> bool:
        """Check if user has access to franchise"""
        return (
            franchise_id in user_session.accessible_franchise_ids or
            franchise_id == user_session.primary_franchise_id or
            user_session.is_system_admin
        )

    def _check_location_access(self, user_session: UserSession, location_id: str) -> bool:
        """Check if user has access to location"""
        return (
            location_id in user_session.accessible_location_ids or
            location_id == user_session.primary_location_id or
            user_session.is_system_admin
        )

    def _get_user_accessible_locations(self, user_id: str) -> List[str]:
        """Get all location IDs user can access"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT DISTINCT location_id 
                    FROM user_location_access 
                    WHERE user_id = ? AND end_date IS NULL
                ''', (user_id,))
                
                return [row['location_id'] for row in cursor.fetchall() if row['location_id']]
                
        except Exception as e:
            logger.error(f"Failed to get accessible locations: {str(e)}")
            return []

    def _get_user_accessible_franchises(self, user_id: str) -> List[str]:
        """Get all franchise IDs user can access"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT DISTINCT franchise_id 
                    FROM user_location_access 
                    WHERE user_id = ? AND franchise_id IS NOT NULL
                ''', (user_id,))
                
                return [row['franchise_id'] for row in cursor.fetchall() if row['franchise_id']]
                
        except Exception as e:
            logger.error(f"Failed to get accessible franchises: {str(e)}")
            return []

    def _get_user_accessible_regions(self, user_id: str) -> List[str]:
        """Get all region IDs user can access"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT accessible_region_ids FROM users WHERE id = ?
                ''', (user_id,))
                
                result = cursor.fetchone()
                if result and result['accessible_region_ids']:
                    return json.loads(result['accessible_region_ids'])
                
                return []
                
        except Exception as e:
            logger.error(f"Failed to get accessible regions: {str(e)}")
            return []

    def _parse_cross_location_permissions(self, permissions_json: Optional[str]) -> List[CrossLocationPermission]:
        """Parse cross-location permissions from JSON"""
        if not permissions_json:
            return []
        
        try:
            permission_names = json.loads(permissions_json)
            return [CrossLocationPermission(name) for name in permission_names]
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse cross-location permissions: {str(e)}")
            return []

    def _generate_session_token(self) -> str:
        """Generate secure session token"""
        payload = {
            'type': 'session',
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(hours=self.session_duration_hours),
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')

    def _generate_refresh_token(self) -> str:
        """Generate refresh token"""
        payload = {
            'type': 'refresh',
            'iat': datetime.utcnow(),
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')

    def _generate_temp_2fa_token(self, user_id: str) -> str:
        """Generate temporary token for 2FA verification"""
        payload = {
            'type': '2fa_temp',
            'user_id': user_id,
            'iat': datetime.utcnow(),
            'exp': datetime.utcnow() + timedelta(minutes=5),
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(payload, self.jwt_secret, algorithm='HS256')

    def _increment_failed_attempts(self, user_id: str):
        """Increment failed login attempts and lock account if needed"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE users 
                    SET login_attempts = login_attempts + 1,
                        locked_until = CASE 
                            WHEN login_attempts + 1 >= 5 
                            THEN datetime('now', '+30 minutes')
                            ELSE locked_until 
                        END
                    WHERE id = ?
                ''', (user_id,))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to increment failed attempts: {str(e)}")

    def _log_auth_attempt(self, email: str, success: bool, reason: str):
        """Log authentication attempt"""
        logger.info(f"Auth attempt for {email}: {'SUCCESS' if success else 'FAILED'} - {reason}")

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Initialize service
    auth_service = MultiTenantAuthService()
    
    print("Multi-tenant authentication service initialized successfully!")