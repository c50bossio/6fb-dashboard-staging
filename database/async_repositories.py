#!/usr/bin/env python3
"""
Async database repository classes with context managers to replace sync SQLite operations.
Provides high-level database operations with proper error handling and connection management.
"""

from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any, List, Union
from datetime import datetime
from dataclasses import dataclass
import json
import logging
import aiosqlite
from .async_connection_pool import get_database_connection, execute_query, execute_transaction

logger = logging.getLogger(__name__)


@dataclass
class DatabaseResult:
    """Standardized database operation result"""
    success: bool
    data: Any = None
    error: Optional[str] = None
    affected_rows: int = 0
    last_insert_id: Optional[int] = None


class AsyncRepository(ABC):
    """Base class for async repository pattern"""
    
    def __init__(self):
        self.table_name = self._get_table_name()
    
    @abstractmethod
    def _get_table_name(self) -> str:
        """Return the table name for this repository"""
        pass
    
    async def _execute_with_result(self, query: str, parameters: tuple = None) -> DatabaseResult:
        """Execute query and return standardized result"""
        try:
            async with get_database_connection() as conn:
                cursor = await conn.execute(query, parameters or ())
                await conn.commit()
                
                return DatabaseResult(
                    success=True,
                    last_insert_id=cursor.lastrowid,
                    affected_rows=cursor.rowcount
                )
        except Exception as e:
            logger.error(f"Database operation failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def _fetch_one(self, query: str, parameters: tuple = None) -> DatabaseResult:
        """Fetch one record with error handling"""
        try:
            async with get_database_connection() as conn:
                cursor = await conn.execute(query, parameters or ())
                result = await cursor.fetchone()
                
                return DatabaseResult(success=True, data=result)
        except Exception as e:
            logger.error(f"Fetch one operation failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def _fetch_all(self, query: str, parameters: tuple = None) -> DatabaseResult:
        """Fetch all records with error handling"""
        try:
            async with get_database_connection() as conn:
                cursor = await conn.execute(query, parameters or ())
                results = await cursor.fetchall()
                
                return DatabaseResult(success=True, data=results)
        except Exception as e:
            logger.error(f"Fetch all operation failed: {e}")
            return DatabaseResult(success=False, error=str(e))


class AsyncUserRepository(AsyncRepository):
    """Async repository for user operations"""
    
    def _get_table_name(self) -> str:
        return "users"
    
    async def create_user(self, email: str, hashed_password: str, full_name: str, 
                         barbershop_name: str = None) -> DatabaseResult:
        """Create a new user with proper error handling"""
        try:
            barbershop_id = f"barber_{int(datetime.now().timestamp())}" if barbershop_name else None
            
            query = """
                INSERT INTO users (email, hashed_password, full_name, barbershop_name, barbershop_id)
                VALUES (?, ?, ?, ?, ?)
            """
            parameters = (email, hashed_password, full_name, barbershop_name, barbershop_id)
            
            result = await self._execute_with_result(query, parameters)
            
            if result.success:
                # Fetch the created user
                user_data = await self.get_user_by_id(result.last_insert_id)
                if user_data.success:
                    result.data = user_data.data
            
            return result
            
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_user_by_email(self, email: str) -> DatabaseResult:
        """Get user by email address"""
        query = "SELECT * FROM users WHERE email = ?"
        result = await self._fetch_one(query, (email,))
        
        if result.success and result.data:
            result.data = self._row_to_user_dict(result.data)
        
        return result
    
    async def get_user_by_id(self, user_id: int) -> DatabaseResult:
        """Get user by ID"""
        query = "SELECT * FROM users WHERE id = ?"
        result = await self._fetch_one(query, (user_id,))
        
        if result.success and result.data:
            result.data = self._row_to_user_dict(result.data)
        
        return result
    
    async def update_user(self, user_id: int, updates: Dict[str, Any]) -> DatabaseResult:
        """Update user with partial data"""
        if not updates:
            return DatabaseResult(success=False, error="No updates provided")
        
        # Build dynamic update query
        set_clauses = []
        parameters = []
        
        for field, value in updates.items():
            if field in ['email', 'hashed_password', 'full_name', 'barbershop_name', 'is_active']:
                set_clauses.append(f"{field} = ?")
                parameters.append(value)
        
        if not set_clauses:
            return DatabaseResult(success=False, error="No valid fields to update")
        
        parameters.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
        
        return await self._execute_with_result(query, tuple(parameters))
    
    async def delete_user(self, user_id: int) -> DatabaseResult:
        """Soft delete user (set is_active to False)"""
        query = "UPDATE users SET is_active = FALSE WHERE id = ?"
        return await self._execute_with_result(query, (user_id,))
    
    async def get_all_active_users(self) -> DatabaseResult:
        """Get all active users"""
        query = "SELECT * FROM users WHERE is_active = TRUE ORDER BY created_at DESC"
        result = await self._fetch_all(query)
        
        if result.success and result.data:
            result.data = [self._row_to_user_dict(row) for row in result.data]
        
        return result
    
    def _row_to_user_dict(self, row: tuple) -> Dict[str, Any]:
        """Convert database row to user dictionary"""
        return {
            "id": row[0],
            "email": row[1],
            "hashed_password": row[2],
            "full_name": row[3],
            "barbershop_name": row[4],
            "barbershop_id": row[5],
            "created_at": row[6],
            "is_active": bool(row[7])
        }


class AsyncAgenticSessionRepository(AsyncRepository):
    """Async repository for agentic session operations"""
    
    def _get_table_name(self) -> str:
        return "agentic_sessions"
    
    async def create_or_update_session(self, session_id: str, user_id: int, 
                                     shop_context: Dict[str, Any],
                                     conversation_history: List[Dict] = None,
                                     ongoing_projects: List[str] = None,
                                     goals: List[str] = None,
                                     pain_points: List[str] = None) -> DatabaseResult:
        """Create or update an agentic session"""
        try:
            # Check if session exists
            existing = await self.get_session_by_id(session_id)
            
            shop_context_json = json.dumps(shop_context, default=str)
            history_json = json.dumps(conversation_history or [])
            projects_json = json.dumps(ongoing_projects or [])
            goals_json = json.dumps(goals or [])
            pain_points_json = json.dumps(pain_points or [])
            
            if existing.success and existing.data:
                # Update existing session
                query = """
                    UPDATE agentic_sessions 
                    SET shop_context = ?, conversation_history = ?, ongoing_projects = ?,
                        goals = ?, pain_points = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE session_id = ?
                """
                parameters = (shop_context_json, history_json, projects_json, 
                            goals_json, pain_points_json, session_id)
            else:
                # Create new session
                query = """
                    INSERT INTO agentic_sessions 
                    (session_id, user_id, shop_context, conversation_history, 
                     ongoing_projects, goals, pain_points)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """
                parameters = (session_id, user_id, shop_context_json, history_json, 
                            projects_json, goals_json, pain_points_json)
            
            return await self._execute_with_result(query, parameters)
            
        except Exception as e:
            logger.error(f"Session save failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_session_by_id(self, session_id: str) -> DatabaseResult:
        """Get session by session ID"""
        query = "SELECT * FROM agentic_sessions WHERE session_id = ?"
        result = await self._fetch_one(query, (session_id,))
        
        if result.success and result.data:
            result.data = self._row_to_session_dict(result.data)
        
        return result
    
    async def get_user_sessions(self, user_id: int, limit: int = 50) -> DatabaseResult:
        """Get sessions for a specific user"""
        query = """
            SELECT * FROM agentic_sessions 
            WHERE user_id = ? 
            ORDER BY updated_at DESC 
            LIMIT ?
        """
        result = await self._fetch_all(query, (user_id, limit))
        
        if result.success and result.data:
            result.data = [self._row_to_session_dict(row) for row in result.data]
        
        return result
    
    async def delete_session(self, session_id: str) -> DatabaseResult:
        """Delete a session and its messages"""
        try:
            # Use transaction to delete session and messages
            operations = [
                ("DELETE FROM agentic_messages WHERE session_id = ?", (session_id,)),
                ("DELETE FROM agentic_sessions WHERE session_id = ?", (session_id,))
            ]
            
            results = await execute_transaction(operations)
            return DatabaseResult(success=True, data=results)
            
        except Exception as e:
            logger.error(f"Session deletion failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    def _row_to_session_dict(self, row: tuple) -> Dict[str, Any]:
        """Convert database row to session dictionary"""
        return {
            "id": row[0],
            "session_id": row[1],
            "user_id": row[2],
            "shop_context": json.loads(row[3]) if row[3] else {},
            "conversation_history": json.loads(row[4]) if row[4] else [],
            "ongoing_projects": json.loads(row[5]) if row[5] else [],
            "goals": json.loads(row[6]) if row[6] else [],
            "pain_points": json.loads(row[7]) if row[7] else [],
            "created_at": row[8],
            "updated_at": row[9]
        }


class AsyncAgenticMessageRepository(AsyncRepository):
    """Async repository for agentic message operations"""
    
    def _get_table_name(self) -> str:
        return "agentic_messages"
    
    async def save_message(self, session_id: str, role: str, content: str,
                          domains_addressed: List[str] = None,
                          recommendations: List[Dict] = None,
                          confidence: float = None,
                          urgency: str = None,
                          requires_data: bool = False) -> DatabaseResult:
        """Save a new message to the database"""
        try:
            query = """
                INSERT INTO agentic_messages 
                (session_id, role, content, domains_addressed, recommendations, 
                 confidence, urgency, requires_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """
            
            parameters = (
                session_id, role, content,
                json.dumps(domains_addressed or []),
                json.dumps(recommendations or []),
                confidence, urgency, requires_data
            )
            
            return await self._execute_with_result(query, parameters)
            
        except Exception as e:
            logger.error(f"Message save failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_session_messages(self, session_id: str, limit: int = 100) -> DatabaseResult:
        """Get messages for a specific session"""
        query = """
            SELECT * FROM agentic_messages 
            WHERE session_id = ? 
            ORDER BY timestamp ASC 
            LIMIT ?
        """
        result = await self._fetch_all(query, (session_id, limit))
        
        if result.success and result.data:
            result.data = [self._row_to_message_dict(row) for row in result.data]
        
        return result
    
    async def get_recent_messages(self, user_id: int, days: int = 7, limit: int = 50) -> DatabaseResult:
        """Get recent messages for a user across all sessions"""
        query = """
            SELECT m.* FROM agentic_messages m
            JOIN agentic_sessions s ON m.session_id = s.session_id
            WHERE s.user_id = ? 
            AND m.timestamp >= datetime('now', '-{} days')
            ORDER BY m.timestamp DESC
            LIMIT ?
        """.format(days)
        
        result = await self._fetch_all(query, (user_id, limit))
        
        if result.success and result.data:
            result.data = [self._row_to_message_dict(row) for row in result.data]
        
        return result
    
    async def delete_session_messages(self, session_id: str) -> DatabaseResult:
        """Delete all messages for a session"""
        query = "DELETE FROM agentic_messages WHERE session_id = ?"
        return await self._execute_with_result(query, (session_id,))
    
    def _row_to_message_dict(self, row: tuple) -> Dict[str, Any]:
        """Convert database row to message dictionary"""
        return {
            "id": row[0],
            "session_id": row[1],
            "role": row[2],
            "content": row[3],
            "domains_addressed": json.loads(row[4]) if row[4] else [],
            "recommendations": json.loads(row[5]) if row[5] else [],
            "confidence": row[6],
            "urgency": row[7],
            "requires_data": bool(row[8]),
            "timestamp": row[9]
        }


class AsyncLearningInsightsRepository(AsyncRepository):
    """Async repository for learning insights operations"""
    
    def _get_table_name(self) -> str:
        return "learning_insights"
    
    async def save_insight(self, shop_profile: str, question_domain: str,
                          question_pattern: str = None,
                          recommendation_success: Dict[str, Any] = None,
                          conversation_context: Dict[str, Any] = None) -> DatabaseResult:
        """Save a learning insight"""
        try:
            query = """
                INSERT INTO learning_insights 
                (shop_profile, question_domain, question_pattern, 
                 recommendation_success, conversation_context)
                VALUES (?, ?, ?, ?, ?)
            """
            
            parameters = (
                shop_profile, question_domain, question_pattern,
                json.dumps(recommendation_success or {}),
                json.dumps(conversation_context or {})
            )
            
            return await self._execute_with_result(query, parameters)
            
        except Exception as e:
            logger.error(f"Learning insight save failed: {e}")
            return DatabaseResult(success=False, error=str(e))
    
    async def get_insights_by_profile(self, shop_profile: str, limit: int = 100) -> DatabaseResult:
        """Get insights for a specific shop profile"""
        query = """
            SELECT * FROM learning_insights 
            WHERE shop_profile = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """
        result = await self._fetch_all(query, (shop_profile, limit))
        
        if result.success and result.data:
            result.data = [self._row_to_insight_dict(row) for row in result.data]
        
        return result
    
    async def get_insights_by_domain(self, question_domain: str, limit: int = 100) -> DatabaseResult:
        """Get insights for a specific domain"""
        query = """
            SELECT * FROM learning_insights 
            WHERE question_domain = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        """
        result = await self._fetch_all(query, (question_domain, limit))
        
        if result.success and result.data:
            result.data = [self._row_to_insight_dict(row) for row in result.data]
        
        return result
    
    async def get_all_insights(self, limit: int = 500) -> DatabaseResult:
        """Get all learning insights"""
        query = "SELECT * FROM learning_insights ORDER BY timestamp DESC LIMIT ?"
        result = await self._fetch_all(query, (limit,))
        
        if result.success and result.data:
            result.data = [self._row_to_insight_dict(row) for row in result.data]
        
        return result
    
    def _row_to_insight_dict(self, row: tuple) -> Dict[str, Any]:
        """Convert database row to insight dictionary"""
        return {
            "id": row[0],
            "shop_profile": row[1],
            "question_domain": row[2],
            "question_pattern": row[3],
            "recommendation_success": json.loads(row[4]) if row[4] else {},
            "conversation_context": json.loads(row[5]) if row[5] else {},
            "timestamp": row[6]
        }


# Transaction context manager for complex operations
@asynccontextmanager
async def database_transaction() -> AsyncGenerator[Dict[str, AsyncRepository], None]:
    """
    Context manager for database transactions with multiple repositories.
    
    Usage:
        async with database_transaction() as repos:
            user_result = await repos['users'].create_user(...)
            session_result = await repos['sessions'].create_or_update_session(...)
    """
    repositories = {
        'users': AsyncUserRepository(),
        'sessions': AsyncAgenticSessionRepository(),
        'messages': AsyncAgenticMessageRepository(),
        'insights': AsyncLearningInsightsRepository()
    }
    
    try:
        yield repositories
    except Exception as e:
        logger.error(f"Transaction failed: {e}")
        raise


# Convenience functions for common operations
async def get_user_repository() -> AsyncUserRepository:
    """Get user repository instance"""
    return AsyncUserRepository()


async def get_session_repository() -> AsyncAgenticSessionRepository:
    """Get session repository instance"""
    return AsyncAgenticSessionRepository()


async def get_message_repository() -> AsyncAgenticMessageRepository:
    """Get message repository instance"""
    return AsyncAgenticMessageRepository()


async def get_insights_repository() -> AsyncLearningInsightsRepository:
    """Get insights repository instance"""
    return AsyncLearningInsightsRepository()