#!/usr/bin/env python3
"""
Optimized Database Manager with Connection Pooling and Memory Management
Replaces the synchronous database handling in FastAPI backend
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import os
from pathlib import Path

from .async_connection_pool import (
    AsyncConnectionPool, 
    ConnectionPoolConfig, 
    initialize_connection_pool,
    close_connection_pool,
    get_connection_pool
)

logger = logging.getLogger(__name__)

class OptimizedDatabaseManager:
    """
    High-performance database manager with:
    - Async connection pooling
    - Memory-efficient operations
    - Automatic cleanup
    - Connection health monitoring
    """
    
    def __init__(self, database_path: str = "data/agent_system.db"):
        self.database_path = database_path
        self.pool: Optional[AsyncConnectionPool] = None
        self.cleanup_task: Optional[asyncio.Task] = None
        self._initialized = False
        
        # Performance tracking
        self.stats = {
            'queries_executed': 0,
            'failed_queries': 0,
            'cleanup_runs': 0,
            'memory_optimizations': 0
        }
    
    async def initialize(self):
        """Initialize the database manager with optimized settings"""
        if self._initialized:
            return
            
        try:
            # Create optimized connection pool config
            config = ConnectionPoolConfig(
                database_path=self.database_path,
                max_connections=20,  # Handle up to 20 concurrent users per connection
                min_connections=3,   # Minimum pool size for availability
                connection_timeout=30.0,
                idle_timeout=300.0,  # 5 minutes idle timeout
                max_retries=3,
                enable_wal=True,     # WAL mode for better concurrency
                journal_mode="WAL",
                synchronous="NORMAL", # Balance between safety and speed
                cache_size=-32000,   # 32MB cache per connection
                temp_store="MEMORY",
                mmap_size=134217728, # 128MB memory mapping
                busy_timeout=10000   # 10 seconds busy timeout
            )
            
            # Initialize global connection pool
            self.pool = await initialize_connection_pool(config)
            
            # Initialize database schema
            await self._initialize_schema()
            
            # Start cleanup tasks
            self.cleanup_task = asyncio.create_task(self._periodic_cleanup())
            
            self._initialized = True
            logger.info("✅ Optimized database manager initialized")
            
        except Exception as e:
            logger.error(f"❌ Database manager initialization failed: {e}")
            raise
    
    async def _initialize_schema(self):
        """Initialize database schema with optimized indexes"""
        schema_queries = [
            # Users table with optimized indexes
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                shop_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                last_login TIMESTAMP,
                login_count INTEGER DEFAULT 0
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, last_login)",
            
            # Sessions table with TTL optimization
            """
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
            
            # Chat history with size limits and cleanup
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                message TEXT NOT NULL,
                response TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                message_size INTEGER,
                response_size INTEGER,
                session_id TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_chat_user_time ON chat_history(user_id, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_chat_cleanup ON chat_history(created_at, message_size)",
            
            # Agents table
            """
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT,
                last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                usage_count INTEGER DEFAULT 0
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status, last_used)",
            
            # Shop profiles with JSON optimization
            """
            CREATE TABLE IF NOT EXISTS shop_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                profile_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_size INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_profiles_user_updated ON shop_profiles(user_id, updated_at)",
            
            # Performance monitoring table
            """
            CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL,
                value REAL NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_metrics_type_time ON performance_metrics(metric_type, created_at)"
        ]
        
        # Execute schema creation in a transaction
        async with self.pool.get_connection() as conn:
            await conn.execute("BEGIN")
            try:
                for query in schema_queries:
                    await conn.execute(query)
                await conn.commit()
                logger.info("✅ Database schema initialized with optimizations")
            except Exception as e:
                await conn.rollback()
                logger.error(f"❌ Schema initialization failed: {e}")
                raise
    
    async def _periodic_cleanup(self):
        """Periodic cleanup task to prevent memory bloat"""
        while True:
            try:
                await asyncio.sleep(300)  # Run every 5 minutes
                await self._cleanup_expired_data()
                self.stats['cleanup_runs'] += 1
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    async def _cleanup_expired_data(self):
        """Clean up expired sessions and old chat history to prevent memory bloat"""
        cleanup_operations = [
            # Clean expired sessions (older than expiry)
            ("DELETE FROM sessions WHERE expires_at < datetime('now')", ()),
            
            # Clean old chat history (keep last 1000 messages per user, or last 30 days)
            ("""
                DELETE FROM chat_history 
                WHERE id NOT IN (
                    SELECT id FROM chat_history 
                    WHERE user_id = chat_history.user_id 
                    ORDER BY created_at DESC 
                    LIMIT 1000
                ) AND created_at < datetime('now', '-30 days')
            """, ()),
            
            # Clean old performance metrics (keep last 30 days)
            ("DELETE FROM performance_metrics WHERE created_at < datetime('now', '-30 days')", ()),
            
            # Update shop profile sizes for monitoring
            ("""
                UPDATE shop_profiles 
                SET data_size = length(profile_data), updated_at = datetime('now') 
                WHERE data_size IS NULL
            """, ()),
        ]
        
        cleanup_count = 0
        async with self.pool.get_connection() as conn:
            await conn.execute("BEGIN")
            try:
                for query, params in cleanup_operations:
                    cursor = await conn.execute(query, params)
                    cleanup_count += cursor.rowcount
                
                await conn.commit()
                
                if cleanup_count > 0:
                    logger.info(f"✅ Cleaned up {cleanup_count} expired records")
                    self.stats['memory_optimizations'] += cleanup_count
                    
            except Exception as e:
                await conn.rollback()
                logger.error(f"❌ Cleanup failed: {e}")
    
    # Optimized CRUD operations
    async def create_user(self, email: str, password_hash: str, shop_name: str = None) -> int:
        """Create user with optimized query"""
        query = """
            INSERT INTO users (email, password_hash, shop_name, login_count) 
            VALUES (?, ?, ?, 0) 
            RETURNING id
        """
        
        try:
            async with self.pool.get_connection() as conn:
                cursor = await conn.execute(query, (email, password_hash, shop_name))
                row = await cursor.fetchone()
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                return row[0] if row else None
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Create user failed: {e}")
            raise
    
    async def authenticate_user(self, email: str) -> Optional[Dict]:
        """Authenticate user with login tracking"""
        query = """
            SELECT id, email, password_hash, shop_name, login_count
            FROM users 
            WHERE email = ? AND is_active = 1
        """
        
        try:
            async with self.pool.get_connection() as conn:
                cursor = await conn.execute(query, (email,))
                row = await cursor.fetchone()
                
                if row:
                    # Update login stats
                    await conn.execute(
                        "UPDATE users SET last_login = datetime('now'), login_count = login_count + 1 WHERE id = ?",
                        (row[0],)
                    )
                    await conn.commit()
                    
                    return {
                        'id': row[0],
                        'email': row[1],
                        'password_hash': row[2],
                        'shop_name': row[3],
                        'login_count': row[4] + 1
                    }
                
                self.stats['queries_executed'] += 1
                return None
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"User authentication failed: {e}")
            raise
    
    async def create_session(self, user_id: int, token: str, expires_at: datetime, 
                           ip_address: str = None, user_agent: str = None) -> bool:
        """Create session with metadata"""
        query = """
            INSERT INTO sessions (token, user_id, expires_at, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?)
        """
        
        try:
            async with self.pool.get_connection() as conn:
                await conn.execute(query, (token, user_id, expires_at, ip_address, user_agent))
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                return True
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Session creation failed: {e}")
            raise
    
    async def validate_session(self, token: str) -> Optional[Dict]:
        """Validate session with automatic cleanup"""
        query = """
            SELECT u.id, u.email, u.shop_name, s.created_at
            FROM users u 
            JOIN sessions s ON u.id = s.user_id 
            WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1
        """
        
        try:
            async with self.pool.get_connection() as conn:
                # Update last accessed
                await conn.execute(
                    "UPDATE sessions SET last_accessed = datetime('now') WHERE token = ?",
                    (token,)
                )
                
                cursor = await conn.execute(query, (token,))
                row = await cursor.fetchone()
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                
                if row:
                    return {
                        'id': row[0],
                        'email': row[1],
                        'shop_name': row[2],
                        'session_created': row[3]
                    }
                return None
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Session validation failed: {e}")
            raise
    
    async def save_chat_message(self, user_id: int, agent_id: str, message: str, 
                              response: str, session_id: str = None) -> int:
        """Save chat message with size tracking"""
        message_size = len(message.encode('utf-8'))
        response_size = len(response.encode('utf-8'))
        
        # Limit message sizes to prevent memory bloat
        if message_size > 50000:  # 50KB limit
            message = message[:50000] + "...[truncated]"
            message_size = len(message.encode('utf-8'))
        
        if response_size > 100000:  # 100KB limit
            response = response[:100000] + "...[truncated]"
            response_size = len(response.encode('utf-8'))
        
        query = """
            INSERT INTO chat_history 
            (user_id, agent_id, message, response, session_id, message_size, response_size) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        try:
            async with self.pool.get_connection() as conn:
                cursor = await conn.execute(
                    query, 
                    (user_id, agent_id, message, response, session_id, message_size, response_size)
                )
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                return cursor.lastrowid
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Chat message save failed: {e}")
            raise
    
    async def get_user_chat_history(self, user_id: int, limit: int = 50, 
                                  session_id: str = None) -> List[Dict]:
        """Get user chat history with memory efficiency"""
        if session_id:
            query = """
                SELECT agent_id, message, response, created_at 
                FROM chat_history 
                WHERE user_id = ? AND session_id = ?
                ORDER BY created_at DESC 
                LIMIT ?
            """
            params = (user_id, session_id, limit)
        else:
            query = """
                SELECT agent_id, message, response, created_at 
                FROM chat_history 
                WHERE user_id = ? 
                ORDER BY created_at DESC 
                LIMIT ?
            """
            params = (user_id, limit)
        
        try:
            async with self.pool.get_connection() as conn:
                cursor = await conn.execute(query, params)
                rows = await cursor.fetchall()
                
                self.stats['queries_executed'] += 1
                
                return [
                    {
                        'agent_id': row[0],
                        'message': row[1],
                        'response': row[2],
                        'created_at': row[3]
                    }
                    for row in rows
                ]
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Chat history retrieval failed: {e}")
            raise
    
    async def save_shop_profile(self, user_id: int, profile_data: Dict) -> bool:
        """Save shop profile with size optimization"""
        profile_json = json.dumps(profile_data, separators=(',', ':'))  # Compact JSON
        data_size = len(profile_json.encode('utf-8'))
        
        # Limit profile size to prevent bloat
        if data_size > 1000000:  # 1MB limit
            logger.warning(f"Large profile data ({data_size} bytes) for user {user_id}")
        
        query = """
            INSERT OR REPLACE INTO shop_profiles 
            (user_id, profile_data, data_size, updated_at) 
            VALUES (?, ?, ?, datetime('now'))
        """
        
        try:
            async with self.pool.get_connection() as conn:
                await conn.execute(query, (user_id, profile_json, data_size))
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                return True
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Shop profile save failed: {e}")
            raise
    
    async def get_shop_profile(self, user_id: int) -> Optional[Dict]:
        """Get shop profile efficiently"""
        query = """
            SELECT profile_data, updated_at 
            FROM shop_profiles 
            WHERE user_id = ? 
            ORDER BY updated_at DESC 
            LIMIT 1
        """
        
        try:
            async with self.pool.get_connection() as conn:
                cursor = await conn.execute(query, (user_id,))
                row = await cursor.fetchone()
                
                self.stats['queries_executed'] += 1
                
                if row and row[0]:
                    return {
                        'profile_data': json.loads(row[0]),
                        'updated_at': row[1]
                    }
                return None
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Shop profile retrieval failed: {e}")
            raise
    
    async def record_performance_metric(self, metric_type: str, value: float, 
                                      metadata: Dict = None):
        """Record performance metrics for monitoring"""
        metadata_json = json.dumps(metadata) if metadata else None
        
        query = """
            INSERT INTO performance_metrics (metric_type, value, metadata) 
            VALUES (?, ?, ?)
        """
        
        try:
            async with self.pool.get_connection() as conn:
                await conn.execute(query, (metric_type, value, metadata_json))
                await conn.commit()
                
                self.stats['queries_executed'] += 1
                
        except Exception as e:
            self.stats['failed_queries'] += 1
            logger.error(f"Performance metric recording failed: {e}")
    
    async def get_health_status(self) -> Dict:
        """Get comprehensive database health status"""
        try:
            # Get connection pool health
            pool_health = await self.pool.health_check()
            
            # Get database statistics
            stats_queries = [
                ("SELECT COUNT(*) FROM users WHERE is_active = 1", "active_users"),
                ("SELECT COUNT(*) FROM sessions WHERE expires_at > datetime('now')", "active_sessions"),
                ("SELECT COUNT(*) FROM chat_history WHERE created_at > datetime('now', '-1 day')", "recent_chats"),
                ("SELECT AVG(data_size) FROM shop_profiles WHERE data_size IS NOT NULL", "avg_profile_size")
            ]
            
            db_stats = {}
            async with self.pool.get_connection() as conn:
                for query, key in stats_queries:
                    cursor = await conn.execute(query)
                    row = await cursor.fetchone()
                    db_stats[key] = row[0] if row and row[0] is not None else 0
            
            return {
                'database_healthy': pool_health['healthy'],
                'connection_pool': pool_health,
                'database_stats': db_stats,
                'manager_stats': self.stats,
                'cleanup_enabled': self.cleanup_task is not None and not self.cleanup_task.done(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health status check failed: {e}")
            return {
                'database_healthy': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def close(self):
        """Close the database manager and cleanup resources"""
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        if self.pool:
            await close_connection_pool()
        
        self._initialized = False
        logger.info("✅ Optimized database manager closed")

# Global instance
_db_manager: Optional[OptimizedDatabaseManager] = None

def get_database_manager() -> OptimizedDatabaseManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = OptimizedDatabaseManager()
    return _db_manager

async def initialize_database_manager(database_path: str = "data/agent_system.db"):
    """Initialize global database manager"""
    global _db_manager
    _db_manager = OptimizedDatabaseManager(database_path)
    await _db_manager.initialize()
    return _db_manager

async def close_database_manager():
    """Close global database manager"""
    global _db_manager
    if _db_manager:
        await _db_manager.close()
        _db_manager = None