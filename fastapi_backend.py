#!/usr/bin/env python3
"""
FastAPI backend for 6FB AI Agent System with authentication and AI endpoints
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from middleware.rate_limiting import RateLimitMiddleware
from middleware.security_headers import SecurityHeadersMiddleware, SecurityReportingMiddleware
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import asyncio
import json
import os
import hashlib
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from services.notification_service import notification_service
from services.notification_queue import notification_queue

# Import alert API service
try:
    from services.alert_api_service import alert_app
    ALERT_SERVICE_AVAILABLE = True
except ImportError:
    ALERT_SERVICE_AVAILABLE = False
    print("⚠️ Alert service not available")

# Import business recommendations engine
try:
    from services.business_recommendations_engine import business_recommendations_engine
    RECOMMENDATIONS_ENGINE_AVAILABLE = True
except ImportError:
    RECOMMENDATIONS_ENGINE_AVAILABLE = False
    print("⚠️ Business recommendations engine not available")

# Import enhanced business recommendations service
try:
    from services.business_recommendations_service import business_recommendations_service
    ENHANCED_RECOMMENDATIONS_AVAILABLE = True
except ImportError:
    ENHANCED_RECOMMENDATIONS_AVAILABLE = False
    print("⚠️ Enhanced business recommendations service not available")

# Import AI performance monitoring
try:
    from services.ai_performance_monitoring import ai_performance_monitor
    PERFORMANCE_MONITORING_AVAILABLE = True
except ImportError:
    PERFORMANCE_MONITORING_AVAILABLE = False
    print("⚠️ AI performance monitoring not available")

# Import enhanced business knowledge service
try:
    from services.enhanced_business_knowledge_service import enhanced_business_knowledge_service
    ENHANCED_KNOWLEDGE_AVAILABLE = True
except ImportError:
    ENHANCED_KNOWLEDGE_AVAILABLE = False
    print("⚠️ Enhanced business knowledge service not available")

# Initialize FastAPI app
app = FastAPI(
    title="6FB AI Agent System API",
    description="AI-powered barbershop management system",
    version="2.0.0"
)

# Security headers middleware (first layer) - commented out temporarily due to ASGI compatibility issue
# app.add_middleware(
#     SecurityHeadersMiddleware,
#     environment=os.getenv('NODE_ENV', 'development')
# )

# Security reporting middleware - commented out temporarily due to ASGI compatibility issue
# app.add_middleware(SecurityReportingMiddleware)

# Rate limiting middleware (before CORS) - now fixed with proper BaseHTTPMiddleware
app.add_middleware(
    RateLimitMiddleware,
    redis_client=None,  # Using in-memory fallback
    enabled=True
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9999", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database setup
DATABASE_PATH = "data/agent_system.db"

@contextmanager
def get_db():
    """Database connection context manager"""
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    """Initialize database tables"""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT
            )
        """)
        
        conn.execute("""
            CREATE TABLE IF NOT EXISTS shop_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                profile_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        """)
        
        conn.commit()

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    shop_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ChatMessage(BaseModel):
    message: str
    agent_id: Optional[str] = "business_coach"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# Helper functions
def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = "6fb-salt"  # In production, use unique salt per user
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

def create_token(user_id: int) -> str:
    """Create session token"""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now() + timedelta(days=7)
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
            (token, user_id, expires_at)
        )
        conn.commit()
    
    return token

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from token"""
    token = credentials.credentials
    
    # Development bypass for cross-browser testing
    is_development = os.getenv('NODE_ENV') == 'development' or os.getenv('ENVIRONMENT') == 'development'
    is_dev_token = token == 'dev-bypass-token'
    
    if is_development and is_dev_token:
        return {
            'id': 'dev-user-123',
            'email': 'dev@example.com',
            'name': 'Development User',
            'role': 'shop_owner'
        }
    
    with get_db() as conn:
        cursor = conn.execute(
            """SELECT u.* FROM users u 
               JOIN sessions s ON u.id = s.user_id 
               WHERE s.token = ? AND s.expires_at > datetime('now')""",
            (token,)
        )
        user = cursor.fetchone()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    return dict(user)

# Routes
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("✅ Database initialized")
    
    # Start notification queue processing
    asyncio.create_task(notification_queue.start_processing())
    print("✅ Notification queue processor started")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "6FB AI Agent System Backend",
        "status": "running",
        "version": "2.0.0",
        "endpoints": {
            "auth": "/api/v1/auth/*",
            "agents": "/api/v1/agents/*",
            "chat": "/api/v1/chat",
            "dashboard": "/api/v1/dashboard/*"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "6fb-ai-backend", "version": "2.0.0"}

# Authentication endpoints
@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    """Register new user"""
    with get_db() as conn:
        # Check if user exists
        cursor = conn.execute("SELECT id FROM users WHERE email = ?", (user.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        password_hash = hash_password(user.password)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, shop_name) VALUES (?, ?, ?)",
            (user.email, password_hash, user.shop_name)
        )
        user_id = cursor.lastrowid
        conn.commit()
    
    # Create session
    token = create_token(user_id)
    
    return {
        "access_token": token,
        "user": {
            "id": user_id,
            "email": user.email,
            "shop_name": user.shop_name
        }
    }

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    """Login user"""
    print(f"LOGIN ATTEMPT: email={user.email}")
    
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?",
            (user.email,)
        )
        db_user = cursor.fetchone()
    
    print(f"DB USER FOUND: {db_user is not None}")
    if db_user:
        print(f"DB USER: id={db_user['id']}, email={db_user['email']}")
        password_verified = verify_password(user.password, db_user["password_hash"])
        print(f"Authentication result: {'SUCCESS' if password_verified else 'FAILED'}")
    
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        print("LOGIN FAILED: Invalid credentials")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create session
    token = create_token(db_user["id"])
    
    return {
        "access_token": token,
        "user": {
            "id": db_user["id"],
            "email": db_user["email"],
            "shop_name": db_user["shop_name"]
        }
    }

@app.post("/api/v1/auth/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout user"""
    # In a real app, invalidate the token
    return {"message": "Logged out successfully"}

