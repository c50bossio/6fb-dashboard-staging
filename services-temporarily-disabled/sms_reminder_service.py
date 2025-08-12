"""
SMS Reminder Service
Automated SMS/Email reminders and confirmations for appointments
"""

import os
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import asyncio
from twilio.rest import Client
import sendgrid
from sendgrid.helpers.mail import Mail
import schedule
import time
import threading

@dataclass
class ReminderMessage:
    """Reminder message details"""
    reminder_id: str
    booking_id: str
    customer_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    appointment_time: datetime
    reminder_type: str  # '24h', '2h', 'confirmation', 'follow_up'
    message_content: str
    status: str  # 'pending', 'sent', 'failed'
    created_at: datetime
    sent_at: Optional[datetime] = None
    
@dataclass
class MessageTemplate:
    """Message template for different reminder types"""
    template_id: str
    reminder_type: str
    channel: str  # 'sms', 'email', 'whatsapp'
    subject: Optional[str]
    content: str
    variables: List[str]  # e.g., ['customer_name', 'appointment_time', 'barber_name']

class SMSReminderService:
    """Service for automated appointment reminders via SMS/Email"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        
        # Initialize Twilio (for SMS)
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID', '')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN', '')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER', '')
        
        if self.twilio_account_sid and self.twilio_auth_token:
            self.twilio_client = Client(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.twilio_client = None
            print("Warning: Twilio credentials not found. SMS functionality disabled.")
        
        # Initialize SendGrid (for Email)
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY', '')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@barbershop.com')
        
        if self.sendgrid_api_key:
            self.sendgrid_client = sendgrid.SendGridAPIClient(api_key=self.sendgrid_api_key)
        else:
            self.sendgrid_client = None
            print("Warning: SendGrid API key not found. Email functionality disabled.")
        
        self._init_database()
        self._load_templates()
        
        # Start reminder scheduler in background
        self.scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.scheduler_thread.start()
    
    def _init_database(self):
        """Initialize reminder tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Reminder queue table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS reminder_queue (
                reminder_id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                customer_id TEXT,
                customer_name TEXT,
                customer_phone TEXT,
                customer_email TEXT,
                appointment_time TIMESTAMP,
                reminder_type TEXT,
                channel TEXT DEFAULT 'sms',
                message_content TEXT,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                scheduled_for TIMESTAMP,
                sent_at TIMESTAMP,
                error_message TEXT
            )
        ''')
        
        # Message templates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS message_templates (
                template_id TEXT PRIMARY KEY,
                reminder_type TEXT NOT NULL,
                channel TEXT NOT NULL,
                subject TEXT,
                content TEXT NOT NULL,
                variables TEXT,  -- JSON array
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Communication preferences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS communication_preferences (
                customer_id TEXT PRIMARY KEY,
                sms_enabled BOOLEAN DEFAULT 1,
                email_enabled BOOLEAN DEFAULT 1,
                whatsapp_enabled BOOLEAN DEFAULT 0,
                reminder_24h BOOLEAN DEFAULT 1,
                reminder_2h BOOLEAN DEFAULT 1,
                marketing_enabled BOOLEAN DEFAULT 0,
                quiet_hours_start TIME DEFAULT '21:00',
                quiet_hours_end TIME DEFAULT '09:00',
                timezone TEXT DEFAULT 'America/Los_Angeles'
            )
        ''')
        
        # Message analytics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS message_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reminder_type TEXT,
                channel TEXT,
                sent_count INTEGER DEFAULT 0,
                delivered_count INTEGER DEFAULT 0,
                failed_count INTEGER DEFAULT 0,
                date DATE,
                UNIQUE(reminder_type, channel, date)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _load_templates(self):
        """Load default message templates"""
        default_templates = [
            {
                'template_id': 'sms_24h_reminder',
                'reminder_type': '24h',
                'channel': 'sms',
                'subject': None,
                'content': 'Hi {customer_name}! Reminder: You have an appointment tomorrow at {appointment_time} with {barber_name}. Reply CANCEL to cancel or CONFIRM to confirm.',
                'variables': ['customer_name', 'appointment_time', 'barber_name']
            },
            {
                'template_id': 'sms_2h_reminder',
                'reminder_type': '2h',
                'channel': 'sms',
                'subject': None,
                'content': 'Hi {customer_name}! Your appointment with {barber_name} is in 2 hours at {appointment_time}. See you soon!',
                'variables': ['customer_name', 'appointment_time', 'barber_name']
            },
            {
                'template_id': 'sms_confirmation',
                'reminder_type': 'confirmation',
                'channel': 'sms',
                'subject': None,
                'content': 'Booking confirmed! {customer_name}, your appointment with {barber_name} is scheduled for {appointment_date} at {appointment_time}. Save this message for reference.',
                'variables': ['customer_name', 'barber_name', 'appointment_date', 'appointment_time']
            },
            {
                'template_id': 'email_24h_reminder',
                'reminder_type': '24h',
                'channel': 'email',
                'subject': 'Appointment Reminder - Tomorrow at {appointment_time}',
                'content': '''
                <h2>Appointment Reminder</h2>
                <p>Hi {customer_name},</p>
                <p>This is a friendly reminder that you have an appointment scheduled:</p>
                <ul>
                    <li><strong>Date:</strong> {appointment_date}</li>
                    <li><strong>Time:</strong> {appointment_time}</li>
                    <li><strong>Service:</strong> {service_name}</li>
                    <li><strong>Barber:</strong> {barber_name}</li>
                    <li><strong>Location:</strong> {location}</li>
                </ul>
                <p>If you need to cancel or reschedule, please call us at {shop_phone} or <a href="{reschedule_link}">click here</a>.</p>
                <p>See you tomorrow!</p>
                ''',
                'variables': ['customer_name', 'appointment_date', 'appointment_time', 'service_name', 'barber_name', 'location', 'shop_phone', 'reschedule_link']
            },
            {
                'template_id': 'sms_no_show_followup',
                'reminder_type': 'no_show_followup',
                'channel': 'sms',
                'subject': None,
                'content': 'Hi {customer_name}, we missed you today! Would you like to reschedule your appointment? Reply YES to book a new time.',
                'variables': ['customer_name']
            }
        ]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for template in default_templates:
            cursor.execute('''
                INSERT OR IGNORE INTO message_templates 
                (template_id, reminder_type, channel, subject, content, variables)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                template['template_id'],
                template['reminder_type'],
                template['channel'],
                template['subject'],
                template['content'],
                json.dumps(template['variables'])
            ))
        
        conn.commit()
        conn.close()
    
    def schedule_reminder(
        self,
        booking_data: Dict[str, Any],
        reminder_type: str = '24h'
    ) -> str:
        """Schedule a reminder for an appointment"""
        reminder_id = f"rem_{booking_data['booking_id']}_{reminder_type}"
        
        # Calculate when to send the reminder
        appointment_time = datetime.fromisoformat(booking_data['start_time'])
        
        if reminder_type == '24h':
            scheduled_for = appointment_time - timedelta(hours=24)
        elif reminder_type == '2h':
            scheduled_for = appointment_time - timedelta(hours=2)
        elif reminder_type == 'confirmation':
            scheduled_for = datetime.now()
        else:
            scheduled_for = datetime.now()
        
        # Check customer preferences
        preferences = self._get_customer_preferences(booking_data.get('customer_id'))
        
        # Prepare reminder data
        reminder_data = {
            'reminder_id': reminder_id,
            'booking_id': booking_data['booking_id'],
            'customer_id': booking_data.get('customer_id'),
            'customer_name': booking_data['customer_name'],
            'customer_phone': booking_data.get('customer_phone'),
            'customer_email': booking_data.get('customer_email'),
            'appointment_time': appointment_time,
            'reminder_type': reminder_type,
            'scheduled_for': scheduled_for
        }
        
        # Add to queue
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Schedule SMS if enabled
        if preferences['sms_enabled'] and reminder_data['customer_phone']:
            message_content = self._generate_message(reminder_type, 'sms', booking_data)
            
            cursor.execute('''
                INSERT OR REPLACE INTO reminder_queue
                (reminder_id, booking_id, customer_id, customer_name, customer_phone,
                customer_email, appointment_time, reminder_type, channel, message_content,
                scheduled_for)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f"{reminder_id}_sms",
                reminder_data['booking_id'],
                reminder_data['customer_id'],
                reminder_data['customer_name'],
                reminder_data['customer_phone'],
                reminder_data['customer_email'],
                reminder_data['appointment_time'],
                reminder_type,
                'sms',
                message_content,
                scheduled_for
            ))
        
        # Schedule Email if enabled
        if preferences['email_enabled'] and reminder_data['customer_email']:
            message_content = self._generate_message(reminder_type, 'email', booking_data)
            
            cursor.execute('''
                INSERT OR REPLACE INTO reminder_queue
                (reminder_id, booking_id, customer_id, customer_name, customer_phone,
                customer_email, appointment_time, reminder_type, channel, message_content,
                scheduled_for)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                f"{reminder_id}_email",
                reminder_data['booking_id'],
                reminder_data['customer_id'],
                reminder_data['customer_name'],
                reminder_data['customer_phone'],
                reminder_data['customer_email'],
                reminder_data['appointment_time'],
                reminder_type,
                'email',
                message_content,
                scheduled_for
            ))
        
        conn.commit()
        conn.close()
        
        return reminder_id
    
    def send_immediate_confirmation(self, booking_data: Dict[str, Any]) -> Dict[str, bool]:
        """Send immediate booking confirmation"""
        results = {'sms': False, 'email': False}
        
        # Send SMS confirmation
        if booking_data.get('customer_phone'):
            message = self._generate_message('confirmation', 'sms', booking_data)
            results['sms'] = self._send_sms(booking_data['customer_phone'], message)
        
        # Send Email confirmation
        if booking_data.get('customer_email'):
            subject = "Appointment Confirmation"
            message = self._generate_message('confirmation', 'email', booking_data)
            results['email'] = self._send_email(
                booking_data['customer_email'],
                subject,
                message
            )
        
        return results
    
    def _send_sms(self, phone_number: str, message: str) -> bool:
        """Send SMS message via Twilio"""
        if not self.twilio_client:
            print(f"SMS to {phone_number}: {message}")
            return True  # Simulate success in development
        
        try:
            message = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone_number,
                to=phone_number
            )
            
            # Update analytics
            self._update_analytics('sms', 'sent')
            
            return message.sid is not None
        except Exception as e:
            print(f"Error sending SMS: {e}")
            self._update_analytics('sms', 'failed')
            return False
    
    def _send_email(self, email: str, subject: str, html_content: str) -> bool:
        """Send email via SendGrid"""
        if not self.sendgrid_client:
            print(f"Email to {email}: {subject}")
            return True  # Simulate success in development
        
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=email,
                subject=subject,
                html_content=html_content
            )
            
            response = self.sendgrid_client.send(message)
            
            # Update analytics
            self._update_analytics('email', 'sent')
            
            return response.status_code in [200, 201, 202]
        except Exception as e:
            print(f"Error sending email: {e}")
            self._update_analytics('email', 'failed')
            return False
    
    def _generate_message(
        self, 
        reminder_type: str, 
        channel: str, 
        booking_data: Dict[str, Any]
    ) -> str:
        """Generate message from template"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT content, variables FROM message_templates
            WHERE reminder_type = ? AND channel = ? AND is_active = 1
        ''', (reminder_type, channel))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            return "Appointment reminder"
        
        template_content, variables_json = result
        variables = json.loads(variables_json)
        
        # Prepare variable values
        appointment_time = datetime.fromisoformat(booking_data['start_time'])
        
        replacements = {
            'customer_name': booking_data.get('customer_name', 'Valued Customer'),
            'appointment_time': appointment_time.strftime('%I:%M %p'),
            'appointment_date': appointment_time.strftime('%B %d, %Y'),
            'barber_name': booking_data.get('barber_name', 'Your barber'),
            'service_name': booking_data.get('service_name', 'Service'),
            'location': booking_data.get('location', 'Our shop'),
            'shop_phone': booking_data.get('shop_phone', '555-0123'),
            'reschedule_link': f"https://barbershop.com/reschedule/{booking_data.get('booking_id', '')}"
        }
        
        # Replace variables in template
        message = template_content
        for var, value in replacements.items():
            message = message.replace(f"{{{var}}}", str(value))
        
        return message
    
    def _get_customer_preferences(self, customer_id: Optional[str]) -> Dict[str, Any]:
        """Get customer communication preferences"""
        if not customer_id:
            return {
                'sms_enabled': True,
                'email_enabled': True,
                'reminder_24h': True,
                'reminder_2h': True
            }
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM communication_preferences WHERE customer_id = ?
        ''', (customer_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = ['customer_id', 'sms_enabled', 'email_enabled', 'whatsapp_enabled',
                      'reminder_24h', 'reminder_2h', 'marketing_enabled',
                      'quiet_hours_start', 'quiet_hours_end', 'timezone']
            return dict(zip(columns, result))
        else:
            return {
                'sms_enabled': True,
                'email_enabled': True,
                'reminder_24h': True,
                'reminder_2h': True
            }
    
    def _update_analytics(self, channel: str, status: str):
        """Update message analytics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        today = datetime.now().date()
        
        if status == 'sent':
            cursor.execute('''
                INSERT INTO message_analytics (channel, sent_count, date)
                VALUES (?, 1, ?)
                ON CONFLICT(reminder_type, channel, date)
                DO UPDATE SET sent_count = sent_count + 1
            ''', (channel, today))
        elif status == 'failed':
            cursor.execute('''
                INSERT INTO message_analytics (channel, failed_count, date)
                VALUES (?, 1, ?)
                ON CONFLICT(reminder_type, channel, date)
                DO UPDATE SET failed_count = failed_count + 1
            ''', (channel, today))
        
        conn.commit()
        conn.close()
    
    def _process_reminder_queue(self):
        """Process pending reminders"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get reminders that are due
        cursor.execute('''
            SELECT * FROM reminder_queue
            WHERE status = 'pending' 
            AND scheduled_for <= ?
            ORDER BY scheduled_for
            LIMIT 10
        ''', (datetime.now(),))
        
        reminders = cursor.fetchall()
        
        for reminder in reminders:
            reminder_id = reminder[0]
            channel = reminder[8]
            
            # Check quiet hours
            if self._is_quiet_hours(reminder[2]):  # customer_id
                # Reschedule for after quiet hours
                cursor.execute('''
                    UPDATE reminder_queue
                    SET scheduled_for = ?
                    WHERE reminder_id = ?
                ''', (
                    datetime.now().replace(hour=9, minute=0),
                    reminder_id
                ))
                continue
            
            # Send the reminder
            success = False
            if channel == 'sms':
                success = self._send_sms(reminder[4], reminder[9])  # phone, message
            elif channel == 'email':
                success = self._send_email(
                    reminder[5],  # email
                    "Appointment Reminder",
                    reminder[9]   # message
                )
            
            # Update status
            cursor.execute('''
                UPDATE reminder_queue
                SET status = ?, sent_at = ?
                WHERE reminder_id = ?
            ''', (
                'sent' if success else 'failed',
                datetime.now() if success else None,
                reminder_id
            ))
        
        conn.commit()
        conn.close()
    
    def _is_quiet_hours(self, customer_id: Optional[str]) -> bool:
        """Check if current time is within customer's quiet hours"""
        if not customer_id:
            return False
        
        preferences = self._get_customer_preferences(customer_id)
        current_time = datetime.now().time()
        
        quiet_start = datetime.strptime(preferences['quiet_hours_start'], '%H:%M').time()
        quiet_end = datetime.strptime(preferences['quiet_hours_end'], '%H:%M').time()
        
        # Handle overnight quiet hours
        if quiet_start > quiet_end:
            return current_time >= quiet_start or current_time <= quiet_end
        else:
            return quiet_start <= current_time <= quiet_end
    
    def _run_scheduler(self):
        """Run the reminder scheduler"""
        # Schedule reminder processing every minute
        schedule.every(1).minutes.do(self._process_reminder_queue)
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    
    def get_reminder_stats(self, days: int = 7) -> Dict[str, Any]:
        """Get reminder statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        start_date = datetime.now().date() - timedelta(days=days)
        
        # Get overall stats
        cursor.execute('''
            SELECT 
                channel,
                SUM(sent_count) as total_sent,
                SUM(failed_count) as total_failed
            FROM message_analytics
            WHERE date >= ?
            GROUP BY channel
        ''', (start_date,))
        
        stats = {}
        for row in cursor.fetchall():
            channel = row[0]
            stats[channel] = {
                'sent': row[1] or 0,
                'failed': row[2] or 0,
                'success_rate': (row[1] / (row[1] + row[2]) * 100) if (row[1] + row[2]) > 0 else 0
            }
        
        # Get pending reminders
        cursor.execute('''
            SELECT COUNT(*) FROM reminder_queue
            WHERE status = 'pending'
        ''')
        pending_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            'period_days': days,
            'channels': stats,
            'pending_reminders': pending_count,
            'total_sent': sum(s['sent'] for s in stats.values()),
            'total_failed': sum(s['failed'] for s in stats.values())
        }

# Example usage
if __name__ == "__main__":
    service = SMSReminderService()
    
    # Example booking data
    booking = {
        'booking_id': 'book_123',
        'customer_id': 'cust_456',
        'customer_name': 'John Smith',
        'customer_phone': '+1234567890',
        'customer_email': 'john@example.com',
        'start_time': (datetime.now() + timedelta(days=1)).isoformat(),
        'barber_name': 'Marcus',
        'service_name': 'Haircut'
    }
    
    # Send immediate confirmation
    results = service.send_immediate_confirmation(booking)
    print(f"Confirmation sent - SMS: {results['sms']}, Email: {results['email']}")
    
    # Schedule reminders
    reminder_id = service.schedule_reminder(booking, '24h')
    print(f"24h reminder scheduled: {reminder_id}")
    
    # Get stats
    stats = service.get_reminder_stats()
    print(f"Reminder stats: {json.dumps(stats, indent=2)}")