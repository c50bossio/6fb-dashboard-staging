"""
Booking API Endpoints for 6FB AI Agent System
Complete booking flow implementation
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Import booking service
from services.booking_service import booking_service

# Create router
router = APIRouter(prefix="/api/booking", tags=["booking"])

# Pydantic models for requests/responses
class AvailableSlotsRequest(BaseModel):
    barbershop_id: str
    barber_id: Optional[str] = None
    date: Optional[str] = None
    service_id: Optional[str] = None

class CreateBookingRequest(BaseModel):
    barbershop_id: str
    service_id: str
    scheduled_at: str
    customer_name: str
    customer_email: Optional[EmailStr] = None
    customer_phone: Optional[str] = None
    barber_id: Optional[str] = None
    notes: Optional[str] = None

class UpdateAppointmentStatusRequest(BaseModel):
    status: str  # PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW
    notes: Optional[str] = None

# Endpoints
@router.get("/barbershops")
async def get_barbershops():
    """Get list of available barbershops"""
    from services.supabase_service import supabase_service
    
    result = supabase_service.get_barbershops(limit=20)
    if result['success']:
        return {
            "success": True,
            "barbershops": result['data'],
            "count": len(result['data'])
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to fetch barbershops")

@router.get("/barbershops/{barbershop_id}/barbers")
async def get_barbershop_barbers(barbershop_id: str):
    """Get barbers/staff for a specific barbershop"""
    result = await booking_service.get_barbershop_barbers(barbershop_id)
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to fetch barbers'))

@router.get("/barbershops/{barbershop_id}/services")
async def get_barbershop_services(barbershop_id: str, barber_id: Optional[str] = Query(None)):
    """Get services offered by a barbershop, optionally filtered by barber"""
    result = await booking_service.get_barbershop_services(barbershop_id, barber_id)
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to fetch services'))

@router.post("/available-slots")
async def get_available_slots(request: AvailableSlotsRequest):
    """Get available booking slots for a barbershop"""
    result = await booking_service.get_available_slots(
        barbershop_id=request.barbershop_id,
        barber_id=request.barber_id,
        date=request.date,
        service_id=request.service_id
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to get available slots'))

@router.post("/create")
async def create_booking(booking: CreateBookingRequest):
    """Create a new booking"""
    result = await booking_service.create_booking(
        barbershop_id=booking.barbershop_id,
        service_id=booking.service_id,
        scheduled_at=booking.scheduled_at,
        customer_name=booking.customer_name,
        customer_email=booking.customer_email,
        customer_phone=booking.customer_phone,
        barber_id=booking.barber_id,
        notes=booking.notes
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get('error', 'Failed to create booking'))

@router.get("/appointments")
async def get_appointments(
    barbershop_id: Optional[str] = Query(None),
    barber_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    """Get appointments with optional filters"""
    result = await booking_service.get_appointments(
        barbershop_id=barbershop_id,
        barber_id=barber_id,
        customer_id=customer_id,
        status=status,
        date_from=date_from,
        date_to=date_to,
        limit=limit
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Failed to get appointments'))

@router.get("/appointments/{appointment_id}")
async def get_appointment(appointment_id: str):
    """Get a specific appointment by ID"""
    from services.supabase_service import supabase_service
    
    result = supabase_service.execute_query(
        'appointments',
        'select',
        select='*',
        eq={'id': appointment_id}
    )
    
    if result['success'] and result['data']:
        return {
            "success": True,
            "appointment": result['data'][0]
        }
    else:
        raise HTTPException(status_code=404, detail="Appointment not found")

@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    request: UpdateAppointmentStatusRequest
):
    """Update appointment status"""
    result = await booking_service.update_appointment_status(
        appointment_id=appointment_id,
        status=request.status,
        notes=request.notes
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get('error', 'Failed to update appointment'))

@router.delete("/appointments/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    reason: Optional[str] = Query(None)
):
    """Cancel an appointment"""
    result = await booking_service.cancel_appointment(
        appointment_id=appointment_id,
        reason=reason
    )
    
    if result['success']:
        return result
    else:
        raise HTTPException(status_code=400, detail=result.get('error', 'Failed to cancel appointment'))

@router.get("/customers")
async def get_customers(
    barbershop_id: Optional[str] = Query(None),
    limit: int = Query(50, le=100)
):
    """Get customers"""
    from services.supabase_service import supabase_service
    
    filters = {}
    if barbershop_id:
        filters['eq'] = {'barbershop_id': barbershop_id}
    
    result = supabase_service.execute_query(
        'customers',
        'select',
        select='*',
        limit=limit,
        order='created_at',
        ascending=False,
        **filters
    )
    
    if result['success']:
        return {
            "success": True,
            "customers": result['data'],
            "count": len(result['data'])
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to fetch customers")

# Export router
__all__ = ['router']