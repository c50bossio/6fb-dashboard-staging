#!/usr/bin/env python3
"""
Comprehensive Health Check System for 6FB AI Agent System

This module implements comprehensive health monitoring including:
- Service health checks (API, Database, Redis, AI services)
- Dependency health verification
- Circuit breaker patterns
- Health check aggregation and reporting
- Auto-recovery mechanisms
"""

import asyncio
import aiohttp
import logging
import time
import json
import redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import os
import sqlite3
import psutil
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class HealthStatus(Enum):
    """Health check status enumeration"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class CheckType(Enum):
    """Health check types"""
    HTTP = "http"
    DATABASE = "database"
    REDIS = "redis"
    FILESYSTEM = "filesystem"
    MEMORY = "memory"
    CPU = "cpu"
    EXTERNAL_API = "external_api"
    CUSTOM = "custom"


@dataclass
class HealthCheckResult:
    """Health check result"""
    name: str
    status: HealthStatus
    message: str
    response_time_ms: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'name': self.name,
            'status': self.status.value,
            'message': self.message,
            'response_time_ms': self.response_time_ms,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'tags': self.tags
        }


@dataclass
class CircuitBreakerState:
    """Circuit breaker state tracking"""
    name: str
    state: str  # "closed", "open", "half_open"
    failure_count: int
    last_failure_time: Optional[datetime]
    last_success_time: Optional[datetime]
    next_attempt_time: Optional[datetime]
    failure_threshold: int = 5
    timeout_seconds: int = 60
    
    def is_call_allowed(self) -> bool:
        """Check if calls are allowed through the circuit breaker"""
        now = datetime.utcnow()
        
        if self.state == "closed":
            return True
        elif self.state == "open":
            if self.next_attempt_time and now >= self.next_attempt_time:
                self.state = "half_open"
                return True
            return False
        elif self.state == "half_open":
            return True
        
        return False
    
    def record_success(self):
        """Record successful call"""
        self.failure_count = 0
        self.last_success_time = datetime.utcnow()
        self.state = "closed"
        self.next_attempt_time = None
    
    def record_failure(self):
        """Record failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            self.next_attempt_time = datetime.utcnow() + timedelta(seconds=self.timeout_seconds)
        elif self.state == "half_open":
            self.state = "open"
            self.next_attempt_time = datetime.utcnow() + timedelta(seconds=self.timeout_seconds)


class BaseHealthCheck:
    """Base class for health checks"""
    
    def __init__(self, name: str, check_type: CheckType, timeout_seconds: int = 10, 
                 enabled: bool = True, tags: Dict[str, str] = None):
        self.name = name
        self.check_type = check_type
        self.timeout_seconds = timeout_seconds
        self.enabled = enabled
        self.tags = tags or {}
        
        # Circuit breaker
        self.circuit_breaker = CircuitBreakerState(
            name=f"{name}_circuit_breaker",
            state="closed",
            failure_count=0,
            last_failure_time=None,
            last_success_time=None,
            next_attempt_time=None
        )
    
    async def execute(self) -> HealthCheckResult:
        """Execute the health check"""
        if not self.enabled:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.UNKNOWN,
                message="Health check disabled",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                tags=self.tags
            )
        
        if not self.circuit_breaker.is_call_allowed():
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message="Circuit breaker is open",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'circuit_breaker_state': self.circuit_breaker.state},
                tags=self.tags
            )
        
        start_time = time.time()
        
        try:
            result = await asyncio.wait_for(
                self._check_health(),
                timeout=self.timeout_seconds
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            result.response_time_ms = response_time_ms
            result.timestamp = datetime.utcnow()
            result.tags.update(self.tags)
            
            # Record success in circuit breaker
            if result.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]:
                self.circuit_breaker.record_success()
            else:
                self.circuit_breaker.record_failure()
            
            return result
            
        except asyncio.TimeoutError:
            self.circuit_breaker.record_failure()
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Health check timed out after {self.timeout_seconds}s",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                tags=self.tags
            )
        except Exception as e:
            self.circuit_breaker.record_failure()
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Health check failed: {str(e)}",
                response_time_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)},
                tags=self.tags
            )
    
    async def _check_health(self) -> HealthCheckResult:
        """Override this method to implement specific health check logic"""
        raise NotImplementedError("Subclasses must implement _check_health method")


