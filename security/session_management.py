#!/usr/bin/env python3
"""
Secure Session Management for 6FB AI Agent System
Implements secure session handling with Redis backend, token blacklisting, and session security controls.
"""

import os
import time
import json
import hashlib
import secrets
import logging
from typing import Dict, Optional, Any, Set, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from fastapi import HTTPException, Request, status
import jwt
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

@dataclass
class SessionData:
    """Session data structure"""
    user_id: str
    email: str
    role: str
    tenant_id: Optional[str] = None
    created_at: float = None
    last_activity: float = None
    ip_address: str = None
    user_agent: str = None
    device_fingerprint: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = time.time()
        if self.last_activity is None:
            self.last_activity = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            'user_id': self.user_id,
            'email': self.email,
            'role': self.role,
            'tenant_id': self.tenant_id,
            'created_at': self.created_at,
            'last_activity': self.last_activity,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'device_fingerprint': self.device_fingerprint
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionData':
        """Create from dictionary"""
        return cls(**data)

class SecureSessionManager:
    """
    Secure session management with multiple security features:
    - JWT token with secure signing
    - Session storage with Redis backend
    - Token blacklisting for secure logout
    - Session hijacking protection
    - Device fingerprinting
    - IP address validation
    - Session timeout management
    """
    
    def __init__(self, redis_client=None):
        self.redis_client = redis_client
        self.memory_sessions = {}  # Fallback for development
        self.blacklisted_tokens = set()  # In-memory blacklist for fallback
        
        # Get configuration from environment
        self.secret_key = os.getenv('JWT_SECRET_KEY')
        if not self.secret_key:
            raise ValueError("JWT_SECRET_KEY environment variable is required")
        
        self.session_secret = os.getenv('SESSION_SECRET')
        if not self.session_secret:
            raise ValueError("SESSION_SECRET environment variable is required")
        
        # Session configuration
        self.access_token_lifetime = timedelta(minutes=30)  # Short-lived access tokens
        self.refresh_token_lifetime = timedelta(days=7)     # Longer refresh tokens
        self.session_lifetime = timedelta(hours=8)          # Session lifetime
        self.max_sessions_per_user = 5                      # Max concurrent sessions
        
        # Security settings
        self.require_ip_consistency = os.getenv('NODE_ENV') == 'production'
        self.require_device_consistency = os.getenv('NODE_ENV') == 'production'
        self.enable_session_rotation = True
        
        logger.info(f"Session manager initialized (Redis: {'enabled' if redis_client else 'disabled'})")
    
    def _generate_device_fingerprint(self, request: Request) -> str:
        """Generate device fingerprint from request headers"""
        
        user_agent = request.headers.get('User-Agent', '')
        accept_language = request.headers.get('Accept-Language', '')
        accept_encoding = request.headers.get('Accept-Encoding', '')
        
        # Create fingerprint from stable headers
        fingerprint_data = f"{user_agent}|{accept_language}|{accept_encoding}"
        
        # Hash for privacy and consistency
        return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:16]
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address with proxy support"""
        
        # Check forwarded headers
        forwarded_for = request.headers.get('X-Forwarded-For')
        if forwarded_for:
            return forwarded_for.split(',')[0].strip()
        
        real_ip = request.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else '127.0.0.1'
    
    def _generate_session_id(self) -> str:
        """Generate cryptographically secure session ID"""
        return secrets.token_urlsafe(32)
    
    def _generate_csrf_token(self, session_id: str) -> str:
        """Generate CSRF token tied to session"""
        
        csrf_data = f"{session_id}:{self.session_secret}:{time.time()}"
        return hashlib.sha256(csrf_data.encode()).hexdigest()[:32]
    
    async def _store_session(self, session_id: str, session_data: SessionData) -> bool:
        """Store session data with Redis backend"""
        
        try:
            if self.redis_client:
                # Store in Redis with expiration
                session_json = json.dumps(session_data.to_dict())
                await self.redis_client.setex(
                    f"session:{session_id}",
                    int(self.session_lifetime.total_seconds()),
                    session_json
                )
                return True
            else:
                # Fallback to memory storage
                self.memory_sessions[session_id] = session_data
                return True
                
        except Exception as e:
            logger.error(f"Failed to store session {session_id}: {e}")
            return False
    
    async def _get_session(self, session_id: str) -> Optional[SessionData]:
        """Retrieve session data"""
        
        try:
            if self.redis_client:
                session_json = await self.redis_client.get(f"session:{session_id}")
                if session_json:
                    session_dict = json.loads(session_json)
                    return SessionData.from_dict(session_dict)
            else:
                # Fallback to memory storage
                return self.memory_sessions.get(session_id)
                
        except Exception as e:
            logger.error(f"Failed to retrieve session {session_id}: {e}")
        
        return None
    
    async def _delete_session(self, session_id: str) -> bool:
        """Delete session data"""
        
        try:
            if self.redis_client:
                await self.redis_client.delete(f"session:{session_id}")
            else:
                self.memory_sessions.pop(session_id, None)
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
            return False
    
    async def _blacklist_token(self, token_jti: str, expires_at: float):
        """Add token to blacklist"""
        
        try:
            if self.redis_client:
                # Store blacklisted token until it expires
                ttl = max(1, int(expires_at - time.time()))
                await self.redis_client.setex(f"blacklist:{token_jti}", ttl, "1")
            else:
                # Fallback to memory blacklist
                self.blacklisted_tokens.add(token_jti)
                
        except Exception as e:
            logger.error(f"Failed to blacklist token {token_jti}: {e}")
    
    async def _is_token_blacklisted(self, token_jti: str) -> bool:
        """Check if token is blacklisted"""
        
        try:
            if self.redis_client:
                result = await self.redis_client.get(f"blacklist:{token_jti}")
                return result is not None
            else:
                return token_jti in self.blacklisted_tokens
                
        except Exception as e:
            logger.error(f"Failed to check blacklist for token {token_jti}: {e}")
            return False
    
    async def create_session(self, 
                           user_id: str, 
                           email: str, 
                           role: str, 
                           request: Request,
                           tenant_id: str = None) -> Tuple[str, str, str]:
        """
        Create new session and return access token, refresh token, and CSRF token
        
        Returns:
            Tuple of (access_token, refresh_token, csrf_token)
        """
        
        # Generate session ID
        session_id = self._generate_session_id()
        
        # Create session data
        session_data = SessionData(
            user_id=user_id,
            email=email,
            role=role,
            tenant_id=tenant_id,
            ip_address=self._get_client_ip(request),
            user_agent=request.headers.get('User-Agent', ''),
            device_fingerprint=self._generate_device_fingerprint(request)
        )
        
        # Store session
        success = await self._store_session(session_id, session_data)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        
        # Generate tokens
        now = datetime.utcnow()
        
        # Access token (short-lived)
        access_token_data = {
            'user_id': user_id,
            'email': email,
            'role': role,
            'tenant_id': tenant_id,
            'session_id': session_id,
            'type': 'access',
            'iat': now,
            'exp': now + self.access_token_lifetime,
            'jti': secrets.token_urlsafe(16)  # Unique token ID for blacklisting
        }
        
        access_token = jwt.encode(access_token_data, self.secret_key, algorithm='HS256')
        
        # Refresh token (longer-lived)
        refresh_token_data = {
            'user_id': user_id,
            'session_id': session_id,
            'type': 'refresh',
            'iat': now,
            'exp': now + self.refresh_token_lifetime,
            'jti': secrets.token_urlsafe(16)
        }
        
        refresh_token = jwt.encode(refresh_token_data, self.secret_key, algorithm='HS256')
        
        # CSRF token
        csrf_token = self._generate_csrf_token(session_id)
        
        logger.info(f"Created session for user {user_id} (session: {session_id})")
        
        return access_token, refresh_token, csrf_token
    
    async def validate_session(self, 
                             access_token: str, 
                             request: Request) -> Tuple[SessionData, Dict[str, Any]]:
        """
        Validate access token and return session data
        
        Returns:
            Tuple of (session_data, token_payload)
        """
        
        try:
            # Decode token
            payload = jwt.decode(access_token, self.secret_key, algorithms=['HS256'])
            
            # Check token type
            if payload.get('type') != 'access':
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            
            # Check if token is blacklisted
            token_jti = payload.get('jti')
            if token_jti and await self._is_token_blacklisted(token_jti):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
            
            # Get session data
            session_id = payload.get('session_id')
            if not session_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid session"
                )
            
            session_data = await self._get_session(session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session not found or expired"
                )
            
            # Security validations
            if self.require_ip_consistency:
                current_ip = self._get_client_ip(request)
                if current_ip != session_data.ip_address:
                    logger.warning(f"IP address mismatch for session {session_id}: {current_ip} != {session_data.ip_address}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session security violation"
                    )
            
            if self.require_device_consistency:
                current_fingerprint = self._generate_device_fingerprint(request)
                if current_fingerprint != session_data.device_fingerprint:
                    logger.warning(f"Device fingerprint mismatch for session {session_id}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Session security violation"
                    )
            
            # Update last activity
            session_data.last_activity = time.time()
            await self._store_session(session_id, session_data)
            
            return session_data, payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Session validation error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session validation failed"
            )
    
    async def refresh_session(self, 
                            refresh_token: str, 
                            request: Request) -> Tuple[str, str]:
        """
        Refresh access token using refresh token
        
        Returns:
            Tuple of (new_access_token, new_refresh_token)
        """
        
        try:
            # Decode refresh token
            payload = jwt.decode(refresh_token, self.secret_key, algorithms=['HS256'])
            
            # Check token type
            if payload.get('type') != 'refresh':
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            # Check if token is blacklisted
            token_jti = payload.get('jti')
            if token_jti and await self._is_token_blacklisted(token_jti):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token has been revoked"
                )
            
            # Get session data
            session_id = payload.get('session_id')
            session_data = await self._get_session(session_id)
            if not session_data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session not found or expired"
                )
            
            # Blacklist old refresh token if rotation is enabled
            if self.enable_session_rotation and token_jti:
                expires_at = payload.get('exp', time.time())
                await self._blacklist_token(token_jti, expires_at)
            
            # Create new tokens
            return await self.create_session(
                session_data.user_id,
                session_data.email,
                session_data.role,
                request,
                session_data.tenant_id
            )
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {str(e)}"
            )
    
    async def revoke_session(self, access_token: str) -> bool:
        """
        Revoke session and blacklist tokens
        """
        
        try:
            # Decode token to get session info
            payload = jwt.decode(access_token, self.secret_key, algorithms=['HS256'])
            
            session_id = payload.get('session_id')
            token_jti = payload.get('jti')
            
            # Delete session
            if session_id:
                await self._delete_session(session_id)
            
            # Blacklist access token
            if token_jti:
                expires_at = payload.get('exp', time.time())
                await self._blacklist_token(token_jti, expires_at)
            
            logger.info(f"Revoked session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke session: {e}")
            return False
    
    async def revoke_all_user_sessions(self, user_id: str) -> int:
        """
        Revoke all sessions for a user (e.g., on password change)
        
        Returns:
            Number of sessions revoked
        """
        
        revoked_count = 0
        
        try:
            if self.redis_client:
                # Find all sessions for user
                pattern = f"session:*"
                cursor = 0
                
                while True:
                    cursor, keys = await self.redis_client.scan(cursor, match=pattern, count=100)
                    
                    for key in keys:
                        session_json = await self.redis_client.get(key)
                        if session_json:
                            session_dict = json.loads(session_json)
                            if session_dict.get('user_id') == user_id:
                                await self.redis_client.delete(key)
                                revoked_count += 1
                    
                    if cursor == 0:
                        break
            else:
                # Memory fallback
                sessions_to_remove = []
                for session_id, session_data in self.memory_sessions.items():
                    if session_data.user_id == user_id:
                        sessions_to_remove.append(session_id)
                
                for session_id in sessions_to_remove:
                    del self.memory_sessions[session_id]
                    revoked_count += 1
            
            logger.info(f"Revoked {revoked_count} sessions for user {user_id}")
            return revoked_count
            
        except Exception as e:
            logger.error(f"Failed to revoke user sessions: {e}")
            return 0

# Global session manager instance
session_manager = None

def get_session_manager(redis_client=None) -> SecureSessionManager:
    """Get or create session manager instance"""
    
    global session_manager
    if session_manager is None:
        session_manager = SecureSessionManager(redis_client)
    return session_manager

# FastAPI dependency for session validation
async def get_current_session(request: Request, token: str = None) -> Tuple[SessionData, Dict[str, Any]]:
    """
    FastAPI dependency to get current session from request
    """
    
    if not token:
        # Try to get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header missing or invalid"
            )
        token = auth_header.split(' ')[1]
    
    session_mgr = get_session_manager()
    return await session_mgr.validate_session(token, request)

# Export main components
__all__ = [
    'SecureSessionManager',
    'SessionData',
    'get_session_manager',
    'get_current_session'
]