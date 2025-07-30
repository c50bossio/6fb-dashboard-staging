#!/usr/bin/env python3
"""
Intelligent Waitlist Management System
FIFO queue with smart notifications and automatic processing
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import asyncio
import uuid
from dataclasses import dataclass

class WaitlistStatus(str, Enum):
    ACTIVE = "active"
    NOTIFIED = "notified" 
    EXPIRED = "expired"
    BOOKED = "booked"
    CANCELLED = "cancelled"

class NotificationMethod(str, Enum):
    SMS = "sms"
    EMAIL = "email"
    PUSH = "push"

@dataclass
class WaitlistEntry:
    """Waitlist entry data structure"""
    id: int
    customer_id: int
    barber_id: Optional[int]
    service_id: int
    location_id: int
    preferred_datetime: datetime
    alternative_datetimes: List[datetime]
    status: WaitlistStatus
    queue_position: int
    notification_sent_at: Optional[datetime]
    expires_at: Optional[datetime]
    created_at: datetime

@dataclass
class WaitlistNotification:
    """Notification data for waitlist updates"""
    customer_id: int
    message: str
    method: NotificationMethod
    booking_link: str
    expires_at: datetime

class IntelligentWaitlistManager:
    """Manages intelligent waitlist with FIFO ordering and smart notifications"""
    
    def __init__(self):
        self.db_path = 'booking_system.db'
        self.notification_window = 15  # minutes to respond to notification
        self.max_alternatives = 3  # maximum alternative time slots
    
    def add_to_waitlist(self, 
                       customer_id: int,
                       barber_id: Optional[int],
                       service_id: int,
                       location_id: int,
                       preferred_datetime: datetime,
                       alternative_datetimes: Optional[List[datetime]] = None) -> Dict[str, Any]:
        """Add customer to waitlist for specific slot"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Check if customer is already on waitlist for this slot
            existing_entry = self._get_existing_waitlist_entry(
                customer_id, barber_id, service_id, location_id, preferred_datetime
            )
            
            if existing_entry:
                return {
                    'success': False,
                    'message': 'You are already on the waitlist for this slot',
                    'queue_position': existing_entry['queue_position']
                }
            
            # Get next queue position
            queue_position = self._get_next_queue_position(
                barber_id, service_id, location_id, preferred_datetime
            )
            
            # Convert alternative datetimes to JSON
            alternatives_json = json.dumps([
                dt.isoformat() for dt in (alternative_datetimes or [])
            ])
            
            # Insert waitlist entry
            cursor.execute("""
                INSERT INTO waitlist 
                (customer_id, barber_id, service_id, location_id, preferred_datetime,
                 alternative_datetimes, status, queue_position, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (customer_id, barber_id, service_id, location_id, 
                  preferred_datetime.isoformat(), alternatives_json, 
                  WaitlistStatus.ACTIVE.value, queue_position))
            
            waitlist_id = cursor.lastrowid
            conn.commit()
            
            # Get customer and service details for response
            customer_info = self._get_customer_info(customer_id)
            service_info = self._get_service_info(service_id)
            barber_info = self._get_barber_info(barber_id) if barber_id else None
            
            formatted_datetime = preferred_datetime.strftime("%A, %B %d at %I:%M %p")
            barber_text = f" with {barber_info['display_name']}" if barber_info else ""
            
            return {
                'success': True,
                'waitlist_id': waitlist_id,
                'queue_position': queue_position,
                'message': f"Added to waitlist for {service_info['name']}{barber_text} on {formatted_datetime}. You're #{queue_position} in line.",
                'estimated_wait_time': self._estimate_wait_time(queue_position),
                'notification_method': customer_info.get('preferred_contact', 'sms')
            }
            
        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'message': f'Error adding to waitlist: {str(e)}'
            }
        finally:
            conn.close()
    
    def remove_from_waitlist(self, waitlist_id: int, customer_id: int) -> Dict[str, Any]:
        """Remove customer from waitlist"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Verify ownership and get current entry
            cursor.execute("""
                SELECT queue_position, barber_id, service_id, location_id, preferred_datetime
                FROM waitlist
                WHERE id = ? AND customer_id = ? AND status = ?
            """, (waitlist_id, customer_id, WaitlistStatus.ACTIVE.value))
            
            entry = cursor.fetchone()
            if not entry:
                return {
                    'success': False,
                    'message': 'Waitlist entry not found or already processed'
                }
            
            queue_position, barber_id, service_id, location_id, preferred_datetime = entry
            preferred_dt = datetime.fromisoformat(preferred_datetime)
            
            # Remove from waitlist
            cursor.execute("""
                UPDATE waitlist 
                SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (WaitlistStatus.CANCELLED.value, waitlist_id))
            
            # Update queue positions for others
            self._update_queue_positions_after_removal(
                barber_id, service_id, location_id, preferred_dt, queue_position
            )
            
            conn.commit()
            
            return {
                'success': True,
                'message': 'Successfully removed from waitlist'
            }
            
        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'message': f'Error removing from waitlist: {str(e)}'
            }
        finally:
            conn.close()
    
    def check_slot_availability_and_notify(self, 
                                         barber_id: Optional[int],
                                         service_id: int,
                                         location_id: int,
                                         datetime_slot: datetime) -> List[WaitlistNotification]:
        """Check if slot became available and notify waitlist customers"""
        
        notifications = []
        
        # Find all waitlist entries for this slot
        waitlist_entries = self._get_waitlist_entries_for_slot(
            barber_id, service_id, location_id, datetime_slot
        )
        
        if not waitlist_entries:
            return notifications
        
        # Sort by queue position (FIFO)
        waitlist_entries.sort(key=lambda x: x.queue_position)
        
        # Notify the first person in queue
        first_entry = waitlist_entries[0]
        
        if first_entry.status == WaitlistStatus.ACTIVE:
            notification = self._create_slot_available_notification(first_entry, datetime_slot)
            if notification:
                notifications.append(notification)
                
                # Update entry status and set expiration
                self._mark_waitlist_entry_notified(first_entry.id)
        
        return notifications
    
    def process_expired_notifications(self) -> List[WaitlistNotification]:
        """Process expired waitlist notifications and notify next in line"""
        
        notifications = []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Find expired notifications
            cursor.execute("""
                SELECT id, customer_id, barber_id, service_id, location_id, 
                       preferred_datetime, queue_position
                FROM waitlist
                WHERE status = ? AND expires_at < CURRENT_TIMESTAMP
            """, (WaitlistStatus.NOTIFIED.value,))
            
            expired_entries = cursor.fetchall()
            
            for entry in expired_entries:
                (waitlist_id, customer_id, barber_id, service_id, 
                 location_id, preferred_datetime, queue_position) = entry
                
                # Mark as expired
                cursor.execute("""
                    UPDATE waitlist 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (WaitlistStatus.EXPIRED.value, waitlist_id))
                
                # Find next person in queue for the same slot
                preferred_dt = datetime.fromisoformat(preferred_datetime)
                next_notifications = self.check_slot_availability_and_notify(
                    barber_id, service_id, location_id, preferred_dt
                )
                notifications.extend(next_notifications)
            
            conn.commit()
            
        except Exception as e:
            conn.rollback()
            print(f"Error processing expired notifications: {str(e)}")
        finally:
            conn.close()
        
        return notifications
    
    def book_from_waitlist(self, waitlist_id: int, customer_id: int) -> Dict[str, Any]:
        """Process booking from waitlist notification"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Verify waitlist entry is valid and notified
            cursor.execute("""
                SELECT barber_id, service_id, location_id, preferred_datetime, expires_at
                FROM waitlist
                WHERE id = ? AND customer_id = ? AND status = ?
            """, (waitlist_id, customer_id, WaitlistStatus.NOTIFIED.value))
            
            entry = cursor.fetchone()
            if not entry:
                return {
                    'success': False,
                    'message': 'Invalid waitlist entry or notification expired'
                }
            
            barber_id, service_id, location_id, preferred_datetime, expires_at = entry
            
            # Check if notification hasn't expired
            if expires_at and datetime.fromisoformat(expires_at) < datetime.now():
                return {
                    'success': False,
                    'message': 'Booking window has expired'
                }
            
            # Create the appointment
            appointment_data = {
                'customer_id': customer_id,
                'barber_id': barber_id,
                'service_id': service_id,
                'location_id': location_id,
                'appointment_datetime': datetime.fromisoformat(preferred_datetime)
            }
            
            # Here you would call the main booking system to create the appointment
            # For now, we'll simulate success
            appointment_created = self._create_appointment_from_waitlist(appointment_data)
            
            if appointment_created:
                # Mark waitlist entry as booked
                cursor.execute("""
                    UPDATE waitlist 
                    SET status = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (WaitlistStatus.BOOKED.value, waitlist_id))
                
                conn.commit()
                
                return {
                    'success': True,
                    'message': 'Appointment successfully booked!',
                    'appointment_id': appointment_created
                }
            else:
                return {
                    'success': False,
                    'message': 'Slot no longer available'
                }
        
        except Exception as e:
            conn.rollback()
            return {
                'success': False,
                'message': f'Error booking from waitlist: {str(e)}'
            }
        finally:
            conn.close()
    
    def get_customer_waitlist_status(self, customer_id: int) -> List[Dict[str, Any]]:
        """Get all active waitlist entries for a customer"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT w.id, w.barber_id, w.service_id, w.location_id, w.preferred_datetime,
                   w.alternative_datetimes, w.status, w.queue_position, w.notification_sent_at,
                   w.expires_at, w.created_at,
                   s.name as service_name, b.display_name as barber_name, l.name as location_name
            FROM waitlist w
            JOIN services s ON w.service_id = s.id
            LEFT JOIN barbers b ON w.barber_id = b.id
            JOIN locations l ON w.location_id = l.id
            WHERE w.customer_id = ? AND w.status IN (?, ?)
            ORDER BY w.created_at DESC
        """, (customer_id, WaitlistStatus.ACTIVE.value, WaitlistStatus.NOTIFIED.value))
        
        rows = cursor.fetchall()
        conn.close()
        
        waitlist_entries = []
        for row in rows:
            alternative_dates = json.loads(row[5]) if row[5] else []
            
            entry = {
                'waitlist_id': row[0],
                'service_name': row[11],
                'barber_name': row[12] or 'Any available barber',
                'location_name': row[13],
                'preferred_datetime': row[4],
                'alternative_datetimes': alternative_dates,
                'status': row[6],
                'queue_position': row[7],
                'notification_sent_at': row[8],
                'expires_at': row[9],
                'created_at': row[10],
                'estimated_wait_time': self._estimate_wait_time(row[7])
            }
            waitlist_entries.append(entry)
        
        return waitlist_entries
    
    def get_waitlist_analytics(self, location_id: Optional[int] = None) -> Dict[str, Any]:
        """Get waitlist analytics for business intelligence"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Base query conditions
        where_clause = "WHERE w.created_at >= date('now', '-30 days')"
        params = []
        
        if location_id:
            where_clause += " AND w.location_id = ?"
            params.append(location_id)
        
        # Total waitlist entries in last 30 days
        cursor.execute(f"""
            SELECT COUNT(*) FROM waitlist w {where_clause}
        """, params)
        total_entries = cursor.fetchone()[0]
        
        # Conversion rate (waitlist -> bookings)
        cursor.execute(f"""
            SELECT COUNT(*) FROM waitlist w 
            {where_clause} AND w.status = ?
        """, params + [WaitlistStatus.BOOKED.value])
        successful_bookings = cursor.fetchone()[0]
        
        conversion_rate = (successful_bookings / total_entries * 100) if total_entries > 0 else 0
        
        # Average wait time until notification
        cursor.execute(f"""
            SELECT AVG(julianday(notification_sent_at) - julianday(created_at)) * 24 * 60
            FROM waitlist w 
            {where_clause} AND w.notification_sent_at IS NOT NULL
        """, params)
        avg_wait_minutes = cursor.fetchone()[0] or 0
        
        # Most requested slots
        cursor.execute(f"""
            SELECT strftime('%w', w.preferred_datetime) as day_of_week,
                   strftime('%H', w.preferred_datetime) as hour,
                   COUNT(*) as requests
            FROM waitlist w {where_clause}
            GROUP BY day_of_week, hour
            ORDER BY requests DESC
            LIMIT 10
        """, params)
        popular_slots = cursor.fetchall()
        
        # Service demand from waitlist
        cursor.execute(f"""
            SELECT s.name, COUNT(*) as waitlist_requests
            FROM waitlist w
            JOIN services s ON w.service_id = s.id
            {where_clause}
            GROUP BY s.name
            ORDER BY waitlist_requests DESC
        """, params)
        service_demand = cursor.fetchall()
        
        conn.close()
        
        return {
            'total_waitlist_entries': total_entries,
            'successful_bookings': successful_bookings,
            'conversion_rate': round(conversion_rate, 2),
            'average_wait_time_minutes': round(avg_wait_minutes, 2),
            'popular_time_slots': [
                {
                    'day_of_week': int(slot[0]),
                    'hour': int(slot[1]),
                    'requests': slot[2]
                } for slot in popular_slots
            ],
            'service_demand': [
                {
                    'service_name': service[0],
                    'waitlist_requests': service[1]
                } for service in service_demand
            ],
            'analysis_period': '30 days'
        }
    
    # Helper methods
    
    def _get_existing_waitlist_entry(self, customer_id: int, barber_id: Optional[int], 
                                   service_id: int, location_id: int, 
                                   preferred_datetime: datetime) -> Optional[Dict[str, Any]]:
        """Check if customer already has waitlist entry for this slot"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, queue_position, status
            FROM waitlist
            WHERE customer_id = ? AND barber_id = ? AND service_id = ? 
                  AND location_id = ? AND preferred_datetime = ?
                  AND status IN (?, ?)
        """, (customer_id, barber_id, service_id, location_id, 
              preferred_datetime.isoformat(),
              WaitlistStatus.ACTIVE.value, WaitlistStatus.NOTIFIED.value))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'id': row[0],
                'queue_position': row[1],
                'status': row[2]
            }
        return None
    
    def _get_next_queue_position(self, barber_id: Optional[int], service_id: int,
                               location_id: int, preferred_datetime: datetime) -> int:
        """Get next queue position for this slot"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT MAX(queue_position)
            FROM waitlist
            WHERE barber_id = ? AND service_id = ? AND location_id = ?
                  AND preferred_datetime = ? AND status = ?
        """, (barber_id, service_id, location_id, 
              preferred_datetime.isoformat(), WaitlistStatus.ACTIVE.value))
        
        max_position = cursor.fetchone()[0]
        conn.close()
        
        return (max_position or 0) + 1
    
    def _update_queue_positions_after_removal(self, barber_id: Optional[int], service_id: int,
                                            location_id: int, preferred_datetime: datetime,
                                            removed_position: int):
        """Update queue positions after someone leaves"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE waitlist
            SET queue_position = queue_position - 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE barber_id = ? AND service_id = ? AND location_id = ?
                  AND preferred_datetime = ? AND queue_position > ?
                  AND status = ?
        """, (barber_id, service_id, location_id,
              preferred_datetime.isoformat(), removed_position,
              WaitlistStatus.ACTIVE.value))
        
        conn.commit()
        conn.close()
    
    def _get_waitlist_entries_for_slot(self, barber_id: Optional[int], service_id: int,
                                     location_id: int, datetime_slot: datetime) -> List[WaitlistEntry]:
        """Get all waitlist entries for a specific slot"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, customer_id, barber_id, service_id, location_id,
                   preferred_datetime, alternative_datetimes, status, queue_position,
                   notification_sent_at, expires_at, created_at
            FROM waitlist
            WHERE barber_id = ? AND service_id = ? AND location_id = ?
                  AND preferred_datetime = ? AND status = ?
        """, (barber_id, service_id, location_id, 
              datetime_slot.isoformat(), WaitlistStatus.ACTIVE.value))
        
        rows = cursor.fetchall()
        conn.close()
        
        entries = []
        for row in rows:
            alternative_dates = []
            if row[6]:
                alternative_dates = [datetime.fromisoformat(dt) for dt in json.loads(row[6])]
            
            entry = WaitlistEntry(
                id=row[0],
                customer_id=row[1],
                barber_id=row[2],
                service_id=row[3],
                location_id=row[4],
                preferred_datetime=datetime.fromisoformat(row[5]),
                alternative_datetimes=alternative_dates,
                status=WaitlistStatus(row[7]),
                queue_position=row[8],
                notification_sent_at=datetime.fromisoformat(row[9]) if row[9] else None,
                expires_at=datetime.fromisoformat(row[10]) if row[10] else None,
                created_at=datetime.fromisoformat(row[11])
            )
            entries.append(entry)
        
        return entries
    
    def _create_slot_available_notification(self, waitlist_entry: WaitlistEntry, 
                                          available_slot: datetime) -> Optional[WaitlistNotification]:
        """Create notification for available slot"""
        
        # Get customer, service, and barber info
        customer_info = self._get_customer_info(waitlist_entry.customer_id)
        service_info = self._get_service_info(waitlist_entry.service_id)
        barber_info = self._get_barber_info(waitlist_entry.barber_id) if waitlist_entry.barber_id else None
        
        if not customer_info or not service_info:
            return None
        
        # Format message
        formatted_datetime = available_slot.strftime("%A, %B %d at %I:%M %p")
        barber_text = f" with {barber_info['display_name']}" if barber_info else ""
        
        message = f"🎉 Great news! Your {service_info['name']}{barber_text} slot is now available for {formatted_datetime}. Book now - this offer expires in {self.notification_window} minutes!"
        
        # Create booking link
        booking_link = f"https://your-booking-system.com/book-waitlist/{waitlist_entry.id}"
        
        # Set expiry time
        expires_at = datetime.now() + timedelta(minutes=self.notification_window)
        
        # Determine notification method
        method = NotificationMethod.SMS if customer_info.get('phone') else NotificationMethod.EMAIL
        
        return WaitlistNotification(
            customer_id=waitlist_entry.customer_id,
            message=message,
            method=method,
            booking_link=booking_link,
            expires_at=expires_at
        )
    
    def _mark_waitlist_entry_notified(self, waitlist_id: int):
        """Mark waitlist entry as notified"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        expires_at = datetime.now() + timedelta(minutes=self.notification_window)
        
        cursor.execute("""
            UPDATE waitlist
            SET status = ?, notification_sent_at = CURRENT_TIMESTAMP,
                expires_at = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (WaitlistStatus.NOTIFIED.value, expires_at.isoformat(), waitlist_id))
        
        conn.commit()
        conn.close()
    
    def _create_appointment_from_waitlist(self, appointment_data: Dict[str, Any]) -> Optional[int]:
        """Create appointment from waitlist (placeholder - integrate with main booking system)"""
        
        # This would integrate with the main appointment creation system
        # For now, we'll simulate creating an appointment
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Get service details for pricing/duration
            cursor.execute("SELECT base_price, base_duration FROM services WHERE id = ?", 
                          (appointment_data['service_id'],))
            service_info = cursor.fetchone()
            
            if not service_info:
                return None
            
            base_price, base_duration = service_info
            
            # Create appointment
            cursor.execute("""
                INSERT INTO appointments 
                (customer_id, barber_id, service_id, location_id, appointment_datetime,
                 duration, price, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (appointment_data['customer_id'], appointment_data['barber_id'],
                  appointment_data['service_id'], appointment_data['location_id'],
                  appointment_data['appointment_datetime'].isoformat(),
                  base_duration, base_price))
            
            appointment_id = cursor.lastrowid
            conn.commit()
            
            return appointment_id
            
        except Exception as e:
            conn.rollback()
            print(f"Error creating appointment from waitlist: {str(e)}")
            return None
        finally:
            conn.close()
    
    def _get_customer_info(self, customer_id: int) -> Optional[Dict[str, Any]]:
        """Get customer information"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT full_name, email, phone FROM users WHERE id = ?", (customer_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'full_name': row[0],
                'email': row[1],
                'phone': row[2]
            }
        return None
    
    def _get_service_info(self, service_id: int) -> Optional[Dict[str, Any]]:
        """Get service information"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT name, base_price, base_duration FROM services WHERE id = ?", (service_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'name': row[0],
                'base_price': row[1],
                'base_duration': row[2]
            }
        return None
    
    def _get_barber_info(self, barber_id: int) -> Optional[Dict[str, Any]]:
        """Get barber information"""
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT display_name FROM barbers WHERE id = ?", (barber_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'display_name': row[0]
            }
        return None
    
    def _estimate_wait_time(self, queue_position: int) -> str:
        """Estimate wait time based on queue position"""
        
        if queue_position == 1:
            return "You're next! Should be notified within hours."
        elif queue_position <= 3:
            return f"Estimated wait: 1-2 days (#{queue_position} in line)"
        elif queue_position <= 7:
            return f"Estimated wait: 3-5 days (#{queue_position} in line)"
        else:
            return f"Estimated wait: 1+ week (#{queue_position} in line)"

# Initialize waitlist manager instance
waitlist_manager = IntelligentWaitlistManager()