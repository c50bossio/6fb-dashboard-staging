"""
Base Agent Class
Foundation for all specialized AI agent personalities
"""

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum

# Import RAG system for knowledge-enhanced responses
try:
    from ..vector_knowledge_service import VectorKnowledgeService
    from ..enhanced_business_knowledge_service import BusinessDomain
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False

logger = logging.getLogger(__name__)

class AgentPersonality(Enum):
    FINANCIAL_COACH = "financial_coach"
    MARKETING_EXPERT = "marketing_expert"
    OPERATIONS_MANAGER = "operations_manager"
    CUSTOMER_RELATIONS = "customer_relations"
    GROWTH_STRATEGY = "growth_strategy"
    STRATEGIC_MINDSET = "strategic_mindset"

class MessageDomain(Enum):
    FINANCIAL = "financial"
    MARKETING = "marketing"
    OPERATIONS = "operations"
    CUSTOMER_SERVICE = "customer_service"
    STRATEGY = "strategy"
    GENERAL = "general"

@dataclass
class AgentResponse:
    """Standard response structure from specialized agents"""
    agent_id: str
    personality: AgentPersonality
    response: str
    confidence: float
    domain: MessageDomain
    recommendations: List[str]
    action_items: List[Dict[str, Any]]
    business_impact: Dict[str, Any]
    follow_up_questions: List[str]
    metadata: Dict[str, Any]
    timestamp: str

