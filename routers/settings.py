"""
Settings endpoints extracted from fastapi_backend.py
Handles barbershop settings, notifications, business hours, and billing
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, time

# Import memory manager
from services.memory_manager import memory_manager

# Settings models
class BarbershopSettings(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    description: Optional[str] = None
    services: Optional[List[str]] = []
    pricing: Optional[Dict[str, float]] = {}

class NotificationSettings(BaseModel):
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True
    appointment_reminders: bool = True
    promotion_alerts: bool = True
    system_notifications: bool = True

class BusinessHours(BaseModel):
    monday: Optional[Dict[str, str]] = None
    tuesday: Optional[Dict[str, str]] = None
    wednesday: Optional[Dict[str, str]] = None
    thursday: Optional[Dict[str, str]] = None
    friday: Optional[Dict[str, str]] = None
    saturday: Optional[Dict[str, str]] = None
    sunday: Optional[Dict[str, str]] = None
    timezone: str = "UTC"

class BillingInfo(BaseModel):
    current_plan: str
    usage: Dict[str, Any]
    next_billing_date: datetime
    amount_due: float

# Create router
router = APIRouter(prefix="/api/v1", tags=["Settings"])

# Security
security = HTTPBearer()

# Import the real authentication function
from routers.auth import get_current_user

# Mock data storage (replace with real database)
BARBERSHOP_SETTINGS = {}
NOTIFICATION_SETTINGS = {}
BUSINESS_HOURS = {}

@router.post("/settings/barbershop")
async def create_barbershop_settings(
    settings: BarbershopSettings,
    current_user: dict = Depends(get_current_user)
):
    """Create barbershop settings"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("create_barbershop_settings"):
        BARBERSHOP_SETTINGS[barbershop_id] = {
            **settings.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return {
            "status": "created",
            "barbershop_id": barbershop_id,
            "settings": BARBERSHOP_SETTINGS[barbershop_id]
        }

@router.put("/settings/barbershop")
async def update_barbershop_settings(
    settings: BarbershopSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update barbershop settings"""
    barbershop_id = current_user.get("barbershop_id")
    
    if barbershop_id not in BARBERSHOP_SETTINGS:
        raise HTTPException(status_code=404, detail="Barbershop settings not found")
    
    with memory_manager.memory_context("update_barbershop_settings"):
        BARBERSHOP_SETTINGS[barbershop_id].update({
            **settings.dict(),
            "updated_at": datetime.utcnow()
        })
        
        return {
            "status": "updated",
            "barbershop_id": barbershop_id,
            "settings": BARBERSHOP_SETTINGS[barbershop_id]
        }

@router.get("/settings/barbershop")
async def get_barbershop_settings(current_user: dict = Depends(get_current_user)):
    """Get barbershop settings"""
    barbershop_id = current_user.get("barbershop_id")
    
    if barbershop_id not in BARBERSHOP_SETTINGS:
        # Return default settings
        return {
            "barbershop_id": barbershop_id,
            "settings": {
                "name": "Default Barbershop",
                "address": None,
                "phone": None,
                "email": None,
                "description": None,
                "services": [],
                "pricing": {},
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    
    return {
        "barbershop_id": barbershop_id,
        "settings": BARBERSHOP_SETTINGS[barbershop_id]
    }

@router.get("/billing/current")
async def get_current_billing(current_user: dict = Depends(get_current_user)):
    """Get current billing information"""
    barbershop_id = current_user.get("barbershop_id")
    
    # Mock billing data
    billing_info = {
        "barbershop_id": barbershop_id,
        "current_plan": "Professional",
        "usage": {
            "appointments_this_month": 45,
            "storage_used_gb": 2.3,
            "api_calls": 1250
        },
        "next_billing_date": datetime.utcnow().replace(day=1),
        "amount_due": 29.99,
        "payment_method": "****1234",
        "billing_history": []
    }
    
    return billing_info

@router.get("/settings/notifications")
async def get_notification_settings(current_user: dict = Depends(get_current_user)):
    """Get notification settings"""
    user_id = current_user.get("user_id")
    
    if user_id not in NOTIFICATION_SETTINGS:
        # Return default settings
        return {
            "user_id": user_id,
            "settings": {
                "email_enabled": True,
                "sms_enabled": True,
                "push_enabled": True,
                "appointment_reminders": True,
                "promotion_alerts": True,
                "system_notifications": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    
    return {
        "user_id": user_id,
        "settings": NOTIFICATION_SETTINGS[user_id]
    }

@router.put("/settings/notifications")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update notification settings"""
    user_id = current_user.get("user_id")
    
    with memory_manager.memory_context("update_notification_settings"):
        NOTIFICATION_SETTINGS[user_id] = {
            **settings.dict(),
            "updated_at": datetime.utcnow()
        }
        
        if user_id not in NOTIFICATION_SETTINGS:
            NOTIFICATION_SETTINGS[user_id]["created_at"] = datetime.utcnow()
        
        return {
            "status": "updated",
            "user_id": user_id,
            "settings": NOTIFICATION_SETTINGS[user_id]
        }

@router.put("/settings/business-hours")
async def update_business_hours(
    hours: BusinessHours,
    current_user: dict = Depends(get_current_user)
):
    """Update business hours"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("update_business_hours"):
        BUSINESS_HOURS[barbershop_id] = {
            **hours.dict(),
            "updated_at": datetime.utcnow()
        }
        
        if barbershop_id not in BUSINESS_HOURS:
            BUSINESS_HOURS[barbershop_id]["created_at"] = datetime.utcnow()
        
        return {
            "status": "updated",
            "barbershop_id": barbershop_id,
            "hours": BUSINESS_HOURS[barbershop_id]
        }

@router.get("/settings/business-hours")
async def get_business_hours(current_user: dict = Depends(get_current_user)):
    """Get business hours"""
    barbershop_id = current_user.get("barbershop_id")
    
    if barbershop_id not in BUSINESS_HOURS:
        # Return default business hours
        default_hours = {
            "monday": {"open": "09:00", "close": "18:00"},
            "tuesday": {"open": "09:00", "close": "18:00"},
            "wednesday": {"open": "09:00", "close": "18:00"},
            "thursday": {"open": "09:00", "close": "18:00"},
            "friday": {"open": "09:00", "close": "18:00"},
            "saturday": {"open": "09:00", "close": "17:00"},
            "sunday": None,  # Closed
            "timezone": "UTC",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return {
            "barbershop_id": barbershop_id,
            "hours": default_hours
        }
    
    return {
        "barbershop_id": barbershop_id,
        "hours": BUSINESS_HOURS[barbershop_id]
    }

@router.get("/billing/history")
async def get_billing_history(current_user: dict = Depends(get_current_user)):
    """Get billing history"""
    barbershop_id = current_user.get("barbershop_id")
    
    # Mock billing history
    history = [
        {
            "id": "inv_001",
            "date": datetime.utcnow().replace(day=1) - timedelta(days=30),
            "amount": 29.99,
            "status": "paid",
            "description": "Professional Plan - Monthly"
        },
        {
            "id": "inv_002",
            "date": datetime.utcnow().replace(day=1) - timedelta(days=60),
            "amount": 29.99,
            "status": "paid",
            "description": "Professional Plan - Monthly"
        }
    ]
    
    return {
        "barbershop_id": barbershop_id,
        "history": history,
        "total_records": len(history)
    }