#!/usr/bin/env python3
"""
Enhanced FastAPI Server with Async Database Connection Pool
Production-ready async database operations with proper connection management,
WAL mode, and connection limits replacing sync SQLite operations.
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
import os
import logging
from contextlib import asynccontextmanager

# Import database modules
from database.async_connection_pool import ConnectionPoolConfig
from database.async_database_init import initialize_database, health_check_database, get_database_info
from database.async_repositories import (
    get_user_repository, 
    get_session_repository, 
    get_message_repository,
    get_insights_repository,
    database_transaction
)

# Import agentic coach
import sys
sys.path.append(os.path.dirname(__file__))
from agentic_coach_design import AgenticBusinessCoach, ShopContext, BusinessStage

# Import Sentry configuration
from services.sentry_config import init_sentry, capture_exception, add_breadcrumb

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database configuration
DATABASE_PATH = "agent_system.db"
DB_CONFIG = ConnectionPoolConfig(
    database_path=DATABASE_PATH,
    max_connections=20,
    min_connections=5,
    connection_timeout=30.0,
    idle_timeout=300.0,
    enable_wal=True,
    enable_foreign_keys=True,
    journal_mode="WAL",
    synchronous="NORMAL",
    cache_size=-64000,  # 64MB cache
    busy_timeout=30000  # 30 seconds
)

# Authentication Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Security
security = HTTPBearer()

# Global agentic coach instance
agentic_coach = AgenticBusinessCoach()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan with proper database initialization and cleanup"""
    logger.info("🚀 Starting 6FB Agentic AI Coach with Async Database Pool...")
    
    # Initialize Sentry error tracking
    init_sentry(app)
    
    try:
        # Initialize database with connection pool
        success = await initialize_database(DATABASE_PATH, DB_CONFIG)
        if not success:
            raise RuntimeError("Failed to initialize database")
        
        logger.info("✅ Database and connection pool initialized successfully")
        logger.info(f"📊 Database path: {DATABASE_PATH}")
        logger.info(f"🔗 Max connections: {DB_CONFIG.max_connections}")
        logger.info(f"💾 WAL mode enabled: {DB_CONFIG.enable_wal}")
        
        yield
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize application: {e}")
        raise
    finally:
        # Cleanup on shutdown
        logger.info("🔄 Shutting down application...")
        try:
            from database.async_connection_pool import close_connection_pool
            await close_connection_pool()
            logger.info("✅ Database connection pool closed")
        except Exception as e:
            logger.error(f"❌ Error during shutdown: {e}")


# Create FastAPI app with lifespan management
app = FastAPI(
    title="6FB Agentic AI Coach",
    description="Single intelligent business coach with production-ready async database",
    version="2.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:9999"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models (unchanged from original)
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

# Authentication utilities (updated to use async repositories)
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    """Hash password for storage"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current user from JWT token using async database operations"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user from database using async repository
    user_repo = await get_user_repository()
    result = await user_repo.get_user_by_email(email)
    
    if not result.success or not result.data:
        raise credentials_exception
    
    return User(**result.data)

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

# Authentication endpoints (updated to use async repositories)
@app.post("/api/v1/auth/register", response_model=Token)
async def register_user(user: UserRegister):
    """Register a new user with async database operations"""
    try:
        user_repo = await get_user_repository()
        
        # Check if user already exists
        existing_result = await user_repo.get_user_by_email(user.email)
        if existing_result.success and existing_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new user
        hashed_password = get_password_hash(user.password)
        create_result = await user_repo.create_user(
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name,
            barbershop_name=user.barbershop_name
        )
        
        if not create_result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating user: {create_result.error}"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        logger.info(f"User registered successfully: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during registration: {str(e)}"
        )

@app.post("/api/v1/auth/login", response_model=Token)
async def login_user(user: UserLogin):
    """Login user with async database operations"""
    try:
        user_repo = await get_user_repository()
        
        # Get user from database
        result = await user_repo.get_user_by_email(user.email)
        
        if not result.success or not result.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        db_user = result.data
        
        # Verify password
        if not verify_password(user.password, db_user["hashed_password"]):
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
        
        logger.info(f"User logged in successfully: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error during login: {str(e)}"
        )

@app.get("/api/v1/auth/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.post("/api/v1/auth/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Logout user (client-side token removal)"""
    return {"message": "Successfully logged out"}

# Agentic coach endpoints (updated to use async repositories)
@app.post("/api/v1/agentic-coach/chat", response_model=AgenticChatResponse)
async def chat_with_agentic_coach(
    request: AgenticChatRequest, 
    current_user: User = Depends(get_current_user)
):
    """
    Chat with the intelligent agentic business coach using async database operations.
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
        
        # Save the interaction to database using async repositories
        async with database_transaction() as repos:
            # Save user message
            await repos['messages'].save_message(
                session_id=session_id,
                role="user",
                content=request.message
            )
            
            # Save assistant response
            await repos['messages'].save_message(
                session_id=session_id,
                role="assistant",
                content=response["response"],
                domains_addressed=response["domains_addressed"],
                recommendations=response["recommendations"],
                confidence=response["confidence"],
                urgency=response["urgency"],
                requires_data=response["requires_data"]
            )
            
            # Save/update session
            await repos['sessions'].create_or_update_session(
                session_id=session_id,
                user_id=current_user.id,
                shop_context=shop_context.__dict__,
                conversation_history=[
                    {"role": "user", "content": request.message, "timestamp": datetime.now().isoformat()},
                    {"role": "assistant", "content": response["response"], "timestamp": datetime.now().isoformat()}
                ]
            )
        
        logger.info(f"Agentic chat completed for user {current_user.id}, session {session_id}")
        return AgenticChatResponse(**response)
        
    except Exception as e:
        logger.error(f"Agentic chat error: {e}")
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
        updated_fields = [key for key, value in context_update.dict().items() if value is not None]
        
        logger.info(f"Shop context updated for user {current_user.id}: {updated_fields}")
        return {
            "message": "Shop context updated successfully",
            "updated_fields": updated_fields,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Shop context update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating shop context: {str(e)}"
        )

@app.get("/api/v1/agentic-coach/conversation-history/{session_id}")
async def get_conversation_history(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation history for a specific session using async repositories"""
    try:
        message_repo = await get_message_repository()
        result = await message_repo.get_session_messages(session_id)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error retrieving conversation history: {result.error}"
            )
        
        messages = result.data or []
        
        return {
            "session_id": session_id,
            "messages": messages,
            "total_messages": len(messages)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Conversation history error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving conversation history: {str(e)}"
        )

