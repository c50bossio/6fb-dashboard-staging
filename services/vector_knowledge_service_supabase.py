#!/usr/bin/env python3
"""
Vector Knowledge Service - Supabase Edition
Enhanced RAG System using Supabase PostgreSQL with pgvector
Provides intelligent knowledge retrieval using vector embeddings and semantic search
"""

import asyncio
import json
import logging
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
import hashlib
import uuid

import numpy as np
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    SentenceTransformer = None

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    openai = None

from dataclasses import dataclass, asdict
import redis

# Import unified Supabase client
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lib.supabase_client import get_supabase_client, DatabaseResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessKnowledgeType(str, Enum):
    """Types of business knowledge in the system"""
    BUSINESS_METHODOLOGY = "business_methodology"
    OPERATIONAL_PROCEDURE = "operational_procedure"
    MARKETING_STRATEGY = "marketing_strategy"
    FINANCIAL_GUIDELINE = "financial_guideline"
    CUSTOMER_SERVICE = "customer_service"
    TECHNICAL_DOCUMENTATION = "technical_documentation"
    TRAINING_MATERIAL = "training_material"
    COMPLIANCE_DOCUMENT = "compliance_document"

@dataclass
class KnowledgeDocument:
    """Represents a knowledge document in the vector database"""
    id: str
    title: str
    content: str
    knowledge_type: BusinessKnowledgeType
    source: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    created_at: datetime = None
    updated_at: datetime = None
    is_active: bool = True
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat() if self.created_at else None
        data['updated_at'] = self.updated_at.isoformat() if self.updated_at else None
        data['knowledge_type'] = self.knowledge_type.value if isinstance(self.knowledge_type, BusinessKnowledgeType) else self.knowledge_type
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'KnowledgeDocument':
        """Create from dictionary"""
        if 'created_at' in data and data['created_at']:
            data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
        if isinstance(data.get('knowledge_type'), str):
            data['knowledge_type'] = BusinessKnowledgeType(data['knowledge_type'])
        return cls(**data)

@dataclass
class KnowledgeSearchResult:
    """Result from knowledge search"""
    document: KnowledgeDocument
    relevance_score: float
    matched_sections: List[str]
    context_summary: str

