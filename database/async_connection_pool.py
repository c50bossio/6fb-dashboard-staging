#!/usr/bin/env python3
"""
Production-ready async database connection pool implementation for SQLite
with WAL mode, connection limits, and proper resource management.
"""

import asyncio
import aiosqlite
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading
import weakref
import json
import os
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class ConnectionPoolConfig:
    """Configuration for database connection pool"""
    database_path: str
    max_connections: int = 20
    min_connections: int = 5
    connection_timeout: float = 30.0
    idle_timeout: float = 300.0  # 5 minutes
    max_retries: int = 3
    retry_delay: float = 1.0
    enable_wal: bool = True
    enable_foreign_keys: bool = True
    journal_mode: str = "WAL"
    synchronous: str = "NORMAL"
    cache_size: int = -64000  # 64MB cache
    temp_store: str = "MEMORY"
    mmap_size: int = 268435456  # 256MB mmap
    busy_timeout: int = 30000  # 30 seconds


class ConnectionWrapper:
    """Wrapper for database connection with metadata"""
    
    def __init__(self, connection: aiosqlite.Connection, pool: 'AsyncConnectionPool'):
        self.connection = connection
        self.pool = pool
        self.created_at = datetime.now()
        self.last_used = datetime.now()
        self.in_use = False
        self.transaction_active = False
        self.id = id(connection)
    
    async def ping(self) -> bool:
        """Check if connection is still alive"""
        try:
            await self.connection.execute("SELECT 1")
            return True
        except Exception as e:
            logger.warning(f"Connection {self.id} ping failed: {e}")
            return False
    
    def is_expired(self, idle_timeout: float) -> bool:
        """Check if connection has been idle too long"""
        return (datetime.now() - self.last_used).total_seconds() > idle_timeout
    
    def mark_used(self):
        """Mark connection as recently used"""
        self.last_used = datetime.now()


