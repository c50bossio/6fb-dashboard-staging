#!/usr/bin/env python3
"""
Advanced Background Task Processing System
Comprehensive async task system with queues, workers, scheduling,
retry logic, monitoring, and distributed task processing.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4
import pickle
import traceback
from contextlib import asynccontextmanager
import redis.asyncio as redis
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    """Task execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class TaskPriority(int, Enum):
    """Task priority levels"""
    LOW = 3
    NORMAL = 2
    HIGH = 1
    CRITICAL = 0


@dataclass
class TaskConfig:
    """Configuration for background task system"""
    # Worker configuration
    max_workers: int = 10
    worker_timeout: int = 300  # 5 minutes
    heartbeat_interval: int = 30  # seconds
    
    # Queue configuration
    max_queue_size: int = 10000
    queue_batch_size: int = 100
    
    # Retry configuration
    max_retries: int = 3
    retry_backoff_base: float = 2.0
    retry_max_delay: int = 300  # 5 minutes
    
    # Monitoring
    enable_monitoring: bool = True
    metrics_retention_hours: int = 24
    
    # Persistence
    enable_persistence: bool = True
    task_ttl_hours: int = 168  # 1 week
    
    # Distributed processing
    enable_distributed: bool = False
    redis_url: str = "redis://localhost:6379"


@dataclass
class Task:
    """Task definition with metadata"""
    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    function: str = ""  # Function name to execute
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    
    # Timing
    created_at: datetime = field(default_factory=datetime.now)
    scheduled_for: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Retry logic
    max_retries: int = 3
    current_retry: int = 0
    retry_delays: List[float] = field(default_factory=list)
    
    # Metadata
    context: Dict[str, Any] = field(default_factory=dict)
    result: Any = None
    error: Optional[str] = None
    worker_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary for serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'function': self.function,
            'args': self.args,
            'kwargs': self.kwargs,
            'priority': self.priority.value,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'scheduled_for': self.scheduled_for.isoformat() if self.scheduled_for else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'max_retries': self.max_retries,
            'current_retry': self.current_retry,
            'retry_delays': self.retry_delays,
            'context': self.context,
            'result': self.result,
            'error': self.error,
            'worker_id': self.worker_id
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Task':
        """Create task from dictionary"""
        task = cls(
            id=data['id'],
            name=data['name'],
            function=data['function'],
            args=tuple(data['args']),
            kwargs=data['kwargs'],
            priority=TaskPriority(data['priority']),
            status=TaskStatus(data['status']),
            max_retries=data['max_retries'],
            current_retry=data['current_retry'],
            retry_delays=data['retry_delays'],
            context=data['context'],
            result=data['result'],
            error=data['error'],
            worker_id=data['worker_id']
        )
        
        # Parse datetime fields
        task.created_at = datetime.fromisoformat(data['created_at'])
        if data['scheduled_for']:
            task.scheduled_for = datetime.fromisoformat(data['scheduled_for'])
        if data['started_at']:
            task.started_at = datetime.fromisoformat(data['started_at'])
        if data['completed_at']:
            task.completed_at = datetime.fromisoformat(data['completed_at'])
        
        return task


