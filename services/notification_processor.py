#!/usr/bin/env python3
"""
Notification Queue Processor for 6FB AI Agent System
Handles background processing of queued notifications with retry logic and error handling
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
from dataclasses import dataclass
import signal
import sys

# Import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase = None
except ImportError:
    supabase = None

# Import notification services
try:
    from services.booking_notifications import (
        booking_notification_service,
        BookingNotificationData,
        BookingNotificationType,
        NotificationChannel,
        NotificationPriority
    )
    BOOKING_NOTIFICATIONS_AVAILABLE = True
except ImportError:
    BOOKING_NOTIFICATIONS_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class QueuedNotification:
    id: str
    user_id: str
    notification_type: str
    channels: List[str]
    booking_data: Dict[str, Any]
    priority: int
    schedule_at: Optional[datetime]
    retry_count: int
    max_retries: int
    created_at: datetime
    status: str
    error_message: Optional[str] = None

class NotificationProcessor:
    """Background processor for notification queue"""
    
    def __init__(self):
        self.is_running = False
        self.worker_tasks: List[asyncio.Task] = []
        self.max_workers = int(os.getenv('NOTIFICATION_WORKERS', '3'))
        self.poll_interval = int(os.getenv('NOTIFICATION_POLL_INTERVAL', '10'))  # seconds
        self.batch_size = int(os.getenv('NOTIFICATION_BATCH_SIZE', '10'))
        self.max_retries = int(os.getenv('NOTIFICATION_MAX_RETRIES', '3'))
        self.retry_delays = [60, 300, 900]  # 1min, 5min, 15min
        
        # Statistics
        self.stats = {
            'processed': 0,
            'failed': 0,
            'retried': 0,
            'started_at': None
        }
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        asyncio.create_task(self.stop())
    
    async def start(self):
        """Start the notification processor"""
        if self.is_running:
            logger.warning("Notification processor is already running")
            return
        
        if not supabase:
            logger.error("Supabase not configured - notification processor cannot start")
            return
        
        if not BOOKING_NOTIFICATIONS_AVAILABLE:
            logger.error("Booking notification service not available - processor cannot start")
            return
        
        self.is_running = True
        self.stats['started_at'] = datetime.utcnow()
        
        logger.info(f"Starting notification processor with {self.max_workers} workers")
        
        # Start worker tasks
        for i in range(self.max_workers):
            task = asyncio.create_task(self._worker_loop(f"worker-{i+1}"))
            self.worker_tasks.append(task)
        
        # Start maintenance task
        maintenance_task = asyncio.create_task(self._maintenance_loop())
        self.worker_tasks.append(maintenance_task)
        
        logger.info("Notification processor started successfully")
    
    async def stop(self):
        """Stop the notification processor"""
        if not self.is_running:
            logger.warning("Notification processor is not running")
            return
        
        self.is_running = False
        
        logger.info("Stopping notification processor...")
        
        # Cancel all worker tasks
        for task in self.worker_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.worker_tasks:
            await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        
        self.worker_tasks.clear()
        
        # Log final statistics
        runtime = datetime.utcnow() - self.stats['started_at'] if self.stats['started_at'] else timedelta(0)
        logger.info(
            f"Notification processor stopped. "
            f"Runtime: {runtime}, "
            f"Processed: {self.stats['processed']}, "
            f"Failed: {self.stats['failed']}, "
            f"Retried: {self.stats['retried']}"
        )
    
    async def _worker_loop(self, worker_name: str):
        """Main worker loop for processing notifications"""
        logger.info(f"Worker {worker_name} started")
        
        while self.is_running:
            try:
                # Fetch pending notifications
                notifications = await self._fetch_pending_notifications()
                
                if not notifications:
                    # No notifications to process, wait before checking again
                    await asyncio.sleep(self.poll_interval)
                    continue
                
                # Process notifications
                for notification in notifications:
                    if not self.is_running:
                        break
                    
                    try:
                        await self._process_notification(notification, worker_name)
                        self.stats['processed'] += 1
                        
                    except Exception as e:
                        logger.error(f"Worker {worker_name} failed to process notification {notification.id}: {e}")
                        await self._handle_notification_failure(notification, str(e))
                        self.stats['failed'] += 1
                
            except asyncio.CancelledError:
                logger.info(f"Worker {worker_name} cancelled")
                break
            except Exception as e:
                logger.error(f"Worker {worker_name} encountered error: {e}")
                await asyncio.sleep(5)  # Wait before retrying
        
        logger.info(f"Worker {worker_name} stopped")
    
    async def _maintenance_loop(self):
        """Maintenance loop for cleanup and scheduled notification processing"""
        logger.info("Maintenance worker started")
        
        while self.is_running:
            try:
                # Process scheduled notifications
                await self._process_scheduled_notifications()
                
                # Clean up old notifications
                await self._cleanup_old_notifications()
                
                # Wait before next maintenance cycle
                await asyncio.sleep(300)  # 5 minutes
                
            except asyncio.CancelledError:
                logger.info("Maintenance worker cancelled")
                break
            except Exception as e:
                logger.error(f"Maintenance worker error: {e}")
                await asyncio.sleep(60)  # Wait before retrying
        
        logger.info("Maintenance worker stopped")
    
    async def _fetch_pending_notifications(self) -> List[QueuedNotification]:
        """Fetch pending notifications from database"""
        try:
            # Query pending and retry-ready notifications
            current_time = datetime.utcnow().isoformat()
            
            response = supabase.table('notifications').select('*').or_(
                f'and(status.eq.pending),'
                f'and(status.eq.scheduled,metadata->>schedule_at.lte.{current_time}),'
                f'and(status.eq.retry,updated_at.lte.{(datetime.utcnow() - timedelta(minutes=5)).isoformat()})'
            ).order('created_at').limit(self.batch_size).execute()
            
            notifications = []
            for row in response.data:
                try:
                    metadata = row.get('metadata', {})
                    booking_data = metadata.get('booking_data', {})
                    
                    notification = QueuedNotification(
                        id=row['id'],
                        user_id=row['user_id'],
                        notification_type=row['type'],
                        channels=row['channel'].split(',') if row['channel'] else ['email'],
                        booking_data=booking_data,
                        priority=metadata.get('priority', 2),
                        schedule_at=datetime.fromisoformat(metadata['schedule_at'].replace('Z', '+00:00')) if metadata.get('schedule_at') else None,
                        retry_count=metadata.get('retry_count', 0),
                        max_retries=self.max_retries,
                        created_at=datetime.fromisoformat(row['created_at'].replace('Z', '+00:00')),
                        status=row['status'],
                        error_message=row.get('error_message')
                    )
                    
                    notifications.append(notification)
                    
                except Exception as e:
                    logger.error(f"Failed to parse notification {row.get('id', 'unknown')}: {e}")
            
            return notifications
            
        except Exception as e:
            logger.error(f"Failed to fetch pending notifications: {e}")
            return []
    
    async def _process_notification(self, notification: QueuedNotification, worker_name: str):
        """Process a single notification"""
        logger.info(f"Worker {worker_name} processing notification {notification.id} (type: {notification.notification_type})")
        
        try:
            # Mark as processing
            await self._update_notification_status(notification.id, 'processing', {})
            
            # Create BookingNotificationData object
            booking_data = BookingNotificationData(
                booking_id=notification.booking_data.get('booking_id', ''),
                user_id=notification.user_id,
                customer_name=notification.booking_data.get('customer_name', 'Customer'),
                customer_email=notification.booking_data.get('customer_email', ''),
                customer_phone=notification.booking_data.get('customer_phone'),
                barbershop_name=notification.booking_data.get('barbershop_name', 'Barbershop'),
                barber_name=notification.booking_data.get('barber_name', 'Barber'),
                service_name=notification.booking_data.get('service_name', 'Service'),
                appointment_date=datetime.fromisoformat(notification.booking_data.get('appointment_date', datetime.utcnow().isoformat()).replace('Z', '+00:00')),
                appointment_duration=notification.booking_data.get('appointment_duration', 30),
                total_price=notification.booking_data.get('total_price', 0),
                booking_status=notification.booking_data.get('booking_status', 'confirmed'),
                payment_status=notification.booking_data.get('payment_status'),
                payment_method=notification.booking_data.get('payment_method'),
                cancellation_reason=notification.booking_data.get('cancellation_reason'),
                notes=notification.booking_data.get('notes'),
                metadata=notification.booking_data.get('metadata')
            )
            
            # Convert notification type
            try:
                notification_type = BookingNotificationType(notification.notification_type)
            except ValueError:
                raise ValueError(f"Invalid notification type: {notification.notification_type}")
            
            # Convert channels
            channels = []
            for channel in notification.channels:
                try:
                    channels.append(NotificationChannel(channel.strip()))
                except ValueError:
                    logger.warning(f"Invalid channel: {channel}")
            
            if not channels:
                channels = [NotificationChannel.EMAIL]  # Default fallback
            
            # Convert priority
            priority = NotificationPriority(notification.priority)
            
            # Process the notification
            result = await booking_notification_service._process_notification(
                notification_id=notification.id,
                notification_type=notification_type,
                booking_data=booking_data,
                channels=channels
            )
            
            # Update status based on results
            success_count = sum(1 for r in result.values() if r.get('success', False))
            total_count = len(result)
            
            if success_count == total_count:
                status = 'sent'
                update_data = {
                    'sent_at': datetime.utcnow().isoformat(),
                    'delivered_at': datetime.utcnow().isoformat(),
                    'results': result
                }
                await self._update_notification_status(notification.id, status, update_data)
                
                logger.info(f"Successfully processed notification {notification.id}")
                
            elif success_count > 0:
                status = 'partial'
                update_data = {
                    'sent_at': datetime.utcnow().isoformat(),
                    'results': result,
                    'partial_success': True
                }
                await self._update_notification_status(notification.id, status, update_data)
                
                logger.warning(f"Partially processed notification {notification.id}: {success_count}/{total_count} channels succeeded")
                
            else:
                # All channels failed
                error_messages = [r.get('error', 'Unknown error') for r in result.values() if not r.get('success', False)]
                error_message = '; '.join(error_messages)
                
                raise Exception(f"All channels failed: {error_message}")
                
        except Exception as e:
            logger.error(f"Failed to process notification {notification.id}: {e}")
            raise
    
    async def _handle_notification_failure(self, notification: QueuedNotification, error_message: str):
        """Handle notification processing failure with retry logic"""
        
        retry_count = notification.retry_count + 1
        
        if retry_count <= self.max_retries:
            # Schedule retry
            retry_delay = self.retry_delays[min(retry_count - 1, len(self.retry_delays) - 1)]
            retry_at = datetime.utcnow() + timedelta(seconds=retry_delay)
            
            update_data = {
                'retry_count': retry_count,
                'retry_at': retry_at.isoformat(),
                'last_error': error_message
            }
            
            await self._update_notification_status(notification.id, 'retry', update_data, error_message)
            
            self.stats['retried'] += 1
            logger.info(f"Scheduled retry {retry_count}/{self.max_retries} for notification {notification.id} in {retry_delay} seconds")
            
        else:
            # Max retries reached, mark as failed
            update_data = {
                'retry_count': retry_count,
                'failed_at': datetime.utcnow().isoformat(),
                'final_error': error_message
            }
            
            await self._update_notification_status(notification.id, 'failed', update_data, error_message)
            
            logger.error(f"Notification {notification.id} failed permanently after {retry_count} attempts: {error_message}")
    
    async def _update_notification_status(self, notification_id: str, status: str, metadata_updates: Dict[str, Any], error_message: Optional[str] = None):
        """Update notification status in database"""
        try:
            update_data = {
                'status': status,
                'updated_at': datetime.utcnow().isoformat()
            }
            
            if error_message:
                update_data['error_message'] = error_message
            
            if metadata_updates:
                # Merge with existing metadata
                current_response = supabase.table('notifications').select('metadata').eq('id', notification_id).execute()
                current_metadata = current_response.data[0]['metadata'] if current_response.data else {}
                current_metadata.update(metadata_updates)
                update_data['metadata'] = current_metadata
            
            supabase.table('notifications').update(update_data).eq('id', notification_id).execute()
            
        except Exception as e:
            logger.error(f"Failed to update notification status for {notification_id}: {e}")
    
    async def _process_scheduled_notifications(self):
        """Process scheduled notifications that are due"""
        try:
            if not supabase:
                return
            
            # Call the database function to process scheduled notifications
            response = supabase.rpc('process_scheduled_notifications').execute()
            
            processed_count = response.data if response.data else 0
            
            if processed_count > 0:
                logger.info(f"Processed {processed_count} scheduled notifications")
                
        except Exception as e:
            logger.error(f"Failed to process scheduled notifications: {e}")
    
    async def _cleanup_old_notifications(self):
        """Clean up old notifications"""
        try:
            if not supabase:
                return
            
            # Call the database function to clean up old notifications
            retention_days = int(os.getenv('NOTIFICATION_RETENTION_DAYS', '90'))
            response = supabase.rpc('cleanup_old_notifications', {'retention_days': retention_days}).execute()
            
            deleted_count = response.data if response.data else 0
            
            if deleted_count > 0:
                logger.info(f"Cleaned up {deleted_count} old notifications")
                
        except Exception as e:
            logger.error(f"Failed to clean up old notifications: {e}")
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get processor statistics"""
        runtime = datetime.utcnow() - self.stats['started_at'] if self.stats['started_at'] else timedelta(0)
        
        return {
            'is_running': self.is_running,
            'worker_count': len(self.worker_tasks),
            'max_workers': self.max_workers,
            'runtime_seconds': runtime.total_seconds(),
            'notifications_processed': self.stats['processed'],
            'notifications_failed': self.stats['failed'],
            'notifications_retried': self.stats['retried'],
            'started_at': self.stats['started_at'].isoformat() if self.stats['started_at'] else None
        }

# Global processor instance
notification_processor = NotificationProcessor()

# Main function for standalone execution
async def main():
    """Main function for running the notification processor standalone"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger.info("Starting notification processor...")
    
    try:
        await notification_processor.start()
        
        # Keep running until interrupted
        while notification_processor.is_running:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    finally:
        await notification_processor.stop()
        logger.info("Notification processor shutdown complete")

if __name__ == "__main__":
    asyncio.run(main())
