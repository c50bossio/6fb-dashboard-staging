#!/usr/bin/env python3
"""
Database Performance Optimization Script for 6FB AI Agent System
Applies comprehensive performance tuning for SQLite databases.
"""

import asyncio
import aiosqlite
import logging
import time
from pathlib import Path
from typing import Dict, Any, List
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """SQLite database performance optimizer"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.optimization_results = {}
        
    async def analyze_current_settings(self) -> Dict[str, Any]:
        """Analyze current database settings and performance"""
        settings = {}
        
        async with aiosqlite.connect(self.db_path) as conn:
            # Get current PRAGMA settings
            pragmas = [
                'cache_size', 'journal_mode', 'synchronous', 'mmap_size',
                'temp_store', 'foreign_keys', 'busy_timeout', 'page_size'
            ]
            
            for pragma in pragmas:
                try:
                    cursor = await conn.execute(f"PRAGMA {pragma}")
                    result = await cursor.fetchone()
                    settings[pragma] = result[0] if result else None
                except Exception as e:
                    logger.warning(f"Failed to get {pragma}: {e}")
                    settings[pragma] = None
            
            # Get database stats
            cursor = await conn.execute("PRAGMA database_list")
            db_info = await cursor.fetchall()
            settings['database_info'] = db_info
            
            # Get table stats
            cursor = await conn.execute("""
                SELECT name, type FROM sqlite_master 
                WHERE type IN ('table', 'index') 
                ORDER BY type, name
            """)
            schema_objects = await cursor.fetchall()
            settings['schema_objects'] = schema_objects
            
            # Get page count and size info
            cursor = await conn.execute("PRAGMA page_count")
            page_count = await cursor.fetchone()
            settings['page_count'] = page_count[0] if page_count else 0
            
            cursor = await conn.execute("PRAGMA freelist_count")
            freelist_count = await cursor.fetchone()
            settings['freelist_count'] = freelist_count[0] if freelist_count else 0
            
        return settings
    
    async def apply_performance_optimizations(self) -> Dict[str, Any]:
        """Apply comprehensive performance optimizations"""
        logger.info(f"Applying performance optimizations to {self.db_path}")
        
        results = {'applied_settings': {}, 'errors': []}
        
        # Optimized settings for the 6FB AI Agent System workload
        optimizations = [
            # High-performance cache (64MB for good performance with current 0.89MB database)
            ("PRAGMA cache_size = -65536", "Set cache size to 64MB"),
            
            # Enable memory mapping for fast I/O (256MB limit)
            ("PRAGMA mmap_size = 268435456", "Enable 256MB memory mapping for fast I/O"),
            
            # Use memory for temporary storage
            ("PRAGMA temp_store = MEMORY", "Use memory for temporary storage"),
            
            # WAL mode with normal synchronous for good balance of safety and performance
            ("PRAGMA journal_mode = WAL", "Enable WAL mode for better concurrency"),
            ("PRAGMA synchronous = NORMAL", "Balance between safety and performance"),
            
            # Optimize for busy databases
            ("PRAGMA busy_timeout = 30000", "Set busy timeout to 30 seconds"),
            
            # Enable foreign key constraints for data integrity
            ("PRAGMA foreign_keys = ON", "Enable foreign key constraints"),
            
            # Optimize WAL checkpoint behavior
            ("PRAGMA wal_autocheckpoint = 1000", "Optimize WAL checkpoint frequency"),
            
            # Query planner optimizations
            ("PRAGMA optimize", "Optimize query planner statistics"),
        ]
        
        async with aiosqlite.connect(self.db_path) as conn:
            for pragma, description in optimizations:
                try:
                    await conn.execute(pragma)
                    await conn.commit()
                    results['applied_settings'][pragma] = description
                    logger.info(f"✓ {description}")
                except Exception as e:
                    error_msg = f"Failed to apply {pragma}: {e}"
                    results['errors'].append(error_msg)
                    logger.error(f"✗ {error_msg}")
        
        return results
    
    async def apply_performance_indexes(self) -> Dict[str, Any]:
        """Apply performance indexes if not already present"""
        logger.info("Verifying and applying performance indexes...")
        
        results = {'indexes_applied': [], 'errors': []}
        
        # Read the performance indexes SQL file
        indexes_file = Path(self.db_path).parent / "add-performance-indexes.sql"
        
        if not indexes_file.exists():
            logger.warning(f"Performance indexes file not found: {indexes_file}")
            return results
        
        try:
            with open(indexes_file, 'r') as f:
                sql_content = f.read()
            
            # Split by semicolon and filter out comments and empty lines
            statements = [
                stmt.strip() for stmt in sql_content.split(';')
                if stmt.strip() and not stmt.strip().startswith('--') and not stmt.strip().startswith('COMMENT')
            ]
            
            async with aiosqlite.connect(self.db_path) as conn:
                for statement in statements:
                    if not statement.strip():
                        continue
                        
                    try:
                        await conn.execute(statement)
                        await conn.commit()
                        
                        # Extract index name for logging
                        if 'CREATE INDEX' in statement.upper():
                            index_name = statement.split()[4] if len(statement.split()) > 4 else "unknown"
                            results['indexes_applied'].append(index_name)
                            logger.info(f"✓ Applied index: {index_name}")
                            
                    except Exception as e:
                        if "already exists" in str(e).lower():
                            logger.debug(f"Index already exists (skipping): {statement[:50]}...")
                        else:
                            error_msg = f"Failed to apply index: {e}"
                            results['errors'].append(error_msg)
                            logger.error(f"✗ {error_msg}")
        
        except Exception as e:
            error_msg = f"Failed to read indexes file: {e}"
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        return results
    
    async def vacuum_and_analyze(self) -> Dict[str, Any]:
        """Perform VACUUM and ANALYZE for optimal performance"""
        logger.info("Performing database maintenance (VACUUM and ANALYZE)...")
        
        results = {'operations': [], 'errors': []}
        
        async with aiosqlite.connect(self.db_path) as conn:
            try:
                # ANALYZE to update query planner statistics
                start_time = time.time()
                await conn.execute("ANALYZE")
                await conn.commit()
                analyze_time = time.time() - start_time
                results['operations'].append(f"ANALYZE completed in {analyze_time:.2f}s")
                logger.info(f"✓ ANALYZE completed in {analyze_time:.2f}s")
                
                # VACUUM to reclaim space and defragment (only if needed)
                cursor = await conn.execute("PRAGMA freelist_count")
                freelist = await cursor.fetchone()
                freelist_count = freelist[0] if freelist else 0
                
                if freelist_count > 100:  # Only vacuum if significant fragmentation
                    start_time = time.time()
                    await conn.execute("VACUUM")
                    vacuum_time = time.time() - start_time
                    results['operations'].append(f"VACUUM completed in {vacuum_time:.2f}s")
                    logger.info(f"✓ VACUUM completed in {vacuum_time:.2f}s")
                else:
                    results['operations'].append(f"VACUUM skipped (freelist_count: {freelist_count})")
                    logger.info(f"✓ VACUUM skipped (minimal fragmentation: {freelist_count} pages)")
                
            except Exception as e:
                error_msg = f"Maintenance operation failed: {e}"
                results['errors'].append(error_msg)
                logger.error(f"✗ {error_msg}")
        
        return results
    
    async def benchmark_performance(self) -> Dict[str, Any]:
        """Run performance benchmarks"""
        logger.info("Running performance benchmarks...")
        
        benchmarks = {}
        
        async with aiosqlite.connect(self.db_path) as conn:
            # Test common query patterns
            test_queries = [
                ("SELECT COUNT(*) FROM appointments", "Count all appointments"),
                ("SELECT COUNT(*) FROM payments WHERE created_at >= date('now', '-30 days')", "Recent payments count"),
                ("SELECT service_name, COUNT(*) FROM appointments WHERE start_time >= date('now', '-7 days') GROUP BY service_name", "Weekly service popularity"),
                ("SELECT customer_id, COUNT(*) FROM appointments GROUP BY customer_id LIMIT 10", "Top customers by booking count"),
            ]
            
            for query, description in test_queries:
                try:
                    start_time = time.time()
                    cursor = await conn.execute(query)
                    await cursor.fetchall()
                    execution_time = time.time() - start_time
                    benchmarks[description] = f"{execution_time:.4f}s"
                    logger.info(f"✓ {description}: {execution_time:.4f}s")
                except Exception as e:
                    benchmarks[description] = f"Error: {e}"
                    logger.warning(f"✗ {description}: {e}")
        
        return benchmarks
    
    async def optimize_database(self) -> Dict[str, Any]:
        """Run complete database optimization"""
        logger.info("=" * 60)
        logger.info("Starting comprehensive database optimization")
        logger.info("=" * 60)
        
        # Get current settings
        logger.info("\n1. Analyzing current database settings...")
        current_settings = await self.analyze_current_settings()
        
        # Apply performance optimizations
        logger.info("\n2. Applying performance optimizations...")
        optimization_results = await self.apply_performance_optimizations()
        
        # Apply performance indexes
        logger.info("\n3. Verifying performance indexes...")
        index_results = await self.apply_performance_indexes()
        
        # Run maintenance
        logger.info("\n4. Running database maintenance...")
        maintenance_results = await self.vacuum_and_analyze()
        
        # Run benchmarks
        logger.info("\n5. Running performance benchmarks...")
        benchmark_results = await self.benchmark_performance()
        
        # Get optimized settings
        logger.info("\n6. Analyzing optimized settings...")
        optimized_settings = await self.analyze_current_settings()
        
        # Compile results
        results = {
            'timestamp': datetime.now().isoformat(),
            'database_path': self.db_path,
            'current_settings': current_settings,
            'optimized_settings': optimized_settings,
            'optimizations_applied': optimization_results,
            'indexes_applied': index_results,
            'maintenance_results': maintenance_results,
            'benchmarks': benchmark_results,
            'summary': {
                'cache_size_before': current_settings.get('cache_size', 'unknown'),
                'cache_size_after': optimized_settings.get('cache_size', 'unknown'),
                'mmap_size_before': current_settings.get('mmap_size', 0),
                'mmap_size_after': optimized_settings.get('mmap_size', 0),
                'temp_store_before': current_settings.get('temp_store', 'unknown'),
                'temp_store_after': optimized_settings.get('temp_store', 'unknown'),
            }
        }
        
        logger.info("\n" + "=" * 60)
        logger.info("Database optimization completed successfully!")
        logger.info("=" * 60)
        
        return results


async def optimize_all_databases():
    """Optimize all system databases"""
    base_path = Path(__file__).parent
    
    databases = [
        base_path / "agent_system.db",
        base_path.parent / "data" / "vector_knowledge.db",
        base_path.parent / "data" / "ai_insights.db",
    ]
    
    results = {}
    
    for db_path in databases:
        if db_path.exists():
            logger.info(f"\nOptimizing database: {db_path}")
            optimizer = DatabaseOptimizer(str(db_path))
            results[str(db_path)] = await optimizer.optimize_database()
        else:
            logger.warning(f"Database not found: {db_path}")
    
    # Save results
    results_file = base_path / f"optimization_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    logger.info(f"\nOptimization results saved to: {results_file}")
    return results


if __name__ == "__main__":
    asyncio.run(optimize_all_databases())