class TaskQueue:
    """Priority-based task queue with persistence"""
    
    def __init__(self, config: TaskConfig, redis_client: Optional[redis.Redis] = None):
        self.config = config
        self.redis_client = redis_client
        self.local_queue = asyncio.PriorityQueue(maxsize=config.max_queue_size)
        self.pending_tasks: Dict[str, Task] = {}
        self.queue_lock = asyncio.Lock()
        
    async def enqueue(self, task: Task) -> bool:
        """Add task to queue"""
        try:
            async with self.queue_lock:
                # Check if queue is full
                if self.local_queue.full():
                    logger.warning(f"Task queue is full, dropping task {task.id}")
                    return False
                
                # Store task
                self.pending_tasks[task.id] = task
                
                # Add to priority queue (lower priority value = higher priority)
                await self.local_queue.put((task.priority.value, task.created_at, task.id))
                
                # Persist to Redis if enabled
                if self.redis_client and self.config.enable_persistence:
                    await self._persist_task(task)
                
                logger.debug(f"Task {task.id} enqueued with priority {task.priority.name}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to enqueue task {task.id}: {e}")
            return False
    
    async def dequeue(self, timeout: Optional[float] = None) -> Optional[Task]:
        """Get next task from queue"""
        try:
            # Get task ID from priority queue
            if timeout:
                _, _, task_id = await asyncio.wait_for(
                    self.local_queue.get(),
                    timeout=timeout
                )
            else:
                _, _, task_id = await self.local_queue.get()
            
            async with self.queue_lock:
                task = self.pending_tasks.pop(task_id, None)
                if task:
                    task.status = TaskStatus.RUNNING
                    task.started_at = datetime.now()
                    
                    # Update in Redis if enabled
                    if self.redis_client and self.config.enable_persistence:
                        await self._persist_task(task)
                    
                    return task
                
        except asyncio.TimeoutError:
            return None
        except Exception as e:
            logger.error(f"Failed to dequeue task: {e}")
            return None
    
    async def complete_task(self, task: Task, result: Any = None, error: str = None):
        """Mark task as completed"""
        task.completed_at = datetime.now()
        task.result = result
        task.error = error
        task.status = TaskStatus.COMPLETED if not error else TaskStatus.FAILED
        
        # Update in Redis if enabled
        if self.redis_client and self.config.enable_persistence:
            await self._persist_task(task)
        
        logger.debug(f"Task {task.id} completed with status {task.status.name}")
    
    async def retry_task(self, task: Task, error: str):
        """Handle task retry logic"""
        task.current_retry += 1
        task.error = error
        
        if task.current_retry <= task.max_retries:
            # Calculate retry delay with exponential backoff
            delay = min(
                self.config.retry_backoff_base ** task.current_retry,
                self.config.retry_max_delay
            )
            task.retry_delays.append(delay)
            task.scheduled_for = datetime.now() + timedelta(seconds=delay)
            task.status = TaskStatus.RETRYING
            
            # Re-enqueue for retry
            await self.enqueue(task)
            logger.info(f"Task {task.id} scheduled for retry {task.current_retry}/{task.max_retries} in {delay}s")
        else:
            # Max retries exceeded
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            
            # Update in Redis
            if self.redis_client and self.config.enable_persistence:
                await self._persist_task(task)
            
            logger.error(f"Task {task.id} failed after {task.max_retries} retries: {error}")
    
    async def _persist_task(self, task: Task):
        """Persist task to Redis"""
        try:
            task_data = json.dumps(task.to_dict(), default=str)
            await self.redis_client.setex(
                f"task:{task.id}",
                self.config.task_ttl_hours * 3600,
                task_data
            )
        except Exception as e:
            logger.error(f"Failed to persist task {task.id}: {e}")
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            'pending_count': len(self.pending_tasks),
            'queue_size': self.local_queue.qsize(),
            'max_queue_size': self.config.max_queue_size,
            'queue_full': self.local_queue.full()
        }


