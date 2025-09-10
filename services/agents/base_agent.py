#!/usr/bin/env python3
"""
Base Agent Class - Foundation for all specialized AI agents
Provides common functionality, error handling, and standardized interfaces
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum

from pydantic import BaseModel, Field
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Import services
try:
    from ..semantic_cache import get_semantic_cache, cached_response
    from ..structured_outputs import get_structured_output_service, StructuredOutputService
    from ..vector_knowledge_service import VectorKnowledgeService
    SERVICES_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Services not available: {e}")
    SERVICES_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentStatus(str, Enum):
    """Agent status enumeration"""
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"
    OFFLINE = "offline"

class TaskResult(BaseModel):
    """Standardized task result format"""
    success: bool = Field(description="Whether task completed successfully")
    result: Any = Field(description="Task result data")
    error: Optional[str] = Field(None, description="Error message if failed")
    execution_time: float = Field(description="Execution time in seconds")
    tokens_used: int = Field(default=0, description="Tokens consumed")
    confidence: float = Field(ge=0.0, le=1.0, default=0.5, description="Confidence in result")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class BaseAgent(ABC):
    """Base class for all AI agents"""
    
    def __init__(self, 
                 agent_name: str,
                 agent_type: str,
                 model_preference: str = "openai",
                 default_model: str = "gpt-4o-mini",
                 fallback_model: str = "claude-3-5-sonnet-20241022"):
        """
        Initialize base agent
        
        Args:
            agent_name: Human-readable name for the agent
            agent_type: Technical identifier for the agent type
            model_preference: Preferred AI provider (openai/anthropic)
            default_model: Default model to use
            fallback_model: Fallback model if primary fails
        """
        self.agent_name = agent_name
        self.agent_type = agent_type
        self.model_preference = model_preference
        self.default_model = default_model
        self.fallback_model = fallback_model
        
        # Initialize status tracking
        self.status = AgentStatus.IDLE
        self.last_activity = datetime.now()
        self.task_count = 0
        self.error_count = 0
        
        # Initialize AI models
        self.primary_llm = self._initialize_primary_llm()
        self.fallback_llm = self._initialize_fallback_llm()
        
        # Initialize services
        self.cache = get_semantic_cache() if SERVICES_AVAILABLE else None
        self.structured_output = get_structured_output_service() if SERVICES_AVAILABLE else None
        self.knowledge_service = VectorKnowledgeService() if SERVICES_AVAILABLE else None
        
        # Agent-specific configuration
        self.config = self._initialize_config()
        
        logger.info(f"{self.agent_name} initialized successfully")
    
    def _initialize_primary_llm(self):
        """Initialize primary LLM based on preference"""
        try:
            if self.model_preference == "openai":
                return ChatOpenAI(
                    model=self.default_model,
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30
                )
            else:
                return ChatAnthropic(
                    model=self.default_model if "claude" in self.default_model else "claude-3-5-sonnet-20241022",
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30
                )
        except Exception as e:
            logger.error(f"Failed to initialize primary LLM: {e}")
            return None
    
    def _initialize_fallback_llm(self):
        """Initialize fallback LLM"""
        try:
            if self.model_preference == "openai":
                return ChatAnthropic(
                    model=self.fallback_model,
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30
                )
            else:
                return ChatOpenAI(
                    model="gpt-4o-mini",
                    temperature=0.7,
                    max_tokens=2000,
                    timeout=30
                )
        except Exception as e:
            logger.error(f"Failed to initialize fallback LLM: {e}")
            return None
    
    def _initialize_config(self) -> Dict[str, Any]:
        """Initialize agent-specific configuration"""
        return {
            "max_retries": 3,
            "timeout_seconds": 60,
            "cache_ttl": 3600,
            "enable_caching": True,
            "enable_structured_output": True,
            "enable_rag": True,
            "max_knowledge_results": 5,
            "knowledge_relevance_threshold": 0.3
        }
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get agent-specific system prompt"""
        pass
    
    @abstractmethod
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process a specific task - implemented by each agent"""
        pass
    
    async def _get_relevant_knowledge(self, query: str, agent_specific_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve relevant knowledge from vector database to enhance agent responses
        
        Args:
            query: The user query to search knowledge for
            agent_specific_filter: Optional filter for agent-specific knowledge
            
        Returns:
            List of relevant knowledge documents with metadata
        """
        if not self.knowledge_service or not self.config.get("enable_rag", True):
            return []
        
        try:
            # Search for relevant knowledge
            search_results = await self.knowledge_service.search_knowledge(
                query=query,
                max_results=self.config.get("max_knowledge_results", 5),
                min_relevance=self.config.get("knowledge_relevance_threshold", 0.3)
            )
            
            # Format results for context injection
            knowledge_context = []
            for result in search_results:
                knowledge_context.append({
                    "title": result.document.title,
                    "content": result.document.content,
                    "type": result.document.knowledge_type.value if hasattr(result.document.knowledge_type, 'value') else str(result.document.knowledge_type),
                    "source": result.document.source,
                    "relevance_score": result.relevance_score,
                    "metadata": result.document.metadata
                })
            
            logger.info(f"{self.agent_name} retrieved {len(knowledge_context)} relevant knowledge documents")
            return knowledge_context
            
        except Exception as e:
            logger.warning(f"Failed to retrieve knowledge for {self.agent_name}: {e}")
            return []
    
    def _format_knowledge_context(self, knowledge_list: List[Dict[str, Any]]) -> str:
        """
        Format knowledge documents into a context string for LLM consumption
        
        Args:
            knowledge_list: List of knowledge documents from _get_relevant_knowledge
            
        Returns:
            Formatted context string
        """
        if not knowledge_list:
            return ""
        
        context_parts = ["=== RELEVANT BUSINESS KNOWLEDGE ==="]
        
        for i, knowledge in enumerate(knowledge_list, 1):
            context_parts.append(f"\n{i}. {knowledge['title']} (Type: {knowledge['type']}, Relevance: {knowledge['relevance_score']:.3f})")
            context_parts.append(f"   {knowledge['content']}")
            if knowledge.get('source'):
                context_parts.append(f"   Source: {knowledge['source']}")
        
        context_parts.append("\n=== END KNOWLEDGE CONTEXT ===\n")
        
        return "\n".join(context_parts)
    
    async def execute(self, 
                     message: str, 
                     context: Optional[Dict[str, Any]] = None,
                     structured_output_model: Optional[type] = None) -> TaskResult:
        """
        Execute a task with the agent
        
        Args:
            message: Task message or query
            context: Additional context data
            structured_output_model: Pydantic model for structured output
            
        Returns:
            TaskResult with execution details
        """
        start_time = time.time()
        self.status = AgentStatus.PROCESSING
        self.last_activity = datetime.now()
        self.task_count += 1
        
        try:
            # Check cache first if enabled
            if self.config.get("enable_caching", True) and self.cache:
                cached_result = await self.cache.get(
                    query=message,
                    agent_type=self.agent_type,
                    context=context
                )
                if cached_result:
                    execution_time = time.time() - start_time
                    logger.info(f"{self.agent_name} returned cached result")
                    
                    self.status = AgentStatus.IDLE
                    return TaskResult(
                        success=True,
                        result=cached_result['response'],
                        execution_time=execution_time,
                        metadata={"from_cache": True, **cached_result.get('metadata', {})}
                    )
            
            # Retrieve relevant knowledge for RAG enhancement
            relevant_knowledge = await self._get_relevant_knowledge(message)
            
            # Prepare task data
            task_data = {
                "message": message,
                "context": context or {},
                "relevant_knowledge": relevant_knowledge,
                "structured_output_model": structured_output_model,
                "agent_type": self.agent_type
            }
            
            # Process the task
            result = await self.process_task(task_data)
            
            # Cache the result if successful
            if (result.success and 
                self.config.get("enable_caching", True) and 
                self.cache):
                await self.cache.set(
                    query=message,
                    response=str(result.result),
                    agent_type=self.agent_type,
                    context=context,
                    ttl=self.config.get("cache_ttl", 3600),
                    metadata=result.metadata
                )
            
            self.status = AgentStatus.IDLE
            return result
            
        except Exception as e:
            self.error_count += 1
            self.status = AgentStatus.ERROR
            execution_time = time.time() - start_time
            
            logger.error(f"{self.agent_name} execution failed: {e}")
            
            return TaskResult(
                success=False,
                result=None,
                error=str(e),
                execution_time=execution_time
            )
    
    async def _call_llm(self, 
                       messages: List[BaseMessage],
                       use_structured_output: bool = False,
                       output_model: Optional[type] = None) -> Tuple[str, int]:
        """
        Call LLM with fallback logic
        
        Returns:
            Tuple of (response_text, tokens_used)
        """
        try:
            # Try primary LLM first
            if self.primary_llm:
                response = await self.primary_llm.ainvoke(messages)
                tokens_used = getattr(response, 'usage', {}).get('total_tokens', 0) if hasattr(response, 'usage') else 0
                return response.content, tokens_used
            
        except Exception as e:
            logger.warning(f"Primary LLM failed: {e}, trying fallback")
            
            try:
                if self.fallback_llm:
                    response = await self.fallback_llm.ainvoke(messages)
                    tokens_used = getattr(response, 'usage', {}).get('total_tokens', 0) if hasattr(response, 'usage') else 0
                    return response.content, tokens_used
                    
            except Exception as e2:
                logger.error(f"Fallback LLM also failed: {e2}")
                raise e2
        
        raise Exception("No LLM available")
    
    async def _generate_structured_response(self,
                                          prompt: str,
                                          output_model: type,
                                          system_prompt: Optional[str] = None):
        """Generate structured response using structured output service"""
        if not self.structured_output or not SERVICES_AVAILABLE:
            raise Exception("Structured output service not available")
        
        return await self.structured_output.generate_structured_response(
            prompt=prompt,
            response_model=output_model,
            provider=self.model_preference,
            model=self.default_model,
            system_prompt=system_prompt or self.get_system_prompt()
        )
    
    def get_capabilities(self) -> List[str]:
        """Get list of agent capabilities"""
        base_capabilities = [
            "natural_language_processing",
            "context_awareness",
            "error_handling",
            "caching"
        ]
        
        if SERVICES_AVAILABLE:
            base_capabilities.extend([
                "structured_outputs",
                "semantic_caching",
                "vector_knowledge_retrieval",
                "rag_enhanced_responses"
            ])
        
        # Add agent-specific capabilities
        return base_capabilities + self.get_specialized_capabilities()
    
    @abstractmethod
    def get_specialized_capabilities(self) -> List[str]:
        """Get agent-specific capabilities"""
        pass
    
    def get_status(self) -> Dict[str, Any]:
        """Get agent status and statistics"""
        return {
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "status": self.status.value,
            "last_activity": self.last_activity.isoformat(),
            "task_count": self.task_count,
            "error_count": self.error_count,
            "error_rate": self.error_count / max(self.task_count, 1),
            "capabilities": self.get_capabilities(),
            "model_preference": self.model_preference,
            "default_model": self.default_model,
            "services_available": SERVICES_AVAILABLE
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform agent health check"""
        health = {
            "healthy": False,
            "agent_name": self.agent_name,
            "status": self.status.value,
            "last_activity": self.last_activity.isoformat(),
            "checks": {}
        }
        
        try:
            # Test primary LLM
            if self.primary_llm:
                test_messages = [
                    SystemMessage(content="You are a test agent."),
                    HumanMessage(content="Respond with 'OK' if you're working.")
                ]
                response, _ = await self._call_llm(test_messages)
                health["checks"]["primary_llm"] = "OK" in response
            else:
                health["checks"]["primary_llm"] = False
            
            # Test cache if available
            if self.cache:
                cache_health = await self.cache.health_check()
                health["checks"]["cache"] = cache_health.get("status") in ["healthy", "degraded"]
            else:
                health["checks"]["cache"] = "not_available"
            
            # Test structured output service if available
            if self.structured_output:
                health["checks"]["structured_output"] = True
            else:
                health["checks"]["structured_output"] = "not_available"
            
            # Test knowledge service if available
            if self.knowledge_service:
                try:
                    stats = await self.knowledge_service.get_knowledge_stats()
                    health["checks"]["knowledge_service"] = stats.get("total_documents", 0) > 0
                except Exception:
                    health["checks"]["knowledge_service"] = False
            else:
                health["checks"]["knowledge_service"] = "not_available"
            
            # Overall health
            critical_checks = ["primary_llm"]
            health["healthy"] = all(
                health["checks"].get(check, False) for check in critical_checks
            )
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health["error"] = str(e)
        
        return health
    
    async def reset(self):
        """Reset agent state"""
        self.status = AgentStatus.IDLE
        self.error_count = 0
        self.last_activity = datetime.now()
        logger.info(f"{self.agent_name} reset successfully")
    
    def configure(self, config_updates: Dict[str, Any]):
        """Update agent configuration"""
        self.config.update(config_updates)
        logger.info(f"{self.agent_name} configuration updated: {config_updates}")
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name='{self.agent_name}', type='{self.agent_type}', status='{self.status.value}')"