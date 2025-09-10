#!/usr/bin/env python3
"""
6FB AI Agent System - FastAPI Web Server
Provides REST API endpoints for the multi-agent barbershop business intelligence system
"""

import asyncio
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Any, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# Import schemas and models
from .schemas import (
    AgentRequest, AgentResponse, ErrorResponse,
    MultiAgentRequest, OrchestratorResponse,
    KnowledgeQuery, KnowledgeResponse,
    HealthResponse, SystemStats, UsageAnalytics,
    BatchRequest, BatchResponse,
    UnifiedChatRequest, UnifiedChatResponse,
    AgentType, TaskPriority, RequestType
)

# Import services
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

try:
    from services.master_orchestrator import MasterOrchestrator
    ORCHESTRATOR_AVAILABLE = True
except ImportError:
    ORCHESTRATOR_AVAILABLE = False
    MasterOrchestrator = None

try:
    from services.vector_knowledge_service import VectorKnowledgeService
    KNOWLEDGE_SERVICE_AVAILABLE = True
except ImportError:
    KNOWLEDGE_SERVICE_AVAILABLE = False
    VectorKnowledgeService = None

try:
    from services.agents.master_coach_agent import MasterCoachAgent
    from services.agents.technical_operations_agent import TechnicalOperationsAgent
    from services.agents.customer_success_agent import CustomerSuccessAgent
    from services.agents.marketing_agent import MarketingAgent
    from services.agents.financial_agent import FinancialAgent
    AGENTS_AVAILABLE = True
