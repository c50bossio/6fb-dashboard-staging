#!/usr/bin/env python3
"""
Enhanced 6FB AI Agent System Server
With real authentication, persistent storage, and enhanced features
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import json
from datetime import datetime
import logging

# Import our enhanced services
from services.auth_service import auth_service, UserCreate, UserLogin, Token, User, get_current_user
from services.database_service import db_service
from services.orchestration.agent_coordination_api import router as agent_coordination_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Enhanced 6FB AI Agent System",
    description="39-Agent Coordination System with Authentication & Persistent Storage",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Include routers
app.include_router(agent_coordination_router)

# Authentication endpoints
@app.post("/api/v1/auth/register", response_model=Token)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        return auth_service.register_user(user_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@app.post("/api/v1/auth/login", response_model=Token)
async def login_user(login_data: UserLogin):
    """Login user"""
    try:
        return auth_service.login_user(login_data)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@app.get("/api/v1/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user

@app.post("/api/v1/auth/logout")
async def logout_user(current_user: User = Depends(get_current_user)):
    """Logout user"""
    return {"message": "Successfully logged out", "user": current_user.email}

# Dashboard and analytics endpoints
@app.get("/api/v1/dashboard/overview")
async def get_dashboard_overview(current_user: User = Depends(get_current_user)):
    """Get dashboard overview for current user"""
    try:
        # Get user's coordination history
        coordination_history = db_service.get_coordination_history(
            user_id=current_user.id, 
            limit=10
        )
        
        # Get usage statistics
        usage_stats = db_service.get_agent_usage_stats(days=7)
        
        # Get system analytics
        system_analytics = db_service.get_system_analytics()
        
        return {
            "user": {
                "id": current_user.id,
                "email": current_user.email,
                "full_name": current_user.full_name,
                "organization": current_user.organization
            },
            "recent_coordinations": coordination_history,
            "usage_stats": usage_stats,
            "system_health": system_analytics,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Dashboard overview error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load dashboard"
        )

@app.get("/api/v1/sessions")
async def get_user_sessions(current_user: User = Depends(get_current_user)):
    """Get user's agent sessions"""
    try:
        # This would require adding a method to database_service
        # For now, return coordination history grouped by session
        history = db_service.get_coordination_history(
            user_id=current_user.id,
            limit=50
        )
        
        # Group by session_id
        sessions = {}
        for coord in history:
            session_id = coord['session_id']
            if session_id not in sessions:
                sessions[session_id] = {
                    "session_id": session_id,
                    "coordinations": [],
                    "created_at": coord['created_at'],
                    "total_coordinations": 0
                }
            sessions[session_id]["coordinations"].append(coord)
            sessions[session_id]["total_coordinations"] += 1
        
        return {
            "sessions": list(sessions.values()),
            "total_sessions": len(sessions)
        }
    except Exception as e:
        logger.error(f"Sessions error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load sessions"
        )

@app.get("/api/v1/sessions/{session_id}/conversations")
async def get_session_conversations(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversations for a specific session"""
    try:
        conversations = db_service.get_session_conversations(session_id, limit=100)
        
        return {
            "session_id": session_id,
            "conversations": conversations,
            "total_messages": len(conversations)
        }
    except Exception as e:
        logger.error(f"Session conversations error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load conversations"
        )

# System management endpoints (admin only)
@app.get("/api/v1/admin/system-stats")
async def get_system_stats(current_user: User = Depends(get_current_user)):
    """Get comprehensive system statistics (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        # System analytics
        system_analytics = db_service.get_system_analytics()
        
        # Usage statistics
        usage_stats_7d = db_service.get_agent_usage_stats(days=7)
        usage_stats_30d = db_service.get_agent_usage_stats(days=30)
        
        return {
            "system_analytics": system_analytics,
            "usage_stats": {
                "last_7_days": usage_stats_7d,
                "last_30_days": usage_stats_30d
            },
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"System stats error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load system statistics"
        )

@app.post("/api/v1/admin/cleanup")
async def cleanup_system(current_user: User = Depends(get_current_user)):
    """Clean up expired sessions and data (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        db_service.cleanup_expired_sessions()
        return {"message": "System cleanup completed successfully"}
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Cleanup failed"
        )

# Health and system info
@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        system_analytics = db_service.get_system_analytics()
        
        return {
            "status": "healthy",
            "service": "Enhanced 6FB AI Agent System",
            "version": "2.0.0",
            "features": {
                "authentication": "enabled",
                "persistent_storage": "enabled",
                "agent_coordination": "active",
                "total_agents": 38
            },
            "database": {
                "status": "connected",
                "total_sessions": system_analytics["total_sessions"],
                "total_coordinations": system_analytics["total_coordinations"]
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return {
            "status": "degraded",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/")
async def root():
    """Root endpoint with system information"""
    return {
        "message": "🎯 Enhanced 6FB AI Agent System",
        "description": "39-agent coordination system with authentication & persistent storage",
        "version": "2.0.0",
        "features": [
            "Real JWT Authentication",
            "Persistent SQLite Database",
            "39-Agent Coordination",
            "Business Intelligence Tracking",
            "Session Management",
            "Performance Analytics"
        ],
        "endpoints": {
            "health": "/api/v1/health",
            "register": "POST /api/v1/auth/register",
            "login": "POST /api/v1/auth/login", 
            "dashboard": "/api/v1/dashboard/overview",
            "agents": "/api/v1/agents/list",
            "coordinate": "POST /api/v1/agents/coordinate",
            "analytics": "/api/v1/agents/analytics"
        },
        "documentation": "/docs",
        "default_admin": {
            "email": "admin@6fb-ai.com",
            "password": "admin123",
            "note": "Change password after first login"
        }
    }

if __name__ == "__main__":
    print("🚀 Starting Enhanced 6FB AI Agent System")
    print("=" * 60)
    print("✨ Features:")
    print("   🔐 Real JWT Authentication")
    print("   💾 Persistent SQLite Database") 
    print("   🎯 39-Agent Coordination System")
    print("   📊 Business Intelligence Tracking")
    print("   📈 Performance Analytics")
    print("=" * 60)
    print("🌐 Server: http://localhost:8002")
    print("📚 API Docs: http://localhost:8002/docs")
    print("🔑 Default Admin: admin@6fb-ai.com / admin123")
    print("=" * 60)
    
    # Initialize services
    logger.info("Initializing authentication service...")
    auth_service.init_database()
    
    logger.info("Initializing database service...")
    db_service.init_database()
    
    logger.info("All services initialized successfully")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        reload=True,
        access_log=True
    )