#!/usr/bin/env python3
"""
Automated Operations and Maintenance System
Implements automated operational procedures and maintenance schedules
"""

import os
import asyncio
import logging
import json
import time
import shutil
import subprocess
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import crontab
import psutil
import docker
import aiohttp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/automated-operations.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TaskStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class TaskPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class MaintenanceType(Enum):
    SYSTEM_UPDATE = "system_update"
    SECURITY_PATCH = "security_patch"
    DATABASE_CLEANUP = "database_cleanup"
    LOG_ROTATION = "log_rotation"
    BACKUP_VERIFICATION = "backup_verification"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    CERTIFICATE_RENEWAL = "certificate_renewal"
    DEPENDENCY_UPDATE = "dependency_update"

@dataclass
class MaintenanceTask:
    """Maintenance task definition"""
    id: str
    name: str
    description: str
    task_type: MaintenanceType
    priority: TaskPriority
    schedule: str  # Cron expression
    estimated_duration: int  # minutes
    requires_downtime: bool
    pre_checks: List[Callable]
    execution_steps: List[Callable]
    post_checks: List[Callable]
    rollback_steps: List[Callable]
    dependencies: List[str] = None
    
@dataclass
class TaskExecution:
    """Task execution record"""
    task_id: str
    execution_id: str
    start_time: datetime
    end_time: Optional[datetime]
    status: TaskStatus
    output: str
    error_message: Optional[str] = None
    rollback_performed: bool = False

