"""
Bookings Router - Handles appointment booking and management
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import uuid
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import authentication
from routers.auth import get_current_user, get_current_user_optional

# Create router
router = APIRouter()

# Pydantic models
class CreateBookingRequest(BaseModel):
    barbershop_id: str
    barber_id: str
    service_id: str
    appointment_date: str
    appointment_time: str
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    notes: Optional[str] = None
    
class BookingResponse(BaseModel):
    booking_id: str
    barbershop_id: str
    barber_id: str
    barber_name: str
    service_id: str
    service_name: str
    appointment_datetime: str
    duration_minutes: int
    price: float
    customer_name: str
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: str

class UpdateBookingRequest(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

# Sample data store (in production, this would be database)
bookings_db = {}

# Endpoints
@router.post("/create", response_model=BookingResponse)
async def create_booking(
    request: CreateBookingRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
):
    """Create a new booking"""
    try:
        # Generate booking ID
        booking_id = str(uuid.uuid4())
        
        # Parse appointment datetime
        appointment_datetime = f"{request.appointment_date}T{request.appointment_time}"
        
        # Create booking record
        booking = {
            "booking_id": booking_id,
            "barbershop_id": request.barbershop_id,
            "barber_id": request.barber_id,
            "barber_name": "Mike Barber" if request.barber_id != "no-preference" else "Next Available",
            "service_id": request.service_id,
            "service_name": "Classic Haircut",  # In production, lookup from service DB
            "appointment_datetime": appointment_datetime,
            "duration_minutes": 30,
            "price": 35.00,
            "customer_name": request.customer_name,
            "customer_email": request.customer_email,
            "customer_phone": request.customer_phone,
            "status": "confirmed",
            "notes": request.notes,
            "created_at": datetime.now().isoformat(),
            "created_by": current_user.get("user_id") if current_user else "guest"
        }
        
        # Store booking
        bookings_db[booking_id] = booking
        
        return BookingResponse(**booking)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create booking: {str(e)}")

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(booking_id: str):
    """Get booking details"""
    if booking_id not in bookings_db:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return BookingResponse(**bookings_db[booking_id])

@router.get("/barbershop/{barbershop_id}")
async def get_barbershop_bookings(
    barbershop_id: str,
    date: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all bookings for a barbershop"""
    # Filter bookings for barbershop
    barbershop_bookings = [
        booking for booking in bookings_db.values()
        if booking["barbershop_id"] == barbershop_id
    ]
    
    # Apply date filter if provided
    if date:
        barbershop_bookings = [
            booking for booking in barbershop_bookings
            if booking["appointment_datetime"].startswith(date)
        ]
    
    # Apply status filter if provided
    if status:
        barbershop_bookings = [
            booking for booking in barbershop_bookings
            if booking["status"] == status
        ]
    
    return {
        "barbershop_id": barbershop_id,
        "bookings": barbershop_bookings,
        "count": len(barbershop_bookings)
    }

@router.get("/barber/{barber_id}")
async def get_barber_bookings(
    barber_id: str,
    date: Optional[str] = None
):
    """Get all bookings for a specific barber"""
    # Filter bookings for barber
    barber_bookings = [
        booking for booking in bookings_db.values()
        if booking["barber_id"] == barber_id
    ]
    
    # Apply date filter if provided
    if date:
        barber_bookings = [
            booking for booking in barber_bookings
            if booking["appointment_datetime"].startswith(date)
        ]
    
    return {
        "barber_id": barber_id,
        "bookings": barber_bookings,
        "count": len(barber_bookings)
    }