class TaskWorker:
    """Async task worker with health monitoring"""
    
    def __init__(self, worker_id: str, config: TaskConfig, task_queue: TaskQueue):
        self.worker_id = worker_id
        self.config = config
        self.task_queue = task_queue
        self.is_running = False
        self.current_task: Optional[Task] = None
        self.tasks_processed = 0
        self.tasks_failed = 0
        self.last_heartbeat = datetime.now()
        self.worker_task: Optional[asyncio.Task] = None
        
        # Task registry for function lookups
        self.task_registry: Dict[str, Callable] = {}
        
    def register_task_function(self, name: str, func: Callable):
        """Register a task function"""
        self.task_registry[name] = func
        logger.debug(f"Registered task function: {name}")
    
    async def start(self):
        """Start the worker"""
        if self.is_running:
            logger.warning(f"Worker {self.worker_id} is already running")
            return
        
        self.is_running = True
        logger.info(f"Starting worker {self.worker_id}")
        
        # Start worker loop and heartbeat
        self.worker_task = asyncio.create_task(self._worker_loop())
        asyncio.create_task(self._heartbeat_loop())
        
    async def stop(self):
        """Stop the worker gracefully"""
        logger.info(f"Stopping worker {self.worker_id}")
        self.is_running = False
        
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        
        logger.info(f"Worker {self.worker_id} stopped")
    
    async def _worker_loop(self):
        """Main worker processing loop"""
        while self.is_running:
            try:
                # Get next task with timeout
                task = await self.task_queue.dequeue(timeout=5.0)
                
                if task:
                    await self._process_task(task)
                
            except asyncio.CancelledError:
                logger.info(f"Worker {self.worker_id} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {self.worker_id} error: {e}")
                await asyncio.sleep(1)  # Brief pause before continuing
    
    async def _process_task(self, task: Task):
        """Process a single task"""
        self.current_task = task
        task.worker_id = self.worker_id
        
        logger.info(f"Worker {self.worker_id} processing task {task.id}: {task.name}")
        
        try:
            # Check if task is scheduled for future execution
            if task.scheduled_for and task.scheduled_for > datetime.now():
                delay = (task.scheduled_for - datetime.now()).total_seconds()
                logger.debug(f"Task {task.id} sleeping for {delay}s")
                await asyncio.sleep(delay)
            
            # Get task function
            if task.function not in self.task_registry:
                raise ValueError(f"Task function '{task.function}' not registered")
            
            func = self.task_registry[task.function]
            
            # Execute task with timeout
            result = await asyncio.wait_for(
                self._execute_task_function(func, task),
                timeout=self.config.worker_timeout
            )
            
            # Mark task as completed
            await self.task_queue.complete_task(task, result=result)
            self.tasks_processed += 1
            
            logger.info(f"Task {task.id} completed successfully")
            
        except asyncio.TimeoutError as e:
            error_msg = f"Task {task.id} timed out after {self.config.worker_timeout}s"
            logger.error(error_msg)
            await self.task_queue.retry_task(task, error_msg)
            self.tasks_failed += 1
            
        except Exception as e:
            error_msg = f"Task {task.id} failed: {str(e)}"
            logger.error(error_msg)
            logger.debug(traceback.format_exc())
            await self.task_queue.retry_task(task, error_msg)
            self.tasks_failed += 1
            
        finally:
            self.current_task = None
    
    async def _execute_task_function(self, func: Callable, task: Task) -> Any:
        """Execute task function with proper error handling"""
        # Check if function is async
        if asyncio.iscoroutinefunction(func):
            return await func(*task.args, **task.kwargs, task_context=task.context)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(
                None,
                lambda: func(*task.args, **task.kwargs, task_context=task.context)
            )
    
    async def _heartbeat_loop(self):
        """Send periodic heartbeats"""
        while self.is_running:
            try:
                self.last_heartbeat = datetime.now()
                await asyncio.sleep(self.config.heartbeat_interval)
            except Exception as e:
                logger.error(f"Heartbeat error for worker {self.worker_id}: {e}")
    
    def get_worker_stats(self) -> Dict[str, Any]:
        """Get worker statistics"""
        return {
            'worker_id': self.worker_id,
            'is_running': self.is_running,
            'tasks_processed': self.tasks_processed,
            'tasks_failed': self.tasks_failed,
            'current_task_id': self.current_task.id if self.current_task else None,
            'last_heartbeat': self.last_heartbeat.isoformat(),
            'registered_functions': list(self.task_registry.keys())
        }


