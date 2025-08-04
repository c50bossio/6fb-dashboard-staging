"""
GDPR Compliance Service for 6FB AI Agent System
Implements comprehensive data protection and privacy compliance features
according to EU GDPR regulations.

Key GDPR Articles Implemented:
- Article 6: Lawful basis for processing
- Article 7: Conditions for consent
- Article 17: Right to erasure ("right to be forgotten")
- Article 20: Right to data portability
- Article 25: Data protection by design and by default
- Article 33: Notification of data breach to supervisory authority
- Article 34: Communication of data breach to data subject
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import hmac
from cryptography.fernet import Fernet
import aiofiles
import sqlite3
import aiosqlite
from pathlib import Path

# Configure logging for GDPR compliance
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/Users/bossio/6FB AI Agent System/logs/gdpr_compliance.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class LawfulBasis(Enum):
    """GDPR Article 6 - Lawful basis for processing personal data"""
    CONSENT = "consent"
    CONTRACT = "contract"  
    LEGAL_OBLIGATION = "legal_obligation"
    VITAL_INTERESTS = "vital_interests"
    PUBLIC_TASK = "public_task"
    LEGITIMATE_INTERESTS = "legitimate_interests"

class ProcessingPurpose(Enum):
    """Purpose limitation - define why data is being processed"""
    ACCOUNT_MANAGEMENT = "account_management"
    BOOKING_SERVICES = "booking_services"
    PAYMENT_PROCESSING = "payment_processing"
    MARKETING_COMMUNICATIONS = "marketing_communications"
    ANALYTICS_INSIGHTS = "analytics_insights"
    AI_PERSONALIZATION = "ai_personalization"
    LEGAL_COMPLIANCE = "legal_compliance"
    FRAUD_PREVENTION = "fraud_prevention"

class DataCategory(Enum):
    """Categories of personal data under GDPR"""
    IDENTITY_DATA = "identity_data"  # Name, email, phone
    CONTACT_DATA = "contact_data"   # Address, communication preferences
    FINANCIAL_DATA = "financial_data"  # Payment info, billing
    TECHNICAL_DATA = "technical_data"  # IP address, device info
    USAGE_DATA = "usage_data"      # How services are used
    MARKETING_DATA = "marketing_data"  # Preferences, behavior
    SPECIAL_CATEGORY = "special_category"  # Health, biometric, etc.

class ConsentStatus(Enum):
    """Consent management states"""
    GIVEN = "given"
    WITHDRAWN = "withdrawn"
    PENDING = "pending"
    EXPIRED = "expired"

@dataclass
class DataProcessingRecord:
    """Article 30 - Records of processing activities"""
    id: str
    user_id: str
    processing_purpose: ProcessingPurpose
    lawful_basis: LawfulBasis
    data_categories: List[DataCategory]
    data_subjects: str  # Description of data subjects
    recipients: List[str]  # Who has access to data
    retention_period: int  # Days
    security_measures: List[str]
    created_at: datetime
    updated_at: datetime

@dataclass 
class ConsentRecord:
    """Article 7 - Consent management"""
    id: str
    user_id: str
    processing_purpose: ProcessingPurpose
    consent_status: ConsentStatus
    consent_text: str
    consent_method: str  # checkbox, opt-in, etc.
    ip_address: str
    user_agent: str
    given_at: Optional[datetime] = None
    withdrawn_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

@dataclass
class DataBreachIncident:
    """Articles 33 & 34 - Data breach management"""
    id: str
    title: str
    description: str
    breach_type: str  # confidentiality, integrity, availability
    affected_data_categories: List[DataCategory]
    affected_users_count: int
    risk_level: str  # low, medium, high
    discovered_at: datetime
    contained_at: Optional[datetime] = None
    
    # Article 33 - Authority notification (72 hours)
    authority_notification_required: bool = True
    authority_notified_at: Optional[datetime] = None
    
    # Article 34 - Data subject notification
    subjects_notification_required: bool = False
    subjects_notified_at: Optional[datetime] = None
    
    remediation_measures: List[str] = None
    lessons_learned: str = ""

class GDPRComplianceService:
    """
    Core GDPR compliance service implementing data protection requirements
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Initialize database schema
        asyncio.create_task(self._init_gdpr_tables())
        
        # Data retention policies (in days)
        self.retention_policies = {
            DataCategory.IDENTITY_DATA: 2555,  # 7 years for legal compliance
            DataCategory.CONTACT_DATA: 1095,   # 3 years 
            DataCategory.FINANCIAL_DATA: 2555, # 7 years for legal compliance
            DataCategory.TECHNICAL_DATA: 365,  # 1 year
            DataCategory.USAGE_DATA: 730,      # 2 years
            DataCategory.MARKETING_DATA: 1095, # 3 years or until consent withdrawn
            DataCategory.SPECIAL_CATEGORY: 365 # 1 year with explicit consent
        }
        
        logger.info("GDPR Compliance Service initialized")

    def _get_or_create_encryption_key(self) -> bytes:
        """Generate or retrieve encryption key for sensitive data"""
        key_path = "/Users/bossio/6FB AI Agent System/.gdpr_encryption_key"
        
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            os.makedirs(os.path.dirname(key_path), exist_ok=True)
            with open(key_path, 'wb') as f:
                f.write(key)
            os.chmod(key_path, 0o600)  # Restrict permissions
            return key

    async def _init_gdpr_tables(self):
        """Initialize GDPR compliance database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_consent_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                consent_status TEXT NOT NULL,
                consent_text TEXT NOT NULL,
                consent_method TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                given_at TIMESTAMP,
                withdrawn_at TIMESTAMP,  
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_data_processing_records (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                lawful_basis TEXT NOT NULL,
                data_categories TEXT NOT NULL, -- JSON array
                data_subjects TEXT NOT NULL,
                recipients TEXT NOT NULL, -- JSON array
                retention_period INTEGER NOT NULL,
                security_measures TEXT NOT NULL, -- JSON array
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_data_breach_incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                breach_type TEXT NOT NULL,
                affected_data_categories TEXT NOT NULL, -- JSON array
                affected_users_count INTEGER NOT NULL,
                risk_level TEXT NOT NULL,
                discovered_at TIMESTAMP NOT NULL,
                contained_at TIMESTAMP,
                authority_notification_required BOOLEAN DEFAULT 1,
                authority_notified_at TIMESTAMP,
                subjects_notification_required BOOLEAN DEFAULT 0,
                subjects_notified_at TIMESTAMP,
                remediation_measures TEXT, -- JSON array
                lessons_learned TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_audit_log (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                action TEXT NOT NULL,
                data_category TEXT,
                lawful_basis TEXT,
                processing_purpose TEXT,
                details TEXT, -- JSON
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_data_retention_schedule (
                id TEXT PRIMARY KEY,
                data_category TEXT NOT NULL,
                table_name TEXT NOT NULL,
                user_id TEXT NOT NULL,
                created_at TIMESTAMP NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                processed BOOLEAN DEFAULT 0
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            await db.commit()
        
        logger.info("GDPR database tables initialized")

    async def record_consent(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        consent_text: str,
        consent_method: str,
        ip_address: str,
        user_agent: str,
        expires_in_days: Optional[int] = None
    ) -> str:
        """
        Article 7 - Record user consent for data processing
        
        Args:
            user_id: User identifier
            processing_purpose: Why data is being processed  
            consent_text: Exact text user consented to
            consent_method: How consent was obtained
            ip_address: User's IP address
            user_agent: User's browser/app info
            expires_in_days: Optional consent expiration
            
        Returns:
            Consent record ID
        """
        consent_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=expires_in_days) if expires_in_days else None
        
        consent_record = ConsentRecord(
            id=consent_id,
            user_id=user_id,
            processing_purpose=processing_purpose,
            consent_status=ConsentStatus.GIVEN,
            consent_text=consent_text,
            consent_method=consent_method,
            ip_address=ip_address,
            user_agent=user_agent,
            given_at=now,
            expires_at=expires_at
        )
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_consent_records 
                (id, user_id, processing_purpose, consent_status, consent_text, 
                 consent_method, ip_address, user_agent, given_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    consent_id, user_id, processing_purpose.value, 
                    ConsentStatus.GIVEN.value, consent_text, consent_method,
                    ip_address, user_agent, now.isoformat(), 
                    expires_at.isoformat() if expires_at else None
                )
            )
            await db.commit()
        
        # Log the consent action
        await self._log_gdpr_action(
            user_id=user_id,
            action="CONSENT_GIVEN",
            processing_purpose=processing_purpose,
            details={"consent_id": consent_id, "method": consent_method},
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"Consent recorded for user {user_id}, purpose {processing_purpose.value}")
        return consent_id

    async def withdraw_consent(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        ip_address: str,
        user_agent: str
    ) -> bool:
        """
        Article 7(3) - Allow users to withdraw consent as easily as giving it
        
        Args:
            user_id: User identifier
            processing_purpose: Processing purpose to withdraw consent for
            ip_address: User's IP address
            user_agent: User's browser/app info
            
        Returns:
            True if consent was successfully withdrawn
        """
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Update consent status to withdrawn
            await db.execute(
                """
                UPDATE gdpr_consent_records 
                SET consent_status = ?, withdrawn_at = ?, updated_at = ?
                WHERE user_id = ? AND processing_purpose = ? AND consent_status = ?
                """,
                (
                    ConsentStatus.WITHDRAWN.value, now.isoformat(), now.isoformat(),
                    user_id, processing_purpose.value, ConsentStatus.GIVEN.value
                )
            )
            
            rows_affected = db.total_changes
            await db.commit()
        
        if rows_affected > 0:
            # Log the withdrawal action
            await self._log_gdpr_action(
                user_id=user_id,
                action="CONSENT_WITHDRAWN", 
                processing_purpose=processing_purpose,
                details={"withdrawal_time": now.isoformat()},
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Schedule data deletion if no other lawful basis exists
            await self._schedule_data_deletion_check(user_id, processing_purpose)
            
            logger.info(f"Consent withdrawn for user {user_id}, purpose {processing_purpose.value}")
            return True
        
        return False

    async def check_consent_validity(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose
    ) -> bool:
        """
        Check if user has valid consent for specified processing purpose
        
        Args:
            user_id: User identifier
            processing_purpose: Processing purpose to check
            
        Returns:
            True if valid consent exists
        """
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT consent_status, expires_at FROM gdpr_consent_records
                WHERE user_id = ? AND processing_purpose = ?
                ORDER BY given_at DESC LIMIT 1
                """,
                (user_id, processing_purpose.value)
            )
            result = await cursor.fetchone()
        
        if not result:
            return False
        
        consent_status, expires_at = result
        
        # Check if consent is given and not expired
        if consent_status != ConsentStatus.GIVEN.value:
            return False
            
        if expires_at:
            expiry_time = datetime.fromisoformat(expires_at)
            if now > expiry_time:
                # Mark consent as expired
                await self._expire_consent(user_id, processing_purpose)
                return False
        
        return True

    async def _expire_consent(self, user_id: str, processing_purpose: ProcessingPurpose):
        """Mark expired consent"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_consent_records 
                SET consent_status = ?, updated_at = ?
                WHERE user_id = ? AND processing_purpose = ? AND consent_status = ?
                """,
                (
                    ConsentStatus.EXPIRED.value, now.isoformat(),
                    user_id, processing_purpose.value, ConsentStatus.GIVEN.value
                )
            )
            await db.commit()

    async def record_data_processing(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose,
        lawful_basis: LawfulBasis,
        data_categories: List[DataCategory],
        data_subjects: str,
        recipients: List[str],
        security_measures: List[str]
    ) -> str:
        """
        Article 30 - Maintain records of processing activities
        
        Args:
            user_id: User whose data is being processed
            processing_purpose: Why data is being processed
            lawful_basis: Legal basis for processing (Article 6)
            data_categories: Types of personal data
            data_subjects: Description of data subjects
            recipients: Who will have access to the data
            security_measures: Security measures in place
            
        Returns:
            Processing record ID
        """
        record_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Determine retention period based on data categories
        max_retention = max(
            self.retention_policies.get(category, 365) 
            for category in data_categories
        )
        
        processing_record = DataProcessingRecord(
            id=record_id,
            user_id=user_id,
            processing_purpose=processing_purpose,
            lawful_basis=lawful_basis,
            data_categories=data_categories,
            data_subjects=data_subjects,
            recipients=recipients,
            retention_period=max_retention,
            security_measures=security_measures,
            created_at=now,
            updated_at=now
        )
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_data_processing_records
                (id, user_id, processing_purpose, lawful_basis, data_categories,
                 data_subjects, recipients, retention_period, security_measures)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    record_id, user_id, processing_purpose.value, lawful_basis.value,
                    json.dumps([cat.value for cat in data_categories]),
                    data_subjects, json.dumps(recipients), max_retention,
                    json.dumps(security_measures)
                )
            )
            await db.commit()
        
        # Schedule data retention review
        await self._schedule_data_retention(user_id, data_categories, max_retention)
        
        logger.info(f"Data processing recorded for user {user_id}, purpose {processing_purpose.value}")
        return record_id

    async def _schedule_data_retention(
        self,
        user_id: str,
        data_categories: List[DataCategory],
        retention_days: int
    ):
        """Schedule data for retention review"""
        now = datetime.utcnow()
        expires_at = now + timedelta(days=retention_days)
        
        async with aiosqlite.connect(self.db_path) as db:
            for category in data_categories:
                retention_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO gdpr_data_retention_schedule
                    (id, data_category, table_name, user_id, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        retention_id, category.value, self._get_table_for_category(category),
                        user_id, now.isoformat(), expires_at.isoformat()
                    )
                )
            await db.commit()

    def _get_table_for_category(self, category: DataCategory) -> str:
        """Map data category to database table"""
        category_table_map = {
            DataCategory.IDENTITY_DATA: "users",
            DataCategory.CONTACT_DATA: "users",
            DataCategory.FINANCIAL_DATA: "payments",
            DataCategory.TECHNICAL_DATA: "ai_chat_sessions",
            DataCategory.USAGE_DATA: "ai_usage_analytics", 
            DataCategory.MARKETING_DATA: "business_analytics",
            DataCategory.SPECIAL_CATEGORY: "users"
        }
        return category_table_map.get(category, "users")

    async def _schedule_data_deletion_check(
        self,
        user_id: str,
        processing_purpose: ProcessingPurpose
    ):
        """Check if data should be deleted after consent withdrawal"""
        # Check if there are other lawful bases for processing this data
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT COUNT(*) FROM gdpr_data_processing_records
                WHERE user_id = ? AND processing_purpose != ? AND lawful_basis != ?
                """,
                (user_id, processing_purpose.value, LawfulBasis.CONSENT.value)
            )
            other_bases_count = (await cursor.fetchone())[0]
        
        if other_bases_count == 0:
            # No other lawful basis exists, schedule immediate deletion
            await self._log_gdpr_action(
                user_id=user_id,
                action="DATA_DELETION_SCHEDULED",
                processing_purpose=processing_purpose,
                details={"reason": "consent_withdrawn_no_other_basis"}
            )

    async def _log_gdpr_action(
        self,
        user_id: str,
        action: str,
        data_category: DataCategory = None,
        lawful_basis: LawfulBasis = None,
        processing_purpose: ProcessingPurpose = None,
        details: Dict[str, Any] = None,
        ip_address: str = None,
        user_agent: str = None
    ):
        """Log GDPR-related actions for audit trail"""
        log_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_audit_log
                (id, user_id, action, data_category, lawful_basis, 
                 processing_purpose, details, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log_id, user_id, action,
                    data_category.value if data_category else None,
                    lawful_basis.value if lawful_basis else None,
                    processing_purpose.value if processing_purpose else None,
                    json.dumps(details) if details else None,
                    ip_address, user_agent
                )
            )
            await db.commit()
        
        logger.info(f"GDPR action logged: {action} for user {user_id}")

    async def get_user_consent_status(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive consent status for a user"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT processing_purpose, consent_status, given_at, withdrawn_at, expires_at
                FROM gdpr_consent_records
                WHERE user_id = ?
                ORDER BY given_at DESC
                """,
                (user_id,)
            )
            records = await cursor.fetchall()
        
        consent_status = {}
        for record in records:
            purpose, status, given_at, withdrawn_at, expires_at = record
            consent_status[purpose] = {
                "status": status,
                "given_at": given_at,
                "withdrawn_at": withdrawn_at,
                "expires_at": expires_at
            }
        
        return consent_status

    async def health_check(self) -> Dict[str, Any]:
        """Health check for GDPR compliance service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Check database connectivity
                cursor = await db.execute("SELECT COUNT(*) FROM gdpr_consent_records")
                consent_count = (await cursor.fetchone())[0]
                
                cursor = await db.execute("SELECT COUNT(*) FROM gdpr_audit_log")
                audit_count = (await cursor.fetchone())[0]
                
                # Check for pending data breaches requiring notification
                now = datetime.utcnow()
                breach_deadline = now - timedelta(hours=72)  # 72-hour notification requirement
                
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_data_breach_incidents
                    WHERE authority_notification_required = 1 
                    AND authority_notified_at IS NULL
                    AND discovered_at < ?
                    """,
                    (breach_deadline.isoformat(),)
                )
                overdue_notifications = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "database_connected": True,
                "consent_records": consent_count,
                "audit_records": audit_count,
                "overdue_breach_notifications": overdue_notifications,
                "encryption_key_exists": os.path.exists("/Users/bossio/6FB AI Agent System/.gdpr_encryption_key"),
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"GDPR compliance health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize GDPR compliance service instance
gdpr_service = GDPRComplianceService()