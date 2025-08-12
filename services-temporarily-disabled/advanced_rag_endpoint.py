"""
Advanced RAG System FastAPI Endpoint
Integrates Enhanced Business Knowledge Service with FastAPI backend
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

# Import our enhanced business knowledge service
from .enhanced_business_knowledge_service import (
    EnhancedBusinessKnowledgeService,
    BusinessDomain,
    KnowledgeSource,
    KnowledgeQueryContext,
    enhanced_business_knowledge_service
)

logger = logging.getLogger(__name__)

# Create FastAPI router
router = APIRouter(prefix="/enhanced-knowledge", tags=["Advanced RAG"])

# Pydantic models for API
class KnowledgeQuery(BaseModel):
    query: str = Field(..., description="The query to search for")
    context: Dict[str, Any] = Field(default_factory=dict, description="Business context for the query")
    user_id: Optional[str] = Field(None, description="User ID for personalization")
    domains: Optional[List[str]] = Field(None, description="Preferred business domains")
    limit: Optional[int] = Field(5, description="Maximum number of results")

class KnowledgeDocument(BaseModel):
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content")
    summary: str = Field(..., description="Document summary")
    domain: str = Field(..., description="Business domain")
    source: str = Field(..., description="Knowledge source")
    confidence_score: float = Field(..., description="Confidence score")
    relevance_tags: List[str] = Field(default_factory=list, description="Relevance tags")
    business_metrics: Dict[str, Any] = Field(default_factory=dict, description="Business metrics")

class KnowledgeStoreRequest(BaseModel):
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document content") 
    summary: str = Field(..., description="Document summary")
    domain: str = Field(..., description="Business domain")
    knowledge_type: str = Field(..., description="Knowledge type")
    source: str = Field(..., description="Knowledge source")
    confidence_score: float = Field(..., description="Confidence score")
    relevance_tags: List[str] = Field(default_factory=list, description="Relevance tags")
    business_metrics: Dict[str, Any] = Field(default_factory=dict, description="Business metrics")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class KnowledgeRetrievalResponse(BaseModel):
    success: bool = Field(..., description="Success status")
    documents: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved documents")
    relevance_scores: List[float] = Field(default_factory=list, description="Relevance scores")
    context_summary: str = Field(..., description="Context summary")
    knowledge_gaps: List[str] = Field(default_factory=list, description="Identified knowledge gaps")
    recommended_actions: List[str] = Field(default_factory=list, description="Recommended actions")
    key_insights: List[str] = Field(default_factory=list, description="Key insights")
    total_confidence: float = Field(..., description="Total confidence score")
    processing_time: float = Field(..., description="Processing time in seconds")
    rag_metadata: Dict[str, Any] = Field(default_factory=dict, description="RAG system metadata")

@router.post("/retrieve", response_model=KnowledgeRetrievalResponse)
async def retrieve_contextual_knowledge(request: KnowledgeQuery):
    """
    Retrieve contextual knowledge using Advanced RAG system
    """
    start_time = datetime.now()
    
    try:
        logger.info(f"🔍 Advanced RAG query: {request.query}")
        
        # Convert domains to BusinessDomain enums
        preferred_domains = []
        if request.domains:
            for domain_str in request.domains:
                try:
                    domain_enum = BusinessDomain(domain_str)
                    preferred_domains.append(domain_enum)
                except ValueError:
                    logger.warning(f"Invalid domain: {domain_str}")
        
        # Create query context
        query_context = KnowledgeQueryContext(
            business_context=request.context,
            query_intent="business_optimization",
            user_role=request.context.get("user_role"),
            session_history=request.context.get("session_history", []),
            preferred_domains=preferred_domains if preferred_domains else None
        )
        
        # Retrieve knowledge using enhanced service
        result = await enhanced_business_knowledge_service.retrieve_contextual_knowledge(
            request.query, 
            query_context
        )
        
        # Convert BusinessKnowledgeDocument objects to dictionaries
        documents_dict = []
        for doc in result.documents[:request.limit]:
            doc_dict = {
                'id': doc.id,
                'title': doc.title,
                'content': doc.content,
                'summary': doc.summary,
                'domain': doc.domain.value if hasattr(doc.domain, 'value') else str(doc.domain),
                'knowledge_type': doc.knowledge_type,
                'source': doc.source.value if hasattr(doc.source, 'value') else str(doc.source),
                'confidence_score': doc.confidence_score,
                'relevance_tags': doc.relevance_tags,
                'business_metrics': doc.business_metrics,
                'last_verified': doc.last_verified,
                'usage_count': doc.usage_count,
                'effectiveness_score': doc.effectiveness_score,
                'metadata': doc.metadata,
                'created_at': doc.created_at,
                'updated_at': doc.updated_at
            }
            documents_dict.append(doc_dict)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Generate key insights from retrieved documents
        key_insights = []
        if documents_dict:
            # Extract insights from business metrics
            all_metrics = {}
            for doc in documents_dict:
                for metric, value in doc.get('business_metrics', {}).items():
                    if isinstance(value, (int, float)) and value > 0:
                        all_metrics[metric] = all_metrics.get(metric, []) + [value]
            
            for metric, values in all_metrics.items():
                avg_value = sum(values) / len(values)
                if avg_value > 15:
                    key_insights.append(f"Industry data shows {metric.replace('_', ' ')} can be improved by average {avg_value:.0f}%")
        
        # Add query-specific insights
        query_lower = request.query.lower()
        if 'revenue' in query_lower or 'profit' in query_lower:
            key_insights.append("Revenue optimization through premium services shows highest ROI potential")
        if 'customer' in query_lower:
            key_insights.append("Customer retention strategies consistently outperform acquisition in long-term value")
        
        response_data = KnowledgeRetrievalResponse(
            success=True,
            documents=documents_dict,
            relevance_scores=result.relevance_scores,
            context_summary=result.context_summary,
            knowledge_gaps=result.knowledge_gaps,
            recommended_actions=result.recommended_actions,
            key_insights=key_insights[:4],  # Limit to 4 insights
            total_confidence=result.total_confidence,
            processing_time=processing_time,
            rag_metadata={
                'query_processed': request.query,
                'documents_retrieved': len(documents_dict),
                'domains_analyzed': list(set([doc['domain'] for doc in documents_dict])),
                'average_confidence': result.total_confidence,
                'processing_method': 'enhanced_business_knowledge_service',
                'context_enhanced': bool(request.context),
                'user_personalized': bool(request.user_id)
            }
        )
        
        logger.info(f"✅ Advanced RAG completed: {len(documents_dict)} documents, {processing_time:.2f}s")
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Advanced RAG retrieval failed: {e}")
        
        # Return fallback response
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return KnowledgeRetrievalResponse(
            success=False,
            documents=[],
            relevance_scores=[],
            context_summary=f"Knowledge retrieval temporarily unavailable: {str(e)}",
            knowledge_gaps=["Service temporarily limited"],
            recommended_actions=[
                "Try rephrasing your question",
                "Check system status",
                "Contact support if problem persists"
            ],
            key_insights=["Advanced RAG system is initializing"],
            total_confidence=0.3,
            processing_time=processing_time,
            rag_metadata={
                'query_processed': request.query,
                'processing_method': 'fallback',
                'error': str(e)
            }
        )

@router.post("/store")
async def store_enhanced_knowledge(request: KnowledgeStoreRequest):
    """
    Store new business knowledge in the enhanced system
    """
    try:
        logger.info(f"📝 Storing enhanced knowledge: {request.title}")
        
        # Convert string domain to BusinessDomain enum
        try:
            domain_enum = BusinessDomain(request.domain)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid domain: {request.domain}")
        
        # Convert string source to KnowledgeSource enum  
        try:
            source_enum = KnowledgeSource(request.source)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid source: {request.source}")
        
        # Store the knowledge
        knowledge_id = await enhanced_business_knowledge_service.store_enhanced_knowledge(
            title=request.title,
            content=request.content,
            summary=request.summary,
            domain=domain_enum,
            knowledge_type=request.knowledge_type,
            source=source_enum,
            confidence_score=request.confidence_score,
            relevance_tags=request.relevance_tags,
            business_metrics=request.business_metrics,
            metadata=request.metadata
        )
        
        logger.info(f"✅ Knowledge stored with ID: {knowledge_id}")
        
        return {
            'success': True,
            'knowledge_id': knowledge_id,
            'message': 'Knowledge stored successfully',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Knowledge storage failed: {e}")
        raise HTTPException(status_code=500, detail=f"Storage failed: {str(e)}")

@router.get("/status")
async def get_knowledge_system_status():
    """
    Get the status of the Advanced RAG system
    """
    try:
        # Get knowledge base status
        status = enhanced_business_knowledge_service.get_knowledge_status()
        
        # Add system information
        status.update({
            'rag_system': 'enhanced_business_knowledge',
            'version': '1.0.0',
            'capabilities': [
                'contextual_knowledge_retrieval',
                'business_domain_specialization', 
                'knowledge_graph_relationships',
                'adaptive_learning',
                'industry_benchmarking'
            ],
            'supported_domains': [domain.value for domain in BusinessDomain],
            'supported_sources': [source.value for source in KnowledgeSource],
            'timestamp': datetime.now().isoformat()
        })
        
        return {
            'success': True,
            'status': status
        }
        
    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'status': {
                'total_documents': 0,
                'status': 'error'
            }
        }

@router.get("/insights")
async def get_contextual_insights(query: str, context: str = "{}"):
    """
    Get contextual insights (compatibility endpoint for existing AI orchestrator)
    """
    try:
        # Parse context JSON
        try:
            context_dict = json.loads(context) if context else {}
        except json.JSONDecodeError:
            context_dict = {}
        
        # Use compatibility method
        insights = await enhanced_business_knowledge_service.get_contextual_insights(
            query, context_dict
        )
        
        return {
            'success': True,
            'insights': insights,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Insights retrieval failed: {e}")
        return {
            'success': False,
            'insights': {
                'relevant_knowledge': [],
                'key_insights': ['Service temporarily unavailable'],
                'context_summary': 'Unable to retrieve insights at this time',
                'knowledge_gaps': [],
                'total_confidence': 0.0
            },
            'error': str(e)
        }

@router.post("/initialize")
async def initialize_knowledge_base():
    """
    Initialize or reinitialize the knowledge base with default data
    """
    try:
        logger.info("🔄 Initializing Advanced RAG knowledge base...")
        
        # Reinitialize the service (loads default knowledge)
        await enhanced_business_knowledge_service._load_default_knowledge_base()
        
        # Get updated status
        status = enhanced_business_knowledge_service.get_knowledge_status()
        
        logger.info("✅ Knowledge base initialization completed")
        
        return {
            'success': True,
            'message': 'Knowledge base initialized successfully',
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Knowledge base initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")

# Health check endpoint
@router.get("/health")
async def health_check():
    """
    Health check for Advanced RAG system
    """
    try:
        # Quick status check
        status = enhanced_business_knowledge_service.get_knowledge_status()
        
        return {
            'status': 'healthy' if status.get('status') == 'operational' else 'degraded',
            'service': 'advanced_rag_system',
            'documents': status.get('total_documents', 0),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'service': 'advanced_rag_system',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }