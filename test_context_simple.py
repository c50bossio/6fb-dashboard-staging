#!/usr/bin/env python3
"""
Simple test to verify AI context fix is working
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ai_orchestrator_service import ai_orchestrator

async def test_context_fix():
    """Test that AI provides contextual advice instead of asking for basic info"""
    
    print("🧪 Testing AI Context Fix - Simple Test")
    print("="*50)
    
    # Test message that previously would ask for business information
    test_message = "How can I increase my barbershop revenue?"
    session_id = "test_session"
    
    print(f"📩 User Message: '{test_message}'")
    print("-" * 50)
    
    try:
        # Get AI response with business context
        response = await ai_orchestrator.enhanced_chat(
            message=test_message,
            session_id=session_id,
            business_context={'barbershop_id': 'test_shop'}
        )
        
        print(f"🤖 AI Provider: {response.get('provider', 'Unknown')}")
        print(f"📊 Confidence: {response.get('confidence', 0):.2f}")
        print(f"📈 Analytics Enhanced: {response.get('analytics_enhanced', False)}")
        print(f"🧠 Agent Enhanced: {response.get('agent_enhanced', False)}")
        
        # Show the full response
        ai_response = response.get('response', '')
        print(f"\n💬 AI Response:")
        print("="*50)
        print(ai_response)
        print("="*50)
        
        # Check if it's using business context (good) vs asking for info (bad)
        response_lower = ai_response.lower()
        
        asking_patterns = [
            "i do not have access to",
            "tell me about your business", 
            "what is your business name",
            "what services do you offer",
            "what is your target market"
        ]
        
        using_context_patterns = [
            "your barbershop",
            "current revenue", 
            "monthly revenue",
            "your customers",
            "your business",
            "$"
        ]
        
        is_asking = any(pattern in response_lower for pattern in asking_patterns)
        is_using_context = any(pattern in response_lower for pattern in using_context_patterns)
        
        print(f"\n📋 Assessment:")
        if is_asking:
            print("❌ FAILED: AI is still asking for basic business information")
        elif is_using_context:
            print("✅ SUCCESS: AI is using business context and providing specific advice")
        else:
            print("⚠️ PARTIAL: AI response doesn't clearly show context usage")
            
        # Show recommendations if available
        recommendations = response.get('agent_details', {}).get('recommendations', [])
        if recommendations:
            print(f"\n💡 Recommendations ({len(recommendations)}):")
            for i, rec in enumerate(recommendations[:5], 1):
                print(f"  {i}. {rec}")
        
        return not is_asking and is_using_context
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_context_fix())
    print(f"\n🎯 Test Result: {'PASSED ✅' if success else 'FAILED ❌'}")