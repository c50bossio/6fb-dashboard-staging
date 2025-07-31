"""
Notification Service for 6FB AI Agent System
Handles email and SMS notifications with provider integrations
"""
import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Union
from contextlib import contextmanager
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
try:
    import aiosmtplib
    AIOSMTPLIB_AVAILABLE = True
except ImportError:
    AIOSMTPLIB_AVAILABLE = False
    print("Warning: aiosmtplib not available - email sending will use mock mode")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("Warning: httpx not available - SMS sending will use mock mode")

try:
    from jinja2 import Template
    JINJA2_AVAILABLE = True
except ImportError:
    JINJA2_AVAILABLE = False
    print("Warning: jinja2 not available - using basic string formatting for templates")

# Configuration
EMAIL_CONFIG = {
    "SMTP_HOST": os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "SMTP_PORT": int(os.getenv("SMTP_PORT", "587")),
    "SMTP_USERNAME": os.getenv("SMTP_USERNAME", ""),
    "SMTP_PASSWORD": os.getenv("SMTP_PASSWORD", ""),
    "FROM_EMAIL": os.getenv("FROM_EMAIL", "noreply@6fbai.com"),
    "FROM_NAME": os.getenv("FROM_NAME", "6FB AI Agent System")
}

SMS_CONFIG = {
    "PROVIDER": os.getenv("SMS_PROVIDER", "twilio"),  # twilio, aws_sns, textbelt
    "TWILIO_ACCOUNT_SID": os.getenv("TWILIO_ACCOUNT_SID", ""),
    "TWILIO_AUTH_TOKEN": os.getenv("TWILIO_AUTH_TOKEN", ""),
    "TWILIO_FROM_NUMBER": os.getenv("TWILIO_FROM_NUMBER", ""),
    "AWS_REGION": os.getenv("AWS_REGION", "us-east-1"),
    "TEXTBELT_KEY": os.getenv("TEXTBELT_KEY", "")
}

# Database setup
DATABASE_PATH = "data/agent_system.db"