class HTTPHealthCheck(BaseHealthCheck):
    """HTTP endpoint health check"""
    
    def __init__(self, name: str, url: str, expected_status: int = 200, 
                 expected_response_time_ms: float = 5000, 
                 headers: Dict[str, str] = None, **kwargs):
        super().__init__(name, CheckType.HTTP, **kwargs)
        self.url = url
        self.expected_status = expected_status
        self.expected_response_time_ms = expected_response_time_ms
        self.headers = headers or {}
    
    async def _check_health(self) -> HealthCheckResult:
        """Check HTTP endpoint health"""
        async with aiohttp.ClientSession() as session:
            try:
                start_time = time.time()
                async with session.get(self.url, headers=self.headers) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    status = HealthStatus.HEALTHY
                    message = f"HTTP {response.status} - {response_time_ms:.1f}ms"
                    
                    # Check status code
                    if response.status != self.expected_status:
                        status = HealthStatus.UNHEALTHY
                        message = f"Unexpected status {response.status}, expected {self.expected_status}"
                    
                    # Check response time
                    elif response_time_ms > self.expected_response_time_ms:
                        status = HealthStatus.DEGRADED
                        message = f"Slow response: {response_time_ms:.1f}ms (expected < {self.expected_response_time_ms}ms)"
                    
                    return HealthCheckResult(
                        name=self.name,
                        status=status,
                        message=message,
                        response_time_ms=response_time_ms,
                        timestamp=datetime.utcnow(),
                        metadata={
                            'status_code': response.status,
                            'url': self.url,
                            'response_time_ms': response_time_ms
                        }
                    )
                    
            except Exception as e:
                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.CRITICAL,
                    message=f"HTTP request failed: {str(e)}",
                    response_time_ms=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={'error': str(e), 'url': self.url}
                )


class DatabaseHealthCheck(BaseHealthCheck):
    """Database connectivity health check"""
    
    def __init__(self, name: str, db_path: str = "./agent_system.db", 
                 query_timeout_ms: float = 1000, **kwargs):
        super().__init__(name, CheckType.DATABASE, **kwargs)
        self.db_path = db_path
        self.query_timeout_ms = query_timeout_ms
    
    async def _check_health(self) -> HealthCheckResult:
        """Check database health"""
        try:
            start_time = time.time()
            
            # Check if database file exists
            if not os.path.exists(self.db_path):
                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.CRITICAL,
                    message=f"Database file not found: {self.db_path}",
                    response_time_ms=0.0,
                    timestamp=datetime.utcnow()
                )
            
            # Test database connectivity
            conn = sqlite3.connect(self.db_path, timeout=self.query_timeout_ms / 1000)
            cursor = conn.cursor()
            
            # Simple health check query
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            
            # Get database stats
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()
            table_count = len(tables)
            
            # Get database size
            db_size_bytes = os.path.getsize(self.db_path)
            
            conn.close()
            
            response_time_ms = (time.time() - start_time) * 1000
            
            status = HealthStatus.HEALTHY
            message = f"Database responsive - {response_time_ms:.1f}ms"
            
            if response_time_ms > self.query_timeout_ms * 0.8:
                status = HealthStatus.DEGRADED
                message = f"Slow database response: {response_time_ms:.1f}ms"
            
            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                metadata={
                    'table_count': table_count,
                    'db_size_bytes': db_size_bytes,
                    'db_path': self.db_path
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Database check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)}
            )


