"""
GDPR Audit Trail Service
Comprehensive audit logging and trail management for all data processing
activities to ensure GDPR compliance and accountability.

Key Features:
- Complete audit trail of all data processing activities
- Real-time activity monitoring and logging
- Tamper-proof audit log integrity
- Audit trail analysis and reporting
- Compliance audit support
- Forensic investigation capabilities
- Automated anomaly detection
- Integration with all GDPR services
"""

import os
import json
import uuid
import asyncio
import logging
import hashlib
import hmac
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiosqlite
from pathlib import Path
import sqlite3

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Types of audit events"""
    DATA_ACCESS = "data_access"
    DATA_CREATION = "data_creation"
    DATA_MODIFICATION = "data_modification"
    DATA_DELETION = "data_deletion"
    DATA_EXPORT = "data_export"
    DATA_ANONYMIZATION = "data_anonymization"
    CONSENT_GIVEN = "consent_given"
    CONSENT_WITHDRAWN = "consent_withdrawn"
    BREACH_DETECTED = "breach_detected"
    BREACH_NOTIFICATION = "breach_notification"
    RETENTION_ACTION = "retention_action"
    DPIA_ACTION = "dpia_action"
    SYSTEM_ACCESS = "system_access"
    CONFIGURATION_CHANGE = "configuration_change"
    POLICY_CHANGE = "policy_change"

class AuditSeverity(Enum):
    """Severity levels for audit events"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class AuditStatus(Enum):
    """Status of audit events"""
    SUCCESS = "success"
    FAILURE = "failure"
    PARTIAL = "partial"
    PENDING = "pending"

@dataclass
class AuditEvent:
    """Comprehensive audit event record"""
    id: str
    timestamp: datetime
    event_type: AuditEventType
    severity: AuditSeverity
    status: AuditStatus
    
    # Actor information
    user_id: Optional[str]
    actor_type: str  # user, system, service, api
    actor_identifier: str
    session_id: Optional[str]
    
    # Context information
    source_system: str
    component: str
    operation: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    
    # Data processing details
    data_categories: List[DataCategory]
    processing_purpose: Optional[ProcessingPurpose]
    lawful_basis: Optional[LawfulBasis]
    
    # Technical details
    ip_address: Optional[str]
    user_agent: Optional[str]
    api_endpoint: Optional[str]
    http_method: Optional[str]
    request_id: Optional[str]
    
    # Event details
    event_description: str
    event_details: Dict[str, Any]
    before_state: Optional[Dict[str, Any]]
    after_state: Optional[Dict[str, Any]]
    
    # Risk and compliance
    risk_level: str
    compliance_impact: str
    gdpr_article: Optional[str]
    
    # Integrity and verification
    event_hash: str
    previous_hash: Optional[str]
    signature: Optional[str]

