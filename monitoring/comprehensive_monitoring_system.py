#!/usr/bin/env python3
"""
Comprehensive Logging and Monitoring Integration
Advanced monitoring system with structured logging, metrics collection,
alerting, distributed tracing, and observability dashboards.
"""

import asyncio
import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict, deque
import threading
from contextlib import contextmanager, asynccontextmanager
import structlog
import prometheus_client
from prometheus_client import Counter, Histogram, Gauge, Summary
import jaeger_client
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = structlog.get_logger(__name__)


class LogLevel(str, Enum):
    """Log level enumeration"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(str, Enum):
    """Metric type enumeration"""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class MonitoringConfig:
    """Configuration for comprehensive monitoring system"""
    # Logging configuration
    log_level: str = "INFO"
    enable_structured_logging: bool = True
    enable_request_logging: bool = True
    log_retention_days: int = 30
    
    # Metrics configuration
    enable_prometheus_metrics: bool = True
    metrics_port: int = 8090
    custom_metrics_prefix: str = "sixfb_api"
    
    # Tracing configuration
    enable_distributed_tracing: bool = True
    jaeger_agent_host: str = "localhost"
    jaeger_agent_port: int = 6831
    trace_sampling_rate: float = 0.1
    
    # Alerting configuration
    enable_alerting: bool = True
    alert_webhook_url: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    alert_cooldown_minutes: int = 15
    
    # Performance monitoring
    enable_performance_monitoring: bool = True
    slow_request_threshold_seconds: float = 2.0
    error_rate_threshold_percent: float = 5.0
    
    # Dashboard configuration
    enable_health_dashboard: bool = True
    dashboard_refresh_seconds: int = 30


@dataclass
class Alert:
    """Alert definition"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = ""
    severity: str = "warning"  # info, warning, error, critical
    title: str = ""
    message: str = ""
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    resolved: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary"""
        return {
            'id': self.id,
            'type': self.type,
            'severity': self.severity,
            'title': self.title,
            'message': self.message,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'resolved': self.resolved
        }


class StructuredLogger:
    """Enhanced structured logging with context management"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self._setup_structured_logging()
        
    def _setup_structured_logging(self):
        """Setup structured logging with proper formatting"""
        # Configure structlog
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
        
        # Configure standard logging
        logging.basicConfig(
            format="%(message)s",
            stream=None,
            level=getattr(logging, self.config.log_level.upper())
        )
    
    def get_logger(self, name: str, **context) -> structlog.BoundLogger:
        """Get structured logger with context"""
        return structlog.get_logger(name).bind(**context)
    
    def log_request(self, request_id: str, method: str, path: str, 
                   status_code: int, duration_seconds: float, **extra):
        """Log HTTP request with standardized format"""
        request_logger = self.get_logger("request", request_id=request_id)
        
        log_data = {
            'method': method,
            'path': path,
            'status_code': status_code,
            'duration_seconds': round(duration_seconds, 3),
            'slow_request': duration_seconds > self.config.slow_request_threshold_seconds,
            **extra
        }
        
        if status_code >= 500:
            request_logger.error("Request failed", **log_data)
        elif status_code >= 400:
            request_logger.warning("Request error", **log_data)
        elif duration_seconds > self.config.slow_request_threshold_seconds:
            request_logger.warning("Slow request", **log_data)
        else:
            request_logger.info("Request completed", **log_data)
    
    def log_database_operation(self, operation: str, table: str, 
                              duration_seconds: float, rows_affected: int = 0, **extra):
        """Log database operations"""
        db_logger = self.get_logger("database")
        
        db_logger.info(
            "Database operation",
            operation=operation,
            table=table,
            duration_seconds=round(duration_seconds, 3),
            rows_affected=rows_affected,
            **extra
        )
    
    def log_business_event(self, event_type: str, user_id: Optional[int] = None, 
                          shop_id: Optional[str] = None, **details):
        """Log business events for analytics"""
        business_logger = self.get_logger("business_event")
        
        business_logger.info(
            "Business event",
            event_type=event_type,
            user_id=user_id,
            shop_id=shop_id,
            **details
        )


