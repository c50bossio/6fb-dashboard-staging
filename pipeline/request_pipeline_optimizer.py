#!/usr/bin/env python3
"""
Request/Response Pipeline Optimization
Advanced pipeline optimization with request batching, response caching,
streaming responses, and intelligent request routing.
"""

import asyncio
import json
import time
import gzip
from typing import Dict, Any, List, Optional, Callable, AsyncGenerator
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field
import hashlib
import logging
from fastapi import Request, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
import redis.asyncio as redis
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


@dataclass
class PipelineConfig:
    """Configuration for request pipeline optimization"""
    # Request batching
    enable_request_batching: bool = True
    batch_size: int = 10
    batch_timeout_ms: int = 100
    
    # Response caching
    enable_response_caching: bool = True
    cache_ttl_seconds: int = 300
    cache_max_size: int = 10000
    
    # Request routing
    enable_intelligent_routing: bool = True
    route_by_load: bool = True
    route_by_geography: bool = False
    
    # Streaming
    enable_streaming_responses: bool = True
    stream_threshold_bytes: int = 1024 * 1024  # 1MB
    
    # Compression
    enable_smart_compression: bool = True
    compression_threshold_bytes: int = 1024
    compression_algorithms: List[str] = field(default_factory=lambda: ['gzip', 'br'])
    
    # Prefetching
    enable_prefetching: bool = True
    prefetch_common_queries: bool = True
    
    # Connection optimization
    enable_connection_pooling: bool = True
    keep_alive_timeout: int = 65
    max_concurrent_requests: int = 1000