except ImportError:
    AGENTS_AVAILABLE = False
    MasterCoachAgent = TechnicalOperationsAgent = CustomerSuccessAgent = MarketingAgent = FinancialAgent = None

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global state
app_state = {
    "start_time": time.time(),
    "request_count": 0,
    "error_count": 0,
    "orchestrator": None,
    "knowledge_service": None,
    "agents": {},
    "analytics": {
        "daily_requests": 0,
        "unique_users": set(),
        "agent_usage": {},
        "peak_hours": [0] * 24
    }
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    logger.info("🚀 Starting 6FB AI Agent System API Server...")
    
    # Initialize services
    try:
        # Initialize orchestrator
        if ORCHESTRATOR_AVAILABLE and MasterOrchestrator:
            app_state["orchestrator"] = MasterOrchestrator()
            logger.info("✅ Master Orchestrator initialized")
        else:
            logger.warning("⚠️  Master Orchestrator not available")
        
        # Initialize knowledge service
        if KNOWLEDGE_SERVICE_AVAILABLE and VectorKnowledgeService:
            app_state["knowledge_service"] = VectorKnowledgeService()
            logger.info("✅ Vector Knowledge Service initialized")
        else:
            logger.warning("⚠️  Vector Knowledge Service not available")
        
        # Initialize individual agents
        agents = {}
        if AGENTS_AVAILABLE:
            if MasterCoachAgent:
                agents[AgentType.MASTER_COACH] = MasterCoachAgent()
            if TechnicalOperationsAgent:
                agents[AgentType.TECHNICAL_OPERATIONS] = TechnicalOperationsAgent()
            if CustomerSuccessAgent:
                agents[AgentType.CUSTOMER_SUCCESS] = CustomerSuccessAgent()
            if MarketingAgent:
                agents[AgentType.MARKETING] = MarketingAgent()
            if FinancialAgent:
                agents[AgentType.FINANCIAL] = FinancialAgent()
        
        app_state["agents"] = agents
        logger.info(f"✅ Initialized {len(agents)} specialized agents")
        
        # Verify system health
        health_checks = []
        for agent_type, agent in agents.items():
            try:
                health = await agent.health_check()
                health_checks.append(health["healthy"])
                logger.info(f"   {agent.agent_name}: {'✅ Healthy' if health['healthy'] else '⚠️ Degraded'}")
            except Exception as e:
                logger.warning(f"   {agent_type}: ❌ Health check failed - {e}")
                health_checks.append(False)
        
        healthy_agents = sum(health_checks)
        logger.info(f"🏥 System Health: {healthy_agents}/{len(agents)} agents healthy")
        
        # Knowledge base stats
        try:
            stats = await app_state["knowledge_service"].get_knowledge_stats()
            logger.info(f"📚 Knowledge Base: {stats.get('total_documents', 0)} documents loaded")
        except Exception as e:
            logger.warning(f"📚 Knowledge Base: Error getting stats - {e}")
        
        logger.info("🎯 6FB AI Agent System API Server ready!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("🔄 Shutting down 6FB AI Agent System API Server...")


# Create FastAPI app
app = FastAPI(
    title="6FB AI Agent System API",
    description="REST API for the 6FB barbershop business intelligence multi-agent system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add middleware

# Configure CORS origins based on environment
allowed_origins = [
    "http://localhost:9999",  # Frontend development
    "http://localhost:3000",  # Next.js default
    "https://6fb-ai-agent-system.vercel.app",  # Production domain (example)
]

# Add environment-specific origins
if os.getenv("CORS_ORIGINS"):
    additional_origins = os.getenv("CORS_ORIGINS").split(",")
    allowed_origins.extend([origin.strip() for origin in additional_origins])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# ===== UTILITY FUNCTIONS =====

def get_orchestrator() -> MasterOrchestrator:
    """Get orchestrator instance"""
    if not app_state["orchestrator"]:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    return app_state["orchestrator"]


def get_knowledge_service() -> VectorKnowledgeService:
    """Get knowledge service instance"""
    if not app_state["knowledge_service"]:
        raise HTTPException(status_code=503, detail="Knowledge service not initialized")
    return app_state["knowledge_service"]


def get_agent(agent_type: AgentType):
    """Get specific agent instance"""
    agent = app_state["agents"].get(agent_type)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_type} not found")
    return agent


def update_analytics(request_data: Dict[str, Any]):
    """Update analytics data"""
    try:
        app_state["request_count"] += 1
        app_state["analytics"]["daily_requests"] += 1
        
        # Track user
        if request_data.get("user_id"):
            app_state["analytics"]["unique_users"].add(request_data["user_id"])
        
        # Track agent usage
        agent_type = request_data.get("agent_type")
        if agent_type:
            usage = app_state["analytics"]["agent_usage"]
            usage[agent_type] = usage.get(agent_type, 0) + 1
        
        # Track peak hours
        current_hour = datetime.now().hour
        app_state["analytics"]["peak_hours"][current_hour] += 1
        
    except Exception as e:
        logger.warning(f"Analytics update failed: {e}")


async def handle_agent_error(e: Exception, agent_type: str) -> ErrorResponse:
    """Handle agent execution errors"""
    app_state["error_count"] += 1
    logger.error(f"Agent {agent_type} error: {e}")
    
    return ErrorResponse(
        message=f"Agent execution failed: {str(e)}",
        error_code="AGENT_EXECUTION_ERROR",
        details={"agent_type": agent_type, "error": str(e)}
    )


# ===== HEALTH AND STATUS ENDPOINTS =====

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """System health check endpoint"""
    try:
        services = []
        overall_healthy = True
        
        # Check orchestrator
        if app_state["orchestrator"]:
            try:
                orchestrator_health = await app_state["orchestrator"].health_check()
                is_healthy = orchestrator_health.get("status") == "healthy"
                services.append({
                    "service_name": "orchestrator",
                    "status": "healthy" if is_healthy else "unhealthy",
                    "last_check": datetime.now(),
                    "details": orchestrator_health
                })
                if not is_healthy:
                    overall_healthy = False
            except Exception as e:
                logger.error(f"Orchestrator health check failed: {e}")
                services.append({
                    "service_name": "orchestrator",
                    "status": "unhealthy",
                    "last_check": datetime.now(),
                    "details": {"error": str(e)}
                })
                overall_healthy = False
        
        # Check knowledge service
        if app_state["knowledge_service"]:
            try:
                stats = await app_state["knowledge_service"].get_knowledge_stats()
                services.append({
                    "service_name": "knowledge_service",
                    "status": "healthy",
                    "last_check": datetime.now(),
                    "details": stats
                })
            except Exception as e:
                services.append({
                    "service_name": "knowledge_service",
                    "status": "unhealthy",
                    "last_check": datetime.now(),
                    "details": {"error": str(e)}
                })
                overall_healthy = False
        
        # Check individual agents
        for agent_type, agent in app_state["agents"].items():
            try:
                agent_health = await agent.health_check()
                services.append({
                    "service_name": f"agent_{agent_type.value}",
                    "status": "healthy" if agent_health.get("healthy", False) else "degraded",
                    "last_check": datetime.now(),
                    "details": agent_health
                })
                if not agent_health.get("healthy", False):
                    overall_healthy = False
            except Exception as e:
                services.append({
                    "service_name": f"agent_{agent_type.value}",
                    "status": "unhealthy",
                    "last_check": datetime.now(),
                    "details": {"error": str(e)}
                })
                overall_healthy = False
        
        return HealthResponse(
            message="Health check completed",
            overall_status="healthy" if overall_healthy else "degraded",
            services=services,
            system_info={
                "uptime": time.time() - app_state["start_time"],
                "total_requests": app_state["request_count"],
                "error_count": app_state["error_count"],
                "active_agents": len(app_state["agents"])
            }
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@app.get("/status", response_model=SystemStats)
async def system_status():
    """Get detailed system statistics"""
    try:
        agent_stats = []
        
        for agent_type, agent in app_state["agents"].items():
            try:
                status_info = agent.get_status()
                stats = {
                    "agent_type": agent_type,
                    "total_requests": status_info.get("task_count", 0),
                    "successful_requests": max(0, status_info.get("task_count", 0) - status_info.get("error_count", 0)),
                    "failed_requests": status_info.get("error_count", 0),
                    "average_response_time": 0.0,  # Would need to track this
                    "average_confidence": 0.5,  # Would need to track this
                    "total_tokens_used": 0,  # Would need to track this
                    "last_activity": datetime.fromisoformat(status_info.get("last_activity", datetime.now().isoformat())),
                    "status": status_info.get("status", "unknown")
                }
                agent_stats.append(stats)
            except Exception as e:
                logger.warning(f"Failed to get stats for {agent_type}: {e}")
        
        # Knowledge service stats
        knowledge_docs = 0
        try:
            kb_stats = await app_state["knowledge_service"].get_knowledge_stats()
            knowledge_docs = kb_stats.get("total_documents", 0)
        except Exception as e:
            logger.warning(f"Failed to get knowledge stats: {e}")
        
        return SystemStats(
            total_requests=app_state["request_count"],
            total_agents=len(app_state["agents"]),
            uptime_seconds=time.time() - app_state["start_time"],
            knowledge_documents=knowledge_docs,
            cache_hit_rate=0.0,  # Would need to implement cache metrics
            average_response_time=0.0,  # Would need to track this
            agents=agent_stats
        )
        
    except Exception as e:
        logger.error(f"System status failed: {e}")
        raise HTTPException(status_code=500, detail=f"System status failed: {str(e)}")


# ===== CORE AGENT ENDPOINTS =====

@app.post("/agents/{agent_type}/chat", response_model=AgentResponse)
async def chat_with_agent(
    agent_type: AgentType,
    request: AgentRequest,
    background_tasks: BackgroundTasks
):
    """Chat with a specific AI agent"""
    try:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Get the specified agent
        agent = get_agent(agent_type)
        
        # Update analytics
        background_tasks.add_task(update_analytics, {
            "agent_type": agent_type.value,
            "user_id": request.user_id,
            "request_type": request.request_type.value
        })
        
        # Execute agent request
        result = await agent.execute(
            message=request.message,
            context=request.context,
            structured_output_model=None if not request.structured_output else True
        )
        
        execution_time = time.time() - start_time
        
        if result.success:
            return AgentResponse(
                message="Agent response generated successfully",
                agent_type=agent_type,
                result=result.result,
                confidence=result.confidence,
                execution_time=execution_time,
                tokens_used=result.tokens_used,
                knowledge_used=len(request.context.get("relevant_knowledge", [])) if request.context else 0,
                metadata=result.metadata,
                request_id=request_id
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {result.error}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat with agent {agent_type} failed: {e}")
        return await handle_agent_error(e, agent_type.value)


@app.post("/ai/unified-chat", response_model=UnifiedChatResponse)
async def unified_chat(
    request: UnifiedChatRequest,
    background_tasks: BackgroundTasks
):
    """Unified chat endpoint that routes to appropriate agent"""
    try:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Determine which agent to use
        agent_type = request.agent or AgentType.MASTER_COACH  # Default to master coach
        
        # Get the specified agent
        agent = get_agent(agent_type)
        
        # Update analytics
        background_tasks.add_task(update_analytics, {
            "agent_type": agent_type.value,
            "user_id": request.user_id,
            "request_type": "unified_chat"
        })
        
        # Execute agent request
        result = await agent.execute(
            message=request.message,
            context=request.context or {},
            structured_output_model=None
        )
        
        execution_time = time.time() - start_time
        
        if result.success:
            return UnifiedChatResponse(
                message="Unified chat response generated successfully",
                agent_used=agent_type,
                response=str(result.result),
                confidence=result.confidence,
                execution_time=execution_time,
                request_id=request_id
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Agent execution failed: {result.error}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unified chat failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Unified chat processing failed: {str(e)}"
        )


@app.post("/orchestrator/process", response_model=OrchestratorResponse)
async def process_with_orchestrator(
    request: MultiAgentRequest,
    background_tasks: BackgroundTasks
):
    """Process request using the master orchestrator"""
    try:
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Get orchestrator
        orchestrator = get_orchestrator()
        
        # Update analytics
        background_tasks.add_task(update_analytics, {
            "agent_type": "orchestrator",
            "user_id": request.user_id,
            "request_type": "orchestration"
        })
        
        # Process with orchestrator
        result = await orchestrator.process_request(
            user_message=request.message,
            context=request.context or {},
            max_agents=request.max_agents,
            confidence_threshold=request.confidence_threshold
        )
        
        execution_time = time.time() - start_time
        
        # Extract agent results
        agent_results = []
        total_tokens = 0
        total_knowledge = 0
        
        if result.get("agent_results"):
            for agent_result in result["agent_results"]:
                agent_results.append({
                    "agent_type": agent_result.get("agent_type", "unknown"),
                    "result": agent_result.get("result", ""),
                    "confidence": agent_result.get("confidence", 0.0),
                    "execution_time": agent_result.get("execution_time", 0.0),
                    "tokens_used": agent_result.get("tokens_used", 0),
                    "knowledge_used": 0  # Would need to track this
                })
                total_tokens += agent_result.get("tokens_used", 0)
        
        return OrchestratorResponse(
            message="Orchestrator processing completed successfully",
            primary_result=result.get("primary_response", ""),
            agent_results=agent_results,
            routing_decision=result.get("routing_decision", {}),
            total_execution_time=execution_time,
            total_tokens_used=total_tokens,
            confidence=result.get("confidence", 0.0),
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"Orchestrator processing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Orchestrator processing failed: {str(e)}")


# ===== KNOWLEDGE BASE ENDPOINTS =====

@app.post("/knowledge/search", response_model=KnowledgeResponse)
async def search_knowledge(query: KnowledgeQuery):
    """Search the knowledge base"""
    try:
        start_time = time.time()
        knowledge_service = get_knowledge_service()
        
        # Perform search
        results = await knowledge_service.search_knowledge(
            query=query.query,
            max_results=query.max_results,
            min_relevance=query.min_relevance
        )
        
        search_time = time.time() - start_time
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "title": result.document.title,
                "content": result.document.content,
                "knowledge_type": result.document.knowledge_type.value if hasattr(result.document.knowledge_type, 'value') else str(result.document.knowledge_type),
                "source": result.document.source,
                "relevance_score": result.relevance_score,
                "metadata": result.document.metadata
            })
        
        return KnowledgeResponse(
            message="Knowledge search completed successfully",
            query=query.query,
            results=formatted_results,
            total_results=len(formatted_results),
            search_time=search_time
        )
        
    except Exception as e:
        logger.error(f"Knowledge search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Knowledge search failed: {str(e)}")


@app.get("/knowledge/stats")
async def knowledge_stats():
    """Get knowledge base statistics"""
    try:
        knowledge_service = get_knowledge_service()
        stats = await knowledge_service.get_knowledge_stats()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"Knowledge stats failed: {e}")
        raise HTTPException(status_code=500, detail=f"Knowledge stats failed: {str(e)}")


# ===== ANALYTICS ENDPOINTS =====

@app.get("/analytics/usage", response_model=UsageAnalytics)
async def usage_analytics(period: str = "24h"):
    """Get usage analytics"""
    try:
        # This would typically query a database
        # For now, return current in-memory analytics
        
        popular_agents = []
        for agent_type, count in app_state["analytics"]["agent_usage"].items():
            popular_agents.append({"agent": agent_type, "requests": count})
        popular_agents.sort(key=lambda x: x["requests"], reverse=True)
        
        return UsageAnalytics(
            period=period,
            total_interactions=app_state["analytics"]["daily_requests"],
            unique_users=len(app_state["analytics"]["unique_users"]),
            popular_agents=popular_agents,
            peak_hours=[i for i, count in enumerate(app_state["analytics"]["peak_hours"]) if count > 0],
            request_types={"analysis": 80, "recommendation": 15, "strategy": 5},  # Mock data
            success_rate=max(0.0, 1.0 - (app_state["error_count"] / max(1, app_state["request_count"])))
        )
        
    except Exception as e:
        logger.error(f"Usage analytics failed: {e}")
        raise HTTPException(status_code=500, detail=f"Usage analytics failed: {str(e)}")


# ===== ERROR HANDLERS =====

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    app_state["error_count"] += 1
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
            "timestamp": datetime.now().isoformat()
        }
    )


# ===== MAIN ENTRY POINT =====

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )