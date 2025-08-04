#!/usr/bin/env python3
"""
Migrate SQLite data to Supabase
"""

import sqlite3
import os
from datetime import datetime
from supabase import create_client, Client
import json
from typing import Dict, List, Any
import sys

# Load environment variables
from dotenv import load_dotenv
load_dotenv('.env.local')

def migrate_to_supabase():
    """Migrate all data from SQLite to Supabase"""
    
    # Initialize connections
    print("🔄 Starting migration from SQLite to Supabase...")
    
    # SQLite connection
    sqlite_conn = sqlite3.connect('agent_system.db')
    sqlite_conn.row_factory = sqlite3.Row
    
    # Supabase connection
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Supabase credentials not found in .env.local")
        print("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return False
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # 1. Migrate Users
        print("\n📤 Migrating users...")
        users_cursor = sqlite_conn.execute("SELECT * FROM users")
        users = users_cursor.fetchall()
        
        user_mapping = {}  # Map old IDs to new UUIDs
        
        for user in users:
            user_dict = dict(user)
            old_id = user_dict.pop('id')
            
            # Remove password-related fields (we'll use Supabase Auth)
            user_dict.pop('password_hash', None)
            
            # Insert into Supabase
            result = supabase.table('users').insert({
                'email': user_dict['email'],
                'full_name': user_dict.get('full_name'),
                'barbershop_name': user_dict.get('barbershop_name'),
                'barbershop_id': user_dict.get('barbershop_id'),
                'is_active': bool(user_dict.get('is_active', 1)),
                'created_at': user_dict.get('created_at', datetime.now().isoformat())
            }).execute()
            
            if result.data:
                user_mapping[old_id] = result.data[0]['id']
                print(f"✅ Migrated user: {user_dict['email']}")
        
        # 2. Migrate Sessions
        print("\n📤 Migrating AI sessions...")
        sessions_cursor = sqlite_conn.execute("SELECT * FROM agentic_sessions")
        sessions = sessions_cursor.fetchall()
        
        session_mapping = {}
        
        for session in sessions:
            session_dict = dict(session)
            old_id = session_dict['id']
            old_user_id = session_dict['user_id']
            
            if old_user_id in user_mapping:
                result = supabase.table('ai_sessions').insert({
                    'user_id': user_mapping[old_user_id],
                    'session_type': session_dict.get('session_type', 'coaching'),
                    'agent_type': 'business_coach',
                    'context': json.loads(session_dict.get('context', '{}')),
                    'created_at': session_dict.get('created_at', datetime.now().isoformat())
                }).execute()
                
                if result.data:
                    session_mapping[old_id] = result.data[0]['id']
                    print(f"✅ Migrated session: {old_id}")
        
        # 3. Migrate Messages
        print("\n📤 Migrating messages...")
        messages_cursor = sqlite_conn.execute("SELECT * FROM agentic_messages")
        messages = messages_cursor.fetchall()
        
        for message in messages:
            message_dict = dict(message)
            old_session_id = message_dict['session_id']
            
            if old_session_id in session_mapping:
                result = supabase.table('messages').insert({
                    'session_id': session_mapping[old_session_id],
                    'role': message_dict['role'],
                    'content': message_dict['content'],
                    'metadata': json.loads(message_dict.get('metadata', '{}')),
                    'created_at': message_dict.get('timestamp', datetime.now().isoformat())
                }).execute()
                
                if result.data:
                    print(f"✅ Migrated message in session: {old_session_id}")
        
        # 4. Migrate Insights
        print("\n📤 Migrating insights...")
        insights_cursor = sqlite_conn.execute("SELECT * FROM insights")
        insights = insights_cursor.fetchall()
        
        for insight in insights:
            insight_dict = dict(insight)
            old_user_id = insight_dict.get('user_id')
            old_session_id = insight_dict.get('session_id')
            
            if old_user_id in user_mapping:
                result = supabase.table('business_insights').insert({
                    'user_id': user_mapping[old_user_id],
                    'session_id': session_mapping.get(old_session_id) if old_session_id else None,
                    'insight_type': insight_dict.get('type', 'general'),
                    'title': insight_dict.get('title', 'Business Insight'),
                    'content': insight_dict['content'],
                    'metrics': json.loads(insight_dict.get('metrics', '{}')),
                    'created_at': insight_dict.get('created_at', datetime.now().isoformat())
                }).execute()
                
                if result.data:
                    print(f"✅ Migrated insight: {insight_dict.get('title')}")
        
        print("\n✅ Migration completed successfully!")
        print(f"📊 Summary:")
        print(f"  - Users migrated: {len(user_mapping)}")
        print(f"  - Sessions migrated: {len(session_mapping)}")
        print(f"  - Messages migrated: {len(messages)}")
        print(f"  - Insights migrated: {len(insights)}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        sqlite_conn.close()

def verify_migration():
    """Verify the migration was successful"""
    print("\n🔍 Verifying migration...")
    
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    supabase: Client = create_client(supabase_url, supabase_key)
    
    # Check counts
    users = supabase.table('users').select("count", count='exact').execute()
    sessions = supabase.table('ai_sessions').select("count", count='exact').execute()
    messages = supabase.table('messages').select("count", count='exact').execute()
    
    print(f"\n📊 Supabase Database Status:")
    print(f"  - Users: {users.count}")
    print(f"  - Sessions: {sessions.count}")
    print(f"  - Messages: {messages.count}")

if __name__ == "__main__":
    # Check if .env.local exists
    if not os.path.exists('.env.local'):
        print("❌ Error: .env.local not found!")
        print("Please copy .env.local.example to .env.local and add your Supabase credentials")
        sys.exit(1)
    
    # Run migration
    if migrate_to_supabase():
        verify_migration()
    else:
        print("\n❌ Migration failed. Please check the errors above.")