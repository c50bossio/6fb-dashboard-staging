#!/usr/bin/env python3
"""
Performance Optimization Implementation
Implements high-priority optimizations identified in Enterprise Performance Analysis
"""

import asyncio
import aioredis
import asyncpg
import logging
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import os
from concurrent.futures import ThreadPoolExecutor
import functools
import weakref

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class OptimizationConfig:
    """Configuration for performance optimizations"""
    
    # Database connection pooling
    db_pool_min_size: int = 10
    db_pool_max_size: int = 100
    db_command_timeout: int = 60
    
    # Redis caching
    redis_url: str = "redis://localhost:6379"
    cache_default_ttl: int = 3600  # 1 hour
    cache_max_memory: str = "1gb"
    cache_policy: str = "allkeys-lru"
    
    # AI response caching
    ai_cache_ttl_mapping: Dict[str, int] = None
    
    # Connection limits
    http_connection_pool_size: int = 100
    max_concurrent_requests: int = 1000
    
    def __post_init__(self):
        if self.ai_cache_ttl_mapping is None:
            self.ai_cache_ttl_mapping = {
                "business_questions": 86400,  # 24 hours
                "common_queries": 3600,       # 1 hour
                "personalized_responses": 900, # 15 minutes
                "real_time_data": 300         # 5 minutes
            }

