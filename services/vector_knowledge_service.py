"""
Vector Knowledge Service
Implements RAG (Retrieval-Augmented Generation) system for business knowledge storage and retrieval
"""

import asyncio
import json
import logging
import os
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
import sqlite3
import numpy as np

# Vector database imports
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

# Embedding imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class BusinessKnowledge:
    """Represents a piece of business knowledge"""
    id: str
    content: str
    knowledge_type: str
    source: str
    metadata: Dict[str, Any]
    embedding: Optional[List[float]] = None
    created_at: str = None
    updated_at: str = None

class BusinessKnowledgeType:
    """Types of business knowledge we store"""
    CUSTOMER_INSIGHTS = "customer_insights"
    SERVICE_PERFORMANCE = "service_performance"
    REVENUE_PATTERNS = "revenue_patterns"
    SCHEDULING_ANALYTICS = "scheduling_analytics"
    MARKETING_EFFECTIVENESS = "marketing_effectiveness"
    OPERATIONAL_BEST_PRACTICES = "operational_best_practices"
    CUSTOMER_FEEDBACK = "customer_feedback"
    BUSINESS_METRICS = "business_metrics"

class VectorKnowledgeService:
    """
    Manages business knowledge storage and retrieval using vector embeddings
    """
    
    def __init__(self, persist_directory: str = "./data/chroma_db"):
        self.persist_directory = persist_directory
        self.collection_name = "barbershop_knowledge"
        self.embedding_model = "text-embedding-3-small"  # OpenAI's efficient embedding model
        self.client = None
        self.collection = None
        self.openai_client = None
        
        # Initialize services
        self.setup_vector_database()
        self.setup_embedding_service()
        
    def setup_vector_database(self):
        """Initialize ChromaDB vector database"""
        if not CHROMADB_AVAILABLE:
            logger.warning("ChromaDB not available, using in-memory fallback")
            self.client = None
            return
            
        try:
            os.makedirs(self.persist_directory, exist_ok=True)
            
            # Initialize ChromaDB client
            self.client = chromadb.PersistentClient(
                path=self.persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Get or create collection
            try:
                self.collection = self.client.get_collection(
                    name=self.collection_name
                )
                logger.info(f"✅ Connected to existing ChromaDB collection: {self.collection_name}")
            except:
                self.collection = self.client.create_collection(
                    name=self.collection_name,
                    metadata={"description": "Barbershop business knowledge and insights"}
                )
                logger.info(f"✅ Created new ChromaDB collection: {self.collection_name}")
                
        except Exception as e:
            logger.error(f"⚠️ ChromaDB setup failed: {e}")
            self.client = None
            
    def setup_embedding_service(self):
        """Initialize OpenAI embedding service"""
        if not OPENAI_AVAILABLE:
            logger.warning("OpenAI not available for embeddings")
            return
            
        try:
            openai_key = os.getenv('OPENAI_API_KEY')
            if openai_key:
                self.openai_client = openai.AsyncOpenAI(api_key=openai_key)
                logger.info("✅ OpenAI embedding service initialized")
            else:
                logger.warning("⚠️ OpenAI API key not found")
        except Exception as e:
            logger.error(f"⚠️ OpenAI setup failed: {e}")
            
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        if not self.openai_client:
            # Return mock embedding for development
            return self._generate_mock_embedding(text)
            
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text,
                encoding_format="float"
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            return self._generate_mock_embedding(text)
    
    def _generate_mock_embedding(self, text: str) -> List[float]:
        """Generate mock embedding for development/testing"""
        # Create deterministic embedding based on text hash
        text_hash = hashlib.md5(text.encode()).hexdigest()
        
        # Convert hash to numbers and normalize
        embedding = []
        for i in range(0, len(text_hash), 2):
            hex_pair = text_hash[i:i+2]
            value = int(hex_pair, 16) / 255.0  # Normalize to 0-1
            embedding.append(value * 2 - 1)  # Convert to -1 to 1 range
            
        # Pad or truncate to standard embedding size (384 for text-embedding-3-small)
        target_size = 384
        while len(embedding) < target_size:
            embedding.extend(embedding[:min(len(embedding), target_size - len(embedding))])
        
        return embedding[:target_size]
    
    def _generate_knowledge_id(self, content: str, knowledge_type: str) -> str:
        """Generate unique ID for knowledge item"""
        content_hash = hashlib.md5(f"{content}:{knowledge_type}".encode()).hexdigest()
        return f"{knowledge_type}_{content_hash[:12]}"
    
    async def store_knowledge(self, 
                            content: str, 
                            knowledge_type: str, 
                            source: str = "system",
                            metadata: Dict[str, Any] = None) -> str:
        """Store business knowledge with vector embedding"""
        
        if metadata is None:
            metadata = {}
            
        # Generate ID and embedding
        knowledge_id = self._generate_knowledge_id(content, knowledge_type)
        embedding = await self.generate_embedding(content)
        
        # Create knowledge object
        knowledge = BusinessKnowledge(
            id=knowledge_id,
            content=content,
            knowledge_type=knowledge_type,
            source=source,
            metadata=metadata,
            embedding=embedding,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        # Store in vector database
        if self.collection:
            try:
                self.collection.upsert(
                    ids=[knowledge_id],
                    embeddings=[embedding],
                    documents=[content],
                    metadatas=[{
                        "knowledge_type": knowledge_type,
                        "source": source,
                        "created_at": knowledge.created_at,
                        **metadata
                    }]
                )
                logger.info(f"✅ Stored knowledge: {knowledge_id}")
            except Exception as e:
                logger.error(f"Failed to store knowledge in ChromaDB: {e}")
        
        # Also store in local SQLite for backup
        await self._store_in_sqlite(knowledge)
        
        return knowledge_id
    
    async def _store_in_sqlite(self, knowledge: BusinessKnowledge):
        """Store knowledge in SQLite backup"""
        try:
            os.makedirs("./data", exist_ok=True)
            
            conn = sqlite3.connect("./data/knowledge_backup.db")
            cursor = conn.cursor()
            
            # Create table if not exists
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS business_knowledge (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    knowledge_type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    metadata TEXT,
                    embedding TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            # Insert or update knowledge
            cursor.execute("""
                INSERT OR REPLACE INTO business_knowledge 
                (id, content, knowledge_type, source, metadata, embedding, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge.id,
                knowledge.content,
                knowledge.knowledge_type,
                knowledge.source,
                json.dumps(knowledge.metadata),
                json.dumps(knowledge.embedding) if knowledge.embedding else None,
                knowledge.created_at,
                knowledge.updated_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"SQLite backup storage failed: {e}")
    
    async def retrieve_relevant_knowledge(self, 
                                        query: str, 
                                        knowledge_types: List[str] = None,
                                        limit: int = 5) -> List[BusinessKnowledge]:
        """Retrieve relevant business knowledge for a query"""
        
        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        
        relevant_knowledge = []
        
        # Query vector database
        if self.collection:
            try:
                # Build where clause for knowledge types
                where_clause = None
                if knowledge_types:
                    where_clause = {"knowledge_type": {"$in": knowledge_types}}
                
                results = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=limit,
                    where=where_clause,
                    include=["documents", "metadatas", "distances"]
                )
                
                # Convert results to BusinessKnowledge objects
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]
                    
                    knowledge = BusinessKnowledge(
                        id=f"retrieved_{i}",
                        content=doc,
                        knowledge_type=metadata.get('knowledge_type', 'unknown'),
                        source=metadata.get('source', 'unknown'),
                        metadata={**metadata, 'similarity_score': 1 - distance}
                    )
                    relevant_knowledge.append(knowledge)
                    
            except Exception as e:
                logger.error(f"Vector retrieval failed: {e}")
        
        # Fallback to SQLite if vector DB fails
        if not relevant_knowledge:
            relevant_knowledge = await self._retrieve_from_sqlite(query, knowledge_types, limit)
        
        return relevant_knowledge
    
    async def _retrieve_from_sqlite(self, 
                                  query: str, 
                                  knowledge_types: List[str] = None,
                                  limit: int = 5) -> List[BusinessKnowledge]:
        """Fallback retrieval from SQLite using text search"""
        try:
            conn = sqlite3.connect("./data/knowledge_backup.db")
            cursor = conn.cursor()
            
            # Build query
            base_query = """
                SELECT id, content, knowledge_type, source, metadata, created_at, updated_at
                FROM business_knowledge
                WHERE content LIKE ?
            """
            
            params = [f"%{query}%"]
            
            if knowledge_types:
                placeholders = ",".join("?" * len(knowledge_types))
                base_query += f" AND knowledge_type IN ({placeholders})"
                params.extend(knowledge_types)
            
            base_query += f" ORDER BY created_at DESC LIMIT {limit}"
            
            cursor.execute(base_query, params)
            rows = cursor.fetchall()
            
            knowledge_list = []
            for row in rows:
                metadata = json.loads(row[4]) if row[4] else {}
                knowledge = BusinessKnowledge(
                    id=row[0],
                    content=row[1],
                    knowledge_type=row[2],
                    source=row[3],
                    metadata=metadata,
                    created_at=row[5],
                    updated_at=row[6]
                )
                knowledge_list.append(knowledge)
            
            conn.close()
            return knowledge_list
            
        except Exception as e:
            logger.error(f"SQLite retrieval failed: {e}")
            return []
    
    async def ingest_business_data(self, business_data: Dict[str, Any]) -> List[str]:
        """Ingest structured business data and convert to knowledge"""
        
        knowledge_ids = []
        
        # Process different types of business data
        if 'customer_feedback' in business_data:
            for feedback in business_data['customer_feedback']:
                content = f"Customer feedback: {feedback.get('comment', '')} (Rating: {feedback.get('rating', 'N/A')})"
                knowledge_id = await self.store_knowledge(
                    content=content,
                    knowledge_type=BusinessKnowledgeType.CUSTOMER_FEEDBACK,
                    source="customer_feedback",
                    metadata={
                        'rating': feedback.get('rating'),
                        'service': feedback.get('service'),
                        'date': feedback.get('date')
                    }
                )
                knowledge_ids.append(knowledge_id)
        
        if 'service_metrics' in business_data:
            for service, metrics in business_data['service_metrics'].items():
                content = f"Service performance for {service}: {metrics.get('bookings', 0)} bookings, ${metrics.get('revenue', 0)} revenue, {metrics.get('satisfaction', 0)} satisfaction"
                knowledge_id = await self.store_knowledge(
                    content=content,
                    knowledge_type=BusinessKnowledgeType.SERVICE_PERFORMANCE,
                    source="service_metrics",
                    metadata={
                        'service': service,
                        'bookings': metrics.get('bookings'),
                        'revenue': metrics.get('revenue'),
                        'satisfaction': metrics.get('satisfaction')
                    }
                )
                knowledge_ids.append(knowledge_id)
        
        if 'revenue_data' in business_data:
            revenue_data = business_data['revenue_data']
            content = f"Revenue analysis: Daily average ${revenue_data.get('daily_average', 0)}, Peak hours {revenue_data.get('peak_hours', 'N/A')}, Top services: {', '.join(revenue_data.get('top_services', []))}"
            knowledge_id = await self.store_knowledge(
                content=content,
                knowledge_type=BusinessKnowledgeType.REVENUE_PATTERNS,
                source="revenue_analysis",
                metadata=revenue_data
            )
            knowledge_ids.append(knowledge_id)
        
        logger.info(f"✅ Ingested {len(knowledge_ids)} knowledge items from business data")
        return knowledge_ids
    
    async def get_contextual_insights(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get contextual insights for a query with business context"""
        
        # Determine relevant knowledge types based on query
        knowledge_types = self._determine_relevant_knowledge_types(query)
        
        # Retrieve relevant knowledge
        relevant_knowledge = await self.retrieve_relevant_knowledge(
            query=query,
            knowledge_types=knowledge_types,
            limit=3  # Top 3 most relevant pieces
        )
        
        # Build contextual insights
        insights = {
            'query': query,
            'relevant_knowledge': [],
            'key_insights': [],
            'recommendations': [],
            'confidence': 0.0
        }
        
        for knowledge in relevant_knowledge:
            insights['relevant_knowledge'].append({
                'content': knowledge.content,
                'type': knowledge.knowledge_type,
                'source': knowledge.source,
                'similarity': knowledge.metadata.get('similarity_score', 0.0)
            })
        
        # Extract key insights
        if relevant_knowledge:
            insights['key_insights'] = self._extract_key_insights(relevant_knowledge, query)
            insights['recommendations'] = self._generate_recommendations(relevant_knowledge, query)
            insights['confidence'] = sum(k.metadata.get('similarity_score', 0.0) for k in relevant_knowledge) / len(relevant_knowledge)
        
        return insights
    
    def _determine_relevant_knowledge_types(self, query: str) -> List[str]:
        """Determine which knowledge types are relevant for a query"""
        query_lower = query.lower()
        relevant_types = []
        
        if any(word in query_lower for word in ['customer', 'client', 'satisfaction', 'feedback', 'review']):
            relevant_types.extend([BusinessKnowledgeType.CUSTOMER_INSIGHTS, BusinessKnowledgeType.CUSTOMER_FEEDBACK])
        
        if any(word in query_lower for word in ['revenue', 'money', 'profit', 'income', 'sales']):
            relevant_types.append(BusinessKnowledgeType.REVENUE_PATTERNS)
        
        if any(word in query_lower for word in ['service', 'cut', 'trim', 'styling', 'performance']):
            relevant_types.append(BusinessKnowledgeType.SERVICE_PERFORMANCE)
        
        if any(word in query_lower for word in ['schedule', 'appointment', 'booking', 'time']):
            relevant_types.append(BusinessKnowledgeType.SCHEDULING_ANALYTICS)
        
        if any(word in query_lower for word in ['marketing', 'promotion', 'social', 'advertising']):
            relevant_types.append(BusinessKnowledgeType.MARKETING_EFFECTIVENESS)
        
        # If no specific types identified, include all for broad search
        if not relevant_types:
            relevant_types = [
                BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                BusinessKnowledgeType.SERVICE_PERFORMANCE,
                BusinessKnowledgeType.REVENUE_PATTERNS,
                BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES
            ]
        
        return relevant_types
    
    def _extract_key_insights(self, knowledge_list: List[BusinessKnowledge], query: str) -> List[str]:
        """Extract key insights from relevant knowledge"""
        insights = []
        
        for knowledge in knowledge_list:
            if knowledge.knowledge_type == BusinessKnowledgeType.CUSTOMER_FEEDBACK:
                rating = knowledge.metadata.get('rating')
                if rating:
                    insights.append(f"Customer satisfaction trends show {rating}/5 rating patterns")
            
            elif knowledge.knowledge_type == BusinessKnowledgeType.SERVICE_PERFORMANCE:
                service = knowledge.metadata.get('service')
                revenue = knowledge.metadata.get('revenue')
                if service and revenue:
                    insights.append(f"{service} generates ${revenue} with performance metrics available")
            
            elif knowledge.knowledge_type == BusinessKnowledgeType.REVENUE_PATTERNS:
                insights.append("Revenue pattern analysis shows optimization opportunities")
        
        return insights[:3]  # Top 3 insights
    
    def _generate_recommendations(self, knowledge_list: List[BusinessKnowledge], query: str) -> List[str]:
        """Generate actionable recommendations based on knowledge"""
        recommendations = []
        
        knowledge_types = [k.knowledge_type for k in knowledge_list]
        
        if BusinessKnowledgeType.CUSTOMER_FEEDBACK in knowledge_types:
            recommendations.append("Implement systematic customer feedback collection to improve satisfaction")
        
        if BusinessKnowledgeType.SERVICE_PERFORMANCE in knowledge_types:
            recommendations.append("Focus on high-performing services for revenue optimization")
        
        if BusinessKnowledgeType.REVENUE_PATTERNS in knowledge_types:
            recommendations.append("Analyze peak hour patterns to maximize booking efficiency")
        
        # Generic recommendations if no specific patterns found
        if not recommendations:
            recommendations = [
                "Track key performance metrics for data-driven decisions",
                "Establish regular customer feedback collection",
                "Optimize scheduling for peak revenue hours"
            ]
        
        return recommendations[:3]  # Top 3 recommendations
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get status of the vector knowledge system"""
        status = {
            'vector_database': 'available' if self.client else 'unavailable',
            'embedding_service': 'available' if self.openai_client else 'mock',
            'collection_name': self.collection_name,
            'persist_directory': self.persist_directory
        }
        
        if self.collection:
            try:
                count = self.collection.count()
                status['knowledge_items_stored'] = count
            except:
                status['knowledge_items_stored'] = 'unknown'
        
        return status

# Global instance
vector_knowledge_service = VectorKnowledgeService()