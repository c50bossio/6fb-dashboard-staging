#!/usr/bin/env python3
"""
FastAPI Server for 6FB AI Agent System Integration Demo
Simulates the enhanced_ai_agent_service.py with real RAG responses
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
import uvicorn
import asyncio
import json
from datetime import datetime, timedelta, timezone
import random
import jwt
import bcrypt
import os
import asyncpg
import sqlite3
import logging
from database.postgresql_config import db
import httpx
import base64
from urllib.parse import urlencode, parse_qs
from services.google_calendar_service import get_google_calendar_service

# AI Service Imports
import openai
import anthropic
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import agent coordination system
from services.orchestration.agent_coordination_api import router as agent_coordination_router

# Import executable agents
try:
    from services.executable_agents.marketing_execution_agent import ExecutableMarketingAgent
    EXECUTABLE_AGENTS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Executable agents not available: {e}")
    EXECUTABLE_AGENTS_AVAILABLE = False

app = FastAPI(title="6FB AI Agent System", description="Enhanced AI Agent System with 39-Agent Coordination")

# Configure logging
logger = logging.getLogger(__name__)

# Include agent coordination router
app.include_router(agent_coordination_router)

# AI Services Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')
GOOGLE_AI_API_KEY = os.getenv('GOOGLE_AI_API_KEY')

# Initialize AI clients
openai_client = None
anthropic_client = None

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
    openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)

if ANTHROPIC_API_KEY:
    anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

if GOOGLE_AI_API_KEY:
    genai.configure(api_key=GOOGLE_AI_API_KEY)

# Authentication Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Google Calendar Configuration
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:8001/api/v1/calendar/oauth/callback')
GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events'
]

# Security
security = HTTPBearer()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:9999"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await db.init_connection_pool()

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    await db.close_pool()

# Authentication Models (defined before they're used)
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    barbershop_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    barbershop_name: Optional[str] = None
    barbershop_id: Optional[str] = None
    is_active: bool

# Authentication utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hash a password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user_by_email(email: str) -> Optional[Dict]:
    """Get user by email from database"""
    return await db.get_user_by_email(email)

async def create_user(user: UserRegister) -> Dict:
    """Create new user in database"""
    hashed_password = get_password_hash(user.password)
    
    async with db.pool.acquire() as conn:
        # Create user with proper role
        role = 'SHOP_OWNER' if user.barbershop_name else 'CLIENT'
        
        user_row = await conn.fetchrow("""
            INSERT INTO users (email, hashed_password, name, role, is_active)
            VALUES ($1, $2, $3, $4, TRUE)
            RETURNING id, email, name, role, is_active, created_at
        """, user.email, hashed_password, user.full_name, role)
        
        user_dict = dict(user_row)
        
        # If user is a shop owner, create barbershop
        if user.barbershop_name and role == 'SHOP_OWNER':
            barbershop_row = await conn.fetchrow("""
                INSERT INTO barbershops (name, owner_id, booking_enabled, online_booking_enabled, ai_agent_enabled)
                VALUES ($1, $2, TRUE, TRUE, TRUE)
                RETURNING id, name
            """, user.barbershop_name, user_dict['id'])
            
            user_dict['barbershop_name'] = user.barbershop_name
            user_dict['barbershop_id'] = str(barbershop_row['id'])
        
        # Convert UUID to string for JSON serialization
        user_dict['id'] = str(user_dict['id'])
        user_dict['full_name'] = user_dict['name']  # For compatibility
        
        return user_dict

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = await get_user_by_email(email)
    if user is None:
        raise credentials_exception
    
    # Convert UUID to string for JSON serialization and map fields
    user['id'] = str(user['id'])
    user['full_name'] = user.get('name', '')  # Map name to full_name for compatibility
    
    return User(**user)

# Authentication Endpoints
@app.post("/api/v1/auth/register", response_model=Token)
async def register_user(user: UserRegister):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        new_user = await create_user(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user["email"]}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

@app.post("/api/v1/auth/login", response_model=Token)
async def login_user(user: UserLogin):
    """Login user and return JWT token"""
    try:
        # Get user from database
        db_user = await get_user_by_email(user.email)
        if not db_user or not verify_password(user.password, db_user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user["email"]}, expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {str(e)}"
        )

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@app.post("/api/v1/auth/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Logout user (client should delete token)"""
    return {"message": "Successfully logged out"}

# ==========================================
# CUSTOMER AUTHENTICATION ENDPOINTS
# ==========================================

@app.post("/api/v1/auth/customer/register")
async def register_customer(user: UserRegister):
    """Register a new customer account"""
    try:
        # Check if user already exists
        existing_user = await get_user_by_email(user.email)
        if existing_user:
            return {"success": False, "error": "Email already registered"}
        
        # Force role to CLIENT for customer registration
        user.role = 'CLIENT'
        
        # Create new customer user
        new_user = await create_user(user)
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user["email"]}, expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(new_user["id"]),
                "name": new_user["name"],
                "email": new_user["email"],
                "phone": new_user.get("phone"),
                "role": new_user["role"]
            },
            "message": "Account created successfully"
        }
        
    except Exception as e:
        logger.error(f"Error creating customer account: {str(e)}")
        return {"success": False, "error": "Failed to create account. Please try again."}

@app.post("/api/v1/auth/customer/login")
async def login_customer(user: UserLogin):
    """Login customer and return JWT token"""
    try:
        # Get user from database
        db_user = await get_user_by_email(user.email)
        if not db_user or not verify_password(user.password, db_user["hashed_password"]):
            return {"success": False, "error": "Incorrect email or password"}
        
        # Verify user is a customer (CLIENT role)
        if db_user.get("role") != "CLIENT":
            return {"success": False, "error": "This account is not a customer account"}
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": db_user["email"]}, expires_delta=access_token_expires
        )
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(db_user["id"]),
                "name": db_user["name"],
                "email": db_user["email"],
                "phone": db_user.get("phone"),
                "role": db_user["role"]
            },
            "message": "Login successful"
        }
        
    except Exception as e:
        logger.error(f"Error during customer login: {str(e)}")
        return {"success": False, "error": "Login failed. Please try again."}

