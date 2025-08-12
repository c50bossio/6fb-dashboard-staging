#!/usr/bin/env python3
"""
Database Connection Pool Service for 6FB AI Agent System
Handles efficient database connections and query caching
"""

import asyncio
import sqlite3
import logging
import os
import time
from contextlib import asynccontextmanager, contextmanager
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass
from threading import Lock
import json

logger = logging.getLogger(__name__)

class PoolStrategy(Enum):
    SINGLE = "single"
    ROUND_ROBIN = "round_robin"
    LEAST_CONNECTIONS = "least_connections"
    ADAPTIVE = "adaptive"

@dataclass
class PoolStats:
    """Connection pool statistics"""
    total_connections: int
    active_connections: int
    idle_connections: int
    total_queries: int
    cached_queries: int
    cache_hit_rate: float
    avg_query_time: float

class DatabaseConnectionPool:
    """SQLite connection pool with caching capabilities"""
    
    def __init__(
        self,
        database_path: str = "/app/data/agent_system.db",
        max_connections: int = 10,
        strategy: PoolStrategy = PoolStrategy.ROUND_ROBIN
    ):
        self.database_path = database_path
        self.max_connections = max_connections
        self.strategy = strategy
        self.connections: List[sqlite3.Connection] = []
        self.active_connections: Dict[int, sqlite3.Connection] = {}
        self.connection_usage: Dict[int, int] = {}
        self.current_index = 0
        self.lock = Lock()
        
        # Query caching
        self.query_cache: Dict[str, Any] = {}
        self.cache_ttl: Dict[str, float] = {}
        self.cache_max_size = 1000
        self.default_cache_ttl = 300  # 5 minutes
        
        # Statistics
        self.total_queries = 0
        self.cached_queries = 0
        self.query_times: List[float] = []
        
        # Initialize pool
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            # Ensure database directory exists
            os.makedirs(os.path.dirname(self.database_path), exist_ok=True)
            
            # Create initial connections
            for i in range(min(3, self.max_connections)):  # Start with 3 connections
                conn = self._create_connection()
                if conn:
                    self.connections.append(conn)
                    self.connection_usage[id(conn)] = 0
            
            logger.info(f"Database connection pool initialized with {len(self.connections)} connections")
            
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    def _create_connection(self) -> Optional[sqlite3.Connection]:
        """Create a new database connection"""
        try:
            conn = sqlite3.connect(
                self.database_path,
                check_same_thread=False,
                timeout=30.0
            )
            conn.row_factory = sqlite3.Row  # Enable dict-like access
            conn.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
            conn.execute("PRAGMA synchronous=NORMAL")  # Performance optimization
            conn.execute("PRAGMA cache_size=10000")  # Increase cache size
            conn.execute("PRAGMA temp_store=MEMORY")  # Store temp tables in memory
            return conn
        except Exception as e:
            logger.error(f"Failed to create database connection: {e}")
            return None
    
    @contextmanager
    def get_connection(self):
        """Get a connection from the pool"""
        conn = None
        try:
            with self.lock:
                if self.strategy == PoolStrategy.SINGLE:
                    if self.connections:
                        conn = self.connections[0]
                elif self.strategy == PoolStrategy.ROUND_ROBIN:
                    if self.connections:
                        conn = self.connections[self.current_index % len(self.connections)]
                        self.current_index = (self.current_index + 1) % len(self.connections)
                elif self.strategy == PoolStrategy.LEAST_CONNECTIONS:
                    if self.connections:
                        # Find connection with least usage
                        conn = min(self.connections, key=lambda c: self.connection_usage.get(id(c), 0))
                elif self.strategy == PoolStrategy.ADAPTIVE:
                    if self.connections:
                        # Use least connections strategy but adapt based on load
                        conn = min(self.connections, key=lambda c: self.connection_usage.get(id(c), 0))
                
                if conn:
                    conn_id = id(conn)
                    self.active_connections[conn_id] = conn
                    self.connection_usage[conn_id] = self.connection_usage.get(conn_id, 0) + 1
            
            if not conn:
                # Create new connection if pool not full
                if len(self.connections) < self.max_connections:
                    conn = self._create_connection()
                    if conn:
                        with self.lock:
                            self.connections.append(conn)
                            conn_id = id(conn)
                            self.active_connections[conn_id] = conn
                            self.connection_usage[conn_id] = 1
                else:
                    # Wait for available connection
                    conn = self.connections[0]  # Fallback to first connection
            
            yield conn
            
        except Exception as e:
            logger.error(f"Error getting database connection: {e}")
            raise
        finally:
            if conn:
                with self.lock:
                    conn_id = id(conn)
                    if conn_id in self.active_connections:
                        del self.active_connections[conn_id]
    
    def _generate_cache_key(self, query: str, params: tuple = None) -> str:
        """Generate cache key for query"""
        params_str = str(params) if params else ""
        return f"{hash(query + params_str)}"
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cache entry is still valid"""
        if cache_key not in self.cache_ttl:
            return False
        return time.time() < self.cache_ttl[cache_key]
    
    def _cache_query_result(self, cache_key: str, result: Any, ttl: int = None):
        """Cache query result"""
        if len(self.query_cache) >= self.cache_max_size:
            # Remove oldest entries
            oldest_keys = sorted(self.cache_ttl.keys(), key=lambda k: self.cache_ttl[k])[:10]
            for key in oldest_keys:
                if key in self.query_cache:
                    del self.query_cache[key]
                if key in self.cache_ttl:
                    del self.cache_ttl[key]
        
        self.query_cache[cache_key] = result
        self.cache_ttl[cache_key] = time.time() + (ttl or self.default_cache_ttl)
    
    def execute_query(
        self,
        query: str,
        params: tuple = None,
        fetch_all: bool = True,
        use_cache: bool = False,
        cache_ttl: int = None
    ) -> Union[List[Dict], Dict, None]:
        """Execute a database query"""
        start_time = time.time()
        self.total_queries += 1
        
        try:
            # Check cache first
            if use_cache:
                cache_key = self._generate_cache_key(query, params)
                if cache_key in self.query_cache and self._is_cache_valid(cache_key):
                    self.cached_queries += 1
                    logger.debug(f"Cache hit for query: {query[:50]}...")
                    return self.query_cache[cache_key]
            
            # Execute query
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                
                # Handle different query types
                if query.strip().upper().startswith(('INSERT', 'UPDATE', 'DELETE')):
                    conn.commit()
                    result = {"affected_rows": cursor.rowcount}
                elif fetch_all:
                    rows = cursor.fetchall()
                    result = [dict(row) for row in rows]
                else:
                    row = cursor.fetchone()
                    result = dict(row) if row else None
                
                cursor.close()
                
                # Cache result if requested
                if use_cache and result is not None:
                    cache_key = self._generate_cache_key(query, params)
                    self._cache_query_result(cache_key, result, cache_ttl)
                
                # Record query time
                query_time = time.time() - start_time
                self.query_times.append(query_time)
                if len(self.query_times) > 1000:  # Keep only last 1000 query times
                    self.query_times = self.query_times[-1000:]
                
                return result
                
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            raise
    
    def execute_cached_query(
        self,
        query: str,
        params: tuple = None,
        cache_ttl: int = None
    ) -> Union[List[Dict], Dict, None]:
        """Execute a query with caching enabled"""
        return self.execute_query(
            query=query,
            params=params,
            use_cache=True,
            cache_ttl=cache_ttl
        )
    
    def clear_cache(self, pattern: str = None):
        """Clear query cache"""
        if pattern:
            # Clear specific pattern
            keys_to_remove = [k for k in self.query_cache.keys() if pattern in k]
            for key in keys_to_remove:
                if key in self.query_cache:
                    del self.query_cache[key]
                if key in self.cache_ttl:
                    del self.cache_ttl[key]
        else:
            # Clear all cache
            self.query_cache.clear()
            self.cache_ttl.clear()
        
        logger.info(f"Cache cleared{' for pattern: ' + pattern if pattern else ''}")
    
    def get_stats(self) -> PoolStats:
        """Get connection pool statistics"""
        cache_hit_rate = (self.cached_queries / self.total_queries * 100) if self.total_queries > 0 else 0
        avg_query_time = sum(self.query_times) / len(self.query_times) if self.query_times else 0
        
        return PoolStats(
            total_connections=len(self.connections),
            active_connections=len(self.active_connections),
            idle_connections=len(self.connections) - len(self.active_connections),
            total_queries=self.total_queries,
            cached_queries=self.cached_queries,
            cache_hit_rate=cache_hit_rate,
            avg_query_time=avg_query_time
        )
    
    def close_all_connections(self):
        """Close all connections in the pool"""
        with self.lock:
            for conn in self.connections:
                try:
                    conn.close()
                except Exception as e:
                    logger.error(f"Error closing connection: {e}")
            
            self.connections.clear()
            self.active_connections.clear()
            self.connection_usage.clear()
        
        logger.info("All database connections closed")

# Connection manager for context management
class DatabaseConnectionManager:
    """Context manager for database operations"""
    
    def __init__(self, pool: DatabaseConnectionPool):
        self.pool = pool
    
    @contextmanager
    def transaction(self):
        """Execute operations in a transaction"""
        with self.pool.get_connection() as conn:
            try:
                conn.execute("BEGIN")
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.error(f"Transaction rolled back: {e}")
                raise

# Global connection pool instance
_connection_pool = None
_pool_lock = Lock()

def initialize_connection_pool(
    database_path: str = "/app/data/agent_system.db",
    max_connections: int = 10,
    strategy: PoolStrategy = PoolStrategy.ROUND_ROBIN,
    database_type: str = "sqlite",
    min_connections: int = 3
) -> DatabaseConnectionPool:
    """Initialize the global connection pool"""
    global _connection_pool
    
    with _pool_lock:
        if _connection_pool is None:
            _connection_pool = DatabaseConnectionPool(
                database_path=database_path,
                max_connections=max_connections,
                strategy=strategy
            )
            logger.info("Global database connection pool initialized")
    
    return _connection_pool

def get_connection_pool() -> DatabaseConnectionPool:
    """Get the global connection pool"""
    global _connection_pool
    
    if _connection_pool is None:
        initialize_connection_pool()
    
    return _connection_pool

# Convenience functions
def get_db_connection():
    """Get a database connection from the global pool"""
    pool = get_connection_pool()
    return pool.get_connection()

def execute_cached_query(query: str, params: tuple = None, cache_ttl: int = None):
    """Execute a cached query using the global pool"""
    pool = get_connection_pool()
    return pool.execute_cached_query(query, params, cache_ttl)

def get_pool_stats() -> PoolStats:
    """Get statistics from the global pool"""
    pool = get_connection_pool()
    return pool.get_stats()

# Create global connection manager
db_connection_manager = None

def get_db_connection_manager() -> DatabaseConnectionManager:
    """Get the global database connection manager"""
    global db_connection_manager
    
    if db_connection_manager is None:
        pool = get_connection_pool()
        db_connection_manager = DatabaseConnectionManager(pool)
    
    return db_connection_manager

# Initialize on import
try:
    initialize_connection_pool()
    db_connection_manager = get_db_connection_manager()
    logger.info("Database connection services initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize database connection services: {e}")