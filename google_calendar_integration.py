#!/usr/bin/env python3
"""
Google Calendar Integration Module
Handles two-way sync between booking system and Google Calendar
"""

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import sqlite3
import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import os

class GoogleCalendarService:
    """Google Calendar integration service for barbershop booking system"""
    
    def __init__(self):
        self.scopes = ['https://www.googleapis.com/auth/calendar']
        # In production, store these securely
        self.client_config = {
            "web": {
                "client_id": os.getenv("GOOGLE_CLIENT_ID", "your-client-id"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "your-client-secret"),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": ["http://localhost:8002/api/v1/auth/google/callback"]
            }
        }
    
    def get_authorization_url(self, barber_id: int) -> str:
        """Generate Google OAuth authorization URL for barber"""
        flow = Flow.from_client_config(
            self.client_config,
            scopes=self.scopes,
            redirect_uri=self.client_config["web"]["redirect_uris"][0]
        )
        
        # Store barber_id in state parameter for callback
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=str(barber_id)
        )
        
        return authorization_url
    
    def handle_oauth_callback(self, authorization_code: str, state: str) -> bool:
        """Handle OAuth callback and store tokens"""
        try:
            barber_id = int(state)
            
            flow = Flow.from_client_config(
                self.client_config,
                scopes=self.scopes,
                redirect_uri=self.client_config["web"]["redirect_uris"][0]
            )
            
            # Exchange authorization code for tokens
            flow.fetch_token(code=authorization_code)
            credentials = flow.credentials
            
            # Store tokens in database
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            
            # Create or get primary calendar
            service = build('calendar', 'v3', credentials=credentials)
            primary_calendar = service.calendars().get(calendarId='primary').execute()
            
            # Store calendar sync info
            cursor.execute("""
                INSERT OR REPLACE INTO calendar_sync 
                (barber_id, google_calendar_id, access_token, refresh_token, token_expires_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                barber_id,
                primary_calendar['id'],
                credentials.token,
                credentials.refresh_token,
                datetime.utcnow() + timedelta(seconds=credentials.expiry.timestamp() - datetime.utcnow().timestamp()) if credentials.expiry else None
            ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            print(f"OAuth callback error: {str(e)}")
            return False
    
    def get_barber_credentials(self, barber_id: int) -> Optional[Credentials]:
        """Get stored Google credentials for barber"""
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT access_token, refresh_token, token_expires_at
            FROM calendar_sync
            WHERE barber_id = ? AND sync_status = 'active'
        """, (barber_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return None
        
        access_token, refresh_token, expires_at = row
        expiry = datetime.fromisoformat(expires_at) if expires_at else None
        
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri=self.client_config["web"]["token_uri"],
            client_id=self.client_config["web"]["client_id"],
            client_secret=self.client_config["web"]["client_secret"],
            scopes=self.scopes,
            expiry=expiry
        )
        
        # Refresh token if expired
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())
            self._update_stored_credentials(barber_id, credentials)
        
        return credentials
    
    def _update_stored_credentials(self, barber_id: int, credentials: Credentials):
        """Update stored credentials after refresh"""
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE calendar_sync
            SET access_token = ?, token_expires_at = ?, last_sync_at = CURRENT_TIMESTAMP
            WHERE barber_id = ?
        """, (
            credentials.token,
            credentials.expiry.isoformat() if credentials.expiry else None,
            barber_id
        ))
        
        conn.commit()
        conn.close()
    
    def create_calendar_event(self, barber_id: int, appointment_data: Dict[str, Any]) -> Optional[str]:
        """Create appointment event in barber's Google Calendar"""
        credentials = self.get_barber_credentials(barber_id)
        if not credentials:
            return None
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get calendar ID for barber
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("SELECT google_calendar_id FROM calendar_sync WHERE barber_id = ?", (barber_id,))
            calendar_id = cursor.fetchone()[0]
            conn.close()
            
            # Create event
            start_time = appointment_data['appointment_datetime']
            end_time = start_time + timedelta(minutes=appointment_data['duration'])
            
            event = {
                'summary': f"{appointment_data['service_name']} - {appointment_data['customer_name']}",
                'description': f"Customer: {appointment_data['customer_name']}\nPhone: {appointment_data.get('customer_phone', 'N/A')}\nService: {appointment_data['service_name']}\nNotes: {appointment_data.get('notes', 'None')}",
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': appointment_data.get('timezone', 'America/New_York'),
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': appointment_data.get('timezone', 'America/New_York'),
                },
                'attendees': [
                    {'email': appointment_data.get('customer_email')}
                ] if appointment_data.get('customer_email') else [],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'popup', 'minutes': 60},
                        {'method': 'popup', 'minutes': 10},
                    ],
                },
            }
            
            created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
            return created_event['id']
            
        except HttpError as error:
            print(f"Calendar event creation error: {error}")
            return None
    
    def update_calendar_event(self, barber_id: int, event_id: str, appointment_data: Dict[str, Any]) -> bool:
        """Update existing calendar event"""
        credentials = self.get_barber_credentials(barber_id)
        if not credentials:
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get calendar ID
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("SELECT google_calendar_id FROM calendar_sync WHERE barber_id = ?", (barber_id,))
            calendar_id = cursor.fetchone()[0]
            conn.close()
            
            # Get existing event
            event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            # Update event fields
            start_time = appointment_data['appointment_datetime']
            end_time = start_time + timedelta(minutes=appointment_data['duration'])
            
            event['summary'] = f"{appointment_data['service_name']} - {appointment_data['customer_name']}"
            event['description'] = f"Customer: {appointment_data['customer_name']}\nPhone: {appointment_data.get('customer_phone', 'N/A')}\nService: {appointment_data['service_name']}\nNotes: {appointment_data.get('notes', 'None')}"
            event['start'] = {
                'dateTime': start_time.isoformat(),
                'timeZone': appointment_data.get('timezone', 'America/New_York'),
            }
            event['end'] = {
                'dateTime': end_time.isoformat(),
                'timeZone': appointment_data.get('timezone', 'America/New_York'),
            }
            
            updated_event = service.events().update(calendarId=calendar_id, eventId=event_id, body=event).execute()
            return True
            
        except HttpError as error:
            print(f"Calendar event update error: {error}")
            return False
    
    def delete_calendar_event(self, barber_id: int, event_id: str) -> bool:
        """Delete calendar event"""
        credentials = self.get_barber_credentials(barber_id)
        if not credentials:
            return False
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get calendar ID
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("SELECT google_calendar_id FROM calendar_sync WHERE barber_id = ?", (barber_id,))
            calendar_id = cursor.fetchone()[0]
            conn.close()
            
            service.events().delete(calendarId=calendar_id, eventId=event_id).execute()
            return True
            
        except HttpError as error:
            print(f"Calendar event deletion error: {error}")
            return False
    
    def check_availability(self, barber_id: int, start_time: datetime, duration: int) -> bool:
        """Check if barber is available at specified time"""
        credentials = self.get_barber_credentials(barber_id)
        if not credentials:
            return True  # If no calendar access, assume available
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get calendar ID
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("SELECT google_calendar_id FROM calendar_sync WHERE barber_id = ?", (barber_id,))
            calendar_id = cursor.fetchone()[0]
            conn.close()
            
            end_time = start_time + timedelta(minutes=duration)
            
            # Check for conflicts
            events_result = service.events().list(
                calendarId=calendar_id,
                timeMin=start_time.isoformat() + 'Z',
                timeMax=end_time.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # If any events exist in this time range, not available
            return len(events) == 0
            
        except HttpError as error:
            print(f"Availability check error: {error}")
            return True  # Default to available if check fails
    
    def get_available_slots(self, barber_id: int, date: datetime, service_duration: int) -> List[datetime]:
        """Get available time slots for a specific date"""
        credentials = self.get_barber_credentials(barber_id)
        if not credentials:
            return []
        
        try:
            service = build('calendar', 'v3', credentials=credentials)
            
            # Get calendar ID
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("SELECT google_calendar_id FROM calendar_sync WHERE barber_id = ?", (barber_id,))
            calendar_id = cursor.fetchone()[0]
            conn.close()
            
            # Get business hours (default 9 AM - 6 PM)
            start_hour = 9
            end_hour = 18
            
            # Get existing events for the day
            day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            events_result = service.events().list(
                calendarId=calendar_id,
                timeMin=day_start.isoformat() + 'Z',
                timeMax=day_end.isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            events = events_result.get('items', [])
            
            # Convert events to busy periods
            busy_periods = []
            for event in events:
                if 'dateTime' in event['start'] and 'dateTime' in event['end']:
                    start = datetime.fromisoformat(event['start']['dateTime'].replace('Z', '+00:00'))
                    end = datetime.fromisoformat(event['end']['dateTime'].replace('Z', '+00:00'))
                    busy_periods.append((start, end))
            
            # Generate available slots
            available_slots = []
            current_time = date.replace(hour=start_hour, minute=0)
            business_end = date.replace(hour=end_hour, minute=0)
            
            while current_time + timedelta(minutes=service_duration) <= business_end:
                slot_end = current_time + timedelta(minutes=service_duration)
                
                # Check if this slot conflicts with any busy period
                is_available = True
                for busy_start, busy_end in busy_periods:
                    if (current_time < busy_end and slot_end > busy_start):
                        is_available = False
                        break
                
                if is_available:
                    available_slots.append(current_time)
                
                current_time += timedelta(minutes=15)  # 15-minute intervals
            
            return available_slots
            
        except HttpError as error:
            print(f"Available slots error: {error}")
            return []
    
    def sync_appointment_to_calendar(self, appointment_id: int) -> bool:
        """Sync a booking system appointment to Google Calendar"""
        conn = sqlite3.connect('booking_system.db')
        cursor = conn.cursor()
        
        # Get appointment details with customer info
        cursor.execute("""
            SELECT a.*, u.full_name as customer_name, u.email as customer_email, 
                   u.phone as customer_phone, s.name as service_name,
                   l.timezone
            FROM appointments a
            JOIN users u ON a.customer_id = u.id
            JOIN services s ON a.service_id = s.id
            JOIN locations l ON a.location_id = l.id
            WHERE a.id = ?
        """, (appointment_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return False
        
        appointment_data = {
            'appointment_datetime': datetime.fromisoformat(row[5]),
            'duration': row[6],
            'customer_name': row[12],
            'customer_email': row[13],
            'customer_phone': row[14],
            'service_name': row[15],
            'notes': row[8],
            'timezone': row[16]
        }
        
        event_id = self.create_calendar_event(row[2], appointment_data)  # row[2] is barber_id
        
        if event_id:
            # Update appointment with Google Calendar event ID
            conn = sqlite3.connect('booking_system.db')
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE appointments 
                SET google_calendar_event_id = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (event_id, appointment_id))
            conn.commit()
            conn.close()
            return True
        
        return False

# Initialize service instance
calendar_service = GoogleCalendarService()