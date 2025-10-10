"""
Supabase Database Service for 6FB AI Agent System
Replaces SQLite with PostgreSQL via Supabase for production use
"""

import os
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import asyncpg
from contextlib import asynccontextmanager
import logging

# Setup logging
logger = logging.getLogger(__name__)

class SupabaseDatabase:
    """Supabase PostgreSQL database service"""
    
    def __init__(self):
        # Get Supabase connection details from environment
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.service_role_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.service_role_key:
            logger.warning("Supabase credentials not found, falling back to local database")
            self.connection_string = None
        else:
            # Extract database connection string from Supabase URL
            # Format: https://project_id.supabase.co
            project_id = self.supabase_url.replace('https://', '').replace('.supabase.co', '')
            
            # Construct PostgreSQL connection string
            # Note: This is a simplified approach. In production, use proper connection pooling
            self.connection_string = f"postgresql://postgres:{self.service_role_key}@db.{project_id}.supabase.co:5432/postgres"
        
        self.connection_pool = None
        self._connection_stats = {
            'active_connections': 0,
            'total_queries': 0,
            'successful_queries': 0,
            'failed_queries': 0,
            'last_error': None
        }
    
    async def initialize_pool(self, min_connections: int = 1, max_connections: int = 10):
        """Initialize the connection pool"""
        if not self.connection_string:
            logger.warning("No connection string available, database not initialized")
            return False
        
        try:
            self.connection_pool = await asyncpg.create_pool(
                self.connection_string,
                min_size=min_connections,
                max_size=max_connections,
                command_timeout=30
            )
            logger.info(f"✅ Supabase connection pool initialized ({min_connections}-{max_connections} connections)")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to initialize Supabase connection pool: {e}")
            self._connection_stats['last_error'] = str(e)
            return False
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        if not self.connection_pool:
            # Try to initialize pool if not already done
            await self.initialize_pool()
        
        if not self.connection_pool:
            raise Exception("Database connection pool not available")
        
        connection = None
        try:
            connection = await self.connection_pool.acquire()
            self._connection_stats['active_connections'] += 1
            yield connection
        except Exception as e:
            self._connection_stats['failed_queries'] += 1
            self._connection_stats['last_error'] = str(e)
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if connection:
                await self.connection_pool.release(connection)
                self._connection_stats['active_connections'] -= 1
    
    async def execute_query(self, query: str, *args) -> List[Dict]:
        """Execute a query and return results"""
        try:
            async with self.get_connection() as conn:
                result = await conn.fetch(query, *args)
                self._connection_stats['total_queries'] += 1
                self._connection_stats['successful_queries'] += 1
                
                # Convert asyncpg Records to dictionaries
                return [dict(record) for record in result]
        except Exception as e:
            self._connection_stats['total_queries'] += 1
            self._connection_stats['failed_queries'] += 1
            self._connection_stats['last_error'] = str(e)
            logger.error(f"Query execution failed: {e}")
            raise
    
    async def execute_command(self, command: str, *args) -> str:
        """Execute a command (INSERT, UPDATE, DELETE) and return result"""
        try:
            async with self.get_connection() as conn:
                result = await conn.execute(command, *args)
                self._connection_stats['total_queries'] += 1
                self._connection_stats['successful_queries'] += 1
                return result
        except Exception as e:
            self._connection_stats['total_queries'] += 1
            self._connection_stats['failed_queries'] += 1
            self._connection_stats['last_error'] = str(e)
            logger.error(f"Command execution failed: {e}")
            raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Check database health"""
        try:
            async with self.get_connection() as conn:
                result = await conn.fetchval("SELECT 1")
                
                if result == 1:
                    return {
                        "status": "healthy",
                        "type": "postgresql",
                        "provider": "supabase",
                        "connection": "active",
                        "stats": self._connection_stats,
                        "timestamp": datetime.now().isoformat()
                    }
                else:
                    return {
                        "status": "unhealthy",
                        "type": "postgresql",
                        "provider": "supabase",
                        "error": "Health check query failed",
                        "timestamp": datetime.now().isoformat()
                    }
        except Exception as e:
            return {
                "status": "unhealthy",
                "type": "postgresql", 
                "provider": "supabase",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def get_table_info(self, table_name: str) -> Dict[str, Any]:
        """Get information about a specific table"""
        try:
            # Get table schema information
            schema_query = """
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = $1 AND table_schema = 'public'
            ORDER BY ordinal_position
            """
            
            columns = await self.execute_query(schema_query, table_name)
            
            # Get row count
            count_query = f"SELECT COUNT(*) as count FROM {table_name}"
            count_result = await self.execute_query(count_query)
            row_count = count_result[0]['count'] if count_result else 0
            
            return {
                "table_name": table_name,
                "columns": columns,
                "row_count": row_count,
                "exists": len(columns) > 0
            }
            
        except Exception as e:
            return {
                "table_name": table_name,
                "exists": False,
                "error": str(e)
            }
    
    async def list_tables(self) -> List[str]:
        """Get list of all tables in the database"""
        try:
            query = """
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
            """
            result = await self.execute_query(query)
            return [row['table_name'] for row in result]
        except Exception as e:
            logger.error(f"Failed to list tables: {e}")
            return []
    
    async def close(self):
        """Close the connection pool"""
        if self.connection_pool:
            await self.connection_pool.close()
            self.connection_pool = None
            logger.info("Supabase connection pool closed")

# Global database instance
supabase_db = SupabaseDatabase()

# Helper functions for backward compatibility
async def get_db_connection():
    """Get database connection (async context manager)"""
    return supabase_db.get_connection()

async def execute_query(query: str, *args):
    """Execute query and return results"""
    return await supabase_db.execute_query(query, *args)

async def execute_command(command: str, *args):
    """Execute command and return result"""
    return await supabase_db.execute_command(command, *args)

async def init_database():
    """Initialize database connection pool"""
    return await supabase_db.initialize_pool()

async def get_database_health():
    """Get database health status"""
    return await supabase_db.health_check()

def get_connection_stats():
    """Get connection statistics"""
    return supabase_db._connection_stats

# Sync wrapper for compatibility with existing code
class SyncDatabaseWrapper:
    """Synchronous wrapper for async database operations"""
    
    def __init__(self):
        self.loop = None
    
    def _get_loop(self):
        try:
            return asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop
    
    def execute_query(self, query: str, *args):
        """Sync version of execute_query"""
        loop = self._get_loop()
        return loop.run_until_complete(supabase_db.execute_query(query, *args))
    
    def execute_command(self, command: str, *args):
        """Sync version of execute_command"""
        loop = self._get_loop()
        return loop.run_until_complete(supabase_db.execute_command(command, *args))
    
    def health_check(self):
        """Sync version of health_check"""
        loop = self._get_loop()
        return loop.run_until_complete(supabase_db.health_check())

# Global sync wrapper for backward compatibility
sync_db = SyncDatabaseWrapper()