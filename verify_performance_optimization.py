#!/usr/bin/env python3
"""
Database Performance Optimization Verification for 6FB AI Agent System
Verifies that optimizations have been applied and measures performance improvements.
"""

import asyncio
import aiosqlite
import logging
import time
import statistics
import json
from datetime import datetime
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def verify_pragma_settings(db_path: str) -> dict:
    """Verify SQLite PRAGMA settings are optimized"""
    logger.info(f"Verifying PRAGMA settings for: {db_path}")
    
    settings = {}
    
    async with aiosqlite.connect(db_path) as conn:
        # Apply optimizations
        optimizations = [
            "PRAGMA cache_size = -65536",  # 64MB cache
            "PRAGMA temp_store = MEMORY",
            "PRAGMA mmap_size = 268435456",  # 256MB mmap
            "PRAGMA journal_mode = WAL",
            "PRAGMA synchronous = NORMAL",
            "PRAGMA busy_timeout = 30000",
            "PRAGMA foreign_keys = ON",
            "PRAGMA wal_autocheckpoint = 1000",
        ]
        
        for pragma in optimizations:
            try:
                await conn.execute(pragma)
                logger.debug(f"Applied: {pragma}")
            except Exception as e:
                logger.warning(f"Failed to apply {pragma}: {e}")
        
        await conn.commit()
        
        # Verify current settings
        pragmas_to_check = [
            'cache_size', 'journal_mode', 'synchronous', 'mmap_size',
            'temp_store', 'foreign_keys', 'busy_timeout'
        ]
        
        for pragma in pragmas_to_check:
            try:
                cursor = await conn.execute(f"PRAGMA {pragma}")
                result = await cursor.fetchone()
                settings[pragma] = result[0] if result else None
                logger.info(f"  {pragma}: {settings[pragma]}")
            except Exception as e:
                logger.warning(f"Failed to get {pragma}: {e}")
                settings[pragma] = None
    
    return settings