class AsyncConnectionPool:
    """
    Production-ready async SQLite connection pool with advanced features:
    - WAL mode for better concurrency
    - Connection lifecycle management
    - Automatic connection cleanup
    - Health monitoring
    - Transaction isolation
    - Retry logic with exponential backoff
    """
    
    def __init__(self, config: ConnectionPoolConfig):
        self.config = config
        self._pool: List[ConnectionWrapper] = []
        self._pool_lock = asyncio.Lock()
        self._closed = False
        self._cleanup_task: Optional[asyncio.Task] = None
        self._stats = {
            'connections_created': 0,
            'connections_destroyed': 0,
            'connections_in_use': 0,
            'total_queries': 0,
            'failed_queries': 0,
            'pool_waits': 0
        }
        
        # Ensure database directory exists
        db_path = Path(self.config.database_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def initialize(self):
        """Initialize the connection pool"""
        logger.info(f"Initializing connection pool with max_connections={self.config.max_connections}")
        
        # Create initial connections
        for _ in range(self.config.min_connections):
            try:
                connection = await self._create_connection()
                wrapper = ConnectionWrapper(connection, self)
                self._pool.append(wrapper)
                self._stats['connections_created'] += 1
            except Exception as e:
                logger.error(f"Failed to create initial connection: {e}")
                raise
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._cleanup_expired_connections())
        logger.info(f"Connection pool initialized with {len(self._pool)} connections")
    
    async def _create_connection(self) -> aiosqlite.Connection:
        """Create a new database connection with optimized settings"""
        connection = await aiosqlite.connect(
            self.config.database_path,
            timeout=self.config.connection_timeout,
            isolation_level=None  # Autocommit mode for better control
        )
        
        # Configure connection for optimal performance
        await self._configure_connection(connection)
        return connection
    
    async def _configure_connection(self, connection: aiosqlite.Connection):
        """Configure connection with optimal SQLite settings"""
        configurations = [
            f"PRAGMA journal_mode = {self.config.journal_mode}",
            f"PRAGMA synchronous = {self.config.synchronous}",
            f"PRAGMA cache_size = {self.config.cache_size}",
            f"PRAGMA temp_store = {self.config.temp_store}",
            f"PRAGMA mmap_size = {self.config.mmap_size}",
            f"PRAGMA busy_timeout = {self.config.busy_timeout}",
        ]
        
        if self.config.enable_foreign_keys:
            configurations.append("PRAGMA foreign_keys = ON")
        
        # Apply configurations
        for pragma in configurations:
            try:
                await connection.execute(pragma)
                logger.debug(f"Applied: {pragma}")
            except Exception as e:
                logger.warning(f"Failed to apply {pragma}: {e}")
        
        await connection.commit()
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """
        Get a connection from the pool with automatic cleanup.
        
        Usage:
            async with pool.get_connection() as conn:
                await conn.execute("SELECT * FROM users")
        """
        connection_wrapper = None
        try:
            connection_wrapper = await self._acquire_connection()
            self._stats['connections_in_use'] += 1
            yield connection_wrapper.connection
        finally:
            if connection_wrapper:
                await self._release_connection(connection_wrapper)
                self._stats['connections_in_use'] -= 1
    
    async def _acquire_connection(self) -> ConnectionWrapper:
        """Acquire a connection from the pool"""
        start_time = datetime.now()
        
        for attempt in range(self.config.max_retries):
            try:
                async with self._pool_lock:
                    # Find available connection
                    for wrapper in self._pool:
                        if not wrapper.in_use and await wrapper.ping():
                            wrapper.in_use = True
                            wrapper.mark_used()
                            return wrapper
                    
                    # Create new connection if pool not at max
                    if len(self._pool) < self.config.max_connections:
                        connection = await self._create_connection()
                        wrapper = ConnectionWrapper(connection, self)
                        wrapper.in_use = True
                        self._pool.append(wrapper)
                        self._stats['connections_created'] += 1
                        return wrapper
                    
                    # Pool is full, record wait
                    self._stats['pool_waits'] += 1
                
                # Wait and retry
                await asyncio.sleep(self.config.retry_delay * (2 ** attempt))
                
            except Exception as e:
                logger.error(f"Connection acquisition attempt {attempt + 1} failed: {e}")
                if attempt == self.config.max_retries - 1:
                    raise
        
        total_wait = (datetime.now() - start_time).total_seconds()
        raise ConnectionError(f"Could not acquire connection after {total_wait:.2f}s")
    
    async def _release_connection(self, wrapper: ConnectionWrapper):
        """Release a connection back to the pool"""
        try:
            # Rollback any uncommitted transaction
            if wrapper.transaction_active:
                await wrapper.connection.rollback()
                wrapper.transaction_active = False
            
            wrapper.in_use = False
            wrapper.mark_used()
            
        except Exception as e:
            logger.error(f"Error releasing connection {wrapper.id}: {e}")
            # Remove problematic connection
            await self._remove_connection(wrapper)
    
    async def _remove_connection(self, wrapper: ConnectionWrapper):
        """Remove a connection from the pool"""
        async with self._pool_lock:
            if wrapper in self._pool:
                self._pool.remove(wrapper)
                try:
                    await wrapper.connection.close()
                except Exception as e:
                    logger.error(f"Error closing connection {wrapper.id}: {e}")
                finally:
                    self._stats['connections_destroyed'] += 1
    
    async def _cleanup_expired_connections(self):
        """Background task to clean up expired connections"""
        while not self._closed:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                async with self._pool_lock:
                    expired_connections = [
                        wrapper for wrapper in self._pool
                        if (not wrapper.in_use and 
                            wrapper.is_expired(self.config.idle_timeout) and
                            len(self._pool) > self.config.min_connections)
                    ]
                    
                    for wrapper in expired_connections:
                        await self._remove_connection(wrapper)
                        logger.debug(f"Cleaned up expired connection {wrapper.id}")
                        
            except Exception as e:
                logger.error(f"Error in connection cleanup: {e}")
    
    async def execute_query(self, query: str, parameters: tuple = None, fetch_one: bool = False, fetch_all: bool = False) -> Any:
        """
        Execute a query with automatic connection management and error handling.
        
        Args:
            query: SQL query to execute
            parameters: Query parameters
            fetch_one: Whether to fetch one result
            fetch_all: Whether to fetch all results
            
        Returns:
            Query results or None
        """
        try:
            async with self.get_connection() as conn:
                cursor = await conn.execute(query, parameters or ())
                
                if fetch_one:
                    result = await cursor.fetchone()
                elif fetch_all:
                    result = await cursor.fetchall()
                else:
                    result = cursor.lastrowid
                
                await conn.commit()
                self._stats['total_queries'] += 1
                return result
                
        except Exception as e:
            self._stats['failed_queries'] += 1
            logger.error(f"Query execution failed: {e}")
            raise
    
    async def execute_transaction(self, operations: List[tuple]) -> List[Any]:
        """
        Execute multiple operations in a single transaction.
        
        Args:
            operations: List of (query, parameters) tuples
            
        Returns:
            List of results for each operation
        """
        results = []
        async with self.get_connection() as conn:
            wrapper = None
            
            # Find the wrapper for this connection
            async with self._pool_lock:
                for w in self._pool:
                    if w.connection == conn:
                        wrapper = w
                        break
            
            try:
                await conn.execute("BEGIN")
                if wrapper:
                    wrapper.transaction_active = True
                
                for query, parameters in operations:
                    cursor = await conn.execute(query, parameters or ())
                    results.append({
                        'lastrowid': cursor.lastrowid,
                        'rowcount': cursor.rowcount
                    })
                
                await conn.commit()
                if wrapper:
                    wrapper.transaction_active = False
                
                self._stats['total_queries'] += len(operations)
                return results
                
            except Exception as e:
                await conn.rollback()
                if wrapper:
                    wrapper.transaction_active = False
                self._stats['failed_queries'] += len(operations)
                logger.error(f"Transaction failed: {e}")
                raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection pool statistics"""
        return {
            **self._stats,
            'pool_size': len(self._pool),
            'available_connections': len([w for w in self._pool if not w.in_use]),
            'config': {
                'max_connections': self.config.max_connections,
                'min_connections': self.config.min_connections,
                'database_path': self.config.database_path,
                'journal_mode': self.config.journal_mode
            }
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the connection pool"""
        healthy_connections = 0
        total_connections = len(self._pool)
        
        for wrapper in self._pool:
            if await wrapper.ping():
                healthy_connections += 1
        
        health_status = {
            'healthy': healthy_connections == total_connections and total_connections >= self.config.min_connections,
            'total_connections': total_connections,
            'healthy_connections': healthy_connections,
            'stats': self.get_stats(),
            'timestamp': datetime.now().isoformat()
        }
        
        return health_status
    
    async def close(self):
        """Close all connections and cleanup resources"""
        self._closed = True
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        async with self._pool_lock:
            for wrapper in self._pool:
                try:
                    await wrapper.connection.close()
                except Exception as e:
                    logger.error(f"Error closing connection {wrapper.id}: {e}")
            
            self._pool.clear()
        
        logger.info("Connection pool closed")


# Global connection pool instance
_connection_pool: Optional[AsyncConnectionPool] = None
_pool_lock = threading.Lock()


def get_connection_pool() -> AsyncConnectionPool:
    """Get the global connection pool instance"""
    global _connection_pool
    if _connection_pool is None:
        raise RuntimeError("Connection pool not initialized. Call initialize_connection_pool() first.")
    return _connection_pool


async def initialize_connection_pool(config: ConnectionPoolConfig) -> AsyncConnectionPool:
    """Initialize the global connection pool"""
    global _connection_pool
    
    with _pool_lock:
        if _connection_pool is not None:
            await _connection_pool.close()
        
        _connection_pool = AsyncConnectionPool(config)
        await _connection_pool.initialize()
    
    logger.info("Global connection pool initialized")
    return _connection_pool


async def close_connection_pool():
    """Close the global connection pool"""
    global _connection_pool
    
    with _pool_lock:
        if _connection_pool is not None:
            await _connection_pool.close()
            _connection_pool = None
    
    logger.info("Global connection pool closed")


# Convenience functions for common database operations
async def execute_query(query: str, parameters: tuple = None, fetch_one: bool = False, fetch_all: bool = False) -> Any:
    """Execute a query using the global connection pool"""
    pool = get_connection_pool()
    return await pool.execute_query(query, parameters, fetch_one, fetch_all)


async def execute_transaction(operations: List[tuple]) -> List[Any]:
    """Execute a transaction using the global connection pool"""
    pool = get_connection_pool()
    return await pool.execute_transaction(operations)


@asynccontextmanager
async def get_database_connection() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get a database connection from the global pool"""
    pool = get_connection_pool()
    async with pool.get_connection() as conn:
        yield conn