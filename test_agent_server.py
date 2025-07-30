#!/usr/bin/env python3
"""
Standalone Test Server for Agent Coordination System
Bypasses database initialization for testing purposes
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import json
from datetime import datetime

# Import agent coordination system
from services.orchestration.agent_coordination_api import router as agent_coordination_router

app = FastAPI(
    title="6FB AI Agent Coordination Test Server",
    description="Enhanced AI Agent System with 39-Agent Coordination - Test Mode"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include agent coordination router
app.include_router(agent_coordination_router)

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "6FB AI Agent Coordination Test Server",
        "version": "1.0.0",
        "agent_system": "active",
        "total_agents": 39,
        "tiers": {
            "business": 4,
            "orchestration": 10,
            "specialized": 25
        },
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint with system information"""
    return {
        "message": "🎯 6FB AI Agent Coordination System",
        "description": "39-agent intelligent coordination system with 3-tier architecture",
        "endpoints": {
            "health": "/api/v1/health",
            "list_agents": "/api/v1/agents/list",
            "coordinate": "/api/v1/agents/coordinate",
            "analytics": "/api/v1/agents/analytics"
        },
        "documentation": "/docs"
    }

if __name__ == "__main__":
    print("🚀 Starting 6FB AI Agent Coordination Test Server")
    print("=" * 60)
    print("🎯 Features: 39-Agent Coordination System")
    print("🏢 Tier 1: Business Intelligence (4 agents)")
    print("🎭 Tier 2: BMAD Orchestration (10 agents)")
    print("⚙️ Tier 3: Specialized Execution (25 agents)")
    print("=" * 60)
    print("🌐 Server: http://localhost:8001")
    print("📋 Agent List: http://localhost:8001/api/v1/agents/list")
    print("🎯 Coordinate: POST http://localhost:8001/api/v1/agents/coordinate")
    print("📊 Analytics: http://localhost:8001/api/v1/agents/analytics")
    print("📚 Docs: http://localhost:8001/docs")
    print("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        reload=True,
        access_log=True
    )