#!/usr/bin/env python3
"""
Optimized FastAPI backend with performance enhancements:
- Async database connection pooling
- AI service connection pooling
- Response caching and request queuing
- Memory management and cleanup
- Enhanced rate limiting
- Performance monitoring
"""

import asyncio
import json
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

# Import optimized components
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.optimized_database_manager import (
    OptimizedDatabaseManager,
    get_database_manager,
    initialize_database_manager
)
from services.optimized_ai_connection_pool import (
    AIProvider,
    OptimizedAIConnectionPool,
    RequestPriority,
    get_ai_connection_pool,
    initialize_ai_connection_pool
)
from middleware.rate_limiting import RateLimitMiddleware

# Performance monitoring
from services.performance_monitor import PerformanceMonitor

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize performance monitoring
performance_monitor = PerformanceMonitor()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan with resource management"""
    # Startup
    logger.info("🚀 Starting optimized FastAPI backend...")
    
    try:
        # Initialize database manager
        await initialize_database_manager("data/agent_system.db")
        logger.info("✅ Database manager initialized")
        
        # Initialize AI connection pool
        await initialize_ai_connection_pool()
        logger.info("✅ AI connection pool initialized")
        
        # Start performance monitoring
        await performance_monitor.start()
        logger.info("✅ Performance monitoring started")
        
        logger.info("🎉 Backend initialization completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Backend initialization failed: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down optimized backend...")
    
    try:
        # Close AI connection pool
        ai_pool = get_ai_connection_pool()
        if ai_pool:
            await ai_pool.close()
        
        # Close database manager
        db_manager = get_database_manager()
        if db_manager:
            await db_manager.close()
        
        # Stop performance monitoring
        await performance_monitor.stop()
        
        logger.info("✅ Backend shutdown completed")
        
    except Exception as e:
        logger.error(f"❌ Backend shutdown error: {e}")

# Initialize FastAPI with optimized settings
app = FastAPI(
    title="6FB AI Agent System - Optimized",
    description="High-performance AI-powered barbershop management system",
    version="2.1.0",
    lifespan=lifespan
)

# Enhanced rate limiting middleware
app.add_middleware(
    RateLimitMiddleware,
    redis_client=None,  # Using optimized in-memory fallback
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
    session_id: Optional[str] = None
    business_context: Optional[Dict[str, Any]] = {}

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class AnalyticsBatch(BaseModel):
    events: List[Dict[str, Any]]

# Helper functions
def hash_password(password: str) -> str:
    """Hash password with salt"""
    import hashlib
    salt = "6fb-optimized-salt"
    return hashlib.sha256(f"{password}{salt}".encode()).hexdigest()

def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against hash"""
    return hash_password(password) == password_hash

