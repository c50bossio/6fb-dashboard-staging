#!/usr/bin/env python3
"""
FastAPI backend for 6FB AI Agent System with authentication and AI endpoints
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
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

# Initialize FastAPI app
app = FastAPI(
    title="6FB AI Agent System API",
    description="AI-powered barbershop management system",
    version="2.0.0"
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
    with get_db() as conn:
        cursor = conn.execute(
            "SELECT id, email, password_hash, shop_name FROM users WHERE email = ?",
            (user.email,)
        )
        db_user = cursor.fetchone()
    
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
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

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port, reload=True)