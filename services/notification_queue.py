"""
Notification Queue System for async processing
Handles background notification sending with retry logic
"""
import asyncio
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, Optional
from contextlib import contextmanager
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database setup
DATABASE_PATH = "data/agent_system.db"

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

class NotificationQueue:
    """Async notification queue with retry logic"""
    
    def __init__(self):
        self._init_database()
        self.processing = False
        self.queue_task = None
    
    def _init_database(self):
        """Initialize notification queue table"""
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    notification_type TEXT NOT NULL,
                    recipient TEXT NOT NULL,
                    subject TEXT,
                    content TEXT NOT NULL,
                    template_id TEXT,
                    template_data TEXT,
                    priority INTEGER DEFAULT 5,
                    status TEXT DEFAULT 'pending',
                    retry_count INTEGER DEFAULT 0,
                    max_retries INTEGER DEFAULT 3,
                    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP,
                    error_message TEXT,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            # Create index for efficient queue processing
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_notification_queue_status 
                ON notification_queue(status, scheduled_at)
            """)
            
            conn.commit()
    
    async def enqueue(
        self,
        user_id: int,
        notification_type: str,
        recipient: str,
        subject: str,
        content: str,
        template_id: Optional[str] = None,
        template_data: Optional[Dict] = None,
        priority: int = 5,
        scheduled_at: Optional[datetime] = None,
        metadata: Optional[Dict] = None
    ) -> int:
        """Add notification to queue"""
        
        if scheduled_at is None:
            scheduled_at = datetime.now()
        
        with get_db() as conn:
            cursor = conn.execute("""
                INSERT INTO notification_queue 
                (user_id, notification_type, recipient, subject, content, 
                 template_id, template_data, priority, scheduled_at, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                notification_type,
                recipient,
                subject,
                content,
                template_id,
                json.dumps(template_data) if template_data else None,
                priority,
                scheduled_at,
                json.dumps(metadata) if metadata else None
            ))
            
            queue_id = cursor.lastrowid
            conn.commit()
            
            logger.info(f"Enqueued notification {queue_id} for user {user_id}")
            
            # Start processing if not already running
            if not self.processing:
                asyncio.create_task(self.start_processing())
            
            return queue_id
    
    async def start_processing(self):
        """Start processing notification queue"""
        if self.processing:
            return
        
        self.processing = True
        logger.info("Starting notification queue processing")
        
        try:
            while self.processing:
                # Process pending notifications
                await self._process_batch()
                
                # Wait before next batch
                await asyncio.sleep(5)
                
        except Exception as e:
            logger.error(f"Queue processing error: {e}")
        finally:
            self.processing = False
            logger.info("Stopped notification queue processing")
    
    def stop_processing(self):
        """Stop processing notification queue"""
        self.processing = False
    
    async def _process_batch(self, batch_size: int = 10):
        """Process a batch of notifications"""
        
        with get_db() as conn:
            # Get pending notifications
            cursor = conn.execute("""
                SELECT * FROM notification_queue
                WHERE status = 'pending' 
                AND scheduled_at <= datetime('now')
                ORDER BY priority DESC, scheduled_at ASC
                LIMIT ?
            """, (batch_size,))
            
            notifications = cursor.fetchall()
            
            if not notifications:
                return
            
            logger.info(f"Processing {len(notifications)} notifications")
            
            # Import here to avoid circular import
            from services.notification_service import notification_service
            
            for notification in notifications:
                try:
                    # Update status to processing
                    conn.execute(
                        "UPDATE notification_queue SET status = 'processing' WHERE id = ?",
                        (notification["id"],)
                    )
                    conn.commit()
                    
                    # Prepare template data
                    template_data = None
                    if notification["template_data"]:
                        template_data = json.loads(notification["template_data"])
                    
                    # Send notification
                    result = await notification_service.send_notification(
                        user_id=notification["user_id"],
                        notification_type=notification["notification_type"],
                        recipient=notification["recipient"],
                        subject=notification["subject"] or "",
                        content=notification["content"],
                        template_id=notification["template_id"],
                        template_data=template_data,
                        check_preferences=True
                    )
                    
                    if result["success"]:
                        # Mark as sent
                        conn.execute("""
                            UPDATE notification_queue 
                            SET status = 'sent', processed_at = datetime('now')
                            WHERE id = ?
                        """, (notification["id"],))
                        
                        logger.info(f"Notification {notification['id']} sent successfully")
                    else:
                        # Handle failure
                        retry_count = notification["retry_count"] + 1
                        
                        if retry_count >= notification["max_retries"]:
                            # Max retries reached
                            conn.execute("""
                                UPDATE notification_queue 
                                SET status = 'failed', 
                                    processed_at = datetime('now'),
                                    error_message = ?,
                                    retry_count = ?
                                WHERE id = ?
                            """, (
                                result.get("message", "Unknown error"),
                                retry_count,
                                notification["id"]
                            ))
                            
                            logger.error(f"Notification {notification['id']} failed after {retry_count} retries")
                        else:
                            # Schedule retry
                            retry_delay = timedelta(minutes=5 * retry_count)
                            next_attempt = datetime.now() + retry_delay
                            
                            conn.execute("""
                                UPDATE notification_queue 
                                SET status = 'pending',
                                    retry_count = ?,
                                    scheduled_at = ?,
                                    error_message = ?
                                WHERE id = ?
                            """, (
                                retry_count,
                                next_attempt,
                                result.get("message", "Unknown error"),
                                notification["id"]
                            ))
                            
                            logger.warning(f"Notification {notification['id']} scheduled for retry {retry_count}")
                    
                    conn.commit()
                    
                except Exception as e:
                    logger.error(f"Error processing notification {notification['id']}: {e}")
                    
                    # Mark as error
                    conn.execute("""
                        UPDATE notification_queue 
                        SET status = 'error',
                            error_message = ?,
                            processed_at = datetime('now')
                        WHERE id = ?
                    """, (str(e), notification["id"]))
                    conn.commit()
    
    async def get_queue_status(self) -> Dict:
        """Get current queue status"""
        with get_db() as conn:
            # Get counts by status
            cursor = conn.execute("""
                SELECT status, COUNT(*) as count
                FROM notification_queue
                GROUP BY status
            """)
            
            status_counts = {row["status"]: row["count"] for row in cursor}
            
            # Get next scheduled
            cursor = conn.execute("""
                SELECT MIN(scheduled_at) as next_scheduled
                FROM notification_queue
                WHERE status = 'pending'
            """)
            
            next_scheduled = cursor.fetchone()["next_scheduled"]
            
            return {
                "processing": self.processing,
                "status_counts": status_counts,
                "total": sum(status_counts.values()),
                "next_scheduled": next_scheduled
            }
    
    async def retry_failed(self) -> int:
        """Retry all failed notifications"""
        with get_db() as conn:
            cursor = conn.execute("""
                UPDATE notification_queue
                SET status = 'pending',
                    retry_count = 0,
                    scheduled_at = datetime('now')
                WHERE status = 'failed'
            """)
            
            updated = cursor.rowcount
            conn.commit()
            
            logger.info(f"Scheduled {updated} failed notifications for retry")
            
            # Start processing if not already running
            if updated > 0 and not self.processing:
                asyncio.create_task(self.start_processing())
            
            return updated
    
    async def cancel_notification(self, queue_id: int) -> bool:
        """Cancel a queued notification"""
        with get_db() as conn:
            cursor = conn.execute("""
                UPDATE notification_queue
                SET status = 'cancelled'
                WHERE id = ? AND status = 'pending'
            """, (queue_id,))
            
            if cursor.rowcount > 0:
                conn.commit()
                logger.info(f"Cancelled notification {queue_id}")
                return True
            
            return False

# Singleton instance
notification_queue = NotificationQueue()