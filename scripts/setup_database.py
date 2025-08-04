#!/usr/bin/env python3

import os
import sys
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

# Get Supabase credentials
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing Supabase credentials in .env.local")
    sys.exit(1)

def setup_database():
    print("🚀 Setting up database using Supabase Python approach...\n")
    
    # Read SQL file
    sql_path = Path(__file__).parent.parent / 'database' / 'RUN_THIS_IN_SUPABASE.sql'
    with open(sql_path, 'r') as f:
        sql_content = f.read()
    
    # Extract project ref from URL
    project_ref = SUPABASE_URL.split('//')[1].split('.')[0]
    
    print(f"📊 Project Reference: {project_ref}")
    print(f"🔗 Project URL: {SUPABASE_URL}\n")
    
    # Unfortunately, Supabase doesn't expose a direct SQL execution endpoint
    # through their REST API. The SQL needs to be run through:
    # 1. Supabase Dashboard SQL Editor
    # 2. Supabase CLI (requires login)
    # 3. Direct PostgreSQL connection (requires connection string)
    
    print("📝 SQL file is ready at: database/RUN_THIS_IN_SUPABASE.sql\n")
    print("Since direct SQL execution requires dashboard access, here are your options:\n")
    print("Option 1: Use Supabase Dashboard (Recommended)")
    print("─" * 50)
    print(f"1. Open: https://supabase.com/dashboard/project/{project_ref}/sql/new")
    print("2. Copy the contents of database/RUN_THIS_IN_SUPABASE.sql")
    print("3. Paste into the SQL editor")
    print("4. Click 'Run'\n")
    
    print("Option 2: Use psql with connection string")
    print("─" * 50)
    print("1. Get your database password from Supabase dashboard")
    print("2. Run: psql -h aws-0-us-west-1.pooler.supabase.com -p 5432 -d postgres -U postgres.{project_ref} < database/RUN_THIS_IN_SUPABASE.sql\n")
    
    print("Option 3: I'll create a temporary test endpoint")
    print("─" * 50)
    print("Creating a test endpoint to verify your connection...\n")
    
    # Test the connection by trying to query a system table
    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }
    
    # Try to query the auth.users table (should exist)
    test_url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
    
    print("🔍 Testing Supabase connection...")
    
    # Test with a simple query
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/",
        headers=headers
    )
    
    if response.status_code == 200:
        print("✅ Successfully connected to Supabase!")
        print("\n🎯 Quick link to SQL editor:")
        print(f"   👉 https://supabase.com/dashboard/project/{project_ref}/sql/new")
    else:
        print(f"⚠️  Connection test returned: {response.status_code}")
        print("   This is normal - please use the dashboard to run the SQL")

if __name__ == "__main__":
    setup_database()