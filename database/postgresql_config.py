#!/usr/bin/env python3
"""
PostgreSQL Database Configuration for 6FB AI Agent System
"""

import os
import asyncpg
import asyncio
from typing import Optional, Dict, Any, List
import json
from datetime import datetime

class PostgreSQLDatabase:
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://agent_user:secure_agent_password_2024@postgres:5432/agent_system')
        self.pool = None
    
    async def init_connection_pool(self):
        """Initialize connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=2,
                max_size=10,
                command_timeout=60
            )
            print("✅ PostgreSQL connection pool initialized")
        except Exception as e:
            print(f"❌ Failed to initialize PostgreSQL pool: {e}")
            raise
    
    async def close_pool(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
            print("🔌 PostgreSQL connection pool closed")
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT id, email, name, hashed_password, role, is_active, created_at, updated_at FROM users WHERE email = $1", 
                email
            )
            return dict(row) if row else None
    
    async def create_user(self, email: str, password_hash: str, full_name: str) -> Dict[str, Any]:
        """Create new user"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO users (email, password_hash, full_name, is_verified)
                VALUES ($1, $2, $3, TRUE)
                RETURNING *
                """,
                email, password_hash, full_name
            )
            return dict(row)
    
    async def save_chat_message(self, user_id: int, session_id: str, message: str, response: str, agent_type: str = "general"):
        """Save chat conversation"""
        async with self.pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO chat_history (user_id, session_id, message, response, agent_type)
                VALUES ($1, $2, $3, $4, $5)
                """,
                user_id, session_id, message, response, agent_type
            )
    
    async def get_chat_history(self, user_id: int, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get chat history for user and session"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT * FROM chat_history 
                WHERE user_id = $1 AND session_id = $2 
                ORDER BY created_at DESC 
                LIMIT $3
                """,
                user_id, session_id, limit
            )
            return [dict(row) for row in reversed(rows)]
    
    async def save_integration(self, user_id: int, integration_type: str, integration_name: str, 
                             access_token: str = None, metadata: Dict = None) -> Dict[str, Any]:
        """Save integration configuration"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO integrations (user_id, integration_type, integration_name, access_token, metadata)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                """,
                user_id, integration_type, integration_name, access_token, json.dumps(metadata) if metadata else None
            )
            return dict(row)
    
    async def get_user_integrations(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all active integrations for user"""
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM integrations WHERE user_id = $1 AND is_active = TRUE",
                user_id
            )
            return [dict(row) for row in rows]
    
    async def health_check(self) -> bool:
        """Database health check"""
        try:
            async with self.pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            return True
        except Exception as e:
            print(f"❌ Database health check failed: {e}")
            return False

# Global database instance
db = PostgreSQLDatabase()

async def get_database():
    """Dependency for FastAPI"""
    return db