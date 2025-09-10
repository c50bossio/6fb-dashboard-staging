#!/usr/bin/env python3
"""
Integration test script for 6FB AI Agent System
Tests authentication, dashboard, and AI chat functionality
"""

import requests
import json
import sys

API_BASE = "http://localhost:8001"

def test_api_health():
    """Test if API is running"""
    print("🔍 Testing API health...")
    try:
        response = requests.get(f"{API_BASE}/")
        if response.status_code == 200:
            print("✅ API is running:", response.json()["message"])
            return True
    except Exception as e:
        print("❌ API connection failed:", e)
        return False

def test_registration():
    """Test user registration"""
    print("\n🔍 Testing user registration...")
    user_data = {
        "email": "test_user@barbershop.com",
        "password": "testpass123",
        "shop_name": "Test Barbershop"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/v1/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            print("✅ Registration successful")
            print(f"   Token: {data['access_token'][:20]}...")
            return data['access_token']
        else:
            print(f"❌ Registration failed: {response.status_code}")
            return None
    except Exception as e:
        print("❌ Registration error:", e)
        return None

def test_login():
    """Test user login"""
    print("\n🔍 Testing user login...")
    credentials = {
        "email": "test_user@barbershop.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/api/v1/auth/login", json=credentials)
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful")
            print(f"   User ID: {data['user']['id']}")
            return data['access_token']
        else:
            print(f"❌ Login failed: {response.status_code}")
            return None
    except Exception as e:
        print("❌ Login error:", e)
        return None

def test_protected_endpoints(token):
    """Test protected API endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n🔍 Testing protected endpoints...")
    
    # Test dashboard stats
    try:
        response = requests.get(f"{API_BASE}/api/v1/dashboard/stats", headers=headers)
        if response.status_code == 200:
            stats = response.json()
            print("✅ Dashboard stats retrieved")
            print(f"   Revenue: ${stats['revenue']['total']}")
            print(f"   Bookings: {stats['bookings']['total']}")
        else:
            print(f"❌ Dashboard stats failed: {response.status_code}")
    except Exception as e:
        print("❌ Dashboard stats error:", e)
    
    # Test AI agents list
    try:
        response = requests.get(f"{API_BASE}/api/v1/agents", headers=headers)
        if response.status_code == 200:
            agents = response.json()
            print("✅ AI agents retrieved:", len(agents), "agents")
            for agent in agents[:3]:
                print(f"   - {agent['name']}: {agent['description']}")
        else:
            print(f"❌ AI agents failed: {response.status_code}")
    except Exception as e:
        print("❌ AI agents error:", e)
    
    # Test AI chat
    try:
        chat_data = {
            "agent_id": "business_coach",
            "message": "How can I increase revenue?"
        }
        response = requests.post(f"{API_BASE}/api/v1/chat", json=chat_data, headers=headers)
        if response.status_code == 200:
            chat_response = response.json()
            print("✅ AI chat successful")
            print(f"   Response: {chat_response['response'][:100]}...")
        else:
            print(f"❌ AI chat failed: {response.status_code}")
    except Exception as e:
        print("❌ AI chat error:", e)
    
    # Test learning insights
    try:
        response = requests.get(f"{API_BASE}/api/v1/agentic-coach/learning-insights", headers=headers)
        if response.status_code == 200:
            insights = response.json()
            print("✅ Learning insights retrieved")
            print(f"   Total interactions: {insights['coach_learning_data']['total_interactions']}")
        else:
            print(f"❌ Learning insights failed: {response.status_code}")
    except Exception as e:
        print("❌ Learning insights error:", e)

def main():
    print("🚀 6FB AI Agent System Integration Test")
    print("=" * 50)
    
    if not test_api_health():
        print("\n⚠️  API is not running. Make sure Docker containers are started.")
        sys.exit(1)
    
    # Try registration first
    token = test_registration()
    
    # If registration fails (user exists), try login
    if not token:
        token = test_login()
    
    if token:
        test_protected_endpoints(token)
        print("\n✅ Integration test completed successfully!")
    else:
        print("\n❌ Authentication failed. Cannot test protected endpoints.")
        sys.exit(1)

if __name__ == "__main__":
    main()