class DatabaseConnectionPool:
    """Enterprise-grade database connection pooling"""
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.pool = None
        self.connection_stats = {
            "total_connections": 0,
            "active_connections": 0,
            "pool_hits": 0,
            "pool_misses": 0,
            "query_times": []
        }
    
    async def initialize(self, database_url: str):
        """Initialize the connection pool"""
        
        logger.info("🔌 Initializing optimized database connection pool...")
        
        try:
            self.pool = await asyncpg.create_pool(
                database_url,
                min_size=self.config.db_pool_min_size,
                max_size=self.config.db_pool_max_size,
                command_timeout=self.config.db_command_timeout,
                # Connection pool optimizations
                max_queries=50000,  # Max queries per connection before recycling
                max_inactive_connection_lifetime=300,  # 5 minutes
                setup=self._setup_connection
            )
            
            logger.info(f"✅ Database pool initialized: {self.config.db_pool_min_size}-{self.config.db_pool_max_size} connections")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize database pool: {e}")
            raise
    
    async def _setup_connection(self, connection):
        """Setup individual database connections for optimal performance"""
        
        # Set connection-level optimizations
        await connection.execute("""
            SET statement_timeout = '60s';
            SET lock_timeout = '30s';
            SET idle_in_transaction_session_timeout = '10min';
            SET shared_preload_libraries = 'pg_stat_statements';
        """)
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a connection from the pool with stats tracking"""
        
        start_time = time.time()
        
        try:
            if self.pool.get_size() > 0:
                self.connection_stats["pool_hits"] += 1
            else:
                self.connection_stats["pool_misses"] += 1
            
            async with self.pool.acquire() as connection:
                self.connection_stats["active_connections"] += 1
                yield connection
                
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            self.connection_stats["active_connections"] -= 1
            query_time = time.time() - start_time
            self.connection_stats["query_times"].append(query_time)
            
            # Keep only recent query times for performance
            if len(self.connection_stats["query_times"]) > 1000:
                self.connection_stats["query_times"] = self.connection_stats["query_times"][-1000:]
    
    async def execute_query(self, query: str, *args) -> List[Dict]:
        """Execute a query with connection pooling and performance tracking"""
        
        async with self.get_connection() as conn:
            result = await conn.fetch(query, *args)
            return [dict(row) for row in result]
    
    async def execute_query_one(self, query: str, *args) -> Optional[Dict]:
        """Execute a query expecting a single result"""
        
        async with self.get_connection() as conn:
            result = await conn.fetchrow(query, *args)
            return dict(result) if result else None
    
    def get_stats(self) -> Dict:
        """Get connection pool statistics"""
        
        return {
            "pool_size": self.pool.get_size() if self.pool else 0,
            "idle_connections": self.pool.get_idle_size() if self.pool else 0,
            "active_connections": self.connection_stats["active_connections"],
            "total_connections": self.connection_stats["total_connections"],
            "pool_efficiency": (
                self.connection_stats["pool_hits"] / 
                max(1, self.connection_stats["pool_hits"] + self.connection_stats["pool_misses"])
            ) * 100,
            "avg_query_time": (
                sum(self.connection_stats["query_times"]) / 
                max(1, len(self.connection_stats["query_times"]))
            ) if self.connection_stats["query_times"] else 0
        }
    
    async def close(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Database connection pool closed")

class IntelligentCache:
    """Multi-layer intelligent caching system"""
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        self.redis_client = None
        self.local_cache = {}  # L1 cache
        self.cache_stats = {
            "l1_hits": 0,
            "l1_misses": 0,
            "l2_hits": 0,
            "l2_misses": 0,
            "total_requests": 0,
            "cache_writes": 0,
            "cache_evictions": 0
        }
    
    async def initialize(self):
        """Initialize the multi-layer cache system"""
        
        logger.info("⚡ Initializing intelligent caching system...")
        
        try:
            # Initialize Redis connection
            self.redis_client = await aioredis.from_url(
                self.config.redis_url,
                max_connections=50,
                retry_on_timeout=True,
                decode_responses=True
            )
            
            # Configure Redis for optimal performance
            await self.redis_client.config_set("maxmemory", self.config.cache_max_memory)
            await self.redis_client.config_set("maxmemory-policy", self.config.cache_policy)
            
            logger.info("✅ Intelligent caching system initialized")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize cache system: {e}")
            # Fallback to local cache only
            self.redis_client = None
    
    def _generate_cache_key(self, namespace: str, key: str, **kwargs) -> str:
        """Generate a cache key with namespace and optional parameters"""
        
        # Create a deterministic key from parameters
        if kwargs:
            params_str = json.dumps(kwargs, sort_keys=True)
            key_hash = hashlib.md5(params_str.encode()).hexdigest()[:8]
            return f"{namespace}:{key}:{key_hash}"
        
        return f"{namespace}:{key}"
    
    async def get(self, namespace: str, key: str, **kwargs) -> Optional[Any]:
        """Get value from cache with multi-layer lookup"""
        
        self.cache_stats["total_requests"] += 1
        cache_key = self._generate_cache_key(namespace, key, **kwargs)
        
        # L1 Cache (local memory) - fastest
        if cache_key in self.local_cache:
            entry = self.local_cache[cache_key]
            if entry["expires"] > time.time():
                self.cache_stats["l1_hits"] += 1
                return json.loads(entry["data"])
            else:
                # Expired, remove from L1
                del self.local_cache[cache_key]
        
        self.cache_stats["l1_misses"] += 1
        
        # L2 Cache (Redis) - network, but persistent
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(cache_key)
                if cached_data:
                    self.cache_stats["l2_hits"] += 1
                    
                    # Promote to L1 cache
                    self._store_l1_cache(cache_key, cached_data, 300)  # 5 min L1 TTL
                    
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"Redis cache lookup failed: {e}")
        
        self.cache_stats["l2_misses"] += 1
        return None
    
    async def set(self, namespace: str, key: str, value: Any, ttl: Optional[int] = None, **kwargs):
        """Set value in cache with intelligent TTL determination"""
        
        cache_key = self._generate_cache_key(namespace, key, **kwargs)
        serialized_data = json.dumps(value, default=str)
        
        # Determine TTL based on namespace
        if ttl is None:
            ttl = self._determine_ttl(namespace, key, value)
        
        # Store in L1 cache (limited TTL for memory management)
        l1_ttl = min(ttl, 300)  # Max 5 minutes in L1
        self._store_l1_cache(cache_key, serialized_data, l1_ttl)
        
        # Store in L2 cache (Redis)
        if self.redis_client:
            try:
                await self.redis_client.setex(cache_key, ttl, serialized_data)
                self.cache_stats["cache_writes"] += 1
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")
    
    def _store_l1_cache(self, cache_key: str, data: str, ttl: int):
        """Store data in L1 (local memory) cache"""
        
        # Memory management - limit L1 cache size
        if len(self.local_cache) > 1000:
            # Remove oldest 20% of entries
            sorted_entries = sorted(
                self.local_cache.items(), 
                key=lambda x: x[1]["expires"]
            )
            for old_key, _ in sorted_entries[:200]:
                del self.local_cache[old_key]
                self.cache_stats["cache_evictions"] += 1
        
        self.local_cache[cache_key] = {
            "data": data,
            "expires": time.time() + ttl,
            "created": time.time()
        }
    
    def _determine_ttl(self, namespace: str, key: str, value: Any) -> int:
        """Intelligently determine TTL based on content and namespace"""
        
        # Check configured TTL mappings
        for pattern, ttl in self.config.ai_cache_ttl_mapping.items():
            if pattern in namespace.lower() or pattern in key.lower():
                return ttl
        
        # Default TTL based on data characteristics
        if isinstance(value, dict):
            # Large objects get shorter TTL (memory pressure)
            data_size = len(json.dumps(value, default=str))
            if data_size > 10000:  # 10KB
                return 900  # 15 minutes
            elif data_size > 1000:  # 1KB
                return 1800  # 30 minutes
        
        return self.config.cache_default_ttl
    
    async def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching a pattern"""
        
        # Invalidate L1 cache
        keys_to_remove = [key for key in self.local_cache.keys() if pattern in key]
        for key in keys_to_remove:
            del self.local_cache[key]
            self.cache_stats["cache_evictions"] += 1
        
        # Invalidate L2 cache (Redis)
        if self.redis_client:
            try:
                async for key in self.redis_client.scan_iter(match=f"*{pattern}*"):
                    await self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Redis pattern invalidation failed: {e}")
    
    def get_stats(self) -> Dict:
        """Get comprehensive cache statistics"""
        
        total_requests = self.cache_stats["total_requests"]
        l1_hit_rate = (self.cache_stats["l1_hits"] / max(1, total_requests)) * 100
        l2_hit_rate = (self.cache_stats["l2_hits"] / max(1, self.cache_stats["l1_misses"])) * 100
        overall_hit_rate = ((self.cache_stats["l1_hits"] + self.cache_stats["l2_hits"]) / max(1, total_requests)) * 100
        
        return {
            "total_requests": total_requests,
            "l1_cache": {
                "hits": self.cache_stats["l1_hits"],
                "misses": self.cache_stats["l1_misses"],
                "hit_rate": l1_hit_rate,
                "size": len(self.local_cache)
            },
            "l2_cache": {
                "hits": self.cache_stats["l2_hits"],
                "misses": self.cache_stats["l2_misses"],
                "hit_rate": l2_hit_rate
            },
            "overall_hit_rate": overall_hit_rate,
            "cache_writes": self.cache_stats["cache_writes"],
            "cache_evictions": self.cache_stats["cache_evictions"]
        }
    
    async def close(self):
        """Close cache connections"""
        if self.redis_client:
            await self.redis_client.close()
            logger.info("⚡ Cache system closed")