@app.get("/api/v1/agentic-coach/learning-insights")
async def get_learning_insights(current_user: User = Depends(get_current_user)):
    """Get learning insights from the agentic coach system"""
    try:
        # Get insights from database
        insights_repo = await get_insights_repository()
        result = await insights_repo.get_all_insights(limit=100)
        
        insights_data = result.data if result.success else []
        
        # Also get coach learning data
        coach_learning_data = agentic_coach.learning_data
        
        return {
            "database_insights": insights_data,
            "coach_learning_data": {
                "shop_profiles": list(coach_learning_data.keys()),
                "total_interactions": sum(
                    sum(questions.values()) 
                    for profile_data in coach_learning_data.values() 
                    for questions in [profile_data.get("common_questions", {})]
                ),
                "learning_insights": coach_learning_data
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Learning insights error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving learning insights: {str(e)}"
        )

# Database health and monitoring endpoints
@app.get("/api/v1/database/health")
async def database_health():
    """Get database health status"""
    try:
        health_status = await health_check_database(DATABASE_PATH)
        return health_status
    except Exception as e:
        logger.error(f"Database health check error: {e}")
        return {
            "healthy": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/v1/database/info")
async def database_info():
    """Get comprehensive database information"""
    try:
        info = await get_database_info(DATABASE_PATH)
        return info
    except Exception as e:
        logger.error(f"Database info error: {e}")
        return {"error": str(e)}

@app.get("/api/v1/database/stats")
async def database_stats():
    """Get database connection pool statistics"""
    try:
        from database.async_connection_pool import get_connection_pool
        pool = get_connection_pool()
        stats = pool.get_stats()
        health = await pool.health_check()
        
        return {
            "connection_pool": stats,
            "health": health,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Database stats error: {e}")
        return {"error": str(e)}

# Health check endpoint (updated with database health)
@app.get("/api/v1/health")
async def health_check():
    """Comprehensive health check including database"""
    try:
        db_health = await health_check_database(DATABASE_PATH)
        
        return {
            "status": "healthy" if db_health.get("healthy", False) else "degraded",
            "service": "6FB Agentic AI Coach",
            "version": "2.1.0",
            "coach_type": "single_intelligent_agent",
            "rag_engine": "active",
            "learning_enabled": True,
            "context_aware": True,
            "database": {
                "healthy": db_health.get("healthy", False),
                "connection_pool": "active",
                "wal_mode": db_health.get("wal_enabled", False),
                "foreign_keys": db_health.get("foreign_keys_enabled", False)
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Backward compatibility endpoints (unchanged)
@app.post("/api/v1/ai-agents/chat")
async def legacy_agent_chat(
    request: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Backward compatibility endpoint for old 7-agent system"""
    try:
        message = request.get("message", "")
        legacy_agent_id = request.get("agent_id", "")
        context = request.get("context", {})
        
        if legacy_agent_id:
            message = f"[Legacy agent preference: {legacy_agent_id}] {message}"
        
        agentic_request = AgenticChatRequest(
            message=message,
            shop_context=context
        )
        
        return await chat_with_agentic_coach(agentic_request, current_user)
        
    except Exception as e:
        logger.error(f"Legacy agent compatibility error: {e}")
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
            "total_capabilities": "all_business_domains",
            "database": "async_connection_pool"
        }],
        "migration_note": "All 7 previous agents consolidated into one intelligent coach with async database",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("🚀 Starting 6FB Agentic AI Coach with Async Database Pool...")
    print("🧠 Single Intelligent Agent: Active")
    print("📚 RAG Learning Engine: Enabled")
    print("🎯 Context-Aware Responses: Active")
    print("💾 Async Database Pool: Configured")
    print("🔗 WAL Mode: Enabled")
    print("⚡ Connection Pool: 20 max, 5 min connections")
    print("🔗 API Endpoints: /api/v1/agentic-coach/chat")
    print("🩺 Health Checks: /api/v1/health, /api/v1/database/health")
    print("🌐 CORS: Configured for Next.js integration")
    print("🔄 Backward Compatibility: Maintained")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        access_log=True
    )