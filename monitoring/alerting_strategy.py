#!/usr/bin/env python3
"""
Comprehensive Alerting Strategy for 6FB AI Agent System

This module implements a sophisticated alerting system including:
- Multi-channel alert routing
- Alert prioritization and throttling
- Escalation management
- Alert correlation and deduplication
- Dynamic thresholds and anomaly detection
- Alert fatigue prevention
"""

import asyncio
import logging
import time
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
import statistics
from collections import defaultdict, deque
import re

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class AlertChannel(Enum):
    """Alert delivery channels"""
    EMAIL = "email"
    SLACK = "slack"
    SMS = "sms"
    WEBHOOK = "webhook"
    PAGER_DUTY = "pagerduty"
    TEAMS = "teams"
    DISCORD = "discord"


class AlertState(Enum):
    """Alert states"""
    FIRING = "firing"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"
    ACKNOWLEDGED = "acknowledged"


class ThresholdType(Enum):
    """Types of alert thresholds"""
    STATIC = "static"
    DYNAMIC = "dynamic"
    PERCENTAGE_CHANGE = "percentage_change"
    ANOMALY_DETECTION = "anomaly_detection"


@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    description: str
    metric_query: str
    severity: AlertSeverity
    threshold_type: ThresholdType
    threshold_value: float
    evaluation_interval_seconds: int = 60
    for_duration_seconds: int = 300  # Alert fires after threshold exceeded for this duration
    
    # Channels and routing
    channels: List[AlertChannel] = field(default_factory=list)
    escalation_channels: Dict[int, List[AlertChannel]] = field(default_factory=dict)  # minutes -> channels
    
    # Throttling and suppression
    throttle_duration_seconds: int = 3600  # Don't repeat same alert for 1 hour
    max_alerts_per_hour: int = 5
    
    # Conditions and filters
    conditions: Dict[str, Any] = field(default_factory=dict)
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    
    # Anomaly detection parameters (for ANOMALY_DETECTION threshold type)
    anomaly_sensitivity: float = 2.0  # Standard deviations
    anomaly_window_minutes: int = 60
    
    enabled: bool = True


@dataclass
class Alert:
    """Alert instance"""
    id: str
    rule_name: str
    severity: AlertSeverity
    state: AlertState
    title: str
    description: str
    metric_value: float
    threshold_value: float
    
    # Timing
    started_at: datetime
    last_sent_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    
    # Metadata
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)
    fingerprint: str = ""
    
    # Tracking
    send_count: int = 0
    channels_sent: Set[AlertChannel] = field(default_factory=set)
    acknowledged_by: Optional[str] = None
    
    def __post_init__(self):
        if not self.fingerprint:
            self.fingerprint = self._generate_fingerprint()
    
    def _generate_fingerprint(self) -> str:
        """Generate unique fingerprint for alert deduplication"""
        key_data = f"{self.rule_name}:{self.title}:{sorted(self.labels.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()[:12]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary"""
        return {
            'id': self.id,
            'rule_name': self.rule_name,
            'severity': self.severity.value,
            'state': self.state.value,
            'title': self.title,
            'description': self.description,
            'metric_value': self.metric_value,
            'threshold_value': self.threshold_value,
            'started_at': self.started_at.isoformat(),
            'last_sent_at': self.last_sent_at.isoformat() if self.last_sent_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'labels': self.labels,
            'annotations': self.annotations,
            'fingerprint': self.fingerprint,
            'send_count': self.send_count,
            'channels_sent': [c.value for c in self.channels_sent],
            'acknowledged_by': self.acknowledged_by
        }


@dataclass
class AlertTemplate:
    """Template for formatting alert messages"""
    channel: AlertChannel
    title_template: str
    body_template: str
    format_type: str = "text"  # text, markdown, html
    
    def format_alert(self, alert: Alert) -> Tuple[str, str]:
        """Format alert using template"""
        context = {
            'alert': alert,
            'severity': alert.severity.value.upper(),
            'rule_name': alert.rule_name,
            'title': alert.title,
            'description': alert.description,
            'metric_value': alert.metric_value,
            'threshold_value': alert.threshold_value,
            'started_at': alert.started_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
            'duration': self._format_duration(alert.started_at),
            **alert.labels,
            **alert.annotations
        }
        
        title = self._substitute_template(self.title_template, context)
        body = self._substitute_template(self.body_template, context)
        
        return title, body
    
    def _substitute_template(self, template: str, context: Dict[str, Any]) -> str:
        """Substitute template variables"""
        try:
            return template.format(**context)
        except KeyError as e:
            logger.warning(f"Template variable not found: {e}")
            return template
    
    def _format_duration(self, start_time: datetime) -> str:
        """Format duration since alert started"""
        duration = datetime.utcnow() - start_time
        hours, remainder = divmod(duration.total_seconds(), 3600)
        minutes, seconds = divmod(remainder, 60)
        
        if hours > 0:
            return f"{int(hours)}h {int(minutes)}m"
        elif minutes > 0:
            return f"{int(minutes)}m {int(seconds)}s"
        else:
            return f"{int(seconds)}s"


