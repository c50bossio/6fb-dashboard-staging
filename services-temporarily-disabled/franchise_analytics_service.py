"""
Franchise Analytics Service
Advanced analytics and benchmarking system for multi-location franchise networks
Provides real-time insights, performance comparisons, and predictive analytics
"""

import os
import sqlite3
import json
import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import decimal
import statistics
import logging
from contextual import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==========================================
# ENUMS AND DATA MODELS
# ==========================================

class MetricCategory(Enum):
    REVENUE = "REVENUE"
    CUSTOMER_SATISFACTION = "CUSTOMER_SATISFACTION"
    OPERATIONAL_EFFICIENCY = "OPERATIONAL_EFFICIENCY"
    STAFF_PERFORMANCE = "STAFF_PERFORMANCE"
    CUSTOMER_ACQUISITION = "CUSTOMER_ACQUISITION"
    RETENTION = "RETENTION"

class TimeframeType(Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    QUARTERLY = "QUARTERLY"
    YEARLY = "YEARLY"

class BenchmarkType(Enum):
    FRANCHISE_AVERAGE = "FRANCHISE_AVERAGE"
    TOP_QUARTILE = "TOP_QUARTILE"
    INDUSTRY_STANDARD = "INDUSTRY_STANDARD"
    PEER_GROUP = "PEER_GROUP"

@dataclass
class AnalyticsMetric:
    """Individual analytics metric"""
    id: str
    franchise_id: str
    location_id: Optional[str]
    category: MetricCategory
    metric_name: str
    metric_value: decimal.Decimal
    timeframe: TimeframeType
    period_start: date
    period_end: date
    benchmark_value: Optional[decimal.Decimal] = None
    benchmark_type: Optional[BenchmarkType] = None
    variance_percentage: Optional[decimal.Decimal] = None
    rank: Optional[int] = None
    total_locations: Optional[int] = None
    additional_data: Dict[str, Any] = None
    calculated_at: Optional[datetime] = None

    def __post_init__(self):
        if self.additional_data is None:
            self.additional_data = {}
        if self.calculated_at is None:
            self.calculated_at = datetime.utcnow()

@dataclass
class BenchmarkResult:
    """Benchmark comparison result"""
    location_id: str
    location_name: str
    metric_category: MetricCategory
    current_value: decimal.Decimal
    benchmark_value: decimal.Decimal
    variance_percentage: decimal.Decimal
    rank: int
    total_locations: int
    performance_tier: str  # "EXCELLENT", "GOOD", "AVERAGE", "BELOW_AVERAGE", "NEEDS_IMPROVEMENT"
    recommendations: List[str]

@dataclass
class AnalyticsResult:
    """Analytics operation result"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

# ==========================================
# PERFORMANCE CALCULATION ENGINE
# ==========================================

class PerformanceCalculator:
    """Calculates various performance metrics"""
    
    @staticmethod
    def calculate_revenue_metrics(location_data: Dict[str, Any]) -> Dict[str, decimal.Decimal]:
        """Calculate revenue-related metrics"""
        total_revenue = location_data.get('total_revenue', 0)
        service_revenue = location_data.get('service_revenue', 0)
        tip_revenue = location_data.get('tip_revenue', 0)
        total_appointments = location_data.get('total_appointments', 1)
        
        return {
            'total_revenue': decimal.Decimal(str(total_revenue)),
            'average_ticket_size': decimal.Decimal(str(total_revenue / max(total_appointments, 1))),
            'revenue_per_service': decimal.Decimal(str(service_revenue / max(total_appointments, 1))),
            'tip_percentage': decimal.Decimal(str((tip_revenue / max(service_revenue, 1)) * 100)),
            'revenue_growth_rate': decimal.Decimal('0')  # Would be calculated with historical data
        }
    
    @staticmethod
    def calculate_efficiency_metrics(location_data: Dict[str, Any]) -> Dict[str, decimal.Decimal]:
        """Calculate operational efficiency metrics"""
        completed_appointments = location_data.get('completed_appointments', 0)
        cancelled_appointments = location_data.get('cancelled_appointments', 0)
        no_show_appointments = location_data.get('no_show_appointments', 0)
        total_appointments = completed_appointments + cancelled_appointments + no_show_appointments
        
        chair_utilization = location_data.get('chair_utilization_rate', 0)
        avg_wait_time = location_data.get('average_wait_time_minutes', 0)
        
        return {
            'completion_rate': decimal.Decimal(str((completed_appointments / max(total_appointments, 1)) * 100)),
            'cancellation_rate': decimal.Decimal(str((cancelled_appointments / max(total_appointments, 1)) * 100)),
            'no_show_rate': decimal.Decimal(str((no_show_appointments / max(total_appointments, 1)) * 100)),
            'chair_utilization_rate': decimal.Decimal(str(chair_utilization * 100)),
            'average_wait_time': decimal.Decimal(str(avg_wait_time))
        }
    
    @staticmethod
    def calculate_customer_metrics(location_data: Dict[str, Any]) -> Dict[str, decimal.Decimal]:
        """Calculate customer-related metrics"""
        new_customers = location_data.get('new_customers', 0)
        returning_customers = location_data.get('returning_customers', 0)
        total_customers = new_customers + returning_customers
        satisfaction_score = location_data.get('customer_satisfaction_score', 0)
        
        return {
            'customer_retention_rate': decimal.Decimal(str((returning_customers / max(total_customers, 1)) * 100)),
            'new_customer_rate': decimal.Decimal(str((new_customers / max(total_customers, 1)) * 100)),
            'customer_satisfaction_score': decimal.Decimal(str(satisfaction_score)),
            'total_unique_customers': decimal.Decimal(str(total_customers))
        }

# ==========================================
# FRANCHISE ANALYTICS SERVICE
# ==========================================

class FranchiseAnalyticsService:
    """
    Comprehensive analytics service for franchise networks
    """
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_database()
        self.calculator = PerformanceCalculator()
        
    def _init_database(self):
        """Initialize analytics tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Analytics metrics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_metrics (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                location_id TEXT,
                category TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value DECIMAL(15,4) NOT NULL,
                timeframe TEXT NOT NULL,
                period_start DATE NOT NULL,
                period_end DATE NOT NULL,
                benchmark_value DECIMAL(15,4),
                benchmark_type TEXT,
                variance_percentage DECIMAL(8,2),
                rank INTEGER,
                total_locations INTEGER,
                additional_data TEXT, -- JSON
                calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(franchise_id, location_id, category, metric_name, timeframe, period_start)
            )
        ''')
        
        # Benchmark definitions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS benchmark_definitions (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                category TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                benchmark_type TEXT NOT NULL,
                target_value DECIMAL(15,4) NOT NULL,
                threshold_excellent DECIMAL(15,4),
                threshold_good DECIMAL(15,4),
                threshold_average DECIMAL(15,4),
                threshold_below_average DECIMAL(15,4),
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                UNIQUE(franchise_id, category, metric_name, benchmark_type)
            )
        ''')
        
        # Performance alerts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS performance_alerts (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                location_id TEXT,
                alert_type TEXT NOT NULL, -- 'UNDERPERFORMING', 'TRENDING_DOWN', 'GOAL_ACHIEVED'
                metric_category TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                current_value DECIMAL(15,4),
                threshold_value DECIMAL(15,4),
                severity TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
                description TEXT NOT NULL,
                recommendations TEXT, -- JSON array
                acknowledged BOOLEAN DEFAULT 0,
                resolved BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                acknowledged_at TIMESTAMP,
                resolved_at TIMESTAMP
            )
        ''')
        
        # Analytics insights table (AI-generated)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_insights (
                id TEXT PRIMARY KEY,
                franchise_id TEXT NOT NULL,
                location_id TEXT,
                insight_type TEXT NOT NULL, -- 'TREND', 'ANOMALY', 'OPPORTUNITY', 'RISK'
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                impact_level TEXT DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH'
                confidence_score DECIMAL(3,2) DEFAULT 0.5,
                supporting_metrics TEXT, -- JSON array of metric IDs
                recommendations TEXT, -- JSON array
                estimated_impact TEXT, -- e.g., "+$500/month", "15% improvement"
                is_active BOOLEAN DEFAULT 1,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            )
        ''')
        
        # Create indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_metrics_franchise_location ON analytics_metrics(franchise_id, location_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_metrics_category ON analytics_metrics(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_metrics_timeframe ON analytics_metrics(timeframe, period_start)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_performance_alerts_location ON performance_alerts(franchise_id, location_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_performance_alerts_severity ON performance_alerts(severity, resolved)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_insights_franchise ON analytics_insights(franchise_id, location_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_insights_type ON analytics_insights(insight_type, is_active)')
        
        conn.commit()
        conn.close()
        logger.info("Franchise analytics database initialized")

    @contextmanager
    def get_db_connection(self):
        """Get database connection with context manager"""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    # ==========================================
    # ANALYTICS CALCULATION
    # ==========================================

    def calculate_location_metrics(
        self,
        franchise_id: str,
        location_id: str,
        timeframe: TimeframeType = TimeframeType.MONTHLY,
        period_start: Optional[date] = None,
        period_end: Optional[date] = None
    ) -> AnalyticsResult:
        """Calculate comprehensive metrics for a location"""
        try:
            # Set default time period if not provided
            if not period_end:
                period_end = date.today()
            if not period_start:
                if timeframe == TimeframeType.MONTHLY:
                    period_start = period_end.replace(day=1)
                elif timeframe == TimeframeType.WEEKLY:
                    period_start = period_end - timedelta(days=7)
                else:
                    period_start = period_end - timedelta(days=30)
            
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get analytics data for the location
                cursor.execute('''
                    SELECT * FROM franchise_analytics
                    WHERE franchise_id = ? AND location_id = ?
                      AND date >= ? AND date <= ?
                      AND period_type = ?
                ''', (franchise_id, location_id, period_start, period_end, timeframe.value.lower()))
                
                analytics_data = cursor.fetchall()
                
                if not analytics_data:
                    # Generate sample analytics data for demo
                    analytics_data = self._generate_sample_analytics_data(
                        franchise_id, location_id, period_start, period_end
                    )
                
                # Aggregate the data
                aggregated_data = self._aggregate_analytics_data(analytics_data)
                
                # Calculate all metric categories
                revenue_metrics = self.calculator.calculate_revenue_metrics(aggregated_data)
                efficiency_metrics = self.calculator.calculate_efficiency_metrics(aggregated_data)
                customer_metrics = self.calculator.calculate_customer_metrics(aggregated_data)
                
                # Store calculated metrics
                all_metrics = []
                
                # Revenue metrics
                for metric_name, value in revenue_metrics.items():
                    metric = AnalyticsMetric(
                        id=str(uuid.uuid4()),
                        franchise_id=franchise_id,
                        location_id=location_id,
                        category=MetricCategory.REVENUE,
                        metric_name=metric_name,
                        metric_value=value,
                        timeframe=timeframe,
                        period_start=period_start,
                        period_end=period_end
                    )
                    all_metrics.append(metric)
                    self._store_metric(cursor, metric)
                
                # Efficiency metrics
                for metric_name, value in efficiency_metrics.items():
                    metric = AnalyticsMetric(
                        id=str(uuid.uuid4()),
                        franchise_id=franchise_id,
                        location_id=location_id,
                        category=MetricCategory.OPERATIONAL_EFFICIENCY,
                        metric_name=metric_name,
                        metric_value=value,
                        timeframe=timeframe,
                        period_start=period_start,
                        period_end=period_end
                    )
                    all_metrics.append(metric)
                    self._store_metric(cursor, metric)
                
                # Customer metrics
                for metric_name, value in customer_metrics.items():
                    if metric_name == 'customer_satisfaction_score':
                        category = MetricCategory.CUSTOMER_SATISFACTION
                    elif 'retention' in metric_name:
                        category = MetricCategory.RETENTION
                    else:
                        category = MetricCategory.CUSTOMER_ACQUISITION
                    
                    metric = AnalyticsMetric(
                        id=str(uuid.uuid4()),
                        franchise_id=franchise_id,
                        location_id=location_id,
                        category=category,
                        metric_name=metric_name,
                        metric_value=value,
                        timeframe=timeframe,
                        period_start=period_start,
                        period_end=period_end
                    )
                    all_metrics.append(metric)
                    self._store_metric(cursor, metric)
                
                conn.commit()
                
                return AnalyticsResult(
                    success=True,
                    data={
                        'metrics': [asdict(m) for m in all_metrics],
                        'period_start': period_start.isoformat(),
                        'period_end': period_end.isoformat(),
                        'timeframe': timeframe.value
                    }
                )
                
        except Exception as e:
            error_msg = f"Failed to calculate location metrics: {str(e)}"
            logger.error(error_msg)
            return AnalyticsResult(
                success=False,
                error=error_msg,
                error_code="CALCULATION_ERROR"
            )

    def generate_franchise_benchmarks(
        self,
        franchise_id: str,
        category: MetricCategory,
        timeframe: TimeframeType = TimeframeType.MONTHLY
    ) -> AnalyticsResult:
        """Generate benchmarks across all franchise locations"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get latest metrics for all locations in franchise
                cursor.execute('''
                    SELECT location_id, metric_name, metric_value
                    FROM analytics_metrics
                    WHERE franchise_id = ? 
                      AND category = ?
                      AND timeframe = ?
                      AND calculated_at >= date('now', '-7 days')
                    ORDER BY calculated_at DESC
                ''', (franchise_id, category.value, timeframe.value))
                
                metrics_data = cursor.fetchall()
                
                # Group by metric name
                metrics_by_name = {}
                for row in metrics_data:
                    metric_name = row['metric_name']
                    if metric_name not in metrics_by_name:
                        metrics_by_name[metric_name] = []
                    
                    metrics_by_name[metric_name].append({
                        'location_id': row['location_id'],
                        'value': float(row['metric_value'])
                    })
                
                # Calculate benchmarks for each metric
                benchmarks = {}
                for metric_name, values in metrics_by_name.items():
                    if len(values) < 2:
                        continue
                    
                    value_list = [v['value'] for v in values]
                    
                    benchmarks[metric_name] = {
                        'average': statistics.mean(value_list),
                        'median': statistics.median(value_list),
                        'top_quartile': self._calculate_percentile(value_list, 75),
                        'bottom_quartile': self._calculate_percentile(value_list, 25),
                        'min': min(value_list),
                        'max': max(value_list),
                        'std_dev': statistics.stdev(value_list) if len(value_list) > 1 else 0,
                        'location_count': len(values)
                    }
                    
                    # Generate location rankings
                    sorted_locations = sorted(values, key=lambda x: x['value'], reverse=True)
                    for i, location_data in enumerate(sorted_locations):
                        location_data['rank'] = i + 1
                    
                    benchmarks[metric_name]['rankings'] = sorted_locations
                
                return AnalyticsResult(
                    success=True,
                    data={
                        'franchise_id': franchise_id,
                        'category': category.value,
                        'timeframe': timeframe.value,
                        'benchmarks': benchmarks,
                        'generated_at': datetime.utcnow().isoformat()
                    }
                )
                
        except Exception as e:
            error_msg = f"Failed to generate benchmarks: {str(e)}"
            logger.error(error_msg)
            return AnalyticsResult(
                success=False,
                error=error_msg,
                error_code="BENCHMARK_ERROR"
            )

    def get_location_performance_comparison(
        self,
        franchise_id: str,
        location_id: str,
        comparison_type: BenchmarkType = BenchmarkType.FRANCHISE_AVERAGE
    ) -> AnalyticsResult:
        """Compare location performance against benchmarks"""
        try:
            with self.get_db_connection() as conn:
                cursor = conn.cursor()
                
                # Get location's current metrics
                cursor.execute('''
                    SELECT * FROM analytics_metrics
                    WHERE franchise_id = ? AND location_id = ?
                      AND calculated_at >= date('now', '-7 days')
                    ORDER BY calculated_at DESC
                ''', (franchise_id, location_id))
                
                location_metrics = cursor.fetchall()
                
                if not location_metrics:
                    return AnalyticsResult(
                        success=False,
                        error="No recent metrics found for location",
                        error_code="NO_METRICS"
                    )
                
                # Get location name
                cursor.execute('''
                    SELECT location_name FROM locations WHERE id = ?
                ''', (location_id,))
                location_result = cursor.fetchone()
                location_name = location_result['location_name'] if location_result else 'Unknown Location'
                
                # Generate benchmarks for comparison
                comparisons = []
                
                for metric in location_metrics:
                    # Get benchmark data
                    if comparison_type == BenchmarkType.FRANCHISE_AVERAGE:
                        benchmark_result = self._get_franchise_average_benchmark(
                            cursor, franchise_id, metric['category'], metric['metric_name']
                        )
                    else:
                        benchmark_result = self._get_industry_benchmark(
                            metric['category'], metric['metric_name']
                        )
                    
                    if benchmark_result:
                        variance = self._calculate_variance_percentage(
                            float(metric['metric_value']), benchmark_result['value']
                        )
                        
                        performance_tier = self._determine_performance_tier(
                            float(metric['metric_value']), benchmark_result
                        )
                        
                        comparison = BenchmarkResult(
                            location_id=location_id,
                            location_name=location_name,
                            metric_category=MetricCategory(metric['category']),
                            current_value=decimal.Decimal(str(metric['metric_value'])),
                            benchmark_value=decimal.Decimal(str(benchmark_result['value'])),
                            variance_percentage=decimal.Decimal(str(variance)),
                            rank=benchmark_result.get('rank', 0),
                            total_locations=benchmark_result.get('total_locations', 0),
                            performance_tier=performance_tier,
                            recommendations=self._generate_performance_recommendations(
                                metric['category'], metric['metric_name'], performance_tier, variance
                            )
                        )
                        
                        comparisons.append(comparison)
                
                return AnalyticsResult(
                    success=True,
                    data={
                        'location_id': location_id,
                        'location_name': location_name,
                        'comparison_type': comparison_type.value,
                        'comparisons': [asdict(comp) for comp in comparisons],
                        'overall_performance_score': self._calculate_overall_performance_score(comparisons)
                    }
                )
                
        except Exception as e:
            error_msg = f"Failed to get performance comparison: {str(e)}"
            logger.error(error_msg)
            return AnalyticsResult(
                success=False,
                error=error_msg,
                error_code="COMPARISON_ERROR"
            )

    # ==========================================
    # UTILITY METHODS
    # ==========================================

    def _store_metric(self, cursor: sqlite3.Cursor, metric: AnalyticsMetric):
        """Store metric in database"""
        cursor.execute('''
            INSERT OR REPLACE INTO analytics_metrics (
                id, franchise_id, location_id, category, metric_name, metric_value,
                timeframe, period_start, period_end, benchmark_value, benchmark_type,
                variance_percentage, rank, total_locations, additional_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            metric.id, metric.franchise_id, metric.location_id, metric.category.value,
            metric.metric_name, float(metric.metric_value), metric.timeframe.value,
            metric.period_start, metric.period_end, 
            float(metric.benchmark_value) if metric.benchmark_value else None,
            metric.benchmark_type.value if metric.benchmark_type else None,
            float(metric.variance_percentage) if metric.variance_percentage else None,
            metric.rank, metric.total_locations, json.dumps(metric.additional_data)
        ))

    def _aggregate_analytics_data(self, analytics_data: List[sqlite3.Row]) -> Dict[str, Any]:
        """Aggregate analytics data"""
        if not analytics_data:
            return {}
        
        # Sum up the metrics
        aggregated = {
            'total_revenue': 0,
            'service_revenue': 0, 
            'tip_revenue': 0,
            'total_appointments': 0,
            'completed_appointments': 0,
            'cancelled_appointments': 0,
            'no_show_appointments': 0,
            'new_customers': 0,
            'returning_customers': 0,
            'customer_satisfaction_score': 0,
            'chair_utilization_rate': 0,
            'average_wait_time_minutes': 0
        }
        
        for row in analytics_data:
            row_dict = dict(row)
            for key in aggregated.keys():
                if key in row_dict and row_dict[key] is not None:
                    aggregated[key] += row_dict[key]
        
        # Calculate averages for certain metrics
        num_records = len(analytics_data)
        if num_records > 0:
            aggregated['customer_satisfaction_score'] /= num_records
            aggregated['chair_utilization_rate'] /= num_records
            aggregated['average_wait_time_minutes'] /= num_records
        
        return aggregated

    def _generate_sample_analytics_data(
        self, 
        franchise_id: str, 
        location_id: str, 
        period_start: date, 
        period_end: date
    ) -> List[Dict[str, Any]]:
        """Generate sample analytics data for demo purposes"""
        import random
        
        # Generate sample data
        sample_data = [{
            'franchise_id': franchise_id,
            'location_id': location_id,
            'date': period_start,
            'period_type': 'monthly',
            'total_revenue': random.uniform(8000, 15000),
            'service_revenue': random.uniform(6000, 12000),
            'tip_revenue': random.uniform(800, 1800),
            'total_appointments': random.randint(100, 200),
            'completed_appointments': random.randint(85, 180),
            'cancelled_appointments': random.randint(5, 15),
            'no_show_appointments': random.randint(2, 8),
            'new_customers': random.randint(15, 35),
            'returning_customers': random.randint(60, 120),
            'customer_satisfaction_score': random.uniform(4.0, 5.0),
            'chair_utilization_rate': random.uniform(0.65, 0.85),
            'average_wait_time_minutes': random.randint(8, 20)
        }]
        
        return sample_data

    def _calculate_percentile(self, values: List[float], percentile: int) -> float:
        """Calculate percentile of values"""
        if not values:
            return 0
        
        sorted_values = sorted(values)
        index = (percentile / 100.0) * (len(sorted_values) - 1)
        
        if index == int(index):
            return sorted_values[int(index)]
        else:
            lower = sorted_values[int(index)]
            upper = sorted_values[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))

    def _get_franchise_average_benchmark(
        self, 
        cursor: sqlite3.Cursor, 
        franchise_id: str, 
        category: str, 
        metric_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get franchise average benchmark for a metric"""
        cursor.execute('''
            SELECT AVG(metric_value) as avg_value, COUNT(*) as location_count
            FROM analytics_metrics
            WHERE franchise_id = ? AND category = ? AND metric_name = ?
              AND calculated_at >= date('now', '-7 days')
        ''', (franchise_id, category, metric_name))
        
        result = cursor.fetchone()
        if result and result['avg_value']:
            return {
                'value': float(result['avg_value']),
                'type': 'franchise_average',
                'total_locations': result['location_count']
            }
        return None

    def _get_industry_benchmark(self, category: str, metric_name: str) -> Optional[Dict[str, Any]]:
        """Get industry benchmark (hardcoded for demo)"""
        industry_benchmarks = {
            'REVENUE': {
                'total_revenue': {'value': 12000, 'excellent': 15000, 'good': 10000},
                'average_ticket_size': {'value': 45, 'excellent': 55, 'good': 40}
            },
            'OPERATIONAL_EFFICIENCY': {
                'completion_rate': {'value': 85, 'excellent': 92, 'good': 80},
                'chair_utilization_rate': {'value': 75, 'excellent': 85, 'good': 70}
            },
            'CUSTOMER_SATISFACTION': {
                'customer_satisfaction_score': {'value': 4.2, 'excellent': 4.7, 'good': 4.0}
            }
        }
        
        category_benchmarks = industry_benchmarks.get(category, {})
        metric_benchmark = category_benchmarks.get(metric_name)
        
        if metric_benchmark:
            return {
                'value': metric_benchmark['value'],
                'type': 'industry_standard',
                'excellent_threshold': metric_benchmark.get('excellent'),
                'good_threshold': metric_benchmark.get('good')
            }
        return None

    def _calculate_variance_percentage(self, current_value: float, benchmark_value: float) -> float:
        """Calculate variance percentage from benchmark"""
        if benchmark_value == 0:
            return 0
        return ((current_value - benchmark_value) / benchmark_value) * 100

    def _determine_performance_tier(self, value: float, benchmark: Dict[str, Any]) -> str:
        """Determine performance tier based on value and benchmarks"""
        excellent_threshold = benchmark.get('excellent_threshold')
        good_threshold = benchmark.get('good_threshold')
        benchmark_value = benchmark['value']
        
        if excellent_threshold and value >= excellent_threshold:
            return "EXCELLENT"
        elif good_threshold and value >= good_threshold:
            return "GOOD"
        elif value >= benchmark_value:
            return "AVERAGE"
        elif value >= benchmark_value * 0.8:
            return "BELOW_AVERAGE"
        else:
            return "NEEDS_IMPROVEMENT"

    def _generate_performance_recommendations(
        self, 
        category: str, 
        metric_name: str, 
        performance_tier: str, 
        variance: float
    ) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        if performance_tier in ["BELOW_AVERAGE", "NEEDS_IMPROVEMENT"]:
            if category == "REVENUE":
                if "average_ticket_size" in metric_name:
                    recommendations.extend([
                        "Consider offering premium service packages",
                        "Train staff on upselling techniques",
                        "Review pricing strategy for services"
                    ])
                elif "total_revenue" in metric_name:
                    recommendations.extend([
                        "Increase marketing efforts to attract more customers",
                        "Implement loyalty program to encourage repeat visits",
                        "Optimize appointment scheduling to reduce gaps"
                    ])
            
            elif category == "OPERATIONAL_EFFICIENCY":
                if "completion_rate" in metric_name:
                    recommendations.extend([
                        "Implement reminder system to reduce no-shows",
                        "Analyze cancellation patterns and reasons",
                        "Consider overbooking strategy"
                    ])
                elif "chair_utilization" in metric_name:
                    recommendations.extend([
                        "Optimize staff scheduling based on demand patterns",
                        "Reduce service time variations through training",
                        "Implement waitlist management system"
                    ])
            
            elif category == "CUSTOMER_SATISFACTION":
                recommendations.extend([
                    "Conduct customer feedback surveys",
                    "Provide additional staff training on customer service",
                    "Review and improve service quality standards",
                    "Address common customer complaints"
                ])
        
        elif performance_tier == "EXCELLENT":
            recommendations.extend([
                "Maintain current excellent performance",
                "Share best practices with other locations",
                "Consider this location as a training model"
            ])
        
        return recommendations

    def _calculate_overall_performance_score(self, comparisons: List[BenchmarkResult]) -> float:
        """Calculate overall performance score"""
        if not comparisons:
            return 0
        
        tier_scores = {
            "EXCELLENT": 5,
            "GOOD": 4,
            "AVERAGE": 3,
            "BELOW_AVERAGE": 2,
            "NEEDS_IMPROVEMENT": 1
        }
        
        total_score = sum(tier_scores.get(comp.performance_tier, 0) for comp in comparisons)
        return round((total_score / len(comparisons)) * 20, 1)  # Convert to 0-100 scale

# ==========================================
# EXAMPLE USAGE
# ==========================================

if __name__ == "__main__":
    # Initialize service
    analytics_service = FranchiseAnalyticsService()
    
    print("Franchise analytics service initialized successfully!")
    
    # Example: Calculate metrics for a location
    # result = analytics_service.calculate_location_metrics(
    #     franchise_id="franchise_123",
    #     location_id="location_456",
    #     timeframe=TimeframeType.MONTHLY
    # )
    # 
    # if result.success:
    #     print(f"Calculated metrics: {len(result.data['metrics'])} metrics")
    # else:
    #     print(f"Failed to calculate metrics: {result.error}")