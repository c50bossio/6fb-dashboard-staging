#!/usr/bin/env python3
"""
FastAPI Schemas for 6FB AI Agent System
Defines request/response models for all API endpoints
"""

from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict


# ===== ENUMS =====

class AgentType(str, Enum):
    """Available agent types"""
    MASTER_COACH = "master_coach"
    TECHNICAL_OPERATIONS = "technical_operations"
    CUSTOMER_SUCCESS = "customer_success"
    MARKETING = "marketing"
    FINANCIAL = "financial"


class TaskPriority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class RequestType(str, Enum):
    """Types of agent requests"""
    ANALYSIS = "analysis"
    RECOMMENDATION = "recommendation"
    STRATEGY = "strategy"
    ASSESSMENT = "assessment"
    OPTIMIZATION = "optimization"


# ===== BASE MODELS =====

class BaseResponse(BaseModel):
    """Base response model for all API endpoints"""
    model_config = ConfigDict(from_attributes=True)
    
    success: bool = Field(description="Whether the request was successful")
    message: str = Field(description="Response message")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")


class ErrorResponse(BaseResponse):
    """Error response model"""
    success: bool = Field(default=False, description="Always false for errors")
    error_code: str = Field(description="Error code identifier")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")


# ===== AGENT REQUEST/RESPONSE MODELS =====

class AgentRequest(BaseModel):
    """Request to an AI agent"""
    model_config = ConfigDict(from_attributes=True)
    
    agent_type: AgentType = Field(description="Type of agent to use")
    message: str = Field(min_length=1, max_length=2000, description="User message/query")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    request_type: RequestType = Field(default=RequestType.ANALYSIS, description="Type of request")
    structured_output: bool = Field(default=False, description="Whether to return structured output")
    include_knowledge: bool = Field(default=True, description="Whether to include RAG knowledge")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class AgentResponse(BaseResponse):
    """Response from an AI agent"""
    success: bool = Field(default=True, description="Always true for successful responses")
    agent_type: AgentType = Field(description="Agent that processed the request")
    result: Union[str, Dict[str, Any]] = Field(description="Agent response content")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    execution_time: float = Field(ge=0.0, description="Execution time in seconds")
    tokens_used: int = Field(ge=0, description="Tokens consumed")
    knowledge_used: int = Field(ge=0, description="Number of knowledge documents used")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    request_id: str = Field(description="Unique request identifier")


class UnifiedChatRequest(BaseModel):
    """Unified chat request that routes to appropriate agent"""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = Field(min_length=1, max_length=2000, description="User message/query")
    agent: Optional[AgentType] = Field(default=None, description="Specific agent to use (optional)")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class UnifiedChatResponse(BaseResponse):
    """Response from unified chat endpoint"""
    success: bool = Field(default=True, description="Always true for successful responses")
    agent_used: AgentType = Field(description="Agent that processed the request")
    response: str = Field(description="Chat response content")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    execution_time: float = Field(ge=0.0, description="Execution time in seconds")
    request_id: str = Field(description="Unique request identifier")


# ===== ANALYTICS MODELS =====

class AgentStats(BaseModel):
    """Agent statistics and performance metrics"""
    model_config = ConfigDict(from_attributes=True)
    
    agent_type: AgentType = Field(description="Agent type")
    total_requests: int = Field(ge=0, description="Total requests processed")
    successful_requests: int = Field(ge=0, description="Successful requests")
    failed_requests: int = Field(ge=0, description="Failed requests")
    average_response_time: float = Field(ge=0.0, description="Average response time in seconds")
    average_confidence: float = Field(ge=0.0, le=1.0, description="Average confidence score")
    total_tokens_used: int = Field(ge=0, description="Total tokens consumed")
    last_activity: datetime = Field(description="Last activity timestamp")
    status: str = Field(description="Current agent status")


class SystemStats(BaseModel):
    """Overall system statistics"""
    model_config = ConfigDict(from_attributes=True)
    
    total_requests: int = Field(ge=0, description="Total system requests")
    total_agents: int = Field(ge=0, description="Number of active agents")
    uptime_seconds: float = Field(ge=0.0, description="System uptime in seconds")
    knowledge_documents: int = Field(ge=0, description="Number of knowledge documents")
    cache_hit_rate: float = Field(ge=0.0, le=1.0, description="Cache hit rate")
    average_response_time: float = Field(ge=0.0, description="System average response time")
    agents: List[AgentStats] = Field(description="Individual agent statistics")


class UsageAnalytics(BaseModel):
    """Usage analytics for dashboard"""
    model_config = ConfigDict(from_attributes=True)
    
    period: str = Field(description="Analytics period (e.g., '24h', '7d', '30d')")
    total_interactions: int = Field(ge=0, description="Total user interactions")
    unique_users: int = Field(ge=0, description="Number of unique users")
    popular_agents: List[Dict[str, Union[str, int]]] = Field(description="Most used agents")
    peak_hours: List[int] = Field(description="Peak usage hours (0-23)")
    request_types: Dict[str, int] = Field(description="Request type distribution")
    success_rate: float = Field(ge=0.0, le=1.0, description="Overall success rate")


# ===== KNOWLEDGE BASE MODELS =====

class KnowledgeQuery(BaseModel):
    """Knowledge base search query"""
    model_config = ConfigDict(from_attributes=True)
    
    query: str = Field(min_length=1, max_length=500, description="Search query")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum results to return")
    min_relevance: float = Field(default=0.3, ge=0.0, le=1.0, description="Minimum relevance score")
    knowledge_types: Optional[List[str]] = Field(default=None, description="Filter by knowledge types")


