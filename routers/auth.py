"""
Authentication endpoints - UPDATED TO USE SUPABASE
Handles user authentication validation and profile management
NOTE: This module now focuses on token validation since Supabase handles auth
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import os

# Import our Supabase authentication service
from services.supabase_auth import supabase_auth

# Response models
class UserProfile(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    shop_name: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    created_at: Optional[datetime] = None

class UserContext(BaseModel):
    user_id: str
    email: str
    barbershop_id: Optional[str] = None
    barbershop_name: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None

# Create router
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# Security
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """Get current authenticated user from Supabase"""
    token = credentials.credentials
    return await supabase_auth.validate_user_and_get_context(token)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[Dict[str, Any]]:
    """Get current authenticated user (optional - doesn't raise error if no auth)"""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        return await supabase_auth.validate_user_and_get_context(token)
    except HTTPException:
        return None

@router.post("/logout")
async def logout_user(current_user: dict = Depends(get_current_user)):
    """Logout user - token invalidation handled by frontend"""
    return {
        "message": "Successfully logged out",
        "user_id": current_user.get("user_id")
    }

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile from Supabase"""
    profile = current_user.get("profile", {})
    
    return UserProfile(
        id=current_user.get("user_id"),
        email=current_user.get("email"),
        full_name=profile.get("full_name"),
        shop_name=profile.get("shop_name"),
        organization=profile.get("organization"),
        role=profile.get("role"),
        created_at=profile.get("created_at")
    )

@router.get("/context", response_model=UserContext)
async def get_user_context(current_user: dict = Depends(get_current_user)):
    """Get user context including barbershop information"""
    barbershop = current_user.get("barbershop", {})
    
    return UserContext(
        user_id=current_user.get("user_id"),
        email=current_user.get("email"),
        barbershop_id=current_user.get("barbershop_id"),
        barbershop_name=barbershop.get("name"),
        role=current_user.get("role"),
        organization=current_user.get("organization")
    )

@router.get("/validate")
async def validate_token(current_user: dict = Depends(get_current_user)):
    """Validate current authentication token"""
    return {
        "valid": True,
        "user_id": current_user.get("user_id"),
        "email": current_user.get("email"),
        "barbershop_id": current_user.get("barbershop_id"),
        "has_barbershop": current_user.get("barbershop_id") is not None
    }