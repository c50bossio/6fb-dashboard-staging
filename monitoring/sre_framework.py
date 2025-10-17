#!/usr/bin/env python3
"""
Site Reliability Engineering (SRE) Framework for 6FB AI Agent System

This module implements comprehensive SRE practices including:
- Service Level Objectives (SLOs) and Service Level Indicators (SLIs)
- Error Budget calculation and tracking
- Uptime monitoring with specific targets
- Auto-recovery mechanisms
- Capacity planning and performance baselines
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
import statistics
from collections import defaultdict, deque
import math

logger = logging.getLogger(__name__)


class SLIType(Enum):
    """Service Level Indicator types"""
    AVAILABILITY = "availability"
    LATENCY = "latency"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    SATURATION = "saturation"


class TimeWindow(Enum):
    """Time windows for SLO evaluation"""
    MINUTE = "1m"
    HOUR = "1h"
    DAY = "1d"
    WEEK = "7d"
    MONTH = "30d"
    QUARTER = "90d"


@dataclass
class SLI:
    """Service Level Indicator definition"""
    name: str
    type: SLIType
    description: str
    query: str  # Prometheus query or calculation method
    unit: str
    good_events_query: Optional[str] = None  # For ratio-based SLIs
    total_events_query: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class SLO:
    """Service Level Objective definition"""
    name: str
    service: str
    sli: SLI
    target_percentage: float  # e.g., 99.9 for 99.9%
    time_window: TimeWindow
    alerting_burn_rate_threshold: float = 2.0  # Multiplier for burn rate alerting
    description: str = ""
    tags: Dict[str, str] = field(default_factory=dict)
    
    @property
    def error_budget_percentage(self) -> float:
        """Calculate error budget percentage"""
        return 100.0 - self.target_percentage
    
    @property
    def time_window_seconds(self) -> int:
        """Get time window in seconds"""
        mapping = {
            TimeWindow.MINUTE: 60,
            TimeWindow.HOUR: 3600,
            TimeWindow.DAY: 86400,
            TimeWindow.WEEK: 604800,
            TimeWindow.MONTH: 2592000,
            TimeWindow.QUARTER: 7776000
        }
        return mapping[self.time_window]


@dataclass
class ErrorBudget:
    """Error budget tracking"""
    slo_name: str
    total_budget: float  # Total error budget for the time window
    consumed_budget: float  # Amount of budget consumed
    remaining_budget: float  # Remaining budget
    burn_rate: float  # Current burn rate
    time_to_exhaustion_hours: Optional[float]  # Hours until budget exhausted
    last_updated: datetime
    
    @property
    def budget_remaining_percentage(self) -> float:
        """Percentage of error budget remaining"""
        if self.total_budget == 0:
            return 100.0
        return (self.remaining_budget / self.total_budget) * 100.0
    
    @property
    def is_critical(self) -> bool:
        """Check if error budget is critically low"""
        return self.budget_remaining_percentage < 10.0
    
    @property
    def is_warning(self) -> bool:
        """Check if error budget is in warning state"""
        return self.budget_remaining_percentage < 25.0


@dataclass
class SLOMetrics:
    """SLO performance metrics over time"""
    slo_name: str
    timestamp: datetime
    actual_percentage: float
    target_percentage: float
    error_budget_consumed: float
    burn_rate: float
    good_events: int
    total_events: int


@dataclass
class CapacityMetrics:
    """Capacity planning metrics"""
    resource_name: str
    current_utilization: float  # 0-100%
    peak_utilization: float
    average_utilization: float
    growth_rate_daily: float  # % change per day
    projected_saturation_days: Optional[int]  # Days until 80% utilization
    recommended_scaling_action: Optional[str]
    last_updated: datetime


@dataclass
class PerformanceBaseline:
    """Performance baseline metrics"""
    metric_name: str
    baseline_value: float
    current_value: float
    deviation_percentage: float
    trend: str  # "improving", "degrading", "stable"
    established_date: datetime
    last_updated: datetime
    confidence_interval: Tuple[float, float]  # (lower, upper) bounds


class SLOManager:
    """Manages SLO definitions, tracking, and error budget calculations"""
    
    def __init__(self, metrics_collector):
        self.metrics_collector = metrics_collector
        self.slos: Dict[str, SLO] = {}
        self.error_budgets: Dict[str, ErrorBudget] = {}
        self.slo_history: Dict[str, List[SLOMetrics]] = defaultdict(list)
        self.alert_callbacks: List[Callable] = []
        
        # Initialize default SLOs
        self._initialize_default_slos()
    
    def _initialize_default_slos(self):
        """Initialize default SLOs for the 6FB AI Agent System"""
        
        # API Availability SLO
        api_availability_sli = SLI(
            name="api_availability",
            type=SLIType.AVAILABILITY,
            description="Percentage of successful API requests",
            query="rate(sixfb_api_requests_total{status_code!~'5..'}[5m]) / rate(sixfb_api_requests_total[5m])",
            good_events_query="rate(sixfb_api_requests_total{status_code!~'5..'}[5m])",
            total_events_query="rate(sixfb_api_requests_total[5m])",
            unit="percentage"
        )
        
        self.add_slo(SLO(
            name="api_availability_99_9",
            service="backend-api",
            sli=api_availability_sli,
            target_percentage=99.9,
            time_window=TimeWindow.MONTH,
            description="99.9% availability for API endpoints over 30 days"
        ))
        
        # API Latency SLO
        api_latency_sli = SLI(
            name="api_latency_p95",
            type=SLIType.LATENCY,
            description="95th percentile API response time",
            query="histogram_quantile(0.95, rate(sixfb_api_request_duration_seconds_bucket[5m]))",
            unit="seconds"
        )
        
        self.add_slo(SLO(
            name="api_latency_p95_500ms",
            service="backend-api", 
            sli=api_latency_sli,
            target_percentage=95.0,  # 95% of requests under 500ms
            time_window=TimeWindow.DAY,
            description="95% of API requests complete within 500ms"
        ))
        
        # Frontend Load Time SLO
        frontend_load_sli = SLI(
            name="frontend_load_time_p90",
            type=SLIType.LATENCY,
            description="90th percentile frontend page load time",
            query="histogram_quantile(0.90, rate(frontend_page_load_duration_seconds_bucket[5m]))",
            unit="seconds"
        )
        
        self.add_slo(SLO(
            name="frontend_load_p90_2s",
            service="frontend",
            sli=frontend_load_sli,
            target_percentage=90.0,  # 90% of page loads under 2s
            time_window=TimeWindow.DAY,
            description="90% of frontend page loads complete within 2 seconds"
        ))
        
        # Database Query Performance SLO
        db_latency_sli = SLI(
            name="database_query_latency_p95",
            type=SLIType.LATENCY,
            description="95th percentile database query response time",
            query="histogram_quantile(0.95, rate(sixfb_api_database_query_duration_seconds_bucket[5m]))",
            unit="seconds"
        )
        
        self.add_slo(SLO(
            name="database_latency_p95_100ms",
            service="database",
            sli=db_latency_sli,
            target_percentage=95.0,
            time_window=TimeWindow.DAY,
            description="95% of database queries complete within 100ms"
        ))
        
        # AI Service Availability SLO
        ai_availability_sli = SLI(
            name="ai_service_availability",
            type=SLIType.AVAILABILITY,
            description="Percentage of successful AI service requests",
            query="rate(sixfb_api_agentic_chats_total[5m]) / (rate(sixfb_api_agentic_chats_total[5m]) + rate(ai_request_failures_total[5m]))",
            unit="percentage"
        )
        
        self.add_slo(SLO(
            name="ai_service_availability_99_5",
            service="ai-service",
            sli=ai_availability_sli,
            target_percentage=99.5,
            time_window=TimeWindow.WEEK,
            description="99.5% availability for AI service requests over 7 days"
        ))
        
        # System Error Rate SLO
        error_rate_sli = SLI(
            name="system_error_rate",
            type=SLIType.ERROR_RATE,
            description="Overall system error rate",
            query="rate(sixfb_api_requests_total{status_code=~'5..'}[5m]) / rate(sixfb_api_requests_total[5m])",
            unit="percentage"
        )
        
        self.add_slo(SLO(
            name="system_error_rate_0_1",
            service="system",
            sli=error_rate_sli,
            target_percentage=99.9,  # Error rate < 0.1%
            time_window=TimeWindow.HOUR,
            description="System error rate below 0.1% over 1 hour"
        ))
    
    def add_slo(self, slo: SLO):
        """Add an SLO to tracking"""
        self.slos[slo.name] = slo
        
        # Initialize error budget
        self.error_budgets[slo.name] = ErrorBudget(
            slo_name=slo.name,
            total_budget=slo.error_budget_percentage,
            consumed_budget=0.0,
            remaining_budget=slo.error_budget_percentage,
            burn_rate=0.0,
            time_to_exhaustion_hours=None,
            last_updated=datetime.utcnow()
        )
        
        logger.info(f"Added SLO: {slo.name} with {slo.target_percentage}% target")
    
    async def evaluate_slos(self) -> Dict[str, SLOMetrics]:
        """Evaluate all SLOs and update error budgets"""
        results = {}
        
        for slo_name, slo in self.slos.items():
            try:
                metrics = await self._evaluate_single_slo(slo)
                results[slo_name] = metrics
                
                # Update error budget
                self._update_error_budget(slo, metrics)
                
                # Store historical data
                self.slo_history[slo_name].append(metrics)
                
                # Keep only recent history (last 1000 points)
                if len(self.slo_history[slo_name]) > 1000:
                    self.slo_history[slo_name] = self.slo_history[slo_name][-1000:]
                
            except Exception as e:
                logger.error(f"Failed to evaluate SLO {slo_name}: {e}")
        
        # Check for SLO violations and burn rate alerts
        await self._check_slo_violations()
        
        return results
    
    async def _evaluate_single_slo(self, slo: SLO) -> SLOMetrics:
        """Evaluate a single SLO"""
        
        if slo.sli.type in [SLIType.AVAILABILITY, SLIType.ERROR_RATE]:
            # Ratio-based SLI
            good_events = await self._execute_query(slo.sli.good_events_query or slo.sli.query)
            total_events = await self._execute_query(slo.sli.total_events_query)
            
            if total_events > 0:
                actual_percentage = (good_events / total_events) * 100.0
            else:
                actual_percentage = 100.0  # No events = 100% success
        
        elif slo.sli.type == SLIType.LATENCY:
            # Latency-based SLI - check percentage below threshold
            latency_value = await self._execute_query(slo.sli.query)
            threshold = self._extract_latency_threshold(slo.name)
            
            # This is simplified - in practice you'd query for percentages
            if latency_value <= threshold:
                actual_percentage = 100.0
            else:
                # Calculate degradation based on how far over threshold
                degradation = min((latency_value / threshold - 1.0) * 100, 100.0)
                actual_percentage = max(0.0, 100.0 - degradation)
            
            good_events = int(actual_percentage)
            total_events = 100
        
        else:
            # Other SLI types
            actual_percentage = min(100.0, await self._execute_query(slo.sli.query) * 100.0)
            good_events = int(actual_percentage)
            total_events = 100
        
        return SLOMetrics(
            slo_name=slo.name,
            timestamp=datetime.utcnow(),
            actual_percentage=actual_percentage,
            target_percentage=slo.target_percentage,
            error_budget_consumed=max(0.0, slo.target_percentage - actual_percentage),
            burn_rate=self._calculate_burn_rate(slo, actual_percentage),
            good_events=good_events,
            total_events=total_events
        )
    
    def _extract_latency_threshold(self, slo_name: str) -> float:
        """Extract latency threshold from SLO name (simplified)"""
        # This is a simplified approach - in practice, thresholds would be explicitly configured
        if "500ms" in slo_name:
            return 0.5
        elif "100ms" in slo_name:
            return 0.1
        elif "2s" in slo_name:
            return 2.0
        else:
            return 1.0  # Default 1 second
    
    async def _execute_query(self, query: str) -> float:
        """Execute a metrics query (placeholder for actual implementation)"""
        # In practice, this would query Prometheus or your metrics backend
        # For now, return simulated values
        
        # Simulate different metrics based on query content
        if "availability" in query.lower():
            return 0.999  # 99.9% availability
        elif "latency" in query.lower() or "duration" in query.lower():
            return 0.150  # 150ms
        elif "error" in query.lower():
            return 0.001  # 0.1% error rate
        else:
            return 0.95   # Default 95%
    
    def _calculate_burn_rate(self, slo: SLO, actual_percentage: float) -> float:
        """Calculate error budget burn rate"""
        if actual_percentage >= slo.target_percentage:
            return 0.0  # No burn if meeting SLO
        
        error_rate = slo.target_percentage - actual_percentage
        error_budget = slo.error_budget_percentage
        
        if error_budget == 0:
            return float('inf')
        
        # Burn rate = current error rate / allowed error rate
        return error_rate / error_budget
    
    def _update_error_budget(self, slo: SLO, metrics: SLOMetrics):
        """Update error budget based on latest metrics"""
        budget = self.error_budgets[slo.name]
        
        # Calculate time-based budget consumption
        time_factor = 1.0 / (slo.time_window_seconds / 300)  # 5-minute intervals
        budget_consumption = metrics.error_budget_consumed * time_factor
        
        budget.consumed_budget = min(budget.total_budget, 
                                   budget.consumed_budget + budget_consumption)
        budget.remaining_budget = budget.total_budget - budget.consumed_budget
        budget.burn_rate = metrics.burn_rate
        
        # Calculate time to exhaustion
        if budget.burn_rate > 0:
            remaining_time_seconds = (budget.remaining_budget / budget.burn_rate) * slo.time_window_seconds
            budget.time_to_exhaustion_hours = remaining_time_seconds / 3600
        else:
            budget.time_to_exhaustion_hours = None
        
        budget.last_updated = datetime.utcnow()
    
    async def _check_slo_violations(self):
        """Check for SLO violations and trigger alerts"""
        for slo_name, slo in self.slos.items():
            budget = self.error_budgets[slo_name]
            
            # Check burn rate alerts
            if budget.burn_rate > slo.alerting_burn_rate_threshold:
                await self._trigger_burn_rate_alert(slo, budget)
            
            # Check error budget exhaustion
            if budget.is_critical:
                await self._trigger_budget_exhaustion_alert(slo, budget)
    
    async def _trigger_burn_rate_alert(self, slo: SLO, budget: ErrorBudget):
        """Trigger burn rate alert"""
        alert_data = {
            'type': 'slo_burn_rate',
            'severity': 'warning',
            'slo_name': slo.name,
            'service': slo.service,
            'burn_rate': budget.burn_rate,
            'threshold': slo.alerting_burn_rate_threshold,
            'time_to_exhaustion_hours': budget.time_to_exhaustion_hours
        }
        
        for callback in self.alert_callbacks:
            await callback(alert_data)
    
    async def _trigger_budget_exhaustion_alert(self, slo: SLO, budget: ErrorBudget):
        """Trigger error budget exhaustion alert"""
        severity = 'critical' if budget.budget_remaining_percentage < 5 else 'warning'
        
        alert_data = {
            'type': 'error_budget_exhaustion',
            'severity': severity,
            'slo_name': slo.name,
            'service': slo.service,
            'remaining_percentage': budget.budget_remaining_percentage,
            'time_to_exhaustion_hours': budget.time_to_exhaustion_hours
        }
        
        for callback in self.alert_callbacks:
            await callback(alert_data)
    
    def get_slo_status(self, slo_name: str) -> Dict[str, Any]:
        """Get current status of an SLO"""
        if slo_name not in self.slos:
            return {}
        
        slo = self.slos[slo_name]
        budget = self.error_budgets[slo_name]
        recent_metrics = self.slo_history[slo_name][-10:] if self.slo_history[slo_name] else []
        
        return {
            'slo': {
                'name': slo.name,
                'service': slo.service,
                'target_percentage': slo.target_percentage,
                'time_window': slo.time_window.value,
                'description': slo.description
            },
            'error_budget': {
                'total_budget': budget.total_budget,
                'consumed_budget': budget.consumed_budget,
                'remaining_budget': budget.remaining_budget,
                'remaining_percentage': budget.budget_remaining_percentage,
                'burn_rate': budget.burn_rate,
                'time_to_exhaustion_hours': budget.time_to_exhaustion_hours,
                'status': 'critical' if budget.is_critical else 'warning' if budget.is_warning else 'healthy'
            },
            'recent_performance': [
                {
                    'timestamp': m.timestamp.isoformat(),
                    'actual_percentage': m.actual_percentage,
                    'target_percentage': m.target_percentage,
                    'error_budget_consumed': m.error_budget_consumed
                }
                for m in recent_metrics
            ]
        }
    
    def get_all_slo_status(self) -> Dict[str, Any]:
        """Get status of all SLOs"""
        return {
            'slos': {name: self.get_slo_status(name) for name in self.slos.keys()},
            'summary': {
                'total_slos': len(self.slos),
                'healthy_slos': len([b for b in self.error_budgets.values() if not b.is_warning]),
                'warning_slos': len([b for b in self.error_budgets.values() if b.is_warning and not b.is_critical]),
                'critical_slos': len([b for b in self.error_budgets.values() if b.is_critical]),
                'last_updated': max([b.last_updated for b in self.error_budgets.values()], default=datetime.utcnow()).isoformat()
            }
        }
    
    def add_alert_callback(self, callback: Callable):
        """Add callback for SLO alerts"""
        self.alert_callbacks.append(callback)


class CapacityPlanner:
    """Capacity planning and resource utilization tracking"""
    
    def __init__(self, metrics_collector):
        self.metrics_collector = metrics_collector
        self.capacity_history: Dict[str, List[CapacityMetrics]] = defaultdict(list)
        self.growth_rates: Dict[str, deque] = defaultdict(lambda: deque(maxlen=30))  # 30 days
        
    async def analyze_capacity(self) -> Dict[str, CapacityMetrics]:
        """Analyze capacity for all monitored resources"""
        resources = {
            'cpu': await self._analyze_cpu_capacity(),
            'memory': await self._analyze_memory_capacity(),
            'disk': await self._analyze_disk_capacity(),
            'database_connections': await self._analyze_db_connection_capacity(),
            'redis_memory': await self._analyze_redis_capacity(),
            'api_throughput': await self._analyze_api_throughput_capacity()
        }
        
        # Store historical data
        for resource_name, metrics in resources.items():
            self.capacity_history[resource_name].append(metrics)
            if len(self.capacity_history[resource_name]) > 1000:
                self.capacity_history[resource_name] = self.capacity_history[resource_name][-1000:]
        
        return resources
    
    async def _analyze_cpu_capacity(self) -> CapacityMetrics:
        """Analyze CPU capacity"""
        # Simulate getting CPU metrics
        current_util = 65.0  # 65%
        peak_util = 85.0     # 85% peak
        avg_util = 58.0      # 58% average
        
        # Calculate growth rate (simplified)
        self.growth_rates['cpu'].append(current_util)
        growth_rate = self._calculate_growth_rate('cpu')
        
        # Project when 80% utilization will be reached
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        # Recommend scaling action
        recommendation = self._get_scaling_recommendation('cpu', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='cpu',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_memory_capacity(self) -> CapacityMetrics:
        """Analyze memory capacity"""
        current_util = 72.0
        peak_util = 88.0
        avg_util = 68.0
        
        self.growth_rates['memory'].append(current_util)
        growth_rate = self._calculate_growth_rate('memory')
        
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        recommendation = self._get_scaling_recommendation('memory', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='memory',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_disk_capacity(self) -> CapacityMetrics:
        """Analyze disk capacity"""
        current_util = 45.0
        peak_util = 52.0
        avg_util = 43.0
        
        self.growth_rates['disk'].append(current_util)
        growth_rate = self._calculate_growth_rate('disk')
        
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        recommendation = self._get_scaling_recommendation('disk', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='disk',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_db_connection_capacity(self) -> CapacityMetrics:
        """Analyze database connection pool capacity"""
        current_util = 35.0  # 35% of connection pool used
        peak_util = 65.0
        avg_util = 42.0
        
        self.growth_rates['db_connections'].append(current_util)
        growth_rate = self._calculate_growth_rate('db_connections')
        
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        recommendation = self._get_scaling_recommendation('database', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='database_connections',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_redis_capacity(self) -> CapacityMetrics:
        """Analyze Redis memory capacity"""
        current_util = 28.0
        peak_util = 45.0
        avg_util = 32.0
        
        self.growth_rates['redis'].append(current_util)
        growth_rate = self._calculate_growth_rate('redis')
        
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        recommendation = self._get_scaling_recommendation('redis', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='redis_memory',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    async def _analyze_api_throughput_capacity(self) -> CapacityMetrics:
        """Analyze API throughput capacity"""
        current_util = 55.0  # 55% of max throughput
        peak_util = 78.0
        avg_util = 48.0
        
        self.growth_rates['api_throughput'].append(current_util)
        growth_rate = self._calculate_growth_rate('api_throughput')
        
        if growth_rate > 0:
            days_to_80_percent = (80.0 - current_util) / growth_rate
            projected_saturation = max(0, int(days_to_80_percent))
        else:
            projected_saturation = None
        
        recommendation = self._get_scaling_recommendation('api', current_util, peak_util, growth_rate)
        
        return CapacityMetrics(
            resource_name='api_throughput',
            current_utilization=current_util,
            peak_utilization=peak_util,
            average_utilization=avg_util,
            growth_rate_daily=growth_rate,
            projected_saturation_days=projected_saturation,
            recommended_scaling_action=recommendation,
            last_updated=datetime.utcnow()
        )
    
    def _calculate_growth_rate(self, resource: str) -> float:
        """Calculate daily growth rate for a resource"""
        if len(self.growth_rates[resource]) < 7:
            return 0.0
        
        # Simple linear regression for growth rate
        data = list(self.growth_rates[resource])
        n = len(data)
        x = list(range(n))
        
        # Calculate linear regression slope
        sum_x = sum(x)
        sum_y = sum(data)
        sum_xy = sum(x[i] * data[i] for i in range(n))
        sum_x2 = sum(x[i] * x[i] for i in range(n))
        
        if n * sum_x2 - sum_x * sum_x == 0:
            return 0.0
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        return slope
    
    def _get_scaling_recommendation(self, resource_type: str, current: float, 
                                  peak: float, growth_rate: float) -> Optional[str]:
        """Get scaling recommendation based on utilization and growth"""
        
        if current > 85:
            return f"IMMEDIATE: Scale {resource_type} - current utilization {current:.1f}% is critically high"
        elif current > 75:
            return f"URGENT: Plan {resource_type} scaling - approaching capacity at {current:.1f}%"
        elif peak > 80:
            return f"MODERATE: Monitor {resource_type} - peak utilization {peak:.1f}% indicates periodic stress"
        elif growth_rate > 2.0:  # Growing >2% per day
            days_to_critical = (85 - current) / growth_rate
            if days_to_critical < 30:
                return f"PROACTIVE: Scale {resource_type} in {int(days_to_critical)} days - high growth rate detected"
        
        return None
    
    def get_capacity_summary(self) -> Dict[str, Any]:
        """Get capacity planning summary"""
        latest_metrics = {}
        
        for resource_name, history in self.capacity_history.items():
            if history:
                latest_metrics[resource_name] = history[-1]
        
        # Calculate overall capacity health
        critical_resources = [m for m in latest_metrics.values() if m.current_utilization > 85]
        warning_resources = [m for m in latest_metrics.values() if 75 <= m.current_utilization <= 85]
        
        return {
            'overall_status': 'critical' if critical_resources else 'warning' if warning_resources else 'healthy',
            'critical_resources': len(critical_resources),
            'warning_resources': len(warning_resources),
            'resources': {name: {
                'current_utilization': m.current_utilization,
                'projected_saturation_days': m.projected_saturation_days,
                'recommendation': m.recommended_scaling_action
            } for name, m in latest_metrics.items()},
            'upcoming_capacity_needs': [
                {
                    'resource': name,
                    'days_until_saturation': m.projected_saturation_days,
                    'recommendation': m.recommended_scaling_action
                }
                for name, m in latest_metrics.items()
                if m.projected_saturation_days and m.projected_saturation_days < 90
            ]
        }


class PerformanceBaselineManager:
    """Manages performance baselines and deviation detection"""
    
    def __init__(self, metrics_collector):
        self.metrics_collector = metrics_collector
        self.baselines: Dict[str, PerformanceBaseline] = {}
        self.metric_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        
        # Initialize default baselines
        self._initialize_baselines()
    
    def _initialize_baselines(self):
        """Initialize performance baselines for key metrics"""
        baseline_metrics = {
            'api_response_time_p95': 450.0,  # 450ms
            'api_response_time_p50': 150.0,  # 150ms
            'database_query_time_p95': 85.0,  # 85ms
            'frontend_load_time_p90': 1800.0,  # 1.8s
            'ai_response_time_avg': 2500.0,  # 2.5s
            'memory_usage_avg': 65.0,  # 65%
            'cpu_usage_avg': 45.0,  # 45%
            'error_rate': 0.1,  # 0.1%
            'throughput_rps': 125.0  # 125 requests/second
        }
        
        for metric_name, baseline_value in baseline_metrics.items():
            self.baselines[metric_name] = PerformanceBaseline(
                metric_name=metric_name,
                baseline_value=baseline_value,
                current_value=baseline_value,
                deviation_percentage=0.0,
                trend="stable",
                established_date=datetime.utcnow(),
                last_updated=datetime.utcnow(),
                confidence_interval=(baseline_value * 0.9, baseline_value * 1.1)
            )
    
    async def update_baselines(self):
        """Update performance baselines with current metrics"""
        
        # Get current metric values (simplified simulation)
        current_metrics = {
            'api_response_time_p95': 485.0,
            'api_response_time_p50': 165.0,
            'database_query_time_p95': 92.0,
            'frontend_load_time_p90': 1950.0,
            'ai_response_time_avg': 2650.0,
            'memory_usage_avg': 68.0,
            'cpu_usage_avg': 52.0,
            'error_rate': 0.15,
            'throughput_rps': 118.0
        }
        
        for metric_name, current_value in current_metrics.items():
            if metric_name in self.baselines:
                baseline = self.baselines[metric_name]
                
                # Store historical data
                self.metric_history[metric_name].append(current_value)
                
                # Update current value
                baseline.current_value = current_value
                
                # Calculate deviation
                baseline.deviation_percentage = ((current_value - baseline.baseline_value) / baseline.baseline_value) * 100
                
                # Determine trend
                baseline.trend = self._calculate_trend(metric_name)
                
                # Update confidence interval based on recent data
                baseline.confidence_interval = self._calculate_confidence_interval(metric_name)
                
                baseline.last_updated = datetime.utcnow()
    
    def _calculate_trend(self, metric_name: str) -> str:
        """Calculate trend for a metric"""
        history = list(self.metric_history[metric_name])
        
        if len(history) < 10:
            return "insufficient_data"
        
        # Simple trend calculation - compare recent vs older values
        recent_avg = statistics.mean(history[-5:])
        older_avg = statistics.mean(history[-10:-5])
        
        change_percentage = ((recent_avg - older_avg) / older_avg) * 100
        
        if change_percentage > 5:
            return "degrading"
        elif change_percentage < -5:
            return "improving"
        else:
            return "stable"
    
    def _calculate_confidence_interval(self, metric_name: str) -> Tuple[float, float]:
        """Calculate 95% confidence interval for a metric"""
        history = list(self.metric_history[metric_name])
        
        if len(history) < 10:
            baseline_value = self.baselines[metric_name].baseline_value
            return (baseline_value * 0.9, baseline_value * 1.1)
        
        mean_value = statistics.mean(history)
        std_dev = statistics.stdev(history)
        
        # 95% confidence interval (1.96 * std_dev)
        margin = 1.96 * std_dev
        return (mean_value - margin, mean_value + margin)
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Detect performance anomalies"""
        anomalies = []
        
        for metric_name, baseline in self.baselines.items():
            # Check if current value is outside confidence interval
            lower_bound, upper_bound = baseline.confidence_interval
            
            if baseline.current_value < lower_bound or baseline.current_value > upper_bound:
                severity = "critical" if abs(baseline.deviation_percentage) > 50 else "warning"
                
                anomalies.append({
                    'metric': metric_name,
                    'severity': severity,
                    'current_value': baseline.current_value,
                    'baseline_value': baseline.baseline_value,
                    'deviation_percentage': baseline.deviation_percentage,
                    'trend': baseline.trend,
                    'confidence_interval': baseline.confidence_interval,
                    'last_updated': baseline.last_updated.isoformat()
                })
        
        return anomalies
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance baseline summary"""
        anomalies = self.detect_anomalies()
        
        return {
            'baselines': {
                name: {
                    'baseline_value': b.baseline_value,
                    'current_value': b.current_value,
                    'deviation_percentage': b.deviation_percentage,
                    'trend': b.trend,
                    'last_updated': b.last_updated.isoformat()
                }
                for name, b in self.baselines.items()
            },
            'anomalies': anomalies,
            'summary': {
                'total_metrics': len(self.baselines),
                'anomalies_detected': len(anomalies),
                'critical_anomalies': len([a for a in anomalies if a['severity'] == 'critical']),
                'degrading_trends': len([b for b in self.baselines.values() if b.trend == 'degrading']),
                'improving_trends': len([b for b in self.baselines.values() if b.trend == 'improving'])
            }
        }


# Main SRE Framework orchestrator
class SREFramework:
    """Main SRE Framework that coordinates all SRE components"""
    
    def __init__(self, metrics_collector=None):
        self.metrics_collector = metrics_collector
        self.slo_manager = SLOManager(metrics_collector)
        self.capacity_planner = CapacityPlanner(metrics_collector)
        self.baseline_manager = PerformanceBaselineManager(metrics_collector)
        
        self.is_running = False
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # Set up SLO alert callbacks
        self.slo_manager.add_alert_callback(self._handle_slo_alert)
    
    async def start(self):
        """Start the SRE monitoring framework"""
        if self.is_running:
            logger.warning("SRE Framework is already running")
            return
        
        logger.info("Starting SRE Framework")
        self.is_running = True
        
        # Start monitoring loop
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        
        logger.info("SRE Framework started successfully")
    
    async def stop(self):
        """Stop the SRE monitoring framework"""
        logger.info("Stopping SRE Framework")
        self.is_running = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
        
        logger.info("SRE Framework stopped")
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                # Evaluate SLOs and error budgets
                await self.slo_manager.evaluate_slos()
                
                # Analyze capacity
                await self.capacity_planner.analyze_capacity()
                
                # Update performance baselines
                await self.baseline_manager.update_baselines()
                
                # Sleep for 5 minutes
                await asyncio.sleep(300)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"SRE monitoring loop error: {e}")
                await asyncio.sleep(60)
    
    async def _handle_slo_alert(self, alert_data: Dict[str, Any]):
        """Handle SLO alerts"""
        logger.warning(f"SLO Alert: {alert_data['type']} - {alert_data.get('slo_name', 'unknown')}")
        
        # In practice, this would integrate with your alerting system
        # For now, just log the alert
    
    def get_sre_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive SRE dashboard data"""
        return {
            'slo_status': self.slo_manager.get_all_slo_status(),
            'capacity_status': self.capacity_planner.get_capacity_summary(),
            'performance_baselines': self.baseline_manager.get_performance_summary(),
            'overall_health': self._calculate_overall_health(),
            'last_updated': datetime.utcnow().isoformat()
        }
    
    def _calculate_overall_health(self) -> Dict[str, Any]:
        """Calculate overall system health"""
        slo_status = self.slo_manager.get_all_slo_status()['summary']
        capacity_status = self.capacity_planner.get_capacity_summary()
        baseline_status = self.baseline_manager.get_performance_summary()['summary']
        
        # Determine overall health score
        health_score = 100
        
        # SLO impact
        if slo_status['critical_slos'] > 0:
            health_score -= 30
        elif slo_status['warning_slos'] > 0:
            health_score -= 15
        
        # Capacity impact
        if capacity_status['overall_status'] == 'critical':
            health_score -= 25
        elif capacity_status['overall_status'] == 'warning':
            health_score -= 10
        
        # Performance anomaly impact
        if baseline_status['critical_anomalies'] > 0:
            health_score -= 20
        elif baseline_status['anomalies_detected'] > 0:
            health_score -= 10
        
        health_score = max(0, health_score)
        
        if health_score >= 90:
            status = 'healthy'
        elif health_score >= 70:
            status = 'degraded'
        elif health_score >= 50:
            status = 'unhealthy'
        else:
            status = 'critical'
        
        return {
            'status': status,
            'score': health_score,
            'factors': {
                'slo_health': 'critical' if slo_status['critical_slos'] > 0 else 'warning' if slo_status['warning_slos'] > 0 else 'healthy',
                'capacity_health': capacity_status['overall_status'],
                'performance_health': 'critical' if baseline_status['critical_anomalies'] > 0 else 'warning' if baseline_status['anomalies_detected'] > 0 else 'healthy'
            }
        }


# Export main components
__all__ = [
    'SREFramework',
    'SLOManager', 
    'CapacityPlanner',
    'PerformanceBaselineManager',
    'SLO',
    'SLI',
    'ErrorBudget',
    'CapacityMetrics',
    'PerformanceBaseline'
]