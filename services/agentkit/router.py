"""
AgentKit FastAPI Router

Provides REST API endpoints for agent management and querying.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import logging

from .admin_api import (
    handle_list_agents,
    handle_get_agent,
    handle_update_agent,
    handle_get_available_tools
)

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class AgentUpdateRequest(BaseModel):
    """Request model for updating agent configuration"""
    instructions: Optional[str] = None
    handoff_description: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    tools: Optional[List[str]] = None
    handoffs: Optional[List[str]] = None
    enabled: Optional[bool] = None


class AgentQueryRequest(BaseModel):
    """Request model for querying an agent"""
    query: str
    agent_name: Optional[str] = None
    barbershop_id: str
    user_context: Optional[Dict[str, Any]] = None


# ============================================================================
# AGENT MANAGEMENT ENDPOINTS
# ============================================================================

@router.get("/list")
async def list_agents():
    """
    List all available agents with their configurations.

    Returns:
        List of agent configurations with stats
    """
    return await handle_list_agents()


@router.get("/{agent_name}")
async def get_agent(agent_name: str):
    """
    Get detailed configuration for a specific agent.

    Args:
        agent_name: Name of the agent to retrieve

    Returns:
        Agent configuration details
    """
    result = await handle_get_agent(agent_name)

    if not result.get('success'):
        raise HTTPException(status_code=404, detail=result.get('error'))

    return result


@router.put("/{agent_name}/update")
async def update_agent(agent_name: str, updates: AgentUpdateRequest):
    """
    Update agent configuration.

    Args:
        agent_name: Name of the agent to update
        updates: Configuration updates

    Returns:
        Updated agent configuration
    """
    update_dict = updates.dict(exclude_none=True)
    result = await handle_update_agent(agent_name, update_dict)

    if not result.get('success'):
        raise HTTPException(status_code=400, detail=result.get('error'))

    return result


@router.get("/tools/available")
async def get_tools():
    """
    Get list of all available database tools.

    Returns:
        List of tool names and descriptions
    """
    return await handle_get_available_tools()


# ============================================================================
# AGENT QUERY ENDPOINT (placeholder - implement with actual AgentKit)
# ============================================================================

@router.post("/query")
async def query_agent(request: AgentQueryRequest):
    """
    Send a query to an agent and get a response.

    This endpoint would integrate with the actual AgentKit implementation
    to route queries to the appropriate agent and return responses.

    Args:
        request: Query request with agent name and context

    Returns:
        Agent response with metadata
    """
    # TODO: Implement actual agent query logic with AgentKit
    # This would involve:
    # 1. Loading the agent configuration
    # 2. Initializing the agent with tools
    # 3. Processing the query
    # 4. Returning the response with metadata

    return {
        'success': True,
        'response': f"Query received: {request.query}",
        'agent_name': request.agent_name or 'master_triage_agent',
        'message': 'Agent query endpoint - implementation pending',
        'note': 'This endpoint will be fully implemented with AgentKit integration'
    }


# Export router
__all__ = ['router']
