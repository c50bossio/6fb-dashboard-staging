"""
Enhanced AI Performance Monitor and Cost Tracker
Comprehensive monitoring, analytics, and optimization for AI system performance
"""

import asyncio
import json
import sqlite3
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from contextlib import asynccontextmanager
import statistics
from collections import defaultdict, deque

@dataclass
class AIRequest:
    """Data class for AI request tracking"""
    id: str
    timestamp: float
    user_id: str
    barbershop_id: Optional[str]
    message: str
    message_type: str
    provider: str
    model: str
    response_time: float
    cost: float
    tokens_used: int
    quality: str
    success: bool
    from_cache: bool
    cache_type: Optional[str]
    error_message: Optional[str]
    confidence: float
    response_length: int

@dataclass
class PerformanceMetrics:
    """Performance metrics data structure"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    cache_hits: int
    total_cost: float
    total_response_time: float
    avg_response_time: float
    avg_cost_per_request: float
    cache_hit_rate: float
    success_rate: float
    quality_distribution: Dict[str, int]
    provider_distribution: Dict[str, int]
    error_rate: float
    cost_savings_from_cache: float
    peak_requests_per_minute: int
    avg_requests_per_minute: float

class AIPerformanceMonitor:
    """Enhanced AI Performance Monitor with comprehensive tracking"""
    
    def __init__(self, db_path: str = "data/ai_performance_metrics.db"):
        self.db_path = db_path
        self.request_buffer = deque(maxlen=10000)  # Buffer for real-time metrics
        self.real_time_metrics = defaultdict(int)
        self.provider_metrics = defaultdict(lambda: defaultdict(int))
        self.cost_tracking = {
            'daily_cost': 0.0,
            'monthly_cost': 0.0,
            'cost_alerts': [],
            'budget_warnings': []
        }
        
        # Performance thresholds
        self.thresholds = {
            'max_response_time': 10000,  # 10 seconds
            'min_success_rate': 0.95,    # 95%
            'max_daily_cost': 10.0,      # $10 per day
            'max_error_rate': 0.05,      # 5%
            'min_cache_hit_rate': 0.30,  # 30%
            'max_requests_per_minute': 60
        }
        
        # Alert system
        self.alerts = []
        self.alert_callbacks = []
        
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database for performance tracking"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_requests (
                    id TEXT PRIMARY KEY,
                    timestamp REAL NOT NULL,
                    user_id TEXT NOT NULL,
                    barbershop_id TEXT,
                    message TEXT NOT NULL,
                    message_type TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    response_time REAL NOT NULL,
                    cost REAL NOT NULL,
                    tokens_used INTEGER NOT NULL,
                    quality TEXT NOT NULL,
                    success BOOLEAN NOT NULL,
                    from_cache BOOLEAN NOT NULL,
                    cache_type TEXT,
                    error_message TEXT,
                    confidence REAL NOT NULL,
                    response_length INTEGER NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS performance_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    metrics_json TEXT NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cost_tracking (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    total_cost REAL NOT NULL,
                    request_count INTEGER NOT NULL,
                    avg_cost_per_request REAL NOT NULL
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL NOT NULL,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    resolved BOOLEAN DEFAULT FALSE,
                    resolution_time REAL
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON ai_requests(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_requests_provider ON ai_requests(provider)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_requests_user ON ai_requests(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_requests_barbershop ON ai_requests(barbershop_id)")
            
            conn.commit()

    async def record_request(self, request_data: Dict[str, Any]):
        """Record an AI request with comprehensive tracking"""
        request = AIRequest(
            id=request_data.get('id', f"req_{time.time()}"),
            timestamp=time.time(),
            user_id=request_data.get('user_id', 'anonymous'),
            barbershop_id=request_data.get('barbershop_id'),
            message=request_data.get('message', '')[:500],  # Truncate for storage
            message_type=request_data.get('message_type', 'general'),
            provider=request_data.get('provider', 'unknown'),
            model=request_data.get('model', 'unknown'),
            response_time=request_data.get('response_time', 0.0),
            cost=request_data.get('cost', 0.0),
            tokens_used=request_data.get('tokens_used', 0),
            quality=request_data.get('quality', 'medium'),
            success=request_data.get('success', False),
            from_cache=request_data.get('from_cache', False),
            cache_type=request_data.get('cache_type'),
            error_message=request_data.get('error_message'),
            confidence=request_data.get('confidence', 0.5),
            response_length=len(request_data.get('response', ''))
        )
        
        # Add to buffer for real-time metrics
        self.request_buffer.append(request)
        
        # Update real-time counters
        self._update_real_time_metrics(request)
        
        # Store in database
        await self._store_request(request)
        
        # Check thresholds and generate alerts
        await self._check_thresholds(request)
        
        return request.id

    def _update_real_time_metrics(self, request: AIRequest):
        """Update real-time metrics counters"""
        self.real_time_metrics['total_requests'] += 1
        
        if request.success:
            self.real_time_metrics['successful_requests'] += 1
        else:
            self.real_time_metrics['failed_requests'] += 1
            
        if request.from_cache:
            self.real_time_metrics['cache_hits'] += 1
            
        self.real_time_metrics['total_cost'] += request.cost
        self.real_time_metrics['total_response_time'] += request.response_time
        
        # Provider-specific metrics
        provider_key = f"{request.provider}_{request.model}"
        self.provider_metrics[provider_key]['requests'] += 1
        self.provider_metrics[provider_key]['cost'] += request.cost
        self.provider_metrics[provider_key]['response_time'] += request.response_time
        
        if request.success:
            self.provider_metrics[provider_key]['successes'] += 1
        else:
            self.provider_metrics[provider_key]['failures'] += 1

    async def _store_request(self, request: AIRequest):
        """Store request in database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO ai_requests VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                request.id, request.timestamp, request.user_id, request.barbershop_id,
                request.message, request.message_type, request.provider, request.model,
                request.response_time, request.cost, request.tokens_used, request.quality,
                request.success, request.from_cache, request.cache_type,
                request.error_message, request.confidence, request.response_length
            ))
            conn.commit()

    async def _check_thresholds(self, request: AIRequest):
        """Check performance thresholds and generate alerts"""
        alerts_generated = []
        
        # Response time threshold
        if request.response_time > self.thresholds['max_response_time']:
            alerts_generated.append({
                'type': 'high_response_time',
                'severity': 'warning',
                'message': f"Response time {request.response_time:.2f}ms exceeds threshold",
                'provider': request.provider,
                'request_id': request.id
            })
        
        # Cost threshold check (daily)
        daily_cost = await self._get_daily_cost()
        if daily_cost > self.thresholds['max_daily_cost']:
            alerts_generated.append({
                'type': 'high_daily_cost',
                'severity': 'critical',
                'message': f"Daily cost ${daily_cost:.2f} exceeds budget ${self.thresholds['max_daily_cost']}"
            })
        
        # Success rate check (last 100 requests)
        recent_success_rate = await self._get_recent_success_rate()
        if recent_success_rate < self.thresholds['min_success_rate']:
            alerts_generated.append({
                'type': 'low_success_rate',
                'severity': 'critical',
                'message': f"Success rate {recent_success_rate:.2%} below threshold"
            })
        
        # Cache hit rate check
        cache_hit_rate = await self._get_cache_hit_rate()
        if cache_hit_rate < self.thresholds['min_cache_hit_rate']:
            alerts_generated.append({
                'type': 'low_cache_hit_rate',
                'severity': 'warning',
                'message': f"Cache hit rate {cache_hit_rate:.2%} below optimal threshold"
            })
        
        # Store alerts
        for alert in alerts_generated:
            await self._store_alert(alert)

    async def _store_alert(self, alert: Dict[str, Any]):
        """Store alert in database and trigger callbacks"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO alerts (timestamp, alert_type, severity, message)
                VALUES (?, ?, ?, ?)
            """, (
                time.time(),
                alert['type'],
                alert['severity'],
                alert['message']
            ))
            conn.commit()
        
        # Trigger alert callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(alert)
            except Exception as e:
                print(f"Alert callback failed: {e}")

    async def get_performance_metrics(self, time_range: str = '24h') -> PerformanceMetrics:
        """Get comprehensive performance metrics"""
        since_timestamp = self._get_time_range_start(time_range)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
                    SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_requests,
                    SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cache_hits,
                    SUM(cost) as total_cost,
                    SUM(response_time) as total_response_time,
                    AVG(response_time) as avg_response_time,
                    AVG(cost) as avg_cost_per_request
                FROM ai_requests 
                WHERE timestamp > ?
            """, (since_timestamp,))
            
            basic_stats = cursor.fetchone()
            
            # Quality distribution
            cursor = conn.execute("""
                SELECT quality, COUNT(*) 
                FROM ai_requests 
                WHERE timestamp > ? 
                GROUP BY quality
            """, (since_timestamp,))
            quality_dist = dict(cursor.fetchall())
            
            # Provider distribution
            cursor = conn.execute("""
                SELECT provider, COUNT(*) 
                FROM ai_requests 
                WHERE timestamp > ? 
                GROUP BY provider
            """, (since_timestamp,))
            provider_dist = dict(cursor.fetchall())
            
            # Calculate derived metrics
            total_requests = basic_stats[0]
            successful_requests = basic_stats[1]
            cache_hits = basic_stats[3]
            total_cost = basic_stats[4] or 0.0
            
            cache_hit_rate = (cache_hits / total_requests) if total_requests > 0 else 0.0
            success_rate = (successful_requests / total_requests) if total_requests > 0 else 0.0
            error_rate = 1.0 - success_rate
            
            # Calculate cost savings from cache
            cursor = conn.execute("""
                SELECT AVG(cost) 
                FROM ai_requests 
                WHERE timestamp > ? AND from_cache = 0 AND success = 1
            """, (since_timestamp,))
            avg_api_cost = cursor.fetchone()[0] or 0.0
            cost_savings_from_cache = cache_hits * avg_api_cost
            
            # Calculate request rate metrics
            time_range_hours = (time.time() - since_timestamp) / 3600
            avg_requests_per_minute = (total_requests / (time_range_hours * 60)) if time_range_hours > 0 else 0.0
            
            # Get peak requests per minute
            peak_requests_per_minute = await self._get_peak_requests_per_minute(since_timestamp)
            
            return PerformanceMetrics(
                total_requests=total_requests,
                successful_requests=successful_requests,
                failed_requests=basic_stats[2],
                cache_hits=cache_hits,
                total_cost=total_cost,
                total_response_time=basic_stats[5] or 0.0,
                avg_response_time=basic_stats[6] or 0.0,
                avg_cost_per_request=basic_stats[7] or 0.0,
                cache_hit_rate=cache_hit_rate,
                success_rate=success_rate,
                quality_distribution=quality_dist,
                provider_distribution=provider_dist,
                error_rate=error_rate,
                cost_savings_from_cache=cost_savings_from_cache,
                peak_requests_per_minute=peak_requests_per_minute,
                avg_requests_per_minute=avg_requests_per_minute
            )

    async def get_provider_comparison(self, time_range: str = '24h') -> Dict[str, Dict[str, Any]]:
        """Get detailed provider performance comparison"""
        since_timestamp = self._get_time_range_start(time_range)
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    provider,
                    model,
                    COUNT(*) as request_count,
                    AVG(response_time) as avg_response_time,
                    AVG(cost) as avg_cost,
                    AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) as success_rate,
                    AVG(confidence) as avg_confidence,
                    AVG(response_length) as avg_response_length,
                    SUM(cost) as total_cost,
                    SUM(tokens_used) as total_tokens
                FROM ai_requests 
                WHERE timestamp > ?
                GROUP BY provider, model
                ORDER BY request_count DESC
            """, (since_timestamp,))
            
            providers = {}
            for row in cursor.fetchall():
                provider_key = f"{row[0]}_{row[1]}"
                providers[provider_key] = {
                    'provider': row[0],
                    'model': row[1],
                    'request_count': row[2],
                    'avg_response_time': row[3],
                    'avg_cost': row[4],
                    'success_rate': row[5],
                    'avg_confidence': row[6],
                    'avg_response_length': row[7],
                    'total_cost': row[8],
                    'total_tokens': row[9],
                    'cost_per_token': row[8] / row[9] if row[9] > 0 else 0.0
                }
            
            return providers

    async def get_cost_analysis(self, time_range: str = '30d') -> Dict[str, Any]:
        """Get detailed cost analysis and projections"""
        since_timestamp = self._get_time_range_start(time_range)
        
        with sqlite3.connect(self.db_path) as conn:
            # Daily cost breakdown
            cursor = conn.execute("""
                SELECT 
                    DATE(datetime(timestamp, 'unixepoch')) as date,
                    SUM(cost) as daily_cost,
                    COUNT(*) as daily_requests
                FROM ai_requests 
                WHERE timestamp > ?
                GROUP BY DATE(datetime(timestamp, 'unixepoch'))
                ORDER BY date DESC
            """, (since_timestamp,))
            
            daily_costs = [{'date': row[0], 'cost': row[1], 'requests': row[2]} 
                          for row in cursor.fetchall()]
            
            # Provider cost breakdown
            cursor = conn.execute("""
                SELECT 
                    provider,
                    SUM(cost) as total_cost,
                    COUNT(*) as request_count,
                    AVG(cost) as avg_cost_per_request
                FROM ai_requests 
                WHERE timestamp > ?
                GROUP BY provider
                ORDER BY total_cost DESC
            """, (since_timestamp,))
            
            provider_costs = [{'provider': row[0], 'total_cost': row[1], 
                             'request_count': row[2], 'avg_cost': row[3]}
                            for row in cursor.fetchall()]
            
            # Cost trend analysis
            if len(daily_costs) >= 7:
                recent_week = daily_costs[:7]
                previous_week = daily_costs[7:14] if len(daily_costs) >= 14 else []
                
                recent_avg = sum(d['cost'] for d in recent_week) / len(recent_week)
                previous_avg = sum(d['cost'] for d in previous_week) / len(previous_week) if previous_week else recent_avg
                
                cost_trend = ((recent_avg - previous_avg) / previous_avg * 100) if previous_avg > 0 else 0.0
            else:
                cost_trend = 0.0
            
            # Monthly projection
            if daily_costs:
                avg_daily_cost = sum(d['cost'] for d in daily_costs) / len(daily_costs)
                monthly_projection = avg_daily_cost * 30
            else:
                monthly_projection = 0.0
            
            return {
                'daily_costs': daily_costs,
                'provider_costs': provider_costs,
                'cost_trend_percentage': cost_trend,
                'monthly_projection': monthly_projection,
                'total_cost': sum(d['cost'] for d in daily_costs),
                'avg_daily_cost': sum(d['cost'] for d in daily_costs) / len(daily_costs) if daily_costs else 0.0
            }

    async def get_cache_performance(self) -> Dict[str, Any]:
        """Get detailed cache performance metrics"""
        with sqlite3.connect(self.db_path) as conn:
            # Overall cache stats
            cursor = conn.execute("""
                SELECT 
                    COUNT(*) as total_requests,
                    SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cache_hits,
                    SUM(CASE WHEN from_cache = 0 THEN cost ELSE 0 END) as api_cost,
                    AVG(CASE WHEN from_cache = 0 THEN cost ELSE NULL END) as avg_api_cost
                FROM ai_requests 
                WHERE timestamp > ?
            """, (time.time() - 86400,))  # Last 24 hours
            
            cache_stats = cursor.fetchone()
            total_requests, cache_hits, api_cost, avg_api_cost = cache_stats
            
            # Cache type breakdown
            cursor = conn.execute("""
                SELECT 
                    COALESCE(cache_type, 'none') as cache_type,
                    COUNT(*) as count
                FROM ai_requests 
                WHERE timestamp > ?
                GROUP BY cache_type
            """, (time.time() - 86400,))
            
            cache_types = dict(cursor.fetchall())
            
            # Calculate savings
            cache_hit_rate = (cache_hits / total_requests) if total_requests > 0 else 0.0
            estimated_savings = cache_hits * (avg_api_cost or 0.0)
            
            return {
                'cache_hit_rate': cache_hit_rate,
                'total_requests': total_requests,
                'cache_hits': cache_hits,
                'api_calls': total_requests - cache_hits,
                'cache_types': cache_types,
                'estimated_cost_savings': estimated_savings,
                'total_api_cost': api_cost,
                'potential_cost_without_cache': api_cost + estimated_savings
            }

    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active (unresolved) alerts"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT id, timestamp, alert_type, severity, message
                FROM alerts 
                WHERE resolved = 0 
                ORDER BY timestamp DESC
                LIMIT 50
            """)
            
            return [{'id': row[0], 'timestamp': row[1], 'type': row[2], 
                    'severity': row[3], 'message': row[4]}
                   for row in cursor.fetchall()]

    async def resolve_alert(self, alert_id: int):
        """Mark an alert as resolved"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                UPDATE alerts 
                SET resolved = 1, resolution_time = ?
                WHERE id = ?
            """, (time.time(), alert_id))
            conn.commit()

    def add_alert_callback(self, callback):
        """Add callback function for real-time alerts"""
        self.alert_callbacks.append(callback)

    def _get_time_range_start(self, time_range: str) -> float:
        """Convert time range string to timestamp"""
        now = time.time()
        
        if time_range == '1h':
            return now - 3600
        elif time_range == '24h' or time_range == '1d':
            return now - 86400
        elif time_range == '7d':
            return now - (7 * 86400)
        elif time_range == '30d':
            return now - (30 * 86400)
        else:
            return now - 86400  # Default to 24h

    async def _get_daily_cost(self) -> float:
        """Get today's total cost"""
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).timestamp()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT SUM(cost) FROM ai_requests 
                WHERE timestamp > ?
            """, (start_of_day,))
            
            result = cursor.fetchone()[0]
            return result if result else 0.0

    async def _get_recent_success_rate(self, limit: int = 100) -> float:
        """Get success rate for recent requests"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT AVG(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END)
                FROM (
                    SELECT success FROM ai_requests 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                )
            """, (limit,))
            
            result = cursor.fetchone()[0]
            return result if result else 0.0

    async def _get_cache_hit_rate(self, limit: int = 100) -> float:
        """Get cache hit rate for recent requests"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT AVG(CASE WHEN from_cache = 1 THEN 1.0 ELSE 0.0 END)
                FROM (
                    SELECT from_cache FROM ai_requests 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                )
            """, (limit,))
            
            result = cursor.fetchone()[0]
            return result if result else 0.0

    async def _get_peak_requests_per_minute(self, since_timestamp: float) -> int:
        """Calculate peak requests per minute in the given time range"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                SELECT 
                    CAST(timestamp / 60 AS INTEGER) * 60 as minute_start,
                    COUNT(*) as requests_in_minute
                FROM ai_requests 
                WHERE timestamp > ?
                GROUP BY CAST(timestamp / 60 AS INTEGER)
                ORDER BY requests_in_minute DESC
                LIMIT 1
            """, (since_timestamp,))
            
            result = cursor.fetchone()
            return result[1] if result else 0

    async def export_metrics(self, format: str = 'json', time_range: str = '24h') -> str:
        """Export performance metrics in specified format"""
        metrics = await self.get_performance_metrics(time_range)
        provider_comparison = await self.get_provider_comparison(time_range)
        cost_analysis = await self.get_cost_analysis(time_range)
        cache_performance = await self.get_cache_performance()
        
        export_data = {
            'metrics': asdict(metrics),
            'provider_comparison': provider_comparison,
            'cost_analysis': cost_analysis,
            'cache_performance': cache_performance,
            'export_timestamp': time.time(),
            'time_range': time_range
        }
        
        if format.lower() == 'json':
            return json.dumps(export_data, indent=2)
        else:
            raise ValueError(f"Unsupported export format: {format}")

# Global instance
performance_monitor = AIPerformanceMonitor()