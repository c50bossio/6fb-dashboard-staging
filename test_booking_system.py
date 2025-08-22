#!/usr/bin/env python3
"""Test the public booking system and database setup"""

from supabase import create_client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not url or not key:
    print("❌ Missing Supabase environment variables")
    exit(1)

supabase = create_client(url, key)

print("🔍 TESTING PUBLIC BOOKING SYSTEM")
print("=" * 60)

# 1. Check barbershops
print("\n📍 Barbershops in database:")
try:
    barbershops = supabase.table('barbershops').select('id, name, city, state').execute()
    if barbershops.data:
        for shop in barbershops.data[:5]:  # Show first 5
            print(f"  - {shop['name']} ({shop.get('city', 'Unknown')}, {shop.get('state', '')})")
            print(f"    ID: {shop['id']}")
            print(f"    Public booking URL: http://localhost:9999/book/public/{shop['id']}")
        
        # Use the first barbershop for testing
        test_shop_id = barbershops.data[0]['id']
        test_shop_name = barbershops.data[0]['name']
        print(f"\n✅ Using '{test_shop_name}' for testing (ID: {test_shop_id})")
    else:
        print("  ❌ No barbershops found - need to create test data")
        test_shop_id = None
except Exception as e:
    print(f"  ❌ Error accessing barbershops: {e}")
    test_shop_id = None

# 2. Check services
if test_shop_id:
    print(f"\n💈 Services for {test_shop_name}:")
    try:
        services = supabase.table('services').select('*').eq('barbershop_id', test_shop_id).execute()
        if services.data:
            for service in services.data[:5]:
                print(f"  - {service.get('name', 'Unnamed')} (${service.get('price', 0)})")
                print(f"    Duration: {service.get('duration_minutes', 30)} minutes")
        else:
            print("  ⚠️  No services found - creating default services...")
            # Create default services
            default_services = [
                {'barbershop_id': test_shop_id, 'name': 'Classic Haircut', 'price': 35, 'duration_minutes': 30, 'is_active': True},
                {'barbershop_id': test_shop_id, 'name': 'Beard Trim', 'price': 20, 'duration_minutes': 20, 'is_active': True},
                {'barbershop_id': test_shop_id, 'name': 'Full Service', 'price': 50, 'duration_minutes': 50, 'is_active': True},
            ]
            for service in default_services:
                try:
                    result = supabase.table('services').insert(service).execute()
                    print(f"    ✅ Created: {service['name']}")
                except Exception as e:
                    print(f"    ❌ Failed to create {service['name']}: {e}")
    except Exception as e:
        print(f"  ❌ Error accessing services: {e}")

# 3. Check bookings table
print("\n📅 Checking bookings table:")
try:
    # Check if table exists
    bookings = supabase.table('bookings').select('*').limit(1).execute()
    print("  ✅ Bookings table exists and is accessible")
except Exception as e:
    print(f"  ❌ Bookings table error: {e}")

# 4. Check appointments table
print("\n📆 Checking appointments table:")
try:
    appointments = supabase.table('appointments').select('*').limit(1).execute()
    print("  ✅ Appointments table exists and is accessible")
except Exception as e:
    print(f"  ❌ Appointments table error: {e}")

# Summary
print("\n" + "=" * 60)
print("📊 SUMMARY:")
if test_shop_id:
    print(f"✅ System is ready for testing!")
    print(f"🔗 Test this URL: http://localhost:9999/book/public/{test_shop_id}")
    print(f"📱 Share this link with customers for booking")
else:
    print("❌ Need to set up test data first")