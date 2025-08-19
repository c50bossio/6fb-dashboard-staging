#!/usr/bin/env python3
"""
Booking Notifications Router for 6FB AI Agent System
Handles booking notification endpoints, webhook integrations, and notification management
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import logging
import json

# Import booking notification service
try:
    from services.booking_notifications import (
        booking_notification_service,
        BookingNotificationData,
        BookingNotificationType,
        NotificationChannel,
        NotificationPriority,
        notify_booking_confirmed,
        notify_payment_confirmed,
        notify_booking_cancelled,
        schedule_booking_reminders
    )
    BOOKING_NOTIFICATIONS_AVAILABLE = True
except ImportError as e:
    BOOKING_NOTIFICATIONS_AVAILABLE = False
    logging.warning(f"Booking notification service not available: {e}")

# Import memory manager
from services.memory_manager import memory_manager

logger = logging.getLogger(__name__)

# Pydantic models
class BookingNotificationRequest(BaseModel):
    booking_id: str
    user_id: str
    customer_name: str
    customer_email: EmailStr
    customer_phone: Optional[str] = None
    barbershop_name: str
    barber_name: str
    service_name: str
    appointment_date: datetime
    appointment_duration: int = 30
    total_price: float
    booking_status: str = "confirmed"
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationChannelRequest(BaseModel):
    channels: List[str] = ["email", "in_app"]
    priority: str = "normal"
    schedule_at: Optional[datetime] = None

class WebhookPayload(BaseModel):
    event_type: str
    booking_id: str
    data: Dict[str, Any]
    timestamp: datetime
    source: str = "stripe"

class NotificationStatusResponse(BaseModel):
    notification_id: str
    status: str
    created_at: datetime
    sent_at: Optional[datetime] = None
    channels_sent: Optional[List[str]] = None
    error_message: Optional[str] = None

# Create router
router = APIRouter(prefix="/api/v1/booking-notifications", tags=["Booking Notifications"])

# Security
security = HTTPBearer()

# Import the real authentication function
from routers.auth import get_current_user

def create_booking_data(request: BookingNotificationRequest) -> BookingNotificationData:
    """Convert request to BookingNotificationData"""
    return BookingNotificationData(
        booking_id=request.booking_id,
        user_id=request.user_id,
        customer_name=request.customer_name,
        customer_email=request.customer_email,
        customer_phone=request.customer_phone,
        barbershop_name=request.barbershop_name,
        barber_name=request.barber_name,
        service_name=request.service_name,
        appointment_date=request.appointment_date,
        appointment_duration=request.appointment_duration,
        total_price=request.total_price,
        booking_status=request.booking_status,
        payment_status=request.payment_status,
        payment_method=request.payment_method,
        cancellation_reason=request.cancellation_reason,
        notes=request.notes,
        metadata=request.metadata
    )

# Booking confirmation endpoints
@router.post("/booking-confirmed")
async def send_booking_confirmation(
    request: BookingNotificationRequest,
    channels: NotificationChannelRequest = NotificationChannelRequest(),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """Send booking confirmation notification"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Booking notification service not available"
        )
    
    try:
        with memory_manager.memory_context("booking_confirmation"):
            booking_data = create_booking_data(request)
            
            # Convert channel strings to enums
            notification_channels = []
            for channel in channels.channels:
                try:
                    notification_channels.append(NotificationChannel(channel))
                except ValueError:
                    logger.warning(f"Invalid notification channel: {channel}")
            
            # Convert priority
            priority_map = {
                "low": NotificationPriority.LOW,
                "normal": NotificationPriority.NORMAL,
                "high": NotificationPriority.HIGH,
                "urgent": NotificationPriority.URGENT
            }
            priority = priority_map.get(channels.priority, NotificationPriority.NORMAL)
            
            # Send notification
            result = await booking_notification_service.send_booking_notification(
                notification_type=BookingNotificationType.BOOKING_CONFIRMATION,
                booking_data=booking_data,
                channels=notification_channels,
                priority=priority,
                schedule_at=channels.schedule_at
            )
            
            # Schedule appointment reminders in background
            if request.booking_status == "confirmed":
                background_tasks.add_task(
                    schedule_booking_reminders,
                    booking_data
                )
            
            return {
                "success": True,
                "message": "Booking confirmation sent successfully",
                "notification_id": result.get("notification_id"),
                "status": result.get("status"),
                "scheduled_reminders": request.booking_status == "confirmed"
            }
            
    except Exception as e:
        logger.error(f"Failed to send booking confirmation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/payment-confirmed")
