#!/usr/bin/env python3
"""
Booking Notification Service for 6FB AI Agent System
Handles all booking-related notifications: confirmations, reminders, cancellations, payments
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum
import os
from dataclasses import dataclass
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from twilio.rest import Client as TwilioClient
import aiohttp
import uuid

# Import Supabase client
try:
    from supabase import create_client, Client
    SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if SUPABASE_URL and SUPABASE_SERVICE_KEY:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    else:
        supabase = None
except ImportError:
    supabase = None

logger = logging.getLogger(__name__)

class BookingNotificationType(Enum):
    BOOKING_CONFIRMATION = "booking_confirmation"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    APPOINTMENT_REMINDER_24H = "appointment_reminder_24h"
    APPOINTMENT_REMINDER_2H = "appointment_reminder_2h"
    CANCELLATION_NOTICE = "cancellation_notice"
    BOOKING_MODIFIED = "booking_modified"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUNDED = "payment_refunded"
    BARBER_ASSIGNED = "barber_assigned"
    BARBER_CHANGED = "barber_changed"

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    IN_APP = "in_app"
    PUSH = "push"

class NotificationPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4

@dataclass
class BookingNotificationData:
    booking_id: str
    user_id: str
    customer_name: str
    customer_email: str
    customer_phone: Optional[str]
    barbershop_name: str
    barber_name: str
    service_name: str
    appointment_date: datetime
    appointment_duration: int  # minutes
    total_price: float
    booking_status: str
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    cancellation_reason: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class BookingNotificationService:
    """Service for handling all booking-related notifications"""
    
    def __init__(self):
        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.from_email = os.getenv('FROM_EMAIL', 'noreply@bookedbarber.com')
        
        # Twilio configuration
        self.twilio_account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_phone_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        # Initialize Twilio client
        if self.twilio_account_sid and self.twilio_auth_token:
            self.twilio_client = TwilioClient(self.twilio_account_sid, self.twilio_auth_token)
        else:
            self.twilio_client = None
            logger.warning("Twilio credentials not configured - SMS notifications disabled")
        
        # Email configuration check
        if not self.smtp_username or not self.smtp_password:
            logger.warning("SMTP credentials not configured - email notifications may fail")
        
        # Templates cache
        self._email_templates = {}
        self._sms_templates = {}
        
        # Load templates
        self._load_templates()
    
    def _load_templates(self):
        """Load notification templates"""
        # Email templates
        self._email_templates = {
            BookingNotificationType.BOOKING_CONFIRMATION: {
                'subject': 'Booking Confirmed - {barbershop_name}',
                'template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d5016;">Booking Confirmed!</h2>
                    
                    <p>Hi {customer_name},</p>
                    
                    <p>Your appointment has been confirmed. Here are the details:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d5016;">Appointment Details</h3>
                        <p><strong>Barbershop:</strong> {barbershop_name}</p>
                        <p><strong>Barber:</strong> {barber_name}</p>
                        <p><strong>Service:</strong> {service_name}</p>
                        <p><strong>Date & Time:</strong> {appointment_date}</p>
                        <p><strong>Duration:</strong> {appointment_duration} minutes</p>
                        <p><strong>Total Price:</strong> ${total_price:.2f}</p>
                        <p><strong>Booking ID:</strong> {booking_id}</p>
                    </div>
                    
                    <p>We look forward to seeing you!</p>
                    
                    <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
                    
                    <p>Best regards,<br>The {barbershop_name} Team</p>
                </div>
                '''
            },
            
            BookingNotificationType.PAYMENT_CONFIRMATION: {
                'subject': 'Payment Received - {barbershop_name}',
                'template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d5016;">Payment Confirmed</h2>
                    
                    <p>Hi {customer_name},</p>
                    
                    <p>We have successfully received your payment for the upcoming appointment.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d5016;">Payment Details</h3>
                        <p><strong>Amount:</strong> ${total_price:.2f}</p>
                        <p><strong>Payment Method:</strong> {payment_method}</p>
                        <p><strong>Service:</strong> {service_name}</p>
                        <p><strong>Date & Time:</strong> {appointment_date}</p>
                        <p><strong>Booking ID:</strong> {booking_id}</p>
                    </div>
                    
                    <p>Your appointment is confirmed and we look forward to seeing you!</p>
                    
                    <p>Best regards,<br>The {barbershop_name} Team</p>
                </div>
                '''
            },
            
            BookingNotificationType.APPOINTMENT_REMINDER_24H: {
                'subject': 'Appointment Reminder - Tomorrow at {barbershop_name}',
                'template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d5016;">Appointment Reminder</h2>
                    
                    <p>Hi {customer_name},</p>
                    
                    <p>This is a reminder about your appointment tomorrow:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d5016;">Appointment Details</h3>
                        <p><strong>Barbershop:</strong> {barbershop_name}</p>
                        <p><strong>Barber:</strong> {barber_name}</p>
                        <p><strong>Service:</strong> {service_name}</p>
                        <p><strong>Date & Time:</strong> {appointment_date}</p>
                        <p><strong>Duration:</strong> {appointment_duration} minutes</p>
                    </div>
                    
                    <p>Please arrive 5-10 minutes early. If you need to cancel or reschedule, please contact us as soon as possible.</p>
                    
                    <p>We look forward to seeing you!</p>
                    
                    <p>Best regards,<br>The {barbershop_name} Team</p>
                </div>
                '''
            },
            
            BookingNotificationType.APPOINTMENT_REMINDER_2H: {
                'subject': 'Appointment Today - {barbershop_name}',
                'template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2d5016;">Appointment Today!</h2>
                    
                    <p>Hi {customer_name},</p>
                    
                    <p>Your appointment is in 2 hours:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #2d5016;">Appointment Details</h3>
                        <p><strong>Barbershop:</strong> {barbershop_name}</p>
                        <p><strong>Barber:</strong> {barber_name}</p>
                        <p><strong>Service:</strong> {service_name}</p>
                        <p><strong>Time:</strong> {appointment_date}</p>
                    </div>
                    
                    <p>Please arrive 5-10 minutes early. See you soon!</p>
                    
                    <p>Best regards,<br>The {barbershop_name} Team</p>
                </div>
                '''
            },
            
            BookingNotificationType.CANCELLATION_NOTICE: {
                'subject': 'Appointment Cancelled - {barbershop_name}',
                'template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc3545;">Appointment Cancelled</h2>
                    
                    <p>Hi {customer_name},</p>
                    
                    <p>Your appointment has been cancelled:</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #dc3545;">Cancelled Appointment</h3>
                        <p><strong>Barbershop:</strong> {barbershop_name}</p>
                        <p><strong>Barber:</strong> {barber_name}</p>
                        <p><strong>Service:</strong> {service_name}</p>
                        <p><strong>Original Date & Time:</strong> {appointment_date}</p>
                        <p><strong>Booking ID:</strong> {booking_id}</p>
                        {cancellation_reason_section}
                    </div>
                    
                    <p>If you paid online, any applicable refund will be processed within 3-5 business days.</p>
                    
                    <p>We're sorry for any inconvenience. Feel free to book another appointment anytime!</p>
                    
                    <p>Best regards,<br>The {barbershop_name} Team</p>
                </div>
                '''
            }
        }
        
        # SMS templates
        self._sms_templates = {
            BookingNotificationType.BOOKING_CONFIRMATION: 
                "Booking confirmed at {barbershop_name}! {service_name} with {barber_name} on {appointment_date}. Booking ID: {booking_id}",
            
            BookingNotificationType.PAYMENT_CONFIRMATION: 
                "Payment received (${total_price:.2f}) for your appointment at {barbershop_name} on {appointment_date}. See you soon!",
            
            BookingNotificationType.APPOINTMENT_REMINDER_24H: 
                "Reminder: You have an appointment tomorrow at {barbershop_name} with {barber_name} at {appointment_time}. Please arrive 5-10 min early.",
            
            BookingNotificationType.APPOINTMENT_REMINDER_2H: 
                "Your appointment at {barbershop_name} is in 2 hours! {barber_name} will see you at {appointment_time}.",
            
            BookingNotificationType.CANCELLATION_NOTICE: 
                "Your appointment at {barbershop_name} on {appointment_date} has been cancelled. Refund will be processed if applicable."
        }
    
    async def send_booking_notification(
        self,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData,
        channels: List[NotificationChannel] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        schedule_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Send a booking notification through specified channels"""
        
        if channels is None:
            channels = [NotificationChannel.EMAIL, NotificationChannel.IN_APP]
        
        notification_id = str(uuid.uuid4())
        
        try:
            # Queue notification in database
            await self._queue_notification(
                notification_id=notification_id,
                notification_type=notification_type,
                booking_data=booking_data,
                channels=channels,
                priority=priority,
                schedule_at=schedule_at
            )
            
            # If immediate send (not scheduled), process now
            if schedule_at is None or schedule_at <= datetime.utcnow():
                results = await self._process_notification(
                    notification_id=notification_id,
                    notification_type=notification_type,
                    booking_data=booking_data,
                    channels=channels
                )
                
                return {
                    'notification_id': notification_id,
                    'status': 'sent',
                    'results': results
                }
            else:
                return {
                    'notification_id': notification_id,
                    'status': 'scheduled',
                    'schedule_at': schedule_at.isoformat()
                }
                
        except Exception as e:
            logger.error(f"Failed to send booking notification: {e}")
            return {
                'notification_id': notification_id,
                'status': 'failed',
                'error': str(e)
            }
    
    async def _queue_notification(
        self,
        notification_id: str,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData,
        channels: List[NotificationChannel],
        priority: NotificationPriority,
        schedule_at: Optional[datetime]
    ):
        """Queue notification in database"""
        
        if not supabase:
            logger.warning("Supabase not configured - notification not queued in database")
            return
        
        try:
            # Prepare notification data
            notification_record = {
                'id': notification_id,
                'user_id': booking_data.user_id,
                'type': notification_type.value,
                'channel': ','.join([c.value for c in channels]),
                'template_id': notification_type.value,
                'subject': self._get_notification_subject(notification_type, booking_data),
                'content': self._get_notification_content(notification_type, booking_data, NotificationChannel.EMAIL),
                'metadata': {
                    'booking_id': booking_data.booking_id,
                    'notification_type': notification_type.value,
                    'channels': [c.value for c in channels],
                    'priority': priority.value,
                    'booking_data': booking_data.__dict__,
                    'schedule_at': schedule_at.isoformat() if schedule_at else None
                },
                'status': 'scheduled' if schedule_at and schedule_at > datetime.utcnow() else 'pending'
            }
            
            # Insert into notifications table
            result = supabase.table('notifications').insert(notification_record).execute()
            
            logger.info(f"Queued notification {notification_id} for booking {booking_data.booking_id}")
            
        except Exception as e:
            logger.error(f"Failed to queue notification in database: {e}")
            raise
    
    async def _process_notification(
        self,
        notification_id: str,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData,
        channels: List[NotificationChannel]
    ) -> Dict[str, Any]:
        """Process notification through all specified channels"""
        
        results = {}
        
        for channel in channels:
            try:
                if channel == NotificationChannel.EMAIL:
                    result = await self._send_email_notification(notification_type, booking_data)
                elif channel == NotificationChannel.SMS:
                    result = await self._send_sms_notification(notification_type, booking_data)
                elif channel == NotificationChannel.IN_APP:
                    result = await self._send_in_app_notification(notification_type, booking_data)
                elif channel == NotificationChannel.PUSH:
                    result = await self._send_push_notification(notification_type, booking_data)
                else:
                    result = {'success': False, 'error': f'Unsupported channel: {channel.value}'}
                
                results[channel.value] = result
                
            except Exception as e:
                logger.error(f"Failed to send {channel.value} notification: {e}")
                results[channel.value] = {'success': False, 'error': str(e)}
        
        # Update notification status in database
        await self._update_notification_status(notification_id, results)
        
        return results
    
    async def _send_email_notification(
        self,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData
    ) -> Dict[str, Any]:
        """Send email notification"""
        
        if not self.smtp_username or not self.smtp_password:
            return {'success': False, 'error': 'SMTP credentials not configured'}
        
        try:
            # Get email template
            template_data = self._email_templates.get(notification_type)
            if not template_data:
                return {'success': False, 'error': f'No email template for {notification_type.value}'}
            
            # Format template
            subject = self._format_template(template_data['subject'], booking_data)
            html_content = self._format_template(template_data['template'], booking_data)
            
            # Create message
            msg = MimeMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.from_email
            msg['To'] = booking_data.customer_email
            
            # Add HTML content
            html_part = MimeText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email notification sent to {booking_data.customer_email} for booking {booking_data.booking_id}")
            
            return {
                'success': True,
                'channel': 'email',
                'recipient': booking_data.customer_email,
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _send_sms_notification(
        self,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData
    ) -> Dict[str, Any]:
        """Send SMS notification"""
        
        if not self.twilio_client:
            return {'success': False, 'error': 'Twilio not configured'}
        
        if not booking_data.customer_phone:
            return {'success': False, 'error': 'Customer phone number not provided'}
        
        try:
            # Get SMS template
            template = self._sms_templates.get(notification_type)
            if not template:
                return {'success': False, 'error': f'No SMS template for {notification_type.value}'}
            
            # Format template
            message = self._format_template(template, booking_data)
            
            # Send SMS
            sms = self.twilio_client.messages.create(
                body=message,
                from_=self.twilio_phone_number,
                to=booking_data.customer_phone
            )
            
            logger.info(f"SMS notification sent to {booking_data.customer_phone} for booking {booking_data.booking_id}")
            
            return {
                'success': True,
                'channel': 'sms',
                'recipient': booking_data.customer_phone,
                'message_sid': sms.sid,
                'sent_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to send SMS notification: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _send_in_app_notification(
        self,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData
    ) -> Dict[str, Any]:
        """Send in-app notification"""
        
        try:
            # Store in-app notification in database
            if supabase:
                notification_data = {
                    'user_id': booking_data.user_id,
                    'type': notification_type.value,
                    'title': self._get_notification_subject(notification_type, booking_data),
                    'message': self._get_notification_content(notification_type, booking_data, NotificationChannel.IN_APP),
                    'metadata': {
                        'booking_id': booking_data.booking_id,
                        'notification_type': notification_type.value
                    },
                    'read': False
                }
                
                result = supabase.table('notification_logs').insert(notification_data).execute()
                
                logger.info(f"In-app notification stored for user {booking_data.user_id}")
                
                return {
                    'success': True,
                    'channel': 'in_app',
                    'user_id': booking_data.user_id,
                    'stored_at': datetime.utcnow().isoformat()
                }
            else:
                return {'success': False, 'error': 'Supabase not configured'}
                
        except Exception as e:
            logger.error(f"Failed to send in-app notification: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _send_push_notification(
        self,
        notification_type: BookingNotificationType,
        booking_data: BookingNotificationData
    ) -> Dict[str, Any]:
        """Send push notification (placeholder for future implementation)"""
        
        # TODO: Implement push notifications with Firebase or similar service
        logger.info(f"Push notification would be sent for booking {booking_data.booking_id}")
        
        return {
            'success': True,
            'channel': 'push',
            'user_id': booking_data.user_id,
            'note': 'Push notifications not yet implemented'
        }
    
    def _format_template(self, template: str, booking_data: BookingNotificationData) -> str:
        """Format template with booking data"""
        
        # Prepare template variables
        template_vars = {
            'customer_name': booking_data.customer_name,
            'customer_email': booking_data.customer_email,
            'barbershop_name': booking_data.barbershop_name,
            'barber_name': booking_data.barber_name,
            'service_name': booking_data.service_name,
            'appointment_date': booking_data.appointment_date.strftime('%A, %B %d, %Y at %I:%M %p'),
            'appointment_time': booking_data.appointment_date.strftime('%I:%M %p'),
            'appointment_duration': str(booking_data.appointment_duration),
            'total_price': booking_data.total_price,
            'booking_id': booking_data.booking_id,
            'payment_method': booking_data.payment_method or 'N/A',
            'cancellation_reason_section': f'<p><strong>Reason:</strong> {booking_data.cancellation_reason}</p>' if booking_data.cancellation_reason else ''
        }
        
        # Format template
        try:
            return template.format(**template_vars)
        except KeyError as e:
            logger.error(f"Template formatting error - missing variable: {e}")
            return template
    
    def _get_notification_subject(self, notification_type: BookingNotificationType, booking_data: BookingNotificationData) -> str:
        """Get notification subject for the given type"""
        template_data = self._email_templates.get(notification_type)
        if template_data:
            return self._format_template(template_data['subject'], booking_data)
        return f'Booking Notification - {booking_data.barbershop_name}'
    
    def _get_notification_content(self, notification_type: BookingNotificationType, booking_data: BookingNotificationData, channel: NotificationChannel) -> str:
        """Get notification content for the given type and channel"""
        if channel == NotificationChannel.SMS:
            template = self._sms_templates.get(notification_type)
            if template:
                return self._format_template(template, booking_data)
        elif channel in [NotificationChannel.EMAIL, NotificationChannel.IN_APP]:
            template_data = self._email_templates.get(notification_type)
            if template_data:
                return self._format_template(template_data['template'], booking_data)
        
        return f'Booking notification for {booking_data.booking_id}'
    
    async def _update_notification_status(self, notification_id: str, results: Dict[str, Any]):
        """Update notification status in database"""
        
        if not supabase:
            return
        
        try:
            # Determine overall status
            success_count = sum(1 for result in results.values() if result.get('success', False))
            total_count = len(results)
            
            if success_count == total_count:
                status = 'sent'
            elif success_count > 0:
                status = 'partial'
            else:
                status = 'failed'
            
            # Update notification record
            update_data = {
                'status': status,
                'sent_at': datetime.utcnow().isoformat(),
                'metadata': {
                    'results': results,
                    'success_count': success_count,
                    'total_count': total_count
                }
            }
            
            if status == 'failed':
                error_messages = [result.get('error', 'Unknown error') for result in results.values() if not result.get('success', False)]
                update_data['error_message'] = '; '.join(error_messages)
            
            result = supabase.table('notifications').update(update_data).eq('id', notification_id).execute()
            
            logger.info(f"Updated notification {notification_id} status to {status}")
            
        except Exception as e:
            logger.error(f"Failed to update notification status: {e}")
    
    # Convenience methods for common booking notifications
    
    async def send_booking_confirmation(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Send booking confirmation notification"""
        return await self.send_booking_notification(
            notification_type=BookingNotificationType.BOOKING_CONFIRMATION,
            booking_data=booking_data,
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            priority=NotificationPriority.HIGH
        )
    
    async def send_payment_confirmation(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Send payment confirmation notification"""
        return await self.send_booking_notification(
            notification_type=BookingNotificationType.PAYMENT_CONFIRMATION,
            booking_data=booking_data,
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            priority=NotificationPriority.HIGH
        )
    
    async def send_appointment_reminder_24h(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Send 24-hour appointment reminder"""
        return await self.send_booking_notification(
            notification_type=BookingNotificationType.APPOINTMENT_REMINDER_24H,
            booking_data=booking_data,
            channels=[NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
            priority=NotificationPriority.NORMAL
        )
    
    async def send_appointment_reminder_2h(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Send 2-hour appointment reminder"""
        return await self.send_booking_notification(
            notification_type=BookingNotificationType.APPOINTMENT_REMINDER_2H,
            booking_data=booking_data,
            channels=[NotificationChannel.SMS, NotificationChannel.IN_APP],
            priority=NotificationPriority.HIGH
        )
    
    async def send_cancellation_notice(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Send cancellation notice"""
        return await self.send_booking_notification(
            notification_type=BookingNotificationType.CANCELLATION_NOTICE,
            booking_data=booking_data,
            channels=[NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.IN_APP],
            priority=NotificationPriority.HIGH
        )
    
    async def schedule_appointment_reminders(self, booking_data: BookingNotificationData) -> Dict[str, Any]:
        """Schedule both 24h and 2h appointment reminders"""
        
        appointment_time = booking_data.appointment_date
        reminder_24h_time = appointment_time - timedelta(hours=24)
        reminder_2h_time = appointment_time - timedelta(hours=2)
        
        results = {}
        
        # Schedule 24-hour reminder
        if reminder_24h_time > datetime.utcnow():
            result_24h = await self.send_booking_notification(
                notification_type=BookingNotificationType.APPOINTMENT_REMINDER_24H,
                booking_data=booking_data,
                channels=[NotificationChannel.EMAIL, NotificationChannel.SMS],
                priority=NotificationPriority.NORMAL,
                schedule_at=reminder_24h_time
            )
            results['reminder_24h'] = result_24h
        
        # Schedule 2-hour reminder
        if reminder_2h_time > datetime.utcnow():
            result_2h = await self.send_booking_notification(
                notification_type=BookingNotificationType.APPOINTMENT_REMINDER_2H,
                booking_data=booking_data,
                channels=[NotificationChannel.SMS],
                priority=NotificationPriority.HIGH,
                schedule_at=reminder_2h_time
            )
            results['reminder_2h'] = result_2h
        
        return results

# Global booking notification service instance
booking_notification_service = BookingNotificationService()

# Helper functions for easy integration
async def notify_booking_confirmed(booking_data: BookingNotificationData):
    """Helper to send booking confirmation"""
    return await booking_notification_service.send_booking_confirmation(booking_data)

async def notify_payment_confirmed(booking_data: BookingNotificationData):
    """Helper to send payment confirmation"""
    return await booking_notification_service.send_payment_confirmation(booking_data)

async def notify_booking_cancelled(booking_data: BookingNotificationData):
    """Helper to send cancellation notice"""
    return await booking_notification_service.send_cancellation_notice(booking_data)

async def schedule_booking_reminders(booking_data: BookingNotificationData):
    """Helper to schedule appointment reminders"""
    return await booking_notification_service.schedule_appointment_reminders(booking_data)
