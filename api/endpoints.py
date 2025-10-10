#!/usr/bin/env python3
"""
Additional API Endpoints for 6FB AI Agent System
Advanced endpoints for batch processing, agent management, and system configuration
"""

import asyncio
import uuid
import time
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Depends
from fastapi.responses import JSONResponse

from .schemas import (
    BatchRequest, BatchResponse, AgentResponse, ErrorResponse,
    AgentConfig, SystemConfig, AgentType,
    UsageAnalytics
)

# Import services
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# This would typically be imported from main.py
# For now, we'll create a dependency injection pattern
from .main import get_orchestrator, get_knowledge_service, get_agent, app_state, handle_agent_error, update_analytics

# Create router
router = APIRouter()


# ===== BATCH PROCESSING ENDPOINTS =====

@router.post("/batch/process", response_model=BatchResponse)
async def process_batch_requests(
    batch_request: BatchRequest,
    background_tasks: BackgroundTasks
):
    """Process multiple agent requests in batch"""
    batch_id = str(uuid.uuid4())
    start_time = time.time()
    
    try:
        results = []
        successful_count = 0
        failed_count = 0
        
        if batch_request.parallel:
            # Process requests in parallel
            tasks = []
            for req in batch_request.requests:
                agent = get_agent(req.agent_type)
                task = asyncio.create_task(
                    agent.execute(
                        message=req.message,
                        context=req.context
                    )
                )
                tasks.append((task, req))
            
            # Wait for all tasks to complete
            for task, req in tasks:
                try:
                    result = await task
                    if result.success:
                        successful_count += 1
                        results.append(AgentResponse(
                            message="Batch request processed successfully",
                            agent_type=req.agent_type,
                            result=result.result,
                            confidence=result.confidence,
                            execution_time=result.execution_time,
                            tokens_used=result.tokens_used,
                            knowledge_used=0,
                            metadata=result.metadata,
                            request_id=str(uuid.uuid4())
                        ))
                    else:
                        failed_count += 1
                        results.append(await handle_agent_error(
                            Exception(result.error), 
                            req.agent_type.value
                        ))
                        
                        if batch_request.fail_fast:
                            break
                            
                except Exception as e:
                    failed_count += 1
                    results.append(await handle_agent_error(e, req.agent_type.value))
                    
                    if batch_request.fail_fast:
                        break
        else:
            # Process requests sequentially
            for req in batch_request.requests:
                try:
                    agent = get_agent(req.agent_type)
                    result = await agent.execute(
                        message=req.message,
                        context=req.context
                    )
                    
                    if result.success:
                        successful_count += 1
                        results.append(AgentResponse(
                            message="Batch request processed successfully",
                            agent_type=req.agent_type,
                            result=result.result,
                            confidence=result.confidence,
                            execution_time=result.execution_time,
                            tokens_used=result.tokens_used,
                            knowledge_used=0,
                            metadata=result.metadata,
                            request_id=str(uuid.uuid4())
                        ))
                    else:
                        failed_count += 1
                        results.append(await handle_agent_error(
                            Exception(result.error), 
                            req.agent_type.value
                        ))
                        
                        if batch_request.fail_fast:
                            break
                            
                except Exception as e:
                    failed_count += 1
                    results.append(await handle_agent_error(e, req.agent_type.value))
                    
                    if batch_request.fail_fast:
                        break
        
        total_execution_time = time.time() - start_time
        
        # Update analytics
        background_tasks.add_task(update_analytics, {
            "agent_type": "batch_processing",
            "user_id": batch_request.user_id,
            "request_type": "batch"
        })
        
        return BatchResponse(
            success=failed_count == 0,
            message=f"Batch processing completed: {successful_count} successful, {failed_count} failed",
            results=results,
            total_requests=len(batch_request.requests),
            successful_requests=successful_count,
            failed_requests=failed_count,
            total_execution_time=total_execution_time,
            batch_id=batch_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch processing failed: {str(e)}")


@router.get("/batch/{batch_id}/status")
async def get_batch_status(batch_id: str):
    """Get status of a batch processing job"""
    # This would typically query a database or cache
    # For now, return a simple status
    return JSONResponse(content={
        "batch_id": batch_id,
        "status": "completed",  # or "processing", "failed"
        "message": "Batch status retrieved successfully"
    })


# ===== AGENT MANAGEMENT ENDPOINTS =====

@router.get("/agents", response_model=List[Dict[str, Any]])
async def list_agents():
    """List all available agents with their capabilities"""
    try:
        agents_info = []
        
        for agent_type, agent in app_state["agents"].items():
            status = agent.get_status()
            capabilities = agent.get_capabilities()
            
            agents_info.append({
                "agent_type": agent_type.value,
                "agent_name": agent.agent_name,
                "status": status.get("status", "unknown"),
                "capabilities": capabilities,
                "specializations": getattr(agent, 'specializations', []),
                "last_activity": status.get("last_activity"),
                "task_count": status.get("task_count", 0),
                "error_count": status.get("error_count", 0),
                "error_rate": status.get("error_rate", 0.0)
            })
        
        return agents_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")


@router.get("/agents/{agent_type}/capabilities")
async def get_agent_capabilities(agent_type: AgentType):
    """Get detailed capabilities of a specific agent"""
    try:
        agent = get_agent(agent_type)
        capabilities = agent.get_capabilities()
        specializations = getattr(agent, 'specializations', [])
        
        return JSONResponse(content={
            "agent_type": agent_type.value,
            "agent_name": agent.agent_name,
            "capabilities": capabilities,
            "specializations": specializations,
            "description": agent.__doc__ or "No description available"
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent capabilities: {str(e)}")


@router.get("/agents/{agent_type}/status")
async def get_agent_status(agent_type: AgentType):
    """Get detailed status of a specific agent"""
    try:
        agent = get_agent(agent_type)
        status = agent.get_status()
        health = await agent.health_check()
        
        return JSONResponse(content={
            "agent_type": agent_type.value,
            "agent_name": agent.agent_name,
            "status": status,
            "health": health,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent status: {str(e)}")


@router.post("/agents/{agent_type}/reset")
async def reset_agent(agent_type: AgentType):
    """Reset an agent's state and error counters"""
    try:
        agent = get_agent(agent_type)
        await agent.reset()
        
        return JSONResponse(content={
            "message": f"Agent {agent_type.value} reset successfully",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset agent: {str(e)}")


# ===== ANALYTICS AND MONITORING ENDPOINTS =====

@router.get("/analytics/detailed")
async def detailed_analytics(
    period: str = Query("24h", description="Analytics period: 1h, 24h, 7d, 30d"),
    agent_type: Optional[AgentType] = Query(None, description="Filter by specific agent")
):
    """Get detailed analytics with optional filtering"""
    try:
        # This would typically query a database with time-series data
        # For now, return enhanced analytics from in-memory data
        
        analytics_data = {
            "period": period,
            "generated_at": datetime.now().isoformat(),
            "system_overview": {
                "total_requests": app_state["request_count"],
                "error_rate": app_state["error_count"] / max(1, app_state["request_count"]),
                "uptime_hours": (time.time() - app_state["start_time"]) / 3600,
                "active_agents": len(app_state["agents"])
            },
            "agent_performance": {},
            "knowledge_usage": {
                "total_documents": 0,
                "search_queries": 0,
                "cache_hit_rate": 0.0
            },
            "peak_usage": {
                "hourly_distribution": app_state["analytics"]["peak_hours"],
                "busiest_hour": app_state["analytics"]["peak_hours"].index(max(app_state["analytics"]["peak_hours"])),
                "agent_usage": app_state["analytics"]["agent_usage"]
            }
        }
        
        # Get agent-specific performance data
        for agent_type_key, agent in app_state["agents"].items():
            status = agent.get_status()
            analytics_data["agent_performance"][agent_type_key.value] = {
                "total_tasks": status.get("task_count", 0),
                "error_count": status.get("error_count", 0),
                "success_rate": 1.0 - (status.get("error_count", 0) / max(1, status.get("task_count", 1))),
                "last_activity": status.get("last_activity"),
                "status": status.get("status", "unknown")
            }
        
        # Get knowledge base stats
        try:
            kb_stats = await app_state["knowledge_service"].get_knowledge_stats()
            analytics_data["knowledge_usage"]["total_documents"] = kb_stats.get("total_documents", 0)
        except Exception:
            pass
        
        return JSONResponse(content=analytics_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get detailed analytics: {str(e)}")


@router.get("/analytics/performance")
async def performance_metrics():
    """Get system performance metrics"""
    try:
        # Calculate performance metrics
        uptime = time.time() - app_state["start_time"]
        requests_per_second = app_state["request_count"] / max(1, uptime)
        
        metrics = {
            "uptime_seconds": uptime,
            "total_requests": app_state["request_count"],
            "requests_per_second": requests_per_second,
            "error_rate": app_state["error_count"] / max(1, app_state["request_count"]),
            "memory_usage": {
                "agents_loaded": len(app_state["agents"]),
                "cache_entries": len(getattr(app_state.get("knowledge_service"), "_memory_cache", {})),
            },
            "service_health": {
                "orchestrator": app_state["orchestrator"] is not None,
                "knowledge_service": app_state["knowledge_service"] is not None,
                "agents_healthy": sum(1 for agent in app_state["agents"].values() if agent.status.value != "error")
            }
        }
        
        return JSONResponse(content=metrics)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get performance metrics: {str(e)}")


# ===== SYSTEM CONFIGURATION ENDPOINTS =====

@router.get("/config/agents")
async def get_agent_configurations():
    """Get current agent configurations"""
    try:
        configs = []
        
        for agent_type, agent in app_state["agents"].items():
            config = getattr(agent, 'config', {})
            configs.append({
                "agent_type": agent_type.value,
                "enabled": True,  # All loaded agents are enabled
                "model_preference": getattr(agent, 'model_preference', 'openai'),
                "default_model": getattr(agent, 'default_model', 'gpt-4o-mini'),
                "enable_rag": config.get("enable_rag", True),
                "max_knowledge_results": config.get("max_knowledge_results", 5),
                "knowledge_relevance_threshold": config.get("knowledge_relevance_threshold", 0.3),
                "enable_caching": config.get("enable_caching", True),
                "cache_ttl": config.get("cache_ttl", 3600)
            })
        
        return JSONResponse(content={"agents": configs})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get agent configurations: {str(e)}")


@router.post("/config/agents/{agent_type}")
async def update_agent_configuration(
    agent_type: AgentType,
    config_updates: Dict[str, Any]
):
    """Update configuration for a specific agent"""
    try:
        agent = get_agent(agent_type)
        
        # Update agent configuration
        if hasattr(agent, 'configure'):
            agent.configure(config_updates)
        
        return JSONResponse(content={
            "message": f"Agent {agent_type.value} configuration updated successfully",
            "updates": config_updates,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agent configuration: {str(e)}")


# ===== DEBUGGING AND DEVELOPMENT ENDPOINTS =====

@router.get("/debug/memory")
async def debug_memory_usage():
    """Get memory usage information for debugging"""
    try:
        import sys
        import gc
        
        memory_info = {
            "python_objects": len(gc.get_objects()),
            "app_state_size": sys.getsizeof(app_state),
            "agents_loaded": len(app_state["agents"]),
            "analytics_data": {
                "unique_users": len(app_state["analytics"]["unique_users"]),
                "agent_usage_entries": len(app_state["analytics"]["agent_usage"]),
                "peak_hours_data": len(app_state["analytics"]["peak_hours"])
            }
        }
        
        # Get agent-specific memory info
        for agent_type, agent in app_state["agents"].items():
            memory_info[f"agent_{agent_type.value}_size"] = sys.getsizeof(agent)
        
        return JSONResponse(content=memory_info)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get memory usage: {str(e)}")


@router.post("/debug/clear-analytics")
async def clear_analytics_data():
    """Clear analytics data (development/testing only)"""
    try:
        app_state["analytics"] = {
            "daily_requests": 0,
            "unique_users": set(),
            "agent_usage": {},
            "peak_hours": [0] * 24
        }
        app_state["request_count"] = 0
        app_state["error_count"] = 0
        
        return JSONResponse(content={
            "message": "Analytics data cleared successfully",
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear analytics: {str(e)}")


# ===== EXPORT THE ROUTER =====

# This router can be included in the main FastAPI app
def get_router():
    """Get the additional endpoints router"""
    return router