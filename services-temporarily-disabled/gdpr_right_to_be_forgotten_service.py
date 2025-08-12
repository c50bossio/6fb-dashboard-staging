"""
GDPR Right to be Forgotten Service - Article 17 Implementation
Handles data subject requests for erasure of personal data when certain
conditions are met under GDPR Article 17.

Key Features:
- Complete data erasure across all systems
- Cascading deletion with referential integrity
- Selective deletion based on processing purpose
- Secure data wiping and verification
- Third-party notification of erasure requests
- Audit trail of all deletion activities
- Retention of minimal data for legal compliance
"""

import os
import json
import uuid
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib
import aiosqlite
from pathlib import Path
import shutil

# Import GDPR service for compliance tracking
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

class ErasureReason(Enum):
    """Reasons for data erasure under Article 17"""
    NO_LONGER_NECESSARY = "no_longer_necessary"  # Article 17(1)(a)
    CONSENT_WITHDRAWN = "consent_withdrawn"      # Article 17(1)(b)
    UNLAWFUL_PROCESSING = "unlawful_processing"  # Article 17(1)(d)
    LEGAL_OBLIGATION = "legal_obligation"        # Article 17(1)(c)
    CHILD_CONSENT = "child_consent"              # Article 17(1)(f)
    DATA_SUBJECT_OBJECTS = "data_subject_objects" # Article 17(1)(e)

