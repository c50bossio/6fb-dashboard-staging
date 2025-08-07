"""
Recurring Appointments Service
Manages recurring appointment scheduling, automatic rebooking, and series management
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import uuid

class RecurrencePattern(Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"

@dataclass
class RecurringAppointment:
    """Represents a recurring appointment series"""
    series_id: str
    customer_id: str
    barber_id: str
    service_id: str
    pattern: RecurrencePattern
    start_date: datetime
    end_date: Optional[datetime]
    preferred_time: str  # HH:MM format
    preferred_day: Optional[int]  # 0-6, Monday-Sunday
    max_occurrences: Optional[int]
    interval_weeks: int = 1  # For custom patterns
    is_active: bool = True
    created_at: datetime
    notes: str = ""

@dataclass
class AppointmentOccurrence:
    """Individual appointment instance in a series"""
    occurrence_id: str
    series_id: str
    scheduled_date: datetime
    status: str  # 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled'
    booking_id: Optional[str]
    created_at: datetime
    rescheduled_from: Optional[datetime] = None
    notes: str = ""

class RecurringAppointmentsService:
    """Service for managing recurring appointments"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize recurring appointment tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Recurring appointment series table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recurring_appointments (
                series_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                barber_id TEXT NOT NULL,
                service_id TEXT NOT NULL,
                pattern TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE,
                preferred_time TIME NOT NULL,
                preferred_day INTEGER,
                max_occurrences INTEGER,
                interval_weeks INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                notes TEXT,
                auto_book BOOLEAN DEFAULT 1,
                advance_booking_days INTEGER DEFAULT 7,
                reminder_preferences TEXT
            )
        ''')
        
        # Individual appointment occurrences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS appointment_occurrences (
                occurrence_id TEXT PRIMARY KEY,
                series_id TEXT NOT NULL,
                scheduled_date DATE NOT NULL,
                scheduled_time TIME NOT NULL,
                status TEXT DEFAULT 'scheduled',
                booking_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                rescheduled_from TIMESTAMP,
                notes TEXT,
                FOREIGN KEY (series_id) REFERENCES recurring_appointments (series_id),
                UNIQUE(series_id, scheduled_date)
            )
        ''')
        
        # Recurring appointment preferences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recurring_preferences (
                customer_id TEXT PRIMARY KEY,
                auto_confirm BOOLEAN DEFAULT 1,
                flexible_scheduling BOOLEAN DEFAULT 1,
                preferred_advance_notice INTEGER DEFAULT 7,
                max_reschedule_attempts INTEGER DEFAULT 2,
                notification_preferences TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_recurring_series(
        self,
        customer_data: Dict[str, Any],
        barber_id: str,
        service_id: str,
        pattern: RecurrencePattern,
        start_date: datetime,
        preferred_time: str,
        **kwargs
    ) -> str:
        """Create a new recurring appointment series"""
        series_id = f"rec_{uuid.uuid4().hex[:8]}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Parse additional parameters
        end_date = kwargs.get('end_date')
        preferred_day = kwargs.get('preferred_day')
        max_occurrences = kwargs.get('max_occurrences')
        interval_weeks = kwargs.get('interval_weeks', 1)
        notes = kwargs.get('notes', '')
        auto_book = kwargs.get('auto_book', True)
        advance_booking_days = kwargs.get('advance_booking_days', 7)
        
        # Insert recurring series
        cursor.execute('''
            INSERT INTO recurring_appointments 
            (series_id, customer_id, customer_name, customer_phone, customer_email,
             barber_id, service_id, pattern, start_date, end_date, preferred_time,
             preferred_day, max_occurrences, interval_weeks, notes, auto_book, advance_booking_days)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            series_id,
            customer_data.get('customer_id'),
            customer_data.get('name'),
            customer_data.get('phone'),
            customer_data.get('email'),
            barber_id,
            service_id,
            pattern.value,
            start_date.date(),
            end_date.date() if end_date else None,
            preferred_time,
            preferred_day,
            max_occurrences,
            interval_weeks,
            notes,
            auto_book,
            advance_booking_days
        ))
        
        conn.commit()
        conn.close()
        
        # Generate initial occurrences
        self._generate_occurrences(series_id)
        
        return series_id
    
    def _generate_occurrences(self, series_id: str, lookahead_weeks: int = 12):
        """Generate appointment occurrences for a recurring series"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get series details
        cursor.execute('''
            SELECT * FROM recurring_appointments WHERE series_id = ?
        ''', (series_id,))
        
        series = cursor.fetchone()
        if not series:
            conn.close()
            return
        
        (series_id, customer_id, customer_name, customer_phone, customer_email,
         barber_id, service_id, pattern, start_date, end_date, preferred_time,
         preferred_day, max_occurrences, interval_weeks, is_active, created_at,
         notes, auto_book, advance_booking_days, reminder_preferences) = series
        
        # Parse dates
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None
        
        # Calculate occurrences
        occurrences = []
        current_date = start_date
        count = 0
        
        while count < (max_occurrences or 100):  # Prevent infinite loop
            # Check if we've exceeded the end date
            if end_date and current_date > end_date:
                break
            
            # Check if we've exceeded lookahead period
            if current_date > (datetime.now().date() + timedelta(weeks=lookahead_weeks)):
                break
            
            # Skip if occurrence already exists
            cursor.execute('''
                SELECT COUNT(*) FROM appointment_occurrences 
                WHERE series_id = ? AND scheduled_date = ?
            ''', (series_id, current_date))
            
            if cursor.fetchone()[0] == 0:
                occurrence_id = f"occ_{uuid.uuid4().hex[:8]}"
                occurrences.append((
                    occurrence_id,
                    series_id,
                    current_date,
                    preferred_time,
                    'scheduled',
                    None,  # booking_id
                    datetime.now(),
                    None,  # rescheduled_from
                    ''     # notes
                ))
            
            # Calculate next occurrence
            if pattern == 'weekly':
                current_date += timedelta(weeks=1)
            elif pattern == 'biweekly':
                current_date += timedelta(weeks=2)
            elif pattern == 'monthly':
                # Add one month (approximate)
                next_month = current_date.replace(day=28) + timedelta(days=4)
                current_date = next_month.replace(day=min(start_date.day, 
                    (next_month.replace(day=1) + timedelta(days=32)).replace(day=1).day - 1))
            elif pattern == 'custom':
                current_date += timedelta(weeks=interval_weeks)
            
            count += 1
        
        # Insert new occurrences
        if occurrences:
            cursor.executemany('''
                INSERT INTO appointment_occurrences
                (occurrence_id, series_id, scheduled_date, scheduled_time, status, 
                 booking_id, created_at, rescheduled_from, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', occurrences)
            
            conn.commit()
        
        conn.close()
        return len(occurrences)
    
    def get_upcoming_occurrences(
        self,
        customer_id: Optional[str] = None,
        barber_id: Optional[str] = None,
        days_ahead: int = 30
    ) -> List[Dict[str, Any]]:
        """Get upcoming appointment occurrences"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        query = '''
            SELECT ao.*, ra.customer_name, ra.customer_phone, ra.barber_id, 
                   ra.service_id, ra.pattern, ra.auto_book
            FROM appointment_occurrences ao
            JOIN recurring_appointments ra ON ao.series_id = ra.series_id
            WHERE ao.scheduled_date >= DATE('now') 
            AND ao.scheduled_date <= DATE('now', '+{} days')
            AND ra.is_active = 1
        '''.format(days_ahead)
        
        params = []
        
        if customer_id:
            query += ' AND ra.customer_id = ?'
            params.append(customer_id)
        
        if barber_id:
            query += ' AND ra.barber_id = ?'
            params.append(barber_id)
        
        query += ' ORDER BY ao.scheduled_date, ao.scheduled_time'
        
        cursor.execute(query, params)
        
        occurrences = []
        columns = ['occurrence_id', 'series_id', 'scheduled_date', 'scheduled_time',
                  'status', 'booking_id', 'created_at', 'rescheduled_from', 'notes',
                  'customer_name', 'customer_phone', 'barber_id', 'service_id', 'pattern', 'auto_book']
        
        for row in cursor.fetchall():
            occurrence = dict(zip(columns, row))
            occurrences.append(occurrence)
        
        conn.close()
        return occurrences
    
    def auto_book_occurrences(self) -> Dict[str, Any]:
        """Automatically book upcoming recurring appointments"""
        from .realtime_availability_service import RealtimeAvailabilityService
        availability_service = RealtimeAvailabilityService(self.db_path)
        
        results = {
            'booked': 0,
            'failed': 0,
            'skipped': 0,
            'details': []
        }
        
        # Get occurrences ready for auto-booking
        occurrences = self.get_upcoming_occurrences(days_ahead=14)
        
        for occurrence in occurrences:
            if occurrence['status'] != 'scheduled' or not occurrence['auto_book']:
                results['skipped'] += 1
                continue
            
            # Parse scheduled datetime
            scheduled_date = datetime.strptime(occurrence['scheduled_date'], '%Y-%m-%d').date()
            scheduled_time = datetime.strptime(occurrence['scheduled_time'], '%H:%M').time()
            scheduled_datetime = datetime.combine(scheduled_date, scheduled_time)
            
            # Check if appointment should be auto-booked now
            days_until = (scheduled_date - datetime.now().date()).days
            advance_days = 7  # Default advance booking
            
            if days_until > advance_days:
                results['skipped'] += 1
                continue
            
            # Check availability
            availability = availability_service.check_availability(
                occurrence['barber_id'],
                scheduled_datetime,
                30  # Default duration - should get from service
            )
            
            if availability.is_available:
                # Create booking
                booking_success = self._create_booking_for_occurrence(occurrence)
                
                if booking_success:
                    results['booked'] += 1
                    results['details'].append({
                        'occurrence_id': occurrence['occurrence_id'],
                        'customer_name': occurrence['customer_name'],
                        'scheduled_date': occurrence['scheduled_date'],
                        'status': 'booked'
                    })
                else:
                    results['failed'] += 1
            else:
                # Try to reschedule
                reschedule_success = self._attempt_reschedule(occurrence, availability.suggestions)
                
                if reschedule_success:
                    results['booked'] += 1
                    results['details'].append({
                        'occurrence_id': occurrence['occurrence_id'],
                        'customer_name': occurrence['customer_name'],
                        'scheduled_date': occurrence['scheduled_date'],
                        'status': 'rescheduled'
                    })
                else:
                    results['failed'] += 1
                    results['details'].append({
                        'occurrence_id': occurrence['occurrence_id'],
                        'customer_name': occurrence['customer_name'],
                        'scheduled_date': occurrence['scheduled_date'],
                        'status': 'failed',
                        'reason': 'No available slots'
                    })
        
        return results
    
    def _create_booking_for_occurrence(self, occurrence: Dict[str, Any]) -> bool:
        """Create actual booking for a recurring occurrence"""
        try:
            # In production, this would integrate with the main booking system
            booking_id = f"book_{uuid.uuid4().hex[:8]}"
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Update occurrence with booking ID
            cursor.execute('''
                UPDATE appointment_occurrences 
                SET status = 'confirmed', booking_id = ?
                WHERE occurrence_id = ?
            ''', (booking_id, occurrence['occurrence_id']))
            
            conn.commit()
            conn.close()
            
            # Send confirmation (would integrate with SMS/email service)
            print(f"Booking created for {occurrence['customer_name']} - {booking_id}")
            
            return True
        except Exception as e:
            print(f"Error creating booking: {e}")
            return False
    
    def _attempt_reschedule(self, occurrence: Dict[str, Any], suggestions: List[Any]) -> bool:
        """Attempt to reschedule occurrence to alternative time"""
        if not suggestions:
            return False
        
        try:
            # Use first available suggestion
            new_time = suggestions[0]
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Store original date for tracking
            original_date = occurrence['scheduled_date']
            
            # Update occurrence
            cursor.execute('''
                UPDATE appointment_occurrences 
                SET scheduled_date = ?, scheduled_time = ?, 
                    status = 'rescheduled', rescheduled_from = ?
                WHERE occurrence_id = ?
            ''', (
                new_time.start_time.date(),
                new_time.start_time.time(),
                original_date,
                occurrence['occurrence_id']
            ))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            print(f"Error rescheduling: {e}")
            return False
    
    def modify_recurring_series(
        self,
        series_id: str,
        modifications: Dict[str, Any]
    ) -> bool:
        """Modify an existing recurring appointment series"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build update query dynamically
            set_clauses = []
            params = []
            
            for key, value in modifications.items():
                if key in ['preferred_time', 'preferred_day', 'max_occurrences', 
                          'interval_weeks', 'notes', 'auto_book', 'advance_booking_days']:
                    set_clauses.append(f"{key} = ?")
                    params.append(value)
            
            if set_clauses:
                params.append(series_id)
                query = f'''
                    UPDATE recurring_appointments 
                    SET {', '.join(set_clauses)}
                    WHERE series_id = ?
                '''
                cursor.execute(query, params)
                conn.commit()
            
            conn.close()
            
            # Regenerate occurrences if scheduling parameters changed
            if any(key in modifications for key in ['preferred_time', 'preferred_day', 'interval_weeks']):
                self._regenerate_future_occurrences(series_id)
            
            return True
        except Exception as e:
            print(f"Error modifying series: {e}")
            return False
    
    def _regenerate_future_occurrences(self, series_id: str):
        """Regenerate future occurrences after series modification"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Delete future unbooked occurrences
        cursor.execute('''
            DELETE FROM appointment_occurrences 
            WHERE series_id = ? AND scheduled_date > DATE('now') 
            AND (status = 'scheduled' AND booking_id IS NULL)
        ''', (series_id,))
        
        conn.commit()
        conn.close()
        
        # Generate new occurrences
        self._generate_occurrences(series_id)
    
    def cancel_recurring_series(self, series_id: str, cancel_future_only: bool = True) -> bool:
        """Cancel a recurring appointment series"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Deactivate the series
            cursor.execute('''
                UPDATE recurring_appointments 
                SET is_active = 0 
                WHERE series_id = ?
            ''', (series_id,))
            
            if cancel_future_only:
                # Cancel only future unbooked occurrences
                cursor.execute('''
                    UPDATE appointment_occurrences 
                    SET status = 'cancelled'
                    WHERE series_id = ? AND scheduled_date > DATE('now')
                    AND (booking_id IS NULL OR status = 'scheduled')
                ''', (series_id,))
            else:
                # Cancel all future occurrences
                cursor.execute('''
                    UPDATE appointment_occurrences 
                    SET status = 'cancelled'
                    WHERE series_id = ? AND scheduled_date > DATE('now')
                ''', (series_id,))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error cancelling series: {e}")
            return False
    
    def get_series_analytics(self, series_id: str) -> Dict[str, Any]:
        """Get analytics for a recurring appointment series"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get series info
        cursor.execute('''
            SELECT * FROM recurring_appointments WHERE series_id = ?
        ''', (series_id,))
        series = cursor.fetchone()
        
        # Get occurrence statistics
        cursor.execute('''
            SELECT 
                status,
                COUNT(*) as count
            FROM appointment_occurrences 
            WHERE series_id = ?
            GROUP BY status
        ''', (series_id,))
        
        status_counts = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Calculate metrics
        total_occurrences = sum(status_counts.values())
        completion_rate = (status_counts.get('completed', 0) / total_occurrences * 100) if total_occurrences > 0 else 0
        show_rate = ((status_counts.get('completed', 0) + status_counts.get('confirmed', 0)) / total_occurrences * 100) if total_occurrences > 0 else 0
        
        conn.close()
        
        return {
            'series_id': series_id,
            'total_occurrences': total_occurrences,
            'status_breakdown': status_counts,
            'completion_rate': round(completion_rate, 1),
            'show_rate': round(show_rate, 1),
            'is_active': bool(series[15]) if series else False,
            'created_date': series[16] if series else None
        }

# Example usage
if __name__ == "__main__":
    service = RecurringAppointmentsService()
    
    # Example: Create a recurring appointment series
    customer_data = {
        'customer_id': 'cust_123',
        'name': 'John Smith',
        'phone': '+1234567890',
        'email': 'john@example.com'
    }
    
    # Weekly haircut every Tuesday at 2:00 PM
    series_id = service.create_recurring_series(
        customer_data=customer_data,
        barber_id='barber_1',
        service_id='haircut',
        pattern=RecurrencePattern.WEEKLY,
        start_date=datetime.now() + timedelta(days=7),
        preferred_time='14:00',
        preferred_day=1,  # Tuesday
        max_occurrences=12,
        notes='Regular customer, prefers short wait times'
    )
    
    print(f"Created recurring series: {series_id}")
    
    # Get upcoming occurrences
    upcoming = service.get_upcoming_occurrences(customer_id='cust_123')
    print(f"Upcoming appointments: {len(upcoming)}")
    
    # Run auto-booking process
    results = service.auto_book_occurrences()
    print(f"Auto-booking results: {results}")
    
    # Get analytics
    analytics = service.get_series_analytics(series_id)
    print(f"Series analytics: {analytics}")