@contextmanager
def get_db():
    """Database connection context manager"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

class NotificationService:
    """Main notification service handling email and SMS"""
    
    def __init__(self):
        self.email_service = EmailService()
        self.sms_service = SMSService()
        self._init_database()
    
    def _init_database(self):
        """Initialize notification history table"""
        with get_db() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS notification_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    recipient TEXT NOT NULL,
                    subject TEXT,
                    content TEXT NOT NULL,
                    status TEXT NOT NULL,
                    error_message TEXT,
                    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            conn.commit()
    
    async def send_notification(
        self,
        user_id: int,
        notification_type: str,
        recipient: str,
        subject: str,
        content: str,
        template_id: Optional[str] = None,
        template_data: Optional[Dict] = None,
        check_preferences: bool = True
    ) -> Dict:
        """Send a notification based on type and user preferences"""
        
        # Check user preferences if requested
        if check_preferences:
            preferences = self._get_user_preferences(user_id)
            
            if notification_type == "email" and not preferences.get("emailEnabled", True):
                return {
                    "success": False,
                    "message": "Email notifications disabled by user preference"
                }
            
            if notification_type == "sms" and not preferences.get("smsEnabled", True):
                return {
                    "success": False,
                    "message": "SMS notifications disabled by user preference"
                }
        
        # Apply template if provided
        if template_id and template_data:
            rendered = self._render_template(template_id, template_data)
            content = rendered.get("content", content)
            if notification_type == "email":
                subject = rendered.get("subject", subject)
        
        # Send notification
        try:
            if notification_type == "email":
                result = await self.email_service.send_email(
                    to_email=recipient,
                    subject=subject,
                    content=content
                )
            elif notification_type == "sms":
                result = await self.sms_service.send_sms(
                    to_number=recipient,
                    message=content
                )
            else:
                result = {
                    "success": False,
                    "message": f"Unknown notification type: {notification_type}"
                }
            
            # Log to history
            self._log_notification(
                user_id=user_id,
                notification_type=notification_type,
                recipient=recipient,
                subject=subject,
                content=content,
                status="sent" if result["success"] else "failed",
                error_message=result.get("error")
            )
            
            return result
            
        except Exception as e:
            self._log_notification(
                user_id=user_id,
                notification_type=notification_type,
                recipient=recipient,
                subject=subject,
                content=content,
                status="error",
                error_message=str(e)
            )
            return {
                "success": False,
                "message": "Notification failed",
                "error": str(e)
            }
    
    def _get_user_preferences(self, user_id: int) -> Dict:
        """Get user notification preferences"""
        with get_db() as conn:
            cursor = conn.execute(
                "SELECT profile_data FROM shop_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                (user_id,)
            )
            profile = cursor.fetchone()
            
            if profile and profile["profile_data"]:
                settings = json.loads(profile["profile_data"])
                return settings.get("notifications", {})
        
        return {
            "emailEnabled": True,
            "smsEnabled": True,
            "campaignAlerts": True,
            "bookingAlerts": True,
            "systemAlerts": True
        }
    
    def _render_template(self, template_id: str, data: Dict) -> Dict:
        """Render notification template with data"""
        templates = {
            "booking_confirmation": {
                "subject": "Booking Confirmed - {service} on {date}",
                "content": """
                Hi {customer_name},
                
                Your booking has been confirmed!
                
                Service: {service}
                Date: {date}
                Time: {time}
                Barber: {barber_name}
                
                We look forward to seeing you!
                
                {shop_name}
                """
            },
            "booking_reminder": {
                "subject": "Reminder: Appointment Tomorrow",
                "content": """
                Hi {customer_name},
                
                This is a reminder about your appointment tomorrow:
                
                Service: {service}
                Date: {date}
                Time: {time}
                
                See you soon!
                {shop_name}
                """
            },
            "campaign_email": {
                "subject": "{subject}",
                "content": "{content}"
            },
            "campaign_sms": {
                "content": "{shop_name}: {content}"
            }
        }
        
        template = templates.get(template_id, {})
        rendered = {}
        
        if JINJA2_AVAILABLE:
            # Use Jinja2 for advanced templating
            if "subject" in template:
                subject_template = Template(template["subject"].replace("{", "{{").replace("}", "}}"))
                rendered["subject"] = subject_template.render(**data)
            
            if "content" in template:
                content_template = Template(template["content"].replace("{", "{{").replace("}", "}}"))
                rendered["content"] = content_template.render(**data)
        else:
            # Fallback to basic string formatting
            if "subject" in template:
                rendered["subject"] = template["subject"].format(**data)
            
            if "content" in template:
                rendered["content"] = template["content"].format(**data)
        
        return rendered
    
    def _log_notification(self, **kwargs):
        """Log notification to history"""
        with get_db() as conn:
            conn.execute("""
                INSERT INTO notification_history 
                (user_id, type, recipient, subject, content, status, error_message, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kwargs.get("user_id"),
                kwargs.get("notification_type"),
                kwargs.get("recipient"),
                kwargs.get("subject"),
                kwargs.get("content"),
                kwargs.get("status"),
                kwargs.get("error_message"),
                json.dumps(kwargs.get("metadata", {}))
            ))
            conn.commit()
    
    async def send_booking_confirmation(self, booking_data: Dict) -> Dict:
        """Send booking confirmation notification"""
        user_id = booking_data["user_id"]
        preferences = self._get_user_preferences(user_id)
        
        results = []
        
        # Send email if enabled
        if preferences.get("bookingAlerts", True) and preferences.get("emailEnabled", True):
            email_result = await self.send_notification(
                user_id=user_id,
                notification_type="email",
                recipient=booking_data["customer_email"],
                subject="",
                content="",
                template_id="booking_confirmation",
                template_data=booking_data,
                check_preferences=False
            )
            results.append(email_result)
        
        # Send SMS if enabled and phone provided
        if (preferences.get("bookingAlerts", True) and 
            preferences.get("smsEnabled", True) and 
            booking_data.get("customer_phone")):
            
            sms_data = {
                **booking_data,
                "content": f"Booking confirmed: {booking_data['service']} on {booking_data['date']} at {booking_data['time']}"
            }
            sms_result = await self.send_notification(
                user_id=user_id,
                notification_type="sms",
                recipient=booking_data["customer_phone"],
                subject="",
                content="",
                template_id="campaign_sms",
                template_data=sms_data,
                check_preferences=False
            )
            results.append(sms_result)
        
        return {
            "success": any(r["success"] for r in results),
            "results": results
        }
    
    async def send_campaign(self, campaign_data: Dict) -> Dict:
        """Send marketing campaign"""
        user_id = campaign_data["user_id"]
        preferences = self._get_user_preferences(user_id)
        
        if not preferences.get("campaignAlerts", True):
            return {
                "success": False,
                "message": "Campaign alerts disabled by user preference"
            }
        
        results = []
        recipients = campaign_data.get("recipients", [])
        
        for recipient in recipients:
            if campaign_data["type"] == "email" and preferences.get("emailEnabled", True):
                result = await self.send_notification(
                    user_id=user_id,
                    notification_type="email",
                    recipient=recipient["email"],
                    subject="",
                    content="",
                    template_id="campaign_email",
                    template_data={
                        "subject": campaign_data["subject"],
                        "content": campaign_data["content"],
                        "shop_name": campaign_data.get("shop_name", "")
                    },
                    check_preferences=False
                )
                results.append(result)
            
            elif campaign_data["type"] == "sms" and preferences.get("smsEnabled", True):
                result = await self.send_notification(
                    user_id=user_id,
                    notification_type="sms",
                    recipient=recipient["phone"],
                    subject="",
                    content="",
                    template_id="campaign_sms",
                    template_data={
                        "content": campaign_data["content"],
                        "shop_name": campaign_data.get("shop_name", "")
                    },
                    check_preferences=False
                )
                results.append(result)
        
        successful = sum(1 for r in results if r["success"])
        
        return {
            "success": successful > 0,
            "sent": successful,
            "failed": len(results) - successful,
            "total": len(results)
        }

