#!/usr/bin/env python3
"""
Production-ready async database package for 6FB AI Agent System.

This package provides:
- Async SQLite connection pooling with WAL mode
- Repository pattern for database operations
- Proper connection lifecycle management
- Database health monitoring and optimization
- Comprehensive error handling and logging

Usage:
    from database import initialize_database, get_user_repository
    
    # Initialize database with connection pool
    await initialize_database()
    
    # Use repositories for database operations
    user_repo = await get_user_repository()
    result = await user_repo.create_user(...)
"""

from .async_connection_pool import (
    ConnectionPoolConfig,
    AsyncConnectionPool,
    initialize_connection_pool,
    close_connection_pool,
    get_connection_pool,
    execute_query,
    execute_transaction,
    get_database_connection
)

from .async_repositories import (
    DatabaseResult,
    AsyncRepository,
    AsyncUserRepository,
    AsyncAgenticSessionRepository,
    AsyncAgenticMessageRepository,
    AsyncLearningInsightsRepository,
    database_transaction,
    get_user_repository,
    get_session_repository,
    get_message_repository,
    get_insights_repository
)

from .async_database_init import (
    AsyncDatabaseInitializer,
    initialize_database,
    health_check_database,
    get_database_info,
    optimize_database,
    get_database_initializer
)

__version__ = "1.0.0"
__author__ = "6FB AI Agent System"

__all__ = [
    # Connection Pool
    "ConnectionPoolConfig",
    "AsyncConnectionPool", 
    "initialize_connection_pool",
    "close_connection_pool",
    "get_connection_pool",
    "execute_query",
    "execute_transaction",
    "get_database_connection",
    
    # Repositories
    "DatabaseResult",
    "AsyncRepository",
    "AsyncUserRepository",
    "AsyncAgenticSessionRepository", 
    "AsyncAgenticMessageRepository",
    "AsyncLearningInsightsRepository",
    "database_transaction",
    "get_user_repository",
    "get_session_repository",
    "get_message_repository",
    "get_insights_repository",
    
    # Database Management
    "AsyncDatabaseInitializer",
    "initialize_database",
    "health_check_database", 
    "get_database_info",
    "optimize_database",
    "get_database_initializer"
]