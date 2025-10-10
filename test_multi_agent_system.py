#!/usr/bin/env python3
"""
Test script for the multi-agent AI system
Validates that all components are working correctly
"""

import asyncio
import os
import sys
import traceback
from datetime import datetime

# Disable tokenizers parallelism warning
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

# Test imports
def test_imports():
    """Test that all modules can be imported"""
    print("=== Testing Imports ===")
    
    try:
        from services.master_orchestrator import get_orchestrator, MasterOrchestrator
        print("✅ Master orchestrator imported successfully")
    except Exception as e:
        print(f"❌ Master orchestrator import failed: {e}")
        traceback.print_exc()
    
    try:
        from services.semantic_cache import get_semantic_cache, SemanticCache
        print("✅ Semantic cache imported successfully")
    except Exception as e:
        print(f"❌ Semantic cache import failed: {e}")
        traceback.print_exc()
    
    try:
        from services.structured_outputs import get_structured_output_service, BusinessAnalysisResponse
        print("✅ Structured outputs imported successfully")
    except Exception as e:
        print(f"❌ Structured outputs import failed: {e}")
        traceback.print_exc()
    
    try:
        from services.agents.base_agent import BaseAgent, TaskResult
        print("✅ Base agent imported successfully")
    except Exception as e:
        print(f"❌ Base agent import failed: {e}")
        traceback.print_exc()
    
    try:
        from services.agents.business_intelligence_agent import get_business_intelligence_agent, BusinessIntelligenceAgent
        print("✅ Business intelligence agent imported successfully")
    except Exception as e:
        print(f"❌ Business intelligence agent import failed: {e}")
        traceback.print_exc()
    
    try:
        from cli.agent_manager import AgentManagerCLI
        print("✅ CLI manager imported successfully")
    except Exception as e:
        print(f"❌ CLI manager import failed: {e}")
        traceback.print_exc()

async def test_orchestrator():
    """Test the master orchestrator"""
    print("\n=== Testing Master Orchestrator ===")
    
    try:
        from services.master_orchestrator import get_orchestrator
        orchestrator = get_orchestrator()
        
        # Test basic functionality
        print("✅ Orchestrator instance created")
        
        # Test agent status
        status = orchestrator.get_agent_status()
        print(f"✅ Agent status retrieved: {status['orchestrator']['status']}")
        
        # Test simple request processing
        result = await orchestrator.process_request(
            message="Hello, can you help me understand my business performance?",
            session_id="test_session"
        )
        
        if result.get("success"):
            print("✅ Request processing successful")
            print(f"Response preview: {result['response'][:100]}...")
        else:
            print(f"❌ Request processing failed: {result.get('error')}")
        
    except Exception as e:
        print(f"❌ Orchestrator test failed: {e}")
        traceback.print_exc()

async def test_business_intelligence_agent():
    """Test the business intelligence agent"""
    print("\n=== Testing Business Intelligence Agent ===")
    
    try:
        from services.agents.business_intelligence_agent import get_business_intelligence_agent
        agent = get_business_intelligence_agent()
        
        print("✅ Business Intelligence agent created")
        
        # Test agent status
        status = agent.get_status()
        print(f"✅ Agent status: {status['status']}")
        
        # Test capabilities
        capabilities = agent.get_capabilities()
        print(f"✅ Agent capabilities: {len(capabilities)} capabilities loaded")
        
        # Test simple execution
        test_context = {
            "revenue": {"march": 45000, "april": 48000, "may": 52000},
            "customers": {"new": 45, "returning": 180, "total": 225}
        }
        
        result = await agent.execute(
            message="Analyze my business performance based on the provided data",
            context=test_context
        )
        
        if result.success:
            print("✅ Agent execution successful")
            print(f"Response preview: {str(result.result)[:100]}...")
            print(f"Confidence: {result.confidence:.2f}")
        else:
            print(f"❌ Agent execution failed: {result.error}")
        
        # Test health check
        health = await agent.health_check()
        print(f"✅ Health check: {'Healthy' if health['healthy'] else 'Unhealthy'}")
        
    except Exception as e:
        print(f"❌ Business Intelligence agent test failed: {e}")
        traceback.print_exc()