class KnowledgeResult(BaseModel):
    """Knowledge search result"""
    model_config = ConfigDict(from_attributes=True)
    
    title: str = Field(description="Document title")
    content: str = Field(description="Document content")
    knowledge_type: str = Field(description="Knowledge type category")
    source: str = Field(description="Document source")
    relevance_score: float = Field(ge=0.0, le=1.0, description="Relevance to query")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class KnowledgeResponse(BaseResponse):
    """Knowledge search response"""
    success: bool = Field(default=True, description="Always true for successful responses")
    query: str = Field(description="Original search query")
    results: List[KnowledgeResult] = Field(description="Search results")
    total_results: int = Field(ge=0, description="Total number of results found")
    search_time: float = Field(ge=0.0, description="Search time in seconds")


# ===== HEALTH CHECK MODELS =====

class ServiceHealth(BaseModel):
    """Individual service health status"""
    model_config = ConfigDict(from_attributes=True)
    
    service_name: str = Field(description="Service name")
    status: str = Field(description="Health status (healthy/degraded/unhealthy)")
    last_check: datetime = Field(description="Last health check timestamp")
    response_time: Optional[float] = Field(default=None, description="Service response time")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional health details")


class HealthResponse(BaseResponse):
    """System health check response"""
    success: bool = Field(default=True, description="Always true for health responses")
    overall_status: str = Field(description="Overall system health status")
    services: List[ServiceHealth] = Field(description="Individual service health")
    system_info: Dict[str, Any] = Field(description="System information")


# ===== ORCHESTRATOR MODELS =====

class MultiAgentRequest(BaseModel):
    """Request for multi-agent orchestration"""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = Field(min_length=1, max_length=2000, description="User message/query")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")
    agents: Optional[List[AgentType]] = Field(default=None, description="Specific agents to use")
    max_agents: int = Field(default=3, ge=1, le=6, description="Maximum agents to involve")
    confidence_threshold: float = Field(default=0.7, ge=0.0, le=1.0, description="Minimum confidence for routing")
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class AgentResult(BaseModel):
    """Individual agent result in orchestration"""
    model_config = ConfigDict(from_attributes=True)
    
    agent_type: AgentType = Field(description="Agent type")
    result: Union[str, Dict[str, Any]] = Field(description="Agent response")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score")
    execution_time: float = Field(ge=0.0, description="Execution time")
    tokens_used: int = Field(ge=0, description="Tokens consumed")
    knowledge_used: int = Field(ge=0, description="Knowledge documents used")


class OrchestratorResponse(BaseResponse):
    """Multi-agent orchestration response"""
    success: bool = Field(default=True, description="Always true for successful responses")
    primary_result: Union[str, Dict[str, Any]] = Field(description="Primary orchestrated result")
    agent_results: List[AgentResult] = Field(description="Individual agent results")
    routing_decision: Dict[str, Any] = Field(description="How agents were selected")
    total_execution_time: float = Field(ge=0.0, description="Total execution time")
    total_tokens_used: int = Field(ge=0, description="Total tokens consumed")
    confidence: float = Field(ge=0.0, le=1.0, description="Overall confidence")
    request_id: str = Field(description="Unique request identifier")


# ===== CONFIGURATION MODELS =====

class AgentConfig(BaseModel):
    """Agent configuration settings"""
    model_config = ConfigDict(from_attributes=True)
    
    agent_type: AgentType = Field(description="Agent type")
    enabled: bool = Field(default=True, description="Whether agent is enabled")
    model_preference: str = Field(default="openai", description="Preferred AI model provider")
    default_model: str = Field(default="gpt-4o-mini", description="Default model to use")
    enable_rag: bool = Field(default=True, description="Enable RAG knowledge retrieval")
    max_knowledge_results: int = Field(default=5, ge=1, le=20, description="Max knowledge documents")
    knowledge_relevance_threshold: float = Field(default=0.3, ge=0.0, le=1.0, description="Knowledge relevance threshold")
    enable_caching: bool = Field(default=True, description="Enable response caching")
    cache_ttl: int = Field(default=3600, ge=60, description="Cache TTL in seconds")


class SystemConfig(BaseModel):
    """System configuration settings"""
    model_config = ConfigDict(from_attributes=True)
    
    max_concurrent_requests: int = Field(default=10, ge=1, le=100, description="Max concurrent requests")
    request_timeout: int = Field(default=60, ge=10, le=300, description="Request timeout in seconds")
    enable_analytics: bool = Field(default=True, description="Enable analytics collection")
    log_level: str = Field(default="INFO", description="Logging level")
    agents: List[AgentConfig] = Field(description="Agent configurations")


# ===== BATCH PROCESSING MODELS =====

class BatchRequest(BaseModel):
    """Batch processing request"""
    model_config = ConfigDict(from_attributes=True)
    
    requests: List[AgentRequest] = Field(min_length=1, max_length=50, description="Batch of agent requests")
    parallel: bool = Field(default=True, description="Process requests in parallel")
    fail_fast: bool = Field(default=False, description="Stop on first failure")
    user_id: Optional[str] = Field(default=None, description="User identifier")


class BatchResponse(BaseResponse):
    """Batch processing response"""
    success: bool = Field(description="Whether batch completed successfully")
    results: List[Union[AgentResponse, ErrorResponse]] = Field(description="Individual results")
    total_requests: int = Field(ge=0, description="Total requests processed")
    successful_requests: int = Field(ge=0, description="Successful requests")
    failed_requests: int = Field(ge=0, description="Failed requests")
    total_execution_time: float = Field(ge=0.0, description="Total execution time")
    batch_id: str = Field(description="Unique batch identifier")