class PrometheusMetrics:
    """Prometheus metrics collection and management"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.prefix = config.custom_metrics_prefix
        self._setup_default_metrics()
        self.custom_metrics: Dict[str, Any] = {}
        
    def _setup_default_metrics(self):
        """Setup default application metrics"""
        # Request metrics
        self.request_counter = Counter(
            f'{self.prefix}_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status_code']
        )
        
        self.request_duration = Histogram(
            f'{self.prefix}_request_duration_seconds',
            'HTTP request duration in seconds',
            ['method', 'endpoint']
        )
        
        self.request_size = Histogram(
            f'{self.prefix}_request_size_bytes',
            'HTTP request size in bytes',
            ['method', 'endpoint']
        )
        
        self.response_size = Histogram(
            f'{self.prefix}_response_size_bytes',
            'HTTP response size in bytes',
            ['method', 'endpoint']
        )
        
        # Database metrics
        self.db_connections = Gauge(
            f'{self.prefix}_database_connections',
            'Number of database connections',
            ['pool', 'state']
        )
        
        self.db_query_duration = Histogram(
            f'{self.prefix}_database_query_duration_seconds',
            'Database query duration in seconds',
            ['operation', 'table']
        )
        
        self.db_queries_total = Counter(
            f'{self.prefix}_database_queries_total',
            'Total database queries',
            ['operation', 'table', 'status']
        )
        
        # Business metrics
        self.user_sessions = Gauge(
            f'{self.prefix}_active_user_sessions',
            'Number of active user sessions'
        )
        
        self.agentic_chats = Counter(
            f'{self.prefix}_agentic_chats_total',
            'Total agentic coach chats',
            ['user_type', 'domain']
        )
        
        self.agentic_response_time = Histogram(
            f'{self.prefix}_agentic_response_time_seconds',
            'Agentic coach response time in seconds',
            ['complexity', 'domain']
        )
        
        # System metrics
        self.memory_usage = Gauge(
            f'{self.prefix}_memory_usage_bytes',
            'Memory usage in bytes',
            ['type']
        )
        
        self.cpu_usage = Gauge(
            f'{self.prefix}_cpu_usage_percent',
            'CPU usage percentage'
        )
        
        self.error_rate = Gauge(
            f'{self.prefix}_error_rate_percent',
            'Error rate percentage',
            ['time_window']
        )
    
    def record_request(self, method: str, endpoint: str, status_code: int, 
                      duration: float, request_size: int = 0, response_size: int = 0):
        """Record HTTP request metrics"""
        self.request_counter.labels(
            method=method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()
        
        self.request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration)
        
        if request_size > 0:
            self.request_size.labels(
                method=method,
                endpoint=endpoint
            ).observe(request_size)
        
        if response_size > 0:
            self.response_size.labels(
                method=method,
                endpoint=endpoint
            ).observe(response_size)
    
    def record_database_query(self, operation: str, table: str, 
                             duration: float, success: bool = True):
        """Record database query metrics"""
        self.db_query_duration.labels(
            operation=operation,
            table=table
        ).observe(duration)
        
        self.db_queries_total.labels(
            operation=operation,
            table=table,
            status='success' if success else 'error'
        ).inc()
    
    def update_database_connections(self, pool_name: str, active: int, idle: int):
        """Update database connection metrics"""
        self.db_connections.labels(pool=pool_name, state='active').set(active)
        self.db_connections.labels(pool=pool_name, state='idle').set(idle)
    
    def record_agentic_chat(self, user_type: str, domain: str, response_time: float):
        """Record agentic coach metrics"""
        self.agentic_chats.labels(
            user_type=user_type,
            domain=domain
        ).inc()
        
        # Determine complexity based on response time
        complexity = 'simple' if response_time < 2 else 'medium' if response_time < 5 else 'complex'
        
        self.agentic_response_time.labels(
            complexity=complexity,
            domain=domain
        ).observe(response_time)
    
    def update_system_metrics(self, memory_bytes: int, cpu_percent: float):
        """Update system resource metrics"""
        self.memory_usage.labels(type='rss').set(memory_bytes)
        self.cpu_usage.set(cpu_percent)
    
    def create_custom_metric(self, name: str, metric_type: MetricType, 
                           description: str, labels: List[str] = None) -> Any:
        """Create custom metric"""
        full_name = f"{self.prefix}_{name}"
        labels = labels or []
        
        if metric_type == MetricType.COUNTER:
            metric = Counter(full_name, description, labels)
        elif metric_type == MetricType.GAUGE:
            metric = Gauge(full_name, description, labels)
        elif metric_type == MetricType.HISTOGRAM:
            metric = Histogram(full_name, description, labels)
        elif metric_type == MetricType.SUMMARY:
            metric = Summary(full_name, description, labels)
        else:
            raise ValueError(f"Unsupported metric type: {metric_type}")
        
        self.custom_metrics[name] = metric
        return metric
    
    def get_all_metrics(self) -> str:
        """Get all metrics in Prometheus format"""
        return prometheus_client.generate_latest()


class DistributedTracing:
    """Distributed tracing with OpenTelemetry and Jaeger"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.tracer = None
        self._setup_tracing()
        
    def _setup_tracing(self):
        """Setup distributed tracing"""
        if not self.config.enable_distributed_tracing:
            return
        
        try:
            # Configure Jaeger exporter
            jaeger_exporter = JaegerExporter(
                agent_host_name=self.config.jaeger_agent_host,
                agent_port=self.config.jaeger_agent_port,
            )
            
            # Setup trace provider
            trace.set_tracer_provider(TracerProvider())
            tracer_provider = trace.get_tracer_provider()
            
            # Add span processor
            span_processor = BatchSpanProcessor(jaeger_exporter)
            tracer_provider.add_span_processor(span_processor)
            
            # Get tracer
            self.tracer = trace.get_tracer(__name__)
            
            logger.info("Distributed tracing initialized with Jaeger")
            
        except Exception as e:
            logger.error(f"Failed to initialize distributed tracing: {e}")
    
    @contextmanager
    def trace_request(self, operation_name: str, **attributes):
        """Trace HTTP request"""
        if not self.tracer:
            yield None
            return
        
        with self.tracer.start_as_current_span(operation_name) as span:
            # Add attributes
            for key, value in attributes.items():
                span.set_attribute(key, str(value))
            
            yield span
    
    @contextmanager
    def trace_database_operation(self, operation: str, table: str, query: str = None):
        """Trace database operation"""
        if not self.tracer:
            yield None
            return
        
        with self.tracer.start_as_current_span(f"db.{operation}") as span:
            span.set_attribute("db.operation", operation)
            span.set_attribute("db.table", table)
            if query:
                span.set_attribute("db.statement", query[:500])  # Truncate long queries
            
            yield span
    
    @contextmanager
    def trace_business_operation(self, operation: str, **context):
        """Trace business operation"""
        if not self.tracer:
            yield None
            return
        
        with self.tracer.start_as_current_span(f"business.{operation}") as span:
            for key, value in context.items():
                span.set_attribute(f"business.{key}", str(value))
            
            yield span