class RedisHealthCheck(BaseHealthCheck):
    """Redis connectivity health check"""
    
    def __init__(self, name: str, redis_url: str = "redis://localhost:6379", 
                 expected_response_time_ms: float = 100, **kwargs):
        super().__init__(name, CheckType.REDIS, **kwargs)
        self.redis_url = redis_url
        self.expected_response_time_ms = expected_response_time_ms
    
    async def _check_health(self) -> HealthCheckResult:
        """Check Redis health"""
        try:
            start_time = time.time()
            
            # Parse Redis URL
            parsed_url = urlparse(self.redis_url)
            
            # Connect to Redis
            r = redis.Redis(
                host=parsed_url.hostname or 'localhost',
                port=parsed_url.port or 6379,
                password=parsed_url.password,
                socket_timeout=self.timeout_seconds,
                socket_connect_timeout=self.timeout_seconds
            )
            
            # Test connectivity with PING
            ping_result = r.ping()
            response_time_ms = (time.time() - start_time) * 1000
            
            if not ping_result:
                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.CRITICAL,
                    message="Redis PING failed",
                    response_time_ms=response_time_ms,
                    timestamp=datetime.utcnow()
                )
            
            # Get Redis info
            info = r.info()
            
            status = HealthStatus.HEALTHY
            message = f"Redis responsive - {response_time_ms:.1f}ms"
            
            if response_time_ms > self.expected_response_time_ms:
                status = HealthStatus.DEGRADED
                message = f"Slow Redis response: {response_time_ms:.1f}ms"
            
            # Check memory usage
            used_memory = info.get('used_memory', 0)
            max_memory = info.get('maxmemory', 0)
            
            if max_memory > 0 and (used_memory / max_memory) > 0.9:
                status = HealthStatus.DEGRADED
                message = f"High Redis memory usage: {(used_memory/max_memory)*100:.1f}%"
            
            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                metadata={
                    'redis_version': info.get('redis_version'),
                    'used_memory': used_memory,
                    'max_memory': max_memory,
                    'connected_clients': info.get('connected_clients', 0)
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Redis check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)}
            )


class FilesystemHealthCheck(BaseHealthCheck):
    """Filesystem health check"""
    
    def __init__(self, name: str, path: str = "/", 
                 warning_threshold_percent: float = 80,
                 critical_threshold_percent: float = 95, **kwargs):
        super().__init__(name, CheckType.FILESYSTEM, **kwargs)
        self.path = path
        self.warning_threshold = warning_threshold_percent
        self.critical_threshold = critical_threshold_percent
    
    async def _check_health(self) -> HealthCheckResult:
        """Check filesystem health"""
        try:
            start_time = time.time()
            
            # Get disk usage
            disk_usage = psutil.disk_usage(self.path)
            
            used_percent = (disk_usage.used / disk_usage.total) * 100
            free_bytes = disk_usage.free
            total_bytes = disk_usage.total
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Determine status
            if used_percent >= self.critical_threshold:
                status = HealthStatus.CRITICAL
                message = f"Critical disk usage: {used_percent:.1f}% used"
            elif used_percent >= self.warning_threshold:
                status = HealthStatus.DEGRADED
                message = f"High disk usage: {used_percent:.1f}% used"
            else:
                status = HealthStatus.HEALTHY
                message = f"Disk usage normal: {used_percent:.1f}% used"
            
            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                metadata={
                    'path': self.path,
                    'used_percent': used_percent,
                    'free_bytes': free_bytes,
                    'total_bytes': total_bytes,
                    'used_bytes': disk_usage.used
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Filesystem check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)}
            )


class MemoryHealthCheck(BaseHealthCheck):
    """Memory usage health check"""
    
    def __init__(self, name: str, warning_threshold_percent: float = 80,
                 critical_threshold_percent: float = 95, **kwargs):
        super().__init__(name, CheckType.MEMORY, **kwargs)
        self.warning_threshold = warning_threshold_percent
        self.critical_threshold = critical_threshold_percent
    
    async def _check_health(self) -> HealthCheckResult:
        """Check memory health"""
        try:
            start_time = time.time()
            
            # Get memory usage
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            used_percent = memory.percent
            available_bytes = memory.available
            total_bytes = memory.total
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Determine status
            if used_percent >= self.critical_threshold:
                status = HealthStatus.CRITICAL
                message = f"Critical memory usage: {used_percent:.1f}%"
            elif used_percent >= self.warning_threshold:
                status = HealthStatus.DEGRADED
                message = f"High memory usage: {used_percent:.1f}%"
            else:
                status = HealthStatus.HEALTHY
                message = f"Memory usage normal: {used_percent:.1f}%"
            
            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                metadata={
                    'used_percent': used_percent,
                    'available_bytes': available_bytes,
                    'total_bytes': total_bytes,
                    'used_bytes': memory.used,
                    'swap_used_percent': swap.percent,
                    'swap_total_bytes': swap.total
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"Memory check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)}
            )


