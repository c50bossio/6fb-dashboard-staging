#!/usr/bin/env python3
"""
Comprehensive Audit Logging System for 6FB AI Agent Booking System
Security Specialist Implementation

Provides enterprise-level audit logging with compliance support (SOX, GDPR, PCI-DSS),
security event tracking, and forensic capabilities for booking operations.
"""

import os
import json
import uuid
import hashlib
import logging
import asyncio
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import aiofiles
from pathlib import Path
from fastapi import Request, Response
from cryptography.fernet import Fernet
import contextvars

# Context variable for request tracking
request_context = contextvars.ContextVar('request_context', default=None)

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Types of auditable events"""
    
    # Authentication events
    LOGIN_SUCCESS = "auth.login.success"
    LOGIN_FAILURE = "auth.login.failure"
    LOGOUT = "auth.logout"
    PASSWORD_CHANGE = "auth.password_change"
    ACCOUNT_LOCKED = "auth.account_locked"
    
    # Authorization events
    ACCESS_GRANTED = "authz.access_granted"
    ACCESS_DENIED = "authz.access_denied"
    PRIVILEGE_ESCALATION = "authz.privilege_escalation"
    
    # Booking operations
    BOOKING_CREATED = "booking.created"
    BOOKING_UPDATED = "booking.updated"
    BOOKING_CANCELLED = "booking.cancelled"
    BOOKING_COMPLETED = "booking.completed"
    BOOKING_SEARCH = "booking.search"
    
    # Payment operations
    PAYMENT_INITIATED = "payment.initiated"
    PAYMENT_COMPLETED = "payment.completed"
    PAYMENT_FAILED = "payment.failed"
    PAYMENT_REFUNDED = "payment.refunded"
    
    # Data operations
    DATA_ACCESSED = "data.accessed"
    DATA_CREATED = "data.created"
    DATA_UPDATED = "data.updated"
    DATA_DELETED = "data.deleted"
    DATA_EXPORTED = "data.exported"
    
    # Security events
    SECURITY_VIOLATION = "security.violation"
    SUSPICIOUS_ACTIVITY = "security.suspicious"
    RATE_LIMIT_EXCEEDED = "security.rate_limit"
    CSRF_VIOLATION = "security.csrf"
    
    # System events
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    SYSTEM_ERROR = "system.error"
    
    # Admin operations
    ADMIN_ACTION = "admin.action"
    CONFIG_CHANGE = "admin.config_change"
    USER_MANAGEMENT = "admin.user_management"

class AuditSeverity(Enum):
    """Severity levels for audit events"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class AuditEvent:
    """Comprehensive audit event record"""
    
    # Core identification
    event_id: str
    event_type: AuditEventType
    timestamp: datetime
    severity: AuditSeverity
    
    # Actor information
    user_id: Optional[str] = None
    username: Optional[str] = None
    session_id: Optional[str] = None
    
    # Request context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    
    # Event details
    resource: Optional[str] = None
    action: Optional[str] = None
    outcome: str = "unknown"  # success, failure, error
    
    # Additional data
    details: Dict[str, Any] = None
    sensitive_data: bool = False
    
    # Compliance fields
    data_subject_id: Optional[str] = None  # GDPR
    retention_period: Optional[int] = None  # days
    
    # Integrity fields
    checksum: Optional[str] = None
    previous_event_hash: Optional[str] = None
    
    def __post_init__(self):
        """Calculate checksum after initialization"""
        if self.details is None:
            self.details = {}
        
        if not self.event_id:
            self.event_id = str(uuid.uuid4())
        
        if not self.timestamp:
            self.timestamp = datetime.now(timezone.utc)
        
        # Calculate integrity checksum
        self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """Calculate SHA-256 checksum for integrity verification"""
        # Create deterministic string representation
        data_dict = asdict(self)
        data_dict.pop('checksum', None)  # Exclude checksum from calculation
        
        # Sort keys for consistency
        data_str = json.dumps(data_dict, sort_keys=True, default=str)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return asdict(self)

class AuditLogger:
    """
    Enterprise audit logging system with multiple storage backends
    and compliance features
    """
    
    def __init__(self, 
                 database_path: str = None,
                 log_file_path: str = None,
                 encryption_key: str = None,
                 enable_integrity_chain: bool = True):
        
        self.database_path = database_path or "audit_logs.db"
        self.log_file_path = log_file_path or "audit.log"
        self.enable_integrity_chain = enable_integrity_chain
        
        # Setup encryption for sensitive data
        if encryption_key:
            self.cipher_suite = Fernet(encryption_key.encode())
        else:
            # Generate key if not provided (store securely in production!)
            key = Fernet.generate_key()
            self.cipher_suite = Fernet(key)
            logger.warning("Generated audit encryption key - store securely!")
        
        # Initialize storage backends
        self._init_database()
        self._init_file_logging()
        
        # Integrity chain
        self.last_event_hash = None
        
        # Event buffer for batch processing
        self.event_buffer = []
        self.buffer_size = 100
        
        logger.info("Audit Logger initialized")
    
    def _init_database(self):
        """Initialize SQLite database for audit logs"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Create audit events table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS audit_events (
                    event_id TEXT PRIMARY KEY,
                    event_type TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    user_id TEXT,
                    username TEXT,
                    session_id TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    request_id TEXT,
                    resource TEXT,
                    action TEXT,
                    outcome TEXT,
                    details TEXT,
                    sensitive_data BOOLEAN,
                    data_subject_id TEXT,
                    retention_period INTEGER,
                    checksum TEXT,
                    previous_event_hash TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_event_type ON audit_events(event_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_timestamp ON audit_events(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_id ON audit_events(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_ip_address ON audit_events(ip_address)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_data_subject ON audit_events(data_subject_id)")
            
            conn.commit()
            conn.close()
            
            logger.info("Audit database initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize audit database: {e}")
            raise
    
    def _init_file_logging(self):
        """Initialize file-based audit logging"""
        try:
            # Ensure log directory exists
            log_path = Path(self.log_file_path)
            log_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Configure file logger
            audit_file_logger = logging.getLogger('audit_file')
            audit_file_logger.setLevel(logging.INFO)
            
            # Create file handler with rotation
            file_handler = logging.FileHandler(self.log_file_path)
            file_handler.setLevel(logging.INFO)
            
            # Format: timestamp|event_id|event_type|user_id|details
            formatter = logging.Formatter(
                '%(asctime)s|%(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(formatter)
            
            audit_file_logger.addHandler(file_handler)
            self.file_logger = audit_file_logger
            
            logger.info("Audit file logging initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize audit file logging: {e}")
            raise
    
    async def log_event(self, event: AuditEvent):
        """Log audit event to all configured backends"""
        try:
            # Set integrity chain
            if self.enable_integrity_chain:
                event.previous_event_hash = self.last_event_hash
                event.checksum = event._calculate_checksum()
                self.last_event_hash = event.checksum
            
            # Log to database
            await self._log_to_database(event)
            
            # Log to file
            await self._log_to_file(event)
            
            # Buffer for batch processing
            self.event_buffer.append(event)
            
            if len(self.event_buffer) >= self.buffer_size:
                await self._flush_buffer()
            
            logger.debug(f"Audit event logged: {event.event_type.value}")
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't raise to avoid breaking main application flow
    
    async def _log_to_database(self, event: AuditEvent):
        """Log event to SQLite database"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Encrypt sensitive details if needed
            details_json = json.dumps(event.details, default=str)
            if event.sensitive_data:
                details_json = self.cipher_suite.encrypt(details_json.encode()).decode()
            
            cursor.execute("""
                INSERT INTO audit_events (
                    event_id, event_type, timestamp, severity,
                    user_id, username, session_id, ip_address, user_agent, request_id,
                    resource, action, outcome, details, sensitive_data,
                    data_subject_id, retention_period, checksum, previous_event_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.event_type.value,
                event.timestamp.isoformat(),
                event.severity.value,
                event.user_id,
                event.username,
                event.session_id,
                event.ip_address,
                event.user_agent,
                event.request_id,
                event.resource,
                event.action,
                event.outcome,
                details_json,
                event.sensitive_data,
                event.data_subject_id,
                event.retention_period,
                event.checksum,
                event.previous_event_hash
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Database audit logging failed: {e}")
            raise
    
    async def _log_to_file(self, event: AuditEvent):
        """Log event to structured file"""
        try:
            # Create structured log entry
            log_entry = {
                'event_id': event.event_id,
                'event_type': event.event_type.value,
                'timestamp': event.timestamp.isoformat(),
                'severity': event.severity.value,
                'user_id': event.user_id,
                'ip_address': event.ip_address,
                'outcome': event.outcome,
                'resource': event.resource,
                'action': event.action
            }
            
            # Add non-sensitive details
            if event.details and not event.sensitive_data:
                log_entry['details'] = event.details
            
            log_message = json.dumps(log_entry, default=str)
            
            # Write to file asynchronously
            async with aiofiles.open(self.log_file_path, mode='a') as f:
                await f.write(f"{log_message}\n")
            
        except Exception as e:
            logger.error(f"File audit logging failed: {e}")
    
    async def _flush_buffer(self):
        """Flush event buffer for batch processing"""
        if not self.event_buffer:
            return
        
        try:
            # Process buffer (could send to SIEM, external logging service, etc.)
            buffer_copy = self.event_buffer.copy()
            self.event_buffer.clear()
            
            # Example: Send high-severity events to external monitoring
            critical_events = [e for e in buffer_copy if e.severity == AuditSeverity.CRITICAL]
            if critical_events:
                await self._send_critical_alerts(critical_events)
            
            logger.debug(f"Flushed audit buffer with {len(buffer_copy)} events")
            
        except Exception as e:
            logger.error(f"Failed to flush audit buffer: {e}")
    
    async def _send_critical_alerts(self, events: List[AuditEvent]):
        """Send critical security events to monitoring systems"""
        try:
            for event in events:
                # Here you would integrate with your monitoring/alerting system
                # Examples: PagerDuty, Slack, email alerts, SIEM systems
                logger.critical(f"CRITICAL AUDIT EVENT: {event.event_type.value} - {event.details}")
                
                # Could also trigger automated responses
                if event.event_type == AuditEventType.SECURITY_VIOLATION:
                    await self._handle_security_violation(event)
                    
        except Exception as e:
            logger.error(f"Failed to send critical alerts: {e}")
    
    async def _handle_security_violation(self, event: AuditEvent):
        """Handle security violation events"""
        # Example automated security responses
        if event.ip_address:
            logger.warning(f"Consider blocking IP: {event.ip_address}")
            # Could trigger rate limiting, IP blocking, etc.
    
    # Query methods for audit analysis
    async def get_events_by_user(self, user_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get audit events for a specific user"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM audit_events 
                WHERE user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT ?
            """, (user_id, limit))
            
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            
            events = []
            for row in rows:
                event_dict = dict(zip(columns, row))
                
                # Decrypt sensitive data if needed
                if event_dict['sensitive_data'] and event_dict['details']:
                    try:
                        decrypted = self.cipher_suite.decrypt(event_dict['details'].encode())
                        event_dict['details'] = json.loads(decrypted.decode())
                    except:
                        event_dict['details'] = "[ENCRYPTED]"
                else:
                    if event_dict['details']:
                        event_dict['details'] = json.loads(event_dict['details'])
                
                events.append(event_dict)
            
            conn.close()
            return events
            
        except Exception as e:
            logger.error(f"Failed to query events by user: {e}")
            return []
    
    async def get_security_events(self, 
                                hours: int = 24, 
                                severity: AuditSeverity = None) -> List[Dict[str, Any]]:
        """Get recent security events"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Calculate time threshold
            threshold = datetime.now(timezone.utc) - timedelta(hours=hours)
            
            query = """
                SELECT * FROM audit_events 
                WHERE event_type LIKE 'security.%' 
                AND timestamp >= ?
            """
            params = [threshold.isoformat()]
            
            if severity:
                query += " AND severity = ?"
                params.append(severity.value)
            
            query += " ORDER BY timestamp DESC"
            
            cursor.execute(query, params)
            
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            
            events = [dict(zip(columns, row)) for row in rows]
            conn.close()
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to query security events: {e}")
            return []
    
    async def generate_compliance_report(self, 
                                       start_date: datetime, 
                                       end_date: datetime,
                                       data_subject_id: str = None) -> Dict[str, Any]:
        """Generate compliance report (GDPR, SOX, etc.)"""
        try:
            conn = sqlite3.connect(self.database_path)
            cursor = conn.cursor()
            
            # Base query
            query = """
                SELECT event_type, COUNT(*) as count, 
                       MIN(timestamp) as first_event,
                       MAX(timestamp) as last_event
                FROM audit_events 
                WHERE timestamp BETWEEN ? AND ?
            """
            params = [start_date.isoformat(), end_date.isoformat()]
            
            # Filter by data subject for GDPR
            if data_subject_id:
                query += " AND data_subject_id = ?"
                params.append(data_subject_id)
            
            query += " GROUP BY event_type ORDER BY count DESC"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Compliance statistics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_events,
                    COUNT(DISTINCT user_id) as unique_users,
                    COUNT(DISTINCT ip_address) as unique_ips,
                    SUM(CASE WHEN sensitive_data = 1 THEN 1 ELSE 0 END) as sensitive_events
                FROM audit_events 
                WHERE timestamp BETWEEN ? AND ?
            """, [start_date.isoformat(), end_date.isoformat()])
            
            stats = cursor.fetchone()
            
            conn.close()
            
            return {
                'report_period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'statistics': {
                    'total_events': stats[0],
                    'unique_users': stats[1],
                    'unique_ips': stats[2],
                    'sensitive_events': stats[3]
                },
                'event_breakdown': [
                    {
                        'event_type': row[0],
                        'count': row[1],
                        'first_occurrence': row[2],
                        'last_occurrence': row[3]
                    }
                    for row in results
                ],
                'data_subject_id': data_subject_id,
                'generated_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {}

