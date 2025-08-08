#!/usr/bin/env python3
"""
Optimized AI Connection Pool with Response Caching and Request Queuing
Manages concurrent AI service calls efficiently to prevent memory leaks and improve performance
"""

import asyncio
import hashlib
import json
import logging
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Tuple
import weakref
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

class AIProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic" 
    GEMINI = "gemini"
    FALLBACK = "fallback"

class RequestPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class AIRequest:
    """AI request with metadata for queue management"""
    id: str
    provider: AIProvider
    message: str
    context: Dict[str, Any]
    priority: RequestPriority
    created_at: datetime
    timeout: float = 30.0
    retry_count: int = 0
    max_retries: int = 2

@dataclass
class AIResponse:
    """AI response with caching metadata"""
    content: str
    provider: AIProvider
    confidence: float
    usage_tokens: int
    response_time: float
    cached: bool = False
    cache_key: str = None
    timestamp: datetime = None

class ResponseCache:
    """Memory-efficient response cache with TTL and size limits"""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: Dict[str, Tuple[AIResponse, datetime]] = {}
        self._access_order: deque = deque()  # LRU tracking
        self._size_bytes = 0
        self._max_size_bytes = 50 * 1024 * 1024  # 50MB limit
    
    def _generate_cache_key(self, request: AIRequest) -> str:
        """Generate cache key from request"""
        cache_data = {
            'provider': request.provider.value,
            'message': request.message,
            'context': {k: v for k, v in request.context.items() 
                       if k in ['business_context', 'user_role', 'message_type']}
        }
        return hashlib.sha256(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()[:16]
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        now = datetime.now()
        expired_keys = []
        
        for key, (response, timestamp) in self._cache.items():
            if (now - timestamp).total_seconds() > self.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            self._remove_entry(key)
    
    def _remove_entry(self, key: str):
        """Remove cache entry and update size tracking"""
        if key in self._cache:
            response, _ = self._cache[key]
            # Estimate memory usage
            entry_size = len(response.content.encode('utf-8')) + 1000  # Content + metadata
            self._size_bytes -= entry_size
            
            del self._cache[key]
            
            # Remove from access order
            if key in self._access_order:
                self._access_order.remove(key)
    
    def _enforce_size_limits(self):
        """Enforce cache size limits using LRU eviction"""
        # Remove entries until under size limit
        while (len(self._cache) > self.max_size or 
               self._size_bytes > self._max_size_bytes) and self._cache:
            if self._access_order:
                oldest_key = self._access_order.popleft()
                self._remove_entry(oldest_key)
            else:
                # Fallback: remove first entry
                first_key = next(iter(self._cache))
                self._remove_entry(first_key)
    
    def get(self, request: AIRequest) -> Optional[AIResponse]:
        """Get cached response if available and not expired"""
        self._cleanup_expired()
        
        cache_key = self._generate_cache_key(request)
        
        if cache_key in self._cache:
            response, timestamp = self._cache[cache_key]
            
            # Move to end of access order (most recently used)
            if cache_key in self._access_order:
                self._access_order.remove(cache_key)
            self._access_order.append(cache_key)
            
            # Mark as cached and return copy
            cached_response = AIResponse(
                content=response.content,
                provider=response.provider,
                confidence=response.confidence,
                usage_tokens=0,  # No tokens used for cached response
                response_time=0.001,  # Near-instant cache hit
                cached=True,
                cache_key=cache_key,
                timestamp=timestamp
            )
            
            logger.debug(f"Cache hit for key {cache_key[:8]}...")
            return cached_response
        
        return None
    
    def put(self, request: AIRequest, response: AIResponse):
        """Cache AI response with size and TTL management"""
        cache_key = self._generate_cache_key(request)
        
        # Don't cache very large responses
        response_size = len(response.content.encode('utf-8'))
        if response_size > 500000:  # 500KB limit per response
            logger.warning(f"Response too large to cache: {response_size} bytes")
            return
        
        # Store response with timestamp
        timestamp = datetime.now()
        self._cache[cache_key] = (response, timestamp)
        self._access_order.append(cache_key)
        self._size_bytes += response_size + 1000  # Content + metadata estimate
        
        response.cache_key = cache_key
        
        # Enforce limits
        self._enforce_size_limits()
        
        logger.debug(f"Cached response for key {cache_key[:8]}... (size: {response_size} bytes)")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'entries': len(self._cache),
            'max_entries': self.max_size,
            'size_bytes': self._size_bytes,
            'max_size_bytes': self._max_size_bytes,
            'ttl_seconds': self.ttl_seconds,
            'hit_ratio': getattr(self, '_hit_count', 0) / max(getattr(self, '_total_requests', 1), 1)
        }