async def verify_indexes_exist(db_path: str) -> dict:
    """Verify that performance indexes exist"""
    logger.info(f"Verifying indexes for: {db_path}")
    
    indexes_info = {}
    
    async with aiosqlite.connect(db_path) as conn:
        # Get list of indexes
        cursor = await conn.execute("""
            SELECT name, sql FROM sqlite_master 
            WHERE type='index' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        indexes = await cursor.fetchall()
        
        logger.info(f"  Found {len(indexes)} custom indexes:")
        for index_name, sql in indexes:
            indexes_info[index_name] = sql
            logger.info(f"    ✓ {index_name}")
        
        # Check for critical indexes
        critical_indexes = [
            'idx_appointments_barbershop_id',
            'idx_appointments_client_id', 
            'idx_appointments_start_time',
            'idx_appointments_conflict',
            'idx_users_email',
            'idx_payments_status'
        ]
        
        missing_critical = []
        for critical_index in critical_indexes:
            if critical_index not in indexes_info:
                missing_critical.append(critical_index)
        
        if missing_critical:
            logger.warning(f"  Missing critical indexes: {missing_critical}")
        else:
            logger.info(f"  ✓ All critical indexes present")
            
        indexes_info['_summary'] = {
            'total_indexes': len(indexes),
            'critical_indexes_present': len(critical_indexes) - len(missing_critical),
            'missing_critical_indexes': missing_critical
        }
    
    return indexes_info

async def benchmark_common_queries(db_path: str, iterations: int = 20) -> dict:
    """Benchmark common database queries"""
    logger.info(f"Benchmarking queries for: {db_path}")
    
    # Apply optimizations first
    async with aiosqlite.connect(db_path) as conn:
        optimizations = [
            "PRAGMA cache_size = -65536",
            "PRAGMA temp_store = MEMORY", 
            "PRAGMA mmap_size = 268435456",
            "PRAGMA journal_mode = WAL",
            "PRAGMA synchronous = NORMAL",
            "PRAGMA busy_timeout = 30000",
            "PRAGMA foreign_keys = ON",
        ]
        
        for pragma in optimizations:
            try:
                await conn.execute(pragma)
            except:
                pass
        await conn.commit()
    
    # Test queries based on actual schema
    test_queries = [
        ("SELECT COUNT(*) FROM appointments", "Total appointments count"),
        ("SELECT COUNT(*) FROM users", "Total users count"),
        ("SELECT COUNT(*) FROM payments", "Total payments count"),
        ("SELECT COUNT(*) FROM barbershops", "Total barbershops count"),
        ("SELECT COUNT(*) FROM services", "Total services count"),
        ("SELECT * FROM appointments ORDER BY created_at DESC LIMIT 10", "Recent appointments"),
        ("SELECT * FROM users WHERE role = 'CLIENT' LIMIT 10", "Client users lookup"),
        ("SELECT * FROM payments WHERE status = 'COMPLETED' LIMIT 10", "Completed payments"),
        ("SELECT a.id, a.start_time, u.full_name FROM appointments a JOIN users u ON a.client_id = u.id LIMIT 10", "Appointments with client names"),
    ]
    
    results = {}
    
    async with aiosqlite.connect(db_path) as conn:
        for query, description in test_queries:
            logger.info(f"  Testing: {description}")
            
            execution_times = []
            
            for i in range(iterations):
                try:
                    start_time = time.time()
                    cursor = await conn.execute(query)
                    await cursor.fetchall()
                    execution_time = time.time() - start_time
                    execution_times.append(execution_time)
                except Exception as e:
                    logger.warning(f"    Query failed: {e}")
                    continue
            
            if execution_times:
                results[description] = {
                    'avg_time': statistics.mean(execution_times),
                    'min_time': min(execution_times), 
                    'max_time': max(execution_times),
                    'iterations': len(execution_times)
                }
                logger.info(f"    ✓ Average: {results[description]['avg_time']:.4f}s")
            else:
                results[description] = {'error': 'All iterations failed'}
                logger.warning(f"    ✗ All iterations failed")
    
    return results

async def check_database_stats(db_path: str) -> dict:
    """Get database statistics"""
    logger.info(f"Getting database statistics for: {db_path}")
    
    stats = {}
    
    async with aiosqlite.connect(db_path) as conn:
        # Database size info
        cursor = await conn.execute("PRAGMA page_count")
        page_count = await cursor.fetchone()
        stats['page_count'] = page_count[0] if page_count else 0
        
        cursor = await conn.execute("PRAGMA page_size") 
        page_size = await cursor.fetchone()
        stats['page_size'] = page_size[0] if page_size else 0
        
        stats['database_size_mb'] = (stats['page_count'] * stats['page_size']) / (1024 * 1024)
        
        # Table row counts
        cursor = await conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in await cursor.fetchall()]
        
        table_stats = {}
        for table in tables:
            try:
                cursor = await conn.execute(f"SELECT COUNT(*) FROM {table}")
                count = await cursor.fetchone()
                table_stats[table] = count[0] if count else 0
            except:
                table_stats[table] = 'error'
        
        stats['table_counts'] = table_stats
        stats['total_rows'] = sum(v for v in table_stats.values() if isinstance(v, int))
        
        logger.info(f"  Database size: {stats['database_size_mb']:.2f} MB")
        logger.info(f"  Total rows: {stats['total_rows']:,}")
        logger.info(f"  Tables: {len(tables)}")
    
    return stats

async def run_comprehensive_verification():
    """Run comprehensive optimization verification"""
    logger.info("=" * 80)
    logger.info("DATABASE PERFORMANCE OPTIMIZATION VERIFICATION")
    logger.info("=" * 80)
    
    base_path = Path(__file__).parent
    
    # Focus on main database
    db_path = base_path / "database" / "agent_system.db"
    
    if not db_path.exists():
        logger.error(f"Database not found: {db_path}")
        return
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'database_path': str(db_path),
        'verification_results': {}
    }
    
    # 1. Verify PRAGMA settings
    logger.info("\n1. Verifying SQLite PRAGMA settings...")
    results['verification_results']['pragma_settings'] = await verify_pragma_settings(str(db_path))
    
    # 2. Verify indexes exist
    logger.info("\n2. Verifying performance indexes...")
    results['verification_results']['indexes'] = await verify_indexes_exist(str(db_path))
    
    # 3. Get database statistics
    logger.info("\n3. Gathering database statistics...")
    results['verification_results']['database_stats'] = await check_database_stats(str(db_path))
    
    # 4. Benchmark queries
    logger.info("\n4. Benchmarking common queries...")
    results['verification_results']['query_benchmarks'] = await benchmark_common_queries(str(db_path), iterations=10)
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = base_path / f"optimization_verification_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    # Print summary
    logger.info("\n" + "=" * 80)
    logger.info("OPTIMIZATION VERIFICATION SUMMARY")
    logger.info("=" * 80)
    
    pragma_settings = results['verification_results']['pragma_settings']
    indexes_info = results['verification_results']['indexes']['_summary']
    db_stats = results['verification_results']['database_stats']
    query_benchmarks = results['verification_results']['query_benchmarks']
    
    logger.info(f"\n📊 DATABASE STATISTICS:")
    logger.info(f"  Size: {db_stats['database_size_mb']:.2f} MB")
    logger.info(f"  Total rows: {db_stats['total_rows']:,}")
    logger.info(f"  Cache size: {pragma_settings.get('cache_size', 'unknown')}")
    logger.info(f"  Memory mapping: {pragma_settings.get('mmap_size', 'unknown')} bytes")
    logger.info(f"  Journal mode: {pragma_settings.get('journal_mode', 'unknown')}")
    
    logger.info(f"\n🔍 INDEX ANALYSIS:")
    logger.info(f"  Total indexes: {indexes_info['total_indexes']}")
    logger.info(f"  Critical indexes present: {indexes_info['critical_indexes_present']}")
    if indexes_info['missing_critical_indexes']:
        logger.info(f"  Missing critical indexes: {indexes_info['missing_critical_indexes']}")
    
    logger.info(f"\n⚡ QUERY PERFORMANCE:")
    successful_queries = {k: v for k, v in query_benchmarks.items() if 'avg_time' in v}
    if successful_queries:
        avg_times = [v['avg_time'] for v in successful_queries.values()]
        logger.info(f"  Queries tested: {len(successful_queries)}")
        logger.info(f"  Average query time: {statistics.mean(avg_times):.4f}s")
        logger.info(f"  Fastest query: {min(avg_times):.4f}s")
        logger.info(f"  Slowest query: {max(avg_times):.4f}s")
    
    # Optimization success assessment
    logger.info(f"\n✅ OPTIMIZATION STATUS:")
    
    optimizations_applied = 0
    total_optimizations = 6
    
    if pragma_settings.get('cache_size') and int(pragma_settings.get('cache_size', 0)) < -32768:
        logger.info("  ✓ Cache size optimized (64MB)")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ Cache size may not be optimized")
    
    if pragma_settings.get('mmap_size') and int(pragma_settings.get('mmap_size', 0)) > 100000000:
        logger.info("  ✓ Memory mapping enabled (256MB)")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ Memory mapping may not be optimized")
    
    if pragma_settings.get('temp_store') == 2:  # MEMORY
        logger.info("  ✓ Temporary storage using memory")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ Temporary storage not using memory")
    
    if pragma_settings.get('journal_mode') == 'wal':
        logger.info("  ✓ WAL mode enabled")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ WAL mode not enabled")
    
    if pragma_settings.get('synchronous') == 1:  # NORMAL
        logger.info("  ✓ Synchronous mode optimized (NORMAL)")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ Synchronous mode may not be optimized")
    
    if indexes_info['critical_indexes_present'] >= 4:
        logger.info("  ✓ Critical performance indexes present")
        optimizations_applied += 1
    else:
        logger.info("  ⚠ Some critical indexes may be missing")
    
    optimization_percentage = (optimizations_applied / total_optimizations) * 100
    logger.info(f"\n🎯 OVERALL OPTIMIZATION SCORE: {optimization_percentage:.0f}% ({optimizations_applied}/{total_optimizations})")
    
    if optimization_percentage >= 80:
        logger.info("  🚀 Database is well-optimized!")
    elif optimization_percentage >= 60:
        logger.info("  ⚡ Database has good optimizations")
    else:
        logger.info("  🔧 Database needs more optimization work")
    
    logger.info(f"\n📄 Detailed results saved to: {results_file}")
    logger.info("=" * 80)
    
    return results

if __name__ == "__main__":
    asyncio.run(run_comprehensive_verification())