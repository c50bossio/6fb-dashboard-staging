#!/usr/bin/env python3
"""
Security Audit Logger
Comprehensive security event logging and monitoring system
"""

import logging
import asyncio
import json
import hashlib
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import sqlite3
import threading
from pathlib import Path

logger = logging.getLogger(__name__)

class SecurityEventType(Enum):
    """Security event types for categorization"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    INPUT_VALIDATION = "input_validation"
    RATE_LIMITING = "rate_limiting"
    THREAT_DETECTION = "threat_detection"
    DATA_ACCESS = "data_access"
    CONFIGURATION_CHANGE = "configuration_change"
    SYSTEM_EVENT = "system_event"
    COMPLIANCE = "compliance"

class SeverityLevel(Enum):
    """Security event severity levels"""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class SecurityEvent:
    """Security event data structure"""
    event_id: str
    event_type: SecurityEventType
    severity: SeverityLevel
    timestamp: datetime
    source_ip: str
    user_id: Optional[str]
    user_agent: str
    endpoint: str
    action: str
    result: str  # success, failure, blocked, etc.
    details: Dict[str, Any] = field(default_factory=dict)
    risk_score: float = 0.0
    threat_indicators: List[str] = field(default_factory=list)
    remediation_actions: List[str] = field(default_factory=list)

@dataclass
class SecurityAlert:
    """Security alert for high-severity events"""
    alert_id: str
    triggered_at: datetime
    event_ids: List[str]
    alert_type: str
    severity: SeverityLevel
    description: str
    affected_users: List[str]
    affected_endpoints: List[str]
    recommended_actions: List[str]
    status: str = "open"  # open, investigating, resolved
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None

class SecurityMetrics:
    """Security metrics calculator"""
    
    def __init__(self):
        self.events_by_type = defaultdict(int)
        self.events_by_severity = defaultdict(int)
        self.events_by_ip = defaultdict(int)
        self.events_by_user = defaultdict(int)
        self.events_by_endpoint = defaultdict(int)
        self.timeline = deque(maxlen=1000)  # Last 1000 events for trend analysis
        
    def add_event(self, event: SecurityEvent) -> None:
        """Add event to metrics"""
        self.events_by_type[event.event_type.value] += 1
        self.events_by_severity[event.severity.value] += 1
        self.events_by_ip[event.source_ip] += 1
        if event.user_id:
            self.events_by_user[event.user_id] += 1
        self.events_by_endpoint[event.endpoint] += 1
        self.timeline.append((event.timestamp, event.event_type, event.severity))
    
    def get_summary(self, time_window: timedelta = None) -> Dict[str, Any]:
        """Get security metrics summary"""
        if time_window:
            cutoff = datetime.now(timezone.utc) - time_window
            recent_events = [
                e for e in self.timeline 
                if e[0] >= cutoff
            ]
        else:
            recent_events = list(self.timeline)
        
        return {
            'total_events': len(recent_events),
            'events_by_type': dict(self.events_by_type),
            'events_by_severity': dict(self.events_by_severity),
            'top_source_ips': dict(sorted(self.events_by_ip.items(), 
                                        key=lambda x: x[1], reverse=True)[:10]),
            'top_affected_endpoints': dict(sorted(self.events_by_endpoint.items(),
                                                key=lambda x: x[1], reverse=True)[:10]),
            'risk_trend': self._calculate_risk_trend(recent_events)
        }
    
    def _calculate_risk_trend(self, events: List[tuple]) -> str:
        """Calculate risk trend based on recent events"""
        if len(events) < 10:
            return "insufficient_data"
        
        # Calculate average severity score for first and second half
        mid_point = len(events) // 2
        first_half_score = sum(self._severity_to_score(e[2]) for e in events[:mid_point]) / mid_point
        second_half_score = sum(self._severity_to_score(e[2]) for e in events[mid_point:]) / (len(events) - mid_point)
        
        if second_half_score > first_half_score * 1.2:
            return "increasing"
        elif second_half_score < first_half_score * 0.8:
            return "decreasing"
        else:
            return "stable"
    
    def _severity_to_score(self, severity: SeverityLevel) -> float:
        """Convert severity to numeric score"""
        scores = {
            SeverityLevel.INFO: 1.0,
            SeverityLevel.LOW: 2.0,
            SeverityLevel.MEDIUM: 3.0,
            SeverityLevel.HIGH: 4.0,
            SeverityLevel.CRITICAL: 5.0
        }
        return scores.get(severity, 1.0)

class SecurityAuditLogger:
    """Main security audit logging system"""
    
    def __init__(self, db_path: str = "security_audit.db", 
                 max_events: int = 100000,
                 alert_thresholds: Dict[str, int] = None):
        self.db_path = Path(db_path)
        self.max_events = max_events
        self.alert_thresholds = alert_thresholds or self._default_alert_thresholds()
        
        # Initialize components
        self.metrics = SecurityMetrics()
        self.alerts = {}  # alert_id -> SecurityAlert
        self.event_queue = asyncio.Queue()
        self.db_lock = threading.Lock()
        
        # Alert detection state
        self.alert_detection_state = defaultdict(deque)  # Track patterns for alerts
        
        # Initialize database
        self._init_database()
        
        # Start background processing
        asyncio.create_task(self._process_events())
        
        logger.info(f"Security audit logger initialized with database: {self.db_path}")
    
    def _default_alert_thresholds(self) -> Dict[str, int]:
        """Default alert thresholds"""
        return {
            'failed_logins_per_ip_per_hour': 10,
            'failed_logins_per_user_per_hour': 5,
            'threat_detections_per_ip_per_hour': 5,
            'high_severity_events_per_hour': 3,
            'critical_events_per_hour': 1,
            'rate_limit_violations_per_ip_per_hour': 20
        }
    
    def _init_database(self) -> None:
        """Initialize SQLite database for audit logs"""
        with sqlite3.connect(self.db_path) as conn:
            # Security events table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS security_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    source_ip TEXT NOT NULL,
                    user_id TEXT,
                    user_agent TEXT,
                    endpoint TEXT NOT NULL,
                    action TEXT NOT NULL,
                    result TEXT NOT NULL,
                    details TEXT,
                    risk_score REAL DEFAULT 0.0,
                    threat_indicators TEXT,
                    remediation_actions TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Security alerts table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS security_alerts (
                    alert_id TEXT PRIMARY KEY,
                    triggered_at TEXT NOT NULL,
                    event_ids TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    description TEXT NOT NULL,
                    affected_users TEXT,
                    affected_endpoints TEXT,
                    recommended_actions TEXT,
                    status TEXT DEFAULT 'open',
                    resolved_at TEXT,
                    resolution_notes TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes for performance
            conn.execute('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON security_events(timestamp)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON security_events(event_type)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_events_severity ON security_events(severity)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_events_ip ON security_events(source_ip)')
            conn.execute('CREATE INDEX IF NOT EXISTS idx_events_user ON security_events(user_id)')
            
            conn.commit()
    
    async def log_event(self, event_type: SecurityEventType, severity: SeverityLevel,
                       source_ip: str, endpoint: str, action: str, result: str,
                       user_id: Optional[str] = None, user_agent: str = "",
                       details: Dict[str, Any] = None, risk_score: float = 0.0,
                       threat_indicators: List[str] = None,
                       remediation_actions: List[str] = None) -> str:
        """
        Log a security event
        
        Returns:
            event_id
        """
        
        event_id = self._generate_event_id(event_type, source_ip, action)
        
        event = SecurityEvent(
            event_id=event_id,
            event_type=event_type,
            severity=severity,
            timestamp=datetime.now(timezone.utc),
            source_ip=source_ip,
            user_id=user_id,
            user_agent=user_agent,
            endpoint=endpoint,
            action=action,
            result=result,
            details=details or {},
            risk_score=risk_score,
            threat_indicators=threat_indicators or [],
            remediation_actions=remediation_actions or []
        )
        
        # Add to queue for processing
        await self.event_queue.put(event)
        
        return event_id
    
    async def _process_events(self) -> None:
        """Background event processing"""
        while True:
            try:
                event = await self.event_queue.get()
                
                # Store in database
                await self._store_event(event)
                
                # Update metrics
                self.metrics.add_event(event)
                
                # Check for alerts
                await self._check_for_alerts(event)
                
                # Log to application logger
                self._log_to_application_logger(event)
                
                self.event_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error processing security event: {e}")
    
    async def _store_event(self, event: SecurityEvent) -> None:
        """Store event in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    INSERT INTO security_events (
                        event_id, event_type, severity, timestamp, source_ip,
                        user_id, user_agent, endpoint, action, result,
                        details, risk_score, threat_indicators, remediation_actions
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    event.event_id,
                    event.event_type.value,
                    event.severity.value,
                    event.timestamp.isoformat(),
                    event.source_ip,
                    event.user_id,
                    event.user_agent,
                    event.endpoint,
                    event.action,
                    event.result,
                    json.dumps(event.details),
                    event.risk_score,
                    json.dumps(event.threat_indicators),
                    json.dumps(event.remediation_actions)
                ))
                conn.commit()
                
                # Clean old events if necessary
                await self._cleanup_old_events(conn)
                
        except Exception as e:
            logger.error(f"Error storing security event: {e}")
    
    async def _cleanup_old_events(self, conn: sqlite3.Connection) -> None:
        """Clean up old events to maintain performance"""
        # Count total events
        cursor = conn.execute('SELECT COUNT(*) FROM security_events')
        total_events = cursor.fetchone()[0]
        
        if total_events > self.max_events:
            # Delete oldest events
            delete_count = total_events - self.max_events
            conn.execute('''
                DELETE FROM security_events 
                WHERE event_id IN (
                    SELECT event_id FROM security_events 
                    ORDER BY timestamp ASC 
                    LIMIT ?
                )
            ''', (delete_count,))
            conn.commit()
            logger.info(f"Cleaned up {delete_count} old security events")
    
    async def _check_for_alerts(self, event: SecurityEvent) -> None:
        """Check if event should trigger security alerts"""
        
        # Critical events always trigger alerts
        if event.severity == SeverityLevel.CRITICAL:
            await self._create_alert(
                alert_type="critical_event",
                severity=SeverityLevel.CRITICAL,
                description=f"Critical security event: {event.action}",
                event_ids=[event.event_id],
                affected_endpoints=[event.endpoint],
                affected_users=[event.user_id] if event.user_id else []
            )
        
        # Check for pattern-based alerts
        await self._check_pattern_alerts(event)
    
    async def _check_pattern_alerts(self, event: SecurityEvent) -> None:
        """Check for pattern-based security alerts"""
        
        now = datetime.now(timezone.utc)
        hour_ago = now - timedelta(hours=1)
        
        # Get recent events from database for pattern analysis
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute('''
                SELECT event_type, source_ip, user_id, result, severity
                FROM security_events 
                WHERE timestamp > ? 
                ORDER BY timestamp DESC
            ''', (hour_ago.isoformat(),))
            
            recent_events = cursor.fetchall()
        
        # Check failed login patterns
        failed_logins_by_ip = defaultdict(int)
        failed_logins_by_user = defaultdict(int)
        threat_detections_by_ip = defaultdict(int)
        high_severity_events = 0
        
        for event_type, source_ip, user_id, result, severity in recent_events:
            if event_type == SecurityEventType.AUTHENTICATION.value and result == "failure":
                failed_logins_by_ip[source_ip] += 1
                if user_id:
                    failed_logins_by_user[user_id] += 1
            
            if event_type == SecurityEventType.THREAT_DETECTION.value:
                threat_detections_by_ip[source_ip] += 1
            
            if severity in [SeverityLevel.HIGH.value, SeverityLevel.CRITICAL.value]:
                high_severity_events += 1
        
        # Check thresholds and create alerts
        for ip, count in failed_logins_by_ip.items():
            if count >= self.alert_thresholds['failed_logins_per_ip_per_hour']:
                await self._create_alert(
                    alert_type="suspicious_login_activity",
                    severity=SeverityLevel.HIGH,
                    description=f"Excessive failed login attempts from IP {ip}: {count} attempts in 1 hour",
                    event_ids=[],  # Would need to query specific events
                    affected_endpoints=["/auth/login"],
                    affected_users=[]
                )
        
        for user_id, count in failed_logins_by_user.items():
            if count >= self.alert_thresholds['failed_logins_per_user_per_hour']:
                await self._create_alert(
                    alert_type="account_compromise_attempt",
                    severity=SeverityLevel.HIGH,
                    description=f"Multiple failed login attempts for user {user_id}: {count} attempts in 1 hour",
                    event_ids=[],
                    affected_endpoints=["/auth/login"],
                    affected_users=[user_id]
                )
    
    async def _create_alert(self, alert_type: str, severity: SeverityLevel,
                           description: str, event_ids: List[str],
                           affected_endpoints: List[str], affected_users: List[str]) -> str:
        """Create a security alert"""
        
        alert_id = self._generate_alert_id(alert_type)
        
        alert = SecurityAlert(
            alert_id=alert_id,
            triggered_at=datetime.now(timezone.utc),
            event_ids=event_ids,
            alert_type=alert_type,
            severity=severity,
            description=description,
            affected_users=affected_users,
            affected_endpoints=affected_endpoints,
            recommended_actions=self._get_recommended_actions(alert_type)
        )
        
        # Store alert
        self.alerts[alert_id] = alert
        
        # Store in database
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                INSERT INTO security_alerts (
                    alert_id, triggered_at, event_ids, alert_type, severity,
                    description, affected_users, affected_endpoints, recommended_actions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                alert.alert_id,
                alert.triggered_at.isoformat(),
                json.dumps(alert.event_ids),
                alert.alert_type,
                alert.severity.value,
                alert.description,
                json.dumps(alert.affected_users),
                json.dumps(alert.affected_endpoints),
                json.dumps(alert.recommended_actions)
            ))
            conn.commit()
        
        # Log alert
        logger.warning(f"Security alert created: {alert_type} - {description}")
        
        return alert_id
    
    def _get_recommended_actions(self, alert_type: str) -> List[str]:
        """Get recommended actions for alert type"""
        
        actions_map = {
            'critical_event': [
                'Immediately investigate the event',
                'Check for related suspicious activity',
                'Consider blocking affected IP addresses',
                'Notify security team'
            ],
            'suspicious_login_activity': [
                'Block or monitor the source IP address',
                'Check for other suspicious activity from this IP',
                'Review authentication logs',
                'Consider implementing additional rate limiting'
            ],
            'account_compromise_attempt': [
                'Temporarily lock the affected user account',
                'Notify the user of suspicious activity',
                'Force password reset',
                'Review account access history'
            ],
            'ddos_attack': [
                'Implement IP blocking',
                'Scale up infrastructure if needed',
                'Monitor system performance',
                'Contact DDoS mitigation service'
            ]
        }
        
        return actions_map.get(alert_type, ['Investigate the security event'])
    
    def _generate_event_id(self, event_type: SecurityEventType, source_ip: str, action: str) -> str:
        """Generate unique event ID"""
        data = f"{event_type.value}:{source_ip}:{action}:{time.time()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _generate_alert_id(self, alert_type: str) -> str:
        """Generate unique alert ID"""
        data = f"{alert_type}:{time.time()}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]
    
    def _log_to_application_logger(self, event: SecurityEvent) -> None:
        """Log event to application logger"""
        
        log_level = {
            SeverityLevel.INFO: logging.INFO,
            SeverityLevel.LOW: logging.INFO,
            SeverityLevel.MEDIUM: logging.WARNING,
            SeverityLevel.HIGH: logging.WARNING,
            SeverityLevel.CRITICAL: logging.ERROR
        }.get(event.severity, logging.INFO)
        
        logger.log(log_level, 
                  f"SECURITY: {event.event_type.value} - {event.action} "
                  f"from {event.source_ip} on {event.endpoint} - {event.result}")
    
    def get_events(self, limit: int = 100, event_type: Optional[SecurityEventType] = None,
                  severity: Optional[SeverityLevel] = None,
                  time_range: Optional[timedelta] = None) -> List[Dict[str, Any]]:
        """Get security events with filtering"""
        
        query = 'SELECT * FROM security_events WHERE 1=1'
        params = []
        
        if event_type:
            query += ' AND event_type = ?'
            params.append(event_type.value)
        
        if severity:
            query += ' AND severity = ?'
            params.append(severity.value)
        
        if time_range:
            cutoff = datetime.now(timezone.utc) - time_range
            query += ' AND timestamp > ?'
            params.append(cutoff.isoformat())
        
        query += ' ORDER BY timestamp DESC LIMIT ?'
        params.append(limit)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_alerts(self, status: str = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get security alerts"""
        
        query = 'SELECT * FROM security_alerts WHERE 1=1'
        params = []
        
        if status:
            query += ' AND status = ?'
            params.append(status)
        
        query += ' ORDER BY triggered_at DESC LIMIT ?'
        params.append(limit)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_security_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive security dashboard data"""
        
        # Get metrics for different time windows
        last_hour = self.metrics.get_summary(timedelta(hours=1))
        last_day = self.metrics.get_summary(timedelta(days=1))
        last_week = self.metrics.get_summary(timedelta(weeks=1))
        
        # Get recent alerts
        open_alerts = self.get_alerts(status='open', limit=10)
        
        return {
            'metrics': {
                'last_hour': last_hour,
                'last_day': last_day,
                'last_week': last_week
            },
            'alerts': {
                'open_alerts': len(open_alerts),
                'recent_alerts': open_alerts
            },
            'system_status': {
                'audit_logger_active': True,
                'database_size_mb': self.db_path.stat().st_size / (1024 * 1024),
                'total_events': len(self.metrics.timeline),
                'total_alerts': len(self.alerts)
            }
        }

# Global security audit logger instance
security_audit_logger = None

def initialize_audit_logger(db_path: str = "security_audit.db") -> SecurityAuditLogger:
    """Initialize global security audit logger"""
    global security_audit_logger
    security_audit_logger = SecurityAuditLogger(db_path)
    return security_audit_logger

def get_audit_logger() -> Optional[SecurityAuditLogger]:
    """Get global security audit logger instance"""
    return security_audit_logger

# Convenience functions for common security events
async def log_authentication_event(source_ip: str, user_id: str, action: str, 
                                 result: str, user_agent: str = "", 
                                 details: Dict[str, Any] = None) -> str:
    """Log authentication event"""
    if security_audit_logger:
        severity = SeverityLevel.MEDIUM if result == "failure" else SeverityLevel.INFO
        return await security_audit_logger.log_event(
            SecurityEventType.AUTHENTICATION, severity, source_ip,
            "/auth", action, result, user_id, user_agent, details
        )
    return ""

async def log_threat_detection(source_ip: str, endpoint: str, threat_type: str,
                             user_agent: str = "", details: Dict[str, Any] = None) -> str:
    """Log threat detection event"""
    if security_audit_logger:
        return await security_audit_logger.log_event(
            SecurityEventType.THREAT_DETECTION, SeverityLevel.HIGH, source_ip,
            endpoint, "threat_detected", "blocked", None, user_agent, 
            {**(details or {}), 'threat_type': threat_type}
        )
    return ""

async def log_rate_limit_violation(source_ip: str, endpoint: str, user_agent: str = "",
                                  details: Dict[str, Any] = None) -> str:
    """Log rate limit violation"""
    if security_audit_logger:
        return await security_audit_logger.log_event(
            SecurityEventType.RATE_LIMITING, SeverityLevel.MEDIUM, source_ip,
            endpoint, "rate_limit_exceeded", "blocked", None, user_agent, details
        )
    return ""

if __name__ == "__main__":
    # Test the security audit logger
    import asyncio
    
    async def test_audit_logger():
        # Initialize logger
        logger = SecurityAuditLogger("test_security_audit.db")
        
        # Log some test events
        await logger.log_event(
            SecurityEventType.AUTHENTICATION,
            SeverityLevel.MEDIUM,
            "192.168.1.100",
            "/auth/login",
            "login_attempt",
            "failure",
            user_id="test_user",
            user_agent="Mozilla/5.0",
            details={"reason": "invalid_password"}
        )
        
        await logger.log_event(
            SecurityEventType.THREAT_DETECTION,
            SeverityLevel.HIGH,
            "10.0.0.1",
            "/api/users",
            "sql_injection_attempt",
            "blocked",
            details={"pattern": "' OR '1'='1"}
        )
        
        # Wait for processing
        await asyncio.sleep(1)
        
        # Get dashboard
        dashboard = logger.get_security_dashboard()
        print("Security Dashboard:")
        print(json.dumps(dashboard, indent=2, default=str))
        
        # Get recent events
        events = logger.get_events(limit=10)
        print(f"\nRecent Events: {len(events)}")
        for event in events:
            print(f"- {event['event_type']}: {event['action']} - {event['result']}")
    
    asyncio.run(test_audit_logger())