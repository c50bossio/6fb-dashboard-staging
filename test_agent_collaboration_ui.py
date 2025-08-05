#!/usr/bin/env python3
"""
Test script for agent collaboration UI components
"""

import asyncio
import json
import sys
import os

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_agent_collaboration():
    """Test the agent manager collaboration system"""
    try:
        print("🧪 Testing Agent Collaboration System...")
        
        # Import the agent manager
        from services.ai_agents.agent_manager import agent_manager
        
        print("✅ Successfully imported agent_manager")
        
        # Test with a multi-domain business question that should trigger collaboration
        test_message = "How can I increase my barbershop's revenue while improving customer satisfaction and optimizing staff scheduling?"
        
        print(f"🎯 Testing collaborative query: {test_message[:80]}...")
        
        # Create business context
        context = {
            'barbershop_id': 'demo-shop-001',
            'daily_revenue': 420,
            'customer_satisfaction': 4.1,
            'staff_utilization': 0.78,
            'customer_retention_rate': 0.73
        }
        
        # Process the message through agent manager
        collaboration_response = await agent_manager.process_message(
            test_message,
            context,
            {'analysis_depth': 'comprehensive'}
        )
        
        print("\n📊 Collaboration Response Generated!")
        print("=" * 60)
        
        # Display collaboration details
        print(f"Primary Agent: {collaboration_response.primary_agent}")
        print(f"Collaborative Agents: {len(collaboration_response.collaborative_responses)}")
        print(f"Total Confidence: {collaboration_response.total_confidence:.2f}")
        print(f"Collaboration Score: {collaboration_response.collaboration_score:.2f}")
        print(f"Is Multi-Agent: {len(collaboration_response.collaborative_responses) > 0}")
        
        print(f"\n🤖 Coordination Summary:")
        print(collaboration_response.coordination_summary)
        
        # Show collaborative responses
        if collaboration_response.collaborative_responses:
            print(f"\n👥 Collaborative Responses:")
            for i, collab_resp in enumerate(collaboration_response.collaborative_responses, 1):
                print(f"\n{i}. {collab_resp.agent_id}:")
                print(f"   Domain: {collab_resp.domain.value}")
                print(f"   Confidence: {collab_resp.confidence:.2f}")
                print(f"   Response: {collab_resp.response[:150]}...")
                print(f"   Recommendations: {len(collab_resp.recommendations)}")
        
        # Show combined recommendations
        print(f"\n🎯 Combined Recommendations ({len(collaboration_response.combined_recommendations)}):")
        for i, rec in enumerate(collaboration_response.combined_recommendations[:5], 1):
            print(f"{i}. {rec}")
        
        print(f"\n✅ Agent Collaboration Test Completed Successfully!")
        
        # Test agent status
        print(f"\n🔍 Testing Agent Status...")
        agent_status = agent_manager.get_agent_status()
        
        print(f"Total Agents: {agent_status['total_agents']}")
        print(f"Active Agents: {agent_status['active_agents']}")
        print(f"System Status: {agent_status['system_status']}")
        print(f"Collaboration Patterns: {agent_status['collaboration_patterns']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_performance_metrics():
    """Test collaboration performance metrics"""
    try:
        print("\n📈 Testing Performance Metrics...")
        
        from services.ai_agents.agent_manager import agent_manager
        
        metrics = agent_manager.get_performance_metrics()
        
        if metrics.get('status') == 'no_data':
            print("⚠️ No performance data available yet")
            return True
        
        print(f"Average Agents Matched: {metrics.get('avg_agents_matched', 0):.2f}")
        print(f"Average Confidence: {metrics.get('avg_confidence', 0):.2f}")
        print(f"Most Used Agent: {metrics.get('most_used_agent', 'N/A')}")
        print(f"Routing Success Rate: {metrics.get('routing_success_rate', 0):.2f}")
        print(f"Collaboration Rate: {metrics.get('collaboration_rate', 0):.2f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Performance metrics test failed: {e}")
        return False

async def main():
    """Run all collaboration tests"""
    print("🚀 Starting Agent Collaboration UI Tests")
    print("=" * 60)
    
    success_count = 0
    total_tests = 2
    
    # Test 1: Agent collaboration
    if await test_agent_collaboration():
        success_count += 1
    
    # Test 2: Performance metrics
    if await test_performance_metrics():
        success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📈 Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! Agent collaboration system is ready for UI integration.")
    else:
        print(f"⚠️ {total_tests - success_count} test(s) failed.")
    
    return success_count == total_tests

if __name__ == "__main__":
    asyncio.run(main())