class BaseAgent(ABC):
    """
    Abstract base class for all specialized AI agent personalities
    """
    
    def __init__(self, personality: AgentPersonality, name: str, description: str):
        self.personality = personality
        self.name = name
        self.description = description
        self.agent_id = f"{personality.value}_{datetime.now().strftime('%Y%m%d')}"
        self.conversation_history = []
        self.expertise_areas = []
        self.personality_traits = {}
        self.response_templates = {}
        
        # Initialize RAG system integration
        if RAG_AVAILABLE:
            self.rag_service = VectorKnowledgeService()
            self.knowledge_domains = []
            logger.info(f"✅ {self.name} initialized with RAG integration")
        else:
            self.rag_service = None
            logger.warning(f"⚠️ {self.name} initialized without RAG system")
        
        self._initialize_personality()
    
    @abstractmethod
    def _initialize_personality(self):
        """Initialize agent-specific personality traits and expertise"""
        pass
    
    @abstractmethod
    async def analyze_message(self, message: str, context: Dict[str, Any]) -> Tuple[bool, float]:
        """
        Analyze if this agent should handle the message
        Returns: (should_handle: bool, confidence: float)
        """
        pass
    
    @abstractmethod
    async def generate_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate specialized response based on agent personality"""
        pass
    
    def get_personality_prompt(self) -> str:
        """Get the personality prompt for AI model interactions"""
        return f"""
        You are {self.name}, a {self.description}.
        
        Personality Traits:
        {json.dumps(self.personality_traits, indent=2)}
        
        Expertise Areas:
        {', '.join(self.expertise_areas)}
        
        Your responses should:
        1. Reflect your personality and expertise
        2. Provide actionable business advice
        3. Include specific recommendations
        4. Maintain a professional but personable tone
        5. Focus on barbershop business optimization
        """
    
    async def get_relevant_knowledge(self, query: str, limit: int = 3) -> List[str]:
        """Retrieve relevant knowledge from RAG system to enhance responses"""
        if not self.rag_service:
            return []
        
        try:
            # Search for relevant knowledge based on query and agent's expertise
            knowledge_items = await self.rag_service.search_knowledge(
                query=query,
                knowledge_types=self.expertise_areas,
                limit=limit
            )
            
            # Extract content from knowledge items
            relevant_knowledge = []
            for item in knowledge_items:
                if hasattr(item, 'content'):
                    relevant_knowledge.append(item.content)
                elif isinstance(item, dict) and 'content' in item:
                    relevant_knowledge.append(item['content'])
            
            logger.info(f"📚 {self.name} retrieved {len(relevant_knowledge)} knowledge items for query")
            return relevant_knowledge
            
        except Exception as e:
            logger.error(f"Error retrieving knowledge for {self.name}: {e}")
            return []
    
    async def enhance_response_with_knowledge(self, base_response: str, query: str) -> str:
        """Enhance response with relevant knowledge from RAG system"""
        if not self.rag_service:
            return base_response
        
        try:
            # Get relevant knowledge
            knowledge_items = await self.get_relevant_knowledge(query, limit=2)
            
            if not knowledge_items:
                return base_response
            
            # Integrate knowledge into response
            enhanced_response = base_response
            
            # Add knowledge-based insights
            if knowledge_items:
                enhanced_response += "\n\n**Knowledge-Based Insights:**\n"
                for i, knowledge in enumerate(knowledge_items, 1):
                    # Extract key insight from knowledge
                    insight = knowledge.split(':')[1].strip() if ':' in knowledge else knowledge
                    if len(insight) > 200:
                        insight = insight[:197] + "..."
                    enhanced_response += f"{i}. {insight}\n"
            
            return enhanced_response
            
        except Exception as e:
            logger.error(f"Error enhancing response with knowledge: {e}")
            return base_response
    
    async def store_interaction_knowledge(self, message: str, response: str, context: Dict[str, Any]):
        """Store successful interactions as knowledge for future use"""
        if not self.rag_service:
            return
        
        try:
            # Create knowledge from successful interaction
            knowledge_content = f"User Query: {message}\nAgent Response: {response}\nContext: {json.dumps(context, default=str)}"
            
            # Determine knowledge type based on agent personality
            knowledge_type = self._get_knowledge_type_for_personality()
            
            await self.rag_service.store_knowledge(
                content=knowledge_content,
                knowledge_type=knowledge_type,
                source=f"{self.agent_id}_interaction",
                metadata={
                    "agent_personality": self.personality.value,
                    "interaction_date": datetime.now().isoformat(),
                    "context_keys": list(context.keys()),
                    "category": "agent_interaction"
                }
            )
            
            logger.info(f"📝 {self.name} stored interaction knowledge")
            
        except Exception as e:
            logger.error(f"Error storing interaction knowledge: {e}")
    
    def _get_knowledge_type_for_personality(self) -> str:
        """Get appropriate knowledge type based on agent personality"""
        personality_mapping = {
            AgentPersonality.FINANCIAL_COACH: "revenue_patterns",
            AgentPersonality.MARKETING_EXPERT: "marketing_intelligence", 
            AgentPersonality.OPERATIONS_MANAGER: "operational_best_practices",
            AgentPersonality.CUSTOMER_RELATIONS: "customer_insights",
            AgentPersonality.GROWTH_STRATEGY: "growth_strategies",
            AgentPersonality.STRATEGIC_MINDSET: "strategic_insights"
        }
        
        return personality_mapping.get(self.personality, "general_business_knowledge")
    
    def add_to_conversation_history(self, message: str, response: str):
        """Add interaction to conversation history"""
        self.conversation_history.append({
            'timestamp': datetime.now().isoformat(),
            'message': message,
            'response': response,
            'agent': self.agent_id
        })
        
        # Keep only last 10 interactions
        if len(self.conversation_history) > 10:
            self.conversation_history = self.conversation_history[-10:]
    
    def get_context_summary(self) -> str:
        """Get summary of recent conversation context"""
        if not self.conversation_history:
            return "No previous conversation history."
        
        recent_context = []
        for interaction in self.conversation_history[-3:]:  # Last 3 interactions
            recent_context.append(f"Q: {interaction['message'][:100]}...")
            recent_context.append(f"A: {interaction['response'][:150]}...")
        
        return "\n".join(recent_context)
    
    async def _ensure_business_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ensure the agent has access to current business data
        This is called by all agents to get real business metrics instead of asking users
        """
        try:
            # Import here to avoid circular imports
            from ..realtime_analytics_service import realtime_analytics_service
            
            enhanced_context = context.copy()
            
            # Get barbershop ID from context
            barbershop_id = context.get('barbershop_id') or context.get('shop_id')
            
            # Fetch live business metrics
            business_metrics = await realtime_analytics_service.get_live_business_metrics(barbershop_id)
            
            # Update context with real business data
            enhanced_context.update({
                'monthly_revenue': business_metrics.monthly_revenue,
                'daily_revenue': business_metrics.daily_revenue,
                'total_revenue': business_metrics.total_revenue,
                'weekly_revenue': business_metrics.weekly_revenue,
                'customer_count': business_metrics.total_customers,
                'new_customers_this_month': business_metrics.new_customers_this_month,
                'total_appointments': business_metrics.total_appointments,
                'completed_appointments': business_metrics.completed_appointments,
                'appointment_completion_rate': business_metrics.appointment_completion_rate,
                'average_service_price': business_metrics.average_service_price,
                'customer_retention_rate': business_metrics.customer_retention_rate,
                'total_barbers': business_metrics.total_barbers,
                'active_barbers': business_metrics.active_barbers,
                'top_performing_barber': business_metrics.top_performing_barber,
                'peak_booking_hours': business_metrics.peak_booking_hours,
                'busiest_days': business_metrics.busiest_days,
                'most_popular_services': business_metrics.most_popular_services,
                'occupancy_rate': business_metrics.occupancy_rate,
                'revenue_growth': business_metrics.revenue_growth,
                'payment_success_rate': business_metrics.payment_success_rate,
                'business_metrics_available': True,
                'business_metrics_timestamp': business_metrics.last_updated,
                
                # Business profile information
                'business_name': context.get('business_name', 'Your Barbershop'),
                'business_type': 'Barbershop',
                'service_categories': [service.get('name', 'Hair Services') for service in business_metrics.most_popular_services[:3]],
                'target_market': 'Local community seeking professional barbering services',
                'business_model': 'Service-based appointment booking with walk-ins',
                'business_goals': ['$500/day revenue target', 'Customer retention improvement', 'Service excellence'],
                'current_challenges': self._identify_challenges_from_metrics(business_metrics),
                'products_services': [service.get('name', 'Hair Cut') for service in business_metrics.most_popular_services],
                'operating_history': f"Currently serving {business_metrics.total_customers} customers with {business_metrics.total_appointments} appointments completed"
            })
            
            logger.info(f"✅ Enhanced context with live business data for {self.name}")
            return enhanced_context
            
        except Exception as e:
            logger.error(f"Failed to enhance business context: {e}")
            # Return original context with indication that live data is unavailable
            enhanced_context = context.copy()
            enhanced_context['business_metrics_available'] = False
            enhanced_context['business_data_error'] = str(e)
            return enhanced_context
    
    def _identify_challenges_from_metrics(self, metrics) -> List[str]:
        """Identify business challenges based on current metrics"""
        challenges = []
        
        if metrics.revenue_growth < 5:
            challenges.append('Revenue growth below optimal levels')
        
        if metrics.customer_retention_rate < 70:
            challenges.append('Customer retention needs improvement')
        
        if metrics.appointment_completion_rate < 85:
            challenges.append('High cancellation/no-show rates')
        
        if metrics.occupancy_rate < 60:
            challenges.append('Low booking capacity utilization')
        
        if metrics.average_service_price < 50:
            challenges.append('Pricing strategy optimization needed')
        
        if not challenges:
            challenges = ['Maintaining current performance levels', 'Scaling operations efficiently']
        
        return challenges

    async def should_collaborate(self, other_agents: List['BaseAgent'], message: str, context: Dict[str, Any]) -> List[str]:
        """
        Determine if this agent should collaborate with other agents
        Returns list of agent IDs to collaborate with
        """
        collaboration_agents = []
        
        # Cross-domain collaboration logic
        if self.personality == AgentPersonality.FINANCIAL_COACH:
            if any(keyword in message.lower() for keyword in ['marketing', 'promotion', 'advertising']):
                collaboration_agents.append('marketing_expert')
        
        elif self.personality == AgentPersonality.MARKETING_EXPERT:
            if any(keyword in message.lower() for keyword in ['revenue', 'profit', 'pricing', 'cost']):
                collaboration_agents.append('financial_coach')
        
        elif self.personality == AgentPersonality.OPERATIONS_MANAGER:
            if any(keyword in message.lower() for keyword in ['staff', 'schedule', 'efficiency']):
                if any(keyword in message.lower() for keyword in ['revenue', 'cost']):
                    collaboration_agents.append('financial_coach')
        
        return collaboration_agents
    
    def calculate_business_impact(self, recommendations: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate potential business impact of recommendations"""
        
        # Base metrics from context
        current_revenue = context.get('monthly_revenue', 5000)
        current_customers = context.get('customer_count', 150)
        
        impact_assessment = {
            'revenue_impact': {
                'potential_increase': 0.0,
                'confidence': 0.0,
                'timeframe': '3_months'
            },
            'customer_impact': {
                'retention_improvement': 0.0,
                'new_customer_potential': 0.0,
                'satisfaction_boost': 0.0
            },
            'operational_impact': {
                'efficiency_gain': 0.0,
                'cost_reduction': 0.0,
                'time_savings': 0.0
            },
            'risk_assessment': {
                'implementation_risk': 'low',
                'investment_required': 'minimal',
                'success_probability': 0.8
            }
        }
        
        # Agent-specific impact calculations (to be overridden)
        return impact_assessment
    
    def format_response(self, response_text: str, recommendations: List[str], 
                       context: Dict[str, Any], confidence: float) -> AgentResponse:
        """Format response in standard AgentResponse structure"""
        
        # Generate action items from recommendations
        action_items = []
        for i, rec in enumerate(recommendations[:3], 1):
            action_items.append({
                'id': f"action_{self.agent_id}_{i}",
                'task': rec,
                'priority': 'high' if i <= 2 else 'medium',
                'estimated_effort': 'low',
                'expected_outcome': f"Implement {rec.lower()} for business improvement"
            })
        
        # Calculate business impact
        business_impact = self.calculate_business_impact(recommendations, context)
        
        # Generate follow-up questions
        follow_up_questions = self._generate_follow_up_questions(context)
        
        return AgentResponse(
            agent_id=self.agent_id,
            personality=self.personality,
            response=response_text,
            confidence=confidence,
            domain=self._get_primary_domain(),
            recommendations=recommendations,
            action_items=action_items,
            business_impact=business_impact,
            follow_up_questions=follow_up_questions,
            metadata={
                'response_length': len(response_text),
                'num_recommendations': len(recommendations),
                'agent_name': self.name,
                'expertise_areas': self.expertise_areas,
                'context_used': bool(context)
            },
            timestamp=datetime.now().isoformat()
        )
    
    @abstractmethod
    def _get_primary_domain(self) -> MessageDomain:
        """Get the primary domain this agent handles"""
        pass
    
    def _generate_follow_up_questions(self, context: Dict[str, Any]) -> List[str]:
        """Generate relevant follow-up questions"""
        return [
            "Would you like me to elaborate on any of these recommendations?",
            "Do you have specific constraints I should consider?",
            "What's your timeline for implementing these changes?"
        ]
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get current agent status and capabilities"""
        return {
            'agent_id': self.agent_id,
            'name': self.name,
            'personality': self.personality.value,
            'description': self.description,
            'expertise_areas': self.expertise_areas,
            'conversation_history_count': len(self.conversation_history),
            'primary_domain': self._get_primary_domain().value,
            'active': True,
            'last_interaction': self.conversation_history[-1]['timestamp'] if self.conversation_history else None
        }