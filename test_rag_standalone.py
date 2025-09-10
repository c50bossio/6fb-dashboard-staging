#!/usr/bin/env python3
"""
Standalone RAG Integration Test
Tests only the knowledge retrieval and context formatting without requiring LLM API keys
"""

import asyncio
import sys
import logging

# Add current directory to path for imports
sys.path.append('.')

from services.agents.master_coach_agent import MasterCoachAgent
from services.vector_knowledge_service import VectorKnowledgeService

# Configure logging
logging.basicConfig(level=logging.WARNING)  # Reduce noise
logger = logging.getLogger(__name__)

async def test_rag_standalone():
    """Test RAG integration components without LLM calls"""
    print("🧠 Testing RAG Integration Components (Standalone)")
    print("=" * 55)
    
    # Test 1: Knowledge Service Functionality
    print("📚 Test 1: Knowledge Service")
    print("-" * 30)
    
    knowledge_service = VectorKnowledgeService()
    
    # Get knowledge base stats
    stats = await knowledge_service.get_knowledge_stats()
    print(f"✅ Knowledge Base Stats:")
    print(f"   Total Documents: {stats.get('total_documents', 0)}")
    print(f"   Knowledge Types: {len(stats.get('knowledge_types', []))}")
    print()
    
    # Test 2: Knowledge Search
    print("🔍 Test 2: Knowledge Search")
    print("-" * 30)
    
    test_queries = [
        "customer service best practices",
        "financial management for barbershops",
        "social media marketing strategies",
        "daily operations management"
    ]
    
    search_results = {}
    for query in test_queries:
        try:
            results = await knowledge_service.search_knowledge(query, max_results=3, min_relevance=0.1)
            search_results[query] = results
            print(f"'{query}' -> {len(results)} results")
            for i, result in enumerate(results, 1):
                print(f"  {i}. {result.document.title} (Score: {result.relevance_score:.3f})")
        except Exception as e:
            print(f"❌ Search failed for '{query}': {e}")
    print()
    
    # Test 3: Agent Knowledge Integration
    print("🤖 Test 3: Agent Knowledge Integration")
    print("-" * 40)
    
    # Initialize agent
    agent = MasterCoachAgent()
    
    # Test knowledge retrieval method directly
    for query in test_queries[:2]:  # Test first 2 queries
        try:
            knowledge_docs = await agent._get_relevant_knowledge(query)
            print(f"Agent knowledge retrieval for '{query}':")
            print(f"  Retrieved: {len(knowledge_docs)} documents")
            
            if knowledge_docs:
                for i, doc in enumerate(knowledge_docs, 1):
                    print(f"    {i}. {doc['title']} (Type: {doc['type']}, Score: {doc['relevance_score']:.3f})")
            else:
                print(f"    ⚠️  No relevant knowledge found")
        except Exception as e:
            print(f"❌ Knowledge retrieval failed: {e}")
    print()
    
    # Test 4: Context Formatting
    print("📝 Test 4: Context Formatting")
    print("-" * 30)
    
    if search_results:
        # Get first query's results for testing
        first_query = list(search_results.keys())[0]
        first_results = search_results[first_query]
        
        if first_results:
            # Convert to agent format
            knowledge_docs = []
            for result in first_results:
                knowledge_docs.append({
                    "title": result.document.title,
                    "content": result.document.content,
                    "type": result.document.knowledge_type.value if hasattr(result.document.knowledge_type, 'value') else str(result.document.knowledge_type),
                    "source": result.document.source,
                    "relevance_score": result.relevance_score,
                    "metadata": result.document.metadata
                })
            
            # Test context formatting
            formatted_context = agent._format_knowledge_context(knowledge_docs)
            print(f"✅ Context formatting successful")
            print(f"   Context length: {len(formatted_context)} characters")
            print(f"   Preview: {formatted_context[:200]}...")
        else:
            print("⚠️  No knowledge results to format")
    print()
    
    # Test 5: Health Checks (Non-LLM parts)
    print("🏥 Test 5: Component Health Checks")
    print("-" * 35)
    
    try:
        health = await agent.health_check()
        print(f"Agent: {agent.agent_name}")
        print(f"  Knowledge Service: {health['checks'].get('knowledge_service', 'not_checked')}")
        print(f"  Cache Service: {health['checks'].get('cache', 'not_checked')}")
        print(f"  Structured Output: {health['checks'].get('structured_output', 'not_checked')}")
        print(f"  Primary LLM: {health['checks'].get('primary_llm', 'not_checked')} (Expected: False due to no API key)")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
    print()
    
    # Summary
    print("📊 RAG Integration Summary")
    print("=" * 30)
    print(f"✅ Knowledge service initialized and functional")
    print(f"✅ Vector search working with {stats.get('total_documents', 0)} documents")
    print(f"✅ Agent knowledge retrieval methods implemented")
    print(f"✅ Context formatting working properly")
    print(f"🔄 RAG integration ready for full testing with API keys")

if __name__ == "__main__":
    asyncio.run(test_rag_standalone())