#!/usr/bin/env python3
"""
Test script to verify AI agents now use business context instead of asking for basic info
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ai_orchestrator_service import ai_orchestrator
from services.ai_agents.agent_manager import agent_manager

async def test_ai_context_fix():
    """Test that AI agents use business context instead of asking for basic information"""
    
    print("🧪 Testing AI Context Fix...")
    print("="*50)
    
    # Test messages that used to cause agents to ask for basic info
    test_messages = [
        "How can I improve my revenue?",
        "What's the best way to grow my business?", 
        "Help me with my barbershop finances",
        "I want to increase my profits"
    ]
    
    # Simulate user session
    session_id = "test_session_001"
    
    for i, message in enumerate(test_messages, 1):
        print(f"\n🔍 Test {i}: '{message}'")
        print("-" * 40)
        
        try:
            # Test with AI orchestrator (includes business context loading)
            response = await ai_orchestrator.enhanced_chat(
                message=message,
                session_id=session_id,
                business_context={'barbershop_id': 'test_shop'}
            )
            
            print(f"✅ Provider: {response.get('provider', 'Unknown')}")
            print(f"✅ Confidence: {response.get('confidence', 0.0):.2f}")
            print(f"✅ Has Business Data: {response.get('analytics_enhanced', False)}")
            
            # Check if response contains business-specific information
            response_text = response.get('response', '').lower()
            
            # Red flags - shouldn't ask for basic info
            asking_for_info = any(phrase in response_text for phrase in [
                "what is your business",
                "tell me about your",
                "what products do you offer",
                "what services do you provide",
                "what is your target market",
                "i do not have access to",
                "could you provide more information about"
            ])
            
            # Green flags - should use specific business context
            using_context = any(phrase in response_text for phrase in [
                "your current revenue",
                "based on your business",
                "your barbershop",
                "your customers", 
                "your appointments",
                "your monthly revenue",
                "$" in response_text,  # Contains monetary amounts
                "%" in response_text   # Contains percentages
            ])
            
            if asking_for_info:
                print("❌ ISSUE: AI is still asking for basic business information")
                print(f"Response preview: {response_text[:200]}...")
            elif using_context:
                print("✅ SUCCESS: AI is using business context appropriately")
            else:
                print("⚠️ UNCLEAR: Response doesn't clearly show context usage")
            
            print(f"Response preview: {response.get('response', '')[:150]}...")
            
        except Exception as e:
            print(f"❌ ERROR: {e}")
    
    print("\n" + "="*50)
    print("🏁 Test Complete")
    
    # Test agent manager directly
    print("\n🔍 Testing Agent Manager Context Integration...")
    try:
        agent_response = await agent_manager.process_message(
            message="Help me increase my barbershop revenue",
            context={
                'barbershop_id': 'test_shop',
                'business_name': 'Test Barbershop',
                'monthly_revenue': 12000,
                'customer_count': 150
            }
        )
        
        if agent_response:
            print(f"✅ Agent Manager Response - Primary Agent: {agent_response.primary_agent}")
            print(f"✅ Confidence: {agent_response.total_confidence:.2f}")
            print(f"Preview: {agent_response.primary_response.response[:150]}...")
        else:
            print("❌ No agent response received")
            
    except Exception as e:
        print(f"❌ Agent Manager Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ai_context_fix())