"""
Notifications endpoints extracted from fastapi_backend.py
Handles notification sending, testing, queue management, and history
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

# Import notification services
try:
    from services.notification_service import notification_service
    from services.notification_queue import notification_queue
    NOTIFICATION_SERVICES_AVAILABLE = True
except ImportError:
    NOTIFICATION_SERVICES_AVAILABLE = False

# Import memory manager and Supabase for notification persistence
from services.memory_manager import memory_manager
import os
from supabase import create_client, Client

# Initialize Supabase client for notification history
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_client = None

if supabase_url and supabase_key:
    try:
        supabase_client: Client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to initialize Supabase client in notifications: {e}")

# Notification models
class NotificationRequest(BaseModel):
    recipient: str  # email or phone
    message: str
    subject: Optional[str] = None
    type: str = "email"  # email, sms, push
    priority: str = "normal"  # low, normal, high, urgent
    scheduled_at: Optional[datetime] = None

class BulkNotificationRequest(BaseModel):
    recipients: List[str]
    message: str
    subject: Optional[str] = None
    type: str = "email"
    priority: str = "normal"
    scheduled_at: Optional[datetime] = None

class QueueNotificationRequest(BaseModel):
    notifications: List[NotificationRequest]
    batch_name: Optional[str] = None
    execute_at: Optional[datetime] = None

# Create router
router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])

# Security
security = HTTPBearer()

# Import the real authentication function
from routers.auth import get_current_user

# Mock notification storage
NOTIFICATION_HISTORY = []
NOTIFICATION_QUEUE_ITEMS = {}

# Test endpoint removed for production security
# Original test notification endpoint has been disabled for security compliance

@router.post("/send")
async def send_notification(
    notification: NotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a notification"""
    if not NOTIFICATION_SERVICES_AVAILABLE:
        # Mock successful send with database storage
        notification_id = str(uuid.uuid4())
        notification_record = {
            "id": notification_id,
            "recipient": notification.recipient,
            "message": notification.message,
            "subject": notification.subject,
            "type": notification.type,
            "status": "sent",
            "sent_at": datetime.utcnow(),
            "user_id": current_user.get("user_id"),
            "barbershop_id": current_user.get("barbershop_id")
        }
        
        # Store in database if available
        if supabase_client:
            try:
                supabase_client.table('notification_history').insert({
                    **notification_record,
                    "sent_at": notification_record["sent_at"].isoformat()
                }).execute()
            except Exception as e:
                print(f"Failed to save notification to database: {e}")
        
        NOTIFICATION_HISTORY.append(notification_record)
        
        return {
            "status": "sent",
            "notification_id": notification_id,
            "message": "Notification sent successfully (simulated)"
        }
    
    try:
        with memory_manager.memory_context("send_notification"):
            # Send notification based on type
            if notification.type == "email":
                result = await notification_service.send_email(
                    to=notification.recipient,
                    subject=notification.subject or "Notification",
                    message=notification.message
                )
            elif notification.type == "sms":
                result = await notification_service.send_sms(
                    to=notification.recipient,
                    message=notification.message
                )
            elif notification.type == "push":
                result = await notification_service.send_push(
                    to=notification.recipient,
                    title=notification.subject or "Notification",
                    message=notification.message
                )
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported notification type: {notification.type}")
            
            # Log to database and history
            notification_id = str(uuid.uuid4())
            notification_record = {
                "id": notification_id,
                "recipient": notification.recipient,
                "message": notification.message,
                "subject": notification.subject,
                "type": notification.type,
                "status": "sent" if result.get("success") else "failed",
                "sent_at": datetime.utcnow(),
                "user_id": current_user.get("user_id"),
                "barbershop_id": current_user.get("barbershop_id"),
                "result": result
            }
            
            # Store in database if available
            if supabase_client:
                try:
                    supabase_client.table('notification_history').insert({
                        **{k: v for k, v in notification_record.items() if k != 'result'},
                        "sent_at": notification_record["sent_at"].isoformat()
                    }).execute()
                except Exception as e:
                    print(f"Failed to save notification to database: {e}")
            
            NOTIFICATION_HISTORY.append(notification_record)
            
            return {
                "status": "sent" if result.get("success") else "failed",
                "notification_id": notification_id,
                "result": result
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@router.get("/history")
async def get_notification_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get notification history from database or fallback to memory"""
    user_id = current_user.get("user_id")
    barbershop_id = current_user.get("barbershop_id")
    
    if supabase_client:
        try:
            # Query from database with pagination
            query = supabase_client.table('notification_history').select('*')
            
            # Filter by user or barbershop
            if barbershop_id:
                query = query.eq('barbershop_id', barbershop_id)
            else:
                query = query.eq('user_id', user_id)
            
            # Order by sent_at descending and paginate
            response = query.order('sent_at', desc=True).range(offset, offset + limit - 1).execute()
            
            notifications = response.data if response.data else []
            
            # Get total count for pagination
            count_query = supabase_client.table('notification_history').select('*', count='exact')
            if barbershop_id:
                count_query = count_query.eq('barbershop_id', barbershop_id)
            else:
                count_query = count_query.eq('user_id', user_id)
            
            count_response = count_query.execute()
            total = count_response.count if hasattr(count_response, 'count') else len(notifications)
            
            return {
                "notifications": notifications,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total,
                "data_source": "supabase_real"
            }
        except Exception as e:
            print(f"Failed to fetch notification history from database: {e}")
    
    # Fallback to memory storage
    user_notifications = [
        notif for notif in NOTIFICATION_HISTORY 
        if notif.get("user_id") == user_id or 
           (barbershop_id and notif.get("barbershop_id") == barbershop_id)
    ]
    
    total = len(user_notifications)
    notifications = user_notifications[offset:offset + limit]
    
    return {
        "notifications": notifications,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total,
        "data_source": "memory_fallback"
    }

@router.post("/queue")
async def queue_notifications(
    request: QueueNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Queue notifications for batch processing"""
    if not NOTIFICATION_SERVICES_AVAILABLE:
        # Mock queue operation
        queue_id = str(uuid.uuid4())
        NOTIFICATION_QUEUE_ITEMS[queue_id] = {
            "id": queue_id,
            "batch_name": request.batch_name or f"Batch {datetime.utcnow().strftime('%Y%m%d_%H%M')}",
            "notifications": [notif.dict() for notif in request.notifications],
            "status": "queued",
            "created_at": datetime.utcnow(),
            "execute_at": request.execute_at or datetime.utcnow(),
            "user_id": current_user.get("user_id"),
            "total_count": len(request.notifications),
            "processed_count": 0
        }
        
        return {
            "status": "queued",
            "queue_id": queue_id,
            "total_notifications": len(request.notifications),
            "execute_at": request.execute_at or datetime.utcnow()
        }
    
    try:
        with memory_manager.memory_context("queue_notifications"):
            queue_id = await notification_queue.add_batch(
                notifications=[notif.dict() for notif in request.notifications],
                batch_name=request.batch_name,
                execute_at=request.execute_at,
                user_id=current_user.get("user_id")
            )
            
            NOTIFICATION_QUEUE_ITEMS[queue_id] = {
                "id": queue_id,
                "batch_name": request.batch_name or f"Batch {datetime.utcnow().strftime('%Y%m%d_%H%M')}",
                "notifications": [notif.dict() for notif in request.notifications],
                "status": "queued",
                "created_at": datetime.utcnow(),
                "execute_at": request.execute_at or datetime.utcnow(),
                "user_id": current_user.get("user_id"),
                "total_count": len(request.notifications),
                "processed_count": 0
            }
            
            return {
                "status": "queued",
                "queue_id": queue_id,
                "total_notifications": len(request.notifications),
                "execute_at": request.execute_at or datetime.utcnow()
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue notifications: {str(e)}")

@router.get("/queue/status")
async def get_queue_status(current_user: dict = Depends(get_current_user)):
    """Get notification queue status"""
    user_id = current_user.get("user_id")
    
    # Filter queue items by user
    user_queue_items = {
        queue_id: item for queue_id, item in NOTIFICATION_QUEUE_ITEMS.items()
        if item.get("user_id") == user_id
    }
    
    # Calculate statistics
    total_queued = len([item for item in user_queue_items.values() if item["status"] == "queued"])
    total_processing = len([item for item in user_queue_items.values() if item["status"] == "processing"])
    total_completed = len([item for item in user_queue_items.values() if item["status"] == "completed"])
    total_failed = len([item for item in user_queue_items.values() if item["status"] == "failed"])
    
    return {
        "queue_items": list(user_queue_items.values()),
        "statistics": {
            "total_queued": total_queued,
            "total_processing": total_processing,
            "total_completed": total_completed,
            "total_failed": total_failed,
            "total_items": len(user_queue_items)
        }
    }

@router.post("/queue/{queue_id}/cancel")
async def cancel_queued_notifications(
    queue_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel queued notifications"""
    if queue_id not in NOTIFICATION_QUEUE_ITEMS:
        raise HTTPException(status_code=404, detail="Queue item not found")
    
    queue_item = NOTIFICATION_QUEUE_ITEMS[queue_id]
    
    # Verify ownership
    if queue_item.get("user_id") != current_user.get("user_id"):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this queue item")
    
    # Update status
    if queue_item["status"] in ["queued", "processing"]:
        queue_item["status"] = "cancelled"
        queue_item["cancelled_at"] = datetime.utcnow()
        
        if NOTIFICATION_SERVICES_AVAILABLE:
            try:
                await notification_queue.cancel_batch(queue_id)
            except Exception as e:
                # Log error but continue
                pass
        
        return {
            "status": "cancelled",
            "queue_id": queue_id,
            "message": "Queue item cancelled successfully"
        }
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot cancel queue item with status: {queue_item['status']}"
        )

@router.post("/queue/retry-failed")
async def retry_failed_notifications(current_user: dict = Depends(get_current_user)):
    """Retry failed notifications"""
    user_id = current_user.get("user_id")
    
    # Find failed notifications for this user
    failed_items = [
        item for item in NOTIFICATION_QUEUE_ITEMS.values()
        if item.get("user_id") == user_id and item["status"] == "failed"
    ]
    
    if not failed_items:
        return {
            "status": "no_failed_items",
            "message": "No failed notifications to retry"
        }
    
    # Reset failed items to queued
    retry_count = 0
    for item in failed_items:
        item["status"] = "queued"
        item["retry_at"] = datetime.utcnow()
        retry_count += 1
    
    if NOTIFICATION_SERVICES_AVAILABLE:
        try:
            for item in failed_items:
                await notification_queue.retry_batch(item["id"])
        except Exception as e:
            # Log error but continue
            pass
    
    return {
        "status": "retrying",
        "retry_count": retry_count,
        "message": f"Retrying {retry_count} failed notification batches"
    }