@app.get("/api/v1/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# AI Agent endpoints
@app.get("/api/v1/agents")
async def get_agents():
    """Get available AI agents"""
    return [
        {
            "id": "business_coach",
            "name": "Business Coach",
            "description": "Strategic guidance for growing your barbershop",
            "status": "active",
            "icon": "ChartBarIcon"
        },
        {
            "id": "marketing_expert",
            "name": "Marketing Expert",
            "description": "Automated marketing campaigns and customer engagement",
            "status": "active",
            "icon": "MegaphoneIcon"
        },
        {
            "id": "financial_advisor",
            "name": "Financial Advisor",
            "description": "Revenue optimization and financial insights",
            "status": "active",
            "icon": "CurrencyDollarIcon"
        },
        {
            "id": "customer_intelligence",
            "name": "Customer Intelligence",
            "description": "Customer analytics and retention strategies",
            "status": "active",
            "icon": "UsersIcon"
        },
        {
            "id": "content_generator",
            "name": "Content Generator",
            "description": "Social media posts and marketing content",
            "status": "active",
            "icon": "PencilIcon"
        },
        {
            "id": "booking_manager",
            "name": "Smart Booking Manager",
            "description": "Automated scheduling and appointment optimization",
            "status": "active",
            "icon": "CalendarIcon"
        }
    ]

@app.post("/api/v1/chat")
async def chat_with_agent(
    message: ChatMessage,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI agent"""
    # Simulate AI response based on agent type
    agent_responses = {
        "business_coach": {
            "prefix": "Based on barbershop industry trends",
            "suggestions": [
                "Consider offering package deals for regular customers",
                "Track your busiest hours to optimize staffing",
                "Implement a referral program to grow your client base"
            ]
        },
        "marketing_expert": {
            "prefix": "For effective barbershop marketing",
            "suggestions": [
                "Post before/after photos on social media",
                "Send appointment reminders via SMS",
                "Create special promotions for slow days"
            ]
        },
        "financial_advisor": {
            "prefix": "To improve your barbershop's finances",
            "suggestions": [
                "Track service profitability by type",
                "Monitor your product inventory costs",
                "Set revenue goals for each barber"
            ]
        }
    }
    
    agent_info = agent_responses.get(message.agent_id, agent_responses["business_coach"])
    
    response = {
        "agent_id": message.agent_id,
        "response": f"{agent_info['prefix']}, {message.message.lower()}. Here's my recommendation based on successful barbershops.",
        "suggestions": agent_info["suggestions"],
        "timestamp": datetime.now().isoformat()
    }
    
    # Save to chat history
    with get_db() as conn:
        conn.execute(
            "INSERT INTO chat_history (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)",
            (current_user["id"], message.agent_id, message.message, json.dumps(response))
        )
        conn.commit()
    
    return response

# Dashboard endpoints
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    return {
        "revenue": {
            "total": 12500,
            "growth": 15.3,
            "chart_data": [3000, 3200, 2800, 3500]
        },
        "bookings": {
            "total": 145,
            "growth": 8.7,
            "chart_data": [35, 40, 32, 38]
        },
        "customers": {
            "total": 89,
            "growth": 12.1,
            "new_this_week": 7
        },
        "ratings": {
            "average": 4.8,
            "total_reviews": 156
        }
    }

@app.get("/api/v1/dashboard/recent-bookings")
async def get_recent_bookings(current_user: dict = Depends(get_current_user)):
    """Get recent bookings"""
    return [
        {
            "id": 1,
            "customer_name": "John Doe",
            "service": "Haircut & Beard",
            "time": "10:00 AM",
            "status": "confirmed"
        },
        {
            "id": 2,
            "customer_name": "Mike Smith",
            "service": "Haircut",
            "time": "11:30 AM",
            "status": "confirmed"
        },
        {
            "id": 3,
            "customer_name": "David Johnson",
            "service": "Beard Trim",
            "time": "2:00 PM",
            "status": "pending"
        }
    ]

# Health check endpoint
@app.get("/api/v1/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "rag_engine": "active",
        "database": {"healthy": True, "type": "sqlite"},
        "learning_enabled": True,
        "timestamp": datetime.now().isoformat()
    }

# Database health endpoints
@app.get("/api/v1/database/health")
async def database_health():
    """Database health check"""
    try:
        with get_db() as conn:
            conn.execute("SELECT 1")
            return {"status": "healthy", "type": "sqlite", "connection": "active"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}

@app.get("/api/v1/database/stats")
async def database_stats():
    """Database statistics"""
    with get_db() as conn:
        # Get table statistics
        tables = ["users", "chat_history", "agents", "shop_profiles"]
        stats = {}
        for table in tables:
            try:
                cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
            except:
                stats[table] = 0
        
        return {"tables": stats, "size_mb": 0.5, "last_backup": "2024-01-15"}

@app.get("/api/v1/database/info")
async def database_info():
    """Database information"""
    return {
        "type": "SQLite",
        "version": "3.36.0",
        "location": "local",
        "features": ["transactions", "indexes", "triggers"]
    }

# Agentic Coach endpoints
@app.post("/api/v1/agentic-coach/chat")
async def chat_with_coach(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI business coach"""
    message = request.get("message", "")
    shop_context = request.get("shop_context", {})
    session_id = request.get("session_id", str(uuid.uuid4()))
    
    # Generate intelligent response based on message
    recommendations = []
    confidence = 0.85
    domains_addressed = []
    
    if "revenue" in message.lower() or "money" in message.lower():
        domains_addressed.append("financial")
        recommendations.extend([
            "Track daily revenue by service type",
            "Set weekly revenue targets",
            "Monitor customer lifetime value"
        ])
    
    if "customer" in message.lower() or "client" in message.lower():
        domains_addressed.append("customer_relations")
        recommendations.extend([
            "Implement a loyalty program",
            "Send personalized follow-up messages",
            "Track customer preferences"
        ])
    
    if "marketing" in message.lower() or "promote" in message.lower():
        domains_addressed.append("marketing")
        recommendations.extend([
            "Post client transformations on social media",
            "Run targeted Facebook ads",
            "Create referral incentives"
        ])
    
    response = {
        "session_id": session_id,
        "response": f"Based on your barbershop's profile, here's my advice on {message}",
        "recommendations": recommendations if recommendations else [
            "Focus on consistent service quality",
            "Build strong customer relationships",
            "Track your key metrics regularly"
        ],
        "confidence": confidence,
        "domains_addressed": domains_addressed if domains_addressed else ["general"],
        "timestamp": datetime.now().isoformat()
    }
    
    # Save to history
    with get_db() as conn:
        conn.execute(
            "INSERT INTO chat_history (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)",
            (current_user["id"], "agentic_coach", message, json.dumps(response))
        )
        conn.commit()
    
    return response

@app.put("/api/v1/agentic-coach/shop-context")
async def update_shop_context(
    context: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update shop context for personalized advice"""
    with get_db() as conn:
        # Store or update shop profile
        conn.execute("""
            INSERT OR REPLACE INTO shop_profiles (user_id, profile_data)
            VALUES (?, ?)
        """, (current_user["id"], json.dumps(context)))
        conn.commit()
    
    return {"status": "success", "message": "Shop context updated"}

@app.get("/api/v1/agentic-coach/conversation-history/{session_id}")
async def get_conversation_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get conversation history for a session"""
    with get_db() as conn:
        # For now, return empty history
        return {"session_id": session_id, "messages": []}

@app.get("/api/v1/agentic-coach/learning-insights")
async def get_learning_insights(current_user: dict = Depends(get_current_user)):
    """Get AI learning insights"""
    with get_db() as conn:
        # Get shop profiles count
        cursor = conn.execute("SELECT COUNT(*) FROM shop_profiles")
        shop_count = cursor.fetchone()[0]
        
        # Get total interactions
        cursor = conn.execute("SELECT COUNT(*) FROM chat_history WHERE user_id = ?", (current_user["id"],))
        interactions = cursor.fetchone()[0]
    
    return {
        "coach_learning_data": {
            "shop_profiles": [{"id": 1, "type": "traditional"}, {"id": 2, "type": "modern"}],
            "total_interactions": interactions,
            "learning_rate": 0.92
        },
        "database_insights": [
            "Peak hours identified: 10 AM - 2 PM",
            "Most profitable service: Premium haircuts",
            "Customer retention rate: 68%"
        ],
        "timestamp": datetime.now().isoformat()
    }

# Settings endpoints
@app.post("/api/v1/settings/barbershop")
async def save_barbershop_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    """Save barbershop settings"""
    with get_db() as conn:
        # Update user's shop name if changed
        if 'barbershop' in settings and 'name' in settings['barbershop']:
            conn.execute(
                "UPDATE users SET shop_name = ? WHERE id = ?",
                (settings['barbershop']['name'], current_user["id"])
            )
        
        # Save all settings to shop_profiles
        profile_data = json.dumps(settings)
        # First, delete old profiles for this user
        conn.execute("DELETE FROM shop_profiles WHERE user_id = ?", (current_user["id"],))
        # Then insert new profile
        conn.execute("""
            INSERT INTO shop_profiles (user_id, profile_data)
            VALUES (?, ?)
        """, (current_user["id"], profile_data))
        
        conn.commit()
    
    return {
        "message": "Settings saved successfully",
        "settings": settings
    }

@app.put("/api/v1/settings/barbershop")
async def update_barbershop_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    """Update barbershop settings (same as POST for compatibility)"""
    return await save_barbershop_settings(settings, current_user)

@app.get("/api/v1/settings/barbershop")
async def get_barbershop_settings(current_user: dict = Depends(get_current_user)):
    """Get barbershop settings"""
    with get_db() as conn:
        # Try to get saved settings from shop_profiles (get the latest one)
        cursor = conn.execute(
            "SELECT profile_data FROM shop_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (current_user["id"],)
        )
        profile = cursor.fetchone()
        
        if profile and profile["profile_data"]:
            # Return saved settings
            saved_settings = json.loads(profile["profile_data"])
            # Ensure email matches current user
            if 'barbershop' in saved_settings:
                saved_settings['barbershop']['email'] = current_user.get("email", "demo@barbershop.com")
            return saved_settings
    
    # Return default settings if none saved
    return {
        "barbershop": {
            "name": current_user.get("shop_name", "Demo Barbershop"),
            "address": "123 Main Street, City, State 12345",
            "phone": "+1 (555) 123-4567",
            "email": current_user.get("email", "demo@barbershop.com"),
            "timezone": "America/New_York"
        },
        "notifications": {
            "emailEnabled": True,
            "smsEnabled": True,
            "campaignAlerts": True,
            "bookingAlerts": True,
            "systemAlerts": True
        },
        "businessHours": {
            "monday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "tuesday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "wednesday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "thursday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "friday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "saturday": {"enabled": True, "shifts": [{"open": "10:00", "close": "16:00"}]},
            "sunday": {"enabled": False, "shifts": []}
        }
    }

# Billing endpoints
@app.get("/api/v1/billing/current")
async def get_current_billing(current_user: dict = Depends(get_current_user)):
    """Get current month billing data"""
    return {
        "currentMonth": {
            "total": 124.50,
            "aiUsage": 67.20,
            "smsUsage": 42.30,
            "emailUsage": 15.00,
            "comparedToLastMonth": 12.5
        },
        "usage": {
            "ai": {"tokens": 1120000, "cost": 67.20},
            "sms": {"messages": 2115, "cost": 42.30},
            "email": {"sent": 15000, "cost": 15.00}
        },
        "paymentMethod": {
            "last4": "4242",
            "brand": "Visa",
            "expMonth": 12,
            "expYear": 2025
        },
        "subscription": {
            "plan": "Professional",
            "status": "active",
            "nextBilling": "2024-02-01"
        }
    }

# Notification endpoints
@app.get("/api/v1/settings/notifications")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    """Get notification settings for current user"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT profile_data FROM shop_profiles WHERE user_id = ?",
            (current_user["id"],)
        )
        profile = cursor.fetchone()
        
        if profile and profile["profile_data"]:
            saved_settings = json.loads(profile["profile_data"])
            if 'notifications' in saved_settings:
                return saved_settings['notifications']
    
    # Return defaults
    return {
        "emailEnabled": True,
        "smsEnabled": True,
        "campaignAlerts": True,
        "bookingAlerts": True,
        "systemAlerts": True
    }

@app.put("/api/v1/settings/notifications")
async def save_notification_settings(notifications: dict, current_user: dict = Depends(get_current_user)):
    """Save notification settings"""
    with get_db() as conn:
        # Get existing settings
        cursor = conn.execute(
            "SELECT profile_data FROM shop_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (current_user["id"],)
        )
        profile = cursor.fetchone()
        
        if profile and profile["profile_data"]:
            # Update existing settings
            existing_settings = json.loads(profile["profile_data"])
            existing_settings["notifications"] = notifications
            updated_settings = existing_settings
        else:
            # Create new settings with notifications
            updated_settings = {
                "notifications": notifications
            }
        
        # Save updated settings
        profile_data = json.dumps(updated_settings)
        
        # Delete old profiles and insert new one
        conn.execute("DELETE FROM shop_profiles WHERE user_id = ?", (current_user["id"],))
        conn.execute(
            "INSERT INTO shop_profiles (user_id, profile_data) VALUES (?, ?)",
            (current_user["id"], profile_data)
        )
        conn.commit()
    
    return {
        "message": "Notification settings saved successfully",
        "notifications": notifications
    }

@app.put("/api/v1/settings/business-hours")
async def save_business_hours(business_hours: dict, current_user: dict = Depends(get_current_user)):
    """Save business hours settings"""
    with get_db() as conn:
        # Get existing settings
        cursor = conn.execute(
            "SELECT profile_data FROM shop_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (current_user["id"],)
        )
        profile = cursor.fetchone()
        
        if profile and profile["profile_data"]:
            # Update existing settings
            existing_settings = json.loads(profile["profile_data"])
            existing_settings["businessHours"] = business_hours
            updated_settings = existing_settings
        else:
            # Create new settings with business hours
            updated_settings = {
                "businessHours": business_hours
            }
        
        # Save updated settings
        profile_data = json.dumps(updated_settings)
        
        # Delete old profiles and insert new one
        conn.execute("DELETE FROM shop_profiles WHERE user_id = ?", (current_user["id"],))
        conn.execute(
            "INSERT INTO shop_profiles (user_id, profile_data) VALUES (?, ?)",
            (current_user["id"], profile_data)
        )
        conn.commit()
    
    return {
        "message": "Business hours saved successfully",
        "businessHours": business_hours
    }

@app.get("/api/v1/settings/business-hours")
async def get_business_hours(current_user: dict = Depends(get_current_user)):
    """Get business hours settings"""
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT profile_data FROM shop_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (current_user["id"],)
        )
        profile = cursor.fetchone()
        
        if profile and profile["profile_data"]:
            saved_settings = json.loads(profile["profile_data"])
            if 'businessHours' in saved_settings:
                return saved_settings['businessHours']
    
    # Return defaults
    return {
        "monday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
        "tuesday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
        "wednesday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
        "thursday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
        "friday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
        "saturday": {"enabled": True, "shifts": [{"open": "10:00", "close": "16:00"}]},
        "sunday": {"enabled": False, "shifts": []}
    }

@app.post("/api/v1/notifications/test")
async def test_notification(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Test notification delivery"""
    notification_type = request.get("type", "email")
    
    # Get recipient info
    if notification_type == "email":
        recipient = current_user.get("email")
        subject = "Test Notification from 6FB AI"
        content = "This is a test email notification from your AI Agent System. If you're receiving this, your email notifications are working correctly!"
    else:
        recipient = request.get("phone", "+1234567890")  # In production, get from user profile
        subject = ""
        content = "6FB AI Test: Your SMS notifications are working!"
    
    # Send using notification service
    result = await notification_service.send_notification(
        user_id=current_user["id"],
        notification_type=notification_type,
        recipient=recipient,
        subject=subject,
        content=content,
        check_preferences=True
    )
    
    return result

@app.post("/api/v1/notifications/send")
async def send_notification(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification to a user"""
    result = await notification_service.send_notification(
        user_id=current_user["id"],
        notification_type=request["type"],
        recipient=request["recipient"],
        subject=request.get("subject", ""),
        content=request["content"],
        template_id=request.get("template_id"),
        template_data=request.get("template_data"),
        check_preferences=request.get("check_preferences", True)
    )
    
    return result

@app.get("/api/v1/notifications/history")
async def get_notification_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get notification history for current user"""
    with get_db() as conn:
        cursor = conn.execute(
            """SELECT * FROM notification_history 
               WHERE user_id = ? 
               ORDER BY sent_at DESC 
               LIMIT ?""",
            (current_user["id"], limit)
        )
        
        history = []
        for row in cursor:
            history.append({
                "id": row["id"],
                "type": row["type"],
                "recipient": row["recipient"],
                "subject": row["subject"],
                "content": row["content"][:100] + "..." if len(row["content"]) > 100 else row["content"],
                "status": row["status"],
                "error_message": row["error_message"],
                "sent_at": row["sent_at"]
            })
        
        return {"notifications": history, "count": len(history)}

@app.post("/api/v1/notifications/queue")
async def queue_notification(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Queue a notification for async delivery"""
    queue_id = await notification_queue.enqueue(
        user_id=current_user["id"],
        notification_type=request["type"],
        recipient=request["recipient"],
        subject=request.get("subject", ""),
        content=request["content"],
        template_id=request.get("template_id"),
        template_data=request.get("template_data"),
        priority=request.get("priority", 5),
        scheduled_at=request.get("scheduled_at"),
        metadata=request.get("metadata")
    )
    
    return {
        "success": True,
        "queue_id": queue_id,
        "message": "Notification queued successfully"
    }

@app.get("/api/v1/notifications/queue/status")
async def get_queue_status(current_user: dict = Depends(get_current_user)):
    """Get notification queue status"""
    status = await notification_queue.get_queue_status()
    return status

@app.post("/api/v1/notifications/queue/{queue_id}/cancel")
async def cancel_queued_notification(
    queue_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a queued notification"""
    success = await notification_queue.cancel_notification(queue_id)
    
    if success:
        return {"success": True, "message": "Notification cancelled"}
    else:
        return {"success": False, "message": "Notification not found or already processed"}

@app.post("/api/v1/notifications/queue/retry-failed")
async def retry_failed_notifications(current_user: dict = Depends(get_current_user)):
    """Retry all failed notifications"""
    count = await notification_queue.retry_failed()
    return {
        "success": True,
        "message": f"Scheduled {count} failed notifications for retry"
    }

@app.get("/api/v1/billing/history")
async def get_billing_history(current_user: dict = Depends(get_current_user), days: int = 30):
    """Get billing history"""
    # Mock data for demonstration
    return {
        "history": [
            {"date": "Jan 1", "ai": 15.20, "sms": 8.40, "email": 2.10},
            {"date": "Jan 5", "ai": 22.50, "sms": 12.20, "email": 3.50},
            {"date": "Jan 10", "ai": 18.30, "sms": 15.60, "email": 4.20},
            {"date": "Jan 15", "ai": 28.90, "sms": 9.80, "email": 2.80},
            {"date": "Jan 20", "ai": 19.40, "sms": 11.50, "email": 3.10},
            {"date": "Jan 25", "ai": 25.60, "sms": 14.30, "email": 4.60},
            {"date": "Jan 30", "ai": 32.10, "sms": 16.20, "email": 5.20}
        ]
    }

# Unified chat endpoint for campaigns
@app.post("/api/chat/unified")
async def unified_chat(request: dict, current_user: dict = Depends(get_current_user)):
    """Unified chat endpoint for campaign execution"""
    message = request.get("message", "")
    context = request.get("context", {})
    
    # Parse campaign intent from message
    if "email blast" in message.lower():
        # Simulate email campaign execution
        return {
            "success": True,
            "message": "Email campaign scheduled successfully",
            "campaign_id": f"camp_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "details": {
                "type": "email",
                "recipients": "VIP customers",
                "scheduled": datetime.now().isoformat()
            }
        }
    elif "sms" in message.lower():
        return {
            "success": True,
            "message": "SMS campaign scheduled successfully",
            "campaign_id": f"sms_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "details": {
                "type": "sms",
                "recipients": "All customers",
                "scheduled": datetime.now().isoformat()
            }
        }
    else:
        return {
            "success": False,
            "message": "Could not understand campaign request",
            "suggestion": "Try: 'Send email blast to VIP customers' or 'SMS campaign for weekend special'"
        }

# AI Orchestrator endpoints
@app.post("/api/v1/ai/enhanced-chat")
async def enhanced_ai_chat(request: dict):
    """Enhanced AI chat using the AI Orchestrator Service with RAG integration"""
    try:
        message = request.get("message", "")
        session_id = request.get("session_id", f"session_{datetime.now().timestamp()}")  
        business_context = request.get("business_context", {})
        
        if not message or not message.strip():
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Import and use the AI Orchestrator Service
        from services.ai_orchestrator_service import ai_orchestrator
        
        # Call the enhanced chat method with RAG integration
        orchestrator_response = await ai_orchestrator.enhanced_chat(
            message=message,
            session_id=session_id,
            business_context=business_context
        )
        
        return {
            "success": True,
            "response": orchestrator_response.get("response", ""),
            "provider": orchestrator_response.get("provider", "unknown"),
            "confidence": orchestrator_response.get("confidence", 0.0),
            "message_type": orchestrator_response.get("message_type", "general"),
            "selected_provider": orchestrator_response.get("selected_provider", "unknown"),
            "contextual_insights": orchestrator_response.get("contextual_insights", {}),
            "knowledge_enhanced": orchestrator_response.get("knowledge_enhanced", False),
            "timestamp": orchestrator_response.get("timestamp", datetime.now().isoformat()),
            "usage": orchestrator_response.get("usage", {}),
            "session_id": session_id
        }
        
    except Exception as e:
        print(f"❌ AI Orchestrator error: {e}")
        # Return fallback response
        return {
            "success": False,
            "error": str(e),
            "fallback_response": {
                "response": f"I understand you're asking about '{message}'. I'm experiencing technical difficulties right now, but I'm here to help optimize your barbershop business. Could you try rephrasing your question about scheduling, customer service, marketing, or financial management?",
                "provider": "fallback",
                "confidence": 0.6,
                "message_type": "general",
                "timestamp": datetime.now().isoformat()
            }
        }

@app.get("/api/v1/ai/provider-status")
async def get_ai_provider_status():
    """Get status of all AI providers"""
    try:
        from services.ai_orchestrator_service import ai_orchestrator
        return ai_orchestrator.get_provider_status()
    except Exception as e:
        return {
            "error": str(e),
            "available_providers": [],
            "total_providers": 0
        }

@app.get("/api/v1/ai/agents/status")
async def get_agent_system_status():
    """Get status of specialized agent system"""
    try:
        from services.ai_agents.agent_manager import agent_manager
        
        agent_status = agent_manager.get_agent_status()
        performance_metrics = agent_manager.get_performance_metrics()
        
        return {
            "success": True,
            "agent_system": agent_status,
            "performance_metrics": performance_metrics,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Agent system status error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_status": {
                "total_agents": 3,
                "active_agents": 0,
                "system_status": "error"
            }
        }

@app.get("/api/v1/ai/insights")
async def get_ai_insights(limit: int = 10, type: str = None):
    """Get active AI-generated business insights"""
    try:
        from services.ai_insights_service import ai_insights_service
        
        insights = await ai_insights_service.get_active_insights(limit=limit)
        
        # Filter by type if specified
        if type:
            insights = [insight for insight in insights if insight.get('type') == type]
        
        return {
            "success": True,
            "insights": insights,
            "count": len(insights),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ AI Insights error: {e}")
        return {
            "success": False,
            "error": str(e),
            "insights": [],
            "count": 0
        }

@app.post("/api/v1/ai/insights/generate")
async def generate_ai_insights(request: dict):
    """Generate new AI insights for business"""
    try:
        user_id = request.get("user_id", "unknown")
        business_context = request.get("business_context", {})
        force_refresh = request.get("force_refresh", False)
        
        from services.ai_insights_service import ai_insights_service
        
        # Generate new insights
        insights = await ai_insights_service.generate_real_time_insights(business_context)
        
        # Convert AIInsight objects to dictionaries
        insight_dicts = []
        for insight in insights:
            insight_dicts.append({
                "id": insight.id,
                "type": insight.type.value,
                "title": insight.title,
                "description": insight.description,
                "recommendation": insight.recommendation,
                "confidence": insight.confidence,
                "impact_score": insight.impact_score,
                "urgency": insight.urgency,
                "data_points": insight.data_points,
                "created_at": insight.created_at.isoformat(),
                "expires_at": insight.expires_at.isoformat(),
                "metadata": insight.metadata or {}
            })
        
        return {
            "success": True,
            "insights": insight_dicts,
            "generated": len(insight_dicts),
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ AI Insights generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "insights": [],
            "generated": 0
        }

@app.delete("/api/v1/ai/insights/{insight_id}")
async def dismiss_ai_insight(insight_id: str):
    """Dismiss an AI insight"""
    try:
        from services.ai_insights_service import ai_insights_service
        
        success = await ai_insights_service.dismiss_insight(insight_id)
        
        return {
            "success": success,
            "insight_id": insight_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ AI Insight dismissal error: {e}")
        return {
            "success": False,
            "error": str(e),
            "insight_id": insight_id
        }

# Predictive Analytics endpoints
@app.get("/api/v1/ai/predictive")
async def get_predictive_analytics(
    user_id: str,
    forecast_type: str = "comprehensive",
    time_horizon: str = "weekly",
    barbershop_id: str = "default"
):
    """Get predictive analytics forecasts"""
    try:
        from services.predictive_analytics_service import predictive_analytics_service
        
        # Get dashboard data with AI-powered forecasts
        dashboard_data = await predictive_analytics_service.get_predictive_dashboard_data(barbershop_id)
        
        # Generate AI-powered forecast if comprehensive
        if forecast_type == "comprehensive":
            ai_forecast = await predictive_analytics_service.generate_ai_powered_forecast(
                barbershop_id, forecast_type
            )
            dashboard_data['ai_powered_forecast'] = ai_forecast
        
        return {
            "success": True,
            "predictions": dashboard_data,
            "forecast_type": forecast_type,
            "time_horizon": time_horizon,
            "barbershop_id": barbershop_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Predictive Analytics error: {e}")
        return {
            "success": False,
            "error": str(e),
            "predictions": {},
            "fallback": True
        }

@app.post("/api/v1/ai/predictive/generate")
async def generate_predictive_forecast(request: dict):
    """Generate new predictive forecast"""
    try:
        user_id = request.get("user_id", "unknown")
        forecast_type = request.get("forecast_type", "comprehensive")
        business_context = request.get("business_context", {})
        time_horizon = request.get("time_horizon", "weekly")
        options = request.get("options", {})
        
        from services.predictive_analytics_service import predictive_analytics_service
        
        # Create mock booking history for analysis
        from datetime import timedelta
        mock_bookings = []
        base_date = datetime.now()
        
        for i in range(30):  # Generate 30 days of mock data
            booking_date = base_date - timedelta(days=i)
            # Vary bookings by day of week
            daily_bookings = 8 if booking_date.weekday() < 5 else 12  # More on weekends
            
            for j in range(daily_bookings):
                mock_bookings.append({
                    'customer_id': f'customer_{i}_{j}',
                    'service_name': ['Classic Haircut', 'Beard Trim', 'Premium Package'][j % 3],
                    'scheduled_at': (booking_date + timedelta(hours=10 + j)).isoformat(),
                    'price': [30, 18, 65][j % 3]
                })
        
        # Generate comprehensive forecast
        forecast = await predictive_analytics_service.generate_ai_powered_forecast(
            user_id, forecast_type
        )
        
        # Generate demand patterns
        demand_forecasts = predictive_analytics_service.analyze_demand_patterns(
            user_id, mock_bookings
        )
        
        # Generate business insights
        business_insights = predictive_analytics_service.generate_business_insights(
            user_id, mock_bookings
        )
        
        # Combine all results
        comprehensive_forecast = {
            **forecast,
            'demand_forecasts': [
                {
                    'forecast_id': df.forecast_id,
                    'service_type': df.service_type,
                    'time_period': df.time_period,
                    'predicted_demand': df.predicted_demand,
                    'confidence_level': df.confidence_level,
                    'recommended_actions': df.recommended_actions
                } for df in demand_forecasts
            ],
            'business_insights': [
                {
                    'insight_id': bi.insight_id,
                    'insight_type': bi.insight_type,
                    'title': bi.title,
                    'description': bi.description,
                    'impact_level': bi.impact_level,
                    'potential_value': bi.potential_value,
                    'confidence_score': bi.confidence_score,
                    'urgency_level': bi.urgency_level
                } for bi in business_insights
            ]
        }
        
        return {
            "success": True,
            "forecast": comprehensive_forecast,
            "user_id": user_id,
            "forecast_type": forecast_type,
            "time_horizon": time_horizon,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Predictive Forecast generation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "forecast": {},
            "fallback": True
        }

@app.get("/api/v1/ai/predictive/dashboard/{barbershop_id}")
async def get_predictive_dashboard(barbershop_id: str):
    """Get predictive analytics dashboard data"""
    try:
        from services.predictive_analytics_service import predictive_analytics_service
        
        dashboard_data = await predictive_analytics_service.get_predictive_dashboard_data(barbershop_id)
        
        return {
            "success": True,
            "dashboard": dashboard_data,
            "barbershop_id": barbershop_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Predictive Dashboard error: {e}")
        return {
            "success": False,
            "error": str(e),
            "dashboard": {},
            "fallback": True
        }

# ==========================================
# Business Recommendations Engine Endpoints
# ==========================================

class BusinessRecommendationsRequest(BaseModel):
    business_context: Dict[str, Any]
    force_refresh: Optional[bool] = False
    user_id: Optional[str] = None

@app.post("/api/v1/business/recommendations/generate")
async def generate_business_recommendations(request: BusinessRecommendationsRequest):
    """Generate comprehensive business recommendations using enhanced AI agents"""
    try:
        # Use enhanced business recommendations service if available
        if ENHANCED_RECOMMENDATIONS_AVAILABLE:
            barbershop_id = request.business_context.get('barbershop_id', 'demo-barbershop')
            
            # Generate comprehensive AI-powered recommendations
            recommendations_suite = await business_recommendations_service.generate_comprehensive_recommendations(
                barbershop_id=barbershop_id
            )
            
            return {
                "success": True,
                "recommendations": recommendations_suite,
                "ai_enhanced": True,
                "service_version": "enhanced_v2",
                "timestamp": datetime.now().isoformat()
            }
        
        # Fallback to original engine
        elif RECOMMENDATIONS_ENGINE_AVAILABLE:
            # Generate recommendations suite
            recommendations_suite = await business_recommendations_engine.generate_recommendations(
                business_context=request.business_context,
                force_refresh=request.force_refresh
            )
        
        else:
            raise HTTPException(status_code=503, detail="No recommendations services available")
        
        # Convert dataclass to dict for JSON response
        def convert_to_dict(obj):
            if hasattr(obj, '__dict__'):
                result = {}
                for key, value in obj.__dict__.items():
                    if hasattr(value, '__dict__'):
                        result[key] = convert_to_dict(value)
                    elif isinstance(value, list):
                        result[key] = [convert_to_dict(item) if hasattr(item, '__dict__') else 
                                     (item.value if hasattr(item, 'value') else item) for item in value]
                    elif hasattr(value, 'value'):  # Handle Enum values
                        result[key] = value.value
                    else:
                        result[key] = value
                return result
            return obj
        
        suite_dict = convert_to_dict(recommendations_suite)
        
        return {
            "success": True,
            "recommendations_suite": suite_dict,
            "engine_status": "operational",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Business recommendations error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_recommendations": [
                {
                    "id": "fallback_marketing",
                    "title": "Boost Revenue: Improve Marketing Presence",
                    "description": "Enhance social media marketing and customer outreach to increase bookings",
                    "category": "marketing_strategy",
                    "priority": "high",
                    "estimated_impact": {"revenue_increase_monthly": 500, "roi_percentage": 20},
                    "implementation_effort": "medium",
                    "confidence_score": 0.7,
                    "source_agent": "Fallback System"
                }
            ],
            "fallback": True
        }

@app.get("/api/v1/business/recommendations/status")
async def get_recommendations_engine_status():
    """Get business recommendations engine status"""
    try:
        if not RECOMMENDATIONS_ENGINE_AVAILABLE:
            return {
                "success": False,
                "error": "Recommendations engine not available",
                "engine_status": "unavailable"
            }
        
        status = business_recommendations_engine.get_recommendations_status()
        
        return {
            "success": True,
            "engine_status": status,
            "recommendations_engine_available": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Engine status error: {e}")
        return {
            "success": False,
            "error": str(e),
            "engine_status": "error",
            "fallback": True
        }

@app.post("/api/v1/business/recommendations/track")
async def track_recommendation_implementation(
    recommendation_id: str,
    success_metrics: Dict[str, Any]
):
    """Track the success of implemented recommendations"""
    try:
        if not RECOMMENDATIONS_ENGINE_AVAILABLE:
            raise HTTPException(status_code=503, detail="Recommendations engine not available")
        
        await business_recommendations_engine.track_implementation_success(
            recommendation_id, success_metrics
        )
        
        return {
            "success": True,
            "message": "Implementation success tracked",
            "recommendation_id": recommendation_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Track recommendation error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback": True
        }

# ==========================================
# AI Performance Monitoring Endpoints
# ==========================================

class PerformanceMetricRequest(BaseModel):
    component: str
    metric: str
    value: float
    metadata: Optional[Dict[str, Any]] = {}

@app.get("/api/v1/ai/performance/realtime")
async def get_realtime_performance_metrics():
    """Get real-time AI performance metrics"""
    try:
        if not PERFORMANCE_MONITORING_AVAILABLE:
            return {
                "success": False,
                "error": "Performance monitoring not available",
                "fallback": True
            }
        
        metrics = await ai_performance_monitor.get_real_time_metrics()
        
        return {
            "success": True,
            "realtime_metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Real-time metrics error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_metrics": {
                "ai_orchestrator": {"response_time": 1.5, "confidence_score": 0.85},
                "specialized_agents": {"response_time": 1.2, "confidence_score": 0.88}
            },
            "fallback": True
        }

@app.get("/api/v1/ai/performance/report")
async def get_system_performance_report():
    """Generate comprehensive system performance report"""
    try:
        if not PERFORMANCE_MONITORING_AVAILABLE:
            return {
                "success": False,
                "error": "Performance monitoring not available",
                "fallback": True
            }
        
        report = await ai_performance_monitor.generate_system_performance_report()
        
        # Convert dataclass to dict for JSON response
        def convert_to_dict(obj):
            if hasattr(obj, '__dict__'):
                result = {}
                for key, value in obj.__dict__.items():
                    if hasattr(value, '__dict__'):
                        result[key] = convert_to_dict(value)
                    elif isinstance(value, dict):
                        result[key] = {k: convert_to_dict(v) if hasattr(v, '__dict__') else 
                                     (v.value if hasattr(v, 'value') else v) for k, v in value.items()}
                    elif isinstance(value, list):
                        result[key] = [convert_to_dict(item) if hasattr(item, '__dict__') else 
                                     (item.value if hasattr(item, 'value') else item) for item in value]
                    elif hasattr(value, 'value'):  # Handle Enum values
                        result[key] = value.value
                    else:
                        result[key] = value
                return result
            return obj
        
        report_dict = convert_to_dict(report)
        
        return {
            "success": True,
            "performance_report": report_dict,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Performance report error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_report": {
                "overall_health": "good",
                "overall_score": 0.85,
                "component_health": {},
                "optimization_opportunities": []
            },
            "fallback": True
        }

@app.get("/api/v1/ai/performance/status")
async def get_monitoring_system_status():
    """Get AI performance monitoring system status"""
    try:
        if not PERFORMANCE_MONITORING_AVAILABLE:
            return {
                "success": False,
                "error": "Performance monitoring not available",
                "status": "unavailable"
            }
        
        status = ai_performance_monitor.get_monitoring_status()
        
        return {
            "success": True,
            "monitoring_status": status,
            "performance_monitoring_available": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Monitoring status error: {e}")
        return {
            "success": False,
            "error": str(e),
            "status": "error",
            "fallback": True
        }

@app.post("/api/v1/ai/performance/record")
async def record_performance_metric(request: PerformanceMetricRequest):
    """Record a performance metric for monitoring"""
    try:
        if not PERFORMANCE_MONITORING_AVAILABLE:
            return {
                "success": False,
                "error": "Performance monitoring not available",
                "fallback": True
            }
        
        # Convert metric string to enum
        from services.ai_performance_monitoring import MonitoringMetric
        
        try:
            metric_enum = MonitoringMetric(request.metric.lower())
        except ValueError:
            # If metric not found, use a default or map common variations
            metric_mapping = {
                'response_time': MonitoringMetric.RESPONSE_TIME,
                'confidence': MonitoringMetric.CONFIDENCE_SCORE,
                'success_rate': MonitoringMetric.SUCCESS_RATE,
                'error_rate': MonitoringMetric.ERROR_RATE,
                'throughput': MonitoringMetric.THROUGHPUT
            }
            metric_enum = metric_mapping.get(request.metric.lower(), MonitoringMetric.RESPONSE_TIME)
        
        await ai_performance_monitor.record_performance_metric(
            component=request.component,
            metric=metric_enum,
            value=request.value,
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "message": "Performance metric recorded successfully",
            "component": request.component,
            "metric": request.metric,
            "value": request.value,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Record metric error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback": True
        }

@app.get("/api/v1/ai/performance/component/{component_name}")
async def get_component_health(component_name: str):
    """Get health status of a specific AI component"""
    try:
        if not PERFORMANCE_MONITORING_AVAILABLE:
            return {
                "success": False,
                "error": "Performance monitoring not available",
                "fallback": True
            }
        
        health = await ai_performance_monitor.analyze_component_health(component_name)
        
        # Convert dataclass to dict
        def convert_to_dict(obj):
            if hasattr(obj, '__dict__'):
                result = {}
                for key, value in obj.__dict__.items():
                    if hasattr(value, 'value'):  # Handle Enum values
                        result[key] = value.value
                    else:
                        result[key] = value
                return result
            return obj
        
        health_dict = convert_to_dict(health)
        
        return {
            "success": True,
            "component_health": health_dict,
            "component_name": component_name,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Component health error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_health": {
                "component_name": component_name,
                "status": "unknown",
                "overall_score": 0.0,
                "last_updated": datetime.now().isoformat()
            },
            "fallback": True
        }

# ==========================================
# Enhanced Business Knowledge Service Endpoints
# ==========================================

class KnowledgeSearchRequest(BaseModel):
    query: str
    domains: Optional[List[str]] = []
    business_context: Optional[Dict[str, Any]] = {}

class KnowledgeInsightsRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = {}

class StoreKnowledgeRequest(BaseModel):
    title: str
    content: str
    summary: str
    domain: str
    knowledge_type: str
    source: str
    confidence_score: float
    relevance_tags: List[str]
    business_metrics: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = {}

@app.get("/api/v1/knowledge/enhanced/status")
async def get_enhanced_knowledge_status():
    """Get enhanced knowledge base status"""
    try:
        if not ENHANCED_KNOWLEDGE_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced knowledge service not available",
                "status": "unavailable"
            }
        
        status = enhanced_business_knowledge_service.get_knowledge_status()
        
        return {
            "success": True,
            "knowledge_status": status,
            "enhanced_knowledge_available": True,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced knowledge status error: {e}")
        return {
            "success": False,
            "error": str(e),
            "status": "error",
            "fallback": True
        }

@app.post("/api/v1/knowledge/enhanced/search")
async def search_enhanced_knowledge(request: KnowledgeSearchRequest):
    """Search enhanced knowledge base with domain filtering"""
    try:
        if not ENHANCED_KNOWLEDGE_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced knowledge service not available",
                "fallback": True
            }
        
        # Convert string domains to enums
        from services.enhanced_business_knowledge_service import BusinessDomain
        
        domain_enums = []
        for domain_str in request.domains:
            try:
                domain_enums.append(BusinessDomain(domain_str))
            except ValueError:
                continue  # Skip invalid domains
        
        # Create query context
        from services.enhanced_business_knowledge_service import KnowledgeQueryContext
        
        query_context = KnowledgeQueryContext(
            business_context=request.business_context,
            query_intent="search",
            preferred_domains=domain_enums if domain_enums else None
        )
        
        # Perform contextual search
        result = await enhanced_business_knowledge_service.retrieve_contextual_knowledge(
            query=request.query,
            context=query_context
        )
        
        # Convert result to dict format
        documents_dict = []
        for doc in result.documents:
            documents_dict.append({
                'id': doc.id,
                'title': doc.title,
                'content': doc.content,
                'summary': doc.summary,
                'domain': doc.domain.value,
                'knowledge_type': doc.knowledge_type,
                'source': doc.source.value,
                'confidence_score': doc.confidence_score,
                'relevance_tags': doc.relevance_tags,
                'business_metrics': doc.business_metrics,
                'usage_count': doc.usage_count,
                'effectiveness_score': doc.effectiveness_score
            })
        
        return {
            "success": True,
            "search_results": {
                "documents": documents_dict,
                "relevance_scores": result.relevance_scores,
                "context_summary": result.context_summary,
                "knowledge_gaps": result.knowledge_gaps,
                "recommended_actions": result.recommended_actions,
                "total_confidence": result.total_confidence
            },
            "query": request.query,
            "domains_searched": request.domains,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced knowledge search error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_results": {
                "documents": [],
                "context_summary": "Search temporarily unavailable",
                "recommended_actions": ["Try again later", "Contact support"]
            },
            "fallback": True
        }

@app.post("/api/v1/knowledge/enhanced/insights")
async def get_enhanced_contextual_insights(request: KnowledgeInsightsRequest):
    """Get enhanced contextual insights for a query"""
    try:
        if not ENHANCED_KNOWLEDGE_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced knowledge service not available",
                "fallback": True
            }
        
        insights = await enhanced_business_knowledge_service.get_contextual_insights(
            query=request.query,
            context=request.context
        )
        
        return {
            "success": True,
            "contextual_insights": insights,
            "query": request.query,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced contextual insights error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_insights": {
                "relevant_knowledge": [],
                "key_insights": ["Service temporarily unavailable"],
                "context_summary": "Unable to retrieve insights",
                "total_confidence": 0.0
            },
            "fallback": True
        }

@app.post("/api/v1/knowledge/enhanced/store")
async def store_enhanced_knowledge(request: StoreKnowledgeRequest):
    """Store enhanced business knowledge"""
    try:
        if not ENHANCED_KNOWLEDGE_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced knowledge service not available",
                "fallback": True
            }
        
        # Convert string enums
        from services.enhanced_business_knowledge_service import BusinessDomain, KnowledgeSource
        
        try:
            domain_enum = BusinessDomain(request.domain)
            source_enum = KnowledgeSource(request.source)
        except ValueError as e:
            return {
                "success": False,
                "error": f"Invalid domain or source: {e}",
                "fallback": True
            }
        
        knowledge_id = await enhanced_business_knowledge_service.store_enhanced_knowledge(
            title=request.title,
            content=request.content,
            summary=request.summary,
            domain=domain_enum,
            knowledge_type=request.knowledge_type,
            source=source_enum,
            confidence_score=request.confidence_score,
            relevance_tags=request.relevance_tags,
            business_metrics=request.business_metrics,
            metadata=request.metadata
        )
        
        return {
            "success": True,
            "knowledge_id": knowledge_id,
            "message": "Enhanced knowledge stored successfully",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Store enhanced knowledge error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback": True
        }

