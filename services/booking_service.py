"""
Booking Service for 6FB AI Agent System
Handles appointment booking with Supabase database
"""

import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from uuid import uuid4
from services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

class BookingService:
    """Handle appointment bookings"""
    
    def __init__(self):
        self.supabase = supabase_service
        logger.info("✅ Booking service initialized")
    
    async def get_barbershop_barbers(self, barbershop_id: str) -> Dict[str, Any]:
        """Get list of barbers/staff for a barbershop"""
        try:
            # Query barbershop_staff table joined with users to get barber details
            result = self.supabase.execute_query(
                'barbershop_staff',
                'select',
                select='*, users!barbershop_staff_user_id_fkey(id, name, email)',
                eq={'barbershop_id': barbershop_id, 'is_active': True}
            )
            
            if result['success']:
                barbers = []
                for staff in result.get('data', []):
                    # Extract user info from joined data
                    user_info = staff.get('users', {})
                    barbers.append({
                        'id': staff.get('user_id'),
                        'name': user_info.get('name', 'Unknown Barber'),
                        'email': user_info.get('email'),
                        'role': staff.get('role'),
                        'commission_rate': staff.get('commission_rate'),
                        'is_active': staff.get('is_active')
                    })
                
                # Add "No Preference" option
                barbers.insert(0, {
                    'id': None,
                    'name': 'No Preference',
                    'role': 'ANY',
                    'is_active': True
                })
                
                return {
                    "success": True,
                    "barbers": barbers,
                    "count": len(barbers)
                }
            else:
                # Fallback if no barbers found or query fails
                return {
                    "success": True,
                    "barbers": [{
                        'id': None,
                        'name': 'No Preference',
                        'role': 'ANY',
                        'is_active': True
                    }],
                    "count": 1
                }
                
        except Exception as e:
            logger.error(f"Error getting barbershop barbers: {e}")
            # Return at least the no preference option on error
            return {
                "success": True,
                "barbers": [{
                    'id': None,
                    'name': 'No Preference',
                    'role': 'ANY',
                    'is_active': True
                }],
                "count": 1
            }
    
    async def get_barbershop_services(self, barbershop_id: str, barber_id: Optional[str] = None) -> Dict[str, Any]:
        """Get services for a barbershop, optionally filtered by barber"""
        try:
            if barber_id:
                # Get barber-specific services from barber_services table
                result = self.supabase.execute_query(
                    'barber_services',
                    'select',
                    select='*, services!barber_services_service_id_fkey(name, description, category)',
                    eq={'barbershop_id': barbershop_id, 'barber_id': barber_id, 'is_available': True}
                )
                
                if result['success'] and result['data']:
                    services = []
                    for barber_service in result['data']:
                        service_info = barber_service.get('services', {})
                        services.append({
                            'id': barber_service.get('service_id'),
                            'name': service_info.get('name', 'Unknown Service'),
                            'description': service_info.get('description'),
                            'category': service_info.get('category'),
                            'duration_minutes': barber_service.get('duration_minutes'),
                            'price': barber_service.get('price'),
                            'skill_level': barber_service.get('skill_level'),
                            'specialty_notes': barber_service.get('specialty_notes')
                        })
                    
                    return {
                        "success": True,
                        "services": services,
                        "count": len(services)
                    }
            
            # Fallback to base services if no barber selected or no barber-specific services
            result = self.supabase.execute_query(
                'services',
                'select',
                select='*',
                eq={'barbershop_id': barbershop_id, 'is_active': True}
            )
            
            if result['success']:
                services = []
                for service in result.get('data', []):
                    services.append({
                        'id': service.get('id'),
                        'name': service.get('name'),
                        'description': service.get('description'),
                        'category': service.get('category'),
                        'duration_minutes': service.get('base_duration_minutes'),
                        'price': service.get('base_price')
                    })
                
                return {
                    "success": True,
                    "services": services,
                    "count": len(services)
                }
            else:
                return {"success": False, "error": "Failed to fetch services"}
                
        except Exception as e:
            logger.error(f"Error getting barbershop services: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_available_slots(
        self, 
        barbershop_id: str, 
        barber_id: Optional[str] = None,
        date: str = None,
        service_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get available booking slots"""
        try:
            # Default to today if no date specified
            if not date:
                date = datetime.now().strftime('%Y-%m-%d')
            
            # Get barbershop business hours
            shop_result = self.supabase.execute_query(
                'barbershops', 
                'select',
                select='business_hours',
                eq={'id': barbershop_id}
            )
            
            if not shop_result['success'] or not shop_result['data']:
                return {"success": False, "error": "Barbershop not found"}
            
            business_hours = shop_result['data'][0].get('business_hours', {})
            
            # Get existing appointments for the date
            appointments_result = self.supabase.execute_query(
                'appointments',
                'select',
                select='*',
                eq={'barbershop_id': barbershop_id},
                gte={'scheduled_at': f"{date}T00:00:00"},
                lt={'scheduled_at': f"{date}T23:59:59"}
            )
            
            existing_appointments = appointments_result['data'] if appointments_result['success'] else []
            
            # Generate available time slots (every 30 minutes from 9 AM to 6 PM)
            available_slots = []
            start_hour = 9
            end_hour = 18
            
            for hour in range(start_hour, end_hour):
                for minute in [0, 30]:
                    slot_time = f"{hour:02d}:{minute:02d}"
                    slot_datetime = f"{date}T{slot_time}:00"
                    
                    # Check if slot is already booked
                    is_booked = any(
                        appt.get('scheduled_at', '').startswith(f"{date}T{slot_time}")
                        for appt in existing_appointments
                    )
                    
                    if not is_booked:
                        available_slots.append({
                            "time": slot_time,
                            "datetime": slot_datetime,
                            "available": True
                        })
            
            return {
                "success": True,
                "date": date,
                "barbershop_id": barbershop_id,
                "slots": available_slots,
                "total_available": len(available_slots)
            }
            
        except Exception as e:
            logger.error(f"Error getting available slots: {e}")
            return {"success": False, "error": str(e)}
    
    async def create_booking(
        self,
        barbershop_id: str,
        service_id: str,
        scheduled_at: str,
        customer_name: str,
        customer_email: Optional[str] = None,
        customer_phone: Optional[str] = None,
        barber_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new booking"""
        try:
            # Get service details
            service_result = self.supabase.execute_query(
                'services',
                'select',
                select='*',
                eq={'id': service_id}
            )
            
            if not service_result['success'] or not service_result['data']:
                return {"success": False, "error": "Service not found"}
            
            service = service_result['data'][0]
            
            # For now, don't create a customer record since it requires a profile
            # Just use the appointment's client fields directly
            customer_id = None
            
            # Create appointment (using actual column names from database)
            appointment_data = {
                'id': str(uuid4()),
                'barbershop_id': barbershop_id,
                'barber_id': barber_id,
                'client_id': customer_id,  # Note: it's client_id, not customer_id
                'service_id': service_id,
                'scheduled_at': scheduled_at,
                'date': scheduled_at.split('T')[0] if 'T' in scheduled_at else scheduled_at,
                'time': scheduled_at.split('T')[1].split(':')[0] + ':' + scheduled_at.split('T')[1].split(':')[1] if 'T' in scheduled_at else '14:00',
                'duration_minutes': service.get('duration_minutes', 30),
                'status': 'PENDING',
                'price': service.get('price', 0),
                'service_price': service.get('price', 0),
                'total_amount': service.get('price', 0),
                'client_name': customer_name,
                'client_phone': customer_phone,
                'client_email': customer_email,
                'client_notes': notes,
                'notes': notes
            }
            
            # Remove None values
            appointment_data = {k: v for k, v in appointment_data.items() if v is not None}
            
            # Insert appointment
            result = self.supabase.execute_query(
                'appointments',
                'insert',
                data=appointment_data
            )
            
            if result['success']:
                return {
                    "success": True,
                    "appointment": result['data'][0] if result['data'] else appointment_data,
                    "message": "Booking created successfully"
                }
            else:
                return {"success": False, "error": result.get('error', 'Failed to create booking')}
                
        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_appointments(
        self,
        barbershop_id: Optional[str] = None,
        barber_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        status: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Get appointments with filters"""
        try:
            filters = {}
            eq_filters = {}
            
            if barbershop_id:
                eq_filters['barbershop_id'] = barbershop_id
            if barber_id:
                eq_filters['barber_id'] = barber_id
            if customer_id:
                eq_filters['customer_id'] = customer_id
            if status:
                eq_filters['status'] = status
            
            if eq_filters:
                filters['eq'] = eq_filters
            
            if date_from:
                filters['gte'] = {'scheduled_at': date_from}
            if date_to:
                filters['lt'] = {'scheduled_at': date_to}
            
            result = self.supabase.execute_query(
                'appointments',
                'select',
                select='*',
                limit=limit,
                order='scheduled_at',
                ascending=False,
                **filters
            )
            
            if result['success']:
                return {
                    "success": True,
                    "appointments": result['data'],
                    "count": len(result['data'])
                }
            else:
                return {"success": False, "error": result.get('error', 'Failed to get appointments')}
                
        except Exception as e:
            logger.error(f"Error getting appointments: {e}")
            return {"success": False, "error": str(e)}
    
    async def update_appointment_status(
        self,
        appointment_id: str,
        status: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update appointment status"""
        try:
            update_data = {
                'status': status,
                'updated_at': datetime.now().isoformat()
            }
            
            if notes:
                update_data['barber_notes'] = notes
            
            result = self.supabase.execute_query(
                'appointments',
                'update',
                data=update_data,
                eq={'id': appointment_id}
            )
            
            if result['success']:
                return {
                    "success": True,
                    "appointment": result['data'][0] if result['data'] else None,
                    "message": f"Appointment status updated to {status}"
                }
            else:
                return {"success": False, "error": result.get('error', 'Failed to update appointment')}
                
        except Exception as e:
            logger.error(f"Error updating appointment: {e}")
            return {"success": False, "error": str(e)}
    
    async def cancel_appointment(
        self,
        appointment_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Cancel an appointment"""
        return await self.update_appointment_status(
            appointment_id,
            'CANCELLED',
            reason
        )

# Global booking service instance
booking_service = BookingService()