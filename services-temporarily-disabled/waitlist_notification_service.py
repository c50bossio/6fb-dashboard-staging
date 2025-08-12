"""
Waitlist Notification Service
Handles real-time notifications for waitlist updates including email, SMS, and push notifications
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import uuid

# Email service
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False

# SMS service (Twilio)
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

# Push notifications (in production would use Firebase, APNs, etc.)
try:
    import requests
    PUSH_AVAILABLE = True
except ImportError:
    PUSH_AVAILABLE = False

logger = logging.getLogger(__name__)

class NotificationChannel(Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    WEBHOOK = "webhook"

class NotificationPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

@dataclass
class NotificationTemplate:
    """Template for different notification types"""
    id: str
    channel: NotificationChannel
    subject: str
    template: str
    variables: List[str]
    priority: NotificationPriority

@dataclass
class NotificationResult:
    """Result of sending a notification"""
    success: bool
    channel: NotificationChannel
    message_id: Optional[str] = None
    error: Optional[str] = None
    delivery_time: Optional[datetime] = None

class WaitlistNotificationService:
    """Service for sending waitlist-related notifications across multiple channels"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_notification_services()
        self._init_templates()
        
        # Configuration
        self.max_retries = 3
        self.retry_delay = 5  # seconds
        self.batch_size = 50
        
    def _init_notification_services(self):
        """Initialize external notification services"""
        # SendGrid for email
        self.sendgrid_client = None
        if SENDGRID_AVAILABLE:
            api_key = os.getenv('SENDGRID_API_KEY')
            if api_key:
                self.sendgrid_client = SendGridAPIClient(api_key)
                logger.info("✅ SendGrid initialized for email notifications")
        
        # Twilio for SMS
        self.twilio_client = None
        if TWILIO_AVAILABLE:
            account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            if account_sid and auth_token:
                self.twilio_client = TwilioClient(account_sid, auth_token)
                logger.info("✅ Twilio initialized for SMS notifications")
        
        # Push notification service (placeholder for Firebase/APNs)
        self.push_service_url = os.getenv('PUSH_SERVICE_URL')
        self.push_service_key = os.getenv('PUSH_SERVICE_KEY')
    
    def _init_templates(self):
        """Initialize notification templates"""
        self.templates = {
            'waitlist_added': {
                NotificationChannel.EMAIL: NotificationTemplate(
                    id='waitlist_added_email',
                    channel=NotificationChannel.EMAIL,
                    subject='✅ Added to Waitlist - {service_name}',
                    template='''
                    <h2>You're on the waitlist! 🎉</h2>
                    <p>Hi {customer_name},</p>
                    <p>Great news! We've added you to the waitlist for <strong>{service_name}</strong> at {barbershop_name}.</p>
                    
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📋 Waitlist Details</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li>🏆 Position: <strong>#{position}</strong></li>
                            <li>⏱️ Estimated wait: <strong>{estimated_wait}</strong></li>
                            <li>📅 Expires: {expires_date}</li>
                        </ul>
                    </div>
                    
                    <p>💡 <strong>What happens next?</strong></p>
                    <ul>
                        <li>We'll notify you immediately when a slot becomes available</li>
                        <li>You'll have 2 hours to respond to slot offers</li>
                        <li>Your position may improve as others book or cancel</li>
                    </ul>
                    
                    <p>Questions? Reply to this email or call us at {phone}.</p>
                    <p>Thanks for choosing {barbershop_name}!</p>
                    ''',
                    variables=['customer_name', 'service_name', 'barbershop_name', 'position', 'estimated_wait', 'expires_date', 'phone'],
                    priority=NotificationPriority.MEDIUM
                ),
                NotificationChannel.SMS: NotificationTemplate(
                    id='waitlist_added_sms',
                    channel=NotificationChannel.SMS,
                    subject='',
                    template='✅ {barbershop_name}: You\'re #${position} on the waitlist for {service_name}. Est. wait: {estimated_wait}. We\'ll notify you when a slot opens!',
                    variables=['barbershop_name', 'position', 'service_name', 'estimated_wait'],
                    priority=NotificationPriority.MEDIUM
                )
            },
            'slot_available': {
                NotificationChannel.EMAIL: NotificationTemplate(
                    id='slot_available_email',
                    channel=NotificationChannel.EMAIL,
                    subject='🎯 Appointment Available - {service_name}',
                    template='''
                    <h2>Your slot is ready! ⚡</h2>
                    <p>Hi {customer_name},</p>
                    <p>Excellent news! A slot just opened up for your requested appointment.</p>
                    
                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
                        <h3>📅 Available Appointment</h3>
                        <ul style="list-style: none; padding: 0; font-size: 16px;">
                            <li>💄 Service: <strong>{service_name}</strong></li>
                            <li>📅 Date & Time: <strong>{slot_time}</strong></li>
                            <li>✂️ Barber: <strong>{barber_name}</strong></li>
                            <li>⏱️ Duration: <strong>{duration} minutes</strong></li>
                        </ul>
                    </div>
                    
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>⚠️ Act Fast!</strong></p>
                        <p>This slot is available until <strong>{response_deadline}</strong>. Click the button below to book it!</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{booking_link}" style="background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                            🔥 BOOK THIS SLOT
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #666;">
                        Can't make this time? No worries - you'll stay on the waitlist for future openings.
                    </p>
                    ''',
                    variables=['customer_name', 'service_name', 'slot_time', 'barber_name', 'duration', 'response_deadline', 'booking_link'],
                    priority=NotificationPriority.URGENT
                ),
                NotificationChannel.SMS: NotificationTemplate(
                    id='slot_available_sms',
                    channel=NotificationChannel.SMS,
                    subject='',
                    template='🎯 SLOT AVAILABLE! {service_name} on {slot_time} with {barber_name}. Book now: {booking_link} (expires {response_deadline})',
                    variables=['service_name', 'slot_time', 'barber_name', 'booking_link', 'response_deadline'],
                    priority=NotificationPriority.URGENT
                ),
                NotificationChannel.PUSH: NotificationTemplate(
                    id='slot_available_push',
                    channel=NotificationChannel.PUSH,
                    subject='Appointment Available!',
                    template='Your {service_name} slot is ready for {slot_time}. Tap to book!',
                    variables=['service_name', 'slot_time'],
                    priority=NotificationPriority.URGENT
                )
            },
            'position_updated': {
                NotificationChannel.EMAIL: NotificationTemplate(
                    id='position_updated_email',
                    channel=NotificationChannel.EMAIL,
                    subject='📈 Waitlist Update - You\'re Moving Up!',
                    template='''
                    <h2>Good news! You're moving up the waitlist 📈</h2>
                    <p>Hi {customer_name},</p>
                    <p>Your position on the waitlist for <strong>{service_name}</strong> has improved!</p>
                    
                    <div style="background: #f1f8e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📊 Updated Position</h3>
                        <p style="font-size: 18px;">You're now <strong>#{new_position}</strong> in line (was #{old_position})</p>
                        <p>Estimated wait time: <strong>{estimated_wait}</strong></p>
                    </div>
                    
                    <p>We're getting closer to finding you the perfect slot!</p>
                    ''',
                    variables=['customer_name', 'service_name', 'new_position', 'old_position', 'estimated_wait'],
                    priority=NotificationPriority.LOW
                ),
                NotificationChannel.SMS: NotificationTemplate(
                    id='position_updated_sms',
                    channel=NotificationChannel.SMS,
                    subject='',
                    template='📈 Great news! You moved up to position #{new_position} for {service_name}. Est. wait: {estimated_wait}',
                    variables=['new_position', 'service_name', 'estimated_wait'],
                    priority=NotificationPriority.LOW
                )
            },
            'booking_confirmed': {
                NotificationChannel.EMAIL: NotificationTemplate(
                    id='booking_confirmed_email',
                    channel=NotificationChannel.EMAIL,
                    subject='🎉 Booking Confirmed - {service_name}',
                    template='''
                    <h2>Your appointment is confirmed! 🎉</h2>
                    <p>Hi {customer_name},</p>
                    <p>Perfect! We've successfully booked your appointment from the waitlist.</p>
                    
                    <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4caf50;">
                        <h3>✅ Confirmed Appointment</h3>
                        <ul style="list-style: none; padding: 0; font-size: 16px;">
                            <li>💄 Service: <strong>{service_name}</strong></li>
                            <li>📅 Date & Time: <strong>{slot_time}</strong></li>
                            <li>✂️ Barber: <strong>{barber_name}</strong></li>
                            <li>💰 Price: <strong>${price}</strong></li>
                            <li>🆔 Booking ID: <strong>{booking_id}</strong></li>
                        </ul>
                    </div>
                    
                    <div style="background: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>📋 What to bring:</strong></p>
                        <ul>
                            <li>A form of ID</li>
                            <li>Payment method (if not already processed)</li>
                            <li>Inspiration photos (optional)</li>
                        </ul>
                    </div>
                    
                    <p>We can't wait to see you!</p>
                    ''',
                    variables=['customer_name', 'service_name', 'slot_time', 'barber_name', 'price', 'booking_id'],
                    priority=NotificationPriority.HIGH
                )
            },
            'cancellation_processed': {
                NotificationChannel.EMAIL: NotificationTemplate(
                    id='cancellation_processed_email',
                    channel=NotificationChannel.EMAIL,
                    subject='✅ Cancellation Confirmed',
                    template='''
                    <h2>Cancellation Confirmed</h2>
                    <p>Hi {customer_name},</p>
                    <p>We've successfully cancelled your appointment as requested.</p>
                    
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3>📋 Cancellation Details</h3>
                        <ul style="list-style: none; padding: 0;">
                            <li>🆔 Cancellation ID: <strong>{cancellation_id}</strong></li>
                            <li>💰 Refund Amount: <strong>${refund_amount}</strong></li>
                            <li>⏱️ Processing Time: <strong>3-5 business days</strong></li>
                        </ul>
                    </div>
                    
                    <p>Thanks for letting us know. We hope to see you again soon!</p>
                    ''',
                    variables=['customer_name', 'cancellation_id', 'refund_amount'],
                    priority=NotificationPriority.MEDIUM
                )
            }
        }
    
    async def send_notification(
        self,
        notification_type: str,
        channel: NotificationChannel,
        recipient: Dict[str, str],  # {email, phone, push_token}
        data: Dict[str, Any],
        priority: NotificationPriority = NotificationPriority.MEDIUM
    ) -> NotificationResult:
        """Send a single notification"""
        try:
            template = self.templates.get(notification_type, {}).get(channel)
            if not template:
                return NotificationResult(
                    success=False,
                    channel=channel,
                    error=f"Template not found for {notification_type}:{channel.value}"
                )
            
            # Render template with data
            rendered_content = await self._render_template(template, data)
            
            # Send via appropriate channel
            if channel == NotificationChannel.EMAIL:
                return await self._send_email(recipient.get('email'), template.subject, rendered_content, priority)
            elif channel == NotificationChannel.SMS:
                return await self._send_sms(recipient.get('phone'), rendered_content, priority)
            elif channel == NotificationChannel.PUSH:
                return await self._send_push(recipient.get('push_token'), template.subject, rendered_content, priority)
            else:
                return NotificationResult(
                    success=False,
                    channel=channel,
                    error=f"Unsupported channel: {channel.value}"
                )
                
        except Exception as e:
            logger.error(f"Error sending notification {notification_type}:{channel.value}: {e}")
            return NotificationResult(
                success=False,
                channel=channel,
                error=str(e)
            )
    
    async def send_multi_channel_notification(
        self,
        notification_type: str,
        recipient: Dict[str, str],
        data: Dict[str, Any],
        channels: List[NotificationChannel],
        priority: NotificationPriority = NotificationPriority.MEDIUM
    ) -> Dict[NotificationChannel, NotificationResult]:
        """Send notification across multiple channels"""
        results = {}
        
        # Send all notifications concurrently
        tasks = []
        for channel in channels:
            task = self.send_notification(notification_type, channel, recipient, data, priority)
            tasks.append((channel, task))
        
        # Wait for all to complete
        for channel, task in tasks:
            try:
                result = await task
                results[channel] = result
            except Exception as e:
                results[channel] = NotificationResult(
                    success=False,
                    channel=channel,
                    error=str(e)
                )
        
        return results
    
    async def send_waitlist_notification(
        self,
        waitlist_id: str,
        customer_id: str,
        notification_type: str,
        data: Dict[str, Any],
        preferences: Optional[Dict[str, bool]] = None
    ) -> Dict[str, Any]:
        """Send waitlist-specific notification with customer preferences"""
        try:
            # Get customer contact info and preferences
            customer_info = await self._get_customer_info(customer_id)
            if not customer_info:
                return {
                    'success': False,
                    'error': 'Customer information not found'
                }
            
            # Use provided preferences or customer's defaults
            notification_prefs = preferences or customer_info.get('notification_preferences', {})
            
            # Determine channels to use based on preferences
            channels = []
            if notification_prefs.get('email', True) and customer_info.get('email'):
                channels.append(NotificationChannel.EMAIL)
            if notification_prefs.get('sms', True) and customer_info.get('phone'):
                channels.append(NotificationChannel.SMS)
            if notification_prefs.get('push', True) and customer_info.get('push_token'):
                channels.append(NotificationChannel.PUSH)
            
            if not channels:
                return {
                    'success': False,
                    'error': 'No notification channels available'
                }
            
            # Determine priority based on notification type
            priority = NotificationPriority.MEDIUM
            if notification_type == 'slot_available':
                priority = NotificationPriority.URGENT
            elif notification_type in ['booking_confirmed', 'cancellation_processed']:
                priority = NotificationPriority.HIGH
            
            # Send notifications
            results = await self.send_multi_channel_notification(
                notification_type=notification_type,
                recipient=customer_info,
                data={**data, 'customer_name': customer_info.get('name', 'Customer')},
                channels=channels,
                priority=priority
            )
            
            # Log notification attempt
            await self._log_notification_attempt(
                waitlist_id, customer_id, notification_type, channels, results
            )
            
            # Return summary
            successful_channels = [ch.value for ch, result in results.items() if result.success]
            failed_channels = [ch.value for ch, result in results.items() if not result.success]
            
            return {
                'success': len(successful_channels) > 0,
                'channels_attempted': [ch.value for ch in channels],
                'channels_successful': successful_channels,
                'channels_failed': failed_channels,
                'results': {ch.value: result.__dict__ for ch, result in results.items()},
                'priority': priority.value
            }
            
        except Exception as e:
            logger.error(f"Error sending waitlist notification: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def send_batch_notifications(
        self,
        notifications: List[Dict[str, Any]],
        max_concurrent: int = 10
    ) -> Dict[str, Any]:
        """Send multiple notifications in batches"""
        try:
            results = {
                'total_notifications': len(notifications),
                'successful': 0,
                'failed': 0,
                'errors': [],
                'processing_time': None
            }
            
            start_time = datetime.now()
            
            # Process in batches to avoid overwhelming services
            for i in range(0, len(notifications), self.batch_size):
                batch = notifications[i:i + self.batch_size]
                
                # Create semaphore to limit concurrent requests
                semaphore = asyncio.Semaphore(max_concurrent)
                
                async def process_notification(notification):
                    async with semaphore:
                        try:
                            result = await self.send_waitlist_notification(**notification)
                            return result
                        except Exception as e:
                            return {'success': False, 'error': str(e)}
                
                # Process batch concurrently
                batch_tasks = [process_notification(notif) for notif in batch]
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process results
                for result in batch_results:
                    if isinstance(result, Exception):
                        results['failed'] += 1
                        results['errors'].append(str(result))
                    elif result.get('success'):
                        results['successful'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(result.get('error', 'Unknown error'))
            
            results['processing_time'] = (datetime.now() - start_time).total_seconds()
            results['success_rate'] = (results['successful'] / results['total_notifications']) * 100 if results['total_notifications'] > 0 else 0
            
            return results
            
        except Exception as e:
            logger.error(f"Error in batch notification processing: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _render_template(self, template: NotificationTemplate, data: Dict[str, Any]) -> str:
        """Render notification template with provided data"""
        try:
            content = template.template
            
            # Replace template variables
            for var in template.variables:
                value = data.get(var, f"[{var}]")  # Use placeholder if variable missing
                content = content.replace(f"{{{var}}}", str(value))
            
            # Format subject if applicable
            if template.subject:
                subject = template.subject
                for var in template.variables:
                    value = data.get(var, f"[{var}]")
                    subject = subject.replace(f"{{{var}}}", str(value))
                return subject, content
            
            return content
            
        except Exception as e:
            logger.error(f"Error rendering template: {e}")
            return template.template
    
    async def _send_email(
        self,
        email: str,
        subject: str,
        content: str,
        priority: NotificationPriority
    ) -> NotificationResult:
        """Send email notification"""
        if not self.sendgrid_client or not email:
            return NotificationResult(
                success=False,
                channel=NotificationChannel.EMAIL,
                error="SendGrid not configured or email not provided"
            )
        
        try:
            # Render template to get both subject and content
            if isinstance(content, tuple):
                subject, html_content = content
            else:
                html_content = content
            
            message = Mail(
                from_email=os.getenv('FROM_EMAIL', 'notifications@barbershop.com'),
                to_emails=email,
                subject=subject,
                html_content=html_content
            )
            
            # Set priority headers
            if priority == NotificationPriority.URGENT:
                message.add_header('X-Priority', '1')
                message.add_header('Importance', 'high')
            
            response = self.sendgrid_client.send(message)
            
            return NotificationResult(
                success=response.status_code < 400,
                channel=NotificationChannel.EMAIL,
                message_id=response.headers.get('X-Message-Id'),
                delivery_time=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return NotificationResult(
                success=False,
                channel=NotificationChannel.EMAIL,
                error=str(e)
            )
    
    async def _send_sms(
        self,
        phone: str,
        message: str,
        priority: NotificationPriority
    ) -> NotificationResult:
        """Send SMS notification"""
        if not self.twilio_client or not phone:
            return NotificationResult(
                success=False,
                channel=NotificationChannel.SMS,
                error="Twilio not configured or phone not provided"
            )
        
        try:
            message = self.twilio_client.messages.create(
                body=message,
                from_=os.getenv('TWILIO_PHONE_NUMBER', '+1234567890'),
                to=phone
            )
            
            return NotificationResult(
                success=True,
                channel=NotificationChannel.SMS,
                message_id=message.sid,
                delivery_time=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return NotificationResult(
                success=False,
                channel=NotificationChannel.SMS,
                error=str(e)
            )
    
    async def _send_push(
        self,
        push_token: str,
        title: str,
        body: str,
        priority: NotificationPriority
    ) -> NotificationResult:
        """Send push notification"""
        if not self.push_service_url or not push_token:
            return NotificationResult(
                success=False,
                channel=NotificationChannel.PUSH,
                error="Push service not configured or token not provided"
            )
        
        try:
            payload = {
                'token': push_token,
                'title': title,
                'body': body,
                'priority': priority.value,
                'data': {
                    'type': 'waitlist_notification',
                    'timestamp': datetime.now().isoformat()
                }
            }
            
            headers = {
                'Authorization': f'Bearer {self.push_service_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                self.push_service_url,
                json=payload,
                headers=headers,
                timeout=10
            )
            
            return NotificationResult(
                success=response.status_code < 400,
                channel=NotificationChannel.PUSH,
                message_id=response.json().get('message_id') if response.status_code < 400 else None,
                delivery_time=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error sending push notification: {e}")
            return NotificationResult(
                success=False,
                channel=NotificationChannel.PUSH,
                error=str(e)
            )
    
    async def _get_customer_info(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Get customer contact information and preferences"""
        # This would typically query the database
        # For demo purposes, return mock data
        return {
            'customer_id': customer_id,
            'name': 'Demo Customer',
            'email': 'demo@example.com',
            'phone': '+1234567890',
            'push_token': 'demo_push_token',
            'notification_preferences': {
                'email': True,
                'sms': True,
                'push': True,
                'immediate_notify': True
            }
        }
    
    async def _log_notification_attempt(
        self,
        waitlist_id: str,
        customer_id: str,
        notification_type: str,
        channels: List[NotificationChannel],
        results: Dict[NotificationChannel, NotificationResult]
    ):
        """Log notification attempt for analytics and debugging"""
        try:
            log_entry = {
                'waitlist_id': waitlist_id,
                'customer_id': customer_id,
                'notification_type': notification_type,
                'channels_attempted': [ch.value for ch in channels],
                'results': {ch.value: result.__dict__ for ch, result in results.items()},
                'timestamp': datetime.now().isoformat(),
                'success_rate': len([r for r in results.values() if r.success]) / len(results) if results else 0
            }
            
            # In production, this would store in database
            logger.info(f"Notification attempt logged: {log_entry}")
            
        except Exception as e:
            logger.error(f"Error logging notification attempt: {e}")

# Initialize service instance
waitlist_notification_service = WaitlistNotificationService()

if __name__ == "__main__":
    # Example usage
    async def test_notifications():
        service = WaitlistNotificationService()
        
        # Test waitlist notification
        result = await service.send_waitlist_notification(
            waitlist_id="wl_test123",
            customer_id="customer_demo",
            notification_type="slot_available",
            data={
                'service_name': 'Premium Haircut',
                'slot_time': 'Tomorrow at 2:00 PM',
                'barber_name': 'John Doe',
                'duration': '45',
                'response_deadline': 'Today at 6:00 PM',
                'booking_link': 'https://book.barbershop.com/slot123'
            }
        )
        
        print(f"Notification result: {result}")
    
    asyncio.run(test_notifications())