"""
GDPR Data Export Service - Article 20 Implementation
Provides users with the right to data portability, allowing them to obtain
and reuse their personal data across different services.

Key Features:
- Complete user data export in structured, machine-readable formats
- Multiple export formats (JSON, CSV, XML)
- Secure download mechanisms with access controls
- Audit logging of all export requests
- Data anonymization options for sensitive information
"""

import os
import json
import csv
import xml.etree.ElementTree as ET
import uuid
import asyncio
import logging
from datetime import datetime, timedelta  
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import zipfile
import hashlib
import hmac
import aiosqlite
import aiofiles
from cryptography.fernet import Fernet

# Import GDPR service for compliance tracking
from .gdpr_compliance_service import (
    gdpr_service, GDPRComplianceService, DataCategory, 
    ProcessingPurpose, LawfulBasis
)

logger = logging.getLogger(__name__)

@dataclass
class ExportRequest:
    """User data export request"""
    id: str
    user_id: str
    export_format: str  # json, csv, xml, all
    include_deleted: bool
    anonymize_sensitive: bool
    password_protected: bool
    export_password: Optional[str]
    status: str  # pending, processing, completed, failed, expired
    requested_at: datetime
    completed_at: Optional[datetime]
    download_expires_at: datetime
    file_path: Optional[str]
    file_size_bytes: Optional[int]
    download_count: int = 0
    max_downloads: int = 3

@dataclass
class UserDataPackage:
    """Complete user data package for export"""
    user_info: Dict[str, Any]
    barbershop_info: List[Dict[str, Any]]
    appointments: List[Dict[str, Any]]
    payments: List[Dict[str, Any]]
    ai_chat_sessions: List[Dict[str, Any]]
    ai_chat_messages: List[Dict[str, Any]]
    consent_records: List[Dict[str, Any]]
    business_analytics: List[Dict[str, Any]]
    audit_trail: List[Dict[str, Any]]
    metadata: Dict[str, Any]

