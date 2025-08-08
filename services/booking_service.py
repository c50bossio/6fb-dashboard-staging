"""
Centralized Booking Service
Handles all booking business logic, validation, and orchestration
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import asyncio
import logging
from decimal import Decimal

# Configure logging
logger = logging.getLogger(__name__)

class BookingStatus(Enum):
    """Booking status enumeration"""
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    RESCHEDULED = "rescheduled"

class BookingError(Exception):
    """Custom exception for booking errors"""
    pass

class BookingService:
    """
    Centralized service for managing all booking operations
    """
    
    def __init__(self, supabase_client=None, payment_service=None, notification_service=None):
        """
        Initialize booking service with dependencies
        """
        self.supabase = supabase_client
        self.payment_service = payment_service
        self.notification_service = notification_service
        self.business_rules = self._load_business_rules()
        
    def _load_business_rules(self) -> Dict:
        """Load business rules and constraints"""
        return {
            "min_advance_booking": 30,  # Minutes
            "max_advance_booking": 90,  # Days
            "min_appointment_duration": 15,  # Minutes
            "max_appointment_duration": 240,  # Minutes
            "buffer_time_between_appointments": 5,  # Minutes
            "cancellation_window": 24,  # Hours
            "no_show_penalty": 25.00,  # Dollars
            "business_hours": {
                "monday": {"open": "09:00", "close": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
                "tuesday": {"open": "09:00", "close": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
                "wednesday": {"open": "09:00", "close": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
                "thursday": {"open": "09:00", "close": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
                "friday": {"open": "09:00", "close": "18:00", "breaks": [{"start": "12:00", "end": "13:00"}]},
                "saturday": {"open": "09:00", "close": "16:00", "breaks": []},
                "sunday": None  # Closed
            }
        }
    
    async def create_booking(self, booking_data: Dict) -> Dict:
        """
        Create a new booking with full validation and processing
        
        Args:
            booking_data: Dictionary containing booking details
            
        Returns:
            Created booking with confirmation details
        """
        try:
            # Step 1: Validate booking data
            await self._validate_booking_data(booking_data)
            
            # Step 2: Check availability
            is_available = await self._check_availability(
                barber_id=booking_data.get('barber_id'),
                start_time=booking_data.get('start_time'),
                duration=booking_data.get('duration', 30)
            )
            
            if not is_available:
                raise BookingError("Selected time slot is not available")
            
            # Step 3: Calculate pricing
            pricing = await self._calculate_pricing(booking_data)
            booking_data['total_price'] = pricing['total']
            booking_data['service_price'] = pricing['service_price']
            booking_data['add_ons_price'] = pricing['add_ons_price']
            booking_data['tax'] = pricing['tax']
            
            # Step 4: Process payment if required
            if booking_data.get('require_payment', False):
                payment_result = await self._process_payment(booking_data, pricing)
                booking_data['payment_id'] = payment_result['payment_id']
                booking_data['payment_status'] = 'paid'
            
            # Step 5: Create booking in database
            booking = await self._create_booking_record(booking_data)
            
            # Step 6: Update availability
            await self._update_availability(booking)
            
            # Step 7: Send confirmation notifications
            await self._send_booking_confirmation(booking)
            
            # Step 8: Schedule reminders
            await self._schedule_reminders(booking)
            
            logger.info(f"Booking created successfully: {booking['id']}")
            return booking
            
        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            # Rollback payment if needed
            if 'payment_id' in locals():
                await self._rollback_payment(payment_id)
            raise BookingError(f"Failed to create booking: {str(e)}")
    
    async def _validate_booking_data(self, booking_data: Dict) -> None:
        """Validate all booking data against business rules"""
        required_fields = ['customer_id', 'barber_id', 'service_id', 'start_time']
        
        # Check required fields
        for field in required_fields:
            if field not in booking_data:
                raise BookingError(f"Missing required field: {field}")
        
        # Validate start time
        start_time = datetime.fromisoformat(booking_data['start_time'])
        now = datetime.now()
        
        # Check minimum advance booking
        min_booking_time = now + timedelta(minutes=self.business_rules['min_advance_booking'])
        if start_time < min_booking_time:
            raise BookingError(f"Bookings must be made at least {self.business_rules['min_advance_booking']} minutes in advance")
        
        # Check maximum advance booking
        max_booking_time = now + timedelta(days=self.business_rules['max_advance_booking'])
        if start_time > max_booking_time:
            raise BookingError(f"Bookings cannot be made more than {self.business_rules['max_advance_booking']} days in advance")
        
        # Validate duration
        duration = booking_data.get('duration', 30)
        if duration < self.business_rules['min_appointment_duration']:
            raise BookingError(f"Appointment duration must be at least {self.business_rules['min_appointment_duration']} minutes")
        if duration > self.business_rules['max_appointment_duration']:
            raise BookingError(f"Appointment duration cannot exceed {self.business_rules['max_appointment_duration']} minutes")
        
        # Check business hours
        day_name = start_time.strftime('%A').lower()
        business_hours = self.business_rules['business_hours'].get(day_name)
        
        if not business_hours:
            raise BookingError(f"Barbershop is closed on {day_name.capitalize()}")
        
        # Check if within business hours
        appointment_start = start_time.strftime('%H:%M')
        appointment_end = (start_time + timedelta(minutes=duration)).strftime('%H:%M')
        
        if appointment_start < business_hours['open'] or appointment_end > business_hours['close']:
            raise BookingError(f"Appointment must be within business hours ({business_hours['open']} - {business_hours['close']})")
        
        # Check for breaks
        for break_period in business_hours.get('breaks', []):
            break_start = break_period['start']
            break_end = break_period['end']
            if (appointment_start < break_end and appointment_end > break_start):
                raise BookingError(f"Appointment conflicts with break time ({break_start} - {break_end})")
    
    async def _check_availability(self, barber_id: str, start_time: str, duration: int) -> bool:
        """
        Check if the requested time slot is available
        """
        if not self.supabase:
            return True  # Default to available if no database
        
        try:
            start_dt = datetime.fromisoformat(start_time)
            end_dt = start_dt + timedelta(minutes=duration + self.business_rules['buffer_time_between_appointments'])
            
            # Query existing appointments
            response = self.supabase.table('appointments').select('*').eq(
                'barber_id', barber_id
            ).gte('start_time', start_dt.isoformat()).lte(
                'start_time', end_dt.isoformat()
            ).in_('status', ['confirmed', 'in_progress']).execute()
            
            # Check if any conflicts
            return len(response.data) == 0
            
        except Exception as e:
            logger.error(f"Error checking availability: {str(e)}")
            return False
    
    async def _calculate_pricing(self, booking_data: Dict) -> Dict:
        """
        Calculate total pricing including service, add-ons, and tax
        """
        try:
            # Get service price
            service_price = Decimal(str(booking_data.get('service_price', 0)))
            
            # Calculate add-ons price
            add_ons_price = Decimal('0')
            for add_on in booking_data.get('add_ons', []):
                add_ons_price += Decimal(str(add_on.get('price', 0)))
            
            # Calculate subtotal
            subtotal = service_price + add_ons_price
            
            # Calculate tax (assuming 8% tax rate)
            tax_rate = Decimal('0.08')
            tax = subtotal * tax_rate
            
            # Calculate total
            total = subtotal + tax
            
            return {
                'service_price': float(service_price),
                'add_ons_price': float(add_ons_price),
                'subtotal': float(subtotal),
                'tax': float(tax),
                'total': float(total)
            }
            
        except Exception as e:
            logger.error(f"Error calculating pricing: {str(e)}")
            raise BookingError(f"Failed to calculate pricing: {str(e)}")
    
    async def _process_payment(self, booking_data: Dict, pricing: Dict) -> Dict:
        """
        Process payment through payment service
        """
        if not self.payment_service:
            return {'payment_id': 'mock_payment_id', 'status': 'success'}
        
        try:
            payment_result = await self.payment_service.create_payment_intent(
                amount=pricing['total'],
                currency='usd',
                customer_id=booking_data['customer_id'],
                metadata={
                    'booking_id': booking_data.get('id'),
                    'service_id': booking_data['service_id'],
                    'barber_id': booking_data['barber_id']
                }
            )
            return payment_result
            
        except Exception as e:
            logger.error(f"Payment processing failed: {str(e)}")
            raise BookingError(f"Payment processing failed: {str(e)}")
    
    async def _create_booking_record(self, booking_data: Dict) -> Dict:
        """
        Create booking record in database
        """
        if not self.supabase:
            # Return mock booking for testing
            return {
                'id': 'mock_booking_id',
                **booking_data,
                'status': BookingStatus.CONFIRMED.value,
                'created_at': datetime.now().isoformat()
            }
        
        try:
            # Prepare booking record
            booking_record = {
                'customer_id': booking_data['customer_id'],
                'barber_id': booking_data['barber_id'],
                'service_id': booking_data['service_id'],
                'start_time': booking_data['start_time'],
                'end_time': (datetime.fromisoformat(booking_data['start_time']) + 
                           timedelta(minutes=booking_data.get('duration', 30))).isoformat(),
                'duration': booking_data.get('duration', 30),
                'status': BookingStatus.CONFIRMED.value,
                'total_price': booking_data.get('total_price', 0),
                'service_price': booking_data.get('service_price', 0),
                'add_ons_price': booking_data.get('add_ons_price', 0),
                'tax': booking_data.get('tax', 0),
                'payment_id': booking_data.get('payment_id'),
                'payment_status': booking_data.get('payment_status', 'pending'),
                'notes': booking_data.get('notes', ''),
                'created_at': datetime.now().isoformat()
            }
            
            # Insert into database
            response = self.supabase.table('appointments').insert(booking_record).execute()
            return response.data[0]
            
        except Exception as e:
            logger.error(f"Error creating booking record: {str(e)}")
            raise BookingError(f"Failed to create booking record: {str(e)}")
    
    async def _update_availability(self, booking: Dict) -> None:
        """
        Update barber availability after booking
        """
        if not self.supabase:
            return
        
        try:
            # Mark time slot as unavailable
            availability_update = {
                'barber_id': booking['barber_id'],
                'date': booking['start_time'].split('T')[0],
                'start_time': booking['start_time'],
                'end_time': booking['end_time'],
                'is_available': False,
                'booking_id': booking['id']
            }
            
            self.supabase.table('barber_availability').insert(availability_update).execute()
            
        except Exception as e:
            logger.error(f"Error updating availability: {str(e)}")
    
    async def _send_booking_confirmation(self, booking: Dict) -> None:
        """
        Send confirmation notifications to customer and barber
        """
        if not self.notification_service:
            logger.info("Notification service not configured, skipping confirmation")
            return
        
        try:
            # Send customer confirmation
            await self.notification_service.send_booking_confirmation(
                booking_id=booking['id'],
                customer_id=booking['customer_id'],
                barber_id=booking['barber_id'],
                start_time=booking['start_time']
            )
            
            # Send barber notification
            await self.notification_service.send_barber_notification(
                booking_id=booking['id'],
                barber_id=booking['barber_id'],
                customer_id=booking['customer_id'],
                start_time=booking['start_time']
            )
            
        except Exception as e:
            logger.error(f"Error sending notifications: {str(e)}")
    
    async def _schedule_reminders(self, booking: Dict) -> None:
        """
        Schedule reminder notifications for the booking
        """
        if not self.notification_service:
            return
        
        try:
            start_time = datetime.fromisoformat(booking['start_time'])
            
            # Schedule 24-hour reminder
            reminder_24h = start_time - timedelta(hours=24)
            if reminder_24h > datetime.now():
                await self.notification_service.schedule_reminder(
                    booking_id=booking['id'],
                    send_at=reminder_24h.isoformat(),
                    reminder_type='24_hour'
                )
            
            # Schedule 2-hour reminder
            reminder_2h = start_time - timedelta(hours=2)
            if reminder_2h > datetime.now():
                await self.notification_service.schedule_reminder(
                    booking_id=booking['id'],
                    send_at=reminder_2h.isoformat(),
                    reminder_type='2_hour'
                )
            
        except Exception as e:
            logger.error(f"Error scheduling reminders: {str(e)}")
    
    async def cancel_booking(self, booking_id: str, reason: str = None) -> Dict:
        """
        Cancel a booking with proper validation and refund processing
        """
        try:
            # Get booking details
            booking = await self.get_booking(booking_id)
            
            if not booking:
                raise BookingError("Booking not found")
            
            # Check if booking can be cancelled
            if booking['status'] in [BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value]:
                raise BookingError(f"Cannot cancel booking with status: {booking['status']}")
            
            # Check cancellation window
            start_time = datetime.fromisoformat(booking['start_time'])
            cancellation_deadline = start_time - timedelta(hours=self.business_rules['cancellation_window'])
            
            if datetime.now() > cancellation_deadline:
                # Apply cancellation penalty
                refund_amount = booking['total_price'] * 0.5  # 50% refund
            else:
                refund_amount = booking['total_price']  # Full refund
            
            # Process refund if payment was made
            if booking.get('payment_id') and booking.get('payment_status') == 'paid':
                await self._process_refund(booking['payment_id'], refund_amount)
            
            # Update booking status
            updated_booking = await self._update_booking_status(
                booking_id, 
                BookingStatus.CANCELLED.value,
                {'cancellation_reason': reason, 'refund_amount': refund_amount}
            )
            
            # Send cancellation notifications
            await self._send_cancellation_notification(updated_booking)
            
            # Update availability
            await self._release_availability(updated_booking)
            
            logger.info(f"Booking cancelled successfully: {booking_id}")
            return updated_booking
            
        except Exception as e:
            logger.error(f"Error cancelling booking: {str(e)}")
            raise BookingError(f"Failed to cancel booking: {str(e)}")
    
    async def reschedule_booking(self, booking_id: str, new_start_time: str) -> Dict:
        """
        Reschedule a booking to a new time
        """
        try:
            # Get original booking
            original_booking = await self.get_booking(booking_id)
            
            if not original_booking:
                raise BookingError("Booking not found")
            
            # Check if booking can be rescheduled
            if original_booking['status'] not in [BookingStatus.CONFIRMED.value, BookingStatus.PENDING.value]:
                raise BookingError(f"Cannot reschedule booking with status: {original_booking['status']}")
            
            # Check new time availability
            is_available = await self._check_availability(
                barber_id=original_booking['barber_id'],
                start_time=new_start_time,
                duration=original_booking['duration']
            )
            
            if not is_available:
                raise BookingError("New time slot is not available")
            
            # Release original time slot
            await self._release_availability(original_booking)
            
            # Update booking with new time
            new_end_time = (datetime.fromisoformat(new_start_time) + 
                          timedelta(minutes=original_booking['duration'])).isoformat()
            
            updated_booking = await self._update_booking_status(
                booking_id,
                BookingStatus.RESCHEDULED.value,
                {
                    'start_time': new_start_time,
                    'end_time': new_end_time,
                    'original_start_time': original_booking['start_time'],
                    'rescheduled_at': datetime.now().isoformat()
                }
            )
            
            # Update new availability
            await self._update_availability(updated_booking)
            
            # Send rescheduling notifications
            await self._send_reschedule_notification(updated_booking)
            
            # Reschedule reminders
            await self._schedule_reminders(updated_booking)
            
            logger.info(f"Booking rescheduled successfully: {booking_id}")
            return updated_booking
            
        except Exception as e:
            logger.error(f"Error rescheduling booking: {str(e)}")
            raise BookingError(f"Failed to reschedule booking: {str(e)}")
    
    async def get_booking(self, booking_id: str) -> Optional[Dict]:
        """Get booking details by ID"""
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table('appointments').select('*').eq('id', booking_id).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching booking: {str(e)}")
            return None
    
    async def _update_booking_status(self, booking_id: str, status: str, additional_data: Dict = None) -> Dict:
        """Update booking status and additional data"""
        if not self.supabase:
            return {'id': booking_id, 'status': status, **(additional_data or {})}
        
        try:
            update_data = {'status': status, 'updated_at': datetime.now().isoformat()}
            if additional_data:
                update_data.update(additional_data)
            
            response = self.supabase.table('appointments').update(update_data).eq('id', booking_id).execute()
            return response.data[0]
        except Exception as e:
            logger.error(f"Error updating booking status: {str(e)}")
            raise
    
    async def _process_refund(self, payment_id: str, amount: float) -> Dict:
        """Process refund through payment service"""
        if not self.payment_service:
            return {'refund_id': 'mock_refund_id', 'status': 'success'}
        
        try:
            return await self.payment_service.create_refund(payment_id, amount)
        except Exception as e:
            logger.error(f"Refund processing failed: {str(e)}")
            raise
    
    async def _rollback_payment(self, payment_id: str) -> None:
        """Rollback payment in case of booking failure"""
        try:
            if self.payment_service:
                await self.payment_service.cancel_payment_intent(payment_id)
        except Exception as e:
            logger.error(f"Payment rollback failed: {str(e)}")
    
    async def _release_availability(self, booking: Dict) -> None:
        """Release availability slot when booking is cancelled"""
        if not self.supabase:
            return
        
        try:
            self.supabase.table('barber_availability').delete().eq('booking_id', booking['id']).execute()
        except Exception as e:
            logger.error(f"Error releasing availability: {str(e)}")
    
    async def _send_cancellation_notification(self, booking: Dict) -> None:
        """Send cancellation notifications"""
        if not self.notification_service:
            return
        
        try:
            await self.notification_service.send_cancellation_notification(booking)
        except Exception as e:
            logger.error(f"Error sending cancellation notification: {str(e)}")
    
    async def _send_reschedule_notification(self, booking: Dict) -> None:
        """Send reschedule notifications"""
        if not self.notification_service:
            return
        
        try:
            await self.notification_service.send_reschedule_notification(booking)
        except Exception as e:
            logger.error(f"Error sending reschedule notification: {str(e)}")
    
    async def complete_booking(self, booking_id: str, completion_data: Dict = None) -> Dict:
        """
        Mark a booking as completed and process post-appointment tasks
        """
        try:
            booking = await self.get_booking(booking_id)
            
            if not booking:
                raise BookingError("Booking not found")
            
            if booking['status'] != BookingStatus.IN_PROGRESS.value:
                raise BookingError(f"Cannot complete booking with status: {booking['status']}")
            
            # Update booking status
            update_data = {
                'completed_at': datetime.now().isoformat(),
                'actual_duration': completion_data.get('actual_duration', booking['duration']),
                'service_notes': completion_data.get('service_notes', ''),
                'rating_requested': True
            }
            
            completed_booking = await self._update_booking_status(
                booking_id,
                BookingStatus.COMPLETED.value,
                update_data
            )
            
            # Process tip if provided
            if completion_data and completion_data.get('tip_amount'):
                await self._process_tip(booking_id, completion_data['tip_amount'])
            
            # Send completion notifications
            await self._send_completion_notification(completed_booking)
            
            # Request feedback
            await self._request_feedback(completed_booking)
            
            logger.info(f"Booking completed successfully: {booking_id}")
            return completed_booking
            
        except Exception as e:
            logger.error(f"Error completing booking: {str(e)}")
            raise BookingError(f"Failed to complete booking: {str(e)}")
    
    async def _process_tip(self, booking_id: str, tip_amount: float) -> None:
        """Process tip payment"""
        if not self.payment_service:
            return
        
        try:
            await self.payment_service.process_tip(booking_id, tip_amount)
        except Exception as e:
            logger.error(f"Error processing tip: {str(e)}")
    
    async def _send_completion_notification(self, booking: Dict) -> None:
        """Send completion notifications"""
        if not self.notification_service:
            return
        
        try:
            await self.notification_service.send_completion_notification(booking)
        except Exception as e:
            logger.error(f"Error sending completion notification: {str(e)}")
    
    async def _request_feedback(self, booking: Dict) -> None:
        """Request customer feedback"""
        if not self.notification_service:
            return
        
        try:
            await self.notification_service.send_feedback_request(booking)
        except Exception as e:
            logger.error(f"Error requesting feedback: {str(e)}")