"""
AgentKit Query Endpoint (Python/FastAPI)

Feature: SPEC-015 - OpenAI AgentKit Integration

This endpoint handles agent queries using the OpenAI Agents SDK.
It implements the multi-agent system with master triage routing.

Architecture:
1. User query → Master Triage Agent
2. Master Triage routes to specialized agent
3. Specialized agent processes query (with potential handoffs)
4. Response returned with full metadata
"""

import logging
import time
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, List, Any
from uuid import uuid4

import openai
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field, validator

# Import AgentKit components
import sys
import os
import json
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from services.agentkit.agents import (
    AgentName,
    master_triage_agent,
    get_agent_config,
    AGENT_REGISTRY
)
from services.agentkit.config import AgentKitConfig
from services.agentkit.utils import (
    calculate_token_cost,
    format_barbershop_context,
    format_user_context,
    sanitize_pii
)
from services.agentkit.tools import (
    TOOL_SCHEMAS,
    execute_tool
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/v1/agents", tags=["agents"])


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================

class AgentQueryRequest(BaseModel):
    """Request schema for agent queries"""
    message: str = Field(..., min_length=1, max_length=5000, description="User's message")
    context: Optional[Dict[str, Any]] = Field(default={}, description="Additional context")

    @validator('message')
    def validate_message(cls, v):
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()

    class Config:
        schema_extra = {
            "example": {
                "message": "How much commission did I earn last month?",
                "context": {
                    "user_id": "123e4567-e89b-12d3-a456-426614174000",
                    "barbershop_id": "789e4567-e89b-12d3-a456-426614174000",
                    "user_role": "BARBER"
                }
            }
        }


class AgentQueryResponse(BaseModel):
    """Response schema for agent queries"""
    response: str = Field(..., description="Agent's response to the user")
    agent_used: str = Field(..., description="Which agent handled the query")
    handoffs: List[str] = Field(default=[], description="List of agent handoffs")
    session_id: str = Field(..., description="Session identifier for multi-turn conversations")
    trace_id: Optional[str] = Field(None, description="OpenAI trace ID for debugging")
    tokens_used: int = Field(default=0, description="Total tokens consumed")
    input_tokens: int = Field(default=0, description="Input tokens")
    output_tokens: int = Field(default=0, description="Output tokens")
    cost_usd: float = Field(default=0.0, description="Cost in USD")
    response_time_ms: int = Field(..., description="Response time in milliseconds")
    metadata: Dict[str, Any] = Field(default={}, description="Additional metadata")

    class Config:
        schema_extra = {
            "example": {
                "response": "Based on your appointment data, you earned $2,450 in commission last month...",
                "agent_used": "financial_coach_agent",
                "handoffs": ["master_triage_agent", "financial_coach_agent"],
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "trace_id": "trace_abc123",
                "tokens_used": 1250,
                "input_tokens": 250,
                "output_tokens": 1000,
                "cost_usd": 0.0325,
                "response_time_ms": 1842,
                "metadata": {
                    "model": "gpt-4-turbo-preview",
                    "temperature": 0.7
                }
            }
        }


# ============================================================================
# AUTHENTICATION DEPENDENCY
# ============================================================================

async def get_current_user(authorization: Optional[str] = Header(None)) -> str:
    """
    Extract and validate user ID from Authorization header.

    For now, this is a simple implementation that trusts the frontend.
    In production, this should validate JWT tokens or use Supabase auth.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")

    # Extract user ID from Bearer token format
    if authorization.startswith("Bearer "):
        user_id = authorization.replace("Bearer ", "")
        return user_id

    raise HTTPException(status_code=401, detail="Invalid authorization format")


# ============================================================================
# REAL OPENAI API INTEGRATION
# ============================================================================

async def real_agent_query(message: str, context: Dict, agent_config: Dict) -> Dict[str, Any]:
    """
    Process query using real OpenAI API with function calling for database access.

    Flow:
    1. Master Triage Agent routes the query
    2. Specialized agent processes with database tools available
    3. Agent calls tools as needed (function calling)
    4. Tool results returned to agent for final response
    """
    # Initialize OpenAI client
    client = openai.AsyncOpenAI(api_key=AgentKitConfig.OPENAI_API_KEY)

    # Step 1: Use Master Triage Agent to route the query
    triage_prompt = f"""You are the Master Triage Agent for a barbershop management system.

Analyze this user query and determine which specialized agent should handle it:

User Query: "{message}"

Available Agents:
1. financial_coach_agent - Revenue, commissions, pricing, profitability
2. operations_manager_agent - Staff scheduling, inventory, workflow
3. marketing_expert_agent - Social media, Google Reviews, campaigns
4. customer_service_agent - Booking assistance, customer support
5. booking_intelligence_agent - Appointment optimization, schedule gaps
6. analytics_agent - Performance metrics, reports, insights

Respond with ONLY the agent name (e.g., "financial_coach_agent"). No explanation."""

    # Call OpenAI to determine routing
    triage_response = await client.chat.completions.create(
        model="gpt-4-turbo-preview",
        messages=[{"role": "user", "content": triage_prompt}],
        temperature=0.3,
        max_tokens=50
    )

    # Extract agent selection
    selected_agent_name = triage_response.choices[0].message.content.strip().lower()

    # Map to AgentName enum
    agent_mapping = {
        "financial_coach_agent": AgentName.FINANCIAL_COACH,
        "operations_manager_agent": AgentName.OPERATIONS_MANAGER,
        "marketing_expert_agent": AgentName.MARKETING_EXPERT,
        "customer_service_agent": AgentName.CUSTOMER_SERVICE,
        "booking_intelligence_agent": AgentName.BOOKING_INTELLIGENCE,
        "analytics_agent": AgentName.ANALYTICS,
    }

    agent_used = agent_mapping.get(selected_agent_name, AgentName.CUSTOMER_SERVICE)

    # Get specialized agent config
    specialized_agent = get_agent_config(agent_used)

    # Step 2: Build context for specialized agent
    user_role = context.get('user_role', 'SHOP_OWNER')
    barbershop_id = context.get('barbershop_id')
    user_id = context.get('user_id')
    user_name = context.get('user_name', 'User')

    # Get current date for relative date queries like "this month"
    from datetime import datetime, timedelta
    today = datetime.now().date()
    current_month_start = today.replace(day=1).isoformat()
    current_month_end = today.isoformat()

    context_str = f"""
User: {user_name}
User ID: {user_id or 'N/A'}
Role: {user_role}
Barbershop ID: {barbershop_id or 'N/A'}
Current Date: {today.isoformat()}
Current Month: {current_month_start} to {current_month_end}

IMPORTANT: You have access to database tools to query real data. When users ask about:
- Revenue, earnings, income → Use get_revenue_by_date_range
- Appointments, bookings → Use get_appointment_metrics
- Popular services → Use get_top_services
- Commissions → Use get_commission_summary
- Customers → Use get_customer_metrics

For date queries like "this month", "last week", use the current date context above to calculate the correct date range.
"""

    # Step 3: Initialize conversation with system prompt
    messages = [
        {
            "role": "system",
            "content": specialized_agent.get('instructions', '') + f"\n\n{context_str}"
        },
        {
            "role": "user",
            "content": message
        }
    ]

    # Step 4: Call specialized agent with tools enabled
    max_iterations = 5  # Prevent infinite loops
    tool_calls_made = []
    total_input_tokens = triage_response.usage.prompt_tokens
    total_output_tokens = triage_response.usage.completion_tokens

    for iteration in range(max_iterations):
        # Call agent with tools
        agent_response = await client.chat.completions.create(
            model=specialized_agent.get('model', 'gpt-4-turbo-preview'),
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=specialized_agent.get('temperature', 0.7),
            max_tokens=specialized_agent.get('max_tokens', 4000)
        )

        # Track token usage
        total_input_tokens += agent_response.usage.prompt_tokens
        total_output_tokens += agent_response.usage.completion_tokens

        # Get the response message
        response_message = agent_response.choices[0].message

        # Check if agent wants to call tools
        if not response_message.tool_calls:
            # No more tool calls - this is the final response
            response_text = response_message.content
            break

        # Agent wants to call tools
        logger.info(f"Agent requesting {len(response_message.tool_calls)} tool call(s)")

        # Add assistant's response to conversation
        messages.append(response_message)

        # Execute each tool call
        for tool_call in response_message.tool_calls:
            tool_name = tool_call.function.name
            tool_args_str = tool_call.function.arguments

            try:
                # Parse arguments
                tool_args = json.loads(tool_args_str)

                # Add barbershop_id if not provided but available in context
                if 'barbershop_id' in tool_args and not tool_args['barbershop_id']:
                    tool_args['barbershop_id'] = barbershop_id
                elif 'barbershop_id' not in tool_args and barbershop_id:
                    # Some tools require barbershop_id
                    if tool_name in ['get_revenue_by_date_range', 'get_appointment_metrics', 'get_top_services', 'get_customer_metrics']:
                        tool_args['barbershop_id'] = barbershop_id

                # Execute tool
                logger.info(f"Executing tool: {tool_name} with args: {tool_args}")
                tool_result = await execute_tool(tool_name, tool_args)
                tool_calls_made.append({
                    "tool": tool_name,
                    "arguments": tool_args,
                    "result": tool_result
                })

                # Add tool result to conversation
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": json.dumps(tool_result)
                })

                logger.info(f"Tool {tool_name} executed successfully")

            except Exception as e:
                logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
                # Add error to conversation so agent knows tool failed
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": json.dumps({
                        "success": False,
                        "error": str(e)
                    })
                })

        # Continue loop to let agent process tool results
    else:
        # Max iterations reached without final response
        logger.warning("Max tool calling iterations reached")
        response_text = "I apologize, but I encountered an issue processing your request. Please try rephrasing your question."

    # Calculate total token usage
    total_tokens = total_input_tokens + total_output_tokens

    return {
        "response": response_text,
        "agent_used": agent_used.value,
        "handoffs": [AgentName.MASTER_TRIAGE.value, agent_used.value],
        "tokens_used": total_tokens,
        "input_tokens": total_input_tokens,
        "output_tokens": total_output_tokens,
        "tool_calls": tool_calls_made,  # Include tool call details for debugging
    }


# ============================================================================
# MAIN ENDPOINT
# ============================================================================

@router.post("/query", response_model=AgentQueryResponse)
async def query_agent(
    request: AgentQueryRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Process a query through the AgentKit multi-agent system.

    Flow:
    1. Validate configuration
    2. Route to Master Triage Agent
    3. Master Triage routes to specialized agent
    4. Process query with potential handoffs
    5. Return response with full metadata

    Returns:
        AgentQueryResponse with agent's response and metadata
    """
    start_time = time.time()
    session_id = str(uuid4())

    try:
        # Validate AgentKit is enabled
        if not AgentKitConfig.AGENTKIT_ENABLED:
            raise HTTPException(
                status_code=503,
                detail="AgentKit is currently disabled"
            )

        # Validate configuration
        AgentKitConfig.validate()

        # Extract context
        context = request.context
        barbershop_id = context.get('barbershop_id')
        user_role = context.get('user_role', 'UNKNOWN')

        # Log query (sanitize PII)
        sanitized_message = sanitize_pii(request.message)
        logger.info(f"Agent query from user {user_id} (role: {user_role}): {sanitized_message[:100]}")

        # Get master triage agent config
        master_agent = get_agent_config(AgentName.MASTER_TRIAGE)

        if not master_agent:
            raise HTTPException(
                status_code=500,
                detail="Master Triage Agent not configured"
            )

        # Use real OpenAI API integration
        result = await real_agent_query(
            message=request.message,
            context=context,
            agent_config=master_agent
        )

        # Calculate cost
        cost_usd = float(calculate_token_cost(
            input_tokens=result['input_tokens'],
            output_tokens=result['output_tokens'],
            model=master_agent.get('model', 'gpt-4-turbo-preview')
        ))

        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Build response
        response = AgentQueryResponse(
            response=result['response'],
            agent_used=result['agent_used'],
            handoffs=result['handoffs'],
            session_id=session_id,
            trace_id=None,  # Will be populated when using real SDK
            tokens_used=result['tokens_used'],
            input_tokens=result['input_tokens'],
            output_tokens=result['output_tokens'],
            cost_usd=cost_usd,
            response_time_ms=response_time_ms,
            metadata={
                "model": master_agent.get('model'),
                "temperature": master_agent.get('temperature'),
                "user_role": user_role,
                "barbershop_id": barbershop_id,
                "timestamp": datetime.utcnow().isoformat(),
            }
        )

        logger.info(f"Query processed successfully in {response_time_ms}ms")

        return response

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Error processing agent query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process agent query: {str(e)}"
        )


@router.get("/agents")
async def list_agents(user_id: str = Depends(get_current_user)):
    """
    List all available agents and their capabilities.

    Returns:
        List of agent configurations
    """
    try:
        agents = []

        for agent_name, agent_config in AGENT_REGISTRY.items():
            agents.append({
                "name": agent_name.value,
                "description": agent_config.get('handoff_description', ''),
                "model": agent_config.get('model', 'gpt-4-turbo-preview'),
                "is_active": True
            })

        return {
            "agents": agents,
            "count": len(agents),
            "system": "OpenAI AgentKit",
            "version": "1.0.0"
        }

    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to list agents"
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint for AgentKit service.

    Returns:
        Service health status
    """
    try:
        # Validate configuration
        AgentKitConfig.validate()

        return {
            "status": "healthy",
            "service": "AgentKit",
            "enabled": AgentKitConfig.AGENTKIT_ENABLED,
            "agents_configured": len(AGENT_REGISTRY),
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }


# Export router
__all__ = ['router']
