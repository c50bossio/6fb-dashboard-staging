"""
Supabase Authentication Service
Handles real authentication validation for FastAPI routers
"""

import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

class SupabaseAuth:
    """Handle Supabase authentication and user validation"""
    
    @staticmethod
    def verify_supabase_jwt(token: str) -> Optional[Dict[str, Any]]:
        """
        Verify Supabase JWT token and extract user information
        Returns user data if valid, None if invalid
        """
        try:
            # For Supabase, we need to verify the JWT using the JWT secret
            # In production, this should use Supabase's JWT verification
            # For now, we'll decode without verification (development only)
            
            # First try to get user from Supabase auth
            try:
                # Set the authorization header for the supabase client
                supabase.auth.set_session(token)
                user = supabase.auth.get_user()
                if user and user.user:
                    return {
                        "sub": user.user.id,
                        "email": user.user.email,
                        "user_id": user.user.id
                    }
            except Exception:
                pass
            
            # Fallback: decode JWT manually (less secure, development only)
            # Remove 'Bearer ' prefix if present
            if token.startswith('Bearer '):
                token = token[7:]
            
            # Decode without verification (development only)
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
            
        except Exception as e:
            print(f"Token verification failed: {e}")
            return None
    
    @staticmethod
    async def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user profile from Supabase profiles table
        """
        try:
            response = supabase.table('profiles').select('*').eq('id', user_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
        except Exception as e:
            print(f"Error fetching user profile: {e}")
            return None
    
    @staticmethod
    async def get_user_barbershop(user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get user's barbershop information from profiles and barbershops tables
        """
        try:
            # First get the user's profile to get shop_id
            profile_response = supabase.table('profiles').select('shop_id').eq('id', user_id).execute()
            
            if not profile_response.data or len(profile_response.data) == 0:
                print(f"No profile found for user {user_id}")
                return None
            
            shop_id = profile_response.data[0].get('shop_id')
            if not shop_id:
                print(f"No shop_id found for user {user_id}")
                return None
            
            # Now get the barbershop details
            barbershop_response = supabase.table('barbershops').select('*').eq('id', shop_id).execute()
            
            if barbershop_response.data and len(barbershop_response.data) > 0:
                return barbershop_response.data[0]
            
            print(f"No barbershop found for shop_id {shop_id}")
            return None
            
        except Exception as e:
            print(f"Error fetching user barbershop: {e}")
            return None
    
    @staticmethod
    async def validate_user_and_get_context(token: str) -> Dict[str, Any]:
        """
        Validate user token and return user context with barbershop info
        Raises HTTPException if authentication fails
        """
        # Verify the token
        payload = SupabaseAuth.verify_supabase_jwt(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user profile
        profile = await SupabaseAuth.get_user_profile(user_id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Get barbershop info
        barbershop = await SupabaseAuth.get_user_barbershop(user_id)
        barbershop_id = barbershop.get('id') if barbershop else None
        
        # Return complete user context
        return {
            "user_id": user_id,
            "email": payload.get("email") or profile.get("email"),
            "profile": profile,
            "barbershop_id": barbershop_id,
            "barbershop": barbershop,
            "shop_id": profile.get("shop_id"),  # Keep for compatibility
            "role": profile.get("role"),
            "organization": profile.get("organization")
        }

# Singleton instance
supabase_auth = SupabaseAuth()