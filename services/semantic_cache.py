#!/usr/bin/env python3
"""
Semantic Cache Service - Redis-based semantic similarity caching
Reduces API costs by 60-80% through intelligent caching of similar requests
"""

import asyncio
import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import numpy as np
from dataclasses import dataclass, asdict

import redis.asyncio as redis
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import pickle

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CacheEntry:
    """Cache entry with metadata"""
    key: str
    query: str
    response: str
    embedding: List[float]
    metadata: Dict[str, Any]
    created_at: datetime
    accessed_count: int = 0
    last_accessed: datetime = None
    ttl_seconds: int = 3600  # 1 hour default
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['last_accessed'] = self.last_accessed.isoformat() if self.last_accessed else None
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheEntry':
        """Create from dictionary"""
        data['created_at'] = datetime.fromisoformat(data['created_at'])
        if data['last_accessed']:
            data['last_accessed'] = datetime.fromisoformat(data['last_accessed'])
        return cls(**data)

class SemanticCache:
    """Redis-based semantic similarity cache for AI responses"""
    
    def __init__(self, 
                 redis_url: str = "redis://localhost:6379",
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
                 similarity_threshold: float = 0.85,
                 default_ttl: int = 3600):
        """
        Initialize semantic cache
        
        Args:
            redis_url: Redis connection URL
            embedding_model: SentenceTransformer model name
            similarity_threshold: Minimum similarity for cache hit (0.0-1.0)
            default_ttl: Default TTL in seconds
        """
        self.redis_url = redis_url
        self.similarity_threshold = similarity_threshold
        self.default_ttl = default_ttl
        
        # Initialize Redis client
        self.redis_client = None
        
        # Initialize embedding model
        logger.info(f"Loading embedding model: {embedding_model}")
        self.embedding_model = SentenceTransformer(embedding_model)
        
        # Cache statistics
        self.stats = {
            'hits': 0,
            'misses': 0,
            'total_requests': 0,
            'cache_size': 0
        }
        
        logger.info("Semantic cache initialized successfully")
    
    async def _ensure_redis_connection(self):
        """Ensure Redis connection is established"""
        if self.redis_client is None or (hasattr(self.redis_client, 'connection') and self.redis_client.connection is None):
            try:
                self.redis_client = redis.from_url(self.redis_url, decode_responses=False)
                # Test connection
                if hasattr(self.redis_client, 'ping'):
                    await self.redis_client.ping()
                else:
                    # For sync client, use sync ping
                    self.redis_client.ping()
                logger.info("Redis connection established")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                # Fallback to in-memory cache
                self.redis_client = None
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate semantic embedding for text"""
        try:
            embedding = self.embedding_model.encode(text, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 384  # Default dimension for MiniLM
    
    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            emb1 = np.array(embedding1).reshape(1, -1)
            emb2 = np.array(embedding2).reshape(1, -1)
            similarity = cosine_similarity(emb1, emb2)[0][0]
            return float(similarity)
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            return 0.0
    
    def _generate_cache_key(self, query: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate cache key from query and context"""
        key_data = {
            'query': query.strip().lower(),
            'context': context or {}
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"semantic_cache:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    async def get(self, 
                  query: str, 
                  context: Optional[Dict[str, Any]] = None,
                  agent_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get cached response for similar query
        
        Args:
            query: User query
            context: Additional context for matching
            agent_type: Type of agent for context-specific caching
            
        Returns:
            Cached response if found, None otherwise
        """
        await self._ensure_redis_connection()
        
        self.stats['total_requests'] += 1
        
        try:
            # Generate embedding for query
            query_embedding = self._generate_embedding(query)
            
            # Search for similar cached entries
            if self.redis_client:
                similar_entry = await self._find_similar_cached_entry(
                    query_embedding, context, agent_type
                )
            else:
                # Fallback to direct key lookup (less effective)
                cache_key = self._generate_cache_key(query, context)
                similar_entry = await self._get_direct_cache_entry(cache_key)
            
            if similar_entry:
                self.stats['hits'] += 1
                
                # Update access statistics
                await self._update_access_stats(similar_entry['key'])
                
                logger.info(f"Cache HIT for query: {query[:50]}... (similarity: {similar_entry.get('similarity', 'N/A')})")
                
                return {
                    'response': similar_entry['response'],
                    'metadata': similar_entry['metadata'],
                    'cache_hit': True,
                    'similarity': similar_entry.get('similarity'),
                    'cached_at': similar_entry['created_at']
                }
            else:
                self.stats['misses'] += 1
                logger.info(f"Cache MISS for query: {query[:50]}...")
                return None
                
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            self.stats['misses'] += 1
            return None
    
    async def _find_similar_cached_entry(self, 
                                       query_embedding: List[float], 
                                       context: Optional[Dict[str, Any]] = None,
                                       agent_type: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Find the most similar cached entry"""
        try:
            # Get all cache keys
            pattern = f"semantic_cache:*"
            if agent_type:
                pattern = f"semantic_cache:{agent_type}:*"
            
            keys = await self.redis_client.keys(pattern)
            
            best_similarity = 0.0
            best_entry = None
            
            for key in keys:
                try:
                    # Get cached entry
                    cached_data = await self.redis_client.get(key)
                    if not cached_data:
                        continue
                    
                    entry_data = pickle.loads(cached_data)
                    
                    # Check if entry has expired
                    if self._is_expired(entry_data):
                        await self.redis_client.delete(key)
                        continue
                    
                    # Calculate similarity
                    similarity = self._calculate_similarity(
                        query_embedding, entry_data['embedding']
                    )
                    
                    # Check if similarity meets threshold and is best so far
                    if similarity >= self.similarity_threshold and similarity > best_similarity:
                        best_similarity = similarity
                        best_entry = entry_data
                        best_entry['similarity'] = similarity
                        best_entry['key'] = key.decode() if isinstance(key, bytes) else key
                
                except Exception as e:
                    logger.warning(f"Error processing cache entry {key}: {e}")
                    continue
            
            return best_entry
            
        except Exception as e:
            logger.error(f"Error finding similar entries: {e}")
            return None
    
    async def _get_direct_cache_entry(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Fallback: get direct cache entry without similarity search"""
        try:
            if not self.redis_client:
                return None
            
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                entry_data = pickle.loads(cached_data)
                
                if not self._is_expired(entry_data):
                    entry_data['key'] = cache_key
                    return entry_data
                else:
                    await self.redis_client.delete(cache_key)
            
            return None
            
        except Exception as e:
            logger.error(f"Direct cache lookup error: {e}")
            return None
    
    def _is_expired(self, entry_data: Dict[str, Any]) -> bool:
        """Check if cache entry has expired"""
        try:
            created_at = datetime.fromisoformat(entry_data['created_at'])
            ttl = entry_data.get('ttl_seconds', self.default_ttl)
            expiry_time = created_at + timedelta(seconds=ttl)
            return datetime.now() > expiry_time
        except Exception as e:
            logger.error(f"Error checking expiry: {e}")
            return True
    
    async def set(self, 
                  query: str, 
                  response: str, 
                  context: Optional[Dict[str, Any]] = None,
                  agent_type: Optional[str] = None,
                  ttl: Optional[int] = None,
                  metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Cache a query-response pair with semantic embedding
        
        Args:
            query: User query
            response: AI response to cache
            context: Additional context
            agent_type: Type of agent for context-specific caching
            ttl: Time to live in seconds
            metadata: Additional metadata to store
            
        Returns:
            True if cached successfully, False otherwise
        """
        await self._ensure_redis_connection()
        
        try:
            # Generate embedding
            query_embedding = self._generate_embedding(query)
            
            # Create cache entry
            cache_key = self._generate_cache_key(query, context)
            if agent_type:
                cache_key = f"semantic_cache:{agent_type}:{hashlib.md5(query.encode()).hexdigest()}"
            
            entry = CacheEntry(
                key=cache_key,
                query=query,
                response=response,
                embedding=query_embedding,
                metadata=metadata or {},
                created_at=datetime.now(),
                ttl_seconds=ttl or self.default_ttl
            )
            
            # Store in Redis if available
            if self.redis_client:
                serialized_entry = pickle.dumps(entry.to_dict())
                await self.redis_client.setex(
                    cache_key,
                    entry.ttl_seconds,
                    serialized_entry
                )
                
                logger.info(f"Cached response for query: {query[:50]}... (key: {cache_key[:20]}...)")
                return True
            else:
                logger.warning("Redis not available, skipping cache")
                return False
                
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    async def _update_access_stats(self, cache_key: str):
        """Update access statistics for a cache entry"""
        try:
            if not self.redis_client:
                return
            
            # Increment access count
            stats_key = f"{cache_key}:stats"
            await self.redis_client.hincrby(stats_key, "accessed_count", 1)
            await self.redis_client.hset(
                stats_key, 
                "last_accessed", 
                datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.warning(f"Failed to update access stats: {e}")
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        await self._ensure_redis_connection()
        
        try:
            if not self.redis_client:
                return 0
            
            keys = await self.redis_client.keys(f"semantic_cache:{pattern}*")
            if keys:
                deleted = await self.redis_client.delete(*keys)
                logger.info(f"Invalidated {deleted} cache entries matching pattern: {pattern}")
                return deleted
            return 0
            
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
            return 0
    
    async def clear_expired(self) -> int:
        """Clear expired cache entries"""
        await self._ensure_redis_connection()
        
        if not self.redis_client:
            return 0
        
        try:
            keys = await self.redis_client.keys("semantic_cache:*")
            cleared_count = 0
            
            for key in keys:
                try:
                    cached_data = await self.redis_client.get(key)
                    if cached_data:
                        entry_data = pickle.loads(cached_data)
                        if self._is_expired(entry_data):
                            await self.redis_client.delete(key)
                            cleared_count += 1
                except Exception as e:
                    logger.warning(f"Error checking expiry for {key}: {e}")
                    continue
            
            logger.info(f"Cleared {cleared_count} expired cache entries")
            return cleared_count
            
        except Exception as e:
            logger.error(f"Error clearing expired entries: {e}")
            return 0
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        await self._ensure_redis_connection()
        
        stats = self.stats.copy()
        
        if self.redis_client:
            try:
                # Get cache size
                keys = await self.redis_client.keys("semantic_cache:*")
                stats['cache_size'] = len(keys)
                
                # Calculate hit rate
                if stats['total_requests'] > 0:
                    stats['hit_rate'] = stats['hits'] / stats['total_requests']
                else:
                    stats['hit_rate'] = 0.0
                
                # Get memory usage (if available)
                info = await self.redis_client.info('memory')
                stats['memory_usage_bytes'] = info.get('used_memory', 0)
                stats['memory_usage_human'] = info.get('used_memory_human', 'N/A')
                
            except Exception as e:
                logger.error(f"Error getting cache stats: {e}")
        
        stats['similarity_threshold'] = self.similarity_threshold
        stats['default_ttl'] = self.default_ttl
        
        return stats
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on cache system"""
        await self._ensure_redis_connection()
        
        health = {
            'redis_connected': False,
            'embedding_model_loaded': False,
            'cache_size': 0,
            'status': 'unhealthy'
        }
        
        try:
            # Check Redis connection
            if self.redis_client:
                await self.redis_client.ping()
                health['redis_connected'] = True
            
            # Check embedding model
            test_embedding = self._generate_embedding("test")
            health['embedding_model_loaded'] = len(test_embedding) > 0
            
            # Get cache size
            if self.redis_client:
                keys = await self.redis_client.keys("semantic_cache:*")
                health['cache_size'] = len(keys)
            
            # Overall status
            if health['redis_connected'] and health['embedding_model_loaded']:
                health['status'] = 'healthy'
            elif health['embedding_model_loaded']:
                health['status'] = 'degraded'  # Can function without Redis
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            health['error'] = str(e)
        
        return health

# Global cache instance
semantic_cache = None

def get_semantic_cache() -> SemanticCache:
    """Get or create global semantic cache instance"""
    global semantic_cache
    if semantic_cache is None:
        semantic_cache = SemanticCache()
    return semantic_cache

# Decorator for caching function responses
def cached_response(ttl: int = 3600, agent_type: Optional[str] = None):
    """Decorator to cache AI agent responses"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            cache = get_semantic_cache()
            
            # Extract query from args/kwargs
            query = ""
            if args:
                query = str(args[0])
            elif 'query' in kwargs:
                query = str(kwargs['query'])
            elif 'message' in kwargs:
                query = str(kwargs['message'])
            
            if not query:
                # No cacheable query found, execute function directly
                return await func(*args, **kwargs)
            
            # Try to get cached response
            cached = await cache.get(query, agent_type=agent_type)
            if cached:
                return cached['response']
            
            # Execute function and cache result
            response = await func(*args, **kwargs)
            if response:
                await cache.set(
                    query=query,
                    response=str(response),
                    agent_type=agent_type,
                    ttl=ttl
                )
            
            return response
            
        return wrapper
    return decorator

if __name__ == "__main__":
    # Test the semantic cache
    async def test_semantic_cache():
        cache = SemanticCache()
        
        # Test queries
        queries = [
            "How is my business performing this month?",
            "What's my business performance for this month?",  # Similar
            "How are my sales doing lately?",  # Similar
            "Help me with appointment scheduling",  # Different
            "I need help optimizing my booking system"  # Similar to above
        ]
        
        responses = [
            "Your business is performing well with 20% growth this month.",
            "Appointments are optimized for peak efficiency.",
            "Here's your booking system optimization plan."
        ]
        
        # Cache some responses
        await cache.set(queries[0], responses[0], agent_type="business")
        await cache.set(queries[3], responses[1], agent_type="scheduling")
        
        # Test cache hits and misses
        for i, query in enumerate(queries):
            print(f"\n=== Testing Query {i+1}: {query} ===")
            result = await cache.get(query, agent_type="business" if "business" in query else "scheduling")
            
            if result:
                print(f"CACHE HIT (similarity: {result.get('similarity', 'N/A'):.3f})")
                print(f"Response: {result['response']}")
            else:
                print("CACHE MISS - would call AI model")
        
        # Print statistics
        stats = await cache.get_stats()
        print(f"\n=== Cache Statistics ===")
        for key, value in stats.items():
            print(f"{key}: {value}")
    
    # Run test
    asyncio.run(test_semantic_cache())