@router.put("/{booking_id}")
async def update_booking(
    booking_id: str,
    request: UpdateBookingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing booking"""
    if booking_id not in bookings_db:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = bookings_db[booking_id]
    
    # Update fields if provided
    if request.appointment_date and request.appointment_time:
        booking["appointment_datetime"] = f"{request.appointment_date}T{request.appointment_time}"
    
    if request.status:
        booking["status"] = request.status
    
    if request.notes is not None:
        booking["notes"] = request.notes
    
    booking["updated_at"] = datetime.now().isoformat()
    booking["updated_by"] = current_user.get("user_id")
    
    return {
        "message": "Booking updated successfully",
        "booking": booking
    }

@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cancel a booking"""
    if booking_id not in bookings_db:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking = bookings_db[booking_id]
    booking["status"] = "cancelled"
    booking["cancelled_at"] = datetime.now().isoformat()
    booking["cancelled_by"] = current_user.get("user_id")
    
    return {
        "message": "Booking cancelled successfully",
        "booking_id": booking_id
    }

@router.get("/availability/check")
async def check_availability(
    barbershop_id: str,
    barber_id: str,
    date: str,
    service_duration_minutes: int = 30
):
    """Check available time slots for a barber on a specific date"""
    # Generate available slots (in production, check against actual bookings)
    slots = []
    
    try:
        check_date = datetime.fromisoformat(date)
    except:
        check_date = datetime.now()
    
    # Business hours: 9 AM - 6 PM
    for hour in range(9, 18):
        for minute in [0, 30]:
            slot_time = check_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Check if slot is available (simplified logic)
            is_available = True
            
            # Check against existing bookings
            for booking in bookings_db.values():
                if (booking["barber_id"] == barber_id and 
                    booking["appointment_datetime"].startswith(date) and
                    booking["status"] != "cancelled"):
                    booking_time = datetime.fromisoformat(booking["appointment_datetime"])
                    if abs((booking_time - slot_time).total_seconds()) < service_duration_minutes * 60:
                        is_available = False
                        break
            
            if is_available:
                end_time = slot_time + timedelta(minutes=service_duration_minutes)
                slots.append({
                    "start_time": slot_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "available": True
                })
    
    return {
        "barbershop_id": barbershop_id,
        "barber_id": barber_id,
        "date": date,
        "available_slots": slots[:10],  # Limit to 10 slots
        "total_available": len(slots)
    }

@router.get("/upcoming")
async def get_upcoming_bookings(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get upcoming bookings for the authenticated user's barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Get upcoming bookings
    now = datetime.now()
    upcoming = []
    
    for booking in bookings_db.values():
        if booking["barbershop_id"] == barbershop_id and booking["status"] == "confirmed":
            try:
                booking_time = datetime.fromisoformat(booking["appointment_datetime"])
                if booking_time > now:
                    upcoming.append(booking)
            except:
                pass
    
    # Sort by appointment time
    upcoming.sort(key=lambda x: x["appointment_datetime"])
    
    return {
        "barbershop_id": barbershop_id,
        "upcoming_bookings": upcoming[:20],  # Limit to next 20
        "count": len(upcoming)
    }

@router.get("/stats/summary")
async def get_booking_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get booking statistics for the authenticated user's barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Calculate stats
    barbershop_bookings = [
        b for b in bookings_db.values()
        if b["barbershop_id"] == barbershop_id
    ]
    
    confirmed = len([b for b in barbershop_bookings if b["status"] == "confirmed"])
    cancelled = len([b for b in barbershop_bookings if b["status"] == "cancelled"])
    completed = len([b for b in barbershop_bookings if b["status"] == "completed"])
    
    total_revenue = sum(b.get("price", 0) for b in barbershop_bookings if b["status"] in ["confirmed", "completed"])
    
    return {
        "barbershop_id": barbershop_id,
        "total_bookings": len(barbershop_bookings),
        "confirmed": confirmed,
        "cancelled": cancelled,
        "completed": completed,
        "total_revenue": total_revenue,
        "average_booking_value": total_revenue / len(barbershop_bookings) if barbershop_bookings else 0,
        "cancellation_rate": (cancelled / len(barbershop_bookings) * 100) if barbershop_bookings else 0
    }