class RequestBatcher:
    """Intelligent request batching for database operations"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.batches: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.batch_timers: Dict[str, asyncio.Task] = {}
        self.batch_locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self.batch_results: Dict[str, asyncio.Future] = {}
    
    async def add_to_batch(self, batch_key: str, request_data: Dict[str, Any]) -> Any:
        """
        Add request to batch and return result when batch is processed.
        
        Args:
            batch_key: Key to group similar requests
            request_data: Request data to batch
            
        Returns:
            Result from batched execution
        """
        if not self.config.enable_request_batching:
            return await self._execute_single_request(request_data)
        
        request_id = request_data.get('id', str(time.time()))
        
        async with self.batch_locks[batch_key]:
            # Add request to batch
            self.batches[batch_key].append(request_data)
            
            # Create result future for this request
            future = asyncio.Future()
            self.batch_results[request_id] = future
            
            # Start batch timer if this is the first request
            if len(self.batches[batch_key]) == 1:
                self.batch_timers[batch_key] = asyncio.create_task(
                    self._batch_timeout(batch_key)
                )
            
            # Execute batch if it's full
            if len(self.batches[batch_key]) >= self.config.batch_size:
                await self._execute_batch(batch_key)
        
        # Wait for result
        return await self.batch_results[request_id]
    
    async def _batch_timeout(self, batch_key: str):
        """Handle batch timeout"""
        await asyncio.sleep(self.config.batch_timeout_ms / 1000)
        
        async with self.batch_locks[batch_key]:
            if self.batches[batch_key]:  # If batch still has items
                await self._execute_batch(batch_key)
    
    async def _execute_batch(self, batch_key: str):
        """Execute batched requests"""
        if not self.batches[batch_key]:
            return
        
        batch = self.batches[batch_key].copy()
        self.batches[batch_key].clear()
        
        # Cancel timeout timer
        if batch_key in self.batch_timers:
            self.batch_timers[batch_key].cancel()
            del self.batch_timers[batch_key]
        
        logger.info(f"Executing batch {batch_key} with {len(batch)} requests")
        
        try:
            # Execute batch based on batch_key type
            if batch_key.startswith('db_'):
                results = await self._execute_database_batch(batch)
            elif batch_key.startswith('api_'):
                results = await self._execute_api_batch(batch)
            else:
                results = await self._execute_generic_batch(batch)
            
            # Set results for individual requests
            for request_data, result in zip(batch, results):
                request_id = request_data.get('id')
                if request_id and request_id in self.batch_results:
                    self.batch_results[request_id].set_result(result)
                    del self.batch_results[request_id]
                    
        except Exception as e:
            logger.error(f"Batch execution failed: {e}")
            # Set error for all requests in batch
            for request_data in batch:
                request_id = request_data.get('id')
                if request_id and request_id in self.batch_results:
                    self.batch_results[request_id].set_exception(e)
                    del self.batch_results[request_id]
    
    async def _execute_database_batch(self, batch: List[Dict[str, Any]]) -> List[Any]:
        """Execute database batch operations"""
        # Group by operation type
        operations_by_type = defaultdict(list)
        for request in batch:
            op_type = request.get('operation', 'select')
            operations_by_type[op_type].append(request)
        
        results = []
        
        # Execute each operation type
        for op_type, operations in operations_by_type.items():
            if op_type == 'select':
                # Batch SELECT operations
                batch_results = await self._execute_select_batch(operations)
                results.extend(batch_results)
            elif op_type in ['insert', 'update', 'delete']:
                # Batch write operations
                batch_results = await self._execute_write_batch(operations)
                results.extend(batch_results)
        
        return results
    
    async def _execute_select_batch(self, selects: List[Dict[str, Any]]) -> List[Any]:
        """Execute batched SELECT operations"""
        # This would integrate with the optimized connection pool
        # to execute multiple SELECT queries efficiently
        results = []
        for select in selects:
            # Simulate database query
            result = {"data": f"result_for_{select.get('id')}", "rows": 5}
            results.append(result)
        
        return results
    
    async def _execute_write_batch(self, writes: List[Dict[str, Any]]) -> List[Any]:
        """Execute batched write operations in a transaction"""
        # This would use the connection pool's transaction support
        results = []
        for write in writes:
            # Simulate write operation
            result = {"success": True, "affected_rows": 1, "id": write.get('id')}
            results.append(result)
        
        return results
    
    async def _execute_single_request(self, request_data: Dict[str, Any]) -> Any:
        """Execute single request when batching is disabled"""
        # Fallback to individual execution
        return {"data": f"single_result_{request_data.get('id')}", "batched": False}


class ResponseCache:
    """Advanced response caching with intelligent invalidation"""
    
    def __init__(self, config: PipelineConfig, redis_client: Optional[redis.Redis] = None):
        self.config = config
        self.redis_client = redis_client
        self.local_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'size': 0
        }
        
    def _generate_cache_key(self, request: Request, additional_keys: List[str] = None) -> str:
        """Generate cache key for request"""
        key_components = [
            request.method,
            str(request.url.path),
            sorted(request.query_params.items()),
        ]
        
        if additional_keys:
            key_components.extend(additional_keys)
        
        # Include user context if available
        if hasattr(request.state, 'user_id'):
            key_components.append(f"user:{request.state.user_id}")
        
        key_string = json.dumps(key_components, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]
    
    async def get_cached_response(self, request: Request, cache_key: str = None) -> Optional[Dict[str, Any]]:
        """Get cached response if available and valid"""
        if not self.config.enable_response_caching:
            return None
        
        if not cache_key:
            cache_key = self._generate_cache_key(request)
        
        # Try Redis cache first (if available)
        if self.redis_client:
            try:
                cached_data = await self.redis_client.get(f"response:{cache_key}")
                if cached_data:
                    self.cache_stats['hits'] += 1
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"Redis cache get failed: {e}")
        
        # Fallback to local cache
        if cache_key in self.local_cache:
            cache_entry = self.local_cache[cache_key]
            
            # Check if cache entry is still valid
            if datetime.now() < cache_entry['expires_at']:
                self.cache_stats['hits'] += 1
                return cache_entry['data']
            else:
                # Remove expired entry
                del self.local_cache[cache_key]
                self.cache_stats['evictions'] += 1
        
        self.cache_stats['misses'] += 1
        return None
    
    async def cache_response(
        self, 
        request: Request, 
        response_data: Dict[str, Any], 
        cache_key: str = None,
        ttl_override: Optional[int] = None
    ):
        """Cache response data"""
        if not self.config.enable_response_caching:
            return
        
        if not cache_key:
            cache_key = self._generate_cache_key(request)
        
        ttl = ttl_override or self.config.cache_ttl_seconds
        expires_at = datetime.now() + timedelta(seconds=ttl)
        
        # Cache in Redis (if available)
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    f"response:{cache_key}",
                    ttl,
                    json.dumps(response_data, default=str)
                )
                return
            except Exception as e:
                logger.warning(f"Redis cache set failed: {e}")
        
        # Fallback to local cache
        # Evict old entries if cache is full
        if len(self.local_cache) >= self.config.cache_max_size:
            # Remove oldest entry
            oldest_key = min(
                self.local_cache.keys(),
                key=lambda k: self.local_cache[k]['cached_at']
            )
            del self.local_cache[oldest_key]
            self.cache_stats['evictions'] += 1
        
        self.local_cache[cache_key] = {
            'data': response_data,
            'cached_at': datetime.now(),
            'expires_at': expires_at
        }
        
        self.cache_stats['size'] = len(self.local_cache)
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
        hit_rate = self.cache_stats['hits'] / max(1, total_requests)
        
        return {
            **self.cache_stats,
            'hit_rate': round(hit_rate, 3),
            'total_requests': total_requests
        }


class StreamingResponseHandler:
    """Handle streaming responses for large datasets"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
    
    async def create_streaming_response(
        self,
        generator: AsyncGenerator[bytes, None],
        content_type: str = "application/json",
        headers: Optional[Dict[str, str]] = None
    ) -> StreamingResponse:
        """Create streaming response from async generator"""
        
        if not headers:
            headers = {}
        
        # Add streaming-specific headers
        headers.update({
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked"
        })
        
        return StreamingResponse(
            generator,
            media_type=content_type,
            headers=headers
        )
    
    async def stream_json_array(self, items: AsyncGenerator[Dict[str, Any], None]) -> AsyncGenerator[bytes, None]:
        """Stream JSON array items"""
        yield b'{"data": ['
        
        first_item = True
        async for item in items:
            if not first_item:
                yield b','
            
            yield json.dumps(item, default=str).encode()
            first_item = False
        
        yield b'], "streaming": true}'
    
    async def stream_large_query_results(
        self,
        query: str,
        parameters: tuple,
        chunk_size: int = 1000
    ) -> AsyncGenerator[bytes, None]:
        """Stream large database query results"""
        # This would integrate with the database connection pool
        # to stream results without loading everything into memory
        
        offset = 0
        while True:
            # Simulate chunked database query
            chunk_query = f"{query} LIMIT {chunk_size} OFFSET {offset}"
            
            # Get chunk from database (simulated)
            chunk_data = [
                {"id": i, "data": f"item_{i}"}
                for i in range(offset, offset + chunk_size)
                if i < 10000  # Simulate total of 10,000 records
            ]
            
            if not chunk_data:
                break
            
            # Stream this chunk
            for item in chunk_data:
                yield json.dumps(item, default=str).encode() + b'\n'
            
            offset += chunk_size


