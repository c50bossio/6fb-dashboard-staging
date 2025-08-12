#!/usr/bin/env python3
"""
Comprehensive AI Performance Monitoring and Benchmarking System
Real-time metrics collection, analysis, and optimization for 6FB AI System
"""

import asyncio
import json
import logging
import time
import statistics
import sqlite3
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from contextlib import asynccontextmanager
from collections import defaultdict, deque
import numpy as np
from threading import Lock

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIProvider(Enum):
    """AI Model Providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic" 
    GOOGLE = "google"

class ModelType(Enum):
    """Specific AI Models"""
    GPT_5 = "gpt-5"
    GPT_5_MINI = "gpt-5-mini"
    GPT_5_NANO = "gpt-5-nano"
    CLAUDE_OPUS_4_1 = "claude-opus-4-1-20250805"
    GEMINI_2_0_FLASH = "gemini-2.0-flash-exp"

class PerformanceStatus(Enum):
    """Performance Health Status"""
    EXCELLENT = "excellent"    # >95% optimal
    GOOD = "good"             # 85-95% optimal  
    DEGRADED = "degraded"     # 70-85% optimal
    POOR = "poor"             # 50-70% optimal
    CRITICAL = "critical"     # <50% optimal

class MetricType(Enum):
    """Performance Metric Categories"""
    RESPONSE_TIME = "response_time"
    TOKEN_THROUGHPUT = "token_throughput"
    SUCCESS_RATE = "success_rate"
    ERROR_RATE = "error_rate"
    COST_PER_REQUEST = "cost_per_request"
    CONFIDENCE_SCORE = "confidence_score"
    CONTEXT_ACCURACY = "context_accuracy"
    BUSINESS_RELEVANCE = "business_relevance"
    USER_SATISFACTION = "user_satisfaction"
    CACHE_HIT_RATE = "cache_hit_rate"
    CONCURRENT_REQUESTS = "concurrent_requests"
    MEMORY_USAGE = "memory_usage"
    CPU_USAGE = "cpu_usage"
    API_LATENCY = "api_latency"

class AlertSeverity(Enum):
    """Alert Severity Levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class PerformanceMetric:
    """Individual performance measurement"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
    provider: AIProvider = None
    model: ModelType = None
    metric_type: MetricType = None
    value: float = 0.0
    unit: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    session_id: str = ""
    user_id: str = ""
    request_context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ModelPerformanceSnapshot:
    """Complete performance snapshot for a model"""
    model: ModelType
    provider: AIProvider
    timestamp: datetime
    
    # Core Performance Metrics
    avg_response_time: float = 0.0
    p95_response_time: float = 0.0
    p99_response_time: float = 0.0
    success_rate: float = 0.0
    error_rate: float = 0.0
    
    # Quality Metrics
    avg_confidence: float = 0.0
    context_accuracy: float = 0.0
    business_relevance: float = 0.0
    
    # Efficiency Metrics
    tokens_per_second: float = 0.0
    cost_per_token: float = 0.0
    cache_hit_rate: float = 0.0
    
    # Resource Metrics
    memory_usage_mb: float = 0.0
    cpu_utilization: float = 0.0
    concurrent_requests: int = 0
    
    # Business Metrics
    user_satisfaction: float = 0.0
    conversion_rate: float = 0.0
    
    overall_score: float = 0.0
    status: PerformanceStatus = PerformanceStatus.GOOD
    
@dataclass
class PerformanceAlert:
    """Performance degradation alert"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
    severity: AlertSeverity = AlertSeverity.INFO
    title: str = ""
    description: str = ""
    model: Optional[ModelType] = None
    provider: Optional[AIProvider] = None
    metric_type: MetricType = None
    current_value: float = 0.0
    threshold_value: float = 0.0
    suggested_actions: List[str] = field(default_factory=list)
    resolved: bool = False
    resolution_time: Optional[datetime] = None

