#!/usr/bin/env python3
"""
Role-Based Calendar Management System
Manages calendar access permissions based on user roles and business hierarchy
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
from google_calendar_integration import GoogleCalendarService

class CalendarPermission(str, Enum):
    VIEW_OWN = "view_own"
    VIEW_LOCATION = "view_location"  
    VIEW_ALL = "view_all"
    MANAGE_OWN = "manage_own"
    MANAGE_LOCATION = "manage_location"
    MANAGE_ALL = "manage_all"
    ADMIN_ACCESS = "admin_access"

class UserRole(str, Enum):
    CUSTOMER = "customer"
    BARBER = "barber"
    MANAGER = "manager"
    ADMIN = "admin"

@dataclass
class CalendarAccess:
    """Calendar access permissions for a user"""
    user_id: int
    role: UserRole
    permissions: List[CalendarPermission]
    accessible_locations: List[int]
    accessible_barbers: List[int]
    can_modify: bool
    can_book_for_others: bool

class RoleBasedCalendarManager:
    """Manages calendar access based on user roles and business hierarchy"""
    
    def __init__(self):
        self.db_path = 'booking_system.db'
        self.calendar_service = GoogleCalendarService()
        
        # Define role-based permissions matrix
        self.role_permissions = {
            UserRole.CUSTOMER: [
                CalendarPermission.VIEW_OWN
            ],
            UserRole.BARBER: [
                CalendarPermission.VIEW_OWN,
                CalendarPermission.MANAGE_OWN
            ],
            UserRole.MANAGER: [
                CalendarPermission.VIEW_OWN,
                CalendarPermission.VIEW_LOCATION,
                CalendarPermission.MANAGE_OWN,
                CalendarPermission.MANAGE_LOCATION
            ],
            UserRole.ADMIN: [
                CalendarPermission.VIEW_ALL,
                CalendarPermission.MANAGE_ALL,
                CalendarPermission.ADMIN_ACCESS
            ]
        }
    
    def get_user_calendar_access(self, user_id: int) -> CalendarAccess:
        """Get calendar access permissions for a user"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get user information
        cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            conn.close()
            raise ValueError(f"User {user_id} not found")
        
        role = UserRole(user_data[0])
        permissions = self.role_permissions[role]
        
        # Get accessible locations and barbers based on role
        accessible_locations = []
        accessible_barbers = []
        
        if role == UserRole.CUSTOMER:
            # Customers can only see their own appointments
            accessible_locations = []
            accessible_barbers = []
            
        elif role == UserRole.BARBER:
            # Barbers can see their own calendar and location
            cursor.execute("""
                SELECT location_id FROM barbers WHERE user_id = ?
            """, (user_id,))
            barber_data = cursor.fetchone()
            if barber_data:
                accessible_locations = [barber_data[0]]
                cursor.execute("SELECT id FROM barbers WHERE user_id = ?", (user_id,))
                accessible_barbers = [cursor.fetchone()[0]]
                
        elif role == UserRole.MANAGER:
            # Managers can see all barbers in their locations
            cursor.execute("""
                SELECT DISTINCT b.location_id 
                FROM barbers b 
                WHERE b.user_id = ? OR b.location_id IN (
                    SELECT location_id FROM barbers WHERE user_id = ?
                )
            """, (user_id, user_id))
            accessible_locations = [row[0] for row in cursor.fetchall()]
            
            if accessible_locations:
                placeholders = ','.join(['?' for _ in accessible_locations])
                cursor.execute(f"""
                    SELECT id FROM barbers WHERE location_id IN ({placeholders})
                """, accessible_locations)
                accessible_barbers = [row[0] for row in cursor.fetchall()]
                
        elif role == UserRole.ADMIN:
            # Admins can access everything
            cursor.execute("SELECT id FROM locations WHERE is_active = TRUE")
            accessible_locations = [row[0] for row in cursor.fetchall()]
            
            cursor.execute("SELECT id FROM barbers WHERE is_available = TRUE")
            accessible_barbers = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return CalendarAccess(
            user_id=user_id,
            role=role,
            permissions=permissions,
            accessible_locations=accessible_locations,
            accessible_barbers=accessible_barbers,
            can_modify=CalendarPermission.MANAGE_OWN in permissions or 
                      CalendarPermission.MANAGE_LOCATION in permissions or 
                      CalendarPermission.MANAGE_ALL in permissions,
            can_book_for_others=role in [UserRole.MANAGER, UserRole.ADMIN]
        )
    
    def can_access_barber_calendar(self, user_id: int, barber_id: int) -> bool:
        """Check if user can access a specific barber's calendar"""
        access = self.get_user_calendar_access(user_id)
        
        # Admin can access everything
        if CalendarPermission.ADMIN_ACCESS in access.permissions:
            return True
            
        # Check if barber is in accessible list
        return barber_id in access.accessible_barbers
    
    def can_modify_barber_calendar(self, user_id: int, barber_id: int) -> bool:
        """Check if user can modify a specific barber's calendar"""
        if not self.can_access_barber_calendar(user_id, barber_id):
            return False
            
        access = self.get_user_calendar_access(user_id)
        
        # Check if user is the barber themselves
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM barbers WHERE id = ?", (barber_id,))
        barber_user = cursor.fetchone()
        conn.close()
        
        if barber_user and barber_user[0] == user_id:
            return CalendarPermission.MANAGE_OWN in access.permissions
            
        # Check location-level or admin permissions
        return (CalendarPermission.MANAGE_LOCATION in access.permissions or 
                CalendarPermission.MANAGE_ALL in access.permissions)
    
    def get_accessible_barber_calendars(self, user_id: int) -> List[Dict[str, Any]]:
        """Get list of barber calendars the user can access"""
        access = self.get_user_calendar_access(user_id)
        
        if not access.accessible_barbers:
            return []
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        placeholders = ','.join(['?' for _ in access.accessible_barbers])
        cursor.execute(f"""
            SELECT b.id, b.display_name, b.user_id, l.name as location_name,
                   cs.google_calendar_id, cs.sync_status
            FROM barbers b
            JOIN locations l ON b.location_id = l.id
            LEFT JOIN calendar_sync cs ON b.id = cs.barber_id
            WHERE b.id IN ({placeholders}) AND b.is_available = TRUE
            ORDER BY l.name, b.display_name
        """, access.accessible_barbers)
        
        barbers = []
        for row in cursor.fetchall():
            can_modify = self.can_modify_barber_calendar(user_id, row[0])
            
            barbers.append({
                'barber_id': row[0],
                'display_name': row[1],
                'user_id': row[2],
                'location_name': row[3],
                'google_calendar_id': row[4],
                'sync_status': row[5] or 'not_connected',
                'can_view': True,
                'can_modify': can_modify,
                'can_authorize': can_modify or (access.role == UserRole.BARBER and row[2] == user_id)
            })
        
        conn.close()
        return barbers
    
    def authorize_barber_calendar(self, user_id: int, barber_id: int) -> Dict[str, Any]:
        """Initiate Google Calendar authorization for a barber"""
        
        # Check permissions
        if not self.can_modify_barber_calendar(user_id, barber_id):
            # Special case: barbers can authorize their own calendar
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT user_id FROM barbers WHERE id = ?", (barber_id,))
            barber_user = cursor.fetchone()
            conn.close()
            
            if not (barber_user and barber_user[0] == user_id):
                return {
                    'success': False,
                    'message': 'Insufficient permissions to authorize calendar'
                }
        
        try:
            auth_url = self.calendar_service.get_authorization_url(barber_id)
            return {
                'success': True,
                'authorization_url': auth_url,
                'message': 'Calendar authorization initiated'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error initiating authorization: {str(e)}'
            }
    
    def get_barber_availability(self, user_id: int, barber_id: int, date: datetime, 
                              service_duration: int) -> Dict[str, Any]:
        """Get barber availability with role-based access control"""
        
        if not self.can_access_barber_calendar(user_id, barber_id):
            return {
                'success': False,
                'message': 'Access denied to barber calendar'
            }
        
        try:
            available_slots = self.calendar_service.get_available_slots(
                barber_id, date, service_duration
            )
            
            return {
                'success': True,
                'barber_id': barber_id,
                'date': date.strftime('%Y-%m-%d'),
                'service_duration': service_duration,
                'available_slots': [slot.isoformat() for slot in available_slots],
                'total_slots': len(available_slots)
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error retrieving availability: {str(e)}'
            }
    
    def create_appointment_with_calendar(self, user_id: int, appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create appointment with calendar sync and role validation"""
        
        barber_id = appointment_data['barber_id']
        
        # Check if user can book for this barber
        access = self.get_user_calendar_access(user_id)
        
        # Customers can only book for themselves
        if access.role == UserRole.CUSTOMER and appointment_data['customer_id'] != user_id:
            return {
                'success': False,
                'message': 'Customers can only book appointments for themselves'
            }
        
        # Check calendar access
        if not self.can_access_barber_calendar(user_id, barber_id):
            return {
                'success': False,
                'message': 'Access denied to barber calendar'
            }
        
        # Check availability
        is_available = self.calendar_service.check_availability(
            barber_id,
            appointment_data['appointment_datetime'],
            appointment_data['duration']
        )
        
        if not is_available:
            return {
                'success': False,
                'message': 'Time slot not available'
            }
        
        try:
            # Create appointment in database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO appointments 
                (customer_id, barber_id, service_id, location_id, appointment_datetime,
                 duration, price, status, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, (
                appointment_data['customer_id'],
                appointment_data['barber_id'],
                appointment_data['service_id'],
                appointment_data['location_id'],
                appointment_data['appointment_datetime'].isoformat(),
                appointment_data['duration'],
                appointment_data['price'],
                appointment_data.get('notes', '')
            ))
            
            appointment_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            # Sync to Google Calendar
            calendar_event_id = None
            if self.calendar_service.sync_appointment_to_calendar(appointment_id):
                calendar_event_id = "synced"
            
            return {
                'success': True,
                'appointment_id': appointment_id,
                'calendar_synced': calendar_event_id is not None,
                'message': 'Appointment created successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'message': f'Error creating appointment: {str(e)}'
            }
    
    def get_location_calendar_summary(self, user_id: int, location_id: int, 
                                    date_range: Tuple[datetime, datetime]) -> Dict[str, Any]:
        """Get calendar summary for a location (Manager/Admin only)"""
        
        access = self.get_user_calendar_access(user_id)
        
        if location_id not in access.accessible_locations:
            return {
                'success': False,
                'message': 'Access denied to location'
            }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        start_date, end_date = date_range
        
        # Get appointments in date range for this location
        cursor.execute("""
            SELECT a.*, b.display_name as barber_name, s.name as service_name,
                   u.full_name as customer_name
            FROM appointments a
            JOIN barbers b ON a.barber_id = b.id
            JOIN services s ON a.service_id = s.id
            JOIN users u ON a.customer_id = u.id
            WHERE a.location_id = ? 
            AND a.appointment_datetime BETWEEN ? AND ?
            AND a.status IN ('confirmed', 'completed')
            ORDER BY a.appointment_datetime
        """, (location_id, start_date.isoformat(), end_date.isoformat()))
        
        appointments = []
        total_revenue = 0
        barber_stats = {}
        
        for row in cursor.fetchall():
            appointment = {
                'id': row[0],
                'customer_name': row[15],
                'barber_name': row[13],
                'service_name': row[14],
                'appointment_datetime': row[5],
                'duration': row[6],
                'price': row[7],
                'status': row[8]
            }
            appointments.append(appointment)
            total_revenue += row[7]
            
            # Track barber stats
            barber_name = row[13]
            if barber_name not in barber_stats:
                barber_stats[barber_name] = {
                    'appointments': 0,
                    'revenue': 0,
                    'total_hours': 0
                }
            
            barber_stats[barber_name]['appointments'] += 1
            barber_stats[barber_name]['revenue'] += row[7]
            barber_stats[barber_name]['total_hours'] += row[6] / 60
        
        conn.close()
        
        return {
            'success': True,
            'location_id': location_id,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'summary': {
                'total_appointments': len(appointments),
                'total_revenue': total_revenue,
                'barber_stats': barber_stats
            },
            'appointments': appointments
        }
    
    def disconnect_barber_calendar(self, user_id: int, barber_id: int) -> Dict[str, Any]:
        """Disconnect barber's Google Calendar (Admin/Manager only)"""
        
        if not self.can_modify_barber_calendar(user_id, barber_id):
            return {
                'success': False,
                'message': 'Insufficient permissions to disconnect calendar'
            }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE calendar_sync 
            SET sync_status = 'disabled', updated_at = CURRENT_TIMESTAMP
            WHERE barber_id = ?
        """, (barber_id,))
        
        rows_affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        if rows_affected > 0:
            return {
                'success': True,
                'message': 'Calendar disconnected successfully'
            }
        else:
            return {
                'success': False,
                'message': 'No calendar connection found for this barber'
            }

# Initialize role-based calendar manager instance
role_calendar_manager = RoleBasedCalendarManager()