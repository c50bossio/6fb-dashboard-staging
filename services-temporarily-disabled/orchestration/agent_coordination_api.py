#!/usr/bin/env python3
"""
Agent Coordination API for 6FB AI Agent System
Unified interface for coordinating 39 agents (4 business + 35 specialized)
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import logging
import asyncio

# Import system components
from .intelligent_agent_router import route_agent_request, RouteResponse
from .context_manager import get_context_manager, ContextType
from ..auth_service import get_current_user, User
from ..database_service import db_service

logger = logging.getLogger(__name__)

# Create router for agent coordination endpoints
router = APIRouter(prefix="/api/v1/agents", tags=["Agent Coordination"])

class AgentRequest(BaseModel):
    """Unified agent request model"""
    request_type: str = Field(..., description="Type of request (analyze, implement, coordinate, etc.)")
    content: str = Field(..., description="Request content/description") 
    agent_preference: Optional[str] = Field(None, description="Preferred agent ID (optional)")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    business_objective: Optional[str] = Field(None, description="Business objective if applicable")
    priority: str = Field("medium", description="Request priority (low, medium, high, critical)")
    coordination_mode: str = Field("auto", description="Coordination mode (auto, direct, orchestrated)")

class AgentResponse(BaseModel):
    """Unified agent response model"""
    success: bool
    session_id: str
    primary_agent: str
    supporting_agents: List[str] = []
    coordination_workflow: Optional[str] = None
    response: str
    recommendations: List[Dict[str, Any]] = []
    context_preserved: bool = False
    next_suggested_actions: List[str] = []
    confidence: float = 0.95

class CoordinationStatus(BaseModel):
    """Coordination status model"""
    session_id: str
    active_workflow: Optional[str] = None
    current_agent: str
    workflow_stage: str
    progress_percentage: float
    context_summary: Dict[str, Any]
    next_steps: List[str] = []

class AgentListResponse(BaseModel):
    """Agent list response model"""
    total_agents: int
    business_agents: List[Dict[str, Any]]
    orchestration_agents: List[Dict[str, Any]]
    specialized_agents: List[Dict[str, Any]]
    integration_status: str = "active"

# Agent registry for the unified system
UNIFIED_AGENT_REGISTRY = {
    # Tier 1: Business Intelligence Agents (Original 4)
    "master-coach": {
        "name": "🎯 Master Coach",
        "tier": "business",
        "description": "Strategic business guidance and high-level coaching",
        "specialties": ["strategy", "business_coaching", "decision_making"],
        "coordinates_with": ["financial-agent", "growth-agent", "operations-agent"]
    },
    "financial-agent": {
        "name": "💰 Financial Agent", 
        "tier": "business",
        "description": "Revenue optimization and financial analysis",
        "specialties": ["revenue_optimization", "financial_analysis", "pricing"],
        "coordinates_with": ["data-scientist", "performance-engineer"]
    },
    "growth-agent": {
        "name": "📈 Growth Agent",
        "tier": "business", 
        "description": "Business growth and expansion strategies",
        "specialties": ["expansion_planning", "market_analysis", "scaling"],
        "coordinates_with": ["ux-designer", "system-architect"]
    },
    "operations-agent": {
        "name": "⚙️ Operations Agent",
        "tier": "business",
        "description": "Operational efficiency and process optimization", 
        "specialties": ["efficiency_optimization", "process_improvement", "automation"],
        "coordinates_with": ["backend-systems-specialist", "performance-engineer"]
    },
    
    # Tier 2: BMAD Orchestration Agents (New 10)
    "bmad-orchestrator": {
        "name": "🎭 BMAD Orchestrator",
        "tier": "orchestration",
        "description": "Master coordinator for complex multi-agent workflows",
        "specialties": ["workflow_coordination", "multi_agent_management"],
        "coordinates_with": ["analyst", "architect", "pm", "dev"]
    },
    "analyst": {
        "name": "📊 Mary - Business Analyst",
        "tier": "orchestration", 
        "description": "Requirements analysis and strategic insights",
        "specialties": ["requirements_analysis", "market_research", "competitive_analysis"],
        "coordinates_with": ["data-scientist", "ux-designer"]
    },
    "architect": {
        "name": "🏗️ System Architect",
        "tier": "orchestration",
        "description": "System architecture and technical planning", 
        "specialties": ["system_design", "architecture_planning", "technical_strategy"],
        "coordinates_with": ["system-architect", "database-administrator"]
    },
    "pm": {
        "name": "📋 Project Manager",
        "tier": "orchestration",
        "description": "Project management and coordination",
        "specialties": ["project_planning", "timeline_estimation", "resource_allocation"],
        "coordinates_with": ["qa-engineer", "performance-engineer"]
    },
    "dev": {
        "name": "👨‍💻 Development Coordinator", 
        "tier": "orchestration",
        "description": "Development coordination and implementation guidance",
        "specialties": ["development_coordination", "implementation_guidance"],
        "coordinates_with": ["production-fullstack-dev", "frontend-specialist"]
    },
    "qa": {
        "name": "🧪 Quality Assurance Lead",
        "tier": "orchestration",
        "description": "Quality assurance and testing strategy",
        "specialties": ["test_strategy", "quality_planning", "automated_testing"], 
        "coordinates_with": ["qa-engineer", "automated-test-generator"]
    },
    "ux-expert": {
        "name": "🎨 UX Expert",
        "tier": "orchestration",
        "description": "User experience design and optimization",
        "specialties": ["user_experience", "interface_design", "usability"],
        "coordinates_with": ["ux-designer", "frontend-specialist"]
    },
    "po": {
        "name": "📋 Product Owner",
        "tier": "orchestration", 
        "description": "Product strategy and requirements definition",
        "specialties": ["product_strategy", "user_stories", "requirements"],
        "coordinates_with": ["data-scientist", "technical-documentation-writer"]
    },
    "sm": {
        "name": "🏃‍♂️ Scrum Master",
        "tier": "orchestration",
        "description": "Agile process facilitation and team coordination", 
        "specialties": ["agile_processes", "team_coordination", "sprint_planning"],
        "coordinates_with": ["code-reviewer", "automated-test-generator"]
    },
    "ai-research-specialist": {
        "name": "🧠 AI Research Specialist",
        "tier": "orchestration",
        "description": "AI model research, evaluation, and optimization strategies",
        "specialties": ["ai_research", "model_evaluation", "ai_optimization", "machine_learning"],
        "coordinates_with": ["data-scientist", "performance-engineer", "backend-systems-specialist"]
    }
}

# Add Tier 3 specialized agents dynamically
SPECIALIZED_AGENTS = [
    ("frontend-specialist", "🌐 Frontend Specialist", "Frontend development and browser issues"),
    ("backend-systems-specialist", "⚙️ Backend Systems Specialist", "Backend systems and API development"), 
    ("data-scientist", "📊 Data Scientist", "SQL queries, analytics, and data insights"),
    ("security-specialist", "🔒 Security Specialist", "Authentication, authorization, and security"),
    ("performance-engineer", "⚡ Performance Engineer", "Performance optimization and profiling"),
    ("devops-infrastructure-architect", "🏗️ DevOps Infrastructure Architect", "Deployment and infrastructure"),
    ("database-administrator", "🗄️ Database Administrator", "Database optimization and management"),
    ("qa-engineer", "🧪 QA Engineer", "Testing and quality assurance"),
    ("automated-test-generator", "🤖 Automated Test Generator", "Test creation and coverage"),
    ("code-reviewer", "👁️ Code Reviewer", "Code quality and best practices"),
    ("debugger", "🐛 Debugger", "Error investigation and bug resolution"),
    ("system-architect", "🏛️ System Architect", "Architecture design and planning"),
    ("technical-documentation-writer", "📝 Technical Documentation Writer", "Documentation and guides"),
    ("ux-designer", "🎨 UX Designer", "UI design and user research"),
    ("production-fullstack-dev", "🚀 Production Fullstack Developer", "Enterprise development"),
    ("pwa-specialist", "📱 PWA Specialist", "Progressive web apps and offline features"),
    ("site-reliability-engineer", "🛡️ Site Reliability Engineer", "Monitoring and incident response"),
    ("error-monitoring-specialist", "📊 Error Monitoring Specialist", "Error tracking and logging"),
    ("authentication-specialist", "🔐 Authentication Specialist", "OAuth, JWT, and SSO"),
    ("third-party-api-connector", "🔗 Third-party API Connector", "API integration and webhooks"),
    ("api-integration-specialist", "🔌 API Integration Specialist", "External API integration"),
    ("code-consistency-specialist", "📏 Code Consistency Specialist", "Code patterns and standards"),
    ("code-optimization-specialist", "⚡ Code Optimization Specialist", "Code optimization and performance"),
    ("message-queue-specialist", "📬 Message Queue Specialist", "Message queues and async processing"),
    ("data-engineer", "🔧 Data Engineer", "ETL pipelines and data processing")
]

for agent_id, name, description in SPECIALIZED_AGENTS:
    UNIFIED_AGENT_REGISTRY[agent_id] = {
        "name": name,
        "tier": "specialized",  
        "description": description,
        "specialties": [agent_id.replace("-", "_")],
        "coordinates_with": []
    }

@router.post("/coordinate", response_model=AgentResponse)
async def coordinate_agents(
    request: AgentRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Unified agent coordination for all 39 agents
    Routes requests to optimal agent combinations with context preservation
    """
    try:
        # Create or get session
        session_id = db_service.create_session(
            user_id=current_user.id,
            business_domain="ai_agent_coordination",
            session_title=f"Agent Coordination - {request.request_type.title()}",
            business_objective=request.business_objective
        )
        
        # Route request to optimal agents
        routing_response = await route_agent_request(
            request_type=request.request_type,
            content=request.content,
            context=request.context,
            business_objective=request.business_objective,
            priority=request.priority
        )
        
        # Handle coordination mode
        if request.coordination_mode == "direct" and request.agent_preference:
            # Override routing for direct agent access
            routing_response.primary_agent = request.agent_preference
            routing_response.supporting_agents = []
        elif request.coordination_mode == "orchestrated":
            # Force orchestration through BMAD
            if routing_response.primary_agent not in ["bmad-orchestrator", "analyst", "architect", "pm"]:
                routing_response.supporting_agents.insert(0, routing_response.primary_agent)
                routing_response.primary_agent = "bmad-orchestrator"
        
        # Execute primary agent
        primary_response = await execute_agent(
            agent_id=routing_response.primary_agent,
            request_content=request.content,
            context={
                **request.context,
                "session_id": session_id,
                "user_id": current_user.id,
                "business_objective": request.business_objective,
                "supporting_agents": routing_response.supporting_agents
            }
        )
        
        # Record agent handoffs in database if supporting agents exist
        if routing_response.supporting_agents:
            # Store handoff information in database
            pass  # Will implement handoff tracking in database later
        
        # Generate next suggested actions
        next_actions = generate_next_actions(
            primary_agent=routing_response.primary_agent,
            request_type=request.request_type,
            supporting_agents=routing_response.supporting_agents
        )
        
        # Store coordination in database
        db_service.add_conversation_message(
            session_id=session_id,
            agent_id="user",
            agent_name="User",
            message_type="user_request",
            content=request.content,
            metadata={
                "request_type": request.request_type,
                "priority": request.priority,
                "business_objective": request.business_objective
            }
        )
        
        db_service.add_conversation_message(
            session_id=session_id,
            agent_id=routing_response.primary_agent,
            agent_name=UNIFIED_AGENT_REGISTRY[routing_response.primary_agent]["name"],
            message_type="agent_response",
            content=primary_response["response"],
            metadata={
                "recommendations": primary_response.get("recommendations", []),
                "supporting_agents": routing_response.supporting_agents,
                "coordination_workflow": routing_response.coordination_workflow
            },
            confidence_score=primary_response.get("confidence", 0.95)
        )
        
        db_service.record_coordination(
            session_id=session_id,
            request_type=request.request_type,
            primary_agent=routing_response.primary_agent,
            supporting_agents=routing_response.supporting_agents,
            coordination_workflow=routing_response.coordination_workflow,
            complexity=routing_response.estimated_complexity,
            business_objective=request.business_objective,
            priority=request.priority,
            success=True
        )
        
        return AgentResponse(
            success=True,
            session_id=session_id,
            primary_agent=routing_response.primary_agent,
            supporting_agents=routing_response.supporting_agents,
            coordination_workflow=routing_response.coordination_workflow,
            response=primary_response["response"],
            recommendations=primary_response.get("recommendations", []),
            context_preserved=len(routing_response.supporting_agents) > 0,
            next_suggested_actions=next_actions,
            confidence=primary_response.get("confidence", 0.95)
        )
        
    except Exception as e:
        logger.error(f"Error coordinating agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent coordination failed: {str(e)}"
        )

