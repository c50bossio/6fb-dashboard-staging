#!/usr/bin/env python3
"""
Test script for the Enhanced Knowledge Base System
"""

import asyncio
import json
import requests
from datetime import datetime

def test_knowledge_base_frontend():
    """Test frontend accessibility"""
    print("=== Testing Knowledge Base Frontend ===")
    
    try:
        # Test if the knowledge-base page exists
        response = requests.get("http://localhost:9999/knowledge-base", timeout=10)
        
        if response.status_code == 200:
            print("✅ Knowledge base page accessible")
            if "Business Knowledge Base" in response.text:
                print("✅ Page contains expected content")
            else:
                print("⚠️  Page content may not be fully rendered")
        else:
            print(f"❌ Knowledge base page returned status: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Frontend test failed: {e}")

def test_knowledge_api_status():
    """Test knowledge API status endpoint"""
    print("\n=== Testing Knowledge API Status ===")
    
    try:
        # Test NextJS API endpoint
        response = requests.get("http://localhost:9999/api/knowledge/enhanced?action=status", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ NextJS API endpoint accessible")
            print(f"   Response: {json.dumps(data, indent=2)}")
            
            if data.get('fallback'):
                print("⚠️  Using fallback data (FastAPI may be unavailable)")
            else:
                print("✅ Real knowledge service is working")
        else:
            print(f"❌ API status returned: {response.status_code}")
            
    except Exception as e:
        print(f"❌ API status test failed: {e}")

def test_fastapi_knowledge_endpoints():
    """Test FastAPI knowledge endpoints directly"""
    print("\n=== Testing FastAPI Knowledge Endpoints ===")
    
    endpoints = [
        "http://localhost:8001/api/v1/knowledge/enhanced/status",
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {endpoint}")
                print(f"   Success: {data.get('success', False)}")
                if data.get('knowledge_status'):
                    status = data['knowledge_status']
                    print(f"   Documents: {status.get('total_documents', 0)}")
                    print(f"   Status: {status.get('status', 'unknown')}")
                    if status.get('error'):
                        print(f"   Error: {status['error']}")
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
                
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")

def test_knowledge_search():
    """Test knowledge search functionality"""
    print("\n=== Testing Knowledge Search ===")
    
    test_queries = [
        "pricing strategy",
        "customer retention", 
        "barbershop operations",
        "marketing social media"
    ]
    
    for query in test_queries:
        try:
            # Test via NextJS API
            response = requests.post(
                "http://localhost:9999/api/knowledge/enhanced",
                json={
                    "action": "contextual_search",
                    "query": query,
                    "context": {
                        "user_id": "test-user",
                        "shop_type": "barbershop"
                    }
                },
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Search query: '{query}'")
                
                if data.get('contextual_search_results'):
                    results = data['contextual_search_results']
                    docs = results.get('documents', [])
                    print(f"   Found {len(docs)} documents")
                    
                    if docs:
                        print(f"   Top result: {docs[0].get('title', 'Unknown')}")
                        print(f"   Confidence: {docs[0].get('confidence_score', 0):.2f}")
                        
                    if results.get('recommended_actions'):
                        print(f"   Recommendations: {len(results['recommended_actions'])}")
                        
                elif data.get('fallback_data'):
                    print("   Using fallback data")
                else:
                    print("   No results returned")
                    
            else:
                print(f"❌ Search failed for '{query}': {response.status_code}")
                
        except Exception as e:
            print(f"❌ Search error for '{query}': {e}")

def test_database_setup():
    """Test database setup and initialization"""
    print("\n=== Testing Database Setup ===")
    
    try:
        import sqlite3
        import os
        
        # Check if data directory exists
        if os.path.exists("./data"):
            print("✅ Data directory exists")
        else:
            print("⚠️  Data directory missing")
            
        # Check if enhanced knowledge database exists
        db_path = "./data/enhanced_knowledge.db"
        if os.path.exists(db_path):
            print("✅ Enhanced knowledge database exists")
            
            # Check table structure
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            print(f"   Tables: {[table[0] for table in tables]}")
            
            if ('enhanced_business_knowledge',) in tables:
                cursor.execute("SELECT COUNT(*) FROM enhanced_business_knowledge")
                count = cursor.fetchone()[0]
                print(f"   Documents in database: {count}")
            else:
                print("⚠️  enhanced_business_knowledge table missing")
                
            conn.close()
        else:
            print("⚠️  Enhanced knowledge database missing")
            
    except Exception as e:
        print(f"❌ Database test failed: {e}")

def run_all_tests():
    """Run all knowledge base tests"""
    print("🧪 Enhanced Knowledge Base System Test Suite")
    print("=" * 50)
    
    test_knowledge_base_frontend()
    test_knowledge_api_status()
    test_fastapi_knowledge_endpoints()
    test_knowledge_search()
    test_database_setup()
    
    print("\n" + "=" * 50)
    print("📋 Test Summary Complete")
    print("\n💡 Tips for testing knowledge base:")
    print("   1. Navigate to http://localhost:9999/knowledge-base")
    print("   2. Try search queries like 'pricing strategy'")
    print("   3. Check domain filtering functionality")
    print("   4. View document details and business metrics")
    print("   5. Verify search result quality and relevance")

if __name__ == "__main__":
    run_all_tests()