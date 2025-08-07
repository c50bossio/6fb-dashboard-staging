"""
AI Performance Monitoring and Optimization Service
Monitors all AI components and provides optimization recommendations
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import statistics

logger = logging.getLogger(__name__)

class PerformanceStatus(Enum):
    EXCELLENT = "excellent"    # >90% optimal
    GOOD = "good"             # 75-90% optimal  
    DEGRADED = "degraded"     # 50-75% optimal
    POOR = "poor"             # <50% optimal

class MonitoringMetric(Enum):
    RESPONSE_TIME = "response_time"
    CONFIDENCE_SCORE = "confidence_score"
    SUCCESS_RATE = "success_rate"
    AGENT_UTILIZATION = "agent_utilization"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    CACHE_HIT_RATE = "cache_hit_rate"
    COST_EFFICIENCY = "cost_efficiency"

@dataclass
class PerformanceSnapshot:
    """Single performance measurement"""
    timestamp: str
    component: str
    metric: MonitoringMetric
    value: float
    metadata: Dict[str, Any]

@dataclass
class ComponentHealth:
    """Health status of an AI component"""
    component_name: str
    status: PerformanceStatus
    overall_score: float
    metrics: Dict[str, float]
    issues: List[str]
    recommendations: List[str]
    last_updated: str

@dataclass
class SystemPerformanceReport:
    """Complete system performance report"""
    overall_health: PerformanceStatus
    overall_score: float
    component_health: Dict[str, ComponentHealth]
    performance_trends: Dict[str, List[float]]
    optimization_opportunities: List[Dict[str, Any]]
    cost_analysis: Dict[str, Any]
    generated_at: str
    next_review_time: str

class AIPerformanceMonitor:
    """
    Comprehensive AI performance monitoring system
    Tracks metrics across all AI components and provides optimization recommendations
    """
    
    def __init__(self):
        self.performance_data = {}
        self.component_configs = {}
        self.alert_thresholds = {}
        self.monitoring_history = []
        self.optimization_cache = {}
        
        # Initialize component configurations
        self._initialize_monitoring_configs()
        
        logger.info("✅ AI Performance Monitor initialized")
    
    def _initialize_monitoring_configs(self):
        """Initialize monitoring configurations for each AI component"""
        
        self.component_configs = {
            'ai_orchestrator': {
                'expected_response_time': 2.0,  # seconds
                'min_confidence_score': 0.7,
                'min_success_rate': 0.95,
                'weight': 0.25  # Importance weight
            },
            'specialized_agents': {
                'expected_response_time': 1.5,
                'min_confidence_score': 0.8,
                'min_success_rate': 0.98,
                'weight': 0.30
            },
            'recommendations_engine': {
                'expected_response_time': 3.0,
                'min_confidence_score': 0.75,
                'min_success_rate': 0.92,
                'weight': 0.20
            },
            'predictive_analytics': {
                'expected_response_time': 5.0,
                'min_confidence_score': 0.85,
                'min_success_rate': 0.90,
                'weight': 0.15
            },
            'vector_knowledge': {
                'expected_response_time': 0.8,
                'cache_hit_rate': 0.80,
                'min_success_rate': 0.99,
                'weight': 0.10
            }
        }
        
        # Alert thresholds
        self.alert_thresholds = {
            'response_time_critical': 10.0,  # seconds
            'confidence_drop_critical': 0.5,
            'success_rate_critical': 0.8,
            'error_rate_critical': 0.15
        }
    
    async def record_performance_metric(self, component: str, metric: MonitoringMetric, 
                                      value: float, metadata: Dict[str, Any] = None):
        """Record a performance metric for a component"""
        
        try:
            snapshot = PerformanceSnapshot(
                timestamp=datetime.now().isoformat(),
                component=component,
                metric=metric,
                value=value,
                metadata=metadata or {}
            )
            
            # Store in performance data
            if component not in self.performance_data:
                self.performance_data[component] = {}
            
            if metric not in self.performance_data[component]:
                self.performance_data[component][metric] = []
            
            self.performance_data[component][metric].append(snapshot)
            
            # Keep only last 1000 measurements per metric
            if len(self.performance_data[component][metric]) > 1000:
                self.performance_data[component][metric] = self.performance_data[component][metric][-1000:]
            
            # Check for alerts
            await self._check_performance_alerts(component, metric, value, metadata)
            
        except Exception as e:
            logger.error(f"❌ Error recording performance metric: {e}")
    
    async def _check_performance_alerts(self, component: str, metric: MonitoringMetric, 
                                      value: float, metadata: Dict[str, Any]):
        """Check if metric value triggers any alerts"""
        
        alerts = []
        
        if metric == MonitoringMetric.RESPONSE_TIME and value > self.alert_thresholds['response_time_critical']:
            alerts.append(f"Critical response time: {value:.2f}s for {component}")
        
        elif metric == MonitoringMetric.CONFIDENCE_SCORE and value < self.alert_thresholds['confidence_drop_critical']:
            alerts.append(f"Low confidence score: {value:.2f} for {component}")
        
        elif metric == MonitoringMetric.SUCCESS_RATE and value < self.alert_thresholds['success_rate_critical']:
            alerts.append(f"Low success rate: {value:.2f} for {component}")
        
        elif metric == MonitoringMetric.ERROR_RATE and value > self.alert_thresholds['error_rate_critical']:
            alerts.append(f"High error rate: {value:.2f} for {component}")
        
        # Log alerts (in production, would send to monitoring system)
        for alert in alerts:
            logger.warning(f"🚨 AI Performance Alert: {alert}")
    
    async def analyze_component_health(self, component: str) -> ComponentHealth:
        """Analyze health of a specific AI component"""
        
        try:
            if component not in self.performance_data:
                return ComponentHealth(
                    component_name=component,
                    status=PerformanceStatus.POOR,
                    overall_score=0.0,
                    metrics={},
                    issues=["No performance data available"],
                    recommendations=["Start collecting performance metrics"],
                    last_updated=datetime.now().isoformat()
                )
            
            component_data = self.performance_data[component]
            config = self.component_configs.get(component, {})
            
            metrics = {}
            scores = []
            issues = []
            recommendations = []
            
            # Analyze each metric
            for metric_type, snapshots in component_data.items():
                if not snapshots:
                    continue
                
                recent_snapshots = [s for s in snapshots if 
                                  datetime.fromisoformat(s.timestamp) > datetime.now() - timedelta(hours=1)]
                
                if not recent_snapshots:
                    continue
                
                values = [s.value for s in recent_snapshots]
                avg_value = statistics.mean(values)
                metrics[metric_type.value] = avg_value
                
                # Calculate metric score
                score = self._calculate_metric_score(metric_type, avg_value, config)
                scores.append(score)
                
                # Identify issues and recommendations
                metric_issues, metric_recommendations = self._analyze_metric_performance(
                    metric_type, avg_value, config, component
                )
                issues.extend(metric_issues)
                recommendations.extend(metric_recommendations)
            
            # Calculate overall score
            overall_score = statistics.mean(scores) if scores else 0.0
            
            # Determine status
            if overall_score >= 0.90:
                status = PerformanceStatus.EXCELLENT
            elif overall_score >= 0.75:
                status = PerformanceStatus.GOOD
            elif overall_score >= 0.50:
                status = PerformanceStatus.DEGRADED
            else:
                status = PerformanceStatus.POOR
            
            return ComponentHealth(
                component_name=component,
                status=status,
                overall_score=overall_score,
                metrics=metrics,
                issues=list(set(issues)),  # Remove duplicates
                recommendations=list(set(recommendations)),
                last_updated=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"❌ Error analyzing component health for {component}: {e}")
            return ComponentHealth(
                component_name=component,
                status=PerformanceStatus.POOR,
                overall_score=0.0,
                metrics={},
                issues=[f"Analysis error: {str(e)}"],
                recommendations=["Check monitoring system"],
                last_updated=datetime.now().isoformat()
            )
    
    def _calculate_metric_score(self, metric: MonitoringMetric, value: float, config: Dict[str, Any]) -> float:
        """Calculate a score (0-1) for a metric value"""
        
        if metric == MonitoringMetric.RESPONSE_TIME:
            expected = config.get('expected_response_time', 2.0)
            # Score decreases as response time increases beyond expected
            return max(0.0, min(1.0, expected / max(value, 0.1)))
        
        elif metric == MonitoringMetric.CONFIDENCE_SCORE:
            min_confidence = config.get('min_confidence_score', 0.7)
            # Linear score from min to 1.0
            return max(0.0, min(1.0, (value - min_confidence) / (1.0 - min_confidence)))
        
        elif metric == MonitoringMetric.SUCCESS_RATE:
            min_success = config.get('min_success_rate', 0.9)
            return max(0.0, min(1.0, (value - min_success) / (1.0 - min_success)))
        
        elif metric == MonitoringMetric.ERROR_RATE:
            # Lower error rate = higher score (invert)
            return max(0.0, min(1.0, 1.0 - value))
        
        elif metric == MonitoringMetric.CACHE_HIT_RATE:
            expected = config.get('cache_hit_rate', 0.8)
            return max(0.0, min(1.0, value / expected))
        
        else:
            # Default scoring for other metrics
            return max(0.0, min(1.0, value))
    
    def _analyze_metric_performance(self, metric: MonitoringMetric, value: float, 
                                  config: Dict[str, Any], component: str) -> tuple:
        """Analyze metric performance and suggest improvements"""
        
        issues = []
        recommendations = []
        
        if metric == MonitoringMetric.RESPONSE_TIME:
            expected = config.get('expected_response_time', 2.0)
            if value > expected * 2:
                issues.append(f"Response time ({value:.2f}s) significantly exceeds expected ({expected}s)")
                recommendations.extend([
                    "Consider implementing caching",
                    "Optimize AI model selection",
                    "Review API timeout settings"
                ])
            elif value > expected * 1.5:
                recommendations.append("Monitor response time trends - slight degradation detected")
        
        elif metric == MonitoringMetric.CONFIDENCE_SCORE:
            min_confidence = config.get('min_confidence_score', 0.7)
            if value < min_confidence:
                issues.append(f"Confidence score ({value:.2f}) below threshold ({min_confidence})")
                recommendations.extend([
                    "Review training data quality",
                    "Consider model fine-tuning",
                    "Implement confidence boosting techniques"
                ])
        
        elif metric == MonitoringMetric.SUCCESS_RATE:
            min_success = config.get('min_success_rate', 0.9)
            if value < min_success:
                issues.append(f"Success rate ({value:.2f}) below threshold ({min_success})")
                recommendations.extend([
                    "Implement better error handling",
                    "Add fallback mechanisms",
                    "Review input validation"
                ])
        
        elif metric == MonitoringMetric.ERROR_RATE:
            if value > 0.1:  # 10% error rate
                issues.append(f"High error rate detected ({value:.2f})")
                recommendations.extend([
                    "Investigate common error patterns",
                    "Improve input validation",
                    "Add retry mechanisms"
                ])
        
        return issues, recommendations
    
    async def generate_system_performance_report(self) -> SystemPerformanceReport:
        """Generate comprehensive system performance report"""
        
        try:
            # Analyze all components
            component_health = {}
            overall_scores = []
            
            for component in self.component_configs.keys():
                health = await self.analyze_component_health(component)
                component_health[component] = health
                
                # Weight the score by component importance
                weight = self.component_configs[component].get('weight', 0.2)
                overall_scores.append(health.overall_score * weight)
            
            # Calculate overall system health
            overall_score = sum(overall_scores) if overall_scores else 0.0
            
            if overall_score >= 0.90:
                overall_health = PerformanceStatus.EXCELLENT
            elif overall_score >= 0.75:
                overall_health = PerformanceStatus.GOOD
            elif overall_score >= 0.50:
                overall_health = PerformanceStatus.DEGRADED
            else:
                overall_health = PerformanceStatus.POOR
            
            # Generate performance trends
            performance_trends = self._generate_performance_trends()
            
            # Identify optimization opportunities
            optimization_opportunities = await self._identify_optimization_opportunities(component_health)
            
            # Analyze costs (mock data for now)
            cost_analysis = await self._analyze_costs()
            
            return SystemPerformanceReport(
                overall_health=overall_health,
                overall_score=overall_score,
                component_health=component_health,
                performance_trends=performance_trends,
                optimization_opportunities=optimization_opportunities,
                cost_analysis=cost_analysis,
                generated_at=datetime.now().isoformat(),
                next_review_time=(datetime.now() + timedelta(hours=6)).isoformat()
            )
            
        except Exception as e:
            logger.error(f"❌ Error generating performance report: {e}")
            # Return minimal fallback report
            return SystemPerformanceReport(
                overall_health=PerformanceStatus.POOR,
                overall_score=0.0,
                component_health={},
                performance_trends={},
                optimization_opportunities=[],
                cost_analysis={},
                generated_at=datetime.now().isoformat(),
                next_review_time=(datetime.now() + timedelta(hours=1)).isoformat()
            )
    
    def _generate_performance_trends(self) -> Dict[str, List[float]]:
        """Generate performance trend data for visualization"""
        
        trends = {}
        
        for component, metrics in self.performance_data.items():
            trends[component] = {}
            
            for metric_type, snapshots in metrics.items():
                # Get last 24 hours of data points (hourly averages)
                now = datetime.now()
                hourly_averages = []
                
                for i in range(24):
                    hour_start = now - timedelta(hours=i+1)
                    hour_end = now - timedelta(hours=i)
                    
                    hour_snapshots = [s for s in snapshots if 
                                    hour_start <= datetime.fromisoformat(s.timestamp) < hour_end]
                    
                    if hour_snapshots:
                        avg_value = statistics.mean([s.value for s in hour_snapshots])
                        hourly_averages.insert(0, avg_value)  # Insert at beginning for chronological order
                    else:
                        hourly_averages.insert(0, 0.0)
                
                trends[component][metric_type.value] = hourly_averages
        
        return trends
    
    async def _identify_optimization_opportunities(self, component_health: Dict[str, ComponentHealth]) -> List[Dict[str, Any]]:
        """Identify specific optimization opportunities"""
        
        opportunities = []
        
        for component_name, health in component_health.items():
            if health.status in [PerformanceStatus.DEGRADED, PerformanceStatus.POOR]:
                
                # High impact opportunities
                if 'response_time' in health.metrics and health.metrics['response_time'] > 5.0:
                    opportunities.append({
                        'component': component_name,
                        'opportunity': 'Response Time Optimization',
                        'impact': 'high',
                        'effort': 'medium',
                        'description': 'Implement caching and optimize AI model selection',
                        'estimated_improvement': '40-60% response time reduction',
                        'priority_score': 90
                    })
                
                if health.overall_score < 0.6:
                    opportunities.append({
                        'component': component_name,
                        'opportunity': 'General Performance Optimization',
                        'impact': 'high',
                        'effort': 'high',
                        'description': 'Comprehensive performance review and optimization',
                        'estimated_improvement': '25-40% overall improvement',
                        'priority_score': 85
                    })
        
        # System-wide opportunities
        avg_confidence = statistics.mean([
            health.metrics.get('confidence_score', 0.8) 
            for health in component_health.values()
        ])
        
        if avg_confidence < 0.7:
            opportunities.append({
                'component': 'system_wide',
                'opportunity': 'AI Model Fine-tuning',
                'impact': 'high',
                'effort': 'high',
                'description': 'Implement system-wide model fine-tuning and training optimization',
                'estimated_improvement': '15-25% confidence improvement',
                'priority_score': 80
            })
        
        # Sort by priority score
        opportunities.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return opportunities[:10]  # Top 10 opportunities
    
    async def _analyze_costs(self) -> Dict[str, Any]:
        """Analyze AI system costs and efficiency"""
        
        # Mock cost analysis (in real system, would integrate with billing APIs)
        return {
            'total_monthly_cost': 150.00,
            'cost_per_request': 0.05,
            'cost_breakdown': {
                'ai_orchestrator': 60.00,
                'specialized_agents': 45.00,
                'recommendations_engine': 25.00,
                'predictive_analytics': 20.00
            },
            'efficiency_score': 0.85,
            'cost_optimization_potential': 25.00,
            'recommendations': [
                'Implement request caching to reduce API calls',
                'Optimize model selection for cost efficiency',
                'Consider model fine-tuning to reduce token usage'
            ]
        }
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """Get real-time performance metrics for dashboard"""
        
        try:
            current_metrics = {}
            
            for component in self.component_configs.keys():
                if component in self.performance_data:
                    component_metrics = {}
                    
                    for metric_type, snapshots in self.performance_data[component].items():
                        if snapshots:
                            # Get most recent value
                            latest = max(snapshots, key=lambda x: x.timestamp)
                            component_metrics[metric_type.value] = {
                                'value': latest.value,
                                'timestamp': latest.timestamp,
                                'status': 'good' if latest.value > 0.7 else 'warning'  # Simple status
                            }
                    
                    current_metrics[component] = component_metrics
            
            return {
                'success': True,
                'metrics': current_metrics,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting real-time metrics: {e}")
            return {
                'success': False,
                'error': str(e),
                'metrics': {},
                'timestamp': datetime.now().isoformat()
            }
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get monitoring system status"""
        
        total_metrics = sum(
            sum(len(metrics) for metrics in component.values())
            for component in self.performance_data.values()
        )
        
        return {
            'monitoring_active': True,
            'components_monitored': len(self.performance_data),
            'total_metrics_collected': total_metrics,
            'last_collection': max([
                max([s.timestamp for s in metrics])
                for component in self.performance_data.values()
                for metrics in component.values()
                if metrics
            ]) if self.performance_data else None,
            'alert_thresholds_configured': len(self.alert_thresholds),
            'optimization_cache_size': len(self.optimization_cache)
        }

# Global instance
ai_performance_monitor = AIPerformanceMonitor()