@router.get("/list", response_model=AgentListResponse)
async def list_all_agents():
    """List all 39 agents in the unified system"""
    try:
        business_agents = []
        orchestration_agents = []
        specialized_agents = []
        
        for agent_id, config in UNIFIED_AGENT_REGISTRY.items():
            agent_info = {
                "id": agent_id,
                "name": config["name"],
                "description": config["description"],
                "specialties": config["specialties"],
                "coordinates_with": config["coordinates_with"]
            }
            
            if config["tier"] == "business":
                business_agents.append(agent_info)
            elif config["tier"] == "orchestration": 
                orchestration_agents.append(agent_info)
            else:
                specialized_agents.append(agent_info)
        
        return AgentListResponse(
            total_agents=len(UNIFIED_AGENT_REGISTRY),
            business_agents=business_agents,
            orchestration_agents=orchestration_agents,
            specialized_agents=specialized_agents,
            integration_status="active"
        )
        
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list agents"
        )

@router.get("/session/{session_id}/status", response_model=CoordinationStatus)
async def get_coordination_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get coordination status for a session"""
    try:
        context_manager = get_context_manager()
        
        # Get conversation summary
        conversation_summary = context_manager.get_conversation_summary(session_id)
        
        if "error" in conversation_summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Get business objective
        business_objective = context_manager.get_business_objective(session_id)
        
        # Determine current workflow stage
        recent_messages = conversation_summary.get("recent_messages", [])
        workflow_stage = "planning" if not recent_messages else "execution"
        if any(msg.get("type") == "agent_response" for msg in recent_messages):
            workflow_stage = "analysis"
        
        # Calculate progress (simple heuristic)
        progress = min(len(recent_messages) * 20, 100)
        
        return CoordinationStatus(
            session_id=session_id,
            active_workflow="agent_coordination",
            current_agent=recent_messages[-1].get("agent_id", "system") if recent_messages else "system",
            workflow_stage=workflow_stage,
            progress_percentage=progress,
            context_summary={
                "total_messages": conversation_summary.get("total_messages", 0),
                "agents_involved": conversation_summary.get("agents_involved", []),
                "business_objective": business_objective.description if business_objective else None,
                "last_updated": conversation_summary.get("last_updated")
            },
            next_steps=generate_next_steps(conversation_summary, business_objective)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting coordination status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get coordination status"
        )

@router.get("/session/{session_id}/context/{agent_id}")
async def get_agent_context(
    session_id: str,
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get context summary for a specific agent in a session"""
    try:
        context_manager = get_context_manager()
        
        agent_context = context_manager.get_agent_context_summary(session_id, agent_id)
        
        return {
            "success": True,
            "session_id": session_id,
            "agent_id": agent_id,
            "context": agent_context
        }
        
    except Exception as e:
        logger.error(f"Error getting agent context: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get agent context"
        )

@router.get("/analytics")
async def get_coordination_analytics(current_user: User = Depends(get_current_user)):
    """Get system-wide coordination analytics"""
    try:
        from .intelligent_agent_router import router as agent_router
        context_manager = get_context_manager()
        
        # Get routing analytics
        routing_analytics = agent_router.get_routing_analytics()
        
        # Get context analytics
        context_analytics = context_manager.get_system_analytics()
        
        return {
            "success": True,
            "routing_analytics": routing_analytics,
            "context_analytics": context_analytics,
            "integration_health": {
                "total_agents": len(UNIFIED_AGENT_REGISTRY),
                "business_agents": 4,
                "orchestration_agents": 10,
                "specialized_agents": 25,
                "status": "healthy"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting coordination analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get analytics"
        )

async def execute_agent(agent_id: str, request_content: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a specific agent with context"""
    try:
        # For now, simulate agent execution
        # In a full implementation, this would route to actual agent implementations
        
        agent_config = UNIFIED_AGENT_REGISTRY.get(agent_id)
        if not agent_config:
            raise ValueError(f"Unknown agent: {agent_id}")
        
        # Simulate processing time
        await asyncio.sleep(0.5)
        
        # Generate response based on agent type and request
        if agent_config["tier"] == "business":
            response = await execute_business_agent(agent_id, request_content, context)
        elif agent_config["tier"] == "orchestration":
            response = await execute_orchestration_agent(agent_id, request_content, context)
        else:  # specialized
            response = await execute_specialized_agent(agent_id, request_content, context)
        
        return response
        
    except Exception as e:
        logger.error(f"Error executing agent {agent_id}: {str(e)}")
        return {
            "response": f"Agent {agent_id} encountered an error: {str(e)}",
            "recommendations": [],
            "confidence": 0.0
        }

async def execute_business_agent(agent_id: str, request_content: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute business intelligence agent"""
    # This would integrate with your existing business agent system
    # For now, return a structured response
    
    business_responses = {
        "master-coach": "Based on strategic analysis, I recommend focusing on operational efficiency and customer retention. Key areas: process optimization, staff training, and customer experience enhancement.",
        "financial-agent": "Financial analysis shows potential for 25-35% revenue increase through pricing optimization and service diversification. Recommend implementing dynamic pricing strategy.",
        "growth-agent": "Growth opportunities identified: expand service offerings, implement referral programs, and optimize online presence. Market analysis suggests 40% expansion potential.",
        "operations-agent": "Operational assessment reveals efficiency improvements through workflow automation, better scheduling systems, and resource optimization. Estimated 30% productivity gain."
    }
    
    return {
        "response": business_responses.get(agent_id, f"Business analysis complete for {agent_id}"),
        "recommendations": [
            {
                "id": f"{agent_id}_rec_001",
                "type": "strategy",
                "priority": "high", 
                "title": f"Strategic Recommendation from {agent_id}",
                "description": "Implement coordinated business strategy",
                "estimated_impact": "High business value",
                "confidence": 0.92,
                "time_to_implement": "2-4 weeks"
            }
        ],
        "confidence": 0.92
    }

async def execute_orchestration_agent(agent_id: str, request_content: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute BMAD orchestration agent"""
    orchestration_responses = {
        "bmad-orchestrator": f"Coordinating multi-agent workflow for: {request_content}. Routing to optimal specialists and maintaining context across all interactions.",
        "analyst": f"Analysis complete. Key insights: {request_content}. Recommending next steps with supporting data and competitive intelligence.",
        "architect": f"Technical architecture designed for: {request_content}. Scalable, secure, and performance-optimized solution proposed.",
        "pm": f"Project plan created for: {request_content}. Timeline, resources, and risk mitigation strategies defined.",
        "dev": f"Development coordination established for: {request_content}. Technical implementation roadmap with quality gates.",
        "qa": f"Quality assurance strategy defined for: {request_content}. Comprehensive testing approach with automation.",
        "ux-expert": f"User experience optimization plan for: {request_content}. Research-backed design improvements proposed.",
        "po": f"Product requirements defined for: {request_content}. User stories, acceptance criteria, and business value metrics.",
        "sm": f"Agile workflow established for: {request_content}. Sprint planning, team coordination, and delivery framework."
    }
    
    return {
        "response": orchestration_responses.get(agent_id, f"Orchestration complete for {agent_id}"),
        "recommendations": [
            {
                "id": f"{agent_id}_orch_001",
                "type": "coordination",
                "priority": "medium",
                "title": f"Coordination Strategy from {UNIFIED_AGENT_REGISTRY[agent_id]['name']}",
                "description": "Multi-agent workflow coordination",
                "estimated_impact": "Improved coordination efficiency",
                "confidence": 0.88,
                "time_to_implement": "1-2 weeks"
            }
        ],
        "confidence": 0.88
    }

async def execute_specialized_agent(agent_id: str, request_content: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """Execute specialized technical agent"""
    return {
        "response": f"Specialized analysis complete for {request_content}. Technical implementation ready with {UNIFIED_AGENT_REGISTRY[agent_id]['name']} expertise.",
        "recommendations": [
            {
                "id": f"{agent_id}_spec_001", 
                "type": "technical",
                "priority": "medium",
                "title": f"Technical Recommendation from {UNIFIED_AGENT_REGISTRY[agent_id]['name']}",
                "description": "Specialized technical implementation",
                "estimated_impact": "Technical excellence improvement",
                "confidence": 0.90,
                "time_to_implement": "3-7 days"
            }
        ],
        "confidence": 0.90
    }

def generate_next_actions(primary_agent: str, request_type: str, supporting_agents: List[str]) -> List[str]:
    """Generate suggested next actions based on agent response"""
    actions = []
    
    agent_config = UNIFIED_AGENT_REGISTRY.get(primary_agent, {})
    tier = agent_config.get("tier", "unknown")
    
    if tier == "business":
        actions.extend([
            "Review business recommendations with stakeholders",
            "Create implementation timeline",
            "Assign technical coordination to development team"
        ])
    elif tier == "orchestration":
        actions.extend([
            "Execute coordinated workflow with supporting agents",
            "Monitor progress and maintain context",
            "Validate results with business objectives"
        ])
    else:  # specialized
        actions.extend([
            "Implement technical recommendations",
            "Run quality assurance checks",
            "Document implementation details"
        ])
    
    if supporting_agents:
        actions.append(f"Coordinate with supporting agents: {', '.join(supporting_agents)}")
    
    return actions[:4]  # Limit to 4 actions

def generate_next_steps(conversation_summary: Dict[str, Any], business_objective) -> List[str]:
    """Generate next steps based on conversation state"""
    steps = []
    
    total_messages = conversation_summary.get("total_messages", 0)
    agents_involved = conversation_summary.get("agents_involved", [])
    
    if total_messages < 3:
        steps.append("Continue gathering requirements and context")
    
    if len(agents_involved) == 1:
        steps.append("Consider involving additional specialized agents")
    
    if business_objective:
        steps.append("Track progress against business objective")
    
    steps.extend([
        "Review agent recommendations",
        "Plan implementation steps",
        "Set up monitoring and feedback loops"
    ])
    
    return steps[:4]  # Limit to 4 steps