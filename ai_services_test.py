#!/usr/bin/env python3
"""
AI Services Integration Testing
Tests AI orchestrator, knowledge services, and specialized agents directly
"""

import os
import asyncio
import json
from datetime import datetime

async def test_ai_orchestrator():
    """Test AI Orchestrator Service directly"""
    print("🧠 Testing AI Orchestrator Service...")
    
    try:
        from services.ai_orchestrator_service import ai_orchestrator
        
        # Check provider availability
        provider_status = ai_orchestrator.get_provider_status()
        print(f"✅ AI Providers: {provider_status}")
        
        # Test enhanced chat
        response = await ai_orchestrator.enhanced_chat(
            message="How can I improve barbershop revenue?",
            session_id="test-session",
            business_context={"shop_type": "premium", "location": "urban"}
        )
        
        print(f"✅ Enhanced Chat Response: {response.get('provider', 'unknown')} - {response.get('response', '')[:100]}...")
        return True
        
    except Exception as e:
        print(f"❌ AI Orchestrator Error: {e}")
        return False

async def test_vector_knowledge_service():
    """Test Vector Knowledge Service"""
    print("\n📚 Testing Vector Knowledge Service...")
    
    try:
        from services.vector_knowledge_service import vector_knowledge_service
        
        # Test storing knowledge
        await vector_knowledge_service.store_knowledge(
            content="Test barbershop revenue optimization strategy",
            knowledge_type="business_strategy",
            source="test_source"
        )
        
        # Test contextual insights
        insights = await vector_knowledge_service.get_contextual_insights(
            query="revenue optimization",
            context={"shop_type": "modern"}
        )
        
        print(f"✅ Vector Knowledge Service: {len(insights.get('relevant_knowledge', []))} insights found")
        return True
        
    except Exception as e:
        print(f"❌ Vector Knowledge Error: {e}")
        return False

async def test_agent_manager():
    """Test Specialized Agent Manager"""
    print("\n🤖 Testing Agent Manager...")
    
    try:
        from services.ai_agents.agent_manager import agent_manager
        
        # Get agent status
        status = agent_manager.get_agent_status()
        print(f"✅ Agent System Status: {status}")
        
        # Test message processing
        response = await agent_manager.process_message(
            message="How can I improve customer retention?",
            context={"shop_type": "traditional", "location": "suburban"}
        )
        
        if response:
            print(f"✅ Agent Response: {response.primary_agent} - confidence: {response.total_confidence}")
        else:
            print("⚠️ No agent response received")
            
        return True
        
    except Exception as e:
        print(f"❌ Agent Manager Error: {e}")
        return False

async def test_business_recommendations():
    """Test Business Recommendations Service"""
    print("\n💼 Testing Business Recommendations...")
    
    try:
        from services.business_recommendations_service import business_recommendations_service
        
        recommendations = await business_recommendations_service.generate_comprehensive_recommendations(
            barbershop_id="test-barbershop"
        )
        
        print(f"✅ Recommendations Generated: {type(recommendations)} recommendations")
        return True
        
    except ImportError:
        print("⚠️ Enhanced recommendations service not available")
        try:
            from services.business_recommendations_engine import business_recommendations_engine
            
            recommendations = await business_recommendations_engine.generate_recommendations(
                business_context={"monthly_revenue": 10000, "location": "urban"}
            )
            
            print(f"✅ Basic Recommendations: {type(recommendations)} generated")
            return True
            
        except Exception as e:
            print(f"❌ Recommendations Error: {e}")
            return False
    except Exception as e:
        print(f"❌ Enhanced Recommendations Error: {e}")
        return False

async def test_performance_monitoring():
    """Test AI Performance Monitoring"""
    print("\n⚡ Testing Performance Monitoring...")
    
    try:
        from services.ai_performance_monitoring import ai_performance_monitor
        
        # Get real-time metrics
        metrics = await ai_performance_monitor.get_real_time_metrics()
        print(f"✅ Performance Metrics: {len(metrics)} components monitored")
        
        # Test recording a metric
        from services.ai_performance_monitoring import MonitoringMetric
        await ai_performance_monitor.record_performance_metric(
            component="test_component",
            metric=MonitoringMetric.RESPONSE_TIME,
            value=1.23
        )
        
        print("✅ Performance metric recorded successfully")
        return True
        
    except Exception as e:
        print(f"❌ Performance Monitoring Error: {e}")
        return False

