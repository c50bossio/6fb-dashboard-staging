"""
Settings endpoints extracted from fastapi_backend.py
Handles barbershop settings, notifications, business hours, and billing
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, time

# Import memory manager and Supabase proxy
from services.memory_manager import memory_manager
from services.supabase_api_proxy import supabase_proxy

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

# Import Supabase for direct queries where needed
import os
from supabase import create_client, Client

# Initialize Supabase client for settings operations
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase_client = None

if supabase_url and supabase_key:
    try:
        supabase_client: Client = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Failed to initialize Supabase client in settings: {e}")

# Mock data storage as fallback
BARBERSHOP_SETTINGS = {}
NOTIFICATION_SETTINGS = {}
BUSINESS_HOURS = {}

@router.post("/settings/barbershop")
async def create_barbershop_settings(
    settings: BarbershopSettings,
    current_user: dict = Depends(get_current_user)
):
    """Create barbershop settings using Supabase"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(status_code=400, detail="No barbershop associated with user")
    
    with memory_manager.memory_context("create_barbershop_settings"):
        if supabase_client:
            try:
                # Insert or update barbershop record
                upsert_data = {
                    "id": barbershop_id,
                    **settings.dict(),
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                response = supabase_client.table('barbershops').upsert(upsert_data).execute()
                
                return {
                    "status": "created",
                    "barbershop_id": barbershop_id,
                    "settings": upsert_data,
                    "data_source": "supabase_real"
                }
            except Exception as e:
                print(f"Error creating barbershop settings in Supabase: {e}")
                # Fall back to mock storage
        
        # Fallback to mock storage
        BARBERSHOP_SETTINGS[barbershop_id] = {
            **settings.dict(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        return {
            "status": "created",
            "barbershop_id": barbershop_id,
            "settings": BARBERSHOP_SETTINGS[barbershop_id],
            "data_source": "mock"
        }

@router.put("/settings/barbershop")
async def update_barbershop_settings(
    settings: BarbershopSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update barbershop settings using Supabase"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(status_code=400, detail="No barbershop associated with user")
    
    with memory_manager.memory_context("update_barbershop_settings"):
        # Use the Supabase proxy service
        result = await supabase_proxy.update_barbershop_settings(barbershop_id, settings.dict())
        
        if result.get("status") == "error":
            # Fallback to mock storage
            if barbershop_id not in BARBERSHOP_SETTINGS:
                BARBERSHOP_SETTINGS[barbershop_id] = {}
            
            BARBERSHOP_SETTINGS[barbershop_id].update({
                **settings.dict(),
                "updated_at": datetime.utcnow()
            })
            
            return {
                "status": "updated",
                "barbershop_id": barbershop_id,
                "settings": BARBERSHOP_SETTINGS[barbershop_id],
                "data_source": "mock"
            }
        
        return {
            "status": "updated",
            "barbershop_id": barbershop_id,
            "settings": result,
            "data_source": "supabase_real"
        }

@router.get("/settings/barbershop")
async def get_barbershop_settings(current_user: dict = Depends(get_current_user)):
    """Get barbershop settings using Supabase"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(status_code=400, detail="No barbershop associated with user")
    
    with memory_manager.memory_context("get_barbershop_settings"):
        # Use the Supabase proxy service
        settings = await supabase_proxy.get_barbershop_settings(barbershop_id)
        
        return {
            "barbershop_id": barbershop_id,
            "settings": settings
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
    """Get notification settings using Supabase"""
    user_id = current_user.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    
    with memory_manager.memory_context("get_notification_settings"):
        if supabase_client:
            try:
                # Query user notification preferences
                response = supabase_client.table('user_notification_preferences').select('*').eq('user_id', user_id).execute()
                
                if response.data:
                    settings_data = response.data[0]
                    return {
                        "user_id": user_id,
                        "settings": {
                            "email_enabled": settings_data.get('email_enabled', True),
                            "sms_enabled": settings_data.get('sms_enabled', True),
                            "push_enabled": settings_data.get('push_enabled', True),
                            "appointment_reminders": settings_data.get('appointment_reminders', True),
                            "promotion_alerts": settings_data.get('promotion_alerts', True),
                            "system_notifications": settings_data.get('system_notifications', True),
                            "created_at": settings_data.get('created_at'),
                            "updated_at": settings_data.get('updated_at'),
                            "data_source": "supabase_real"
                        }
                    }
            except Exception as e:
                print(f"Error fetching notification settings from Supabase: {e}")
        
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
                "updated_at": datetime.utcnow(),
                "data_source": "default"
            }
        }

@router.put("/settings/notifications")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user)
):
    """Update notification settings using Supabase"""
    user_id = current_user.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID not found")
    
    with memory_manager.memory_context("update_notification_settings"):
        if supabase_client:
            try:
                # Upsert notification preferences
                upsert_data = {
                    "user_id": user_id,
                    **settings.dict(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                
                response = supabase_client.table('user_notification_preferences').upsert(upsert_data).execute()
                
                return {
                    "status": "updated",
                    "user_id": user_id,
                    "settings": upsert_data,
                    "data_source": "supabase_real"
                }
            except Exception as e:
                print(f"Error updating notification settings in Supabase: {e}")
                # Fall back to mock storage
        
        # Fallback to mock storage
        NOTIFICATION_SETTINGS[user_id] = {
            **settings.dict(),
            "updated_at": datetime.utcnow()
        }
        
        if user_id not in NOTIFICATION_SETTINGS:
            NOTIFICATION_SETTINGS[user_id]["created_at"] = datetime.utcnow()
        
        return {
            "status": "updated",
            "user_id": user_id,
            "settings": NOTIFICATION_SETTINGS[user_id],
            "data_source": "mock"
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