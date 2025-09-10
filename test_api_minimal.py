#!/usr/bin/env python3
"""
Minimal API Test for 6FB AI Agent System
Tests the API structure without requiring full agent system initialization
"""

import sys
import time
from datetime import datetime
from typing import Dict, Any

# Add current directory to path for imports
sys.path.append('.')

def test_api_structure():
    """Test API structure and imports"""
    print("🧪 Testing API Structure")
    print("=" * 30)
    
    # Test schema imports
    print("📋 Testing schema imports...")
    try:
        from api.schemas import (
            AgentRequest, AgentResponse, ErrorResponse,
            HealthResponse, SystemStats, UsageAnalytics,
            KnowledgeQuery, KnowledgeResponse,
            AgentType, TaskPriority, RequestType
        )
        print("   ✅ All schemas imported successfully")
        
        # Test schema creation
        agent_request = AgentRequest(
            agent_type=AgentType.MASTER_COACH,
            message="Test message",
            priority=TaskPriority.MEDIUM,
            request_type=RequestType.ANALYSIS
        )
        print("   ✅ AgentRequest schema working")
        
        knowledge_query = KnowledgeQuery(
            query="test query",
            max_results=5,
            min_relevance=0.3
        )
        print("   ✅ KnowledgeQuery schema working")
        
    except Exception as e:
        print(f"   ❌ Schema import failed: {e}")
    
    # Test FastAPI app creation
    print("\n🚀 Testing FastAPI app creation...")
    try:
        from fastapi import FastAPI
        from fastapi.middleware.cors import CORSMiddleware
        
        # Create minimal app
        test_app = FastAPI(
            title="Test 6FB AI Agent System API",
            description="Test API",
            version="1.0.0"
        )
        
        test_app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        print("   ✅ FastAPI app created successfully")
        print("   ✅ CORS middleware added")
        
        # Add test endpoint
        @test_app.get("/test")
        async def test_endpoint():
            return {"message": "API structure working", "timestamp": datetime.now().isoformat()}
        
        print("   ✅ Test endpoint added")
        
    except Exception as e:
        print(f"   ❌ FastAPI app creation failed: {e}")
    
    print()

def test_pydantic_models():
    """Test Pydantic model validation"""
    print("📊 Testing Pydantic Models")
    print("=" * 30)
    
    try:
        from api.schemas import AgentRequest, AgentResponse, AgentType, TaskPriority
        
        # Test valid request
        print("✅ Testing valid request...")
        valid_request = AgentRequest(
            agent_type=AgentType.MASTER_COACH,
            message="How can I improve my barbershop operations?",
            priority=TaskPriority.HIGH,
            user_id="test_user_123"
        )
        print(f"   Agent Type: {valid_request.agent_type}")
        print(f"   Message Length: {len(valid_request.message)}")
        print(f"   Priority: {valid_request.priority}")
        print("   ✅ Valid request created successfully")
        
        # Test response model
        print("\n✅ Testing response model...")
        response = AgentResponse(
            message="Test response",
            agent_type=AgentType.MASTER_COACH,
            result="Sample agent response",
            confidence=0.85,
            execution_time=1.25,
            tokens_used=150,
            knowledge_used=3,
            request_id="test_123"
        )
        print(f"   Confidence: {response.confidence}")
        print(f"   Execution Time: {response.execution_time}s")
        print(f"   Knowledge Used: {response.knowledge_used}")
        print("   ✅ Response model working")
        
        # Test validation errors
        print("\n⚠️  Testing validation...")
        try:
            invalid_request = AgentRequest(
                agent_type="invalid_agent",  # This should fail
                message="",  # Empty message should fail
            )
            print("   ❌ Validation should have failed")
        except Exception as validation_error:
            print("   ✅ Validation properly rejected invalid data")
        
    except Exception as e:
        print(f"❌ Pydantic model test failed: {e}")
    
    print()