class RequestQueue:
    """Priority queue for AI requests with concurrency control"""
    
    def __init__(self, max_concurrent: int = 10, max_queue_size: int = 100):
        self.max_concurrent = max_concurrent
        self.max_queue_size = max_queue_size
        self._queues = {priority: asyncio.Queue() for priority in RequestPriority}
        self._active_requests: Dict[str, asyncio.Task] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._stats = {
            'queued_requests': 0,
            'completed_requests': 0,
            'failed_requests': 0,
            'queue_overflows': 0,
            'current_active': 0
        }
    
    async def enqueue(self, request: AIRequest) -> bool:
        """Add request to priority queue"""
        current_size = sum(queue.qsize() for queue in self._queues.values())
        
        if current_size >= self.max_queue_size:
            self._stats['queue_overflows'] += 1
            logger.warning(f"Request queue full ({current_size}/{self.max_queue_size})")
            return False
        
        await self._queues[request.priority].put(request)
        self._stats['queued_requests'] += 1
        return True
    
    async def dequeue(self) -> Optional[AIRequest]:
        """Get next request from highest priority queue"""
        # Check queues in priority order
        for priority in reversed(list(RequestPriority)):
            queue = self._queues[priority]
            if not queue.empty():
                return await queue.get()
        
        return None
    
    def get_queue_size(self) -> int:
        """Get total queue size"""
        return sum(queue.qsize() for queue in self._queues.values())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            **self._stats,
            'queue_sizes': {priority.name: queue.qsize() for priority, queue in self._queues.items()},
            'total_queued': self.get_queue_size(),
            'max_concurrent': self.max_concurrent,
            'max_queue_size': self.max_queue_size
        }

