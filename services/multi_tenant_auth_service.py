"""
Multi-Tenant Authentication Service - Phase 6 Enterprise Architecture
Advanced authentication and role-based access control for multi-tenant platform
"""

import asyncio
import json
import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import sqlite3
import os
import jwt
from functools import wraps

# Import tenant management for context
try:
    from .tenant_management_service import tenant_management_service
    TENANT_SERVICE_AVAILABLE = True
except ImportError:
    TENANT_SERVICE_AVAILABLE = False

logger = logging.getLogger(__name__)

class MultiTenantAuthService:
    """
    Advanced multi-tenant authentication service with role-based access control
    Handles user authentication, tenant resolution, and permission management
    """
    
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'agent_system.db')
        self.jwt_secret = os.getenv('JWT_SECRET', 'fallback-secret-key')
        
        # Role hierarchy and permissions
        self.role_hierarchy = {
            'owner': 100,
            'admin': 80,
            'manager': 60,
            'member': 40,
            'viewer': 20
        }
        
        # Permission definitions
        self.permissions = {
            # Analytics permissions
            'analytics.view': ['owner', 'admin', 'manager', 'member', 'viewer'],
            'analytics.export': ['owner', 'admin', 'manager'],
            'analytics.configure': ['owner', 'admin'],
            
            # Forecasting permissions
            'forecasting.view': ['owner', 'admin', 'manager', 'member'],
            'forecasting.advanced': ['owner', 'admin'],
            'forecasting.configure': ['owner', 'admin'],
            
            # Alerts permissions
            'alerts.view': ['owner', 'admin', 'manager', 'member', 'viewer'],
            'alerts.acknowledge': ['owner', 'admin', 'manager', 'member'],
            'alerts.configure': ['owner', 'admin', 'manager'],
            'alerts.manage': ['owner', 'admin'],
            
            # Recommendations permissions
            'recommendations.view': ['owner', 'admin', 'manager'],
            'recommendations.implement': ['owner', 'admin', 'manager'],
            'recommendations.configure': ['owner', 'admin'],
            
            # User management permissions
            'users.view': ['owner', 'admin', 'manager'],
            'users.invite': ['owner', 'admin', 'manager'],
            'users.manage': ['owner', 'admin'],
            'users.delete': ['owner'],
            
            # Tenant management permissions
            'tenant.view': ['owner', 'admin', 'manager', 'member', 'viewer'],
            'tenant.configure': ['owner', 'admin'],
            'tenant.billing': ['owner'],
            'tenant.delete': ['owner'],
            
            # Integration permissions
            'integrations.view': ['owner', 'admin', 'manager'],
            'integrations.configure': ['owner', 'admin'],
            'integrations.manage': ['owner', 'admin'],
            
            # Platform admin permissions (super user)
            'platform.admin': [],  # Only for platform admin tenant
            'platform.tenants': [],
            'platform.billing': [],
            'platform.analytics': []
        }
        
        logger.info("✅ Multi-Tenant Authentication Service initialized")

    # ============================================================================
    # AUTHENTICATION CORE
    # ============================================================================

    async def authenticate_user(self, token: str) -> Optional[Dict[str, Any]]:
        """Authenticate user and resolve tenant context"""
        try:
            # Decode JWT token (in production, this would integrate with Supabase)
            # For now, simulate token validation
            user_data = self._decode_token(token)
            if not user_data:
                return None
            
            # Get user's tenant memberships
            tenant_memberships = await self.get_user_tenant_memberships(user_data['user_id'])
            if not tenant_memberships:
                return None
            
            # Return authenticated user with tenant context
            return {
                'user_id': user_data['user_id'],
                'email': user_data['email'],
                'tenant_memberships': tenant_memberships,
                'current_tenant': tenant_memberships[0] if tenant_memberships else None,
                'is_platform_admin': self._is_platform_admin(tenant_memberships),
                'authenticated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            return None

    async def resolve_tenant_from_request(self, request_data: Dict[str, Any]) -> Optional[str]:
        """Resolve tenant from request context (subdomain, header, parameter)"""
        try:
            # Priority order for tenant resolution:
            # 1. Explicit tenant parameter
            # 2. Subdomain
            # 3. X-Tenant-ID header
            # 4. User's default tenant
            
            # Check explicit tenant parameter
            tenant_slug = request_data.get('tenant')
            if tenant_slug:
                tenant = await self._get_tenant_by_slug(tenant_slug)
                return tenant['id'] if tenant else None
            
            # Check subdomain (e.g., johns-barbershop.6fb.ai)
            host = request_data.get('host', '')
            if '.' in host:
                subdomain = host.split('.')[0]
                if subdomain and subdomain != 'www':
                    tenant = await self._get_tenant_by_slug(subdomain)
                    return tenant['id'] if tenant else None
            
            # Check X-Tenant-ID header
            tenant_id = request_data.get('x-tenant-id')
            if tenant_id:
                return tenant_id
            
            # Use user's default tenant
            user_id = request_data.get('user_id')
            if user_id:
                memberships = await self.get_user_tenant_memberships(user_id)
                return memberships[0]['tenant_id'] if memberships else None
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Tenant resolution error: {e}")
            return None

    async def verify_tenant_access(self, user_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Verify user has access to tenant and return role/permissions"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT role, permissions, status, first_name, last_name
                    FROM tenant_users 
                    WHERE user_id = ? AND tenant_id = ? AND status = 'active'
                ''', (user_id, tenant_id))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                role, custom_permissions, status, first_name, last_name = row
                
                # Parse custom permissions
                try:
                    custom_perms = json.loads(custom_permissions) if custom_permissions else []
                except json.JSONDecodeError:
                    custom_perms = []
                
                # Get role-based permissions
                role_permissions = self._get_role_permissions(role)
                
                # Combine permissions
                all_permissions = list(set(role_permissions + custom_perms))
                
                return {
                    'tenant_id': tenant_id,
                    'role': role,
                    'permissions': all_permissions,
                    'role_level': self.role_hierarchy.get(role, 0),
                    'first_name': first_name,
                    'last_name': last_name,
                    'is_tenant_owner': role == 'owner',
                    'verified_at': datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Tenant access verification error: {e}")
            return None

    # ============================================================================
    # ROLE-BASED ACCESS CONTROL (RBAC)
    # ============================================================================

    def has_permission(self, user_permissions: List[str], required_permission: str) -> bool:
        """Check if user has specific permission"""
        return required_permission in user_permissions

    def has_role_level(self, user_role: str, required_role: str) -> bool:
        """Check if user has minimum role level"""
        user_level = self.role_hierarchy.get(user_role, 0)
        required_level = self.role_hierarchy.get(required_role, 100)
        return user_level >= required_level

    def can_manage_user(self, manager_role: str, target_role: str) -> bool:
        """Check if manager can manage target user"""
        manager_level = self.role_hierarchy.get(manager_role, 0)
        target_level = self.role_hierarchy.get(target_role, 0)
        
        # Can manage users with lower role level
        return manager_level > target_level

    def _get_role_permissions(self, role: str) -> List[str]:
        """Get all permissions for a role"""
        permissions = []
        for permission, allowed_roles in self.permissions.items():
            if role in allowed_roles:
                permissions.append(permission)
        return permissions

    def require_permission(self, permission: str):
        """Decorator to require specific permission"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Extract user context from kwargs or args
                user_context = kwargs.get('user_context') or (args[1] if len(args) > 1 else None)
                
                if not user_context or not isinstance(user_context, dict):
                    raise ValueError("User context required for permission check")
                
                user_permissions = user_context.get('permissions', [])
                if not self.has_permission(user_permissions, permission):
                    raise PermissionError(f"Permission denied: {permission}")
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator

    def require_role(self, required_role: str):
        """Decorator to require minimum role level"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                user_context = kwargs.get('user_context') or (args[1] if len(args) > 1 else None)
                
                if not user_context or not isinstance(user_context, dict):
                    raise ValueError("User context required for role check")
                
                user_role = user_context.get('role')
                if not self.has_role_level(user_role, required_role):
                    raise PermissionError(f"Role denied: requires {required_role}, has {user_role}")
                
                return await func(*args, **kwargs)
            return wrapper
        return decorator

    # ============================================================================
    # USER TENANT MEMBERSHIPS
    # ============================================================================

    async def get_user_tenant_memberships(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tenant memberships for a user"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT tu.tenant_id, tu.role, tu.status, tu.joined_at,
                           t.name, t.slug, t.plan_tier, t.status as tenant_status
                    FROM tenant_users tu
                    JOIN tenants t ON tu.tenant_id = t.id
                    WHERE tu.user_id = ? AND tu.status = 'active' AND t.status = 'active'
                    ORDER BY tu.joined_at
                ''', (user_id,))
                
                columns = [description[0] for description in cursor.description]
                memberships = [dict(zip(columns, row)) for row in cursor.fetchall()]
                
                return memberships
                
        except Exception as e:
            logger.error(f"❌ Error getting user tenant memberships: {e}")
            return []

    async def switch_tenant_context(self, user_id: str, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Switch user's active tenant context"""
        try:
            # Verify user has access to target tenant
            access = await self.verify_tenant_access(user_id, tenant_id)
            if not access:
                return None
            
            # Get tenant information
            tenant = await self._get_tenant_by_id(tenant_id)
            if not tenant:
                return None
            
            return {
                'success': True,
                'tenant': tenant,
                'access': access,
                'switched_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error switching tenant context: {e}")
            return None

    # ============================================================================
    # USER INVITATION SYSTEM
    # ============================================================================

    async def invite_user_to_tenant(self, tenant_id: str, inviter_user_id: str, invitation_data: Dict[str, Any]) -> Dict[str, Any]:
        """Invite user to join tenant"""
        try:
            # Verify inviter has permission
            inviter_access = await self.verify_tenant_access(inviter_user_id, tenant_id)
            if not inviter_access or not self.has_permission(inviter_access['permissions'], 'users.invite'):
                return {'success': False, 'error': 'Permission denied'}
            
            # Validate invitation data
            required_fields = ['email', 'role']
            for field in required_fields:
                if field not in invitation_data:
                    return {'success': False, 'error': f'Missing required field: {field}'}
            
            # Check if user already invited or member
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Check existing membership
                cursor.execute('''
                    SELECT id FROM tenant_users 
                    WHERE tenant_id = ? AND email = ?
                ''', (tenant_id, invitation_data['email']))
                
                if cursor.fetchone():
                    return {'success': False, 'error': 'User already a member'}
                
                # Check pending invitation
                cursor.execute('''
                    SELECT id FROM tenant_invitations 
                    WHERE tenant_id = ? AND email = ? AND status = 'pending'
                ''', (tenant_id, invitation_data['email']))
                
                if cursor.fetchone():
                    return {'success': False, 'error': 'Invitation already pending'}
            
            # Generate invitation token
            invitation_token = secrets.token_urlsafe(32)
            invitation_id = self._generate_uuid()
            expires_at = datetime.now() + timedelta(days=7)
            
            # Store invitation
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO tenant_invitations (
                        id, tenant_id, email, role, invited_by, invitation_token,
                        message, expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    invitation_id, tenant_id, invitation_data['email'], 
                    invitation_data['role'], inviter_user_id, invitation_token,
                    invitation_data.get('message', ''), expires_at.isoformat()
                ))
                conn.commit()
            
            # In production, send email here
            invitation_url = f"/accept-invitation?token={invitation_token}"
            
            logger.info(f"✅ User invited to tenant: {invitation_data['email']} → {tenant_id}")
            return {
                'success': True,
                'invitation_id': invitation_id,
                'invitation_url': invitation_url,
                'expires_at': expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error inviting user to tenant: {e}")
            return {'success': False, 'error': str(e)}

    async def accept_invitation(self, invitation_token: str, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Accept tenant invitation"""
        try:
            # Find and validate invitation
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT id, tenant_id, email, role, expires_at
                    FROM tenant_invitations
                    WHERE invitation_token = ? AND status = 'pending'
                ''', (invitation_token,))
                
                row = cursor.fetchone()
                if not row:
                    return {'success': False, 'error': 'Invalid or expired invitation'}
                
                invitation_id, tenant_id, email, role, expires_at = row
                
                # Check expiry
                if datetime.fromisoformat(expires_at) < datetime.now():
                    cursor.execute('''
                        UPDATE tenant_invitations 
                        SET status = 'expired' 
                        WHERE id = ?
                    ''', (invitation_id,))
                    conn.commit()
                    return {'success': False, 'error': 'Invitation expired'}
                
                # Create tenant user
                user_id = self._generate_uuid()
                cursor.execute('''
                    INSERT INTO tenant_users (
                        id, tenant_id, user_id, role, first_name, last_name, 
                        email, status, joined_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id, tenant_id, user_data.get('user_id', user_id),
                    role, user_data.get('first_name'), user_data.get('last_name'),
                    email, 'active', datetime.now().isoformat()
                ))
                
                # Mark invitation as accepted
                cursor.execute('''
                    UPDATE tenant_invitations 
                    SET status = 'accepted', accepted_at = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), invitation_id))
                
                conn.commit()
            
            logger.info(f"✅ Invitation accepted: {email} → {tenant_id}")
            return {
                'success': True,
                'tenant_id': tenant_id,
                'role': role,
                'user_id': user_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error accepting invitation: {e}")
            return {'success': False, 'error': str(e)}

    # ============================================================================
    # UTILITY METHODS
    # ============================================================================

    def _decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decode JWT token (simplified for demo)"""
        try:
            # In production, this would validate Supabase JWT
            # For now, return mock user data
            return {
                'user_id': 'demo-user-123',
                'email': 'demo@6fb.ai',
                'iat': datetime.now().timestamp()
            }
        except Exception:
            return None

    async def _get_tenant_by_id(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Get tenant by ID"""
        if TENANT_SERVICE_AVAILABLE:
            return await tenant_management_service.get_tenant(tenant_id=tenant_id)
        return None

    async def _get_tenant_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        """Get tenant by slug"""
        if TENANT_SERVICE_AVAILABLE:
            return await tenant_management_service.get_tenant(slug=slug)
        return None

    def _is_platform_admin(self, tenant_memberships: List[Dict[str, Any]]) -> bool:
        """Check if user is platform admin"""
        platform_admin_tenant_id = '00000000-0000-0000-0000-000000000000'
        for membership in tenant_memberships:
            if membership['tenant_id'] == platform_admin_tenant_id:
                return True
        return False

    def _generate_uuid(self) -> str:
        """Generate UUID for database records"""
        import uuid
        return str(uuid.uuid4())

    # ============================================================================
    # SESSION MANAGEMENT 
    # ============================================================================

    async def create_session(self, user_id: str, tenant_id: str) -> Dict[str, Any]:
        """Create authenticated session with tenant context"""
        try:
            # Verify access
            access = await self.verify_tenant_access(user_id, tenant_id)
            if not access:
                return {'success': False, 'error': 'Access denied'}
            
            # Create session token
            session_data = {
                'user_id': user_id,
                'tenant_id': tenant_id,
                'role': access['role'],
                'permissions': access['permissions'],
                'iat': datetime.now().timestamp(),
                'exp': (datetime.now() + timedelta(hours=24)).timestamp()
            }
            
            session_token = jwt.encode(session_data, self.jwt_secret, algorithm='HS256')
            
            return {
                'success': True,
                'session_token': session_token,
                'expires_at': datetime.fromtimestamp(session_data['exp']).isoformat(),
                'user_context': access
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating session: {e}")
            return {'success': False, 'error': str(e)}

    async def validate_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return user context"""
        try:
            session_data = jwt.decode(session_token, self.jwt_secret, algorithms=['HS256'])
            
            # Check expiry
            if session_data['exp'] < datetime.now().timestamp():
                return None
            
            # Verify current access (in case permissions changed)
            current_access = await self.verify_tenant_access(
                session_data['user_id'], 
                session_data['tenant_id']
            )
            
            if not current_access:
                return None
            
            return {
                'user_id': session_data['user_id'],
                'tenant_id': session_data['tenant_id'],
                'role': current_access['role'],
                'permissions': current_access['permissions'],
                'role_level': current_access['role_level'],
                'session_valid': True
            }
            
        except jwt.InvalidTokenError:
            return None
        except Exception as e:
            logger.error(f"❌ Session validation error: {e}")
            return None

# Create global service instance
multi_tenant_auth_service = MultiTenantAuthService()