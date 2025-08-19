"""
AI-related endpoints extracted from fastapi_backend.py
Handles AI models, chat, insights, performance monitoring, and predictive analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import os
import asyncio

# Import AI orchestrator and models
try:
    from services.ai_orchestrator_enhanced import ai_orchestrator
    AI_ORCHESTRATOR_AVAILABLE = True
except ImportError:
    AI_ORCHESTRATOR_AVAILABLE = False

# Import memory manager
from services.memory_manager import memory_manager

# AI Model Configuration - Updated August 2025
AI_MODELS = {
    "openai": {
        "default": "gpt-5",
        "models": {
            "gpt-5": {"name": "GPT-5", "description": "Most capable model", "cost": "premium"},
            "gpt-5-mini": {"name": "GPT-5 Mini", "description": "Faster, cheaper", "cost": "standard"},
            "gpt-5-nano": {"name": "GPT-5 Nano", "description": "Lightweight", "cost": "budget"}
        }
    },
    "anthropic": {
        "default": "claude-opus-4-1-20250805",
        "models": {
            "claude-opus-4-1-20250805": {"name": "Claude Opus 4.1", "description": "Best for coding", "cost": "premium"}
        }
    },
    "google": {
        "default": "gemini-2.0-flash-exp",
        "models": {
            "gemini-2.0-flash-exp": {"name": "Gemini 2.0 Flash", "description": "Cost-effective", "cost": "budget"}
        }
    }
}

DEFAULT_AI_MODEL = "gpt-5"

# Pydantic models
class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = DEFAULT_AI_MODEL
    context: Optional[str] = None
    barbershop_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model_used: str
    token_count: Optional[int] = None
    cost: Optional[float] = None

class UnifiedChatRequest(BaseModel):
    user_message: str
    context: Optional[str] = None
    barbershop_id: Optional[str] = None
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None

class EnhancedChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    barbershop_id: Optional[str] = None
    model: Optional[str] = DEFAULT_AI_MODEL
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 1000

# Create router
router = APIRouter(prefix="/api/v1", tags=["AI"])

# Authentication dependency
security = HTTPBearer()

# Import the real authentication function
from routers.auth import get_current_user

@router.get("/ai/models")
async def get_ai_models():
    """Get available AI models"""
    return {
        "models": AI_MODELS,
        "default": DEFAULT_AI_MODEL,
        "status": "active"
    }

@router.get("/ai/models/{provider}")
async def get_provider_models(provider: str):
    """Get models for specific provider"""
    if provider not in AI_MODELS:
        raise HTTPException(status_code=404, detail=f"Provider {provider} not found")
    
    return {
        "provider": provider,
        "models": AI_MODELS[provider]["models"],
        "default": AI_MODELS[provider]["default"]
    }

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    """Basic chat endpoint"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        # Use memory manager for chat operations
        with memory_manager.memory_context("chat_endpoint"):
            response = await ai_orchestrator.process_chat(
                message=request.message,
                model=request.model,
                context=request.context,
                barbershop_id=request.barbershop_id
            )
            
            return ChatResponse(
                response=response.get("response", ""),
                model_used=response.get("model_used", request.model),
                token_count=response.get("token_count"),
                cost=response.get("cost")
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@router.post("/chat/unified")
async def unified_chat(request: UnifiedChatRequest, current_user: dict = Depends(get_current_user)):
    """Unified chat endpoint with enhanced context"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        with memory_manager.memory_context("unified_chat"):
            response = await ai_orchestrator.unified_chat(
                user_message=request.user_message,
                context=request.context,
                barbershop_id=request.barbershop_id,
                user_id=request.user_id,
                conversation_id=request.conversation_id
            )
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unified chat failed: {str(e)}")

@router.post("/ai/enhanced-chat")
async def enhanced_chat(request: EnhancedChatRequest, current_user: dict = Depends(get_current_user)):
    """Enhanced chat with advanced parameters"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        with memory_manager.memory_context("enhanced_chat"):
            response = await ai_orchestrator.enhanced_chat(
                message=request.message,
                context=request.context,
                barbershop_id=request.barbershop_id,
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
            return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Enhanced chat failed: {str(e)}")

@router.get("/ai/provider-status")
async def get_provider_status():
    """Get status of AI providers"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable", "providers": []}
    
    try:
        status = await ai_orchestrator.get_provider_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get provider status: {str(e)}")

@router.get("/ai/agents/status")
async def get_agents_status():
    """Get status of AI agents"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable", "agents": []}
    
    try:
        status = await ai_orchestrator.get_agents_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agents status: {str(e)}")

@router.post("/ai/agents/batch-process")
async def batch_process_agents(requests: List[Dict[str, Any]], current_user: dict = Depends(get_current_user)):
    """Process multiple AI requests in batch"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        with memory_manager.memory_context("batch_process"):
            results = await ai_orchestrator.batch_process(requests)
            return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")

@router.get("/ai/agents/parallel-metrics")
async def get_parallel_metrics():
    """Get parallel processing metrics"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        metrics = await ai_orchestrator.get_parallel_metrics()
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get parallel metrics: {str(e)}")

@router.get("/ai/cache/performance")
async def get_cache_performance():
    """Get AI cache performance metrics"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        performance = await ai_orchestrator.get_cache_performance()
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache performance: {str(e)}")

@router.post("/ai/cache/clear")
async def clear_ai_cache(current_user: dict = Depends(get_current_user)):
    """Clear AI cache"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        result = await ai_orchestrator.clear_cache()
        return {"status": "cleared", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

@router.post("/ai/cache/warm")
async def warm_ai_cache(current_user: dict = Depends(get_current_user)):
    """Warm up AI cache"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        result = await ai_orchestrator.warm_cache()
        return {"status": "warming", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to warm cache: {str(e)}")

@router.get("/ai/cache/health")
async def get_cache_health():
    """Get AI cache health status"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        health = await ai_orchestrator.get_cache_health()
        return health
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get cache health: {str(e)}")

@router.get("/ai/insights")
async def get_ai_insights():
    """Get AI insights"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable", "insights": []}
    
    try:
        insights = await ai_orchestrator.get_insights()
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get insights: {str(e)}")

@router.post("/ai/insights/generate")
async def generate_ai_insights(request: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Generate new AI insights"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        with memory_manager.memory_context("generate_insights"):
            insights = await ai_orchestrator.generate_insights(request)
            return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")

@router.delete("/ai/insights/{insight_id}")
async def delete_ai_insight(insight_id: str, current_user: dict = Depends(get_current_user)):
    """Delete AI insight"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        result = await ai_orchestrator.delete_insight(insight_id)
        return {"status": "deleted", "insight_id": insight_id, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete insight: {str(e)}")

@router.get("/ai/predictive")
async def get_predictive_analytics():
    """Get predictive analytics"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable", "predictions": []}
    
    try:
        predictions = await ai_orchestrator.get_predictive_analytics()
        return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get predictions: {str(e)}")

@router.post("/ai/predictive/generate")
async def generate_predictive_analytics(request: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Generate predictive analytics"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        with memory_manager.memory_context("predictive_analytics"):
            predictions = await ai_orchestrator.generate_predictive_analytics(request)
            return predictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(e)}")

@router.get("/ai/predictive/dashboard/{barbershop_id}")
async def get_predictive_dashboard(barbershop_id: str):
    """Get predictive analytics dashboard for barbershop"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        dashboard = await ai_orchestrator.get_predictive_dashboard(barbershop_id)
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get predictive dashboard: {str(e)}")

@router.get("/ai/performance/realtime")
async def get_realtime_performance():
    """Get real-time AI performance metrics"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        performance = await ai_orchestrator.get_realtime_performance()
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get real-time performance: {str(e)}")

@router.get("/ai/performance/report")
async def get_performance_report():
    """Get AI performance report"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        report = await ai_orchestrator.get_performance_report()
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance report: {str(e)}")

@router.get("/ai/performance/status")
async def get_performance_status():
    """Get AI performance status"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        status = await ai_orchestrator.get_performance_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance status: {str(e)}")

@router.post("/ai/performance/record")
async def record_performance_metric(metric: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    """Record AI performance metric"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        raise HTTPException(status_code=503, detail="AI orchestrator not available")
    
    try:
        result = await ai_orchestrator.record_performance_metric(metric)
        return {"status": "recorded", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record performance metric: {str(e)}")

@router.get("/ai/performance/component/{component_name}")
async def get_component_performance(component_name: str):
    """Get performance metrics for specific AI component"""
    if not AI_ORCHESTRATOR_AVAILABLE:
        return {"status": "unavailable"}
    
    try:
        performance = await ai_orchestrator.get_component_performance(component_name)
        return performance
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get component performance: {str(e)}")