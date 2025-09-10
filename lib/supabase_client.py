#!/usr/bin/env python3
"""
Unified Supabase client for Python backend services
Replaces all SQLite database connections with PostgreSQL via Supabase
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import json
from dataclasses import dataclass

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

from dotenv import load_dotenv
load_dotenv()

logger = logging.getLogger(__name__)

@dataclass
class DatabaseResult:
    """Standardized database operation result"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    count: Optional[int] = None

class SupabaseClient:
    """
    Unified Supabase client for all backend services
    Provides a consistent interface for database operations
    """
    
    _instance = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        # Singleton pattern to ensure one client instance
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._client is None:
            self._initialize_client()
    
    def _initialize_client(self) -> None:
        """Initialize Supabase client with environment configuration"""
        if not SUPABASE_AVAILABLE:
            raise ImportError("supabase-py not installed. Run: pip install supabase")
        
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Missing Supabase configuration. Please set:\n"
                "- NEXT_PUBLIC_SUPABASE_URL\n" 
                "- SUPABASE_SERVICE_ROLE_KEY"
            )
        
        try:
            self._client = create_client(self.supabase_url, self.supabase_key)
            logger.info("✅ Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase client: {e}")
            raise
    
    @property
    def client(self) -> Client:
        """Get the Supabase client instance"""
        if self._client is None:
            self._initialize_client()
        return self._client
    
    # ==========================================
    # AI INSIGHTS OPERATIONS
    # ==========================================
    
    async def create_ai_insight(
        self,
        barbershop_id: str,
        insight_type: str,
        title: str,
        description: str,
        recommendation: str,
        confidence: float,
        impact_score: float,
        urgency: str = 'medium',
        data_points: Optional[Dict] = None,
        metadata: Optional[Dict] = None,
        expires_in_hours: int = 168  # 7 days default
    ) -> DatabaseResult:
        """Create a new AI insight"""
        try:
            expires_at = datetime.now() + timedelta(hours=expires_in_hours)
            
            result = self.client.table('ai_insights').insert({
                'barbershop_id': barbershop_id,
                'type': insight_type,
                'title': title,
                'description': description,
                'recommendation': recommendation,
                'confidence': confidence,
                'impact_score': impact_score,
                'urgency': urgency,
                'data_points': data_points or {},
                'metadata': metadata or {},
                'expires_at': expires_at.isoformat()
            }).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error creating AI insight: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_active_insights(self, barbershop_id: str) -> DatabaseResult:
        """Get active AI insights for a barbershop"""
        try:
            result = self.client.rpc(
                'get_active_ai_insights',
                {'barbershop_uuid': barbershop_id}
            ).execute()
            
            return DatabaseResult(success=True, data=result.data, count=len(result.data))
            
        except Exception as e:
            logger.error(f"Error fetching active insights: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def update_insight_status(self, insight_id: str, is_active: bool) -> DatabaseResult:
        """Update insight active status"""
        try:
            result = self.client.table('ai_insights').update({
                'is_active': is_active
            }).eq('id', insight_id).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error updating insight status: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    # ==========================================
    # KNOWLEDGE DOCUMENTS OPERATIONS (RAG)
    # ==========================================
    
    async def create_knowledge_document(
        self,
        title: str,
        content: str,
        knowledge_type: str,
        source: str,
        embedding: Optional[List[float]] = None,
        metadata: Optional[Dict] = None
    ) -> DatabaseResult:
        """Create a new knowledge document"""
        try:
            doc_data = {
                'title': title,
                'content': content,
                'knowledge_type': knowledge_type,
                'source': source,
                'metadata': metadata or {}
            }
            
            if embedding:
                doc_data['embedding'] = embedding
            
            result = self.client.table('knowledge_documents').insert(doc_data).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error creating knowledge document: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def search_knowledge_documents(
        self,
        query_embedding: List[float],
        similarity_threshold: float = 0.7,
        max_results: int = 10,
        knowledge_type: Optional[str] = None
    ) -> DatabaseResult:
        """Search knowledge documents using vector similarity"""
        try:
            result = self.client.rpc(
                'search_knowledge_documents',
                {
                    'query_embedding': query_embedding,
                    'similarity_threshold': similarity_threshold,
                    'max_results': max_results
                }
            ).execute()
            
            # Filter by knowledge type if specified
            if knowledge_type and result.data:
                result.data = [doc for doc in result.data if doc['knowledge_type'] == knowledge_type]
            
            return DatabaseResult(success=True, data=result.data, count=len(result.data))
            
        except Exception as e:
            logger.error(f"Error searching knowledge documents: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_knowledge_documents(
        self,
        knowledge_type: Optional[str] = None,
        source: Optional[str] = None,
        limit: int = 100
    ) -> DatabaseResult:
        """Get knowledge documents with optional filters"""
        try:
            query = self.client.table('knowledge_documents').select('*')
            
            if knowledge_type:
                query = query.eq('knowledge_type', knowledge_type)
            if source:
                query = query.eq('source', source)
            
            query = query.eq('is_active', True).limit(limit).order('updated_at', desc=True)
            result = query.execute()
            
            return DatabaseResult(success=True, data=result.data, count=len(result.data))
            
        except Exception as e:
            logger.error(f"Error fetching knowledge documents: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    # ==========================================
    # BUSINESS RECOMMENDATIONS OPERATIONS
    # ==========================================
    
    async def create_business_recommendation(
        self,
        barbershop_id: str,
        agent_type: str,
        title: str,
        recommendations_data: Dict,
        confidence_score: float,
        priority: int = 5,
        expected_impact: Optional[Dict] = None
    ) -> DatabaseResult:
        """Create a new business recommendation"""
        try:
            result = self.client.table('business_recommendations').insert({
                'barbershop_id': barbershop_id,
                'agent_type': agent_type,
                'title': title,
                'recommendations_data': recommendations_data,
                'confidence_score': confidence_score,
                'priority': priority,
                'expected_impact': expected_impact or {}
            }).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error creating business recommendation: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_business_recommendations(
        self,
        barbershop_id: str,
        status: Optional[str] = None,
        agent_type: Optional[str] = None,
        limit: int = 50
    ) -> DatabaseResult:
        """Get business recommendations with optional filters"""
        try:
            query = self.client.table('business_recommendations').select('*').eq('barbershop_id', barbershop_id)
            
            if status:
                query = query.eq('implementation_status', status)
            if agent_type:
                query = query.eq('agent_type', agent_type)
            
            result = query.order('priority', desc=True).order('generated_at', desc=True).limit(limit).execute()
            
            return DatabaseResult(success=True, data=result.data, count=len(result.data))
            
        except Exception as e:
            logger.error(f"Error fetching business recommendations: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def update_recommendation_status(
        self,
        recommendation_id: str,
        status: str,
        implementation_notes: Optional[str] = None
    ) -> DatabaseResult:
        """Update recommendation implementation status"""
        try:
            update_data = {'implementation_status': status}
            
            if status == 'reviewed':
                update_data['reviewed_at'] = datetime.now().isoformat()
            elif status == 'implemented':
                update_data['implemented_at'] = datetime.now().isoformat()
                
            if implementation_notes:
                update_data['metadata'] = {'implementation_notes': implementation_notes}
            
            result = self.client.table('business_recommendations').update(update_data).eq('id', recommendation_id).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error updating recommendation status: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    # ==========================================
    # AI AGENT SESSIONS & MESSAGES
    # ==========================================
    
    async def create_ai_session(
        self,
        user_id: str,
        barbershop_id: str,
        agent_type: str,
        session_title: Optional[str] = None
    ) -> DatabaseResult:
        """Create a new AI agent session"""
        try:
            result = self.client.table('ai_agent_sessions').insert({
                'user_id': user_id,
                'barbershop_id': barbershop_id,
                'agent_type': agent_type,
                'session_title': session_title or f"{agent_type} Session"
            }).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error creating AI session: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def add_message_to_session(
        self,
        session_id: str,
        message_type: str,  # 'user' or 'agent'
        content: str,
        metadata: Optional[Dict] = None,
        tokens_used: int = 0,
        processing_time_ms: int = 0
    ) -> DatabaseResult:
        """Add a message to an AI agent session"""
        try:
            result = self.client.table('ai_agent_messages').insert({
                'session_id': session_id,
                'message_type': message_type,
                'content': content,
                'metadata': metadata or {},
                'tokens_used': tokens_used,
                'processing_time_ms': processing_time_ms
            }).execute()
            
            # Update session last_activity_at
            self.client.table('ai_agent_sessions').update({
                'last_activity_at': datetime.now().isoformat()
            }).eq('id', session_id).execute()
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error adding message to session: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_session_messages(self, session_id: str, limit: int = 100) -> DatabaseResult:
        """Get messages for an AI agent session"""
        try:
            result = self.client.table('ai_agent_messages').select('*').eq('session_id', session_id).order('created_at', desc=False).limit(limit).execute()
            
            return DatabaseResult(success=True, data=result.data, count=len(result.data))
            
        except Exception as e:
            logger.error(f"Error fetching session messages: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    # ==========================================
    # GENERAL DATABASE OPERATIONS
    # ==========================================
    
    async def execute_query(self, table_name: str, operation: str, data: Optional[Dict] = None, filters: Optional[Dict] = None) -> DatabaseResult:
        """Execute a general database query"""
        try:
            query = self.client.table(table_name)
            
            if operation == 'select':
                if filters:
                    for key, value in filters.items():
                        query = query.eq(key, value)
                result = query.select('*').execute()
                
            elif operation == 'insert' and data:
                result = query.insert(data).execute()
                
            elif operation == 'update' and data and filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
                result = query.update(data).execute()
                
            elif operation == 'delete' and filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
                result = query.delete().execute()
                
            else:
                return DatabaseResult(success=False, error=f"Invalid operation: {operation}")
            
            return DatabaseResult(success=True, data=result.data, count=result.count)
            
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    # ==========================================
    # HEALTH AND UTILITIES
    # ==========================================
    
    async def health_check(self) -> DatabaseResult:
        """Check database connection health"""
        try:
            # Test basic connectivity
            result = self.client.table('users').select('id').limit(1).execute()
            
            return DatabaseResult(
                success=True,
                data={
                    'status': 'healthy',
                    'timestamp': datetime.now().isoformat(),
                    'connection': 'active'
                }
            )
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_table_count(self, table_name: str) -> DatabaseResult:
        """Get count of records in a table"""
        try:
            result = self.client.table(table_name).select('id', count='exact').execute()
            
            return DatabaseResult(
                success=True,
                count=result.count,
                data={'table': table_name, 'count': result.count}
            )
            
        except Exception as e:
            logger.error(f"Error getting table count: {e}")
            return DatabaseResult(success=False, error=str(e))


# ==========================================
# SINGLETON INSTANCE AND HELPER FUNCTIONS  
# ==========================================

# Global singleton instance
_supabase_client = None

def get_supabase_client() -> SupabaseClient:
    """Get the singleton Supabase client instance"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client

async def initialize_supabase_client() -> bool:
    """Initialize and test Supabase client"""
    try:
        client = get_supabase_client()
        health_result = await client.health_check()
        
        if health_result.success:
            logger.info("✅ Supabase client initialization successful")
            return True
        else:
            logger.error(f"❌ Supabase client health check failed: {health_result.error}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Failed to initialize Supabase client: {e}")
        return False

# Convenience functions for backward compatibility
async def create_insight(*args, **kwargs) -> DatabaseResult:
    """Convenience function for creating AI insights"""
    client = get_supabase_client()
    return await client.create_ai_insight(*args, **kwargs)

async def search_knowledge(*args, **kwargs) -> DatabaseResult:
    """Convenience function for searching knowledge documents"""
    client = get_supabase_client()
    return await client.search_knowledge_documents(*args, **kwargs)

async def create_recommendation(*args, **kwargs) -> DatabaseResult:
    """Convenience function for creating business recommendations"""
    client = get_supabase_client()
    return await client.create_business_recommendation(*args, **kwargs)

if __name__ == "__main__":
    # Test the client initialization
    async def test_client():
        success = await initialize_supabase_client()
        if success:
            client = get_supabase_client()
            health = await client.health_check()
            print(f"Health check result: {health}")
        else:
            print("Failed to initialize client")
    
    asyncio.run(test_client())