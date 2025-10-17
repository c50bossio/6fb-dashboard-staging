#!/usr/bin/env python3
"""
Test script for 6FB AI Agent System API endpoints
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api/v1"

def test_health_check():
    """Test health check endpoint"""
    print("\n🔍 Testing Health Check...")
    
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health Check: {data['status']}")
            print(f"   Services: {json.dumps(data['services'], indent=2)}")
            return True
        else:
            print(f"❌ Health Check Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health Check Error: {e}")
        return False

def test_root_endpoint():
    """Test root endpoint"""
    print("\n🔍 Testing Root Endpoint...")
    
    try:
        response = requests.get(BASE_URL)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root Endpoint: {data['name']} v{data['version']}")
            print(f"   Status: {data['status']}")
            print(f"   Environment: {data['environment']}")
            return True
        else:
            print(f"❌ Root Endpoint Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Root Endpoint Error: {e}")
        return False

def test_public_barbershops():
    """Test public barbershops endpoint"""
    print("\n🔍 Testing Public Barbershops...")
    
    try:
        response = requests.get(f"{API_BASE}/public/barbershops")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} barbershops")
            if data:
                print(f"   First shop: {data[0]['name']} - {data[0]['city']}, {data[0]['state']}")
            return True
        else:
            print(f"❌ Barbershops Endpoint Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Barbershops Error: {e}")
        return False

def test_barbers_endpoint():
    """Test barbers endpoint"""
    print("\n🔍 Testing Barbers Endpoint...")
    
    try:
        # First get a barbershop ID
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
        response = requests.get(f"{API_BASE}/public/barbershops/{barbershop_id}/barbers")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} barbers")
            for barber in data:
                print(f"   - {barber['name']}: {barber['specialty']}")
                print(f"     Services: {len(barber.get('services', []))}")
            return True
        else:
            print(f"❌ Barbers Endpoint Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Barbers Error: {e}")
        return False

def test_availability_endpoint():
    """Test availability endpoint"""
    print("\n🔍 Testing Availability Endpoint...")
    
    try:
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
        barber_id = "mike-001"
        start_date = datetime.now().isoformat()
        end_date = datetime.now().isoformat()
        
        params = {
            "barbershop_id": barbershop_id,
            "start_date": start_date,
            "end_date": end_date,
            "service_duration_minutes": 30
        }
        
        response = requests.get(
            f"{API_BASE}/public/barbers/{barber_id}/availability",
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            slots = data.get("availability_slots", [])
            print(f"✅ Found {len(slots)} available slots")
            if slots:
                print(f"   First slot: {slots[0]['start_time']}")
            return True
        else:
            print(f"❌ Availability Endpoint Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Availability Error: {e}")
        return False

def test_booking_creation():
    """Test booking creation endpoint"""
    print("\n🔍 Testing Booking Creation...")
    
    try:
        booking_data = {
            "barbershop_id": "550e8400-e29b-41d4-a716-446655440000",
            "barber_id": "mike-001",
            "service_id": "service-001",
            "appointment_date": "2024-01-20",
            "appointment_time": "14:00",
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "(555) 111-2222",
            "notes": "Test booking from API"
        }
        
        response = requests.post(
            f"{API_BASE}/bookings/create",
            json=booking_data
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Booking created successfully")
            print(f"   Booking ID: {data['booking_id']}")
            print(f"   Status: {data['status']}")
            print(f"   Service: {data['service_name']} - ${data['price']}")
            return data['booking_id']
        else:
            print(f"❌ Booking Creation Failed: {response.status_code}")
            if response.text:
                print(f"   Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Booking Creation Error: {e}")
        return None

def test_ai_agents():
    """Test AI agents endpoint"""
    print("\n🔍 Testing AI Agents...")
    
    try:
        response = requests.get(f"{API_BASE}/agents")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Found {len(data)} AI agents")
            for agent in data:
                print(f"   - {agent['name']} ({agent['id']})")
                print(f"     Status: {agent['status']}")
                print(f"     Specialty: {agent['specialty']}")
            return True
        else:
            print(f"❌ AI Agents Endpoint Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ AI Agents Error: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("🚀 6FB AI Agent System - API Test Suite")
    print("=" * 60)
    
    results = []
    
    # Test basic endpoints
    results.append(("Health Check", test_health_check()))
    results.append(("Root Endpoint", test_root_endpoint()))
    results.append(("Public Barbershops", test_public_barbershops()))
    results.append(("Barbers", test_barbers_endpoint()))
    results.append(("Availability", test_availability_endpoint()))
    
    # Test booking
    booking_id = test_booking_creation()
    results.append(("Booking Creation", booking_id is not None))
    
    # Test AI endpoints
    results.append(("AI Agents", test_ai_agents()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print(f"⚠️ {total - passed} tests failed")
    
    return passed == total

if __name__ == "__main__":
    exit(0 if main() else 1)