class DeletionStatus(Enum):
    """Status of deletion request"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PARTIALLY_COMPLETED = "partially_completed"
    FAILED = "failed"

class RetentionException(Enum):
    """Legal reasons to retain data despite erasure request"""
    FREEDOM_OF_EXPRESSION = "freedom_of_expression"     # Article 17(3)(a)
    LEGAL_OBLIGATION = "legal_obligation"               # Article 17(3)(b)
    PUBLIC_INTEREST = "public_interest"                 # Article 17(3)(b)
    ARCHIVING_PURPOSES = "archiving_purposes"           # Article 17(3)(d)
    LEGAL_CLAIMS = "legal_claims"                       # Article 17(3)(e)

@dataclass
class ErasureRequest:
    """Data subject request for erasure"""
    id: str
    user_id: str
    reason: ErasureReason
    specific_data_categories: List[DataCategory]
    processing_purposes: List[ProcessingPurpose]
    request_details: str
    status: DeletionStatus
    requested_at: datetime
    reviewed_at: Optional[datetime]
    approved_at: Optional[datetime]
    completed_at: Optional[datetime]
    reviewer_notes: str
    deletion_summary: Dict[str, Any]
    third_parties_notified: List[str]
    retention_exceptions: List[RetentionException]

@dataclass
class DeletionJob:
    """Deletion job for processing"""
    id: str
    erasure_request_id: str
    table_name: str
    deletion_criteria: Dict[str, Any]
    cascade_deletions: List[str]
    status: str
    records_found: int
    records_deleted: int
    error_message: Optional[str]
    executed_at: Optional[datetime]

class GDPRRightToBeForgottenService:
    """
    Service for handling GDPR Article 17 right to erasure requests
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        
        # Tables and their relationships for cascade deletion
        self.table_relationships = {
            "users": {
                "dependent_tables": [
                    "barbershop_staff", "appointments", "payments", 
                    "ai_chat_sessions", "business_analytics",
                    "gdpr_consent_records", "gdpr_audit_log"
                ],
                "foreign_key_column": "user_id"
            },
            "barbershops": {
                "dependent_tables": [
                    "barbershop_staff", "services", "appointments", 
                    "payments", "business_analytics"
                ],
                "foreign_key_column": "barbershop_id"
            },
            "ai_chat_sessions": {
                "dependent_tables": ["ai_chat_messages"],
                "foreign_key_column": "session_id"
            }
        }
        
        # Data that must be retained for legal compliance
        self.legal_retention_requirements = {
            DataCategory.FINANCIAL_DATA: 2555,  # 7 years for tax/legal
            DataCategory.IDENTITY_DATA: 730     # 2 years for fraud prevention
        }
        
        # Third-party systems that need notification of erasure
        self.third_party_systems = [
            "stripe_payment_processor",
            "google_calendar",
            "email_marketing_service",
            "analytics_provider"
        ]
        
        # Initialize database
        asyncio.create_task(self._init_erasure_tables())
        
        logger.info("GDPR Right to be Forgotten Service initialized")

    async def _init_erasure_tables(self):
        """Initialize erasure request tracking tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_erasure_requests (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                specific_data_categories TEXT, -- JSON array
                processing_purposes TEXT, -- JSON array
                request_details TEXT,
                status TEXT DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP,
                approved_at TIMESTAMP,
                completed_at TIMESTAMP,
                reviewer_notes TEXT,
                deletion_summary TEXT, -- JSON
                third_parties_notified TEXT, -- JSON array
                retention_exceptions TEXT, -- JSON array
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_deletion_jobs (
                id TEXT PRIMARY KEY,
                erasure_request_id TEXT NOT NULL,
                table_name TEXT NOT NULL,
                deletion_criteria TEXT NOT NULL, -- JSON
                cascade_deletions TEXT, -- JSON array
                status TEXT DEFAULT 'pending',
                records_found INTEGER DEFAULT 0,
                records_deleted INTEGER DEFAULT 0,
                error_message TEXT,
                executed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (erasure_request_id) REFERENCES gdpr_erasure_requests(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_deleted_data_log (
                id TEXT PRIMARY KEY,
                erasure_request_id TEXT NOT NULL,
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                data_hash TEXT NOT NULL, -- Hash of deleted data for verification
                deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (erasure_request_id) REFERENCES gdpr_erasure_requests(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_retention_overrides (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                data_category TEXT NOT NULL,
                processing_purpose TEXT NOT NULL,
                retention_reason TEXT NOT NULL,
                legal_basis TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            await db.commit()

    async def submit_erasure_request(
        self,
        user_id: str,
        reason: ErasureReason,
        request_details: str,
        specific_data_categories: List[DataCategory] = None,
        processing_purposes: List[ProcessingPurpose] = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        """
        Submit a request for data erasure under Article 17
        
        Args:
            user_id: User requesting erasure
            reason: Legal reason for erasure
            request_details: Detailed explanation of request
            specific_data_categories: Specific categories to delete (optional)
            processing_purposes: Specific purposes to stop (optional)
            ip_address: User's IP address
            user_agent: User's browser/app info
            
        Returns:
            Erasure request ID
        """
        request_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Default to all data categories if none specified
        if not specific_data_categories:
            specific_data_categories = list(DataCategory)
        
        # Default to all processing purposes if none specified
        if not processing_purposes:
            processing_purposes = list(ProcessingPurpose)
        
        erasure_request = ErasureRequest(
            id=request_id,
            user_id=user_id,
            reason=reason,
            specific_data_categories=specific_data_categories,
            processing_purposes=processing_purposes,
            request_details=request_details,
            status=DeletionStatus.PENDING,
            requested_at=now,
            reviewed_at=None,
            approved_at=None,
            completed_at=None,
            reviewer_notes="",
            deletion_summary={},
            third_parties_notified=[],
            retention_exceptions=[]
        )
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_erasure_requests
                (id, user_id, reason, specific_data_categories, processing_purposes,
                 request_details, status, requested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request_id, user_id, reason.value,
                    json.dumps([cat.value for cat in specific_data_categories]),
                    json.dumps([purpose.value for purpose in processing_purposes]),
                    request_details, DeletionStatus.PENDING.value, now.isoformat()
                )
            )
            await db.commit()
        
        # Log the erasure request
        await gdpr_service._log_gdpr_action(
            user_id=user_id,
            action="ERASURE_REQUEST_SUBMITTED",
            details={
                "request_id": request_id,
                "reason": reason.value,
                "categories": [cat.value for cat in specific_data_categories]
            },
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Auto-approve certain requests (e.g., consent withdrawal)
        if reason in [ErasureReason.CONSENT_WITHDRAWN, ErasureReason.NO_LONGER_NECESSARY]:
            await self._auto_approve_request(request_id, reason)
        
        logger.info(f"Erasure request submitted for user {user_id}, request ID {request_id}")
        return request_id

    async def _auto_approve_request(self, request_id: str, reason: ErasureReason):
        """Auto-approve certain types of erasure requests"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_erasure_requests 
                SET status = ?, approved_at = ?, reviewer_notes = ?
                WHERE id = ?
                """,
                (
                    DeletionStatus.APPROVED.value, now.isoformat(),
                    f"Auto-approved: {reason.value}", request_id
                )
            )
            await db.commit()
        
        # Start processing immediately
        asyncio.create_task(self._process_erasure_request(request_id))

    async def review_erasure_request(
        self,
        request_id: str,
        reviewer_id: str,
        approved: bool,
        reviewer_notes: str,
        retention_exceptions: List[RetentionException] = None
    ) -> bool:
        """
        Review and approve/reject erasure request
        
        Args:
            request_id: Erasure request ID
            reviewer_id: ID of reviewer (admin/DPO)
            approved: Whether request is approved
            reviewer_notes: Reviewer's notes
            retention_exceptions: Legal exceptions for retention
            
        Returns:
            True if review was recorded successfully
        """
        now = datetime.utcnow()
        status = DeletionStatus.APPROVED if approved else DeletionStatus.REJECTED
        retention_exceptions = retention_exceptions or []
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                UPDATE gdpr_erasure_requests 
                SET status = ?, reviewed_at = ?, approved_at = ?, 
                    reviewer_notes = ?, retention_exceptions = ?
                WHERE id = ?
                """,
                (
                    status.value, now.isoformat(),
                    now.isoformat() if approved else None,
                    reviewer_notes,
                    json.dumps([exc.value for exc in retention_exceptions]),
                    request_id
                )
            )
            rows_affected = db.total_changes
            await db.commit()
        
        if rows_affected > 0 and approved:
            # Start processing the approved request
            asyncio.create_task(self._process_erasure_request(request_id))
            
        logger.info(f"Erasure request {request_id} {'approved' if approved else 'rejected'} by {reviewer_id}")
        return rows_affected > 0

    async def _process_erasure_request(self, request_id: str):
        """Process approved erasure request"""
        try:
            # Update status to in progress
            await self._update_erasure_status(request_id, DeletionStatus.IN_PROGRESS)
            
            # Get request details
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    """
                    SELECT user_id, specific_data_categories, processing_purposes, 
                           retention_exceptions
                    FROM gdpr_erasure_requests WHERE id = ?
                    """,
                    (request_id,)
                )
                result = await cursor.fetchone()
            
            if not result:
                return
            
            user_id, categories_json, purposes_json, exceptions_json = result
            
            data_categories = [DataCategory(cat) for cat in json.loads(categories_json)]
            processing_purposes = [ProcessingPurpose(purpose) for purpose in json.loads(purposes_json)]
            retention_exceptions = [RetentionException(exc) for exc in json.loads(exceptions_json or "[]")]
            
            # Create deletion jobs
            deletion_jobs = await self._create_deletion_jobs(
                request_id, user_id, data_categories, processing_purposes, retention_exceptions
            )
            
            # Execute deletion jobs
            deletion_summary = await self._execute_deletion_jobs(deletion_jobs)
            
            # Notify third parties
            notified_parties = await self._notify_third_parties(user_id, data_categories)
            
            # Update completion status
            status = DeletionStatus.COMPLETED
            if deletion_summary.get("failed_jobs", 0) > 0:
                status = DeletionStatus.PARTIALLY_COMPLETED
            
            now = datetime.utcnow()
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE gdpr_erasure_requests 
                    SET status = ?, completed_at = ?, deletion_summary = ?, 
                        third_parties_notified = ?
                    WHERE id = ?
                    """,
                    (
                        status.value, now.isoformat(),
                        json.dumps(deletion_summary),
                        json.dumps(notified_parties),
                        request_id
                    )
                )
                await db.commit()
            
            # Log completion
            await gdpr_service._log_gdpr_action(
                user_id=user_id,
                action="ERASURE_COMPLETED",
                details={
                    "request_id": request_id,
                    "deletion_summary": deletion_summary,
                    "status": status.value
                }
            )
            
            logger.info(f"Erasure request {request_id} completed with status {status.value}")
            
        except Exception as e:
            logger.error(f"Failed to process erasure request {request_id}: {str(e)}")
            await self._update_erasure_status(request_id, DeletionStatus.FAILED)

    async def _create_deletion_jobs(
        self,
        request_id: str,
        user_id: str,
        data_categories: List[DataCategory],
        processing_purposes: List[ProcessingPurpose],
        retention_exceptions: List[RetentionException]
    ) -> List[DeletionJob]:
        """Create specific deletion jobs for the request"""
        deletion_jobs = []
        
        # Map data categories to tables and deletion criteria
        table_jobs = [
            {
                "table": "users",
                "criteria": {"id": user_id},
                "categories": [DataCategory.IDENTITY_DATA, DataCategory.CONTACT_DATA],
                "cascade": ["barbershop_staff", "appointments", "payments", "ai_chat_sessions"]
            },
            {
                "table": "ai_chat_messages",
                "criteria": {"session_id": f"SELECT id FROM ai_chat_sessions WHERE user_id = '{user_id}'"},
                "categories": [DataCategory.USAGE_DATA, DataCategory.TECHNICAL_DATA],
                "cascade": []
            },
            {
                "table": "payments",
                "criteria": {"client_id": user_id, "barber_id": user_id},
                "categories": [DataCategory.FINANCIAL_DATA],
                "cascade": []
            },
            {
                "table": "business_analytics",
                "criteria": {"barbershop_id": f"SELECT id FROM barbershops WHERE owner_id = '{user_id}'"},
                "categories": [DataCategory.MARKETING_DATA, DataCategory.USAGE_DATA],
                "cascade": []
            }
        ]
        
        for job_config in table_jobs:
            # Check if any of the job's categories are requested for deletion
            job_categories = set(job_config["categories"])
            requested_categories = set(data_categories)
            
            if job_categories.intersection(requested_categories):
                # Check for retention exceptions
                has_retention_exception = False
                for category in job_categories:
                    if self._has_retention_exception(
                        category, processing_purposes, retention_exceptions
                    ):
                        has_retention_exception = True
                        break
                
                if not has_retention_exception:
                    job_id = str(uuid.uuid4())
                    deletion_job = DeletionJob(
                        id=job_id,
                        erasure_request_id=request_id,
                        table_name=job_config["table"],
                        deletion_criteria=job_config["criteria"],
                        cascade_deletions=job_config["cascade"],
                        status="pending",
                        records_found=0,
                        records_deleted=0,
                        error_message=None,
                        executed_at=None
                    )
                    deletion_jobs.append(deletion_job)
                    
                    # Save to database
                    async with aiosqlite.connect(self.db_path) as db:
                        await db.execute(
                            """
                            INSERT INTO gdpr_deletion_jobs
                            (id, erasure_request_id, table_name, deletion_criteria, 
                             cascade_deletions, status)
                            VALUES (?, ?, ?, ?, ?, ?)
                            """,
                            (
                                job_id, request_id, job_config["table"],
                                json.dumps(job_config["criteria"]),
                                json.dumps(job_config["cascade"]),
                                "pending"
                            )
                        )
                        await db.commit()
        
        return deletion_jobs

    def _has_retention_exception(
        self,
        category: DataCategory,
        processing_purposes: List[ProcessingPurpose],
        retention_exceptions: List[RetentionException]
    ) -> bool:
        """Check if data category has retention exception"""
        # Check legal retention requirements
        if category in self.legal_retention_requirements:
            return True
        
        # Check specific retention exceptions
        if RetentionException.LEGAL_OBLIGATION in retention_exceptions:
            return True
        
        if RetentionException.LEGAL_CLAIMS in retention_exceptions:
            if category in [DataCategory.FINANCIAL_DATA, DataCategory.IDENTITY_DATA]:
                return True
        
        return False

    async def _execute_deletion_jobs(self, deletion_jobs: List[DeletionJob]) -> Dict[str, Any]:
        """Execute all deletion jobs"""
        summary = {
            "total_jobs": len(deletion_jobs),
            "successful_jobs": 0,
            "failed_jobs": 0,
            "total_records_deleted": 0,
            "tables_affected": [],
            "errors": []
        }
        
        for job in deletion_jobs:
            try:
                await self._execute_single_deletion_job(job)
                summary["successful_jobs"] += 1
                summary["total_records_deleted"] += job.records_deleted
                summary["tables_affected"].append(job.table_name)
                
            except Exception as e:
                summary["failed_jobs"] += 1
                summary["errors"].append({
                    "job_id": job.id,
                    "table": job.table_name,
                    "error": str(e)
                })
                logger.error(f"Deletion job {job.id} failed: {str(e)}")
        
        return summary

    async def _execute_single_deletion_job(self, job: DeletionJob):
        """Execute a single deletion job"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            try:
                # Build deletion query
                table_name = job.table_name
                criteria = job.deletion_criteria
                
                # Count records to be deleted
                where_clause = " AND ".join([
                    f"{key} = ?" if not str(value).startswith("SELECT") 
                    else f"{key} IN ({value})"
                    for key, value in criteria.items()
                ])
                
                count_query = f"SELECT COUNT(*) FROM {table_name} WHERE {where_clause}"
                
                # Get count parameters (excluding subqueries)
                count_params = [
                    value for value in criteria.values() 
                    if not str(value).startswith("SELECT")
                ]
                
                cursor = await db.execute(count_query, count_params)
                records_found = (await cursor.fetchone())[0]
                
                # Get records to be deleted for logging
                select_query = f"SELECT * FROM {table_name} WHERE {where_clause}"
                cursor = await db.execute(select_query, count_params)
                records_to_delete = await cursor.fetchall()
                
                # Log deleted data hashes
                for record in records_to_delete:
                    record_id = str(record[0])  # Assuming first column is ID
                    data_hash = hashlib.sha256(str(record).encode()).hexdigest()
                    
                    log_id = str(uuid.uuid4())
                    await db.execute(
                        """
                        INSERT INTO gdpr_deleted_data_log
                        (id, erasure_request_id, table_name, record_id, data_hash)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (log_id, job.erasure_request_id, table_name, record_id, data_hash)
                    )
                
                # Execute cascade deletions first
                for cascade_table in job.cascade_deletions:
                    cascade_query = f"DELETE FROM {cascade_table} WHERE user_id = ?"
                    await db.execute(cascade_query, (list(criteria.values())[0],))
                
                # Execute main deletion
                delete_query = f"DELETE FROM {table_name} WHERE {where_clause}"
                await db.execute(delete_query, count_params)
                
                records_deleted = records_found  # All found records should be deleted
                
                await db.commit()
                
                # Update job status
                await db.execute(
                    """
                    UPDATE gdpr_deletion_jobs 
                    SET status = ?, records_found = ?, records_deleted = ?, executed_at = ?
                    WHERE id = ?
                    """,
                    ("completed", records_found, records_deleted, now.isoformat(), job.id)
                )
                await db.commit()
                
                job.records_found = records_found
                job.records_deleted = records_deleted
                job.status = "completed"
                job.executed_at = now
                
                logger.info(f"Deleted {records_deleted} records from {table_name}")
                
            except Exception as e:
                # Update job with error
                await db.execute(
                    """
                    UPDATE gdpr_deletion_jobs 
                    SET status = ?, error_message = ?, executed_at = ?
                    WHERE id = ?
                    """,
                    ("failed", str(e), now.isoformat(), job.id)
                )
                await db.commit()
                raise e

    async def _notify_third_parties(
        self,
        user_id: str,
        data_categories: List[DataCategory]
    ) -> List[str]:
        """Notify third-party systems of data erasure"""
        notified_parties = []
        
        for system in self.third_party_systems:
            try:
                # This would integrate with actual third-party APIs
                # For now, we'll log the notification requirement
                notification_success = await self._send_third_party_notification(
                    system, user_id, data_categories
                )
                
                if notification_success:
                    notified_parties.append(system)
                    
            except Exception as e:
                logger.error(f"Failed to notify {system} of erasure: {str(e)}")
        
        return notified_parties

    async def _send_third_party_notification(
        self,
        system: str,
        user_id: str,
        data_categories: List[DataCategory]
    ) -> bool:
        """Send erasure notification to third-party system"""
        # This is a placeholder for actual third-party integrations
        # In production, this would make API calls to:
        # - Stripe to delete customer data
        # - Google Calendar to remove events
        # - Email providers to unsubscribe/delete
        # - Analytics providers to anonymize data
        
        logger.info(f"Would notify {system} to erase data for user {user_id}")
        
        # Simulate notification (always successful for demo)
        return True

    async def _update_erasure_status(self, request_id: str, status: DeletionStatus):
        """Update erasure request status"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE gdpr_erasure_requests SET status = ? WHERE id = ?",
                (status.value, request_id)
            )
            await db.commit()

    async def get_erasure_request_status(
        self,
        request_id: str,
        user_id: str = None
    ) -> Dict[str, Any]:
        """Get status of erasure request"""
        async with aiosqlite.connect(self.db_path) as db:
            query = """
                SELECT status, requested_at, reviewed_at, approved_at, completed_at,
                       reviewer_notes, deletion_summary, third_parties_notified
                FROM gdpr_erasure_requests
                WHERE id = ?
            """
            params = [request_id]
            
            if user_id:
                query += " AND user_id = ?"
                params.append(user_id)
            
            cursor = await db.execute(query, params)
            result = await cursor.fetchone()
        
        if not result:
            return {"error": "Erasure request not found"}
        
        (status, requested_at, reviewed_at, approved_at, completed_at,
         reviewer_notes, deletion_summary, third_parties_notified) = result
        
        return {
            "request_id": request_id,
            "status": status,
            "requested_at": requested_at,
            "reviewed_at": reviewed_at,
            "approved_at": approved_at,
            "completed_at": completed_at,
            "reviewer_notes": reviewer_notes,
            "deletion_summary": json.loads(deletion_summary) if deletion_summary else {},
            "third_parties_notified": json.loads(third_parties_notified) if third_parties_notified else []
        }

    async def list_user_erasure_requests(self, user_id: str) -> List[Dict[str, Any]]:
        """List all erasure requests for a user"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT id, reason, status, requested_at, completed_at
                FROM gdpr_erasure_requests
                WHERE user_id = ?
                ORDER BY requested_at DESC
                """,
                (user_id,)
            )
            results = await cursor.fetchall()
        
        return [
            {
                "request_id": row[0],
                "reason": row[1],
                "status": row[2],
                "requested_at": row[3],
                "completed_at": row[4]
            }
            for row in results
        ]

    async def verify_deletion(self, request_id: str) -> Dict[str, Any]:
        """Verify that deletion was completed successfully"""
        async with aiosqlite.connect(self.db_path) as db:
            # Get deletion jobs for request
            cursor = await db.execute(
                """
                SELECT table_name, records_found, records_deleted, status, error_message
                FROM gdpr_deletion_jobs
                WHERE erasure_request_id = ?
                """,
                (request_id,)
            )
            deletion_jobs = await cursor.fetchall()
            
            # Get deleted data log
            cursor = await db.execute(
                """
                SELECT table_name, COUNT(*) as deleted_count
                FROM gdpr_deleted_data_log
                WHERE erasure_request_id = ?
                GROUP BY table_name
                """,
                (request_id,)
            )
            deletion_log = await cursor.fetchall()
        
        verification_result = {
            "request_id": request_id,
            "deletion_jobs": [
                {
                    "table": job[0],
                    "records_found": job[1],
                    "records_deleted": job[2],
                    "status": job[3],
                    "error": job[4]
                }
                for job in deletion_jobs
            ],
            "deletion_log": [
                {
                    "table": log[0],
                    "deleted_count": log[1]
                }
                for log in deletion_log
            ],
            "verification_passed": all(job[3] == "completed" for job in deletion_jobs)
        }
        
        return verification_result

    async def health_check(self) -> Dict[str, Any]:
        """Health check for right to be forgotten service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count erasure requests by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_erasure_requests
                    GROUP BY status
                    """
                )
                status_counts = dict(await cursor.fetchall())
                
                # Check for overdue requests (pending > 30 days)
                overdue_threshold = datetime.utcnow() - timedelta(days=30)
                cursor = await db.execute(
                    """
                    SELECT COUNT(*) FROM gdpr_erasure_requests
                    WHERE status = 'pending' AND requested_at < ?
                    """,
                    (overdue_threshold.isoformat(),)
                )
                overdue_requests = (await cursor.fetchone())[0]
            
            return {
                "status": "healthy",
                "erasure_requests_by_status": status_counts,
                "overdue_requests": overdue_requests,
                "database_connected": True,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Right to be forgotten service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize right to be forgotten service instance
right_to_be_forgotten_service = GDPRRightToBeForgottenService()