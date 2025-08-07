"""
LangChain-based AI Agent Orchestrator
Replaces multiple AI service integrations with unified interface
"""

from langchain.agents import AgentExecutor, create_react_agent
from langchain.memory import ConversationSummaryBufferMemory
from langchain.callbacks import AsyncCallbackHandler
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.tools import Tool
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains import ConversationalRetrievalChain
from typing import Dict, List, Any, Optional
import asyncio
import json
from datetime import datetime
import os

class BusinessCoachAgent:
    """Enterprise-grade Business Coach using LangChain"""
    
    def __init__(self):
        # Initialize LLMs with fallback
        self.primary_llm = ChatAnthropic(
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            model="claude-3-opus-20240229",
            temperature=0.7
        )
        
        self.fallback_llm = ChatOpenAI(
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            model="gpt-4-turbo-preview",
            temperature=0.7
        )
        
        # Initialize memory with token limit
        self.memory = ConversationSummaryBufferMemory(
            llm=self.fallback_llm,
            max_token_limit=2000,
            return_messages=True,
            memory_key="chat_history"
        )
        
        # Initialize embeddings and vector store for RAG
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = Chroma(
            persist_directory="./chroma_db",
            embedding_function=self.embeddings
        )
        
        # Define tools
        self.tools = [
            Tool(
                name="BusinessAnalytics",
                description="Analyze business metrics and provide insights",
                func=self._analyze_business_metrics
            ),
            Tool(
                name="MarketingStrategy",
                description="Generate marketing strategies and campaigns",
                func=self._generate_marketing_strategy
            ),
            Tool(
                name="FinancialAdvice",
                description="Provide financial planning and budgeting advice",
                func=self._provide_financial_advice
            ),
            Tool(
                name="KnowledgeBase",
                description="Search barbershop business knowledge base",
                func=self._search_knowledge_base
            )
        ]
        
        # Create the prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert business coach for barbershops, following the Six Figure Barber methodology.
            
Your role is to:
1. Provide actionable business advice
2. Help increase revenue and efficiency
3. Build strong client relationships
4. Develop professional brand
5. Enable business scalability

Always be encouraging, specific, and results-focused."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            ("assistant", "I'll help you with that. Let me analyze the best approach.\n\n{agent_scratchpad}")
        ])
        
        # Create the agent
        self.agent = create_react_agent(
            llm=self.primary_llm,
            tools=self.tools,
            prompt=self.prompt
        )
        
        # Create agent executor with error handling
        self.agent_executor = AgentExecutor(
            agent=self.agent,
            tools=self.tools,
            memory=self.memory,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5
        )
    
    async def process_message(
        self, 
        message: str, 
        context: Optional[Dict[str, Any]] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Process a message with full context and memory"""
        
        try:
            # Add context to the message if provided
            enriched_input = message
            if context:
                enriched_input = f"{message}\n\nContext: {json.dumps(context)}"
            
            # Get response from agent
            response = await self.agent_executor.ainvoke({
                "input": enriched_input
            })
            
            # Extract insights and suggestions
            insights = self._extract_insights(response['output'])
            suggestions = self._generate_action_items(response['output'])
            
            return {
                "response": response['output'],
                "insights": insights,
                "suggestions": suggestions,
                "tools_used": [tool.name for tool in self.tools if tool.name in str(response)],
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            # Fallback to simple LLM response
            fallback_response = await self.fallback_llm.ainvoke(message)
            return {
                "response": fallback_response.content,
                "insights": [],
                "suggestions": ["Let me know if you need more specific guidance."],
                "error": str(e),
                "fallback": True
            }
    
    def _analyze_business_metrics(self, query: str) -> str:
        """Analyze business metrics based on query"""
        # This would connect to your analytics database
        return f"Based on your metrics, here's my analysis: [Simulated analytics for: {query}]"
    
    def _generate_marketing_strategy(self, query: str) -> str:
        """Generate marketing strategies"""
        strategies = [
            "Instagram Reels showcasing transformations",
            "Google My Business optimization",
            "Client referral program with incentives",
            "Email campaign for inactive clients"
        ]
        return f"Marketing strategy recommendations: {', '.join(strategies[:2])}"
    
    def _provide_financial_advice(self, query: str) -> str:
        """Provide financial planning advice"""
        return "Financial advice: Track daily revenue, aim for 30% profit margins, invest in quality tools"
    
    def _search_knowledge_base(self, query: str) -> str:
        """Search the vector knowledge base"""
        results = self.vector_store.similarity_search(query, k=3)
        if results:
            return f"Relevant knowledge: {results[0].page_content[:200]}..."
        return "No specific knowledge found, but I can provide general guidance."
    
    def _extract_insights(self, response: str) -> List[str]:
        """Extract key insights from response"""
        # Simple extraction - in production, use NLP
        insights = []
        if "increase" in response.lower():
            insights.append("Opportunity for revenue growth identified")
        if "client" in response.lower():
            insights.append("Client relationship focus recommended")
        return insights
    
    def _generate_action_items(self, response: str) -> List[str]:
        """Generate actionable suggestions"""
        # Simple generation - enhance with LLM in production
        suggestions = []
        if "marketing" in response.lower():
            suggestions.append("Create weekly social media content calendar")
        if "financial" in response.lower():
            suggestions.append("Review pricing structure for services")
        return suggestions or ["Schedule follow-up coaching session"]
    
    async def get_conversation_summary(self, session_id: str) -> str:
        """Get summary of conversation"""
        messages = self.memory.chat_memory.messages
        if not messages:
            return "No conversation history"
        
        summary_prompt = f"Summarize this coaching conversation in 3-5 bullet points: {messages}"
        summary = await self.fallback_llm.ainvoke(summary_prompt)
        return summary.content
    
    def clear_memory(self):
        """Clear conversation memory"""
        self.memory.clear()


# Factory function for creating specialized agents
class AgentFactory:
    """Factory for creating specialized LangChain agents"""
    
    @staticmethod
    def create_agent(agent_type: str) -> BusinessCoachAgent:
        """Create specialized agent based on type"""
        # For now, return the main coach
        # Extend this to create specialized agents
        return BusinessCoachAgent()
    
    @staticmethod
    def create_marketing_agent() -> AgentExecutor:
        """Create specialized marketing agent"""
        # Implementation for marketing-specific agent
        pass
    
    @staticmethod
    def create_financial_agent() -> AgentExecutor:
        """Create specialized financial planning agent"""
        # Implementation for financial-specific agent
        pass


# Async context manager for agent lifecycle
class AgentContext:
    """Context manager for agent operations"""
    
    def __init__(self, agent_type: str = "business_coach"):
        self.agent_type = agent_type
        self.agent = None
    
    async def __aenter__(self):
        self.agent = AgentFactory.create_agent(self.agent_type)
        return self.agent
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.agent:
            self.agent.clear_memory()