class TaskScheduler:
    """Cron-like task scheduler for recurring tasks"""
    
    def __init__(self, task_queue: TaskQueue):
        self.task_queue = task_queue
        self.scheduled_tasks: Dict[str, Dict[str, Any]] = {}
        self.scheduler_task: Optional[asyncio.Task] = None
        self.is_running = False
        
    def schedule_recurring_task(
        self,
        name: str,
        function: str,
        schedule: str,  # Cron-like expression
        args: tuple = (),
        kwargs: dict = None,
        priority: TaskPriority = TaskPriority.NORMAL
    ):
        """Schedule a recurring task"""
        if kwargs is None:
            kwargs = {}
        
        self.scheduled_tasks[name] = {
            'function': function,
            'schedule': schedule,
            'args': args,
            'kwargs': kwargs,
            'priority': priority,
            'last_run': None,
            'next_run': self._calculate_next_run(schedule)
        }
        
        logger.info(f"Scheduled recurring task: {name} ({schedule})")
    
    def _calculate_next_run(self, schedule: str) -> datetime:
        """Calculate next run time from schedule string"""
        # Simplified scheduler - in production, use croniter or similar
        now = datetime.now()
        
        if schedule.startswith('every'):
            parts = schedule.split()
            if len(parts) >= 2:
                interval = int(parts[1]) if parts[1].isdigit() else 1
                unit = parts[2] if len(parts) > 2 else 'minutes'
                
                if unit.startswith('minute'):
                    return now + timedelta(minutes=interval)
                elif unit.startswith('hour'):
                    return now + timedelta(hours=interval)
                elif unit.startswith('day'):
                    return now + timedelta(days=interval)
        
        # Default to 1 hour
        return now + timedelta(hours=1)
    
    async def start(self):
        """Start the scheduler"""
        if self.is_running:
            return
        
        self.is_running = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Task scheduler started")
    
    async def stop(self):
        """Stop the scheduler"""
        self.is_running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
        logger.info("Task scheduler stopped")
    
    async def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.is_running:
            try:
                now = datetime.now()
                
                for name, task_info in self.scheduled_tasks.items():
                    if now >= task_info['next_run']:
                        # Create and enqueue task
                        task = Task(
                            name=f"scheduled_{name}",
                            function=task_info['function'],
                            args=task_info['args'],
                            kwargs=task_info['kwargs'],
                            priority=task_info['priority']
                        )
                        
                        await self.task_queue.enqueue(task)
                        
                        # Update schedule
                        task_info['last_run'] = now
                        task_info['next_run'] = self._calculate_next_run(task_info['schedule'])
                        
                        logger.debug(f"Scheduled task '{name}' enqueued")
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                await asyncio.sleep(60)  # Wait before retrying


