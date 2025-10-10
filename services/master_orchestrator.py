#!/usr/bin/env python3
"""
Master Agent Orchestrator - Central coordination for all AI agents
Uses LangGraph for stateful workflow management and agent coordination
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, TypedDict, Annotated, Callable
from enum import Enum

from langgraph.graph import StateGraph, add_messages, START, END, MessagesState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from pydantic import BaseModel, Field
import instructor
from tenacity import retry, stop_after_attempt, wait_exponential

# Import local services
try:
    from .ai_agents.agent_manager import agent_manager
    from .ai_response_cache_service import ai_response_cache_service
    from .ai_insights_service import ai_insights_service
    SERVICES_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Some services not available: {e}")
    SERVICES_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentType(Enum):
    """Available AI agent types"""
    BUSINESS_INTELLIGENCE = "business_intelligence"
    TECHNICAL_OPS = "technical_ops"
    CUSTOMER_SUCCESS = "customer_success"
    MARKETING = "marketing"
    FINANCIAL = "financial"
    MASTER_COACH = "master_coach"

class TaskPriority(Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class TaskStatus(Enum):
    """Task execution status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AgentTask(BaseModel):
    """Structured task definition for agents"""
    id: str = Field(description="Unique task identifier")
    agent_type: AgentType = Field(description="Target agent type")
    task_type: str = Field(description="Type of task to perform")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    content: str = Field(description="Task content or description")
    context: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.now)
    
class AgentResponse(BaseModel):
    """Structured response from agents"""
    agent_type: AgentType
    task_id: str
    status: TaskStatus
    content: str
    insights: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    execution_time: float = Field(description="Execution time in seconds")
    tokens_used: int = Field(default=0)
    cost: float = Field(default=0.0)

class OrchestratorState(TypedDict):
    """State management for orchestrator workflow"""
    messages: Annotated[List[BaseMessage], add_messages]
    current_task: Optional[AgentTask]
    agent_responses: List[AgentResponse]
    workflow_context: Dict[str, Any]
    session_id: str
    user_id: Optional[str]
    barbershop_id: Optional[str]