def check_environment_variables():
    """Check required environment variables"""
    print("\n🔍 Checking Environment Variables...")
    
    env_vars = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY"),
        "GOOGLE_AI_API_KEY": os.getenv("GOOGLE_AI_API_KEY"),
        "NODE_ENV": os.getenv("NODE_ENV"),
        "ENVIRONMENT": os.getenv("ENVIRONMENT")
    }
    
    for var, value in env_vars.items():
        status = "✅" if value else "❌"
        display_value = f"{value[:10]}..." if value else "Not set"
        print(f"{status} {var}: {display_value}")
    
    return any(env_vars[key] for key in ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_AI_API_KEY"])

async def test_database_operations():
    """Test database operations directly"""
    print("\n🗄️ Testing Database Operations...")
    
    try:
        import sqlite3
        import os
        
        db_path = "data/agent_system.db"
        if not os.path.exists(db_path):
            print(f"❌ Database not found at {db_path}")
            return False
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Test basic operations
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM chat_history")  
        chat_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM sessions")
        session_count = cursor.fetchone()[0]
        
        print(f"✅ Database Stats: {user_count} users, {chat_count} chats, {session_count} sessions")
        
        # Test inserting test data
        test_user_id = 999
        cursor.execute(
            "INSERT OR REPLACE INTO users (id, email, password_hash, shop_name) VALUES (?, ?, ?, ?)",
            (test_user_id, "test_db@example.com", "test_hash", "Test DB Shop")
        )
        
        cursor.execute(
            "INSERT INTO chat_history (user_id, agent_id, message, response) VALUES (?, ?, ?, ?)",
            (test_user_id, "test_agent", "Test message", "Test response")
        )
        
        conn.commit()
        print("✅ Database write operations successful")
        
        # Clean up test data
        cursor.execute("DELETE FROM chat_history WHERE user_id = ?", (test_user_id,))
        cursor.execute("DELETE FROM users WHERE id = ?", (test_user_id,))
        conn.commit()
        
        conn.close()
        print("✅ Database cleanup successful")
        return True
        
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return False

async def main():
    """Run comprehensive AI services testing"""
    print("🚀 AI Services Integration Testing Suite")
    print("=" * 50)
    
    # Check environment first
    env_ok = check_environment_variables()
    if not env_ok:
        print("⚠️ No AI API keys found - services will use fallback/mock responses")
    
    # Test database
    db_ok = await test_database_operations()
    
    # Test AI services
    orchestrator_ok = await test_ai_orchestrator()
    knowledge_ok = await test_vector_knowledge_service()  
    agent_ok = await test_agent_manager()
    recommendations_ok = await test_business_recommendations()
    performance_ok = await test_performance_monitoring()
    
    # Summary
    tests = {
        "Environment": env_ok,
        "Database": db_ok,
        "AI Orchestrator": orchestrator_ok,
        "Vector Knowledge": knowledge_ok,
        "Agent Manager": agent_ok,
        "Recommendations": recommendations_ok,
        "Performance Monitoring": performance_ok
    }
    
    passed = sum(tests.values())
    total = len(tests)
    
    print(f"\n📊 AI SERVICES TEST SUMMARY")
    print("=" * 35)
    print(f"Passed: {passed}/{total} ({passed/total*100:.1f}%)")
    
    for test_name, result in tests.items():
        status = "✅" if result else "❌"
        print(f"{status} {test_name}")
    
    if passed >= total * 0.7:
        print("\n🎉 AI Services are functioning adequately")
    else:
        print("\n⚠️ AI Services need attention - several components failing")
    
    # Save results
    results = {
        "timestamp": datetime.now().isoformat(),
        "test_results": tests,
        "environment_variables": {
            "openai_available": bool(os.getenv("OPENAI_API_KEY")),
            "anthropic_available": bool(os.getenv("ANTHROPIC_API_KEY")),
            "google_ai_available": bool(os.getenv("GOOGLE_AI_API_KEY"))
        }
    }
    
    with open("ai_services_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
        
    print(f"\n💾 Results saved to: ai_services_test_results.json")

if __name__ == "__main__":
    asyncio.run(main())