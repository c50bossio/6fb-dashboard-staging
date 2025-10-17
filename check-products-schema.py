#!/usr/bin/env python3
"""Check the actual products table schema in Supabase"""

import os
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("Error: Supabase credentials not found in environment")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# Query one product to see available columns
response = supabase.table('products').select('*').limit(1).execute()

if response.data and len(response.data) > 0:
    print("Available columns in products table:")
    for col in response.data[0].keys():
        print(f"  - {col}")
else:
    print("No products found in database")
    print("\nAttempting to get table structure...")
    # Try empty select to get column info
    try:
        response = supabase.table('products').select('*').limit(0).execute()
        print("Table exists but is empty")
    except Exception as e:
        print(f"Error: {e}")