@app.get("/api/v1/auth/google/customer")
async def google_auth_customer(barbershop_id: str = None, return_url: str = None):
    """Start Google OAuth flow for customer authentication"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, 
            detail="Google authentication not configured"
        )
    
    # Create state parameter with customer context
    state_data = {
        "type": "customer",
        "barbershop_id": barbershop_id,
        "return_url": return_url,
        "timestamp": int(datetime.now().timestamp())
    }
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
    
    # Build Google OAuth URL
    auth_params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI.replace('/callback', '/customer/callback'),
        'scope': 'openid email profile',
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    
    # Redirect to Google OAuth
    from fastapi.responses import RedirectResponse
    return RedirectResponse(auth_url)

@app.get("/api/v1/auth/google/customer/callback")
async def google_auth_customer_callback(code: str = None, state: str = None, error: str = None):
    """Handle Google OAuth callback for customer authentication"""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")
    
    try:
        # Decode and validate state
        state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        
        # Check if state is not too old (10 minutes max)
        if int(datetime.now().timestamp()) - state_data["timestamp"] > 600:
            raise HTTPException(status_code=400, detail="Authorization expired. Please try again.")
        
        # Exchange code for tokens
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': GOOGLE_REDIRECT_URI.replace('/callback', '/customer/callback')
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                'https://oauth2.googleapis.com/token',
                data=token_data
            )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
        
        tokens = token_response.json()
        
        # Get user info from Google
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                'https://www.googleapis.com/oauth2/v2/userinfo',
                headers={'Authorization': f"Bearer {tokens['access_token']}"}
            )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user information")
        
        google_user = user_response.json()
        
        # Check if user exists
        existing_user = await get_user_by_email(google_user['email'])
        
        if not existing_user:
            # Create new customer account
            user_data = UserRegister(
                name=google_user['name'],
                email=google_user['email'],
                password="google_oauth",  # Placeholder password
                role='CLIENT'
            )
            user_data.google_id = google_user['id']
            new_user = await create_user(user_data)
            user_id = new_user["id"]
        else:
            # Update existing user with Google ID if not set
            user_id = existing_user["id"]
            if not existing_user.get("google_id"):
                async with db.pool.acquire() as conn:
                    await conn.execute(
                        "UPDATE users SET google_id = $1 WHERE id = $2",
                        google_user['id'], user_id
                    )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": google_user['email']}, expires_delta=access_token_expires
        )
        
        # Redirect to the return URL with token
        return_url = state_data.get("return_url", "/book/" + state_data.get("barbershop_id", ""))
        redirect_url = f"{return_url}?token={access_token}&auth=success"
        
        from fastapi.responses import RedirectResponse
        return RedirectResponse(redirect_url)
        
    except Exception as e:
        logger.error(f"Google OAuth callback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")


# Barbershop Management Models
class BarbershopCreate(BaseModel):
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None

class BarbershopResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    business_hours: Optional[Dict[str, Any]] = None
    booking_enabled: bool
    online_booking_enabled: bool
    ai_agent_enabled: bool
    monthly_revenue: float
    total_clients: int
    avg_rating: float
    created_at: datetime
    updated_at: datetime

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    category: Optional[str] = None

class ServiceResponse(BaseModel):
    id: str
    barbershop_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    category: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

# Google Calendar Integration Models
class CalendarIntegrationResponse(BaseModel):
    auth_url: str
    state: str

class CalendarTokenResponse(BaseModel):
    success: bool
    calendar_connected: bool
    calendar_id: Optional[str] = None
    message: str

class AvailabilitySlot(BaseModel):
    start_time: datetime
    end_time: datetime
    is_available: bool
    duration_minutes: int

class AvailabilityResponse(BaseModel):
    barber_id: str
    date: str
    slots: List[AvailabilitySlot]
    timezone: str

class AgentChatRequest(BaseModel):
    agent_id: str
    message: str
    context: Optional[Dict[str, Any]] = None

class Recommendation(BaseModel):
    id: str
    type: str
    priority: str
    title: str
    description: str
    estimated_impact: str
    confidence: float
    time_to_implement: str

class AgentChatResponse(BaseModel):
    session_id: str
    agent_id: str
    agent_name: str
    response: str
    recommendations: List[Recommendation] = []
    confidence: float = 0.95

class AppointmentBookingRequest(BaseModel):
    """Request model for booking appointments"""
    barbershop_id: str
    barber_id: str
    service_id: str
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    scheduled_at: str  # ISO format datetime
    client_notes: Optional[str] = None

class AppointmentBookingResponse(BaseModel):
    """Response model for appointment booking"""
    success: bool
    appointment_id: Optional[str] = None
    calendar_event_id: Optional[str] = None
    calendar_event_link: Optional[str] = None
    message: str

# Enterprise RAG Knowledge Base (Simulated)
AGENT_KNOWLEDGE = {
    "master_coach": {
        "name": "🎯 Master Coach",
        "strategies": [
            {
                "response": "Based on our enterprise RAG analysis of 500+ successful barbershops, I see three critical optimization areas for your business: 1) Premium service development (averages 45% revenue increase), 2) Operational efficiency systems (reduces waste by 30%), and 3) Customer retention programs (increases lifetime value by 60%). Which area resonates most with your current challenges?",
                "recommendations": [
                    {
                        "id": "mc_rag_001",
                        "type": "strategy",
                        "priority": "high",
                        "title": "Implement Enterprise Service Portfolio",
                        "description": "RAG analysis shows barbershops with 5+ service tiers achieve 45% higher revenue",
                        "estimated_impact": "+$2,800-4,200 monthly",
                        "confidence": 0.94,
                        "time_to_implement": "2-3 weeks"
                    },
                    {
                        "id": "mc_rag_002", 
                        "type": "analytics",
                        "priority": "medium",
                        "title": "Deploy Business Intelligence Dashboard",
                        "description": "Track KPIs that correlate with $6-figure annual revenue",
                        "estimated_impact": "+25% operational visibility",
                        "confidence": 0.91,
                        "time_to_implement": "1 week"
                    }
                ]
            },
            {
                "response": "Our hybrid search identified successful scaling patterns from barbershops in similar markets. The most effective growth path combines systematic process documentation (95% of successful expansions have this) with staff development programs (reduces turnover by 40%). Your current business shows strong potential for implementing our 'Scalable Systems Framework' - this typically results in 2.5x revenue growth within 18 months.",
                "recommendations": [
                    {
                        "id": "mc_rag_003",
                        "type": "systems",
                        "priority": "high", 
                        "title": "Scalable Systems Framework Implementation",
                        "description": "Document and systematize operations using proven barbershop scaling methodologies",
                        "estimated_impact": "2.5x revenue potential",
                        "confidence": 0.89,
                        "time_to_implement": "4-6 weeks"
                    }
                ]
            }
        ]
    },
    "financial": {
        "name": "💰 Financial Agent",
        "strategies": [
            {
                "response": "RAG financial analysis reveals your pricing structure has 35-50% optimization potential. Our vector search of comparable barbershops shows successful dynamic pricing strategies that adjust for peak hours (charge 20% more during busy periods), service complexity (premium cuts justify 40-60% markup), and seasonal demand. This approach typically generates an additional $1,800-3,200 monthly.",
                "recommendations": [
                    {
                        "id": "fa_rag_001",
                        "type": "pricing",
                        "priority": "high",
                        "title": "Dynamic Pricing Strategy with RAG Optimization",
                        "description": "Implement AI-driven pricing based on demand patterns from successful barbershops",
                        "estimated_impact": "+$1,800-3,200 monthly",
                        "confidence": 0.93,
                        "time_to_implement": "1-2 weeks"
                    },
                    {
                        "id": "fa_rag_002",
                        "type": "cash_flow",
                        "priority": "high",
                        "title": "Enterprise Cash Flow Management",
                        "description": "Implement deposit systems and payment optimization from top-performing barbershops",
                        "estimated_impact": "+40% cash flow improvement",
                        "confidence": 0.96,
                        "time_to_implement": "3-5 days"
                    }
                ]
            }
        ]
    },
    "client_acquisition": {
        "name": "📈 Client Acquisition",
        "strategies": [
            {
                "response": "Enterprise RAG analysis of 1,000+ barbershop marketing campaigns shows your current acquisition cost can be reduced by 45% while increasing conversion rates by 60%. Our vector search identified three high-ROI strategies: 1) Automated Google My Business optimization (drives 40% more bookings), 2) Video-first social media strategy (increases engagement by 250%), and 3) Referral automation systems (generates 2.3 new clients per satisfied customer).",
                "recommendations": [
                    {
                        "id": "ca_rag_001",
                        "type": "digital_marketing",
                        "priority": "high",
                        "title": "AI-Powered Google My Business Optimization",
                        "description": "Implement automated posting, review management, and SEO optimization",
                        "estimated_impact": "+40% online bookings",
                        "confidence": 0.92,
                        "time_to_implement": "1 week"
                    },
                    {
                        "id": "ca_rag_002",
                        "type": "referral_system",
                        "priority": "high",
                        "title": "Enterprise Referral Automation Platform",
                        "description": "Deploy automated referral tracking with rewards optimization",
                        "estimated_impact": "2.3 new clients per referrer",
                        "confidence": 0.88,
                        "time_to_implement": "2-3 weeks"
                    }
                ]
            }
        ]
    },
    "operations": {
        "name": "⚙️ Operations Agent", 
        "strategies": [
            {
                "response": "RAG operational analysis reveals 25-35% efficiency gains through workflow optimization. Our knowledge base of high-performing barbershops shows the ideal setup: 30-minute standard cuts, 45-minute premium services, with 5-minute buffer zones. This schedule optimization typically increases daily capacity by 3-4 clients while reducing stress and improving service quality.",
                "recommendations": [
                    {
                        "id": "op_rag_001",
                        "type": "scheduling",
                        "priority": "high",
                        "title": "RAG-Optimized Scheduling System",
                        "description": "Implement AI-driven scheduling based on top-performing barbershop workflows",
                        "estimated_impact": "+3-4 clients daily",
                        "confidence": 0.90,
                        "time_to_implement": "1 week"
                    }
                ]
            }
        ]
    },
    "brand": {
        "name": "🏆 Brand Development",
        "strategies": [
            {
                "response": "Enterprise brand analysis shows your positioning can support 40-60% higher pricing through strategic brand elevation. RAG search of premium barbershops reveals successful brand elements: authentic storytelling (increases perceived value by 35%), signature service experiences (justifies 50% premium), and community involvement (builds 90% customer loyalty). These elements combine to create defensible market positioning.",
                "recommendations": [
                    {
                        "id": "bd_rag_001",
                        "type": "brand_strategy",
                        "priority": "high",
                        "title": "Premium Brand Positioning Framework",
                        "description": "Implement proven brand elements from successful premium barbershops",
                        "estimated_impact": "+40-60% pricing power",
                        "confidence": 0.87,
                        "time_to_implement": "3-4 weeks"
                    }
                ]
            }
        ]
    },
    "growth": {
        "name": "🚀 Growth Agent",
        "strategies": [
            {
                "response": "RAG scaling analysis of multi-location barbershops shows your business is ready for expansion. Success factors include: documented systems (100% of successful chains have this), proven profitability metrics (your current margins qualify), and replicable training programs. Our knowledge base suggests starting with a franchise-ready model - this approach has 75% higher success rates than traditional expansion.",
                "recommendations": [
                    {
                        "id": "ga_rag_001",
                        "type": "scaling",
                        "priority": "high",
                        "title": "Franchise-Ready Business Model Development",
                        "description": "Transform operations into replicable, scalable systems using proven frameworks",
                        "estimated_impact": "3-5x scaling potential",
                        "confidence": 0.85,
                        "time_to_implement": "6-8 weeks"
                    }
                ]
            }
        ]
    },
    "strategic_mindset": {
        "name": "🧠 Strategic Mindset",
        "strategies": [
            {
                "response": "Strategic RAG analysis indicates you're positioned for significant business evolution. Our vector search of successful barbershop entrepreneurs shows three critical mindset shifts: 1) Asset creation over service delivery (builds equity), 2) Systems thinking over individual performance (enables scaling), 3) Market leadership over competition (creates pricing power). These shifts typically result in 10x business valuation increases over 3-5 years.",
                "recommendations": [
                    {
                        "id": "sm_rag_001",
                        "type": "strategic_planning",
                        "priority": "high",
                        "title": "Enterprise Strategic Roadmap Development",
                        "description": "Create 3-year strategic plan with asset building and market positioning focus",
                        "estimated_impact": "10x business valuation potential",
                        "confidence": 0.83,
                        "time_to_implement": "2-3 weeks"
                    }
                ]
            }
        ]
    }
}

@app.post("/api/v1/ai-agents/chat", response_model=AgentChatResponse)
async def chat_with_agent(request: AgentChatRequest, current_user: User = Depends(get_current_user)):
    """
    Enhanced AI Agent Chat with Enterprise RAG Integration
    Requires authentication to access AI agents
    """
    try:
        agent_id = request.agent_id
        message = request.message
        context = request.context or {}
        
        # Add user context to the request
        context.update({
            "user_id": current_user.id,
            "barbershop_id": current_user.barbershop_id,
            "user_email": current_user.email
        })
        
        # Simulate RAG processing delay
        await asyncio.sleep(0.5)
        
        if agent_id not in AGENT_KNOWLEDGE:
            raise HTTPException(status_code=400, detail=f"Unknown agent: {agent_id}")
        
        agent_data = AGENT_KNOWLEDGE[agent_id]
        strategy = random.choice(agent_data["strategies"])
        
        # Generate session ID with user context
        session_id = f"rag_{current_user.id}_{agent_id}_{int(datetime.now().timestamp())}"
        
        # Store chat session in database
        async with db.pool.acquire() as conn:
            # Create chat session
            await conn.execute("""
                INSERT INTO ai_chat_sessions (id, user_id, barbershop_id, agent_type, session_title, is_active)
                VALUES ($1, $2, $3, $4, $5, TRUE)
                ON CONFLICT (id) DO NOTHING
            """, session_id, current_user.id, current_user.barbershop_id, agent_id, f"Chat with {agent_data['name']}")
            
            # Store user message
            await conn.execute("""
                INSERT INTO ai_chat_messages (session_id, role, content, agent_name)
                VALUES ($1, $2, $3, $4)
            """, session_id, "user", message, agent_data["name"])
            
            # Store agent response
            await conn.execute("""
                INSERT INTO ai_chat_messages (session_id, role, content, agent_name, recommendations, confidence_score)
                VALUES ($1, $2, $3, $4, $5, $6)
            """, session_id, "assistant", strategy["response"], agent_data["name"], 
                 json.dumps(strategy["recommendations"]), 0.95)
        
        response = AgentChatResponse(
            session_id=session_id,
            agent_id=agent_id,
            agent_name=agent_data["name"],
            response=strategy["response"],
            recommendations=strategy["recommendations"],
            confidence=0.95
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint with database connectivity"""
    db_healthy = await db.health_check()
    
    return {
        "status": "healthy" if db_healthy else "degraded",
        "service": "6FB AI Agent System",
        "version": "1.0.0",
        "database": "postgresql" if db_healthy else "fallback",
        "rag_engine": "active",
        "timestamp": datetime.now().isoformat()
    }

# ==========================================
# BARBERSHOP MANAGEMENT ENDPOINTS
# ==========================================

