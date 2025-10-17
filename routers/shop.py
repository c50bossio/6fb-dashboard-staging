"""
Shop Router - Handles barbershop management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, time
import uuid
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import authentication
from routers.auth import get_current_user

# Create router
router = APIRouter()

# Pydantic models
class ShopDetails(BaseModel):
    id: str
    name: str
    address: str
    city: str
    state: str
    zip_code: str
    phone: str
    email: str
    website: Optional[str] = None
    description: Optional[str] = None
    business_hours: Dict[str, Dict[str, str]]
    services_offered: List[str]
    staff_count: int
    established_year: Optional[int] = None
    
class UpdateShopRequest(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    business_hours: Optional[Dict[str, Dict[str, str]]] = None

class ServiceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    duration_minutes: int = 30
    price: float
    category: str = "general"
    
class StaffMemberRequest(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "barber"
    specialties: Optional[List[str]] = None

# Sample data store
shops_db = {
    "550e8400-e29b-41d4-a716-446655440000": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Development Shop",
        "address": "123 Main St",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94102",
        "phone": "(555) 123-4567",
        "email": "dev@6fb.local",
        "website": "https://devshop.6fb.local",
        "description": "Premier barbershop in downtown SF",
        "business_hours": {
            "monday": {"open": "09:00", "close": "18:00"},
            "tuesday": {"open": "09:00", "close": "18:00"},
            "wednesday": {"open": "09:00", "close": "18:00"},
            "thursday": {"open": "09:00", "close": "18:00"},
            "friday": {"open": "09:00", "close": "20:00"},
            "saturday": {"open": "09:00", "close": "18:00"},
            "sunday": {"open": "closed", "close": "closed"}
        },
        "services_offered": ["Haircut", "Beard Trim", "Hot Shave", "Hair Color"],
        "staff_count": 4,
        "established_year": 2020
    }
}

services_db = {}
staff_db = {}

# Endpoints
@router.get("/details")
async def get_shop_details(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get details for the authenticated user's barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Return default shop if not found (for demo)
    if barbershop_id not in shops_db:
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
    
    return shops_db[barbershop_id]

@router.put("/details")
async def update_shop_details(
    request: UpdateShopRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update barbershop details"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Get existing shop or use default
    if barbershop_id not in shops_db:
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
    
    shop = shops_db[barbershop_id]
    
    # Update fields if provided
    update_fields = request.dict(exclude_unset=True)
    for field, value in update_fields.items():
        if value is not None:
            shop[field] = value
    
    shop["updated_at"] = datetime.now().isoformat()
    
    return {
        "message": "Shop details updated successfully",
        "shop": shop
    }

@router.get("/services")
async def get_shop_services(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all services offered by the barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Return sample services
    services = [
        {
            "id": "service-001",
            "barbershop_id": barbershop_id,
            "name": "Classic Haircut",
            "description": "Traditional men's haircut",
            "duration_minutes": 30,
            "price": 35.00,
            "category": "haircut",
            "active": True
        },
        {
            "id": "service-002",
            "barbershop_id": barbershop_id,
            "name": "Beard Trim",
            "description": "Professional beard shaping",
            "duration_minutes": 15,
            "price": 20.00,
            "category": "beard",
            "active": True
        },
        {
            "id": "service-003",
            "barbershop_id": barbershop_id,
            "name": "Premium Package",
            "description": "Haircut + Beard + Hot Towel",
            "duration_minutes": 60,
            "price": 80.00,
            "category": "package",
            "active": True
        }
    ]
    
    return {
        "barbershop_id": barbershop_id,
        "services": services,
        "count": len(services)
    }

@router.post("/services")
async def add_service(
    request: ServiceRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a new service to the barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Create new service
    service_id = str(uuid.uuid4())
    service = {
        "id": service_id,
        "barbershop_id": barbershop_id,
        **request.dict(),
        "active": True,
        "created_at": datetime.now().isoformat()
    }
    
    services_db[service_id] = service
    
    return {
        "message": "Service added successfully",
        "service": service
    }

@router.get("/staff")
async def get_shop_staff(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get all staff members"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Return sample staff
    staff = [
        {
            "id": "staff-001",
            "barbershop_id": barbershop_id,
            "name": "Mike Barber",
            "email": "mike@example.com",
            "phone": "(555) 234-5678",
            "role": "barber",
            "specialties": ["Classic Cuts", "Beard Styling"],
            "experience_years": 5,
            "rating": 4.8,
            "active": True
        },
        {
            "id": "staff-002",
            "barbershop_id": barbershop_id,
            "name": "John Smith",
            "email": "john@example.com",
            "phone": "(555) 345-6789",
            "role": "barber",
            "specialties": ["Modern Styles", "Fades"],
            "experience_years": 3,
            "rating": 4.6,
            "active": True
        },
        {
            "id": "staff-003",
            "barbershop_id": barbershop_id,
            "name": "Sarah Manager",
            "email": "sarah@example.com",
            "phone": "(555) 456-7890",
            "role": "manager",
            "specialties": [],
            "experience_years": 7,
            "rating": None,
            "active": True
        }
    ]
    
    return {
        "barbershop_id": barbershop_id,
        "staff": staff,
        "count": len(staff)
    }

@router.post("/staff")
async def add_staff_member(
    request: StaffMemberRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a new staff member"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Create new staff member
    staff_id = str(uuid.uuid4())
    staff_member = {
        "id": staff_id,
        "barbershop_id": barbershop_id,
        **request.dict(),
        "active": True,
        "created_at": datetime.now().isoformat()
    }
    
    staff_db[staff_id] = staff_member
    
    return {
        "message": "Staff member added successfully",
        "staff_member": staff_member
    }

@router.get("/business-hours")
async def get_business_hours(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get business hours"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Get shop details
    if barbershop_id not in shops_db:
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
    
    shop = shops_db[barbershop_id]
    
    return {
        "barbershop_id": barbershop_id,
        "business_hours": shop["business_hours"]
    }

@router.put("/business-hours")
async def update_business_hours(
    hours: Dict[str, Dict[str, str]],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update business hours"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Get shop
    if barbershop_id not in shops_db:
        barbershop_id = "550e8400-e29b-41d4-a716-446655440000"
    
    shop = shops_db[barbershop_id]
    shop["business_hours"] = hours
    shop["updated_at"] = datetime.now().isoformat()
    
    return {
        "message": "Business hours updated successfully",
        "business_hours": hours
    }

@router.get("/settings")
async def get_shop_settings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get shop settings and preferences"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    return {
        "barbershop_id": barbershop_id,
        "settings": {
            "booking": {
                "advance_booking_days": 30,
                "minimum_notice_hours": 2,
                "cancellation_policy_hours": 24,
                "allow_online_booking": True,
                "require_deposit": False,
                "deposit_amount": 0
            },
            "notifications": {
                "email_enabled": True,
                "sms_enabled": True,
                "reminder_hours_before": 24,
                "marketing_emails": True
            },
            "payments": {
                "accept_cash": True,
                "accept_card": True,
                "accept_online": True,
                "stripe_enabled": False,
                "tax_rate": 8.5
            },
            "display": {
                "show_prices": True,
                "show_duration": True,
                "show_barber_profiles": True,
                "theme": "light"
            }
        }
    }

@router.get("/dashboard")
async def get_shop_dashboard(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get shop dashboard summary"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    return {
        "barbershop_id": barbershop_id,
        "dashboard": {
            "today": {
                "appointments": 12,
                "revenue": 420.00,
                "new_customers": 2,
                "cancellations": 1
            },
            "week": {
                "appointments": 78,
                "revenue": 2730.00,
                "new_customers": 8,
                "busiest_day": "Friday"
            },
            "month": {
                "appointments": 450,
                "revenue": 15750.00,
                "growth": 12.5,
                "top_service": "Classic Haircut"
            },
            "notifications": [
                {"type": "info", "message": "3 appointments scheduled for tomorrow"},
                {"type": "warning", "message": "Low inventory on hair products"},
                {"type": "success", "message": "Revenue up 12.5% this month"}
            ]
        },
        "generated_at": datetime.now().isoformat()
    }