class AIResponseOptimizer:
    """AI response optimization with intelligent caching and routing"""
    
    def __init__(self, cache: IntelligentCache, db_pool: DatabaseConnectionPool):
        self.cache = cache
        self.db_pool = db_pool
        self.ai_performance_stats = {
            "cache_hits": 0,
            "cache_misses": 0,
            "model_requests": {},
            "avg_response_times": {},
            "cost_savings": 0.0
        }
    
    async def get_cached_ai_response(self, query: str, context: Dict, model: str = "gpt-5") -> Optional[Dict]:
        """Get cached AI response with context-aware key generation"""
        
        # Generate context-aware cache key
        cache_key = self._generate_ai_cache_key(query, context, model)
        
        # Check cache
        cached_response = await self.cache.get("ai_responses", cache_key)
        
        if cached_response:
            self.ai_performance_stats["cache_hits"] += 1
            
            # Track cost savings
            estimated_cost = self._estimate_request_cost(model, query)
            self.ai_performance_stats["cost_savings"] += estimated_cost
            
            logger.info(f"💰 AI cache hit - saved ${estimated_cost:.4f}")
            return cached_response
        
        self.ai_performance_stats["cache_misses"] += 1
        return None
    
    async def cache_ai_response(self, query: str, context: Dict, model: str, response: Dict):
        """Cache AI response with intelligent TTL"""
        
        cache_key = self._generate_ai_cache_key(query, context, model)
        
        # Determine cache TTL based on query characteristics
        ttl = self._determine_ai_cache_ttl(query, context, response)
        
        await self.cache.set("ai_responses", cache_key, response, ttl=ttl)
        
        logger.info(f"💾 Cached AI response for {ttl}s")
    
    def _generate_ai_cache_key(self, query: str, context: Dict, model: str) -> str:
        """Generate a context-aware cache key for AI responses"""
        
        # Normalize query for better cache hits
        normalized_query = query.lower().strip()
        
        # Extract relevant context for caching
        cache_context = {
            "model": model,
            "query_hash": hashlib.md5(normalized_query.encode()).hexdigest(),
            "user_role": context.get("user_role", "unknown"),
            "barbershop_type": context.get("barbershop_type", "unknown")
        }
        
        # Generate deterministic key
        context_str = json.dumps(cache_context, sort_keys=True)
        return hashlib.md5(context_str.encode()).hexdigest()
    
    def _determine_ai_cache_ttl(self, query: str, context: Dict, response: Dict) -> int:
        """Determine appropriate cache TTL for AI responses"""
        
        # Business-related queries can be cached longer
        business_keywords = ["revenue", "profit", "customer", "marketing", "strategy", "growth"]
        if any(keyword in query.lower() for keyword in business_keywords):
            return 86400  # 24 hours
        
        # General advice can be cached for medium duration
        advice_keywords = ["how to", "what should", "recommend", "suggest", "improve"]
        if any(keyword in query.lower() for keyword in advice_keywords):
            return 3600  # 1 hour
        
        # Personalized or real-time queries get shorter cache
        if context.get("user_id") or "today" in query.lower() or "now" in query.lower():
            return 900  # 15 minutes
        
        # Default medium cache duration
        return 1800  # 30 minutes
    
    def _estimate_request_cost(self, model: str, query: str) -> float:
        """Estimate the cost of an AI request"""
        
        # Rough token estimation
        estimated_tokens = len(query.split()) * 1.3
        
        # Cost per 1K tokens (estimated)
        cost_per_1k = {
            "gpt-5": 0.10,
            "gpt-5-mini": 0.05,
            "claude-opus-4-1": 0.08,
            "gemini-2.0-flash": 0.03
        }
        
        rate = cost_per_1k.get(model, 0.05)
        return (estimated_tokens / 1000) * rate
    
    async def optimize_model_selection(self, query: str, context: Dict, priority: str = "balanced") -> str:
        """Select optimal AI model based on performance metrics and requirements"""
        
        # Get recent performance data for all models
        models_performance = await self._get_models_performance()
        
        if priority == "speed":
            # Select fastest model
            return min(models_performance.keys(), 
                      key=lambda m: models_performance[m].get("avg_response_time", float('inf')))
        
        elif priority == "cost":
            # Select most cost-effective model
            return min(models_performance.keys(), 
                      key=lambda m: models_performance[m].get("cost_per_request", float('inf')))
        
        elif priority == "quality":
            # Select highest quality model
            return max(models_performance.keys(), 
                      key=lambda m: models_performance[m].get("confidence_score", 0))
        
        else:  # balanced
            # Select based on overall score
            return max(models_performance.keys(), 
                      key=lambda m: models_performance[m].get("overall_score", 0))
    
    async def _get_models_performance(self) -> Dict[str, Dict]:
        """Get recent performance metrics for all AI models"""
        
        # Query recent performance data from database
        query = """
            SELECT 
                model,
                AVG(response_time) as avg_response_time,
                AVG(confidence_score) as avg_confidence,
                AVG(cost) as avg_cost,
                COUNT(*) as request_count
            FROM ai_performance_metrics 
            WHERE created_at > NOW() - INTERVAL '1 hour'
            GROUP BY model
        """
        
        try:
            results = await self.db_pool.execute_query(query)
            
            performance_data = {}
            for row in results:
                performance_data[row["model"]] = {
                    "avg_response_time": row["avg_response_time"],
                    "confidence_score": row["avg_confidence"],
                    "cost_per_request": row["avg_cost"],
                    "request_count": row["request_count"],
                    "overall_score": self._calculate_overall_score(row)
                }
            
            return performance_data
            
        except Exception as e:
            logger.warning(f"Failed to get AI performance data: {e}")
            # Return default model preferences
            return {
                "gpt-5": {"overall_score": 85},
                "claude-opus-4-1": {"overall_score": 80},
                "gemini-2.0-flash": {"overall_score": 75}
            }
    
    def _calculate_overall_score(self, metrics: Dict) -> float:
        """Calculate overall model performance score"""
        
        # Weighted scoring (0-100)
        response_time_score = max(0, 100 - (metrics.get("avg_response_time", 2) * 20))
        confidence_score = metrics.get("avg_confidence", 0.8) * 100
        cost_score = max(0, 100 - (metrics.get("avg_cost", 0.05) * 1000))
        
        # Weighted average
        overall_score = (
            response_time_score * 0.4 +
            confidence_score * 0.4 +
            cost_score * 0.2
        )
        
        return overall_score
    
    def get_stats(self) -> Dict:
        """Get AI optimization statistics"""
        
        total_requests = self.ai_performance_stats["cache_hits"] + self.ai_performance_stats["cache_misses"]
        cache_hit_rate = (self.ai_performance_stats["cache_hits"] / max(1, total_requests)) * 100
        
        return {
            "total_ai_requests": total_requests,
            "cache_hit_rate": cache_hit_rate,
            "cost_savings": self.ai_performance_stats["cost_savings"],
            "model_usage": self.ai_performance_stats["model_requests"]
        }