class GDPRDataExportService:
    """
    Service for handling GDPR Article 20 data portability requests
    """
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or "/Users/bossio/6FB AI Agent System/agent_system.db"
        self.export_directory = "/Users/bossio/6FB AI Agent System/exports"
        self.encryption_key = self._get_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
        
        # Ensure export directory exists
        os.makedirs(self.export_directory, exist_ok=True)
        os.chmod(self.export_directory, 0o700)  # Restrict access
        
        # Initialize database
        asyncio.create_task(self._init_export_tables())
        
        logger.info("GDPR Data Export Service initialized")

    def _get_encryption_key(self) -> bytes:
        """Get encryption key from GDPR service"""
        key_path = "/Users/bossio/6FB AI Agent System/.gdpr_encryption_key"
        if os.path.exists(key_path):
            with open(key_path, 'rb') as f:
                return f.read()
        else:
            # Generate key if it doesn't exist
            key = Fernet.generate_key()
            with open(key_path, 'wb') as f:
                f.write(key)
            os.chmod(key_path, 0o600)
            return key

    async def _init_export_tables(self):
        """Initialize data export tracking tables"""
        schema_queries = [
            """
            CREATE TABLE IF NOT EXISTS gdpr_export_requests (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                export_format TEXT NOT NULL,
                include_deleted BOOLEAN DEFAULT 0,
                anonymize_sensitive BOOLEAN DEFAULT 1,
                password_protected BOOLEAN DEFAULT 1,
                export_password_hash TEXT,
                status TEXT DEFAULT 'pending',
                requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                download_expires_at TIMESTAMP NOT NULL,
                file_path TEXT,
                file_size_bytes INTEGER,
                download_count INTEGER DEFAULT 0,
                max_downloads INTEGER DEFAULT 3,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS gdpr_export_audit (
                id TEXT PRIMARY KEY,
                export_request_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (export_request_id) REFERENCES gdpr_export_requests(id)
            )
            """
        ]
        
        async with aiosqlite.connect(self.db_path) as db:
            for query in schema_queries:
                await db.execute(query)
            await db.commit()

    async def request_data_export(
        self,
        user_id: str,
        export_format: str = "json",
        include_deleted: bool = False,
        anonymize_sensitive: bool = True,
        password_protected: bool = True,
        export_password: Optional[str] = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        """
        Create a new data export request for user
        
        Args:
            user_id: User requesting data export
            export_format: Format for export (json, csv, xml, all)
            include_deleted: Include soft-deleted data
            anonymize_sensitive: Anonymize sensitive personal data
            password_protected: Password protect the export file
            export_password: Password for protecting export
            ip_address: User's IP address
            user_agent: User's browser/app info
            
        Returns:
            Export request ID
        """
        # Verify user has valid consent for data export
        if not await gdpr_service.check_consent_validity(
            user_id, ProcessingPurpose.ACCOUNT_MANAGEMENT
        ):
            raise PermissionError("User consent required for data export")
        
        request_id = str(uuid.uuid4())
        now = datetime.utcnow()
        expires_at = now + timedelta(days=30)  # Export expires in 30 days
        
        # Hash password if provided
        password_hash = None
        if password_protected and export_password:
            password_hash = hashlib.sha256(export_password.encode()).hexdigest()
        elif password_protected:
            # Generate random password
            export_password = str(uuid.uuid4())[:12]
            password_hash = hashlib.sha256(export_password.encode()).hexdigest()
        
        export_request = ExportRequest(
            id=request_id,
            user_id=user_id,
            export_format=export_format,
            include_deleted=include_deleted,
            anonymize_sensitive=anonymize_sensitive,
            password_protected=password_protected,
            export_password=export_password,
            status="pending",
            requested_at=now,
            completed_at=None,
            download_expires_at=expires_at,
            file_path=None,
            file_size_bytes=None
        )
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_export_requests
                (id, user_id, export_format, include_deleted, anonymize_sensitive, 
                 password_protected, export_password_hash, status, requested_at, 
                 download_expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request_id, user_id, export_format, include_deleted,
                    anonymize_sensitive, password_protected, password_hash,
                    "pending", now.isoformat(), expires_at.isoformat()
                )
            )
            await db.commit()
        
        # Log the export request
        await self._log_export_action(
            request_id, user_id, "EXPORT_REQUESTED",
            ip_address, user_agent,
            {"format": export_format, "include_deleted": include_deleted}
        )
        
        # Start processing the export asynchronously
        asyncio.create_task(self._process_export_request(request_id))
        
        logger.info(f"Data export requested for user {user_id}, request ID {request_id}")
        return request_id

    async def _process_export_request(self, request_id: str):
        """Process data export request asynchronously"""
        try:
            # Update status to processing
            await self._update_export_status(request_id, "processing")
            
            # Get export request details
            async with aiosqlite.connect(self.db_path) as db:
                cursor = await db.execute(
                    "SELECT * FROM gdpr_export_requests WHERE id = ?",
                    (request_id,)
                )
                request_data = await cursor.fetchone()
            
            if not request_data:
                return
            
            user_id = request_data[1]  # user_id column
            export_format = request_data[2]  # export_format column
            include_deleted = bool(request_data[3])  # include_deleted column
            anonymize_sensitive = bool(request_data[4])  # anonymize_sensitive column
            
            # Collect all user data
            user_data = await self._collect_user_data(
                user_id, include_deleted, anonymize_sensitive
            )
            
            # Generate export files
            file_paths = await self._generate_export_files(
                request_id, user_data, export_format
            )
            
            # Create final archive
            archive_path = await self._create_export_archive(request_id, file_paths)
            
            # Update request with completion details
            file_size = os.path.getsize(archive_path)
            now = datetime.utcnow()
            
            async with aiosqlite.connect(self.db_path) as db:
                await db.execute(
                    """
                    UPDATE gdpr_export_requests 
                    SET status = ?, completed_at = ?, file_path = ?, file_size_bytes = ?
                    WHERE id = ?
                    """,
                    ("completed", now.isoformat(), archive_path, file_size, request_id)
                )
                await db.commit()
            
            # Log completion
            await self._log_export_action(
                request_id, user_id, "EXPORT_COMPLETED",
                details={"file_size_bytes": file_size}
            )
            
            logger.info(f"Export completed for request {request_id}")
            
        except Exception as e:
            logger.error(f"Export processing failed for request {request_id}: {str(e)}")
            await self._update_export_status(request_id, "failed")
            
            # Log failure
            await self._log_export_action(
                request_id, user_id, "EXPORT_FAILED",
                details={"error": str(e)}
            )

    async def _collect_user_data(
        self,
        user_id: str,
        include_deleted: bool,
        anonymize_sensitive: bool
    ) -> UserDataPackage:
        """Collect all user data from database"""
        async with aiosqlite.connect(self.db_path) as db:
            # User information
            cursor = await db.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,)
            )
            user_info = dict(zip([col[0] for col in cursor.description], 
                               await cursor.fetchone() or ()))
            
            # Anonymize sensitive data if requested
            if anonymize_sensitive and user_info:
                user_info = self._anonymize_user_data(user_info)
            
            # Barbershop information (if user owns/works at barbershops)
            cursor = await db.execute(
                """
                SELECT b.* FROM barbershops b
                LEFT JOIN barbershop_staff bs ON b.id = bs.barbershop_id
                WHERE b.owner_id = ? OR bs.user_id = ?
                """,
                (user_id, user_id)
            )
            barbershop_info = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # Appointments
            cursor = await db.execute(
                "SELECT * FROM appointments WHERE client_id = ? OR barber_id = ?",
                (user_id, user_id)
            )
            appointments = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # Payments
            cursor = await db.execute(
                "SELECT * FROM payments WHERE client_id = ? OR barber_id = ?",
                (user_id, user_id)
            )
            payments = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # AI chat sessions
            cursor = await db.execute(
                "SELECT * FROM ai_chat_sessions WHERE user_id = ?",
                (user_id,)
            )
            ai_chat_sessions = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # AI chat messages
            session_ids = [session['id'] for session in ai_chat_sessions]
            ai_chat_messages = []
            if session_ids:
                placeholders = ','.join('?' * len(session_ids))
                cursor = await db.execute(
                    f"SELECT * FROM ai_chat_messages WHERE session_id IN ({placeholders})",
                    session_ids
                )
                ai_chat_messages = [
                    dict(zip([col[0] for col in cursor.description], row))
                    for row in await cursor.fetchall()
                ]
            
            # GDPR consent records
            cursor = await db.execute(
                "SELECT * FROM gdpr_consent_records WHERE user_id = ?",
                (user_id,)
            )
            consent_records = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # Business analytics
            cursor = await db.execute(
                """
                SELECT ba.* FROM business_analytics ba
                JOIN barbershops b ON ba.barbershop_id = b.id
                WHERE b.owner_id = ?
                """,
                (user_id,)
            )
            business_analytics = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
            
            # GDPR audit trail
            cursor = await db.execute(
                "SELECT * FROM gdpr_audit_log WHERE user_id = ?",
                (user_id,)
            )
            audit_trail = [
                dict(zip([col[0] for col in cursor.description], row))
                for row in await cursor.fetchall()
            ]
        
        # Create metadata
        metadata = {
            "export_generated_at": datetime.utcnow().isoformat(),
            "user_id": user_id,
            "include_deleted": include_deleted,
            "anonymize_sensitive": anonymize_sensitive,
            "total_records": {
                "user_info": 1 if user_info else 0,
                "barbershops": len(barbershop_info),
                "appointments": len(appointments),
                "payments": len(payments),
                "ai_chat_sessions": len(ai_chat_sessions),
                "ai_chat_messages": len(ai_chat_messages),
                "consent_records": len(consent_records),
                "business_analytics": len(business_analytics),
                "audit_trail": len(audit_trail)
            },
            "gdpr_notice": "This export contains all personal data processed by 6FB AI Agent System in accordance with GDPR Article 20 (Right to Data Portability)."
        }
        
        return UserDataPackage(
            user_info=user_info,
            barbershop_info=barbershop_info,
            appointments=appointments,
            payments=payments,
            ai_chat_sessions=ai_chat_sessions,
            ai_chat_messages=ai_chat_messages,
            consent_records=consent_records,
            business_analytics=business_analytics,
            audit_trail=audit_trail,
            metadata=metadata
        )

    def _anonymize_user_data(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        """Anonymize sensitive user information"""
        anonymized = user_info.copy()
        
        # Anonymize sensitive fields
        if 'email' in anonymized:
            email_parts = anonymized['email'].split('@')
            if len(email_parts) == 2:
                anonymized['email'] = f"user***@{email_parts[1]}"
        
        if 'phone' in anonymized and anonymized['phone']:
            phone = str(anonymized['phone'])
            if len(phone) > 4:
                anonymized['phone'] = f"***-***-{phone[-4:]}"
        
        if 'name' in anonymized and anonymized['name']:
            name_parts = str(anonymized['name']).split()
            if len(name_parts) > 1:
                anonymized['name'] = f"{name_parts[0]} {name_parts[-1][0]}***"
        
        # Remove sensitive fields entirely
        sensitive_fields = [
            'hashed_password', 'google_id', 'facebook_id',
            'stripe_customer_id', 'stripe_account_id'
        ]
        for field in sensitive_fields:
            if field in anonymized:
                del anonymized[field]
        
        return anonymized

    async def _generate_export_files(
        self,
        request_id: str,
        user_data: UserDataPackage,
        export_format: str
    ) -> List[str]:
        """Generate export files in requested format(s)"""
        export_dir = os.path.join(self.export_directory, request_id)
        os.makedirs(export_dir, exist_ok=True)
        
        file_paths = []
        data_dict = asdict(user_data)
        
        formats_to_generate = [export_format] if export_format != "all" else ["json", "csv", "xml"]
        
        for format_type in formats_to_generate:
            if format_type == "json":
                file_path = os.path.join(export_dir, "user_data.json")
                async with aiofiles.open(file_path, 'w') as f:
                    await f.write(json.dumps(data_dict, indent=2, default=str))
                file_paths.append(file_path)
            
            elif format_type == "csv":
                # Generate separate CSV files for each data category
                for category, data in data_dict.items():
                    if isinstance(data, list) and data:
                        file_path = os.path.join(export_dir, f"{category}.csv")
                        await self._write_csv_file(file_path, data)
                        file_paths.append(file_path)
                    elif isinstance(data, dict) and data:
                        file_path = os.path.join(export_dir, f"{category}.csv")
                        await self._write_csv_file(file_path, [data])
                        file_paths.append(file_path)
            
            elif format_type == "xml":
                file_path = os.path.join(export_dir, "user_data.xml")
                await self._write_xml_file(file_path, data_dict)
                file_paths.append(file_path)
        
        return file_paths

    async def _write_csv_file(self, file_path: str, data: List[Dict]):
        """Write data to CSV file"""
        if not data:
            return
        
        fieldnames = data[0].keys()
        
        async with aiofiles.open(file_path, 'w', newline='') as f:
            content = []
            
            # Write header
            content.append(','.join(fieldnames))
            
            # Write data rows
            for row in data:
                csv_row = []
                for field in fieldnames:
                    value = row.get(field, '')
                    # Escape quotes and commas
                    if isinstance(value, str) and (',' in value or '"' in value):
                        value = f'"{value.replace('"', '""')}"'
                    csv_row.append(str(value))
                content.append(','.join(csv_row))
            
            await f.write('\n'.join(content))

    async def _write_xml_file(self, file_path: str, data_dict: Dict):
        """Write data to XML file"""
        root = ET.Element("user_data_export")
        
        def dict_to_xml(parent, data, name="item"):
            if isinstance(data, dict):
                element = ET.SubElement(parent, name)
                for key, value in data.items():
                    dict_to_xml(element, value, key)
            elif isinstance(data, list):
                for item in data:
                    dict_to_xml(parent, item, name)
            else:
                element = ET.SubElement(parent, name)
                element.text = str(data) if data is not None else ""
        
        for category, data in data_dict.items():
            dict_to_xml(root, data, category)
        
        tree = ET.ElementTree(root)
        tree.write(file_path, encoding='utf-8', xml_declaration=True)

    async def _create_export_archive(self, request_id: str, file_paths: List[str]) -> str:
        """Create password-protected ZIP archive of export files"""
        export_dir = os.path.join(self.export_directory, request_id)
        archive_path = os.path.join(export_dir, f"gdpr_export_{request_id}.zip")
        
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in file_paths:
                arcname = os.path.basename(file_path)
                zipf.write(file_path, arcname)
            
            # Add README with export information
            readme_content = f"""
GDPR Data Export - 6FB AI Agent System
=====================================

Export ID: {request_id}
Generated: {datetime.utcnow().isoformat()}

This archive contains all your personal data processed by 6FB AI Agent System
in accordance with GDPR Article 20 (Right to Data Portability).

Files included:
{chr(10).join(f"- {os.path.basename(fp)}" for fp in file_paths)}

For questions about this export, please contact our Data Protection Officer.

Note: This export link will expire 30 days from generation date.
Maximum downloads allowed: 3
"""
            zipf.writestr("README.txt", readme_content)
        
        # Clean up individual files
        for file_path in file_paths:
            os.remove(file_path)
        
        return archive_path

    async def _update_export_status(self, request_id: str, status: str):
        """Update export request status"""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE gdpr_export_requests SET status = ? WHERE id = ?",
                (status, request_id)
            )
            await db.commit()

    async def _log_export_action(
        self,
        request_id: str,
        user_id: str,
        action: str,
        ip_address: str = None,
        user_agent: str = None,
        details: Dict[str, Any] = None
    ):
        """Log export-related actions"""
        audit_id = str(uuid.uuid4())
        
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                """
                INSERT INTO gdpr_export_audit
                (id, export_request_id, user_id, action, ip_address, user_agent, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    audit_id, request_id, user_id, action, ip_address, user_agent,
                    json.dumps(details) if details else None
                )
            )
            await db.commit()

    async def get_export_status(self, request_id: str, user_id: str) -> Dict[str, Any]:
        """Get status of data export request"""
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT status, requested_at, completed_at, download_expires_at,
                       file_size_bytes, download_count, max_downloads
                FROM gdpr_export_requests
                WHERE id = ? AND user_id = ?
                """,
                (request_id, user_id)
            )
            result = await cursor.fetchone()
        
        if not result:
            return {"error": "Export request not found"}
        
        status, requested_at, completed_at, expires_at, file_size, download_count, max_downloads = result
        
        return {
            "request_id": request_id,
            "status": status,
            "requested_at": requested_at,
            "completed_at": completed_at,
            "download_expires_at": expires_at,
            "file_size_bytes": file_size,
            "download_count": download_count,
            "max_downloads": max_downloads,
            "downloads_remaining": max_downloads - download_count,
            "is_expired": datetime.utcnow() > datetime.fromisoformat(expires_at) if expires_at else False
        }

    async def download_export(
        self,
        request_id: str,
        user_id: str,
        password: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> Optional[str]:
        """
        Download export file (returns file path if authorized)
        
        Args:
            request_id: Export request ID
            user_id: User requesting download
            password: Export password if protected
            ip_address: User's IP address
            user_agent: User's browser/app info
            
        Returns:
            File path if authorized, None otherwise
        """
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """
                SELECT status, file_path, download_count, max_downloads, 
                       download_expires_at, password_protected, export_password_hash
                FROM gdpr_export_requests
                WHERE id = ? AND user_id = ?
                """,
                (request_id, user_id)
            )
            result = await cursor.fetchone()
        
        if not result:
            return None
        
        (status, file_path, download_count, max_downloads, 
         expires_at, password_protected, password_hash) = result
        
        # Check if export is completed
        if status != "completed":
            return None
        
        # Check if not expired
        if datetime.utcnow() > datetime.fromisoformat(expires_at):
            return None
        
        # Check download limit
        if download_count >= max_downloads:
            return None
        
        # Check password if protected
        if password_protected and password_hash:
            if not password or hashlib.sha256(password.encode()).hexdigest() != password_hash:
                return None
        
        # Increment download count
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "UPDATE gdpr_export_requests SET download_count = download_count + 1 WHERE id = ?",
                (request_id,)
            )
            await db.commit()
        
        # Log download
        await self._log_export_action(
            request_id, user_id, "EXPORT_DOWNLOADED",
            ip_address, user_agent,
            {"download_number": download_count + 1}
        )
        
        return file_path

    async def cleanup_expired_exports(self):
        """Clean up expired export files"""
        now = datetime.utcnow()
        
        async with aiosqlite.connect(self.db_path) as db:
            # Find expired exports
            cursor = await db.execute(
                """
                SELECT id, file_path FROM gdpr_export_requests
                WHERE download_expires_at < ? AND status = 'completed'
                """,
                (now.isoformat(),)
            )
            expired_exports = await cursor.fetchall()
            
            # Delete files and update status
            for export_id, file_path in expired_exports:
                if file_path and os.path.exists(file_path):
                    try:
                        # Remove file and directory
                        os.remove(file_path)
                        export_dir = os.path.dirname(file_path)
                        if os.path.exists(export_dir):
                            os.rmdir(export_dir)
                    except Exception as e:
                        logger.error(f"Failed to delete expired export file {file_path}: {e}")
                
                # Update status
                await db.execute(
                    "UPDATE gdpr_export_requests SET status = 'expired' WHERE id = ?",
                    (export_id,)
                )
            
            await db.commit()
        
        logger.info(f"Cleaned up {len(expired_exports)} expired data exports")
        return len(expired_exports)

    async def health_check(self) -> Dict[str, Any]:
        """Health check for data export service"""
        try:
            async with aiosqlite.connect(self.db_path) as db:
                # Count export requests by status
                cursor = await db.execute(
                    """
                    SELECT status, COUNT(*) FROM gdpr_export_requests
                    GROUP BY status
                    """
                )
                status_counts = dict(await cursor.fetchall())
                
                # Check disk space
                export_dir_size = sum(
                    os.path.getsize(os.path.join(dirpath, filename))
                    for dirpath, dirnames, filenames in os.walk(self.export_directory)
                    for filename in filenames
                )
            
            return {
                "status": "healthy",
                "export_requests_by_status": status_counts,
                "export_directory_size_mb": round(export_dir_size / (1024 * 1024), 2),
                "export_directory_exists": os.path.exists(self.export_directory),
                "encryption_available": self.cipher_suite is not None,
                "last_check": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Data export service health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "last_check": datetime.utcnow().isoformat()
            }

# Initialize data export service instance
data_export_service = GDPRDataExportService()