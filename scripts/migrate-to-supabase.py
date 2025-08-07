#!/usr/bin/env python3
"""
Migration script from SQLite to Supabase
Preserves all existing data while upgrading to PostgreSQL
"""

import sqlite3
import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import hashlib

# Load environment variables
load_dotenv('.env.local')

# Supabase configuration
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Supabase credentials not found in .env.local")
    print("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY")
    exit(1)

# Initialize Supabase client with service key (bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# SQLite database path
SQLITE_DB_PATH = "data/agent_system.db"

def migrate_users():
    """Migrate users from SQLite to Supabase Auth"""
    print("\n📤 Migrating users...")
    
    try:
        # Connect to SQLite
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all users
        users = cursor.execute("SELECT * FROM users").fetchall()
        
        migrated = 0
        for user in users:
            try:
                # Create auth user in Supabase
                # Note: We'll use a temporary password that users will need to reset
                temp_password = hashlib.sha256(f"{user['email']}-temp-6fb".encode()).hexdigest()[:16]
                
                # Create user in Supabase Auth
                auth_response = supabase.auth.admin.create_user({
                    "email": user['email'],
                    "password": temp_password,
                    "email_confirm": True,
                    "user_metadata": {
                        "shop_name": user['shop_name'],
                        "migrated_from_sqlite": True,
                        "original_created_at": user['created_at']
                    }
                })
                
                if auth_response:
                    print(f"✅ Migrated user: {user['email']}")
                    migrated += 1
                    
                    # The profile will be automatically created by our trigger
                    # But we can update it with additional data if needed
                    if user['shop_name']:
                        supabase.table('profiles').update({
                            'shop_name': user['shop_name']
                        }).eq('email', user['email']).execute()
                
            except Exception as e:
                if "already been registered" in str(e):
                    print(f"⚠️  User already exists: {user['email']}")
                else:
                    print(f"❌ Error migrating user {user['email']}: {str(e)}")
        
        conn.close()
        print(f"\n✅ Successfully migrated {migrated}/{len(users)} users")
        
    except sqlite3.OperationalError as e:
        print(f"❌ SQLite error: {str(e)}")
        print("Make sure the SQLite database exists at", SQLITE_DB_PATH)

def migrate_agents():
    """Migrate agents data"""
    print("\n📤 Migrating agents...")
    
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if agents table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
        if not cursor.fetchone():
            print("⚠️  No agents table found in SQLite, skipping...")
            return
        
        agents = cursor.execute("SELECT * FROM agents").fetchall()
        
        # Clear existing agents first (except the defaults)
        supabase.table('agents').delete().neq('type', 'booking').neq('type', 'marketing').neq('type', 'analytics').neq('type', 'support').execute()
        
        migrated = 0
        for agent in agents:
            try:
                # Map old agent data to new schema
                agent_data = {
                    'name': agent['name'],
                    'description': agent['description'],
                    'type': 'custom',  # Default type for migrated agents
                    'status': agent.get('status', 'active')
                }
                
                result = supabase.table('agents').insert(agent_data).execute()
                if result:
                    print(f"✅ Migrated agent: {agent['name']}")
                    migrated += 1
                    
            except Exception as e:
                print(f"❌ Error migrating agent {agent['name']}: {str(e)}")
        
        conn.close()
        print(f"\n✅ Successfully migrated {migrated}/{len(agents)} agents")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def migrate_chat_history():
    """Migrate chat history"""
    print("\n📤 Migrating chat history...")
    
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all chat history
        chats = cursor.execute("SELECT * FROM chat_history").fetchall()
        
        # Get user email to ID mapping from Supabase
        profiles = supabase.table('profiles').select('id, email').execute()
        email_to_id = {p['email']: p['id'] for p in profiles.data}
        
        # Get agent name to ID mapping
        agents = supabase.table('agents').select('id, name').execute()
        agent_name_to_id = {a['name']: a['id'] for a in agents.data}
        
        migrated = 0
        for chat in chats:
            try:
                # Get user ID from email
                users = cursor.execute("SELECT email FROM users WHERE id = ?", (chat['user_id'],)).fetchall()
                if not users:
                    continue
                    
                user_email = users[0]['email']
                user_id = email_to_id.get(user_email)
                
                if not user_id:
                    print(f"⚠️  User not found for chat: {user_email}")
                    continue
                
                # Map agent_id (might need to handle this based on your data)
                agent_id = None
                if chat['agent_id'] in agent_name_to_id:
                    agent_id = agent_name_to_id[chat['agent_id']]
                else:
                    # Try to find a suitable default agent
                    default_agents = supabase.table('agents').select('id').eq('type', 'support').limit(1).execute()
                    if default_agents.data:
                        agent_id = default_agents.data[0]['id']
                
                if not agent_id:
                    print(f"⚠️  Agent not found for chat")
                    continue
                
                # Insert chat history
                chat_data = {
                    'user_id': user_id,
                    'agent_id': agent_id,
                    'message': chat['message'],
                    'response': chat['response'],
                    'created_at': chat['created_at']
                }
                
                result = supabase.table('chat_history').insert(chat_data).execute()
                if result:
                    migrated += 1
                    
            except Exception as e:
                print(f"❌ Error migrating chat: {str(e)}")
        
        conn.close()
        print(f"\n✅ Successfully migrated {migrated}/{len(chats)} chat messages")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def migrate_business_settings():
    """Migrate any business settings or preferences"""
    print("\n📤 Checking for business settings...")
    
    try:
        # This is a placeholder - adapt based on your actual SQLite schema
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        
        # Check if you have any settings tables
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        
        print(f"Found tables: {[t['name'] for t in tables]}")
        
        # You can add specific migration logic here based on your tables
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

def create_migration_report():
    """Create a migration report"""
    print("\n📊 Creating migration report...")
    
    report = {
        "migration_date": datetime.now().isoformat(),
        "supabase_url": SUPABASE_URL,
        "stats": {}
    }
    
    # Get counts from Supabase
    try:
        profiles_count = len(supabase.table('profiles').select('id', count='exact').execute().data)
        agents_count = len(supabase.table('agents').select('id', count='exact').execute().data)
        chats_count = len(supabase.table('chat_history').select('id', count='exact').execute().data)
        
        report["stats"] = {
            "profiles": profiles_count,
            "agents": agents_count,
            "chat_messages": chats_count
        }
        
        # Save report
        with open('migration_report.json', 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📈 Migration Summary:")
        print(f"  - Profiles: {profiles_count}")
        print(f"  - Agents: {agents_count}")
        print(f"  - Chat Messages: {chats_count}")
        
    except Exception as e:
        print(f"❌ Error creating report: {str(e)}")

def main():
    """Main migration function"""
    print("🚀 Starting SQLite to Supabase migration...")
    print(f"   Source: {SQLITE_DB_PATH}")
    print(f"   Target: {SUPABASE_URL}")
    
    # Check if SQLite database exists
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"\n❌ SQLite database not found at {SQLITE_DB_PATH}")
        print("Please make sure the database file exists.")
        return
    
    # Run migrations
    migrate_users()
    migrate_agents()
    migrate_chat_history()
    migrate_business_settings()
    
    # Create report
    create_migration_report()
    
    print("\n✅ Migration completed!")
    print("\n⚠️  Important: All migrated users have temporary passwords.")
    print("   They will need to use the 'Forgot Password' feature to set new passwords.")
    print("\n📝 Next steps:")
    print("   1. Test the application with Supabase")
    print("   2. Update your authentication flow")
    print("   3. Remove SQLite dependencies once confirmed working")

if __name__ == "__main__":
    main()