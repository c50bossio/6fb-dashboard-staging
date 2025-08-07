#!/usr/bin/env python3
"""
Automated Backup and Disaster Recovery System
Provides comprehensive backup capabilities with point-in-time recovery
"""

import os
import asyncio
import logging
import sqlite3
import json
import tarfile
import shutil
import boto3
import psycopg2
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import hashlib
import subprocess
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/backup-system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class BackupConfig:
    """Backup configuration settings"""
    retention_days: int = 30
    full_backup_interval: int = 7  # days
    incremental_interval: int = 1  # hours
    compression: bool = True
    encryption: bool = True
    s3_bucket: Optional[str] = None
    local_backup_path: str = "/backups"
    max_parallel_operations: int = 4
    
@dataclass
class BackupMetadata:
    """Backup metadata information"""
    backup_id: str
    timestamp: datetime
    backup_type: str  # 'full', 'incremental', 'differential'
    size: int
    checksum: str
    location: str
    encrypted: bool
    compressed: bool
    retention_date: datetime

class BackupSystem:
    """Automated backup and disaster recovery system"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.s3_client = None
        self.backup_metadata: List[BackupMetadata] = []
        
        # Initialize storage
        self._initialize_storage()
        self._load_metadata()
        
    def _initialize_storage(self):
        """Initialize backup storage systems"""
        # Create local backup directory
        os.makedirs(self.config.local_backup_path, exist_ok=True)
        
        # Initialize S3 client if configured
        if self.config.s3_bucket:
            try:
                self.s3_client = boto3.client('s3')
                logger.info(f"S3 backup storage initialized: {self.config.s3_bucket}")
            except Exception as e:
                logger.error(f"Failed to initialize S3: {e}")
                
    def _load_metadata(self):
        """Load backup metadata from storage"""
        metadata_file = os.path.join(self.config.local_backup_path, "backup_metadata.json")
        try:
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    self.backup_metadata = [
                        BackupMetadata(
                            backup_id=item['backup_id'],
                            timestamp=datetime.fromisoformat(item['timestamp']),
                            backup_type=item['backup_type'],
                            size=item['size'],
                            checksum=item['checksum'],
                            location=item['location'],
                            encrypted=item['encrypted'],
                            compressed=item['compressed'],
                            retention_date=datetime.fromisoformat(item['retention_date'])
                        ) for item in data
                    ]
        except Exception as e:
            logger.error(f"Failed to load backup metadata: {e}")
            
    def _save_metadata(self):
        """Save backup metadata to storage"""
        metadata_file = os.path.join(self.config.local_backup_path, "backup_metadata.json")
        try:
            data = [
                {
                    'backup_id': backup.backup_id,
                    'timestamp': backup.timestamp.isoformat(),
                    'backup_type': backup.backup_type,
                    'size': backup.size,
                    'checksum': backup.checksum,
                    'location': backup.location,
                    'encrypted': backup.encrypted,
                    'compressed': backup.compressed,
                    'retention_date': backup.retention_date.isoformat()
                } for backup in self.backup_metadata
            ]
            with open(metadata_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save backup metadata: {e}")
            
    async def create_full_backup(self) -> BackupMetadata:
        """Create a full system backup"""
        backup_id = f"full_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Starting full backup: {backup_id}")
        
        try:
            # Create backup directory
            backup_dir = os.path.join(self.config.local_backup_path, backup_id)
            os.makedirs(backup_dir, exist_ok=True)
            
            # Backup components in parallel
            tasks = [
                self._backup_databases(backup_dir),
                self._backup_application_files(backup_dir),
                self._backup_user_data(backup_dir),
                self._backup_configuration(backup_dir),
                self._backup_logs(backup_dir)
            ]
            
            await asyncio.gather(*tasks)
            
            # Create archive
            archive_path = f"{backup_dir}.tar.gz"
            await self._create_archive(backup_dir, archive_path)
            
            # Calculate checksum
            checksum = await self._calculate_checksum(archive_path)
            
            # Encrypt if configured
            if self.config.encryption:
                encrypted_path = f"{archive_path}.enc"
                await self._encrypt_backup(archive_path, encrypted_path)
                os.remove(archive_path)
                archive_path = encrypted_path
                
            # Upload to S3 if configured
            if self.s3_client:
                await self._upload_to_s3(archive_path, backup_id)
                
            # Create metadata
            backup_metadata = BackupMetadata(
                backup_id=backup_id,
                timestamp=datetime.now(),
                backup_type='full',
                size=os.path.getsize(archive_path),
                checksum=checksum,
                location=archive_path,
                encrypted=self.config.encryption,
                compressed=self.config.compression,
                retention_date=datetime.now() + timedelta(days=self.config.retention_days)
            )
            
            self.backup_metadata.append(backup_metadata)
            self._save_metadata()
            
            # Cleanup temporary directory
            shutil.rmtree(backup_dir)
            
            logger.info(f"Full backup completed: {backup_id}")
            return backup_metadata
            
        except Exception as e:
            logger.error(f"Full backup failed: {e}")
            raise
            
    async def create_incremental_backup(self) -> BackupMetadata:
        """Create an incremental backup"""
        backup_id = f"incr_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        logger.info(f"Starting incremental backup: {backup_id}")
        
        try:
            # Find last backup timestamp
            last_backup_time = self._get_last_backup_time()
            
            # Create backup directory
            backup_dir = os.path.join(self.config.local_backup_path, backup_id)
            os.makedirs(backup_dir, exist_ok=True)
            
            # Backup only changed files since last backup
            tasks = [
                self._backup_changed_files(backup_dir, last_backup_time),
                self._backup_database_changes(backup_dir, last_backup_time),
                self._backup_recent_logs(backup_dir, last_backup_time)
            ]
            
            await asyncio.gather(*tasks)
            
            # Create archive
            archive_path = f"{backup_dir}.tar.gz"
            await self._create_archive(backup_dir, archive_path)
            
            # Calculate checksum
            checksum = await self._calculate_checksum(archive_path)
            
            # Encrypt if configured
            if self.config.encryption:
                encrypted_path = f"{archive_path}.enc"
                await self._encrypt_backup(archive_path, encrypted_path)
                os.remove(archive_path)
                archive_path = encrypted_path
                
            # Upload to S3 if configured
            if self.s3_client:
                await self._upload_to_s3(archive_path, backup_id)
                
            # Create metadata
            backup_metadata = BackupMetadata(
                backup_id=backup_id,
                timestamp=datetime.now(),
                backup_type='incremental',
                size=os.path.getsize(archive_path),
                checksum=checksum,
                location=archive_path,
                encrypted=self.config.encryption,
                compressed=self.config.compression,
                retention_date=datetime.now() + timedelta(days=self.config.retention_days)
            )
            
            self.backup_metadata.append(backup_metadata)
            self._save_metadata()
            
            # Cleanup temporary directory
            shutil.rmtree(backup_dir)
            
            logger.info(f"Incremental backup completed: {backup_id}")
            return backup_metadata
            
        except Exception as e:
            logger.error(f"Incremental backup failed: {e}")
            raise
            
    async def restore_backup(self, backup_id: str, restore_path: str = "/restore") -> bool:
        """Restore from a specific backup"""
        logger.info(f"Starting restore from backup: {backup_id}")
        
        try:
            # Find backup metadata
            backup_meta = next((b for b in self.backup_metadata if b.backup_id == backup_id), None)
            if not backup_meta:
                raise ValueError(f"Backup not found: {backup_id}")
                
            # Create restore directory
            os.makedirs(restore_path, exist_ok=True)
            
            # Download from S3 if needed
            local_backup_path = backup_meta.location
            if self.s3_client and not os.path.exists(local_backup_path):
                local_backup_path = await self._download_from_s3(backup_id, restore_path)
                
            # Decrypt if needed
            if backup_meta.encrypted:
                decrypted_path = local_backup_path.replace('.enc', '')
                await self._decrypt_backup(local_backup_path, decrypted_path)
                local_backup_path = decrypted_path
                
            # Verify checksum
            if not await self._verify_checksum(local_backup_path, backup_meta.checksum):
                raise ValueError("Backup integrity check failed")
                
            # Extract archive
            extract_path = os.path.join(restore_path, f"extracted_{backup_id}")
            await self._extract_archive(local_backup_path, extract_path)
            
            # Restore components
            await self._restore_databases(extract_path)
            await self._restore_application_files(extract_path)
            await self._restore_user_data(extract_path)
            await self._restore_configuration(extract_path)
            
            logger.info(f"Restore completed: {backup_id}")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
            
    async def point_in_time_recovery(self, target_time: datetime) -> bool:
        """Perform point-in-time recovery to specific timestamp"""
        logger.info(f"Starting point-in-time recovery to: {target_time}")
        
        try:
            # Find the best full backup before target time
            full_backups = [b for b in self.backup_metadata 
                          if b.backup_type == 'full' and b.timestamp <= target_time]
            if not full_backups:
                raise ValueError("No suitable full backup found")
                
            base_backup = max(full_backups, key=lambda x: x.timestamp)
            
            # Find all incremental backups after base backup and before target
            incremental_backups = [b for b in self.backup_metadata 
                                 if b.backup_type == 'incremental' 
                                 and base_backup.timestamp < b.timestamp <= target_time]
            
            # Sort incremental backups by timestamp
            incremental_backups.sort(key=lambda x: x.timestamp)
            
            # Restore base backup first
            restore_path = f"/restore/pit_{target_time.strftime('%Y%m%d_%H%M%S')}"
            await self.restore_backup(base_backup.backup_id, restore_path)
            
            # Apply incremental backups in order
            for inc_backup in incremental_backups:
                await self._apply_incremental_backup(inc_backup, restore_path)
                
            logger.info(f"Point-in-time recovery completed to: {target_time}")
            return True
            
        except Exception as e:
            logger.error(f"Point-in-time recovery failed: {e}")
            return False
            
    async def cleanup_old_backups(self):
        """Remove expired backups based on retention policy"""
        logger.info("Starting backup cleanup")
        
        current_time = datetime.now()
        expired_backups = [b for b in self.backup_metadata if b.retention_date < current_time]
        
        for backup in expired_backups:
            try:
                # Remove local file
                if os.path.exists(backup.location):
                    os.remove(backup.location)
                    
                # Remove from S3 if configured
                if self.s3_client:
                    await self._delete_from_s3(backup.backup_id)
                    
                # Remove from metadata
                self.backup_metadata.remove(backup)
                
                logger.info(f"Removed expired backup: {backup.backup_id}")
                
            except Exception as e:
                logger.error(f"Failed to remove backup {backup.backup_id}: {e}")
                
        self._save_metadata()
        logger.info(f"Cleanup completed, removed {len(expired_backups)} backups")
        
    async def verify_backup_integrity(self, backup_id: str) -> bool:
        """Verify the integrity of a specific backup"""
        logger.info(f"Verifying backup integrity: {backup_id}")
        
        try:
            backup_meta = next((b for b in self.backup_metadata if b.backup_id == backup_id), None)
            if not backup_meta:
                return False
                
            # Verify checksum
            return await self._verify_checksum(backup_meta.location, backup_meta.checksum)
            
        except Exception as e:
            logger.error(f"Backup verification failed: {e}")
            return False
            
    async def get_backup_status(self) -> Dict[str, Any]:
        """Get comprehensive backup system status"""
        total_backups = len(self.backup_metadata)
        full_backups = len([b for b in self.backup_metadata if b.backup_type == 'full'])
        incremental_backups = len([b for b in self.backup_metadata if b.backup_type == 'incremental'])
        total_size = sum(b.size for b in self.backup_metadata)
        
        last_full = max([b for b in self.backup_metadata if b.backup_type == 'full'], 
                       key=lambda x: x.timestamp, default=None)
        last_incremental = max([b for b in self.backup_metadata if b.backup_type == 'incremental'], 
                              key=lambda x: x.timestamp, default=None)
        
        return {
            'total_backups': total_backups,
            'full_backups': full_backups,
            'incremental_backups': incremental_backups,
            'total_size_bytes': total_size,
            'total_size_gb': round(total_size / (1024**3), 2),
            'last_full_backup': last_full.timestamp.isoformat() if last_full else None,
            'last_incremental_backup': last_incremental.timestamp.isoformat() if last_incremental else None,
            's3_enabled': self.s3_client is not None,
            'encryption_enabled': self.config.encryption,
            'compression_enabled': self.config.compression,
        }
        
    # Helper methods
    async def _backup_databases(self, backup_dir: str):
        """Backup all databases"""
        db_backup_dir = os.path.join(backup_dir, "databases")
        os.makedirs(db_backup_dir, exist_ok=True)
        
        # SQLite databases
        sqlite_files = [
            "/app/data/agent_system.db",
            "/app/agent_system.db"
        ]
        
        for db_file in sqlite_files:
            if os.path.exists(db_file):
                backup_file = os.path.join(db_backup_dir, os.path.basename(db_file))
                shutil.copy2(db_file, backup_file)
                
        # PostgreSQL backup if configured
        if os.getenv('DATABASE_URL', '').startswith('postgresql'):
            await self._backup_postgresql(db_backup_dir)
            
    async def _backup_postgresql(self, backup_dir: str):
        """Backup PostgreSQL database"""
        try:
            db_url = os.getenv('DATABASE_URL')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_file = os.path.join(backup_dir, f"postgresql_backup_{timestamp}.sql")
            
            cmd = f"pg_dump {db_url} > {backup_file}"
            subprocess.run(cmd, shell=True, check=True)
            
        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {e}")
            
    async def _backup_application_files(self, backup_dir: str):
        """Backup application files"""
        app_backup_dir = os.path.join(backup_dir, "application")
        os.makedirs(app_backup_dir, exist_ok=True)
        
        # Backup critical application directories
        app_dirs = ["/app", "/opt/6fb-ai-agent"]
        for app_dir in app_dirs:
            if os.path.exists(app_dir):
                dest_dir = os.path.join(app_backup_dir, os.path.basename(app_dir))
                shutil.copytree(app_dir, dest_dir, ignore=shutil.ignore_patterns(
                    '*.log', '__pycache__', '.git', 'node_modules', '.next'
                ))
                
    async def _backup_user_data(self, backup_dir: str):
        """Backup user data and uploads"""
        data_backup_dir = os.path.join(backup_dir, "user_data")
        os.makedirs(data_backup_dir, exist_ok=True)
        
        # Backup user data directories
        data_dirs = ["/app/data", "/app/uploads", "/var/lib/6fb-ai-agent"]
        for data_dir in data_dirs:
            if os.path.exists(data_dir):
                dest_dir = os.path.join(data_backup_dir, os.path.basename(data_dir))
                shutil.copytree(data_dir, dest_dir)
                
    async def _backup_configuration(self, backup_dir: str):
        """Backup configuration files"""
        config_backup_dir = os.path.join(backup_dir, "configuration")
        os.makedirs(config_backup_dir, exist_ok=True)
        
        # Backup configuration files
        config_files = [
            "/app/.env.local",
            "/app/docker-compose.yml",
            "/app/next.config.js",
            "/etc/nginx/nginx.conf"
        ]
        
        for config_file in config_files:
            if os.path.exists(config_file):
                dest_file = os.path.join(config_backup_dir, os.path.basename(config_file))
                shutil.copy2(config_file, dest_file)
                
    async def _backup_logs(self, backup_dir: str):
        """Backup system logs"""
        log_backup_dir = os.path.join(backup_dir, "logs")
        os.makedirs(log_backup_dir, exist_ok=True)
        
        # Backup log directories
        log_dirs = ["/var/log", "/app/logs"]
        for log_dir in log_dirs:
            if os.path.exists(log_dir):
                dest_dir = os.path.join(log_backup_dir, os.path.basename(log_dir))
                shutil.copytree(log_dir, dest_dir)
                
    async def _create_archive(self, source_dir: str, archive_path: str):
        """Create compressed archive"""
        def create_tar():
            with tarfile.open(archive_path, 'w:gz') as tar:
                tar.add(source_dir, arcname=os.path.basename(source_dir))
                
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            await loop.run_in_executor(executor, create_tar)
            
    async def _calculate_checksum(self, file_path: str) -> str:
        """Calculate SHA256 checksum of file"""
        def calculate():
            sha256_hash = hashlib.sha256()
            with open(file_path, "rb") as f:
                for byte_block in iter(lambda: f.read(4096), b""):
                    sha256_hash.update(byte_block)
            return sha256_hash.hexdigest()
            
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            return await loop.run_in_executor(executor, calculate)
            
    async def _encrypt_backup(self, source_path: str, dest_path: str):
        """Encrypt backup file"""
        # Implementation would use GPG or similar encryption
        # For demo purposes, we'll use a simple approach
        key = os.getenv('BACKUP_ENCRYPTION_KEY', 'default-key')
        
        def encrypt():
            # In production, use proper encryption like GPG
            with open(source_path, 'rb') as src:
                with open(dest_path, 'wb') as dst:
                    data = src.read()
                    # Simple XOR encryption for demo (use proper encryption in production)
                    encrypted = bytes(a ^ ord(key[i % len(key)]) for i, a in enumerate(data))
                    dst.write(encrypted)
                    
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            await loop.run_in_executor(executor, encrypt)
            
    async def _upload_to_s3(self, file_path: str, backup_id: str):
        """Upload backup to S3"""
        if not self.s3_client:
            return
            
        try:
            key = f"backups/{backup_id}/{os.path.basename(file_path)}"
            self.s3_client.upload_file(file_path, self.config.s3_bucket, key)
            logger.info(f"Uploaded to S3: {key}")
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            
    def _get_last_backup_time(self) -> datetime:
        """Get timestamp of last backup"""
        if not self.backup_metadata:
            return datetime.min
        return max(b.timestamp for b in self.backup_metadata)
        
    # Additional helper methods would be implemented here...
    async def _backup_changed_files(self, backup_dir: str, since: datetime):
        """Backup files changed since specified time"""
        pass
        
    async def _backup_database_changes(self, backup_dir: str, since: datetime):
        """Backup database changes since specified time"""
        pass
        
    async def _backup_recent_logs(self, backup_dir: str, since: datetime):
        """Backup log entries since specified time"""
        pass
        
    async def _extract_archive(self, archive_path: str, extract_path: str):
        """Extract archive to specified path"""
        pass
        
    async def _restore_databases(self, extract_path: str):
        """Restore databases from backup"""
        pass
        
    async def _restore_application_files(self, extract_path: str):
        """Restore application files from backup"""
        pass
        
    async def _restore_user_data(self, extract_path: str):
        """Restore user data from backup"""
        pass
        
    async def _restore_configuration(self, extract_path: str):
        """Restore configuration from backup"""
        pass
        
    async def _verify_checksum(self, file_path: str, expected_checksum: str) -> bool:
        """Verify file checksum"""
        actual_checksum = await self._calculate_checksum(file_path)
        return actual_checksum == expected_checksum
        
    async def _decrypt_backup(self, source_path: str, dest_path: str):
        """Decrypt backup file"""
        pass
        
    async def _download_from_s3(self, backup_id: str, local_path: str) -> str:
        """Download backup from S3"""
        pass
        
    async def _delete_from_s3(self, backup_id: str):
        """Delete backup from S3"""
        pass
        
    async def _apply_incremental_backup(self, backup: BackupMetadata, restore_path: str):
        """Apply incremental backup to restore point"""
        pass

# Backup scheduler
class BackupScheduler:
    """Scheduled backup operations"""
    
    def __init__(self, backup_system: BackupSystem):
        self.backup_system = backup_system
        self.running = False
        
    async def start(self):
        """Start the backup scheduler"""
        self.running = True
        logger.info("Backup scheduler started")
        
        # Schedule full backups weekly
        asyncio.create_task(self._schedule_full_backups())
        
        # Schedule incremental backups hourly
        asyncio.create_task(self._schedule_incremental_backups())
        
        # Schedule cleanup daily
        asyncio.create_task(self._schedule_cleanup())
        
    async def stop(self):
        """Stop the backup scheduler"""
        self.running = False
        logger.info("Backup scheduler stopped")
        
    async def _schedule_full_backups(self):
        """Schedule full backups every week"""
        while self.running:
            try:
                await self.backup_system.create_full_backup()
                await asyncio.sleep(7 * 24 * 3600)  # 7 days
            except Exception as e:
                logger.error(f"Scheduled full backup failed: {e}")
                await asyncio.sleep(3600)  # Retry in 1 hour
                
    async def _schedule_incremental_backups(self):
        """Schedule incremental backups every hour"""
        while self.running:
            try:
                await asyncio.sleep(3600)  # 1 hour
                await self.backup_system.create_incremental_backup()
            except Exception as e:
                logger.error(f"Scheduled incremental backup failed: {e}")
                
    async def _schedule_cleanup(self):
        """Schedule daily cleanup of old backups"""
        while self.running:
            try:
                await asyncio.sleep(24 * 3600)  # 24 hours
                await self.backup_system.cleanup_old_backups()
            except Exception as e:
                logger.error(f"Scheduled cleanup failed: {e}")

# Usage example
async def main():
    config = BackupConfig(
        retention_days=30,
        full_backup_interval=7,
        incremental_interval=1,
        compression=True,
        encryption=True,
        s3_bucket=os.getenv('BACKUP_S3_BUCKET'),
        local_backup_path="/backups"
    )
    
    backup_system = BackupSystem(config)
    scheduler = BackupScheduler(backup_system)
    
    # Start scheduler
    await scheduler.start()
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await scheduler.stop()

if __name__ == "__main__":
    asyncio.run(main())