@dataclass
class ABTestConfiguration:
    """A/B test configuration for model comparison"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    model_a: ModelType = None
    model_b: ModelType = None
    traffic_split: float = 0.5  # 0.0 to 1.0
    start_time: datetime = field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    active: bool = True
    success_criteria: Dict[str, float] = field(default_factory=dict)
    
@dataclass
class CostOptimizationRecommendation:
    """Cost optimization recommendation"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.utcnow)
    title: str = ""
    description: str = ""
    current_cost: float = 0.0
    potential_savings: float = 0.0
    savings_percentage: float = 0.0
    action_required: str = ""
    risk_level: str = "low"  # low, medium, high
    estimated_impact: Dict[str, float] = field(default_factory=dict)

class AIPerformanceMonitor:
    """Comprehensive AI Performance Monitoring System"""
    
    def __init__(self, db_path: str = "data/ai_performance_metrics.db"):
        self.db_path = db_path
        self.metrics_buffer = deque(maxlen=10000)  # In-memory buffer for real-time metrics
        self.model_snapshots = {}  # Latest performance snapshots
        self.active_alerts = {}   # Active performance alerts
        self.ab_tests = {}        # Active A/B tests
        self.cost_tracking = defaultdict(float)  # Cost tracking by model
        self.performance_thresholds = self._get_default_thresholds()
        self.buffer_lock = Lock()
        
        # Initialize database
        self._init_database()
        
        # Start background monitoring tasks
        self.monitoring_tasks = []
        
    def _get_default_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Get default performance thresholds"""
        return {
            "response_time": {
                "excellent": 1.0,    # < 1 second
                "good": 3.0,         # < 3 seconds
                "degraded": 8.0,     # < 8 seconds
                "poor": 15.0,        # < 15 seconds
                "critical": 30.0     # > 30 seconds
            },
            "success_rate": {
                "excellent": 0.99,   # > 99%
                "good": 0.95,        # > 95%
                "degraded": 0.90,    # > 90%
                "poor": 0.80,        # > 80%
                "critical": 0.70     # < 70%
            },
            "confidence_score": {
                "excellent": 0.95,   # > 95%
                "good": 0.85,        # > 85%
                "degraded": 0.75,    # > 75%
                "poor": 0.60,        # > 60%
                "critical": 0.50     # < 50%
            },
            "cost_per_request": {
                "excellent": 0.01,   # < $0.01
                "good": 0.05,        # < $0.05
                "degraded": 0.10,    # < $0.10
                "poor": 0.20,        # < $0.20
                "critical": 0.50     # > $0.50
            }
        }
    
    def _init_database(self):
        """Initialize SQLite database for metrics storage"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Performance metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id TEXT PRIMARY KEY,
                    timestamp REAL NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    metric_type TEXT NOT NULL,
                    value REAL NOT NULL,
                    unit TEXT,
                    metadata TEXT,
                    session_id TEXT,
                    user_id TEXT,
                    request_context TEXT
                )
            ''')
            
            # Model snapshots table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS model_snapshots (
                    id TEXT PRIMARY KEY,
                    model TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    snapshot_data TEXT NOT NULL,
                    overall_score REAL,
                    status TEXT
                )
            ''')
            
            # Performance alerts table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS performance_alerts (
                    id TEXT PRIMARY KEY,
                    timestamp REAL NOT NULL,
                    severity TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    model TEXT,
                    provider TEXT,
                    metric_type TEXT,
                    current_value REAL,
                    threshold_value REAL,
                    suggested_actions TEXT,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolution_time REAL
                )
            ''')
            
            # A/B tests table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ab_tests (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    model_a TEXT NOT NULL,
                    model_b TEXT NOT NULL,
                    traffic_split REAL,
                    start_time REAL NOT NULL,
                    end_time REAL,
                    active BOOLEAN DEFAULT TRUE,
                    success_criteria TEXT,
                    results TEXT
                )
            ''')
            
            # Cost tracking table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS cost_tracking (
                    id TEXT PRIMARY KEY,
                    timestamp REAL NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    cost_type TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    request_id TEXT,
                    tokens_used INTEGER,
                    metadata TEXT
                )
            ''')
            
            # Create indexes for better query performance
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_metrics_model ON performance_metrics(model)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON model_snapshots(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON performance_alerts(timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_cost_timestamp ON cost_tracking(timestamp)')
            
            conn.commit()
    
    async def record_metric(self, metric: PerformanceMetric) -> bool:
        """Record a performance metric"""
        try:
            # Add to in-memory buffer for real-time processing
            with self.buffer_lock:
                self.metrics_buffer.append(metric)
            
            # Store in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO performance_metrics 
                    (id, timestamp, provider, model, metric_type, value, unit, 
                     metadata, session_id, user_id, request_context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    metric.id,
                    metric.timestamp.timestamp(),
                    metric.provider.value if metric.provider else None,
                    metric.model.value if metric.model else None,
                    metric.metric_type.value if metric.metric_type else None,
                    metric.value,
                    metric.unit,
                    json.dumps(metric.metadata),
                    metric.session_id,
                    metric.user_id,
                    json.dumps(metric.request_context)
                ))
                conn.commit()
            
            # Check for performance alerts
            await self._check_performance_alerts(metric)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to record metric: {e}")
            return False
    
    async def record_ai_request(self, 
                               provider: AIProvider,
                               model: ModelType, 
                               start_time: float,
                               end_time: float,
                               success: bool,
                               tokens_used: int = 0,
                               cost: float = 0.0,
                               confidence_score: float = 0.0,
                               context_data: Dict[str, Any] = None,
                               session_id: str = "",
                               user_id: str = "") -> str:
        """Record comprehensive AI request metrics"""
        
        request_id = str(uuid.uuid4())
        response_time = end_time - start_time
        
        if context_data is None:
            context_data = {}
        
        # Record response time
        await self.record_metric(PerformanceMetric(
            provider=provider,
            model=model,
            metric_type=MetricType.RESPONSE_TIME,
            value=response_time,
            unit="seconds",
            session_id=session_id,
            user_id=user_id,
            request_context=context_data,
            metadata={"request_id": request_id, "tokens_used": tokens_used}
        ))
        
        # Record success/error rate
        await self.record_metric(PerformanceMetric(
            provider=provider,
            model=model,
            metric_type=MetricType.SUCCESS_RATE if success else MetricType.ERROR_RATE,
            value=1.0,
            unit="count",
            session_id=session_id,
            user_id=user_id,
            request_context=context_data,
            metadata={"request_id": request_id, "success": success}
        ))
        
        # Record token throughput
        if tokens_used > 0:
            tokens_per_second = tokens_used / response_time if response_time > 0 else 0
            await self.record_metric(PerformanceMetric(
                provider=provider,
                model=model,
                metric_type=MetricType.TOKEN_THROUGHPUT,
                value=tokens_per_second,
                unit="tokens/second",
                session_id=session_id,
                user_id=user_id,
                request_context=context_data,
                metadata={"request_id": request_id, "total_tokens": tokens_used}
            ))
        
        # Record cost
        if cost > 0:
            await self.record_metric(PerformanceMetric(
                provider=provider,
                model=model,
                metric_type=MetricType.COST_PER_REQUEST,
                value=cost,
                unit="USD",
                session_id=session_id,
                user_id=user_id,
                request_context=context_data,
                metadata={"request_id": request_id, "tokens_used": tokens_used}
            ))
            
            # Track cost in database
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO cost_tracking 
                    (id, timestamp, provider, model, cost_type, amount, request_id, tokens_used, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    str(uuid.uuid4()),
                    datetime.utcnow().timestamp(),
                    provider.value,
                    model.value,
                    "api_request",
                    cost,
                    request_id,
                    tokens_used,
                    json.dumps(context_data)
                ))
                conn.commit()
        
        # Record confidence score
        if confidence_score > 0:
            await self.record_metric(PerformanceMetric(
                provider=provider,
                model=model,
                metric_type=MetricType.CONFIDENCE_SCORE,
                value=confidence_score,
                unit="score",
                session_id=session_id,
                user_id=user_id,
                request_context=context_data,
                metadata={"request_id": request_id}
            ))
        
        return request_id
    
    async def get_model_performance_snapshot(self, 
                                           model: ModelType, 
                                           provider: AIProvider,
                                           time_window_hours: int = 24) -> ModelPerformanceSnapshot:
        """Get comprehensive performance snapshot for a model"""
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=time_window_hours)
        
        # Query metrics from database
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT metric_type, value, metadata 
                FROM performance_metrics 
                WHERE model = ? AND provider = ? 
                AND timestamp BETWEEN ? AND ?
                ORDER BY timestamp DESC
            ''', (model.value, provider.value, start_time.timestamp(), end_time.timestamp()))
            
            metrics = cursor.fetchall()
        
        # Process metrics
        response_times = []
        success_count = 0
        error_count = 0
        confidence_scores = []
        costs = []
        token_throughputs = []
        
        for metric_type, value, metadata_str in metrics:
            metadata = json.loads(metadata_str) if metadata_str else {}
            
            if metric_type == MetricType.RESPONSE_TIME.value:
                response_times.append(value)
            elif metric_type == MetricType.SUCCESS_RATE.value:
                success_count += 1
            elif metric_type == MetricType.ERROR_RATE.value:
                error_count += 1
            elif metric_type == MetricType.CONFIDENCE_SCORE.value:
                confidence_scores.append(value)
            elif metric_type == MetricType.COST_PER_REQUEST.value:
                costs.append(value)
            elif metric_type == MetricType.TOKEN_THROUGHPUT.value:
                token_throughputs.append(value)
        
        # Calculate statistics
        total_requests = success_count + error_count
        
        snapshot = ModelPerformanceSnapshot(
            model=model,
            provider=provider,
            timestamp=end_time,
            avg_response_time=statistics.mean(response_times) if response_times else 0.0,
            p95_response_time=np.percentile(response_times, 95) if response_times else 0.0,
            p99_response_time=np.percentile(response_times, 99) if response_times else 0.0,
            success_rate=success_count / total_requests if total_requests > 0 else 0.0,
            error_rate=error_count / total_requests if total_requests > 0 else 0.0,
            avg_confidence=statistics.mean(confidence_scores) if confidence_scores else 0.0,
            tokens_per_second=statistics.mean(token_throughputs) if token_throughputs else 0.0,
            cost_per_token=statistics.mean(costs) if costs else 0.0,
        )
        
        # Calculate overall score
        snapshot.overall_score = self._calculate_overall_score(snapshot)
        snapshot.status = self._determine_status(snapshot.overall_score)
        
        # Store snapshot
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO model_snapshots 
                (id, model, provider, timestamp, snapshot_data, overall_score, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                str(uuid.uuid4()),
                model.value,
                provider.value,
                end_time.timestamp(),
                json.dumps(asdict(snapshot)),
                snapshot.overall_score,
                snapshot.status.value
            ))
            conn.commit()
        
        # Update in-memory cache
        self.model_snapshots[f"{provider.value}_{model.value}"] = snapshot
        
        return snapshot
    
    def _calculate_overall_score(self, snapshot: ModelPerformanceSnapshot) -> float:
        """Calculate overall performance score (0-100)"""
        
        # Weights for different metrics
        weights = {
            'response_time': 0.25,
            'success_rate': 0.25,
            'confidence': 0.20,
            'cost_efficiency': 0.15,
            'throughput': 0.15
        }
        
        scores = {}
        
        # Response time score (inverse relationship)
        if snapshot.avg_response_time > 0:
            response_time_score = max(0, 100 - (snapshot.avg_response_time * 10))
            scores['response_time'] = min(100, response_time_score)
        else:
            scores['response_time'] = 100
        
        # Success rate score
        scores['success_rate'] = snapshot.success_rate * 100
        
        # Confidence score
        scores['confidence'] = snapshot.avg_confidence * 100
        
        # Cost efficiency score (inverse relationship)
        if snapshot.cost_per_token > 0:
            cost_score = max(0, 100 - (snapshot.cost_per_token * 2000))  # Assuming $0.05 as baseline
            scores['cost_efficiency'] = min(100, cost_score)
        else:
            scores['cost_efficiency'] = 100
        
        # Throughput score
        throughput_score = min(100, snapshot.tokens_per_second * 2)  # Assuming 50 tokens/sec as max
        scores['throughput'] = throughput_score
        
        # Calculate weighted average
        overall_score = sum(scores[metric] * weights[metric] for metric in weights.keys())
        
        return round(overall_score, 2)
    
    def _determine_status(self, score: float) -> PerformanceStatus:
        """Determine performance status based on overall score"""
        if score >= 95:
            return PerformanceStatus.EXCELLENT
        elif score >= 85:
            return PerformanceStatus.GOOD
        elif score >= 70:
            return PerformanceStatus.DEGRADED
        elif score >= 50:
            return PerformanceStatus.POOR
        else:
            return PerformanceStatus.CRITICAL
    
    async def _check_performance_alerts(self, metric: PerformanceMetric):
        """Check if metric triggers any performance alerts"""
        
        alert_triggered = False
        alert_severity = AlertSeverity.INFO
        alert_description = ""
        suggested_actions = []
        
        metric_type = metric.metric_type.value
        value = metric.value
        
        # Check response time alerts
        if metric_type == MetricType.RESPONSE_TIME.value:
            thresholds = self.performance_thresholds["response_time"]
            if value > thresholds["critical"]:
                alert_triggered = True
                alert_severity = AlertSeverity.CRITICAL
                alert_description = f"Response time critically high: {value:.2f}s"
                suggested_actions = [
                    "Switch to faster model",
                    "Implement response caching",
                    "Reduce context window size",
                    "Check API endpoint health"
                ]
            elif value > thresholds["poor"]:
                alert_triggered = True
                alert_severity = AlertSeverity.ERROR
                alert_description = f"Response time degraded: {value:.2f}s"
                suggested_actions = [
                    "Consider model optimization",
                    "Review prompt complexity",
                    "Check network latency"
                ]
            elif value > thresholds["degraded"]:
                alert_triggered = True
                alert_severity = AlertSeverity.WARNING
                alert_description = f"Response time above optimal: {value:.2f}s"
                suggested_actions = [
                    "Monitor for continued degradation",
                    "Consider prompt optimization"
                ]
        
        # Check success rate alerts
        elif metric_type == MetricType.SUCCESS_RATE.value:
            # Calculate recent success rate
            recent_success_rate = await self._calculate_recent_success_rate(
                metric.provider, metric.model, minutes=10
            )
            
            thresholds = self.performance_thresholds["success_rate"]
            if recent_success_rate < thresholds["critical"]:
                alert_triggered = True
                alert_severity = AlertSeverity.CRITICAL
                alert_description = f"Success rate critically low: {recent_success_rate:.1%}"
                suggested_actions = [
                    "Switch to backup model",
                    "Check API key validity",
                    "Verify network connectivity",
                    "Review recent prompt changes"
                ]
        
        # Create alert if triggered
        if alert_triggered:
            alert = PerformanceAlert(
                severity=alert_severity,
                title=f"{metric.model.value} Performance Alert",
                description=alert_description,
                model=metric.model,
                provider=metric.provider,
                metric_type=metric.metric_type,
                current_value=value,
                suggested_actions=suggested_actions
            )
            
            await self._create_alert(alert)
    
    async def _calculate_recent_success_rate(self, 
                                           provider: AIProvider, 
                                           model: ModelType, 
                                           minutes: int = 10) -> float:
        """Calculate success rate for recent time window"""
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(minutes=minutes)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Count successes
            cursor.execute('''
                SELECT COUNT(*) FROM performance_metrics 
                WHERE provider = ? AND model = ? 
                AND metric_type = ? AND timestamp BETWEEN ? AND ?
            ''', (provider.value, model.value, MetricType.SUCCESS_RATE.value, 
                  start_time.timestamp(), end_time.timestamp()))
            success_count = cursor.fetchone()[0]
            
            # Count errors
            cursor.execute('''
                SELECT COUNT(*) FROM performance_metrics 
                WHERE provider = ? AND model = ? 
                AND metric_type = ? AND timestamp BETWEEN ? AND ?
            ''', (provider.value, model.value, MetricType.ERROR_RATE.value, 
                  start_time.timestamp(), end_time.timestamp()))
            error_count = cursor.fetchone()[0]
        
        total_requests = success_count + error_count
        return success_count / total_requests if total_requests > 0 else 1.0
    
    async def _create_alert(self, alert: PerformanceAlert):
        """Create and store a performance alert"""
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO performance_alerts 
                (id, timestamp, severity, title, description, model, provider, 
                 metric_type, current_value, threshold_value, suggested_actions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.id,
                alert.timestamp.timestamp(),
                alert.severity.value,
                alert.title,
                alert.description,
                alert.model.value if alert.model else None,
                alert.provider.value if alert.provider else None,
                alert.metric_type.value if alert.metric_type else None,
                alert.current_value,
                alert.threshold_value,
                json.dumps(alert.suggested_actions)
            ))
            conn.commit()
        
        # Add to active alerts
        self.active_alerts[alert.id] = alert
        
        # Log alert
        logger.warning(f"Performance Alert: {alert.title} - {alert.description}")
    
    async def get_cost_analysis(self, time_window_hours: int = 24) -> Dict[str, Any]:
        """Get comprehensive cost analysis"""
        
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=time_window_hours)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Total cost by provider
            cursor.execute('''
                SELECT provider, SUM(amount) as total_cost, COUNT(*) as request_count
                FROM cost_tracking 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY provider
            ''', (start_time.timestamp(), end_time.timestamp()))
            provider_costs = cursor.fetchall()
            
            # Total cost by model
            cursor.execute('''
                SELECT model, SUM(amount) as total_cost, COUNT(*) as request_count
                FROM cost_tracking 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY model
            ''', (start_time.timestamp(), end_time.timestamp()))
            model_costs = cursor.fetchall()
            
            # Hourly cost trend
            cursor.execute('''
                SELECT 
                    strftime('%Y-%m-%d %H:00:00', datetime(timestamp, 'unixepoch')) as hour,
                    SUM(amount) as hourly_cost
                FROM cost_tracking 
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY hour
                ORDER BY hour
            ''', (start_time.timestamp(), end_time.timestamp()))
            hourly_costs = cursor.fetchall()
        
        # Calculate total cost
        total_cost = sum(cost for _, cost, _ in provider_costs)
        
        # Generate optimization recommendations
        optimization_recommendations = await self._generate_cost_optimizations(
            provider_costs, model_costs, time_window_hours
        )
        
        return {
            "time_window_hours": time_window_hours,
            "total_cost": total_cost,
            "provider_breakdown": [
                {"provider": provider, "cost": cost, "requests": count}
                for provider, cost, count in provider_costs
            ],
            "model_breakdown": [
                {"model": model, "cost": cost, "requests": count}
                for model, cost, count in model_costs
            ],
            "hourly_trend": [
                {"hour": hour, "cost": cost}
                for hour, cost in hourly_costs
            ],
            "optimization_recommendations": optimization_recommendations
        }
    
    async def _generate_cost_optimizations(self, 
                                         provider_costs: List[Tuple], 
                                         model_costs: List[Tuple],
                                         time_window_hours: int) -> List[CostOptimizationRecommendation]:
        """Generate cost optimization recommendations"""
        
        recommendations = []
        
        # Sort models by cost
        model_costs_sorted = sorted(model_costs, key=lambda x: x[1], reverse=True)
        
        if len(model_costs_sorted) >= 2:
            highest_cost_model = model_costs_sorted[0]
            model_name, cost, request_count = highest_cost_model
            
            # Check if switching to a cheaper model could save money
            for cheaper_model, cheaper_cost, cheaper_requests in model_costs_sorted[1:]:
                if cheaper_cost < cost and cheaper_requests > 0:
                    # Calculate potential savings
                    cost_per_request_current = cost / request_count if request_count > 0 else 0
                    cost_per_request_cheaper = cheaper_cost / cheaper_requests if cheaper_requests > 0 else 0
                    
                    if cost_per_request_current > cost_per_request_cheaper:
                        potential_savings = (cost_per_request_current - cost_per_request_cheaper) * request_count
                        savings_percentage = (potential_savings / cost) * 100 if cost > 0 else 0
                        
                        if savings_percentage > 10:  # Only recommend if > 10% savings
                            recommendations.append(CostOptimizationRecommendation(
                                title=f"Switch from {model_name} to {cheaper_model}",
                                description=f"Reduce per-request cost from ${cost_per_request_current:.4f} to ${cost_per_request_cheaper:.4f}",
                                current_cost=cost,
                                potential_savings=potential_savings,
                                savings_percentage=savings_percentage,
                                action_required=f"Implement A/B test comparing {model_name} vs {cheaper_model}",
                                risk_level="medium" if savings_percentage > 30 else "low",
                                estimated_impact={
                                    "monthly_savings": potential_savings * (30 * 24 / time_window_hours),
                                    "performance_impact": "requires_testing"
                                }
                            ))
                            break
        
        # Check for caching opportunities
        total_requests = sum(count for _, _, count in model_costs)
        if total_requests > 100:  # Only for high-volume usage
            cache_potential_savings = sum(cost for _, cost, _ in model_costs) * 0.15  # Assume 15% cache hit rate
            
            recommendations.append(CostOptimizationRecommendation(
                title="Implement Response Caching",
                description="Cache frequent AI responses to reduce API calls",
                current_cost=sum(cost for _, cost, _ in model_costs),
                potential_savings=cache_potential_savings,
                savings_percentage=15.0,
                action_required="Implement LRU cache for common queries",
                risk_level="low",
                estimated_impact={
                    "monthly_savings": cache_potential_savings * (30 * 24 / time_window_hours),
                    "performance_impact": "improved_response_time"
                }
            ))
        
        return recommendations
    
    async def start_ab_test(self, config: ABTestConfiguration) -> str:
        """Start an A/B test for model comparison"""
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO ab_tests 
                (id, name, description, model_a, model_b, traffic_split, 
                 start_time, end_time, active, success_criteria)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                config.id,
                config.name,
                config.description,
                config.model_a.value,
                config.model_b.value,
                config.traffic_split,
                config.start_time.timestamp(),
                config.end_time.timestamp() if config.end_time else None,
                config.active,
                json.dumps(config.success_criteria)
            ))
            conn.commit()
        
        # Add to active tests
        self.ab_tests[config.id] = config
        
        logger.info(f"Started A/B test: {config.name} ({config.model_a.value} vs {config.model_b.value})")
        
        return config.id
    
    async def get_ab_test_results(self, test_id: str) -> Dict[str, Any]:
        """Get A/B test results and analysis"""
        
        if test_id not in self.ab_tests:
            raise ValueError(f"A/B test {test_id} not found")
        
        config = self.ab_tests[test_id]
        
        # Get performance snapshots for both models
        snapshot_a = await self.get_model_performance_snapshot(
            config.model_a, 
            AIProvider.OPENAI  # Assuming OpenAI for now, could be dynamic
        )
        snapshot_b = await self.get_model_performance_snapshot(
            config.model_b,
            AIProvider.OPENAI
        )
        
        # Compare metrics
        comparison = {
            "test_id": test_id,
            "test_name": config.name,
            "model_a": config.model_a.value,
            "model_b": config.model_b.value,
            "duration_hours": (datetime.utcnow() - config.start_time).total_seconds() / 3600,
            "comparison": {
                "response_time": {
                    "model_a": snapshot_a.avg_response_time,
                    "model_b": snapshot_b.avg_response_time,
                    "winner": config.model_a.value if snapshot_a.avg_response_time < snapshot_b.avg_response_time else config.model_b.value
                },
                "success_rate": {
                    "model_a": snapshot_a.success_rate,
                    "model_b": snapshot_b.success_rate,
                    "winner": config.model_a.value if snapshot_a.success_rate > snapshot_b.success_rate else config.model_b.value
                },
                "confidence": {
                    "model_a": snapshot_a.avg_confidence,
                    "model_b": snapshot_b.avg_confidence,
                    "winner": config.model_a.value if snapshot_a.avg_confidence > snapshot_b.avg_confidence else config.model_b.value
                },
                "cost_efficiency": {
                    "model_a": snapshot_a.cost_per_token,
                    "model_b": snapshot_b.cost_per_token,
                    "winner": config.model_a.value if snapshot_a.cost_per_token < snapshot_b.cost_per_token else config.model_b.value
                },
                "overall_score": {
                    "model_a": snapshot_a.overall_score,
                    "model_b": snapshot_b.overall_score,
                    "winner": config.model_a.value if snapshot_a.overall_score > snapshot_b.overall_score else config.model_b.value
                }
            }
        }
        
        # Determine overall winner
        model_a_wins = sum(1 for metric in comparison["comparison"].values() 
                          if metric["winner"] == config.model_a.value)
        model_b_wins = sum(1 for metric in comparison["comparison"].values() 
                          if metric["winner"] == config.model_b.value)
        
        comparison["overall_winner"] = config.model_a.value if model_a_wins > model_b_wins else config.model_b.value
        comparison["confidence_level"] = abs(model_a_wins - model_b_wins) / len(comparison["comparison"])
        
        return comparison
    
    async def get_real_time_dashboard_data(self) -> Dict[str, Any]:
        """Get real-time dashboard data for monitoring"""
        
        current_time = datetime.utcnow()
        
        # Get recent metrics from buffer
        recent_metrics = []
        with self.buffer_lock:
            recent_metrics = list(self.metrics_buffer)[-100:]  # Last 100 metrics
        
        # Group by model
        model_metrics = defaultdict(list)
        for metric in recent_metrics:
            if metric.model and metric.provider:
                key = f"{metric.provider.value}_{metric.model.value}"
                model_metrics[key].append(metric)
        
        # Calculate real-time stats
        model_stats = {}
        for model_key, metrics in model_metrics.items():
            response_times = [m.value for m in metrics if m.metric_type == MetricType.RESPONSE_TIME]
            success_count = len([m for m in metrics if m.metric_type == MetricType.SUCCESS_RATE])
            error_count = len([m for m in metrics if m.metric_type == MetricType.ERROR_RATE])
            
            model_stats[model_key] = {
                "avg_response_time": statistics.mean(response_times) if response_times else 0.0,
                "recent_requests": len(metrics),
                "success_rate": success_count / (success_count + error_count) if (success_count + error_count) > 0 else 0.0,
                "last_updated": current_time.isoformat()
            }
        
        # Get active alerts
        active_alerts_list = [
            {
                "id": alert.id,
                "severity": alert.severity.value,
                "title": alert.title,
                "description": alert.description,
                "timestamp": alert.timestamp.isoformat(),
                "model": alert.model.value if alert.model else None
            }
            for alert in self.active_alerts.values()
            if not alert.resolved
        ]
        
        return {
            "timestamp": current_time.isoformat(),
            "model_stats": model_stats,
            "active_alerts": active_alerts_list,
            "total_requests_last_hour": len(recent_metrics),
            "system_health": "healthy" if len(active_alerts_list) == 0 else "degraded"
        }
    
    async def start_monitoring(self):
        """Start background monitoring tasks"""
        
        async def periodic_snapshots():
            """Generate performance snapshots periodically"""
            while True:
                try:
                    # Generate snapshots for all models
                    for provider in AIProvider:
                        for model in ModelType:
                            await self.get_model_performance_snapshot(model, provider)
                    
                    await asyncio.sleep(300)  # Every 5 minutes
                except Exception as e:
                    logger.error(f"Error in periodic snapshots: {e}")
                    await asyncio.sleep(60)
        
        async def alert_cleanup():
            """Clean up old resolved alerts"""
            while True:
                try:
                    cutoff_time = datetime.utcnow() - timedelta(hours=24)
                    
                    with sqlite3.connect(self.db_path) as conn:
                        cursor = conn.cursor()
                        cursor.execute('''
                            DELETE FROM performance_alerts 
                            WHERE resolved = TRUE AND timestamp < ?
                        ''', (cutoff_time.timestamp(),))
                        conn.commit()
                    
                    await asyncio.sleep(3600)  # Every hour
                except Exception as e:
                    logger.error(f"Error in alert cleanup: {e}")
                    await asyncio.sleep(300)
        
        # Start monitoring tasks
        self.monitoring_tasks = [
            asyncio.create_task(periodic_snapshots()),
            asyncio.create_task(alert_cleanup())
        ]
        
        logger.info("AI Performance Monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks"""
        for task in self.monitoring_tasks:
            task.cancel()
        
        await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        logger.info("AI Performance Monitoring stopped")

# Global instance
ai_performance_monitor = AIPerformanceMonitor()