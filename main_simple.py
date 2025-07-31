#!/usr/bin/env python3
"""
Ultra-minimal FastAPI Server for Render Deployment
Zero complex dependencies, guaranteed to work
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import os
from datetime import datetime

# Create FastAPI app
app = FastAPI(
    title="6FB AI Agent System", 
    version="1.0.4",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChatRequest(BaseModel):
    message: str
    agent_id: Optional[str] = "business_coach"

class ChatResponse(BaseModel):
    agent_id: str
    response: str
    suggestions: List[str]
    timestamp: str

# Startup event
@app.on_event("startup")
def startup_event():
    print("🚀 6FB AI Agent System Backend Starting...")
    print(f"📍 Environment: {os.getenv('ENVIRONMENT', 'production')}")
    print(f"🌐 Port: {os.getenv('PORT', '8000')}")
    print("✅ Backend Ready!")

# Routes
@app.get("/")
def root():
    return {
        "message": "6FB AI Agent System Backend",
        "status": "running", 
        "version": "1.0.4",
        "environment": os.getenv("ENVIRONMENT", "production"),
        "port": os.getenv("PORT", "8000")
    }

@app.get("/health")
def health():
    return {"status": "healthy", "service": "6fb-ai-backend"}

@app.get("/api/v1/agents")
def list_agents():
    return [
        {"id": "business_coach", "name": "Business Coach", "status": "active"},
        {"id": "marketing_expert", "name": "Marketing Expert", "status": "active"},
        {"id": "financial_advisor", "name": "Financial Advisor", "status": "active"}
    ]

@app.post("/api/v1/ai-agents/chat")
def chat(request: ChatRequest):
    return ChatResponse(
        agent_id=request.agent_id,
        response=f"AI response to: {request.message}",
        suggestions=["Try this", "Consider that"],
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/v1/agentic-coach/chat") 
def agentic_chat(request: ChatRequest):
    return chat(request)

@app.get("/debug")
def debug():
    return {
        "environment": os.getenv("ENVIRONMENT", "production"),
        "port": os.getenv("PORT", "8000"),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main_simple:app", host="0.0.0.0", port=port)