class CPUHealthCheck(BaseHealthCheck):
    """CPU usage health check"""
    
    def __init__(self, name: str, warning_threshold_percent: float = 80,
                 critical_threshold_percent: float = 95, 
                 measurement_interval: float = 1.0, **kwargs):
        super().__init__(name, CheckType.CPU, **kwargs)
        self.warning_threshold = warning_threshold_percent
        self.critical_threshold = critical_threshold_percent
        self.measurement_interval = measurement_interval
    
    async def _check_health(self) -> HealthCheckResult:
        """Check CPU health"""
        try:
            start_time = time.time()
            
            # Get CPU usage over the specified interval
            cpu_percent = psutil.cpu_percent(interval=self.measurement_interval)
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else (0, 0, 0)
            cpu_count = psutil.cpu_count()
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Determine status
            if cpu_percent >= self.critical_threshold:
                status = HealthStatus.CRITICAL
                message = f"Critical CPU usage: {cpu_percent:.1f}%"
            elif cpu_percent >= self.warning_threshold:
                status = HealthStatus.DEGRADED
                message = f"High CPU usage: {cpu_percent:.1f}%"
            else:
                status = HealthStatus.HEALTHY
                message = f"CPU usage normal: {cpu_percent:.1f}%"
            
            return HealthCheckResult(
                name=self.name,
                status=status,
                message=message,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                metadata={
                    'cpu_percent': cpu_percent,
                    'load_1m': load_avg[0],
                    'load_5m': load_avg[1],
                    'load_15m': load_avg[2],
                    'cpu_count': cpu_count,
                    'load_per_cpu_1m': load_avg[0] / cpu_count if cpu_count > 0 else 0
                }
            )
            
        except Exception as e:
            return HealthCheckResult(
                name=self.name,
                status=HealthStatus.CRITICAL,
                message=f"CPU check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow(),
                metadata={'error': str(e)}
            )


class ExternalAPIHealthCheck(BaseHealthCheck):
    """External API health check"""
    
    def __init__(self, name: str, api_name: str, test_endpoint: str,
                 expected_response_time_ms: float = 5000,
                 headers: Dict[str, str] = None, **kwargs):
        super().__init__(name, CheckType.EXTERNAL_API, **kwargs)
        self.api_name = api_name
        self.test_endpoint = test_endpoint
        self.expected_response_time_ms = expected_response_time_ms
        self.headers = headers or {}
    
    async def _check_health(self) -> HealthCheckResult:
        """Check external API health"""
        async with aiohttp.ClientSession() as session:
            try:
                start_time = time.time()
                async with session.get(self.test_endpoint, headers=self.headers) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    
                    status = HealthStatus.HEALTHY
                    message = f"{self.api_name} API responsive - {response_time_ms:.1f}ms"
                    
                    # Check status code
                    if response.status >= 500:
                        status = HealthStatus.CRITICAL
                        message = f"{self.api_name} API server error: {response.status}"
                    elif response.status >= 400:
                        status = HealthStatus.DEGRADED
                        message = f"{self.api_name} API client error: {response.status}"
                    elif response_time_ms > self.expected_response_time_ms:
                        status = HealthStatus.DEGRADED
                        message = f"{self.api_name} API slow response: {response_time_ms:.1f}ms"
                    
                    return HealthCheckResult(
                        name=self.name,
                        status=status,
                        message=message,
                        response_time_ms=response_time_ms,
                        timestamp=datetime.utcnow(),
                        metadata={
                            'api_name': self.api_name,
                            'status_code': response.status,
                            'endpoint': self.test_endpoint,
                            'response_time_ms': response_time_ms
                        }
                    )
                    
            except Exception as e:
                return HealthCheckResult(
                    name=self.name,
                    status=HealthStatus.CRITICAL,
                    message=f"{self.api_name} API failed: {str(e)}",
                    response_time_ms=0.0,
                    timestamp=datetime.utcnow(),
                    metadata={'error': str(e), 'api_name': self.api_name}
                )