class SystemHealthChecker:
    """System health checking utilities"""
    
    @staticmethod
    async def check_disk_space(threshold_percent: float = 80.0) -> bool:
        """Check if disk space is below threshold"""
        try:
            usage = psutil.disk_usage('/')
            used_percent = (usage.used / usage.total) * 100
            return used_percent < threshold_percent
        except Exception:
            return False
            
    @staticmethod
    async def check_memory_usage(threshold_percent: float = 85.0) -> bool:
        """Check if memory usage is below threshold"""
        try:
            memory = psutil.virtual_memory()
            return memory.percent < threshold_percent
        except Exception:
            return False
            
    @staticmethod
    async def check_cpu_usage(threshold_percent: float = 80.0) -> bool:
        """Check if CPU usage is below threshold"""
        try:
            cpu_percent = psutil.cpu_percent(interval=5)
            return cpu_percent < threshold_percent
        except Exception:
            return False
            
    @staticmethod
    async def check_service_health(service_url: str) -> bool:
        """Check if service is responding"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(service_url, timeout=10) as response:
                    return response.status == 200
        except Exception:
            return False
            
    @staticmethod
    async def check_database_connectivity() -> bool:
        """Check database connectivity"""
        try:
            # SQLite check
            db_path = "/app/data/agent_system.db"
            if os.path.exists(db_path):
                conn = sqlite3.connect(db_path)
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
                conn.close()
                return True
            return False
        except Exception:
            return False

class MaintenanceTaskLibrary:
    """Library of predefined maintenance tasks"""
    
    @staticmethod
    async def system_update_pre_check() -> bool:
        """Pre-check for system updates"""
        # Check system health before updates
        health_checks = [
            SystemHealthChecker.check_disk_space(70.0),
            SystemHealthChecker.check_memory_usage(75.0),
            SystemHealthChecker.check_service_health("http://localhost:9999/api/health")
        ]
        
        results = await asyncio.gather(*health_checks)
        return all(results)
        
    @staticmethod
    async def system_update_execution() -> str:
        """Execute system updates"""
        try:
            # Update package lists
            result = subprocess.run(['apt', 'update'], capture_output=True, text=True)
            if result.returncode != 0:
                return f"Package update failed: {result.stderr}"
                
            # Upgrade packages (non-interactive)
            result = subprocess.run([
                'apt', 'upgrade', '-y', '--no-install-recommends'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                return f"System updated successfully: {result.stdout}"
            else:
                return f"System update failed: {result.stderr}"
                
        except Exception as e:
            return f"System update error: {str(e)}"
            
    @staticmethod
    async def database_cleanup_execution() -> str:
        """Execute database cleanup"""
        try:
            db_path = "/app/data/agent_system.db"
            if not os.path.exists(db_path):
                return "Database file not found"
                
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Clean old logs (older than 30 days)
            thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
            cursor.execute(
                "DELETE FROM system_logs WHERE timestamp < ?", 
                (thirty_days_ago,)
            )
            deleted_logs = cursor.rowcount
            
            # Clean old sessions (older than 7 days)
            week_ago = (datetime.now() - timedelta(days=7)).isoformat()
            cursor.execute(
                "DELETE FROM user_sessions WHERE created_at < ?", 
                (week_ago,)
            )
            deleted_sessions = cursor.rowcount
            
            # Vacuum database to reclaim space
            cursor.execute("VACUUM")
            
            conn.commit()
            conn.close()
            
            return f"Database cleanup completed: {deleted_logs} logs, {deleted_sessions} sessions removed"
            
        except Exception as e:
            return f"Database cleanup error: {str(e)}"
            
    @staticmethod
    async def log_rotation_execution() -> str:
        """Execute log rotation"""
        try:
            log_dirs = [
                "/var/log/6fb-ai-agent",
                "/var/log/nginx",
                "/var/log"
            ]
            
            rotated_files = 0
            
            for log_dir in log_dirs:
                if not os.path.exists(log_dir):
                    continue
                    
                for filename in os.listdir(log_dir):
                    if filename.endswith('.log'):
                        log_file = os.path.join(log_dir, filename)
                        
                        # Check if file is large enough to rotate (>100MB)
                        if os.path.getsize(log_file) > 100 * 1024 * 1024:
                            # Rotate log file
                            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                            rotated_name = f"{log_file}.{timestamp}"
                            shutil.move(log_file, rotated_name)
                            
                            # Compress rotated file
                            subprocess.run(['gzip', rotated_name])
                            rotated_files += 1
                            
            return f"Log rotation completed: {rotated_files} files rotated"
            
        except Exception as e:
            return f"Log rotation error: {str(e)}"
            
    @staticmethod
    async def backup_verification_execution() -> str:
        """Verify backup integrity"""
        try:
            backup_dir = "/backups"
            if not os.path.exists(backup_dir):
                return "Backup directory not found"
                
            verified_backups = 0
            failed_backups = 0
            
            for backup_file in os.listdir(backup_dir):
                if backup_file.endswith('.tar.gz'):
                    backup_path = os.path.join(backup_dir, backup_file)
                    
                    # Verify archive integrity
                    result = subprocess.run([
                        'tar', '-tzf', backup_path
                    ], capture_output=True)
                    
                    if result.returncode == 0:
                        verified_backups += 1
                    else:
                        failed_backups += 1
                        
            return f"Backup verification completed: {verified_backups} verified, {failed_backups} failed"
            
        except Exception as e:
            return f"Backup verification error: {str(e)}"
            
    @staticmethod
    async def certificate_renewal_execution() -> str:
        """Renew SSL certificates"""
        try:
            # Check if certbot is available
            result = subprocess.run(['which', 'certbot'], capture_output=True)
            if result.returncode != 0:
                return "Certbot not available"
                
            # Dry run certificate renewal
            result = subprocess.run([
                'certbot', 'renew', '--dry-run'
            ], capture_output=True, text=True)
            
            if result.returncode == 0:
                # Actual renewal
                result = subprocess.run([
                    'certbot', 'renew', '--quiet'
                ], capture_output=True, text=True)
                
                if result.returncode == 0:
                    # Reload nginx to use new certificates
                    subprocess.run(['nginx', '-s', 'reload'])
                    return "Certificate renewal completed successfully"
                else:
                    return f"Certificate renewal failed: {result.stderr}"
            else:
                return f"Certificate renewal dry run failed: {result.stderr}"
                
        except Exception as e:
            return f"Certificate renewal error: {str(e)}"
            
    @staticmethod
    async def performance_optimization_execution() -> str:
        """Execute performance optimizations"""
        try:
            optimizations = []
            
            # Clear system caches
            try:
                subprocess.run(['sync'], check=True)
                with open('/proc/sys/vm/drop_caches', 'w') as f:
                    f.write('3')
                optimizations.append("System caches cleared")
            except Exception:
                pass
                
            # Clean temporary files
            temp_dirs = ['/tmp', '/var/tmp']
            cleaned_files = 0
            
            for temp_dir in temp_dirs:
                if os.path.exists(temp_dir):
                    for file in os.listdir(temp_dir):
                        file_path = os.path.join(temp_dir, file)
                        try:
                            # Remove files older than 7 days
                            if os.path.isfile(file_path):
                                age = time.time() - os.path.getmtime(file_path)
                                if age > 7 * 24 * 3600:  # 7 days
                                    os.remove(file_path)
                                    cleaned_files += 1
                        except Exception:
                            pass
                            
            if cleaned_files > 0:
                optimizations.append(f"Cleaned {cleaned_files} temporary files")
                
            # Docker cleanup
            try:
                docker_client = docker.from_env()
                
                # Remove unused containers
                containers = docker_client.containers.prune()
                if containers['ContainersDeleted']:
                    optimizations.append(f"Removed {len(containers['ContainersDeleted'])} unused containers")
                    
                # Remove unused images
                images = docker_client.images.prune()
                if images['ImagesDeleted']:
                    optimizations.append(f"Removed {len(images['ImagesDeleted'])} unused images")
                    
            except Exception:
                pass
                
            return f"Performance optimization completed: {'; '.join(optimizations)}"
            
        except Exception as e:
            return f"Performance optimization error: {str(e)}"

class MaintenanceScheduler:
    """Maintenance task scheduler"""
    
    def __init__(self):
        self.tasks = {}
        self.execution_history = []
        self.running = False
        self.task_library = MaintenanceTaskLibrary()
        
    def register_task(self, task: MaintenanceTask):
        """Register a maintenance task"""
        self.tasks[task.id] = task
        logger.info(f"Registered maintenance task: {task.name}")
        
    def register_default_tasks(self):
        """Register default maintenance tasks"""
        default_tasks = [
            MaintenanceTask(
                id="system_update",
                name="System Package Updates",
                description="Update system packages and security patches",
                task_type=MaintenanceType.SYSTEM_UPDATE,
                priority=TaskPriority.HIGH,
                schedule="0 2 * * SUN",  # Every Sunday at 2 AM
                estimated_duration=30,
                requires_downtime=False,
                pre_checks=[self.task_library.system_update_pre_check],
                execution_steps=[self.task_library.system_update_execution],
                post_checks=[SystemHealthChecker.check_service_health],
                rollback_steps=[]
            ),
            MaintenanceTask(
                id="database_cleanup",
                name="Database Cleanup",
                description="Clean old data and optimize database",
                task_type=MaintenanceType.DATABASE_CLEANUP,
                priority=TaskPriority.MEDIUM,
                schedule="0 3 * * *",  # Daily at 3 AM
                estimated_duration=15,
                requires_downtime=False,
                pre_checks=[SystemHealthChecker.check_database_connectivity],
                execution_steps=[self.task_library.database_cleanup_execution],
                post_checks=[SystemHealthChecker.check_database_connectivity],
                rollback_steps=[]
            ),
            MaintenanceTask(
                id="log_rotation",
                name="Log Rotation",
                description="Rotate and compress large log files",
                task_type=MaintenanceType.LOG_ROTATION,
                priority=TaskPriority.LOW,
                schedule="0 1 * * *",  # Daily at 1 AM
                estimated_duration=10,
                requires_downtime=False,
                pre_checks=[SystemHealthChecker.check_disk_space],
                execution_steps=[self.task_library.log_rotation_execution],
                post_checks=[SystemHealthChecker.check_disk_space],
                rollback_steps=[]
            ),
            MaintenanceTask(
                id="backup_verification",
                name="Backup Verification",
                description="Verify integrity of backup files",
                task_type=MaintenanceType.BACKUP_VERIFICATION,
                priority=TaskPriority.MEDIUM,
                schedule="0 4 * * *",  # Daily at 4 AM
                estimated_duration=20,
                requires_downtime=False,
                pre_checks=[],
                execution_steps=[self.task_library.backup_verification_execution],
                post_checks=[],
                rollback_steps=[]
            ),
            MaintenanceTask(
                id="certificate_renewal",
                name="SSL Certificate Renewal",
                description="Renew SSL certificates",
                task_type=MaintenanceType.CERTIFICATE_RENEWAL,
                priority=TaskPriority.HIGH,
                schedule="0 2 1 * *",  # Monthly on 1st at 2 AM
                estimated_duration=15,
                requires_downtime=False,
                pre_checks=[],
                execution_steps=[self.task_library.certificate_renewal_execution],
                post_checks=[SystemHealthChecker.check_service_health],
                rollback_steps=[]
            ),
            MaintenanceTask(
                id="performance_optimization",
                name="Performance Optimization",
                description="System performance optimization tasks",
                task_type=MaintenanceType.PERFORMANCE_OPTIMIZATION,
                priority=TaskPriority.LOW,
                schedule="0 5 * * SUN",  # Weekly on Sunday at 5 AM
                estimated_duration=25,
                requires_downtime=False,
                pre_checks=[SystemHealthChecker.check_cpu_usage],
                execution_steps=[self.task_library.performance_optimization_execution],
                post_checks=[SystemHealthChecker.check_cpu_usage],
                rollback_steps=[]
            )
        ]
        
        for task in default_tasks:
            self.register_task(task)
            
    async def execute_task(self, task_id: str) -> TaskExecution:
        """Execute a maintenance task"""
        if task_id not in self.tasks:
            raise ValueError(f"Task not found: {task_id}")
            
        task = self.tasks[task_id]
        execution_id = f"{task_id}_{int(time.time())}"
        
        execution = TaskExecution(
            task_id=task_id,
            execution_id=execution_id,
            start_time=datetime.now(),
            end_time=None,
            status=TaskStatus.RUNNING,
            output=""
        )
        
        logger.info(f"Starting maintenance task: {task.name}")
        
        try:
            # Execute pre-checks
            if task.pre_checks:
                for pre_check in task.pre_checks:
                    if not await pre_check():
                        execution.status = TaskStatus.SKIPPED
                        execution.output = "Pre-check failed"
                        execution.end_time = datetime.now()
                        return execution
                        
            # Execute main steps
            output_parts = []
            for step in task.execution_steps:
                result = await step()
                output_parts.append(result)
                
            execution.output = "; ".join(output_parts)
            
            # Execute post-checks
            if task.post_checks:
                for post_check in task.post_checks:
                    if not await post_check():
                        execution.status = TaskStatus.FAILED
                        execution.error_message = "Post-check failed"
                        
                        # Execute rollback if available
                        if task.rollback_steps:
                            for rollback_step in task.rollback_steps:
                                await rollback_step()
                            execution.rollback_performed = True
                            
                        execution.end_time = datetime.now()
                        return execution
                        
            execution.status = TaskStatus.COMPLETED
            execution.end_time = datetime.now()
            
            logger.info(f"Maintenance task completed: {task.name}")
            
        except Exception as e:
            execution.status = TaskStatus.FAILED
            execution.error_message = str(e)
            execution.end_time = datetime.now()
            
            logger.error(f"Maintenance task failed: {task.name} - {str(e)}")
            
            # Execute rollback if available
            if task.rollback_steps:
                try:
                    for rollback_step in task.rollback_steps:
                        await rollback_step()
                    execution.rollback_performed = True
                except Exception as rollback_error:
                    logger.error(f"Rollback failed: {rollback_error}")
                    
        # Store execution history
        self.execution_history.append(execution)
        
        return execution
        
    async def start_scheduler(self):
        """Start the maintenance scheduler"""
        self.running = True
        logger.info("Maintenance scheduler started")
        
        # Start scheduling loop
        asyncio.create_task(self._scheduling_loop())
        
    async def stop_scheduler(self):
        """Stop the maintenance scheduler"""
        self.running = False
        logger.info("Maintenance scheduler stopped")
        
    async def _scheduling_loop(self):
        """Main scheduling loop"""
        while self.running:
            try:
                current_time = datetime.now()
                
                for task_id, task in self.tasks.items():
                    if await self._should_execute_task(task, current_time):
                        # Execute task in background
                        asyncio.create_task(self._execute_task_safe(task_id))
                        
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Scheduling loop error: {e}")
                await asyncio.sleep(60)
                
    async def _should_execute_task(self, task: MaintenanceTask, current_time: datetime) -> bool:
        """Check if task should be executed based on schedule"""
        try:
            # Parse cron expression (simplified implementation)
            cron_parts = task.schedule.split()
            if len(cron_parts) != 5:
                return False
                
            minute, hour, day, month, weekday = cron_parts
            
            # Check if current time matches schedule
            if minute != '*' and int(minute) != current_time.minute:
                return False
            if hour != '*' and int(hour) != current_time.hour:
                return False
            if day != '*' and int(day) != current_time.day:
                return False
            if month != '*' and int(month) != current_time.month:
                return False
            if weekday != '*' and int(weekday) != current_time.weekday():
                return False
                
            # Check if task was already executed recently
            recent_executions = [
                e for e in self.execution_history 
                if e.task_id == task.id and 
                (current_time - e.start_time).total_seconds() < 3600  # Last hour
            ]
            
            return len(recent_executions) == 0
            
        except Exception as e:
            logger.error(f"Schedule evaluation error: {e}")
            return False
            
    async def _execute_task_safe(self, task_id: str):
        """Execute task with error handling"""
        try:
            await self.execute_task(task_id)
        except Exception as e:
            logger.error(f"Task execution error: {e}")
            
    async def get_maintenance_status(self) -> Dict[str, Any]:
        """Get maintenance system status"""
        # Recent executions (last 24 hours)
        recent_executions = [
            e for e in self.execution_history 
            if (datetime.now() - e.start_time).total_seconds() < 86400
        ]
        
        # Success rate
        if recent_executions:
            successful = len([e for e in recent_executions if e.status == TaskStatus.COMPLETED])
            success_rate = (successful / len(recent_executions)) * 100
        else:
            success_rate = 0
            
        # Next scheduled tasks
        next_tasks = []
        current_time = datetime.now()
        
        for task_id, task in self.tasks.items():
            try:
                # Calculate next execution time (simplified)
                next_tasks.append({
                    'task_id': task_id,
                    'name': task.name,
                    'schedule': task.schedule,
                    'priority': task.priority.value
                })
            except Exception:
                pass
                
        return {
            "scheduler_active": self.running,
            "registered_tasks": len(self.tasks),
            "recent_executions": len(recent_executions),
            "success_rate": success_rate,
            "next_tasks": next_tasks[:5],  # Next 5 tasks
            "last_execution": {
                "task": self.execution_history[-1].task_id if self.execution_history else None,
                "status": self.execution_history[-1].status.value if self.execution_history else None,
                "timestamp": self.execution_history[-1].start_time.isoformat() if self.execution_history else None
            }
        }

class OperationalProcedures:
    """Operational procedures and runbooks"""
    
    @staticmethod
    def get_startup_procedure() -> List[str]:
        """Get system startup procedure"""
        return [
            "1. Verify system resources (CPU, Memory, Disk)",
            "2. Check network connectivity",
            "3. Validate database connectivity",
            "4. Start backend services",
            "5. Start frontend services",
            "6. Verify service health endpoints",
            "7. Run smoke tests",
            "8. Enable monitoring and alerting",
            "9. Notify operations team of successful startup"
        ]
        
    @staticmethod
    def get_shutdown_procedure() -> List[str]:
        """Get system shutdown procedure"""
        return [
            "1. Notify users of planned maintenance",
            "2. Enable maintenance mode",
            "3. Wait for active requests to complete",
            "4. Stop frontend services",
            "5. Stop backend services",
            "6. Create final backup",
            "7. Verify backup integrity",
            "8. Stop monitoring services",
            "9. Document shutdown completion"
        ]
        
    @staticmethod
    def get_emergency_procedures() -> Dict[str, List[str]]:
        """Get emergency procedures"""
        return {
            "service_outage": [
                "1. Check service health endpoints",
                "2. Review recent deployments",
                "3. Check system resources",
                "4. Review error logs",
                "5. Restart services if needed",
                "6. Escalate to engineering team",
                "7. Communicate with stakeholders"
            ],
            "database_issues": [
                "1. Check database connectivity",
                "2. Review database logs",
                "3. Check disk space",
                "4. Verify backup availability",
                "5. Consider read-only mode",
                "6. Escalate to database team"
            ],
            "security_incident": [
                "1. Identify scope of incident",
                "2. Block malicious IPs",
                "3. Enable additional logging",
                "4. Notify security team",
                "5. Preserve evidence",
                "6. Begin incident response",
                "7. Communicate with legal team"
            ]
        }

# Usage example
async def main():
    # Initialize maintenance scheduler
    scheduler = MaintenanceScheduler()
    
    # Register default tasks
    scheduler.register_default_tasks()
    
    # Start scheduler
    await scheduler.start_scheduler()
    
    # Get system status
    status = await scheduler.get_maintenance_status()
    logger.info(f"Maintenance system status: {json.dumps(status, indent=2)}")
    
    # Keep running
    try:
        while True:
            await asyncio.sleep(300)  # Check every 5 minutes
            status = await scheduler.get_maintenance_status()
            logger.info(f"Scheduler active: {status['scheduler_active']}")
    except KeyboardInterrupt:
        await scheduler.stop_scheduler()

if __name__ == "__main__":
    asyncio.run(main())