class EmailService:
    """Email service implementation"""
    
    async def send_email(self, to_email: str, subject: str, content: str) -> Dict:
        """Send email using configured provider"""
        
        # For development/testing without real SMTP
        if not EMAIL_CONFIG["SMTP_USERNAME"]:
            print(f"[EMAIL] To: {to_email}")
            print(f"[EMAIL] Subject: {subject}")
            print(f"[EMAIL] Content: {content[:100]}...")
            return {
                "success": True,
                "message": "Email sent (development mode)",
                "provider": "mock"
            }
        
        try:
            # Create message
            message = MIMEMultipart()
            message["From"] = f"{EMAIL_CONFIG['FROM_NAME']} <{EMAIL_CONFIG['FROM_EMAIL']}>"
            message["To"] = to_email
            message["Subject"] = subject
            
            # Add content
            message.attach(MIMEText(content, "plain"))
            
            if AIOSMTPLIB_AVAILABLE:
                # Send via real SMTP
                async with aiosmtplib.SMTP(
                    hostname=EMAIL_CONFIG["SMTP_HOST"],
                    port=EMAIL_CONFIG["SMTP_PORT"],
                    start_tls=True
                ) as smtp:
                    await smtp.login(EMAIL_CONFIG["SMTP_USERNAME"], EMAIL_CONFIG["SMTP_PASSWORD"])
                    await smtp.send_message(message)
                
                return {
                    "success": True,
                    "message": "Email sent successfully via SMTP",
                    "provider": "smtp"
                }
            else:
                # Simulate sending when aiosmtplib not available
                print(f"[EMAIL-SMTP] Would send to: {to_email}")
                print(f"[EMAIL-SMTP] Subject: {subject}")
                print(f"[EMAIL-SMTP] From: {message['From']}")
                
                return {
                    "success": True,
                    "message": "Email sent (simulated - aiosmtplib not installed)",
                    "provider": "smtp"
                }
            
        except Exception as e:
            return {
                "success": False,
                "message": "Email failed to send",
                "error": str(e),
                "provider": "smtp"
            }

