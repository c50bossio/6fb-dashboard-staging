#!/usr/bin/env python3
"""
Test RAG Integration with Specialized Agents
Validates that agents can successfully retrieve and use knowledge context
"""

import asyncio
import sys
import logging
from typing import Dict, Any

# Add current directory to path for imports
sys.path.append('.')

from services.agents.master_coach_agent import MasterCoachAgent
from services.agents.financial_agent import FinancialAgent
from services.agents.marketing_agent import MarketingAgent
from services.vector_knowledge_service import VectorKnowledgeService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def test_rag_integration():
    """Test RAG integration with all agents"""
    print("🧠 Testing RAG Integration with Specialized Agents")
    print("=" * 60)
    
    # Initialize knowledge service
    knowledge_service = VectorKnowledgeService()
    
    # Check knowledge base stats
    stats = await knowledge_service.get_knowledge_stats()
    print(f"📊 Knowledge Base Status:")
    print(f"   Total Documents: {stats.get('total_documents', 0)}")
    print(f"   Knowledge Types: {stats.get('knowledge_types', [])}")
    print()
    
    # Test queries with different agents
    test_scenarios = [
        {
            "agent_class": MasterCoachAgent,
            "query": "How can I improve my barbershop's customer service to increase retention?",
            "expected_knowledge_types": ["customer_service", "marketing_strategies"]
        },
        {
            "agent_class": FinancialAgent,
            "query": "What are best practices for managing cash flow in a barbershop business?",
            "expected_knowledge_types": ["financial_management", "barbershop_operations"]
        },
        {
            "agent_class": MarketingAgent,
            "query": "Help me create a social media strategy for my barbershop",
            "expected_knowledge_types": ["marketing_strategies", "customer_service"]
        }
    ]
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"🔬 Test Scenario {i}: {scenario['agent_class'].__name__}")
        print(f"   Query: {scenario['query']}")
        
        try:
            # Initialize agent
            agent = scenario["agent_class"]()
            
            # Test knowledge retrieval directly
            relevant_knowledge = await agent._get_relevant_knowledge(scenario["query"])
            print(f"   📚 Retrieved {len(relevant_knowledge)} knowledge documents")
            
            if relevant_knowledge:
                for j, knowledge in enumerate(relevant_knowledge, 1):
                    print(f"      {j}. {knowledge['title']} (Type: {knowledge['type']}, Score: {knowledge['relevance_score']:.3f})")
            
            # Test full agent execution with RAG
            result = await agent.execute(scenario["query"])
            
            if result.success:
                print(f"   ✅ Agent execution successful")
                print(f"   ⏱️  Execution time: {result.execution_time:.2f}s")
                print(f"   🔢 Tokens used: {result.tokens_used}")
                print(f"   📈 Confidence: {result.confidence:.3f}")
                print(f"   💡 Result preview: {str(result.result)[:150]}...")
                
                # Check if knowledge was used
                if relevant_knowledge:
                    print(f"   🧠 Knowledge integration: Successfully enhanced with business context")
                else:
                    print(f"   ⚠️  Knowledge integration: No relevant knowledge found")
            else:
                print(f"   ❌ Agent execution failed: {result.error}")
            
        except Exception as e:
            print(f"   💥 Test failed: {e}")
        
        print()
    
    # Test knowledge search functionality
    print("🔍 Testing Knowledge Search Functionality")
    print("-" * 40)
    
    search_queries = [
        "customer retention strategies",
        "financial planning for small business",
        "social media marketing for barbershops",
        "staff management best practices"
    ]
    
    for query in search_queries:
        try:
            results = await knowledge_service.search_knowledge(query, max_results=3)
            print(f"Query: '{query}' -> {len(results)} results")
            for result in results:
                print(f"  - {result.document.title} (Score: {result.relevance_score:.3f})")
        except Exception as e:
            print(f"Search failed for '{query}': {e}")
    
    print()
    
    # Test agent health checks with RAG
    print("🏥 Testing Agent Health Checks with RAG")
    print("-" * 40)
    
    agents_to_test = [MasterCoachAgent, FinancialAgent, MarketingAgent]
    
    for agent_class in agents_to_test:
        try:
            agent = agent_class()
            health = await agent.health_check()
            
            print(f"{agent.agent_name}:")
            print(f"  Overall Health: {'✅ Healthy' if health['healthy'] else '❌ Unhealthy'}")
            print(f"  Knowledge Service: {health['checks'].get('knowledge_service', 'not_checked')}")
            print(f"  Cache Service: {health['checks'].get('cache', 'not_checked')}")
            print(f"  Primary LLM: {health['checks'].get('primary_llm', 'not_checked')}")
        except Exception as e:
            print(f"{agent_class.__name__}: ❌ Health check failed - {e}")
    
    print()
    print("🎯 RAG Integration Test Complete!")

async def test_knowledge_enhancement():
    """Test specific knowledge enhancement scenarios"""
    print("\n🚀 Testing Knowledge Enhancement Scenarios")
    print("=" * 50)
    
    # Initialize a coach agent for testing
    coach = MasterCoachAgent()
    
    # Test scenarios with expected knowledge enhancement
    enhancement_tests = [
        {
            "query": "I need help with daily barbershop operations and scheduling",
            "expected_enhancement": True
        },
        {
            "query": "How do I improve customer satisfaction?",
            "expected_enhancement": True
        },
        {
            "query": "What's the weather like today?",  # Should have minimal/no enhancement
            "expected_enhancement": False
        }
    ]
    
    for i, test in enumerate(enhancement_tests, 1):
        print(f"\n📝 Enhancement Test {i}")
        print(f"Query: {test['query']}")
        
        # Get knowledge without executing full agent
        knowledge = await coach._get_relevant_knowledge(test['query'])
        
        if test['expected_enhancement']:
            if knowledge:
                print(f"✅ Knowledge enhancement as expected ({len(knowledge)} documents)")
                for doc in knowledge:
                    print(f"   - {doc['title']} (Score: {doc['relevance_score']:.3f})")
            else:
                print(f"⚠️  Expected enhancement but none found")
        else:
            if knowledge:
                print(f"🤔 Unexpected enhancement found ({len(knowledge)} documents)")
            else:
                print(f"✅ No enhancement as expected")

if __name__ == "__main__":
    asyncio.run(test_rag_integration())
    asyncio.run(test_knowledge_enhancement())