class GDPRAuditTrailService:
    """
    Service for comprehensive GDPR audit trail management
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        self.audit_log_path = "/Users/bossio/6FB AI Agent System/logs/gdpr_audit.log"
        
        # Create logs directory
        os.makedirs(os.path.dirname(self.audit_log_path), exist_ok=True)
        
        # HMAC key for audit log integrity
        self.integrity_key = self._get_or_create_integrity_key()
        
        # Event type mapping to GDPR articles
        self.gdpr_article_mapping = {
            AuditEventType.CONSENT_GIVEN: "Article 7",
            AuditEventType.CONSENT_WITHDRAWN: "Article 7",
            AuditEventType.DATA_EXPORT: "Article 20",
            AuditEventType.DATA_DELETION: "Article 17",
            AuditEventType.BREACH_DETECTED: "Article 33",
            AuditEventType.BREACH_NOTIFICATION: "Articles 33 & 34",
            AuditEventType.DPIA_ACTION: "Article 35",
            AuditEventType.DATA_ACCESS: "Article 32",
            AuditEventType.DATA_MODIFICATION: "Article 32"
        }
        
        # Risk level mapping
        self.risk_level_mapping = {
            AuditEventType.BREACH_DETECTED: "high",
            AuditEventType.DATA_DELETION: "medium",
            AuditEventType.CONSENT_WITHDRAWN: "medium",
            AuditEventType.DATA_EXPORT: "medium",
            AuditEventType.DATA_ACCESS: "low",
            AuditEventType.DATA_CREATION: "low"
        }
        
        # Current hash chain value for integrity
        self.last_hash = None
        
        # Initialize database and background tasks
        asyncio.create_task(self._init_audit_tables())
        asyncio.create_task(self._start_audit_monitoring())
        
        logger.info("GDPR Audit Trail Service initialized")

    def _get_or_create_integrity_key(self) -> bytes:
        """Get or create HMAC key for audit log integrity"""
        key_path = "/Users/bossio/6FB AI Agent System/.audit_integrity_key"
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                return f.read()
        else:
            key = os.urandom(32)  # 256-bit key
            os.makedirs(os.path.dirname(key_path), exist_ok=True)
            with open(key_path, 'wb') as f:
                f.write(key)
            os.chmod(key_path, 0o600)  # Restrict permissions
            return key

    async def _init_audit_tables(self):
        """Initialize audit trail database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_events (
                id TEXT PRIMARY KEY,
                timestamp TIMESTAMP NOT NULL,
                event_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                
                -- Actor information
                user_id TEXT,
                actor_type TEXT NOT NULL,
                actor_identifier TEXT NOT NULL,
                session_id TEXT,
                
                -- Context information
                source_system TEXT NOT NULL,
                component TEXT NOT NULL,
                operation TEXT NOT NULL,
                resource_type TEXT,
                resource_id TEXT,
                
                -- Data processing details
                data_categories TEXT, -- JSON array
                processing_purpose TEXT,
                lawful_basis TEXT,
                
                -- Technical details
                ip_address TEXT,
                user_agent TEXT,
                api_endpoint TEXT,
                http_method TEXT,
                request_id TEXT,
                
                -- Event details
                event_description TEXT NOT NULL,
                event_details TEXT NOT NULL, -- JSON
                before_state TEXT, -- JSON
                after_state TEXT, -- JSON
                
                -- Risk and compliance
                risk_level TEXT NOT NULL,
                compliance_impact TEXT NOT NULL,
                gdpr_article TEXT,
                
                -- Integrity and verification
                event_hash TEXT NOT NULL UNIQUE,
                previous_hash TEXT,
                signature TEXT,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                actor_identifier TEXT NOT NULL,
                session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_end TIMESTAMP,
                ip_address TEXT,
                user_agent TEXT,
                events_count INTEGER DEFAULT 0,
                risk_events_count INTEGER DEFAULT 0,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_anomalies (
                id TEXT PRIMARY KEY,
                detection_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                anomaly_type TEXT NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                related_events TEXT, -- JSON array of event IDs
                user_id TEXT,
                ip_address TEXT,
                detection_algorithm TEXT,
                confidence_score REAL,
                investigated BOOLEAN DEFAULT 0,
                resolution TEXT,
                resolved_at TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_reports (
                id TEXT PRIMARY KEY,
                report_type TEXT NOT NULL,
                report_title TEXT NOT NULL,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                filters TEXT, -- JSON
                report_data TEXT NOT NULL, -- JSON
                generated_by TEXT,
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                file_path TEXT,
                file_hash TEXT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_integrity_checks (
                id TEXT PRIMARY KEY,
                check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                start_event_id TEXT,
                end_event_id TEXT,
                events_checked INTEGER NOT NULL,
                integrity_status TEXT NOT NULL,
                tampered_events TEXT, -- JSON array
                check_details TEXT, -- JSON
                performed_by TEXT
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Create indexes for performance
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON gdpr_audit_events(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_audit_user ON gdpr_audit_events(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_event_type ON gdpr_audit_events(event_type)",
                "CREATE INDEX IF NOT EXISTS idx_audit_risk ON gdpr_audit_events(risk_level)",
                "CREATE INDEX IF NOT EXISTS idx_audit_resource ON gdpr_audit_events(resource_type, resource_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_hash ON gdpr_audit_events(event_hash)",
                "CREATE INDEX IF NOT EXISTS idx_audit_previous_hash ON gdpr_audit_events(previous_hash)"
            ]
            
            for index_query in indexes:
                await db.execute(index_query)
            
            await db.commit()
            
            # Initialize hash chain
            await self._initialize_hash_chain()

    async def _initialize_hash_chain(self):
        """Initialize the audit log hash chain"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT event_hash FROM gdpr_audit_events ORDER BY timestamp DESC LIMIT 1"
            )
            result = await cursor.fetchone()
            
            if result:
                self.last_hash = result[0]
            else:
                # Initialize with genesis hash
                self.last_hash = hashlib.sha256(b"GDPR_AUDIT_GENESIS").hexdigest()

    async def _start_audit_monitoring(self):
        """Start background audit monitoring tasks"""
        # Wait for initialization
        await asyncio.sleep(60)
        
        while True:
            try:
                # Detect audit anomalies
                await self._detect_audit_anomalies()
                
                # Verify audit log integrity
                await self._verify_audit_integrity()
                
                # Clean up old sessions
                await self._cleanup_old_sessions()
                
                # Generate automated reports
                await self._generate_automated_reports()
                
                # Sleep for 1 hour between monitoring cycles
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Audit monitoring error: {str(e)}")
                await asyncio.sleep(1800)  # Wait 30 minutes on error

    async def log_audit_event(
        self,
        event_type: AuditEventType,
        actor_identifier: str,
        operation: str,
        event_description: str,
        component: str = "system",
        user_id: str = None,
        actor_type: str = "system",
        session_id: str = None,
        resource_type: str = None,
        resource_id: str = None,
        data_categories: List[DataCategory] = None,
        processing_purpose: ProcessingPurpose = None,
        lawful_basis: LawfulBasis = None,
        ip_address: str = None,
        user_agent: str = None,
        api_endpoint: str = None,
        http_method: str = None,
        request_id: str = None,
        event_details: Dict[str, Any] = None,
        before_state: Dict[str, Any] = None,
        after_state: Dict[str, Any] = None,
        severity: AuditSeverity = AuditSeverity.INFO,
        status: AuditStatus = AuditStatus.SUCCESS
    ) -> str:
        """
        Log a comprehensive audit event
        
        Args:
            event_type: Type of audit event
            actor_identifier: Who performed the action
            operation: What operation was performed
            event_description: Human-readable description
            component: System component involved
            user_id: User ID if applicable
            actor_type: Type of actor (user, system, service, api)
            session_id: Session identifier
            resource_type: Type of resource affected
            resource_id: ID of resource affected
            data_categories: Categories of data involved
            processing_purpose: Purpose for processing
            lawful_basis: Legal basis for processing
            ip_address: IP address of actor
            user_agent: User agent string
            api_endpoint: API endpoint called
            http_method: HTTP method used
            request_id: Request correlation ID
            event_details: Additional event details
            before_state: State before the event
            after_state: State after the event
            severity: Event severity level
            status: Event completion status
            
        Returns:
            Audit event ID
        """
        event_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Determine risk level and compliance impact
        risk_level = self.risk_level_mapping.get(event_type, "low")
        compliance_impact = self._assess_compliance_impact(event_type, data_categories)
        gdpr_article = self.gdpr_article_mapping.get(event_type)
        
        # Create audit event
        audit_event = AuditEvent(
            id=event_id,
            timestamp=now,
            event_type=event_type,
            severity=severity,
            status=status,
            user_id=user_id,
            actor_type=actor_type,
            actor_identifier=actor_identifier,
            session_id=session_id,
            source_system="6FB_AI_Agent_System",
            component=component,
            operation=operation,
            resource_type=resource_type,
            resource_id=resource_id,
            data_categories=data_categories or [],
            processing_purpose=processing_purpose,
            lawful_basis=lawful_basis,
            ip_address=ip_address,
            user_agent=user_agent,
            api_endpoint=api_endpoint,
            http_method=http_method,
            request_id=request_id,
            event_description=event_description,
            event_details=event_details or {},
            before_state=before_state,
            after_state=after_state,
            risk_level=risk_level,
            compliance_impact=compliance_impact,
            gdpr_article=gdpr_article,
            event_hash="",  # Will be calculated
            previous_hash=self.last_hash,
            signature=None
        )
        
        # Calculate event hash for integrity
        event_hash = self._calculate_event_hash(audit_event)
        audit_event.event_hash = event_hash
        
        # Generate signature for tamper detection
        signature = self._sign_event(audit_event)
        audit_event.signature = signature
        
        # Save to database
        await self._save_audit_event(audit_event)
        
        # Update hash chain
        self.last_hash = event_hash
        
        # Write to audit log file
        await self._write_audit_log_file(audit_event)
        
        # Update session activity
        if session_id:
            await self._update_session_activity(session_id, event_type, risk_level)
        
        logger.debug(f"Audit event logged: {event_type.value} by {actor_identifier}")
        return event_id

    def _assess_compliance_impact(
        self,
        event_type: AuditEventType,
        data_categories: List[DataCategory]
    ) -> str:
        """Assess GDPR compliance impact of event"""
        high_impact_events = [
            AuditEventType.BREACH_DETECTED,
            AuditEventType.DATA_DELETION,
            AuditEventType.CONSENT_WITHDRAWN
        ]
        
        high_risk_categories = [
            DataCategory.SPECIAL_CATEGORY,
            DataCategory.FINANCIAL_DATA
        ]
        
        if event_type in high_impact_events:
            return "high"
        
        if data_categories and any(cat in high_risk_categories for cat in data_categories):
            return "medium"
        
        return "low"

    def _calculate_event_hash(self, event: AuditEvent) -> str:
        """Calculate cryptographic hash of audit event for integrity"""
        # Create canonical representation of event
        hash_data = {
            "id": event.id,
            "timestamp": event.timestamp.isoformat(),
            "event_type": event.event_type.value,
            "actor_identifier": event.actor_identifier,
            "operation": event.operation,
            "event_description": event.event_description,
            "previous_hash": event.previous_hash
        }
        
        # Sort keys for consistent hashing
        canonical_data = json.dumps(hash_data, sort_keys=True)
        
        # Calculate SHA-256 hash
        return hashlib.sha256(canonical_data.encode()).hexdigest()

    def _sign_event(self, event: AuditEvent) -> str:
        """Generate HMAC signature for event"""
        event_data = f"{event.id}:{event.timestamp.isoformat()}:{event.event_hash}"
        signature = hmac.new(
            self.integrity_key,
            event_data.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature

    async def _save_audit_event(self, event: AuditEvent):
        """Save audit event to database"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_audit_events
                (id, timestamp, event_type, severity, status, user_id, actor_type,
                 actor_identifier, session_id, source_system, component, operation,
                 resource_type, resource_id, data_categories, processing_purpose,
                 lawful_basis, ip_address, user_agent, api_endpoint, http_method,
                 request_id, event_description, event_details, before_state,
                 after_state, risk_level, compliance_impact, gdpr_article,
                 event_hash, previous_hash, signature)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event.id, event.timestamp.isoformat(), event.event_type.value,
                    event.severity.value, event.status.value, event.user_id,
                    event.actor_type, event.actor_identifier, event.session_id,
                    event.source_system, event.component, event.operation,
                    event.resource_type, event.resource_id,
                    json.dumps([cat.value for cat in event.data_categories]) if event.data_categories else None,
                    event.processing_purpose.value if event.processing_purpose else None,
                    event.lawful_basis.value if event.lawful_basis else None,
                    event.ip_address, event.user_agent, event.api_endpoint,
                    event.http_method, event.request_id, event.event_description,
                    json.dumps(event.event_details), 
                    json.dumps(event.before_state) if event.before_state else None,
                    json.dumps(event.after_state) if event.after_state else None,
                    event.risk_level, event.compliance_impact, event.gdpr_article,
                    event.event_hash, event.previous_hash, event.signature
                )
            )
            await db.commit()

    async def _write_audit_log_file(self, event: AuditEvent):
        """Write audit event to log file"""
        log_entry = {
            "timestamp": event.timestamp.isoformat(),
            "event_id": event.id,
            "event_type": event.event_type.value,
            "severity": event.severity.value,
            "actor": event.actor_identifier,
            "operation": event.operation,
            "description": event.event_description,
            "hash": event.event_hash
        }
        
        log_line = json.dumps(log_entry) + "\n"
        
        # Write to audit log file (append mode)
        with open(self.audit_log_path, 'a') as f:
            f.write(log_line)

    async def _update_session_activity(
        self,
        session_id: str,
        event_type: AuditEventType,
        risk_level: str
    ):
        """Update audit session activity"""
        async with aiosqlite.connect(self.db_path) as db:
            # Check if session exists
            cursor = await db.execute(
                "SELECT id FROM gdpr_audit_sessions WHERE id = ?",
                (session_id,)
            )
            session_exists = await cursor.fetchone()
            
            if session_exists:
                # Update existing session
                risk_increment = 1 if risk_level in ["medium", "high"] else 0
                await db.execute(
                    """
                    UPDATE gdpr_audit_sessions 
                    SET events_count = events_count + 1,
                        risk_events_count = risk_events_count + ?,
                        last_activity = ?
                    WHERE id = ?
                    """,
                    (risk_increment, datetime.utcnow().isoformat(), session_id)
                )
            else:
                # Create new session
                await db.execute(
                    """
                    INSERT INTO gdpr_audit_sessions
                    (id, events_count, risk_events_count, last_activity)
                    VALUES (?, 1, ?, ?)
                    """,
                    (
                        session_id,
                        1 if risk_level in ["medium", "high"] else 0,
                        datetime.utcnow().isoformat()
                    )
                )
            
            await db.commit()

    async def _detect_audit_anomalies(self):
        """Detect anomalies in audit trail"""
        now = datetime.utcnow()
        lookback_period = now - timedelta(hours=24)
        
        async with aiosqlite.connect(self.db_path) as db:
            # 1. Detect unusual access patterns
            cursor = await db.execute(
                """
                SELECT user_id, COUNT(*) as event_count, COUNT(DISTINCT ip_address) as ip_count
                FROM gdpr_audit_events
                WHERE timestamp > ? AND user_id IS NOT NULL
                GROUP BY user_id
                HAVING event_count > 100 OR ip_count > 5
                """,
                (lookback_period.isoformat(),)
            )
            unusual_access = await cursor.fetchall()
            
            for user_id, event_count, ip_count in unusual_access:
                await self._create_anomaly(
                    "unusual_access_pattern",
                    AuditSeverity.WARNING,
                    f"User {user_id} has {event_count} events from {ip_count} different IPs in 24h",
                    user_id,
                    "statistical_analysis",
                    0.8
                )
            
            # 2. Detect failed operations spike
            cursor = await db.execute(
                """
                SELECT COUNT(*) as failure_count
                FROM gdpr_audit_events
                WHERE timestamp > ? AND status = 'failure'
                """,
                (lookback_period.isoformat(),)
            )
            failure_count = (await cursor.fetchone())[0]
            
            if failure_count > 50:  # Threshold for failures
                await self._create_anomaly(
                    "high_failure_rate",
                    AuditSeverity.ERROR,
                    f"High number of failed operations: {failure_count} in 24h",
                    None,
                    "threshold_analysis",
                    0.9
                )
            
            # 3. Detect off-hours access
            cursor = await db.execute(
                """
                SELECT user_id, COUNT(*) as events
                FROM gdpr_audit_events
                WHERE timestamp > ? 
                AND CAST(strftime('%H', timestamp) AS INTEGER) NOT BETWEEN 8 AND 18
                AND user_id IS NOT NULL
                GROUP BY user_id
                HAVING events > 20
                """,
                (lookback_period.isoformat(),)
            )
            off_hours_access = await cursor.fetchall()
            
            for user_id, events in off_hours_access:
                await self._create_anomaly(
                    "off_hours_access",
                    AuditSeverity.WARNING,
                    f"User {user_id} has {events} events outside business hours",
                    user_id,
                    "temporal_analysis",
                    0.7
                )

    async def _create_anomaly(
        self,
        anomaly_type: str,
        severity: AuditSeverity,
        description: str,
        user_id: str = None,
        algorithm: str = "rule_based",
        confidence: float = 1.0
    ):
        """Create audit anomaly record"""
        anomaly_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check if similar anomaly already exists (avoid duplicates)
            cursor = await db.execute(
                """
                SELECT id FROM gdpr_audit_anomalies
                WHERE anomaly_type = ? AND user_id = ? 
                AND detection_timestamp > datetime('now', '-1 hour')
                """,
                (anomaly_type, user_id)
            )
            existing = await cursor.fetchone()
            
            if not existing:
                await db.execute(
                    """
                    INSERT INTO gdpr_audit_anomalies
                    (id, anomaly_type, severity, description, user_id,
                     detection_algorithm, confidence_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        anomaly_id, anomaly_type, severity.value, description,
                        user_id, algorithm, confidence
                    )
                )
                await db.commit()
                
                logger.warning(f"Audit anomaly detected: {anomaly_type} - {description}")

    async def _verify_audit_integrity(self):
        """Verify integrity of audit log"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get recent events for verification
            cursor = await db.execute(
                """
                SELECT id, event_hash, previous_hash, signature, timestamp
                FROM gdpr_audit_events
                WHERE timestamp > datetime('now', '-24 hours')
                ORDER BY timestamp
                """
            )
            events = await cursor.fetchall()
            
            tampered_events = []
            expected_previous_hash = None
            
            for event_data in events:
                event_id, event_hash, previous_hash, signature, timestamp = event_data
                
                # Verify hash chain
                if expected_previous_hash and previous_hash != expected_previous_hash:
                    tampered_events.append({
                        "event_id": event_id,
                        "issue": "hash_chain_broken",
                        "expected_previous": expected_previous_hash,
                        "actual_previous": previous_hash
                    })
                
                # Verify signature
                if not self._verify_event_signature(event_id, timestamp, event_hash, signature):
                    tampered_events.append({
                        "event_id": event_id,
                        "issue": "invalid_signature"
                    })
                
                expected_previous_hash = event_hash
            
            # Record integrity check results
            check_id = str(uuid.uuid4())
            integrity_status = "tampered" if tampered_events else "intact"
            
            await db.execute(
                """
                INSERT INTO gdpr_audit_integrity_checks
                (id, events_checked, integrity_status, tampered_events, performed_by)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    check_id, len(events), integrity_status,
                    json.dumps(tampered_events), "system"
                )
            )
            await db.commit()
            
            if tampered_events:
                logger.critical(f"Audit log integrity compromised: {len(tampered_events)} events tampered")
            else:
                logger.debug(f"Audit log integrity verified: {len(events)} events checked")

    def _verify_event_signature(
        self,
        event_id: str,
        timestamp: str,
        event_hash: str,
        signature: str
    ) -> bool:
        """Verify HMAC signature of audit event"""
        event_data = f"{event_id}:{timestamp}:{event_hash}"
        expected_signature = hmac.new(
            self.integrity_key,
            event_data.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature)

    async def _cleanup_old_sessions(self):
        """Clean up old audit sessions"""
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "DELETE FROM gdpr_audit_sessions WHERE last_activity < ?",
                (cutoff_date.isoformat(),)
            )
            deleted_count = db.total_changes
            await db.commit()
            
            if deleted_count > 0:
                logger.debug(f"Cleaned up {deleted_count} old audit sessions")

    async def _generate_automated_reports(self):
        """Generate automated audit reports"""
        now = datetime.utcnow()
        
        # Generate daily summary if it's a new day
        today = now.date()
        yesterday = today - timedelta(days=1)
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check if yesterday's report already exists
            cursor = await db.execute(
                """
                SELECT id FROM gdpr_audit_reports
                WHERE report_type = 'daily_summary' 
                AND DATE(period_start) = ?
                """,
                (yesterday.isoformat(),)
            )
            existing_report = await cursor.fetchone()
            
            if not existing_report and now.hour >= 1:  # Generate after 1 AM
                await self.generate_audit_report(
                    "daily_summary",
                    f"Daily Audit Summary - {yesterday}",
                    datetime.combine(yesterday, datetime.min.time()),
                    datetime.combine(today, datetime.min.time())
                )

    async def generate_audit_report(
        self,
        report_type: str,
        report_title: str,
        period_start: datetime,
        period_end: datetime,
        filters: Dict[str, Any] = None,
        generated_by: str = "system"
    ) -> str:
        """
        Generate comprehensive audit report
        
        Args:
            report_type: Type of report (daily_summary, compliance_audit, etc.)
            report_title: Title for the report
            period_start: Start of reporting period
            period_end: End of reporting period
            filters: Additional filters to apply
            generated_by: Who generated the report
            
        Returns:
            Report ID
        """
        report_id = str(uuid.uuid4())
        filters = filters or {}
        
        async with aiosqlite.connect(self.db_path) as db:
            # Gather report data
            report_data = {}
            
            # 1. Event summary
            cursor = await db.execute(
                """
                SELECT event_type, severity, status, COUNT(*) as count
                FROM gdpr_audit_events
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY event_type, severity, status
                """,
                (period_start.isoformat(), period_end.isoformat())
            )
            event_summary = await cursor.fetchall()
            
            report_data["event_summary"] = [
                {
                    "event_type": row[0],
                    "severity": row[1],
                    "status": row[2],
                    "count": row[3]
                }
                for row in event_summary
            ]
            
            # 2. Top actors
            cursor = await db.execute(
                """
                SELECT actor_identifier, actor_type, COUNT(*) as event_count
                FROM gdpr_audit_events
                WHERE timestamp BETWEEN ? AND ?
                GROUP BY actor_identifier, actor_type
                ORDER BY event_count DESC
                LIMIT 10
                """,
                (period_start.isoformat(), period_end.isoformat())
            )
            top_actors = await cursor.fetchall()
            
            report_data["top_actors"] = [
                {
                    "actor": row[0],
                    "type": row[1],
                    "events": row[2]
                }
                for row in top_actors
            ]
            
            # 3. Risk events
            cursor = await db.execute(
                """
                SELECT event_type, user_id, ip_address, event_description, timestamp
                FROM gdpr_audit_events
                WHERE timestamp BETWEEN ? AND ? AND risk_level IN ('medium', 'high')
                ORDER BY timestamp DESC
                LIMIT 50
                """,
                (period_start.isoformat(), period_end.isoformat())
            )
            risk_events = await cursor.fetchall()
            
            report_data["risk_events"] = [
                {
                    "type": row[0],
                    "user_id": row[1],
                    "ip_address": row[2],
                    "description": row[3],
                    "timestamp": row[4]
                }
                for row in risk_events
            ]
            
            # 4. GDPR compliance events
            cursor = await db.execute(
                """
                SELECT gdpr_article, COUNT(*) as count
                FROM gdpr_audit_events
                WHERE timestamp BETWEEN ? AND ? AND gdpr_article IS NOT NULL
                GROUP BY gdpr_article
                """,
                (period_start.isoformat(), period_end.isoformat())
            )
            gdpr_events = await cursor.fetchall()
            
            report_data["gdpr_compliance"] = [
                {
                    "article": row[0],
                    "events": row[1]
                }
                for row in gdpr_events
            ]
            
            # 5. Anomalies detected
            cursor = await db.execute(
                """
                SELECT anomaly_type, severity, COUNT(*) as count
                FROM gdpr_audit_anomalies
                WHERE detection_timestamp BETWEEN ? AND ?
                GROUP BY anomaly_type, severity
                """,
                (period_start.isoformat(), period_end.isoformat())
            )
            anomalies = await cursor.fetchall()
            
            report_data["anomalies"] = [
                {
                    "type": row[0],
                    "severity": row[1],
                    "count": row[2]
                }
                for row in anomalies
            ]
            
            # 6. Report metadata
            report_data["metadata"] = {
                "report_id": report_id,
                "report_type": report_type,
                "period_start": period_start.isoformat(),
                "period_end": period_end.isoformat(),
                "generated_at": datetime.utcnow().isoformat(),
                "generated_by": generated_by,
                "total_events": sum(item["count"] for item in report_data["event_summary"]),
                "filters_applied": filters
            }
            
            # Save report
            await db.execute(
                """
                INSERT INTO gdpr_audit_reports
                (id, report_type, report_title, period_start, period_end,
                 filters, report_data, generated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id, report_type, report_title,
                    period_start.isoformat(), period_end.isoformat(),
                    json.dumps(filters), json.dumps(report_data), generated_by
                )
            )
            await db.commit()
        
        logger.info(f"Audit report generated: {report_title} ({report_id})")
        return report_id

    async def search_audit_events(
        self,
        filters: Dict[str, Any],
        start_date: datetime = None,
        end_date: datetime = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Search audit events with filters"""
        query_conditions = []
        query_params = []
        
        # Date range
        if start_date:
            query_conditions.append("timestamp >= ?")
            query_params.append(start_date.isoformat())
        
        if end_date:
            query_conditions.append("timestamp <= ?")
            query_params.append(end_date.isoformat())
        
        # Dynamic filters
        for key, value in filters.items():
            if key in ["event_type", "severity", "status", "user_id", "actor_type", 
                      "component", "resource_type", "risk_level", "gdpr_article"]:
                query_conditions.append(f"{key} = ?")
                query_params.append(value)
            elif key == "actor_identifier":
                query_conditions.append("actor_identifier LIKE ?")
                query_params.append(f"%{value}%")
            elif key == "operation":
                query_conditions.append("operation LIKE ?")
                query_params.append(f"%{value}%")
        
        # Build query
        base_query = """
            SELECT id, timestamp, event_type, severity, status, actor_identifier,
                   operation, event_description, resource_type, resource_id,
                   risk_level, gdpr_article
            FROM gdpr_audit_events
        """
        
        if query_conditions:
            base_query += " WHERE " + " AND ".join(query_conditions)
        
        base_query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
        query_params.extend([limit, offset])
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(base_query, query_params)
            events = await cursor.fetchall()
            
            # Get total count
            count_query = "SELECT COUNT(*) FROM gdpr_audit_events"
            if query_conditions:
                count_query += " WHERE " + " AND ".join(query_conditions)
            
            cursor = await db.execute(count_query, query_params[:-2])  # Exclude limit/offset
            total_count = (await cursor.fetchone())[0]
        
        return {
            "events": [
                {
                    "id": row[0],
                    "timestamp": row[1],
                    "event_type": row[2],
                    "severity": row[3],
                    "status": row[4],
                    "actor": row[5],
                    "operation": row[6],
                    "description": row[7],
                    "resource_type": row[8],
                    "resource_id": row[9],
                    "risk_level": row[10],
                    "gdpr_article": row[11]
                }
                for row in events
            ],
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "filters": filters
        }

    async def health_check(self) -> Dict[str, Any]:
        """Health check for audit trail service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count events by severity
                cursor = await db.execute(
                    """
                    SELECT severity, COUNT(*) FROM gdpr_audit_events
                    WHERE timestamp > datetime('now', '-24 hours')
                    GROUP BY severity
                    """
                )
                severity_counts = dict(await cursor.fetchall())
                
                # Count recent anomalies
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_audit_anomalies
                    WHERE detection_timestamp > datetime('now', '-24 hours')
                    """
                )
                recent_anomalies = (await cursor.fetchone())[0]
                
                # Check integrity status
                cursor = await db.execute(
                    """
                    SELECT integrity_status FROM gdpr_audit_integrity_checks
                    ORDER BY check_timestamp DESC LIMIT 1
                    """
                )
                result = await cursor.fetchone()
                last_integrity_status = result[0] if result else "unknown"
                
                # Count active sessions  
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_audit_sessions
                    WHERE last_activity > datetime('now', '-1 hour')
                    """
                )
                active_sessions = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "events_by_severity_24h": severity_counts,
                "recent_anomalies": recent_anomalies,
                "last_integrity_check": last_integrity_status,
                "active_sessions": active_sessions,
                "hash_chain_initialized": self.last_hash is not None,
                "audit_log_file_exists": os.path.exists(self.audit_log_path),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Audit trail service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize audit trail service instance
audit_trail_service = GDPRAuditTrailService()