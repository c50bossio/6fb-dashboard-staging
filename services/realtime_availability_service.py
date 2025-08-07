"""
Real-time Availability Service
Manages appointment availability, conflict prevention, and real-time updates
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import asyncio
from dataclasses import dataclass
import uuid

@dataclass
class TimeSlot:
    """Represents a bookable time slot"""
    start_time: datetime
    end_time: datetime
    barber_id: str
    is_available: bool
    capacity: int = 1
    buffer_before: int = 0  # minutes
    buffer_after: int = 5   # minutes
    
@dataclass
class AvailabilityCheck:
    """Result of availability check"""
    is_available: bool
    conflicts: List[Dict[str, Any]]
    suggestions: List[TimeSlot]
    reason: Optional[str] = None

class RealtimeAvailabilityService:
    """Service for real-time appointment availability management"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self.business_hours = {
            0: None,  # Sunday - closed
            1: (9, 18),  # Monday 9 AM - 6 PM
            2: (9, 18),  # Tuesday
            3: (9, 18),  # Wednesday
            4: (9, 18),  # Thursday
            5: (9, 19),  # Friday 9 AM - 7 PM
            6: (9, 17),  # Saturday 9 AM - 5 PM
        }
        self.slot_duration = 30  # minutes
        self.max_advance_booking = 60  # days
        self._init_database()
    
    def _init_database(self):
        """Initialize availability tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Availability rules table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS availability_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barber_id TEXT NOT NULL,
                day_of_week INTEGER,
                start_time TIME,
                end_time TIME,
                is_available BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Blocked time slots (holidays, breaks, etc.)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS blocked_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                barber_id TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Real-time slot status
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS slot_status (
                slot_id TEXT PRIMARY KEY,
                barber_id TEXT NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN DEFAULT 1,
                booking_id TEXT,
                last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(barber_id, date, start_time)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def check_availability(
        self, 
        barber_id: str, 
        start_time: datetime, 
        duration: int,
        booking_id: Optional[str] = None
    ) -> AvailabilityCheck:
        """Check if a time slot is available for booking"""
        end_time = start_time + timedelta(minutes=duration)
        
        # Check business hours
        if not self._is_within_business_hours(start_time, end_time):
            return AvailabilityCheck(
                is_available=False,
                conflicts=[],
                suggestions=self._suggest_alternative_slots(barber_id, start_time, duration),
                reason="Outside business hours"
            )
        
        # Check for conflicts
        conflicts = self._find_conflicts(barber_id, start_time, end_time, booking_id)
        
        if conflicts:
            return AvailabilityCheck(
                is_available=False,
                conflicts=conflicts,
                suggestions=self._suggest_alternative_slots(barber_id, start_time, duration),
                reason="Time slot already booked"
            )
        
        # Check blocked slots
        if self._is_blocked(barber_id, start_time, end_time):
            return AvailabilityCheck(
                is_available=False,
                conflicts=[],
                suggestions=self._suggest_alternative_slots(barber_id, start_time, duration),
                reason="Time slot is blocked"
            )
        
        return AvailabilityCheck(
            is_available=True,
            conflicts=[],
            suggestions=[],
            reason=None
        )
    
    def get_available_slots(
        self, 
        barber_id: str, 
        date: datetime.date, 
        service_duration: int = 30
    ) -> List[TimeSlot]:
        """Get all available time slots for a specific date"""
        slots = []
        day_of_week = date.weekday()
        
        # Get business hours for the day
        hours = self.business_hours.get(day_of_week)
        if not hours:
            return []  # Closed on this day
        
        start_hour, end_hour = hours
        current_time = datetime.combine(date, datetime.min.time().replace(hour=start_hour))
        end_time = datetime.combine(date, datetime.min.time().replace(hour=end_hour))
        
        # Generate all possible slots
        while current_time + timedelta(minutes=service_duration) <= end_time:
            # Check if slot is available
            availability = self.check_availability(
                barber_id, 
                current_time, 
                service_duration
            )
            
            if availability.is_available:
                slots.append(TimeSlot(
                    start_time=current_time,
                    end_time=current_time + timedelta(minutes=service_duration),
                    barber_id=barber_id,
                    is_available=True
                ))
            
            current_time += timedelta(minutes=self.slot_duration)
        
        return slots
    
    def get_next_available_slot(
        self, 
        barber_id: str, 
        preferred_time: datetime, 
        service_duration: int = 30
    ) -> Optional[TimeSlot]:
        """Find the next available slot after preferred time"""
        current_date = preferred_time.date()
        max_date = current_date + timedelta(days=self.max_advance_booking)
        
        while current_date <= max_date:
            # If same day as preferred time, start from preferred time
            if current_date == preferred_time.date():
                start_time = preferred_time
            else:
                # Otherwise start from beginning of business day
                hours = self.business_hours.get(current_date.weekday())
                if not hours:
                    current_date += timedelta(days=1)
                    continue
                start_time = datetime.combine(
                    current_date, 
                    datetime.min.time().replace(hour=hours[0])
                )
            
            # Get available slots for the day
            slots = self.get_available_slots(barber_id, current_date, service_duration)
            
            # Find first slot after preferred time
            for slot in slots:
                if slot.start_time >= start_time:
                    return slot
            
            current_date += timedelta(days=1)
        
        return None
    
    def block_time_slot(
        self, 
        barber_id: str, 
        start_time: datetime, 
        end_time: datetime, 
        reason: str = "Break"
    ) -> bool:
        """Block a time slot (for breaks, meetings, etc.)"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO blocked_slots (barber_id, start_time, end_time, reason)
                VALUES (?, ?, ?, ?)
            ''', (barber_id, start_time, end_time, reason))
            
            conn.commit()
            conn.close()
            
            # Update slot status
            self._update_slot_status(barber_id, start_time, end_time, False)
            
            return True
        except Exception as e:
            print(f"Error blocking time slot: {e}")
            return False
    
    def reserve_slot(
        self, 
        barber_id: str, 
        start_time: datetime, 
        duration: int, 
        booking_id: str
    ) -> bool:
        """Reserve a time slot for a booking"""
        # First check availability
        availability = self.check_availability(barber_id, start_time, duration)
        if not availability.is_available:
            return False
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            end_time = start_time + timedelta(minutes=duration)
            slot_id = f"{barber_id}_{start_time.isoformat()}"
            
            # Mark slot as unavailable
            cursor.execute('''
                INSERT OR REPLACE INTO slot_status 
                (slot_id, barber_id, date, start_time, end_time, is_available, booking_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                slot_id,
                barber_id,
                start_time.date(),
                start_time.time(),
                end_time.time(),
                False,
                booking_id
            ))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            print(f"Error reserving slot: {e}")
            return False
    
    def release_slot(self, booking_id: str) -> bool:
        """Release a previously reserved slot"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Find and release the slot
            cursor.execute('''
                UPDATE slot_status 
                SET is_available = 1, booking_id = NULL
                WHERE booking_id = ?
            ''', (booking_id,))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            print(f"Error releasing slot: {e}")
            return False
    
    def get_barber_schedule(
        self, 
        barber_id: str, 
        date: datetime.date
    ) -> Dict[str, Any]:
        """Get complete schedule for a barber on a specific date"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get all bookings for the day
        cursor.execute('''
            SELECT b.*, ss.start_time, ss.end_time
            FROM bookings b
            JOIN slot_status ss ON b.id = ss.booking_id
            WHERE ss.barber_id = ? AND ss.date = ?
            ORDER BY ss.start_time
        ''', (barber_id, date))
        
        bookings = []
        for row in cursor.fetchall():
            bookings.append({
                'booking_id': row[0],
                'customer_name': row[4],
                'service': row[7],
                'start_time': row[-2],
                'end_time': row[-1]
            })
        
        # Get blocked slots
        cursor.execute('''
            SELECT start_time, end_time, reason
            FROM blocked_slots
            WHERE barber_id = ? 
            AND DATE(start_time) = ?
        ''', (barber_id, date))
        
        blocked = []
        for row in cursor.fetchall():
            blocked.append({
                'start_time': row[0],
                'end_time': row[1],
                'reason': row[2]
            })
        
        conn.close()
        
        # Get available slots
        available_slots = self.get_available_slots(barber_id, date)
        
        return {
            'barber_id': barber_id,
            'date': date.isoformat(),
            'bookings': bookings,
            'blocked_slots': blocked,
            'available_slots': [
                {
                    'start': slot.start_time.isoformat(),
                    'end': slot.end_time.isoformat()
                } for slot in available_slots
            ],
            'utilization': len(bookings) / (len(bookings) + len(available_slots)) * 100 if available_slots else 100
        }
    
    def _is_within_business_hours(self, start_time: datetime, end_time: datetime) -> bool:
        """Check if time slot is within business hours"""
        day_of_week = start_time.weekday()
        hours = self.business_hours.get(day_of_week)
        
        if not hours:
            return False
        
        start_hour, end_hour = hours
        return (
            start_time.hour >= start_hour and 
            end_time.hour <= end_hour and
            end_time.minute == 0  # Must end on the hour or half hour
        )
    
    def _find_conflicts(
        self, 
        barber_id: str, 
        start_time: datetime, 
        end_time: datetime,
        exclude_booking_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Find conflicting appointments"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check for overlapping bookings
        query = '''
            SELECT b.*, ss.start_time, ss.end_time
            FROM bookings b
            JOIN slot_status ss ON b.id = ss.booking_id
            WHERE ss.barber_id = ?
            AND ss.date = ?
            AND ss.is_available = 0
            AND NOT (TIME(ss.end_time) <= TIME(?) OR TIME(ss.start_time) >= TIME(?))
        '''
        params = [barber_id, start_time.date(), start_time.time(), end_time.time()]
        
        if exclude_booking_id:
            query += ' AND b.id != ?'
            params.append(exclude_booking_id)
        
        cursor.execute(query, params)
        
        conflicts = []
        for row in cursor.fetchall():
            conflicts.append({
                'booking_id': row[0],
                'customer_name': row[4],
                'start_time': row[-2],
                'end_time': row[-1]
            })
        
        conn.close()
        return conflicts
    
    def _is_blocked(self, barber_id: str, start_time: datetime, end_time: datetime) -> bool:
        """Check if time slot is blocked"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT COUNT(*) FROM blocked_slots
            WHERE barber_id = ?
            AND NOT (end_time <= ? OR start_time >= ?)
        ''', (barber_id, start_time, end_time))
        
        count = cursor.fetchone()[0]
        conn.close()
        
        return count > 0
    
    def _suggest_alternative_slots(
        self, 
        barber_id: str, 
        preferred_time: datetime, 
        duration: int
    ) -> List[TimeSlot]:
        """Suggest alternative available slots"""
        suggestions = []
        
        # Try to find slots on the same day
        same_day_slots = self.get_available_slots(
            barber_id, 
            preferred_time.date(), 
            duration
        )
        
        # Get closest slots before and after preferred time
        before = [s for s in same_day_slots if s.start_time < preferred_time]
        after = [s for s in same_day_slots if s.start_time > preferred_time]
        
        # Add closest before
        if before:
            suggestions.append(before[-1])
        
        # Add closest after
        if after:
            suggestions.append(after[0])
        
        # If not enough suggestions, try next day
        if len(suggestions) < 3:
            next_day = preferred_time.date() + timedelta(days=1)
            next_day_slots = self.get_available_slots(barber_id, next_day, duration)
            if next_day_slots:
                suggestions.extend(next_day_slots[:3-len(suggestions)])
        
        return suggestions[:3]  # Return maximum 3 suggestions
    
    def _update_slot_status(
        self, 
        barber_id: str, 
        start_time: datetime, 
        end_time: datetime, 
        is_available: bool
    ):
        """Update slot status in real-time"""
        # In production, this would trigger WebSocket updates
        print(f"Slot status updated: {barber_id} - {start_time} to {end_time} - Available: {is_available}")
    
    def get_real_time_updates(self, barber_ids: List[str], date: datetime.date) -> Dict[str, Any]:
        """Get real-time availability updates for multiple barbers"""
        updates = {}
        
        for barber_id in barber_ids:
            schedule = self.get_barber_schedule(barber_id, date)
            updates[barber_id] = {
                'utilization': schedule['utilization'],
                'next_available': self.get_next_available_slot(
                    barber_id, 
                    datetime.combine(date, datetime.now().time())
                ),
                'total_available': len(schedule['available_slots'])
            }
        
        return {
            'timestamp': datetime.now().isoformat(),
            'date': date.isoformat(),
            'barbers': updates
        }

# Example usage
if __name__ == "__main__":
    service = RealtimeAvailabilityService()
    
    # Check availability
    barber_id = "barber_1"
    appointment_time = datetime.now().replace(hour=10, minute=0, second=0, microsecond=0)
    
    availability = service.check_availability(barber_id, appointment_time, 30)
    print(f"Available: {availability.is_available}")
    
    if not availability.is_available:
        print(f"Reason: {availability.reason}")
        print("Suggestions:")
        for slot in availability.suggestions:
            print(f"  - {slot.start_time.strftime('%I:%M %p')}")
    
    # Get available slots
    slots = service.get_available_slots(barber_id, datetime.now().date())
    print(f"\nAvailable slots today: {len(slots)}")
    
    # Get barber schedule
    schedule = service.get_barber_schedule(barber_id, datetime.now().date())
    print(f"\nUtilization: {schedule['utilization']:.1f}%")