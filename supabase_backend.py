#!/usr/bin/env python3
"""
Supabase-connected FastAPI backend for 6FB AI Agent System
"""
from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
import os
from datetime import datetime, timedelta
from supabase import create_client, Client
import jwt
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="6FB AI Agent System API - Supabase Backend")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Using service role for backend operations
)

# Models
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Authentication dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify JWT token and return current user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # Verify token with Supabase
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}"
        )

@app.get("/")
async def root():
    return {
        "message": "6FB AI Agent System Backend (Supabase)",
        "status": "running",
        "database": "supabase"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    try:
        # Test Supabase connection
        result = supabase.table("profiles").select("id").limit(1).execute()
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/v1/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserSignup):
    """Register a new user"""
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name,
                    "phone": user_data.phone
                }
            }
        })
        
        if auth_response.user:
            # Create profile in profiles table
            profile_data = {
                "id": auth_response.user.id,
                "email": user_data.email,
                "full_name": user_data.full_name,
                "phone": user_data.phone,
                "role": "CLIENT",
                "created_at": datetime.now().isoformat()
            }
            
            supabase.table("profiles").insert(profile_data).execute()
            
            return {
                "access_token": auth_response.session.access_token,
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "full_name": user_data.full_name
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create user"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    """Login with email and password"""
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })
        
        if auth_response.user and auth_response.session:
            # Get user profile
            profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
            
            return {
                "access_token": auth_response.session.access_token,
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email,
                    "full_name": profile.data.get("full_name") if profile.data else None,
                    "role": profile.data.get("role") if profile.data else "CLIENT"
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@app.post("/api/v1/auth/logout")
async def logout(current_user=Depends(get_current_user)):
    """Logout current user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        return {"message": "Logout completed", "note": str(e)}

@app.get("/api/v1/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    """Get current user information"""
    try:
        # Get full profile from database
        profile = supabase.table("profiles").select("*").eq("id", current_user.user.id).single().execute()
        
        if profile.data:
            return {
                "id": current_user.user.id,
                "email": current_user.user.email,
                "profile": profile.data
            }
        else:
            return {
                "id": current_user.user.id,
                "email": current_user.user.email,
                "profile": None
            }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user profile: {str(e)}"
        )

# ==========================================
# DASHBOARD API ENDPOINTS
# ==========================================

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user=Depends(get_current_user)):
    """Get dashboard statistics for the current user"""
    try:
        user_id = current_user.user.id
        
        # Get user's barbershop association
        profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        
        if not profile.data:
            return {"error": "Profile not found"}
        
        barbershop_id = profile.data.get("shop_id") or profile.data.get("barbershop_id")
        
        if not barbershop_id:
            # User has no barbershop association yet
            return {
                "appointments_today": 0,
                "total_revenue": 0,
                "new_customers": 0,
                "total_customers": 0,
                "message": "No barbershop associated with this account"
            }
        
        # Get today's appointments
        today = datetime.now().date().isoformat()
        appointments = supabase.table("appointments").select("*").eq("barbershop_id", barbershop_id).eq("date", today).execute()
        
        # Get customers
        customers = supabase.table("customers").select("*").eq("barbershop_id", barbershop_id).execute()
        
        # Calculate stats
        stats = {
            "appointments_today": len(appointments.data) if appointments.data else 0,
            "total_revenue": sum(apt.get("price", 0) for apt in (appointments.data or [])),
            "new_customers": len([c for c in (customers.data or []) if c.get("created_at", "").startswith(today)]),
            "total_customers": len(customers.data) if customers.data else 0
        }
        
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dashboard stats: {str(e)}"
        )

@app.get("/api/services")
async def get_services(current_user=Depends(get_current_user)):
    """Get services for the user's barbershop"""
    try:
        # Get user's barbershop
        profile = supabase.table("profiles").select("*").eq("id", current_user.user.id).single().execute()
        barbershop_id = profile.data.get("shop_id") or profile.data.get("barbershop_id") if profile.data else None
        
        if not barbershop_id:
            return []
        
        # Get services
        services = supabase.table("services").select("*").eq("shop_id", barbershop_id).execute()
        return services.data or []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get services: {str(e)}"
        )

@app.get("/api/appointments")
async def get_appointments(current_user=Depends(get_current_user)):
    """Get appointments for the user's barbershop"""
    try:
        # Get user's barbershop
        profile = supabase.table("profiles").select("*").eq("id", current_user.user.id).single().execute()
        barbershop_id = profile.data.get("shop_id") or profile.data.get("barbershop_id") if profile.data else None
        
        if not barbershop_id:
            return []
        
        # Get appointments with related data
        appointments = supabase.table("appointments").select("*, customers(*), services(*)").eq("barbershop_id", barbershop_id).execute()
        return appointments.data or []
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get appointments: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting 6FB AI Agent System Supabase Backend on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)