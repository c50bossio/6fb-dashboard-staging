#!/usr/bin/env python3
"""
Performance Testing Suite for 6FB AI Agent System Database Optimizations
Measures query performance before and after optimization.
"""

import asyncio
import aiosqlite
import logging
import time
import statistics
from pathlib import Path
from typing import Dict, Any, List, Tuple
import json
from datetime import datetime

from .async_connection_pool import ConnectionPoolConfig, AsyncConnectionPool
from .performance_config import PerformanceConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PerformanceTester:
    """Database performance testing and benchmarking"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.results = {}
        
    async def test_query_performance(self, queries: List[Tuple[str, str]], iterations: int = 100) -> Dict[str, Any]:
        """
        Test query performance with multiple iterations.
        
        Args:
            queries: List of (query, description) tuples
            iterations: Number of times to run each query
            
        Returns:
            Performance metrics for each query
        """
        logger.info(f"Testing {len(queries)} queries with {iterations} iterations each...")
        
        results = {}
        
        # Get optimized connection pool
        config = PerformanceConfig.get_optimized_pool_config(self.db_path, "read_heavy")
        
        async with AsyncConnectionPool(config) as pool:
            await pool.initialize()
            
            for query, description in queries:
                logger.info(f"Testing: {description}")
                
                execution_times = []
                
                for i in range(iterations):
                    try:
                        start_time = time.time()
                        
                        async with pool.get_connection() as conn:
                            cursor = await conn.execute(query)
                            await cursor.fetchall()
                        
                        execution_time = time.time() - start_time
                        execution_times.append(execution_time)
                        
                        if i % 25 == 0:  # Progress indicator
                            logger.info(f"  Progress: {i+1}/{iterations} iterations")
                            
                    except Exception as e:
                        logger.warning(f"Query failed on iteration {i+1}: {e}")
                        continue
                
                if execution_times:
                    results[description] = {
                        'query': query,
                        'iterations': len(execution_times),
                        'avg_time': statistics.mean(execution_times),
                        'median_time': statistics.median(execution_times),
                        'min_time': min(execution_times),
                        'max_time': max(execution_times),
                        'std_dev': statistics.stdev(execution_times) if len(execution_times) > 1 else 0,
                        'total_time': sum(execution_times)
                    }
                    
                    logger.info(f"  ✓ {description}: avg={results[description]['avg_time']:.4f}s")
                else:
                    logger.error(f"  ✗ {description}: All iterations failed")
        
        return results
    
    async def test_concurrent_performance(self, query: str, concurrent_connections: int = 10, iterations_per_connection: int = 20) -> Dict[str, Any]:
        """Test concurrent query performance"""
        logger.info(f"Testing concurrent performance: {concurrent_connections} connections, {iterations_per_connection} iterations each")
        
        config = PerformanceConfig.get_optimized_pool_config(self.db_path, "mixed")
        
        async def worker(worker_id: int, pool: AsyncConnectionPool) -> List[float]:
            """Worker function for concurrent testing"""
            times = []
            for i in range(iterations_per_connection):
                try:
                    start_time = time.time()
                    async with pool.get_connection() as conn:
                        cursor = await conn.execute(query)
                        await cursor.fetchall()
                    times.append(time.time() - start_time)
                except Exception as e:
                    logger.warning(f"Worker {worker_id} iteration {i} failed: {e}")
            return times
        
        async with AsyncConnectionPool(config) as pool:
            await pool.initialize()
            
            start_time = time.time()
            
            # Create concurrent tasks
            tasks = [worker(i, pool) for i in range(concurrent_connections)]
            results = await asyncio.gather(*tasks)
            
            total_time = time.time() - start_time
            
            # Flatten results
            all_times = [t for worker_times in results for t in worker_times]
            
            if all_times:
                return {
                    'concurrent_connections': concurrent_connections,
                    'iterations_per_connection': iterations_per_connection,
                    'total_queries': len(all_times),
                    'total_time': total_time,
                    'avg_time': statistics.mean(all_times),
                    'median_time': statistics.median(all_times),
                    'min_time': min(all_times),
                    'max_time': max(all_times),
                    'queries_per_second': len(all_times) / total_time,
                    'pool_stats': pool.get_stats()
                }
            else:
                return {'error': 'All concurrent queries failed'}
    
    async def test_index_effectiveness(self) -> Dict[str, Any]:
        """Test the effectiveness of indexes by comparing query plans"""
        logger.info("Testing index effectiveness...")
        
        results = {}
        
        async with aiosqlite.connect(self.db_path) as conn:
            # Configure connection for performance
            await PerformanceConfig.optimize_connection_settings(conn, "read_heavy")
            
            # Test queries that should benefit from indexes
            test_queries = [
                ("SELECT * FROM appointments WHERE barbershop_id = 'test-barbershop-1'", "Barbershop appointments lookup"),
                ("SELECT * FROM appointments WHERE client_id = 'test-client-1'", "Client appointments lookup"),
                ("SELECT * FROM appointments WHERE start_time >= '2024-01-01' AND start_time <= '2024-12-31'", "Date range appointments"),
                ("SELECT * FROM payments WHERE status = 'COMPLETED'", "Completed payments lookup"),
                ("SELECT * FROM users WHERE email = 'test@example.com'", "User email lookup"),
                ("SELECT COUNT(*) FROM appointments WHERE barbershop_id = 'test' AND status = 'PENDING'", "Status count query"),
            ]
            
            for query, description in test_queries:
                try:
                    # Get query plan
                    cursor = await conn.execute(f"EXPLAIN QUERY PLAN {query}")
                    query_plan = await cursor.fetchall()
                    
                    # Time the query
                    start_time = time.time()
                    cursor = await conn.execute(query)
                    await cursor.fetchall()
                    execution_time = time.time() - start_time
                    
                    # Analyze if indexes are being used
                    uses_index = any('INDEX' in str(row).upper() for row in query_plan)
                    
                    results[description] = {
                        'query': query,
                        'execution_time': execution_time,
                        'uses_index': uses_index,
                        'query_plan': [str(row) for row in query_plan]
                    }
                    
                    index_status = "✓ USING INDEX" if uses_index else "⚠ TABLE SCAN"
                    logger.info(f"  {description}: {execution_time:.4f}s {index_status}")
                    
                except Exception as e:
                    logger.error(f"Query plan test failed for {description}: {e}")
        
        return results
    
    async def run_comprehensive_test(self) -> Dict[str, Any]:
        """Run comprehensive performance test suite"""
        logger.info("=" * 60)
        logger.info("Starting Comprehensive Database Performance Test Suite")
        logger.info("=" * 60)
        
        # Test queries representing common use cases
        performance_queries = [
            ("SELECT COUNT(*) FROM appointments", "Total appointments count"),
            ("SELECT COUNT(*) FROM appointments WHERE status = 'PENDING'", "Pending appointments count"),
            ("SELECT * FROM appointments WHERE barbershop_id = 'test-barbershop' ORDER BY start_time LIMIT 10", "Recent barbershop appointments"),
            ("SELECT a.*, u.full_name FROM appointments a JOIN users u ON a.client_id = u.id LIMIT 20", "Appointments with client names"),
            ("SELECT SUM(amount) FROM payments WHERE status = 'COMPLETED' AND created_at >= date('now', '-30 days')", "Monthly revenue calculation"),
            ("SELECT service_id, COUNT(*) as booking_count FROM appointments GROUP BY service_id ORDER BY booking_count DESC LIMIT 5", "Popular services"),
            ("SELECT barbershop_id, COUNT(*) as total_bookings FROM appointments GROUP BY barbershop_id", "Bookings per barbershop"),
        ]
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'database_path': self.db_path,
            'test_summary': {}
        }
        
        # 1. Single-threaded performance test
        logger.info("\n1. Testing single-threaded query performance...")
        results['single_threaded'] = await self.test_query_performance(performance_queries, iterations=50)
        
        # 2. Index effectiveness test
        logger.info("\n2. Testing index effectiveness...")
        results['index_effectiveness'] = await self.test_index_effectiveness()
        
        # 3. Concurrent performance test
        logger.info("\n3. Testing concurrent performance...")
        results['concurrent'] = await self.test_concurrent_performance(
            "SELECT * FROM appointments WHERE barbershop_id = 'test' ORDER BY start_time DESC LIMIT 20",
            concurrent_connections=5,
            iterations_per_connection=10
        )
        
        # 4. Connection pool performance
        logger.info("\n4. Testing connection pool performance...")
        config = PerformanceConfig.get_optimized_pool_config(self.db_path, "mixed")
        async with AsyncConnectionPool(config) as pool:
            await pool.initialize()
            results['connection_pool_stats'] = pool.get_stats()
            results['connection_pool_health'] = await pool.health_check()
        
        # Generate summary
        if results['single_threaded']:
            avg_times = [v['avg_time'] for v in results['single_threaded'].values()]
            results['test_summary'] = {
                'total_queries_tested': len(performance_queries),
                'avg_query_time': statistics.mean(avg_times),
                'fastest_query': min(avg_times),
                'slowest_query': max(avg_times),
                'indexes_working': sum(1 for v in results['index_effectiveness'].values() if v.get('uses_index', False)),
                'total_indexes_tested': len(results['index_effectiveness']),
            }
        
        logger.info("\n" + "=" * 60)
        logger.info("Performance Test Suite Completed!")
        logger.info("=" * 60)
        
        return results

async def run_performance_tests():
    """Run performance tests on all system databases"""
    base_path = Path(__file__).parent
    
    databases = [
        (base_path / "agent_system.db", "main_database"),
        (base_path.parent / "data" / "vector_knowledge.db", "vector_knowledge"),
        (base_path.parent / "data" / "ai_insights.db", "ai_insights"),
    ]
    
    all_results = {}
    
    for db_path, db_name in databases:
        if db_path.exists():
            logger.info(f"\n{'='*20} Testing {db_name.upper()} {'='*20}")
            tester = PerformanceTester(str(db_path))
            all_results[db_name] = await tester.run_comprehensive_test()
        else:
            logger.warning(f"Database not found: {db_path}")
    
    # Save results
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    results_file = base_path / f"performance_test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    
    logger.info(f"\nPerformance test results saved to: {results_file}")
    
    # Print summary
    logger.info("\n" + "=" * 80)
    logger.info("PERFORMANCE TEST SUMMARY")
    logger.info("=" * 80)
    
    for db_name, results in all_results.items():
        if 'test_summary' in results:
            summary = results['test_summary']
            logger.info(f"\n{db_name.upper()}:")
            logger.info(f"  Average Query Time: {summary.get('avg_query_time', 0):.4f}s")
            logger.info(f"  Fastest Query: {summary.get('fastest_query', 0):.4f}s")
            logger.info(f"  Slowest Query: {summary.get('slowest_query', 0):.4f}s")
            logger.info(f"  Indexes Working: {summary.get('indexes_working', 0)}/{summary.get('total_indexes_tested', 0)}")
    
    return all_results

if __name__ == "__main__":
    asyncio.run(run_performance_tests())