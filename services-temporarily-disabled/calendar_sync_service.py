"""
Calendar Sync Service
Integrates with Google Calendar, Outlook Calendar, and other external calendar services
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import uuid
import asyncio
import base64

# Google Calendar API
try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("Google Calendar API not available. Install: pip install google-api-python-client google-auth-oauthlib")

# Microsoft Graph API for Outlook
try:
    import requests
    from msal import ConfidentialClientApplication
    OUTLOOK_AVAILABLE = True
except ImportError:
    OUTLOOK_AVAILABLE = False
    print("Outlook integration not available. Install: pip install msal requests")

@dataclass
class CalendarEvent:
    """Represents a calendar event"""
    event_id: str
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    attendees: List[str]
    location: str
    calendar_id: str
    external_id: Optional[str] = None
    sync_status: str = 'pending'  # 'pending', 'synced', 'failed', 'conflict'

@dataclass
class CalendarAccount:
    """Represents a connected calendar account"""
    account_id: str
    provider: str  # 'google', 'outlook', 'apple'
    email: str
    display_name: str
    calendar_id: str
    is_primary: bool
    sync_enabled: bool
    last_sync: Optional[datetime]
    sync_direction: str  # 'both', 'push_only', 'pull_only'
    access_token: str
    refresh_token: Optional[str]
    token_expires: Optional[datetime]

class CalendarSyncService:
    """Service for syncing appointments with external calendars"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        
        # Google Calendar settings
        self.google_client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.google_client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.google_redirect_uri = os.getenv('GOOGLE_REDIRECT_URI', 'http://localhost:9999/api/auth/google/callback')
        
        # Microsoft Graph settings  
        self.outlook_client_id = os.getenv('OUTLOOK_CLIENT_ID')
        self.outlook_client_secret = os.getenv('OUTLOOK_CLIENT_SECRET')
        self.outlook_tenant_id = os.getenv('OUTLOOK_TENANT_ID', 'common')
        
        self._init_database()
    
    def _init_database(self):
        """Initialize calendar sync tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Calendar accounts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS calendar_accounts (
                account_id TEXT PRIMARY KEY,
                barber_id TEXT NOT NULL,
                provider TEXT NOT NULL,
                email TEXT NOT NULL,
                display_name TEXT,
                calendar_id TEXT,
                is_primary BOOLEAN DEFAULT 0,
                sync_enabled BOOLEAN DEFAULT 1,
                last_sync TIMESTAMP,
                sync_direction TEXT DEFAULT 'both',
                access_token TEXT,
                refresh_token TEXT,
                token_expires TIMESTAMP,
                settings TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Sync events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS calendar_sync_events (
                sync_id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                external_event_id TEXT,
                sync_direction TEXT,
                sync_status TEXT DEFAULT 'pending',
                last_sync_attempt TIMESTAMP,
                sync_error TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES calendar_accounts (account_id),
                UNIQUE(booking_id, account_id)
            )
        ''')
        
        # Sync conflicts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS calendar_conflicts (
                conflict_id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                account_id TEXT NOT NULL,
                conflict_type TEXT,
                local_event TEXT,
                external_event TEXT,
                resolution_strategy TEXT,
                resolved_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Calendar sync settings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS calendar_sync_settings (
                setting_id TEXT PRIMARY KEY,
                barber_id TEXT NOT NULL,
                sync_frequency INTEGER DEFAULT 300,
                conflict_resolution TEXT DEFAULT 'manual',
                auto_create_events BOOLEAN DEFAULT 1,
                sync_private_events BOOLEAN DEFAULT 0,
                event_title_template TEXT DEFAULT '{customer_name} - {service_name}',
                event_description_template TEXT,
                buffer_time_minutes INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(barber_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    # Google Calendar Integration
    def get_google_auth_url(self, barber_id: str) -> str:
        """Get Google OAuth authorization URL"""
        if not GOOGLE_AVAILABLE:
            raise Exception("Google Calendar integration not available")
        
        # Store barber_id in state for callback
        state = base64.b64encode(json.dumps({'barber_id': barber_id}).encode()).decode()
        
        flow = Flow.from_client_config({
            "web": {
                "client_id": self.google_client_id,
                "client_secret": self.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.google_redirect_uri]
            }
        }, scopes=[
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/userinfo.email'
        ])
        
        flow.redirect_uri = self.google_redirect_uri
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state
        )
        
        return auth_url
    
    def handle_google_callback(self, authorization_code: str, state: str) -> Dict[str, Any]:
        """Handle Google OAuth callback"""
        try:
            # Decode state to get barber_id
            state_data = json.loads(base64.b64decode(state).decode())
            barber_id = state_data['barber_id']
            
            # Exchange code for tokens
            flow = Flow.from_client_config({
                "web": {
                    "client_id": self.google_client_id,
                    "client_secret": self.google_client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.google_redirect_uri]
                }
            }, scopes=[
                'https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/userinfo.email'
            ])
            
            flow.redirect_uri = self.google_redirect_uri
            flow.fetch_token(code=authorization_code)
            
            credentials = flow.credentials
            
            # Get user info
            service = build('oauth2', 'v2', credentials=credentials)
            user_info = service.userinfo().get().execute()
            
            # Store account
            account_id = self._store_google_account(
                barber_id=barber_id,
                credentials=credentials,
                user_info=user_info
            )
            
            return {
                'success': True,
                'account_id': account_id,
                'email': user_info.get('email'),
                'name': user_info.get('name')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _store_google_account(self, barber_id: str, credentials: Credentials, user_info: Dict) -> str:
        """Store Google Calendar account credentials"""
        account_id = f"google_{uuid.uuid4().hex[:8]}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if account already exists
        cursor.execute('''
            SELECT account_id FROM calendar_accounts 
            WHERE barber_id = ? AND provider = 'google' AND email = ?
        ''', (barber_id, user_info.get('email')))
        
        existing = cursor.fetchone()
        if existing:
            account_id = existing[0]
            
            # Update existing account
            cursor.execute('''
                UPDATE calendar_accounts 
                SET access_token = ?, refresh_token = ?, token_expires = ?, 
                    display_name = ?, last_sync = NULL
                WHERE account_id = ?
            ''', (
                credentials.token,
                credentials.refresh_token,
                credentials.expiry,
                user_info.get('name'),
                account_id
            ))
        else:
            # Insert new account
            cursor.execute('''
                INSERT INTO calendar_accounts 
                (account_id, barber_id, provider, email, display_name, calendar_id,
                 access_token, refresh_token, token_expires, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                account_id,
                barber_id,
                'google',
                user_info.get('email'),
                user_info.get('name'),
                'primary',
                credentials.token,
                credentials.refresh_token,
                credentials.expiry,
                True  # First Google account is primary
            ))
        
        conn.commit()
        conn.close()
        
        return account_id
    
    # Outlook Integration
    def get_outlook_auth_url(self, barber_id: str) -> str:
        """Get Outlook OAuth authorization URL"""
        if not OUTLOOK_AVAILABLE:
            raise Exception("Outlook integration not available")
        
        app = ConfidentialClientApplication(
            self.outlook_client_id,
            authority=f"https://login.microsoftonline.com/{self.outlook_tenant_id}",
            client_credential=self.outlook_client_secret
        )
        
        # Store barber_id in state
        state = base64.b64encode(json.dumps({'barber_id': barber_id}).encode()).decode()
        
        auth_url = app.get_authorization_request_url(
            scopes=['https://graph.microsoft.com/Calendars.ReadWrite',
                   'https://graph.microsoft.com/User.Read'],
            state=state,
            redirect_uri='http://localhost:9999/api/auth/outlook/callback'
        )
        
        return auth_url
    
    def handle_outlook_callback(self, authorization_code: str, state: str) -> Dict[str, Any]:
        """Handle Outlook OAuth callback"""
        try:
            # Decode state to get barber_id
            state_data = json.loads(base64.b64decode(state).decode())
            barber_id = state_data['barber_id']
            
            app = ConfidentialClientApplication(
                self.outlook_client_id,
                authority=f"https://login.microsoftonline.com/{self.outlook_tenant_id}",
                client_credential=self.outlook_client_secret
            )
            
            # Exchange code for tokens
            result = app.acquire_token_by_authorization_code(
                authorization_code,
                scopes=['https://graph.microsoft.com/Calendars.ReadWrite',
                       'https://graph.microsoft.com/User.Read'],
                redirect_uri='http://localhost:9999/api/auth/outlook/callback'
            )
            
            if 'access_token' not in result:
                raise Exception(f"Failed to get access token: {result.get('error_description')}")
            
            # Get user info
            headers = {'Authorization': f"Bearer {result['access_token']}"}
            user_response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
            user_info = user_response.json()
            
            # Store account
            account_id = self._store_outlook_account(
                barber_id=barber_id,
                token_result=result,
                user_info=user_info
            )
            
            return {
                'success': True,
                'account_id': account_id,
                'email': user_info.get('mail') or user_info.get('userPrincipalName'),
                'name': user_info.get('displayName')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _store_outlook_account(self, barber_id: str, token_result: Dict, user_info: Dict) -> str:
        """Store Outlook account credentials"""
        account_id = f"outlook_{uuid.uuid4().hex[:8]}"
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if account already exists
        cursor.execute('''
            SELECT account_id FROM calendar_accounts 
            WHERE barber_id = ? AND provider = 'outlook' AND email = ?
        ''', (barber_id, email))
        
        existing = cursor.fetchone()
        if existing:
            account_id = existing[0]
            
            # Update existing account
            cursor.execute('''
                UPDATE calendar_accounts 
                SET access_token = ?, refresh_token = ?, token_expires = ?, 
                    display_name = ?, last_sync = NULL
                WHERE account_id = ?
            ''', (
                token_result['access_token'],
                token_result.get('refresh_token'),
                datetime.now() + timedelta(seconds=token_result.get('expires_in', 3600)),
                user_info.get('displayName'),
                account_id
            ))
        else:
            # Insert new account
            cursor.execute('''
                INSERT INTO calendar_accounts 
                (account_id, barber_id, provider, email, display_name, calendar_id,
                 access_token, refresh_token, token_expires, is_primary)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                account_id,
                barber_id,
                'outlook',
                email,
                user_info.get('displayName'),
                'primary',
                token_result['access_token'],
                token_result.get('refresh_token'),
                datetime.now() + timedelta(seconds=token_result.get('expires_in', 3600)),
                True  # First Outlook account is primary
            ))
        
        conn.commit()
        conn.close()
        
        return account_id
    
    # Sync Operations
    def sync_appointment_to_external_calendar(self, booking_id: str, account_id: str) -> Dict[str, Any]:
        """Sync a barbershop appointment to external calendar"""
        try:
            # Get booking details
            booking = self._get_booking_details(booking_id)
            if not booking:
                return {'success': False, 'error': 'Booking not found'}
            
            # Get calendar account
            account = self._get_calendar_account(account_id)
            if not account:
                return {'success': False, 'error': 'Calendar account not found'}
            
            # Create calendar event
            event = self._create_calendar_event_from_booking(booking, account)
            
            # Sync to external calendar
            if account['provider'] == 'google':
                result = self._sync_to_google_calendar(event, account)
            elif account['provider'] == 'outlook':
                result = self._sync_to_outlook_calendar(event, account)
            else:
                return {'success': False, 'error': f"Unsupported provider: {account['provider']}"}
            
            # Update sync status
            self._update_sync_status(booking_id, account_id, result)
            
            return result
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_booking_details(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Get booking details from database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # This would join with your bookings table
        cursor.execute('''
            SELECT 
                b.id as booking_id,
                b.customer_name,
                b.customer_email,
                b.customer_phone,
                b.start_time,
                b.end_time,
                b.service_name,
                b.barber_name,
                b.notes,
                b.location
            FROM bookings b
            WHERE b.id = ?
        ''', (booking_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = ['booking_id', 'customer_name', 'customer_email', 'customer_phone',
                      'start_time', 'end_time', 'service_name', 'barber_name', 'notes', 'location']
            return dict(zip(columns, result))
        return None
    
    def _get_calendar_account(self, account_id: str) -> Optional[Dict[str, Any]]:
        """Get calendar account details"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM calendar_accounts WHERE account_id = ?', (account_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = ['account_id', 'barber_id', 'provider', 'email', 'display_name',
                      'calendar_id', 'is_primary', 'sync_enabled', 'last_sync', 'sync_direction',
                      'access_token', 'refresh_token', 'token_expires', 'settings', 'created_at']
            return dict(zip(columns, result))
        return None
    
    def _create_calendar_event_from_booking(self, booking: Dict[str, Any], account: Dict[str, Any]) -> CalendarEvent:
        """Create calendar event from booking data"""
        # Get event template settings
        settings = self._get_sync_settings(account['barber_id'])
        
        title_template = settings.get('event_title_template', '{customer_name} - {service_name}')
        description_template = settings.get('event_description_template', 
            'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}')
        
        # Format title and description
        title = title_template.format(**booking)
        description = description_template.format(**booking)
        
        return CalendarEvent(
            event_id=f"booking_{booking['booking_id']}",
            title=title,
            description=description,
            start_time=datetime.fromisoformat(booking['start_time']),
            end_time=datetime.fromisoformat(booking['end_time']),
            attendees=[booking['customer_email']] if booking['customer_email'] else [],
            location=booking.get('location', '6FB Barbershop'),
            calendar_id=account['calendar_id']
        )
    
    def _sync_to_google_calendar(self, event: CalendarEvent, account: Dict[str, Any]) -> Dict[str, Any]:
        """Sync event to Google Calendar"""
        if not GOOGLE_AVAILABLE:
            return {'success': False, 'error': 'Google Calendar not available'}
        
        try:
            # Refresh credentials if needed
            credentials = Credentials(
                token=account['access_token'],
                refresh_token=account['refresh_token'],
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.google_client_id,
                client_secret=self.google_client_secret
            )
            
            # Build service
            service = build('calendar', 'v3', credentials=credentials)
            
            # Prepare event data
            google_event = {
                'summary': event.title,
                'description': event.description,
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': 'America/Los_Angeles',
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': 'America/Los_Angeles',
                },
                'location': event.location,
                'attendees': [{'email': email} for email in event.attendees],
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 30},
                    ],
                },
            }
            
            # Create event
            created_event = service.events().insert(
                calendarId=account['calendar_id'], 
                body=google_event
            ).execute()
            
            return {
                'success': True,
                'external_event_id': created_event['id'],
                'event_url': created_event.get('htmlLink')
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _sync_to_outlook_calendar(self, event: CalendarEvent, account: Dict[str, Any]) -> Dict[str, Any]:
        """Sync event to Outlook Calendar"""
        if not OUTLOOK_AVAILABLE:
            return {'success': False, 'error': 'Outlook integration not available'}
        
        try:
            headers = {
                'Authorization': f"Bearer {account['access_token']}",
                'Content-Type': 'application/json'
            }
            
            # Prepare event data
            outlook_event = {
                'subject': event.title,
                'body': {
                    'contentType': 'text',
                    'content': event.description
                },
                'start': {
                    'dateTime': event.start_time.isoformat(),
                    'timeZone': 'Pacific Standard Time'
                },
                'end': {
                    'dateTime': event.end_time.isoformat(),
                    'timeZone': 'Pacific Standard Time'
                },
                'location': {
                    'displayName': event.location
                },
                'attendees': [
                    {
                        'emailAddress': {
                            'address': email,
                            'name': email.split('@')[0]
                        }
                    } for email in event.attendees
                ],
                'reminderMinutesBeforeStart': 30
            }
            
            # Create event
            response = requests.post(
                'https://graph.microsoft.com/v1.0/me/events',
                headers=headers,
                json=outlook_event
            )
            
            if response.status_code == 201:
                created_event = response.json()
                return {
                    'success': True,
                    'external_event_id': created_event['id'],
                    'event_url': created_event.get('webLink')
                }
            else:
                return {
                    'success': False,
                    'error': f"Outlook API error: {response.status_code} - {response.text}"
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _update_sync_status(self, booking_id: str, account_id: str, sync_result: Dict[str, Any]):
        """Update sync status in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        sync_id = f"sync_{uuid.uuid4().hex[:8]}"
        
        cursor.execute('''
            INSERT OR REPLACE INTO calendar_sync_events
            (sync_id, booking_id, account_id, external_event_id, sync_direction,
             sync_status, last_sync_attempt, sync_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            sync_id,
            booking_id,
            account_id,
            sync_result.get('external_event_id'),
            'push',
            'synced' if sync_result['success'] else 'failed',
            datetime.now(),
            sync_result.get('error')
        ))
        
        # Update account last sync time if successful
        if sync_result['success']:
            cursor.execute('''
                UPDATE calendar_accounts 
                SET last_sync = ? 
                WHERE account_id = ?
            ''', (datetime.now(), account_id))
        
        conn.commit()
        conn.close()
    
    def _get_sync_settings(self, barber_id: str) -> Dict[str, Any]:
        """Get sync settings for barber"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM calendar_sync_settings WHERE barber_id = ?', (barber_id,))
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = ['setting_id', 'barber_id', 'sync_frequency', 'conflict_resolution',
                      'auto_create_events', 'sync_private_events', 'event_title_template',
                      'event_description_template', 'buffer_time_minutes', 'created_at']
            return dict(zip(columns, result))
        
        # Return defaults if no settings found
        return {
            'event_title_template': '{customer_name} - {service_name}',
            'event_description_template': 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
            'sync_frequency': 300,
            'conflict_resolution': 'manual',
            'auto_create_events': True,
            'buffer_time_minutes': 5
        }
    
    def get_connected_accounts(self, barber_id: str) -> List[Dict[str, Any]]:
        """Get all connected calendar accounts for a barber"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT account_id, provider, email, display_name, is_primary, 
                   sync_enabled, last_sync, sync_direction
            FROM calendar_accounts 
            WHERE barber_id = ? 
            ORDER BY is_primary DESC, created_at
        ''', (barber_id,))
        
        accounts = []
        columns = ['account_id', 'provider', 'email', 'display_name', 'is_primary',
                  'sync_enabled', 'last_sync', 'sync_direction']
        
        for row in cursor.fetchall():
            account = dict(zip(columns, row))
            
            # Get sync stats
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_syncs,
                    SUM(CASE WHEN sync_status = 'synced' THEN 1 ELSE 0 END) as successful_syncs,
                    MAX(last_sync_attempt) as last_attempt
                FROM calendar_sync_events 
                WHERE account_id = ?
            ''', (account['account_id'],))
            
            stats = cursor.fetchone()
            account['sync_stats'] = {
                'total_syncs': stats[0] or 0,
                'successful_syncs': stats[1] or 0,
                'last_attempt': stats[2],
                'success_rate': (stats[1] / stats[0] * 100) if stats[0] > 0 else 0
            }
            
            accounts.append(account)
        
        conn.close()
        return accounts
    
    def disconnect_account(self, account_id: str) -> bool:
        """Disconnect a calendar account"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Remove account
            cursor.execute('DELETE FROM calendar_accounts WHERE account_id = ?', (account_id,))
            
            # Remove sync events
            cursor.execute('DELETE FROM calendar_sync_events WHERE account_id = ?', (account_id,))
            
            # Remove conflicts
            cursor.execute('DELETE FROM calendar_conflicts WHERE account_id = ?', (account_id,))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            print(f"Error disconnecting account: {e}")
            return False

# Example usage
if __name__ == "__main__":
    service = CalendarSyncService()
    
    # Example: Get Google auth URL
    barber_id = 'barber_1'
    if GOOGLE_AVAILABLE:
        google_auth_url = service.get_google_auth_url(barber_id)
        print(f"Google auth URL: {google_auth_url}")
    
    # Example: Sync an appointment
    # booking_id = 'booking_123'
    # account_id = 'google_account_1'
    # result = service.sync_appointment_to_external_calendar(booking_id, account_id)
    # print(f"Sync result: {result}")
    
    # Example: Get connected accounts
    # accounts = service.get_connected_accounts(barber_id)
    # print(f"Connected accounts: {accounts}")