class HealthCheckManager:
    """Manages and orchestrates all health checks"""
    
    def __init__(self):
        self.health_checks: Dict[str, BaseHealthCheck] = {}
        self.check_history: Dict[str, List[HealthCheckResult]] = {}
        self.aggregated_status = HealthStatus.UNKNOWN
        self.last_check_time: Optional[datetime] = None
        self.alert_callbacks: List[Callable] = []
        
        # Initialize default health checks
        self._initialize_default_checks()
    
    def _initialize_default_checks(self):
        """Initialize default health checks for the 6FB AI Agent System"""
        
        # Backend API health check
        self.add_health_check(HTTPHealthCheck(
            name="backend_api",
            url="http://localhost:8001/health",
            expected_status=200,
            expected_response_time_ms=1000,
            timeout_seconds=10,
            tags={"service": "backend", "type": "api"}
        ))
        
        # Frontend health check
        self.add_health_check(HTTPHealthCheck(
            name="frontend",
            url="http://localhost:9999/api/health",
            expected_status=200,
            expected_response_time_ms=2000,
            timeout_seconds=10,
            tags={"service": "frontend", "type": "web"}
        ))
        
        # Database health check
        self.add_health_check(DatabaseHealthCheck(
            name="database",
            db_path="./agent_system.db",
            query_timeout_ms=1000,
            timeout_seconds=5,
            tags={"service": "database", "type": "storage"}
        ))
        
        # Redis health check
        self.add_health_check(RedisHealthCheck(
            name="redis",
            redis_url="redis://localhost:6379",
            expected_response_time_ms=100,
            timeout_seconds=5,
            tags={"service": "redis", "type": "cache"}
        ))
        
        # System resource checks
        self.add_health_check(MemoryHealthCheck(
            name="memory",
            warning_threshold_percent=80,
            critical_threshold_percent=95,
            timeout_seconds=5,
            tags={"service": "system", "type": "resource"}
        ))
        
        self.add_health_check(CPUHealthCheck(
            name="cpu",
            warning_threshold_percent=80,
            critical_threshold_percent=95,
            measurement_interval=1.0,
            timeout_seconds=10,
            tags={"service": "system", "type": "resource"}
        ))
        
        self.add_health_check(FilesystemHealthCheck(
            name="filesystem",
            path="/",
            warning_threshold_percent=80,
            critical_threshold_percent=95,
            timeout_seconds=5,
            tags={"service": "system", "type": "resource"}
        ))
        
        # External API checks (if configured)
        if os.getenv('OPENAI_API_KEY'):
            self.add_health_check(ExternalAPIHealthCheck(
                name="openai_api",
                api_name="OpenAI",
                test_endpoint="https://api.openai.com/v1/models",
                expected_response_time_ms=3000,
                headers={"Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}"},
                timeout_seconds=10,
                tags={"service": "external", "type": "ai"}
            ))
        
        if os.getenv('ANTHROPIC_API_KEY'):
            # Note: Anthropic doesn't have a simple health endpoint
            # This is a placeholder - you'd implement a lightweight test
            pass
    
    def add_health_check(self, health_check: BaseHealthCheck):
        """Add a health check"""
        self.health_checks[health_check.name] = health_check
        self.check_history[health_check.name] = []
        logger.info(f"Added health check: {health_check.name}")
    
    def remove_health_check(self, name: str):
        """Remove a health check"""
        if name in self.health_checks:
            del self.health_checks[name]
            del self.check_history[name]
            logger.info(f"Removed health check: {name}")
    
    async def run_all_checks(self) -> Dict[str, HealthCheckResult]:
        """Run all health checks"""
        results = {}
        
        # Run all checks concurrently
        tasks = []
        for name, check in self.health_checks.items():
            tasks.append(self._run_single_check(name, check))
        
        completed_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for i, result in enumerate(completed_results):
            check_name = list(self.health_checks.keys())[i]
            
            if isinstance(result, Exception):
                # Handle unexpected exceptions
                result = HealthCheckResult(
                    name=check_name,
                    status=HealthStatus.CRITICAL,
                    message=f"Unexpected error: {str(result)}",
                    response_time_ms=0.0,
                    timestamp=datetime.utcnow()
                )
            
            results[check_name] = result
            
            # Store in history
            self.check_history[check_name].append(result)
            if len(self.check_history[check_name]) > 100:
                self.check_history[check_name] = self.check_history[check_name][-100:]
        
        # Update aggregated status
        self._update_aggregated_status(results)
        self.last_check_time = datetime.utcnow()
        
        # Send alerts for critical issues
        await self._check_and_send_alerts(results)
        
        return results
    
    async def _run_single_check(self, name: str, check: BaseHealthCheck) -> HealthCheckResult:
        """Run a single health check"""
        try:
            return await check.execute()
        except Exception as e:
            logger.error(f"Health check {name} failed unexpectedly: {e}")
            return HealthCheckResult(
                name=name,
                status=HealthStatus.CRITICAL,
                message=f"Health check failed: {str(e)}",
                response_time_ms=0.0,
                timestamp=datetime.utcnow()
            )
    
    def _update_aggregated_status(self, results: Dict[str, HealthCheckResult]):
        """Update overall aggregated health status"""
        statuses = [result.status for result in results.values()]
        
        if HealthStatus.CRITICAL in statuses:
            self.aggregated_status = HealthStatus.CRITICAL
        elif HealthStatus.UNHEALTHY in statuses:
            self.aggregated_status = HealthStatus.UNHEALTHY
        elif HealthStatus.DEGRADED in statuses:
            self.aggregated_status = HealthStatus.DEGRADED
        elif HealthStatus.HEALTHY in statuses:
            self.aggregated_status = HealthStatus.HEALTHY
        else:
            self.aggregated_status = HealthStatus.UNKNOWN
    
    async def _check_and_send_alerts(self, results: Dict[str, HealthCheckResult]):
        """Check for critical issues and send alerts"""
        critical_checks = [
            result for result in results.values()
            if result.status == HealthStatus.CRITICAL
        ]
        
        for critical_check in critical_checks:
            alert_data = {
                'type': 'health_check_critical',
                'check_name': critical_check.name,
                'status': critical_check.status.value,
                'message': critical_check.message,
                'timestamp': critical_check.timestamp.isoformat(),
                'tags': critical_check.tags
            }
            
            for callback in self.alert_callbacks:
                try:
                    await callback(alert_data)
                except Exception as e:
                    logger.error(f"Alert callback failed: {e}")
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get health check summary"""
        if not self.health_checks:
            return {
                'overall_status': 'unknown',
                'message': 'No health checks configured',
                'checks': {},
                'last_check': None
            }
        
        # Get latest results
        latest_results = {}
        for name, history in self.check_history.items():
            if history:
                latest_results[name] = history[-1]
        
        # Count by status
        status_counts = {status.value: 0 for status in HealthStatus}
        for result in latest_results.values():
            status_counts[result.status.value] += 1
        
        return {
            'overall_status': self.aggregated_status.value,
            'message': f"Checked {len(self.health_checks)} services",
            'last_check': self.last_check_time.isoformat() if self.last_check_time else None,
            'status_counts': status_counts,
            'checks': {name: result.to_dict() for name, result in latest_results.items()},
            'circuit_breakers': {
                name: {
                    'state': check.circuit_breaker.state,
                    'failure_count': check.circuit_breaker.failure_count,
                    'last_failure': check.circuit_breaker.last_failure_time.isoformat() if check.circuit_breaker.last_failure_time else None
                }
                for name, check in self.health_checks.items()
            }
        }
    
    def get_check_history(self, check_name: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get history for a specific check"""
        if check_name not in self.check_history:
            return []
        
        history = self.check_history[check_name][-limit:]
        return [result.to_dict() for result in history]
    
    def add_alert_callback(self, callback: Callable):
        """Add alert callback function"""
        self.alert_callbacks.append(callback)
    
    async def run_specific_check(self, check_name: str) -> Optional[HealthCheckResult]:
        """Run a specific health check by name"""
        if check_name not in self.health_checks:
            return None
        
        result = await self.health_checks[check_name].execute()
        
        # Store in history
        self.check_history[check_name].append(result)
        if len(self.check_history[check_name]) > 100:
            self.check_history[check_name] = self.check_history[check_name][-100:]
        
        return result


# Export main components
__all__ = [
    'HealthCheckManager',
    'BaseHealthCheck',
    'HTTPHealthCheck',
    'DatabaseHealthCheck',
    'RedisHealthCheck',
    'FilesystemHealthCheck',
    'MemoryHealthCheck',
    'CPUHealthCheck',
    'ExternalAPIHealthCheck',
    'HealthCheckResult',
    'HealthStatus',
    'CheckType'
]