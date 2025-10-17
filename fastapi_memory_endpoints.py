#!/usr/bin/env python3
"""
Memory Management API Endpoints for 6FB AI Agent System
Critical endpoints to fix OAuth callback loops and system failures under memory pressure
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import gc
import asyncio
from services.memory_manager import (
    memory_manager, 
    get_memory_stats,
    register_oauth_session,
    cleanup_oauth_session
)

# Create router for memory management endpoints
memory_router = APIRouter(prefix="/api/v1/memory", tags=["memory"])

class MemoryCleanupRequest(BaseModel):
    force_cleanup: bool = False
    cleanup_oauth_sessions: bool = True
    cleanup_connection_pools: bool = True

class OAuthSessionRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    provider: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}

@memory_router.get("/stats")
async def get_memory_statistics():
    """
    Get comprehensive memory statistics
    CRITICAL: Used to diagnose OAuth callback failures and memory pressure
    """
    try:
        memory_stats = get_memory_stats()
        
        return {
            "success": True,
            "memory": {
                "total_memory_gb": round(memory_stats.total_memory, 2),
                "available_memory_gb": round(memory_stats.available_memory, 2),
                "used_memory_gb": round(memory_stats.used_memory, 2),
                "process_memory_mb": round(memory_stats.process_memory, 2),
                "cpu_percent": round(memory_stats.cpu_percent, 2),
                "memory_pressure": round(memory_stats.memory_pressure, 3),
                "memory_pressure_percent": f"{memory_stats.memory_pressure:.1%}",
                "status": "critical" if memory_stats.memory_pressure > 0.95 else 
                         "high" if memory_stats.memory_pressure > 0.85 else 
                         "normal"
            },
            "oauth_sessions": {
                "total_sessions": len(memory_manager.oauth_sessions),
                "session_ids": list(memory_manager.oauth_sessions.keys())
            },
            "monitoring": {
                "active": memory_manager.monitoring_active,
                "cleanup_interval_seconds": memory_manager.oauth_cleanup_interval,
                "memory_threshold": memory_manager.memory_threshold,
                "critical_threshold": memory_manager.critical_threshold
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get memory statistics: {str(e)}"
        )

@memory_router.post("/cleanup")
async def force_memory_cleanup(request: MemoryCleanupRequest):
    """
    Force memory cleanup to resolve OAuth callback loops
    CRITICAL: Emergency endpoint to fix authentication failures under memory pressure
    """
    try:
        cleanup_results = {}
        
        if request.force_cleanup:
            # Emergency cleanup
            memory_manager.emergency_cleanup()
            cleanup_results["emergency_cleanup"] = "completed"
        else:
            # Regular cleanup
            collected = memory_manager.force_garbage_collection()
            cleanup_results["garbage_collected_objects"] = collected
        
        if request.cleanup_oauth_sessions:
            initial_count = len(memory_manager.oauth_sessions)
            memory_manager.clear_internal_caches()
            final_count = len(memory_manager.oauth_sessions)
            cleanup_results["oauth_sessions_cleaned"] = initial_count - final_count
        
        if request.cleanup_connection_pools:
            memory_manager.cleanup_connection_pools()
            cleanup_results["connection_pools_cleaned"] = "completed"
        
        # Get updated memory stats
        updated_stats = get_memory_stats()
        
        return {
            "success": True,
            "message": "Memory cleanup completed successfully",
            "cleanup_results": cleanup_results,
            "updated_memory": {
                "memory_pressure": round(updated_stats.memory_pressure, 3),
                "memory_pressure_percent": f"{updated_stats.memory_pressure:.1%}",
                "process_memory_mb": round(updated_stats.process_memory, 2)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Memory cleanup failed: {str(e)}"
        )

@memory_router.post("/oauth/register")
async def register_oauth_session_endpoint(request: OAuthSessionRequest):
    """
    Register OAuth session for memory management
    CRITICAL: Prevents OAuth sessions from causing memory leaks
    """
    try:
        session_data = {
            "user_id": request.user_id,
            "provider": request.provider,
            "metadata": request.metadata
        }
        
        register_oauth_session(request.session_id, session_data)
        
        return {
            "success": True,
            "message": f"OAuth session {request.session_id} registered for memory management",
            "total_sessions": len(memory_manager.oauth_sessions)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register OAuth session: {str(e)}"
        )

@memory_router.delete("/oauth/{session_id}")
async def cleanup_oauth_session_endpoint(session_id: str):
    """
    Clean up specific OAuth session
    CRITICAL: Prevents OAuth callback loops by cleaning up stuck sessions
    """
    try:
        if session_id in memory_manager.oauth_sessions:
            cleanup_oauth_session(session_id)
            
            return {
                "success": True,
                "message": f"OAuth session {session_id} cleaned up successfully",
                "remaining_sessions": len(memory_manager.oauth_sessions)
            }
        else:
            return {
                "success": True,
                "message": f"OAuth session {session_id} not found (may have been already cleaned up)",
                "remaining_sessions": len(memory_manager.oauth_sessions)
            }
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup OAuth session: {str(e)}"
        )

@memory_router.get("/oauth/sessions")
async def list_oauth_sessions():
    """
    List all active OAuth sessions for debugging
    CRITICAL: Used to diagnose OAuth callback loop issues
    """
    try:
        sessions = []
        current_time = time.time()
        
        for session_id, session_data in memory_manager.oauth_sessions.items():
            age_seconds = current_time - session_data.get('created_at', current_time)
            
            sessions.append({
                "session_id": session_id,
                "user_id": session_data.get('user_id'),
                "provider": session_data.get('provider'),
                "age_seconds": round(age_seconds, 2),
                "age_minutes": round(age_seconds / 60, 2),
                "is_expired": age_seconds > memory_manager.oauth_cleanup_interval
            })
        
        return {
            "success": True,
            "total_sessions": len(sessions),
            "sessions": sessions,
            "cleanup_interval_seconds": memory_manager.oauth_cleanup_interval
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list OAuth sessions: {str(e)}"
        )

@memory_router.post("/monitor/start")
async def start_memory_monitoring():
    """Start memory monitoring if not already active"""
    try:
        if not memory_manager.monitoring_active:
            memory_manager.start_monitoring()
            message = "Memory monitoring started successfully"
        else:
            message = "Memory monitoring is already active"
        
        return {
            "success": True,
            "message": message,
            "monitoring_active": memory_manager.monitoring_active
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start memory monitoring: {str(e)}"
        )

@memory_router.post("/monitor/stop")
async def stop_memory_monitoring():
    """Stop memory monitoring"""
    try:
        if memory_manager.monitoring_active:
            memory_manager.stop_monitoring()
            message = "Memory monitoring stopped successfully"
        else:
            message = "Memory monitoring is not active"
        
        return {
            "success": True,
            "message": message,
            "monitoring_active": memory_manager.monitoring_active
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop memory monitoring: {str(e)}"
        )

# Import time module that was referenced but not imported
import time