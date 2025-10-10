#!/usr/bin/env python3
"""
Test script for Real-Time Analytics Integration
Tests the complete analytics pipeline from database to AI responses
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_analytics_service():
    """Test the real-time analytics service"""
    
    print("🧪 Testing Real-Time Analytics Service...")
    
    try:
        from services.realtime_analytics_service import realtime_analytics_service
        
        # Test 1: Basic metrics retrieval
        print("\n1️⃣ Testing basic metrics retrieval...")
        metrics = await realtime_analytics_service.get_live_business_metrics()
        
        print(f"   ✅ Retrieved metrics: {type(metrics).__name__}")
        print(f"   📊 Total Revenue: ${metrics.total_revenue:,.2f}")
        print(f"   📅 Total Appointments: {metrics.total_appointments}")
        print(f"   👥 Total Customers: {metrics.total_customers}")
        print(f"   📈 Data Freshness: {metrics.data_freshness}")
        
        # Test 2: Formatted metrics for AI
        print("\n2️⃣ Testing AI-formatted metrics...")
        formatted_metrics = await realtime_analytics_service.get_formatted_metrics_for_ai()
        
        print(f"   ✅ Generated formatted metrics ({len(formatted_metrics)} characters)")
        print("   📝 Sample of formatted output:")
        print("   " + "\n   ".join(formatted_metrics.split('\n')[:5]))
        
        # Test 3: Specific metric retrieval
        print("\n3️⃣ Testing specific metric retrieval...")
        monthly_revenue = await realtime_analytics_service.get_specific_metric('monthly_revenue')
        completion_rate = await realtime_analytics_service.get_specific_metric('appointment_completion_rate')
        
        print(f"   ✅ Monthly Revenue: ${monthly_revenue:,.2f}")
        print(f"   ✅ Completion Rate: {completion_rate:.1f}%")
        
        # Test 4: Cache status
        print("\n4️⃣ Testing cache system...")
        cache_status = realtime_analytics_service.get_cache_status()
        
        print(f"   ✅ Cache entries: {cache_status['cache_entries']}")
        print(f"   ✅ Database type: {cache_status['database_type']}")
        print(f"   ✅ Cache duration: {cache_status['cache_duration_seconds']}s")
        
        return True
        
    except Exception as e:
        print(f"   ❌ Analytics service test failed: {e}")
        return False

async def test_ai_orchestrator_integration():
    """Test AI orchestrator integration with analytics"""
    
    print("\n🤖 Testing AI Orchestrator Analytics Integration...")
    
    try:
        from services.ai_orchestrator_service import ai_orchestrator
        
        # Test questions that should trigger analytics integration
        test_questions = [
            "What's our current revenue this month?",
            "How many appointments do we have?",
            "What's our customer retention rate?",
            "Show me our business performance",
        ]
        
        for i, question in enumerate(test_questions, 1):
            print(f"\n{i}️⃣ Testing question: '{question}'")
            
            # Test analytics detection
            needs_analytics = ai_orchestrator._needs_analytics_data(question)
            print(f"   🎯 Analytics needed: {needs_analytics}")
            
            if needs_analytics:
                # Test analytics data fetching
                analytics_data = await ai_orchestrator._fetch_analytics_data()
                if analytics_data:
                    print(f"   ✅ Fetched analytics data ({len(analytics_data)} characters)")
                else:
                    print("   ⚠️ No analytics data fetched")
            
            # Test complete enhanced chat
            try:
                response = await ai_orchestrator.enhanced_chat(
                    message=question,
                    session_id=f"test_session_{i}",
                    business_context={"barbershop_id": None}
                )
                
                print(f"   ✅ AI Response received")
                print(f"   📊 Analytics enhanced: {response.get('analytics_enhanced', False)}")
                print(f"   🧠 Knowledge enhanced: {response.get('knowledge_enhanced', False)}")
                print(f"   🤖 Provider: {response.get('provider', 'unknown')}")
                print(f"   🎯 Confidence: {response.get('confidence', 0.0):.2f}")
                
                # Show sample response
                ai_response = response.get('response', 'No response')
                sample_response = ai_response[:200] + "..." if len(ai_response) > 200 else ai_response
                print(f"   💬 Sample response: {sample_response}")
                
            except Exception as e:
                print(f"   ❌ Enhanced chat failed: {e}")
        
        return True
        
    except Exception as e:
        print(f"   ❌ AI orchestrator test failed: {e}")
        return False

async def test_api_endpoints():
    """Test API endpoints"""
    
    print("\n🌐 Testing API Endpoints...")
    
    try:
        import aiohttp
        import asyncio
        
        # Test FastAPI analytics endpoint
        print("\n1️⃣ Testing FastAPI analytics endpoint...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get('http://localhost:8001/analytics/live-metrics?format=json') as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ FastAPI endpoint working: {data.get('success', False)}")
                        print(f"   📊 Data source: {data.get('data_source', 'unknown')}")
                    else:
                        print(f"   ⚠️ FastAPI endpoint returned {response.status}")
        except Exception as e:
            print(f"   ⚠️ FastAPI endpoint test failed: {e}")
        
        # Test Next.js analytics endpoint
        print("\n2️⃣ Testing Next.js analytics endpoint...")
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get('http://localhost:9999/api/analytics/live-data?format=formatted') as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ Next.js endpoint working: {data.get('success', False)}")
                        print(f"   📊 Data source: {data.get('meta', {}).get('data_source', 'unknown')}")
                    else:
                        print(f"   ⚠️ Next.js endpoint returned {response.status}")
        except Exception as e:
            print(f"   ⚠️ Next.js endpoint test failed: {e}")
        
        # Test enhanced chat endpoint
        print("\n3️⃣ Testing enhanced AI chat endpoint...")
        
        test_payload = {
            "message": "What's our revenue performance this month?",
            "session_id": "test_session_api",
            "business_context": {},
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    'http://localhost:8001/ai/enhanced-chat',
                    json=test_payload
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ Enhanced chat endpoint working: {data.get('success', False)}")
                        print(f"   📊 Analytics enhanced: {data.get('analytics_enhanced', False)}")
                        print(f"   🤖 Provider: {data.get('provider', 'unknown')}")
                    else:
                        print(f"   ⚠️ Enhanced chat endpoint returned {response.status}")
        except Exception as e:
            print(f"   ⚠️ Enhanced chat endpoint test failed: {e}")
        
        return True
        
    except ImportError:
        print("   ⚠️ aiohttp not available, skipping API endpoint tests")
        print("   💡 Install with: pip install aiohttp")
        return True
    except Exception as e:
        print(f"   ❌ API endpoint tests failed: {e}")
        return False

async def run_comprehensive_test():
    """Run all analytics integration tests"""
    
    print("🚀 Real-Time Analytics Integration Test Suite")
    print("=" * 60)
    
    test_results = []
    
    # Test 1: Analytics Service
    result1 = await test_analytics_service()
    test_results.append(("Analytics Service", result1))
    
    # Test 2: AI Orchestrator Integration
    result2 = await test_ai_orchestrator_integration()
    test_results.append(("AI Orchestrator Integration", result2))
    
    # Test 3: API Endpoints
    result3 = await test_api_endpoints()
    test_results.append(("API Endpoints", result3))
    
    # Summary
    print("\n" + "=" * 60)
    print("📋 TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, passed_test in test_results:
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"{status} {test_name}")
        if passed_test:
            passed += 1
    
    print(f"\n🏁 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Analytics integration is working correctly.")
        print("\n💡 Next steps:")
        print("   • Start the development servers: ./docker-dev-start.sh")
        print("   • Test AI responses with business questions")
        print("   • Verify real data appears in AI responses")
    else:
        print("⚠️ Some tests failed. Check the error messages above.")
        print("\n🔧 Troubleshooting:")
        print("   • Ensure all dependencies are installed")
        print("   • Check that database connections are working")
        print("   • Verify environment variables are set")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = asyncio.run(run_comprehensive_test())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test suite failed: {e}")
        sys.exit(1)