@app.post("/api/v1/barbershops", response_model=BarbershopResponse)
async def create_barbershop(
    barbershop: BarbershopCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new barbershop (Shop owners only)"""
    if current_user.role not in ['SHOP_OWNER', 'ENTERPRISE_OWNER']:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only shop owners can create barbershops"
        )
    
    try:
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow("""
                INSERT INTO barbershops (
                    name, description, address, city, state, zip_code, 
                    phone, email, website, business_hours, owner_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *
            """, barbershop.name, barbershop.description, barbershop.address,
                barbershop.city, barbershop.state, barbershop.zip_code,
                barbershop.phone, barbershop.email, barbershop.website,
                json.dumps(barbershop.business_hours) if barbershop.business_hours else '{}',
                current_user.id)
            
            barbershop_dict = dict(row)
            barbershop_dict['id'] = str(barbershop_dict['id'])
            barbershop_dict['business_hours'] = json.loads(barbershop_dict['business_hours'] or '{}')
            
            return BarbershopResponse(**barbershop_dict)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating barbershop: {str(e)}")

@app.get("/api/v1/barbershops", response_model=List[BarbershopResponse])
async def list_barbershops(current_user: User = Depends(get_current_user)):
    """List barbershops for current user"""
    try:
        async with db.pool.acquire() as conn:
            # Different queries based on user role
            if current_user.role == 'ENTERPRISE_OWNER':
                rows = await conn.fetch("""
                    SELECT * FROM barbershops 
                    WHERE owner_id = $1 OR organization_id IN (
                        SELECT id FROM organizations WHERE owner_id = $1
                    )
                    ORDER BY created_at DESC
                """, current_user.id)
            elif current_user.role == 'SHOP_OWNER':
                rows = await conn.fetch("""
                    SELECT * FROM barbershops WHERE owner_id = $1 ORDER BY created_at DESC
                """, current_user.id)
            else:
                # Barbers and clients see barbershops they're associated with
                rows = await conn.fetch("""
                    SELECT b.* FROM barbershops b
                    JOIN barbershop_staff bs ON b.id = bs.barbershop_id
                    WHERE bs.user_id = $1 AND bs.is_active = TRUE
                    ORDER BY b.created_at DESC
                """, current_user.id)
            
            barbershops = []
            for row in rows:
                barbershop_dict = dict(row)
                barbershop_dict['id'] = str(barbershop_dict['id'])
                barbershop_dict['business_hours'] = json.loads(barbershop_dict['business_hours'] or '{}')
                barbershops.append(BarbershopResponse(**barbershop_dict))
            
            return barbershops
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing barbershops: {str(e)}")

@app.get("/api/v1/barbershops/{barbershop_id}", response_model=BarbershopResponse)
async def get_barbershop(
    barbershop_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get a specific barbershop"""
    try:
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM barbershops WHERE id = $1
            """, barbershop_id)
            
            if not row:
                raise HTTPException(status_code=404, detail="Barbershop not found")
            
            # Check access permissions
            barbershop_dict = dict(row)
            if (current_user.role not in ['SUPER_ADMIN'] and 
                str(barbershop_dict['owner_id']) != current_user.id):
                # Check if user is staff at this barbershop
                staff_row = await conn.fetchrow("""
                    SELECT 1 FROM barbershop_staff 
                    WHERE barbershop_id = $1 AND user_id = $2 AND is_active = TRUE
                """, barbershop_id, current_user.id)
                
                if not staff_row:
                    raise HTTPException(status_code=403, detail="Access denied")
            
            barbershop_dict['id'] = str(barbershop_dict['id'])
            barbershop_dict['business_hours'] = json.loads(barbershop_dict['business_hours'] or '{}')
            
            return BarbershopResponse(**barbershop_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting barbershop: {str(e)}")

@app.post("/api/v1/barbershops/{barbershop_id}/services", response_model=ServiceResponse)
async def create_service(
    barbershop_id: str,
    service: ServiceCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new service for a barbershop"""
    try:
        async with db.pool.acquire() as conn:
            # Check if user can manage this barbershop
            barbershop_row = await conn.fetchrow("""
                SELECT owner_id FROM barbershops WHERE id = $1
            """, barbershop_id)
            
            if not barbershop_row:
                raise HTTPException(status_code=404, detail="Barbershop not found")
            
            if str(barbershop_row['owner_id']) != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Create service
            row = await conn.fetchrow("""
                INSERT INTO services (barbershop_id, name, description, duration_minutes, price, category)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            """, barbershop_id, service.name, service.description, service.duration_minutes, 
                service.price, service.category)
            
            service_dict = dict(row)
            service_dict['id'] = str(service_dict['id'])
            service_dict['barbershop_id'] = str(service_dict['barbershop_id'])
            
            return ServiceResponse(**service_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating service: {str(e)}")

@app.get("/api/v1/barbershops/{barbershop_id}/services", response_model=List[ServiceResponse])
async def list_services(
    barbershop_id: str,
    current_user: User = Depends(get_current_user)
):
    """List services for a barbershop"""
    try:
        async with db.pool.acquire() as conn:
            # Verify barbershop exists and user has access
            barbershop_row = await conn.fetchrow("""
                SELECT owner_id FROM barbershops WHERE id = $1
            """, barbershop_id)
            
            if not barbershop_row:
                raise HTTPException(status_code=404, detail="Barbershop not found")
            
            # Get services
            rows = await conn.fetch("""
                SELECT * FROM services 
                WHERE barbershop_id = $1 AND is_active = TRUE
                ORDER BY category, name
            """, barbershop_id)
            
            services = []
            for row in rows:
                service_dict = dict(row)
                service_dict['id'] = str(service_dict['id'])
                service_dict['barbershop_id'] = str(service_dict['barbershop_id'])
                services.append(ServiceResponse(**service_dict))
            
            return services
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing services: {str(e)}")

# ==========================================
# PUBLIC BOOKING ENDPOINTS (No Authentication Required)
# ==========================================

@app.get("/api/v1/public/barbershops", response_model=List[BarbershopResponse])
async def list_public_barbershops():
    """List all barbershops with online booking enabled (public access)"""
    try:
        async with db.pool.acquire() as conn:
            barbershops = await conn.fetch("""
                SELECT id::text, name, description, address, city, state, zip_code, country,
                       phone, email, website, business_hours, booking_enabled,
                       online_booking_enabled, ai_agent_enabled, monthly_revenue, total_clients, avg_rating,
                       created_at, updated_at
                FROM barbershops 
                WHERE online_booking_enabled = TRUE AND booking_enabled = TRUE
                ORDER BY name
            """)
            
            result = []
            for barbershop in barbershops:
                barbershop_dict = dict(barbershop)
                # Parse JSON fields
                business_hours = barbershop_dict.get('business_hours')
                if isinstance(business_hours, str):
                    try:
                        barbershop_dict['business_hours'] = json.loads(business_hours)
                    except json.JSONDecodeError:
                        barbershop_dict['business_hours'] = {}
                        
                result.append(BarbershopResponse(**barbershop_dict))
            
            return result
            
    except Exception as e:
        logger.error(f"Error listing public barbershops: {e}")
        raise HTTPException(status_code=500, detail="Failed to list barbershops")

@app.get("/api/v1/public/barbershops/{barbershop_id}", response_model=BarbershopResponse)
async def get_public_barbershop(barbershop_id: str):
    """Get barbershop by ID (public access for booking)"""
    try:
        async with db.pool.acquire() as conn:
            barbershop = await conn.fetchrow("""
                SELECT id, name, description, address, city, state, zip_code, country,
                       phone, email, website, business_hours, booking_enabled, 
                       online_booking_enabled, ai_agent_enabled, 0 as monthly_revenue,
                       total_clients, avg_rating, created_at, updated_at
                FROM barbershops 
                WHERE id = $1 AND online_booking_enabled = TRUE
            """, barbershop_id)
            
            if not barbershop:
                raise HTTPException(status_code=404, detail="Barbershop not found or online booking disabled")
            
            # Convert to dict and handle UUID serialization
            barbershop_dict = dict(barbershop)
            barbershop_dict['id'] = str(barbershop_dict['id'])
            barbershop_dict['monthly_revenue'] = 0.0  # Hide revenue in public API
            
            # Handle JSON fields that may be stored as strings
            if isinstance(barbershop_dict.get('business_hours'), str):
                import json
                try:
                    barbershop_dict['business_hours'] = json.loads(barbershop_dict['business_hours'])
                except:
                    barbershop_dict['business_hours'] = {}
            
            return BarbershopResponse(**barbershop_dict)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public barbershop: {e}")
        raise HTTPException(status_code=500, detail="Failed to get barbershop")

@app.get("/api/v1/public/barbershops/{barbershop_id}/services", response_model=List[ServiceResponse])
async def get_public_services(barbershop_id: str):
    """Get services for a barbershop (public access for booking)"""
    try:
        async with db.pool.acquire() as conn:
            # Verify barbershop exists and has online booking enabled
            barbershop_row = await conn.fetchrow("""
                SELECT id FROM barbershops 
                WHERE id = $1 AND online_booking_enabled = TRUE
            """, barbershop_id)
            
            if not barbershop_row:
                raise HTTPException(status_code=404, detail="Barbershop not found or online booking disabled")
            
            # Get active services
            rows = await conn.fetch("""
                SELECT id, barbershop_id, name, description, duration_minutes, 
                       price, is_active, category, created_at, updated_at
                FROM services 
                WHERE barbershop_id = $1 AND is_active = TRUE
                ORDER BY category, name
            """, barbershop_id)
            
            services = []
            for row in rows:
                service_dict = dict(row)
                service_dict['id'] = str(service_dict['id'])
                service_dict['barbershop_id'] = str(service_dict['barbershop_id'])
                services.append(ServiceResponse(**service_dict))
            
            return services
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public services: {e}")
        raise HTTPException(status_code=500, detail="Failed to get services")

class BarberServiceResponse(BaseModel):
    """Response model for barber-specific services"""
    id: str
    service_id: str
    name: str
    description: Optional[str] = None
    duration_minutes: int
    price: float
    category: Optional[str] = None
    skill_level: Optional[str] = None
    specialty_notes: Optional[str] = None

class PublicBarberResponse(BaseModel):
    """Response model for public barber info"""
    id: str
    name: str
    specialty: Optional[str] = None
    experience: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    services: List[BarberServiceResponse] = []

@app.get("/api/v1/public/barbershops/{barbershop_id}/barbers", response_model=List[PublicBarberResponse])
async def get_public_barbers(barbershop_id: str):
    """Get barbers for a barbershop (public access for booking)"""
    try:
        async with db.pool.acquire() as conn:
            # Verify barbershop exists and has online booking enabled
            barbershop_row = await conn.fetchrow("""
                SELECT id FROM barbershops 
                WHERE id = $1 AND online_booking_enabled = TRUE
            """, barbershop_id)
            
            if not barbershop_row:
                raise HTTPException(status_code=404, detail="Barbershop not found or online booking disabled")
            
            # Get active barbers with their services (exclude the "No Preference" user)
            barber_rows = await conn.fetch("""
                SELECT DISTINCT u.id, u.name, u.avatar_url, bs.role
                FROM barbershop_staff bs
                JOIN users u ON bs.user_id = u.id
                WHERE bs.barbershop_id = $1 AND bs.is_active = TRUE AND bs.role = 'BARBER'
                  AND u.email != 'no.preference@6fb.local'
                ORDER BY u.name
            """, barbershop_id)
            
            barbers = []
            
            # Add "No Preference" option first - shows barbershop base services
            base_services = await conn.fetch("""
                SELECT s.id as service_id, s.name, s.description, s.duration_minutes, 
                       s.price, s.category
                FROM services s
                WHERE s.barbershop_id = $1 AND s.is_active = TRUE
                ORDER BY s.category, s.name
            """, barbershop_id)
            
            no_preference_services = []
            for service_row in base_services:
                service_dict = {
                    'id': f"base-{str(service_row['service_id'])}", # Unique ID for base services
                    'service_id': str(service_row['service_id']),
                    'name': service_row['name'],
                    'description': service_row['description'],
                    'duration_minutes': service_row['duration_minutes'],
                    'price': float(service_row['price']),
                    'category': service_row['category'],
                    'skill_level': 'standard',
                    'specialty_notes': 'Available with any barber'
                }
                no_preference_services.append(BarberServiceResponse(**service_dict))
            
            # Add "No Preference" option
            if no_preference_services:
                barbers.append(PublicBarberResponse(
                    id="no-preference",
                    name="No Preference",
                    specialty="Any Available Barber",
                    experience="Professional Service",
                    bio="Let us assign the best available barber for your service",
                    services=no_preference_services
                ))
            
            # Get barber-specific services for each barber
            for barber_row in barber_rows:
                barber_id = str(barber_row['id'])
                
                # Get this barber's specific services
                service_rows = await conn.fetch("""
                    SELECT bs.id, bs.service_id, s.name, s.description, bs.duration_minutes, 
                           bs.price, s.category, bs.skill_level, bs.specialty_notes
                    FROM barber_services bs
                    JOIN services s ON bs.service_id = s.id
                    WHERE bs.barber_id = $1 AND bs.barbershop_id = $2 AND bs.is_available = TRUE
                    ORDER BY s.category, s.name
                """, barber_row['id'], barbershop_id)
                
                barber_services = []
                for service_row in service_rows:
                    service_dict = {
                        'id': str(service_row['id']),
                        'service_id': str(service_row['service_id']),
                        'name': service_row['name'],
                        'description': service_row['description'],
                        'duration_minutes': service_row['duration_minutes'],
                        'price': float(service_row['price']),
                        'category': service_row['category'],
                        'skill_level': service_row['skill_level'],
                        'specialty_notes': service_row['specialty_notes']
                    }
                    barber_services.append(BarberServiceResponse(**service_dict))
                
                # Only add barber if they have services
                if barber_services:
                    barber_dict = {
                        'id': barber_id,
                        'name': barber_row['name'],
                        'specialty': f"{barber_services[0].skill_level.title()} Level" if barber_services and barber_services[0].skill_level else "Professional Barber",
                        'experience': f"{len(barber_services)} services available",
                        'bio': f"Specialized in {', '.join(set(s.category for s in barber_services if s.category))}",
                        'avatar_url': barber_row['avatar_url'],
                        'services': barber_services
                    }
                    barbers.append(PublicBarberResponse(**barber_dict))
            
            # If no barbers found at all, create a demo barber with services
            if not barbers:
                demo_services = []
                if no_preference_services:
                    # Use base services as demo barber services
                    for base_service in no_preference_services:
                        demo_service = BarberServiceResponse(
                            id=f"demo-{base_service.service_id}",
                            service_id=base_service.service_id,
                            name=base_service.name,
                            description=base_service.description,
                            duration_minutes=base_service.duration_minutes,
                            price=base_service.price,
                            category=base_service.category,
                            skill_level="experienced",
                            specialty_notes="Professional service"
                        )
                        demo_services.append(demo_service)
                
                barbers.append(PublicBarberResponse(
                    id="demo-barber",
                    name="Professional Barber",
                    specialty="All Services",
                    experience="Experienced Professional",
                    services=demo_services
                ))
            
            return barbers
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public barbers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get barbers")

@app.get("/api/v1/public/barbers/{barber_id}/availability")
async def get_public_barber_availability(
    barber_id: str,
    barbershop_id: str,
    start_date: str,
    end_date: str,
    service_duration_minutes: int = 30
):
    """Get barber availability for public booking (no authentication required)"""
    try:
        # Verify barbershop exists and has online booking enabled
        async with db.pool.acquire() as conn:
            barbershop_row = await conn.fetchrow("""
                SELECT id FROM barbershops 
                WHERE id = $1 AND online_booking_enabled = TRUE
            """, barbershop_id)
            
            if not barbershop_row:
                raise HTTPException(status_code=404, detail="Barbershop not found or online booking disabled")
            
            # Verify barber exists and is active at this barbershop
            if barber_id == 'no-preference':
                # No preference option is always valid if barbershop exists
                barber_row = {'id': 'no-preference', 'name': 'No Preference'}
            else:
                barber_row = await conn.fetchrow("""
                    SELECT u.id, u.name FROM barbershop_staff bs
                    JOIN users u ON bs.user_id = u.id
                    WHERE u.id = $1 AND bs.barbershop_id = $2 AND bs.is_active = TRUE
                """, barber_id, barbershop_id)
            
            # For now, return mock availability since Google Calendar integration requires OAuth
            # In a real implementation, this would check calendar availability
            from datetime import datetime, timedelta
            import random
            
            slots = []
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            current_date = start
            while current_date < end:
                # Skip Sundays
                if current_date.weekday() == 6:
                    current_date += timedelta(days=1)
                    continue
                
                # Generate slots for business hours (9 AM - 6 PM)
                for hour in range(9, 18):
                    for minute in [0, 30]:
                        slot_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        
                        # Skip past times
                        if slot_time <= datetime.now(slot_time.tzinfo):
                            continue
                            
                        # Randomly skip some slots to simulate existing bookings
                        if random.random() > 0.3:
                            end_time = slot_time + timedelta(minutes=service_duration_minutes)
                            slots.append({
                                "start_time": slot_time.isoformat(),
                                "end_time": end_time.isoformat(),
                                "duration_minutes": service_duration_minutes,
                                "available": True
                            })
                
                current_date += timedelta(days=1)
            
            return {
                "success": True,
                "barber_id": barber_id,
                "barbershop_id": barbershop_id,
                "availability_slots": slots[:20],  # Limit to first 20 slots
                "calendar_connected": False,
                "message": "Mock availability data - Google Calendar integration requires authentication"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting public barber availability: {e}")
        raise HTTPException(status_code=500, detail="Failed to get availability")

class GuestBookingRequest(BaseModel):
    """Request model for guest booking"""
    barbershop_id: str
    barber_id: str
    service_id: str
    barber_service_id: Optional[str] = None  # Specific barber service ID for pricing/duration
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    scheduled_at: str  # ISO format datetime
    client_notes: Optional[str] = None

@app.post("/api/v1/public/appointments/book", response_model=AppointmentBookingResponse)
async def book_guest_appointment(booking: GuestBookingRequest):
    """Book an appointment as a guest (no authentication required)"""
    try:
        calendar_service = get_google_calendar_service()
        
        async with db.pool.acquire() as conn:
            # Verify barbershop has online booking enabled
            barbershop = await conn.fetchrow("""
                SELECT id, name, address, city, state, online_booking_enabled
                FROM barbershops 
                WHERE id = $1 AND online_booking_enabled = TRUE
            """, booking.barbershop_id)
            
            if not barbershop:
                return AppointmentBookingResponse(
                    success=False,
                    message="Barbershop not found or online booking disabled"
                )
            
            # Get service details - prioritize barber-specific service if available
            if booking.barber_service_id and booking.barber_id not in ["no-preference", "demo-barber"]:
                # Get barber-specific service details
                service = await conn.fetchrow("""
                    SELECT s.name, bs.price, bs.duration_minutes, s.barbershop_id, bs.skill_level
                    FROM barber_services bs
                    JOIN services s ON bs.service_id = s.id
                    WHERE bs.id = $1 AND bs.barbershop_id = $2 AND bs.is_available = TRUE
                """, booking.barber_service_id, booking.barbershop_id)
            else:
                # Get base service details
                service = await conn.fetchrow("""
                    SELECT name, base_price as price, base_duration_minutes as duration_minutes, barbershop_id
                    FROM services 
                    WHERE id = $1 AND barbershop_id = $2 AND is_active = TRUE
                """, booking.service_id, booking.barbershop_id)
            
            if not service:
                return AppointmentBookingResponse(
                    success=False,
                    message="Service not found or inactive"
                )
            
            # Parse scheduled time
            scheduled_at = datetime.fromisoformat(booking.scheduled_at.replace('Z', '+00:00'))
            end_time = scheduled_at + timedelta(minutes=service['duration_minutes'])
            
            # Create or find guest user
            guest_user = await conn.fetchrow("""
                SELECT id FROM users WHERE email = $1
            """, booking.client_email)
            
            guest_user_id = None
            if guest_user:
                guest_user_id = guest_user['id']
            else:
                # Create guest user
                guest_user_row = await conn.fetchrow("""
                    INSERT INTO users (email, name, role, is_active, hashed_password)
                    VALUES ($1, $2, 'CLIENT', TRUE, '')
                    RETURNING id
                """, booking.client_email, booking.client_name)
                guest_user_id = guest_user_row['id']
            
            # Create appointment in database
            appointment = await conn.fetchrow("""
                INSERT INTO appointments (
                    barbershop_id, client_id, barber_id, service_id,
                    scheduled_at, duration_minutes, status,
                    service_price, total_amount,
                    client_name, client_phone, client_email, client_notes
                ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $7, $8, $9, $10, $11)
                RETURNING id
            """, 
                booking.barbershop_id, guest_user_id, booking.barber_id, booking.service_id,
                scheduled_at, service['duration_minutes'], 
                service['price'], booking.client_name, booking.client_phone, 
                booking.client_email, booking.client_notes
            )
            
            appointment_id = str(appointment['id'])
            
            # Try to sync with barber's calendar (if connected)
            calendar_event_id = None
            calendar_event_link = None
            
            if booking.barber_id != "demo-barber":  # Skip for demo barber
                calendar_integration = await conn.fetchrow("""
                    SELECT access_token, refresh_token, calendar_id, expires_at 
                    FROM user_calendar_integrations 
                    WHERE user_id = $1 AND provider = 'google' AND is_active = TRUE
                """, booking.barber_id)
                
                if calendar_integration:
                    event_data = {
                        "title": f"{service['name']} - {booking.client_name}",
                        "description": f"Client: {booking.client_name}\nPhone: {booking.client_phone or 'Not provided'}\nEmail: {booking.client_email}\nService: {service['name']}\nNotes: {booking.client_notes or 'None'}",
                        "start_time": scheduled_at.isoformat(),
                        "end_time": end_time.isoformat(),
                        "location": f"{barbershop['name']}, {barbershop['address']}, {barbershop['city']}, {barbershop['state']}" if barbershop else None,
                        "attendees": [{"email": booking.client_email}] if booking.client_email else []
                    }
                    
                    calendar_result = await calendar_service.create_calendar_event(
                        access_token=calendar_integration['access_token'],
                        calendar_id=calendar_integration['calendar_id'],
                        event_data=event_data
                    )
                    
                    if calendar_result['success']:
                        calendar_event_id = calendar_result['event_id']
                        calendar_event_link = calendar_result.get('event_link')
                        
                        # Update appointment with calendar event ID
                        await conn.execute("""
                            UPDATE appointments 
                            SET google_calendar_event_id = $1
                            WHERE id = $2
                        """, calendar_event_id, appointment_id)
            
            # Track booking for intelligence analysis
            try:
                # Get barber and barbershop details for intelligence tracking
                barber_details = await conn.fetchrow("""
                    SELECT name FROM users WHERE id = $1
                """, booking.barber_id)
                
                intelligence_data = {
                    'customer_id': str(guest_user_id),
                    'customer_name': booking.client_name,
                    'customer_email': booking.client_email,
                    'barbershop_id': booking.barbershop_id,
                    'barbershop_name': barbershop['name'],
                    'barber_id': booking.barber_id,
                    'barber_name': barber_details['name'] if barber_details else 'Unknown',
                    'service_id': booking.service_id,
                    'service_name': service['name'],
                    'service_category': 'haircut',  # Default category
                    'scheduled_at': scheduled_at.isoformat(),
                    'duration_minutes': service['duration_minutes'],
                    'price': float(service['price']),
                    'status': 'confirmed',
                    'customer_notes': booking.client_notes
                }
                
                # Track in background (don't fail booking if this fails)
                booking_intelligence.track_booking(intelligence_data)
                
            except Exception as intelligence_error:
                # Log but don't fail the booking
                logger.warning(f"Failed to track booking intelligence: {intelligence_error}")
            
            return AppointmentBookingResponse(
                success=True,
                appointment_id=appointment_id,
                calendar_event_id=calendar_event_id,
                calendar_event_link=calendar_event_link,
                message="Appointment booked successfully! You'll receive a confirmation email shortly."
            )
            
    except Exception as e:
        logger.error(f"Error booking guest appointment: {e}")
        return AppointmentBookingResponse(
            success=False,
            message="Failed to book appointment. Please try again."
        )

# ==========================================
# GOOGLE CALENDAR INTEGRATION ENDPOINTS
# ==========================================

@app.get("/api/v1/calendar/oauth/authorize", response_model=CalendarIntegrationResponse)
async def authorize_google_calendar(current_user: User = Depends(get_current_user)):
    """Start Google Calendar OAuth flow"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=500, 
            detail="Google Calendar integration not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        )
    
    # Create state parameter with user ID for security
    state = base64.urlsafe_b64encode(f"{current_user.id}:{int(datetime.now().timestamp())}".encode()).decode()
    
    # Build Google OAuth URL
    auth_params = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': GOOGLE_REDIRECT_URI,
        'scope': ' '.join(GOOGLE_SCOPES),
        'response_type': 'code',
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state
    }
    
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    
    return CalendarIntegrationResponse(auth_url=auth_url, state=state)

@app.get("/api/v1/calendar/oauth/callback")
async def google_calendar_callback(code: str = None, state: str = None, error: str = None):
    """Handle Google Calendar OAuth callback"""
    if error:
        raise HTTPException(status_code=400, detail=f"OAuth error: {error}")
    
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing authorization code or state")
    
    try:
        # Decode and validate state
        decoded_state = base64.urlsafe_b64decode(state.encode()).decode()
        user_id, timestamp = decoded_state.split(':')
        
        # Check if state is not too old (10 minutes max)
        if int(datetime.now().timestamp()) - int(timestamp) > 600:
            raise HTTPException(status_code=400, detail="Authorization expired. Please try again.")
        
        # Exchange code for tokens
        token_data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': GOOGLE_REDIRECT_URI
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                'https://oauth2.googleapis.com/token',
                data=token_data
            )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange authorization code")
        
        tokens = token_response.json()
        
        # Get user's primary calendar info
        async with httpx.AsyncClient() as client:
            calendar_response = await client.get(
                'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
                headers={'Authorization': f"Bearer {tokens['access_token']}"}
            )
        
        calendar_info = calendar_response.json() if calendar_response.status_code == 200 else {}
        
        # Store tokens in database
        async with db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO user_calendar_integrations (
                    user_id, provider, access_token, refresh_token, 
                    expires_at, calendar_id, calendar_name, is_active
                )
                VALUES ($1, 'google', $2, $3, $4, $5, $6, TRUE)
                ON CONFLICT (user_id, provider) DO UPDATE SET
                    access_token = EXCLUDED.access_token,
                    refresh_token = EXCLUDED.refresh_token,
                    expires_at = EXCLUDED.expires_at,
                    calendar_id = EXCLUDED.calendar_id,
                    calendar_name = EXCLUDED.calendar_name,
                    is_active = TRUE,
                    updated_at = NOW()
            """, user_id, tokens['access_token'], tokens.get('refresh_token'),
                datetime.now() + timedelta(seconds=tokens.get('expires_in', 3600)),
                calendar_info.get('id'), calendar_info.get('summary'))
        
        # Redirect to frontend success page
        return {
            "message": "Google Calendar connected successfully! You can close this window.",
            "success": True
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing OAuth callback: {str(e)}")

@app.get("/api/v1/calendar/status", response_model=CalendarTokenResponse)
async def get_calendar_status(current_user: User = Depends(get_current_user)):
    """Check if user has connected Google Calendar"""
    try:
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow("""
                SELECT calendar_id, calendar_name, expires_at, is_active
                FROM user_calendar_integrations 
                WHERE user_id = $1 AND provider = 'google' AND is_active = TRUE
            """, current_user.id)
            
            if row and row['expires_at'] > datetime.now():
                return CalendarTokenResponse(
                    success=True,
                    calendar_connected=True,
                    calendar_id=row['calendar_id'],
                    message=f"Connected to calendar: {row['calendar_name']}"
                )
            else:
                return CalendarTokenResponse(
                    success=True,
                    calendar_connected=False,
                    message="Google Calendar not connected or token expired"
                )
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking calendar status: {str(e)}")

@app.delete("/api/v1/calendar/disconnect")
async def disconnect_google_calendar(current_user: User = Depends(get_current_user)):
    """Disconnect Google Calendar integration"""
    try:
        async with db.pool.acquire() as conn:
            await conn.execute("""
                UPDATE user_calendar_integrations 
                SET is_active = FALSE, updated_at = NOW()
                WHERE user_id = $1 AND provider = 'google'
            """, current_user.id)
            
        return {"message": "Google Calendar disconnected successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disconnecting calendar: {str(e)}")

# Real-time Availability Endpoints

class AvailabilityRequest(BaseModel):
    """Request model for availability checking"""
    start_date: str  # ISO format date
    end_date: str    # ISO format date
    service_duration_minutes: int = 30
    business_hours_start: int = 9   # 9 AM
    business_hours_end: int = 18    # 6 PM

class AvailabilitySlotResponse(BaseModel):
    """Response model for availability slots"""
    start_time: str
    end_time: str
    duration_minutes: int
    available: bool = True

class AvailabilityResponse(BaseModel):
    """Response model for availability check"""
    success: bool
    barber_id: str
    barbershop_id: Optional[str] = None
    availability_slots: List[AvailabilitySlotResponse]
    calendar_connected: bool
    message: Optional[str] = None

@app.get("/api/v1/barbers/{barber_id}/availability", response_model=AvailabilityResponse)
async def get_barber_availability(
    barber_id: str,
    start_date: str,
    end_date: str,
    service_duration_minutes: int = 30,
    business_hours_start: int = 9,
    business_hours_end: int = 18,
    current_user: User = Depends(get_current_user)
):
    """Get real-time availability for a specific barber using Google Calendar integration"""
    try:
        calendar_service = get_google_calendar_service()
        
        # Get barber's calendar integration
        async with db.pool.acquire() as conn:
            calendar_integration = await conn.fetchrow("""
                SELECT access_token, refresh_token, calendar_id, expires_at 
                FROM user_calendar_integrations 
                WHERE user_id = $1 AND provider = 'google' AND is_active = TRUE
            """, barber_id)
            
            if not calendar_integration:
                return AvailabilityResponse(
                    success=False,
                    barber_id=barber_id,
                    availability_slots=[],
                    calendar_connected=False,
                    message="Barber hasn't connected their Google Calendar"
                )
            
            # Check if token needs refresh
            access_token = calendar_integration['access_token']
            refresh_token = calendar_integration['refresh_token']
            expires_at = calendar_integration['expires_at']
            
            if expires_at and datetime.now(timezone.utc) >= expires_at:
                # Refresh token
                refresh_result = await calendar_service.refresh_access_token(
                    refresh_token, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
                )
                
                if refresh_result['success']:
                    access_token = refresh_result['access_token']
                    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=refresh_result['expires_in'])
                    
                    # Update token in database
                    await conn.execute("""
                        UPDATE user_calendar_integrations 
                        SET access_token = $1, expires_at = $2
                        WHERE user_id = $3 AND provider = 'google'
                    """, access_token, new_expires_at, barber_id)
                else:
                    return AvailabilityResponse(
                        success=False,
                        barber_id=barber_id,
                        availability_slots=[],
                        calendar_connected=False,
                        message="Calendar token expired. Please reconnect Google Calendar."
                    )
            
            # Parse request dates
            start_date_parsed = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_date_parsed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
            # Get available slots from Google Calendar
            available_slots = await calendar_service.get_available_slots(
                access_token=access_token,
                calendar_id=calendar_integration['calendar_id'],
                start_date=start_date_parsed,
                end_date=end_date_parsed,
                slot_duration_minutes=service_duration_minutes,
                business_hours_start=business_hours_start,
                business_hours_end=business_hours_end
            )
            
            # Convert to response format
            slot_responses = [
                AvailabilitySlotResponse(
                    start_time=slot.start.isoformat(),
                    end_time=slot.end.isoformat(),
                    duration_minutes=slot.duration_minutes
                )
                for slot in available_slots
            ]
            
            return AvailabilityResponse(
                success=True,
                barber_id=barber_id,
                availability_slots=slot_responses,
                calendar_connected=True,
                message=f"Found {len(slot_responses)} available slots"
            )
            
    except Exception as e:
        logger.error(f"Error getting barber availability: {e}")
        raise HTTPException(status_code=500, detail="Failed to get availability")

# Appointment Booking with Calendar Sync

@app.post("/api/v1/appointments/book", response_model=AppointmentBookingResponse)
async def book_appointment(
    booking: AppointmentBookingRequest,
    current_user: User = Depends(get_current_user)
):
    """Book an appointment and sync with barber's Google Calendar"""
    try:
        calendar_service = get_google_calendar_service()
        
        async with db.pool.acquire() as conn:
            # Get service details
            service = await conn.fetchrow("""
                SELECT name, price, duration_minutes, barbershop_id
                FROM services 
                WHERE id = $1 AND is_active = TRUE
            """, booking.service_id)
            
            if not service:
                return AppointmentBookingResponse(
                    success=False,
                    message="Service not found or inactive"
                )
            
            # Get barbershop details
            barbershop = await conn.fetchrow("""
                SELECT name, address, city, state, phone
                FROM barbershops 
                WHERE id = $1
            """, booking.barbershop_id)
            
            # Parse scheduled time
            scheduled_at = datetime.fromisoformat(booking.scheduled_at.replace('Z', '+00:00'))
            end_time = scheduled_at + timedelta(minutes=service['duration_minutes'])
            
            # Create appointment in database
            appointment = await conn.fetchrow("""
                INSERT INTO appointments (
                    barbershop_id, client_id, barber_id, service_id,
                    scheduled_at, duration_minutes, status,
                    service_price, total_amount,
                    client_name, client_phone, client_email, client_notes
                ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $7, $8, $9, $10, $11)
                RETURNING id
            """, 
                booking.barbershop_id, current_user.id, booking.barber_id, booking.service_id,
                scheduled_at, service['duration_minutes'], 
                service['price'], booking.client_name, booking.client_phone, 
                booking.client_email, booking.client_notes
            )
            
            appointment_id = str(appointment['id'])
            
            # Get barber's calendar integration
            calendar_integration = await conn.fetchrow("""
                SELECT access_token, refresh_token, calendar_id, expires_at 
                FROM user_calendar_integrations 
                WHERE user_id = $1 AND provider = 'google' AND is_active = TRUE
            """, booking.barber_id)
            
            calendar_event_id = None
            calendar_event_link = None
            
            if calendar_integration:
                # Create calendar event
                event_data = {
                    "title": f"{service['name']} - {booking.client_name}",
                    "description": f"Client: {booking.client_name}\nPhone: {booking.client_phone or 'Not provided'}\nEmail: {booking.client_email}\nService: {service['name']}\nNotes: {booking.client_notes or 'None'}",
                    "start_time": scheduled_at.isoformat(),
                    "end_time": end_time.isoformat(),
                    "location": f"{barbershop['name']}, {barbershop['address']}, {barbershop['city']}, {barbershop['state']}" if barbershop else None,
                    "attendees": [{"email": booking.client_email}] if booking.client_email else []
                }
                
                calendar_result = await calendar_service.create_calendar_event(
                    access_token=calendar_integration['access_token'],
                    calendar_id=calendar_integration['calendar_id'],
                    event_data=event_data
                )
                
                if calendar_result['success']:
                    calendar_event_id = calendar_result['event_id']
                    calendar_event_link = calendar_result.get('event_link')
                    
                    # Update appointment with calendar event ID
                    await conn.execute("""
                        UPDATE appointments 
                        SET google_calendar_event_id = $1
                        WHERE id = $2
                    """, calendar_event_id, appointment_id)
            
            return AppointmentBookingResponse(
                success=True,
                appointment_id=appointment_id,
                calendar_event_id=calendar_event_id,
                calendar_event_link=calendar_event_link,
                message="Appointment booked successfully" + (" and added to barber's calendar" if calendar_event_id else "")
            )
            
    except Exception as e:
        logger.error(f"Error booking appointment: {e}")
        raise HTTPException(status_code=500, detail="Failed to book appointment")

# ==========================================
# BOOKING INTELLIGENCE ENDPOINTS
# ==========================================

from services.booking_intelligence_service import BookingIntelligenceService

# Initialize booking intelligence service
booking_intelligence = BookingIntelligenceService()

@app.get("/api/v1/customer/{customer_id}/preferences")
async def get_customer_preferences(customer_id: str):
    """Get customer booking preferences"""
    try:
        preferences = booking_intelligence.get_customer_preferences(customer_id)
        if not preferences:
            return {"message": "No preferences found", "preferences": None}
        
        return {
            "success": True,
            "preferences": {
                "customer_id": preferences.customer_id,
                "preferred_barbers": preferences.preferred_barbers,
                "preferred_services": preferences.preferred_services,
                "preferred_times": preferences.preferred_times,
                "preferred_days": preferences.preferred_days,
                "average_booking_frequency": preferences.average_booking_frequency,
                "last_booking_date": preferences.last_booking_date,
                "total_bookings": preferences.total_bookings,
                "favorite_barbershop": preferences.favorite_barbershop
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting preferences: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/recommendations")
async def get_customer_recommendations(customer_id: str, limit: int = 5):
    """Get smart booking recommendations for customer"""
    try:
        recommendations = booking_intelligence.get_smart_recommendations(customer_id, limit)
        
        return {
            "success": True,
            "recommendations": [
                {
                    "id": rec.recommendation_id,
                    "type": rec.recommendation_type,
                    "title": rec.title,
                    "description": rec.description,
                    "suggested_barber_id": rec.suggested_barber_id,
                    "suggested_service_id": rec.suggested_service_id,
                    "suggested_datetime": rec.suggested_datetime,
                    "confidence_score": rec.confidence_score,
                    "reasoning": rec.reasoning
                }
                for rec in recommendations
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting recommendations: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/history")
async def get_customer_booking_history(customer_id: str, limit: int = 20):
    """Get customer booking history"""
    try:
        history = booking_intelligence.get_booking_history(customer_id, limit)
        
        return {
            "success": True,
            "bookings": history,
            "total_count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting booking history: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/analytics")
async def get_customer_analytics(customer_id: str):
    """Get customer booking analytics and insights"""
    try:
        analytics = booking_intelligence.get_analytics_summary(customer_id)
        
        return {
            "success": True,
            "analytics": analytics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting analytics: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/rebooking-suggestion")
async def get_rebooking_suggestion(customer_id: str):
    """Get smart rebooking suggestion based on customer history"""
    try:
        suggestion = booking_intelligence.suggest_rebooking(customer_id)
        
        if not suggestion:
            return {
                "success": False,
                "message": "No rebooking suggestion available - insufficient booking history"
            }
        
        return {
            "success": True,
            "suggestion": suggestion
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting rebooking suggestion: {str(e)}")

@app.post("/api/v1/booking-intelligence/track")
async def track_booking_for_intelligence(booking_data: dict):
    """Track a booking for intelligence analysis (called after successful booking)"""
    try:
        success = booking_intelligence.track_booking(booking_data)
        
        return {
            "success": success,
            "message": "Booking tracked successfully" if success else "Failed to track booking"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking booking: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/ai-insights")
async def get_customer_ai_insights(customer_id: str, limit: int = 5):
    """Get AI-powered customer insights and behavior analysis"""
    try:
        insights = booking_intelligence.get_ai_customer_insights(customer_id, limit)
        
        return {
            "success": True,
            "insights": insights,
            "ai_powered": len(insights) > 0,
            "total_count": len(insights)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI insights: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/recommendations/ai")
async def get_ai_recommendations(customer_id: str, limit: int = 5):
    """Get AI-powered smart recommendations (enhanced with real LLM analysis)"""
    try:
        recommendations = booking_intelligence.get_smart_recommendations(customer_id, limit, use_ai=True)
        
        # Convert to API format
        api_recommendations = []
        for rec in recommendations:
            api_recommendations.append({
                "id": rec.recommendation_id,
                "type": rec.recommendation_type,
                "title": rec.title,
                "description": rec.description,
                "reasoning": rec.reasoning,
                "confidence_score": rec.confidence_score,
                "suggested_barber_id": rec.suggested_barber_id,
                "suggested_service_id": rec.suggested_service_id,
                "suggested_datetime": rec.suggested_datetime,
                "created_at": rec.created_at,
                "ai_powered": "claude" in rec.recommendation_id or "gpt" in rec.recommendation_id
            })
        
        return {
            "success": True,
            "recommendations": api_recommendations,
            "ai_powered": any(rec.get("ai_powered", False) for rec in api_recommendations),
            "total_count": len(api_recommendations)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI recommendations: {str(e)}")

@app.get("/api/v1/intelligence/status")
async def get_intelligence_status():
    """Get the status of AI intelligence systems"""
    try:
        ai_status = {
            "openai_available": bool(os.getenv('OPENAI_API_KEY')),
            "anthropic_available": bool(os.getenv('ANTHROPIC_API_KEY')),
            "gemini_available": bool(os.getenv('GOOGLE_AI_API_KEY')),
            "fallback_mode": not (bool(os.getenv('OPENAI_API_KEY')) or bool(os.getenv('ANTHROPIC_API_KEY')) or bool(os.getenv('GOOGLE_AI_API_KEY'))),
            "services": {
                "booking_intelligence": "active",
                "ai_recommendations": "active" if (bool(os.getenv('OPENAI_API_KEY')) or bool(os.getenv('ANTHROPIC_API_KEY')) or bool(os.getenv('GOOGLE_AI_API_KEY'))) else "fallback",
                "behavior_analysis": "active" if (bool(os.getenv('OPENAI_API_KEY')) or bool(os.getenv('ANTHROPIC_API_KEY')) or bool(os.getenv('GOOGLE_AI_API_KEY'))) else "fallback",
                "predictive_analytics": "active",
                "monetization_tracking": "active"
            }
        }
        
        return {
            "success": True,
            "ai_intelligence_status": ai_status,
            "capabilities": [
                "Smart booking recommendations",
                "Customer behavior analysis",
                "Personalized rebooking suggestions",
                "Predictive analytics and demand forecasting",
                "Dynamic pricing recommendations",
                "Business insights generation",
                "AI monetization and ROI tracking",
                "Customer insights generation"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting intelligence status: {str(e)}")

# ==========================================
# PREDICTIVE ANALYTICS ENDPOINTS
# ==========================================

from services.predictive_analytics_service import PredictiveAnalyticsService
from services.ai_monetization_service import AIMonetizationService

# Initialize predictive analytics services
predictive_analytics = PredictiveAnalyticsService()
ai_monetization = AIMonetizationService()

@app.get("/api/v1/barbershop/{barbershop_id}/predictive-analytics")
async def get_predictive_analytics_dashboard(barbershop_id: str):
    """Get comprehensive predictive analytics dashboard for a barbershop"""
    try:
        # Get booking history from intelligence service
        booking_history = []
        
        # Get recent bookings for this barbershop from the intelligence database
        import sqlite3
        conn = sqlite3.connect("booking_intelligence.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM booking_history 
            WHERE barbershop_id = ?
            ORDER BY scheduled_at DESC
            LIMIT 100
        """, (barbershop_id,))
        
        columns = [description[0] for description in cursor.description]
        for row in cursor.fetchall():
            booking_history.append(dict(zip(columns, row)))
        
        conn.close()
        
        if not booking_history:
            return {
                "success": True,
                "message": "No booking history available for analytics",
                "demand_forecasts": [],
                "pricing_recommendations": [],
                "business_insights": [],
                "seasonal_patterns": []
            }
        
        # Generate demand forecasts
        demand_forecasts = predictive_analytics.analyze_demand_patterns(barbershop_id, booking_history)
        
        # Generate dynamic pricing recommendations
        current_pricing = {
            "Classic Haircut": 25.0,
            "Beard Trim": 15.0,
            "Shampoo & Style": 20.0,
            "Hot Towel Shave": 30.0
        }
        pricing_recommendations = predictive_analytics.generate_dynamic_pricing(barbershop_id, current_pricing, demand_forecasts)
        
        # Generate business insights
        business_insights = predictive_analytics.generate_business_insights(barbershop_id, booking_history)
        
        # Identify seasonal patterns
        seasonal_patterns = predictive_analytics.identify_seasonal_patterns(barbershop_id, booking_history)
        
        # Get comprehensive dashboard data
        dashboard_data = predictive_analytics.get_predictive_dashboard_data(barbershop_id)
        
        return {
            "success": True,
            "barbershop_id": barbershop_id,
            "analytics_generated_at": dashboard_data.get("generated_at"),
            "demand_forecasts": [
                {
                    "service_type": forecast.service_type,
                    "time_period": forecast.time_period,
                    "forecast_date": forecast.forecast_date,
                    "predicted_demand": forecast.predicted_demand,
                    "confidence_level": forecast.confidence_level,
                    "contributing_factors": forecast.contributing_factors,
                    "recommended_actions": forecast.recommended_actions
                }
                for forecast in demand_forecasts
            ],
            "pricing_recommendations": [
                {
                    "service_id": pricing.service_id,
                    "base_price": pricing.base_price,
                    "recommended_price": pricing.recommended_price,
                    "price_adjustment": pricing.price_adjustment,
                    "pricing_reason": pricing.pricing_reason,
                    "demand_level": pricing.demand_level,
                    "expected_impact": pricing.expected_impact,
                    "valid_from": pricing.valid_from,
                    "valid_until": pricing.valid_until
                }
                for pricing in pricing_recommendations
            ],
            "business_insights": [
                {
                    "insight_type": insight.insight_type,
                    "title": insight.title,
                    "description": insight.description,
                    "impact_level": insight.impact_level,
                    "potential_value": insight.potential_value,
                    "actionable_recommendations": insight.actionable_recommendations,
                    "confidence_score": insight.confidence_score,
                    "urgency_level": insight.urgency_level
                }
                for insight in business_insights
            ],
            "seasonal_patterns": [
                {
                    "pattern_type": pattern.pattern_type,
                    "pattern_data": pattern.pattern_data,
                    "strength": pattern.strength,
                    "next_occurrence": pattern.next_occurrence,
                    "recommended_preparation": pattern.recommended_preparation
                }
                for pattern in seasonal_patterns
            ],
            "total_bookings_analyzed": len(booking_history)
        }
        
    except Exception as e:
        logger.error(f"Error getting predictive analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating predictive analytics: {str(e)}")

@app.get("/api/v1/barbershop/{barbershop_id}/demand-forecast")
async def get_demand_forecast(barbershop_id: str, days_ahead: int = 7):
    """Get demand forecast for specific barbershop"""
    try:
        # Get booking history
        booking_history = []
        
        import sqlite3
        conn = sqlite3.connect("booking_intelligence.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM booking_history 
            WHERE barbershop_id = ?
            ORDER BY scheduled_at DESC
            LIMIT 50
        """, (barbershop_id,))
        
        columns = [description[0] for description in cursor.description]
        for row in cursor.fetchall():
            booking_history.append(dict(zip(columns, row)))
        
        conn.close()
        
        if not booking_history:
            return {
                "success": False,
                "message": "Insufficient booking history for demand forecasting"
            }
        
        forecasts = predictive_analytics.analyze_demand_patterns(barbershop_id, booking_history)
        
        return {
            "success": True,
            "barbershop_id": barbershop_id,
            "forecast_period": f"Next {days_ahead} days",
            "forecasts": [
                {
                    "service_type": forecast.service_type,
                    "predicted_demand": forecast.predicted_demand,
                    "confidence_level": forecast.confidence_level,
                    "time_period": forecast.time_period,
                    "forecast_date": forecast.forecast_date,
                    "contributing_factors": forecast.contributing_factors,
                    "recommended_actions": forecast.recommended_actions
                }
                for forecast in forecasts
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating demand forecast: {str(e)}")

@app.get("/api/v1/barbershop/{barbershop_id}/pricing-optimization")
async def get_pricing_optimization(barbershop_id: str):
    """Get dynamic pricing recommendations for barbershop"""
    try:
        # Get current demand forecasts
        booking_history = []
        
        import sqlite3
        conn = sqlite3.connect("booking_intelligence.db")
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM booking_history 
            WHERE barbershop_id = ?
            ORDER BY scheduled_at DESC
            LIMIT 30
        """, (barbershop_id,))
        
        columns = [description[0] for description in cursor.description]
        for row in cursor.fetchall():
            booking_history.append(dict(zip(columns, row)))
        
        conn.close()
        
        if not booking_history:
            return {
                "success": False,
                "message": "Insufficient data for pricing optimization"
            }
        
        # Generate demand forecasts first
        demand_forecasts = predictive_analytics.analyze_demand_patterns(barbershop_id, booking_history)
        
        # Get current pricing (in real app, this would come from database)
        current_pricing = {
            "Classic Haircut": 25.0,
            "Beard Trim": 15.0,
            "Shampoo & Style": 20.0,
            "Hot Towel Shave": 30.0
        }
        
        # Generate pricing recommendations
        pricing_recommendations = predictive_analytics.generate_dynamic_pricing(barbershop_id, current_pricing, demand_forecasts)
        
        return {
            "success": True,
            "barbershop_id": barbershop_id,
            "pricing_recommendations": [
                {
                    "service_id": pricing.service_id,
                    "current_price": pricing.base_price,
                    "recommended_price": pricing.recommended_price,
                    "price_change": pricing.price_adjustment,
                    "reasoning": pricing.pricing_reason,
                    "demand_level": pricing.demand_level,
                    "expected_revenue_impact": pricing.expected_impact.get('revenue_change', 0),
                    "expected_demand_impact": pricing.expected_impact.get('demand_change', 0),
                    "valid_period": f"{pricing.valid_from} to {pricing.valid_until}"
                }
                for pricing in pricing_recommendations
            ],
            "optimization_summary": {
                "total_recommendations": len(pricing_recommendations),
                "avg_price_adjustment": sum(p.price_adjustment for p in pricing_recommendations) / len(pricing_recommendations) if pricing_recommendations else 0,
                "potential_revenue_uplift": sum(p.expected_impact.get('revenue_change', 0) for p in pricing_recommendations)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating pricing optimization: {str(e)}")

# ==========================================
# AI MONETIZATION ENDPOINTS
# ==========================================

@app.get("/api/v1/customer/{customer_id}/ai-usage-summary")
async def get_customer_ai_usage_summary(customer_id: str):
    """Get customer AI usage and billing summary"""
    try:
        # Check AI quota
        quota_check = ai_monetization.check_ai_quota(customer_id)
        
        # Generate billing summary
        billing_summary = ai_monetization.generate_billing_summary(customer_id)
        
        # Calculate ROI metrics
        roi_metrics = ai_monetization.calculate_customer_roi(customer_id)
        
        return {
            "success": True,
            "customer_id": customer_id,
            "quota_status": quota_check,
            "billing_summary": billing_summary,
            "roi_metrics": {
                "ai_spend": roi_metrics.ai_spend if roi_metrics else 0,
                "revenue_attributed": roi_metrics.revenue_attributed if roi_metrics else 0,
                "roi_percentage": roi_metrics.roi_percentage if roi_metrics else 0,
                "bookings_influenced": roi_metrics.bookings_influenced if roi_metrics else 0
            } if roi_metrics else None,
            "recommendations": [
                "Upgrade to Smart plan for more AI credits",
                "Enable auto-upgrade to avoid service interruptions",
                "AI features show positive ROI - consider increasing usage"
            ] if quota_check.get('upgrade_required') else [
                "AI usage is within optimal range",
                "Continue leveraging AI for business growth"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI usage summary: {str(e)}")

@app.post("/api/v1/ai-usage/track")
async def track_ai_usage(
    usage_data: dict
):
    """Track AI usage for billing and optimization"""
    try:
        # Extract usage data
        customer_id = usage_data.get('customer_id')
        barbershop_id = usage_data.get('barbershop_id')
        ai_service_type = usage_data.get('ai_service_type', 'recommendation')
        model_used = usage_data.get('model_used', 'claude-3-sonnet')
        tokens_used = usage_data.get('tokens_used', 0)
        business_value = usage_data.get('business_value')
        
        # Track the usage
        usage_record = ai_monetization.track_ai_usage(
            customer_id=customer_id,
            barbershop_id=barbershop_id,
            ai_service_type=ai_service_type,
            model_used=model_used,
            tokens_used=tokens_used,
            business_value=business_value
        )
        
        return {
            "success": True,
            "usage_tracked": {
                "usage_id": usage_record.usage_id,
                "customer_charge": usage_record.customer_charge,
                "profit_margin": usage_record.profit_margin,
                "model_used": usage_record.model_used,
                "ai_service_type": usage_record.ai_service_type
            },
            "message": "AI usage tracked successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking AI usage: {str(e)}")

@app.get("/api/v1/customer/{customer_id}/ai-optimization")
async def get_ai_usage_optimization(customer_id: str):
    """Get AI usage optimization recommendations"""
    try:
        # Sample request context (in real app, this would be more comprehensive)
        request_context = {
            'service_type': 'recommendation',
            'booking_history': [],  # Would be populated from database
            'days_since_last_ai_analysis': 3,
            'customer_value_tier': 'standard'
        }
        
        optimization = ai_monetization.optimize_ai_usage(customer_id, request_context)
        
        return {
            "success": True,
            "customer_id": customer_id,
            "optimization_recommendation": optimization,
            "cost_efficiency_tips": [
                "AI insights are most valuable for new customers and high-value clients",
                "Refresh AI analysis every 7-14 days for optimal cost/benefit ratio",
                "Use cached insights for recent analysis to reduce costs",
                "Premium AI models provide better accuracy for complex analysis"
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting AI optimization: {str(e)}")

@app.get("/api/v1/agents")
async def list_agents():
    """List all available agents"""
    agents = []
    for agent_id, data in AGENT_KNOWLEDGE.items():
        agents.append({
            "id": agent_id,
            "name": data["name"],
            "status": "active",
            "strategies_count": len(data["strategies"])
        })
    return {"agents": agents}

# Master AI Orchestrator
async def master_orchestrator(message: str, conversation_history: list = None) -> dict:
    """
    Master AI Orchestrator that analyzes questions and coordinates multiple specialist agents
    Returns synthesized response from relevant specialists
    """
    try:
        # Step 1: Analyze the question to determine which specialists are needed and if execution is required
        analysis_prompt = f"""You are the Master AI Orchestrator for a barbershop business intelligence system. 
        
Analyze this question: "{message}"

Determine which business specialists should be consulted and if executable actions are requested. Available specialists:
- financial: Revenue, costs, pricing, profit margins, budgeting
- marketing: Customer acquisition, retention, social media, local marketing  
- operations: Workflow, scheduling, efficiency, staff management, technology
- brand: Reputation, positioning, customer experience, community presence  
- growth: Scaling, expansion, franchising, multi-location management
- master_coach: Strategic planning, leadership, overall business guidance

EXECUTABLE ACTIONS: Check if the user wants actual execution (not just advice):
- SMS/Text blast, Email blast, Marketing campaigns
- Social media posting, Content creation
- Booking appointments, Calendar management
- Follow-up sequences, Customer outreach

Return a JSON response with:
{{
    "specialists_needed": ["specialist1", "specialist2"],
    "reasoning": "Brief explanation of why these specialists are needed",
    "question_complexity": "simple|moderate|complex",
    "primary_focus": "main business area this question addresses",
    "execution_requested": true/false,
    "execution_type": "sms_blast|email_blast|social_post|booking|follow_up|none",
    "execution_details": "specific action user wants performed"
}}

Be selective - only include specialists that are truly relevant to the question."""

        # Get analysis from Master Orchestrator
        if anthropic_client:
            try:
                analysis_response = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=500,
                    messages=[{"role": "user", "content": analysis_prompt}]
                )
                analysis_text = analysis_response.content[0].text
            except Exception as e:
                logger.warning(f"Anthropic analysis failed: {e}")
                analysis_text = get_fallback_analysis(message)
        else:
            analysis_text = get_fallback_analysis(message)

        # Parse analysis (with fallback if JSON parsing fails)
        try:
            import json
            # Extract JSON from response if it's wrapped in text
            if "```json" in analysis_text:
                json_start = analysis_text.find("```json") + 7
                json_end = analysis_text.find("```", json_start)
                analysis_text = analysis_text[json_start:json_end].strip()
            elif "{" in analysis_text:
                json_start = analysis_text.find("{")
                json_end = analysis_text.rfind("}") + 1
                analysis_text = analysis_text[json_start:json_end]
            
            analysis = json.loads(analysis_text)
        except:
            analysis = get_fallback_analysis(message)

        specialists_needed = analysis.get("specialists_needed", ["master_coach"])
        reasoning = analysis.get("reasoning", "General business advice needed")
        complexity = analysis.get("question_complexity", "moderate")
        primary_focus = analysis.get("primary_focus", "business strategy")
        execution_requested = analysis.get("execution_requested", False)
        execution_type = analysis.get("execution_type", "none")
        execution_details = analysis.get("execution_details", "")

        # Step 2: Handle executable actions if requested
        execution_result = None
        if execution_requested and EXECUTABLE_AGENTS_AVAILABLE:
            execution_result = await handle_executable_action(message, execution_type, execution_details)

        # Step 3: Get responses from each needed specialist
        specialist_responses = {}
        for specialist in specialists_needed:
            response = await get_specialist_response(message, specialist, conversation_history)
            specialist_responses[specialist] = response

        # Step 4: Synthesize responses from all specialists
        synthesis_prompt = f"""You are the Master AI Orchestrator synthesizing advice from multiple barbershop business specialists.

Original Question: "{message}"
Specialists Consulted: {', '.join(specialists_needed)}
Primary Focus: {primary_focus}

Specialist Responses:
"""
        for specialist, response in specialist_responses.items():
            synthesis_prompt += f"\n**{specialist.title()} Specialist:**\n{response}\n"

        # Add execution results if available
        if execution_result and execution_result.get("success"):
            synthesis_prompt += f"""

**ACTIONS EXECUTED:**
The system has already taken the following actions:
{execution_result.get('action_taken', 'Action completed')}
Results: {execution_result.get('message', '')}
"""

        synthesis_prompt += f"""
Now synthesize this advice into ONE cohesive, comprehensive response that:
1. Addresses the original question completely
2. Integrates insights from all specialists seamlessly  
3. Provides actionable, prioritized recommendations
4. Maintains a single, professional voice
5. Includes specific numbers, examples, or benchmarks when relevant
6. {"Acknowledges actions already taken and" if execution_result and execution_result.get("success") else ""} Ends with a strategic next step or follow-up question

The response should read as if ONE expert advisor who understands all aspects of barbershop business is providing comprehensive guidance{"and has already executed requested actions" if execution_result and execution_result.get("success") else ""}."""

        # Get synthesized response
        if anthropic_client:
            try:
                synthesis_response = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1200,
                    messages=[{"role": "user", "content": synthesis_prompt}]
                )
                final_response = synthesis_response.content[0].text
            except Exception as e:
                logger.warning(f"Anthropic synthesis failed: {e}")
                final_response = synthesize_responses_fallback(specialist_responses, message)
        else:
            final_response = synthesize_responses_fallback(specialist_responses, message)

        return {
            "response": final_response,
            "specialists_consulted": specialists_needed,
            "analysis_reasoning": reasoning,
            "complexity": complexity,
            "primary_focus": primary_focus,
            "execution_requested": execution_requested,
            "execution_result": execution_result,
            "specialist_responses": specialist_responses  # For debugging/transparency
        }

    except Exception as e:
        logger.error(f"Master orchestrator error: {e}")
        return {
            "response": await get_specialist_response(message, "master_coach", conversation_history),
            "specialists_consulted": ["master_coach"],
            "analysis_reasoning": "Fallback to general business advice",
            "complexity": "moderate",
            "primary_focus": "business strategy",
            "specialist_responses": {}
        }

def get_fallback_analysis(message: str) -> dict:
    """Fallback analysis when AI services are unavailable"""
    message_lower = message.lower()
    specialists = []
    
    # Check for executable actions
    execution_requested = False
    execution_type = "none"
    execution_details = ""
    
    if any(word in message_lower for word in ['sms blast', 'text blast', 'send sms', 'text customers']):
        execution_requested = True
        execution_type = "sms_blast"
        execution_details = "Send SMS campaign to customers"
        specialists.append('marketing')
    elif any(word in message_lower for word in ['email blast', 'email campaign', 'send email', 'email customers']):
        execution_requested = True
        execution_type = "email_blast" 
        execution_details = "Send email campaign to customers"
        specialists.append('marketing')
    elif any(word in message_lower for word in ['follow up', 'reach out', 'contact lapsed', 'win back']):
        execution_requested = True
        execution_type = "follow_up"
        execution_details = "Follow up with lapsed customers"
        specialists.append('marketing')
    
    # Regular specialist detection
    if any(word in message_lower for word in ['revenue', 'money', 'profit', 'cost', 'price', 'financial', 'budget']):
        specialists.append('financial')
    if any(word in message_lower for word in ['marketing', 'customer', 'advertis', 'promote', 'social']) and 'marketing' not in specialists:
        specialists.append('marketing')  
    if any(word in message_lower for word in ['operation', 'schedul', 'staff', 'efficiency', 'workflow']):
        specialists.append('operations')
    if any(word in message_lower for word in ['brand', 'reputation', 'image', 'experience']):
        specialists.append('brand')
    if any(word in message_lower for word in ['grow', 'expand', 'scale', 'location', 'franchise']):
        specialists.append('growth')
    
    if not specialists:
        specialists = ['master_coach']
    
    return {
        "specialists_needed": specialists,
        "reasoning": f"Keyword analysis identified relevant areas: {', '.join(specialists)}",
        "question_complexity": "moderate",
        "primary_focus": specialists[0] if specialists else "strategy",
        "execution_requested": execution_requested,
        "execution_type": execution_type,
        "execution_details": execution_details
    }

async def handle_executable_action(message: str, execution_type: str, execution_details: str) -> Dict[str, Any]:
    """Handle executable actions through specialized agents"""
    try:
        if execution_type in ["sms_blast", "email_blast", "follow_up"]:
            # Use Marketing Execution Agent
            marketing_agent = ExecutableMarketingAgent("default_barbershop")
            result = await marketing_agent.execute_command(message)
            return result
        
        # Add other executable agents here as they're implemented
        # elif execution_type == "social_post":
        #     social_agent = ExecutableSocialMediaAgent("default_barbershop")
        #     result = await social_agent.execute_command(message)
        #     return result
        
        else:
            return {
                "success": False,
                "message": f"Execution type '{execution_type}' not yet implemented",
                "action_taken": "none"
            }
            
    except Exception as e:
        logger.error(f"Error executing action: {e}")
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to execute requested action",
            "action_taken": "none"
        }

def synthesize_responses_fallback(specialist_responses: dict, message: str) -> str:
    """Fallback synthesis when AI services are unavailable"""
    if not specialist_responses:
        return f"I understand you're asking about: {message}. Let me provide comprehensive business guidance covering the key areas that matter most for barbershop success."
    
    combined = f"Based on your question about '{message}', here's comprehensive guidance from our business specialists:\n\n"
    
    for specialist, response in specialist_responses.items():
        specialist_name = specialist.replace('_', ' ').title()
        combined += f"**{specialist_name} Perspective:**\n{response}\n\n"
    
    combined += "**Strategic Recommendation:** Focus on implementing 1-2 of these strategies immediately while planning the others for gradual rollout over the next 3-6 months."
    
    return combined

# Individual Specialist Response Function
async def get_specialist_response(message: str, agent_type: str, conversation_history: list = None) -> str:
    """
    Get AI response using the best available AI service for the agent type
    """
    try:
        # Create agent-specific prompts
        agent_prompts = {
            "master_coach": f"""You are a Master Business Coach specializing in barbershop operations. You have 15+ years of experience helping barbershops grow and succeed. 

Provide strategic, actionable advice for this question: {message}

Focus on:
- Strategic business planning and growth optimization
- Leadership and team management
- Long-term business development
- Industry-specific insights for barbershops

Be specific, practical, and results-oriented. If you recommend strategies, include implementation steps.""",

            "financial": f"""You are a Financial Advisor specializing in barbershop businesses with deep expertise in salon/barbershop economics.

Answer this financial question: {message}

Focus on:
- Revenue optimization and profit maximization
- Cost management and expense analysis  
- Pricing strategies and service bundling
- Financial KPIs specific to barbershops
- Cash flow management and growth funding

Provide specific numbers, percentages, or benchmarks when possible. Include actionable financial strategies.""",

            "marketing": f"""You are a Marketing Expert specializing in local barbershop marketing with proven track record in customer acquisition.

Address this marketing question: {message}

Focus on:
- Customer acquisition and retention strategies
- Local marketing and community engagement
- Social media marketing for barbershops
- Referral programs and loyalty systems
- Online reputation management

Provide specific tactics, examples, and implementation steps. Include ROI expectations when possible.""",

            "operations": f"""You are an Operations Specialist for barbershops with expertise in workflow optimization and efficiency improvements.

Answer this operations question: {message}

Focus on:
- Workflow optimization and scheduling efficiency
- Staff productivity and service delivery
- Technology integration and automation
- Quality control and customer experience
- Inventory management and supply chain

Provide actionable process improvements with measurable outcomes.""",

            "brand": f"""You are a Brand Strategist specializing in barbershop branding and positioning with experience in local market differentiation.

Address this branding question: {message}

Focus on:
- Brand positioning and differentiation
- Local market reputation building
- Customer experience design
- Brand identity and visual presentation
- Community presence and partnerships

Provide specific branding strategies with implementation examples.""",

            "growth": f"""You are a Growth Expert specializing in barbershop scaling and expansion with experience in multi-location businesses.

Answer this growth question: {message}

Focus on:
- Scaling strategies and expansion planning
- Multi-location management systems
- Franchise or partnership opportunities  
- Team building and leadership development
- Market analysis and opportunity assessment

Provide scalable growth strategies with timeline and resource requirements."""
        }

        prompt = agent_prompts.get(agent_type, agent_prompts["master_coach"])
        
        # Try Anthropic Claude first (best for reasoning and business advice)
        if anthropic_client:
            try:
                response = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1000,
                    messages=[
                        {"role": "user", "content": prompt}
                    ]
                )
                return response.content[0].text
            except Exception as e:
                logger.warning(f"Anthropic API failed: {e}")
        
        # Try OpenAI GPT-4 as backup
        if openai_client:
            try:
                response = openai_client.chat.completions.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": f"You are an expert {agent_type} advisor for barbershops."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=1000,
                    temperature=0.7
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.warning(f"OpenAI API failed: {e}")
        
        # Try Google Gemini as final backup
        if GOOGLE_AI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
                return response.text
            except Exception as e:
                logger.warning(f"Google AI API failed: {e}")
        
        # Fallback to enhanced template responses if no AI services available
        return get_template_response(message, agent_type)
        
    except Exception as e:
        logger.error(f"Error getting AI response: {e}")
        return get_template_response(message, agent_type)

def get_template_response(message: str, agent_type: str) -> str:
    """
    Enhanced template responses as fallback when AI services are unavailable
    """
    responses = {
        "financial": f"""As your Financial Advisor, I've analyzed your question: "{message}"

Key Financial Strategies for Barbershops:

💰 **Revenue Optimization:**
• Increase average transaction value by 25-30% through service bundling
• Implement tiered pricing: Basic ($25), Premium ($45), Luxury ($65+)
• Add retail products with 40-60% profit margins (pomades, styling tools)

📊 **Industry Benchmarks:**
• Successful barbershops average $75-150 revenue per client visit
• Target 60-70% customer retention rate month-over-month
• Aim for 15-25% net profit margin after all expenses

🎯 **Next Steps:**
• Track your current average transaction value
• Identify your top 20% of customers for premium service upselling
• Calculate cost per customer acquisition for marketing ROI

What's your current average revenue per customer? This will help me provide more targeted advice.""",

        "marketing": f"""As your Marketing Expert, I understand you're asking about: "{message}"

Proven Marketing Strategies for Barbershops:

📱 **Digital Marketing:**
• Post before/after photos on Instagram/TikTok (3-5x weekly)
• Google My Business optimization with customer reviews
• Local SEO targeting "[city] barbershop" keywords

🤝 **Community Engagement:**
• Partner with local businesses for cross-promotion
• Sponsor local sports teams or community events
• Referral rewards: $10 credit for each new customer referred

📈 **Customer Retention:**
• Loyalty program: 10th cut free or 20% off
• Birthday discounts and anniversary offers
• Text/email reminders for next appointment

**Expected ROI:** Good barbershop marketing typically returns $3-5 for every $1 invested.

Which marketing channel interests you most? I can dive deeper into implementation.""",

        "operations": f"""As your Operations Specialist, analyzing: "{message}"

Operational Excellence Framework:

⏰ **Scheduling Optimization:**
• Implement online booking system (reduces no-shows by 30%)
• Buffer time between appointments: 15-min for standard cuts, 30-min for complex services
• Peak hour premium pricing to balance demand

👥 **Team Efficiency:**
• Standardize service procedures for consistency
• Cross-train staff on multiple services
• Daily team huddles for communication and goals

📋 **Quality Control:**
• Customer feedback system after each visit
• Mystery shopper program monthly
• Standard operating procedures checklist

🎯 **Key Metrics to Track:**
• Average service time per cut type
• Customer wait time (target: under 10 minutes)
• Staff utilization rate (target: 75-85%)

What's your biggest operational challenge right now? Let's solve it step by step.""",

        "brand": f"""As your Brand Strategist, addressing: "{message}"

Brand Positioning Strategy:

🎯 **Differentiation Framework:**
• Define your unique value proposition (classic, modern, luxury, community-focused?)
• Create signature services only you offer
• Develop your barbershop's personality and voice

🏪 **Physical Brand Experience:**
• Consistent visual identity: logo, colors, signage
• Atmosphere design: music, lighting, decor that matches your brand
• Staff appearance and service style alignment

🌟 **Reputation Building:**
• Encourage online reviews and testimonials
• Showcase your work through portfolio displays
• Community involvement that aligns with brand values

📱 **Digital Brand Presence:**
• Professional website with online booking
• Consistent social media voice and visual style
• Customer success stories and transformations

What type of barbershop experience do you want to be known for? This will guide our brand strategy.""",

        "growth": f"""As your Growth Expert, analyzing: "{message}"

Scaling Strategy Framework:

📈 **Growth Phases:**
• Phase 1: Optimize current location to 80%+ capacity
• Phase 2: Build systems and processes for replication
• Phase 3: Strategic expansion or partnership opportunities

💡 **Expansion Options:**
• Second location in complementary neighborhood
• Mobile barbershop services for corporate clients
• Franchise model for rapid growth
• Acquisition of existing barbershops

🔧 **Systems Required for Growth:**
• Standardized training programs
• Financial management systems
• Marketing playbooks that work
• Quality control processes

📊 **Growth Metrics:**
• Target 20%+ revenue growth annually
• Maintain 15%+ profit margins during expansion
• Customer satisfaction scores above 4.5/5

🎯 **Next Steps:**
• Assess current location's growth potential
• Document all successful processes
• Build management team for delegation

What's your timeline for growth, and what's holding you back currently?"""
    }
    
    # Fallback for master_coach and unknown agent types
    default_response = f"""As your Business Advisor, I've analyzed your question: "{message}"

Strategic Business Guidance:

🎯 **Key Focus Areas:**
• Customer experience and service quality excellence
• Team development and operational efficiency
• Revenue growth through strategic positioning
• Brand building and community engagement

🚀 **Immediate Action Steps:**
• Assess current business performance metrics
• Identify top 3 improvement opportunities
• Develop 30-60-90 day implementation plan
• Track progress with measurable KPIs

💡 **Industry Best Practices:**
• Focus on customer retention (costs 5x less than acquisition)
• Invest in staff training and development
• Leverage technology for operational efficiency
• Build strong community relationships

What's your biggest business challenge right now? I can provide more targeted strategic advice."""

    return responses.get(agent_type, default_response)

@app.post("/api/chat/unified")
async def unified_chat(request: dict):
    """
    Unified AI Chat Interface with Real AI Integration
    Orchestrates multiple agents based on conversation context using OpenAI, Anthropic, or Google AI
    """
    try:
        message = request.get("message", "")
        agents = request.get("agents", ["master_coach"])
        conversation_history = request.get("conversation_history", [])
        
        if not message.strip():
            return {
                "success": False,
                "error": "Message cannot be empty",
                "response": "Please provide a question or message for me to respond to."
            }
        
        # Use the primary agent (first in the list)
        primary_agent = agents[0] if agents else "master_coach"
        
        # Use Master Orchestrator to coordinate multiple specialists
        orchestrator_result = await master_orchestrator(message, conversation_history)
        ai_response = orchestrator_result["response"]
        specialists_consulted = orchestrator_result["specialists_consulted"]
        
        # Agent role mapping for response metadata
        agent_roles = {
            "master_coach": "Strategic Business Coach",
            "financial": "Financial Advisor",
            "marketing": "Marketing Expert", 
            "operations": "Operations Specialist",
            "brand": "Brand Strategist",
            "growth": "Growth Expert"
        }
        
        return {
            "success": True,
            "response": ai_response,
            "agents_involved": specialists_consulted,
            "specialists_consulted": specialists_consulted,
            "orchestration_used": True,
            "analysis_reasoning": orchestrator_result.get("analysis_reasoning", ""),
            "question_complexity": orchestrator_result.get("complexity", "moderate"),
            "primary_focus": orchestrator_result.get("primary_focus", "business strategy"),
            "message_id": f"msg_{len(conversation_history) + 1}",
            "ai_powered": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Unified chat error: {e}")
        return {
            "success": False,
            "error": f"Chat processing error: {str(e)}",
            "response": "I apologize, but I'm experiencing technical difficulties. Please try again in a moment."
        }

if __name__ == "__main__":
    print("🚀 Starting 6FB AI Agent System FastAPI Server...")
    print("📚 Enterprise RAG Engine: Active")
    print("🎯 Available Agents: 7 specialized agents loaded")
    print("🔗 API Endpoints: /api/v1/ai-agents/chat, /api/v1/health")
    print("🌐 CORS: Configured for Next.js integration")
    
    uvicorn.run(
        "fastapi-server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        access_log=True
    )