async def send_payment_confirmation(
    request: BookingNotificationRequest,
    channels: NotificationChannelRequest = NotificationChannelRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Send payment confirmation notification"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Booking notification service not available"
        )
    
    try:
        with memory_manager.memory_context("payment_confirmation"):
            booking_data = create_booking_data(request)
            
            # Convert channels and priority
            notification_channels = [NotificationChannel(ch) for ch in channels.channels if ch in ["email", "sms", "in_app", "push"]]
            priority_map = {"low": NotificationPriority.LOW, "normal": NotificationPriority.NORMAL, "high": NotificationPriority.HIGH, "urgent": NotificationPriority.URGENT}
            priority = priority_map.get(channels.priority, NotificationPriority.HIGH)
            
            result = await booking_notification_service.send_booking_notification(
                notification_type=BookingNotificationType.PAYMENT_CONFIRMATION,
                booking_data=booking_data,
                channels=notification_channels,
                priority=priority,
                schedule_at=channels.schedule_at
            )
            
            return {
                "success": True,
                "message": "Payment confirmation sent successfully",
                "notification_id": result.get("notification_id"),
                "status": result.get("status")
            }
            
    except Exception as e:
        logger.error(f"Failed to send payment confirmation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/booking-cancelled")
async def send_cancellation_notice(
    request: BookingNotificationRequest,
    channels: NotificationChannelRequest = NotificationChannelRequest(),
    current_user: dict = Depends(get_current_user)
):
    """Send booking cancellation notice"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Booking notification service not available"
        )
    
    try:
        with memory_manager.memory_context("cancellation_notice"):
            booking_data = create_booking_data(request)
            
            # Default to all channels for cancellations
            if not channels.channels:
                channels.channels = ["email", "sms", "in_app"]
            
            notification_channels = [NotificationChannel(ch) for ch in channels.channels if ch in ["email", "sms", "in_app", "push"]]
            priority = NotificationPriority.URGENT  # Cancellations are always urgent
            
            result = await booking_notification_service.send_booking_notification(
                notification_type=BookingNotificationType.CANCELLATION_NOTICE,
                booking_data=booking_data,
                channels=notification_channels,
                priority=priority,
                schedule_at=channels.schedule_at
            )
            
            return {
                "success": True,
                "message": "Cancellation notice sent successfully",
                "notification_id": result.get("notification_id"),
                "status": result.get("status")
            }
            
    except Exception as e:
        logger.error(f"Failed to send cancellation notice: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/appointment-reminders/schedule")
async def schedule_appointment_reminders(
    request: BookingNotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Schedule appointment reminders (24h and 2h before)"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Booking notification service not available"
        )
    
    try:
        with memory_manager.memory_context("schedule_reminders"):
            booking_data = create_booking_data(request)
            
            result = await booking_notification_service.schedule_appointment_reminders(booking_data)
            
            return {
                "success": True,
                "message": "Appointment reminders scheduled successfully",
                "scheduled_reminders": result
            }
            
    except Exception as e:
        logger.error(f"Failed to schedule appointment reminders: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Webhook endpoints
@router.post("/webhooks/stripe")
async def handle_stripe_webhook(
    payload: WebhookPayload,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Handle Stripe payment webhooks"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        logger.warning("Stripe webhook received but notification service not available")
        return {"received": True, "processed": False}
    
    try:
        with memory_manager.memory_context("stripe_webhook"):
            if payload.event_type == "payment_intent.succeeded":
                # Extract booking information from webhook data
                booking_id = payload.data.get("metadata", {}).get("booking_id")
                if not booking_id:
                    logger.warning("Stripe webhook missing booking_id in metadata")
                    return {"received": True, "processed": False}
                
                # Here you would typically fetch the full booking data from database
                # For now, we'll create a minimal notification
                
                # Schedule payment confirmation notification
                background_tasks.add_task(
                    send_stripe_payment_notification,
                    booking_id,
                    payload.data
                )
                
                return {
                    "received": True,
                    "processed": True,
                    "booking_id": booking_id,
                    "event_type": payload.event_type
                }
            
            elif payload.event_type == "payment_intent.payment_failed":
                booking_id = payload.data.get("metadata", {}).get("booking_id")
                if booking_id:
                    background_tasks.add_task(
                        send_payment_failed_notification,
                        booking_id,
                        payload.data
                    )
                
                return {
                    "received": True,
                    "processed": True,
                    "booking_id": booking_id,
                    "event_type": payload.event_type
                }
            
            else:
                logger.info(f"Unhandled Stripe webhook event: {payload.event_type}")
                return {"received": True, "processed": False}
                
    except Exception as e:
        logger.error(f"Failed to process Stripe webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhooks/booking-wizard")
async def handle_booking_wizard_webhook(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Handle BookingWizard completion webhooks"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        logger.warning("BookingWizard webhook received but notification service not available")
        return {"received": True, "processed": False}
    
    try:
        with memory_manager.memory_context("booking_wizard_webhook"):
            event_type = payload.get("event_type")
            booking_data = payload.get("booking_data")
            
            if not booking_data:
                logger.warning("BookingWizard webhook missing booking_data")
                return {"received": True, "processed": False}
            
            if event_type == "booking_completed":
                # Create booking notification request from wizard data
                notification_request = BookingNotificationRequest(
                    booking_id=booking_data.get("bookingId", str(uuid.uuid4())),
                    user_id=booking_data.get("customerInfo", {}).get("userId", "guest"),
                    customer_name=booking_data.get("customerInfo", {}).get("name", "Customer"),
                    customer_email=booking_data.get("customerInfo", {}).get("email"),
                    customer_phone=booking_data.get("customerInfo", {}).get("phone"),
                    barbershop_name=booking_data.get("locationDetails", {}).get("name", "Barbershop"),
                    barber_name=booking_data.get("barberDetails", {}).get("name", "Barber"),
                    service_name=booking_data.get("serviceDetails", {}).get("name", "Service"),
                    appointment_date=datetime.fromisoformat(booking_data.get("dateTime").replace("Z", "+00:00")),
                    appointment_duration=booking_data.get("duration", 30),
                    total_price=booking_data.get("price", 0),
                    booking_status="confirmed",
                    payment_method=booking_data.get("paymentMethod"),
                    payment_status=booking_data.get("paymentStatus")
                )
                
                # Send booking confirmation
                background_tasks.add_task(
                    process_booking_wizard_completion,
                    notification_request
                )
                
                return {
                    "received": True,
                    "processed": True,
                    "booking_id": notification_request.booking_id,
                    "event_type": event_type
                }
            
            else:
                logger.info(f"Unhandled BookingWizard event: {event_type}")
                return {"received": True, "processed": False}
                
    except Exception as e:
        logger.error(f"Failed to process BookingWizard webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Notification management endpoints
@router.get("/notifications/{notification_id}/status")
async def get_notification_status(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
) -> NotificationStatusResponse:
    """Get the status of a specific notification"""
    
    # In a real implementation, you would query the database
    # For now, return a mock response
    return NotificationStatusResponse(
        notification_id=notification_id,
        status="sent",
        created_at=datetime.utcnow() - timedelta(minutes=5),
        sent_at=datetime.utcnow() - timedelta(minutes=4),
        channels_sent=["email", "in_app"]
    )

@router.get("/notifications/pending")
async def get_pending_notifications(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get pending notifications"""
    
    # In a real implementation, query the notifications table
    return {
        "pending_notifications": [],
        "total": 0,
        "limit": limit,
        "offset": offset
    }