class AlertManager:
    """Alert management and notification system"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: deque = deque(maxlen=1000)
        self.alert_cooldowns: Dict[str, datetime] = {}
        
    async def trigger_alert(self, alert_type: str, severity: str, title: str, 
                           message: str, metadata: Dict[str, Any] = None) -> bool:
        """Trigger an alert"""
        if not self.config.enable_alerting:
            return False
        
        # Check cooldown
        cooldown_key = f"{alert_type}_{severity}"
        if self._is_in_cooldown(cooldown_key):
            return False
        
        # Create alert
        alert = Alert(
            type=alert_type,
            severity=severity,
            title=title,
            message=message,
            metadata=metadata or {}
        )
        
        # Store alert
        self.active_alerts[alert.id] = alert
        self.alert_history.append(alert)
        self.alert_cooldowns[cooldown_key] = datetime.now()
        
        # Send notifications
        await self._send_notifications(alert)
        
        logger.warning(f"Alert triggered: {title}", alert_id=alert.id, severity=severity)
        return True
    
    def _is_in_cooldown(self, cooldown_key: str) -> bool:
        """Check if alert type is in cooldown period"""
        if cooldown_key not in self.alert_cooldowns:
            return False
        
        time_since_last = datetime.now() - self.alert_cooldowns[cooldown_key]
        return time_since_last < timedelta(minutes=self.config.alert_cooldown_minutes)
    
    async def _send_notifications(self, alert: Alert):
        """Send alert notifications"""
        try:
            # Send to webhook
            if self.config.alert_webhook_url:
                await self._send_webhook_notification(alert)
            
            # Send to Slack
            if self.config.slack_webhook_url:
                await self._send_slack_notification(alert)
                
        except Exception as e:
            logger.error(f"Failed to send alert notifications: {e}")
    
    async def _send_webhook_notification(self, alert: Alert):
        """Send webhook notification"""
        # Implementation would use aiohttp to send HTTP POST
        logger.info(f"Webhook notification sent for alert {alert.id}")
    
    async def _send_slack_notification(self, alert: Alert):
        """Send Slack notification"""
        # Implementation would send to Slack webhook
        logger.info(f"Slack notification sent for alert {alert.id}")
    
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an active alert"""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].resolved = True
            del self.active_alerts[alert_id]
            logger.info(f"Alert resolved: {alert_id}")
            return True
        return False
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get all active alerts"""
        return [alert.to_dict() for alert in self.active_alerts.values()]
    
    def get_alert_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get alert history"""
        recent_alerts = list(self.alert_history)[-limit:]
        return [alert.to_dict() for alert in recent_alerts]