# Convenience functions and decorators
class AuditContext:
    """Context manager for audit logging"""
    
    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger
        self.events = []
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Log any buffered events
        asyncio.create_task(self._flush_events())
    
    def log(self, event_type: AuditEventType, **kwargs):
        """Add event to context"""
        event = AuditEvent(
            event_id=str(uuid.uuid4()),
            event_type=event_type,
            timestamp=datetime.now(timezone.utc),
            severity=kwargs.get('severity', AuditSeverity.MEDIUM),
            **kwargs
        )
        self.events.append(event)
    
    async def _flush_events(self):
        """Flush all events in context"""
        for event in self.events:
            await self.audit_logger.log_event(event)

def audit_event(event_type: AuditEventType, 
               severity: AuditSeverity = AuditSeverity.MEDIUM,
               sensitive_data: bool = False):
    """Decorator for automatic audit logging"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get request context
            context = request_context.get()
            
            start_time = datetime.now(timezone.utc)
            outcome = "success"
            details = {}
            
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                outcome = "failure"
                details['error'] = str(e)
                raise
            finally:
                # Create audit event
                event = AuditEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=event_type,
                    timestamp=start_time,
                    severity=severity,
                    outcome=outcome,
                    resource=func.__name__,
                    action=f"{func.__module__}.{func.__name__}",
                    details=details,
                    sensitive_data=sensitive_data,
                    user_id=context.get('user_id') if context else None,
                    ip_address=context.get('ip_address') if context else None,
                    request_id=context.get('request_id') if context else None
                )
                
                # Log the event (assuming global audit logger)
                if hasattr(wrapper, '_audit_logger'):
                    await wrapper._audit_logger.log_event(event)
        
        return wrapper
    return decorator

# FastAPI integration
async def set_audit_context(request: Request):
    """Set audit context for request"""
    context = {
        'user_id': getattr(request.state, 'user_id', None),
        'ip_address': request.client.host if request.client else None,
        'user_agent': request.headers.get('User-Agent'),
        'request_id': str(uuid.uuid4())
    }
    request_context.set(context)

# Example usage functions
async def log_booking_event(audit_logger: AuditLogger, 
                          booking_data: Dict[str, Any],
                          user_id: str,
                          event_type: AuditEventType = AuditEventType.BOOKING_CREATED):
    """Log booking-related audit event"""
    event = AuditEvent(
        event_id=str(uuid.uuid4()),
        event_type=event_type,
        timestamp=datetime.now(timezone.utc),
        severity=AuditSeverity.MEDIUM,
        user_id=user_id,
        resource=f"booking:{booking_data.get('id')}",
        action="create_booking",
        outcome="success",
        details=booking_data,
        sensitive_data=True,  # Booking data contains PII
        retention_period=2555,  # 7 years for business records
    )
    
    await audit_logger.log_event(event)

async def log_security_violation(audit_logger: AuditLogger,
                               violation_type: str,
                               details: Dict[str, Any],
                               ip_address: str):
    """Log security violation"""
    event = AuditEvent(
        event_id=str(uuid.uuid4()),
        event_type=AuditEventType.SECURITY_VIOLATION,
        timestamp=datetime.now(timezone.utc),
        severity=AuditSeverity.HIGH,
        ip_address=ip_address,
        resource="security_system",
        action=violation_type,
        outcome="blocked",
        details=details
    )
    
    await audit_logger.log_event(event)

# Initialize global audit logger (configure as needed)
def create_audit_logger(config_path: str = None) -> AuditLogger:
    """Create and configure audit logger"""
    
    # Load configuration
    database_path = os.getenv('AUDIT_DB_PATH', 'audit_logs.db')
    log_file_path = os.getenv('AUDIT_LOG_PATH', 'logs/audit.log')
    encryption_key = os.getenv('AUDIT_ENCRYPTION_KEY')
    
    return AuditLogger(
        database_path=database_path,
        log_file_path=log_file_path,
        encryption_key=encryption_key,
        enable_integrity_chain=True
    )