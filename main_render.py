#!/usr/bin/env python3
"""
Simplified FastAPI Server for Render Deployment
Streamlined version with minimal dependencies for reliable cloud deployment
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import json
from datetime import datetime
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="6FB AI Agent System",
    description="AI-powered business automation and integration system",
    version="1.0.2"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:9999",
        "https://6fb-ai-staging.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    agent_id: Optional[str] = "business_coach"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    agent_id: str
    response: str
    suggestions: List[str]
    confidence: float
    timestamp: str

class Agent(BaseModel):
    id: str
    name: str
    description: str
    status: str
    capabilities: List[str]

# Mock agents data
AGENTS = [
    {
        "id": "business_coach",
        "name": "🎯 Business Strategy Coach",
        "description": "Strategic planning and business growth optimization",
        "status": "active",
        "capabilities": ["strategy", "planning", "growth", "optimization"]
    },
    {
        "id": "marketing_expert",
        "name": "📈 Marketing Expert",
        "description": "Customer acquisition and marketing campaign optimization",
        "status": "active", 
        "capabilities": ["acquisition", "campaigns", "social_media", "analytics"]
    },
    {
        "id": "financial_advisor",
        "name": "💰 Financial Advisor",
        "description": "Revenue optimization and financial planning",
        "status": "active",
        "capabilities": ["revenue", "budgeting", "forecasting", "pricing"]
    },
    {
        "id": "operations_manager",
        "name": "⚙️ Operations Manager", 
        "description": "Process optimization and workflow management",
        "status": "active",
        "capabilities": ["processes", "efficiency", "automation", "workflows"]
    },
    {
        "id": "customer_service",
        "name": "🤝 Customer Experience Specialist",
        "description": "Customer satisfaction and relationship management",
        "status": "active",
        "capabilities": ["satisfaction", "retention", "feedback", "support"]
    },
    {
        "id": "brand_designer",
        "name": "🎨 Brand & Design Expert",
        "description": "Brand development and visual identity design",
        "status": "active",
        "capabilities": ["branding", "design", "identity", "visual"]
    }
]

# Helper functions
def get_agent_response(message: str, agent_id: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate AI agent response based on agent type and message"""
    
    # Find the agent
    agent = next((a for a in AGENTS if a["id"] == agent_id), AGENTS[0])
    
    # Generate contextual response based on agent type
    responses = {
        "business_coach": [
            "Focus on your core value proposition and target market expansion.",
            "Consider implementing a customer retention program to increase lifetime value.",
            "Analyze your competitors' pricing strategies and differentiate your offerings."
        ],
        "marketing_expert": [
            "Leverage social media marketing to reach your target demographic.",
            "Implement email marketing campaigns to nurture leads.",
            "Track conversion rates and optimize your marketing funnel."
        ],
        "financial_advisor": [
            "Review your monthly cash flow and identify cost optimization opportunities.",
            "Set up automated financial reporting for better decision making.",
            "Consider diversifying revenue streams to reduce business risk."
        ],
        "operations_manager": [
            "Streamline your booking process to reduce customer friction.",
            "Implement standard operating procedures for consistent service quality.",
            "Use automation tools to handle repetitive administrative tasks."
        ],
        "customer_service": [
            "Implement a customer feedback system to track satisfaction.",
            "Create a loyalty program to reward repeat customers.",
            "Train staff on customer service best practices."
        ],
        "brand_designer": [
            "Develop a consistent visual identity across all touchpoints.",
            "Create professional marketing materials that reflect your brand values.",
            "Optimize your online presence with cohesive branding."
        ]
    }
    
    agent_responses = responses.get(agent_id, responses["business_coach"])
    
    return {
        "agent_id": agent_id,
        "response": f"Based on your message about '{message[:50]}...', here's my recommendation: {agent_responses[0]}",
        "suggestions": agent_responses[1:],
        "confidence": 0.85,
        "timestamp": datetime.now().isoformat()
    }

# API Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "6FB AI Agent System Backend", 
        "status": "running",
        "version": "1.0.2",
        "agents_available": len(AGENTS),
        "deployment": "render"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "6fb-ai-backend",
        "version": "1.0.2",
        "agents": len(AGENTS),
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/v1/agents", response_model=List[Agent])
async def list_agents():
    """Get list of available AI agents"""
    return [Agent(**agent) for agent in AGENTS]

@app.get("/api/v1/agents/{agent_id}")
async def get_agent(agent_id: str):
    """Get specific agent details"""
    agent = next((a for a in AGENTS if a["id"] == agent_id), None)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return Agent(**agent)

@app.post("/api/v1/ai-agents/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest):
    """Chat with AI agent"""
    try:
        if not request.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        response = get_agent_response(
            message=request.message,
            agent_id=request.agent_id or "business_coach",
            context=request.context or {}
        )
        
        logger.info(f"Chat completed for agent {request.agent_id}")
        return ChatResponse(**response)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.post("/api/v1/agentic-coach/chat", response_model=ChatResponse)
async def agentic_coach_chat(request: ChatRequest):
    """Agentic coach endpoint for backward compatibility"""
    return await chat_with_agent(request)

@app.get("/api/v1/database/health")
async def database_health():
    """Database health check (mock for compatibility)"""
    return {
        "healthy": True,
        "type": "mock",
        "message": "Database simulation active",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/debug")
async def debug_info():
    """Debug information"""
    return {
        "environment": os.getenv("ENVIRONMENT", "development"),
        "port": os.getenv("PORT", "8000"),
        "frontend_url": os.getenv("FRONTEND_URL", "not_set"),
        "python_unbuffered": os.getenv("PYTHONUNBUFFERED", "not_set"),
        "agents_count": len(AGENTS),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print("🚀 Starting 6FB AI Agent System Backend...")
    print(f"🌐 Port: {port}")
    print(f"🤖 Agents: {len(AGENTS)}")
    print("🔗 Endpoints:")
    print("  - GET  /health")
    print("  - GET  /api/v1/agents")
    print("  - POST /api/v1/ai-agents/chat")
    print("  - POST /api/v1/agentic-coach/chat")
    print("✅ Ready for deployment")
    
    uvicorn.run(
        "main-render:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )