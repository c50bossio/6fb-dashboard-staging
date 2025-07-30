#!/usr/bin/env python3
"""
Multiple Authentication Methods System
Supports Google, Apple, Facebook, and Email authentication with unified user management
"""

import sqlite3
import json
import os
import secrets
import bcrypt
import jwt
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass
import requests
from urllib.parse import urlencode
import base64
import hashlib

class AuthProvider(str, Enum):
    EMAIL = "email"
    GOOGLE = "google"
    APPLE = "apple"
    FACEBOOK = "facebook"

class UserRole(str, Enum):
    CUSTOMER = "customer"
    BARBER = "barber"
    MANAGER = "manager"
    ADMIN = "admin"

@dataclass
class AuthResult:
    """Authentication result"""
    success: bool
    user_id: Optional[int] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_info: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

@dataclass
class SocialAuthConfig:
    """Social authentication configuration"""
    client_id: str
    client_secret: str
    redirect_uri: str
    scopes: List[str]
    auth_url: str
    token_url: str
    user_info_url: str

class MultiAuthSystem:
    """Manages multiple authentication methods with unified user management"""
    
    def __init__(self):
        self.db_path = 'booking_system.db'
        self.jwt_secret = os.getenv("JWT_SECRET", "your-jwt-secret-change-in-production")
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24  # 24 hours
        self.refresh_token_expire_days = 30
        
        # Load social auth configurations
        self.auth_configs = self._load_auth_configs()
        
        # Create social auth table if needed
        self._init_social_auth_table()
    
    def _load_auth_configs(self) -> Dict[AuthProvider, SocialAuthConfig]:
        """Load social authentication configurations"""
        base_url = os.getenv("BASE_URL", "http://localhost:8002")
        
        return {
            AuthProvider.GOOGLE: SocialAuthConfig(
                client_id=os.getenv("GOOGLE_CLIENT_ID", "your-google-client-id"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET", "your-google-client-secret"),
                redirect_uri=f"{base_url}/api/v1/auth/google/callback",
                scopes=["openid", "email", "profile"],
                auth_url="https://accounts.google.com/o/oauth2/auth",
                token_url="https://oauth2.googleapis.com/token",
                user_info_url="https://www.googleapis.com/oauth2/v2/userinfo"
            ),
            AuthProvider.FACEBOOK: SocialAuthConfig(
                client_id=os.getenv("FACEBOOK_APP_ID", "your-facebook-app-id"),
                client_secret=os.getenv("FACEBOOK_APP_SECRET", "your-facebook-app-secret"),
                redirect_uri=f"{base_url}/api/v1/auth/facebook/callback",
                scopes=["email", "public_profile"],
                auth_url="https://www.facebook.com/v18.0/dialog/oauth",
                token_url="https://graph.facebook.com/v18.0/oauth/access_token",
                user_info_url="https://graph.facebook.com/me"
            ),
            AuthProvider.APPLE: SocialAuthConfig(
                client_id=os.getenv("APPLE_CLIENT_ID", "your-apple-client-id"),
                client_secret=os.getenv("APPLE_CLIENT_SECRET", "your-apple-client-secret"),
                redirect_uri=f"{base_url}/api/v1/auth/apple/callback",
                scopes=["name", "email"],
                auth_url="https://appleid.apple.com/auth/authorize",
                token_url="https://appleid.apple.com/auth/token",
                user_info_url=""  # Apple provides user info in ID token
            )
        }
    
    def _init_social_auth_table(self):
        """Initialize social authentication tracking table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS social_auth (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                provider TEXT NOT NULL,
                social_id TEXT NOT NULL,
                access_token TEXT,
                refresh_token TEXT,
                token_expires_at TIMESTAMP,
                profile_data TEXT, -- JSON
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(provider, social_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def register_email_user(self, email: str, password: str, full_name: str, 
                          phone: Optional[str] = None, role: UserRole = UserRole.CUSTOMER) -> AuthResult:
        """Register user with email and password"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if user already exists
            cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
            if cursor.fetchone():
                conn.close()
                return AuthResult(
                    success=False,
                    error_message="Email already registered"
                )
            
            # Hash password
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Insert new user
            cursor.execute("""
                INSERT INTO users (email, hashed_password, full_name, phone, role, auth_provider)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (email, hashed_password, full_name, phone, role.value, AuthProvider.EMAIL.value))
            
            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Generate tokens
            access_token = self._create_access_token({"sub": email, "user_id": user_id})
            refresh_token = self._create_refresh_token(user_id)
            
            return AuthResult(
                success=True,
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                user_info={
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "phone": phone,
                    "role": role.value,
                    "auth_provider": AuthProvider.EMAIL.value
                }
            )
            
        except Exception as e:
            return AuthResult(
                success=False,
                error_message=f"Registration error: {str(e)}"
            )
    
    def authenticate_email_user(self, email: str, password: str) -> AuthResult:
        """Authenticate user with email and password"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, hashed_password, full_name, phone, role, is_active
                FROM users WHERE email = ? AND auth_provider = ?
            """, (email, AuthProvider.EMAIL.value))
            
            user_data = cursor.fetchone()
            conn.close()
            
            if not user_data:
                return AuthResult(
                    success=False,
                    error_message="Invalid email or password"
                )
            
            user_id, hashed_password, full_name, phone, role, is_active = user_data
            
            if not is_active:
                return AuthResult(
                    success=False,
                    error_message="Account is disabled"
                )
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8')):
                return AuthResult(
                    success=False,
                    error_message="Invalid email or password"
                )
            
            # Generate tokens
            access_token = self._create_access_token({"sub": email, "user_id": user_id})
            refresh_token = self._create_refresh_token(user_id)
            
            return AuthResult(
                success=True,
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                user_info={
                    "id": user_id,
                    "email": email,
                    "full_name": full_name,
                    "phone": phone,
                    "role": role,
                    "auth_provider": AuthProvider.EMAIL.value
                }
            )
            
        except Exception as e:
            return AuthResult(
                success=False,
                error_message=f"Authentication error: {str(e)}"
            )
    
    def get_social_auth_url(self, provider: AuthProvider, state: Optional[str] = None) -> str:
        """Generate social authentication URL"""
        if provider not in self.auth_configs:
            raise ValueError(f"Unsupported provider: {provider}")
        
        config = self.auth_configs[provider]
        
        # Generate state for CSRF protection
        if not state:
            state = secrets.token_urlsafe(32)
        
        params = {
            "client_id": config.client_id,
            "redirect_uri": config.redirect_uri,
            "scope": " ".join(config.scopes),
            "response_type": "code",
            "state": state
        }
        
        # Provider-specific parameters
        if provider == AuthProvider.GOOGLE:
            params["access_type"] = "offline"
            params["include_granted_scopes"] = "true"
        elif provider == AuthProvider.APPLE:
            params["response_mode"] = "form_post"
        
        return f"{config.auth_url}?{urlencode(params)}"
    
    def handle_social_callback(self, provider: AuthProvider, code: str, state: str) -> AuthResult:
        """Handle social authentication callback"""
        try:
            # Exchange code for tokens
            token_data = self._exchange_code_for_tokens(provider, code)
            if not token_data:
                return AuthResult(
                    success=False,
                    error_message="Failed to exchange authorization code"
                )
            
            # Get user info
            user_info = self._get_social_user_info(provider, token_data)
            if not user_info:
                return AuthResult(
                    success=False,
                    error_message="Failed to retrieve user information"
                )
            
            # Find or create user
            user_result = self._find_or_create_social_user(provider, user_info, token_data)
            
            return user_result
            
        except Exception as e:
            return AuthResult(
                success=False,
                error_message=f"Social authentication error: {str(e)}"
            )
    
    def _exchange_code_for_tokens(self, provider: AuthProvider, code: str) -> Optional[Dict[str, Any]]:
        """Exchange authorization code for access tokens"""
        config = self.auth_configs[provider]
        
        data = {
            "client_id": config.client_id,
            "client_secret": config.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": config.redirect_uri
        }
        
        response = requests.post(config.token_url, data=data)
        
        if response.status_code == 200:
            return response.json()
        
        return None
    
    def _get_social_user_info(self, provider: AuthProvider, token_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Get user information from social provider"""
        config = self.auth_configs[provider]
        access_token = token_data.get("access_token")
        
        if provider == AuthProvider.APPLE:
            # Apple provides user info in ID token
            id_token = token_data.get("id_token")
            if id_token:
                # Decode JWT (simplified - should verify signature in production)
                payload = jwt.decode(id_token, options={"verify_signature": False})
                return {
                    "id": payload.get("sub"),
                    "email": payload.get("email"),
                    "name": payload.get("name", ""),
                    "email_verified": payload.get("email_verified", False)
                }
        else:
            # Google and Facebook
            headers = {"Authorization": f"Bearer {access_token}"}
            params = {}
            
            if provider == AuthProvider.FACEBOOK:
                params["fields"] = "id,name,email,picture"
            
            response = requests.get(config.user_info_url, headers=headers, params=params)
            
            if response.status_code == 200:
                return response.json()
        
        return None
    
    def _find_or_create_social_user(self, provider: AuthProvider, user_info: Dict[str, Any], 
                                  token_data: Dict[str, Any]) -> AuthResult:
        """Find existing user or create new user from social authentication"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Extract user information based on provider
        if provider == AuthProvider.GOOGLE:
            social_id = user_info.get("id")
            email = user_info.get("email")
            full_name = user_info.get("name", "")
            picture = user_info.get("picture")
        elif provider == AuthProvider.FACEBOOK:
            social_id = user_info.get("id")
            email = user_info.get("email")
            full_name = user_info.get("name", "")
            picture = user_info.get("picture", {}).get("data", {}).get("url")
        elif provider == AuthProvider.APPLE:
            social_id = user_info.get("id")
            email = user_info.get("email")
            full_name = user_info.get("name", "")
            picture = None
        
        try:
            # Check if social account already exists
            cursor.execute("""
                SELECT user_id FROM social_auth WHERE provider = ? AND social_id = ?
            """, (provider.value, social_id))
            
            social_auth_data = cursor.fetchone()
            
            if social_auth_data:
                # Existing social auth - get user
                user_id = social_auth_data[0]
                cursor.execute("""
                    SELECT email, full_name, phone, role, is_active
                    FROM users WHERE id = ?
                """, (user_id,))
                user_data = cursor.fetchone()
                
                if not user_data or not user_data[4]:  # is_active check
                    conn.close()
                    return AuthResult(
                        success=False,
                        error_message="Account is disabled"
                    )
                
                # Update social auth tokens
                cursor.execute("""
                    UPDATE social_auth 
                    SET access_token = ?, refresh_token = ?, 
                        token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND provider = ?
                """, (
                    token_data.get("access_token"),
                    token_data.get("refresh_token"),
                    datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)) if token_data.get("expires_in") else None,
                    user_id,
                    provider.value
                ))
                
            else:
                # Check if user exists by email
                cursor.execute("SELECT id, role FROM users WHERE email = ?", (email,))
                existing_user = cursor.fetchone()
                
                if existing_user:
                    # Link social account to existing user
                    user_id = existing_user[0]
                    role = existing_user[1]
                else:
                    # Create new user
                    cursor.execute("""
                        INSERT INTO users (email, full_name, role, auth_provider, profile_image_url)
                        VALUES (?, ?, ?, ?, ?)
                    """, (email, full_name, UserRole.CUSTOMER.value, provider.value, picture))
                    
                    user_id = cursor.lastrowid
                    role = UserRole.CUSTOMER.value
                
                # Create social auth record
                cursor.execute("""
                    INSERT INTO social_auth 
                    (user_id, provider, social_id, access_token, refresh_token, 
                     token_expires_at, profile_data)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    provider.value,
                    social_id,
                    token_data.get("access_token"),
                    token_data.get("refresh_token"),
                    datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)) if token_data.get("expires_in") else None,
                    json.dumps(user_info)
                ))
            
            conn.commit()
            
            # Get complete user data
            cursor.execute("""
                SELECT email, full_name, phone, role, profile_image_url
                FROM users WHERE id = ?
            """, (user_id,))
            user_data = cursor.fetchone()
            conn.close()
            
            # Generate tokens
            access_token = self._create_access_token({"sub": email, "user_id": user_id})
            refresh_token = self._create_refresh_token(user_id)
            
            return AuthResult(
                success=True,
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                user_info={
                    "id": user_id,
                    "email": user_data[0],
                    "full_name": user_data[1],
                    "phone": user_data[2],
                    "role": user_data[3],
                    "profile_image_url": user_data[4],
                    "auth_provider": provider.value
                }
            )
            
        except Exception as e:
            conn.rollback()
            conn.close()
            return AuthResult(
                success=False,
                error_message=f"Error creating/finding user: {str(e)}"
            )
    
    def refresh_access_token(self, refresh_token: str) -> AuthResult:
        """Refresh access token using refresh token"""
        try:
            # Verify refresh token
            payload = jwt.decode(refresh_token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user_id = payload.get("user_id")
            
            if not user_id:
                return AuthResult(
                    success=False,
                    error_message="Invalid refresh token"
                )
            
            # Get user data
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT email, full_name, phone, role, is_active
                FROM users WHERE id = ?
            """, (user_id,))
            
            user_data = cursor.fetchone()
            conn.close()
            
            if not user_data or not user_data[4]:
                return AuthResult(
                    success=False,
                    error_message="User not found or inactive"
                )
            
            # Generate new access token
            access_token = self._create_access_token({"sub": user_data[0], "user_id": user_id})
            
            return AuthResult(
                success=True,
                user_id=user_id,
                access_token=access_token,
                refresh_token=refresh_token,  # Keep same refresh token
                user_info={
                    "id": user_id,
                    "email": user_data[0],
                    "full_name": user_data[1],
                    "phone": user_data[2],
                    "role": user_data[3]
                }
            )
            
        except jwt.ExpiredSignatureError:
            return AuthResult(
                success=False,
                error_message="Refresh token expired"
            )
        except jwt.InvalidTokenError:
            return AuthResult(
                success=False,
                error_message="Invalid refresh token"
            )
        except Exception as e:
            return AuthResult(
                success=False,
                error_message=f"Token refresh error: {str(e)}"
            )
    
    def link_social_account(self, user_id: int, provider: AuthProvider, 
                          authorization_code: str) -> AuthResult:
        """Link additional social account to existing user"""
        try:
            # Exchange code for tokens
            token_data = self._exchange_code_for_tokens(provider, authorization_code)
            if not token_data:
                return AuthResult(
                    success=False,
                    error_message="Failed to exchange authorization code"
                )
            
            # Get user info
            user_info = self._get_social_user_info(provider, token_data)
            if not user_info:
                return AuthResult(
                    success=False,
                    error_message="Failed to retrieve user information"
                )
            
            # Extract social ID
            social_id = user_info.get("id")
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if social account is already linked to another user
            cursor.execute("""
                SELECT user_id FROM social_auth WHERE provider = ? AND social_id = ?
            """, (provider.value, social_id))
            
            existing_link = cursor.fetchone()
            if existing_link and existing_link[0] != user_id:
                conn.close()
                return AuthResult(
                    success=False,
                    error_message="Social account is already linked to another user"
                )
            
            # Create or update social auth record
            cursor.execute("""
                INSERT OR REPLACE INTO social_auth 
                (user_id, provider, social_id, access_token, refresh_token, 
                 token_expires_at, profile_data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                provider.value,
                social_id,
                token_data.get("access_token"),
                token_data.get("refresh_token"),
                datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)) if token_data.get("expires_in") else None,
                json.dumps(user_info)
            ))
            
            conn.commit()
            conn.close()
            
            return AuthResult(
                success=True,
                user_id=user_id,
                user_info={"message": f"{provider.value.title()} account linked successfully"}
            )
            
        except Exception as e:
            return AuthResult(
                success=False,
                error_message=f"Account linking error: {str(e)}"
            )
    
    def get_user_auth_methods(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all authentication methods for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get user's primary auth method
        cursor.execute("""
            SELECT auth_provider, email FROM users WHERE id = ?
        """, (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return []
        
        auth_methods = [{
            "provider": user_data[0],
            "identifier": user_data[1],
            "is_primary": True,
            "linked_at": None
        }]
        
        # Get linked social accounts
        cursor.execute("""
            SELECT provider, social_id, created_at, profile_data
            FROM social_auth WHERE user_id = ?
        """, (user_id,))
        
        for row in cursor.fetchall():
            profile_data = json.loads(row[3]) if row[3] else {}
            auth_methods.append({
                "provider": row[0],
                "identifier": row[1],
                "is_primary": False,
                "linked_at": row[2],
                "profile_data": profile_data
            })
        
        conn.close()
        return auth_methods
    
    def unlink_social_account(self, user_id: int, provider: AuthProvider) -> bool:
        """Unlink social account from user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM social_auth WHERE user_id = ? AND provider = ?
        """, (user_id, provider.value))
        
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        return rows_affected > 0
    
    def _create_access_token(self, data: Dict[str, Any]) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        to_encode = data.copy()
        to_encode.update({"exp": expire, "type": "access"})
        
        return jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def _create_refresh_token(self, user_id: int) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode = {"user_id": user_id, "exp": expire, "type": "refresh"}
        
        return jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)

# Initialize multi-auth system instance
multi_auth_system = MultiAuthSystem()