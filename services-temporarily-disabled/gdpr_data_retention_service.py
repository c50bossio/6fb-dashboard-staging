"""
GDPR Data Retention and Cleanup Service
Implements automated data retention policies and cleanup procedures
to ensure compliance with GDPR principles of storage limitation
and data minimization.

Key Features:
- Automated data retention policy enforcement
- Scheduled data cleanup and anonymization
- Retention period management by data category
- Legal hold and exception handling
- Data archival and secure deletion
- Compliance reporting and audit trails
- Integration with consent and processing purpose tracking
"""

import os
import json
import uuid
import asyncio
import logging
import hashlib
import shutil
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiosqlite
from pathlib import Path

# Import GDPR service components
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class RetentionAction(Enum):
    """Actions to take when retention period expires"""
    DELETE = "delete"
    ANONYMIZE = "anonymize"
    ARCHIVE = "archive"
    REVIEW = "review"
    EXTEND = "extend"

class RetentionStatus(Enum):
    """Status of retention policy application"""
    ACTIVE = "active"
    EXPIRED = "expired"
    EXTENDED = "extended"
    ON_HOLD = "on_hold"
    PROCESSED = "processed"

class DataLifecycleStage(Enum):
    """Stages in data lifecycle"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    SCHEDULED_DELETION = "scheduled_deletion"
    DELETED = "deleted"

@dataclass
class RetentionPolicy:
    """Data retention policy configuration"""
    id: str
    name: str
    description: str
    data_category: DataCategory
    processing_purpose: ProcessingPurpose
    retention_period_days: int
    retention_action: RetentionAction
    legal_basis: LawfulBasis
    
    # Advanced settings
    grace_period_days: int
    reminder_days_before_expiry: int
    require_manual_review: bool
    allow_extension: bool
    max_extensions: int
    
    # Legal requirements
    minimum_retention_days: Optional[int]
    legal_hold_exemption: bool
    regulatory_requirements: List[str]
    
    # Technical settings
    table_name: str
    date_column: str
    user_id_column: str
    additional_criteria: Dict[str, Any]
    
    created_at: datetime
    updated_at: datetime
    is_active: bool

@dataclass
class RetentionSchedule:
    """Individual data retention schedule entry"""
    id: str
    policy_id: str
    user_id: str
    record_id: str
    table_name: str
    data_category: DataCategory
    processing_purpose: ProcessingPurpose
    
    # Timing
    created_at: datetime
    retention_start_date: date
    retention_end_date: date
    reminder_date: date
    
    # Status
    status: RetentionStatus
    action_taken: Optional[RetentionAction]
    action_taken_at: Optional[datetime]
    
    # Extensions and holds
    extensions_count: int
    current_extension_end: Optional[date]
    legal_hold: bool
    legal_hold_reason: str
    
    # Metadata
    data_size_bytes: int
    data_hash: str
    last_accessed: Optional[datetime]
    access_frequency: int

class GDPRDataRetentionService:
    """
    Service for managing data retention policies and automated cleanup
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        self.archive_directory = "/Users/bossio/6FB AI Agent System/archives"
        
        # Default retention policies based on GDPR requirements
        self.default_policies = self._initialize_default_policies()
        
        # Legal retention requirements (minimum periods)
        self.legal_minimums = {
            DataCategory.FINANCIAL_DATA: 2555,  # 7 years for tax/audit
            DataCategory.IDENTITY_DATA: 730,    # 2 years for fraud prevention
            DataCategory.CONTACT_DATA: 1095,    # 3 years for customer service
            DataCategory.USAGE_DATA: 365,       # 1 year for analytics
            DataCategory.TECHNICAL_DATA: 90,    # 3 months for debugging
            DataCategory.MARKETING_DATA: 1095,  # 3 years or until consent withdrawn
            DataCategory.SPECIAL_CATEGORY: 365  # 1 year with explicit consent
        }
        
        # Archive settings
        os.makedirs(self.archive_directory, exist_ok=True)
        os.chmod(self.archive_directory, 0o700)  # Restrict access
        
        # Initialize database and start background tasks
        asyncio.create_task(self._init_retention_tables())
        asyncio.create_task(self._start_retention_processor())
        
        logger.info("GDPR Data Retention Service initialized")

    def _initialize_default_policies(self) -> List[RetentionPolicy]:
        """Initialize default retention policies"""
        now = datetime.utcnow()
        
        return [
            RetentionPolicy(
                id="user_identity_data",
                name="User Identity Data Retention",
                description="Personal identity information for active users",
                data_category=DataCategory.IDENTITY_DATA,
                processing_purpose=ProcessingPurpose.ACCOUNT_MANAGEMENT,
                retention_period_days=2555,  # 7 years
                retention_action=RetentionAction.REVIEW,
                legal_basis=LawfulBasis.CONTRACT,
                grace_period_days=90,
                reminder_days_before_expiry=30,
                require_manual_review=True,
                allow_extension=True,
                max_extensions=2,
                minimum_retention_days=730,  # 2 years minimum
                legal_hold_exemption=False,
                regulatory_requirements=["Tax Law", "Anti-Money Laundering"],
                table_name="users",
                date_column="created_at",
                user_id_column="id",
                additional_criteria={"is_active": True},
                created_at=now,
                updated_at=now,
                is_active=True
            ),
            
            RetentionPolicy(
                id="financial_transaction_data",
                name="Financial Transaction Data",
                description="Payment and billing information",
                data_category=DataCategory.FINANCIAL_DATA,
                processing_purpose=ProcessingPurpose.PAYMENT_PROCESSING,
                retention_period_days=2555,  # 7 years
                retention_action=RetentionAction.ARCHIVE,
                legal_basis=LawfulBasis.LEGAL_OBLIGATION,
                grace_period_days=0,  # No grace period for legal obligations
                reminder_days_before_expiry=60,
                require_manual_review=False,
                allow_extension=False,
                max_extensions=0,
                minimum_retention_days=2555,
                legal_hold_exemption=False,
                regulatory_requirements=["PCI DSS", "Tax Law"],
                table_name="payments",
                date_column="created_at",
                user_id_column="client_id",
                additional_criteria={"status": "completed"},
                created_at=now,
                updated_at=now,
                is_active=True
            ),
            
            RetentionPolicy(
                id="marketing_consent_data",
                name="Marketing Communication Data",
                description="Marketing preferences and communication history",
                data_category=DataCategory.MARKETING_DATA,
                processing_purpose=ProcessingPurpose.MARKETING_COMMUNICATIONS,
                retention_period_days=1095,  # 3 years
                retention_action=RetentionAction.DELETE,
                legal_basis=LawfulBasis.CONSENT,
                grace_period_days=30,
                reminder_days_before_expiry=14,
                require_manual_review=False,
                allow_extension=True,
                max_extensions=1,
                minimum_retention_days=None,
                legal_hold_exemption=True,
                regulatory_requirements=[],
                table_name="business_analytics",
                date_column="date",
                user_id_column="barbershop_id",
                additional_criteria={},
                created_at=now,
                updated_at=now,
                is_active=True
            ),
            
            RetentionPolicy(
                id="ai_chat_sessions",
                name="AI Chat Session Data",
                description="AI conversation history and usage data",
                data_category=DataCategory.USAGE_DATA,
                processing_purpose=ProcessingPurpose.AI_PERSONALIZATION,
                retention_period_days=730,  # 2 years
                retention_action=RetentionAction.ANONYMIZE,
                legal_basis=LawfulBasis.CONSENT,
                grace_period_days=30,
                reminder_days_before_expiry=7,
                require_manual_review=False,
                allow_extension=True,
                max_extensions=1,
                minimum_retention_days=90,
                legal_hold_exemption=True,
                regulatory_requirements=[],
                table_name="ai_chat_messages",
                date_column="created_at",
                user_id_column="session_id",  # Links through ai_chat_sessions
                additional_criteria={},
                created_at=now,
                updated_at=now,
                is_active=True
            ),
            
            RetentionPolicy(
                id="technical_logs",
                name="Technical and System Logs",
                description="System access logs and technical data",
                data_category=DataCategory.TECHNICAL_DATA,
                processing_purpose=ProcessingPurpose.LEGAL_COMPLIANCE,
                retention_period_days=365,  # 1 year
                retention_action=RetentionAction.DELETE,
                legal_basis=LawfulBasis.LEGITIMATE_INTERESTS,
                grace_period_days=0,
                reminder_days_before_expiry=7,
                require_manual_review=False,
                allow_extension=False,
                max_extensions=0,
                minimum_retention_days=90,
                legal_hold_exemption=False,
                regulatory_requirements=["Security Incident Response"],
                table_name="gdpr_audit_log",
                date_column="timestamp",
                user_id_column="user_id",
                additional_criteria={},
                created_at=now,
                updated_at=now,
                is_active=True
            )
        ]

    async def _init_retention_tables(self):
        """Initialize retention management database tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_retention_policies (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                data_category TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                retention_period_days INTEGER NOT NULL,
                retention_action TEXT NOT NULL,
                legal_basis TEXT NOT NULL,
                
                -- Advanced settings
                grace_period_days INTEGER DEFAULT 0,
                reminder_days_before_expiry INTEGER DEFAULT 7,
                require_manual_review BOOLEAN DEFAULT 0,
                allow_extension BOOLEAN DEFAULT 0,
                max_extensions INTEGER DEFAULT 0,
                
                -- Legal requirements
                minimum_retention_days INTEGER,
                legal_hold_exemption BOOLEAN DEFAULT 1,
                regulatory_requirements TEXT, -- JSON array
                
                -- Technical settings
                table_name TEXT NOT NULL,
                date_column TEXT NOT NULL,
                user_id_column TEXT NOT NULL,
                additional_criteria TEXT, -- JSON
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_retention_schedule (
                id TEXT PRIMARY KEY,
                policy_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                record_id TEXT NOT NULL,
                table_name TEXT NOT NULL,
                data_category TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                
                -- Timing
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                retention_start_date DATE NOT NULL,
                retention_end_date DATE NOT NULL,
                reminder_date DATE NOT NULL,
                
                -- Status
                status TEXT DEFAULT 'active',
                action_taken TEXT,
                action_taken_at TIMESTAMP,
                
                -- Extensions and holds
                extensions_count INTEGER DEFAULT 0,
                current_extension_end DATE,
                legal_hold BOOLEAN DEFAULT 0,
                legal_hold_reason TEXT,
                
                -- Metadata
                data_size_bytes INTEGER DEFAULT 0,
                data_hash TEXT,
                last_accessed TIMESTAMP,
                access_frequency INTEGER DEFAULT 0,
                
                FOREIGN KEY (policy_id) REFERENCES gdpr_retention_policies(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_retention_actions (
                id TEXT PRIMARY KEY,
                schedule_id TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_details TEXT, -- JSON
                executed_by TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                success BOOLEAN DEFAULT 1,
                error_message TEXT,
                data_affected_count INTEGER DEFAULT 0,
                
                FOREIGN KEY (schedule_id) REFERENCES gdpr_retention_schedule(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_archived_data (
                id TEXT PRIMARY KEY,
                original_table TEXT NOT NULL,
                original_record_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                data_category TEXT NOT NULL,
                archive_path TEXT NOT NULL,
                archive_hash TEXT NOT NULL,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                archive_size_bytes INTEGER DEFAULT 0,
                retrieval_key TEXT,
                expires_at TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_retention_reports (
                id TEXT PRIMARY KEY,
                report_type TEXT NOT NULL,
                report_period_start DATE NOT NULL,
                report_period_end DATE NOT NULL,
                report_data TEXT NOT NULL, -- JSON
                generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                generated_by TEXT
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            
            # Insert default policies
            for policy in self.default_policies:
                await db.execute(
                    """
                    INSERT OR REPLACE INTO gdpr_retention_policies
                    (id, name, description, data_category, processing_purpose,
                     retention_period_days, retention_action, legal_basis,
                     grace_period_days, reminder_days_before_expiry,
                     require_manual_review, allow_extension, max_extensions,
                     minimum_retention_days, legal_hold_exemption,
                     regulatory_requirements, table_name, date_column,
                     user_id_column, additional_criteria)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        policy.id, policy.name, policy.description,
                        policy.data_category.value, policy.processing_purpose.value,
                        policy.retention_period_days, policy.retention_action.value,
                        policy.legal_basis.value, policy.grace_period_days,
                        policy.reminder_days_before_expiry, policy.require_manual_review,
                        policy.allow_extension, policy.max_extensions,
                        policy.minimum_retention_days, policy.legal_hold_exemption,
                        json.dumps(policy.regulatory_requirements),
                        policy.table_name, policy.date_column,
                        policy.user_id_column, json.dumps(policy.additional_criteria)
                    )
                )
            
            await db.commit()

    async def _start_retention_processor(self):
        """Start background retention processing"""
        # Wait for initialization
        await asyncio.sleep(10)
        
        while True:
            try:
                # Generate retention schedules for new data
                await self._generate_retention_schedules()
                
                # Process expired retention schedules
                await self._process_expired_schedules()
                
                # Send retention reminders
                await self._send_retention_reminders()
                
                # Clean up old archives
                await self._cleanup_expired_archives()
                
                # Sleep for 1 hour between processing cycles
                await asyncio.sleep(3600)
                
            except Exception as e:
                logger.error(f"Retention processor error: {str(e)}")
                await asyncio.sleep(1800)  # Wait 30 minutes on error

    async def _generate_retention_schedules(self):
        """Generate retention schedules for new data records"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get active retention policies
            cursor = await db.execute(
                "SELECT * FROM gdpr_retention_policies WHERE is_active = 1"
            )
            policies = await cursor.fetchall()
            
            for policy_data in policies:
                try:
                    policy_id = policy_data[0]
                    table_name = policy_data[16]  # table_name column
                    date_column = policy_data[17]  # date_column column
                    user_id_column = policy_data[18]  # user_id_column column
                    additional_criteria = json.loads(policy_data[19] or "{}")  # additional_criteria
                    
                    # Find records not yet scheduled for retention
                    await self._schedule_records_for_retention(
                        policy_data, table_name, date_column, user_id_column, additional_criteria
                    )
                    
                except Exception as e:
                    logger.error(f"Error generating schedules for policy {policy_data[0]}: {str(e)}")

    async def _schedule_records_for_retention(
        self,
        policy_data: tuple,
        table_name: str,
        date_column: str,
        user_id_column: str,
        additional_criteria: Dict[str, Any]
    ):
        """Schedule specific records for retention"""
        policy_id = policy_data[0]
        retention_period_days = policy_data[5]
        grace_period_days = policy_data[10]
        reminder_days = policy_data[11]
        
        # Build query to find unscheduled records
        base_query = f"SELECT id, {user_id_column}, {date_column} FROM {table_name}"
        where_conditions = []
        params = []
        
        # Add additional criteria
        for key, value in additional_criteria.items():
            where_conditions.append(f"{key} = ?")
            params.append(value)
        
        # Exclude already scheduled records
        where_conditions.append(f"""
            id NOT IN (
                SELECT record_id FROM gdpr_retention_schedule 
                WHERE table_name = ? AND policy_id = ?
            )
        """)
        params.extend([table_name, policy_id])
        
        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)
        
        async with aiosqlite.connect(self.db_path) as db:
            try:
                cursor = await db.execute(base_query, params)
                records = await cursor.fetchall()
                
                for record in records:
                    record_id, user_id, created_date = record
                    
                    # Calculate retention dates
                    if isinstance(created_date, str):
                        start_date = datetime.fromisoformat(created_date).date()
                    else:
                        start_date = created_date
                    
                    end_date = start_date + timedelta(days=retention_period_days + grace_period_days)
                    reminder_date = end_date - timedelta(days=reminder_days)
                    
                    # Create retention schedule entry
                    schedule_id = str(uuid.uuid4())
                    
                    await db.execute(
                        """
                        INSERT INTO gdpr_retention_schedule
                        (id, policy_id, user_id, record_id, table_name, data_category,
                         processing_purpose, retention_start_date, retention_end_date,
                         reminder_date, data_hash)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            schedule_id, policy_id, user_id, record_id, table_name,
                            policy_data[3],  # data_category
                            policy_data[4],  # processing_purpose
                            start_date.isoformat(), end_date.isoformat(),
                            reminder_date.isoformat(),
                            hashlib.sha256(f"{table_name}:{record_id}".encode()).hexdigest()
                        )
                    )
                
                await db.commit()
                
                if records:
                    logger.info(f"Scheduled {len(records)} records for retention in {table_name}")
                    
            except Exception as e:
                logger.error(f"Error scheduling records in {table_name}: {str(e)}")

    async def _process_expired_schedules(self):
        """Process retention schedules that have expired"""
        today = date.today()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Get expired schedules
            cursor = await db.execute(
                """
                SELECT rs.*, rp.retention_action, rp.require_manual_review
                FROM gdpr_retention_schedule rs
                JOIN gdpr_retention_policies rp ON rs.policy_id = rp.id
                WHERE rs.retention_end_date <= ? 
                AND rs.status = 'active'
                AND rs.legal_hold = 0
                """,
                (today.isoformat(),)
            )
            expired_schedules = await cursor.fetchall()
            
            for schedule_data in expired_schedules:
                try:
                    schedule_id = schedule_data[0]
                    retention_action = RetentionAction(schedule_data[21])  # retention_action from join
                    require_review = bool(schedule_data[22])  # require_manual_review from join
                    
                    if require_review:
                        # Mark for manual review
                        await self._mark_for_review(schedule_id)
                    else:
                        # Execute retention action automatically
                        await self._execute_retention_action(schedule_data, retention_action)
                        
                except Exception as e:
                    logger.error(f"Error processing expired schedule {schedule_data[0]}: {str(e)}")

    async def _mark_for_review(self, schedule_id: str):
        """Mark retention schedule for manual review"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE gdpr_retention_schedule SET status = 'expired' WHERE id = ?",
                (schedule_id,)
            )
            await db.commit()
        
        logger.info(f"Retention schedule {schedule_id} marked for manual review")

    async def _execute_retention_action(
        self,
        schedule_data: tuple,
        retention_action: RetentionAction
    ):
        """Execute the specified retention action"""
        schedule_id = schedule_data[0]
        table_name = schedule_data[4]
        record_id = schedule_data[3]
        user_id = schedule_data[2]
        data_category = DataCategory(schedule_data[5])
        
        success = False
        action_details = {}
        error_message = None
        
        try:
            if retention_action == RetentionAction.DELETE:
                success = await self._delete_data(table_name, record_id, user_id)
                action_details = {"action": "delete", "table": table_name, "record_id": record_id}
                
            elif retention_action == RetentionAction.ANONYMIZE:
                success = await self._anonymize_data(table_name, record_id, user_id)
                action_details = {"action": "anonymize", "table": table_name, "record_id": record_id}
                
            elif retention_action == RetentionAction.ARCHIVE:
                archive_path = await self._archive_data(table_name, record_id, user_id, data_category)
                success = archive_path is not None
                action_details = {"action": "archive", "archive_path": archive_path}
                
            else:  # REVIEW or EXTEND
                await self._mark_for_review(schedule_id)
                return
            
            # Update schedule status
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE gdpr_retention_schedule 
                    SET status = 'processed', action_taken = ?, action_taken_at = ?
                    WHERE id = ?
                    """,
                    (retention_action.value, datetime.utcnow().isoformat(), schedule_id)
                )
                
                # Log the action
                action_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO gdpr_retention_actions
                    (id, schedule_id, action_type, action_details, executed_by, 
                     success, error_message, data_affected_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        action_id, schedule_id, retention_action.value,
                        json.dumps(action_details), "system", success,
                        error_message, 1 if success else 0
                    )
                )
                
                await db.commit()
            
            if success:
                logger.info(f"Retention action {retention_action.value} completed for schedule {schedule_id}")
            else:
                logger.error(f"Retention action {retention_action.value} failed for schedule {schedule_id}")
                
        except Exception as e:
            error_message = str(e)
            logger.error(f"Error executing retention action {retention_action.value}: {error_message}")

    async def _delete_data(self, table_name: str, record_id: str, user_id: str) -> bool:
        """Securely delete data record"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Get the record first for logging
                cursor = await db.execute(f"SELECT * FROM {table_name} WHERE id = ?", (record_id,))
                record_data = await cursor.fetchone()
                
                if record_data:
                    # Create hash of deleted data for audit
                    data_hash = hashlib.sha256(str(record_data).encode()).hexdigest()
                    
                    # Delete the record
                    await db.execute(f"DELETE FROM {table_name} WHERE id = ?", (record_id,))
                    
                    # Log the deletion
                    await gdpr_service._log_gdpr_action(
                        user_id=user_id,
                        action="DATA_RETENTION_DELETE",
                        details={
                            "table": table_name,
                            "record_id": record_id,
                            "data_hash": data_hash
                        }
                    )
                    
                    await db.commit()
                    return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error deleting data from {table_name}: {str(e)}")
            return False

    async def _anonymize_data(self, table_name: str, record_id: str, user_id: str) -> bool:
        """Anonymize data record by removing/masking personal identifiers"""
        try:
            # Define anonymization rules for different tables
            anonymization_rules = {
                "users": {
                    "email": "anonymized_user_" + str(uuid.uuid4())[:8] + "@example.com",
                    "name": "Anonymous User",
                    "phone": None,
                    "google_id": None,
                    "facebook_id": None
                },
                "ai_chat_messages": {
                    "content": "[ANONYMIZED MESSAGE]"
                },
                "appointments": {
                    "client_name": "Anonymous Client",
                    "client_phone": None,
                    "client_email": None,
                    "client_notes": "[ANONYMIZED]",
                    "barber_notes": "[ANONYMIZED]"
                }
            }
            
            rules = anonymization_rules.get(table_name, {})
            if not rules:
                return False
            
            # Build update query
            set_clauses = []
            params = []
            for column, value in rules.items():
                set_clauses.append(f"{column} = ?")
                params.append(value)
            
            params.append(record_id)
            
            update_query = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE id = ?"
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(update_query, params)
                
                # Log the anonymization
                await gdpr_service._log_gdpr_action(
                    user_id=user_id,
                    action="DATA_RETENTION_ANONYMIZE",
                    details={
                        "table": table_name,
                        "record_id": record_id,
                        "fields_anonymized": list(rules.keys())
                    }
                )
                
                await db.commit()
                return True
                
        except Exception as e:
            logger.error(f"Error anonymizing data in {table_name}: {str(e)}")
            return False

    async def _archive_data(
        self,
        table_name: str,
        record_id: str,
        user_id: str,
        data_category: DataCategory
    ) -> Optional[str]:
        """Archive data record to secure storage"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Get the record data
                cursor = await db.execute(f"SELECT * FROM {table_name} WHERE id = ?", (record_id,))
                record_data = await cursor.fetchone()
                
                if not record_data:
                    return None
                
                # Create archive structure
                archive_date = datetime.utcnow().strftime("%Y%m%d")
                archive_subdir = os.path.join(
                    self.archive_directory,
                    data_category.value,
                    archive_date
                )
                os.makedirs(archive_subdir, exist_ok=True)
                
                # Archive file path
                archive_filename = f"{table_name}_{record_id}_{int(datetime.utcnow().timestamp())}.json"
                archive_path = os.path.join(archive_subdir, archive_filename)
                
                # Convert record to JSON
                columns = [description[0] for description in cursor.description]
                record_dict = dict(zip(columns, record_data))
                
                # Add metadata
                archive_data = {
                    "metadata": {
                        "original_table": table_name,
                        "original_record_id": record_id,
                        "user_id": user_id,
                        "data_category": data_category.value,
                        "archived_at": datetime.utcnow().isoformat(),
                        "retention_reason": "Data retention policy"
                    },
                    "data": record_dict
                }
                
                # Write archive file
                with open(archive_path, 'w') as f:
                    json.dump(archive_data, f, indent=2, default=str)
                
                # Set restrictive permissions
                os.chmod(archive_path, 0o600)
                
                # Calculate file size and hash
                file_size = os.path.getsize(archive_path)
                with open(archive_path, 'rb') as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                
                # Record in archived data table
                archive_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO gdpr_archived_data
                    (id, original_table, original_record_id, user_id, data_category,
                     archive_path, archive_hash, archive_size_bytes, retrieval_key)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        archive_id, table_name, record_id, user_id,
                        data_category.value, archive_path, file_hash,
                        file_size, str(uuid.uuid4())
                    )
                )
                
                # Delete original record
                await db.execute(f"DELETE FROM {table_name} WHERE id = ?", (record_id,))
                
                # Log the archival
                await gdpr_service._log_gdpr_action(
                    user_id=user_id,
                    action="DATA_RETENTION_ARCHIVE",
                    details={
                        "table": table_name,
                        "record_id": record_id,
                        "archive_path": archive_path,
                        "archive_id": archive_id
                    }
                )
                
                await db.commit()
                return archive_path
                
        except Exception as e:
            logger.error(f"Error archiving data from {table_name}: {str(e)}")
            return None

    async def _send_retention_reminders(self):
        """Send reminders for upcoming retention actions"""
        today = date.today()
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT rs.*, rp.name, rp.retention_action
                FROM gdpr_retention_schedule rs
                JOIN gdpr_retention_policies rp ON rs.policy_id = rp.id
                WHERE rs.reminder_date <= ? 
                AND rs.status = 'active'
                AND rs.reminder_date > DATE(rs.retention_end_date, '-30 days')
                """,
                (today.isoformat(),)
            )
            reminders = await cursor.fetchall()
            
            for reminder in reminders:
                # In production, this would send actual notifications
                schedule_id = reminder[0]
                policy_name = reminder[21]  # policy name from join
                retention_date = reminder[9]  # retention_end_date
                
                logger.info(f"RETENTION REMINDER: Policy '{policy_name}' expires on {retention_date} for schedule {schedule_id}")

    async def _cleanup_expired_archives(self):
        """Clean up expired archive files"""
        cutoff_date = datetime.utcnow() - timedelta(days=2555)  # 7 years
        
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT id, archive_path FROM gdpr_archived_data
                WHERE archived_at < ? AND expires_at IS NOT NULL AND expires_at < ?
                """,
                (cutoff_date.isoformat(), datetime.utcnow().isoformat())
            )
            expired_archives = await cursor.fetchall()
            
            for archive_id, archive_path in expired_archives:
                try:
                    # Securely delete archive file
                    if os.path.exists(archive_path):
                        os.remove(archive_path)
                    
                    # Remove from database
                    await db.execute(
                        "DELETE FROM gdpr_archived_data WHERE id = ?",
                        (archive_id,)
                    )
                    
                    logger.info(f"Cleaned up expired archive: {archive_path}")
                    
                except Exception as e:
                    logger.error(f"Error cleaning up archive {archive_path}: {str(e)}")
            
            await db.commit()

    async def apply_legal_hold(
        self,
        user_id: str,
        reason: str,
        data_categories: List[DataCategory] = None
    ) -> int:
        """
        Apply legal hold to prevent data deletion
        
        Args:
            user_id: User whose data should be held
            reason: Legal reason for the hold
            data_categories: Specific categories to hold (all if None)
            
        Returns:
            Number of schedules affected
        """
        async with aiosqlite.connect(self.db_path) as db:
            query = "UPDATE gdpr_retention_schedule SET legal_hold = 1, legal_hold_reason = ? WHERE user_id = ?"
            params = [reason, user_id]
            
            if data_categories:
                placeholders = ','.join('?' * len(data_categories))
                query += f" AND data_category IN ({placeholders})"
                params.extend([cat.value for cat in data_categories])
            
            await db.execute(query, params)
            affected_count = db.total_changes
            await db.commit()
        
        logger.info(f"Applied legal hold to {affected_count} retention schedules for user {user_id}")
        return affected_count

    async def release_legal_hold(self, user_id: str, data_categories: List[DataCategory] = None) -> int:
        """Release legal hold on user data"""
        async with aiosqlite.connect(self.db_path) as db:
            query = "UPDATE gdpr_retention_schedule SET legal_hold = 0, legal_hold_reason = NULL WHERE user_id = ? AND legal_hold = 1"
            params = [user_id]
            
            if data_categories:
                placeholders = ','.join('?' * len(data_categories))
                query += f" AND data_category IN ({placeholders})"
                params.extend([cat.value for cat in data_categories])
            
            await db.execute(query, params)
            affected_count = db.total_changes
            await db.commit()
        
        logger.info(f"Released legal hold on {affected_count} retention schedules for user {user_id}")
        return affected_count

    async def extend_retention(
        self,
        schedule_id: str,
        extension_days: int,
        reason: str
    ) -> bool:
        """Extend retention period for specific schedule"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get current schedule
            cursor = await db.execute(
                "SELECT extensions_count, retention_end_date FROM gdpr_retention_schedule WHERE id = ?",
                (schedule_id,)
            )
            result = await cursor.fetchone()
            
            if not result:
                return False
            
            extensions_count, current_end_date = result
            
            # Calculate new end date
            current_end = date.fromisoformat(current_end_date)
            new_end_date = current_end + timedelta(days=extension_days)
            
            # Update schedule
            await db.execute(
                """
                UPDATE gdpr_retention_schedule 
                SET extensions_count = extensions_count + 1,
                    current_extension_end = ?,
                    retention_end_date = ?
                WHERE id = ?
                """,
                (new_end_date.isoformat(), new_end_date.isoformat(), schedule_id)
            )
            
            # Log the extension
            action_id = str(uuid.uuid4())
            await db.execute(
                """
                INSERT INTO gdpr_retention_actions
                (id, schedule_id, action_type, action_details, executed_by)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    action_id, schedule_id, "extend",
                    json.dumps({"extension_days": extension_days, "reason": reason}),
                    "manual"
                )
            )
            
            await db.commit()
        
        logger.info(f"Extended retention for schedule {schedule_id} by {extension_days} days")
        return True

    async def get_retention_report(
        self,
        start_date: date,
        end_date: date,
        data_category: DataCategory = None
    ) -> Dict[str, Any]:
        """Generate retention compliance report"""
        async with aiosqlite.connect(self.db_path) as db:
            # Base query for retention schedules
            query = """
                SELECT rs.data_category, rs.status, rs.action_taken, COUNT(*) as count
                FROM gdpr_retention_schedule rs
                WHERE rs.created_at BETWEEN ? AND ?
            """
            params = [start_date.isoformat(), end_date.isoformat()]
            
            if data_category:
                query += " AND rs.data_category = ?"
                params.append(data_category.value)
            
            query += " GROUP BY rs.data_category, rs.status, rs.action_taken"
            
            cursor = await db.execute(query, params)
            schedule_stats = await cursor.fetchall()
            
            # Get retention actions
            cursor = await db.execute(
                """
                SELECT ra.action_type, ra.success, COUNT(*) as count
                FROM gdpr_retention_actions ra
                JOIN gdpr_retention_schedule rs ON ra.schedule_id = rs.id
                WHERE ra.executed_at BETWEEN ? AND ?
                GROUP BY ra.action_type, ra.success
                """,
                params[:2]
            )
            action_stats = await cursor.fetchall()
            
            # Get archive statistics
            cursor = await db.execute(
                """
                SELECT data_category, COUNT(*) as count, SUM(archive_size_bytes) as total_size
                FROM gdpr_archived_data
                WHERE archived_at BETWEEN ? AND ?
                GROUP BY data_category
                """,
                params[:2]
            )
            archive_stats = await cursor.fetchall()
        
        report = {
            "report_period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "retention_schedules": [
                {
                    "data_category": row[0],
                    "status": row[1],
                    "action_taken": row[2],
                    "count": row[3]
                }
                for row in schedule_stats
            ],
            "retention_actions": [
                {
                    "action_type": row[0],
                    "success": bool(row[1]),
                    "count": row[2]
                }
                for row in action_stats
            ],
            "archives": [
                {
                    "data_category": row[0],
                    "count": row[1],
                    "total_size_mb": round(row[2] / (1024 * 1024), 2) if row[2] else 0
                }
                for row in archive_stats
            ],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return report

    async def health_check(self) -> Dict[str, Any]:
        """Health check for data retention service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count schedules by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_retention_schedule
                    GROUP BY status
                    """
                )
                schedule_counts = dict(await cursor.fetchall())
                
                # Count overdue schedules
                today = date.today()
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_retention_schedule
                    WHERE retention_end_date < ? AND status = 'active' AND legal_hold = 0
                    """,
                    (today.isoformat(),)
                )
                overdue_schedules = (await cursor.fetchone())[0]
                
                # Count active policies
                cursor = await db.execute(
                    "SELECT COUNT(*) FROM gdpr_retention_policies WHERE is_active = 1"
                )
                active_policies = (await cursor.fetchone())[0]
                
                # Archive directory size
                archive_size = sum(
                    os.path.getsize(os.path.join(dirpath, filename))
                    for dirpath, dirnames, filenames in os.walk(self.archive_directory)
                    for filename in filenames
                ) if os.path.exists(self.archive_directory) else 0
            
            return {
                "status": "healthy",
                "schedules_by_status": schedule_counts,
                "overdue_schedules": overdue_schedules,
                "active_policies": active_policies,
                "archive_directory_size_mb": round(archive_size / (1024 * 1024), 2),
                "archive_directory_exists": os.path.exists(self.archive_directory),
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Data retention service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize data retention service instance
data_retention_service = GDPRDataRetentionService()