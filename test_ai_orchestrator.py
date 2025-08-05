#!/usr/bin/env python3
"""
Test script for AI Orchestrator Service integration
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.ai_orchestrator_service import ai_orchestrator

async def test_ai_orchestrator():
    """Test the AI Orchestrator Service"""
    print("🤖 Testing AI Orchestrator Service...")
    
    # Test message
    test_message = "How can I increase revenue in my barbershop?"
    test_session = "test_session_123"
    test_context = {
        "shop_name": "Test Barbershop",
        "location": "Downtown",
        "staff_count": 3
    }
    
    try:
        print(f"📤 Sending message: '{test_message}'")
        
        # Test the enhanced chat method
        response = await ai_orchestrator.enhanced_chat(
            message=test_message,
            session_id=test_session,
            business_context=test_context
        )
        
        print("✅ AI Orchestrator Response:")
        print(f"   Provider: {response.get('provider', 'unknown')}")
        print(f"   Confidence: {response.get('confidence', 0.0)}")
        print(f"   Message Type: {response.get('message_type', 'unknown')}")
        print(f"   Knowledge Enhanced: {response.get('knowledge_enhanced', False)}")
        print(f"   Response: {response.get('response', 'No response')[:200]}...")
        
        # Test provider status
        print("\n🔧 Provider Status:")
        status = ai_orchestrator.get_provider_status()
        print(f"   Available Providers: {status.get('available_providers', [])}")
        print(f"   Total Providers: {status.get('total_providers', 0)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing AI Orchestrator: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting AI Orchestrator Integration Test")
    success = asyncio.run(test_ai_orchestrator())
    
    if success:
        print("\n✅ AI Orchestrator Service is working correctly!")
        print("   Ready for integration with Next.js frontend")
    else:
        print("\n❌ AI Orchestrator Service has issues")
        print("   Check the error messages above")
    
    print(f"\n📊 Test Result: {'PASS' if success else 'FAIL'}")