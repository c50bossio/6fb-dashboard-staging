#!/usr/bin/env python3
"""
Security Monitoring and Alerting Service for 6FB AI Agent System
Implements real-time security monitoring, threat detection, and automated alerting.
"""

import os
import json
import logging
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict, deque
from enum import Enum
import re
import sqlite3
from contextlib import contextmanager
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class ThreatLevel(Enum):
    """Security threat levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecurityIncidentType(Enum):
    """Types of security incidents"""
    BRUTE_FORCE_ATTACK = "brute_force_attack"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    PATH_TRAVERSAL = "path_traversal"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    SUSPICIOUS_API_USAGE = "suspicious_api_usage"
    RATE_LIMIT_ABUSE = "rate_limit_abuse"
    SESSION_HIJACKING = "session_hijacking"
    DATA_EXFILTRATION = "data_exfiltration"
    MALWARE_UPLOAD = "malware_upload"
    DDOS_ATTACK = "ddos_attack"
    PRIVILEGE_ESCALATION = "privilege_escalation"

class SecurityMonitor:
    """Real-time security monitoring and threat detection"""
    
    def __init__(self, database_path: str = "data/agent_system.db"):
        self.database_path = database_path
        self.alert_thresholds = self._get_alert_thresholds()
        self.incident_cache = defaultdict(lambda: deque(maxlen=1000))
        self.blocked_ips = set()
        self.blocked_users = set()
        self.alert_cooldowns = {}
        self._init_monitoring_tables()
        self._start_background_tasks()
    
    def _get_alert_thresholds(self) -> Dict:
        """Get configurable alert thresholds"""
        return {
            'brute_force_attempts': 5,  # Failed login attempts
            'rate_limit_violations': 10,  # Per minute
            'sql_injection_attempts': 1,  # Zero tolerance
            'xss_attempts': 1,  # Zero tolerance
            'suspicious_api_calls': 20,  # Per minute
            'data_download_limit': 1048576 * 100,  # 100MB
            'session_anomalies': 3,  # Per hour
            'error_rate_threshold': 0.05,  # 5% error rate
        }
    
    @contextmanager
    def get_db(self):
        """Database connection context manager"""
        os.makedirs(os.path.dirname(self.database_path), exist_ok=True)
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_monitoring_tables(self):
        """Initialize security monitoring tables"""
        with self.get_db() as conn:
            # Security incidents table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_incidents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    incident_type TEXT NOT NULL,
                    threat_level TEXT NOT NULL,
                    ip_address TEXT,
                    user_id INTEGER,
                    user_agent TEXT,
                    endpoint TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    resolved BOOLEAN DEFAULT 0,
                    resolution_notes TEXT
                )
            """)
            
            # Blocked entities table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS blocked_entities (
                    entity_type TEXT NOT NULL,
                    entity_value TEXT NOT NULL,
                    reason TEXT,
                    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    blocked_by TEXT,
                    PRIMARY KEY (entity_type, entity_value)
                )
            """)
            
            # Security metrics table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_metrics (
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            """)
            
            # Alert history table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS security_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details TEXT,
                    sent_to TEXT,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    acknowledged BOOLEAN DEFAULT 0
                )
            """)
            
            conn.commit()
    
    def _start_background_tasks(self):
        """Start background monitoring tasks"""
        # These would be started by the main application
        # asyncio.create_task(self._monitor_security_metrics())
        # asyncio.create_task(self._cleanup_expired_blocks())
        pass
    
    async def detect_threat(
        self,
        request_data: Dict[str, Any],
        response_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """Analyze request/response for security threats"""
        threats = []
        
        # Extract request information
        ip_address = request_data.get('ip_address')
        user_id = request_data.get('user_id')
        endpoint = request_data.get('endpoint', '')
        method = request_data.get('method', '')
        headers = request_data.get('headers', {})
        body = request_data.get('body', '')
        query_params = request_data.get('query_params', '')
        
        # Check if IP or user is blocked
        if await self.is_blocked(ip_address, user_id):
            threats.append({
                'type': SecurityIncidentType.UNAUTHORIZED_ACCESS,
                'level': ThreatLevel.HIGH,
                'reason': 'Access from blocked entity'
            })
        
        # SQL Injection Detection
        if self._detect_sql_injection(endpoint, query_params, body):
            threats.append({
                'type': SecurityIncidentType.SQL_INJECTION_ATTEMPT,
                'level': ThreatLevel.CRITICAL,
                'reason': 'SQL injection pattern detected'
            })
        
        # XSS Detection
        if self._detect_xss(query_params, body):
            threats.append({
                'type': SecurityIncidentType.XSS_ATTEMPT,
                'level': ThreatLevel.HIGH,
                'reason': 'XSS pattern detected'
            })
        
        # Path Traversal Detection
        if self._detect_path_traversal(endpoint, query_params):
            threats.append({
                'type': SecurityIncidentType.PATH_TRAVERSAL,
                'level': ThreatLevel.HIGH,
                'reason': 'Path traversal attempt detected'
            })
        
        # Brute Force Detection
        if await self._detect_brute_force(ip_address, endpoint):
            threats.append({
                'type': SecurityIncidentType.BRUTE_FORCE_ATTACK,
                'level': ThreatLevel.HIGH,
                'reason': 'Multiple failed authentication attempts'
            })
        
        # Rate Limit Abuse Detection
        if await self._detect_rate_limit_abuse(ip_address, user_id):
            threats.append({
                'type': SecurityIncidentType.RATE_LIMIT_ABUSE,
                'level': ThreatLevel.MEDIUM,
                'reason': 'Excessive request rate'
            })
        
        # Session Anomaly Detection
        if user_id and await self._detect_session_anomaly(user_id, ip_address, headers.get('user-agent')):
            threats.append({
                'type': SecurityIncidentType.SESSION_HIJACKING,
                'level': ThreatLevel.CRITICAL,
                'reason': 'Session used from different location/device'
            })
        
        # Data Exfiltration Detection (if response data provided)
        if response_data and self._detect_data_exfiltration(response_data, user_id):
            threats.append({
                'type': SecurityIncidentType.DATA_EXFILTRATION,
                'level': ThreatLevel.HIGH,
                'reason': 'Unusual data access pattern'
            })
        
        # Log and handle threats
        if threats:
            for threat in threats:
                await self.log_security_incident(
                    incident_type=threat['type'],
                    threat_level=threat['level'],
                    ip_address=ip_address,
                    user_id=user_id,
                    endpoint=endpoint,
                    details={
                        'reason': threat['reason'],
                        'method': method,
                        'user_agent': headers.get('user-agent')
                    }
                )
            
            # Take action based on threat level
            highest_threat = max(threats, key=lambda t: self._threat_level_value(t['level']))
            if highest_threat['level'] in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
                await self.block_entity(ip_address, 'ip', duration_minutes=60)
                if user_id:
                    await self.block_entity(str(user_id), 'user', duration_minutes=30)
            
            return {
                'threats_detected': len(threats),
                'highest_threat_level': highest_threat['level'].value,
                'threats': threats,
                'action_taken': 'blocked' if highest_threat['level'] in [ThreatLevel.HIGH, ThreatLevel.CRITICAL] else 'logged'
            }
        
        return None
    
    def _detect_sql_injection(self, endpoint: str, query_params: str, body: str) -> bool:
        """Detect SQL injection attempts"""
        sql_patterns = [
            r"(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)",
            r"(--|#|\/\*|\*\/)",
            r"(\bor\b\s*\d+\s*=\s*\d+)",
            r"(\band\b\s*\d+\s*=\s*\d+)",
            r"(;.*?(select|update|delete|insert|drop))",
            r"('|(\')|\"|\").*?(--|\#|\/\*)",
            r"(xp_cmdshell|sysobjects|syscolumns)",
            r"(cast\s*\(|convert\s*\()",
        ]
        
        combined_input = f"{endpoint} {query_params} {body}".lower()
        
        for pattern in sql_patterns:
            if re.search(pattern, combined_input, re.I):
                return True
        
        return False
    
    def _detect_xss(self, query_params: str, body: str) -> bool:
        """Detect XSS attempts"""
        xss_patterns = [
            r"<script[^>]*>.*?</script>",
            r"javascript:",
            r"on\w+\s*=",
            r"<iframe[^>]*>",
            r"<object[^>]*>",
            r"<embed[^>]*>",
            r"<svg[^>]*onload",
            r"eval\s*\(",
            r"expression\s*\(",
            r"vbscript:",
            r"<img[^>]*onerror",
        ]
        
        combined_input = f"{query_params} {body}".lower()
        
        for pattern in xss_patterns:
            if re.search(pattern, combined_input, re.I | re.S):
                return True
        
        return False
    
    def _detect_path_traversal(self, endpoint: str, query_params: str) -> bool:
        """Detect path traversal attempts"""
        traversal_patterns = [
            r"\.\.\/",
            r"\.\.\\",
            r"%2e%2e",
            r"%252e%252e",
            r"\.\./",
            r"\.\.%2f",
            r"\.\.%5c",
            r"%c0%ae",
            r"%c1%9c",
        ]
        
        combined_input = f"{endpoint} {query_params}".lower()
        
        for pattern in traversal_patterns:
            if re.search(pattern, combined_input, re.I):
                return True
        
        return False
    
    async def _detect_brute_force(self, ip_address: str, endpoint: str) -> bool:
        """Detect brute force attacks"""
        if not ip_address or 'auth' not in endpoint.lower():
            return False
        
        # Check recent failed login attempts
        with self.get_db() as conn:
            cursor = conn.execute("""
                SELECT COUNT(*) as attempts
                FROM security_audit_log
                WHERE ip_address = ? 
                AND event_type = 'login_failure'
                AND timestamp > datetime('now', '-5 minutes')
            """, (ip_address,))
            
            result = cursor.fetchone()
            return result['attempts'] >= self.alert_thresholds['brute_force_attempts']
    
    async def _detect_rate_limit_abuse(self, ip_address: str, user_id: Optional[int]) -> bool:
        """Detect rate limit abuse"""
        cache_key = f"rate_limit:{ip_address or user_id}"
        
        # Simple in-memory check
        now = datetime.now(timezone.utc)
        if cache_key not in self.incident_cache:
            self.incident_cache[cache_key] = deque()
        
        # Remove old entries
        while self.incident_cache[cache_key] and \
              (now - self.incident_cache[cache_key][0]).seconds > 60:
            self.incident_cache[cache_key].popleft()
        
        # Add current request
        self.incident_cache[cache_key].append(now)
        
        return len(self.incident_cache[cache_key]) > self.alert_thresholds['rate_limit_violations']
    
    async def _detect_session_anomaly(self, user_id: int, ip_address: str, user_agent: str) -> bool:
        """Detect session anomalies (potential hijacking)"""
        with self.get_db() as conn:
            # Get recent session activity
            cursor = conn.execute("""
                SELECT DISTINCT ip_address, user_agent
                FROM secure_sessions
                WHERE user_id = ?
                AND is_active = 1
                AND last_activity > datetime('now', '-1 hour')
            """, (user_id,))
            
            sessions = cursor.fetchall()
            
            # Check for multiple IPs or user agents
            ips = set(s['ip_address'] for s in sessions if s['ip_address'])
            agents = set(s['user_agent'] for s in sessions if s['user_agent'])
            
            # Anomaly if current request is from different IP/agent
            if ip_address and ip_address not in ips and len(ips) > 0:
                return True
            
            if user_agent and user_agent not in agents and len(agents) > 0:
                return True
            
            return False
    
    def _detect_data_exfiltration(self, response_data: Dict, user_id: Optional[int]) -> bool:
        """Detect potential data exfiltration"""
        # Check response size
        response_size = response_data.get('size', 0)
        if response_size > self.alert_thresholds['data_download_limit']:
            return True
        
        # Check for bulk data indicators
        if response_data.get('record_count', 0) > 1000:
            return True
        
        # Check for sensitive data patterns in response
        sensitive_patterns = [
            r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
            r'\b[A-Z]{2}\d{6,}\b',     # Passport
            r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b',  # Credit card
        ]
        
        response_content = str(response_data.get('content', ''))
        for pattern in sensitive_patterns:
            if re.search(pattern, response_content):
                return True
        
        return False
    
    def _threat_level_value(self, level: ThreatLevel) -> int:
        """Get numeric value for threat level comparison"""
        values = {
            ThreatLevel.LOW: 1,
            ThreatLevel.MEDIUM: 2,
            ThreatLevel.HIGH: 3,
            ThreatLevel.CRITICAL: 4
        }
        return values.get(level, 0)
    
    async def log_security_incident(
        self,
        incident_type: SecurityIncidentType,
        threat_level: ThreatLevel,
        ip_address: str = None,
        user_id: int = None,
        endpoint: str = None,
        details: Dict = None
    ):
        """Log security incident"""
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO security_incidents
                (incident_type, threat_level, ip_address, user_id, endpoint, details)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                incident_type.value,
                threat_level.value,
                ip_address,
                user_id,
                endpoint,
                json.dumps(details) if details else None
            ))
            conn.commit()
        
        # Send alert if high/critical
        if threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            await self.send_security_alert(incident_type, threat_level, details)
    
    async def send_security_alert(
        self,
        incident_type: SecurityIncidentType,
        threat_level: ThreatLevel,
        details: Dict
    ):
        """Send security alert via email/webhook"""
        alert_key = f"{incident_type.value}:{threat_level.value}"
        
        # Check cooldown to prevent alert spam
        if alert_key in self.alert_cooldowns:
            if datetime.now(timezone.utc) < self.alert_cooldowns[alert_key]:
                return
        
        # Set cooldown
        self.alert_cooldowns[alert_key] = datetime.now(timezone.utc) + timedelta(minutes=15)
        
        # Log alert
        with self.get_db() as conn:
            conn.execute("""
                INSERT INTO security_alerts
                (alert_type, severity, message, details)
                VALUES (?, ?, ?, ?)
            """, (
                incident_type.value,
                threat_level.value,
                f"Security incident detected: {incident_type.value}",
                json.dumps(details)
            ))
            conn.commit()
        
        # Send actual alert (implement based on notification preferences)
        logger.critical(f"SECURITY ALERT: {incident_type.value} - {threat_level.value} - {details}")
    
    async def block_entity(self, entity_value: str, entity_type: str, duration_minutes: int = 60):
        """Block an IP address or user"""
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
        
        with self.get_db() as conn:
            conn.execute("""
                INSERT OR REPLACE INTO blocked_entities
                (entity_type, entity_value, reason, expires_at, blocked_by)
                VALUES (?, ?, ?, ?, ?)
            """, (
                entity_type,
                entity_value,
                'Automated security response',
                expires_at,
                'security_monitor'
            ))
            conn.commit()
        
        # Update cache
        if entity_type == 'ip':
            self.blocked_ips.add(entity_value)
        elif entity_type == 'user':
            self.blocked_users.add(entity_value)
    
    async def is_blocked(self, ip_address: str = None, user_id: int = None) -> bool:
        """Check if entity is blocked"""
        # Quick cache check
        if ip_address and ip_address in self.blocked_ips:
            return True
        if user_id and str(user_id) in self.blocked_users:
            return True
        
        # Database check
        with self.get_db() as conn:
            conditions = []
            params = []
            
            if ip_address:
                conditions.append("(entity_type = 'ip' AND entity_value = ?)")
                params.append(ip_address)
            
            if user_id:
                conditions.append("(entity_type = 'user' AND entity_value = ?)")
                params.append(str(user_id))
            
            if not conditions:
                return False
            
            query = f"""
                SELECT COUNT(*) as blocked
                FROM blocked_entities
                WHERE ({' OR '.join(conditions)})
                AND (expires_at IS NULL OR expires_at > datetime('now'))
            """
            
            cursor = conn.execute(query, params)
            result = cursor.fetchone()
            
            return result['blocked'] > 0
    
    async def get_security_metrics(self, time_range_hours: int = 24) -> Dict[str, Any]:
        """Get security metrics for monitoring"""
        since = datetime.now(timezone.utc) - timedelta(hours=time_range_hours)
        
        with self.get_db() as conn:
            # Incident counts by type
            cursor = conn.execute("""
                SELECT incident_type, threat_level, COUNT(*) as count
                FROM security_incidents
                WHERE timestamp > ?
                GROUP BY incident_type, threat_level
            """, (since,))
            
            incidents = {}
            for row in cursor.fetchall():
                if row['incident_type'] not in incidents:
                    incidents[row['incident_type']] = {}
                incidents[row['incident_type']][row['threat_level']] = row['count']
            
            # Blocked entities
            cursor = conn.execute("""
                SELECT entity_type, COUNT(*) as count
                FROM blocked_entities
                WHERE blocked_at > ?
                GROUP BY entity_type
            """, (since,))
            
            blocked = {row['entity_type']: row['count'] for row in cursor.fetchall()}
            
            # Alert counts
            cursor = conn.execute("""
                SELECT severity, COUNT(*) as count
                FROM security_alerts
                WHERE sent_at > ?
                GROUP BY severity
            """, (since,))
            
            alerts = {row['severity']: row['count'] for row in cursor.fetchall()}
            
            return {
                'time_range_hours': time_range_hours,
                'incidents': incidents,
                'blocked_entities': blocked,
                'alerts_sent': alerts,
                'active_blocks': {
                    'ips': len(self.blocked_ips),
                    'users': len(self.blocked_users)
                },
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
    
    async def cleanup_expired_blocks(self):
        """Remove expired blocks"""
        with self.get_db() as conn:
            conn.execute("""
                DELETE FROM blocked_entities
                WHERE expires_at IS NOT NULL
                AND expires_at < datetime('now')
            """)
            conn.commit()
        
        # Refresh cache
        await self._refresh_block_cache()
    
    async def _refresh_block_cache(self):
        """Refresh blocked entities cache"""
        with self.get_db() as conn:
            # Get active blocks
            cursor = conn.execute("""
                SELECT entity_type, entity_value
                FROM blocked_entities
                WHERE expires_at IS NULL OR expires_at > datetime('now')
            """)
            
            self.blocked_ips.clear()
            self.blocked_users.clear()
            
            for row in cursor.fetchall():
                if row['entity_type'] == 'ip':
                    self.blocked_ips.add(row['entity_value'])
                elif row['entity_type'] == 'user':
                    self.blocked_users.add(row['entity_value'])

# Singleton instance
security_monitor = SecurityMonitor()

# Export main components
__all__ = [
    'SecurityMonitor',
    'security_monitor',
    'ThreatLevel',
    'SecurityIncidentType'
]