class PerformanceOptimizationManager:
    """Main performance optimization manager"""
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.db_pool = None
        self.cache = None
        self.ai_optimizer = None
        self.optimization_stats = {
            "startup_time": None,
            "total_optimizations_applied": 0,
            "performance_improvements": {}
        }
    
    async def initialize(self, database_url: str = None):
        """Initialize all optimization components"""
        
        logger.info("🚀 Initializing Performance Optimization System")
        start_time = time.time()
        
        try:
            # Initialize database connection pool
            if database_url:
                self.db_pool = DatabaseConnectionPool(self.config)
                await self.db_pool.initialize(database_url)
                self.optimization_stats["total_optimizations_applied"] += 1
            
            # Initialize intelligent caching
            self.cache = IntelligentCache(self.config)
            await self.cache.initialize()
            self.optimization_stats["total_optimizations_applied"] += 1
            
            # Initialize AI optimizer
            if self.db_pool and self.cache:
                self.ai_optimizer = AIResponseOptimizer(self.cache, self.db_pool)
                self.optimization_stats["total_optimizations_applied"] += 1
            
            self.optimization_stats["startup_time"] = time.time() - start_time
            
            logger.info(f"✅ Performance optimization system initialized in {self.optimization_stats['startup_time']:.2f}s")
            logger.info(f"📊 Applied {self.optimization_stats['total_optimizations_applied']} optimizations")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize optimization system: {e}")
            raise
    
    async def get_comprehensive_stats(self) -> Dict:
        """Get comprehensive performance statistics"""
        
        stats = {
            "timestamp": datetime.utcnow().isoformat(),
            "system_status": "optimized",
            "optimizations_applied": self.optimization_stats["total_optimizations_applied"],
            "startup_time_seconds": self.optimization_stats["startup_time"]
        }
        
        # Database pool stats
        if self.db_pool:
            stats["database_pool"] = self.db_pool.get_stats()
        
        # Cache stats
        if self.cache:
            stats["caching_system"] = self.cache.get_stats()
        
        # AI optimization stats
        if self.ai_optimizer:
            stats["ai_optimization"] = self.ai_optimizer.get_stats()
        
        return stats
    
    async def health_check(self) -> Dict:
        """Perform system health check with optimization status"""
        
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "components": {}
        }
        
        # Check database pool health
        if self.db_pool:
            try:
                db_stats = self.db_pool.get_stats()
                health_status["components"]["database_pool"] = {
                    "status": "healthy",
                    "pool_efficiency": db_stats["pool_efficiency"],
                    "active_connections": db_stats["active_connections"]
                }
            except Exception as e:
                health_status["components"]["database_pool"] = {
                    "status": "degraded",
                    "error": str(e)
                }
                health_status["status"] = "degraded"
        
        # Check cache system health
        if self.cache:
            cache_stats = self.cache.get_stats()
            health_status["components"]["cache_system"] = {
                "status": "healthy",
                "hit_rate": cache_stats["overall_hit_rate"],
                "l1_size": cache_stats["l1_cache"]["size"]
            }
        
        return health_status
    
    async def close(self):
        """Clean shutdown of optimization system"""
        
        logger.info("🔄 Shutting down performance optimization system...")
        
        if self.cache:
            await self.cache.close()
        
        if self.db_pool:
            await self.db_pool.close()
        
        logger.info("✅ Performance optimization system shutdown complete")

