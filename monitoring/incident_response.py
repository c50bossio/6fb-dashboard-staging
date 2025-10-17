#!/usr/bin/env python3
"""
Incident Response System for 6FB AI Agent System

This module implements comprehensive incident response procedures including:
- Incident detection and classification
- Automated escalation procedures
- Runbook execution
- Communication management
- Post-incident analysis
- Incident timeline tracking
"""

import asyncio
import logging
import time
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiohttp

logger = logging.getLogger(__name__)


class IncidentSeverity(Enum):
    """Incident severity levels"""
    P1_CRITICAL = "P1"      # Service completely down, customer-facing
    P2_HIGH = "P2"          # Major feature down, significant customer impact
    P3_MEDIUM = "P3"        # Minor feature down, limited customer impact
    P4_LOW = "P4"           # Degraded performance, minimal customer impact
    P5_INFO = "P5"          # Information only, no customer impact


class IncidentStatus(Enum):
    """Incident status types"""
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentType(Enum):
    """Types of incidents"""
    SERVICE_OUTAGE = "service_outage"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    SECURITY_BREACH = "security_breach"
    DATA_LOSS = "data_loss"
    INFRASTRUCTURE_FAILURE = "infrastructure_failure"
    API_FAILURE = "api_failure"
    DATABASE_ISSUE = "database_issue"
    NETWORK_ISSUE = "network_issue"
    THIRD_PARTY_FAILURE = "third_party_failure"
    HUMAN_ERROR = "human_error"


class EscalationLevel(Enum):
    """Escalation levels"""
    L1_ENGINEER = "L1"
    L2_SENIOR = "L2"
    L3_LEAD = "L3"
    L4_MANAGEMENT = "L4"


@dataclass
class IncidentContact:
    """Contact information for incident response"""
    name: str
    role: str
    email: str
    phone: Optional[str] = None
    slack_id: Optional[str] = None
    escalation_level: EscalationLevel = EscalationLevel.L1_ENGINEER


@dataclass
class Runbook:
    """Incident response runbook"""
    name: str
    description: str
    incident_types: List[IncidentType]
    severity_levels: List[IncidentSeverity]
    steps: List[str]
    estimated_duration_minutes: int
    required_permissions: List[str] = field(default_factory=list)
    automation_available: bool = False
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class IncidentTimelineEntry:
    """Timeline entry for incident tracking"""
    timestamp: datetime
    action: str
    details: str
    actor: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Incident:
    """Incident tracking object"""
    id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    incident_type: IncidentType
    created_at: datetime
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    
    # Assignment and escalation
    assigned_to: Optional[str] = None
    escalation_level: EscalationLevel = EscalationLevel.L1_ENGINEER
    
    # Impact tracking
    affected_services: List[str] = field(default_factory=list)
    affected_users_count: Optional[int] = None
    business_impact: Optional[str] = None
    
    # Response tracking
    timeline: List[IncidentTimelineEntry] = field(default_factory=list)
    runbook_executed: Optional[str] = None
    resolution_summary: Optional[str] = None
    
    # Metrics
    mttr_minutes: Optional[float] = None  # Mean Time To Resolution
    mtta_minutes: Optional[float] = None  # Mean Time To Acknowledgment
    
    # Metadata
    tags: Dict[str, str] = field(default_factory=dict)
    external_ticket_id: Optional[str] = None
    
    def add_timeline_entry(self, action: str, details: str, actor: str, **metadata):
        """Add entry to incident timeline"""
        entry = IncidentTimelineEntry(
            timestamp=datetime.utcnow(),
            action=action,
            details=details,
            actor=actor,
            metadata=metadata
        )
        self.timeline.append(entry)
    
    def calculate_metrics(self):
        """Calculate incident response metrics"""
        if self.acknowledged_at:
            self.mtta_minutes = (self.acknowledged_at - self.detected_at).total_seconds() / 60
        
        if self.resolved_at:
            self.mttr_minutes = (self.resolved_at - self.detected_at).total_seconds() / 60
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert incident to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'severity': self.severity.value,
            'status': self.status.value,
            'incident_type': self.incident_type.value,
            'created_at': self.created_at.isoformat(),
            'detected_at': self.detected_at.isoformat(),
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'closed_at': self.closed_at.isoformat() if self.closed_at else None,
            'assigned_to': self.assigned_to,
            'escalation_level': self.escalation_level.value,
            'affected_services': self.affected_services,
            'affected_users_count': self.affected_users_count,
            'business_impact': self.business_impact,
            'runbook_executed': self.runbook_executed,
            'resolution_summary': self.resolution_summary,
            'mttr_minutes': self.mttr_minutes,
            'mtta_minutes': self.mtta_minutes,
            'tags': self.tags,
            'timeline': [
                {
                    'timestamp': entry.timestamp.isoformat(),
                    'action': entry.action,
                    'details': entry.details,
                    'actor': entry.actor,
                    'metadata': entry.metadata
                }
                for entry in self.timeline
            ]
        }


class RunbookLibrary:
    """Library of incident response runbooks"""
    
    def __init__(self):
        self.runbooks: Dict[str, Runbook] = {}
        self._initialize_default_runbooks()
    
    def _initialize_default_runbooks(self):
        """Initialize default runbooks for common incidents"""
        
        # Service outage runbook
        self.add_runbook(Runbook(
            name="service_outage_response",
            description="Response procedures for complete service outages",
            incident_types=[IncidentType.SERVICE_OUTAGE],
            severity_levels=[IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH],
            steps=[
                "1. Verify the outage by checking multiple sources",
                "2. Check system status page and update if necessary",
                "3. Examine recent deployments and configuration changes",
                "4. Check infrastructure health (servers, load balancers, databases)",
                "5. Review application logs for errors",
                "6. If recent deployment, consider rollback",
                "7. Implement immediate fix or workaround",
                "8. Monitor service recovery",
                "9. Verify all functionality is restored",
                "10. Update stakeholders on resolution"
            ],
            estimated_duration_minutes=30,
            automation_available=True,
            tags={"category": "outage", "priority": "critical"}
        ))
        
        # Performance degradation runbook
        self.add_runbook(Runbook(
            name="performance_degradation_response",
            description="Response procedures for performance issues",
            incident_types=[IncidentType.PERFORMANCE_DEGRADATION],
            severity_levels=[IncidentSeverity.P2_HIGH, IncidentSeverity.P3_MEDIUM],
            steps=[
                "1. Identify affected components and services",
                "2. Check system resource utilization (CPU, memory, disk)",
                "3. Review application performance metrics",
                "4. Examine database query performance",
                "5. Check for traffic spikes or unusual patterns",
                "6. Review recent code deployments",
                "7. Implement performance optimizations",
                "8. Scale resources if necessary",
                "9. Monitor performance recovery",
                "10. Document findings and optimizations"
            ],
            estimated_duration_minutes=45,
            automation_available=False,
            tags={"category": "performance", "priority": "medium"}
        ))
        
        # Database issue runbook
        self.add_runbook(Runbook(
            name="database_issue_response",
            description="Response procedures for database problems",
            incident_types=[IncidentType.DATABASE_ISSUE],
            severity_levels=[IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH, IncidentSeverity.P3_MEDIUM],
            steps=[
                "1. Check database connectivity and status",
                "2. Review database error logs",
                "3. Check disk space and database size",
                "4. Examine long-running queries",
                "5. Review recent schema changes",
                "6. Check backup integrity",
                "7. Restart database service if necessary",
                "8. Optimize problematic queries",
                "9. Monitor database performance",
                "10. Update application connection handling if needed"
            ],
            estimated_duration_minutes=40,
            required_permissions=["database_admin"],
            automation_available=True,
            tags={"category": "database", "priority": "high"}
        ))
        
        # API failure runbook
        self.add_runbook(Runbook(
            name="api_failure_response",
            description="Response procedures for API failures",
            incident_types=[IncidentType.API_FAILURE],
            severity_levels=[IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH],
            steps=[
                "1. Test API endpoints manually",
                "2. Check API gateway and load balancer status",
                "3. Review API server logs and error rates",
                "4. Verify database connectivity from API servers",
                "5. Check third-party service dependencies",
                "6. Review recent API deployments",
                "7. Restart API services if necessary",
                "8. Implement circuit breakers if not already active",
                "9. Test API functionality end-to-end",
                "10. Update API documentation if needed"
            ],
            estimated_duration_minutes=25,
            automation_available=True,
            tags={"category": "api", "priority": "critical"}
        ))
        
        # Security incident runbook
        self.add_runbook(Runbook(
            name="security_incident_response",
            description="Response procedures for security incidents",
            incident_types=[IncidentType.SECURITY_BREACH],
            severity_levels=[IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH],
            steps=[
                "1. Isolate affected systems immediately",
                "2. Preserve evidence and logs",
                "3. Assess scope and impact of breach",
                "4. Change all potentially compromised passwords/keys",
                "5. Review access logs for unauthorized activity",
                "6. Notify security team and management",
                "7. Implement additional security measures",
                "8. Patch security vulnerabilities",
                "9. Monitor for continued threats",
                "10. Prepare incident report for compliance"
            ],
            estimated_duration_minutes=60,
            required_permissions=["security_admin"],
            automation_available=False,
            tags={"category": "security", "priority": "critical"}
        ))
    
    def add_runbook(self, runbook: Runbook):
        """Add a runbook to the library"""
        self.runbooks[runbook.name] = runbook
        logger.info(f"Added runbook: {runbook.name}")
    
    def get_runbook(self, name: str) -> Optional[Runbook]:
        """Get a specific runbook"""
        return self.runbooks.get(name)
    
    def find_applicable_runbooks(self, incident_type: IncidentType, 
                                severity: IncidentSeverity) -> List[Runbook]:
        """Find runbooks applicable to an incident"""
        applicable = []
        
        for runbook in self.runbooks.values():
            if (incident_type in runbook.incident_types and 
                severity in runbook.severity_levels):
                applicable.append(runbook)
        
        # Sort by estimated duration (faster responses first for critical incidents)
        if severity in [IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH]:
            applicable.sort(key=lambda r: r.estimated_duration_minutes)
        
        return applicable


class CommunicationManager:
    """Manages incident communications"""
    
    def __init__(self):
        self.notification_channels: Dict[str, Callable] = {}
        self.status_page_url = os.getenv('STATUS_PAGE_URL')
        self.slack_webhook_url = os.getenv('SLACK_WEBHOOK_URL')
        
        # Set up notification channels
        self._setup_notification_channels()
    
    def _setup_notification_channels(self):
        """Set up available notification channels"""
        self.notification_channels['email'] = self._send_email_notification
        self.notification_channels['slack'] = self._send_slack_notification
        self.notification_channels['webhook'] = self._send_webhook_notification
    
    async def send_incident_notification(self, incident: Incident, 
                                       notification_type: str, 
                                       recipients: List[str],
                                       message: str = None):
        """Send incident notification"""
        try:
            # Generate message if not provided
            if not message:
                message = self._generate_incident_message(incident, notification_type)
            
            # Send to all configured channels
            for channel_name, channel_func in self.notification_channels.items():
                try:
                    await channel_func(incident, message, recipients)
                except Exception as e:
                    logger.error(f"Failed to send {channel_name} notification: {e}")
            
            # Add to incident timeline
            incident.add_timeline_entry(
                action="notification_sent",
                details=f"Sent {notification_type} notification to {len(recipients)} recipients",
                actor="system"
            )
            
        except Exception as e:
            logger.error(f"Failed to send incident notification: {e}")
    
    def _generate_incident_message(self, incident: Incident, notification_type: str) -> str:
        """Generate incident notification message"""
        if notification_type == "creation":
            return f"""
🚨 INCIDENT CREATED - {incident.severity.value}

Title: {incident.title}
Severity: {incident.severity.value}
Status: {incident.status.value}
Incident ID: {incident.id}

Description: {incident.description}

Affected Services: {', '.join(incident.affected_services) if incident.affected_services else 'TBD'}
Detected: {incident.detected_at.strftime('%Y-%m-%d %H:%M:%S UTC')}

This is an automated notification from the 6FB AI Agent System incident response system.
"""
        elif notification_type == "update":
            return f"""
📋 INCIDENT UPDATE - {incident.severity.value}

Title: {incident.title}
Status: {incident.status.value}
Incident ID: {incident.id}

Latest Update: {incident.timeline[-1].details if incident.timeline else 'No updates'}
Assigned To: {incident.assigned_to or 'Unassigned'}

This is an automated notification from the 6FB AI Agent System incident response system.
"""
        elif notification_type == "resolution":
            return f"""
✅ INCIDENT RESOLVED - {incident.severity.value}

Title: {incident.title}
Incident ID: {incident.id}

Resolution: {incident.resolution_summary or 'Incident has been resolved'}
Duration: {incident.mttr_minutes:.1f} minutes
Resolved: {incident.resolved_at.strftime('%Y-%m-%d %H:%M:%S UTC')}

This is an automated notification from the 6FB AI Agent System incident response system.
"""
        else:
            return f"Incident {incident.id}: {incident.title}"
    
    async def _send_email_notification(self, incident: Incident, message: str, recipients: List[str]):
        """Send email notification"""
        try:
            if not self._email_configured():
                return
            
            smtp_server = os.getenv('SMTP_SERVER')
            smtp_port = int(os.getenv('SMTP_PORT', '587'))
            smtp_username = os.getenv('SMTP_USERNAME')
            smtp_password = os.getenv('SMTP_PASSWORD')
            from_email = os.getenv('FROM_EMAIL', 'incidents@6fb.ai')
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = from_email
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = f"[{incident.severity.value}] {incident.title}"
            
            msg.attach(MIMEText(message, 'plain'))
            
            # Send email
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email notification sent for incident {incident.id}")
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
    
    async def _send_slack_notification(self, incident: Incident, message: str, recipients: List[str]):
        """Send Slack notification"""
        try:
            if not self.slack_webhook_url:
                return
            
            payload = {
                'text': f"Incident {incident.severity.value}: {incident.title}",
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': message
                        }
                    },
                    {
                        'type': 'actions',
                        'elements': [
                            {
                                'type': 'button',
                                'text': {
                                    'type': 'plain_text',
                                    'text': 'View Incident'
                                },
                                'url': f"https://monitoring.6fb.ai/incidents/{incident.id}"
                            }
                        ]
                    }
                ]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.slack_webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Slack notification sent for incident {incident.id}")
                    else:
                        logger.warning(f"Slack notification failed with status {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
    
    async def _send_webhook_notification(self, incident: Incident, message: str, recipients: List[str]):
        """Send webhook notification"""
        try:
            webhook_url = os.getenv('INCIDENT_WEBHOOK_URL')
            if not webhook_url:
                return
            
            payload = {
                'incident': incident.to_dict(),
                'message': message,
                'recipients': recipients,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        logger.info(f"Webhook notification sent for incident {incident.id}")
                    else:
                        logger.warning(f"Webhook notification failed with status {response.status}")
                        
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
    
    def _email_configured(self) -> bool:
        """Check if email is configured"""
        return all([
            os.getenv('SMTP_SERVER'),
            os.getenv('SMTP_USERNAME'),
            os.getenv('SMTP_PASSWORD')
        ])


class IncidentManager:
    """Main incident response manager"""
    
    def __init__(self):
        self.incidents: Dict[str, Incident] = {}
        self.runbook_library = RunbookLibrary()
        self.communication_manager = CommunicationManager()
        self.contacts: Dict[str, IncidentContact] = {}
        self.escalation_rules: Dict[IncidentSeverity, Dict[str, Any]] = {}
        
        # Initialize default contacts and escalation rules
        self._initialize_contacts()
        self._initialize_escalation_rules()
    
    def _initialize_contacts(self):
        """Initialize incident response contacts"""
        # These would typically come from configuration
        self.contacts['on_call_engineer'] = IncidentContact(
            name="On-Call Engineer",
            role="Primary Response",
            email="oncall@6fb.ai",
            phone="+1-555-0100",
            escalation_level=EscalationLevel.L1_ENGINEER
        )
        
        self.contacts['senior_engineer'] = IncidentContact(
            name="Senior Engineer",
            role="Escalation Level 2",
            email="senior@6fb.ai",
            escalation_level=EscalationLevel.L2_SENIOR
        )
        
        self.contacts['engineering_lead'] = IncidentContact(
            name="Engineering Lead",
            role="Escalation Level 3",
            email="lead@6fb.ai",
            escalation_level=EscalationLevel.L3_LEAD
        )
        
        self.contacts['engineering_manager'] = IncidentContact(
            name="Engineering Manager",
            role="Management Escalation",
            email="manager@6fb.ai",
            escalation_level=EscalationLevel.L4_MANAGEMENT
        )
    
    def _initialize_escalation_rules(self):
        """Initialize escalation rules by severity"""
        self.escalation_rules = {
            IncidentSeverity.P1_CRITICAL: {
                'immediate_contacts': ['on_call_engineer', 'senior_engineer'],
                'escalation_timeout_minutes': 15,
                'auto_escalate_levels': [EscalationLevel.L2_SENIOR, EscalationLevel.L3_LEAD],
                'management_notification': True
            },
            IncidentSeverity.P2_HIGH: {
                'immediate_contacts': ['on_call_engineer'],
                'escalation_timeout_minutes': 30,
                'auto_escalate_levels': [EscalationLevel.L2_SENIOR],
                'management_notification': False
            },
            IncidentSeverity.P3_MEDIUM: {
                'immediate_contacts': ['on_call_engineer'],
                'escalation_timeout_minutes': 60,
                'auto_escalate_levels': [],
                'management_notification': False
            },
            IncidentSeverity.P4_LOW: {
                'immediate_contacts': [],
                'escalation_timeout_minutes': 120,
                'auto_escalate_levels': [],
                'management_notification': False
            },
            IncidentSeverity.P5_INFO: {
                'immediate_contacts': [],
                'escalation_timeout_minutes': 0,
                'auto_escalate_levels': [],
                'management_notification': False
            }
        }
    
    async def create_incident(self, title: str, description: str, 
                            severity: IncidentSeverity, incident_type: IncidentType,
                            affected_services: List[str] = None,
                            detected_by: str = "system") -> Incident:
        """Create a new incident"""
        incident_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        incident = Incident(
            id=incident_id,
            title=title,
            description=description,
            severity=severity,
            status=IncidentStatus.DETECTED,
            incident_type=incident_type,
            created_at=now,
            detected_at=now,
            affected_services=affected_services or []
        )
        
        # Add initial timeline entry
        incident.add_timeline_entry(
            action="incident_created",
            details=f"Incident created by {detected_by}",
            actor=detected_by
        )
        
        # Store incident
        self.incidents[incident_id] = incident
        
        # Trigger immediate response
        await self._trigger_immediate_response(incident)
        
        logger.info(f"Created incident {incident_id}: {title}")
        return incident
    
    async def _trigger_immediate_response(self, incident: Incident):
        """Trigger immediate incident response"""
        try:
            # Send notifications based on severity
            escalation_rule = self.escalation_rules.get(incident.severity, {})
            immediate_contacts = escalation_rule.get('immediate_contacts', [])
            
            if immediate_contacts:
                recipients = [self.contacts[contact].email for contact in immediate_contacts 
                            if contact in self.contacts]
                
                await self.communication_manager.send_incident_notification(
                    incident, "creation", recipients
                )
            
            # Find and suggest applicable runbooks
            applicable_runbooks = self.runbook_library.find_applicable_runbooks(
                incident.incident_type, incident.severity
            )
            
            if applicable_runbooks:
                # Auto-execute runbook for critical incidents if automation is available
                if (incident.severity == IncidentSeverity.P1_CRITICAL and 
                    applicable_runbooks[0].automation_available):
                    await self.execute_runbook(incident.id, applicable_runbooks[0].name, "system")
                else:
                    # Add runbook suggestion to timeline
                    runbook_names = [rb.name for rb in applicable_runbooks]
                    incident.add_timeline_entry(
                        action="runbooks_suggested",
                        details=f"Suggested runbooks: {', '.join(runbook_names)}",
                        actor="system"
                    )
            
            # Schedule auto-escalation if configured
            escalation_timeout = escalation_rule.get('escalation_timeout_minutes', 0)
            if escalation_timeout > 0:
                asyncio.create_task(self._schedule_escalation(incident.id, escalation_timeout))
            
        except Exception as e:
            logger.error(f"Failed to trigger immediate response for incident {incident.id}: {e}")
    
    async def acknowledge_incident(self, incident_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an incident"""
        if incident_id not in self.incidents:
            return False
        
        incident = self.incidents[incident_id]
        
        if incident.status == IncidentStatus.DETECTED:
            incident.status = IncidentStatus.INVESTIGATING
            incident.acknowledged_at = datetime.utcnow()
            incident.assigned_to = acknowledged_by
            incident.calculate_metrics()
            
            incident.add_timeline_entry(
                action="incident_acknowledged",
                details=f"Incident acknowledged and assigned to {acknowledged_by}",
                actor=acknowledged_by
            )
            
            logger.info(f"Incident {incident_id} acknowledged by {acknowledged_by}")
            return True
        
        return False
    
    async def update_incident(self, incident_id: str, status: IncidentStatus = None,
                            update_message: str = None, updated_by: str = "system") -> bool:
        """Update incident status"""
        if incident_id not in self.incidents:
            return False
        
        incident = self.incidents[incident_id]
        
        if status:
            old_status = incident.status
            incident.status = status
            
            if status == IncidentStatus.RESOLVED:
                incident.resolved_at = datetime.utcnow()
                incident.calculate_metrics()
            
            incident.add_timeline_entry(
                action="status_updated",
                details=f"Status changed from {old_status.value} to {status.value}",
                actor=updated_by
            )
        
        if update_message:
            incident.add_timeline_entry(
                action="update_provided",
                details=update_message,
                actor=updated_by
            )
        
        # Send update notification for critical incidents
        if incident.severity in [IncidentSeverity.P1_CRITICAL, IncidentSeverity.P2_HIGH]:
            escalation_rule = self.escalation_rules.get(incident.severity, {})
            contacts = escalation_rule.get('immediate_contacts', [])
            
            if contacts:
                recipients = [self.contacts[contact].email for contact in contacts 
                            if contact in self.contacts]
                
                await self.communication_manager.send_incident_notification(
                    incident, "update", recipients
                )
        
        logger.info(f"Incident {incident_id} updated by {updated_by}")
        return True
    
    async def resolve_incident(self, incident_id: str, resolution_summary: str,
                             resolved_by: str) -> bool:
        """Resolve an incident"""
        if incident_id not in self.incidents:
            return False
        
        incident = self.incidents[incident_id]
        incident.status = IncidentStatus.RESOLVED
        incident.resolved_at = datetime.utcnow()
        incident.resolution_summary = resolution_summary
        incident.calculate_metrics()
        
        incident.add_timeline_entry(
            action="incident_resolved",
            details=f"Incident resolved: {resolution_summary}",
            actor=resolved_by
        )
        
        # Send resolution notification
        escalation_rule = self.escalation_rules.get(incident.severity, {})
        contacts = escalation_rule.get('immediate_contacts', [])
        
        if contacts:
            recipients = [self.contacts[contact].email for contact in contacts 
                        if contact in self.contacts]
            
            await self.communication_manager.send_incident_notification(
                incident, "resolution", recipients
            )
        
        logger.info(f"Incident {incident_id} resolved by {resolved_by}")
        return True
    
    async def execute_runbook(self, incident_id: str, runbook_name: str, 
                            executed_by: str) -> bool:
        """Execute a runbook for an incident"""
        if incident_id not in self.incidents:
            return False
        
        runbook = self.runbook_library.get_runbook(runbook_name)
        if not runbook:
            return False
        
        incident = self.incidents[incident_id]
        incident.runbook_executed = runbook_name
        
        incident.add_timeline_entry(
            action="runbook_started",
            details=f"Started executing runbook: {runbook_name}",
            actor=executed_by
        )
        
        # Add each runbook step to timeline
        for i, step in enumerate(runbook.steps, 1):
            incident.add_timeline_entry(
                action="runbook_step",
                details=f"Step {i}: {step}",
                actor=executed_by,
                step_number=i,
                total_steps=len(runbook.steps)
            )
        
        incident.add_timeline_entry(
            action="runbook_completed",
            details=f"Completed runbook: {runbook_name}",
            actor=executed_by
        )
        
        logger.info(f"Executed runbook {runbook_name} for incident {incident_id}")
        return True
    
    async def _schedule_escalation(self, incident_id: str, timeout_minutes: int):
        """Schedule automatic escalation"""
        await asyncio.sleep(timeout_minutes * 60)
        
        if incident_id in self.incidents:
            incident = self.incidents[incident_id]
            
            # Only escalate if still unresolved
            if incident.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]:
                await self._escalate_incident(incident)
    
    async def _escalate_incident(self, incident: Incident):
        """Escalate an incident to the next level"""
        try:
            escalation_rule = self.escalation_rules.get(incident.severity, {})
            auto_escalate_levels = escalation_rule.get('auto_escalate_levels', [])
            
            if auto_escalate_levels:
                # Find next escalation level
                current_level_value = list(EscalationLevel).index(incident.escalation_level)
                
                for level in auto_escalate_levels:
                    level_value = list(EscalationLevel).index(level)
                    if level_value > current_level_value:
                        incident.escalation_level = level
                        break
                
                # Find contacts at this escalation level
                escalated_contacts = [
                    contact for contact in self.contacts.values()
                    if contact.escalation_level == incident.escalation_level
                ]
                
                if escalated_contacts:
                    recipients = [contact.email for contact in escalated_contacts]
                    
                    await self.communication_manager.send_incident_notification(
                        incident, "escalation", recipients
                    )
                
                incident.add_timeline_entry(
                    action="incident_escalated",
                    details=f"Incident escalated to {incident.escalation_level.value}",
                    actor="system"
                )
                
                logger.info(f"Escalated incident {incident.id} to {incident.escalation_level.value}")
        
        except Exception as e:
            logger.error(f"Failed to escalate incident {incident.id}: {e}")
    
    def get_incident(self, incident_id: str) -> Optional[Incident]:
        """Get incident by ID"""
        return self.incidents.get(incident_id)
    
    def get_open_incidents(self) -> List[Incident]:
        """Get all open incidents"""
        return [
            incident for incident in self.incidents.values()
            if incident.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]
        ]
    
    def get_incidents_by_severity(self, severity: IncidentSeverity) -> List[Incident]:
        """Get incidents by severity"""
        return [
            incident for incident in self.incidents.values()
            if incident.severity == severity
        ]
    
    def get_incident_metrics(self, days: int = 30) -> Dict[str, Any]:
        """Get incident metrics for the specified period"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        recent_incidents = [
            incident for incident in self.incidents.values()
            if incident.created_at >= cutoff_date
        ]
        
        if not recent_incidents:
            return {
                'total_incidents': 0,
                'by_severity': {},
                'by_status': {},
                'mttr_average_minutes': 0,
                'mtta_average_minutes': 0
            }
        
        # Group by severity
        by_severity = {}
        for severity in IncidentSeverity:
            by_severity[severity.value] = len([
                i for i in recent_incidents if i.severity == severity
            ])
        
        # Group by status
        by_status = {}
        for status in IncidentStatus:
            by_status[status.value] = len([
                i for i in recent_incidents if i.status == status
            ])
        
        # Calculate average metrics
        resolved_incidents = [i for i in recent_incidents if i.mttr_minutes is not None]
        acknowledged_incidents = [i for i in recent_incidents if i.mtta_minutes is not None]
        
        mttr_avg = (sum(i.mttr_minutes for i in resolved_incidents) / len(resolved_incidents)
                   if resolved_incidents else 0)
        mtta_avg = (sum(i.mtta_minutes for i in acknowledged_incidents) / len(acknowledged_incidents)
                   if acknowledged_incidents else 0)
        
        return {
            'total_incidents': len(recent_incidents),
            'by_severity': by_severity,
            'by_status': by_status,
            'mttr_average_minutes': mttr_avg,
            'mtta_average_minutes': mtta_avg,
            'resolved_incidents': len(resolved_incidents),
            'open_incidents': len([i for i in recent_incidents 
                                 if i.status not in [IncidentStatus.RESOLVED, IncidentStatus.CLOSED]])
        }


# Export main components
__all__ = [
    'IncidentManager',
    'RunbookLibrary',
    'CommunicationManager',
    'Incident',
    'Runbook',
    'IncidentContact',
    'IncidentSeverity',
    'IncidentStatus',
    'IncidentType',
    'EscalationLevel'
]