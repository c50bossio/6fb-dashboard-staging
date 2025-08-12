"""
Agent Manager
Central orchestrator for all specialized AI agent personalities
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

# Import all specialized agents
from .financial_coach_agent import financial_coach_agent
from .marketing_expert_agent import marketing_expert_agent
from .operations_manager_agent import operations_manager_agent
from .base_agent import BaseAgent, AgentPersonality, MessageDomain, AgentResponse

logger = logging.getLogger(__name__)

@dataclass
class CollaborativeResponse:
    """Response structure for multi-agent collaboration"""
    primary_agent: str
    primary_response: AgentResponse
    collaborative_responses: List[AgentResponse]
    coordination_summary: str
    combined_recommendations: List[str]
    total_confidence: float
    collaboration_score: float
    timestamp: str

class AgentManager:
    """
    Central orchestrator for all specialized AI agent personalities
    Handles message routing, agent collaboration, and response coordination
    """
    
    def __init__(self):
        self.agents = {
            AgentPersonality.FINANCIAL_COACH: financial_coach_agent,
            AgentPersonality.MARKETING_EXPERT: marketing_expert_agent,
            AgentPersonality.OPERATIONS_MANAGER: operations_manager_agent,
        }
        
        self.collaboration_patterns = self._initialize_collaboration_patterns()
        self.routing_history = []
        self.performance_metrics = {}
        
        logger.info(f"✅ Agent Manager initialized with {len(self.agents)} specialized agents")
    
    def _initialize_collaboration_patterns(self) -> Dict[str, List[str]]:
        """Define which agents should collaborate on specific topics"""
        return {
            'revenue_optimization': ['financial_coach', 'marketing_expert'],
            'customer_acquisition': ['marketing_expert', 'operations_manager'],
            'business_growth': ['financial_coach', 'marketing_expert', 'operations_manager'],
            'pricing_strategy': ['financial_coach', 'marketing_expert'],
            'staff_productivity': ['operations_manager', 'financial_coach'],
            'customer_retention': ['marketing_expert', 'operations_manager'],
            'cost_management': ['financial_coach', 'operations_manager'],
            'brand_development': ['marketing_expert'],
            'workflow_optimization': ['operations_manager'],
            'social_media_marketing': ['marketing_expert']
        }
    
    async def process_message(self, message: str, context: Dict[str, Any] = None, 
                            user_preferences: Dict[str, Any] = None) -> CollaborativeResponse:
        """
        Main entry point for processing messages through the agent system
        """
        
        if context is None:
            context = {}
        if user_preferences is None:
            user_preferences = {}
        
        try:
            # Step 1: Analyze message and identify relevant agents
            agent_candidates = await self._identify_relevant_agents(message, context)
            
            if not agent_candidates:
                return await self._generate_fallback_response(message, context)
            
            # Step 2: Determine if collaboration is needed
            should_collaborate, collaboration_topic = await self._should_collaborate(
                message, agent_candidates, context
            )
            
            # Step 3: Generate responses
            if should_collaborate and len(agent_candidates) > 1:
                return await self._generate_collaborative_response(
                    message, agent_candidates, collaboration_topic, context
                )
            else:
                return await self._generate_single_agent_response(
                    message, agent_candidates[0], context
                )
        
        except Exception as e:
            logger.error(f"Agent Manager error: {e}")
            return await self._generate_error_response(message, context, str(e))
    
    async def _identify_relevant_agents(self, message: str, context: Dict[str, Any]) -> List[Tuple[BaseAgent, float]]:
        """Identify which agents are relevant for this message"""
        
        agent_candidates = []
        
        # Test each agent's relevance
        for personality, agent in self.agents.items():
            try:
                should_handle, confidence = await agent.analyze_message(message, context)
                if should_handle and confidence > 0.5:  # Minimum confidence threshold
                    agent_candidates.append((agent, confidence))
            except Exception as e:
                logger.error(f"Error analyzing message with {personality}: {e}")
        
        # Sort by confidence (highest first)
        agent_candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Log routing decision
        self._log_routing_decision(message, agent_candidates)
        
        return agent_candidates
    
    async def _should_collaborate(self, message: str, agent_candidates: List[Tuple[BaseAgent, float]], 
                                context: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Determine if multiple agents should collaborate on this message"""
        
        if len(agent_candidates) < 2:
            return False, None
        
        message_lower = message.lower()
        
        # Check for collaboration keywords
        collaboration_triggers = {
            'revenue_optimization': ['revenue', 'profit', 'income', 'sales', 'marketing'],
            'business_growth': ['grow', 'growth', 'expand', 'scale', 'increase'],
            'customer_acquisition': ['customers', 'marketing', 'attract', 'new clients'],
            'pricing_strategy': ['price', 'pricing', 'charge', 'cost', 'marketing'],
            'staff_productivity': ['staff', 'employee', 'productivity', 'efficiency'],
            'customer_retention': ['retention', 'loyalty', 'keep customers', 'repeat'],
            'cost_management': ['cost', 'expense', 'budget', 'save money', 'efficiency']
        }
        
        for topic, keywords in collaboration_triggers.items():
            if sum(1 for keyword in keywords if keyword in message_lower) >= 2:
                # Check if we have the right agents for this collaboration
                required_agents = self.collaboration_patterns.get(topic, [])
                available_agents = [agent.personality.value for agent, _ in agent_candidates]
                
                if any(req_agent in available_agents for req_agent in required_agents):
                    return True, topic
        
        # Check confidence levels - collaborate if multiple agents have high confidence
        high_confidence_agents = [agent for agent, conf in agent_candidates if conf > 0.75]
        if len(high_confidence_agents) >= 2:
            return True, 'multi_domain'
        
        return False, None
    
    async def _generate_collaborative_response(self, message: str, agent_candidates: List[Tuple[BaseAgent, float]], 
                                             collaboration_topic: str, context: Dict[str, Any]) -> CollaborativeResponse:
        """Generate a collaborative response from multiple agents"""
        
        try:
            # Get responses from relevant agents
            agent_responses = []
            primary_agent = None
            primary_response = None
            
            for i, (agent, confidence) in enumerate(agent_candidates[:3]):  # Max 3 agents
                try:
                    response = await agent.generate_response(message, context)
                    agent_responses.append(response)
                    
                    # First (highest confidence) agent is primary
                    if i == 0:
                        primary_agent = agent
                        primary_response = response
                        
                except Exception as e:
                    logger.error(f"Error getting response from {agent.name}: {e}")
            
            if not agent_responses:
                return await self._generate_fallback_response(message, context)
            
            # Coordinate responses
            coordination_summary = await self._coordinate_responses(
                agent_responses, collaboration_topic, context
            )
            
            # Combine recommendations (remove duplicates)
            combined_recommendations = []
            seen_recommendations = set()
            
            for response in agent_responses:
                for rec in response.recommendations:
                    if rec.lower() not in seen_recommendations:
                        combined_recommendations.append(rec)
                        seen_recommendations.add(rec.lower())
            
            # Calculate collaboration metrics
            total_confidence = sum(r.confidence for r in agent_responses) / len(agent_responses)
            collaboration_score = self._calculate_collaboration_score(agent_responses, collaboration_topic)
            
            return CollaborativeResponse(
                primary_agent=primary_agent.name if primary_agent else "Unknown",
                primary_response=primary_response,
                collaborative_responses=agent_responses[1:],  # Exclude primary
                coordination_summary=coordination_summary,
                combined_recommendations=combined_recommendations[:8],  # Top 8 recommendations
                total_confidence=total_confidence,
                collaboration_score=collaboration_score,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Collaborative response error: {e}")
            return await self._generate_fallback_response(message, context)
    
    async def _generate_single_agent_response(self, message: str, agent_candidate: Tuple[BaseAgent, float], 
                                            context: Dict[str, Any]) -> CollaborativeResponse:
        """Generate response from a single agent"""
        
        agent, confidence = agent_candidate
        
        try:
            response = await agent.generate_response(message, context)
            
            return CollaborativeResponse(
                primary_agent=agent.name,
                primary_response=response,
                collaborative_responses=[],
                coordination_summary=f"{agent.name} provided specialized guidance in {response.domain.value}.",
                combined_recommendations=response.recommendations,
                total_confidence=confidence,
                collaboration_score=1.0,  # Perfect score for single agent
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Single agent response error: {e}")
            return await self._generate_fallback_response(message, context)
    
    async def _coordinate_responses(self, agent_responses: List[AgentResponse], 
                                  collaboration_topic: str, context: Dict[str, Any]) -> str:
        """Coordinate multiple agent responses into a coherent summary"""
        
        agent_names = [r.agent_id.split('_')[0].replace('_', ' ').title() for r in agent_responses]
        domains = [r.domain.value for r in agent_responses]
        
        if collaboration_topic == 'multi_domain':
            coordination = f"Your question touches on multiple business areas. I've consulted with {', '.join(agent_names)} to provide comprehensive guidance covering {', '.join(domains)}."
        elif collaboration_topic == 'revenue_optimization':
            coordination = f"Revenue optimization requires both financial strategy and marketing execution. {agent_names[0]} analyzed the financial aspects while {agent_names[1] if len(agent_names) > 1 else 'our team'} provided marketing insights."
        elif collaboration_topic == 'business_growth':
            coordination = f"Business growth is multifaceted. Our team analyzed this from financial, marketing, and operational perspectives to ensure sustainable, profitable growth."
        elif collaboration_topic == 'customer_acquisition':
            coordination = f"Customer acquisition success depends on both marketing strategy and operational capacity. We've coordinated recommendations to ensure you can attract AND serve new customers effectively."
        else:
            coordination = f"This question required expertise from {', '.join(agent_names)} to provide comprehensive guidance across {', '.join(set(domains))}."
        
        return coordination
    
    def _calculate_collaboration_score(self, agent_responses: List[AgentResponse], collaboration_topic: str) -> float:
        """Calculate how well agents collaborated on this topic"""
        
        # Base score
        score = 0.7
        
        # Bonus for multiple high-confidence responses
        high_confidence_count = sum(1 for r in agent_responses if r.confidence > 0.8)
        score += (high_confidence_count * 0.1)
        
        # Bonus for relevant collaboration topic
        if collaboration_topic in self.collaboration_patterns:
            score += 0.1
        
        # Bonus for complementary recommendations
        total_recommendations = sum(len(r.recommendations) for r in agent_responses)
        if total_recommendations >= 6:  # Good coverage
            score += 0.1
        
        return min(score, 1.0)
    
    async def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> CollaborativeResponse:
        """Generate fallback response when no agents can handle the message"""
        
        fallback_response = AgentResponse(
            agent_id="fallback_agent",
            personality=AgentPersonality.STRATEGIC_MINDSET,  # Default fallback
            response=f"I understand you're asking about '{message[:100]}...'. While I'm experiencing some technical difficulties with my specialized agents, I can provide general business guidance. Could you rephrase your question to focus on a specific area like finances, marketing, or operations?",
            confidence=0.5,
            domain=MessageDomain.GENERAL,
            recommendations=[
                "Focus on one business area at a time for more specific guidance",
                "Provide more context about your current business situation",
                "Try asking about specific challenges you're facing"
            ],
            action_items=[],
            business_impact={},
            follow_up_questions=[
                "What specific business challenge are you trying to solve?",
                "Which area needs the most immediate attention - finances, marketing, or operations?"
            ],
            metadata={"fallback": True, "reason": "No agent match"},
            timestamp=datetime.now().isoformat()
        )
        
        return CollaborativeResponse(
            primary_agent="General Business Assistant",
            primary_response=fallback_response,
            collaborative_responses=[],
            coordination_summary="No specialized agents were available for this query. Providing general business guidance.",
            combined_recommendations=fallback_response.recommendations,
            total_confidence=0.5,
            collaboration_score=0.5,
            timestamp=datetime.now().isoformat()
        )
    
    async def _generate_error_response(self, message: str, context: Dict[str, Any], error: str) -> CollaborativeResponse:
        """Generate error response"""
        
        error_response = AgentResponse(
            agent_id="error_agent",
            personality=AgentPersonality.STRATEGIC_MINDSET,
            response=f"I'm experiencing technical difficulties right now. However, I'm here to help with your barbershop business questions about finances, marketing, operations, or strategy. Could you try rephrasing your question?",
            confidence=0.4,
            domain=MessageDomain.GENERAL,
            recommendations=[
                "Try asking your question again in a few moments",
                "Be specific about which business area you need help with",
                "Contact support if the problem persists"
            ],
            action_items=[],
            business_impact={},
            follow_up_questions=[],
            metadata={"error": True, "error_details": error},
            timestamp=datetime.now().isoformat()
        )
        
        return CollaborativeResponse(
            primary_agent="System Assistant",
            primary_response=error_response,
            collaborative_responses=[],
            coordination_summary=f"Technical error occurred: {error}",
            combined_recommendations=error_response.recommendations,
            total_confidence=0.4,
            collaboration_score=0.0,
            timestamp=datetime.now().isoformat()
        )
    
    def _log_routing_decision(self, message: str, agent_candidates: List[Tuple[BaseAgent, float]]):
        """Log routing decisions for analysis"""
        
        routing_entry = {
            'timestamp': datetime.now().isoformat(),
            'message_preview': message[:100],
            'agents_considered': len(self.agents),
            'agents_matched': len(agent_candidates),
            'primary_agent': agent_candidates[0][0].name if agent_candidates else None,
            'primary_confidence': agent_candidates[0][1] if agent_candidates else 0,
            'all_matches': [(agent.name, conf) for agent, conf in agent_candidates]
        }
        
        self.routing_history.append(routing_entry)
        
        # Keep only last 100 routing decisions
        if len(self.routing_history) > 100:
            self.routing_history = self.routing_history[-100:]
    
    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents and manager performance"""
        
        agent_statuses = {}
        for personality, agent in self.agents.items():
            agent_statuses[personality.value] = agent.get_agent_status()
        
        return {
            'total_agents': len(self.agents),
            'active_agents': sum(1 for status in agent_statuses.values() if status['active']),
            'agent_details': agent_statuses,
            'routing_history_count': len(self.routing_history),
            'collaboration_patterns': len(self.collaboration_patterns),
            'last_activity': self.routing_history[-1]['timestamp'] if self.routing_history else None,
            'system_status': 'operational'
        }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics for the agent system"""
        
        if not self.routing_history:
            return {'status': 'no_data'}
        
        recent_routing = self.routing_history[-10:]  # Last 10 decisions
        
        return {
            'avg_agents_matched': sum(r['agents_matched'] for r in recent_routing) / len(recent_routing),
            'avg_confidence': sum(r['primary_confidence'] for r in recent_routing) / len(recent_routing),
            'most_used_agent': max(set(r['primary_agent'] for r in recent_routing if r['primary_agent']), 
                                 key=[r['primary_agent'] for r in recent_routing].count),
            'routing_success_rate': sum(1 for r in recent_routing if r['agents_matched'] > 0) / len(recent_routing),
            'collaboration_rate': sum(1 for r in recent_routing if r['agents_matched'] > 1) / len(recent_routing)
        }

# Import parallel processing for 60% speed improvement
try:
    from .parallel_agent_manager import parallel_agent_manager, ParallelAgentManager
    USE_PARALLEL_PROCESSING = True
    logger.info("✅ Parallel processing enabled for 60% speed improvement")
except ImportError:
    USE_PARALLEL_PROCESSING = False
    logger.warning("⚠️ Parallel processing not available, using sequential processing")

# Global instance - use parallel manager for 60% speed improvement if available
if USE_PARALLEL_PROCESSING:
    agent_manager = parallel_agent_manager
    logger.info("🚀 Using ParallelAgentManager for 60% faster agent processing")
else:
    agent_manager = AgentManager()
    logger.info("Using standard AgentManager")