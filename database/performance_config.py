#!/usr/bin/env python3
"""
Enhanced performance configuration for 6FB AI Agent System databases.
Provides optimized connection pool settings and database-specific indexes.
"""

import asyncio
import aiosqlite
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from .async_connection_pool import ConnectionPoolConfig, initialize_connection_pool

logger = logging.getLogger(__name__)

class PerformanceConfig:
    """Centralized performance configuration for different database workloads"""
    
    @staticmethod
    def get_optimized_pool_config(db_path: str, workload_type: str = "mixed") -> ConnectionPoolConfig:
        """
        Get optimized connection pool configuration based on workload type.
        
        Args:
            db_path: Path to the database file
            workload_type: Type of workload ("read_heavy", "write_heavy", "mixed", "analytics")
        """
        
        # Base configuration optimized for the 6FB system
        base_config = {
            "database_path": db_path,
            "enable_wal": True,
            "enable_foreign_keys": True,
            "journal_mode": "WAL",
            "synchronous": "NORMAL",
            "busy_timeout": 30000,
        }
        
        # Workload-specific optimizations
        if workload_type == "read_heavy":
            # Optimized for analytics and dashboard queries
            config = ConnectionPoolConfig(
                max_connections=25,
                min_connections=8,
                connection_timeout=45.0,
                idle_timeout=600.0,  # 10 minutes
                cache_size=-131072,  # 128MB cache for read-heavy workloads
                temp_store="MEMORY",
                mmap_size=536870912,  # 512MB mmap for large datasets
                **base_config
            )
        elif workload_type == "write_heavy":
            # Optimized for booking creation and updates
            config = ConnectionPoolConfig(
                max_connections=15,
                min_connections=5,
                connection_timeout=30.0,
                idle_timeout=300.0,  # 5 minutes
                cache_size=-32768,   # 32MB cache - smaller for write workloads
                temp_store="MEMORY",
                mmap_size=134217728,  # 128MB mmap
                **base_config
            )
        elif workload_type == "analytics":
            # Optimized for complex analytical queries
            config = ConnectionPoolConfig(
                max_connections=20,
                min_connections=5,
                connection_timeout=60.0,
                idle_timeout=900.0,  # 15 minutes
                cache_size=-262144,  # 256MB cache for analytics
                temp_store="MEMORY", 
                mmap_size=1073741824,  # 1GB mmap for large analytical datasets
                **base_config
            )
        else:  # mixed (default)
            # Balanced configuration for mixed workloads
            config = ConnectionPoolConfig(
                max_connections=20,
                min_connections=5,
                connection_timeout=30.0,
                idle_timeout=300.0,  # 5 minutes
                cache_size=-65536,   # 64MB cache (good balance)
                temp_store="MEMORY",
                mmap_size=268435456,  # 256MB mmap
                **base_config
            )
        
        return config

    @staticmethod
    def get_performance_indexes(table_name: str) -> List[str]:
        """
        Get performance indexes for specific tables based on actual schema.
        
        Args:
            table_name: Name of the table to optimize
            
        Returns:
            List of CREATE INDEX statements
        """
        
        indexes = {
            "appointments": [
                # Core appointment queries
                "CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_id ON appointments(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id)",  
                "CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_end_time ON appointments(end_time)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON appointments(created_at)",
                
                # Composite indexes for common query patterns
                "CREATE INDEX IF NOT EXISTS idx_appointments_barbershop_time ON appointments(barbershop_id, start_time)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_user_time ON appointments(user_id, start_time, status)",
                "CREATE INDEX IF NOT EXISTS idx_appointments_service_time ON appointments(service_id, start_time)",
                
                # Conflict detection index (critical for booking system)
                "CREATE INDEX IF NOT EXISTS idx_appointments_conflict ON appointments(barbershop_id, start_time, end_time, status) WHERE status != 'cancelled'",
                
                # Recent appointments for dashboard
                "CREATE INDEX IF NOT EXISTS idx_appointments_recent ON appointments(barbershop_id, start_time) WHERE start_time >= date('now', '-3 months')",
            ],
            
            "payments": [
                # Payment tracking and analytics
                "CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_appointment_id ON payments(appointment_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_barbershop_id ON payments(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)",
                "CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_payments_amount ON payments(amount)",
                
                # Revenue analytics indexes
                "CREATE INDEX IF NOT EXISTS idx_payments_barbershop_time ON payments(barbershop_id, created_at, status)",
                "CREATE INDEX IF NOT EXISTS idx_payments_revenue ON payments(barbershop_id, amount, status, created_at) WHERE status = 'completed'",
            ],
            
            "users": [
                # User lookup and authentication
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                "CREATE INDEX IF NOT EXISTS idx_users_barbershop_id ON users(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
                "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at)",
            ],
            
            "barbershops": [
                # Barbershop management
                "CREATE INDEX IF NOT EXISTS idx_barbershops_name ON barbershops(name)",
                "CREATE INDEX IF NOT EXISTS idx_barbershops_location ON barbershops(location)",
                "CREATE INDEX IF NOT EXISTS idx_barbershops_created_at ON barbershops(created_at)",
            ],
            
            "services": [
                # Service management and pricing
                "CREATE INDEX IF NOT EXISTS idx_services_barbershop_id ON services(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_services_name ON services(name)",
                "CREATE INDEX IF NOT EXISTS idx_services_price ON services(price)",
                "CREATE INDEX IF NOT EXISTS idx_services_duration ON services(duration_minutes)",
            ],
            
            "barber_performance": [
                # Performance analytics
                "CREATE INDEX IF NOT EXISTS idx_barber_performance_barbershop_id ON barber_performance(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_barber_performance_barber_id ON barber_performance(barber_id)",
                "CREATE INDEX IF NOT EXISTS idx_barber_performance_date ON barber_performance(date)",
                "CREATE INDEX IF NOT EXISTS idx_barber_performance_metrics ON barber_performance(barbershop_id, date, revenue)",
            ],
            
            "booking_patterns": [
                # AI-driven booking pattern analysis
                "CREATE INDEX IF NOT EXISTS idx_booking_patterns_barbershop_id ON booking_patterns(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_booking_patterns_pattern_type ON booking_patterns(pattern_type)",
                "CREATE INDEX IF NOT EXISTS idx_booking_patterns_date ON booking_patterns(date_identified)",
                "CREATE INDEX IF NOT EXISTS idx_booking_patterns_confidence ON booking_patterns(confidence_score)",
            ],
            
            "ai_scheduling_recommendations": [
                # AI recommendation system
                "CREATE INDEX IF NOT EXISTS idx_ai_scheduling_barbershop_id ON ai_scheduling_recommendations(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_ai_scheduling_generated_at ON ai_scheduling_recommendations(generated_at)",
                "CREATE INDEX IF NOT EXISTS idx_ai_scheduling_confidence ON ai_scheduling_recommendations(confidence_score)",
            ],
            
            "business_recommendations": [
                # Business intelligence recommendations
                "CREATE INDEX IF NOT EXISTS idx_business_recommendations_barbershop_id ON business_recommendations(barbershop_id)",
                "CREATE INDEX IF NOT EXISTS idx_business_recommendations_generated_at ON business_recommendations(generated_at)",
                "CREATE INDEX IF NOT EXISTS idx_business_recommendations_status ON business_recommendations(implementation_status)",
                "CREATE INDEX IF NOT EXISTS idx_business_recommendations_confidence ON business_recommendations(confidence_score)",
            ]
        }
        
        return indexes.get(table_name, [])

    @staticmethod
    async def apply_all_performance_indexes(db_path: str) -> Dict[str, Any]:
        """Apply all performance indexes to the database"""
        logger.info(f"Applying performance indexes to {db_path}")
        
        results = {"indexes_applied": [], "errors": [], "tables_processed": []}
        
        # Get list of tables in the database
        async with aiosqlite.connect(db_path) as conn:
            cursor = await conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            tables = [row[0] for row in await cursor.fetchall()]
            
        # Apply indexes for each table
        for table in tables:
            indexes = PerformanceConfig.get_performance_indexes(table)
            results["tables_processed"].append(table)
            
            if not indexes:
                logger.debug(f"No custom indexes defined for table: {table}")
                continue
                
            async with aiosqlite.connect(db_path) as conn:
                for index_sql in indexes:
                    try:
                        await conn.execute(index_sql)
                        await conn.commit()
                        
                        # Extract index name for logging
                        if "CREATE INDEX" in index_sql.upper():
                            index_name = index_sql.split()[4] if len(index_sql.split()) > 4 else "unknown"
                            results["indexes_applied"].append(f"{table}.{index_name}")
                            logger.info(f"✓ Applied index {index_name} to {table}")
                            
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            logger.debug(f"Index already exists: {index_sql[:50]}...")
                        else:
                            error_msg = f"Failed to apply index to {table}: {e}"
                            results["errors"].append(error_msg)
                            logger.error(f"✗ {error_msg}")
        
        return results

    @staticmethod
    async def optimize_connection_settings(conn: aiosqlite.Connection, workload_type: str = "mixed") -> None:
        """Apply per-connection optimization settings"""
        
        # Get workload-specific settings
        config = PerformanceConfig.get_optimized_pool_config("dummy", workload_type)
        
        # Apply PRAGMA settings
        pragmas = [
            f"PRAGMA cache_size = {config.cache_size}",
            f"PRAGMA temp_store = {config.temp_store}",
            f"PRAGMA mmap_size = {config.mmap_size}",
            f"PRAGMA journal_mode = {config.journal_mode}",
            f"PRAGMA synchronous = {config.synchronous}",
            f"PRAGMA busy_timeout = {config.busy_timeout}",
            "PRAGMA foreign_keys = ON" if config.enable_foreign_keys else "PRAGMA foreign_keys = OFF",
            "PRAGMA wal_autocheckpoint = 1000",
            "PRAGMA optimize",
        ]
        
        for pragma in pragmas:
            try:
                await conn.execute(pragma)
                logger.debug(f"Applied: {pragma}")
            except Exception as e:
                logger.warning(f"Failed to apply {pragma}: {e}")
        
        await conn.commit()

async def initialize_optimized_database(db_path: str, workload_type: str = "mixed") -> None:
    """Initialize database with optimal performance settings"""
    logger.info(f"Initializing optimized database: {db_path} (workload: {workload_type})")
    
    # Get optimized connection pool config
    config = PerformanceConfig.get_optimized_pool_config(db_path, workload_type)
    
    # Initialize connection pool
    await initialize_connection_pool(config)
    
    # Apply performance indexes
    await PerformanceConfig.apply_all_performance_indexes(db_path)
    
    logger.info(f"Database optimization completed: {db_path}")