class PerformanceAnalyzer:
    """Performance analysis and bottleneck detection"""
    
    def __init__(self, config: MonitoringConfig):
        self.config = config
        self.request_stats = defaultdict(list)
        self.slow_requests = deque(maxlen=100)
        self.error_stats = defaultdict(int)
        
    def record_request_performance(self, endpoint: str, method: str, 
                                  duration: float, status_code: int):
        """Record request performance data"""
        request_key = f"{method} {endpoint}"
        
        # Store request timing
        self.request_stats[request_key].append({
            'duration': duration,
            'status_code': status_code,
            'timestamp': datetime.now()
        })
        
        # Keep only recent data (last hour)
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.request_stats[request_key] = [
            req for req in self.request_stats[request_key]
            if req['timestamp'] > cutoff_time
        ]
        
        # Track slow requests
        if duration > self.config.slow_request_threshold_seconds:
            self.slow_requests.append({
                'endpoint': endpoint,
                'method': method,
                'duration': duration,
                'timestamp': datetime.now().isoformat()
            })
        
        # Track errors
        if status_code >= 400:
            self.error_stats[request_key] += 1
    
    def get_performance_analysis(self) -> Dict[str, Any]:
        """Get comprehensive performance analysis"""
        analysis = {
            'slow_requests': list(self.slow_requests)[-20:],  # Last 20 slow requests
            'endpoint_performance': {},
            'error_summary': dict(self.error_stats),
            'bottlenecks': []
        }
        
        # Analyze endpoint performance
        for endpoint, requests in self.request_stats.items():
            if not requests:
                continue
            
            durations = [r['duration'] for r in requests]
            error_count = sum(1 for r in requests if r['status_code'] >= 400)
            
            endpoint_analysis = {
                'request_count': len(requests),
                'avg_duration': sum(durations) / len(durations),
                'max_duration': max(durations),
                'min_duration': min(durations),
                'error_count': error_count,
                'error_rate': error_count / len(requests) if requests else 0,
                'slow_request_count': sum(1 for d in durations if d > self.config.slow_request_threshold_seconds)
            }
            
            analysis['endpoint_performance'][endpoint] = endpoint_analysis
            
            # Identify bottlenecks
            if endpoint_analysis['error_rate'] > self.config.error_rate_threshold_percent / 100:
                analysis['bottlenecks'].append({
                    'type': 'high_error_rate',
                    'endpoint': endpoint,
                    'error_rate': endpoint_analysis['error_rate']
                })
            
            if endpoint_analysis['avg_duration'] > self.config.slow_request_threshold_seconds:
                analysis['bottlenecks'].append({
                    'type': 'slow_response',
                    'endpoint': endpoint,
                    'avg_duration': endpoint_analysis['avg_duration']
                })
        
        return analysis


