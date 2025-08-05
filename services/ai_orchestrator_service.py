"""
AI Orchestrator Service
Handles multi-model AI integration and intelligent provider selection
"""

import asyncio
import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

# Import vector knowledge service and agent manager
from .vector_knowledge_service import vector_knowledge_service, BusinessKnowledgeType
from .ai_agents.agent_manager import agent_manager

# AI Provider imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"

class MessageType(Enum):
    BUSINESS_ANALYSIS = "business_analysis"
    CUSTOMER_SERVICE = "customer_service"
    SCHEDULING = "scheduling"
    FINANCIAL = "financial"
    MARKETING = "marketing"
    GENERAL = "general"

class AIOrchestratorService:
    """
    Orchestrates AI requests across multiple providers with intelligent routing
    """
    
    def __init__(self):
        self.providers = {}
        self.provider_capabilities = {}
        self.conversation_context = {}
        self.setup_providers()
        
    def setup_providers(self):
        """Initialize available AI providers"""
        
        # OpenAI Setup
        if OPENAI_AVAILABLE:
            try:
                import os
                openai_key = os.getenv('OPENAI_API_KEY')
                if openai_key:
                    self.providers[AIProvider.OPENAI] = openai.AsyncOpenAI(api_key=openai_key)
                    self.provider_capabilities[AIProvider.OPENAI] = {
                        'strength': ['reasoning', 'analysis', 'code_generation'],
                        'max_tokens': 4096,
                        'supports_streaming': True,
                        'cost_efficiency': 'medium'
                    }
                    logger.info("✅ OpenAI provider initialized")
            except Exception as e:
                logger.warning(f"⚠️ OpenAI setup failed: {e}")
        
        # Anthropic Setup
        if ANTHROPIC_AVAILABLE:
            try:
                import os
                anthropic_key = os.getenv('ANTHROPIC_API_KEY')
                if anthropic_key:
                    self.providers[AIProvider.ANTHROPIC] = anthropic.AsyncAnthropic(api_key=anthropic_key)
                    self.provider_capabilities[AIProvider.ANTHROPIC] = {
                        'strength': ['analysis', 'reasoning', 'safety'],
                        'max_tokens': 8192,
                        'supports_streaming': True,
                        'cost_efficiency': 'high'
                    }
                    logger.info("✅ Anthropic provider initialized")
            except Exception as e:
                logger.warning(f"⚠️ Anthropic setup failed: {e}")
        
        # Gemini Setup
        if GEMINI_AVAILABLE:
            try:
                import os
                gemini_key = os.getenv('GOOGLE_AI_API_KEY') or os.getenv('GOOGLE_GEMINI_API_KEY')
                if gemini_key:
                    genai.configure(api_key=gemini_key)
                    self.providers[AIProvider.GEMINI] = genai.GenerativeModel('gemini-1.5-flash')
                    self.provider_capabilities[AIProvider.GEMINI] = {
                        'strength': ['multimodal', 'fast_response', 'efficiency'],
                        'max_tokens': 4096,
                        'supports_streaming': True,
                        'cost_efficiency': 'very_high'
                    }
                    logger.info("✅ Gemini provider initialized")
            except Exception as e:
                logger.warning(f"⚠️ Gemini setup failed: {e}")
        
        if not self.providers:
            logger.warning("⚠️ No AI providers available - using mock responses")
    
    def classify_message_type(self, message: str) -> MessageType:
        """Classify the message to route to the best provider"""
        message_lower = message.lower()
        
        # Business analysis keywords
        if any(word in message_lower for word in ['revenue', 'profit', 'analytics', 'performance', 'metrics', 'kpi']):
            return MessageType.BUSINESS_ANALYSIS
        
        # Customer service keywords
        if any(word in message_lower for word in ['customer', 'client', 'service', 'complaint', 'feedback', 'satisfaction']):
            return MessageType.CUSTOMER_SERVICE
        
        # Scheduling keywords
        if any(word in message_lower for word in ['schedule', 'appointment', 'booking', 'calendar', 'time', 'availability']):
            return MessageType.SCHEDULING
        
        # Financial keywords
        if any(word in message_lower for word in ['money', 'cost', 'price', 'payment', 'expense', 'budget', 'financial']):
            return MessageType.FINANCIAL
        
        # Marketing keywords
        if any(word in message_lower for word in ['marketing', 'promotion', 'social media', 'advertising', 'brand']):
            return MessageType.MARKETING
        
        return MessageType.GENERAL
    
    def select_optimal_provider(self, message: str, message_type: MessageType) -> AIProvider:
        """Select the best AI provider based on message type and availability"""
        
        if not self.providers:
            return None
        
        # Provider selection logic based on capabilities
        selection_preferences = {
            MessageType.BUSINESS_ANALYSIS: [AIProvider.ANTHROPIC, AIProvider.OPENAI, AIProvider.GEMINI],
            MessageType.CUSTOMER_SERVICE: [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.GEMINI],
            MessageType.SCHEDULING: [AIProvider.GEMINI, AIProvider.OPENAI, AIProvider.ANTHROPIC],
            MessageType.FINANCIAL: [AIProvider.ANTHROPIC, AIProvider.OPENAI, AIProvider.GEMINI],
            MessageType.MARKETING: [AIProvider.OPENAI, AIProvider.GEMINI, AIProvider.ANTHROPIC],
            MessageType.GENERAL: [AIProvider.GEMINI, AIProvider.OPENAI, AIProvider.ANTHROPIC]
        }
        
        # Select first available provider from preferences
        for provider in selection_preferences[message_type]:
            if provider in self.providers:
                return provider
        
        # Fallback to any available provider
        return next(iter(self.providers.keys()))
    
    async def chat_with_provider(self, provider: AIProvider, messages: List[Dict], context: Dict = None) -> Dict:
        """Chat with specific AI provider"""
        
        try:
            if provider == AIProvider.OPENAI:
                return await self._chat_openai(messages, context)
            elif provider == AIProvider.ANTHROPIC:
                return await self._chat_anthropic(messages, context)
            elif provider == AIProvider.GEMINI:
                return await self._chat_gemini(messages, context)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except Exception as e:
            logger.error(f"Error with {provider.value}: {e}")
            return await self._generate_fallback_response(messages[-1]['content'])
    
    async def _chat_openai(self, messages: List[Dict], context: Dict = None) -> Dict:
        """Chat with OpenAI"""
        client = self.providers[AIProvider.OPENAI]
        
        system_message = self._build_system_message(context)
        full_messages = [{"role": "system", "content": system_message}] + messages
        
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=full_messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        return {
            'provider': 'openai',
            'response': response.choices[0].message.content,
            'confidence': 0.85,
            'timestamp': datetime.now().isoformat(),
            'usage': {
                'prompt_tokens': response.usage.prompt_tokens,
                'completion_tokens': response.usage.completion_tokens,
                'total_tokens': response.usage.total_tokens
            }
        }
    
    async def _chat_anthropic(self, messages: List[Dict], context: Dict = None) -> Dict:
        """Chat with Anthropic Claude"""
        client = self.providers[AIProvider.ANTHROPIC]
        
        system_message = self._build_system_message(context)
        
        response = await client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=1000,
            temperature=0.7,
            system=system_message,
            messages=messages
        )
        
        return {
            'provider': 'anthropic',
            'response': response.content[0].text,
            'confidence': 0.90,
            'timestamp': datetime.now().isoformat(),
            'usage': {
                'prompt_tokens': response.usage.input_tokens,
                'completion_tokens': response.usage.output_tokens,
                'total_tokens': response.usage.input_tokens + response.usage.output_tokens
            }
        }
    
    async def _chat_gemini(self, messages: List[Dict], context: Dict = None) -> Dict:
        """Chat with Google Gemini"""
        model = self.providers[AIProvider.GEMINI]
        
        # Convert messages to Gemini format
        chat_history = []
        for msg in messages[:-1]:
            role = "user" if msg["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [msg["content"]]})
        
        chat = model.start_chat(history=chat_history)
        response = await chat.send_message_async(messages[-1]["content"])
        
        return {
            'provider': 'gemini',
            'response': response.text,
            'confidence': 0.80,
            'timestamp': datetime.now().isoformat(),
            'usage': {
                'prompt_tokens': response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else 0,
                'completion_tokens': response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else 0,
                'total_tokens': response.usage_metadata.total_token_count if hasattr(response, 'usage_metadata') else 0
            }
        }
    
    def _build_system_message(self, context: Dict = None) -> str:
        """Build system message with business context and RAG insights"""
        base_prompt = """You are an AI business coach specialized in barbershop operations and management. 
        You provide practical, actionable advice to help barbershop owners optimize their business operations, 
        improve customer satisfaction, and increase revenue.
        
        Your expertise includes:
        - Scheduling and appointment management
        - Customer service and retention
        - Revenue optimization and pricing strategies
        - Staff management and training
        - Marketing and social media
        - Financial planning and cost management
        
        Always provide specific, actionable recommendations with clear next steps."""
        
        if context:
            business_context = f"""
            
            Current Business Context:
            - Shop: {context.get('shop_name', 'Barbershop')}
            - Location: {context.get('location', 'Not specified')}
            - Staff: {context.get('staff_count', 'Not specified')} barbers
            - Recent Metrics: {context.get('recent_metrics', 'Not available')}
            """
            base_prompt += business_context
            
            # Add contextual insights from RAG system
            contextual_insights = context.get('contextual_insights', {})
            if contextual_insights and contextual_insights.get('relevant_knowledge'):
                rag_context = "\n\nRelevant Business Knowledge:\n"
                for i, knowledge in enumerate(contextual_insights['relevant_knowledge'][:3], 1):
                    rag_context += f"{i}. {knowledge['content'][:200]}...\n"
                
                if contextual_insights.get('key_insights'):
                    rag_context += f"\nKey Insights: {', '.join(contextual_insights['key_insights'])}\n"
                
                rag_context += "\nUse this knowledge to provide more specific and data-driven recommendations."
                base_prompt += rag_context
        
        return base_prompt
    
    async def _generate_fallback_response(self, message: str) -> Dict:
        """Generate fallback response when all providers fail"""
        
        fallback_responses = {
            'scheduling': "For scheduling optimization, consider implementing online booking, analyzing peak hours, and setting up automated reminders to reduce no-shows.",
            'customer': "Focus on customer retention by implementing a loyalty program, collecting feedback after each service, and personalizing the experience based on customer preferences.",
            'revenue': "To increase revenue, consider offering premium services, implementing dynamic pricing during peak hours, and creating service packages that encourage longer visits.",
            'default': "I'd be happy to help you optimize your barbershop operations. Could you provide more specific details about the challenge you're facing so I can give you more targeted advice?"
        }
        
        message_lower = message.lower()
        response_key = 'default'
        
        for key in fallback_responses:
            if key in message_lower:
                response_key = key
                break
        
        return {
            'provider': 'fallback',
            'response': fallback_responses[response_key],
            'confidence': 0.70,
            'timestamp': datetime.now().isoformat(),
            'fallback': True
        }
    
    async def enhanced_chat(self, message: str, session_id: str, business_context: Dict = None) -> Dict:
        """Main chat method with specialized agent integration, RAG, and AI provider fallback"""
        
        try:
            # Step 1: Try specialized agent system first
            agent_response = await agent_manager.process_message(
                message=message, 
                context=business_context or {}
            )
            
            # If we got a good response from specialized agents, use it
            if agent_response and agent_response.total_confidence > 0.6:
                logger.info(f"✅ Specialized agent response: {agent_response.primary_agent}")
                
                # Format agent response for consistent API
                return {
                    'provider': 'specialized_agent',
                    'response': agent_response.primary_response.response,
                    'confidence': agent_response.total_confidence,
                    'timestamp': datetime.now().isoformat(),
                    'agent_details': {
                        'primary_agent': agent_response.primary_agent,
                        'collaborative_agents': [r.agent_id for r in agent_response.collaborative_responses],
                        'coordination_summary': agent_response.coordination_summary,
                        'recommendations': agent_response.combined_recommendations,
                        'collaboration_score': agent_response.collaboration_score,
                        'business_impact': agent_response.primary_response.business_impact,
                        'action_items': agent_response.primary_response.action_items,
                        'follow_up_questions': agent_response.primary_response.follow_up_questions
                    },
                    'message_type': agent_response.primary_response.domain.value,
                    'knowledge_enhanced': True,  # Agents use specialized knowledge
                    'agent_enhanced': True
                }
            
            # Step 2: Fallback to traditional AI provider system
            logger.info("Using traditional AI provider fallback")
            
        except Exception as e:
            logger.error(f"Agent system error, falling back to AI providers: {e}")
        
        # Traditional AI provider flow (fallback)
        # Classify message type
        message_type = self.classify_message_type(message)
        
        # Get contextual insights from vector knowledge base
        contextual_insights = await vector_knowledge_service.get_contextual_insights(
            query=message,
            context=business_context
        )
        
        # Select optimal provider
        selected_provider = self.select_optimal_provider(message, message_type)
        
        if not selected_provider:
            logger.warning("No AI providers available, using fallback")
            fallback_response = await self._generate_fallback_response(message)
            # Enhance fallback with contextual insights
            fallback_response['contextual_insights'] = contextual_insights
            return fallback_response
        
        # Prepare messages with RAG context
        messages = [{"role": "user", "content": message}]
        
        # Add conversation context if available
        if session_id in self.conversation_context:
            context_messages = self.conversation_context[session_id][-4:]  # Last 4 messages for context
            messages = context_messages + messages
        
        # Enhance business context with vector knowledge insights
        enhanced_context = business_context.copy() if business_context else {}
        enhanced_context['contextual_insights'] = contextual_insights
        
        # Chat with selected provider using enhanced context
        response = await self.chat_with_provider(selected_provider, messages, enhanced_context)
        
        # Store conversation context
        if session_id not in self.conversation_context:
            self.conversation_context[session_id] = []
        
        self.conversation_context[session_id].extend([
            {"role": "user", "content": message},
            {"role": "assistant", "content": response['response']}
        ])
        
        # Store this interaction as knowledge for future learning
        await self._store_interaction_knowledge(message, response, message_type, business_context)
        
        # Add metadata including RAG insights
        response.update({
            'session_id': session_id,
            'message_type': message_type.value,
            'selected_provider': selected_provider.value if selected_provider else 'fallback',
            'contextual_insights': contextual_insights,
            'knowledge_enhanced': len(contextual_insights.get('relevant_knowledge', [])) > 0,
            'agent_enhanced': False  # Traditional AI provider response
        })
        
        return response
    
    async def _store_interaction_knowledge(self, message: str, response: Dict, message_type: MessageType, business_context: Dict = None):
        """Store successful interactions as knowledge for future learning"""
        try:
            # Create knowledge content from interaction
            interaction_content = f"User asked: '{message}' | AI provided advice about {message_type.value} with {response.get('confidence', 0.0)} confidence"
            
            # Determine appropriate knowledge type
            knowledge_type_mapping = {
                MessageType.BUSINESS_ANALYSIS: BusinessKnowledgeType.BUSINESS_METRICS,
                MessageType.CUSTOMER_SERVICE: BusinessKnowledgeType.CUSTOMER_INSIGHTS,
                MessageType.SCHEDULING: BusinessKnowledgeType.SCHEDULING_ANALYTICS,
                MessageType.FINANCIAL: BusinessKnowledgeType.REVENUE_PATTERNS,
                MessageType.MARKETING: BusinessKnowledgeType.MARKETING_EFFECTIVENESS,
                MessageType.GENERAL: BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES
            }
            
            knowledge_type = knowledge_type_mapping.get(message_type, BusinessKnowledgeType.OPERATIONAL_BEST_PRACTICES)
            
            # Store the interaction
            await vector_knowledge_service.store_knowledge(
                content=interaction_content,
                knowledge_type=knowledge_type,
                source="ai_interaction",
                metadata={
                    'message_type': message_type.value,
                    'confidence': response.get('confidence', 0.0),
                    'provider': response.get('provider', 'unknown'),
                    'business_context': business_context or {}
                }
            )
            
            logger.info(f"✅ Stored interaction knowledge: {message_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to store interaction knowledge: {e}")
    
    def get_provider_status(self) -> Dict:
        """Get status of all AI providers"""
        return {
            'available_providers': [p.value for p in self.providers.keys()],
            'total_providers': len(self.providers),
            'capabilities': {p.value: caps for p, caps in self.provider_capabilities.items()}
        }

# Global instance
ai_orchestrator = AIOrchestratorService()