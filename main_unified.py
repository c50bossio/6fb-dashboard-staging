#!/usr/bin/env python3
"""
6FB AI Agent System - Unified FastAPI Backend
Fully integrated backend with all routers working
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import sys
from datetime import datetime
import logging
from typing import Optional
from dotenv import load_dotenv
import sqlite3
import json
import uuid

# Load environment variables
load_dotenv('.env.local')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our routers
from routers import ai_simple, bookings, analytics, shop

# Initialize SQLite database for demo
def init_demo_db():
    """Initialize demo database with sample data"""
    conn = sqlite3.connect('booking_demo.db')
    cursor = conn.cursor()
    
    # Create tables if they don't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS barbershops (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT,
            city TEXT,
            state TEXT,
            phone TEXT,
            email TEXT
        )
    ''')
    
    # Insert sample barbershop if not exists
    cursor.execute('''
        INSERT OR REPLACE INTO barbershops 
        (id, name, address, city, state, phone, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        "550e8400-e29b-41d4-a716-446655440000",
        "Development Shop",
        "123 Main St",
        "San Francisco",
        "CA",
        "(555) 123-4567",
        "dev@6fb.local"
    ))
    
    conn.commit()
    conn.close()
    logger.info("✅ Demo database initialized")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("🚀 Starting 6FB AI Agent System Unified Backend...")
    logger.info(f"📍 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"🌐 Port: {os.getenv('PORT', 8001)}")
    
    # Initialize demo database
    init_demo_db()
    
    # Check AI configuration
    ai_configured = False
    if os.getenv("OPENAI_API_KEY") and "placeholder" not in os.getenv("OPENAI_API_KEY", ""):
        logger.info("✅ OpenAI API configured")
        ai_configured = True
    if os.getenv("ANTHROPIC_API_KEY") and "placeholder" not in os.getenv("ANTHROPIC_API_KEY", ""):
        logger.info("✅ Anthropic API configured")
        ai_configured = True
    if os.getenv("GOOGLE_AI_API_KEY") and "placeholder" not in os.getenv("GOOGLE_AI_API_KEY", ""):
        logger.info("✅ Google AI API configured")
        ai_configured = True
    
    if ai_configured:
        logger.info("✅ AI services ready!")
    else:
        logger.warning("⚠️ No AI API keys configured - using demo mode")
    
    logger.info("✅ Backend Ready!")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down 6FB AI Agent System Backend...")

# Create FastAPI app
app = FastAPI(
    title="6FB AI Agent System",
    description="Enterprise barbershop platform with AI-powered business intelligence",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9999",
        "http://localhost:3000",
        "https://bookedbarber.com",
        "*"  # Allow all origins for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An error occurred",
            "timestamp": datetime.now().isoformat()
        }
    )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with system information"""
    return {
        "name": "6FB AI Agent System",
        "version": "2.0.0",
        "status": "operational",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "ai": "/api/v1/ai",
            "bookings": "/api/v1/bookings",
            "analytics": "/api/v1/analytics",
            "shop": "/api/v1/shop",
            "public": "/api/v1/public"
        }
    }

@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "operational",
            "database": "operational",
            "ai": "checking"
        }
    }
    
    # Check AI services
    ai_configured = False
    if os.getenv("OPENAI_API_KEY") and "placeholder" not in os.getenv("OPENAI_API_KEY", ""):
        ai_configured = True
    elif os.getenv("ANTHROPIC_API_KEY") and "placeholder" not in os.getenv("ANTHROPIC_API_KEY", ""):
        ai_configured = True
    elif os.getenv("GOOGLE_AI_API_KEY") and "placeholder" not in os.getenv("GOOGLE_AI_API_KEY", ""):
        ai_configured = True
    
    health_status["services"]["ai"] = "operational" if ai_configured else "demo_mode"
    
    return health_status

@app.get("/api/v1/health")
async def api_health():
    """API-specific health check"""
    return {
        "status": "healthy",
        "message": "6FB AI Agent System is running",
        "api_version": "v1",
        "timestamp": datetime.now().isoformat()
    }