class MasterOrchestrator:
    """Master AI Agent Orchestrator using LangGraph"""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.session_data = {}
        
        # Initialize AI models with fallback
        self.primary_llm = self._initialize_primary_llm()
        self.fallback_llm = self._initialize_fallback_llm()
        
        # Initialize instructor for structured outputs
        self.instructor_client = instructor.from_openai(
            self.primary_llm.client if hasattr(self.primary_llm, 'client') else None
        )
        
        # Initialize workflow graph
        self.workflow = self._create_workflow()
        
        # Initialize checkpointing for memory
        self.memory = MemorySaver()
        self.app = self.workflow.compile(checkpointer=self.memory)
        
        logger.info("Master Orchestrator initialized successfully")
    
    def _initialize_primary_llm(self) -> ChatOpenAI:
        """Initialize primary LLM (GPT-4)"""
        return ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=2000,
            timeout=30
        )
    
    def _initialize_fallback_llm(self) -> ChatAnthropic:
        """Initialize fallback LLM (Claude)"""
        return ChatAnthropic(
            model="claude-3-5-sonnet-20241022",
            temperature=0.7,
            max_tokens=2000,
            timeout=30
        )
    
    def _create_workflow(self) -> StateGraph:
        """Create the LangGraph workflow for agent orchestration"""
        
        # Define the workflow graph
        workflow = StateGraph(OrchestratorState)
        
        # Add workflow nodes
        workflow.add_node("analyze_request", self._analyze_request_node)
        workflow.add_node("route_to_agent", self._route_to_agent_node)
        workflow.add_node("execute_task", self._execute_task_node)
        workflow.add_node("synthesize_response", self._synthesize_response_node)
        workflow.add_node("cache_results", self._cache_results_node)
        
        # Define workflow edges
        workflow.add_edge(START, "analyze_request")
        workflow.add_edge("analyze_request", "route_to_agent")
        workflow.add_edge("route_to_agent", "execute_task")
        workflow.add_edge("execute_task", "synthesize_response")
        workflow.add_edge("synthesize_response", "cache_results")
        workflow.add_edge("cache_results", END)
        
        return workflow
    
    async def _analyze_request_node(self, state: OrchestratorState) -> OrchestratorState:
        """Analyze incoming request and determine task requirements"""
        messages = state["messages"]
        if not messages:
            return state
        
        last_message = messages[-1]
        
        try:
            # Use structured output to analyze the request
            analysis_prompt = f"""
            Analyze this user request and determine:
            1. Primary intent and goal
            2. Which AI agents should be involved
            3. Task priority level
            4. Required context and data
            
            User request: {last_message.content}
            """
            
            # Create analysis task
            task = AgentTask(
                id=f"task_{datetime.now().timestamp()}",
                agent_type=AgentType.MASTER_COACH,  # Default to master coach for analysis
                task_type="request_analysis",
                content=analysis_prompt,
                context={"original_request": last_message.content}
            )
            
            state["current_task"] = task
            state["workflow_context"] = {
                "analysis_complete": True,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Request analysis failed: {e}")
            # Add error message to state
            error_message = AIMessage(
                content=f"I encountered an error analyzing your request: {str(e)}"
            )
            state["messages"].append(error_message)
        
        return state
    
    async def _route_to_agent_node(self, state: OrchestratorState) -> OrchestratorState:
        """Route task to appropriate specialized agent"""
        current_task = state.get("current_task")
        if not current_task:
            return state
        
        # Simple routing logic based on keywords and intent
        content = current_task.content.lower()
        
        if any(word in content for word in ["revenue", "analytics", "insights", "performance"]):
            target_agent = AgentType.BUSINESS_INTELLIGENCE
        elif any(word in content for word in ["system", "technical", "error", "performance"]):
            target_agent = AgentType.TECHNICAL_OPS
        elif any(word in content for word in ["customer", "appointment", "booking", "support"]):
            target_agent = AgentType.CUSTOMER_SUCCESS
        elif any(word in content for word in ["marketing", "campaign", "promotion", "social"]):
            target_agent = AgentType.MARKETING
        elif any(word in content for word in ["financial", "commission", "payment", "revenue"]):
            target_agent = AgentType.FINANCIAL
        else:
            target_agent = AgentType.MASTER_COACH
        
        # Update task with target agent
        current_task.agent_type = target_agent
        state["current_task"] = current_task
        
        logger.info(f"Task routed to agent: {target_agent.value}")
        return state
    
    async def _execute_task_node(self, state: OrchestratorState) -> OrchestratorState:
        """Execute task using the designated agent"""
        current_task = state.get("current_task")
        if not current_task:
            return state
        
        try:
            start_time = datetime.now()
            
            # Execute task based on agent type
            response = await self._execute_agent_task(current_task)
            
            execution_time = (datetime.now() - start_time).total_seconds()
            response.execution_time = execution_time
            
            # Store response
            if "agent_responses" not in state:
                state["agent_responses"] = []
            state["agent_responses"].append(response)
            
            logger.info(f"Task executed by {response.agent_type.value} in {execution_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            error_response = AgentResponse(
                agent_type=current_task.agent_type,
                task_id=current_task.id,
                status=TaskStatus.FAILED,
                content=f"Task execution failed: {str(e)}",
                execution_time=0.0
            )
            
            if "agent_responses" not in state:
                state["agent_responses"] = []
            state["agent_responses"].append(error_response)
        
        return state
    
    async def _execute_agent_task(self, task: AgentTask) -> AgentResponse:
        """Execute task using the appropriate agent"""
        
        # For now, use the primary LLM to simulate agent responses
        # In production, this would route to actual specialized agent services
        
        system_prompt = self._get_agent_system_prompt(task.agent_type)
        
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=task.content)
        ]
        
        try:
            # Try primary LLM first
            response = await self.primary_llm.ainvoke(messages)
            model_used = "primary"
        except Exception as e:
            logger.warning(f"Primary LLM failed: {e}, falling back to secondary")
            try:
                response = await self.fallback_llm.ainvoke(messages)
                model_used = "fallback"
            except Exception as e2:
                logger.error(f"Both LLMs failed: {e2}")
                raise e2
        
        # Create structured response
        agent_response = AgentResponse(
            agent_type=task.agent_type,
            task_id=task.id,
            status=TaskStatus.COMPLETED,
            content=response.content,
            confidence=0.8,  # Default confidence
            execution_time=0.5,  # Default execution time
            tokens_used=getattr(response, 'usage', {}).get('total_tokens', 0) if hasattr(response, 'usage') else 0
        )
        
        return agent_response
    
    def _get_agent_system_prompt(self, agent_type: AgentType) -> str:
        """Get specialized system prompt for each agent type"""
        
        base_prompt = "You are an AI agent in a barbershop management system. "
        
        prompts = {
            AgentType.BUSINESS_INTELLIGENCE: base_prompt + "You specialize in business analytics, revenue insights, and performance metrics. Provide data-driven recommendations.",
            
            AgentType.TECHNICAL_OPS: base_prompt + "You specialize in technical operations, system performance, and troubleshooting. Focus on technical solutions and optimizations.",
            
            AgentType.CUSTOMER_SUCCESS: base_prompt + "You specialize in customer experience, appointment management, and client satisfaction. Focus on improving customer interactions.",
            
            AgentType.MARKETING: base_prompt + "You specialize in marketing strategies, campaigns, and customer acquisition. Focus on growth and promotional activities.",
            
            AgentType.FINANCIAL: base_prompt + "You specialize in financial analysis, commission calculations, and revenue optimization. Focus on financial insights and recommendations.",
            
            AgentType.MASTER_COACH: base_prompt + "You are the master business coach, providing strategic guidance and coordinating between different business areas. Take a holistic view."
        }
        
        return prompts.get(agent_type, prompts[AgentType.MASTER_COACH])
    
    async def _synthesize_response_node(self, state: OrchestratorState) -> OrchestratorState:
        """Synthesize final response from agent outputs"""
        agent_responses = state.get("agent_responses", [])
        
        if not agent_responses:
            error_message = AIMessage(content="No agent responses available to synthesize.")
            state["messages"].append(error_message)
            return state
        
        try:
            # Combine all agent responses into a coherent response
            successful_responses = [r for r in agent_responses if r.status == TaskStatus.COMPLETED]
            
            if not successful_responses:
                error_message = AIMessage(content="All agent tasks failed. Please try again.")
                state["messages"].append(error_message)
                return state
            
            # Create synthesized response
            synthesis_content = []
            for response in successful_responses:
                synthesis_content.append(f"**{response.agent_type.value.title()}**: {response.content}")
                
                if response.insights:
                    synthesis_content.append(f"**Insights**: {'; '.join(response.insights)}")
                
                if response.recommendations:
                    synthesis_content.append(f"**Recommendations**: {'; '.join(response.recommendations)}")
            
            final_content = "\n\n".join(synthesis_content)
            
            # Add metadata
            total_tokens = sum(r.tokens_used for r in successful_responses)
            total_cost = sum(r.cost for r in successful_responses)
            avg_confidence = sum(r.confidence for r in successful_responses) / len(successful_responses)
            
            metadata_content = f"\n\n---\n*Response generated by {len(successful_responses)} agents | Confidence: {avg_confidence:.1%} | Tokens: {total_tokens}*"
            
            final_message = AIMessage(
                content=final_content + metadata_content,
                additional_kwargs={
                    "agent_count": len(successful_responses),
                    "total_tokens": total_tokens,
                    "total_cost": total_cost,
                    "confidence": avg_confidence
                }
            )
            
            state["messages"].append(final_message)
            
        except Exception as e:
            logger.error(f"Response synthesis failed: {e}")
            error_message = AIMessage(content=f"Error synthesizing response: {str(e)}")
            state["messages"].append(error_message)
        
        return state
    
    async def _cache_results_node(self, state: OrchestratorState) -> OrchestratorState:
        """Cache results for future use"""
        try:
            if SERVICES_AVAILABLE and hasattr(ai_response_cache_service, 'cache_response'):
                # Cache the conversation and responses
                cache_key = f"orchestrator_{state.get('session_id', 'default')}"
                cache_data = {
                    "messages": [msg.content for msg in state["messages"]],
                    "agent_responses": [resp.dict() for resp in state.get("agent_responses", [])],
                    "timestamp": datetime.now().isoformat()
                }
                
                await ai_response_cache_service.cache_response(cache_key, cache_data)
                logger.info(f"Results cached with key: {cache_key}")
        except Exception as e:
            logger.warning(f"Caching failed: {e}")
        
        return state
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def process_request(self, 
                            message: str, 
                            session_id: str = "default",
                            user_id: Optional[str] = None,
                            barbershop_id: Optional[str] = None,
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a user request through the orchestrator workflow
        """
        try:
            # Initialize state
            initial_state = OrchestratorState(
                messages=[HumanMessage(content=message)],
                current_task=None,
                agent_responses=[],
                workflow_context=context or {},
                session_id=session_id,
                user_id=user_id,
                barbershop_id=barbershop_id
            )
            
            # Run the workflow
            config = {"configurable": {"thread_id": session_id}}
            result = await self.app.ainvoke(initial_state, config)
            
            # Extract final response
            final_messages = result["messages"]
            ai_messages = [msg for msg in final_messages if isinstance(msg, AIMessage)]
            
            if ai_messages:
                final_response = ai_messages[-1]
                return {
                    "success": True,
                    "response": final_response.content,
                    "metadata": final_response.additional_kwargs,
                    "agent_responses": [resp.dict() for resp in result.get("agent_responses", [])],
                    "session_id": session_id
                }
            else:
                return {
                    "success": False,
                    "error": "No AI response generated",
                    "session_id": session_id
                }
                
        except Exception as e:
            logger.error(f"Request processing failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id
            }
    
    async def get_session_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Get conversation history for a session"""
        try:
            config = {"configurable": {"thread_id": session_id}}
            # Get state history from checkpointer
            state = await self.app.aget_state(config)
            
            if state and "messages" in state.values:
                messages = state.values["messages"]
                return [
                    {
                        "role": "human" if isinstance(msg, HumanMessage) else "assistant",
                        "content": msg.content,
                        "timestamp": getattr(msg, 'timestamp', None)
                    }
                    for msg in messages
                ]
            return []
            
        except Exception as e:
            logger.error(f"Failed to get session history: {e}")
            return []
    
    async def clear_session(self, session_id: str) -> bool:
        """Clear session data and history"""
        try:
            # Clear from memory checkpointer
            config = {"configurable": {"thread_id": session_id}}
            # Note: MemorySaver doesn't have a direct clear method
            # In production, use a persistent checkpointer like PostgreSQL
            
            # Clear local session data
            if session_id in self.session_data:
                del self.session_data[session_id]
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to clear session: {e}")
            return False
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents and orchestrator"""
        return {
            "orchestrator": {
                "status": "active",
                "version": "1.0.0",
                "uptime": "active",
                "services_available": SERVICES_AVAILABLE
            },
            "available_agents": [agent.value for agent in AgentType],
            "workflow_nodes": list(self.workflow.nodes.keys()),
            "memory_backend": "MemorySaver"
        }

    async def health_check(self) -> Dict[str, Any]:
        """Health check method for API endpoint compatibility"""
        try:
            # Test primary LLM connectivity
            primary_healthy = True
            try:
                await self.primary_llm.ainvoke([HumanMessage(content="ping")])
            except Exception:
                primary_healthy = False
            
            # Test fallback LLM connectivity
            fallback_healthy = True
            try:
                await self.fallback_llm.ainvoke([HumanMessage(content="ping")])
            except Exception:
                fallback_healthy = False
            
            # Get basic status
            status = self.get_agent_status()
            
            return {
                "status": "healthy" if (primary_healthy or fallback_healthy) else "degraded",
                "primary_llm": "healthy" if primary_healthy else "unhealthy",
                "fallback_llm": "healthy" if fallback_healthy else "unhealthy",
                "services_available": SERVICES_AVAILABLE,
                "orchestrator_info": status,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# Global orchestrator instance
master_orchestrator = None

def get_orchestrator() -> MasterOrchestrator:
    """Get or create the global orchestrator instance"""
    global master_orchestrator
    if master_orchestrator is None:
        master_orchestrator = MasterOrchestrator()
    return master_orchestrator

# Async context manager for orchestrator
async def orchestrator_context():
    """Async context manager for orchestrator operations"""
    orchestrator = get_orchestrator()
    try:
        yield orchestrator
    finally:
        # Cleanup if needed
        pass

if __name__ == "__main__":
    # Test the orchestrator
    async def test_orchestrator():
        orchestrator = get_orchestrator()
        
        test_requests = [
            "How is my business performing this month?",
            "Help me optimize my appointment scheduling",
            "Create a marketing campaign for the holidays",
            "Check for any technical issues in the system"
        ]
        
        for i, request in enumerate(test_requests):
            print(f"\n=== Test {i+1}: {request} ===")
            result = await orchestrator.process_request(
                message=request,
                session_id=f"test_session_{i}"
            )
            
            if result["success"]:
                print(f"Response: {result['response']}")
                print(f"Agents used: {len(result.get('agent_responses', []))}")
            else:
                print(f"Error: {result['error']}")
    
    # Run the test
    asyncio.run(test_orchestrator())