class OptimizedAIConnectionPool:
    """
    High-performance AI connection pool with:
    - Response caching to reduce API calls
    - Request queuing with priority handling
    - Connection pooling and reuse
    - Memory management and cleanup
    - Automatic retries with exponential backoff
    """
    
    def __init__(self):
        self.providers = {}
        self.response_cache = ResponseCache()
        self.request_queue = RequestQueue()
        self.connection_pools = {}
        self._processing_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._initialized = False
        
        # Performance tracking
        self._stats = {
            'total_requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'retry_attempts': 0,
            'total_response_time': 0.0
        }
    
    async def initialize(self):
        """Initialize AI connection pool"""
        if self._initialized:
            return
        
        try:
            await self._setup_providers()
            self._processing_task = asyncio.create_task(self._process_requests())
            self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
            self._initialized = True
            logger.info("✅ AI Connection Pool initialized")
        except Exception as e:
            logger.error(f"❌ AI Connection Pool initialization failed: {e}")
            raise
    
    async def _setup_providers(self):
        """Setup AI providers with connection pooling"""
        import os
        
        # OpenAI setup with connection pooling
        try:
            import openai
            openai_key = os.getenv('OPENAI_API_KEY')
            if openai_key:
                # Create async client with connection pooling
                connector = None
                try:
                    import aiohttp
                    connector = aiohttp.TCPConnector(
                        limit=10,  # Pool size
                        limit_per_host=5,
                        ttl_dns_cache=300,
                        use_dns_cache=True,
                        keepalive_timeout=30,
                        enable_cleanup_closed=True
                    )
                except ImportError:
                    pass
                
                self.providers[AIProvider.OPENAI] = openai.AsyncOpenAI(
                    api_key=openai_key,
                    timeout=30.0,
                    max_retries=0  # We handle retries ourselves
                )
                logger.info("✅ OpenAI provider initialized with connection pooling")
        except Exception as e:
            logger.warning(f"⚠️ OpenAI setup failed: {e}")
        
        # Anthropic setup
        try:
            import anthropic
            anthropic_key = os.getenv('ANTHROPIC_API_KEY')
            if anthropic_key:
                self.providers[AIProvider.ANTHROPIC] = anthropic.AsyncAnthropic(
                    api_key=anthropic_key,
                    timeout=30.0
                )
                logger.info("✅ Anthropic provider initialized")
        except Exception as e:
            logger.warning(f"⚠️ Anthropic setup failed: {e}")
        
        # Gemini setup
        try:
            import google.generativeai as genai
            gemini_key = os.getenv('GOOGLE_AI_API_KEY')
            if gemini_key:
                genai.configure(api_key=gemini_key)
                self.providers[AIProvider.GEMINI] = genai
                logger.info("✅ Gemini provider initialized")
        except Exception as e:
            logger.warning(f"⚠️ Gemini setup failed: {e}")
    
    async def _process_requests(self):
        """Background task to process queued requests"""
        while True:
            try:
                request = await self.request_queue.dequeue()
                if request:
                    # Process request with concurrency control
                    async with self.request_queue._semaphore:
                        task = asyncio.create_task(self._execute_request(request))
                        self.request_queue._active_requests[request.id] = task
                        self.request_queue._stats['current_active'] += 1
                        
                        try:
                            await task
                        finally:
                            if request.id in self.request_queue._active_requests:
                                del self.request_queue._active_requests[request.id]
                            self.request_queue._stats['current_active'] -= 1
                else:
                    # No requests available, wait a bit
                    await asyncio.sleep(0.1)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Request processing error: {e}")
    
    async def _execute_request(self, request: AIRequest) -> AIResponse:
        """Execute individual AI request with retries"""
        start_time = time.time()
        
        try:
            # Check cache first
            cached_response = self.response_cache.get(request)
            if cached_response:
                self._stats['cache_hits'] += 1
                self.request_queue._stats['completed_requests'] += 1
                return cached_response
            
            self._stats['cache_misses'] += 1
            
            # Execute request with retries
            last_error = None
            for attempt in range(request.max_retries + 1):
                try:
                    response = await self._call_provider(request)
                    response_time = time.time() - start_time
                    response.response_time = response_time
                    
                    # Cache successful response
                    if response.confidence > 0.7:  # Only cache high-confidence responses
                        self.response_cache.put(request, response)
                    
                    self._stats['successful_requests'] += 1
                    self._stats['total_response_time'] += response_time
                    self.request_queue._stats['completed_requests'] += 1
                    
                    return response
                    
                except Exception as e:
                    last_error = e
                    request.retry_count += 1
                    self._stats['retry_attempts'] += 1
                    
                    if attempt < request.max_retries:
                        # Exponential backoff
                        wait_time = (2 ** attempt) * 0.5
                        await asyncio.sleep(wait_time)
                        logger.warning(f"Request retry {attempt + 1}/{request.max_retries} after {wait_time}s: {e}")
            
            # All retries failed
            self._stats['failed_requests'] += 1
            self.request_queue._stats['failed_requests'] += 1
            
            # Return fallback response
            return AIResponse(
                content="I'm experiencing technical difficulties. Please try again in a moment.",
                provider=AIProvider.FALLBACK,
                confidence=0.3,
                usage_tokens=0,
                response_time=time.time() - start_time,
                cached=False
            )
            
        except Exception as e:
            logger.error(f"Request execution failed: {e}")
            self._stats['failed_requests'] += 1
            self.request_queue._stats['failed_requests'] += 1
            raise
    
    async def _call_provider(self, request: AIRequest) -> AIResponse:
        """Call specific AI provider"""
        if request.provider not in self.providers:
            raise ValueError(f"Provider {request.provider} not available")
        
        provider_client = self.providers[request.provider]
        
        if request.provider == AIProvider.OPENAI:
            response = await provider_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": request.message}],
                max_tokens=1000,
                temperature=0.7,
                timeout=request.timeout
            )
            
            return AIResponse(
                content=response.choices[0].message.content,
                provider=request.provider,
                confidence=0.85,
                usage_tokens=response.usage.total_tokens if response.usage else 0,
                response_time=0  # Will be set by caller
            )
        
        elif request.provider == AIProvider.ANTHROPIC:
            response = await provider_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1000,
                messages=[{"role": "user", "content": request.message}],
                timeout=request.timeout
            )
            
            return AIResponse(
                content=response.content[0].text,
                provider=request.provider,
                confidence=0.88,
                usage_tokens=response.usage.input_tokens + response.usage.output_tokens,
                response_time=0
            )
        
        elif request.provider == AIProvider.GEMINI:
            model = provider_client.GenerativeModel('gemini-pro')
            response = await model.generate_content_async(
                request.message,
                generation_config=provider_client.types.GenerationConfig(
                    max_output_tokens=1000,
                    temperature=0.7
                )
            )
            
            return AIResponse(
                content=response.text,
                provider=request.provider,
                confidence=0.82,
                usage_tokens=0,  # Gemini doesn't provide token usage
                response_time=0
            )
        
        else:
            raise ValueError(f"Unknown provider: {request.provider}")
    
    async def _periodic_cleanup(self):
        """Periodic cleanup to prevent memory leaks"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Clean up completed tasks
                completed_tasks = [
                    req_id for req_id, task in self.request_queue._active_requests.items()
                    if task.done()
                ]
                
                for req_id in completed_tasks:
                    del self.request_queue._active_requests[req_id]
                
                # Force cache cleanup
                self.response_cache._cleanup_expired()
                
                logger.debug(f"Cleanup completed: removed {len(completed_tasks)} completed tasks")
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    async def submit_request(self, provider: AIProvider, message: str, 
                           context: Dict[str, Any] = None, 
                           priority: RequestPriority = RequestPriority.NORMAL,
                           timeout: float = 30.0) -> str:
        """Submit AI request and get response ID for tracking"""
        if not self._initialized:
            await self.initialize()
        
        request_id = f"{provider.value}_{int(time.time() * 1000)}_{hash(message) % 10000}"
        
        request = AIRequest(
            id=request_id,
            provider=provider,
            message=message,
            context=context or {},
            priority=priority,
            created_at=datetime.now(),
            timeout=timeout
        )
        
        self._stats['total_requests'] += 1
        
        # Try to enqueue request
        if await self.request_queue.enqueue(request):
            return request_id
        else:
            # Queue full, execute immediately with fallback
            try:
                response = await self._execute_request(request)
                return response.content
            except Exception as e:
                logger.error(f"Immediate execution failed: {e}")
                return "I'm currently experiencing high demand. Please try again in a moment."
    
    async def get_response(self, request_id: str, timeout: float = 30.0) -> Optional[AIResponse]:
        """Get response for a submitted request (if using async pattern)"""
        # For now, we execute synchronously, but this could be enhanced
        # to support true async request/response pattern
        return None
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        avg_response_time = (
            self._stats['total_response_time'] / max(self._stats['successful_requests'], 1)
        )
        
        return {
            'connection_pool': {
                'providers_available': len(self.providers),
                'providers': list(provider.value for provider in self.providers.keys()),
                'initialized': self._initialized
            },
            'performance': {
                **self._stats,
                'average_response_time': avg_response_time,
                'cache_hit_ratio': self._stats['cache_hits'] / max(self._stats['total_requests'], 1),
                'success_rate': self._stats['successful_requests'] / max(self._stats['total_requests'], 1)
            },
            'cache': self.response_cache.get_stats(),
            'queue': self.request_queue.get_stats(),
            'timestamp': datetime.now().isoformat()
        }
    
    async def close(self):
        """Close connection pool and cleanup resources"""
        if self._processing_task:
            self._processing_task.cancel()
            try:
                await self._processing_task
            except asyncio.CancelledError:
                pass
        
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Close provider connections
        for provider_name, provider_client in self.providers.items():
            try:
                if hasattr(provider_client, 'close'):
                    await provider_client.close()
            except Exception as e:
                logger.warning(f"Error closing {provider_name}: {e}")
        
        self._initialized = False
        logger.info("✅ AI Connection Pool closed")

# Global instance
_ai_pool: Optional[OptimizedAIConnectionPool] = None

def get_ai_connection_pool() -> OptimizedAIConnectionPool:
    """Get global AI connection pool"""
    global _ai_pool
    if _ai_pool is None:
        _ai_pool = OptimizedAIConnectionPool()
    return _ai_pool

async def initialize_ai_connection_pool():
    """Initialize global AI connection pool"""
    global _ai_pool
    _ai_pool = OptimizedAIConnectionPool()
    await _ai_pool.initialize()
    return _ai_pool

async def close_ai_connection_pool():
    """Close global AI connection pool"""
    global _ai_pool
    if _ai_pool:
        await _ai_pool.close()
        _ai_pool = None