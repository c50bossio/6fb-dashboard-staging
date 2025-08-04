"""
GDPR Data Breach Notification Service - Articles 33 & 34 Implementation
Comprehensive data breach detection, notification, and management system
compliant with GDPR requirements for notifying supervisory authorities
and data subjects.

Key Features:
- Automated breach detection and classification
- 72-hour authority notification compliance (Article 33)
- Data subject notification when required (Article 34)
- Risk assessment and impact analysis
- Incident response workflow management
- Breach register maintenance
- Notification template management
- Integration with security monitoring systems
"""

import os
import json
import uuid
import asyncio
import logging
import smtplib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import aiosqlite
from pathlib import Path
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import requests

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis, DataBreachIncident
)

logger = logging.getLogger(__name__)

class BreachType(Enum):
    """Types of data breaches under GDPR"""
    CONFIDENTIALITY = "confidentiality"  # Unauthorized access/disclosure
    INTEGRITY = "integrity"               # Unauthorized alteration
    AVAILABILITY = "availability"         # Accidental/unlawful destruction

class RiskLevel(Enum):
    """Risk assessment levels"""
    LOW = "low"
    MEDIUM = "medium" 
    HIGH = "high"
    CRITICAL = "critical"

class NotificationStatus(Enum):
    """Notification status tracking"""
    NOT_REQUIRED = "not_required"
    REQUIRED = "required"
    SENT = "sent"
    FAILED = "failed"
    ACKNOWLEDGED = "acknowledged"

class IncidentStatus(Enum):
    """Incident management status"""
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"

@dataclass
class BreachDetectionRule:
    """Rule for automated breach detection"""
    id: str
    name: str
    description: str
    detection_query: str
    threshold: int
    time_window_minutes: int
    breach_type: BreachType
    risk_level: RiskLevel
    data_categories: List[DataCategory]
    enabled: bool

@dataclass
class BreachIncident:
    """Extended breach incident with full GDPR compliance"""
    id: str
    title: str
    description: str
    breach_type: BreachType
    risk_level: RiskLevel
    status: IncidentStatus
    
    # Affected data
    affected_data_categories: List[DataCategory]
    affected_users_count: int
    affected_users_list: List[str]
    data_compromised: Dict[str, Any]
    
    # Timeline
    discovered_at: datetime
    occurred_at: Optional[datetime]
    contained_at: Optional[datetime]
    resolved_at: Optional[datetime]
    
    # Risk assessment
    likelihood_of_harm: str  # low, medium, high
    severity_of_consequences: str  # low, medium, high
    technical_organizational_measures: List[str]
    
    # Notifications
    authority_notification_required: bool
    authority_notification_status: NotificationStatus
    authority_notified_at: Optional[datetime]
    authority_reference_number: str
    
    subjects_notification_required: bool
    subjects_notification_status: NotificationStatus
    subjects_notified_at: Optional[datetime]
    subjects_notification_method: str
    
    # Investigation
    root_cause: str
    affected_systems: List[str]
    remediation_measures: List[str]
    lessons_learned: str
    
    # Legal
    regulatory_requirements: List[str]
    potential_fines: float
    legal_advice_sought: bool
    
    # Communication
    internal_notifications_sent: List[str]
    external_communications: List[str]
    media_response_required: bool
    
    created_at: datetime
    updated_at: datetime

class GDPRDataBreachNotificationService:
    """
    Service for handling GDPR data breach notification requirements
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # Supervisory authority contact information
        self.supervisory_authorities = {
            "default": {
                "name": "Data Protection Authority",
                "email": "breach-notifications@dpa.gov",
                "phone": "+1-800-DPA-BREACH",
                "online_form_url": "https://dpa.gov/breach-notification",
                "jurisdiction": "EU"
            }
        }
        
        # Notification templates
        self.notification_templates = self._initialize_notification_templates()
        
        # Detection rules
        self.detection_rules = self._initialize_detection_rules()
        
        # Risk thresholds for subject notification
        self.subject_notification_thresholds = {
            "high_risk_categories": [
                DataCategory.SPECIAL_CATEGORY,
                DataCategory.FINANCIAL_DATA
            ],
            "high_risk_user_count": 250,
            "high_risk_breach_types": [
                BreachType.CONFIDENTIALITY
            ]
        }
        
        # Initialize database
        asyncio.create_task(self._init_breach_tables())
        
        # Start breach monitoring
        asyncio.create_task(self._start_breach_monitoring())
        
        logger.info("GDPR Data Breach Notification Service initialized")

    def _initialize_notification_templates(self) -> Dict[str, Dict[str, str]]:
        """Initialize notification message templates"""
        return {
            "authority_notification": {
                "subject": "Data Breach Notification - {incident_id}",
                "body": """
Dear Data Protection Authority,

We are writing to notify you of a personal data breach in accordance with Article 33 of the GDPR.

INCIDENT DETAILS:
- Incident Reference: {incident_id}
- Date/Time of Breach: {occurred_at}
- Date/Time Discovered: {discovered_at}
- Breach Type: {breach_type}
- Risk Level: {risk_level}

AFFECTED DATA:
- Categories of Personal Data: {data_categories}
- Number of Data Subjects Affected: {affected_users_count}
- Categories of Data Subjects: {data_subjects_categories}

NATURE OF THE BREACH:
{description}

LIKELY CONSEQUENCES:
{consequences}

MEASURES TAKEN:
{remediation_measures}

CONTACT INFORMATION:
Data Protection Officer: dpo@6fbagentsystem.com
Phone: +1-800-6FB-GDPR

This notification is made within 72 hours of becoming aware of the breach.

Regards,
6FB AI Agent System Data Protection Team
                """
            },
            "subject_notification": {
                "subject": "Important Security Notice - Your Personal Data",
                "body": """
Dear Valued Customer,

We are writing to inform you of a security incident that may have affected your personal data.

WHAT HAPPENED:
{description}

WHAT INFORMATION WAS INVOLVED:
{affected_data_description}

WHAT WE ARE DOING:
{remediation_measures}

WHAT YOU CAN DO:
{recommended_actions}

We sincerely apologize for this incident and any inconvenience it may cause. We take the security of your personal data very seriously.

If you have any questions, please contact us at privacy@6fbagentsystem.com or call +1-800-6FB-HELP.

Regards,
6FB AI Agent System Security Team
                """
            }
        }

    def _initialize_detection_rules(self) -> List[BreachDetectionRule]:
        """Initialize automated breach detection rules"""
        return [
            BreachDetectionRule(
                id="failed_login_attempts",
                name="Excessive Failed Login Attempts",
                description="Detect potential brute force attacks",
                detection_query="SELECT COUNT(*) FROM auth_logs WHERE result = 'failed' AND timestamp > datetime('now', '-15 minutes')",
                threshold=100,
                time_window_minutes=15,
                breach_type=BreachType.CONFIDENTIALITY,
                risk_level=RiskLevel.MEDIUM,
                data_categories=[DataCategory.IDENTITY_DATA],
                enabled=True
            ),
            BreachDetectionRule(
                id="unauthorized_data_access",
                name="Unauthorized Data Access",
                description="Detect unusual data access patterns",
                detection_query="SELECT COUNT(*) FROM gdpr_audit_log WHERE action LIKE '%UNAUTHORIZED%' AND timestamp > datetime('now', '-1 hour')",
                threshold=5,
                time_window_minutes=60,
                breach_type=BreachType.CONFIDENTIALITY,
                risk_level=RiskLevel.HIGH,
                data_categories=[DataCategory.IDENTITY_DATA, DataCategory.FINANCIAL_DATA],
                enabled=True
            ),
            BreachDetectionRule(
                id="data_corruption_detected",
                name="Data Integrity Compromise",
                description="Detect unauthorized data modification",
                detection_query="SELECT COUNT(*) FROM system_logs WHERE message LIKE '%CORRUPTION%' AND timestamp > datetime('now', '-30 minutes')",
                threshold=1,
                time_window_minutes=30,
                breach_type=BreachType.INTEGRITY,
                risk_level=RiskLevel.HIGH,
                data_categories=[DataCategory.IDENTITY_DATA, DataCategory.FINANCIAL_DATA],
                enabled=True
            ),
            BreachDetectionRule(
                id="system_unavailability",
                name="System Availability Breach",
                description="Detect prolonged system unavailability",
                detection_query="SELECT COUNT(*) FROM system_health WHERE status = 'down' AND timestamp > datetime('now', '-5 minutes')",
                threshold=5,
                time_window_minutes=5,
                breach_type=BreachType.AVAILABILITY,
                risk_level=RiskLevel.MEDIUM,
                data_categories=[DataCategory.USAGE_DATA],
                enabled=True
            )
        ]

    async def _init_breach_tables(self):
        """Initialize breach notification database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_breach_incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                breach_type TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                status TEXT NOT NULL,
                
                -- Affected data
                affected_data_categories TEXT NOT NULL, -- JSON array
                affected_users_count INTEGER NOT NULL,
                affected_users_list TEXT, -- JSON array
                data_compromised TEXT, -- JSON
                
                -- Timeline
                discovered_at TIMESTAMP NOT NULL,
                occurred_at TIMESTAMP,
                contained_at TIMESTAMP,
                resolved_at TIMESTAMP,
                
                -- Risk assessment
                likelihood_of_harm TEXT,
                severity_of_consequences TEXT,
                technical_organizational_measures TEXT, -- JSON array
                
                -- Authority notification
                authority_notification_required BOOLEAN DEFAULT 1,
                authority_notification_status TEXT DEFAULT 'required',
                authority_notified_at TIMESTAMP,
                authority_reference_number TEXT,
                
                -- Subject notification
                subjects_notification_required BOOLEAN DEFAULT 0,
                subjects_notification_status TEXT DEFAULT 'not_required',
                subjects_notified_at TIMESTAMP,
                subjects_notification_method TEXT,
                
                -- Investigation
                root_cause TEXT,
                affected_systems TEXT, -- JSON array
                remediation_measures TEXT, -- JSON array
                lessons_learned TEXT,
                
                -- Legal
                regulatory_requirements TEXT, -- JSON array
                potential_fines REAL DEFAULT 0,
                legal_advice_sought BOOLEAN DEFAULT 0,
                
                -- Communication
                internal_notifications_sent TEXT, -- JSON array
                external_communications TEXT, -- JSON array
                media_response_required BOOLEAN DEFAULT 0,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_breach_notifications (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                notification_type TEXT NOT NULL, -- authority, subject, internal
                recipient TEXT NOT NULL,
                method TEXT NOT NULL, -- email, phone, online_form
                status TEXT NOT NULL,
                sent_at TIMESTAMP,
                acknowledged_at TIMESTAMP,
                content TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES gdpr_breach_incidents(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_breach_detection_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                detection_query TEXT NOT NULL,
                threshold INTEGER NOT NULL,
                time_window_minutes INTEGER NOT NULL,
                breach_type TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                data_categories TEXT NOT NULL, -- JSON array
                enabled BOOLEAN DEFAULT 1,
                last_triggered TIMESTAMP,
                trigger_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_breach_register (
                id TEXT PRIMARY KEY,
                incident_id TEXT NOT NULL,
                register_entry TEXT NOT NULL, -- JSON
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES gdpr_breach_incidents(id)
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Insert detection rules
            for rule in self.detection_rules:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO gdpr_breach_detection_rules
                    (id, name, description, detection_query, threshold, time_window_minutes,
                     breach_type, risk_level, data_categories)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        rule.id, rule.name, rule.description, rule.detection_query,
                        rule.threshold, rule.time_window_minutes, rule.breach_type.value,
                        rule.risk_level.value, json.dumps([cat.value for cat in rule.data_categories])
                    )
                )
            
            await db.commit()

    async def _start_breach_monitoring(self):
        """Start automated breach monitoring"""
        while True:
            try:
                await self._run_breach_detection()
                await self._check_notification_deadlines()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Breach monitoring error: {str(e)}")
                await asyncio.sleep(300)  # Wait 5 minutes on error

    async def _run_breach_detection(self):
        """Run all enabled breach detection rules"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT * FROM gdpr_breach_detection_rules WHERE enabled = 1"
            )
            rules = await cursor.fetchall()
            
            for rule_data in rules:
                try:
                    rule_id = rule_data[0]
                    detection_query = rule_data[3]
                    threshold = rule_data[4]
                    
                    # Execute detection query
                    detection_cursor = await db.execute(detection_query)
                    result = await detection_cursor.fetchone()
                    
                    if result and result[0] >= threshold:
                        await self._trigger_breach_detection(rule_id, result[0])
                        
                except Exception as e:
                    logger.error(f"Error running detection rule {rule_data[0]}: {str(e)}")

    async def _trigger_breach_detection(self, rule_id: str, trigger_value: int):
        """Trigger breach detection for specific rule"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get rule details
            cursor = await db.execute(
                "SELECT * FROM gdpr_breach_detection_rules WHERE id = ?",
                (rule_id,)
            )
            rule_data = await cursor.fetchone()
            
            if not rule_data:
                return
            
            # Check if recently triggered (avoid duplicate incidents)
            last_triggered = rule_data[10]  # last_triggered column
            if last_triggered:
                last_trigger_time = datetime.fromisoformat(last_triggered)
                if datetime.utcnow() - last_trigger_time < timedelta(hours=1):
                    return  # Skip if triggered within last hour
            
            # Create automatic breach incident
            incident_id = await self.report_breach_incident(
                title=f"Automated Detection: {rule_data[1]}",
                description=f"Breach detected by rule '{rule_data[1]}'. Trigger value: {trigger_value}, Threshold: {rule_data[4]}",
                breach_type=BreachType(rule_data[6]),
                risk_level=RiskLevel(rule_data[7]),
                affected_data_categories=[DataCategory(cat) for cat in json.loads(rule_data[8])],
                affected_users_count=0,  # To be determined during investigation
                auto_detected=True
            )
            
            # Update rule trigger time
            await db.execute(
                """
                UPDATE gdpr_breach_detection_rules 
                SET last_triggered = ?, trigger_count = trigger_count + 1
                WHERE id = ?
                """,
                (datetime.utcnow().isoformat(), rule_id)
            )
            await db.commit()
            
            logger.warning(f"Breach detected by rule {rule_id}, incident {incident_id} created")

    async def report_breach_incident(
        self,
        title: str,
        description: str,
        breach_type: BreachType,
        risk_level: RiskLevel,
        affected_data_categories: List[DataCategory],
        affected_users_count: int,
        affected_users_list: List[str] = None,
        occurred_at: datetime = None,
        auto_detected: bool = False
    ) -> str:
        """
        Report a new data breach incident
        
        Args:
            title: Incident title
            description: Detailed description
            breach_type: Type of breach (confidentiality, integrity, availability)
            risk_level: Risk assessment level
            affected_data_categories: Categories of data affected
            affected_users_count: Number of users affected
            affected_users_list: List of affected user IDs
            occurred_at: When the breach occurred (if known)
            auto_detected: Whether this was automatically detected
            
        Returns:
            Incident ID
        """
        incident_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Risk assessment
        likelihood_of_harm, severity_of_consequences = self._assess_risk(
            breach_type, risk_level, affected_data_categories, affected_users_count
        )
        
        # Determine notification requirements
        authority_required = True  # Always required under GDPR Article 33
        subjects_required = self._assess_subject_notification_requirement(
            breach_type, risk_level, affected_data_categories, affected_users_count
        )
        
        incident = BreachIncident(
            id=incident_id,
            title=title,
            description=description,
            breach_type=breach_type,
            risk_level=risk_level,
            status=IncidentStatus.DETECTED,
            affected_data_categories=affected_data_categories,
            affected_users_count=affected_users_count,
            affected_users_list=affected_users_list or [],
            data_compromised={},
            discovered_at=now,
            occurred_at=occurred_at,
            contained_at=None,
            resolved_at=None,
            likelihood_of_harm=likelihood_of_harm,
            severity_of_consequences=severity_of_consequences,
            technical_organizational_measures=[],
            authority_notification_required=authority_required,
            authority_notification_status=NotificationStatus.REQUIRED,
            authority_notified_at=None,
            authority_reference_number="",
            subjects_notification_required=subjects_required,
            subjects_notification_status=NotificationStatus.REQUIRED if subjects_required else NotificationStatus.NOT_REQUIRED,
            subjects_notified_at=None,
            subjects_notification_method="",
            root_cause="Under investigation",
            affected_systems=[],
            remediation_measures=[],
            lessons_learned="",
            regulatory_requirements=["GDPR Article 33", "GDPR Article 34"],
            potential_fines=0.0,
            legal_advice_sought=False,
            internal_notifications_sent=[],
            external_communications=[],
            media_response_required=False,
            created_at=now,
            updated_at=now
        )
        
        # Save to database
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_breach_incidents
                (id, title, description, breach_type, risk_level, status,
                 affected_data_categories, affected_users_count, affected_users_list,
                 discovered_at, occurred_at, likelihood_of_harm, severity_of_consequences,
                 authority_notification_required, authority_notification_status,
                 subjects_notification_required, subjects_notification_status,
                 root_cause, regulatory_requirements)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    incident_id, title, description, breach_type.value, risk_level.value,
                    IncidentStatus.DETECTED.value,
                    json.dumps([cat.value for cat in affected_data_categories]),
                    affected_users_count, json.dumps(affected_users_list or []),
                    now.isoformat(), occurred_at.isoformat() if occurred_at else None,
                    likelihood_of_harm, severity_of_consequences,
                    authority_required, NotificationStatus.REQUIRED.value,
                    subjects_required, NotificationStatus.REQUIRED.value if subjects_required else NotificationStatus.NOT_REQUIRED.value,
                    "Under investigation", json.dumps(["GDPR Article 33", "GDPR Article 34"])
                )
            )
            await db.commit()
        
        # Add to breach register
        await self._add_to_breach_register(incident_id, incident)
        
        # Log the incident
        await gdpr_service._log_gdpr_action(
            user_id="system",
            action="BREACH_INCIDENT_REPORTED",
            details={
                "incident_id": incident_id,
                "breach_type": breach_type.value,
                "risk_level": risk_level.value,
                "auto_detected": auto_detected
            }
        )
        
        # Start notification process if high risk
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            asyncio.create_task(self._initiate_immediate_notifications(incident_id))
        
        logger.critical(f"Data breach incident reported: {incident_id} - {title}")
        return incident_id

    def _assess_risk(
        self,
        breach_type: BreachType,
        risk_level: RiskLevel,
        data_categories: List[DataCategory],
        affected_users_count: int
    ) -> tuple[str, str]:
        """Assess likelihood of harm and severity of consequences"""
        
        # Base assessment on breach type
        if breach_type == BreachType.CONFIDENTIALITY:
            likelihood_base = "high"
        elif breach_type == BreachType.INTEGRITY:
            likelihood_base = "medium"
        else:  # AVAILABILITY
            likelihood_base = "low"
        
        # Adjust for data sensitivity
        if DataCategory.SPECIAL_CATEGORY in data_categories:
            severity_base = "high"
        elif DataCategory.FINANCIAL_DATA in data_categories:
            severity_base = "high"
        elif DataCategory.IDENTITY_DATA in data_categories:
            severity_base = "medium"
        else:
            severity_base = "low"
        
        # Adjust for scale
        if affected_users_count > 1000:
            severity_base = "high"
        elif affected_users_count > 100:
            if severity_base == "low":
                severity_base = "medium"
        
        return likelihood_base, severity_base

    def _assess_subject_notification_requirement(
        self,
        breach_type: BreachType,
        risk_level: RiskLevel,
        data_categories: List[DataCategory],
        affected_users_count: int
    ) -> bool:
        """Assess if data subjects must be notified (Article 34)"""
        
        # High risk breaches require subject notification
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            return True
        
        # Special categories always require notification
        if DataCategory.SPECIAL_CATEGORY in data_categories:
            return True
        
        # Financial data breaches require notification
        if DataCategory.FINANCIAL_DATA in data_categories:
            return True
        
        # Large scale breaches require notification
        if affected_users_count >= self.subject_notification_thresholds["high_risk_user_count"]:
            return True
        
        # Confidentiality breaches with identity data
        if (breach_type == BreachType.CONFIDENTIALITY and 
            DataCategory.IDENTITY_DATA in data_categories):
            return True
        
        return False

    async def _add_to_breach_register(self, incident_id: str, incident: BreachIncident):
        """Add incident to breach register (Article 33(5))"""
        register_entry = {
            "incident_id": incident_id,
            "facts_of_breach": incident.description,
            "effects_and_consequences": f"Affected {incident.affected_users_count} users",
            "remedial_action_taken": "Investigation initiated",
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        register_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_breach_register
                (id, incident_id, register_entry)
                VALUES (?, ?, ?)
                """,
                (register_id, incident_id, json.dumps(register_entry))
            )
            await db.commit()

    async def _initiate_immediate_notifications(self, incident_id: str):
        """Initiate immediate notifications for high-risk incidents"""
        # Get incident details
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT * FROM gdpr_breach_incidents WHERE id = ?",
                (incident_id,)
            )
            incident_data = await cursor.fetchone()
        
        if not incident_data:
            return
        
        # Send internal notifications immediately
        await self._send_internal_notifications(incident_id)
        
        # Schedule authority notification (within 72 hours)
        asyncio.create_task(self._schedule_authority_notification(incident_id))

    async def _send_internal_notifications(self, incident_id: str):
        """Send internal breach notifications"""
        # This would integrate with internal notification systems
        # For now, log the requirement
        logger.critical(f"INTERNAL NOTIFICATION: Data breach incident {incident_id} requires immediate attention")
        
        # In production, this would:
        # - Send alerts to security team
        # - Notify data protection officer
        # - Alert executive team for high-risk incidents
        # - Create incident response tickets

    async def _schedule_authority_notification(self, incident_id: str):
        """Schedule authority notification within 72 hours"""
        # Wait a brief period for initial investigation
        await asyncio.sleep(3600)  # 1 hour delay for initial assessment
        
        # Send authority notification
        await self.notify_supervisory_authority(incident_id)

    async def notify_supervisory_authority(self, incident_id: str) -> bool:
        """
        Notify supervisory authority of breach (Article 33)
        
        Args:
            incident_id: ID of the breach incident
            
        Returns:
            True if notification was sent successfully
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT * FROM gdpr_breach_incidents WHERE id = ?",
                (incident_id,)
            )
            incident_data = await cursor.fetchone()
        
        if not incident_data:
            return False
        
        # Check 72-hour deadline
        discovered_at = datetime.fromisoformat(incident_data[9])  # discovered_at column
        deadline = discovered_at + timedelta(hours=72)
        now = datetime.utcnow()
        
        if now > deadline:
            logger.warning(f"Authority notification for {incident_id} is overdue (72-hour deadline passed)")
        
        # Prepare notification content
        template = self.notification_templates["authority_notification"]
        notification_content = template["body"].format(
            incident_id=incident_id,
            occurred_at=incident_data[10] or "Unknown",  # occurred_at
            discovered_at=incident_data[9],  # discovered_at
            breach_type=incident_data[3],  # breach_type
            risk_level=incident_data[4],  # risk_level
            data_categories=incident_data[6],  # affected_data_categories
            affected_users_count=incident_data[7],  # affected_users_count
            data_subjects_categories="Barbershop customers and staff",
            description=incident_data[2],  # description
            consequences=f"Potential {incident_data[12]} likelihood of harm with {incident_data[13]} severity",  # likelihood_of_harm, severity_of_consequences
            remediation_measures="Investigation ongoing, affected systems secured"
        )
        
        # Send notification (in production, this would use actual APIs)
        notification_sent = await self._send_authority_notification(
            incident_id, notification_content
        )
        
        if notification_sent:
            # Update incident record
            reference_number = f"DPA-{incident_id[:8]}-{now.strftime('%Y%m%d')}"
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE gdpr_breach_incidents
                    SET authority_notification_status = ?, authority_notified_at = ?,
                        authority_reference_number = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        NotificationStatus.SENT.value, now.isoformat(),
                        reference_number, now.isoformat(), incident_id
                    )
                )
                await db.commit()
            
            logger.info(f"Authority notification sent for incident {incident_id}")
            return True
        
        return False

    async def _send_authority_notification(self, incident_id: str, content: str) -> bool:
        """Send notification to supervisory authority"""
        try:
            # In production, this would:
            # 1. Submit via authority's online breach notification form
            # 2. Send secure email to authority
            # 3. Make phone call for critical incidents
            # 4. Submit paper forms if required
            
            # For demo purposes, log the notification
            logger.info(f"Would send authority notification for incident {incident_id}")
            
            # Record the notification
            notification_id = str(uuid.uuid4())
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    INSERT INTO gdpr_breach_notifications
                    (id, incident_id, notification_type, recipient, method, status, content, sent_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        notification_id, incident_id, "authority",
                        self.supervisory_authorities["default"]["email"],
                        "online_form", NotificationStatus.SENT.value,
                        content, datetime.utcnow().isoformat()
                    )
                )
                await db.commit()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send authority notification for {incident_id}: {str(e)}")
            return False

    async def notify_data_subjects(self, incident_id: str) -> bool:
        """
        Notify affected data subjects (Article 34)
        
        Args:
            incident_id: ID of the breach incident
            
        Returns:
            True if notifications were sent successfully
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                "SELECT * FROM gdpr_breach_incidents WHERE id = ?",
                (incident_id,)
            )
            incident_data = await cursor.fetchone()
        
        if not incident_data:
            return False
        
        # Check if subject notification is required
        subjects_required = bool(incident_data[18])  # subjects_notification_required
        if not subjects_required:
            return True  # Not required, so considered successful
        
        # Get affected users
        affected_users_list = json.loads(incident_data[8] or "[]")  # affected_users_list
        
        if not affected_users_list:
            # If no specific user list, get all users (for demo)
            cursor = await db.execute("SELECT id, email FROM users LIMIT 10")
            user_data = await cursor.fetchall()
            affected_users_list = [{"id": row[0], "email": row[1]} for row in user_data]
        
        # Prepare notification content
        template = self.notification_templates["subject_notification"]
        
        success_count = 0
        for user_info in affected_users_list:
            try:
                notification_content = template["body"].format(
                    description=incident_data[2],  # description
                    affected_data_description=self._get_user_friendly_data_description(
                        json.loads(incident_data[6])  # affected_data_categories
                    ),
                    remediation_measures="We have secured the affected systems and are investigating the incident",
                    recommended_actions="We recommend you monitor your accounts and change your password"
                )
                
                # Send notification (in production, this would send actual emails/SMS)
                notification_sent = await self._send_subject_notification(
                    user_info.get("email", "unknown@example.com"),
                    template["subject"].replace("{incident_id}", incident_id),
                    notification_content
                )
                
                if notification_sent:
                    success_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to notify user {user_info}: {str(e)}")
        
        # Update incident record
        if success_count > 0:
            now = datetime.utcnow()
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE gdpr_breach_incidents
                    SET subjects_notification_status = ?, subjects_notified_at = ?,
                        subjects_notification_method = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (
                        NotificationStatus.SENT.value, now.isoformat(),
                        "email", now.isoformat(), incident_id
                    )
                )
                await db.commit()
        
        logger.info(f"Subject notifications sent for incident {incident_id}: {success_count} successful")
        return success_count > 0

    def _get_user_friendly_data_description(self, data_categories: List[str]) -> str:
        """Convert technical data categories to user-friendly description"""
        friendly_names = {
            "identity_data": "your name and contact information",
            "contact_data": "your email address and phone number",
            "financial_data": "your payment and billing information",
            "usage_data": "information about how you use our services",
            "technical_data": "technical information about your device and connection",
            "marketing_data": "your marketing preferences and communication history"
        }
        
        descriptions = [friendly_names.get(cat, cat) for cat in data_categories]
        
        if len(descriptions) == 1:
            return descriptions[0]
        elif len(descriptions) == 2:
            return f"{descriptions[0]} and {descriptions[1]}"
        else:
            return f"{', '.join(descriptions[:-1])}, and {descriptions[-1]}"

    async def _send_subject_notification(
        self,
        recipient_email: str,
        subject: str,
        content: str
    ) -> bool:
        """Send notification to data subject"""
        try:
            # In production, this would send actual emails via SMTP or email service
            logger.info(f"Would send breach notification email to {recipient_email}")
            
            # Record the notification attempt
            notification_id = str(uuid.uuid4())
            # Note: This would need the incident_id parameter in a real implementation
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to send subject notification to {recipient_email}: {str(e)}")
            return False

    async def _check_notification_deadlines(self):
        """Check for overdue notification deadlines"""
        now = datetime.utcnow()
        deadline_72h = now - timedelta(hours=72)
        
        async with aiosqlite.connect(self.db_path) as db:
            # Check overdue authority notifications
            cursor = await db.execute(
                """
                SELECT id, title FROM gdpr_breach_incidents
                WHERE authority_notification_required = 1
                AND authority_notification_status = 'required'
                AND discovered_at < ?
                """,
                (deadline_72h.isoformat(),)
            )
            overdue_authority = await cursor.fetchall()
            
            for incident_id, title in overdue_authority:
                logger.critical(f"OVERDUE AUTHORITY NOTIFICATION: Incident {incident_id} - {title}")
                # In production, this would trigger escalation alerts

    async def update_incident_status(
        self,
        incident_id: str,
        status: IncidentStatus,
        update_notes: str = ""
    ) -> bool:
        """Update breach incident status"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Update status
            await db.execute(
                """
                UPDATE gdpr_breach_incidents
                SET status = ?, updated_at = ?
                WHERE id = ?
                """,
                (status.value, now.isoformat(), incident_id)
            )
            
            # Update timestamps based on status
            if status == IncidentStatus.CONTAINED:
                await db.execute(
                    "UPDATE gdpr_breach_incidents SET contained_at = ? WHERE id = ?",
                    (now.isoformat(), incident_id)
                )
            elif status == IncidentStatus.RESOLVED:
                await db.execute(
                    "UPDATE gdpr_breach_incidents SET resolved_at = ? WHERE id = ?",
                    (now.isoformat(), incident_id)
                )
            
            await db.commit()
        
        logger.info(f"Incident {incident_id} status updated to {status.value}")
        return True

    async def get_breach_incidents(
        self,
        status: IncidentStatus = None,
        risk_level: RiskLevel = None,
        days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """Get breach incidents with optional filtering"""
        cutoff_date = datetime.utcnow() - timedelta(days=days_back)
        
        query = "SELECT * FROM gdpr_breach_incidents WHERE discovered_at > ?"
        params = [cutoff_date.isoformat()]
        
        if status:
            query += " AND status = ?"
            params.append(status.value)
        
        if risk_level:
            query += " AND risk_level = ?"
            params.append(risk_level.value)
        
        query += " ORDER BY discovered_at DESC"
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(query, params)
            results = await cursor.fetchall()
        
        incidents = []
        for row in results:
            incidents.append({
                "id": row[0],
                "title": row[1],
                "description": row[2],
                "breach_type": row[3],
                "risk_level": row[4],
                "status": row[5],
                "affected_users_count": row[7],
                "discovered_at": row[9],
                "authority_notification_status": row[16],
                "subjects_notification_status": row[19]
            })
        
        return incidents

    async def health_check(self) -> Dict[str, Any]:
        """Health check for breach notification service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count incidents by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_breach_incidents
                    GROUP BY status
                    """
                )
                status_counts = dict(await cursor.fetchall())
                
                # Check for overdue notifications
                deadline_72h = datetime.utcnow() - timedelta(hours=72)
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_breach_incidents
                    WHERE authority_notification_required = 1
                    AND authority_notification_status = 'required'
                    AND discovered_at < ?
                    """,
                    (deadline_72h.isoformat(),)
                )
                overdue_notifications = (await cursor.fetchone())[0]
                
                # Count detection rules
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_breach_detection_rules WHERE enabled = 1"
                )
                active_rules = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "incidents_by_status": status_counts,
                "overdue_authority_notifications": overdue_notifications,
                "active_detection_rules": active_rules,
                "supervisory_authorities_configured": len(self.supervisory_authorities),
                "notification_templates_loaded": len(self.notification_templates),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Breach notification service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize breach notification service instance
breach_notification_service = GDPRDataBreachNotificationService()