class ThresholdManager:
    """Manages dynamic thresholds and anomaly detection"""
    
    def __init__(self):
        self.metric_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.baseline_stats: Dict[str, Dict[str, float]] = {}
    
    def update_metric_history(self, metric_name: str, value: float, timestamp: datetime):
        """Update metric history for threshold calculations"""
        self.metric_history[metric_name].append({
            'value': value,
            'timestamp': timestamp
        })
        
        # Update baseline statistics
        self._update_baseline_stats(metric_name)
    
    def _update_baseline_stats(self, metric_name: str):
        """Update baseline statistics for a metric"""
        history = self.metric_history[metric_name]
        if len(history) < 10:
            return
        
        values = [point['value'] for point in history]
        
        self.baseline_stats[metric_name] = {
            'mean': statistics.mean(values),
            'stdev': statistics.stdev(values) if len(values) > 1 else 0,
            'median': statistics.median(values),
            'p95': self._percentile(values, 0.95),
            'p99': self._percentile(values, 0.99),
            'last_updated': datetime.utcnow().timestamp()
        }
    
    def _percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile of values"""
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile)
        return sorted_values[min(index, len(sorted_values) - 1)]
    
    def evaluate_threshold(self, rule: AlertRule, current_value: float) -> bool:
        """Evaluate if current value exceeds threshold"""
        if rule.threshold_type == ThresholdType.STATIC:
            return current_value > rule.threshold_value
        
        elif rule.threshold_type == ThresholdType.DYNAMIC:
            return self._evaluate_dynamic_threshold(rule, current_value)
        
        elif rule.threshold_type == ThresholdType.PERCENTAGE_CHANGE:
            return self._evaluate_percentage_change(rule, current_value)
        
        elif rule.threshold_type == ThresholdType.ANOMALY_DETECTION:
            return self._evaluate_anomaly_detection(rule, current_value)
        
        return False
    
    def _evaluate_dynamic_threshold(self, rule: AlertRule, current_value: float) -> bool:
        """Evaluate dynamic threshold based on historical data"""
        metric_name = rule.name
        if metric_name not in self.baseline_stats:
            return False
        
        stats = self.baseline_stats[metric_name]
        
        # Dynamic threshold based on P95 + margin
        dynamic_threshold = stats['p95'] * (1 + rule.threshold_value / 100)
        return current_value > dynamic_threshold
    
    def _evaluate_percentage_change(self, rule: AlertRule, current_value: float) -> bool:
        """Evaluate percentage change threshold"""
        metric_name = rule.name
        history = self.metric_history[metric_name]
        
        if len(history) < 2:
            return False
        
        # Compare with value from specified time ago
        comparison_window = timedelta(minutes=rule.anomaly_window_minutes)
        cutoff_time = datetime.utcnow() - comparison_window
        
        historical_values = [
            point['value'] for point in history
            if point['timestamp'] >= cutoff_time
        ]
        
        if not historical_values:
            return False
        
        baseline_value = statistics.mean(historical_values)
        if baseline_value == 0:
            return False
        
        percentage_change = abs((current_value - baseline_value) / baseline_value) * 100
        return percentage_change > rule.threshold_value
    
    def _evaluate_anomaly_detection(self, rule: AlertRule, current_value: float) -> bool:
        """Evaluate anomaly detection threshold"""
        metric_name = rule.name
        if metric_name not in self.baseline_stats:
            return False
        
        stats = self.baseline_stats[metric_name]
        mean = stats['mean']
        stdev = stats['stdev']
        
        if stdev == 0:
            return False
        
        # Calculate Z-score
        z_score = abs((current_value - mean) / stdev)
        return z_score > rule.anomaly_sensitivity
    
    def get_dynamic_threshold(self, rule: AlertRule) -> float:
        """Get the current dynamic threshold value"""
        if rule.threshold_type == ThresholdType.STATIC:
            return rule.threshold_value
        
        elif rule.threshold_type == ThresholdType.DYNAMIC:
            metric_name = rule.name
            if metric_name in self.baseline_stats:
                stats = self.baseline_stats[metric_name]
                return stats['p95'] * (1 + rule.threshold_value / 100)
        
        elif rule.threshold_type == ThresholdType.ANOMALY_DETECTION:
            metric_name = rule.name
            if metric_name in self.baseline_stats:
                stats = self.baseline_stats[metric_name]
                return stats['mean'] + (rule.anomaly_sensitivity * stats['stdev'])
        
        return rule.threshold_value


class AlertCorrelation:
    """Handles alert correlation and deduplication"""
    
    def __init__(self):
        self.correlation_rules: List[Dict[str, Any]] = []
        self.alert_groups: Dict[str, List[str]] = {}  # group_id -> alert_ids
        
        # Initialize default correlation rules
        self._initialize_correlation_rules()
    
    def _initialize_correlation_rules(self):
        """Initialize default correlation rules"""
        self.correlation_rules = [
            {
                'name': 'service_outage_correlation',
                'description': 'Correlate multiple service failures',
                'conditions': {
                    'time_window_minutes': 5,
                    'min_alerts': 2,
                    'label_matchers': [{'service': r'.*'}],
                    'severity_levels': ['critical', 'high']
                },
                'action': 'create_group',
                'group_title': 'Service Outage - Multiple Services Affected'
            },
            {
                'name': 'performance_degradation_correlation',
                'description': 'Correlate performance issues across components',
                'conditions': {
                    'time_window_minutes': 10,
                    'min_alerts': 3,
                    'rule_name_patterns': [r'.*latency.*', r'.*response_time.*', r'.*slow.*'],
                    'severity_levels': ['high', 'medium']
                },
                'action': 'create_group',
                'group_title': 'Performance Degradation - Multiple Components'
            },
            {
                'name': 'resource_exhaustion_correlation',
                'description': 'Correlate resource exhaustion alerts',
                'conditions': {
                    'time_window_minutes': 15,
                    'min_alerts': 2,
                    'rule_name_patterns': [r'.*memory.*', r'.*cpu.*', r'.*disk.*'],
                    'severity_levels': ['critical', 'high', 'medium']
                },
                'action': 'create_group',
                'group_title': 'Resource Exhaustion - Multiple Resources'
            }
        ]
    
    def correlate_alerts(self, alerts: List[Alert]) -> Dict[str, List[Alert]]:
        """Correlate alerts and return grouped alerts"""
        correlated_groups = {}
        uncorrelated_alerts = []
        
        for rule in self.correlation_rules:
            matching_alerts = self._find_matching_alerts(alerts, rule)
            
            if len(matching_alerts) >= rule['conditions']['min_alerts']:
                group_id = f"{rule['name']}_{int(time.time())}"
                correlated_groups[group_id] = {
                    'title': rule['group_title'],
                    'alerts': matching_alerts,
                    'rule': rule['name']
                }
                
                # Remove correlated alerts from the pool
                alerts = [a for a in alerts if a not in matching_alerts]
        
        # Remaining alerts are uncorrelated
        if alerts:
            correlated_groups['uncorrelated'] = {
                'title': 'Individual Alerts',
                'alerts': alerts,
                'rule': 'none'
            }
        
        return correlated_groups
    
    def _find_matching_alerts(self, alerts: List[Alert], rule: Dict[str, Any]) -> List[Alert]:
        """Find alerts matching correlation rule conditions"""
        conditions = rule['conditions']
        time_window = timedelta(minutes=conditions['time_window_minutes'])
        cutoff_time = datetime.utcnow() - time_window
        
        # Filter by time window
        recent_alerts = [a for a in alerts if a.started_at >= cutoff_time]
        
        # Filter by severity
        if 'severity_levels' in conditions:
            recent_alerts = [
                a for a in recent_alerts 
                if a.severity.value in conditions['severity_levels']
            ]
        
        # Filter by label matchers
        if 'label_matchers' in conditions:
            for matcher in conditions['label_matchers']:
                for label_key, pattern in matcher.items():
                    recent_alerts = [
                        a for a in recent_alerts
                        if label_key in a.labels and re.match(pattern, a.labels[label_key])
                    ]
        
        # Filter by rule name patterns
        if 'rule_name_patterns' in conditions:
            pattern_alerts = []
            for pattern in conditions['rule_name_patterns']:
                pattern_alerts.extend([
                    a for a in recent_alerts
                    if re.match(pattern, a.rule_name, re.IGNORECASE)
                ])
            recent_alerts = list(set(pattern_alerts))
        
        return recent_alerts
    
    def deduplicate_alerts(self, alerts: List[Alert]) -> List[Alert]:
        """Remove duplicate alerts based on fingerprint"""
        seen_fingerprints = set()
        deduplicated = []
        
        for alert in alerts:
            if alert.fingerprint not in seen_fingerprints:
                deduplicated.append(alert)
                seen_fingerprints.add(alert.fingerprint)
        
        return deduplicated


class AlertRouter:
    """Routes alerts to appropriate channels based on rules"""
    
    def __init__(self):
        self.routing_rules: List[Dict[str, Any]] = []
        self.templates: Dict[AlertChannel, AlertTemplate] = {}
        self.channel_handlers: Dict[AlertChannel, Callable] = {}
        
        # Initialize default routing rules and templates
        self._initialize_routing_rules()
        self._initialize_templates()
    
    def _initialize_routing_rules(self):
        """Initialize default routing rules"""
        self.routing_rules = [
            {
                'name': 'critical_alerts',
                'conditions': {
                    'severity': ['critical'],
                    'business_hours_only': False
                },
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS],
                'escalation': {
                    15: [AlertChannel.EMAIL, AlertChannel.SMS],  # 15 minutes
                    30: [AlertChannel.PAGER_DUTY]  # 30 minutes
                }
            },
            {
                'name': 'high_severity_business_hours',
                'conditions': {
                    'severity': ['high'],
                    'business_hours_only': True
                },
                'channels': [AlertChannel.EMAIL, AlertChannel.SLACK],
                'escalation': {
                    30: [AlertChannel.EMAIL, AlertChannel.SMS]
                }
            },
            {
                'name': 'high_severity_after_hours',
                'conditions': {
                    'severity': ['high'],
                    'business_hours_only': False,
                    'after_hours_only': True
                },
                'channels': [AlertChannel.EMAIL, AlertChannel.SMS],
                'escalation': {
                    60: [AlertChannel.PAGER_DUTY]
                }
            },
            {
                'name': 'medium_low_alerts',
                'conditions': {
                    'severity': ['medium', 'low'],
                    'business_hours_only': True
                },
                'channels': [AlertChannel.SLACK],
                'escalation': {}
            },
            {
                'name': 'info_alerts',
                'conditions': {
                    'severity': ['info']
                },
                'channels': [AlertChannel.SLACK],
                'escalation': {}
            }
        ]
    
    def _initialize_templates(self):
        """Initialize alert message templates"""
        # Email template
        self.templates[AlertChannel.EMAIL] = AlertTemplate(
            channel=AlertChannel.EMAIL,
            title_template="[{severity}] {title}",
            body_template="""
