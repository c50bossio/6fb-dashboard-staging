"""
Simplified AI Router - Works independently without complex service dependencies
Provides AI chat functionality using configured API keys
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, validator
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import os
import json
import logging
import time
from collections import defaultdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Simple in-memory storage for conversations
conversations_db = {}

# Rate limiting storage
rate_limit_db = defaultdict(list)  # {ip: [timestamp1, timestamp2, ...]}

# Rate limiting configuration
RATE_LIMIT_WINDOW = 60  # 1 minute window
MAX_REQUESTS_PER_WINDOW = 20  # Max requests per minute
MESSAGE_MAX_LENGTH = 2000  # Max message length

# Request/Response models
class ChatRequest(BaseModel):
    message: str = Field(..., description="User message", min_length=1, max_length=MESSAGE_MAX_LENGTH)
    agent_id: Optional[str] = Field("business_coach", description="AI agent to use")
    barbershop_id: Optional[str] = Field(None, description="Barbershop context")
    conversation_id: Optional[str] = Field(None, description="Conversation ID for context")
    include_analytics: bool = Field(False, description="Include analytics in response")
    
    @validator('agent_id')
    def validate_agent_id(cls, v):
        if v and v not in AVAILABLE_AGENTS:
            available = list(AVAILABLE_AGENTS.keys())
            raise ValueError(f"Invalid agent_id '{v}'. Available agents: {available}")
        return v
    
    @validator('message')
    def validate_message_content(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        
        # Basic content validation
        v = v.strip()
        
        # Check for potentially malicious content
        suspicious_patterns = ['<script', 'javascript:', 'data:', 'vbscript:']
        if any(pattern in v.lower() for pattern in suspicious_patterns):
            raise ValueError("Invalid message content detected")
        
        return v

class ChatResponse(BaseModel):
    agent_id: str
    response: str
    suggestions: List[str]
    analytics: Optional[Dict[str, Any]] = None
    conversation_id: str
    timestamp: str

class AgentInfo(BaseModel):
    id: str
    name: str
    status: str
    description: str
    capabilities: List[str]

# Available agents
AVAILABLE_AGENTS = {
    "business_coach": {
        "name": "Business Coach",
        "description": "Strategic business advisor for growth and operations",
        "capabilities": [
            "Business strategy planning",
            "Growth recommendations",
            "Operational efficiency",
            "Customer retention strategies",
            "Pricing optimization"
        ]
    },
    "marketing_expert": {
        "name": "Marketing Expert",
        "description": "Digital marketing and customer acquisition specialist",
        "capabilities": [
            "SEO optimization",
            "Social media strategies",
            "Email campaign planning",
            "Brand development",
            "Customer acquisition"
        ]
    },
    "financial_advisor": {
        "name": "Financial Advisor",
        "description": "Financial planning and revenue optimization expert",
        "capabilities": [
            "Revenue analysis",
            "Cost optimization",
            "Financial forecasting",
            "Pricing strategies",
            "Investment planning"
        ]
    },
    "operations_manager": {
        "name": "Operations Manager",
        "description": "Scheduling and workflow optimization specialist",
        "capabilities": [
            "Schedule optimization",
            "Staff management",
            "Workflow automation",
            "Resource allocation",
            "Efficiency improvements"
        ]
    }
}

# Simple AI response generator (can be replaced with actual AI calls)
async def generate_ai_response(message: str, agent_id: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """Generate AI response - simplified version"""
    
    # Check if we have AI keys configured
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    google_key = os.getenv("GOOGLE_AI_API_KEY")
    
    # For now, return a structured response
    # In production, this would call the actual AI APIs
    
    agent_name = AVAILABLE_AGENTS.get(agent_id, {}).get("name", "AI Assistant")
    
    # Generate contextual response based on agent type
    responses = {
        "business_coach": {
            "response": f"As your Business Coach, I understand you're asking about: '{message}'. Based on industry best practices, I recommend focusing on customer retention and service quality. Would you like specific strategies for your barbershop?",
            "suggestions": [
                "How can I increase customer retention?",
                "What pricing strategies work best for barbershops?",
                "How do I improve operational efficiency?"
            ]
        },
        "marketing_expert": {
            "response": f"From a marketing perspective regarding '{message}': Consider leveraging social media to showcase your work, encourage customer reviews, and implement a referral program. These strategies typically yield high ROI for barbershops.",
            "suggestions": [
                "How do I improve my social media presence?",
                "What's the best way to get more reviews?",
                "How can I create an effective referral program?"
            ]
        },
        "financial_advisor": {
            "response": f"Analyzing your financial question about '{message}': Focus on optimizing your service pricing, reducing operational costs, and tracking key metrics like average ticket size and customer lifetime value.",
            "suggestions": [
                "How should I price my services?",
                "What are the key financial metrics to track?",
                "How can I reduce operational costs?"
            ]
        },
        "operations_manager": {
            "response": f"For operational optimization regarding '{message}': Implement an efficient scheduling system, optimize staff utilization during peak hours, and streamline your service workflow to reduce wait times.",
            "suggestions": [
                "How can I optimize my appointment scheduling?",
                "What's the best staff scheduling approach?",
                "How do I reduce customer wait times?"
            ]
        }
    }
    
    agent_response = responses.get(agent_id, {
        "response": f"I understand you're asking about '{message}'. Let me help you with that.",
        "suggestions": ["Tell me more about your business", "What are your main challenges?", "What goals do you have?"]
    })
    
    # Add analytics if requested
    analytics = None
    if context and context.get("include_analytics"):
        analytics = {
            "sentiment": "positive",
            "topic": "business_improvement",
            "confidence": 0.85,
            "keywords": ["growth", "optimization", "strategy"]
        }
    
    return {
        "response": agent_response["response"],
        "suggestions": agent_response["suggestions"],
        "analytics": analytics,
        "model_used": "demo_mode",
        "tokens_used": len(message.split())
    }

# Endpoints
@router.get("/agents", response_model=List[AgentInfo])
async def get_available_agents():
    """Get list of available AI agents"""
    agents = []
    for agent_id, agent_data in AVAILABLE_AGENTS.items():
        agents.append(AgentInfo(
            id=agent_id,
            name=agent_data["name"],
            status="active",
            description=agent_data["description"],
            capabilities=agent_data["capabilities"]
        ))
    return agents

def check_rate_limit(request: Request) -> bool:
    """Check if request is within rate limits"""
    client_ip = request.client.host
    current_time = time.time()
    
    # Clean old entries outside the window
    cutoff_time = current_time - RATE_LIMIT_WINDOW
    rate_limit_db[client_ip] = [t for t in rate_limit_db[client_ip] if t > cutoff_time]
    
    # Check if within limit
    if len(rate_limit_db[client_ip]) >= MAX_REQUESTS_PER_WINDOW:
        return False
    
    # Add current request
    rate_limit_db[client_ip].append(current_time)
    return True

@router.post("/chat", response_model=ChatResponse)
async def chat_with_agent(request: ChatRequest, req: Request = None):
    """Chat with an AI agent"""
    try:
        # Rate limiting check
        if req and not check_rate_limit(req):
            raise HTTPException(
                status_code=429, 
                detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."
            )
        
        # Validate agent_id exists
        if request.agent_id not in AVAILABLE_AGENTS:
            available_agents = list(AVAILABLE_AGENTS.keys())
            raise HTTPException(
                status_code=400,
                detail=f"Invalid agent_id '{request.agent_id}'. Available agents: {available_agents}"
            )
        
        # Additional message validation
        if len(request.message) > MESSAGE_MAX_LENGTH:
            raise HTTPException(
                status_code=400,
                detail=f"Message too long. Maximum {MESSAGE_MAX_LENGTH} characters allowed."
            )
        # Generate or use existing conversation ID
        conversation_id = request.conversation_id or f"conv_{datetime.now().timestamp()}"
        
        # Store message in conversation history
        if conversation_id not in conversations_db:
            conversations_db[conversation_id] = []
        
        conversations_db[conversation_id].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Generate AI response
        ai_response = await generate_ai_response(
            message=request.message,
            agent_id=request.agent_id,
            context={
                "barbershop_id": request.barbershop_id,
                "include_analytics": request.include_analytics
            }
        )
        
        # Store AI response
        conversations_db[conversation_id].append({
            "role": "assistant",
            "content": ai_response["response"],
            "timestamp": datetime.now().isoformat()
        })
        
        return ChatResponse(
            agent_id=request.agent_id,
            response=ai_response["response"],
            suggestions=ai_response["suggestions"],
            analytics=ai_response.get("analytics"),
            conversation_id=conversation_id,
            timestamp=datetime.now().isoformat()
        )
        
    except ValueError as e:
        # Pydantic validation errors
        logger.warning(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@router.get("/conversation/{conversation_id}")
async def get_conversation(conversation_id: str, req: Request = None):
    """Get conversation history"""
    # Rate limiting check
    if req and not check_rate_limit(req):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    # Basic conversation ID validation
    if not conversation_id or not conversation_id.strip():
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    if conversation_id not in conversations_db:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return {
        "conversation_id": conversation_id,
        "messages": conversations_db[conversation_id],
        "message_count": len(conversations_db[conversation_id]),
        "timestamp": datetime.now().isoformat()
    }

@router.delete("/conversation/{conversation_id}")
async def clear_conversation(conversation_id: str, req: Request = None):
    """Clear conversation history"""
    # Rate limiting check
    if req and not check_rate_limit(req):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    # Basic conversation ID validation
    if not conversation_id or not conversation_id.strip():
        raise HTTPException(status_code=400, detail="Invalid conversation ID")
    
    if conversation_id in conversations_db:
        del conversations_db[conversation_id]
    
    return {
        "message": "Conversation cleared successfully",
        "conversation_id": conversation_id,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/health")
async def ai_health_check():
    """Check health of AI services"""
    health_status = {
        "status": "operational",
        "services": {},
        "timestamp": datetime.now().isoformat()
    }
    
    # Check API keys
    if os.getenv("OPENAI_API_KEY") and not "placeholder" in os.getenv("OPENAI_API_KEY", ""):
        health_status["services"]["openai"] = "configured"
    else:
        health_status["services"]["openai"] = "not_configured"
    
    if os.getenv("ANTHROPIC_API_KEY") and not "placeholder" in os.getenv("ANTHROPIC_API_KEY", ""):
        health_status["services"]["anthropic"] = "configured"
    else:
        health_status["services"]["anthropic"] = "not_configured"
    
    if os.getenv("GOOGLE_AI_API_KEY") and not "placeholder" in os.getenv("GOOGLE_AI_API_KEY", ""):
        health_status["services"]["google"] = "configured"
    else:
        health_status["services"]["google"] = "not_configured"
    
    # Overall status
    configured_count = sum(1 for s in health_status["services"].values() if s == "configured")
    if configured_count == 0:
        health_status["status"] = "no_ai_configured"
    elif configured_count < 3:
        health_status["status"] = "partially_configured"
    
    return health_status

@router.post("/analytics")
async def get_analytics(barbershop_id: str, metrics: Optional[List[str]] = None, req: Request = None):
    """Get AI-powered analytics (simplified)"""
    # Rate limiting check
    if req and not check_rate_limit(req):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    # Validate barbershop_id
    if not barbershop_id or not barbershop_id.strip():
        raise HTTPException(status_code=400, detail="barbershop_id is required")
    
    # Generate sample analytics
    return {
        "barbershop_id": barbershop_id,
        "analysis": {
            "revenue_trend": "increasing",
            "growth_rate": 12.5,
            "customer_satisfaction": 4.7,
            "recommendations": [
                "Consider implementing a loyalty program",
                "Optimize scheduling during peak hours",
                "Focus on upselling premium services"
            ]
        },
        "metrics_analyzed": metrics or ["revenue", "customers", "services"],
        "timestamp": datetime.now().isoformat()
    }

@router.post("/recommendations")
async def get_recommendations(barbershop_id: str, category: str, req: Request = None):
    """Get AI recommendations"""
    # Rate limiting check
    if req and not check_rate_limit(req):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_WINDOW} requests per {RATE_LIMIT_WINDOW} seconds."
        )
    
    # Validate inputs
    if not barbershop_id or not barbershop_id.strip():
        raise HTTPException(status_code=400, detail="barbershop_id is required")
    
    if not category or not category.strip():
        raise HTTPException(status_code=400, detail="category is required")
    
    valid_categories = ["pricing", "marketing", "operations", "growth"]
    if category not in valid_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category '{category}'. Valid categories: {valid_categories}"
        )
    recommendations_map = {
        "pricing": [
            "Implement dynamic pricing for peak hours",
            "Bundle services for better value",
            "Offer membership programs"
        ],
        "marketing": [
            "Increase social media presence",
            "Implement referral rewards",
            "Collect and showcase reviews"
        ],
        "operations": [
            "Optimize appointment scheduling",
            "Reduce no-show rates with reminders",
            "Streamline check-in process"
        ],
        "growth": [
            "Expand service offerings",
            "Train staff in upselling",
            "Partner with local businesses"
        ]
    }
    
    return {
        "barbershop_id": barbershop_id,
        "category": category,
        "recommendations": recommendations_map.get(category, ["Analyze your specific needs"]),
        "timestamp": datetime.now().isoformat()
    }