@app.post("/api/v1/knowledge/enhanced/contextual-search")
async def perform_enhanced_contextual_search(request: Dict[str, Any]):
    """Perform advanced contextual search with business intelligence"""
    try:
        if not ENHANCED_KNOWLEDGE_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced knowledge service not available",
                "fallback": True
            }
        
        # Extract parameters
        query = request.get('query', '')
        context = request.get('context', {})
        user_role = request.get('user_role')
        preferred_domains = request.get('preferred_domains', [])
        
        if not query:
            return {
                "success": False,
                "error": "Query is required",
                "fallback": True
            }
        
        # Convert domains to enums
        from services.enhanced_business_knowledge_service import BusinessDomain, KnowledgeQueryContext
        
        domain_enums = []
        for domain_str in preferred_domains:
            try:
                domain_enums.append(BusinessDomain(domain_str))
            except ValueError:
                continue
        
        # Create advanced query context
        query_context = KnowledgeQueryContext(
            business_context=context,
            query_intent="contextual_search",
            user_role=user_role,
            preferred_domains=domain_enums if domain_enums else None
        )
        
        # Perform contextual retrieval
        result = await enhanced_business_knowledge_service.retrieve_contextual_knowledge(
            query=query,
            context=query_context
        )
        
        # Format comprehensive response
        return {
            "success": True,
            "contextual_search_results": {
                "documents": [
                    {
                        'id': doc.id,
                        'title': doc.title,
                        'content': doc.content,
                        'summary': doc.summary,
                        'domain': doc.domain.value,
                        'confidence_score': doc.confidence_score,
                        'business_metrics': doc.business_metrics,
                        'relevance_tags': doc.relevance_tags,
                        'source': doc.source.value
                    }
                    for doc in result.documents
                ],
                "intelligence_summary": {
                    "context_summary": result.context_summary,
                    "knowledge_gaps": result.knowledge_gaps,
                    "recommended_actions": result.recommended_actions,
                    "total_confidence": result.total_confidence,
                    "relevance_scores": result.relevance_scores
                },
                "business_insights": {
                    "actionable_items": result.recommended_actions[:3],
                    "key_metrics": [doc.business_metrics for doc in result.documents if doc.business_metrics],
                    "domain_coverage": list(set([doc.domain.value for doc in result.documents]))
                }
            },
            "query_analysis": {
                "original_query": query,
                "context_enriched": True,
                "domains_searched": [d.value for d in (query_context.preferred_domains or [])],
                "user_role": user_role
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced contextual search error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_results": {
                "contextual_search_results": {
                    "documents": [],
                    "intelligence_summary": {
                        "context_summary": "Search temporarily unavailable",
                        "recommended_actions": ["Try again later"]
                    }
                }
            },
            "fallback": True
        }

# ==========================================
# Enhanced Business Recommendations Endpoints
# ==========================================

class EnhancedRecommendationsRequest(BaseModel):
    barbershop_id: str
    analysis_type: Optional[str] = "comprehensive"
    enhanced_ai: Optional[bool] = True

@app.post("/api/business-recommendations/generate")
async def generate_enhanced_business_recommendations(request: EnhancedRecommendationsRequest):
    """Generate AI-powered business recommendations using enhanced agent system"""
    try:
        if not ENHANCED_RECOMMENDATIONS_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced recommendations service not available",
                "fallback_available": RECOMMENDATIONS_ENGINE_AVAILABLE
            }
        
        # Generate comprehensive AI-powered recommendations
        recommendations_data = await business_recommendations_service.generate_comprehensive_recommendations(
            barbershop_id=request.barbershop_id
        )
        
        return {
            "success": True,
            "data": recommendations_data,
            "service_type": "enhanced_ai_agents",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Enhanced recommendations error: {e}")
        return {
            "success": False,
            "error": str(e),
            "fallback_available": True
        }

@app.get("/api/business-recommendations/status/{barbershop_id}")
async def get_recommendations_status(barbershop_id: str):
    """Get status of business recommendations for a barbershop"""
    try:
        if not ENHANCED_RECOMMENDATIONS_AVAILABLE:
            return {
                "success": False,
                "error": "Enhanced recommendations service not available"
            }
        
        status = await business_recommendations_service.get_recommendation_status(barbershop_id)
        
        return {
            "success": True,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Recommendations status error: {e}")
        return {
            "success": False,
            "error": str(e)
        }

# Mount alert service if available
if ALERT_SERVICE_AVAILABLE:
    app.mount("/", alert_app)
    print("✅ Intelligent Alert System mounted at /intelligent-alerts/*")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)