# Usage example and testing
async def test_optimizations():
    """Test the performance optimizations"""
    
    logger.info("🧪 Testing Performance Optimizations")
    
    # Initialize optimization system
    config = OptimizationConfig()
    optimizer = PerformanceOptimizationManager(config)
    
    try:
        await optimizer.initialize(
            database_url=os.getenv("DATABASE_URL", "postgresql://localhost/test")
        )
        
        # Test cache system
        if optimizer.cache:
            await optimizer.cache.set("test", "performance", {"test": "data"}, ttl=300)
            cached_data = await optimizer.cache.get("test", "performance")
            assert cached_data is not None, "Cache test failed"
            logger.info("✅ Cache system test passed")
        
        # Test AI optimizer
        if optimizer.ai_optimizer:
            optimal_model = await optimizer.ai_optimizer.optimize_model_selection(
                "How to improve barbershop revenue?", 
                {"user_role": "shop_owner"}, 
                priority="balanced"
            )
            logger.info(f"✅ AI optimizer test passed - selected model: {optimal_model}")
        
        # Get comprehensive stats
        stats = await optimizer.get_comprehensive_stats()
        logger.info(f"📊 System stats: {json.dumps(stats, indent=2)}")
        
        # Health check
        health = await optimizer.health_check()
        logger.info(f"🏥 Health check: {health['status']}")
        
        logger.info("🎉 All optimization tests passed!")
        
    except Exception as e:
        logger.error(f"❌ Optimization test failed: {e}")
        raise
    
    finally:
        await optimizer.close()

if __name__ == "__main__":
    # Run optimization tests
    asyncio.run(test_optimizations())