@router.post("/notifications/{notification_id}/retry")
async def retry_failed_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Retry a failed notification"""
    
    if not BOOKING_NOTIFICATIONS_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Booking notification service not available"
        )
    
    try:
        # In a real implementation, you would:
        # 1. Fetch the notification from database
        # 2. Retry sending through the notification service
        # 3. Update the notification status
        
        return {
            "success": True,
            "message": f"Notification {notification_id} queued for retry",
            "notification_id": notification_id
        }
        
    except Exception as e:
        logger.error(f"Failed to retry notification {notification_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Background task functions
async def send_stripe_payment_notification(booking_id: str, payment_data: Dict[str, Any]):
    """Background task to send payment confirmation from Stripe webhook"""
    try:
        # In a real implementation, fetch booking details from database using booking_id
        # Then send payment confirmation notification
        logger.info(f"Processing Stripe payment confirmation for booking {booking_id}")
        
        # Mock implementation - in production, fetch real booking data and send notification
        
    except Exception as e:
        logger.error(f"Failed to process Stripe payment notification: {e}")

async def send_payment_failed_notification(booking_id: str, payment_data: Dict[str, Any]):
    """Background task to send payment failure notification"""
    try:
        logger.info(f"Processing Stripe payment failure for booking {booking_id}")
        
        # In production, send payment failure notification to customer
        
    except Exception as e:
        logger.error(f"Failed to process payment failure notification: {e}")

async def process_booking_wizard_completion(request: BookingNotificationRequest):
    """Background task to process BookingWizard completion"""
    try:
        booking_data = create_booking_data(request)
        
        # Send booking confirmation
        await notify_booking_confirmed(booking_data)
        
        # Schedule reminders
        await schedule_booking_reminders(booking_data)
        
        logger.info(f"Processed BookingWizard completion for booking {request.booking_id}")
        
    except Exception as e:
        logger.error(f"Failed to process BookingWizard completion: {e}")

# Health check endpoint
@router.get("/health")
async def notification_health_check():
    """Health check for notification system"""
    return {
        "status": "healthy",
        "booking_notifications_available": BOOKING_NOTIFICATIONS_AVAILABLE,
        "timestamp": datetime.utcnow().isoformat()
    }
