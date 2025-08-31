#!/bin/bash

# 6FB AI Agent System - Supabase Integration Setup Script
# This script configures your system to use Supabase for auth and database

echo "🚀 Setting up 6FB AI Agent System with Supabase..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if environment variables are set
echo -e "${YELLOW}Step 1: Checking Supabase environment variables...${NC}"
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env && grep -q "SUPABASE_SERVICE_ROLE_KEY" .env; then
    echo -e "${GREEN}✅ Supabase credentials found in .env${NC}"
else
    echo "⚠️  Supabase credentials not found. Please add to .env:"
    echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url"
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    exit 1
fi

# Step 2: Install Python dependencies
echo -e "${YELLOW}Step 2: Installing Python dependencies...${NC}"
pip install supabase fastapi uvicorn python-dotenv pydantic

# Step 3: Kill any existing processes on ports
echo -e "${YELLOW}Step 3: Cleaning up existing processes...${NC}"
lsof -ti:8001 | xargs kill -9 2>/dev/null || true
echo -e "${GREEN}✅ Ports cleared${NC}"

# Step 4: Start the Supabase backend
echo -e "${YELLOW}Step 4: Starting Supabase backend...${NC}"
if [ -f "supabase_backend.py" ]; then
    python supabase_backend.py &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Supabase backend started (PID: $BACKEND_PID)${NC}"
else
    echo "⚠️  supabase_backend.py not found. Creating it now..."
    cat > supabase_backend.py << 'EOF'
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

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting 6FB AI Agent System Supabase Backend on port 8001...")
    uvicorn.run(app, host="0.0.0.0", port=8001)
EOF
    python supabase_backend.py &
    BACKEND_PID=$!
    echo -e "${GREEN}✅ Created and started supabase_backend.py${NC}"
fi

# Step 5: Check if Next.js is running
echo -e "${YELLOW}Step 5: Checking Next.js frontend...${NC}"
if lsof -Pi :9999 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✅ Next.js is running on port 9999${NC}"
else
    echo "Starting Next.js frontend..."
    npm run dev &
    echo -e "${GREEN}✅ Next.js started${NC}"
fi

# Step 6: Wait for services to be ready
echo -e "${YELLOW}Step 6: Waiting for services to be ready...${NC}"
sleep 3

# Step 7: Test the services
echo -e "${YELLOW}Step 7: Testing services...${NC}"

# Test backend health
if curl -s http://localhost:8001/health | grep -q "healthy"; then
    echo -e "${GREEN}✅ Backend is healthy${NC}"
else
    echo "⚠️  Backend health check failed"
fi

# Test frontend
if curl -s http://localhost:9999 | grep -q "BookedBarber"; then
    echo -e "${GREEN}✅ Frontend is responding${NC}"
else
    echo "⚠️  Frontend not responding"
fi

echo ""
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Go to your Supabase dashboard"
echo "2. Open SQL Editor and run /database/MASTER_SCHEMA.sql"
echo "3. Visit http://localhost:9999/login to create an account"
echo "4. Test the integration at http://localhost:9999/test-integration"
echo ""
echo "🔗 Key URLs:"
echo "   Login: http://localhost:9999/login"
echo "   Dashboard: http://localhost:9999/dashboard"
echo "   Backend Health: http://localhost:8001/health"
echo "   Test Page: http://localhost:9999/test-integration"
echo ""
echo "📝 To stop services:"
echo "   kill $BACKEND_PID  # Stop backend"
echo "   lsof -ti:9999 | xargs kill -9  # Stop frontend"