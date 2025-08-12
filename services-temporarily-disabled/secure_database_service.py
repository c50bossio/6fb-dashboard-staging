#!/usr/bin/env python3
"""
Secure Database Service for 6FB AI Agent System
Implements encryption at rest, secure connections, audit logging,
and GDPR compliance features for database operations.
"""

import os
import sqlite3
import asyncio
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from contextlib import asynccontextmanager, contextmanager
import hashlib
import json
from cryptography.fernet import Fernet
import base64
import aiosqlite
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class DatabaseConfig:
    """Database configuration with security settings"""
    database_path: str
    encryption_enabled: bool = True
    backup_enabled: bool = True
    audit_enabled: bool = True
    connection_timeout: int = 30
    max_connections: int = 10
    enable_foreign_keys: bool = True
    enable_wal_mode: bool = True
    backup_retention_days: int = 30

class DatabaseEncryption:
    """Database field encryption service"""
    
    def __init__(self, encryption_key: bytes):
        self.cipher_suite = Fernet(encryption_key)
        
        # Define which fields should be encrypted
        self.encrypted_fields = {
            'users': ['email', 'password_hash', 'phone_number', 'address'],
            'customers': ['email', 'phone_number', 'address', 'notes'],
            'chat_history': ['message', 'response'],
            'shop_profiles': ['profile_data', 'contact_info'],
            'bookings': ['customer_notes', 'special_requests'],
            'payments': ['card_last_four', 'billing_address']
        }
        
        # Fields that should be hashed instead of encrypted (for searching)
        self.hashed_fields = {
            'users': ['email_hash'],
            'customers': ['email_hash', 'phone_hash']
        }
    
    def should_encrypt_field(self, table: str, field: str) -> bool:
        """Check if field should be encrypted"""
        return table in self.encrypted_fields and field in self.encrypted_fields[table]
    
    def should_hash_field(self, table: str, field: str) -> bool:
        """Check if field should be hashed"""
        return table in self.hashed_fields and field in self.hashed_fields[table]
    
    def encrypt_value(self, value: str) -> str:
        """Encrypt a string value"""
        if not value:
            return value
        
        try:
            encrypted = self.cipher_suite.encrypt(value.encode('utf-8'))
            return base64.urlsafe_b64encode(encrypted).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption error: {e}")
            raise
    
    def decrypt_value(self, encrypted_value: str) -> str:
        """Decrypt a string value"""
        if not encrypted_value:
            return encrypted_value
        
        try:
            decoded = base64.urlsafe_b64decode(encrypted_value.encode('utf-8'))
            decrypted = self.cipher_suite.decrypt(decoded)
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise
    
    def hash_value(self, value: str, salt: str = None) -> str:
        """Create a searchable hash of a value"""
        if not value:
            return value
        
        if not salt:
            salt = "6fb_ai_system_salt"  # You should use a proper random salt
        
        combined = f"{value}{salt}".encode('utf-8')
        return hashlib.sha256(combined).hexdigest()
    
    def encrypt_record(self, table: str, record: Dict) -> Dict:
        """Encrypt sensitive fields in a record"""
        encrypted_record = record.copy()
        
        for field, value in record.items():
            if self.should_encrypt_field(table, field) and value is not None:
                encrypted_record[field] = self.encrypt_value(str(value))
            elif self.should_hash_field(table, field) and value is not None:
                encrypted_record[field] = self.hash_value(str(value))
        
        return encrypted_record
    
    def decrypt_record(self, table: str, record: Dict) -> Dict:
        """Decrypt sensitive fields in a record"""
        decrypted_record = record.copy()
        
        for field, value in record.items():
            if self.should_encrypt_field(table, field) and value is not None:
                try:
                    decrypted_record[field] = self.decrypt_value(str(value))
                except Exception as e:
                    logger.warning(f"Could not decrypt field {field}: {e}")
                    decrypted_record[field] = "[ENCRYPTED]"
        
        return decrypted_record

