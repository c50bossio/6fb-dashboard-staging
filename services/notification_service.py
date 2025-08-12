#!/usr/bin/env python3
"""
Notification Service for 6FB AI Agent System
Handles internal notifications, alerts, and user communications
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)

class NotificationType(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class NotificationChannel(Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"

class Notification:
    """Internal notification object"""
    def __init__(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channels: List[NotificationChannel] = None,
        metadata: Dict[str, Any] = None
    ):
        self.id = f"notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{user_id[:8]}"
        self.user_id = user_id
        self.title = title
        self.message = message
        self.notification_type = notification_type
        self.channels = channels or [NotificationChannel.IN_APP]
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.read = False

class NotificationService:
    """Service for managing notifications across the system"""
    
    def __init__(self):
        self.notifications: Dict[str, List[Notification]] = {}
        self.global_notifications: List[Notification] = []
        
    async def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channels: List[NotificationChannel] = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Send a notification to a specific user"""
        try:
            notification = Notification(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                channels=channels,
                metadata=metadata
            )
            
            if user_id not in self.notifications:
                self.notifications[user_id] = []
            
            self.notifications[user_id].append(notification)
            
            # Log notification
            logger.info(f"Notification sent to {user_id}: {title}")
            
            return notification.id
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            raise
    
    async def send_broadcast_notification(
        self,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        channels: List[NotificationChannel] = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Send a broadcast notification to all users"""
        try:
            notification = Notification(
                user_id="broadcast",
                title=title,
                message=message,
                notification_type=notification_type,
                channels=channels,
                metadata=metadata
            )
            
            self.global_notifications.append(notification)
            
            logger.info(f"Broadcast notification sent: {title}")
            return notification.id
            
        except Exception as e:
            logger.error(f"Failed to send broadcast notification: {e}")
            raise
    
    async def get_user_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get notifications for a specific user"""
        try:
            user_notifications = self.notifications.get(user_id, [])
            global_notifications = self.global_notifications
            
            # Combine user and global notifications
            all_notifications = user_notifications + global_notifications
            
            # Filter by read status if requested
            if unread_only:
                all_notifications = [n for n in all_notifications if not n.read]
            
            # Sort by creation time (newest first)
            all_notifications.sort(key=lambda x: x.created_at, reverse=True)
            
            # Apply limit
            all_notifications = all_notifications[:limit]
            
            # Convert to dict format
            return [
                {
                    "id": n.id,
                    "user_id": n.user_id,
                    "title": n.title,
                    "message": n.message,
                    "type": n.notification_type.value,
                    "channels": [c.value for c in n.channels],
                    "metadata": n.metadata,
                    "created_at": n.created_at.isoformat(),
                    "read": n.read
                }
                for n in all_notifications
            ]
            
        except Exception as e:
            logger.error(f"Failed to get notifications for {user_id}: {e}")
            return []
    
    async def mark_notification_read(self, user_id: str, notification_id: str) -> bool:
        """Mark a notification as read"""
        try:
            # Check user notifications
            for notification in self.notifications.get(user_id, []):
                if notification.id == notification_id:
                    notification.read = True
                    return True
            
            # Check global notifications (mark read for this user only)
            for notification in self.global_notifications:
                if notification.id == notification_id:
                    # For global notifications, we'd need a more sophisticated read tracking
                    # For now, just mark as read
                    notification.read = True
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to mark notification {notification_id} as read: {e}")
            return False
    
    async def get_notification_count(self, user_id: str, unread_only: bool = True) -> int:
        """Get the count of notifications for a user"""
        try:
            notifications = await self.get_user_notifications(user_id, unread_only=unread_only)
            return len(notifications)
        except Exception as e:
            logger.error(f"Failed to get notification count for {user_id}: {e}")
            return 0
    
    async def clear_user_notifications(self, user_id: str) -> bool:
        """Clear all notifications for a user"""
        try:
            if user_id in self.notifications:
                del self.notifications[user_id]
                logger.info(f"Cleared notifications for user {user_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to clear notifications for {user_id}: {e}")
            return False

# Global notification service instance
notification_service = NotificationService()

# Helper functions for common notification scenarios
async def notify_user_success(user_id: str, title: str, message: str, metadata: Dict[str, Any] = None):
    """Send a success notification to a user"""
    return await notification_service.send_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.SUCCESS,
        metadata=metadata
    )

async def notify_user_error(user_id: str, title: str, message: str, metadata: Dict[str, Any] = None):
    """Send an error notification to a user"""
    return await notification_service.send_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.ERROR,
        metadata=metadata
    )

async def notify_user_warning(user_id: str, title: str, message: str, metadata: Dict[str, Any] = None):
    """Send a warning notification to a user"""
    return await notification_service.send_notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=NotificationType.WARNING,
        metadata=metadata
    )

async def notify_system_broadcast(title: str, message: str, notification_type: NotificationType = NotificationType.INFO):
    """Send a system-wide broadcast notification"""
    return await notification_service.send_broadcast_notification(
        title=title,
        message=message,
        notification_type=notification_type
    )