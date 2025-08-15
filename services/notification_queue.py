#!/usr/bin/env python3
"""
Notification Queue Service for 6FB AI Agent System
Handles asynchronous notification processing and delivery
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from collections import deque
import time

logger = logging.getLogger(__name__)

class QueueStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"

class NotificationQueueItem:
    """Queued notification item"""
    def __init__(
        self,
        notification_id: str,
        user_id: str,
        title: str,
        message: str,
        notification_type: str,
        channels: List[str],
        metadata: Dict[str, Any] = None,
        priority: int = 1,
        max_retries: int = 3
    ):
        self.id = f"queue_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{notification_id}"
        self.notification_id = notification_id
        self.user_id = user_id
        self.title = title
        self.message = message
        self.notification_type = notification_type
        self.channels = channels
        self.metadata = metadata or {}
        self.priority = priority
        self.max_retries = max_retries
        self.retry_count = 0
        self.status = QueueStatus.PENDING
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.error_message = None

class NotificationQueue:
    """Asynchronous notification queue processor"""
    
    def __init__(self):
        self.queue: deque = deque()
        self.processing_queue: Dict[str, NotificationQueueItem] = {}
        self.completed_items: List[NotificationQueueItem] = []
        self.failed_items: List[NotificationQueueItem] = []
        self.is_running = False
        self.worker_task = None
        self.processors: Dict[str, Callable] = {}
        
    def register_processor(self, channel: str, processor: Callable):
        """Register a processor for a specific notification channel"""
        self.processors[channel] = processor
        logger.info(f"Registered processor for channel: {channel}")
    
    async def enqueue(
        self,
        notification_id: str,
        user_id: str,
        title: str,
        message: str,
        notification_type: str,
        channels: List[str],
        metadata: Dict[str, Any] = None,
        priority: int = 1,
        max_retries: int = 3
    ) -> str:
        """Add a notification to the processing queue"""
        try:
            queue_item = NotificationQueueItem(
                notification_id=notification_id,
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channels=channels,
                metadata=metadata,
                priority=priority,
                max_retries=max_retries
            )
            
            # Insert based on priority (higher priority first)
            inserted = False
            for i, item in enumerate(self.queue):
                if queue_item.priority > item.priority:
                    self.queue.insert(i, queue_item)
                    inserted = True
                    break
            
            if not inserted:
                self.queue.append(queue_item)
            
            logger.info(f"Enqueued notification {queue_item.id} for user {user_id}")
            return queue_item.id
            
        except Exception as e:
            logger.error(f"Failed to enqueue notification: {e}")
            raise
    
    async def start_worker(self):
        """Start the background worker to process notifications"""
        if self.is_running:
            logger.warning("Notification queue worker is already running")
            return
        
        self.is_running = True
        self.worker_task = asyncio.create_task(self._worker_loop())
        logger.info("Notification queue worker started")
    
    async def stop_worker(self):
        """Stop the background worker"""
        if not self.is_running:
            logger.warning("Notification queue worker is not running")
            return
        
        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Notification queue worker stopped")
    
    async def _worker_loop(self):
        """Main worker loop to process notifications"""
        logger.info("Notification queue worker loop started")
        
        while self.is_running:
            try:
                if self.queue:
                    item = self.queue.popleft()
                    await self._process_item(item)
                else:
                    # No items to process, wait before checking again
                    await asyncio.sleep(1)
                    
            except asyncio.CancelledError:
                logger.info("Worker loop cancelled")
                break
            except Exception as e:
                logger.error(f"Error in worker loop: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def _process_item(self, item: NotificationQueueItem):
        """Process a single notification item"""
        try:
            item.status = QueueStatus.PROCESSING
            item.updated_at = datetime.now()
            self.processing_queue[item.id] = item
            
            logger.info(f"Processing notification {item.id} for user {item.user_id}")
            
            success = True
            errors = []
            
            # Process each channel
            for channel in item.channels:
                try:
                    if channel in self.processors:
                        await self.processors[channel](item)
                        logger.debug(f"Successfully processed {item.id} for channel {channel}")
                    else:
                        logger.warning(f"No processor registered for channel: {channel}")
                        
                except Exception as e:
                    error_msg = f"Failed to process {item.id} for channel {channel}: {e}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    success = False
            
            # Update item status
            if success:
                item.status = QueueStatus.COMPLETED
                self.completed_items.append(item)
                logger.info(f"Successfully completed notification {item.id}")
            else:
                await self._handle_failed_item(item, errors)
            
            # Remove from processing queue
            if item.id in self.processing_queue:
                del self.processing_queue[item.id]
                
        except Exception as e:
            logger.error(f"Critical error processing item {item.id}: {e}")
            await self._handle_failed_item(item, [str(e)])
    
    async def _handle_failed_item(self, item: NotificationQueueItem, errors: List[str]):
        """Handle a failed notification item"""
        item.retry_count += 1
        item.error_message = "; ".join(errors)
        item.updated_at = datetime.now()
        
        if item.retry_count < item.max_retries:
            # Retry the item
            item.status = QueueStatus.RETRYING
            # Add back to queue with lower priority
            item.priority = max(1, item.priority - 1)
            self.queue.append(item)
            logger.info(f"Retrying notification {item.id} (attempt {item.retry_count + 1})")
        else:
            # Max retries reached, mark as failed
            item.status = QueueStatus.FAILED
            self.failed_items.append(item)
            logger.error(f"Notification {item.id} failed after {item.retry_count} retries")
        
        # Remove from processing queue
        if item.id in self.processing_queue:
            del self.processing_queue[item.id]
    
    async def get_queue_status(self) -> Dict[str, Any]:
        """Get the current status of the notification queue"""
        return {
            "is_running": self.is_running,
            "pending_count": len(self.queue),
            "processing_count": len(self.processing_queue),
            "completed_count": len(self.completed_items),
            "failed_count": len(self.failed_items),
            "registered_processors": list(self.processors.keys()),
            "queue_items": [
                {
                    "id": item.id,
                    "user_id": item.user_id,
                    "status": item.status.value,
                    "priority": item.priority,
                    "retry_count": item.retry_count,
                    "created_at": item.created_at.isoformat()
                }
                for item in list(self.queue) + list(self.processing_queue.values())
            ]
        }
    
    async def get_failed_notifications(self) -> List[Dict[str, Any]]:
        """Get list of failed notifications"""
        return [
            {
                "id": item.id,
                "notification_id": item.notification_id,
                "user_id": item.user_id,
                "title": item.title,
                "channels": item.channels,
                "retry_count": item.retry_count,
                "error_message": item.error_message,
                "created_at": item.created_at.isoformat(),
                "updated_at": item.updated_at.isoformat()
            }
            for item in self.failed_items
        ]
    
    async def retry_failed_notification(self, queue_item_id: str) -> bool:
        """Retry a specific failed notification"""
        for i, item in enumerate(self.failed_items):
            if item.id == queue_item_id:
                # Reset retry count and re-queue
                item.retry_count = 0
                item.status = QueueStatus.PENDING
                item.error_message = None
                item.updated_at = datetime.now()
                
                # Move back to queue
                self.queue.append(item)
                self.failed_items.pop(i)
                
                logger.info(f"Retrying failed notification {queue_item_id}")
                return True
        
        return False

# Default processors for different channels
async def process_in_app_notification(item: NotificationQueueItem):
    """Process in-app notifications (stored in database/memory)"""
    logger.info(f"Processing in-app notification {item.id} for user {item.user_id}")
    # In-app notifications are handled by the notification service directly
    await asyncio.sleep(0.1)  # Simulate processing time

async def process_email_notification(item: NotificationQueueItem):
    """Process email notifications"""
    logger.info(f"Processing email notification {item.id} for user {item.user_id}")
    # Email processing would go here (SendGrid, etc.)
    await asyncio.sleep(0.5)  # Simulate processing time

async def process_sms_notification(item: NotificationQueueItem):
    """Process SMS notifications"""
    logger.info(f"Processing SMS notification {item.id} for user {item.user_id}")
    # SMS processing would go here (Twilio, etc.)
    await asyncio.sleep(0.3)  # Simulate processing time

async def process_push_notification(item: NotificationQueueItem):
    """Process push notifications"""
    logger.info(f"Processing push notification {item.id} for user {item.user_id}")
    # Push notification processing would go here
    await asyncio.sleep(0.2)  # Simulate processing time

# Global notification queue instance
notification_queue = NotificationQueue()

# Register default processors (worker will be started by FastAPI)
notification_queue.register_processor("in_app", process_in_app_notification)
notification_queue.register_processor("email", process_email_notification)
notification_queue.register_processor("sms", process_sms_notification)
notification_queue.register_processor("push", process_push_notification)