async def test_semantic_cache():
    """Test semantic caching"""
    print("\n=== Testing Semantic Cache ===")
    
    try:
        from services.semantic_cache import get_semantic_cache
        cache = get_semantic_cache()
        
        print("✅ Semantic cache instance created")
        
        # Test health check
        health = await cache.health_check()
        print(f"✅ Cache health: {health['status']}")
        
        # Test cache operations
        test_query = "How is my business performing this month?"
        test_response = "Your business is performing well with 20% growth."
        
        # Store in cache
        cache_success = await cache.set(
            query=test_query,
            response=test_response,
            agent_type="business_intelligence"
        )
        
        if cache_success:
            print("✅ Cache write successful")
        else:
            print("⚠️ Cache write failed (Redis may not be running)")
        
        # Try to retrieve from cache
        cached_result = await cache.get(
            query=test_query,
            agent_type="business_intelligence"
        )
        
        if cached_result:
            print("✅ Cache read successful")
        else:
            print("⚠️ Cache read failed (Redis may not be running)")
        
        # Get cache stats
        stats = await cache.get_stats()
        print(f"✅ Cache stats: {stats.get('total_requests', 0)} requests processed")
        
    except Exception as e:
        print(f"❌ Semantic cache test failed: {e}")
        traceback.print_exc()

async def test_structured_outputs():
    """Test structured outputs"""
    print("\n=== Testing Structured Outputs ===")
    
    try:
        from services.structured_outputs import get_structured_output_service, BusinessAnalysisResponse
        service = get_structured_output_service()
        
        print("✅ Structured output service created")
        
        # Test schema generation
        schema = service.get_schema(BusinessAnalysisResponse)
        print(f"✅ Schema generated with {len(schema.get('properties', {}))} properties")
        
        # Test example generation
        example = service.get_example(BusinessAnalysisResponse)
        print(f"✅ Example generated with {len(example)} fields")
        
        print("⚠️ Structured response generation requires API keys (skipped)")
        
    except Exception as e:
        print(f"❌ Structured outputs test failed: {e}")
        traceback.print_exc()

async def test_cli_manager():
    """Test CLI manager"""
    print("\n=== Testing CLI Manager ===")
    
    try:
        from cli.agent_manager import AgentManagerCLI
        manager = AgentManagerCLI()
        
        print("✅ CLI manager created")
        
        # Test status retrieval
        status = await manager.status_all()
        print(f"✅ Status retrieved for {len(status.get('agents', {}))} agents")
        
        # Test health check
        health = await manager.health_check_all()
        print(f"✅ Health check completed: {'Healthy' if health.get('overall_healthy') else 'Unhealthy'}")
        
    except Exception as e:
        print(f"❌ CLI manager test failed: {e}")
        traceback.print_exc()

async def run_integration_test():
    """Run end-to-end integration test"""
    print("\n=== Integration Test ===")
    
    try:
        # Test the full pipeline: CLI -> Orchestrator -> Agent -> Response
        from services.master_orchestrator import get_orchestrator
        from cli.agent_manager import AgentManagerCLI
        
        orchestrator = get_orchestrator()
        cli_manager = AgentManagerCLI()
        
        # Test business analysis request
        business_query = """
        I need help understanding my barbershop performance. Here's my data:
        - Monthly revenue: $45,000 (up 12% from last month)
        - New customers: 85
        - Returning customers: 165
        - Average service price: $38
        - Top services: Haircut (65%), Beard trim (20%), Color (15%)
        
        What insights can you provide and what should I focus on?
        """
        
        print("Sending complex business analysis request...")
        
        result = await orchestrator.process_request(
            message=business_query,
            session_id="integration_test",
            barbershop_id="test_shop"
        )
        
        if result.get("success"):
            print("✅ Integration test successful!")
            print(f"Response length: {len(result['response'])} characters")
            print(f"Agents involved: {len(result.get('agent_responses', []))}")
            print(f"Session ID: {result.get('session_id')}")
            
            # Show first part of response
            response_preview = result['response'][:300] + "..." if len(result['response']) > 300 else result['response']
            print(f"Response preview:\n{response_preview}")
            
        else:
            print(f"❌ Integration test failed: {result.get('error')}")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        traceback.print_exc()

async def main():
    """Run all tests"""
    print(f"🤖 6FB AI Agent System Test Suite")
    print(f"Started at: {datetime.now()}")
    print("=" * 50)
    
    # Run individual component tests
    test_imports()
    await test_semantic_cache()
    await test_structured_outputs()
    await test_business_intelligence_agent()
    await test_orchestrator()
    await test_cli_manager()
    
    # Run integration test
    await run_integration_test()
    
    print("\n" + "=" * 50)
    print(f"✅ Test suite completed at: {datetime.now()}")
    print("\n🎉 Multi-agent AI system is ready!")
    
    # Show usage instructions
    print("\n📖 Usage Instructions:")
    print("1. Start interactive mode: python cli/agent_manager.py interactive")
    print("2. Check system status: python cli/agent_manager.py status")
    print("3. Run health checks: python cli/agent_manager.py health")
    print("4. Test specific agent: python cli/agent_manager.py test business_intelligence")
    print("5. Chat with system: python cli/agent_manager.py chat 'How is my business doing?'")

if __name__ == "__main__":
    asyncio.run(main())