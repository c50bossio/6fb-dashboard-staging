"""
Supabase Auth Service for 6FB AI Agent System
Handles authentication using Supabase Auth
"""

import os
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from supabase import create_client, Client
from gotrue.errors import AuthApiError

logger = logging.getLogger(__name__)

class SupabaseAuthService:
    """Handle authentication with Supabase Auth"""
    
    def __init__(self):
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            logger.error("Missing Supabase credentials for auth")
            self.client = None
        else:
            try:
                self.client: Client = create_client(self.supabase_url, self.supabase_key)
                logger.info("✅ Supabase Auth service initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase Auth: {e}")
                self.client = None
    
    async def signup(self, email: str, password: str, full_name: str) -> Dict[str, Any]:
        """Create a new user account"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            # Sign up user with Supabase Auth
            response = self.client.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "full_name": full_name
                    }
                }
            })
            
            if response.user:
                # Create/update profile in profiles table
                profile_data = {
                    "id": response.user.id,
                    "email": email,
                    "full_name": full_name,
                    "role": "CLIENT",
                    "created_at": datetime.now().isoformat()
                }
                
                # Insert or update profile
                self.client.table('profiles').upsert(profile_data).execute()
                
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "full_name": full_name
                    },
                    "access_token": response.session.access_token if response.session else None,
                    "refresh_token": response.session.refresh_token if response.session else None
                }
            else:
                return {"success": False, "error": "Failed to create user"}
                
        except AuthApiError as e:
            logger.error(f"Signup error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Unexpected signup error: {e}")
            return {"success": False, "error": str(e)}
    
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            # Sign in with Supabase Auth
            response = self.client.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            if response.user and response.session:
                # Get user profile
                profile_result = self.client.table('profiles').select('*').eq('id', response.user.id).single().execute()
                
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "full_name": profile_result.data.get('full_name') if profile_result.data else None,
                        "role": profile_result.data.get('role') if profile_result.data else 'CLIENT'
                    },
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at
                }
            else:
                return {"success": False, "error": "Invalid credentials"}
                
        except AuthApiError as e:
            logger.error(f"Login error: {e}")
            return {"success": False, "error": "Invalid login credentials"}
        except Exception as e:
            logger.error(f"Unexpected login error: {e}")
            return {"success": False, "error": str(e)}
    
    async def logout(self, access_token: str) -> Dict[str, Any]:
        """Logout user"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            # Set the session to use the token for logout
            self.client.auth.set_session(access_token, "")
            self.client.auth.sign_out()
            return {"success": True, "message": "Logged out successfully"}
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_user(self, access_token: str) -> Dict[str, Any]:
        """Get current user from token"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            # Get user from token
            response = self.client.auth.get_user(access_token)
            
            if response and response.user:
                # Get full profile
                profile_result = self.client.table('profiles').select('*').eq('id', response.user.id).single().execute()
                
                return {
                    "success": True,
                    "user": {
                        "id": response.user.id,
                        "email": response.user.email,
                        "full_name": profile_result.data.get('full_name') if profile_result.data else None,
                        "role": profile_result.data.get('role') if profile_result.data else 'CLIENT',
                        "shop_id": profile_result.data.get('shop_id') if profile_result.data else None,
                        "barbershop_id": profile_result.data.get('barbershop_id') if profile_result.data else None
                    }
                }
            else:
                return {"success": False, "error": "Invalid token"}
                
        except Exception as e:
            logger.error(f"Get user error: {e}")
            return {"success": False, "error": "Invalid or expired token"}
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            response = self.client.auth.refresh_session(refresh_token)
            
            if response and response.session:
                return {
                    "success": True,
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token,
                    "expires_at": response.session.expires_at
                }
            else:
                return {"success": False, "error": "Failed to refresh token"}
                
        except Exception as e:
            logger.error(f"Refresh token error: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_profile(self, user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update user profile"""
        if not self.client:
            return {"success": False, "error": "Auth service not available"}
        
        try:
            # Update profile in profiles table
            result = self.client.table('profiles').update(profile_data).eq('id', user_id).execute()
            
            if result.data:
                return {
                    "success": True,
                    "profile": result.data[0]
                }
            else:
                return {"success": False, "error": "Profile not found"}
                
        except Exception as e:
            logger.error(f"Update profile error: {e}")
            return {"success": False, "error": str(e)}

# Global auth service instance
supabase_auth = SupabaseAuthService()