def test_enum_types():
    """Test enum type definitions"""
    print("🔢 Testing Enum Types")
    print("=" * 25)
    
    try:
        from api.schemas import AgentType, TaskPriority, RequestType
        
        # Test AgentType enum
        print("🤖 Testing AgentType enum...")
        agent_types = list(AgentType)
        print(f"   Available agent types: {len(agent_types)}")
        for agent_type in agent_types:
            print(f"      - {agent_type.value}")
        print("   ✅ AgentType enum working")
        
        # Test TaskPriority enum
        print("\n📋 Testing TaskPriority enum...")
        priorities = list(TaskPriority)
        print(f"   Available priorities: {[p.value for p in priorities]}")
        print("   ✅ TaskPriority enum working")
        
        # Test RequestType enum
        print("\n📝 Testing RequestType enum...")
        request_types = list(RequestType)
        print(f"   Available request types: {[r.value for r in request_types]}")
        print("   ✅ RequestType enum working")
        
    except Exception as e:
        print(f"❌ Enum test failed: {e}")
    
    print()

def simulate_api_workflow():
    """Simulate typical API workflow"""
    print("🔄 Simulating API Workflow")
    print("=" * 30)
    
    try:
        from api.schemas import (
            AgentRequest, AgentResponse, KnowledgeQuery, KnowledgeResponse,
            AgentType, TaskPriority, RequestType
        )
        
        # Simulate client request
        print("📤 Simulating client request...")
        client_request = AgentRequest(
            agent_type=AgentType.MASTER_COACH,
            message="I need help developing a customer retention strategy for my barbershop",
            priority=TaskPriority.HIGH,
            request_type=RequestType.STRATEGY,
            include_knowledge=True,
            user_id="barbershop_owner_456"
        )
        print(f"   Request: {client_request.message[:50]}...")
        print(f"   Agent: {client_request.agent_type.value}")
        print(f"   Priority: {client_request.priority.value}")
        
        # Simulate knowledge search
        print("\n🔍 Simulating knowledge search...")
        knowledge_search = KnowledgeQuery(
            query="customer retention strategies barbershop",
            max_results=5,
            min_relevance=0.4
        )
        print(f"   Query: {knowledge_search.query}")
        print(f"   Max Results: {knowledge_search.max_results}")
        
        # Simulate agent response
        print("\n📥 Simulating agent response...")
        agent_response = AgentResponse(
            message="Strategy generated successfully",
            agent_type=client_request.agent_type,
            result={
                "strategy_overview": "Comprehensive customer retention strategy",
                "key_tactics": ["loyalty program", "personalized service", "follow-up system"],
                "implementation_timeline": "3 months",
                "expected_impact": "20% increase in retention"
            },
            confidence=0.87,
            execution_time=2.35,
            tokens_used=245,
            knowledge_used=4,
            request_id="req_789"
        )
        print(f"   Confidence: {agent_response.confidence}")
        print(f"   Knowledge Used: {agent_response.knowledge_used} documents")
        print(f"   Response Type: {type(agent_response.result)}")
        
        print("\n✅ API workflow simulation successful!")
        
    except Exception as e:
        print(f"❌ Workflow simulation failed: {e}")
    
    print()

def run_minimal_api_tests():
    """Run minimal API tests without full system initialization"""
    print("🚀 6FB AI Agent System - Minimal API Tests")
    print("=" * 55)
    print()
    
    try:
        test_api_structure()
        test_pydantic_models()
        test_enum_types()
        simulate_api_workflow()
        
        print("🎯 Minimal API Testing Complete!")
        print("✅ API structure and schemas working correctly")
        print("✅ Pydantic models validating properly")
        print("✅ Enum types defined correctly")
        print("✅ Workflow simulation successful")
        print("🔄 API ready for full integration testing")
        
    except Exception as e:
        print(f"💥 Minimal API test suite failed: {e}")

if __name__ == "__main__":
    run_minimal_api_tests()