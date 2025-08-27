#!/usr/bin/env python3
"""
Test script for Supabase API integration
This script tests the newly implemented Supabase API proxy
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

sys.path.append('/Users/bossio/6FB AI Agent System')

# Load environment variables
load_dotenv('/Users/bossio/6FB AI Agent System/.env')

from services.supabase_api_proxy import supabase_proxy

async def test_supabase_integration():
    """Test the Supabase integration"""
    print("🧪 Testing Supabase API Proxy Integration")
    print("=" * 50)
    
    # Test 1: Check connection
    print("\n1️⃣ Testing Supabase connection...")
    connection_status = await supabase_proxy.check_connection()
    print(f"Connection Status: {connection_status['status']}")
    print(f"Message: {connection_status['message']}")
    
    if connection_status['status'] != 'connected':
        print("❌ Supabase connection failed - using fallback mode")
        print("This is expected in development if Supabase credentials are not configured")
    else:
        print("✅ Supabase connection successful!")
    
    # Test 2: Get table statistics
    print("\n2️⃣ Testing table statistics...")
    table_stats = await supabase_proxy.get_table_stats()
    if 'error' in table_stats:
        print(f"❌ Table stats error: {table_stats['error']}")
    else:
        print("✅ Table statistics retrieved:")
        for table_name, stats in table_stats.get('tables', {}).items():
            print(f"  - {table_name}: {stats['count']} records ({stats['status']})")
    
    # Test 3: Test analytics data (with fallback)
    print("\n3️⃣ Testing analytics data retrieval...")
    test_barbershop_id = "test-barbershop-123"
    analytics_data = await supabase_proxy.get_analytics_data(test_barbershop_id)
    
    if analytics_data.get('data_source') == 'supabase_real':
        print("✅ Real analytics data retrieved from Supabase")
        print(f"  - Revenue today: ${analytics_data['revenue']['today']}")
        print(f"  - Appointments today: {analytics_data['appointments']['today']}")
        print(f"  - Total customers: {analytics_data['customers']['total']}")
    else:
        print("ℹ️  Mock analytics data returned (expected without real data)")
        print(f"  - Data source: {analytics_data.get('data_source', 'unknown')}")
        print(f"  - Revenue today: ${analytics_data['revenue']['today']}")
    
    # Test 4: Test customer data
    print("\n4️⃣ Testing customer data retrieval...")
    customers_data = await supabase_proxy.get_customers_data(test_barbershop_id)
    
    if len(customers_data) > 0 and customers_data[0].get('data_source') == 'supabase_real':
        print("✅ Real customer data retrieved from Supabase")
        print(f"  - Number of customers: {len(customers_data)}")
        for customer in customers_data[:3]:  # Show first 3
            print(f"  - {customer['name']}: {customer['total_appointments']} appointments")
    else:
        print("ℹ️  Mock customer data returned (expected without real data)")
        print(f"  - Number of mock customers: {len(customers_data)}")
    
    # Test 5: Test barbershop settings
    print("\n5️⃣ Testing barbershop settings...")
    settings = await supabase_proxy.get_barbershop_settings(test_barbershop_id)
    
    if settings.get('data_source') == 'supabase_real':
        print("✅ Real barbershop settings retrieved from Supabase")
        print(f"  - Barbershop name: {settings['name']}")
    else:
        print("ℹ️  Default settings returned (expected without real data)")
        print(f"  - Data source: {settings.get('data_source', 'unknown')}")
    
    print("\n" + "=" * 50)
    print("🏁 Integration test completed!")
    
    # Summary
    if supabase_proxy.enabled:
        print("✅ Supabase proxy is enabled and configured")
        print("🔄 The system will attempt to use real data and fall back to mock data when needed")
    else:
        print("⚠️  Supabase proxy is disabled (credentials not configured)")
        print("📄 The system will use mock data for all operations")
    
    print("\n💡 To enable real data integration:")
    print("   1. Ensure NEXT_PUBLIC_SUPABASE_URL is set in .env")
    print("   2. Ensure SUPABASE_SERVICE_ROLE_KEY is set in .env")
    print("   3. Verify the Supabase database schema matches expectations")

if __name__ == "__main__":
    asyncio.run(test_supabase_integration())