class DatabaseAuditLogger:
    """Audit logging for database operations"""
    
    def __init__(self, database_path: str):
        self.audit_db_path = database_path.replace('.db', '_audit.db')
        self._init_audit_db()
    
    def _init_audit_db(self):
        """Initialize audit database"""
        with sqlite3.connect(self.audit_db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT,
                    ip_address TEXT,
                    operation TEXT NOT NULL,
                    table_name TEXT NOT NULL,
                    record_id TEXT,
                    old_values TEXT,
                    new_values TEXT,
                    success BOOLEAN NOT NULL,
                    error_message TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_audit_table ON audit_log(table_name)
            """)
            
            conn.commit()
    
    def log_operation(
        self,
        operation: str,
        table_name: str,
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        record_id: Optional[str] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log database operation"""
        
        try:
            with sqlite3.connect(self.audit_db_path) as conn:
                conn.execute("""
                    INSERT INTO audit_log 
                    (timestamp, user_id, ip_address, operation, table_name, 
                     record_id, old_values, new_values, success, error_message)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    datetime.utcnow().isoformat(),
                    user_id,
                    ip_address,
                    operation,
                    table_name,
                    record_id,
                    json.dumps(old_values) if old_values else None,
                    json.dumps(new_values) if new_values else None,
                    success,
                    error_message
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Audit logging error: {e}")
    
    def get_audit_trail(
        self,
        table_name: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[Dict]:
        """Retrieve audit trail"""
        
        query = "SELECT * FROM audit_log WHERE 1=1"
        params = []
        
        if table_name:
            query += " AND table_name = ?"
            params.append(table_name)
        
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        
        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date.isoformat())
        
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date.isoformat())
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        try:
            with sqlite3.connect(self.audit_db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(query, params)
                
                return [
                    {
                        **dict(row),
                        'old_values': json.loads(row['old_values']) if row['old_values'] else None,
                        'new_values': json.loads(row['new_values']) if row['new_values'] else None
                    }
                    for row in cursor.fetchall()
                ]
        except Exception as e:
            logger.error(f"Error retrieving audit trail: {e}")
            return []
    
    def cleanup_old_audit_logs(self, retention_days: int = 90):
        """Clean up old audit logs"""
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        try:
            with sqlite3.connect(self.audit_db_path) as conn:
                result = conn.execute(
                    "DELETE FROM audit_log WHERE timestamp < ?",
                    (cutoff_date.isoformat(),)
                )
                conn.commit()
                logger.info(f"Cleaned up {result.rowcount} old audit log entries")
        except Exception as e:
            logger.error(f"Error cleaning up audit logs: {e}")

class GDPRComplianceService:
    """GDPR compliance features for database operations"""
    
    def __init__(self, database_service):
        self.db = database_service
        self.data_retention_policies = {
            'users': 365 * 7,  # 7 years for user accounts
            'customers': 365 * 3,  # 3 years for customer data
            'chat_history': 365 * 2,  # 2 years for chat history
            'bookings': 365 * 3,  # 3 years for booking records
            'audit_log': 365 * 7,  # 7 years for audit logs
        }
    
    async def export_user_data(self, user_id: str, include_derived: bool = False) -> Dict:
        """Export all user data for GDPR data portability"""
        
        exported_data = {
            'export_date': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'data': {}
        }
        
        # Define related tables and their relationships
        user_tables = {
            'users': ('id', user_id),
            'shop_profiles': ('user_id', user_id),
            'chat_history': ('user_id', user_id),
            'sessions': ('user_id', user_id),
        }
        
        for table, (id_field, id_value) in user_tables.items():
            try:
                records = await self.db.fetch_records(
                    f"SELECT * FROM {table} WHERE {id_field} = ?",
                    (id_value,)
                )
                
                # Decrypt records for export
                decrypted_records = []
                for record in records:
                    decrypted_record = self.db.encryption.decrypt_record(table, dict(record))
                    decrypted_records.append(decrypted_record)
                
                exported_data['data'][table] = decrypted_records
                
            except Exception as e:
                logger.error(f"Error exporting data from {table}: {e}")
                exported_data['data'][table] = f"Error: {str(e)}"
        
        # Include derived data if requested
        if include_derived:
            exported_data['data']['derived'] = await self._export_derived_data(user_id)
        
        return exported_data
    
    async def _export_derived_data(self, user_id: str) -> Dict:
        """Export derived/calculated data"""
        
        derived_data = {}
        
        try:
            # Example: booking statistics
            booking_stats = await self.db.fetch_records("""
                SELECT COUNT(*) as total_bookings,
                       MIN(created_at) as first_booking,
                       MAX(created_at) as last_booking
                FROM bookings 
                WHERE user_id = ?
            """, (user_id,))
            
            derived_data['booking_statistics'] = dict(booking_stats[0]) if booking_stats else None
            
            # Example: chat activity
            chat_stats = await self.db.fetch_records("""
                SELECT COUNT(*) as total_messages,
                       COUNT(DISTINCT agent_id) as agents_used
                FROM chat_history 
                WHERE user_id = ?
            """, (user_id,))
            
            derived_data['chat_statistics'] = dict(chat_stats[0]) if chat_stats else None
            
        except Exception as e:
            logger.error(f"Error exporting derived data: {e}")
        
        return derived_data
    
    async def delete_user_data(self, user_id: str, verify_deletion: bool = True) -> Dict:
        """Delete all user data (Right to be forgotten)"""
        
        deletion_report = {
            'user_id': user_id,
            'deletion_date': datetime.utcnow().isoformat(),
            'deleted_tables': {},
            'errors': []
        }
        
        # Tables to delete from (in order to handle foreign keys)
        deletion_order = [
            'sessions',
            'chat_history',
            'bookings',
            'shop_profiles',
            'users'  # Users table last due to foreign key constraints
        ]
        
        for table in deletion_order:
            try:
                # Count records before deletion
                count_before = await self.db.fetch_single_value(
                    f"SELECT COUNT(*) FROM {table} WHERE user_id = ? OR id = ?",
                    (user_id, user_id)
                )
                
                # Delete records
                await self.db.execute_query(
                    f"DELETE FROM {table} WHERE user_id = ? OR id = ?",
                    (user_id, user_id),
                    user_id=user_id,
                    operation='DELETE_GDPR'
                )
                
                # Verify deletion if requested
                if verify_deletion:
                    count_after = await self.db.fetch_single_value(
                        f"SELECT COUNT(*) FROM {table} WHERE user_id = ? OR id = ?",
                        (user_id, user_id)
                    )
                    
                    deletion_report['deleted_tables'][table] = {
                        'records_before': count_before,
                        'records_after': count_after,
                        'successfully_deleted': count_after == 0
                    }
                else:
                    deletion_report['deleted_tables'][table] = {
                        'records_deleted': count_before
                    }
                    
            except Exception as e:
                error_msg = f"Error deleting from {table}: {str(e)}"
                logger.error(error_msg)
                deletion_report['errors'].append(error_msg)
        
        # Log GDPR deletion
        self.db.audit_logger.log_operation(
            operation='GDPR_DELETION',
            table_name='users',
            user_id=user_id,
            record_id=user_id,
            new_values=deletion_report,
            success=len(deletion_report['errors']) == 0
        )
        
        return deletion_report
    
    async def apply_retention_policies(self) -> Dict:
        """Apply data retention policies"""
        
        retention_report = {
            'execution_date': datetime.utcnow().isoformat(),
            'policies_applied': {},
            'errors': []
        }
        
        for table, retention_days in self.data_retention_policies.items():
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
                
                # Count records to be deleted
                count_query = f"SELECT COUNT(*) FROM {table} WHERE created_at < ?"
                if table == 'audit_log':
                    count_query = f"SELECT COUNT(*) FROM {table} WHERE timestamp < ?"
                
                count = await self.db.fetch_single_value(count_query, (cutoff_date.isoformat(),))
                
                if count > 0:
                    # Delete old records
                    delete_query = f"DELETE FROM {table} WHERE created_at < ?"
                    if table == 'audit_log':
                        delete_query = f"DELETE FROM {table} WHERE timestamp < ?"
                    
                    await self.db.execute_query(
                        delete_query,
                        (cutoff_date.isoformat(),),
                        operation='RETENTION_CLEANUP'
                    )
                    
                    retention_report['policies_applied'][table] = {
                        'retention_days': retention_days,
                        'cutoff_date': cutoff_date.isoformat(),
                        'records_deleted': count
                    }
                    
                    logger.info(f"Deleted {count} old records from {table}")
                
            except Exception as e:
                error_msg = f"Error applying retention policy to {table}: {str(e)}"
                logger.error(error_msg)
                retention_report['errors'].append(error_msg)
        
        return retention_report

class SecureDatabaseService:
    """Comprehensive secure database service"""
    
    def __init__(self, config: DatabaseConfig, encryption_key: bytes):
        self.config = config
        self.encryption = DatabaseEncryption(encryption_key)
        self.audit_logger = DatabaseAuditLogger(config.database_path) if config.audit_enabled else None
        self.gdpr_service = GDPRComplianceService(self) if config.audit_enabled else None
        
        # Ensure database directory exists
        os.makedirs(os.path.dirname(config.database_path), exist_ok=True)
        
        # Initialize database
        self._init_database()
    
    def _init_database(self):
        """Initialize database with security settings"""
        
        with sqlite3.connect(self.config.database_path) as conn:
            # Enable security features
            if self.config.enable_foreign_keys:
                conn.execute("PRAGMA foreign_keys = ON")
            
            if self.config.enable_wal_mode:
                conn.execute("PRAGMA journal_mode = WAL")
            
            # Set secure defaults
            conn.execute("PRAGMA secure_delete = ON")
            conn.execute("PRAGMA temp_store = MEMORY")
            
            # Create tables with encryption support
            self._create_secure_tables(conn)
    
    def _create_secure_tables(self, conn):
        """Create database tables with security considerations"""
        
        # Users table with encrypted fields
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,  -- Will be encrypted
                email_hash TEXT NOT NULL UNIQUE,  -- Searchable hash
                password_hash TEXT NOT NULL,  -- Will be encrypted
                shop_name TEXT,
                phone_number TEXT,  -- Will be encrypted
                address TEXT,  -- Will be encrypted
                user_type TEXT DEFAULT 'CLIENT',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT 1,
                last_login TIMESTAMP,
                failed_login_attempts INTEGER DEFAULT 0,
                locked_until TIMESTAMP NULL
            )
        """)
        
        # Sessions table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,  -- Hash of the actual token
                user_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                is_active BOOLEAN DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Chat history with encrypted messages
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                agent_id TEXT NOT NULL,
                message TEXT NOT NULL,  -- Will be encrypted
                response TEXT NOT NULL,  -- Will be encrypted
                metadata TEXT,  -- JSON metadata, will be encrypted
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Shop profiles with encrypted data
        conn.execute("""
            CREATE TABLE IF NOT EXISTS shop_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                profile_data TEXT,  -- Will be encrypted JSON
                contact_info TEXT,  -- Will be encrypted
                business_hours TEXT,
                services TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Data processing consent (GDPR)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS gdpr_consent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                consent_type TEXT NOT NULL,  -- marketing, analytics, etc.
                granted BOOLEAN NOT NULL,
                granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                withdrawn_at TIMESTAMP NULL,
                legal_basis TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes for performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_history(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_history(created_at)")
        
        conn.commit()
    
    @contextmanager
    def get_connection(self):
        """Get database connection with security settings"""
        conn = sqlite3.connect(
            self.config.database_path,
            timeout=self.config.connection_timeout,
            isolation_level=None  # Enable autocommit mode
        )
        conn.row_factory = sqlite3.Row
        
        # Apply security settings
        conn.execute("PRAGMA foreign_keys = ON")
        if self.config.enable_wal_mode:
            conn.execute("PRAGMA journal_mode = WAL")
        
        try:
            yield conn
        finally:
            conn.close()
    
    @asynccontextmanager
    async def get_async_connection(self):
        """Get async database connection"""
        conn = await aiosqlite.connect(
            self.config.database_path,
            timeout=self.config.connection_timeout
        )
        conn.row_factory = aiosqlite.Row
        
        # Apply security settings
        await conn.execute("PRAGMA foreign_keys = ON")
        if self.config.enable_wal_mode:
            await conn.execute("PRAGMA journal_mode = WAL")
        
        try:
            yield conn
        finally:
            await conn.close()
    
    async def execute_query(
        self,
        query: str,
        params: Tuple = (),
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        operation: str = "QUERY"
    ) -> int:
        """Execute a query with audit logging"""
        
        try:
            async with self.get_async_connection() as conn:
                cursor = await conn.execute(query, params)
                await conn.commit()
                
                # Log successful operation
                if self.audit_logger:
                    self.audit_logger.log_operation(
                        operation=operation,
                        table_name=self._extract_table_name(query),
                        user_id=user_id,
                        ip_address=ip_address,
                        success=True
                    )
                
                return cursor.rowcount
                
        except Exception as e:
            # Log failed operation
            if self.audit_logger:
                self.audit_logger.log_operation(
                    operation=operation,
                    table_name=self._extract_table_name(query),
                    user_id=user_id,
                    ip_address=ip_address,
                    success=False,
                    error_message=str(e)
                )
            
            logger.error(f"Database query error: {e}")
            raise
    
    async def fetch_records(self, query: str, params: Tuple = ()) -> List[Dict]:
        """Fetch records with automatic decryption"""
        
        try:
            async with self.get_async_connection() as conn:
                cursor = await conn.execute(query, params)
                rows = await cursor.fetchall()
                
                # Convert to dict and decrypt if needed
                table_name = self._extract_table_name(query)
                records = []
                
                for row in rows:
                    record_dict = dict(row)
                    if self.config.encryption_enabled:
                        record_dict = self.encryption.decrypt_record(table_name, record_dict)
                    records.append(record_dict)
                
                return records
                
        except Exception as e:
            logger.error(f"Database fetch error: {e}")
            raise
    
    async def fetch_single_value(self, query: str, params: Tuple = ()) -> Any:
        """Fetch a single value"""
        
        try:
            async with self.get_async_connection() as conn:
                cursor = await conn.execute(query, params)
                row = await cursor.fetchone()
                return row[0] if row else None
                
        except Exception as e:
            logger.error(f"Database fetch single error: {e}")
            raise
    
    async def create_user(
        self,
        email: str,
        password_hash: str,
        shop_name: Optional[str] = None,
        user_type: str = 'CLIENT',
        user_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> int:
        """Create a new user with encryption"""
        
        user_data = {
            'email': email,
            'email_hash': self.encryption.hash_value(email.lower()),
            'password_hash': password_hash,
            'shop_name': shop_name,
            'user_type': user_type
        }
        
        # Encrypt sensitive fields
        if self.config.encryption_enabled:
            user_data = self.encryption.encrypt_record('users', user_data)
        
        query = """
            INSERT INTO users (email, email_hash, password_hash, shop_name, user_type)
            VALUES (?, ?, ?, ?, ?)
        """
        
        params = (
            user_data['email'],
            user_data['email_hash'],
            user_data['password_hash'],
            user_data['shop_name'],
            user_data['user_type']
        )
        
        return await self.execute_query(
            query, params, user_id=user_id, ip_address=ip_address, operation="CREATE_USER"
        )
    
    async def find_user_by_email(self, email: str) -> Optional[Dict]:
        """Find user by email using encrypted search"""
        
        email_hash = self.encryption.hash_value(email.lower())
        
        query = "SELECT * FROM users WHERE email_hash = ? AND is_active = 1"
        records = await self.fetch_records(query, (email_hash,))
        
        return records[0] if records else None
    
    def _extract_table_name(self, query: str) -> str:
        """Extract table name from SQL query for audit logging"""
        
        query_upper = query.upper().strip()
        
        if query_upper.startswith('SELECT'):
            # Extract from FROM clause
            from_match = query_upper.split('FROM')
            if len(from_match) > 1:
                table_part = from_match[1].split()[0]
                return table_part.lower()
        elif query_upper.startswith('INSERT INTO'):
            # Extract from INSERT INTO
            parts = query_upper.split()
            if len(parts) >= 3:
                return parts[2].lower()
        elif query_upper.startswith('UPDATE'):
            # Extract from UPDATE
            parts = query_upper.split()
            if len(parts) >= 2:
                return parts[1].lower()
        elif query_upper.startswith('DELETE FROM'):
            # Extract from DELETE FROM
            parts = query_upper.split()
            if len(parts) >= 3:
                return parts[2].lower()
        
        return 'unknown'
    
    async def backup_database(self) -> str:
        """Create encrypted database backup"""
        
        if not self.config.backup_enabled:
            return "Backups disabled"
        
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_path = f"{self.config.database_path}.backup_{timestamp}"
        
        try:
            # Create backup using SQLite backup API
            async with self.get_async_connection() as source_conn:
                await source_conn.backup(aiosqlite.connect(backup_path))
            
            logger.info(f"Database backup created: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise
    
    async def cleanup_old_backups(self):
        """Clean up old database backups"""
        
        if not self.config.backup_enabled:
            return
        
        try:
            import glob
            backup_pattern = f"{self.config.database_path}.backup_*"
            backups = glob.glob(backup_pattern)
            
            cutoff_time = time.time() - (self.config.backup_retention_days * 24 * 3600)
            
            for backup_file in backups:
                if os.path.getmtime(backup_file) < cutoff_time:
                    os.remove(backup_file)
                    logger.info(f"Removed old backup: {backup_file}")
                    
        except Exception as e:
            logger.error(f"Backup cleanup error: {e}")

# Factory function to create secure database service
def create_secure_database_service(
    database_path: str = "data/agent_system.db",
    encryption_key: Optional[bytes] = None,
    **config_options
) -> SecureDatabaseService:
    """Create a configured secure database service"""
    
    # Generate encryption key if not provided
    if not encryption_key:
        from services.comprehensive_security_service import security_config
        encryption_key = security_config.encryption_key
    
    # Create configuration
    config = DatabaseConfig(
        database_path=database_path,
        **config_options
    )
    
    return SecureDatabaseService(config, encryption_key)

# Export main components
__all__ = [
    'SecureDatabaseService',
    'DatabaseConfig',
    'DatabaseEncryption',
    'DatabaseAuditLogger',
    'GDPRComplianceService',
    'create_secure_database_service'
]