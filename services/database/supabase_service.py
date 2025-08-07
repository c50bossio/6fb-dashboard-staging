"""
Supabase Database Service
Replaces SQLite with Supabase PostgreSQL
"""

from supabase import create_client, Client
from typing import Dict, List, Any, Optional
import os
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SupabaseService:
    """Supabase database service with real-time capabilities"""
    
    def __init__(self):
        """Initialize Supabase client"""
        self.url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not self.url or not self.key:
            raise ValueError("Supabase credentials not found in environment")
        
        self.client: Client = create_client(self.url, self.key)
        logger.info("✅ Supabase client initialized")
    
    # User operations
    async def create_user(self, user_data: Dict[str, Any]) -> Optional[Dict]:
        """Create a new user"""
        try:
            result = self.client.table('users').insert(user_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email"""
        try:
            result = self.client.table('users').select("*").eq('email', email).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None
    
    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict]:
        """Update user data"""
        try:
            result = self.client.table('users').update(updates).eq('id', user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            return None
    
    # Session operations
    async def create_session(self, session_data: Dict[str, Any]) -> Optional[Dict]:
        """Create a new AI session"""
        try:
            result = self.client.table('ai_sessions').insert(session_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating session: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get user's AI sessions with messages"""
        try:
            result = self.client.table('ai_sessions')\
                .select("*, messages(count)")\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)\
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting sessions: {e}")
            return []
    
    async def get_session_with_messages(self, session_id: str) -> Optional[Dict]:
        """Get session with all messages"""
        try:
            result = self.client.table('ai_sessions')\
                .select("*, messages(*)")\
                .eq('id', session_id)\
                .single()\
                .execute()
            return result.data
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    # Message operations
    async def create_message(self, message_data: Dict[str, Any]) -> Optional[Dict]:
        """Create a new message"""
        try:
            result = self.client.table('messages').insert(message_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            return None
    
    async def get_session_messages(self, session_id: str) -> List[Dict]:
        """Get all messages for a session"""
        try:
            result = self.client.table('messages')\
                .select("*")\
                .eq('session_id', session_id)\
                .order('created_at')\
                .execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting messages: {e}")
            return []
    
    # Insights operations
    async def create_insight(self, insight_data: Dict[str, Any]) -> Optional[Dict]:
        """Create a business insight"""
        try:
            result = self.client.table('business_insights').insert(insight_data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error creating insight: {e}")
            return None
    
    async def get_user_insights(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Get user's business insights"""
        try:
            query = self.client.table('business_insights')\
                .select("*")\
                .eq('user_id', user_id)\
                .order('created_at', desc=True)\
                .limit(limit)
            
            if status:
                query = query.eq('status', status)
            
            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"Error getting insights: {e}")
            return []
    
    async def update_insight_status(
        self, 
        insight_id: str, 
        status: str,
        completed_at: Optional[str] = None
    ) -> Optional[Dict]:
        """Update insight status"""
        try:
            updates = {'status': status}
            if completed_at:
                updates['completed_at'] = completed_at
            
            result = self.client.table('business_insights')\
                .update(updates)\
                .eq('id', insight_id)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error updating insight: {e}")
            return None
    
    # Settings operations
    async def get_user_settings(self, user_id: str) -> Optional[Dict]:
        """Get user's barbershop settings"""
        try:
            result = self.client.table('barbershop_settings')\
                .select("*")\
                .eq('user_id', user_id)\
                .single()\
                .execute()
            return result.data
        except Exception as e:
            # Settings might not exist yet
            return None
    
    async def upsert_user_settings(
        self, 
        user_id: str, 
        settings: Dict[str, Any]
    ) -> Optional[Dict]:
        """Create or update user settings"""
        try:
            settings['user_id'] = user_id
            result = self.client.table('barbershop_settings')\
                .upsert(settings)\
                .execute()
            return result.data[0] if result.data else None
        except Exception as e:
            logger.error(f"Error upserting settings: {e}")
            return None
    
    # Real-time subscriptions
    def subscribe_to_messages(self, session_id: str, callback):
        """Subscribe to real-time message updates"""
        channel = self.client.channel(f'messages:{session_id}')
        
        channel.on(
            'postgres_changes',
            {
                'event': '*',
                'schema': 'public',
                'table': 'messages',
                'filter': f'session_id=eq.{session_id}'
            },
            callback
        )
        
        channel.subscribe()
        return channel
    
    def subscribe_to_insights(self, user_id: str, callback):
        """Subscribe to real-time insight updates"""
        channel = self.client.channel(f'insights:{user_id}')
        
        channel.on(
            'postgres_changes',
            {
                'event': '*',
                'schema': 'public',
                'table': 'business_insights',
                'filter': f'user_id=eq.{user_id}'
            },
            callback
        )
        
        channel.subscribe()
        return channel
    
    # Analytics queries
    async def get_session_analytics(self, user_id: str) -> Dict[str, Any]:
        """Get session analytics for a user"""
        try:
            # Get session counts by type
            sessions_result = self.client.table('session_summaries')\
                .select("session_type, message_count, total_tokens")\
                .eq('user_id', user_id)\
                .execute()
            
            # Calculate analytics
            total_sessions = len(sessions_result.data) if sessions_result.data else 0
            total_messages = sum(s['message_count'] for s in sessions_result.data) if sessions_result.data else 0
            total_tokens = sum(s['total_tokens'] for s in sessions_result.data) if sessions_result.data else 0
            
            return {
                'total_sessions': total_sessions,
                'total_messages': total_messages,
                'total_tokens': total_tokens,
                'sessions_by_type': sessions_result.data or []
            }
        except Exception as e:
            logger.error(f"Error getting analytics: {e}")
            return {
                'total_sessions': 0,
                'total_messages': 0,
                'total_tokens': 0,
                'sessions_by_type': []
            }

# Singleton instance
db = SupabaseService()