class VectorKnowledgeServiceSupabase:
    """
    Advanced Vector Knowledge Service with Supabase PostgreSQL + pgvector
    Provides intelligent knowledge retrieval for the AI agent system
    """
    
    def __init__(self, 
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
                 redis_host: str = "localhost",
                 redis_port: int = 6379,
                 redis_db: int = 2,
                 cache_ttl: int = 3600,
                 use_openai_embeddings: bool = True):
        """Initialize vector knowledge service with Supabase backend"""
        
        self.embedding_model_name = embedding_model
        self.embedding_model = None
        self.supabase_client = get_supabase_client()
        self.redis_client = None
        self.cache_ttl = cache_ttl
        self.use_openai_embeddings = use_openai_embeddings and OPENAI_AVAILABLE
        
        # Initialize Redis connection for caching
        try:
            self.redis_client = redis.Redis(
                host=redis_host, 
                port=redis_port, 
                db=redis_db,
                decode_responses=False  # We'll handle binary data for embeddings
            )
            self.redis_client.ping()
            logger.info("✅ Vector Knowledge Service: Redis connection established")
        except Exception as e:
            logger.warning(f"⚠️ Vector Knowledge Service: Redis unavailable ({e}), using memory cache")
            self.redis_client = None
        
        # Initialize embedding model
        self._initialize_embedding_model()
        
        # Memory cache fallback
        self._memory_cache = {}
        self._cache_timestamps = {}
        
        logger.info("✅ Vector Knowledge Service (Supabase) initialized successfully")
    
    def _initialize_embedding_model(self):
        """Initialize the embedding model"""
        if self.use_openai_embeddings:
            # Use OpenAI embeddings (more accurate, requires API key)
            openai_api_key = os.getenv('OPENAI_API_KEY')
            if openai_api_key:
                openai.api_key = openai_api_key
                logger.info("✅ Using OpenAI embeddings (text-embedding-3-small)")
                return
            else:
                logger.warning("⚠️ OpenAI API key not found, falling back to SentenceTransformers")
        
        # Fall back to SentenceTransformers
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer(self.embedding_model_name)
                logger.info(f"✅ Loaded embedding model: {self.embedding_model_name}")
            except Exception as e:
                logger.error(f"❌ Failed to load embedding model: {e}")
                raise
        else:
            logger.error("❌ Neither OpenAI nor SentenceTransformers available for embeddings")
            raise ImportError("No embedding provider available")
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI or SentenceTransformers"""
        try:
            if self.use_openai_embeddings and openai.api_key:
                # Use OpenAI embeddings
                response = await openai.embeddings.acreate(
                    model="text-embedding-3-small",
                    input=text.replace("\n", " ")
                )
                return response.data[0].embedding
            elif self.embedding_model:
                # Use SentenceTransformers
                embedding = self.embedding_model.encode(text, convert_to_tensor=False)
                return embedding.tolist() if hasattr(embedding, 'tolist') else embedding
            else:
                raise ValueError("No embedding model available")
                
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    async def add_knowledge_document(
        self,
        title: str,
        content: str,
        knowledge_type: str,
        source: str,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Add a new knowledge document to Supabase"""
        try:
            # Generate embedding for the content
            embedding = await self.generate_embedding(content)
            
            # Store in Supabase
            result = await self.supabase_client.create_knowledge_document(
                title=title,
                content=content,
                knowledge_type=knowledge_type,
                source=source,
                embedding=embedding,
                metadata=metadata or {}
            )
            
            if result.success:
                logger.info(f"✅ Added knowledge document: '{title}'")
                return True
            else:
                logger.error(f"Failed to add knowledge document: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Error adding knowledge document: {e}")
            return False
    
    async def search_knowledge(
        self,
        query: str,
        knowledge_type: Optional[str] = None,
        max_results: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[KnowledgeSearchResult]:
        """Search knowledge documents using vector similarity"""
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query)
            
            # Search in Supabase using vector similarity
            result = await self.supabase_client.search_knowledge_documents(
                query_embedding=query_embedding,
                similarity_threshold=similarity_threshold,
                max_results=max_results,
                knowledge_type=knowledge_type
            )
            
            if not result.success:
                logger.error(f"Knowledge search failed: {result.error}")
                return []
            
            # Convert results to KnowledgeSearchResult objects
            search_results = []
            for doc_data in result.data:
                try:
                    # Create KnowledgeDocument from database data
                    knowledge_doc = KnowledgeDocument(
                        id=doc_data['id'],
                        title=doc_data['title'],
                        content=doc_data['content'],
                        knowledge_type=BusinessKnowledgeType(doc_data['knowledge_type']),
                        source=doc_data['source'],
                        metadata=doc_data.get('metadata', {}),
                        embedding=None  # Don't need to return embeddings
                    )
                    
                    # Extract matched sections (simplified - you could enhance this)
                    matched_sections = self._extract_relevant_sections(
                        doc_data['content'], 
                        query
                    )
                    
                    # Create context summary
                    context_summary = self._generate_context_summary(
                        doc_data['content'],
                        query
                    )
                    
                    search_result = KnowledgeSearchResult(
                        document=knowledge_doc,
                        relevance_score=doc_data.get('similarity', 0.0),
                        matched_sections=matched_sections,
                        context_summary=context_summary
                    )
                    
                    search_results.append(search_result)
                    
                except Exception as e:
                    logger.warning(f"Error processing search result: {e}")
                    continue
            
            logger.info(f"✅ Found {len(search_results)} knowledge documents for query: '{query[:50]}...'")
            return search_results
            
        except Exception as e:
            logger.error(f"Error searching knowledge: {e}")
            return []
    
    def _extract_relevant_sections(self, content: str, query: str) -> List[str]:
        """Extract sections of content most relevant to the query"""
        # Simple implementation - split by paragraphs and find relevant ones
        paragraphs = content.split('\n\n')
        query_words = set(query.lower().split())
        
        relevant_sections = []
        for paragraph in paragraphs:
            if len(paragraph.strip()) < 20:  # Skip very short paragraphs
                continue
                
            paragraph_words = set(paragraph.lower().split())
            overlap = len(query_words.intersection(paragraph_words))
            
            if overlap >= 1:  # At least one word match
                relevant_sections.append(paragraph.strip())
        
        # Return top 3 most relevant sections
        return relevant_sections[:3]
    
    def _generate_context_summary(self, content: str, query: str) -> str:
        """Generate a brief summary of how the content relates to the query"""
        # Simple implementation - you could enhance this with AI
        content_preview = content[:200] + "..." if len(content) > 200 else content
        return f"Document contains information relevant to '{query}': {content_preview}"
    
    async def get_all_knowledge_documents(
        self,
        knowledge_type: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100
    ) -> List[KnowledgeDocument]:
        """Get all knowledge documents with optional filters"""
        try:
            result = await self.supabase_client.get_knowledge_documents(
                knowledge_type=knowledge_type,
                source=source,
                limit=limit
            )
            
            if not result.success:
                logger.error(f"Failed to get knowledge documents: {result.error}")
                return []
            
            documents = []
            for doc_data in result.data:
                try:
                    doc = KnowledgeDocument(
                        id=doc_data['id'],
                        title=doc_data['title'],
                        content=doc_data['content'],
                        knowledge_type=BusinessKnowledgeType(doc_data['knowledge_type']),
                        source=doc_data['source'],
                        metadata=doc_data.get('metadata', {}),
                        created_at=datetime.fromisoformat(doc_data['created_at'].replace('Z', '+00:00')),
                        updated_at=datetime.fromisoformat(doc_data['updated_at'].replace('Z', '+00:00')),
                        is_active=doc_data.get('is_active', True)
                    )
                    documents.append(doc)
                except Exception as e:
                    logger.warning(f"Error processing document: {e}")
                    continue
            
            logger.info(f"✅ Retrieved {len(documents)} knowledge documents")
            return documents
            
        except Exception as e:
            logger.error(f"Error getting knowledge documents: {e}")
            return []
    
    async def update_knowledge_document(
        self,
        document_id: str,
        title: Optional[str] = None,
        content: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """Update an existing knowledge document"""
        try:
            update_data = {}
            
            if title:
                update_data['title'] = title
            if content:
                update_data['content'] = content
                # Regenerate embedding if content changed
                update_data['embedding'] = await self.generate_embedding(content)
            if metadata:
                update_data['metadata'] = metadata
            
            if not update_data:
                return False
            
            result = await self.supabase_client.execute_query(
                table_name='knowledge_documents',
                operation='update',
                data=update_data,
                filters={'id': document_id}
            )
            
            if result.success:
                logger.info(f"✅ Updated knowledge document: {document_id}")
                return True
            else:
                logger.error(f"Failed to update knowledge document: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating knowledge document: {e}")
            return False
    
    async def delete_knowledge_document(self, document_id: str) -> bool:
        """Delete a knowledge document (soft delete by setting is_active=false)"""
        try:
            result = await self.supabase_client.execute_query(
                table_name='knowledge_documents',
                operation='update',
                data={'is_active': False},
                filters={'id': document_id}
            )
            
            if result.success:
                logger.info(f"✅ Deleted knowledge document: {document_id}")
                return True
            else:
                logger.error(f"Failed to delete knowledge document: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting knowledge document: {e}")
            return False
    
    async def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        try:
            # Get total count
            total_result = await self.supabase_client.get_table_count('knowledge_documents')
            total_docs = total_result.count if total_result.success else 0
            
            # Get documents by type (simplified - you could enhance this)
            all_docs = await self.get_all_knowledge_documents()
            type_counts = {}
            for doc in all_docs:
                doc_type = doc.knowledge_type.value
                type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
            
            return {
                'total_documents': total_docs,
                'active_documents': len([d for d in all_docs if d.is_active]),
                'documents_by_type': type_counts,
                'embedding_model': 'OpenAI text-embedding-3-small' if self.use_openai_embeddings else self.embedding_model_name,
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting knowledge stats: {e}")
            return {'error': str(e)}
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the vector knowledge service"""
        try:
            # Test Supabase connection
            health_result = await self.supabase_client.health_check()
            
            # Test embedding generation
            try:
                test_embedding = await self.generate_embedding("test query")
                embedding_status = "working"
                embedding_dimension = len(test_embedding)
            except Exception as e:
                embedding_status = f"error: {e}"
                embedding_dimension = 0
            
            # Test Redis cache
            cache_status = "unavailable"
            if self.redis_client:
                try:
                    self.redis_client.ping()
                    cache_status = "connected"
                except:
                    cache_status = "disconnected"
            
            if health_result.success:
                return {
                    'status': 'healthy',
                    'database': 'connected',
                    'embedding_service': embedding_status,
                    'embedding_dimension': embedding_dimension,
                    'cache': cache_status,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'database': 'disconnected',
                    'error': health_result.error,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

# ==========================================
# SINGLETON INSTANCE AND UTILITIES
# ==========================================

_vector_knowledge_service = None

def get_vector_knowledge_service() -> VectorKnowledgeServiceSupabase:
    """Get the singleton vector knowledge service instance"""
    global _vector_knowledge_service
    if _vector_knowledge_service is None:
        _vector_knowledge_service = VectorKnowledgeServiceSupabase()
    return _vector_knowledge_service

# Convenience functions for backward compatibility
async def search_knowledge_documents(query: str, knowledge_type: Optional[str] = None, max_results: int = 10) -> List[KnowledgeSearchResult]:
    """Search knowledge documents"""
    service = get_vector_knowledge_service()
    return await service.search_knowledge(query, knowledge_type, max_results)

async def add_knowledge_document(title: str, content: str, knowledge_type: str, source: str, metadata: Optional[Dict] = None) -> bool:
    """Add a knowledge document"""
    service = get_vector_knowledge_service()
    return await service.add_knowledge_document(title, content, knowledge_type, source, metadata)

async def initialize_sample_knowledge():
    """Initialize the knowledge base with sample documents"""
    service = get_vector_knowledge_service()
    
    sample_documents = [
        {
            'title': 'Six Figure Barber Revenue Strategies',
            'content': """
            The Six Figure Barber methodology focuses on premium service delivery and strategic business growth. 
            Key revenue strategies include:
            
            1. Premium Pricing Model: Charge based on value, not time
            2. Service Upselling: Offer complementary services like beard trims, styling products
            3. Membership Programs: Monthly subscriptions for regular clients
            4. Peak Hour Optimization: Dynamic pricing during high-demand periods
            5. Product Sales Integration: Retail high-quality grooming products
            6. Corporate Partnerships: Contract services for business professionals
            7. Social Media Marketing: Build brand presence to attract premium clients
            
            Focus on client experience over volume. One premium client paying $100 is more valuable 
            than five budget clients paying $20 each.
            """,
            'knowledge_type': 'business_methodology',
            'source': 'Six Figure Barber Manual',
            'metadata': {'priority': 'high', 'category': 'revenue'}
        },
        {
            'title': 'Customer Retention Best Practices',
            'content': """
            Effective customer retention strategies for barbershops:
            
            1. Consistent Quality: Deliver the same excellent experience every visit
            2. Personal Touch: Remember client preferences, names, and details
            3. Follow-up Communication: Text reminders, thank you messages
            4. Loyalty Rewards: Points system, discounts for frequent visits
            5. Flexible Scheduling: Easy online booking, convenient time slots
            6. Clean Environment: Maintain spotless shop and equipment
            7. Staff Training: Continuous education on customer service
            8. Feedback Collection: Regular surveys and improvement implementation
            
            A 5% increase in customer retention can increase profits by 25-95%.
            """,
            'knowledge_type': 'customer_service',
            'source': 'Customer Success Playbook',
            'metadata': {'priority': 'high', 'category': 'retention'}
        },
        {
            'title': 'Operational Efficiency Guidelines',
            'content': """
            Maximize barbershop operational efficiency:
            
            1. Appointment Scheduling: Use booking software to minimize gaps
            2. Inventory Management: Track product usage and reorder automatically
            3. Staff Utilization: Cross-train barbers for flexibility
            4. Time Management: Standardize service durations, include prep time
            5. Equipment Maintenance: Regular cleaning and servicing schedule
            6. Process Documentation: Written procedures for all operations
            7. Performance Metrics: Track chair utilization, service times, revenue per hour
            8. Technology Integration: POS systems, digital payments, online booking
            
            Aim for 85%+ chair utilization during peak hours.
            """,
            'knowledge_type': 'operational_procedure',
            'source': 'Operations Excellence Manual',
            'metadata': {'priority': 'medium', 'category': 'efficiency'}
        }
    ]
    
    for doc in sample_documents:
        success = await service.add_knowledge_document(**doc)
        if success:
            logger.info(f"✅ Added sample document: {doc['title']}")
        else:
            logger.error(f"❌ Failed to add sample document: {doc['title']}")

if __name__ == "__main__":
    # Test the service
    async def test_service():
        service = get_vector_knowledge_service()
        health = await service.health_check()
        print(f"Vector Knowledge Service Health: {health}")
        
        # Test search
        results = await service.search_knowledge("how to increase revenue", max_results=3)
        print(f"Search results: {len(results)}")
        for result in results:
            print(f"- {result.document.title} (relevance: {result.relevance_score:.2f})")
    
    asyncio.run(test_service())