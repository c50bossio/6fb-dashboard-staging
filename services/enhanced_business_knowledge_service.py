"""
Enhanced Business Knowledge Service
Advanced RAG system with business-specific knowledge base management
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3

# Import base vector knowledge service
from .vector_knowledge_service import VectorKnowledgeService, BusinessKnowledge, BusinessKnowledgeType

logger = logging.getLogger(__name__)

class BusinessDomain(Enum):
    BARBERSHOP_OPERATIONS = "barbershop_operations"
    CUSTOMER_EXPERIENCE = "customer_experience" 
    REVENUE_OPTIMIZATION = "revenue_optimization"
    MARKETING_STRATEGIES = "marketing_strategies"
    STAFF_MANAGEMENT = "staff_management"
    INDUSTRY_BENCHMARKS = "industry_benchmarks"
    SEASONAL_PATTERNS = "seasonal_patterns"
    TECHNOLOGY_INTEGRATION = "technology_integration"

class KnowledgeSource(Enum):
    SYSTEM_ANALYTICS = "system_analytics"
    CUSTOMER_FEEDBACK = "customer_feedback"
    INDUSTRY_RESEARCH = "industry_research"
    BEST_PRACTICES = "best_practices"
    USER_INTERACTIONS = "user_interactions"
    EXPERT_INSIGHTS = "expert_insights"
    EXTERNAL_DATA = "external_data"

@dataclass
class BusinessKnowledgeDocument:
    """Enhanced business knowledge document with metadata"""
    id: str
    title: str
    content: str
    summary: str
    domain: BusinessDomain
    knowledge_type: str
    source: KnowledgeSource
    confidence_score: float
    relevance_tags: List[str]
    business_metrics: Dict[str, Any]
    last_verified: str
    usage_count: int
    effectiveness_score: float
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str

@dataclass
class KnowledgeQueryContext:
    """Context for knowledge queries"""
    business_context: Dict[str, Any]
    query_intent: str
    user_role: Optional[str] = None
    session_history: List[str] = None
    preferred_domains: List[BusinessDomain] = None
    exclude_domains: List[BusinessDomain] = None

@dataclass
class KnowledgeRetrievalResult:
    """Result of knowledge retrieval with relevance scoring"""
    documents: List[BusinessKnowledgeDocument]
    relevance_scores: List[float]
    context_summary: str
    knowledge_gaps: List[str]
    recommended_actions: List[str]
    total_confidence: float

class EnhancedBusinessKnowledgeService:
    """
    Advanced RAG system for business-specific knowledge management
    """
    
    def __init__(self):
        # Initialize base vector service
        self.vector_service = VectorKnowledgeService()
        
        # Enhanced features
        self.knowledge_domains = list(BusinessDomain)
        self.knowledge_sources = list(KnowledgeSource)
        self.business_ontology = {}
        self.knowledge_graph = {}
        self.query_analytics = {}
        
        # Initialize enhanced features
        self._initialize_business_ontology()
        self._initialize_knowledge_graph()
        self._load_default_knowledge_base()
        
        logger.info("✅ Enhanced Business Knowledge Service initialized")
    
    def _initialize_business_ontology(self):
        """Initialize business domain ontology for better knowledge organization"""
        
        self.business_ontology = {
            BusinessDomain.BARBERSHOP_OPERATIONS: {
                'parent_concepts': [],
                'child_concepts': ['scheduling', 'service_delivery', 'equipment_management', 'hygiene_protocols'],
                'related_metrics': ['appointment_efficiency', 'service_time', 'customer_wait_time'],
                'key_entities': ['barber', 'client', 'appointment', 'service', 'equipment']
            },
            BusinessDomain.CUSTOMER_EXPERIENCE: {
                'parent_concepts': [],
                'child_concepts': ['satisfaction', 'loyalty', 'feedback', 'communication'],
                'related_metrics': ['satisfaction_score', 'nps', 'retention_rate', 'complaint_resolution_time'],
                'key_entities': ['customer', 'feedback', 'review', 'complaint', 'recommendation']
            },
            BusinessDomain.REVENUE_OPTIMIZATION: {
                'parent_concepts': [],
                'child_concepts': ['pricing', 'upselling', 'cost_management', 'profit_maximization'],
                'related_metrics': ['revenue_per_customer', 'profit_margin', 'pricing_elasticity'],
                'key_entities': ['price', 'service_package', 'upsell', 'revenue', 'cost']
            },
            BusinessDomain.MARKETING_STRATEGIES: {
                'parent_concepts': [],
                'child_concepts': ['digital_marketing', 'customer_acquisition', 'brand_building', 'retention_marketing'],
                'related_metrics': ['customer_acquisition_cost', 'marketing_roi', 'brand_awareness'],
                'key_entities': ['campaign', 'channel', 'content', 'audience', 'conversion']
            },
            BusinessDomain.STAFF_MANAGEMENT: {
                'parent_concepts': [],
                'child_concepts': ['hiring', 'training', 'performance', 'scheduling', 'retention'],
                'related_metrics': ['staff_productivity', 'training_effectiveness', 'turnover_rate'],
                'key_entities': ['employee', 'skill', 'performance', 'schedule', 'training']
            }
        }
    
    def _initialize_knowledge_graph(self):
        """Initialize knowledge graph for relationship mapping"""
        
        self.knowledge_graph = {
            'entities': {},
            'relationships': {},
            'concept_hierarchy': {}
        }
    
    async def _load_default_knowledge_base(self):
        """Load default business knowledge base"""
        
        default_knowledge = [
            {
                'title': 'Optimal Barbershop Scheduling Patterns',
                'content': 'Peak hours are typically Tuesday-Saturday 10am-6pm. Monday mornings and Sunday evenings show lowest demand. Implementing 15-minute buffers between appointments reduces delays. Online booking reduces no-shows by 25%.',
                'summary': 'Scheduling optimization strategies for barbershops',
                'domain': BusinessDomain.BARBERSHOP_OPERATIONS,
                'knowledge_type': BusinessKnowledgeType.SCHEDULING_ANALYTICS,
                'source': KnowledgeSource.INDUSTRY_RESEARCH,
                'confidence_score': 0.85,
                'relevance_tags': ['scheduling', 'appointments', 'optimization', 'no-shows'],
                'business_metrics': {'no_show_reduction': 25, 'efficiency_gain': 15}
            },
            {
                'title': 'Customer Retention Strategies for Barbershops',
                'content': 'Loyalty programs increase repeat visits by 30%. Personal barber assignments improve satisfaction by 40%. Follow-up texts 48 hours after service boost rebooking by 22%. Quality consistency is the top retention factor.',
                'summary': 'Proven strategies for improving customer retention',
                'domain': BusinessDomain.CUSTOMER_EXPERIENCE,
                'knowledge_type': BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                'source': KnowledgeSource.BEST_PRACTICES,
                'confidence_score': 0.90,
                'relevance_tags': ['retention', 'loyalty', 'customer_satisfaction', 'rebooking'],
                'business_metrics': {'retention_improvement': 30, 'satisfaction_increase': 40}
            },
            {
                'title': 'Premium Service Revenue Impact',
                'content': 'Premium services (beard treatments, styling consultations) have 60% higher margins. Upselling increases average ticket by $15-25. Training staff on consultative selling improves upsell rates by 45%.',
                'summary': 'Revenue optimization through premium services',
                'domain': BusinessDomain.REVENUE_OPTIMIZATION,
                'knowledge_type': BusinessKnowledgeType.REVENUE_PATTERNS,
                'source': KnowledgeSource.INDUSTRY_RESEARCH,
                'confidence_score': 0.88,
                'relevance_tags': ['premium_services', 'upselling', 'revenue', 'margins'],
                'business_metrics': {'margin_increase': 60, 'ticket_increase': 20}
            },
            {
                'title': 'Social Media Marketing for Barbershops',
                'content': 'Instagram posts with before/after photos get 3x more engagement. Stories with polls and questions increase follower interaction by 55%. Consistent posting (3-4 times weekly) grows following by 25% monthly.',
                'summary': 'Effective social media strategies for barbershops',
                'domain': BusinessDomain.MARKETING_STRATEGIES,
                'knowledge_type': BusinessKnowledgeType.MARKETING_EFFECTIVENESS,
                'source': KnowledgeSource.BEST_PRACTICES,
                'confidence_score': 0.82,
                'relevance_tags': ['social_media', 'instagram', 'engagement', 'content'],
                'business_metrics': {'engagement_increase': 300, 'follower_growth': 25}
            },
            {
                'title': 'Staff Productivity Optimization',
                'content': 'Cross-training barbers in multiple services increases flexibility by 35%. Performance incentives tied to customer satisfaction improve service quality by 28%. Regular skill workshops maintain cutting-edge techniques.',
                'summary': 'Strategies for maximizing staff productivity',
                'domain': BusinessDomain.STAFF_MANAGEMENT,
                'knowledge_type': BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES,
                'source': KnowledgeSource.EXPERT_INSIGHTS,
                'confidence_score': 0.87,
                'relevance_tags': ['staff_training', 'productivity', 'incentives', 'flexibility'],
                'business_metrics': {'flexibility_increase': 35, 'quality_improvement': 28}
            }
        ]
        
        for knowledge in default_knowledge:
            await self.store_enhanced_knowledge(**knowledge)
    
    async def store_enhanced_knowledge(self, 
                                     title: str,
                                     content: str,
                                     summary: str,
                                     domain: BusinessDomain,
                                     knowledge_type: str,
                                     source: KnowledgeSource,
                                     confidence_score: float,
                                     relevance_tags: List[str],
                                     business_metrics: Dict[str, Any],
                                     metadata: Dict[str, Any] = None) -> str:
        """Store enhanced business knowledge with rich metadata"""
        
        if metadata is None:
            metadata = {}
        
        try:
            # Create enhanced knowledge document
            knowledge_id = f"{domain.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            enhanced_doc = BusinessKnowledgeDocument(
                id=knowledge_id,
                title=title,
                content=content,
                summary=summary,
                domain=domain,
                knowledge_type=knowledge_type,
                source=source,
                confidence_score=confidence_score,
                relevance_tags=relevance_tags,
                business_metrics=business_metrics,
                last_verified=datetime.now().isoformat(),
                usage_count=0,
                effectiveness_score=confidence_score,
                metadata=metadata,
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            
            # Store in base vector service
            enhanced_metadata = {
                'title': title,
                'summary': summary,
                'domain': domain.value,
                'source': source.value,
                'confidence_score': confidence_score,
                'relevance_tags': relevance_tags,
                'business_metrics': business_metrics,
                **metadata
            }
            
            vector_id = await self.vector_service.store_knowledge(
                content=f"{title}. {summary}. {content}",
                knowledge_type=knowledge_type,
                source=source.value,
                metadata=enhanced_metadata
            )
            
            # Store enhanced document in specialized storage
            await self._store_enhanced_document(enhanced_doc)
            
            # Update knowledge graph
            await self._update_knowledge_graph(enhanced_doc)
            
            logger.info(f"✅ Stored enhanced knowledge: {knowledge_id}")
            return knowledge_id
            
        except Exception as e:
            logger.error(f"❌ Error storing enhanced knowledge: {e}")
            raise
    
    async def _store_enhanced_document(self, doc: BusinessKnowledgeDocument):
        """Store enhanced document in specialized SQLite database"""
        
        try:
            os.makedirs("./data", exist_ok=True)
            
            conn = sqlite3.connect("./data/enhanced_knowledge.db")
            cursor = conn.cursor()
            
            # Create enhanced table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS enhanced_business_knowledge (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    knowledge_type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    confidence_score REAL,
                    relevance_tags TEXT,
                    business_metrics TEXT,
                    last_verified TEXT,
                    usage_count INTEGER DEFAULT 0,
                    effectiveness_score REAL,
                    metadata TEXT,
                    created_at TEXT,
                    updated_at TEXT
                )
            """)
            
            cursor.execute("""
                INSERT OR REPLACE INTO enhanced_business_knowledge 
                (id, title, content, summary, domain, knowledge_type, source, 
                 confidence_score, relevance_tags, business_metrics, last_verified,
                 usage_count, effectiveness_score, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc.id, doc.title, doc.content, doc.summary, doc.domain.value,
                doc.knowledge_type, doc.source.value, doc.confidence_score,
                json.dumps(doc.relevance_tags), json.dumps(doc.business_metrics),
                doc.last_verified, doc.usage_count, doc.effectiveness_score,
                json.dumps(doc.metadata), doc.created_at, doc.updated_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Enhanced document storage failed: {e}")
    
    async def _update_knowledge_graph(self, doc: BusinessKnowledgeDocument):
        """Update knowledge graph with new document relationships"""
        
        try:
            # Extract entities from content
            entities = self._extract_entities(doc.content, doc.relevance_tags)
            
            # Update graph
            for entity in entities:
                if entity not in self.knowledge_graph['entities']:
                    self.knowledge_graph['entities'][entity] = {
                        'documents': [],
                        'related_entities': set(),
                        'domains': set()
                    }
                
                self.knowledge_graph['entities'][entity]['documents'].append(doc.id)
                self.knowledge_graph['entities'][entity]['domains'].add(doc.domain.value)
                
                # Create relationships between entities in same document
                for other_entity in entities:
                    if entity != other_entity:
                        self.knowledge_graph['entities'][entity]['related_entities'].add(other_entity)
            
        except Exception as e:
            logger.error(f"Knowledge graph update failed: {e}")
    
    def _extract_entities(self, content: str, tags: List[str]) -> List[str]:
        """Extract key entities from content and tags"""
        
        # Combine tags with key terms from content
        entities = set(tags)
        
        # Add domain-specific entities
        business_terms = [
            'appointment', 'customer', 'service', 'revenue', 'booking',
            'barber', 'client', 'price', 'marketing', 'staff', 'training',
            'satisfaction', 'retention', 'upselling', 'scheduling'
        ]
        
        content_lower = content.lower()
        for term in business_terms:
            if term in content_lower:
                entities.add(term)
        
        return list(entities)
    
    async def retrieve_contextual_knowledge(self, 
                                          query: str,
                                          context: KnowledgeQueryContext) -> KnowledgeRetrievalResult:
        """Retrieve knowledge with enhanced context awareness"""
        
        try:
            # Enhance query with context
            enhanced_query = await self._enhance_query_with_context(query, context)
            
            # Determine relevant domains
            relevant_domains = await self._identify_relevant_domains(enhanced_query, context)
            
            # Retrieve base knowledge
            knowledge_types = self._map_domains_to_types(relevant_domains)
            base_knowledge = await self.vector_service.retrieve_relevant_knowledge(
                query=enhanced_query,
                knowledge_types=knowledge_types,
                limit=10
            )
            
            # Enhance results with business context
            enhanced_documents = await self._enhance_retrieval_results(
                base_knowledge, context, relevant_domains
            )
            
            # Calculate relevance scores
            relevance_scores = [doc.confidence_score for doc in enhanced_documents]
            
            # Generate context summary
            context_summary = await self._generate_context_summary(
                enhanced_documents, context
            )
            
            # Identify knowledge gaps
            knowledge_gaps = await self._identify_knowledge_gaps(
                query, enhanced_documents, context
            )
            
            # Generate recommended actions
            recommended_actions = await self._generate_recommended_actions(
                enhanced_documents, context
            )
            
            # Calculate total confidence
            total_confidence = sum(relevance_scores) / len(relevance_scores) if relevance_scores else 0.0
            
            return KnowledgeRetrievalResult(
                documents=enhanced_documents,
                relevance_scores=relevance_scores,
                context_summary=context_summary,
                knowledge_gaps=knowledge_gaps,
                recommended_actions=recommended_actions,
                total_confidence=total_confidence
            )
            
        except Exception as e:
            logger.error(f"❌ Contextual knowledge retrieval failed: {e}")
            return await self._generate_fallback_result(query, context)
    
    async def _enhance_query_with_context(self, query: str, context: KnowledgeQueryContext) -> str:
        """Enhance query with business context"""
        
        enhanced_parts = [query]
        
        # Add business context
        if context.business_context:
            if context.business_context.get('shop_type'):
                enhanced_parts.append(f"shop type: {context.business_context['shop_type']}")
            if context.business_context.get('customer_segment'):
                enhanced_parts.append(f"customer segment: {context.business_context['customer_segment']}")
            if context.business_context.get('location_type'):
                enhanced_parts.append(f"location: {context.business_context['location_type']}")
        
        # Add user role context
        if context.user_role:
            enhanced_parts.append(f"role: {context.user_role}")
        
        # Add domain preferences
        if context.preferred_domains:
            domains = [d.value for d in context.preferred_domains]
            enhanced_parts.append(f"focus areas: {', '.join(domains)}")
        
        return ' '.join(enhanced_parts)
    
    async def _identify_relevant_domains(self, query: str, context: KnowledgeQueryContext) -> List[BusinessDomain]:
        """Identify relevant business domains for the query"""
        
        relevant_domains = []
        query_lower = query.lower()
        
        # Check preferred domains first
        if context.preferred_domains:
            relevant_domains.extend(context.preferred_domains)
        
        # Domain keyword mapping
        domain_keywords = {
            BusinessDomain.BARBERSHOP_OPERATIONS: ['scheduling', 'appointment', 'operation', 'service', 'workflow'],
            BusinessDomain.CUSTOMER_EXPERIENCE: ['customer', 'client', 'satisfaction', 'experience', 'feedback'],
            BusinessDomain.REVENUE_OPTIMIZATION: ['revenue', 'profit', 'price', 'income', 'money', 'cost'],
            BusinessDomain.MARKETING_STRATEGIES: ['marketing', 'promotion', 'advertising', 'social media', 'brand'],
            BusinessDomain.STAFF_MANAGEMENT: ['staff', 'employee', 'team', 'training', 'management', 'barber']
        }
        
        for domain, keywords in domain_keywords.items():
            if domain not in relevant_domains and any(keyword in query_lower for keyword in keywords):
                relevant_domains.append(domain)
        
        # Exclude specified domains
        if context.exclude_domains:
            relevant_domains = [d for d in relevant_domains if d not in context.exclude_domains]
        
        # Default to all domains if none identified
        if not relevant_domains:
            relevant_domains = [BusinessDomain.BARBERSHOP_OPERATIONS, BusinessDomain.CUSTOMER_EXPERIENCE]
        
        return relevant_domains
    
    def _map_domains_to_types(self, domains: List[BusinessDomain]) -> List[str]:
        """Map business domains to knowledge types"""
        
        domain_type_mapping = {
            BusinessDomain.BARBERSHOP_OPERATIONS: [
                BusinessKnowledgeType.SCHEDULING_ANALYTICS,
                BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES
            ],
            BusinessDomain.CUSTOMER_EXPERIENCE: [
                BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                BusinessKnowledgeType.CUSTOMER_FEEDBACK
            ],
            BusinessDomain.REVENUE_OPTIMIZATION: [
                BusinessKnowledgeType.REVENUE_PATTERNS,
                BusinessKnowledgeType.BUSINESS_METRICS
            ],
            BusinessDomain.MARKETING_STRATEGIES: [
                BusinessKnowledgeType.MARKETING_EFFECTIVENESS
            ],
            BusinessDomain.STAFF_MANAGEMENT: [
                BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES
            ]
        }
        
        knowledge_types = []
        for domain in domains:
            knowledge_types.extend(domain_type_mapping.get(domain, []))
        
        return list(set(knowledge_types))  # Remove duplicates
    
    async def _enhance_retrieval_results(self, 
                                       base_knowledge: List[BusinessKnowledge],
                                       context: KnowledgeQueryContext,
                                       relevant_domains: List[BusinessDomain]) -> List[BusinessKnowledgeDocument]:
        """Enhance retrieval results with additional metadata"""
        
        enhanced_docs = []
        
        for knowledge in base_knowledge:
            try:
                # Try to get enhanced document from database
                enhanced_doc = await self._get_enhanced_document(knowledge.id)
                
                if not enhanced_doc:
                    # Create enhanced document from base knowledge
                    enhanced_doc = BusinessKnowledgeDocument(
                        id=knowledge.id,
                        title=knowledge.metadata.get('title', 'Untitled'),
                        content=knowledge.content,
                        summary=knowledge.metadata.get('summary', knowledge.content[:200] + '...'),
                        domain=BusinessDomain.BARBERSHOP_OPERATIONS,  # Default
                        knowledge_type=knowledge.knowledge_type,
                        source=KnowledgeSource.SYSTEM_ANALYTICS,  # Default
                        confidence_score=knowledge.metadata.get('confidence_score', 0.8),
                        relevance_tags=knowledge.metadata.get('relevance_tags', []),
                        business_metrics=knowledge.metadata.get('business_metrics', {}),
                        last_verified=datetime.now().isoformat(),
                        usage_count=1,
                        effectiveness_score=knowledge.metadata.get('confidence_score', 0.8),
                        metadata=knowledge.metadata,
                        created_at=knowledge.created_at or datetime.now().isoformat(),
                        updated_at=datetime.now().isoformat()
                    )
                
                # Update usage count
                enhanced_doc.usage_count += 1
                
                enhanced_docs.append(enhanced_doc)
                
            except Exception as e:
                logger.error(f"Error enhancing document {knowledge.id}: {e}")
        
        return enhanced_docs
    
    async def _get_enhanced_document(self, doc_id: str) -> Optional[BusinessKnowledgeDocument]:
        """Retrieve enhanced document from database"""
        
        try:
            conn = sqlite3.connect("./data/enhanced_knowledge.db")
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM enhanced_business_knowledge WHERE id = ?
            """, (doc_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return BusinessKnowledgeDocument(
                    id=row[0],
                    title=row[1],
                    content=row[2],
                    summary=row[3],
                    domain=BusinessDomain(row[4]),
                    knowledge_type=row[5],
                    source=KnowledgeSource(row[6]),
                    confidence_score=row[7],
                    relevance_tags=json.loads(row[8]),
                    business_metrics=json.loads(row[9]),
                    last_verified=row[10],
                    usage_count=row[11],
                    effectiveness_score=row[12],
                    metadata=json.loads(row[13]),
                    created_at=row[14],
                    updated_at=row[15]
                )
            
        except Exception as e:
            logger.error(f"Error retrieving enhanced document: {e}")
        
        return None
    
    async def _generate_context_summary(self, 
                                      documents: List[BusinessKnowledgeDocument],
                                      context: KnowledgeQueryContext) -> str:
        """Generate context summary from retrieved documents"""
        
        if not documents:
            return "No relevant knowledge found for this query."
        
        # Analyze document domains
        domains = list(set([doc.domain.value for doc in documents]))
        
        # Calculate average confidence
        avg_confidence = sum([doc.confidence_score for doc in documents]) / len(documents)
        
        # Identify key metrics
        all_metrics = {}
        for doc in documents:
            all_metrics.update(doc.business_metrics)
        
        summary_parts = [
            f"Found {len(documents)} relevant knowledge items across {len(domains)} business areas",
            f"Average confidence: {avg_confidence:.1%}",
            f"Primary domains: {', '.join(domains[:3])}"
        ]
        
        if all_metrics:
            key_metrics = list(all_metrics.keys())[:3]
            summary_parts.append(f"Key metrics available: {', '.join(key_metrics)}")
        
        return ". ".join(summary_parts) + "."
    
    async def _identify_knowledge_gaps(self, 
                                     query: str,
                                     documents: List[BusinessKnowledgeDocument],
                                     context: KnowledgeQueryContext) -> List[str]:
        """Identify potential knowledge gaps"""
        
        gaps = []
        query_lower = query.lower()
        
        # Check for missing domains
        covered_domains = set([doc.domain for doc in documents])
        all_domains = set(BusinessDomain)
        missing_domains = all_domains - covered_domains
        
        if missing_domains:
            for domain in list(missing_domains)[:2]:  # Limit to 2 gaps
                gaps.append(f"Limited knowledge in {domain.value.replace('_', ' ')}")
        
        # Check for specific missing topics
        if 'pricing' in query_lower and not any('price' in doc.content.lower() for doc in documents):
            gaps.append("Specific pricing strategies not covered")
        
        if 'competitor' in query_lower and not any('competitor' in doc.content.lower() for doc in documents):
            gaps.append("Competitive analysis information missing")
        
        return gaps[:3]  # Limit to 3 gaps
    
    async def _generate_recommended_actions(self, 
                                          documents: List[BusinessKnowledgeDocument],
                                          context: KnowledgeQueryContext) -> List[str]:
        """Generate recommended actions based on retrieved knowledge"""
        
        actions = []
        
        # Extract actionable insights from documents
        for doc in documents[:3]:  # Top 3 documents
            if doc.business_metrics:
                for metric, value in doc.business_metrics.items():
                    if isinstance(value, (int, float)) and value > 0:
                        action = f"Implement {doc.title.lower()} to potentially achieve {value}% improvement in {metric.replace('_', ' ')}"
                        actions.append(action)
        
        # Add general recommendations based on domains
        covered_domains = set([doc.domain for doc in documents])
        
        if BusinessDomain.CUSTOMER_EXPERIENCE in covered_domains:
            actions.append("Focus on customer feedback collection and satisfaction measurement")
        
        if BusinessDomain.REVENUE_OPTIMIZATION in covered_domains:
            actions.append("Analyze current pricing strategy and identify upselling opportunities")
        
        return actions[:5]  # Limit to 5 actions
    
    async def _generate_fallback_result(self, query: str, context: KnowledgeQueryContext) -> KnowledgeRetrievalResult:
        """Generate fallback result when retrieval fails"""
        
        return KnowledgeRetrievalResult(
            documents=[],
            relevance_scores=[],
            context_summary="Knowledge retrieval temporarily unavailable. Using fallback recommendations.",
            knowledge_gaps=["Service temporarily limited"],
            recommended_actions=[
                "Try rephrasing your question",
                "Check system status",
                "Contact support if problem persists"
            ],
            total_confidence=0.3
        )
    
    async def get_contextual_insights(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get contextual insights (compatibility method with existing AI orchestrator)"""
        
        try:
            query_context = KnowledgeQueryContext(
                business_context=context or {},
                query_intent="general_inquiry"
            )
            
            result = await self.retrieve_contextual_knowledge(query, query_context)
            
            # Format for compatibility with existing AI orchestrator
            return {
                'relevant_knowledge': [
                    {
                        'content': doc.content,
                        'title': doc.title,
                        'confidence': doc.confidence_score,
                        'source': doc.source.value,
                        'domain': doc.domain.value
                    }
                    for doc in result.documents[:5]
                ],
                'key_insights': result.recommended_actions[:3],
                'context_summary': result.context_summary,
                'knowledge_gaps': result.knowledge_gaps,
                'total_confidence': result.total_confidence
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting contextual insights: {e}")
            return {
                'relevant_knowledge': [],
                'key_insights': ['Service temporarily unavailable'],
                'context_summary': 'Unable to retrieve insights at this time',
                'knowledge_gaps': [],
                'total_confidence': 0.0
            }
    
    def get_knowledge_status(self) -> Dict[str, Any]:
        """Get knowledge base status"""
        
        try:
            conn = sqlite3.connect("./data/enhanced_knowledge.db")
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM enhanced_business_knowledge")
            total_documents = cursor.fetchone()[0]
            
            cursor.execute("SELECT domain, COUNT(*) FROM enhanced_business_knowledge GROUP BY domain")
            domain_counts = dict(cursor.fetchall())
            
            cursor.execute("SELECT AVG(confidence_score) FROM enhanced_business_knowledge")
            avg_confidence = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                'total_documents': total_documents,
                'domain_distribution': domain_counts,
                'average_confidence': avg_confidence,
                'knowledge_graph_entities': len(self.knowledge_graph.get('entities', {})),
                'status': 'operational'
            }
            
        except Exception as e:
            logger.error(f"Error getting knowledge status: {e}")
            return {
                'total_documents': 0,
                'status': 'error',
                'error': str(e)
            }

# Global instance
enhanced_business_knowledge_service = EnhancedBusinessKnowledgeService()