class SMSService:
    """SMS service implementation"""
    
    async def send_sms(self, to_number: str, message: str) -> Dict:
        """Send SMS using configured provider"""
        
        provider = SMS_CONFIG["PROVIDER"]
        
        if provider == "twilio":
            return await self._send_twilio_sms(to_number, message)
        elif provider == "textbelt":
            return await self._send_textbelt_sms(to_number, message)
        else:
            # Development mode
            print(f"[SMS] To: {to_number}")
            print(f"[SMS] Message: {message}")
            return {
                "success": True,
                "message": "SMS sent (development mode)",
                "provider": "mock"
            }
    
    async def _send_twilio_sms(self, to_number: str, message: str) -> Dict:
        """Send SMS via Twilio"""
        if not SMS_CONFIG["TWILIO_ACCOUNT_SID"]:
            return {
                "success": False,
                "message": "Twilio not configured",
                "provider": "twilio"
            }
        
        try:
            if HTTPX_AVAILABLE:
                # Send via real Twilio API
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/{SMS_CONFIG['TWILIO_ACCOUNT_SID']}/Messages.json",
                        auth=(SMS_CONFIG["TWILIO_ACCOUNT_SID"], SMS_CONFIG["TWILIO_AUTH_TOKEN"]),
                        data={
                            "From": SMS_CONFIG.get("TWILIO_FROM_NUMBER", SMS_CONFIG.get("TWILIO_PHONE_NUMBER")),
                            "To": to_number,
                            "Body": message
                        }
                    )
                    
                    if response.status_code == 201:
                        return {
                            "success": True,
                            "message": "SMS sent via Twilio",
                            "provider": "twilio"
                        }
                    else:
                        return {
                            "success": False,
                            "message": "Twilio API error",
                            "error": response.text,
                            "provider": "twilio"
                        }
            else:
                # Simulate sending when httpx not available
                print(f"[SMS-TWILIO] Would send to: {to_number}")
                print(f"[SMS-TWILIO] Message: {message}")
                print(f"[SMS-TWILIO] From: {SMS_CONFIG['TWILIO_FROM_NUMBER']}")
                
                return {
                    "success": True,
                    "message": "SMS sent via Twilio (simulated - httpx not installed)",
                    "provider": "twilio"
                }
                    
        except Exception as e:
            return {
                "success": False,
                "message": "SMS failed to send",
                "error": str(e),
                "provider": "twilio"
            }
    
    async def _send_textbelt_sms(self, to_number: str, message: str) -> Dict:
        """Send SMS via Textbelt (simple SMS API)"""
        if not SMS_CONFIG["TEXTBELT_KEY"]:
            return {
                "success": False,
                "message": "Textbelt not configured",
                "provider": "textbelt"
            }
        
        try:
            if HTTPX_AVAILABLE:
                # Send via real Textbelt API
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://textbelt.com/text",
                        json={
                            "phone": to_number,
                            "message": message,
                            "key": SMS_CONFIG["TEXTBELT_KEY"]
                        }
                    )
                    
                    data = response.json()
                    if data.get("success"):
                        return {
                            "success": True,
                            "message": "SMS sent via Textbelt",
                            "provider": "textbelt"
                        }
                    else:
                        return {
                            "success": False,
                            "message": "Textbelt API error",
                            "error": data.get("error", "Unknown error"),
                            "provider": "textbelt"
                        }
            else:
                # Simulate sending when httpx not available
                print(f"[SMS-TEXTBELT] Would send to: {to_number}")
                print(f"[SMS-TEXTBELT] Message: {message}")
                
                return {
                    "success": True,
                    "message": "SMS sent via Textbelt (simulated - httpx not installed)",
                    "provider": "textbelt"
                }
                    
        except Exception as e:
            return {
                "success": False,
                "message": "SMS failed to send",
                "error": str(e),
                "provider": "textbelt"
            }

# Singleton instance
notification_service = NotificationService()