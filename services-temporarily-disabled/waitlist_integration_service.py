"""
Waitlist Integration Service
Handles integration between waitlist/cancellation system and existing services
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

from .waitlist_cancellation_service import WaitlistCancellationService
from .payment_processing_service import PaymentProcessingService
from .ai_scheduling_service import AISchedulingService, OptimizationGoal

logger = logging.getLogger(__name__)

class WaitlistIntegrationService:
    """Service for integrating waitlist system with existing payment and scheduling services"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self.waitlist_service = WaitlistCancellationService(db_path)
        self.payment_service = PaymentProcessingService(db_path)
        self.ai_scheduling_service = AISchedulingService(db_path)
        
    async def process_cancellation_with_refund(
        self,
        booking_id: str,
        reason: str,
        cancelled_by: Optional[str] = None,
        notes: Optional[str] = None,
        force_refund: bool = False
    ) -> Dict[str, Any]:
        """
        Process cancellation with integrated refund processing and waitlist notification
        """
        try:
            # Get booking details first
            booking = await self.waitlist_service._get_booking_details(booking_id)
            if not booking:
                return {
                    'success': False,
                    'error': 'Booking not found'
                }
            
            # Process cancellation through waitlist service
            cancellation_result = await self.waitlist_service.process_cancellation(
                booking_id=booking_id,
                reason=reason,
                cancelled_by=cancelled_by,
                notes=notes,
                force_refund=force_refund
            )
            
            if not cancellation_result.success:
                return {
                    'success': False,
                    'error': cancellation_result.error,
                    'cancellation_result': cancellation_result.__dict__
                }
            
            # Find and notify waitlist customers about newly available slot
            waitlist_matches = await self._find_and_notify_waitlist_for_slot(
                barbershop_id=booking['barbershop_id'],
                service_id=booking['service_id'],
                barber_id=booking.get('barber_id'),
                slot_time=booking['scheduled_at'],
                duration=booking.get('duration_minutes', 30)
            )
            
            # Generate AI-powered rebooking suggestions for the cancelled customer
            rebooking_suggestions = await self._generate_rebooking_suggestions(
                customer_id=booking['customer_id'],
                service_id=booking['service_id'],
                barbershop_id=booking['barbershop_id'],
                original_slot_time=booking['scheduled_at']
            )
            
            return {
                'success': True,
                'cancellation_result': cancellation_result.__dict__,
                'waitlist_notifications': len(waitlist_matches),
                'waitlist_matches': [match.__dict__ for match in waitlist_matches],
                'rebooking_suggestions': [sugg.__dict__ for sugg in rebooking_suggestions],
                'integration_summary': {
                    'refund_processed': cancellation_result.refund_processed,
                    'refund_amount': cancellation_result.refund_amount,
                    'waitlist_customers_notified': len(waitlist_matches),
                    'rebooking_options_generated': len(rebooking_suggestions)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in integrated cancellation processing: {e}")
            return {
                'success': False,
                'error': f"Integration error: {str(e)}"
            }
    
    async def process_waitlist_booking_with_payment(
        self,
        waitlist_id: str,
        slot_time: datetime,
        barber_id: Optional[str] = None,
        payment_type: str = 'full_payment'
    ) -> Dict[str, Any]:
        """
        Process waitlist booking with integrated payment intent creation
        """
        try:
            # Get waitlist entry details
            waitlist_entry = await self.waitlist_service._get_waitlist_entry(waitlist_id)
            if not waitlist_entry:
                return {
                    'success': False,
                    'error': 'Waitlist entry not found'
                }
            
            # Process the booking from waitlist
            booking_result = await self.waitlist_service.process_waitlist_booking(
                waitlist_id=waitlist_id,
                slot_time=slot_time,
                barber_id=barber_id,
                auto_confirm=False  # Don't auto-confirm, wait for payment
            )
            
            if not booking_result['success']:
                return booking_result
            
            # Create payment intent for the new booking
            payment_result = self.payment_service.create_payment_intent(
                booking_id=booking_result['booking_id'],
                customer_id=waitlist_entry['customer_id'],
                barber_id=barber_id or waitlist_entry['barber_id'],
                service_id=waitlist_entry['service_id'],
                payment_type=payment_type
            )
            
            if not payment_result.success:
                # Rollback the booking if payment intent creation fails
                await self._rollback_waitlist_booking(booking_result['booking_id'], waitlist_id)
                return {
                    'success': False,
                    'error': f"Payment processing error: {payment_result.error}",
                    'booking_rolled_back': True
                }
            
            return {
                'success': True,
                'booking_id': booking_result['booking_id'],
                'waitlist_id': waitlist_id,
                'payment_intent_id': payment_result.payment_intent_id,
                'client_secret': payment_result.client_secret,
                'amount': payment_result.amount,
                'slot_time': slot_time.isoformat(),
                'service_details': await self._get_service_details(waitlist_entry['service_id']),
                'payment_deadline': (datetime.now() + timedelta(hours=2)).isoformat(),
                'integration_summary': {
                    'booking_created': True,
                    'payment_intent_created': True,
                    'waitlist_converted': True,
                    'payment_type': payment_type
                }
            }
            
        except Exception as e:
            logger.error(f"Error in integrated waitlist booking: {e}")
            return {
                'success': False,
                'error': f"Integration error: {str(e)}"
            }
    
    async def intelligent_waitlist_matching(
        self,
        barbershop_id: str,
        days_ahead: int = 7,
        optimization_goal: OptimizationGoal = OptimizationGoal.BALANCED
    ) -> Dict[str, Any]:
        """
        Use AI scheduling to find optimal matches between waitlist and available slots
        """
        try:
            # Get waitlist matches using the waitlist service
            waitlist_matches = await self.waitlist_service.find_waitlist_matches(
                barbershop_id=barbershop_id,
                days_ahead=days_ahead
            )
            
            # Enhance matches with AI scheduling recommendations
            enhanced_matches = []
            for match in waitlist_matches:
                # Get AI scheduling recommendations for this slot
                ai_recommendations = await self.ai_scheduling_service.get_optimal_scheduling_recommendations(
                    barbershop_id=barbershop_id,
                    service_id=match.matched_entries[0].service_id if match.matched_entries else None,
                    optimization_goal=optimization_goal,
                    limit=1
                )
                
                # Calculate enhanced scoring
                enhanced_match = {
                    'slot_time': match.slot_time.isoformat(),
                    'duration': match.duration,
                    'barber_id': match.barber_id,
                    'matched_entries': [
                        {
                            'waitlist_id': entry.id,
                            'customer_id': entry.customer_id,
                            'priority': entry.priority.value,
                            'position': entry.position,
                            'estimated_wait_time': entry.estimated_wait_time.total_seconds() / 60 if entry.estimated_wait_time else None
                        } for entry in match.matched_entries
                    ],
                    'priority_score': match.priority_score,
                    'estimated_bookings': match.estimated_bookings,
                    'revenue_potential': match.revenue_potential,
                    'ai_enhancement': {
                        'confidence_score': ai_recommendations[0].confidence_score if ai_recommendations else 0,
                        'efficiency_score': ai_recommendations[0].efficiency_score if ai_recommendations else 0,
                        'ai_reasoning': ai_recommendations[0].reasoning if ai_recommendations else None
                    }
                }
                enhanced_matches.append(enhanced_match)
            
            # Sort by combined priority + AI score
            enhanced_matches.sort(
                key=lambda x: (x['priority_score'] + x['ai_enhancement']['confidence_score']) / 2,
                reverse=True
            )
            
            return {
                'success': True,
                'total_matches': len(enhanced_matches),
                'enhanced_matches': enhanced_matches,
                'optimization_summary': {
                    'optimization_goal': optimization_goal.value,
                    'total_potential_revenue': sum(match['revenue_potential'] for match in enhanced_matches),
                    'total_potential_bookings': sum(match['estimated_bookings'] for match in enhanced_matches),
                    'avg_ai_confidence': sum(match['ai_enhancement']['confidence_score'] for match in enhanced_matches) / len(enhanced_matches) if enhanced_matches else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in intelligent waitlist matching: {e}")
            return {
                'success': False,
                'error': f"Matching error: {str(e)}"
            }
    
    async def automated_waitlist_processing(
        self,
        barbershop_id: str,
        max_notifications: int = 10
    ) -> Dict[str, Any]:
        """
        Automated processing to match waitlist entries with available slots
        """
        try:
            results = {
                'matches_found': 0,
                'notifications_sent': 0,
                'bookings_created': 0,
                'revenue_potential': 0.0,
                'processed_slots': [],
                'errors': []
            }
            
            # Get intelligent matches
            matching_result = await self.intelligent_waitlist_matching(barbershop_id)
            
            if not matching_result['success']:
                return {
                    'success': False,
                    'error': matching_result['error']
                }
            
            matches = matching_result['enhanced_matches'][:max_notifications]
            
            for match in matches:
                try:
                    slot_results = await self._process_slot_match(match)
                    results['processed_slots'].append(slot_results)
                    
                    if slot_results['success']:
                        results['matches_found'] += 1
                        results['notifications_sent'] += slot_results.get('notifications_sent', 0)
                        results['revenue_potential'] += match['revenue_potential']
                        
                        # If auto-booking is enabled and customer responds quickly
                        if slot_results.get('auto_booked'):
                            results['bookings_created'] += 1
                    
                except Exception as slot_error:
                    results['errors'].append({
                        'slot_time': match['slot_time'],
                        'error': str(slot_error)
                    })
            
            return {
                'success': True,
                'processing_summary': results,
                'recommendation': self._generate_processing_recommendations(results)
            }
            
        except Exception as e:
            logger.error(f"Error in automated waitlist processing: {e}")
            return {
                'success': False,
                'error': f"Automation error: {str(e)}"
            }
    
    async def _find_and_notify_waitlist_for_slot(
        self,
        barbershop_id: str,
        service_id: str,
        barber_id: Optional[str],
        slot_time: datetime,
        duration: int
    ) -> List[Any]:
        """Find waitlist entries that match the newly available slot"""
        try:
            # Get waitlist matches for this specific slot
            available_slots = [{
                'time': slot_time,
                'duration': duration,
                'barber_id': barber_id
            }]
            
            matches = await self.waitlist_service.find_waitlist_matches(
                barbershop_id=barbershop_id,
                available_slots=available_slots
            )
            
            return matches
            
        except Exception as e:
            logger.error(f"Error finding waitlist matches for slot: {e}")
            return []
    
    async def _generate_rebooking_suggestions(
        self,
        customer_id: str,
        service_id: str,
        barbershop_id: str,
        original_slot_time: datetime
    ) -> List[Any]:
        """Generate AI-powered rebooking suggestions for cancelled customer"""
        try:
            # Use AI scheduling service to find optimal alternatives
            suggestions = await self.ai_scheduling_service.get_optimal_scheduling_recommendations(
                barbershop_id=barbershop_id,
                service_id=service_id,
                optimization_goal=OptimizationGoal.CUSTOMER_SATISFACTION,
                limit=5
            )
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error generating rebooking suggestions: {e}")
            return []
    
    async def _rollback_waitlist_booking(self, booking_id: str, waitlist_id: str):
        """Rollback a waitlist booking if payment processing fails"""
        try:
            # Cancel the booking
            await self.waitlist_service._update_booking_status(booking_id, 'CANCELLED')
            
            # Reset waitlist entry status
            await self.waitlist_service._update_waitlist_entry_status(waitlist_id, 'active', None)
            
            logger.info(f"Rolled back booking {booking_id} and waitlist entry {waitlist_id}")
            
        except Exception as e:
            logger.error(f"Error rolling back waitlist booking: {e}")
    
    async def _get_service_details(self, service_id: str) -> Dict[str, Any]:
        """Get service details for booking confirmation"""
        try:
            service = self.payment_service.get_service_price(service_id)
            return service if service else {}
        except:
            return {}
    
    async def _process_slot_match(self, match: Dict[str, Any]) -> Dict[str, Any]:
        """Process a single slot match by notifying waitlist customers"""
        try:
            notifications_sent = 0
            
            # Notify each matched customer
            for entry in match['matched_entries']:
                try:
                    await self.waitlist_service._send_notification(
                        entry['waitlist_id'],
                        'slot_available',
                        {
                            'slot_time': match['slot_time'],
                            'duration': match['duration'],
                            'barber_id': match.get('barber_id'),
                            'response_deadline': (datetime.now() + timedelta(hours=2)).isoformat()
                        }
                    )
                    notifications_sent += 1
                except Exception as notify_error:
                    logger.error(f"Failed to notify waitlist entry {entry['waitlist_id']}: {notify_error}")
            
            return {
                'success': True,
                'slot_time': match['slot_time'],
                'notifications_sent': notifications_sent,
                'matched_customers': len(match['matched_entries'])
            }
            
        except Exception as e:
            return {
                'success': False,
                'slot_time': match['slot_time'],
                'error': str(e)
            }
    
    def _generate_processing_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on processing results"""
        recommendations = []
        
        if results['matches_found'] == 0:
            recommendations.append("Consider expanding availability or adjusting waitlist matching criteria")
        elif results['notifications_sent'] / max(results['matches_found'], 1) < 0.8:
            recommendations.append("Review notification system - some customers may not be receiving alerts")
        
        if results['bookings_created'] / max(results['notifications_sent'], 1) < 0.3:
            recommendations.append("Consider incentives for quick responses to slot availability notifications")
        
        if results['revenue_potential'] > 500:
            recommendations.append(f"High revenue potential (${results['revenue_potential']:.2f}) - consider priority processing")
        
        if len(results['errors']) > 0:
            recommendations.append(f"{len(results['errors'])} processing errors occurred - review system reliability")
        
        return recommendations or ["System operating normally - no specific recommendations"]

# Initialize service instance
waitlist_integration_service = WaitlistIntegrationService()

if __name__ == "__main__":
    # Example usage
    async def test_integration():
        service = WaitlistIntegrationService()
        
        # Test intelligent matching
        result = await service.intelligent_waitlist_matching("demo_barbershop")
        print(f"Intelligent matching result: {result}")
        
        # Test automated processing
        processing_result = await service.automated_waitlist_processing("demo_barbershop")
        print(f"Automated processing result: {processing_result}")
    
    asyncio.run(test_integration())