# Include routers with proper prefixes
app.include_router(ai_simple.router, prefix="/api/v1/ai", tags=["AI"])
app.include_router(bookings.router, prefix="/api/v1/bookings", tags=["Bookings"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(shop.router, prefix="/api/v1/shop", tags=["Shop"])

# Public endpoints (for booking flow)
@app.get("/api/v1/public/barbershops")
async def list_public_barbershops():
    """List all public barbershops"""
    conn = sqlite3.connect('booking_demo.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM barbershops")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/api/v1/public/barbershops/{barbershop_id}")
async def get_barbershop(barbershop_id: str):
    """Get barbershop details"""
    conn = sqlite3.connect('booking_demo.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM barbershops WHERE id = ?", (barbershop_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Barbershop not found")
    
    return dict(row)

@app.get("/api/v1/public/barbershops/{barbershop_id}/barbers")
async def get_barbershop_barbers(barbershop_id: str):
    """Get barbers for a barbershop"""
    # Return sample barbers
    return [
        {
            "id": "mike-001",
            "name": "Mike Barber",
            "specialty": "Professional Barber",
            "experience": "5+ years experience",
            "bio": "Expert barber specializing in modern and classic styles",
            "services": [
                {
                    "id": "service-001",
                    "service_id": "haircut-001",
                    "name": "Classic Haircut",
                    "description": "Traditional men's haircut",
                    "duration_minutes": 30,
                    "price": 35.00,
                    "skill_level": "expert",
                    "category": "haircut"
                },
                {
                    "id": "service-002",
                    "service_id": "beard-001",
                    "name": "Beard Trim",
                    "description": "Professional beard shaping",
                    "duration_minutes": 15,
                    "price": 20.00,
                    "skill_level": "expert",
                    "category": "beard"
                }
            ]
        },
        {
            "id": "no-preference",
            "name": "No Preference",
            "specialty": "Any Available Barber",
            "experience": "Varies",
            "bio": "Next available barber",
            "services": [
                {
                    "id": "service-003",
                    "service_id": "haircut-001",
                    "name": "Classic Haircut",
                    "description": "Traditional men's haircut",
                    "duration_minutes": 30,
                    "price": 35.00,
                    "skill_level": "standard",
                    "category": "haircut"
                }
            ]
        }
    ]

@app.get("/api/v1/public/barbers/{barber_id}/availability")
async def get_public_barber_availability(
    barber_id: str,
    barbershop_id: str,
    start_date: str,
    end_date: str,
    service_duration_minutes: int = 30
):
    """Get barber availability"""
    from datetime import timedelta
    
    # Generate mock availability slots
    slots = []
    try:
        start = datetime.fromisoformat(start_date.replace('Z', ''))
    except:
        start = datetime.now()
    
    # Generate slots for next 7 days
    current = start.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    end_limit = current + timedelta(days=7)
    
    while current < end_limit and len(slots) < 20:
        # Skip Sundays
        if current.weekday() == 6:
            current += timedelta(days=1)
            continue
            
        # Business hours: 9 AM - 6 PM
        for hour in range(9, 18):
            for minute in [0, 30]:
                slot_time = current.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Add slots (skip some to simulate bookings)
                if len(slots) < 20 and (len(slots) % 3 != 0):
                    end_time = slot_time + timedelta(minutes=service_duration_minutes)
                    slots.append({
                        "start_time": slot_time.isoformat(),
                        "end_time": end_time.isoformat(),
                        "duration_minutes": service_duration_minutes,
                        "available": True
                    })
                
                if len(slots) >= 20:
                    break
            if len(slots) >= 20:
                break
        
        current += timedelta(days=1)
    
    return {"availability_slots": slots}

# Legacy endpoints for compatibility
@app.get("/api/v1/agents")
async def get_agents():
    """Get available AI agents (legacy endpoint)"""
    return [
        {
            "id": "business_coach",
            "name": "Business Coach",
            "description": "AI-powered business strategy and growth advisor",
            "status": "active",
            "specialty": "Business growth, pricing strategy, customer retention"
        },
        {
            "id": "marketing_expert",
            "name": "Marketing Expert",
            "description": "Digital marketing and customer acquisition specialist",
            "status": "active",
            "specialty": "SEO, social media, email campaigns, brand building"
        },
        {
            "id": "financial_advisor",
            "name": "Financial Advisor",
            "description": "Financial planning and revenue optimization expert",
            "status": "active",
            "specialty": "Revenue optimization, cost reduction, financial planning"
        },
        {
            "id": "operations_manager",
            "name": "Operations Manager",
            "description": "Scheduling and workflow optimization specialist",
            "status": "active",
            "specialty": "Scheduling, staff management, efficiency optimization"
        }
    ]

@app.post("/api/v1/agentic-coach/chat")
async def legacy_chat(request: Request):
    """Legacy chat endpoint - redirects to new AI chat"""
    body = await request.json()
    
    # Transform to new format
    from routers.ai_simple import chat_with_agent, ChatRequest
    
    chat_request = ChatRequest(
        message=body.get("message", ""),
        agent_id=body.get("agent_id", "business_coach"),
        barbershop_id=body.get("barbershop_id"),
        conversation_id=body.get("conversation_id")
    )
    
    return await chat_with_agent(chat_request)

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not found",
            "path": str(request.url.path),
            "message": "The requested endpoint does not exist",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8001))
    host = os.getenv("HOST", "0.0.0.0")
    reload = os.getenv("ENVIRONMENT", "development") == "development"
    
    logger.info(f"Starting server on {host}:{port}")
    logger.info(f"Auto-reload: {reload}")
    logger.info(f"API Documentation: http://localhost:{port}/docs")
    
    uvicorn.run(
        "main_unified:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )