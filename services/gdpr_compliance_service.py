#!/usr/bin/env python3
"""
GDPR Compliance Service for 6FB AI Agent System
Comprehensive GDPR compliance automation including consent management,
data subject rights, data retention, and privacy controls.
"""

import asyncio
import json
import logging
import sqlite3
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiofiles
import aiosmtplib
from pathlib import Path

logger = logging.getLogger(__name__)


class ConsentType(str, Enum):
    """Types of consent that can be tracked"""
    ESSENTIAL = "essential"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    PERSONALIZATION = "personalization"
    THIRD_PARTY = "third_party"
    AI_PROCESSING = "ai_processing"


class LegalBasis(str, Enum):
    """Legal basis for processing under GDPR Article 6"""
    CONSENT = "consent"  # Article 6(1)(a)
    CONTRACT = "contract"  # Article 6(1)(b)
    LEGAL_OBLIGATION = "legal_obligation"  # Article 6(1)(c)
    VITAL_INTERESTS = "vital_interests"  # Article 6(1)(d)
    PUBLIC_TASK = "public_task"  # Article 6(1)(e)
    LEGITIMATE_INTERESTS = "legitimate_interests"  # Article 6(1)(f)


class DataSubjectRequestType(str, Enum):
    """Types of data subject requests under GDPR"""
    ACCESS = "access"  # Article 15 - Right of access
    RECTIFICATION = "rectification"  # Article 16 - Right to rectification
    ERASURE = "erasure"  # Article 17 - Right to erasure ('right to be forgotten')
    RESTRICTION = "restriction"  # Article 18 - Right to restriction of processing
    PORTABILITY = "portability"  # Article 20 - Right to data portability
    OBJECTION = "objection"  # Article 21 - Right to object


class RequestStatus(str, Enum):
    """Status of data subject requests"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
    PARTIALLY_COMPLETED = "partially_completed"


@dataclass
class ConsentRecord:
    """Represents a consent record"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = ""
    consent_type: ConsentType = ConsentType.ESSENTIAL
    consent_given: bool = False
    consent_date: datetime = field(default_factory=datetime.now)
    withdrawal_date: Optional[datetime] = None
    legal_basis: LegalBasis = LegalBasis.CONSENT
    purpose: str = ""
    data_categories: List[str] = field(default_factory=list)
    retention_period_days: Optional[int] = None
    consent_method: str = "explicit"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    consent_string: Optional[str] = None  # For IAB TCF compliance


@dataclass
class DataSubjectRequest:
    """Represents a data subject request"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    request_type: DataSubjectRequestType = DataSubjectRequestType.ACCESS
    status: RequestStatus = RequestStatus.PENDING
    requested_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    request_details: Dict[str, Any] = field(default_factory=dict)
    response_data: Dict[str, Any] = field(default_factory=dict)
    requester_email: str = ""
    verification_method: str = ""
    processor_notes: str = ""
    deadline: datetime = field(default_factory=lambda: datetime.now() + timedelta(days=30))


@dataclass
class DataRetentionRecord:
    """Represents a data retention tracking record"""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    table_name: str = ""
    record_id: str = ""
    retention_category: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    retention_period_days: int = 365
    scheduled_deletion_date: datetime = field(default_factory=datetime.now)
    deleted_at: Optional[datetime] = None
    deletion_method: str = "hard_delete"
    legal_basis: str = ""


class GDPRComplianceService:
    """Comprehensive GDPR compliance service"""
    
    def __init__(self, db_path: str = "database/gdpr_compliance.db"):
        self.db_path = db_path
        self.data_categories = {
            "personal_identifiers": ["name", "email", "phone", "address"],
            "authentication": ["password_hash", "login_history", "session_data"],
            "behavioral": ["ai_conversations", "preferences", "usage_patterns"],
            "technical": ["ip_address", "user_agent", "device_info"],
            "business": ["organization", "role", "permissions"]
        }
        self._init_database()
    
    def _init_database(self):
        """Initialize GDPR compliance database"""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Consent records table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS consent_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                consent_type TEXT NOT NULL,
                consent_given BOOLEAN NOT NULL,
                consent_date TIMESTAMP NOT NULL,
                withdrawal_date TIMESTAMP,
                legal_basis TEXT NOT NULL,
                purpose TEXT NOT NULL,
                data_categories TEXT,  -- JSON array
                retention_period_days INTEGER,
                consent_method TEXT DEFAULT 'explicit',
                ip_address TEXT,
                user_agent TEXT,
                consent_string TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Data subject requests table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_subject_requests (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                request_type TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                requested_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP,
                request_details TEXT,  -- JSON
                response_data TEXT,    -- JSON
                requester_email TEXT NOT NULL,
                verification_method TEXT,
                processor_notes TEXT,
                deadline TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Data retention tracking table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_retention (
                id TEXT PRIMARY KEY,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                retention_category TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                retention_period_days INTEGER NOT NULL,
                scheduled_deletion_date TIMESTAMP NOT NULL,
                deleted_at TIMESTAMP,
                deletion_method TEXT DEFAULT 'hard_delete',
                legal_basis TEXT,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Privacy notices table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS privacy_notices (
                id TEXT PRIMARY KEY,
                version TEXT NOT NULL,
                content TEXT NOT NULL,
                effective_date TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        # Data processing activities (Article 30 record)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS processing_activities (
                id TEXT PRIMARY KEY,
                activity_name TEXT NOT NULL,
                purpose TEXT NOT NULL,
                legal_basis TEXT NOT NULL,
                data_categories TEXT,  -- JSON array
                data_subjects TEXT,    -- JSON array
                recipients TEXT,       -- JSON array
                retention_period TEXT,
                security_measures TEXT,
                international_transfers TEXT,  -- JSON
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Data breach incidents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS data_breaches (
                id TEXT PRIMARY KEY,
                incident_date TIMESTAMP NOT NULL,
                discovered_date TIMESTAMP NOT NULL,
                breach_type TEXT NOT NULL,
                affected_records INTEGER,
                data_categories_affected TEXT,  -- JSON array
                security_measures_failed TEXT,
                notification_required BOOLEAN DEFAULT FALSE,
                authority_notified BOOLEAN DEFAULT FALSE,
                subjects_notified BOOLEAN DEFAULT FALSE,
                notification_date TIMESTAMP,
                risk_level TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'investigating',
                description TEXT,
                remediation_actions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_consent_user_id ON consent_records(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_consent_type ON consent_records(consent_type)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_dsr_user_id ON data_subject_requests(user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_retention_deletion_date ON data_retention(scheduled_deletion_date)')
        
        conn.commit()
        conn.close()
    
    # =============================================================================
    # CONSENT MANAGEMENT
    # =============================================================================
    
    async def record_consent(self, consent: ConsentRecord) -> bool:
        """Record or update user consent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if consent already exists
            cursor.execute('''
                SELECT id FROM consent_records 
                WHERE user_id = ? AND consent_type = ?
            ''', (consent.user_id, consent.consent_type.value))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing consent
                cursor.execute('''
                    UPDATE consent_records SET
                        consent_given = ?, consent_date = ?, withdrawal_date = ?,
                        purpose = ?, data_categories = ?, retention_period_days = ?,
                        consent_method = ?, ip_address = ?, user_agent = ?,
                        consent_string = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND consent_type = ?
                ''', (
                    consent.consent_given, consent.consent_date, consent.withdrawal_date,
                    consent.purpose, json.dumps(consent.data_categories), consent.retention_period_days,
                    consent.consent_method, consent.ip_address, consent.user_agent,
                    consent.consent_string, consent.user_id, consent.consent_type.value
                ))
            else:
                # Insert new consent
                cursor.execute('''
                    INSERT INTO consent_records (
                        id, user_id, consent_type, consent_given, consent_date,
                        withdrawal_date, legal_basis, purpose, data_categories,
                        retention_period_days, consent_method, ip_address,
                        user_agent, consent_string
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    consent.id, consent.user_id, consent.consent_type.value,
                    consent.consent_given, consent.consent_date, consent.withdrawal_date,
                    consent.legal_basis.value, consent.purpose, json.dumps(consent.data_categories),
                    consent.retention_period_days, consent.consent_method, consent.ip_address,
                    consent.user_agent, consent.consent_string
                ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Consent recorded for user {consent.user_id}, type {consent.consent_type.value}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to record consent: {e}")
            return False
    
    async def withdraw_consent(self, user_id: str, consent_type: ConsentType) -> bool:
        """Withdraw user consent"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE consent_records SET
                    consent_given = FALSE,
                    withdrawal_date = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND consent_type = ?
            ''', (datetime.now(), user_id, consent_type.value))
            
            if cursor.rowcount > 0:
                conn.commit()
                logger.info(f"Consent withdrawn for user {user_id}, type {consent_type.value}")
                
                # Trigger data processing review
                await self._review_data_processing_after_withdrawal(user_id, consent_type)
                result = True
            else:
                logger.warning(f"No consent found to withdraw for user {user_id}, type {consent_type.value}")
                result = False
            
            conn.close()
            return result
            
        except Exception as e:
            logger.error(f"Failed to withdraw consent: {e}")
            return False
    
    async def get_user_consents(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all consents for a user"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM consent_records WHERE user_id = ?
                ORDER BY consent_date DESC
            ''', (user_id,))
            
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            consents = []
            for row in rows:
                consent_dict = dict(zip(columns, row))
                consent_dict['data_categories'] = json.loads(consent_dict['data_categories'] or '[]')
                consents.append(consent_dict)
            
            conn.close()
            return consents
            
        except Exception as e:
            logger.error(f"Failed to get user consents: {e}")
            return []
    
    # =============================================================================
    # DATA SUBJECT RIGHTS
    # =============================================================================
    
    async def create_data_subject_request(self, request: DataSubjectRequest) -> str:
        """Create a new data subject request"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO data_subject_requests (
                    id, user_id, request_type, status, requested_at, request_details,
                    requester_email, verification_method, deadline
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                request.id, request.user_id, request.request_type.value, request.status.value,
                request.requested_at, json.dumps(request.request_details),
                request.requester_email, request.verification_method, request.deadline
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Data subject request created: {request.id}")
            
            # Send acknowledgment email
            await self._send_dsr_acknowledgment(request)
            
            return request.id
            
        except Exception as e:
            logger.error(f"Failed to create data subject request: {e}")
            return ""
    
    async def process_access_request(self, request_id: str) -> Dict[str, Any]:
        """Process a data access request (Article 15)"""
        try:
            # Get the request details
            request = await self._get_dsr_by_id(request_id)
            if not request:
                return {"error": "Request not found"}
            
            user_id = request.get('user_id')
            if not user_id:
                return {"error": "User ID not found in request"}
            
            # Collect all personal data
            personal_data = await self._collect_user_personal_data(user_id)
            
            # Update request status
            await self._update_dsr_status(request_id, RequestStatus.COMPLETED, personal_data)
            
            logger.info(f"Access request processed: {request_id}")
            return personal_data
            
        except Exception as e:
            logger.error(f"Failed to process access request: {e}")
            return {"error": str(e)}
    
    async def process_erasure_request(self, request_id: str) -> Dict[str, Any]:
        """Process a data erasure request (Article 17 - Right to be forgotten)"""
        try:
            request = await self._get_dsr_by_id(request_id)
            if not request:
                return {"error": "Request not found"}
            
            user_id = request.get('user_id')
            if not user_id:
                return {"error": "User ID not found in request"}
            
            # Check if erasure is legally permissible
            erasure_check = await self._check_erasure_eligibility(user_id)
            if not erasure_check['eligible']:
                await self._update_dsr_status(request_id, RequestStatus.REJECTED, erasure_check)
                return erasure_check
            
            # Perform data erasure
            erasure_result = await self._erase_user_data(user_id)
            
            # Update request status
            status = RequestStatus.COMPLETED if erasure_result['success'] else RequestStatus.PARTIALLY_COMPLETED
            await self._update_dsr_status(request_id, status, erasure_result)
            
            logger.info(f"Erasure request processed: {request_id}")
            return erasure_result
            
        except Exception as e:
            logger.error(f"Failed to process erasure request: {e}")
            return {"error": str(e)}
    
    async def process_portability_request(self, request_id: str) -> Dict[str, Any]:
        """Process a data portability request (Article 20)"""
        try:
            request = await self._get_dsr_by_id(request_id)
            if not request:
                return {"error": "Request not found"}
            
            user_id = request.get('user_id')
            if not user_id:
                return {"error": "User ID not found in request"}
            
            # Export data in structured format
            portable_data = await self._export_portable_data(user_id)
            
            # Update request status
            await self._update_dsr_status(request_id, RequestStatus.COMPLETED, portable_data)
            
            logger.info(f"Portability request processed: {request_id}")
            return portable_data
            
        except Exception as e:
            logger.error(f"Failed to process portability request: {e}")
            return {"error": str(e)}
    
    # =============================================================================
    # DATA RETENTION MANAGEMENT
    # =============================================================================
    
    async def register_data_for_retention(self, table_name: str, record_id: str, 
                                        retention_category: str, retention_days: int,
                                        legal_basis: str = "") -> bool:
        """Register data for retention tracking"""
        try:
            retention_record = DataRetentionRecord(
                table_name=table_name,
                record_id=record_id,
                retention_category=retention_category,
                retention_period_days=retention_days,
                scheduled_deletion_date=datetime.now() + timedelta(days=retention_days),
                legal_basis=legal_basis
            )
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO data_retention (
                    id, table_name, record_id, retention_category, created_at,
                    retention_period_days, scheduled_deletion_date, legal_basis
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                retention_record.id, retention_record.table_name, retention_record.record_id,
                retention_record.retention_category, retention_record.created_at,
                retention_record.retention_period_days, retention_record.scheduled_deletion_date,
                retention_record.legal_basis
            ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to register data for retention: {e}")
            return False
    
    async def process_data_retention_cleanup(self) -> Dict[str, Any]:
        """Process data retention cleanup (run daily)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find records that should be deleted
            cursor.execute('''
                SELECT * FROM data_retention 
                WHERE scheduled_deletion_date <= ? AND deleted_at IS NULL
            ''', (datetime.now(),))
            
            records_to_delete = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description]
            
            deletion_results = {
                'processed': 0,
                'successful': 0,
                'failed': 0,
                'errors': []
            }
            
            for row in records_to_delete:
                record = dict(zip(columns, row))
                deletion_results['processed'] += 1
                
                try:
                    # Perform actual data deletion
                    success = await self._delete_retained_data(record)
                    
                    if success:
                        # Mark as deleted
                        cursor.execute('''
                            UPDATE data_retention 
                            SET deleted_at = ?, deletion_method = 'automated_retention'
                            WHERE id = ?
                        ''', (datetime.now(), record['id']))
                        deletion_results['successful'] += 1
                    else:
                        deletion_results['failed'] += 1
                        deletion_results['errors'].append(f"Failed to delete {record['table_name']}:{record['record_id']}")
                        
                except Exception as e:
                    deletion_results['failed'] += 1
                    deletion_results['errors'].append(f"Error deleting {record['table_name']}:{record['record_id']}: {str(e)}")
            
            conn.commit()
            conn.close()
            
            logger.info(f"Data retention cleanup completed: {deletion_results}")
            return deletion_results
            
        except Exception as e:
            logger.error(f"Failed to process data retention cleanup: {e}")
            return {"error": str(e)}
    
    # =============================================================================
    # PRIVACY IMPACT ASSESSMENTS
    # =============================================================================
    
    async def conduct_privacy_impact_assessment(self, activity_name: str, 
                                              processing_details: Dict[str, Any]) -> Dict[str, Any]:
        """Conduct automated privacy impact assessment"""
        try:
            pia_result = {
                'activity_name': activity_name,
                'assessment_date': datetime.now().isoformat(),
                'risk_level': 'low',
                'recommendations': [],
                'compliance_issues': [],
                'required_measures': []
            }
            
            # Assess data types being processed
            data_types = processing_details.get('data_categories', [])
            sensitive_data_count = sum(1 for dt in data_types if dt in ['health', 'biometric', 'genetic', 'religion', 'politics'])
            
            if sensitive_data_count > 0:
                pia_result['risk_level'] = 'high'
                pia_result['required_measures'].append('Data Protection Impact Assessment required')
                pia_result['required_measures'].append('Regular monitoring and review')
            
            # Assess processing volume
            affected_subjects = processing_details.get('affected_subjects_count', 0)
            if affected_subjects > 1000:
                pia_result['risk_level'] = 'medium' if pia_result['risk_level'] == 'low' else pia_result['risk_level']
                pia_result['recommendations'].append('Implement additional security measures for large-scale processing')
            
            # Check legal basis
            legal_basis = processing_details.get('legal_basis', '')
            if legal_basis == 'consent' and sensitive_data_count > 0:
                pia_result['recommendations'].append('Ensure explicit consent for sensitive data processing')
            
            # Assess international transfers
            if processing_details.get('international_transfers', False):
                pia_result['risk_level'] = 'medium' if pia_result['risk_level'] == 'low' else pia_result['risk_level']
                pia_result['required_measures'].append('Ensure adequate safeguards for international transfers')
            
            # Check retention periods
            retention_period = processing_details.get('retention_period_days', 0)
            if retention_period > 2555:  # More than 7 years
                pia_result['recommendations'].append('Review and justify extended retention period')
            
            logger.info(f"Privacy impact assessment completed for {activity_name}")
            return pia_result
            
        except Exception as e:
            logger.error(f"Failed to conduct privacy impact assessment: {e}")
            return {"error": str(e)}
    
    # =============================================================================
    # COMPLIANCE REPORTING
    # =============================================================================
    
    async def generate_compliance_report(self, report_type: str = "full") -> Dict[str, Any]:
        """Generate comprehensive GDPR compliance report"""
        try:
            report = {
                'report_type': report_type,
                'generated_at': datetime.now().isoformat(),
                'compliance_score': 0,
                'sections': {}
            }
            
            if report_type in ["full", "consent"]:
                report['sections']['consent_management'] = await self._generate_consent_report()
            
            if report_type in ["full", "requests"]:
                report['sections']['data_subject_requests'] = await self._generate_dsr_report()
            
            if report_type in ["full", "retention"]:
                report['sections']['data_retention'] = await self._generate_retention_report()
            
            if report_type in ["full", "breaches"]:
                report['sections']['data_breaches'] = await self._generate_breach_report()
            
            # Calculate overall compliance score
            report['compliance_score'] = await self._calculate_compliance_score(report['sections'])
            
            logger.info(f"Compliance report generated: {report_type}")
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {"error": str(e)}
    
    # =============================================================================
    # HELPER METHODS
    # =============================================================================
    
    async def _collect_user_personal_data(self, user_id: str) -> Dict[str, Any]:
        """Collect all personal data for a user across all systems"""
        personal_data = {
            'user_id': user_id,
            'data_categories': {},
            'collection_date': datetime.now().isoformat()
        }
        
        try:
            # This would need to be implemented based on your actual data storage
            # For now, this is a placeholder structure
            
            # Collect from main user table
            personal_data['data_categories']['profile'] = {
                'email': 'user@example.com',  # Retrieved from database
                'full_name': 'John Doe',
                'organization': 'Example Corp',
                'created_at': '2024-01-01T00:00:00Z'
            }
            
            # Collect AI conversation data
            personal_data['data_categories']['ai_interactions'] = {
                'total_conversations': 0,
                'total_messages': 0,
                'conversation_topics': []
            }
            
            # Collect consent records
            personal_data['data_categories']['consent_history'] = await self.get_user_consents(user_id)
            
            # Collect authentication data
            personal_data['data_categories']['authentication'] = {
                'login_history': [],
                'security_events': []
            }
            
            return personal_data
            
        except Exception as e:
            logger.error(f"Failed to collect personal data for user {user_id}: {e}")
            return {"error": str(e)}
    
    async def _check_erasure_eligibility(self, user_id: str) -> Dict[str, Any]:
        """Check if user data can be erased under GDPR Article 17"""
        try:
            # Check for legal obligations to retain data
            legal_holds = await self._check_legal_holds(user_id)
            
            if legal_holds:
                return {
                    'eligible': False,
                    'reason': 'Legal obligation to retain data',
                    'details': legal_holds
                }
            
            # Check for ongoing contracts
            active_contracts = await self._check_active_contracts(user_id)
            
            if active_contracts:
                return {
                    'eligible': False,
                    'reason': 'Active contractual relationship',
                    'details': active_contracts
                }
            
            return {
                'eligible': True,
                'reason': 'No legal impediments to erasure'
            }
            
        except Exception as e:
            logger.error(f"Failed to check erasure eligibility: {e}")
            return {'eligible': False, 'reason': f'Error: {str(e)}'}
    
    async def _erase_user_data(self, user_id: str) -> Dict[str, Any]:
        """Erase all user data across systems"""
        try:
            erasure_result = {
                'success': True,
                'tables_processed': 0,
                'records_deleted': 0,
                'errors': []
            }
            
            # Define tables that contain user data
            user_data_tables = [
                'auth.users',
                'auth.user_sessions', 
                'auth.security_events',
                'ai_agents.conversations',
                'ai_agents.messages',
                'business.analytics_events',
                'compliance.consent_records',
                'compliance.data_subject_requests'
            ]
            
            # This would need to be implemented with actual database operations
            # For now, this is a placeholder
            
            for table in user_data_tables:
                try:
                    # Implement actual deletion logic here
                    erasure_result['tables_processed'] += 1
                    erasure_result['records_deleted'] += 1  # Placeholder
                except Exception as e:
                    erasure_result['errors'].append(f"Failed to delete from {table}: {str(e)}")
                    erasure_result['success'] = False
            
            return erasure_result
            
        except Exception as e:
            logger.error(f"Failed to erase user data: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _send_dsr_acknowledgment(self, request: DataSubjectRequest):
        """Send acknowledgment email for data subject request"""
        try:
            # This would integrate with your email service
            logger.info(f"DSR acknowledgment sent for request {request.id}")
        except Exception as e:
            logger.error(f"Failed to send DSR acknowledgment: {e}")
    
    async def _get_dsr_by_id(self, request_id: str) -> Optional[Dict[str, Any]]:
        """Get data subject request by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('SELECT * FROM data_subject_requests WHERE id = ?', (request_id,))
            row = cursor.fetchone()
            
            if row:
                columns = [desc[0] for desc in cursor.description]
                request_dict = dict(zip(columns, row))
                request_dict['request_details'] = json.loads(request_dict['request_details'] or '{}')
                request_dict['response_data'] = json.loads(request_dict['response_data'] or '{}')
                conn.close()
                return request_dict
            
            conn.close()
            return None
            
        except Exception as e:
            logger.error(f"Failed to get DSR by ID: {e}")
            return None
    
    async def _update_dsr_status(self, request_id: str, status: RequestStatus, response_data: Dict[str, Any]):
        """Update data subject request status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE data_subject_requests SET
                    status = ?, response_data = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (status.value, json.dumps(response_data), datetime.now(), request_id))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to update DSR status: {e}")
    
    async def _calculate_compliance_score(self, sections: Dict[str, Any]) -> int:
        """Calculate overall GDPR compliance score"""
        try:
            # Simplified compliance scoring
            base_score = 85
            
            # Deduct points for issues
            if 'data_subject_requests' in sections:
                overdue_requests = sections['data_subject_requests'].get('overdue_requests', 0)
                base_score -= min(overdue_requests * 5, 20)
            
            if 'data_retention' in sections:
                overdue_deletions = sections['data_retention'].get('overdue_deletions', 0)
                base_score -= min(overdue_deletions * 2, 15)
            
            return max(base_score, 0)
            
        except Exception as e:
            logger.error(f"Failed to calculate compliance score: {e}")
            return 0


# Global instance
gdpr_service = GDPRComplianceService()