Alert Details:
- Rule: {rule_name}
- Severity: {severity}
- Started: {started_at}
- Duration: {duration}

Description: {description}

Current Value: {metric_value}
Threshold: {threshold_value}

Labels: {labels}

This is an automated alert from the 6FB AI Agent System monitoring service.
""",
            format_type="text"
        )
        
        # Slack template
        self.templates[AlertChannel.SLACK] = AlertTemplate(
            channel=AlertChannel.SLACK,
            title_template=":rotating_light: [{severity}] {title}",
            body_template="""
*Alert Details:*
• *Rule:* {rule_name}
• *Severity:* {severity}
• *Started:* {started_at}
• *Duration:* {duration}

*Description:* {description}

*Current Value:* {metric_value}
*Threshold:* {threshold_value}

_Automated alert from 6FB AI Agent System_
""",
            format_type="markdown"
        )
        
        # SMS template (short format)
        self.templates[AlertChannel.SMS] = AlertTemplate(
            channel=AlertChannel.SMS,
            title_template="[{severity}] {title}",
            body_template="6FB Alert: {title} - {description}. Value: {metric_value}, Threshold: {threshold_value}. Duration: {duration}",
            format_type="text"
        )
        
        # Webhook template (JSON)
        self.templates[AlertChannel.WEBHOOK] = AlertTemplate(
            channel=AlertChannel.WEBHOOK,
            title_template="{title}",
            body_template='{"alert_id": "{alert.id}", "severity": "{severity}", "title": "{title}", "description": "{description}", "metric_value": {metric_value}, "threshold_value": {threshold_value}, "started_at": "{started_at}", "labels": {labels}}',
            format_type="json"
        )
    
    def route_alert(self, alert: Alert) -> Dict[AlertChannel, Tuple[str, str]]:
        """Route alert to appropriate channels and return formatted messages"""
        routed_messages = {}
        
        # Find matching routing rules
        for rule in self.routing_rules:
            if self._alert_matches_rule(alert, rule):
                for channel in rule['channels']:
                    if channel in self.templates:
                        title, body = self.templates[channel].format_alert(alert)
                        routed_messages[channel] = (title, body)
                
                # Only apply the first matching rule
                break
        
        return routed_messages
    
    def _alert_matches_rule(self, alert: Alert, rule: Dict[str, Any]) -> bool:
        """Check if alert matches routing rule conditions"""
        conditions = rule['conditions']
        
        # Check severity
        if 'severity' in conditions:
            if alert.severity.value not in conditions['severity']:
                return False
        
        # Check business hours
        if conditions.get('business_hours_only', False):
            if not self._is_business_hours():
                return False
        
        # Check after hours
        if conditions.get('after_hours_only', False):
            if self._is_business_hours():
                return False
        
        # Check labels
        if 'labels' in conditions:
            for label_key, label_value in conditions['labels'].items():
                if alert.labels.get(label_key) != label_value:
                    return False
        
        # Check rule name patterns
        if 'rule_patterns' in conditions:
            if not any(re.match(pattern, alert.rule_name, re.IGNORECASE) 
                      for pattern in conditions['rule_patterns']):
                return False
        
        return True
    
    def _is_business_hours(self) -> bool:
        """Check if current time is during business hours (9 AM - 6 PM EST, Mon-Fri)"""
        now = datetime.utcnow()
        
        # Convert to EST (approximately)
        est_hour = (now.hour - 5) % 24
        weekday = now.weekday()  # 0=Monday, 6=Sunday
        
        return weekday < 5 and 9 <= est_hour < 18
    
    def get_escalation_channels(self, alert: Alert, minutes_elapsed: int) -> List[AlertChannel]:
        """Get escalation channels based on time elapsed"""
        escalation_channels = []
        
        # Find matching routing rule
        for rule in self.routing_rules:
            if self._alert_matches_rule(alert, rule):
                escalation = rule.get('escalation', {})
                
                for escalation_time, channels in escalation.items():
                    if minutes_elapsed >= escalation_time:
                        escalation_channels.extend(channels)
                
                break
        
        return list(set(escalation_channels))


class AlertManager:
    """Main alert management system"""
    
    def __init__(self):
        self.alert_rules: Dict[str, AlertRule] = {}
        self.active_alerts: Dict[str, Alert] = {}  # fingerprint -> alert
        self.alert_history: List[Alert] = []
        self.alert_counters: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        
        # Components
        self.threshold_manager = ThresholdManager()
        self.correlation = AlertCorrelation()
        self.router = AlertRouter()
        
        # Callbacks
        self.alert_callbacks: List[Callable] = []
        
        # Initialize default alert rules
        self._initialize_default_rules()
    
    def _initialize_default_rules(self):
        """Initialize default alert rules"""
        
        # Critical service down
        self.add_alert_rule(AlertRule(
            name="service_down",
            description="Service is completely down",
            metric_query="up{job='backend-api'} == 0",
            severity=AlertSeverity.CRITICAL,
            threshold_type=ThresholdType.STATIC,
            threshold_value=0,
            evaluation_interval_seconds=30,
            for_duration_seconds=60,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS],
            escalation_channels={15: [AlertChannel.PAGER_DUTY]},
            labels={"service": "backend", "component": "api"}
        ))
        
        # High error rate
        self.add_alert_rule(AlertRule(
            name="high_error_rate",
            description="API error rate is above threshold",
            metric_query="rate(sixfb_api_requests_total{status_code=~'5..'}[5m]) > 0.05",
            severity=AlertSeverity.HIGH,
            threshold_type=ThresholdType.STATIC,
            threshold_value=5.0,  # 5%
            evaluation_interval_seconds=60,
            for_duration_seconds=300,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
            escalation_channels={30: [AlertChannel.SMS]},
            labels={"service": "backend", "type": "error_rate"}
        ))
        
        # High latency
        self.add_alert_rule(AlertRule(
            name="high_api_latency",
            description="API response time is above threshold",
            metric_query="histogram_quantile(0.95, rate(sixfb_api_request_duration_seconds_bucket[5m])) > 2",
            severity=AlertSeverity.MEDIUM,
            threshold_type=ThresholdType.DYNAMIC,
            threshold_value=20.0,  # 20% above baseline
            evaluation_interval_seconds=60,
            for_duration_seconds=300,
            channels=[AlertChannel.SLACK],
            escalation_channels={60: [AlertChannel.EMAIL]},
            labels={"service": "backend", "type": "latency"}
        ))
        
        # Memory usage
        self.add_alert_rule(AlertRule(
            name="high_memory_usage",
            description="Memory usage is critically high",
            metric_query="sixfb_api_memory_usage_percent > 90",
            severity=AlertSeverity.HIGH,
            threshold_type=ThresholdType.STATIC,
            threshold_value=90.0,
            evaluation_interval_seconds=60,
            for_duration_seconds=300,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK],
            escalation_channels={30: [AlertChannel.SMS]},
            labels={"service": "system", "type": "memory"}
        ))
        
        # Database connection issues
        self.add_alert_rule(AlertRule(
            name="database_connection_failures",
            description="Database connection failure rate is high",
            metric_query="rate(database_connection_failures_total[5m]) > 0.1",
            severity=AlertSeverity.CRITICAL,
            threshold_type=ThresholdType.STATIC,
            threshold_value=0.1,
            evaluation_interval_seconds=60,
            for_duration_seconds=120,
            channels=[AlertChannel.EMAIL, AlertChannel.SLACK, AlertChannel.SMS],
            escalation_channels={10: [AlertChannel.PAGER_DUTY]},
            labels={"service": "database", "type": "connection"}
        ))
        
        # Anomaly detection for user activity
        self.add_alert_rule(AlertRule(
            name="unusual_user_activity",
            description="Unusual pattern in user activity detected",
            metric_query="rate(user_sessions_total[5m])",
            severity=AlertSeverity.MEDIUM,
            threshold_type=ThresholdType.ANOMALY_DETECTION,
            threshold_value=2.5,  # 2.5 standard deviations
            evaluation_interval_seconds=300,
            for_duration_seconds=600,
            channels=[AlertChannel.SLACK],
            anomaly_sensitivity=2.5,
            anomaly_window_minutes=60,
            labels={"service": "frontend", "type": "anomaly"}
        ))
    
    def add_alert_rule(self, rule: AlertRule):
        """Add an alert rule"""
        self.alert_rules[rule.name] = rule
        logger.info(f"Added alert rule: {rule.name}")
    
    def remove_alert_rule(self, name: str):
        """Remove an alert rule"""
        if name in self.alert_rules:
            del self.alert_rules[name]
            logger.info(f"Removed alert rule: {name}")
    
    async def evaluate_rules(self, metrics: Dict[str, float]) -> List[Alert]:
        """Evaluate all alert rules against current metrics"""
        new_alerts = []
        resolved_alerts = []
        
        for rule_name, rule in self.alert_rules.items():
            if not rule.enabled:
                continue
            
            try:
                # Get metric value (simplified - in practice would query Prometheus)
                metric_value = metrics.get(rule_name, 0.0)
                
                # Update metric history for threshold calculations
                self.threshold_manager.update_metric_history(rule_name, metric_value, datetime.utcnow())
                
                # Evaluate threshold
                threshold_exceeded = self.threshold_manager.evaluate_threshold(rule, metric_value)
                
                alert_fingerprint = self._generate_alert_fingerprint(rule, metric_value)
                
                if threshold_exceeded:
                    # Check if alert already exists
                    if alert_fingerprint in self.active_alerts:
                        # Update existing alert
                        existing_alert = self.active_alerts[alert_fingerprint]
                        existing_alert.metric_value = metric_value
                        
                        # Check if it's time to send another notification
                        if self._should_send_alert(existing_alert, rule):
                            await self._send_alert(existing_alert, rule)
                    else:
                        # Create new alert
                        alert = Alert(
                            id=f"{rule_name}_{int(time.time())}",
                            rule_name=rule_name,
                            severity=rule.severity,
                            state=AlertState.FIRING,
                            title=f"{rule.description}",
                            description=self._generate_alert_description(rule, metric_value),
                            metric_value=metric_value,
                            threshold_value=self.threshold_manager.get_dynamic_threshold(rule),
                            started_at=datetime.utcnow(),
                            labels=rule.labels.copy(),
                            annotations=rule.annotations.copy(),
                            fingerprint=alert_fingerprint
                        )
                        
                        self.active_alerts[alert_fingerprint] = alert
                        new_alerts.append(alert)
                        
                        # Send alert
                        await self._send_alert(alert, rule)
                
                else:
                    # Check if there's an active alert that should be resolved
                    if alert_fingerprint in self.active_alerts:
                        alert = self.active_alerts[alert_fingerprint]
                        alert.state = AlertState.RESOLVED
                        alert.resolved_at = datetime.utcnow()
                        
                        resolved_alerts.append(alert)
                        
                        # Move to history
                        self.alert_history.append(alert)
                        del self.active_alerts[alert_fingerprint]
                        
                        # Send resolution notification
                        await self._send_resolution_notification(alert, rule)
            
            except Exception as e:
                logger.error(f"Failed to evaluate rule {rule_name}: {e}")
        
        # Process correlations
        if new_alerts:
            correlated_groups = self.correlation.correlate_alerts(new_alerts)
            await self._process_correlated_alerts(correlated_groups)
        
        return new_alerts + resolved_alerts
    
    def _generate_alert_fingerprint(self, rule: AlertRule, metric_value: float) -> str:
        """Generate fingerprint for alert deduplication"""
        key_data = f"{rule.name}:{sorted(rule.labels.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()[:12]
    
    def _generate_alert_description(self, rule: AlertRule, metric_value: float) -> str:
        """Generate detailed alert description"""
        threshold = self.threshold_manager.get_dynamic_threshold(rule)
        
        description = f"{rule.description}. "
        description += f"Current value: {metric_value:.2f}, "
        description += f"Threshold: {threshold:.2f}"
        
        if rule.threshold_type != ThresholdType.STATIC:
            description += f" ({rule.threshold_type.value})"
        
        return description
    
    def _should_send_alert(self, alert: Alert, rule: AlertRule) -> bool:
        """Check if alert should be sent based on throttling rules"""
        now = datetime.utcnow()
        
        # Check throttle duration
        if alert.last_sent_at:
            time_since_last = (now - alert.last_sent_at).total_seconds()
            if time_since_last < rule.throttle_duration_seconds:
                return False
        
        # Check max alerts per hour
        hour_ago = now - timedelta(hours=1)
        recent_sends = sum(1 for send_time in self.alert_counters[rule.name] 
                          if send_time > hour_ago.timestamp())
        
        if recent_sends >= rule.max_alerts_per_hour:
            return False
        
        return True
    
    async def _send_alert(self, alert: Alert, rule: AlertRule):
        """Send alert through configured channels"""
        try:
            # Route alert to channels
            routed_messages = self.router.route_alert(alert)
            
            # Send to each channel
            for channel, (title, body) in routed_messages.items():
                await self._send_to_channel(alert, channel, title, body)
                alert.channels_sent.add(channel)
            
            # Update alert tracking
            alert.last_sent_at = datetime.utcnow()
            alert.send_count += 1
            
            # Update counters
            self.alert_counters[rule.name].append(time.time())
            
            # Trigger callbacks
            for callback in self.alert_callbacks:
                try:
                    await callback({
                        'type': 'alert_fired',
                        'alert': alert.to_dict(),
                        'rule': rule.name
                    })
                except Exception as e:
                    logger.error(f"Alert callback failed: {e}")
            
            logger.info(f"Sent alert {alert.id} to {len(routed_messages)} channels")
            
        except Exception as e:
            logger.error(f"Failed to send alert {alert.id}: {e}")
    
    async def _send_to_channel(self, alert: Alert, channel: AlertChannel, title: str, body: str):
        """Send alert to specific channel"""
        # This would integrate with actual notification services
        logger.info(f"Sending alert {alert.id} to {channel.value}: {title}")
        
        # Placeholder for actual channel implementations
        if channel == AlertChannel.EMAIL:
            await self._send_email(alert, title, body)
        elif channel == AlertChannel.SLACK:
            await self._send_slack(alert, title, body)
        elif channel == AlertChannel.SMS:
            await self._send_sms(alert, title, body)
        elif channel == AlertChannel.WEBHOOK:
            await self._send_webhook(alert, title, body)
    
    async def _send_email(self, alert: Alert, title: str, body: str):
        """Send email notification (placeholder)"""
        logger.info(f"EMAIL: {title}")
    
    async def _send_slack(self, alert: Alert, title: str, body: str):
        """Send Slack notification (placeholder)"""
        logger.info(f"SLACK: {title}")
    
    async def _send_sms(self, alert: Alert, title: str, body: str):
        """Send SMS notification (placeholder)"""
        logger.info(f"SMS: {title}")
    
    async def _send_webhook(self, alert: Alert, title: str, body: str):
        """Send webhook notification (placeholder)"""
        logger.info(f"WEBHOOK: {title}")
    
    async def _send_resolution_notification(self, alert: Alert, rule: AlertRule):
        """Send alert resolution notification"""
        try:
            # Only send resolution notifications for high severity alerts
            if alert.severity in [AlertSeverity.CRITICAL, AlertSeverity.HIGH]:
                resolution_title = f"[RESOLVED] {alert.title}"
                resolution_body = f"Alert {alert.id} has been resolved. Duration: {(alert.resolved_at - alert.started_at).total_seconds():.0f} seconds"
                
                for channel in alert.channels_sent:
                    await self._send_to_channel(alert, channel, resolution_title, resolution_body)
            
            logger.info(f"Sent resolution notification for alert {alert.id}")
            
        except Exception as e:
            logger.error(f"Failed to send resolution notification for alert {alert.id}: {e}")
    
    async def _process_correlated_alerts(self, correlated_groups: Dict[str, List[Alert]]):
        """Process correlated alert groups"""
        for group_id, group_data in correlated_groups.items():
            if group_id != 'uncorrelated' and len(group_data['alerts']) > 1:
                logger.info(f"Correlated alert group: {group_data['title']} with {len(group_data['alerts'])} alerts")
                
                # Could create a meta-alert or send consolidated notification
                # For now, just log the correlation
    
    def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert"""
        for alert in self.active_alerts.values():
            if alert.id == alert_id:
                alert.state = AlertState.ACKNOWLEDGED
                alert.acknowledged_at = datetime.utcnow()
                alert.acknowledged_by = acknowledged_by
                
                logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
                return True
        
        return False
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        return list(self.active_alerts.values())
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """Get alert summary"""
        active_alerts = list(self.active_alerts.values())
        
        # Count by severity
        by_severity = {}
        for severity in AlertSeverity:
            by_severity[severity.value] = len([
                a for a in active_alerts if a.severity == severity
            ])
        
        # Count by state
        by_state = {}
        for state in AlertState:
            by_state[state.value] = len([
                a for a in active_alerts if a.state == state
            ])
        
        return {
            'total_active_alerts': len(active_alerts),
            'by_severity': by_severity,
            'by_state': by_state,
            'total_rules': len(self.alert_rules),
            'enabled_rules': len([r for r in self.alert_rules.values() if r.enabled]),
            'recent_alerts': len([a for a in self.alert_history 
                                if a.started_at > datetime.utcnow() - timedelta(hours=24)])
        }
    
    def add_alert_callback(self, callback: Callable):
        """Add alert callback function"""
        self.alert_callbacks.append(callback)


# Export main components
__all__ = [
    'AlertManager',
    'AlertRule',
    'Alert',
    'AlertRouter',
    'AlertCorrelation',
    'ThresholdManager',
    'AlertSeverity',
    'AlertChannel',
    'AlertState',
    'ThresholdType'
]