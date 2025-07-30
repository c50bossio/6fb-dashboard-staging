#!/usr/bin/env python3
"""
Async database initialization module for creating tables and setting up the database schema.
Provides database setup, migration support, and health checks.
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import aiosqlite
from datetime import datetime

from .async_connection_pool import (
    ConnectionPoolConfig, 
    initialize_connection_pool, 
    get_database_connection,
    execute_query
)

logger = logging.getLogger(__name__)


class AsyncDatabaseInitializer:
    """Handle database initialization, schema creation, and migrations"""
    
    def __init__(self, database_path: str = "agent_system.db"):
        self.database_path = database_path
        self.schema_version = 1
        
    async def initialize_database(self, pool_config: ConnectionPoolConfig = None) -> bool:
        """
        Initialize database with proper schema and connection pool.
        
        Args:
            pool_config: Optional connection pool configuration
            
        Returns:
            bool: True if initialization successful
        """
        try:
            # Use provided config or create default
            if pool_config is None:
                pool_config = ConnectionPoolConfig(
                    database_path=self.database_path,
                    max_connections=20,
                    min_connections=5,
                    enable_wal=True,
                    enable_foreign_keys=True
                )
            
            # Initialize connection pool
            logger.info("Initializing database connection pool...")
            await initialize_connection_pool(pool_config)
            
            # Create database schema
            logger.info("Creating database schema...")
            await self._create_schema()
            
            # Run any pending migrations
            logger.info("Checking for database migrations...")
            await self._run_migrations()
            
            # Verify database health
            logger.info("Verifying database health...")
            health_check = await self.health_check()
            
            if health_check['healthy']:
                logger.info("Database initialization completed successfully")
                return True
            else:
                logger.error(f"Database health check failed: {health_check}")
                return False
                
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            return False
    
    async def _create_schema(self) -> None:
        """Create all required database tables"""
        
        # Users table
        users_schema = """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                full_name TEXT NOT NULL,
                barbershop_name TEXT,
                barbershop_id TEXT UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        
        # Agentic sessions table
        sessions_schema = """
            CREATE TABLE IF NOT EXISTS agentic_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                shop_context TEXT NOT NULL,
                conversation_history TEXT,
                ongoing_projects TEXT,
                goals TEXT,
                pain_points TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                INDEX idx_sessions_user_id (user_id),
                INDEX idx_sessions_updated (updated_at)
            )
        """
        
        # Agentic messages table
        messages_schema = """
            CREATE TABLE IF NOT EXISTS agentic_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
                content TEXT NOT NULL,
                domains_addressed TEXT,
                recommendations TEXT,
                confidence REAL CHECK (confidence >= 0.0 AND confidence <= 1.0),
                urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
                requires_data BOOLEAN DEFAULT FALSE,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES agentic_sessions (session_id) ON DELETE CASCADE,
                INDEX idx_messages_session_id (session_id),
                INDEX idx_messages_timestamp (timestamp),
                INDEX idx_messages_role (role)
            )
        """
        
        # Learning insights table
        insights_schema = """
            CREATE TABLE IF NOT EXISTS learning_insights (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_profile TEXT NOT NULL,
                question_domain TEXT NOT NULL,
                question_pattern TEXT,
                recommendation_success TEXT,
                conversation_context TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_insights_profile (shop_profile),
                INDEX idx_insights_domain (question_domain),
                INDEX idx_insights_timestamp (timestamp)
            )
        """
        
        # Schema version table for migrations
        version_schema = """
            CREATE TABLE IF NOT EXISTS schema_version (
                id INTEGER PRIMARY KEY,
                version INTEGER NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                description TEXT
            )
        """
        
        # User analytics table (for performance monitoring)
        analytics_schema = """
            CREATE TABLE IF NOT EXISTS user_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_count INTEGER DEFAULT 0,
                message_count INTEGER DEFAULT 0,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                total_query_time REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id)
            )
        """
        
        schemas = [
            ("users", users_schema),
            ("agentic_sessions", sessions_schema),
            ("agentic_messages", messages_schema),
            ("learning_insights", insights_schema),
            ("schema_version", version_schema),
            ("user_analytics", analytics_schema)
        ]
        
        # Execute schema creation
        for table_name, schema in schemas:
            try:
                await execute_query(schema)
                logger.debug(f"Created/verified table: {table_name}")
            except Exception as e:
                logger.error(f"Failed to create table {table_name}: {e}")
                raise
        
        # Create initial schema version record if not exists
        await self._set_schema_version(self.schema_version, "Initial schema creation")
    
    async def _run_migrations(self) -> None:
        """Run database migrations if needed"""
        current_version = await self._get_current_schema_version()
        
        if current_version < self.schema_version:
            logger.info(f"Running migrations from version {current_version} to {self.schema_version}")
            
            # Define migrations
            migrations = {
                1: self._migration_v1
            }
            
            # Run pending migrations
            for version in range(current_version + 1, self.schema_version + 1):
                if version in migrations:
                    try:
                        await migrations[version]()
                        await self._set_schema_version(version, f"Migration to version {version}")
                        logger.info(f"Applied migration to version {version}")
                    except Exception as e:
                        logger.error(f"Migration to version {version} failed: {e}")
                        raise
    
    async def _migration_v1(self) -> None:
        """Migration to version 1 - add indexes for performance"""
        migrations = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
            "CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users (barbershop_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active)",
            """
            CREATE TRIGGER IF NOT EXISTS update_user_timestamp 
            AFTER UPDATE ON users
            BEGIN
                UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
            """,
            """
            CREATE TRIGGER IF NOT EXISTS update_session_timestamp 
            AFTER UPDATE ON agentic_sessions
            BEGIN
                UPDATE agentic_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
            END
            """,
            """
            CREATE TRIGGER IF NOT EXISTS update_analytics_on_message
            AFTER INSERT ON agentic_messages
            BEGIN
                INSERT OR REPLACE INTO user_analytics (user_id, message_count, last_activity)
                SELECT s.user_id, COALESCE(ua.message_count, 0) + 1, CURRENT_TIMESTAMP
                FROM agentic_sessions s
                LEFT JOIN user_analytics ua ON s.user_id = ua.user_id
                WHERE s.session_id = NEW.session_id;
            END
            """
        ]
        
        for migration in migrations:
            await execute_query(migration)
    
    async def _get_current_schema_version(self) -> int:
        """Get current database schema version"""
        try:
            async with get_database_connection() as conn:
                cursor = await conn.execute(
                    "SELECT MAX(version) FROM schema_version"
                )
                result = await cursor.fetchone()
                return result[0] if result and result[0] is not None else 0
        except:
            return 0
    
    async def _set_schema_version(self, version: int, description: str) -> None:
        """Set database schema version"""
        await execute_query(
            "INSERT OR REPLACE INTO schema_version (id, version, description) VALUES (1, ?, ?)",
            (version, description)
        )
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform comprehensive database health check"""
        try:
            start_time = datetime.now()
            
            # Basic connectivity test
            async with get_database_connection() as conn:
                await conn.execute("SELECT 1")
            
            # Test each table
            tables = ['users', 'agentic_sessions', 'agentic_messages', 'learning_insights']
            table_stats = {}
            
            for table in tables:
                try:
                    async with get_database_connection() as conn:
                        cursor = await conn.execute(f"SELECT COUNT(*) FROM {table}")
                        count = await cursor.fetchone()
                        table_stats[table] = {'count': count[0], 'status': 'healthy'}
                except Exception as e:
                    table_stats[table] = {'count': 0, 'status': 'error', 'error': str(e)}
            
            # Check WAL mode
            wal_enabled = False
            try:
                async with get_database_connection() as conn:
                    cursor = await conn.execute("PRAGMA journal_mode")
                    mode = await cursor.fetchone()
                    wal_enabled = mode[0].upper() == 'WAL' if mode else False
            except:
                pass
            
            # Check foreign keys
            fk_enabled = False
            try:
                async with get_database_connection() as conn:
                    cursor = await conn.execute("PRAGMA foreign_keys")
                    fk = await cursor.fetchone()
                    fk_enabled = bool(fk[0]) if fk else False
            except:
                pass
            
            response_time = (datetime.now() - start_time).total_seconds()
            
            # Determine overall health
            all_tables_healthy = all(
                stats['status'] == 'healthy' 
                for stats in table_stats.values()
            )
            
            return {
                'healthy': all_tables_healthy,
                'response_time_seconds': response_time,
                'database_path': self.database_path,
                'schema_version': await self._get_current_schema_version(),
                'wal_enabled': wal_enabled,
                'foreign_keys_enabled': fk_enabled,
                'table_stats': table_stats,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {
                'healthy': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    async def get_database_info(self) -> Dict[str, Any]:
        """Get comprehensive database information"""
        try:
            info = {}
            
            async with get_database_connection() as conn:
                # Database file size
                try:
                    db_path = Path(self.database_path)
                    info['file_size_bytes'] = db_path.stat().st_size if db_path.exists() else 0
                    info['file_size_mb'] = round(info['file_size_bytes'] / (1024 * 1024), 2)
                except:
                    info['file_size_bytes'] = 0
                    info['file_size_mb'] = 0
                
                # SQLite version
                cursor = await conn.execute("SELECT sqlite_version()")
                version = await cursor.fetchone()
                info['sqlite_version'] = version[0] if version else 'unknown'
                
                # Page count and size
                cursor = await conn.execute("PRAGMA page_count")
                page_count = await cursor.fetchone()
                info['page_count'] = page_count[0] if page_count else 0
                
                cursor = await conn.execute("PRAGMA page_size")
                page_size = await cursor.fetchone()
                info['page_size'] = page_size[0] if page_size else 0
                
                # Cache size
                cursor = await conn.execute("PRAGMA cache_size")
                cache_size = await cursor.fetchone()
                info['cache_size'] = cache_size[0] if cache_size else 0
                
                # Journal mode
                cursor = await conn.execute("PRAGMA journal_mode")
                journal_mode = await cursor.fetchone()
                info['journal_mode'] = journal_mode[0] if journal_mode else 'unknown'
                
                # Synchronous mode
                cursor = await conn.execute("PRAGMA synchronous")
                synchronous = await cursor.fetchone()
                info['synchronous'] = synchronous[0] if synchronous else 'unknown'
                
                # Table list with row counts
                cursor = await conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
                tables = await cursor.fetchall()
                
                table_info = {}
                for (table_name,) in tables:
                    cursor = await conn.execute(f"SELECT COUNT(*) FROM {table_name}")
                    count = await cursor.fetchone()
                    table_info[table_name] = count[0] if count else 0
                
                info['tables'] = table_info
                info['total_records'] = sum(table_info.values())
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get database info: {e}")
            return {'error': str(e)}
    
    async def optimize_database(self) -> Dict[str, Any]:
        """Optimize database performance"""
        try:
            results = {}
            
            async with get_database_connection() as conn:
                # Analyze database
                await conn.execute("ANALYZE")
                results['analyze'] = 'completed'
                
                # Vacuum if needed (only if not in WAL mode during active use)
                try:
                    await conn.execute("VACUUM")
                    results['vacuum'] = 'completed'
                except Exception as e:
                    results['vacuum'] = f'skipped: {e}'
                
                # Update statistics
                await conn.execute("PRAGMA optimize")
                results['optimize'] = 'completed'
            
            logger.info("Database optimization completed")
            return {
                'success': True,
                'operations': results,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }


# Global database initializer instance
_db_initializer: Optional[AsyncDatabaseInitializer] = None


def get_database_initializer(database_path: str = "agent_system.db") -> AsyncDatabaseInitializer:
    """Get or create database initializer instance"""
    global _db_initializer
    if _db_initializer is None or _db_initializer.database_path != database_path:
        _db_initializer = AsyncDatabaseInitializer(database_path)
    return _db_initializer


# Convenience functions
async def initialize_database(database_path: str = "agent_system.db", 
                            pool_config: ConnectionPoolConfig = None) -> bool:
    """Initialize database with default settings"""
    initializer = get_database_initializer(database_path)
    return await initializer.initialize_database(pool_config)


async def health_check_database(database_path: str = "agent_system.db") -> Dict[str, Any]:
    """Perform database health check"""
    initializer = get_database_initializer(database_path)
    return await initializer.health_check()


async def get_database_info(database_path: str = "agent_system.db") -> Dict[str, Any]:
    """Get database information"""
    initializer = get_database_initializer(database_path)
    return await initializer.get_database_info()


async def optimize_database(database_path: str = "agent_system.db") -> Dict[str, Any]:
    """Optimize database performance"""
    initializer = get_database_initializer(database_path)
    return await initializer.optimize_database()