class BackgroundTaskSystem:
    """Main background task system orchestrator"""
    
    def __init__(self, config: TaskConfig = None):
        self.config = config or TaskConfig()
        self.redis_client: Optional[redis.Redis] = None
        self.task_queue: Optional[TaskQueue] = None
        self.workers: List[TaskWorker] = []
        self.scheduler: Optional[TaskScheduler] = None
        self.is_running = False
        
        # System metrics
        self.metrics = {
            'system_start_time': datetime.now(),
            'total_tasks_processed': 0,
            'total_tasks_failed': 0,
            'average_task_duration': 0.0
        }
    
    async def initialize(self):
        """Initialize the task system"""
        logger.info("Initializing background task system")
        
        # Initialize Redis if distributed processing is enabled
        if self.config.enable_distributed:
            try:
                self.redis_client = redis.from_url(self.config.redis_url)
                await self.redis_client.ping()
                logger.info("Redis connection established for distributed tasks")
            except Exception as e:
                logger.warning(f"Redis connection failed, using local processing: {e}")
                self.redis_client = None
        
        # Initialize task queue
        self.task_queue = TaskQueue(self.config, self.redis_client)
        
        # Initialize scheduler
        self.scheduler = TaskScheduler(self.task_queue)
        
        # Create workers
        for i in range(self.config.max_workers):
            worker_id = f"worker_{i+1}"
            worker = TaskWorker(worker_id, self.config, self.task_queue)
            self.workers.append(worker)
        
        logger.info(f"Background task system initialized with {len(self.workers)} workers")
    
    async def start(self):
        """Start the background task system"""
        if self.is_running:
            logger.warning("Background task system is already running")
            return
        
        logger.info("Starting background task system")
        self.is_running = True
        
        # Start all workers
        for worker in self.workers:
            await worker.start()
        
        # Start scheduler
        await self.scheduler.start()
        
        logger.info("Background task system started successfully")
    
    async def stop(self):
        """Stop the background task system gracefully"""
        logger.info("Stopping background task system")
        self.is_running = False
        
        # Stop scheduler
        if self.scheduler:
            await self.scheduler.stop()
        
        # Stop all workers
        for worker in self.workers:
            await worker.stop()
        
        # Close Redis connection
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Background task system stopped")
    
    def register_task_function(self, name: str, func: Callable):
        """Register a task function with all workers"""
        for worker in self.workers:
            worker.register_task_function(name, func)
        logger.info(f"Task function '{name}' registered with all workers")
    
    async def enqueue_task(
        self,
        function: str,
        args: tuple = (),
        kwargs: dict = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        scheduled_for: Optional[datetime] = None,
        max_retries: int = None,
        name: str = None,
        context: Dict[str, Any] = None
    ) -> str:
        """Enqueue a new task"""
        if kwargs is None:
            kwargs = {}
        if context is None:
            context = {}
        
        task = Task(
            name=name or function,
            function=function,
            args=args,
            kwargs=kwargs,
            priority=priority,
            scheduled_for=scheduled_for,
            max_retries=max_retries or self.config.max_retries,
            context=context
        )
        
        success = await self.task_queue.enqueue(task)
        if success:
            logger.info(f"Task '{task.name}' ({task.id}) enqueued")
            return task.id
        else:
            raise RuntimeError(f"Failed to enqueue task '{task.name}'")
    
    def schedule_recurring_task(
        self,
        name: str,
        function: str,
        schedule: str,
        args: tuple = (),
        kwargs: dict = None,
        priority: TaskPriority = TaskPriority.NORMAL
    ):
        """Schedule a recurring task"""
        if self.scheduler:
            self.scheduler.schedule_recurring_task(
                name, function, schedule, args, kwargs, priority
            )
        else:
            raise RuntimeError("Scheduler not initialized")
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics"""
        worker_stats = [worker.get_worker_stats() for worker in self.workers]
        queue_stats = self.task_queue.get_queue_stats() if self.task_queue else {}
        
        total_processed = sum(w['tasks_processed'] for w in worker_stats)
        total_failed = sum(w['tasks_failed'] for w in worker_stats)
        
        return {
            'is_running': self.is_running,
            'uptime_seconds': (datetime.now() - self.metrics['system_start_time']).total_seconds(),
            'total_workers': len(self.workers),
            'active_workers': sum(1 for w in worker_stats if w['is_running']),
            'total_tasks_processed': total_processed,
            'total_tasks_failed': total_failed,
            'success_rate': total_processed / max(1, total_processed + total_failed),
            'queue_stats': queue_stats,
            'worker_stats': worker_stats,
            'config': {
                'max_workers': self.config.max_workers,
                'max_queue_size': self.config.max_queue_size,
                'enable_distributed': self.config.enable_distributed,
                'enable_persistence': self.config.enable_persistence
            }
        }


# Example task functions
async def send_email_task(to: str, subject: str, body: str, task_context: Dict[str, Any] = None):
    """Example async email sending task"""
    logger.info(f"Sending email to {to}: {subject}")
    await asyncio.sleep(2)  # Simulate email sending
    return {"status": "sent", "to": to, "subject": subject}


async def process_analytics_task(user_id: int, event_data: Dict[str, Any], task_context: Dict[str, Any] = None):
    """Example analytics processing task"""
    logger.info(f"Processing analytics for user {user_id}")
    await asyncio.sleep(1)  # Simulate processing
    return {"processed": True, "user_id": user_id, "events": len(event_data)}


def sync_database_task(table_name: str, task_context: Dict[str, Any] = None):
    """Example sync database task"""
    logger.info(f"Syncing database table: {table_name}")
    time.sleep(3)  # Simulate sync operation
    return {"synced": True, "table": table_name, "rows": 1000}


# Context manager for easy system management
@asynccontextmanager
async def background_task_system(config: TaskConfig = None):
    """Context manager for background task system"""
    system = BackgroundTaskSystem(config)
    
    try:
        await system.initialize()
        await system.start()
        
        # Register example tasks
        system.register_task_function("send_email", send_email_task)
        system.register_task_function("process_analytics", process_analytics_task)
        system.register_task_function("sync_database", sync_database_task)
        
        yield system
    finally:
        await system.stop()