class RequestPipelineOptimizer:
    """Main pipeline optimizer orchestrating all optimization strategies"""
    
    def __init__(self, config: PipelineConfig, redis_client: Optional[redis.Redis] = None):
        self.config = config
        self.request_batcher = RequestBatcher(config)
        self.response_cache = ResponseCache(config, redis_client)
        self.streaming_handler = StreamingResponseHandler(config)
        
        # Performance metrics
        self.metrics = {
            'total_requests': 0,
            'cached_responses': 0,
            'batched_requests': 0,
            'streamed_responses': 0,
            'avg_response_time': 0.0,
            'pipeline_optimizations': 0
        }
    
    async def optimize_request(
        self,
        request: Request,
        handler: Callable,
        background_tasks: BackgroundTasks
    ) -> Response:
        """
        Apply comprehensive request/response optimizations.
        
        Args:
            request: FastAPI Request object
            handler: Original request handler
            background_tasks: FastAPI BackgroundTasks
            
        Returns:
            Optimized Response
        """
        start_time = time.time()
        self.metrics['total_requests'] += 1
        
        # Generate cache key
        cache_key = self.response_cache._generate_cache_key(request)
        
        # Try to get cached response
        cached_response = await self.response_cache.get_cached_response(request, cache_key)
        if cached_response:
            self.metrics['cached_responses'] += 1
            return Response(
                content=json.dumps(cached_response),
                media_type="application/json",
                headers={"X-Cache": "HIT", "X-Cache-Key": cache_key}
            )
        
        # Determine if request should be batched
        if self._should_batch_request(request):
            response_data = await self._handle_batched_request(request)
            self.metrics['batched_requests'] += 1
        else:
            # Execute request normally
            response_data = await self._execute_handler(handler, request)
        
        # Determine response strategy
        response_size = len(json.dumps(response_data, default=str).encode())
        
        # Cache response (in background)
        if self._should_cache_response(request, response_data):
            background_tasks.add_task(
                self.response_cache.cache_response,
                request,
                response_data,
                cache_key
            )
        
        # Create optimized response
        if (self.config.enable_streaming_responses and 
            response_size > self.config.stream_threshold_bytes):
            
            # Stream large responses
            self.metrics['streamed_responses'] += 1
            return await self._create_streaming_response(response_data)
        else:
            # Regular response with compression
            response = Response(
                content=json.dumps(response_data, default=str),
                media_type="application/json",
                headers={
                    "X-Cache": "MISS",
                    "X-Response-Size": str(response_size),
                    "X-Processing-Time": str(round((time.time() - start_time) * 1000, 2))
                }
            )
            
            # Apply compression if beneficial
            if (self.config.enable_smart_compression and 
                response_size > self.config.compression_threshold_bytes):
                response = await self._compress_response(response, request)
            
            return response
    
    def _should_batch_request(self, request: Request) -> bool:
        """Determine if request should be batched"""
        if not self.config.enable_request_batching:
            return False
        
        # Batch database queries and similar operations
        batchable_paths = [
            '/api/v1/users',
            '/api/v1/agentic-coach/bulk-analyze',
            '/api/v1/database/query'
        ]
        
        return any(request.url.path.startswith(path) for path in batchable_paths)
    
    async def _handle_batched_request(self, request: Request) -> Dict[str, Any]:
        """Handle request through batching system"""
        batch_key = f"api_{request.url.path.replace('/', '_')}"
        
        request_data = {
            'id': getattr(request.state, 'request_id', str(time.time())),
            'path': request.url.path,
            'method': request.method,
            'params': dict(request.query_params),
            'timestamp': datetime.now().isoformat()
        }
        
        return await self.request_batcher.add_to_batch(batch_key, request_data)
    
    async def _execute_handler(self, handler: Callable, request: Request) -> Dict[str, Any]:
        """Execute original request handler"""
        try:
            # This would call the actual FastAPI handler
            # For now, simulate a response
            return {
                "data": f"response_for_{request.url.path}",
                "timestamp": datetime.now().isoformat(),
                "optimized": True
            }
        except Exception as e:
            logger.error(f"Handler execution failed: {e}")
            raise
    
    def _should_cache_response(self, request: Request, response_data: Dict[str, Any]) -> bool:
        """Determine if response should be cached"""
        if not self.config.enable_response_caching:
            return False
        
        # Don't cache POST/PUT/DELETE requests
        if request.method not in ['GET', 'HEAD']:
            return False
        
        # Don't cache error responses
        if not response_data.get('success', True):
            return False
        
        # Don't cache user-specific data (unless explicitly allowed)
        if hasattr(request.state, 'user_id') and 'public' not in request.url.path:
            return False
        
        return True
    
    async def _create_streaming_response(self, response_data: Dict[str, Any]) -> StreamingResponse:
        """Create streaming response for large data"""
        async def generate_stream():
            # Stream the response data in chunks
            response_json = json.dumps(response_data, default=str)
            chunk_size = 8192  # 8KB chunks
            
            for i in range(0, len(response_json), chunk_size):
                chunk = response_json[i:i + chunk_size]
                yield chunk.encode()
        
        return await self.streaming_handler.create_streaming_response(
            generate_stream(),
            headers={"X-Response-Type": "streaming"}
        )
    
    async def _compress_response(self, response: Response, request: Request) -> Response:
        """Apply intelligent compression to response"""
        accept_encoding = request.headers.get('accept-encoding', '').lower()
        
        if 'gzip' in accept_encoding and 'gzip' in self.config.compression_algorithms:
            # Apply gzip compression
            compressed_content = gzip.compress(response.body)
            
            # Only use compression if it actually reduces size
            if len(compressed_content) < len(response.body):
                response.body = compressed_content
                response.headers['content-encoding'] = 'gzip'
                response.headers['content-length'] = str(len(compressed_content))
        
        return response
    
    def get_pipeline_metrics(self) -> Dict[str, Any]:
        """Get comprehensive pipeline performance metrics"""
        total_requests = max(1, self.metrics['total_requests'])
        
        return {
            **self.metrics,
            'cache_hit_rate': self.metrics['cached_responses'] / total_requests,
            'batch_rate': self.metrics['batched_requests'] / total_requests,
            'stream_rate': self.metrics['streamed_responses'] / total_requests,
            'cache_stats': self.response_cache.get_cache_stats(),
            'optimization_rate': self.metrics['pipeline_optimizations'] / total_requests
        }


# Integration helper for FastAPI
async def create_pipeline_optimizer(config: PipelineConfig = None) -> RequestPipelineOptimizer:
    """Create and initialize pipeline optimizer"""
    if not config:
        config = PipelineConfig()
    
    # Initialize Redis connection if available
    redis_client = None
    try:
        redis_client = redis.from_url("redis://localhost:6379", decode_responses=False)
        await redis_client.ping()
        logger.info("Redis connection established for pipeline optimization")
    except Exception as e:
        logger.warning(f"Redis not available, using local cache only: {e}")
    
    return RequestPipelineOptimizer(config, redis_client)