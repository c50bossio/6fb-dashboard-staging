#!/usr/bin/env python3
"""
Vector Knowledge Service - Enhanced RAG System for 6FB AI Agent System
Provides intelligent knowledge retrieval using vector embeddings and semantic search
"""

import asyncio
import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple
from enum import Enum
import hashlib

import numpy as np
from sentence_transformers import SentenceTransformer
import redis
from dataclasses import dataclass, asdict
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessKnowledgeType(str, Enum):
    """Types of business knowledge in the system"""
    BARBERSHOP_OPERATIONS = "barbershop_operations"
    CUSTOMER_SERVICE = "customer_service"
    MARKETING_STRATEGIES = "marketing_strategies"
    FINANCIAL_MANAGEMENT = "financial_management"
    TECHNICAL_OPERATIONS = "technical_operations"
    BUSINESS_STRATEGY = "business_strategy"
    INDUSTRY_BEST_PRACTICES = "industry_best_practices"
    REGULATORY_COMPLIANCE = "regulatory_compliance"
    STAFF_MANAGEMENT = "staff_management"
    PRODUCT_INVENTORY = "product_inventory"
    GENERAL = "general"

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
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data and data['updated_at']:
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
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

class VectorKnowledgeService:
    """
    Advanced Vector Knowledge Service with RAG capabilities
    Provides intelligent knowledge retrieval for the AI agent system
    """
    
    def __init__(self, 
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
                 redis_host: str = "localhost",
                 redis_port: int = 6379,
                 redis_db: int = 2,
                 sqlite_path: str = "./data/vector_knowledge.db",
                 cache_ttl: int = 3600):
        """Initialize vector knowledge service"""
        
        self.embedding_model_name = embedding_model
        self.embedding_model = None
        self.redis_client = None
        self.sqlite_path = sqlite_path
        self.cache_ttl = cache_ttl
        
        # Initialize Redis connection
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
        
        # Initialize database
        self._initialize_database()
        
        # Initialize embedding model
        self._initialize_embedding_model()
        
        # Memory cache fallback
        self._memory_cache = {}
        self._cache_timestamps = {}
        
        logger.info("✅ Vector Knowledge Service initialized successfully")
    
    def _initialize_database(self):
        """Initialize SQLite database for knowledge storage"""
        os.makedirs(os.path.dirname(self.sqlite_path) if os.path.dirname(self.sqlite_path) else ".", exist_ok=True)
        
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        
        # Create knowledge documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS knowledge_documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                knowledge_type TEXT NOT NULL,
                source TEXT NOT NULL,
                metadata TEXT,
                embedding BLOB,
                created_at TEXT,
                updated_at TEXT
            )
        """)
        
        # Create indexes for better performance
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_documents(knowledge_type)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_source ON knowledge_documents(source)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_updated_at ON knowledge_documents(updated_at)")
        
        conn.commit()
        conn.close()
        
        logger.info(f"✅ Vector Knowledge database initialized at {self.sqlite_path}")
    
    def _initialize_embedding_model(self):
        """Initialize sentence transformer model"""
        try:
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            logger.info("✅ Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load embedding model: {e}")
            raise
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text"""
        if not self.embedding_model:
            raise ValueError("Embedding model not initialized")
        
        try:
            embedding = self.embedding_model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise
    
    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    def _get_cache_key(self, query: str, knowledge_type: Optional[BusinessKnowledgeType] = None) -> str:
        """Generate cache key for query"""
        key_data = f"knowledge_search:{query}:{knowledge_type.value if knowledge_type else 'all'}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _cache_get(self, key: str) -> Optional[List[KnowledgeSearchResult]]:
        """Get from cache (Redis or memory)"""
        try:
            if self.redis_client:
                cached_data = self.redis_client.get(f"vector_kb:{key}")
                if cached_data:
                    return pickle.loads(cached_data)
            else:
                # Memory cache fallback
                if key in self._memory_cache:
                    timestamp = self._cache_timestamps.get(key, 0)
                    if time.time() - timestamp < self.cache_ttl:
                        return self._memory_cache[key]
                    else:
                        # Clean expired entry
                        del self._memory_cache[key]
                        del self._cache_timestamps[key]
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        
        return None
    
    def _cache_set(self, key: str, value: List[KnowledgeSearchResult]):
        """Set in cache (Redis or memory)"""
        try:
            if self.redis_client:
                self.redis_client.setex(
                    f"vector_kb:{key}", 
                    self.cache_ttl, 
                    pickle.dumps(value)
                )
            else:
                # Memory cache fallback
                self._memory_cache[key] = value
                self._cache_timestamps[key] = time.time()
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
    
    async def add_knowledge_document(self, document: KnowledgeDocument) -> bool:
        """Add a new knowledge document to the vector database"""
        try:
            # Generate embedding for the document content
            if not document.embedding:
                document.embedding = self._generate_embedding(document.content)
            
            document.updated_at = datetime.now()
            
            # Store in SQLite
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO knowledge_documents 
                (id, title, content, knowledge_type, source, metadata, embedding, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                document.id,
                document.title,
                document.content,
                document.knowledge_type.value,
                document.source,
                json.dumps(document.metadata),
                pickle.dumps(document.embedding),
                document.created_at.isoformat(),
                document.updated_at.isoformat()
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Added knowledge document: {document.title}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error adding knowledge document: {e}")
            return False
    
    async def search_knowledge(self, 
                             query: str, 
                             knowledge_type: Optional[BusinessKnowledgeType] = None,
                             max_results: int = 5,
                             min_relevance: float = 0.3) -> List[KnowledgeSearchResult]:
        """
        Search knowledge base using semantic similarity
        
        Args:
            query: Search query
            knowledge_type: Optional filter by knowledge type
            max_results: Maximum number of results to return
            min_relevance: Minimum relevance score threshold
            
        Returns:
            List of relevant knowledge documents with scores
        """
        try:
            # Check cache first
            cache_key = self._get_cache_key(query, knowledge_type)
            cached_results = self._cache_get(cache_key)
            if cached_results:
                logger.info(f"✅ Knowledge cache HIT for query: {query[:50]}...")
                return cached_results[:max_results]
            
            # Generate query embedding
            query_embedding = self._generate_embedding(query)
            
            # Search database
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            
            # Build query with optional knowledge type filter
            sql_query = """
                SELECT id, title, content, knowledge_type, source, metadata, embedding, created_at, updated_at
                FROM knowledge_documents
            """
            params = []
            
            if knowledge_type:
                sql_query += " WHERE knowledge_type = ?"
                params.append(knowledge_type.value)
            
            cursor.execute(sql_query, params)
            rows = cursor.fetchall()
            conn.close()
            
            # Calculate similarities and rank results
            results = []
            for row in rows:
                try:
                    doc_embedding = pickle.loads(row[6]) if row[6] else None
                    if not doc_embedding:
                        continue
                    
                    similarity = self._calculate_similarity(query_embedding, doc_embedding)
                    
                    if similarity >= min_relevance:
                        # Create knowledge document
                        document = KnowledgeDocument(
                            id=row[0],
                            title=row[1],
                            content=row[2],
                            knowledge_type=BusinessKnowledgeType(row[3]),
                            source=row[4],
                            metadata=json.loads(row[5]) if row[5] else {},
                            embedding=doc_embedding,
                            created_at=datetime.fromisoformat(row[7]) if row[7] else None,
                            updated_at=datetime.fromisoformat(row[8]) if row[8] else None
                        )
                        
                        # Extract relevant sections (simplified - could be enhanced)
                        matched_sections = self._extract_relevant_sections(document.content, query)
                        context_summary = self._generate_context_summary(document.content, query)
                        
                        result = KnowledgeSearchResult(
                            document=document,
                            relevance_score=similarity,
                            matched_sections=matched_sections,
                            context_summary=context_summary
                        )
                        
                        results.append(result)
                        
                except Exception as e:
                    logger.warning(f"Error processing document {row[0]}: {e}")
                    continue
            
            # Sort by relevance score
            results.sort(key=lambda x: x.relevance_score, reverse=True)
            
            # Limit results
            final_results = results[:max_results]
            
            # Cache results
            self._cache_set(cache_key, final_results)
            
            logger.info(f"✅ Knowledge search completed: {len(final_results)} results for '{query[:50]}...'")
            return final_results
            
        except Exception as e:
            logger.error(f"❌ Error searching knowledge: {e}")
            return []
    
    def _extract_relevant_sections(self, content: str, query: str, max_sections: int = 3) -> List[str]:
        """Extract most relevant sections from document content"""
        try:
            # Simple sentence-based extraction (could be enhanced with more sophisticated NLP)
            sentences = [s.strip() for s in content.split('.') if len(s.strip()) > 20]
            query_words = set(query.lower().split())
            
            # Score sentences based on query word overlap
            scored_sentences = []
            for sentence in sentences:
                sentence_words = set(sentence.lower().split())
                overlap = len(query_words.intersection(sentence_words))
                if overlap > 0:
                    scored_sentences.append((sentence, overlap))
            
            # Sort by score and return top sections
            scored_sentences.sort(key=lambda x: x[1], reverse=True)
            return [sentence for sentence, _ in scored_sentences[:max_sections]]
            
        except Exception as e:
            logger.warning(f"Error extracting relevant sections: {e}")
            return [content[:200] + "..." if len(content) > 200 else content]
    
    def _generate_context_summary(self, content: str, query: str, max_length: int = 150) -> str:
        """Generate a context summary for the knowledge document"""
        try:
            # Simple summarization - find the most relevant paragraph
            paragraphs = [p.strip() for p in content.split('\n\n') if len(p.strip()) > 20]
            query_words = set(query.lower().split())
            
            best_paragraph = ""
            best_score = 0
            
            for paragraph in paragraphs:
                paragraph_words = set(paragraph.lower().split())
                overlap = len(query_words.intersection(paragraph_words))
                
                if overlap > best_score:
                    best_score = overlap
                    best_paragraph = paragraph
            
            # Truncate if too long
            if len(best_paragraph) > max_length:
                best_paragraph = best_paragraph[:max_length] + "..."
            
            return best_paragraph or content[:max_length] + "..."
            
        except Exception as e:
            logger.warning(f"Error generating context summary: {e}")
            return content[:max_length] + "..." if len(content) > max_length else content
    
    async def get_knowledge_by_type(self, knowledge_type: BusinessKnowledgeType) -> List[KnowledgeDocument]:
        """Get all knowledge documents of a specific type"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, title, content, knowledge_type, source, metadata, embedding, created_at, updated_at
                FROM knowledge_documents
                WHERE knowledge_type = ?
                ORDER BY updated_at DESC
            """, (knowledge_type.value,))
            
            rows = cursor.fetchall()
            conn.close()
            
            documents = []
            for row in rows:
                doc = KnowledgeDocument(
                    id=row[0],
                    title=row[1],
                    content=row[2],
                    knowledge_type=BusinessKnowledgeType(row[3]),
                    source=row[4],
                    metadata=json.loads(row[5]) if row[5] else {},
                    embedding=pickle.loads(row[6]) if row[6] else None,
                    created_at=datetime.fromisoformat(row[7]) if row[7] else None,
                    updated_at=datetime.fromisoformat(row[8]) if row[8] else None
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            logger.error(f"Error getting knowledge by type: {e}")
            return []
    
    async def delete_knowledge_document(self, document_id: str) -> bool:
        """Delete a knowledge document"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM knowledge_documents WHERE id = ?", (document_id,))
            deleted = cursor.rowcount > 0
            
            conn.commit()
            conn.close()
            
            if deleted:
                logger.info(f"✅ Deleted knowledge document: {document_id}")
            
            return deleted
            
        except Exception as e:
            logger.error(f"Error deleting knowledge document: {e}")
            return False
    
    async def get_knowledge_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge base"""
        try:
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            
            # Total documents
            cursor.execute("SELECT COUNT(*) FROM knowledge_documents")
            total_docs = cursor.fetchone()[0]
            
            # Documents by type
            cursor.execute("""
                SELECT knowledge_type, COUNT(*) 
                FROM knowledge_documents 
                GROUP BY knowledge_type
            """)
            docs_by_type = dict(cursor.fetchall())
            
            # Recent additions (last 7 days)
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute("""
                SELECT COUNT(*) FROM knowledge_documents 
                WHERE created_at > ?
            """, (week_ago,))
            recent_additions = cursor.fetchone()[0]
            
            conn.close()
            
            return {
                "total_documents": total_docs,
                "documents_by_type": docs_by_type,
                "recent_additions_7d": recent_additions,
                "embedding_model": self.embedding_model_name,
                "cache_enabled": self.redis_client is not None,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting knowledge stats: {e}")
            return {}
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the vector knowledge service"""
        try:
            health_status = {
                "service": "vector_knowledge",
                "status": "healthy",
                "embedding_model": self.embedding_model_name,
                "database_path": self.sqlite_path,
                "cache_enabled": False,
                "timestamp": datetime.now().isoformat()
            }
            
            # Test database connection
            conn = sqlite3.connect(self.sqlite_path)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM knowledge_documents")
            doc_count = cursor.fetchone()[0]
            conn.close()
            
            health_status["total_documents"] = doc_count
            
            # Test Redis connection if available
            if self.redis_client:
                try:
                    self.redis_client.ping()
                    health_status["cache_enabled"] = True
                except:
                    health_status["cache_enabled"] = False
            
            # Test embedding model
            if self.embedding_model:
                test_embedding = self._generate_embedding("test")
                health_status["embedding_dimensions"] = len(test_embedding)
            
            return health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                "service": "vector_knowledge",
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

# Global service instance
vector_knowledge_service = None

def get_vector_knowledge_service() -> VectorKnowledgeService:
    """Get or create global vector knowledge service instance"""
    global vector_knowledge_service
    if vector_knowledge_service is None:
        vector_knowledge_service = VectorKnowledgeService()
    return vector_knowledge_service

# For backwards compatibility
def get_enhanced_business_knowledge_service():
    """Alias for backwards compatibility"""
    return get_vector_knowledge_service()

if __name__ == "__main__":
    # Test the vector knowledge service
    async def test_vector_knowledge():
        service = VectorKnowledgeService()
        
        print("=== Testing Vector Knowledge Service ===")
        
        # Test health check
        health = await service.health_check()
        print(f"Health status: {health}")
        
        # Test adding a document
        test_doc = KnowledgeDocument(
            id="test_doc_1",
            title="Barbershop Customer Service Best Practices",
            content="Provide excellent customer service by greeting customers warmly, understanding their needs, and ensuring they leave satisfied. Always follow up after service.",
            knowledge_type=BusinessKnowledgeType.CUSTOMER_SERVICE,
            source="internal_training",
            metadata={"category": "training", "priority": "high"}
        )
        
        await service.add_knowledge_document(test_doc)
        print("✅ Test document added")
        
        # Test search
        results = await service.search_knowledge("customer service greeting")
        print(f"Search results: {len(results)}")
        for result in results:
            print(f"  - {result.document.title} (score: {result.relevance_score:.3f})")
        
        # Test stats
        stats = await service.get_knowledge_stats()
        print(f"Knowledge base stats: {stats}")
    
    # Run test
    asyncio.run(test_vector_knowledge())