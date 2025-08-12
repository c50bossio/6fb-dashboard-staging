#!/usr/bin/env python3
"""
Performance Monitor Service
Real-time performance tracking and memory management for the AI Agent System
"""

import asyncio
import logging
import psutil
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import gc
import threading

logger = logging.getLogger(__name__)

@dataclass
class PerformanceMetric:
    """Performance metric data structure"""
    name: str
    value: float
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class PerformanceMonitor:
    """
    Comprehensive performance monitoring with:
    - Real-time metrics tracking
    - Memory leak detection
    - Automatic garbage collection
    - Performance alerts
    - Resource optimization
    """
    
    def __init__(self, monitoring_interval: float = 60.0):
        self.monitoring_interval = monitoring_interval
        self.metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.timers: Dict[str, float] = {}
        self.counters: Dict[str, int] = defaultdict(int)
        self.process = psutil.Process()
        self.start_time = time.time()
        
        # Monitoring tasks
        self._monitoring_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._gc_task: Optional[asyncio.Task] = None
        
        # Performance thresholds
        self.thresholds = {
            'memory_usage_mb': 1000,     # 1GB memory limit
            'cpu_usage_percent': 80,      # 80% CPU usage limit
            'response_time_ms': 2000,     # 2 second response time limit
            'error_rate': 0.05,           # 5% error rate limit
            'disk_usage_percent': 85,     # 85% disk usage limit
        }
        
        # Alert tracking
        self.alerts: List[Dict[str, Any]] = []
        self.alert_cooldowns: Dict[str, datetime] = {}
        
        # Memory tracking for leak detection
        self.memory_samples: deque = deque(maxlen=100)
        self.gc_stats = {'collections': 0, 'objects_collected': 0}
        
        self._running = False
    
    async def start(self):
        """Start performance monitoring"""
        if self._running:
            return
        
        self._running = True
        
        # Start monitoring tasks
        self._monitoring_task = asyncio.create_task(self._monitor_system_metrics())
        self._cleanup_task = asyncio.create_task(self._periodic_cleanup())
        self._gc_task = asyncio.create_task(self._memory_management())
        
        logger.info("✅ Performance monitoring started")
    
    async def stop(self):
        """Stop performance monitoring"""
        self._running = False
        
        # Cancel monitoring tasks
        for task in [self._monitoring_task, self._cleanup_task, self._gc_task]:
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        logger.info("✅ Performance monitoring stopped")
    
    def start_timer(self) -> float:
        """Start a performance timer"""
        return time.time()
    
    def end_timer(self, metric_name: str, start_time: float) -> float:
        """End a performance timer and record the duration"""
        duration = time.time() - start_time
        self.record_metric(f"{metric_name}_duration_ms", duration * 1000)
        return duration * 1000
    
    def record_metric(self, name: str, value: float, metadata: Dict[str, Any] = None):
        """Record a performance metric"""
        metric = PerformanceMetric(
            name=name,
            value=value,
            timestamp=datetime.now(),
            metadata=metadata
        )
        
        self.metrics[name].append(metric)
        
        # Check for threshold violations
        self._check_threshold(name, value)
    
    def increment_counter(self, name: str, increment: int = 1):
        """Increment a performance counter"""
        self.counters[name] += increment
        self.record_metric(name, self.counters[name])
    
    async def _monitor_system_metrics(self):
        """Monitor system-level performance metrics"""
        while self._running:
            try:
                # Memory metrics
                memory_info = self.process.memory_info()
                memory_mb = memory_info.rss / 1024 / 1024
                self.record_metric('memory_usage_mb', memory_mb)
                self.memory_samples.append((time.time(), memory_mb))
                
                # CPU metrics
                cpu_percent = self.process.cpu_percent()
                self.record_metric('cpu_usage_percent', cpu_percent)
                
                # System memory
                system_memory = psutil.virtual_memory()
                self.record_metric('system_memory_percent', system_memory.percent)
                self.record_metric('system_memory_available_mb', system_memory.available / 1024 / 1024)
                
                # Disk usage
                disk_usage = psutil.disk_usage('/')
                disk_percent = (disk_usage.used / disk_usage.total) * 100
                self.record_metric('disk_usage_percent', disk_percent)
                
                # Thread count
                thread_count = threading.active_count()
                self.record_metric('thread_count', thread_count)
                
                # File descriptors (Unix-like systems)
                try:
                    fd_count = len(self.process.open_files()) + len(self.process.connections())
                    self.record_metric('file_descriptors', fd_count)
                except (psutil.AccessDenied, AttributeError):
                    pass
                
                # Check for memory leaks
                await self._detect_memory_leaks()
                
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"System monitoring error: {e}")
                await asyncio.sleep(self.monitoring_interval)
    
    async def _detect_memory_leaks(self):
        """Detect potential memory leaks"""
        if len(self.memory_samples) < 10:
            return
        
        # Analyze memory trend over last 10 samples
        recent_samples = list(self.memory_samples)[-10:]
        memory_values = [sample[1] for sample in recent_samples]
        
        # Calculate trend
        if len(memory_values) >= 2:
            # Simple linear regression to detect upward trend
            n = len(memory_values)
            sum_x = sum(range(n))
            sum_y = sum(memory_values)
            sum_xy = sum(i * memory_values[i] for i in range(n))
            sum_x2 = sum(i * i for i in range(n))
            
            # Slope of linear regression
            if n * sum_x2 - sum_x * sum_x != 0:
                slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
                
                # If memory is increasing consistently
                if slope > 5:  # More than 5MB increase per sample
                    await self._trigger_alert(
                        'memory_leak_detected',
                        f"Potential memory leak detected. Memory increasing by {slope:.2f} MB per sample",
                        {'slope': slope, 'current_memory': memory_values[-1]}
                    )
    
    async def _periodic_cleanup(self):
        """Periodic cleanup to prevent memory bloat"""
        while self._running:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                # Clean old metrics (keep last 1000 per metric)
                cleaned_count = 0
                for metric_name, metric_deque in self.metrics.items():
                    if len(metric_deque) > 500:  # Clean if too many
                        # Remove oldest entries
                        while len(metric_deque) > 500:
                            metric_deque.popleft()
                            cleaned_count += 1
                
                # Clean old alerts (keep last 100)
                if len(self.alerts) > 100:
                    self.alerts = self.alerts[-100:]
                
                # Clean old alert cooldowns
                now = datetime.now()
                expired_cooldowns = [
                    key for key, cooldown_time in self.alert_cooldowns.items()
                    if now - cooldown_time > timedelta(hours=1)
                ]
                for key in expired_cooldowns:
                    del self.alert_cooldowns[key]
                
                if cleaned_count > 0:
                    logger.debug(f"Performance monitor cleanup: removed {cleaned_count} old metrics")
                
            except Exception as e:
                logger.error(f"Cleanup error: {e}")
    
    async def _memory_management(self):
        """Proactive memory management and garbage collection"""
        while self._running:
            try:
                await asyncio.sleep(180)  # Every 3 minutes
                
                # Get memory usage before GC
                memory_before = self.process.memory_info().rss / 1024 / 1024
                
                # Force garbage collection
                collected_objects = 0
                for generation in range(3):  # Python has 3 GC generations
                    collected = gc.collect(generation)
                    collected_objects += collected
                
                # Get memory usage after GC
                memory_after = self.process.memory_info().rss / 1024 / 1024
                memory_freed = memory_before - memory_after
                
                # Update GC stats
                self.gc_stats['collections'] += 1
                self.gc_stats['objects_collected'] += collected_objects
                
                # Record metrics
                self.record_metric('gc_objects_collected', collected_objects)
                self.record_metric('memory_freed_mb', memory_freed)
                
                if memory_freed > 10:  # Freed more than 10MB
                    logger.info(f"GC freed {memory_freed:.2f} MB, collected {collected_objects} objects")
                
                # Aggressive cleanup if memory usage is high
                if memory_after > self.thresholds['memory_usage_mb']:
                    await self._aggressive_cleanup()
                
            except Exception as e:
                logger.error(f"Memory management error: {e}")
    
    async def _aggressive_cleanup(self):
        """Aggressive cleanup when memory usage is high"""
        logger.warning("High memory usage detected, performing aggressive cleanup")
        
        try:
            # Clear all but recent metrics
            for metric_name, metric_deque in self.metrics.items():
                if len(metric_deque) > 100:
                    # Keep only recent 100 entries
                    recent_entries = list(metric_deque)[-100:]
                    metric_deque.clear()
                    metric_deque.extend(recent_entries)
            
            # Clear old alerts
            self.alerts = self.alerts[-50:]  # Keep only last 50 alerts
            
            # Force multiple GC cycles
            for _ in range(3):
                gc.collect()
            
            # Clear unused memory
            try:
                import ctypes
                libc = ctypes.CDLL("libc.so.6")
                libc.malloc_trim(0)  # Linux only
            except (ImportError, OSError):
                pass  # Not available on this system
            
            logger.info("Aggressive cleanup completed")
            
        except Exception as e:
            logger.error(f"Aggressive cleanup error: {e}")
    
    def _check_threshold(self, metric_name: str, value: float):
        """Check if metric exceeds threshold and trigger alert"""
        if metric_name in self.thresholds:
            threshold = self.thresholds[metric_name]
            
            if value > threshold:
                asyncio.create_task(self._trigger_alert(
                    f"{metric_name}_threshold_exceeded",
                    f"{metric_name} ({value:.2f}) exceeded threshold ({threshold})",
                    {'metric': metric_name, 'value': value, 'threshold': threshold}
                ))
    
    async def _trigger_alert(self, alert_type: str, message: str, metadata: Dict[str, Any] = None):
        """Trigger a performance alert with cooldown"""
        # Check cooldown
        now = datetime.now()
        if alert_type in self.alert_cooldowns:
            if now - self.alert_cooldowns[alert_type] < timedelta(minutes=10):
                return  # Still in cooldown
        
        # Create alert
        alert = {
            'type': alert_type,
            'message': message,
            'metadata': metadata or {},
            'timestamp': now.isoformat(),
            'severity': self._get_alert_severity(alert_type)
        }
        
        self.alerts.append(alert)
        self.alert_cooldowns[alert_type] = now
        
        # Log based on severity
        if alert['severity'] == 'critical':
            logger.error(f"CRITICAL ALERT: {message}")
        elif alert['severity'] == 'warning':
            logger.warning(f"WARNING ALERT: {message}")
        else:
            logger.info(f"INFO ALERT: {message}")
    
    def _get_alert_severity(self, alert_type: str) -> str:
        """Determine alert severity based on type"""
        if any(keyword in alert_type.lower() for keyword in ['critical', 'leak', 'crash', 'error']):
            return 'critical'
        elif any(keyword in alert_type.lower() for keyword in ['warning', 'threshold', 'high']):
            return 'warning'
        else:
            return 'info'
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        now = time.time()
        uptime = now - self.start_time
        
        # Calculate averages for key metrics
        avg_metrics = {}
        for metric_name in ['memory_usage_mb', 'cpu_usage_percent', 'response_time_ms']:
            if metric_name in self.metrics and self.metrics[metric_name]:
                values = [m.value for m in self.metrics[metric_name]]
                avg_metrics[f'avg_{metric_name}'] = sum(values) / len(values)
                avg_metrics[f'max_{metric_name}'] = max(values)
                avg_metrics[f'min_{metric_name}'] = min(values)
        
        # Error rate calculation
        total_requests = self.counters.get('total_requests', 1)
        total_errors = self.counters.get('total_errors', 0)
        error_rate = total_errors / max(total_requests, 1)
        
        # Memory trend analysis
        memory_trend = 'stable'
        if len(self.memory_samples) >= 5:
            recent_memory = [sample[1] for sample in list(self.memory_samples)[-5:]]
            if recent_memory[-1] > recent_memory[0] * 1.1:
                memory_trend = 'increasing'
            elif recent_memory[-1] < recent_memory[0] * 0.9:
                memory_trend = 'decreasing'
        
        return {
            # System metrics
            'uptime_seconds': uptime,
            'uptime_formatted': self._format_uptime(uptime),
            'current_memory_mb': self.process.memory_info().rss / 1024 / 1024,
            'current_cpu_percent': self.process.cpu_percent(),
            'thread_count': threading.active_count(),
            
            # Performance averages
            **avg_metrics,
            
            # Rates and trends
            'error_rate': error_rate,
            'memory_trend': memory_trend,
            
            # Counters
            'counters': dict(self.counters),
            
            # GC stats
            'garbage_collection': self.gc_stats,
            
            # Alerts summary
            'total_alerts': len(self.alerts),
            'recent_alerts': [alert for alert in self.alerts if 
                            (datetime.now() - datetime.fromisoformat(alert['timestamp'])).total_seconds() < 3600],
            
            # Health indicators
            'performance_grade': self._calculate_performance_grade(),
            'memory_health': 'good' if self.process.memory_info().rss / 1024 / 1024 < 500 else 'concern',
            'response_health': 'good' if avg_metrics.get('avg_response_time_ms', 0) < 1000 else 'concern',
            
            # Monitoring status
            'monitoring_active': self._running,
            'metrics_tracked': len(self.metrics),
            'last_cleanup': self._get_last_cleanup_time(),
            
            'timestamp': datetime.now().isoformat()
        }
    
    def _format_uptime(self, seconds: float) -> str:
        """Format uptime in human readable format"""
        hours, remainder = divmod(int(seconds), 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m {seconds}s"
        elif minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    def _calculate_performance_grade(self) -> str:
        """Calculate overall performance grade"""
        score = 100
        
        # Memory usage penalty
        current_memory = self.process.memory_info().rss / 1024 / 1024
        if current_memory > 800:
            score -= 20
        elif current_memory > 500:
            score -= 10
        
        # Error rate penalty
        error_rate = self.counters.get('total_errors', 0) / max(self.counters.get('total_requests', 1), 1)
        if error_rate > 0.05:
            score -= 25
        elif error_rate > 0.01:
            score -= 15
        
        # Response time penalty
        if 'response_time_ms' in self.metrics and self.metrics['response_time_ms']:
            avg_response_time = sum(m.value for m in self.metrics['response_time_ms']) / len(self.metrics['response_time_ms'])
            if avg_response_time > 3000:
                score -= 30
            elif avg_response_time > 1000:
                score -= 15
        
        # Alert penalty
        recent_critical_alerts = len([
            alert for alert in self.alerts
            if alert['severity'] == 'critical' and
            (datetime.now() - datetime.fromisoformat(alert['timestamp'])).total_seconds() < 3600
        ])
        score -= recent_critical_alerts * 10
        
        # Grade assignment
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'
    
    def _get_last_cleanup_time(self) -> str:
        """Get time since last cleanup"""
        # This would track actual cleanup times in a real implementation
        return "< 5 minutes ago"
    
    def get_recent_alerts(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Get recent alerts within specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            alert for alert in self.alerts
            if datetime.fromisoformat(alert['timestamp']) > cutoff_time
        ]
    
    def get_metric_history(self, metric_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get historical data for a specific metric"""
        if metric_name not in self.metrics:
            return []
        
        recent_metrics = list(self.metrics[metric_name])[-limit:]
        
        return [
            {
                'value': metric.value,
                'timestamp': metric.timestamp.isoformat(),
                'metadata': metric.metadata
            }
            for metric in recent_metrics
        ]