#!/usr/bin/env python3
"""
Production Monitoring and Alerts Configuration for 6FB AI Agent System
Implements comprehensive monitoring, alerting, and observability features.
"""

import os
import logging
import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp
import psutil
import sqlite3

logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AlertStatus(Enum):
    """Alert status types"""
    ACTIVE = "active"
    RESOLVED = "resolved" 
    ACKNOWLEDGED = "acknowledged"

@dataclass
class AlertRule:
    """Alert rule configuration"""
    name: str
    description: str
    severity: AlertSeverity
    metric_name: str
    threshold_value: float
    comparison_operator: str  # >, <, >=, <=, ==, !=
    duration_seconds: int     # Alert fires after threshold exceeded for this duration
    cooldown_seconds: int     # Minimum time between alert notifications
    enabled: bool = True
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

@dataclass 
class Alert:
    """Alert instance"""
    id: str
    rule_name: str
    severity: AlertSeverity
    status: AlertStatus
    title: str
    description: str
    metric_value: float
    threshold_value: float
    started_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    tags: Dict[str, str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = {}

class MetricsCollector:
    """Collects system and application metrics"""
    
    def __init__(self, db_path: str = "./agent_system.db"):
        self.db_path = db_path
        self.metrics_cache = {}
        self.cache_ttl = 30  # seconds
        
    async def collect_system_metrics(self) -> Dict[str, float]:
        """Collect system-level metrics"""
        
        cache_key = "system_metrics"
        now = time.time()
        
        if (cache_key in self.metrics_cache and 
            now - self.metrics_cache[cache_key]['timestamp'] < self.cache_ttl):
            return self.metrics_cache[cache_key]['data']
        
        try:
            metrics = {
                # CPU metrics
                'cpu_usage_percent': psutil.cpu_percent(interval=1),
                'cpu_load_1m': psutil.getloadavg()[0] if hasattr(psutil, 'getloadavg') else 0,
                'cpu_load_5m': psutil.getloadavg()[1] if hasattr(psutil, 'getloadavg') else 0,
                'cpu_load_15m': psutil.getloadavg()[2] if hasattr(psutil, 'getloadavg') else 0,
                
                # Memory metrics
                'memory_usage_percent': psutil.virtual_memory().percent,
                'memory_used_bytes': psutil.virtual_memory().used,
                'memory_available_bytes': psutil.virtual_memory().available,
                'swap_usage_percent': psutil.swap_memory().percent,
                
                # Disk metrics
                'disk_usage_percent': psutil.disk_usage('/').percent,
                'disk_free_bytes': psutil.disk_usage('/').free,
                'disk_used_bytes': psutil.disk_usage('/').used,
                
                # Network metrics (if available)
                'network_bytes_sent': psutil.net_io_counters().bytes_sent,
                'network_bytes_recv': psutil.net_io_counters().bytes_recv,
                'network_packets_sent': psutil.net_io_counters().packets_sent,
                'network_packets_recv': psutil.net_io_counters().packets_recv,
            }
            
            # Cache the results
            self.metrics_cache[cache_key] = {
                'data': metrics,
                'timestamp': now
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {}
    
    async def collect_application_metrics(self) -> Dict[str, float]:
        """Collect application-specific metrics"""
        
        cache_key = "app_metrics"
        now = time.time()
        
        if (cache_key in self.metrics_cache and 
            now - self.metrics_cache[cache_key]['timestamp'] < self.cache_ttl):
            return self.metrics_cache[cache_key]['data']
        
        try:
            metrics = {}
            
            # Database metrics
            if os.path.exists(self.db_path):
                db_size = os.path.getsize(self.db_path)
                metrics['database_size_bytes'] = db_size
                
                # Query performance metrics
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                
                # Count active users
                cursor.execute("SELECT COUNT(*) FROM users WHERE is_active = 1")
                metrics['active_users_count'] = cursor.fetchone()[0]
                
                # Count recent sessions (last 24 hours)
                cursor.execute("""
                    SELECT COUNT(*) FROM sessions 
                    WHERE created_at > datetime('now', '-24 hours')
                """)
                metrics['recent_sessions_count'] = cursor.fetchone()[0]
                
                # Count AI conversations (last 24 hours)
                cursor.execute("""
                    SELECT COUNT(*) FROM ai_conversations 
                    WHERE created_at > datetime('now', '-24 hours')
                """)
                metrics['recent_conversations_count'] = cursor.fetchone()[0]
                
                # Count audit log entries (last hour)
                cursor.execute("""
                    SELECT COUNT(*) FROM audit_logs 
                    WHERE timestamp > datetime('now', '-1 hour')
                """)
                metrics['recent_audit_logs_count'] = cursor.fetchone()[0]
                
                conn.close()
            
            # Security metrics
            metrics['failed_login_attempts'] = await self._count_failed_logins()
            metrics['security_violations'] = await self._count_security_violations()
            
            # Performance metrics
            metrics['response_time_avg'] = await self._get_avg_response_time()
            metrics['error_rate_percent'] = await self._get_error_rate()
            
            # Cache the results
            self.metrics_cache[cache_key] = {
                'data': metrics,
                'timestamp': now
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect application metrics: {e}")
            return {}
    
    async def _count_failed_logins(self) -> float:
        """Count failed login attempts in the last hour"""
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM audit_logs 
                WHERE action = 'LOGIN_FAILED' 
                AND timestamp > datetime('now', '-1 hour')
            """)
            
            result = cursor.fetchone()[0]
            conn.close()
            return float(result)
            
        except Exception as e:
            logger.warning(f"Failed to count failed logins: {e}")
            return 0.0
    
    async def _count_security_violations(self) -> float:
        """Count security violations in the last hour"""
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT COUNT(*) FROM audit_logs 
                WHERE action LIKE '%VIOLATION%' OR action LIKE '%BLOCKED%'
                AND timestamp > datetime('now', '-1 hour')
            """)
            
            result = cursor.fetchone()[0]
            conn.close()
            return float(result)
            
        except Exception as e:
            logger.warning(f"Failed to count security violations: {e}")
            return 0.0
    
    async def _get_avg_response_time(self) -> float:
        """Get average response time (placeholder - would be implemented with APM)"""
        # This would typically come from application performance monitoring
        # For now, return a simulated metric
        return 150.0  # milliseconds
    
    async def _get_error_rate(self) -> float:
        """Get error rate percentage (placeholder - would be implemented with APM)"""
        # This would typically come from application performance monitoring
        # For now, return a simulated metric
        return 0.5  # percentage

class AlertManager:
    """Manages alert rules, evaluates conditions, and sends notifications"""
    
    def __init__(self, db_path: str = "./agent_system.db"):
        self.db_path = db_path
        self.metrics_collector = MetricsCollector(db_path)
        self.alert_rules = []
        self.active_alerts = {}
        self.alert_history = []
        self.notification_handlers = []
        
        # Load default alert rules
        self._load_default_alert_rules()
        
        # Set up notification handlers
        self._setup_notification_handlers()
    
    def _load_default_alert_rules(self):
        """Load default alert rules for common issues"""
        
        # System resource alerts
        self.alert_rules.extend([
            AlertRule(
                name="high_cpu_usage",
                description="CPU usage is above 80%",
                severity=AlertSeverity.WARNING,
                metric_name="cpu_usage_percent",
                threshold_value=80.0,
                comparison_operator=">",
                duration_seconds=300,  # 5 minutes
                cooldown_seconds=1800,  # 30 minutes
                tags={"category": "system", "resource": "cpu"}
            ),
            AlertRule(
                name="critical_cpu_usage", 
                description="CPU usage is above 95%",
                severity=AlertSeverity.CRITICAL,
                metric_name="cpu_usage_percent",
                threshold_value=95.0,
                comparison_operator=">",
                duration_seconds=60,   # 1 minute
                cooldown_seconds=600,  # 10 minutes
                tags={"category": "system", "resource": "cpu"}
            ),
            AlertRule(
                name="high_memory_usage",
                description="Memory usage is above 85%",
                severity=AlertSeverity.WARNING,
                metric_name="memory_usage_percent",
                threshold_value=85.0,
                comparison_operator=">",
                duration_seconds=300,  # 5 minutes
                cooldown_seconds=1800, # 30 minutes
                tags={"category": "system", "resource": "memory"}
            ),
            AlertRule(
                name="low_disk_space",
                description="Disk usage is above 90%",
                severity=AlertSeverity.ERROR,
                metric_name="disk_usage_percent",
                threshold_value=90.0,
                comparison_operator=">",
                duration_seconds=60,   # 1 minute
                cooldown_seconds=3600, # 1 hour
                tags={"category": "system", "resource": "disk"}
            ),
        ])
        
        # Application alerts
        self.alert_rules.extend([
            AlertRule(
                name="high_failed_logins",
                description="High number of failed login attempts",
                severity=AlertSeverity.WARNING,
                metric_name="failed_login_attempts",
                threshold_value=10.0,
                comparison_operator=">",
                duration_seconds=60,   # 1 minute
                cooldown_seconds=1800, # 30 minutes
                tags={"category": "security", "type": "authentication"}
            ),
            AlertRule(
                name="security_violations",
                description="Security violations detected",
                severity=AlertSeverity.ERROR,
                metric_name="security_violations",
                threshold_value=0.0,
                comparison_operator=">",
                duration_seconds=0,    # Immediate
                cooldown_seconds=3600, # 1 hour
                tags={"category": "security", "type": "violation"}
            ),
            AlertRule(
                name="high_error_rate",
                description="Application error rate is above 5%",
                severity=AlertSeverity.ERROR,
                metric_name="error_rate_percent",
                threshold_value=5.0,
                comparison_operator=">",
                duration_seconds=300,  # 5 minutes
                cooldown_seconds=1800, # 30 minutes
                tags={"category": "application", "type": "errors"}
            ),
            AlertRule(
                name="slow_response_time",
                description="Average response time is above 1 second",
                severity=AlertSeverity.WARNING,
                metric_name="response_time_avg",
                threshold_value=1000.0,  # milliseconds
                comparison_operator=">",
                duration_seconds=300,    # 5 minutes
                cooldown_seconds=1800,   # 30 minutes
                tags={"category": "performance", "type": "latency"}
            ),
        ])
    
    def _setup_notification_handlers(self):
        """Set up notification handlers for alerts"""
        
        # Email notifications
        if self._email_configured():
            self.notification_handlers.append(self._send_email_notification)
        
        # Webhook notifications
        if self._webhook_configured():
            self.notification_handlers.append(self._send_webhook_notification)
        
        # Log notifications (always enabled)
        self.notification_handlers.append(self._log_notification)
    
    def _email_configured(self) -> bool:
        """Check if email notifications are configured"""
        return all([
            os.getenv('SMTP_SERVER'),
            os.getenv('SMTP_USERNAME'),
            os.getenv('SMTP_PASSWORD'),
            os.getenv('SECURITY_ALERT_EMAILS')
        ])
    
    def _webhook_configured(self) -> bool:
        """Check if webhook notifications are configured"""
        return bool(os.getenv('SECURITY_WEBHOOK_URL'))
    
    async def evaluate_alerts(self):
        """Evaluate all alert rules against current metrics"""
        
        try:
            # Collect all metrics
            system_metrics = await self.metrics_collector.collect_system_metrics()
            app_metrics = await self.metrics_collector.collect_application_metrics()
            all_metrics = {**system_metrics, **app_metrics}
            
            now = datetime.utcnow()
            
            for rule in self.alert_rules:
                if not rule.enabled:
                    continue
                
                metric_value = all_metrics.get(rule.metric_name)
                if metric_value is None:
                    logger.warning(f"Metric {rule.metric_name} not found")
                    continue
                
                # Evaluate the condition
                condition_met = self._evaluate_condition(
                    metric_value, rule.threshold_value, rule.comparison_operator
                )
                
                alert_id = f"{rule.name}_{int(now.timestamp())}"
                
                if condition_met:
                    # Check if alert already exists and is active
                    existing_alert = self.active_alerts.get(rule.name)
                    
                    if existing_alert:
                        # Check if enough time has passed for duration requirement
                        duration_met = (now - existing_alert.started_at).total_seconds() >= rule.duration_seconds
                        
                        if duration_met and existing_alert.status == AlertStatus.ACTIVE:
                            # Check cooldown period
                            last_notification = self._get_last_notification_time(rule.name)
                            if (last_notification is None or 
                                (now - last_notification).total_seconds() >= rule.cooldown_seconds):
                                
                                await self._send_alert_notifications(existing_alert)
                                self._record_notification(rule.name, now)
                    else:
                        # Create new alert
                        alert = Alert(
                            id=alert_id,
                            rule_name=rule.name,
                            severity=rule.severity,
                            status=AlertStatus.ACTIVE,
                            title=rule.description,
                            description=f"{rule.description}. Current value: {metric_value}, Threshold: {rule.threshold_value}",
                            metric_value=metric_value,
                            threshold_value=rule.threshold_value,
                            started_at=now,
                            tags=rule.tags
                        )
                        
                        self.active_alerts[rule.name] = alert
                        
                        # If duration is 0, send immediately
                        if rule.duration_seconds == 0:
                            await self._send_alert_notifications(alert)
                            self._record_notification(rule.name, now)
                
                else:
                    # Condition not met - resolve any active alerts
                    if rule.name in self.active_alerts:
                        alert = self.active_alerts[rule.name]
                        alert.status = AlertStatus.RESOLVED
                        alert.resolved_at = now
                        
                        # Move to history and remove from active
                        self.alert_history.append(alert)
                        del self.active_alerts[rule.name]
                        
                        logger.info(f"Alert resolved: {rule.name}")
        
        except Exception as e:
            logger.error(f"Failed to evaluate alerts: {e}")
    
    def _evaluate_condition(self, value: float, threshold: float, operator: str) -> bool:
        """Evaluate alert condition"""
        
        if operator == ">":
            return value > threshold
        elif operator == "<":
            return value < threshold
        elif operator == ">=":
            return value >= threshold
        elif operator == "<=":
            return value <= threshold
        elif operator == "==":
            return value == threshold
        elif operator == "!=":
            return value != threshold
        else:
            logger.warning(f"Unknown comparison operator: {operator}")
            return False
    
    def _get_last_notification_time(self, rule_name: str) -> Optional[datetime]:
        """Get the last notification time for a rule (placeholder)"""
        # This would be stored in database in production
        return None
    
    def _record_notification(self, rule_name: str, timestamp: datetime):
        """Record notification timestamp (placeholder)"""
        # This would be stored in database in production
        logger.info(f"Notification sent for rule: {rule_name} at {timestamp}")
    
    async def _send_alert_notifications(self, alert: Alert):
        """Send alert notifications through all configured handlers"""
        
        for handler in self.notification_handlers:
            try:
                await handler(alert)
            except Exception as e:
                logger.error(f"Failed to send notification via {handler.__name__}: {e}")
    
    async def _send_email_notification(self, alert: Alert):
        """Send email notification"""
        
        try:
            smtp_server = os.getenv('SMTP_SERVER')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_username = os.getenv('SMTP_USERNAME')
            smtp_password = os.getenv('SMTP_PASSWORD')
            recipient_emails = os.getenv('SECURITY_ALERT_EMAILS', '').split(',')
            from_email = os.getenv('FROM_EMAIL', 'security@6fb.ai')
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = ', '.join(recipient_emails)
            msg['Subject'] = f"[{alert.severity.value.upper()}] 6FB AI Agent System Alert: {alert.title}"
            
            # Email body
            body = f"""
Alert Details:
- Rule: {alert.rule_name}
- Severity: {alert.severity.value.upper()}
- Description: {alert.description}
- Started: {alert.started_at.strftime('%Y-%m-%d %H:%M:%S UTC')}
- Current Value: {alert.metric_value}
- Threshold: {alert.threshold_value}
- Tags: {json.dumps(alert.tags, indent=2)}

System: 6FB AI Agent System
Environment: {os.getenv('NODE_ENV', 'development')}
Timestamp: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}

This is an automated alert from the 6FB AI Agent System monitoring service.
"""
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email alert sent for {alert.rule_name}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    async def _send_webhook_notification(self, alert: Alert):
        """Send webhook notification"""
        
        try:
            webhook_url = os.getenv('SECURITY_WEBHOOK_URL')
            webhook_secret = os.getenv('WEBHOOK_SECRET')
            
            payload = {
                'alert_id': alert.id,
                'rule_name': alert.rule_name,
                'severity': alert.severity.value,
                'status': alert.status.value,
                'title': alert.title,
                'description': alert.description,
                'metric_value': alert.metric_value,
                'threshold_value': alert.threshold_value,
                'started_at': alert.started_at.isoformat(),
                'tags': alert.tags,
                'system': '6fb-ai-agent-system',
                'environment': os.getenv('NODE_ENV', 'development'),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': '6FB-AI-Agent-System-Monitor/1.0'
            }
            
            if webhook_secret:
                headers['X-Webhook-Secret'] = webhook_secret
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook_url,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        logger.info(f"Webhook alert sent for {alert.rule_name}")
                    else:
                        logger.warning(f"Webhook returned status {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
    
    async def _log_notification(self, alert: Alert):
        """Log notification to application logs"""
        
        log_level = {
            AlertSeverity.INFO: logging.INFO,
            AlertSeverity.WARNING: logging.WARNING,
            AlertSeverity.ERROR: logging.ERROR,
            AlertSeverity.CRITICAL: logging.CRITICAL
        }.get(alert.severity, logging.INFO)
        
        logger.log(
            log_level,
            f"ALERT [{alert.severity.value.upper()}] {alert.rule_name}: {alert.description} "
            f"(Value: {alert.metric_value}, Threshold: {alert.threshold_value})"
        )
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts"""
        return list(self.active_alerts.values())
    
    def get_alert_history(self, limit: int = 100) -> List[Alert]:
        """Get alert history"""
        return self.alert_history[-limit:]
    
    def acknowledge_alert(self, rule_name: str, acknowledged_by: str):
        """Acknowledge an active alert"""
        
        if rule_name in self.active_alerts:
            alert = self.active_alerts[rule_name]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_at = datetime.utcnow()
            alert.acknowledged_by = acknowledged_by
            
            logger.info(f"Alert acknowledged: {rule_name} by {acknowledged_by}")

class MonitoringService:
    """Main monitoring service that coordinates metrics collection and alerting"""
    
    def __init__(self, db_path: str = "./agent_system.db"):
        self.db_path = db_path
        self.alert_manager = AlertManager(db_path)
        self.running = False
        self.monitoring_interval = 60  # seconds
        
    async def start(self):
        """Start the monitoring service"""
        
        self.running = True
        logger.info("Starting monitoring service...")
        
        while self.running:
            try:
                await self.alert_manager.evaluate_alerts()
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Monitoring service error: {e}")
                await asyncio.sleep(10)  # Short sleep on error
    
    def stop(self):
        """Stop the monitoring service"""
        
        self.running = False
        logger.info("Stopping monitoring service...")
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall system health status"""
        
        active_alerts = self.alert_manager.get_active_alerts()
        
        # Determine overall health
        health = "healthy"
        if any(alert.severity == AlertSeverity.CRITICAL for alert in active_alerts):
            health = "critical"
        elif any(alert.severity == AlertSeverity.ERROR for alert in active_alerts):
            health = "unhealthy"
        elif any(alert.severity == AlertSeverity.WARNING for alert in active_alerts):
            health = "degraded"
        
        return {
            'status': health,
            'active_alerts_count': len(active_alerts),
            'active_alerts': [asdict(alert) for alert in active_alerts],
            'last_check': datetime.utcnow().isoformat(),
            'monitoring_enabled': self.running
        }

# Global monitoring service instance
_monitoring_service = None

def get_monitoring_service(db_path: str = "./agent_system.db") -> MonitoringService:
    """Get global monitoring service instance"""
    
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = MonitoringService(db_path)
    return _monitoring_service

# Export main components
__all__ = [
    'MonitoringService',
    'AlertManager',
    'MetricsCollector',
    'Alert',
    'AlertRule',
    'AlertSeverity',
    'AlertStatus',
    'get_monitoring_service'
]