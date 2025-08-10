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
                                        limit: int = 5,
                                        use_advanced_retrieval: bool = True) -> List[BusinessKnowledge]:
        """Enhanced retrieval with advanced accuracy improvements"""
        
        if use_advanced_retrieval:
            return await self._advanced_retrieve_knowledge(query, knowledge_types, limit)
        else:
            return await self._basic_retrieve_knowledge(query, knowledge_types, limit)
    
    async def _advanced_retrieve_knowledge(self, 
                                         query: str, 
                                         knowledge_types: List[str] = None,
                                         limit: int = 5) -> List[BusinessKnowledge]:
        """Advanced retrieval with multiple strategies for improved accuracy"""
        
        try:
            # Strategy 1: Multi-vector retrieval with query expansion
            expanded_queries = await self._expand_query(query)
            multi_results = await self._multi_vector_search(expanded_queries, knowledge_types, limit * 2)
            
            # Strategy 2: Semantic similarity scoring with reranking
            reranked_results = await self._rerank_by_semantic_relevance(multi_results, query, limit)
            
            # Strategy 3: Context-aware filtering
            context_filtered = await self._apply_context_filtering(reranked_results, query)
            
            # Strategy 4: Diversity injection to prevent redundancy
            diverse_results = await self._inject_diversity(context_filtered, limit)
            
            logger.info(f"🧠 Advanced RAG retrieval: {len(diverse_results)} results with enhanced accuracy")
            return diverse_results
            
        except Exception as e:
            logger.error(f"❌ Advanced retrieval failed: {e}, falling back to basic")
            return await self._basic_retrieve_knowledge(query, knowledge_types, limit)
    
    async def _basic_retrieve_knowledge(self, 
                                      query: str, 
                                      knowledge_types: List[str] = None,
                                      limit: int = 5) -> List[BusinessKnowledge]:
        """Basic retrieval method (original implementation)"""
        
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
    
    async def _expand_query(self, original_query: str) -> List[str]:
        """Expand query with synonyms and related terms for better retrieval"""
        
        # Business domain expansions
        business_expansions = {
            'revenue': ['income', 'earnings', 'sales', 'profit', 'money'],
            'customers': ['clients', 'patrons', 'guests', 'bookings', 'appointments'],
            'marketing': ['advertising', 'promotion', 'outreach', 'social media', 'branding'],
            'operations': ['workflow', 'processes', 'efficiency', 'productivity', 'management'],
            'scheduling': ['appointments', 'bookings', 'calendar', 'availability', 'time slots'],
            'staff': ['employees', 'barbers', 'team', 'workers', 'personnel'],
            'service': ['haircut', 'styling', 'grooming', 'treatment', 'appointment'],
            'performance': ['metrics', 'analytics', 'KPIs', 'results', 'success']
        }
        
        expanded_queries = [original_query]
        query_lower = original_query.lower()
        
        # Add expansions for detected keywords
        for base_term, expansions in business_expansions.items():
            if base_term in query_lower:
                for expansion in expansions:
                    expanded_query = query_lower.replace(base_term, expansion)
                    if expanded_query not in expanded_queries:
                        expanded_queries.append(expanded_query)
        
        # Add contextual variations
        if 'how to' in query_lower:
            expanded_queries.append(query_lower.replace('how to', 'best practices for'))
            expanded_queries.append(query_lower.replace('how to', 'strategies to'))
        
        if 'what is' in query_lower:
            expanded_queries.append(query_lower.replace('what is', 'definition of'))
            expanded_queries.append(query_lower.replace('what is', 'explanation of'))
        
        return expanded_queries[:5]  # Limit to prevent over-expansion
    
    async def _multi_vector_search(self, 
                                 queries: List[str], 
                                 knowledge_types: List[str] = None,
                                 limit: int = 10) -> List[BusinessKnowledge]:
        """Search using multiple query vectors and combine results"""
        
        all_results = []
        seen_content = set()
        
        for query in queries:
            query_embedding = await self.generate_embedding(query)
            
            if self.collection:
                try:
                    where_clause = None
                    if knowledge_types:
                        where_clause = {"knowledge_type": {"$in": knowledge_types}}
                    
                    results = self.collection.query(
                        query_embeddings=[query_embedding],
                        n_results=limit // len(queries),
                        where=where_clause,
                        include=["documents", "metadatas", "distances"]
                    )
                    
                    # Process results and avoid duplicates
                    for i, doc in enumerate(results['documents'][0]):
                        if doc not in seen_content:
                            seen_content.add(doc)
                            metadata = results['metadatas'][0][i]
                            distance = results['distances'][0][i]
                            
                            knowledge = BusinessKnowledge(
                                id=f"multi_retrieved_{len(all_results)}",
                                content=doc,
                                knowledge_type=metadata.get('knowledge_type', 'unknown'),
                                source=metadata.get('source', 'unknown'),
                                metadata={
                                    **metadata, 
                                    'similarity_score': 1 - distance,
                                    'search_query': query
                                }
                            )
                            all_results.append(knowledge)
                
                except Exception as e:
                    logger.error(f"Multi-vector search failed for query '{query}': {e}")
        
        return all_results
    
    async def _rerank_by_semantic_relevance(self, 
                                          results: List[BusinessKnowledge], 
                                          original_query: str, 
                                          limit: int) -> List[BusinessKnowledge]:
        """Rerank results by semantic relevance to original query"""
        
        if not results:
            return results
        
        # Calculate semantic relevance scores
        original_embedding = await self.generate_embedding(original_query)
        
        for result in results:
            content_embedding = await self.generate_embedding(result.content)
            
            # Calculate cosine similarity
            similarity = self._cosine_similarity(original_embedding, content_embedding)
            
            # Combine with existing similarity score (weighted average)
            existing_score = result.metadata.get('similarity_score', 0.5)
            combined_score = (similarity * 0.7) + (existing_score * 0.3)
            
            result.metadata['semantic_relevance'] = similarity
            result.metadata['combined_score'] = combined_score
        
        # Sort by combined score
        results.sort(key=lambda x: x.metadata.get('combined_score', 0), reverse=True)
        
        return results[:limit]
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        
        try:
            vec1_np = np.array(vec1)
            vec2_np = np.array(vec2)
            
            dot_product = np.dot(vec1_np, vec2_np)
            norm1 = np.linalg.norm(vec1_np)
            norm2 = np.linalg.norm(vec2_np)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return dot_product / (norm1 * norm2)
        
        except Exception:
            return 0.5  # Fallback similarity
    
    async def _apply_context_filtering(self, 
                                     results: List[BusinessKnowledge], 
                                     query: str) -> List[BusinessKnowledge]:
        """Apply context-aware filtering to improve relevance"""
        
        # Identify query intent
        query_lower = query.lower()
        
        # Business context filters
        context_weights = {
            'financial': ['revenue', 'profit', 'cost', 'pricing', 'money', 'income'],
            'operational': ['schedule', 'appointment', 'booking', 'workflow', 'process'],
            'marketing': ['customer', 'client', 'promotion', 'advertising', 'social'],
            'performance': ['metric', 'analytics', 'KPI', 'result', 'success', 'track']
        }
        
        # Determine query context
        query_contexts = []
        for context, keywords in context_weights.items():
            if any(keyword in query_lower for keyword in keywords):
                query_contexts.append(context)
        
        # Apply context boosting
        for result in results:
            content_lower = result.content.lower()
            knowledge_type = result.knowledge_type.lower()
            
            # Boost score for matching contexts
            context_boost = 0.0
            for context in query_contexts:
                if any(keyword in content_lower for keyword in context_weights[context]):
                    context_boost += 0.1
                if context in knowledge_type:
                    context_boost += 0.15
            
            # Apply boost to combined score
            current_score = result.metadata.get('combined_score', 0.5)
            result.metadata['combined_score'] = min(1.0, current_score + context_boost)
            result.metadata['context_boost'] = context_boost
        
        # Re-sort with context boosts
        results.sort(key=lambda x: x.metadata.get('combined_score', 0), reverse=True)
        
        return results
    
    async def _inject_diversity(self, 
                              results: List[BusinessKnowledge], 
                              limit: int) -> List[BusinessKnowledge]:
        """Inject diversity to prevent redundant results"""
        
        if len(results) <= limit:
            return results
        
        diverse_results = []
        used_knowledge_types = set()
        similarity_threshold = 0.85  # Prevent very similar content
        
        for result in results:
            # Check knowledge type diversity
            knowledge_type = result.knowledge_type
            type_count = len([r for r in diverse_results if r.knowledge_type == knowledge_type])
            
            # Limit same knowledge type to prevent clustering
            if type_count >= 2 and len(diverse_results) > 2:
                continue
            
            # Check content similarity with existing results
            is_similar = False
            for existing in diverse_results:
                if len(existing.content) > 0 and len(result.content) > 0:
                    # Simple similarity check based on overlapping words
                    existing_words = set(existing.content.lower().split())
                    result_words = set(result.content.lower().split())
                    
                    if existing_words and result_words:
                        overlap = len(existing_words & result_words) / len(existing_words | result_words)
                        if overlap > similarity_threshold:
                            is_similar = True
                            break
            
            if not is_similar:
                diverse_results.append(result)
                result.metadata['diversity_selected'] = True
            
            if len(diverse_results) >= limit:
                break
        
        logger.info(f"📊 Diversity injection: {len(diverse_results)} diverse results from {len(results)} candidates")
        return diverse_results
    
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