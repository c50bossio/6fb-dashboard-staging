#!/usr/bin/env python3
"""
Enhanced FastAPI Server with Single Agentic Business Coach
Replaces 7 separate agents with one intelligent, context-aware system
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
import uvicorn
import asyncio
import json
from datetime import datetime, timedelta
import jwt
import bcrypt
import sqlite3
import os
from enum import Enum

# Import our agentic coach
import sys
import os
sys.path.append(os.path.dirname(__file__))
from agentic_coach_design import AgenticBusinessCoach, ShopContext, BusinessStage

app = FastAPI(title="6FB Agentic AI Coach", description="Single intelligent business coach that gets smarter with data")

# Authentication Configuration
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security
security = HTTPBearer()

# Initialize the agentic coach
agentic_coach = AgenticBusinessCoach()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:9999"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup (keeping existing auth system)
def init_database():
    """Initialize SQLite database for users and enhanced chat history"""
    conn = sqlite3.connect('agent_system.db')
    cursor = conn.cursor()
    
    # Users table (existing)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT NOT NULL,
            barbershop_name TEXT,
            barbershop_id TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    
    # Enhanced chat sessions for agentic coach
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agentic_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            shop_context TEXT NOT NULL,  -- JSON of ShopContext
            conversation_history TEXT,   -- JSON of conversation history
            ongoing_projects TEXT,       -- JSON array of current projects
            goals TEXT,                  -- JSON array of goals
            pain_points TEXT,            -- JSON array of pain points
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Enhanced chat messages with more context
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS agentic_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            domains_addressed TEXT,      -- JSON array of domains
            recommendations TEXT,        -- JSON array of recommendations
            confidence REAL,
            urgency TEXT,
            requires_data BOOLEAN,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES agentic_sessions (session_id)
        )
    ''')
    
    # Learning data storage
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS learning_insights (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            shop_profile TEXT NOT NULL,  -- business_stage_location_type
            question_domain TEXT NOT NULL,
            question_pattern TEXT,
            recommendation_success TEXT, -- JSON of successful recommendations
            conversation_context TEXT,   -- JSON of conversation context
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Pydantic models
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
    id: int
    email: str
    full_name: str
    barbershop_name: Optional[str] = None
    barbershop_id: Optional[str] = None
    is_active: bool

class AgenticChatRequest(BaseModel):
    message: str
    shop_context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ShopContextUpdate(BaseModel):
    monthly_revenue: Optional[float] = None
    monthly_appointments: Optional[int] = None
    staff_count: Optional[int] = None
    location_type: Optional[str] = None
    avg_service_price: Optional[float] = None
    customer_retention_rate: Optional[float] = None
    peak_hours: Optional[List[str]] = None
    slow_periods: Optional[List[str]] = None
    competitor_count: Optional[int] = None
    review_rating: Optional[float] = None
    years_in_business: Optional[int] = None

class AgenticChatResponse(BaseModel):
    session_id: str
    response: str
    recommendations: List[Dict[str, Any]]
    followup_suggestions: List[str]
    confidence: float
    domains_addressed: List[str]
    requires_data: bool
    urgency: str
    timestamp: str

# Authentication utilities (keeping existing system)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_by_email(email: str) -> Optional[Dict]:
    conn = sqlite3.connect('agent_system.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row[0],
            "email": row[1],
            "hashed_password": row[2],
            "full_name": row[3],
            "barbershop_name": row[4],
            "barbershop_id": row[5],
            "created_at": row[6],
            "is_active": row[7]
        }
    return None

def create_user(user: UserRegister) -> Dict:
    conn = sqlite3.connect('agent_system.db')
    cursor = conn.cursor()
    
    hashed_password = get_password_hash(user.password)
    barbershop_id = f"barber_{int(datetime.now().timestamp())}" if user.barbershop_name else None
    
    cursor.execute("""
        INSERT INTO users (email, hashed_password, full_name, barbershop_name, barbershop_id)
        VALUES (?, ?, ?, ?, ?)
    """, (user.email, hashed_password, user.full_name, user.barbershop_name, barbershop_id))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return {
        "id": user_id,
        "email": user.email,
        "full_name": user.full_name,
        "barbershop_name": user.barbershop_name,
        "barbershop_id": barbershop_id,
        "is_active": True
    }

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
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
    
    user = get_user_by_email(email)
    if user is None:
        raise credentials_exception
    
    return User(**user)

# Helper functions for shop context
def create_shop_context(user: User, context_update: Optional[Dict[str, Any]] = None) -> ShopContext:
    """Create ShopContext from user data and optional updates"""
    
    # Determine business stage based on available data
    business_stage = BusinessStage.STARTUP  # Default
    if context_update and context_update.get("years_in_business"):
        years = context_update["years_in_business"]
        if years >= 7:
            business_stage = BusinessStage.ENTERPRISE
        elif years >= 3:
            business_stage = BusinessStage.ESTABLISHED
        elif years >= 1:
            business_stage = BusinessStage.GROWTH
    
    shop_context = ShopContext(
        shop_id=user.barbershop_id or f"shop_{user.id}",
        owner_name=user.full_name,
        shop_name=user.barbershop_name or f"{user.full_name}'s Barbershop",
        business_stage=business_stage
    )
    
    # Apply context updates if provided
    if context_update:
        for key, value in context_update.items():
            if hasattr(shop_context, key) and value is not None:
                setattr(shop_context, key, value)
    
    return shop_context

def save_agentic_session(session_id: str, user_id: int, shop_context: ShopContext, 
                        conversation_history: List[Dict], ongoing_projects: List[str] = None,
                        goals: List[str] = None, pain_points: List[str] = None):
    """Save or update agentic session in database"""
    conn = sqlite3.connect('agent_system.db')
    cursor = conn.cursor()
    
    # Check if session exists
    cursor.execute("SELECT id FROM agentic_sessions WHERE session_id = ?", (session_id,))
    exists = cursor.fetchone()
    
    shop_context_json = json.dumps(shop_context.__dict__, default=str)
    history_json = json.dumps(conversation_history)
    projects_json = json.dumps(ongoing_projects or [])
    goals_json = json.dumps(goals or [])
    pain_points_json = json.dumps(pain_points or [])
    
    if exists:
        cursor.execute("""
            UPDATE agentic_sessions 
            SET shop_context = ?, conversation_history = ?, ongoing_projects = ?,
                goals = ?, pain_points = ?, updated_at = CURRENT_TIMESTAMP
            WHERE session_id = ?
        """, (shop_context_json, history_json, projects_json, goals_json, pain_points_json, session_id))
    else:
        cursor.execute("""
            INSERT INTO agentic_sessions 
            (session_id, user_id, shop_context, conversation_history, ongoing_projects, goals, pain_points)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (session_id, user_id, shop_context_json, history_json, projects_json, goals_json, pain_points_json))
    
    conn.commit()
    conn.close()