def create_token(user_id: int) -> str:
    """Create session token"""
    import secrets
    return secrets.token_urlsafe(32)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from token with performance monitoring"""
    start_time = performance_monitor.start_timer()
    
    try:
        token = credentials.credentials
        
        # Development bypass
        is_development = os.getenv('NODE_ENV') == 'development' or os.getenv('ENVIRONMENT') == 'development'
        if is_development and token == 'dev-bypass-token':
            performance_monitor.record_metric('auth_bypass_used', 1)
            return {
                'id': 'dev-user-123',
                'email': 'dev@example.com',
                'name': 'Development User',
                'role': 'shop_owner'
            }
        
        # Validate session using optimized database manager
        db_manager = get_database_manager()
        user_data = await db_manager.validate_session(token)
        
        if not user_data:
            performance_monitor.record_metric('auth_failures', 1)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        performance_monitor.record_metric('auth_success', 1)
        return user_data
        
    except HTTPException:
        raise
    except Exception as e:
        performance_monitor.record_metric('auth_errors', 1)
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication service error"
        )
    finally:
        performance_monitor.end_timer('auth_time', start_time)

# Routes
@app.get("/")
async def root():
    """Root endpoint with system status"""
    return {
        "message": "6FB AI Agent System - Optimized Backend",
        "status": "running",
        "version": "2.1.0",
        "optimizations": [
            "async_database_pool",
            "ai_connection_pool", 
            "response_caching",
            "memory_management",
            "performance_monitoring"
        ],
        "endpoints": {
            "auth": "/api/v1/auth/*",
            "agents": "/api/v1/agents/*",
            "chat": "/api/v1/chat",
            "dashboard": "/api/v1/dashboard/*",
            "health": "/health",
            "performance": "/api/v1/performance/*"
        }
    }

@app.get("/health")
async def health():
    """Comprehensive health check"""
    try:
        db_manager = get_database_manager()
        db_health = await db_manager.get_health_status()
        
        ai_pool = get_ai_connection_pool()
        ai_stats = ai_pool.get_stats()
        
        perf_stats = performance_monitor.get_stats()
        
        overall_healthy = (
            db_health.get('database_healthy', False) and
            ai_stats.get('connection_pool', {}).get('initialized', False)
        )
        
        return {
            "status": "healthy" if overall_healthy else "degraded",
            "service": "6fb-ai-backend-optimized",
            "version": "2.1.0",
            "database": db_health,
            "ai_services": ai_stats,
            "performance": perf_stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Authentication endpoints
@app.post("/api/v1/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    """Register new user with optimized database operations"""
    start_time = performance_monitor.start_timer()
    
    try:
        db_manager = get_database_manager()
        
        # Create user with optimized query
        password_hash = hash_password(user.password)
        user_id = await db_manager.create_user(user.email, password_hash, user.shop_name)
        
        # Create session
        token = create_token(user_id)
        expires_at = datetime.now() + timedelta(days=7)
        await db_manager.create_session(user_id, token, expires_at)
        
        performance_monitor.record_metric('user_registrations', 1)
        
        return TokenResponse(
            access_token=token,
            user={
                "id": user_id,
                "email": user.email,
                "shop_name": user.shop_name
            }
        )
        
    except Exception as e:
        performance_monitor.record_metric('registration_errors', 1)
        logger.error(f"Registration error: {e}")
        
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )
    finally:
        performance_monitor.end_timer('registration_time', start_time)

@app.post("/api/v1/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    """Login user with optimized authentication"""
    start_time = performance_monitor.start_timer()
    
    try:
        db_manager = get_database_manager()
        
        # Authenticate user with login tracking
        db_user = await db_manager.authenticate_user(user.email)
        
        if not db_user or not verify_password(user.password, db_user["password_hash"]):
            performance_monitor.record_metric('login_failures', 1)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create session
        token = create_token(db_user["id"])
        expires_at = datetime.now() + timedelta(days=7)
        await db_manager.create_session(db_user["id"], token, expires_at)
        
        performance_monitor.record_metric('successful_logins', 1)
        
        return TokenResponse(
            access_token=token,
            user={
                "id": db_user["id"],
                "email": db_user["email"],
                "shop_name": db_user["shop_name"],
                "login_count": db_user.get("login_count", 0)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        performance_monitor.record_metric('login_errors', 1)
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login service error"
        )
    finally:
        performance_monitor.end_timer('login_time', start_time)

@app.get("/api/v1/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# AI Chat endpoints
@app.get("/api/v1/agents")
async def get_agents():
    """Get available AI agents with performance data"""
    ai_pool = get_ai_connection_pool()
    ai_stats = ai_pool.get_stats()
    
    agents = [
        {
            "id": "business_coach",
            "name": "Business Coach",
            "description": "Strategic guidance for growing your barbershop",
            "status": "active",
            "icon": "ChartBarIcon",
            "performance": ai_stats.get('performance', {})
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
    
    return {
        "agents": agents,
        "ai_pool_stats": ai_stats,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/chat")
@app.post("/api/ai/analytics-enhanced-chat")  # Alternative endpoint for compatibility
async def enhanced_ai_chat(
    message: ChatMessage,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Enhanced AI chat with connection pooling and caching"""
    start_time = performance_monitor.start_timer()
    
    try:
        if not message.message or not message.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message is required"
            )
        
        # Get AI connection pool
        ai_pool = get_ai_connection_pool()
        
        # Determine provider based on message type and load
        provider = AIProvider.OPENAI  # Default
        priority = RequestPriority.NORMAL
        
        # Analyze message to choose optimal provider
        message_lower = message.message.lower()
        if any(word in message_lower for word in ['analyze', 'strategy', 'business']):
            provider = AIProvider.ANTHROPIC  # Better for analysis
            priority = RequestPriority.HIGH
        elif any(word in message_lower for word in ['creative', 'content', 'write']):
            provider = AIProvider.OPENAI  # Good for creative tasks
        
        # Submit request to AI pool
        response_content = await ai_pool.submit_request(
            provider=provider,
            message=message.message,
            context={
                'business_context': message.business_context,
                'user_id': current_user.get('id'),
                'agent_id': message.agent_id,
                'session_id': message.session_id
            },
            priority=priority,
            timeout=30.0
        )
        
        # Save to chat history
        db_manager = get_database_manager()
        await db_manager.save_chat_message(
            user_id=current_user["id"],
            agent_id=message.agent_id,
            message=message.message,
            response=response_content,
            session_id=message.session_id
        )
        
        # Record performance metrics
        response_time = performance_monitor.end_timer('ai_chat_time', start_time)
        await db_manager.record_performance_metric(
            'ai_chat_response_time',
            response_time,
            {
                'provider': provider.value,
                'user_id': current_user["id"],
                'message_length': len(message.message)
            }
        )
        
        performance_monitor.record_metric('ai_chats_completed', 1)
        
        return {
            "response": response_content,
            "agent_details": {
                "primary_agent": message.agent_id,
                "provider": provider.value
            },
            "message_type": "general",
            "session_id": message.session_id,
            "response_time": response_time,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        performance_monitor.record_metric('ai_chat_errors', 1)
        logger.error(f"AI chat error: {e}")
        
        # Return fallback response instead of error
        return {
            "response": f"I understand you're asking about '{message.message}'. I'm experiencing some technical difficulties right now, but I'm here to help optimize your barbershop business. Could you try rephrasing your question?",
            "agent_details": {"primary_agent": "fallback"},
            "message_type": "fallback",
            "session_id": message.session_id,
            "error": True,
            "timestamp": datetime.now().isoformat()
        }

# Analytics endpoints
@app.post("/api/ai/analytics/batch")
async def batch_analytics(batch: AnalyticsBatch):
    """Process batched analytics events for better performance"""
    start_time = performance_monitor.start_timer()
    
    try:
        db_manager = get_database_manager()
        
        # Process events in batches for better performance
        batch_operations = []
        for event in batch.events:
            if event.get('action') == 'track_conversation':
                # Track conversation metrics
                batch_operations.append((
                    "INSERT INTO performance_metrics (metric_type, value, metadata) VALUES (?, ?, ?)",
                    ('conversation', 1, json.dumps(event.get('data', {})))
                ))
            elif event.get('action') == 'track_response_time':
                # Track response time
                batch_operations.append((
                    "INSERT INTO performance_metrics (metric_type, value, metadata) VALUES (?, ?, ?)", 
                    ('response_time', event.get('data', {}).get('responseTime', 0), json.dumps(event.get('data', {})))
                ))
            elif event.get('action') == 'track_satisfaction':
                # Track user satisfaction
                batch_operations.append((
                    "INSERT INTO performance_metrics (metric_type, value, metadata) VALUES (?, ?, ?)",
                    ('satisfaction_rating', event.get('data', {}).get('rating', 0), json.dumps(event.get('data', {})))
                ))
        
        if batch_operations:
            await db_manager.pool.execute_transaction(batch_operations)
        
        performance_monitor.record_metric('analytics_batches_processed', 1)
        performance_monitor.record_metric('analytics_events_processed', len(batch.events))
        
        return {
            "success": True,
            "events_processed": len(batch.events),
            "processing_time": performance_monitor.end_timer('analytics_batch_time', start_time),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        performance_monitor.record_metric('analytics_batch_errors', 1)
        logger.error(f"Analytics batch processing error: {e}")
        return {
            "success": False,
            "error": str(e),
            "events_processed": 0
        }

# Dashboard endpoints with caching
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get dashboard statistics with performance optimization"""
    start_time = performance_monitor.start_timer()
    
    try:
        # Mock data with improved performance
        stats = {
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
            },
            "performance": performance_monitor.get_stats()
        }
        
        performance_monitor.end_timer('dashboard_stats_time', start_time)
        return stats
        
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Dashboard service error"
        )

# Performance monitoring endpoints
@app.get("/api/v1/performance/stats")
async def get_performance_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get system performance statistics"""
    try:
        db_manager = get_database_manager()
        ai_pool = get_ai_connection_pool()
        
        return {
            "system_performance": performance_monitor.get_stats(),
            "database_performance": await db_manager.get_health_status(),
            "ai_pool_performance": ai_pool.get_stats(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Performance stats error: {e}")
        return {"error": str(e)}

@app.get("/api/v1/performance/health")
async def performance_health_check():
    """Detailed performance health check"""
    try:
        perf_stats = performance_monitor.get_stats()
        
        # Determine health based on metrics
        avg_response_time = perf_stats.get('average_response_time', 0)
        error_rate = perf_stats.get('error_rate', 0)
        memory_usage = perf_stats.get('memory_usage_mb', 0)
        
        healthy = (
            avg_response_time < 2000 and  # Under 2 seconds
            error_rate < 0.05 and        # Less than 5% errors
            memory_usage < 1000           # Under 1GB memory
        )
        
        return {
            "healthy": healthy,
            "performance_grade": "A" if healthy else "B" if avg_response_time < 5000 else "C",
            "metrics": perf_stats,
            "recommendations": _generate_performance_recommendations(perf_stats),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Performance health check error: {e}")
        return {
            "healthy": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def _generate_performance_recommendations(stats: Dict[str, Any]) -> List[str]:
    """Generate performance improvement recommendations"""
    recommendations = []
    
    if stats.get('average_response_time', 0) > 2000:
        recommendations.append("Consider optimizing slow database queries")
    
    if stats.get('error_rate', 0) > 0.01:
        recommendations.append("Review error logs to identify common failure points")
    
    if stats.get('memory_usage_mb', 0) > 800:
        recommendations.append("Memory usage is high, consider implementing more aggressive cleanup")
    
    cache_hit_ratio = stats.get('ai_pool_stats', {}).get('cache_hit_ratio', 0)
    if cache_hit_ratio < 0.3:
        recommendations.append("AI response cache hit ratio is low, review caching strategy")
    
    return recommendations

# Settings endpoints with optimized database operations
@app.get("/api/v1/settings/barbershop")
async def get_barbershop_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get barbershop settings with caching"""
    try:
        db_manager = get_database_manager()
        profile_data = await db_manager.get_shop_profile(current_user["id"])
        
        if profile_data:
            return profile_data['profile_data']
        
        # Return defaults
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
        
    except Exception as e:
        logger.error(f"Get settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Settings service error"
        )

@app.post("/api/v1/settings/barbershop")
async def save_barbershop_settings(
    settings: Dict[str, Any], 
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Save barbershop settings with optimized storage"""
    try:
        db_manager = get_database_manager()
        await db_manager.save_shop_profile(current_user["id"], settings)
        
        return {
            "message": "Settings saved successfully",
            "settings": settings,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Save settings error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Settings save failed"
        )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "optimized_fastapi_backend:app",
        host="0.0.0.0",
        port=port,
        reload=False,  # Disable reload for better performance
        workers=1,     # Single worker with async processing
        loop="uvloop", # Use uvloop for better performance
        access_log=False  # Disable access logs for performance
    )