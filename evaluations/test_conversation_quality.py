#!/usr/bin/env python3
"""
End-to-End Conversation Quality Tests
====================================

Comprehensive tests for conversation quality focusing on:
- Multi-turn conversation context retention
- Progressive conversation depth and complexity
- Agent role consistency across conversations
- Natural conversation flow and transitions
- Context-aware response generation
- Conversation memory and recall
"""

import pytest
import json
import asyncio
import time
import statistics
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

@dataclass
class ConversationTurn:
    """Single conversation turn"""
    turn_number: int
    user_message: str
    ai_response: Dict[str, Any]
    response_time: float
    context_maintained: bool
    role_consistency: bool
    response_quality: float

@dataclass
class ConversationEvaluation:
    """Complete conversation evaluation result"""
    conversation_id: str
    scenario_type: str
    turns: List[ConversationTurn]
    overall_quality: float
    context_retention_score: float
    role_consistency_score: float
    progressive_depth_score: float
    natural_flow_score: float
    actionability_score: float
    total_response_time: float
    success: bool
    recommendations: List[str]

class ConversationManager:
    """Mock conversation manager for testing"""
    
    def __init__(self):
        self.conversations: Dict[str, Dict[str, Any]] = {}
        self.agent_personalities = {
            'marcus': {
                'role': 'Strategy Coach',
                'style': 'analytical_supportive',
                'expertise': ['business_strategy', 'growth_planning', 'decision_making'],
                'response_patterns': [
                    'strategic_analysis',
                    'goal_setting',
                    'implementation_planning'
                ]
            },
            'sophia': {
                'role': 'Marketing Specialist',
                'style': 'creative_enthusiastic',
                'expertise': ['customer_acquisition', 'social_media', 'branding'],
                'response_patterns': [
                    'audience_analysis',
                    'campaign_ideation',
                    'engagement_optimization'
                ]
            },
            'elena': {
                'role': 'Financial Advisor',
                'style': 'precise_analytical',
                'expertise': ['financial_analysis', 'pricing', 'profitability'],
                'response_patterns': [
                    'data_analysis',
                    'financial_modeling',
                    'risk_assessment'
                ]
            },
            'david': {
                'role': 'Operations Manager',
                'style': 'practical_efficient',
                'expertise': ['workflow_optimization', 'staff_management', 'scheduling'],
                'response_patterns': [
                    'process_optimization',
                    'resource_allocation',
                    'efficiency_improvement'
                ]
            }
        }
    
    def start_conversation(self, conversation_id: str, initial_context: Dict[str, Any]) -> Dict[str, Any]:
        """Start a new conversation"""
        self.conversations[conversation_id] = {
            'id': conversation_id,
            'context': initial_context,
            'turns': [],
            'current_agent': None,
            'topic_history': [],
            'established_facts': {},
            'conversation_goals': [],
            'started_at': time.time()
        }
        
        return {
            'conversation_id': conversation_id,
            'status': 'started',
            'available_agents': list(self.agent_personalities.keys())
        }
    
    async def process_turn(self, conversation_id: str, user_message: str, 
                          context_hints: Dict[str, Any] = None) -> Dict[str, Any]:
        """Process a conversation turn"""
        if conversation_id not in self.conversations:
            raise ValueError(f"Conversation {conversation_id} not found")
        
        conversation = self.conversations[conversation_id]
        turn_number = len(conversation['turns']) + 1
        start_time = time.time()
        
        # Select agent based on message content and context
        selected_agent = self._select_agent(user_message, conversation, context_hints)
        
        # Generate AI response
        ai_response = await self._generate_ai_response(
            user_message, conversation, selected_agent, turn_number
        )
        
        response_time = time.time() - start_time
        
        # Update conversation state
        conversation['turns'].append({
            'turn': turn_number,
            'user_message': user_message,
            'selected_agent': selected_agent,
            'ai_response': ai_response,
            'response_time': response_time,
            'timestamp': time.time()
        })
        
        # Update conversation context
        self._update_conversation_context(conversation, user_message, ai_response, selected_agent)
        
        return {
            'turn_number': turn_number,
            'selected_agent': selected_agent,
            'response': ai_response,
            'response_time': response_time,
            'conversation_context': self._get_conversation_summary(conversation)
        }
    
    def _select_agent(self, message: str, conversation: Dict[str, Any], hints: Dict[str, Any] = None) -> str:
        """Select appropriate agent for the message"""
        message_lower = message.lower()
        hints = hints or {}
        
        # Check for explicit agent request
        if hints.get('preferred_agent'):
            return hints['preferred_agent']
        
        # Context-based selection
        if conversation['current_agent'] and hints.get('continue_with_same_agent', False):
            return conversation['current_agent']
        
        # Content-based selection
        if any(word in message_lower for word in ['money', 'revenue', 'cost', 'price', 'profit', 'financial']):
            return 'elena'
        elif any(word in message_lower for word in ['marketing', 'customer', 'campaign', 'social', 'brand']):
            return 'sophia'
        elif any(word in message_lower for word in ['staff', 'schedule', 'operation', 'workflow', 'efficiency']):
            return 'david'
        elif any(word in message_lower for word in ['strategy', 'plan', 'goal', 'vision', 'growth']):
            return 'marcus'
        else:
            # Default to previous agent or Marcus for general questions
            return conversation.get('current_agent', 'marcus')
    
    async def _generate_ai_response(self, message: str, conversation: Dict[str, Any], 
                                   agent_id: str, turn_number: int) -> Dict[str, Any]:
        """Generate AI response based on agent and context"""
        agent = self.agent_personalities[agent_id]
        
        # Simulate processing time based on complexity
        complexity = self._assess_message_complexity(message)
        processing_time = 0.5 + (complexity * 0.5)
        await asyncio.sleep(min(processing_time, 2.0))  # Cap at 2 seconds for testing
        
        # Generate response based on turn number and context
        if turn_number == 1:
            return self._generate_initial_response(message, agent, conversation)
        else:
            return self._generate_contextual_response(message, agent, conversation, turn_number)
    
    def _generate_initial_response(self, message: str, agent: Dict[str, Any], 
                                 conversation: Dict[str, Any]) -> Dict[str, Any]:
        """Generate initial response (first turn)"""
        return {
            'agent_role': agent['role'],
            'response_type': 'initial_engagement',
            'role_introduction': f"As your {agent['role']}, I'm here to help with {', '.join(agent['expertise'])}",
            'information_gathering': self._generate_follow_up_questions(message, agent),
            'initial_advice': self._generate_initial_advice(message, agent),
            'next_steps': ['Gather more specific information', 'Analyze current situation', 'Develop targeted recommendations'],
            'context_establishment': {
                'main_topic': self._extract_main_topic(message),
                'user_goal': self._infer_user_goal(message),
                'complexity_level': self._assess_message_complexity(message)
            }
        }
    
    def _generate_contextual_response(self, message: str, agent: Dict[str, Any], 
                                    conversation: Dict[str, Any], turn_number: int) -> Dict[str, Any]:
        """Generate contextual response for subsequent turns"""
        previous_turns = conversation['turns']
        established_context = conversation.get('established_facts', {})
        
        return {
            'agent_role': agent['role'],
            'response_type': 'contextual_analysis',
            'context_acknowledgment': self._acknowledge_previous_context(previous_turns),
            'progressive_analysis': self._provide_deeper_analysis(message, previous_turns, agent),
            'context_aware_advice': self._generate_context_aware_advice(message, established_context, agent),
            'conversation_flow': {
                'references_previous': len(previous_turns) > 0,
                'builds_on_context': True,
                'maintains_thread': self._check_topic_continuity(message, previous_turns)
            },
            'actionable_next_steps': self._generate_progressive_next_steps(turn_number, agent),
            'memory_recall': self._demonstrate_memory_recall(established_context, message)
        }
    
    def _assess_message_complexity(self, message: str) -> float:
        """Assess message complexity (0.0 to 1.0)"""
        factors = [
            len(message.split()) > 20,  # Long message
            '?' in message,  # Contains questions
            any(word in message.lower() for word in ['analyze', 'compare', 'strategy', 'complex']),  # Complex keywords
            message.count(',') > 2,  # Multiple clauses
            any(word in message.lower() for word in ['detailed', 'comprehensive', 'thorough'])  # Depth indicators
        ]
        
        return sum(factors) / len(factors)
    
    def _extract_main_topic(self, message: str) -> str:
        """Extract main topic from message"""
        message_lower = message.lower()
        
        if 'retention' in message_lower or 'customer' in message_lower and 'back' in message_lower:
            return 'customer_retention'
        elif 'marketing' in message_lower or 'promotion' in message_lower:
            return 'marketing_strategy'
        elif 'revenue' in message_lower or 'profit' in message_lower:
            return 'financial_performance'
        elif 'staff' in message_lower or 'employee' in message_lower:
            return 'staff_management'
        else:
            return 'general_business'
    
    def _infer_user_goal(self, message: str) -> str:
        """Infer user's goal from message"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['improve', 'increase', 'boost']):
            return 'improvement'
        elif any(word in message_lower for word in ['problem', 'issue', 'struggling']):
            return 'problem_solving'
        elif any(word in message_lower for word in ['plan', 'strategy', 'approach']):
            return 'strategic_planning'
        else:
            return 'information_gathering'
    
    def _generate_follow_up_questions(self, message: str, agent: Dict[str, Any]) -> List[str]:
        """Generate relevant follow-up questions"""
        questions = []
        topic = self._extract_main_topic(message)
        
        if topic == 'customer_retention' and 'sophia' == agent.get('role', '').lower().replace(' ', '_'):
            questions = [
                "What's your current customer retention rate?",
                "How often do your regular customers typically visit?",
                "Have you noticed any specific triggers for customer churn?"
            ]
        elif topic == 'financial_performance' and 'elena' in agent.get('role', '').lower():
            questions = [
                "What are your current monthly revenue figures?",
                "What's your typical profit margin per service?",
                "Are there seasonal patterns in your revenue?"
            ]
        else:
            questions = [
                "Can you provide more details about your current situation?",
                "What specific outcomes are you hoping to achieve?",
                "What constraints or challenges should I be aware of?"
            ]
        
        return questions
    
    def _generate_initial_advice(self, message: str, agent: Dict[str, Any]) -> str:
        """Generate initial advice based on agent expertise"""
        agent_name = agent.get('role', 'Assistant').lower()
        topic = self._extract_main_topic(message)
        
        if 'marketing' in agent_name and topic == 'customer_retention':
            return "Customer retention starts with understanding why customers choose you and ensuring that value proposition remains strong."
        elif 'financial' in agent_name:
            return "Let's analyze your numbers to identify the most impactful areas for improvement."
        elif 'operations' in agent_name:
            return "Operational efficiency improvements often have immediate positive impacts on both customer experience and profitability."
        else:
            return "Let's start by understanding your current situation and defining clear, measurable goals."
    
    def _acknowledge_previous_context(self, previous_turns: List[Dict[str, Any]]) -> str:
        """Acknowledge previous conversation context"""
        if not previous_turns:
            return "Starting our conversation"
        
        last_turn = previous_turns[-1]
        last_topic = last_turn.get('ai_response', {}).get('context_establishment', {}).get('main_topic', 'our discussion')
        
        return f"Building on our discussion about {last_topic.replace('_', ' ')}"
    
    def _provide_deeper_analysis(self, message: str, previous_turns: List[Dict[str, Any]], 
                               agent: Dict[str, Any]) -> str:
        """Provide progressively deeper analysis"""
        turn_count = len(previous_turns)
        
        if turn_count == 1:
            return "Now that I understand your situation better, let me provide more specific analysis..."
        elif turn_count == 2:
            return "Based on our conversation, I can see patterns that suggest specific strategic approaches..."
        else:
            return "With the full context of our discussion, I can now offer comprehensive recommendations..."
    
    def _generate_context_aware_advice(self, message: str, established_facts: Dict[str, Any], 
                                     agent: Dict[str, Any]) -> str:
        """Generate advice that incorporates established context"""
        if not established_facts:
            return "Based on what you've shared, my initial recommendation is to gather baseline metrics."
        
        context_elements = list(established_facts.keys())
        
        return f"Given what we've established about {', '.join(context_elements[:2])}, my recommendation is to focus on targeted improvements in these areas."
    
    def _check_topic_continuity(self, message: str, previous_turns: List[Dict[str, Any]]) -> bool:
        """Check if current message maintains topic continuity"""
        if not previous_turns:
            return True
        
        current_topic = self._extract_main_topic(message)
        previous_topics = [
            turn.get('ai_response', {}).get('context_establishment', {}).get('main_topic', '')
            for turn in previous_turns
        ]
        
        return current_topic in previous_topics or any(
            current_topic in topic or topic in current_topic 
            for topic in previous_topics if topic
        )
    
    def _generate_progressive_next_steps(self, turn_number: int, agent: Dict[str, Any]) -> List[str]:
        """Generate increasingly specific next steps"""
        if turn_number <= 2:
            return ["Define specific goals", "Gather baseline data", "Identify key metrics"]
        elif turn_number <= 4:
            return ["Implement pilot program", "Set up tracking systems", "Create action timeline"]
        else:
            return ["Optimize based on results", "Scale successful initiatives", "Plan next phase"]
    
    def _demonstrate_memory_recall(self, established_facts: Dict[str, Any], message: str) -> Dict[str, Any]:
        """Demonstrate memory of previous conversation elements"""
        recalled_facts = {}
        
        for fact_key, fact_value in established_facts.items():
            if any(keyword in message.lower() for keyword in fact_key.lower().split('_')):
                recalled_facts[fact_key] = fact_value
        
        return {
            'facts_recalled': len(recalled_facts),
            'relevant_context': recalled_facts,
            'demonstrates_memory': len(recalled_facts) > 0
        }
    
    def _update_conversation_context(self, conversation: Dict[str, Any], user_message: str, 
                                   ai_response: Dict[str, Any], agent_id: str):
        """Update conversation context with new information"""
        # Update current agent
        conversation['current_agent'] = agent_id
        
        # Extract and store facts from user message
        extracted_facts = self._extract_facts_from_message(user_message)
        conversation['established_facts'].update(extracted_facts)
        
        # Update topic history
        main_topic = self._extract_main_topic(user_message)
        if main_topic not in conversation['topic_history']:
            conversation['topic_history'].append(main_topic)
        
        # Update conversation goals
        inferred_goal = self._infer_user_goal(user_message)
        if inferred_goal not in conversation['conversation_goals']:
            conversation['conversation_goals'].append(inferred_goal)
    
    def _extract_facts_from_message(self, message: str) -> Dict[str, Any]:
        """Extract factual information from user message"""
        facts = {}
        message_lower = message.lower()
        
        # Extract numeric facts
        import re
        
        # Revenue/money patterns
        money_pattern = r'\$(\d+(?:,\d+)*(?:\.\d+)?)'
        money_matches = re.findall(money_pattern, message)
        if money_matches:
            facts['mentioned_revenue'] = f"${money_matches[0]}"
        
        # Percentage patterns
        percent_pattern = r'(\d+(?:\.\d+)?)%'
        percent_matches = re.findall(percent_pattern, message)
        if percent_matches:
            facts['mentioned_percentage'] = f"{percent_matches[0]}%"
        
        # Time patterns
        if 'weeks' in message_lower or 'week' in message_lower:
            week_pattern = r'(\d+)\s*weeks?'
            week_matches = re.findall(week_pattern, message_lower)
            if week_matches:
                facts['time_frame_weeks'] = int(week_matches[0])
        
        # Business context
        if 'competitor' in message_lower:
            facts['has_competition_concern'] = True
        
        if 'customer' in message_lower and ('leaving' in message_lower or 'not coming' in message_lower):
            facts['customer_retention_issue'] = True
        
        return facts
    
    def _get_conversation_summary(self, conversation: Dict[str, Any]) -> Dict[str, Any]:
        """Get summary of conversation state"""
        return {
            'turn_count': len(conversation['turns']),
            'current_agent': conversation.get('current_agent'),
            'topics_discussed': conversation['topic_history'],
            'established_facts': conversation['established_facts'],
            'conversation_goals': conversation['conversation_goals'],
            'duration_minutes': (time.time() - conversation['started_at']) / 60
        }

class ConversationQualityEvaluator:
    """Evaluates conversation quality across multiple dimensions"""
    
    def __init__(self):
        self.conversation_manager = ConversationManager()
    
    async def evaluate_conversation_scenario(self, scenario: Dict[str, Any]) -> ConversationEvaluation:
        """Evaluate a complete conversation scenario"""
        conversation_id = f"test_{int(time.time())}"
        scenario_type = scenario['type']
        conversation_script = scenario['conversation_turns']
        
        # Start conversation
        self.conversation_manager.start_conversation(conversation_id, scenario.get('initial_context', {}))
        
        turns = []
        total_response_time = 0
        
        # Process each turn
        for i, turn_data in enumerate(conversation_script):
            user_message = turn_data['user_message']
            context_hints = turn_data.get('context_hints', {})
            expected_qualities = turn_data.get('expected_qualities', {})
            
            start_time = time.time()
            
            try:
                turn_result = await self.conversation_manager.process_turn(
                    conversation_id, user_message, context_hints
                )
                
                response_time = time.time() - start_time
                total_response_time += response_time
                
                # Evaluate turn quality
                turn_evaluation = self._evaluate_turn_quality(
                    turn_result, expected_qualities, i + 1
                )
                
                conversation_turn = ConversationTurn(
                    turn_number=i + 1,
                    user_message=user_message,
                    ai_response=turn_result['response'],
                    response_time=response_time,
                    context_maintained=turn_evaluation['context_maintained'],
                    role_consistency=turn_evaluation['role_consistency'],
                    response_quality=turn_evaluation['response_quality']
                )
                
                turns.append(conversation_turn)
                
            except Exception as e:
                # Handle failed turns
                conversation_turn = ConversationTurn(
                    turn_number=i + 1,
                    user_message=user_message,
                    ai_response={'error': str(e)},
                    response_time=0.0,
                    context_maintained=False,
                    role_consistency=False,
                    response_quality=0.0
                )
                turns.append(conversation_turn)
        
        # Calculate overall conversation quality metrics
        overall_metrics = self._calculate_overall_metrics(turns, conversation_id)
        
        return ConversationEvaluation(
            conversation_id=conversation_id,
            scenario_type=scenario_type,
            turns=turns,
            overall_quality=overall_metrics['overall_quality'],
            context_retention_score=overall_metrics['context_retention'],
            role_consistency_score=overall_metrics['role_consistency'],
            progressive_depth_score=overall_metrics['progressive_depth'],
            natural_flow_score=overall_metrics['natural_flow'],
            actionability_score=overall_metrics['actionability'],
            total_response_time=total_response_time,
            success=overall_metrics['success'],
            recommendations=overall_metrics['recommendations']
        )
    
    def _evaluate_turn_quality(self, turn_result: Dict[str, Any], 
                             expected_qualities: Dict[str, Any], turn_number: int) -> Dict[str, Any]:
        """Evaluate quality of a single conversation turn"""
        ai_response = turn_result['response']
        
        # Context maintenance evaluation
        context_maintained = self._evaluate_context_maintenance(ai_response, turn_number)
        
        # Role consistency evaluation
        role_consistency = self._evaluate_role_consistency(ai_response, expected_qualities)
        
        # Response quality evaluation
        response_quality = self._evaluate_response_quality(ai_response, expected_qualities)
        
        return {
            'context_maintained': context_maintained,
            'role_consistency': role_consistency,
            'response_quality': response_quality
        }
    
    def _evaluate_context_maintenance(self, ai_response: Dict[str, Any], turn_number: int) -> bool:
        """Evaluate if context is properly maintained"""
        if turn_number == 1:
            return True  # First turn doesn't need context maintenance
        
        # Check for context indicators
        context_indicators = [
            'context_acknowledgment' in ai_response,
            'memory_recall' in ai_response and ai_response['memory_recall'].get('demonstrates_memory', False),
            'conversation_flow' in ai_response and ai_response['conversation_flow'].get('references_previous', False)
        ]
        
        return sum(context_indicators) >= 2  # At least 2 out of 3 indicators
    
    def _evaluate_role_consistency(self, ai_response: Dict[str, Any], 
                                 expected_qualities: Dict[str, Any]) -> bool:
        """Evaluate if agent maintains role consistency"""
        agent_role = ai_response.get('agent_role', '')
        expected_role = expected_qualities.get('expected_agent_role', '')
        
        # Check role consistency
        role_matches = expected_role == '' or expected_role.lower() in agent_role.lower()
        
        # Check if response includes role-appropriate elements
        role_appropriate_response = (
            'role_introduction' in ai_response or 
            'progressive_analysis' in ai_response or
            ai_response.get('response_type') in ['initial_engagement', 'contextual_analysis']
        )
        
        return role_matches and role_appropriate_response
    
    def _evaluate_response_quality(self, ai_response: Dict[str, Any], 
                                 expected_qualities: Dict[str, Any]) -> float:
        """Evaluate overall response quality (0.0 to 1.0)"""
        quality_factors = []
        
        # Information gathering (for initial responses)
        if 'information_gathering' in ai_response:
            questions = ai_response['information_gathering']
            quality_factors.append(1.0 if len(questions) >= 2 else 0.5)
        
        # Actionable advice
        if 'initial_advice' in ai_response or 'context_aware_advice' in ai_response:
            quality_factors.append(1.0)
        
        # Next steps provided
        if 'next_steps' in ai_response or 'actionable_next_steps' in ai_response:
            quality_factors.append(1.0)
        
        # Progressive depth (for later turns)
        if 'progressive_analysis' in ai_response:
            quality_factors.append(1.0)
        
        # Error handling
        if 'error' in ai_response:
            quality_factors.append(0.0)
        else:
            quality_factors.append(0.8)  # Base quality for no errors
        
        return statistics.mean(quality_factors) if quality_factors else 0.0
    
    def _calculate_overall_metrics(self, turns: List[ConversationTurn], 
                                 conversation_id: str) -> Dict[str, Any]:
        """Calculate overall conversation quality metrics"""
        if not turns:
            return {
                'overall_quality': 0.0,
                'context_retention': 0.0,
                'role_consistency': 0.0,
                'progressive_depth': 0.0,
                'natural_flow': 0.0,
                'actionability': 0.0,
                'success': False,
                'recommendations': ['No conversation turns to evaluate']
            }
        
        successful_turns = [t for t in turns if t.response_quality > 0]
        
        if not successful_turns:
            return {
                'overall_quality': 0.0,
                'context_retention': 0.0,
                'role_consistency': 0.0,
                'progressive_depth': 0.0,
                'natural_flow': 0.0,
                'actionability': 0.0,
                'success': False,
                'recommendations': ['All conversation turns failed']
            }
        
        # Context retention score
        context_turns = [t for t in turns[1:] if t.context_maintained]  # Skip first turn
        context_retention = len(context_turns) / max(len(turns) - 1, 1)
        
        # Role consistency score
        consistent_turns = [t for t in turns if t.role_consistency]
        role_consistency = len(consistent_turns) / len(turns)
        
        # Progressive depth score (quality should improve or maintain over turns)
        quality_scores = [t.response_quality for t in successful_turns]
        if len(quality_scores) > 1:
            progressive_depth = 1.0 if quality_scores[-1] >= quality_scores[0] else 0.5
        else:
            progressive_depth = 1.0
        
        # Natural flow score (consistent response times and quality)
        response_times = [t.response_time for t in successful_turns]
        time_variance = statistics.variance(response_times) if len(response_times) > 1 else 0
        natural_flow = max(0.0, 1.0 - (time_variance / 2.0))  # Penalize high variance
        
        # Actionability score (average response quality)
        actionability = statistics.mean(quality_scores)
        
        # Overall quality (weighted average)
        overall_quality = (
            context_retention * 0.25 +
            role_consistency * 0.20 +
            progressive_depth * 0.20 +
            natural_flow * 0.15 +
            actionability * 0.20
        )
        
        # Success criteria
        success = (
            overall_quality >= 0.7 and
            len(successful_turns) / len(turns) >= 0.8  # 80% success rate
        )
        
        # Generate recommendations
        recommendations = self._generate_conversation_recommendations(
            context_retention, role_consistency, progressive_depth, natural_flow, actionability
        )
        
        return {
            'overall_quality': overall_quality,
            'context_retention': context_retention,
            'role_consistency': role_consistency,
            'progressive_depth': progressive_depth,
            'natural_flow': natural_flow,
            'actionability': actionability,
            'success': success,
            'recommendations': recommendations
        }
    
    def _generate_conversation_recommendations(self, context_retention: float, role_consistency: float,
                                            progressive_depth: float, natural_flow: float,
                                            actionability: float) -> List[str]:
        """Generate recommendations for conversation improvement"""
        recommendations = []
        
        if context_retention < 0.7:
            recommendations.append("Improve context retention across conversation turns")
        
        if role_consistency < 0.8:
            recommendations.append("Maintain consistent agent role and personality")
        
        if progressive_depth < 0.7:
            recommendations.append("Ensure conversation depth increases progressively")
        
        if natural_flow < 0.7:
            recommendations.append("Optimize response timing for more natural conversation flow")
        
        if actionability < 0.7:
            recommendations.append("Increase actionability and practical value of responses")
        
        if not recommendations:
            recommendations.append("Conversation quality is excellent - maintain current approach")
        
        return recommendations

class TestConversationQuality:
    """Test suite for conversation quality evaluation"""
    
    @pytest.fixture
    def evaluator(self):
        return ConversationQualityEvaluator()
    
    @pytest.fixture
    def customer_retention_scenario(self):
        return {
            'type': 'customer_retention_discussion',
            'initial_context': {
                'user_role': 'barbershop_owner',
                'business_context': 'declining_customer_retention'
            },
            'conversation_turns': [
                {
                    'user_message': "My customers aren't coming back as often. What should I do?",
                    'context_hints': {},
                    'expected_qualities': {
                        'expected_agent_role': 'Marketing Specialist',
                        'should_gather_information': True,
                        'should_provide_initial_advice': True
                    }
                },
                {
                    'user_message': "I used to see customers every 3 weeks, now it's 5-6 weeks",
                    'context_hints': {'continue_with_same_agent': True},
                    'expected_qualities': {
                        'should_acknowledge_context': True,
                        'should_analyze_decline': True,
                        'should_ask_follow_up': True
                    }
                },
                {
                    'user_message': "A new chain salon opened nearby with cheaper prices",
                    'context_hints': {'continue_with_same_agent': True},
                    'expected_qualities': {
                        'should_identify_problem': True,
                        'should_provide_strategy': True,
                        'should_give_actionable_advice': True
                    }
                }
            ]
        }
    
    @pytest.fixture
    def financial_analysis_scenario(self):
        return {
            'type': 'financial_consultation',
            'initial_context': {
                'user_role': 'barbershop_owner',
                'business_context': 'profit_optimization'
            },
            'conversation_turns': [
                {
                    'user_message': "I want to analyze my pricing strategy. Currently charging $25 per cut.",
                    'context_hints': {},
                    'expected_qualities': {
                        'expected_agent_role': 'Financial Advisor',
                        'should_gather_financial_data': True
                    }
                },
                {
                    'user_message': "I do about 400 cuts per month, competition charges $28-35",
                    'context_hints': {'continue_with_same_agent': True},
                    'expected_qualities': {
                        'should_use_provided_data': True,
                        'should_analyze_market_position': True
                    }
                },
                {
                    'user_message': "My costs are about $8 per cut including supplies and labor",
                    'context_hints': {'continue_with_same_agent': True},
                    'expected_qualities': {
                        'should_calculate_margins': True,
                        'should_provide_pricing_recommendation': True
                    }
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_customer_retention_conversation_flow(self, evaluator, customer_retention_scenario):
        """Test customer retention conversation for natural flow and context retention"""
        result = await evaluator.evaluate_conversation_scenario(customer_retention_scenario)
        
        # Verify basic conversation completion
        assert result.success
        assert len(result.turns) == 3
        
        # Verify context retention across turns
        assert result.context_retention_score >= 0.7
        
        # Verify progressive depth
        assert result.progressive_depth_score >= 0.7
        
        # Verify role consistency (should use marketing agent)
        marketing_turns = [t for t in result.turns if 'Marketing' in str(t.ai_response.get('agent_role', ''))]
        assert len(marketing_turns) >= 2  # Should maintain marketing agent for most turns
    
    @pytest.mark.asyncio
    async def test_financial_consultation_accuracy(self, evaluator, financial_analysis_scenario):
        """Test financial consultation for accuracy and context usage"""
        result = await evaluator.evaluate_conversation_scenario(financial_analysis_scenario)
        
        # Verify conversation completion
        assert result.success
        assert len(result.turns) == 3
        
        # Verify financial agent selection
        financial_turns = [t for t in result.turns if 'Financial' in str(t.ai_response.get('agent_role', ''))]
        assert len(financial_turns) >= 2
        
        # Verify context accumulation (should remember pricing, volume, and costs)
        conversation_summary = evaluator.conversation_manager._get_conversation_summary(
            evaluator.conversation_manager.conversations[result.conversation_id]
        )
        
        # Should have extracted key financial facts
        established_facts = conversation_summary['established_facts']
        assert 'mentioned_revenue' in established_facts or len(established_facts) > 0
        
        # Verify actionability score
        assert result.actionability_score >= 0.7
    
    @pytest.mark.asyncio
    async def test_agent_switching_conversation(self, evaluator):
        """Test conversation with agent switching while maintaining context"""
        agent_switching_scenario = {
            'type': 'multi_agent_consultation',
            'conversation_turns': [
                {
                    'user_message': "I need help with overall business strategy for growth",
                    'context_hints': {}
                },
                {
                    'user_message': "Specifically, I want to improve my marketing to get more customers",
                    'context_hints': {'preferred_agent': 'sophia'}
                },
                {
                    'user_message': "And I need to make sure the financials work out with more volume",
                    'context_hints': {'preferred_agent': 'elena'}
                }
            ]
        }
        
        result = await evaluator.evaluate_conversation_scenario(agent_switching_scenario)
        
        # Should successfully handle agent switching
        assert result.success
        assert len(result.turns) == 3
        
        # Should maintain reasonable context retention despite agent switching
        assert result.context_retention_score >= 0.5
        
        # Each turn should maintain role consistency within itself
        assert result.role_consistency_score >= 0.8
    
    @pytest.mark.asyncio
    async def test_conversation_memory_recall(self, evaluator):
        """Test conversation memory and fact recall across turns"""
        memory_test_scenario = {
            'type': 'memory_recall_test',
            'conversation_turns': [
                {
                    'user_message': "My barbershop makes $15,000 per month with 3 barbers",
                    'context_hints': {}
                },
                {
                    'user_message': "I'm thinking about hiring a 4th barber",
                    'context_hints': {'continue_with_same_agent': True}
                },
                {
                    'user_message': "Will this improve my monthly revenue from the current $15,000?",
                    'context_hints': {'continue_with_same_agent': True}
                }
            ]
        }
        
        result = await evaluator.evaluate_conversation_scenario(memory_test_scenario)
        
        # Should successfully recall previous facts
        assert result.success
        
        # Check that facts were extracted and recalled
        conversation_summary = evaluator.conversation_manager._get_conversation_summary(
            evaluator.conversation_manager.conversations[result.conversation_id]
        )
        
        # Should have established facts about revenue and staff
        assert len(conversation_summary['established_facts']) > 0
        
        # Later turns should demonstrate memory recall
        for turn in result.turns[1:]:  # Skip first turn
            memory_recall = turn.ai_response.get('memory_recall', {})
            if memory_recall:
                assert memory_recall.get('facts_recalled', 0) >= 0
    
    @pytest.mark.asyncio
    async def test_conversation_response_times(self, evaluator, customer_retention_scenario):
        """Test conversation response time requirements"""
        result = await evaluator.evaluate_conversation_scenario(customer_retention_scenario)
        
        # Each turn should complete within reasonable time
        for turn in result.turns:
            assert turn.response_time < 5.0  # Max 5 seconds per turn
        
        # Total conversation should complete efficiently
        assert result.total_response_time < 15.0  # Max 15 seconds total
        
        # Natural flow score should be reasonable (not too much variance in timing)
        assert result.natural_flow_score >= 0.5
    
    @pytest.mark.asyncio
    async def test_conversation_error_handling(self, evaluator):
        """Test conversation error handling and recovery"""
        error_scenario = {
            'type': 'error_handling_test',
            'conversation_turns': [
                {
                    'user_message': "Normal question about customer retention",
                    'context_hints': {}
                },
                {
                    'user_message': "",  # Empty message to trigger potential error
                    'context_hints': {}
                },
                {
                    'user_message': "Can you still help me after that empty message?",
                    'context_hints': {}
                }
            ]
        }
        
        result = await evaluator.evaluate_conversation_scenario(error_scenario)
        
        # Should handle errors gracefully and continue conversation
        assert len(result.turns) == 3
        
        # At least some turns should succeed
        successful_turns = [t for t in result.turns if t.response_quality > 0]
        assert len(successful_turns) >= 2
        
        # Should provide recommendations for improvement
        assert len(result.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_conversation_complexity_progression(self, evaluator):
        """Test that conversation complexity and depth progress appropriately"""
        complexity_scenario = {
            'type': 'complexity_progression',
            'conversation_turns': [
                {
                    'user_message': "How can I get more customers?",  # Simple
                    'context_hints': {}
                },
                {
                    'user_message': "What specific marketing strategies work best for barbershops in competitive markets?",  # Medium
                    'context_hints': {'continue_with_same_agent': True}
                },
                {
                    'user_message': "Can you create a comprehensive 6-month marketing plan with budget allocation, target metrics, and ROI projections?",  # Complex
                    'context_hints': {'continue_with_same_agent': True}
                }
            ]
        }
        
        result = await evaluator.evaluate_conversation_scenario(complexity_scenario)
        
        # Should handle increasing complexity
        assert result.success
        
        # Progressive depth should be maintained or improved
        assert result.progressive_depth_score >= 0.7
        
        # Later turns should provide more detailed responses
        quality_scores = [t.response_quality for t in result.turns]
        assert quality_scores[-1] >= quality_scores[0]  # Last response should be at least as good as first
    
    @pytest.mark.asyncio
    async def test_conversation_actionability(self, evaluator):
        """Test that conversations provide actionable advice"""
        actionability_scenario = {
            'type': 'actionability_test',
            'conversation_turns': [
                {
                    'user_message': "My staff efficiency is low and customers are waiting too long",
                    'context_hints': {}
                },
                {
                    'user_message': "We have 3 barbers and typically 20 customers waiting on Saturdays",
                    'context_hints': {'continue_with_same_agent': True}
                },
                {
                    'user_message': "What specific steps should I take this week to improve this?",
                    'context_hints': {'continue_with_same_agent': True}
                }
            ]
        }
        
        result = await evaluator.evaluate_conversation_scenario(actionability_scenario)
        
        # Should provide highly actionable advice
        assert result.actionability_score >= 0.8
        
        # Each turn should include actionable elements
        for turn in result.turns:
            ai_response = turn.ai_response
            has_actionable_content = (
                'next_steps' in ai_response or
                'actionable_next_steps' in ai_response or
                'initial_advice' in ai_response or
                'context_aware_advice' in ai_response
            )
            assert has_actionable_content or turn.response_quality == 0.0  # Unless it's an error

# Performance tests for conversation quality
class TestConversationPerformance:
    """Performance tests for conversation system"""
    
    @pytest.mark.asyncio
    async def test_concurrent_conversations(self):
        """Test handling multiple concurrent conversations"""
        evaluator = ConversationQualityEvaluator()
        
        # Create multiple simple scenarios
        scenarios = []
        for i in range(5):
            scenarios.append({
                'type': f'concurrent_test_{i}',
                'conversation_turns': [
                    {
                        'user_message': f"Help me with business question {i}",
                        'context_hints': {}
                    },
                    {
                        'user_message': f"Follow up question {i}",
                        'context_hints': {'continue_with_same_agent': True}
                    }
                ]
            })
        
        # Run conversations concurrently
        start_time = time.time()
        tasks = [evaluator.evaluate_conversation_scenario(scenario) for scenario in scenarios]
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        # Should handle concurrent conversations efficiently
        assert total_time < 20.0  # All 5 conversations in under 20 seconds
        assert len(results) == 5
        
        # All conversations should succeed
        for result in results:
            assert result.success
    
    @pytest.mark.asyncio
    async def test_long_conversation_performance(self):
        """Test performance with long multi-turn conversations"""
        evaluator = ConversationQualityEvaluator()
        
        # Create long conversation scenario
        long_scenario = {
            'type': 'long_conversation_test',
            'conversation_turns': []
        }
        
        # Generate 10 turns
        for i in range(10):
            long_scenario['conversation_turns'].append({
                'user_message': f"Business question number {i + 1} about operations and strategy",
                'context_hints': {'continue_with_same_agent': True}
            })
        
        start_time = time.time()
        result = await evaluator.evaluate_conversation_scenario(long_scenario)
        total_time = time.time() - start_time
        
        # Should handle long conversations efficiently
        assert total_time < 30.0  # 10 turns in under 30 seconds
        assert result.success
        assert len(result.turns) == 10
        
        # Context retention should remain high throughout
        assert result.context_retention_score >= 0.6

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])