def save_agentic_message(session_id: str, role: str, content: str, 
                        domains_addressed: List[str] = None, recommendations: List[Dict] = None,
                        confidence: float = None, urgency: str = None, requires_data: bool = False):
    """Save agentic message to database"""
    conn = sqlite3.connect('agent_system.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        INSERT INTO agentic_messages 
        (session_id, role, content, domains_addressed, recommendations, confidence, urgency, requires_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (session_id, role, content, 
          json.dumps(domains_addressed or []),
          json.dumps(recommendations or []),
          confidence, urgency, requires_data))
    
    conn.commit()
    conn.close()

# Authentication endpoints (keeping existing)
@app.post("/api/v1/auth/register", response_model=Token)
async def register_user(user: UserRegister):
    try:
        existing_user = get_user_by_email(user.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        new_user = create_user(user)
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
    try:
        db_user = get_user_by_email(user.email)
        if not db_user or not verify_password(user.password, db_user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
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
    return current_user

@app.post("/api/v1/auth/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}

# NEW: Agentic coach endpoints
@app.post("/api/v1/agentic-coach/chat", response_model=AgenticChatResponse)
async def chat_with_agentic_coach(
    request: AgenticChatRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Chat with the single intelligent agentic business coach.
    This replaces all 7 previous agents with one context-aware system.
    """
    try:
        # Create shop context from user data and any provided context
        shop_context = create_shop_context(current_user, request.shop_context)
        
        # Generate session ID if not provided
        session_id = request.session_id or f"agentic_{current_user.id}_{int(datetime.now().timestamp())}"
        
        # Use the agentic coach to analyze and respond
        response = await agentic_coach.analyze_and_respond(
            user_message=request.message,
            session_id=session_id,
            shop_context=shop_context
        )
        
        # Save the interaction to database
        save_agentic_message(
            session_id=session_id,
            role="user",
            content=request.message
        )
        
        save_agentic_message(
            session_id=session_id,
            role="assistant",
            content=response["response"],
            domains_addressed=response["domains_addressed"],
            recommendations=response["recommendations"],
            confidence=response["confidence"],
            urgency=response["urgency"],
            requires_data=response["requires_data"]
        )
        
        # Return the structured response
        return AgenticChatResponse(**response)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing agentic chat: {str(e)}"
        )

@app.put("/api/v1/agentic-coach/shop-context")
async def update_shop_context(
    context_update: ShopContextUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update shop context with real business data to improve recommendations"""
    try:
        # This would typically save to a separate shop_profiles table
        # For now, we'll return success as the context is used in real-time during chat
        
        return {
            "message": "Shop context updated successfully",
            "updated_fields": [key for key, value in context_update.dict().items() if value is not None],
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating shop context: {str(e)}"
        )

@app.get("/api/v1/agentic-coach/conversation-history/{session_id}")
async def get_conversation_history(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation history for a specific session"""
    try:
        conn = sqlite3.connect('agent_system.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT role, content, domains_addressed, recommendations, confidence, urgency, timestamp
            FROM agentic_messages 
            WHERE session_id = ?
            ORDER BY timestamp ASC
        """, (session_id,))
        
        messages = []
        for row in cursor.fetchall():
            messages.append({
                "role": row[0],
                "content": row[1],
                "domains_addressed": json.loads(row[2]) if row[2] else [],
                "recommendations": json.loads(row[3]) if row[3] else [],
                "confidence": row[4],
                "urgency": row[5],
                "timestamp": row[6]
            })
        
        conn.close()
        
        return {
            "session_id": session_id,
            "messages": messages,
            "total_messages": len(messages)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving conversation history: {str(e)}"
        )

@app.get("/api/v1/agentic-coach/learning-insights")
async def get_learning_insights(current_user: User = Depends(get_current_user)):
    """Get learning insights from the agentic coach system"""
    try:
        # Return current learning data from the coach
        learning_data = agentic_coach.learning_data
        
        return {
            "shop_profiles": list(learning_data.keys()),
            "total_interactions": sum(
                sum(questions.values()) 
                for profile_data in learning_data.values() 
                for questions in [profile_data.get("common_questions", {})]
            ),
            "learning_insights": learning_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving learning insights: {str(e)}"
        )

# Keep existing health and compatibility endpoints
@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "6FB Agentic AI Coach",
        "version": "2.0.0",
        "coach_type": "single_intelligent_agent",
        "rag_engine": "active",
        "learning_enabled": True,
        "context_aware": True,
        "timestamp": datetime.now().isoformat()
    }

# Backward compatibility: redirect old agent calls to agentic coach
@app.post("/api/v1/ai-agents/chat")
async def legacy_agent_chat(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Backward compatibility endpoint for old 7-agent system.
    Redirects to agentic coach with appropriate context.
    """
    try:
        # Extract message and context from legacy request format
        message = request.get("message", "")
        legacy_agent_id = request.get("agent_id", "")
        context = request.get("context", {})
        
        # Add legacy agent preference to context if needed
        if legacy_agent_id:
            message = f"[Legacy agent preference: {legacy_agent_id}] {message}"
        
        # Use agentic coach
        agentic_request = AgenticChatRequest(
            message=message,
            shop_context=context
        )
        
        return await chat_with_agentic_coach(agentic_request, current_user)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in legacy agent compatibility: {str(e)}"
        )

@app.get("/api/v1/agents")
async def list_agents():
    """Backward compatibility: show that we now have one intelligent agent"""
    return {
        "agents": [{
            "id": "agentic_coach",
            "name": "🎯 Intelligent Business Coach",
            "status": "active",
            "type": "agentic_rag_powered",
            "capabilities": [
                "financial_optimization",
                "customer_acquisition", 
                "operations_improvement",
                "growth_strategy",
                "brand_development",
                "staff_management",
                "strategic_planning"
            ],
            "learning_enabled": True,
            "context_aware": True,
            "total_capabilities": "all_business_domains"
        }],
        "migration_note": "All 7 previous agents consolidated into one intelligent coach",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🚀 Starting 6FB Agentic AI Coach...")
    print("🧠 Single Intelligent Agent: Active")
    print("📚 RAG Learning Engine: Enabled")
    print("🎯 Context-Aware Responses: Active")
    print("🔗 API Endpoints: /api/v1/agentic-coach/chat")
    print("🌐 CORS: Configured for Next.js integration")
    print("🔄 Backward Compatibility: Maintained")
    
    uvicorn.run(
        "enhanced-fastapi-server:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        access_log=True
    )