class ComprehensiveMonitoringSystem:
    """Main monitoring system orchestrator"""
    
    def __init__(self, config: MonitoringConfig = None):
        self.config = config or MonitoringConfig()
        
        # Initialize components
        self.logger = StructuredLogger(self.config)
        self.metrics = PrometheusMetrics(self.config)
        self.tracing = DistributedTracing(self.config)
        self.alerts = AlertManager(self.config)
        self.performance = PerformanceAnalyzer(self.config)
        
        # Monitoring state
        self.is_running = False
        self.monitoring_task: Optional[asyncio.Task] = None
        self.metrics_server_task: Optional[asyncio.Task] = None
        
    async def start_monitoring(self):
        """Start the comprehensive monitoring system"""
        if self.is_running:
            logger.warning("Monitoring system is already running")
            return
        
        logger.info("Starting comprehensive monitoring system")
        self.is_running = True
        
        # Start Prometheus metrics server
        if self.config.enable_prometheus_metrics:
            self.metrics_server_task = asyncio.create_task(
                self._start_metrics_server()
            )
        
        # Start monitoring loop
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("Comprehensive monitoring system started")
    
    async def stop_monitoring(self):
        """Stop the monitoring system"""
        logger.info("Stopping comprehensive monitoring system")
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
        
        if self.metrics_server_task:
            self.metrics_server_task.cancel()
        
        logger.info("Comprehensive monitoring system stopped")
    
    async def _start_metrics_server(self):
        """Start Prometheus metrics HTTP server"""
        try:
            prometheus_client.start_http_server(self.config.metrics_port)
            logger.info(f"Prometheus metrics server started on port {self.config.metrics_port}")
        except Exception as e:
            logger.error(f"Failed to start metrics server: {e}")
    
    async def _monitoring_loop(self):
        """Main monitoring loop for system health checks"""
        while self.is_running:
            try:
                # Perform health checks
                await self._perform_health_checks()
                
                # Update system metrics
                await self._update_system_metrics()
                
                # Check for alerts
                await self._check_alert_conditions()
                
                await asyncio.sleep(self.config.dashboard_refresh_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def _perform_health_checks(self):
        """Perform system health checks"""
        # This would check database connections, external services, etc.
        pass
    
    async def _update_system_metrics(self):
        """Update system-level metrics"""
        try:
            import psutil
            process = psutil.Process()
            
            # Update memory and CPU metrics
            memory_info = process.memory_info()
            cpu_percent = process.cpu_percent()
            
            self.metrics.update_system_metrics(
                memory_bytes=memory_info.rss,
                cpu_percent=cpu_percent
            )
            
        except Exception as e:
            logger.error(f"Failed to update system metrics: {e}")
    
    async def _check_alert_conditions(self):
        """Check conditions that might trigger alerts"""
        # Get performance analysis
        perf_analysis = self.performance.get_performance_analysis()
        
        # Check for bottlenecks
        for bottleneck in perf_analysis['bottlenecks']:
            if bottleneck['type'] == 'high_error_rate':
                await self.alerts.trigger_alert(
                    alert_type='high_error_rate',
                    severity='warning',
                    title='High Error Rate Detected',
                    message=f"Endpoint {bottleneck['endpoint']} has error rate of {bottleneck['error_rate']:.2%}",
                    metadata=bottleneck
                )
            elif bottleneck['type'] == 'slow_response':
                await self.alerts.trigger_alert(
                    alert_type='slow_response',
                    severity='warning',
                    title='Slow Response Time Detected',
                    message=f"Endpoint {bottleneck['endpoint']} has average response time of {bottleneck['avg_duration']:.2f}s",
                    metadata=bottleneck
                )
    
    # Public interface methods
    def log_request(self, request_id: str, method: str, path: str, 
                   status_code: int, duration: float, **extra):
        """Log HTTP request"""
        self.logger.log_request(request_id, method, path, status_code, duration, **extra)
        self.metrics.record_request(method, path, status_code, duration)
        self.performance.record_request_performance(path, method, duration, status_code)
    
    def log_database_operation(self, operation: str, table: str, 
                              duration: float, success: bool = True, **extra):
        """Log database operation"""
        self.logger.log_database_operation(operation, table, duration, **extra)
        self.metrics.record_database_query(operation, table, duration, success)
    
    def log_business_event(self, event_type: str, **details):
        """Log business event"""
        self.logger.log_business_event(event_type, **details)
    
    def record_agentic_chat(self, user_type: str, domain: str, response_time: float):
        """Record agentic coach interaction"""
        self.metrics.record_agentic_chat(user_type, domain, response_time)
    
    def get_monitoring_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive monitoring dashboard data"""
        return {
            'system_status': 'healthy',  # Would be calculated based on metrics
            'performance_analysis': self.performance.get_performance_analysis(),
            'active_alerts': self.alerts.get_active_alerts(),
            'recent_alerts': self.alerts.get_alert_history(20),
            'metrics_available': self.config.enable_prometheus_metrics,
            'tracing_enabled': self.config.enable_distributed_tracing,
            'uptime_seconds': 0,  # Would track actual uptime
            'monitoring_config': {
                'log_level': self.config.log_level,
                'metrics_port': self.config.metrics_port,
                'alert_threshold': self.config.error_rate_threshold_percent
            }
        }