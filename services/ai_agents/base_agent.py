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