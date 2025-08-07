#!/usr/bin/env python3
"""
Executable Marketing Agent - SMS & Email Blast Automation
Transforms advisory marketing recommendations into executable actions
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import os
import httpx
import sqlite3
from twilio.rest import Client as TwilioClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, To, From
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CampaignType(Enum):
    SMS_BLAST = "sms_blast"
    EMAIL_BLAST = "email_blast"
    TARGETED_SMS = "targeted_sms"
    TARGETED_EMAIL = "targeted_email"
    FOLLOW_UP_SEQUENCE = "follow_up_sequence"

class CampaignStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

@dataclass
class Customer:
    id: int
    name: str
    phone: str
    email: str
    last_visit: datetime
    total_visits: int
    preferred_contact: str  # 'sms', 'email', 'both'
    segment: str  # 'vip', 'regular', 'new', 'lapsed'

@dataclass
class Campaign:
    id: str
    name: str
    type: CampaignType
    message: str
    target_segment: List[str]
    scheduled_time: datetime
    status: CampaignStatus
    created_by: str
    metrics: Dict[str, Any] = None

class ExecutableMarketingAgent:
    """
    Marketing Agent that actually executes campaigns instead of just providing advice
    """
    
    def __init__(self, barbershop_id: str):
        self.barbershop_id = barbershop_id
        self.db_path = f"databases/marketing_campaigns_{barbershop_id}.db"
        
        # Initialize API clients
        self.twilio_client = None
        self.sendgrid_client = None
        self.setup_api_clients()
        
        # Initialize database
        self.init_database()
        
    def setup_api_clients(self):
        """Initialize SMS and Email service clients"""
        try:
            # Twilio SMS setup
            twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
            twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
            if twilio_sid and twilio_token:
                self.twilio_client = TwilioClient(twilio_sid, twilio_token)
                logger.info("✅ Twilio SMS client initialized")
            else:
                logger.warning("⚠️ Twilio credentials not found - SMS disabled")
                
            # SendGrid email setup
            sendgrid_key = os.getenv('SENDGRID_API_KEY')
            if sendgrid_key:
                self.sendgrid_client = SendGridAPIClient(api_key=sendgrid_key)
                logger.info("✅ SendGrid email client initialized")
            else:
                logger.warning("⚠️ SendGrid credentials not found - Email disabled")
                
        except Exception as e:
            logger.error(f"Error setting up API clients: {e}")
    
    def init_database(self):
        """Initialize marketing campaigns database"""
        try:
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.executescript("""
                    CREATE TABLE IF NOT EXISTS customers (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        barbershop_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        phone TEXT,
                        email TEXT,
                        last_visit DATETIME,
                        total_visits INTEGER DEFAULT 0,
                        preferred_contact TEXT DEFAULT 'both',
                        segment TEXT DEFAULT 'regular',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE TABLE IF NOT EXISTS campaigns (
                        id TEXT PRIMARY KEY,
                        barbershop_id TEXT NOT NULL,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        message TEXT NOT NULL,
                        target_segment TEXT NOT NULL, -- JSON array
                        scheduled_time DATETIME,
                        status TEXT DEFAULT 'pending',
                        created_by TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        completed_at DATETIME,
                        metrics TEXT -- JSON object
                    );
                    
                    CREATE TABLE IF NOT EXISTS campaign_sends (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        campaign_id TEXT NOT NULL,
                        customer_id INTEGER NOT NULL,
                        method TEXT NOT NULL, -- 'sms' or 'email'
                        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        delivered BOOLEAN DEFAULT FALSE,
                        opened BOOLEAN DEFAULT FALSE,
                        clicked BOOLEAN DEFAULT FALSE,
                        response TEXT,
                        FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                        FOREIGN KEY (customer_id) REFERENCES customers (id)
                    );
                    
                    CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers (segment);
                    CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers (last_visit);
                    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
                """)
            logger.info("✅ Marketing campaigns database initialized")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")

    async def execute_command(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute marketing commands with real actions
        """
        try:
            command_lower = command.lower()
            
            # SMS Blast Commands
            if "sms blast" in command_lower or "text blast" in command_lower:
                return await self.execute_sms_blast(command, context)
            
            # Email Blast Commands  
            elif "email blast" in command_lower or "email campaign" in command_lower:
                return await self.execute_email_blast(command, context)
            
            # Targeted Campaign Commands
            elif "follow up" in command_lower or "lapsed customers" in command_lower:
                return await self.execute_follow_up_campaign(command, context)
            
            # Customer Segmentation
            elif "segment customers" in command_lower:
                return await self.segment_customers(command, context)
            
            # Campaign Analytics
            elif "campaign results" in command_lower or "marketing analytics" in command_lower:
                return await self.get_campaign_analytics(context)
            
            else:
                return {
                    "success": False,
                    "message": "Command not recognized. Try: 'SMS blast about weekend promotion' or 'Email blast for new services'",
                    "available_commands": [
                        "SMS blast to [segment] about [message]",
                        "Email blast about [topic]", 
                        "Follow up with lapsed customers",
                        "Segment customers by visit frequency",
                        "Show campaign results"
                    ]
                }
                
        except Exception as e:
            logger.error(f"Error executing marketing command: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to execute marketing command"
            }

    async def execute_sms_blast(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute SMS blast campaign"""
        try:
            if not self.twilio_client:
                return {
                    "success": False,
                    "message": "SMS service not configured. Please add Twilio credentials."
                }
            
            # Extract campaign details from command
            campaign_details = self.parse_campaign_command(command, CampaignType.SMS_BLAST)
            
            # Get target customers
            customers = self.get_customers_by_segment(campaign_details["target_segment"])
            
            if not customers:
                return {
                    "success": False, 
                    "message": f"No customers found for segment: {campaign_details['target_segment']}"
                }
            
            # Create campaign record
            campaign = Campaign(
                id=f"sms_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                name=campaign_details["name"],
                type=CampaignType.SMS_BLAST,
                message=campaign_details["message"],
                target_segment=campaign_details["target_segment"],
                scheduled_time=datetime.now(),
                status=CampaignStatus.RUNNING,
                created_by="marketing_agent"
            )
            
            # Save campaign to database
            self.save_campaign(campaign)
            
            # Send SMS to customers
            sent_count = 0
            failed_count = 0
            
            for customer in customers:
                try:
                    if customer.phone:
                        message = self.twilio_client.messages.create(
                            body=campaign_details["message"],
                            from_=os.getenv('TWILIO_PHONE_NUMBER'),
                            to=customer.phone
                        )
                        
                        # Record send
                        self.record_campaign_send(campaign.id, customer.id, 'sms', True)
                        sent_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to send SMS to {customer.phone}: {e}")
                    self.record_campaign_send(campaign.id, customer.id, 'sms', False)
                    failed_count += 1
            
            # Update campaign status
            campaign.status = CampaignStatus.COMPLETED
            campaign.metrics = {
                "sent_count": sent_count,
                "failed_count": failed_count,
                "delivery_rate": (sent_count / (sent_count + failed_count)) * 100 if (sent_count + failed_count) > 0 else 0
            }
            self.update_campaign(campaign)
            
            return {
                "success": True,
                "message": f"SMS blast completed successfully!",
                "campaign_id": campaign.id,
                "sent_to": sent_count,
                "failed": failed_count,
                "delivery_rate": f"{campaign.metrics['delivery_rate']:.1f}%",
                "action_taken": "SMS messages sent to customers"
            }
            
        except Exception as e:
            logger.error(f"Error executing SMS blast: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to execute SMS blast"
            }

    async def execute_email_blast(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute email blast campaign"""
        try:
            if not self.sendgrid_client:
                return {
                    "success": False,
                    "message": "Email service not configured. Please add SendGrid credentials."
                }
            
            # Extract campaign details
            campaign_details = self.parse_campaign_command(command, CampaignType.EMAIL_BLAST)
            
            # Get target customers
            customers = self.get_customers_by_segment(campaign_details["target_segment"])
            
            if not customers:
                return {
                    "success": False,
                    "message": f"No customers found for segment: {campaign_details['target_segment']}"
                }
            
            # Create professional email template
            email_content = self.generate_email_template(campaign_details["message"], context)
            
            # Create campaign record
            campaign = Campaign(
                id=f"email_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                name=campaign_details["name"],
                type=CampaignType.EMAIL_BLAST,
                message=campaign_details["message"],
                target_segment=campaign_details["target_segment"],
                scheduled_time=datetime.now(),
                status=CampaignStatus.RUNNING,
                created_by="marketing_agent"
            )
            
            self.save_campaign(campaign)
            
            # Send emails
            sent_count = 0
            failed_count = 0
            
            for customer in customers:
                try:
                    if customer.email:
                        message = Mail(
                            from_email=From(os.getenv('SENDGRID_FROM_EMAIL', 'noreply@barbershop.com')),
                            to_emails=To(customer.email),
                            subject=campaign_details.get("subject", "Special Offer from Your Barbershop"),
                            html_content=email_content
                        )
                        
                        response = self.sendgrid_client.send(message)
                        
                        # Record send
                        self.record_campaign_send(campaign.id, customer.id, 'email', True)
                        sent_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to send email to {customer.email}: {e}")
                    self.record_campaign_send(campaign.id, customer.id, 'email', False)
                    failed_count += 1
            
            # Update campaign status
            campaign.status = CampaignStatus.COMPLETED
            campaign.metrics = {
                "sent_count": sent_count,
                "failed_count": failed_count,
                "delivery_rate": (sent_count / (sent_count + failed_count)) * 100 if (sent_count + failed_count) > 0 else 0
            }
            self.update_campaign(campaign)
            
            return {
                "success": True,
                "message": "Email blast completed successfully!",
                "campaign_id": campaign.id,
                "sent_to": sent_count,
                "failed": failed_count,
                "delivery_rate": f"{campaign.metrics['delivery_rate']:.1f}%",
                "action_taken": "Professional emails sent to customers"
            }
            
        except Exception as e:
            logger.error(f"Error executing email blast: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to execute email blast"
            }

    def parse_campaign_command(self, command: str, campaign_type: CampaignType) -> Dict[str, Any]:
        """Parse natural language command into campaign parameters"""
        
        # Default values
        details = {
            "name": f"Marketing Campaign {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "message": "",
            "target_segment": ["regular"],
            "subject": "Special Offer from Your Barbershop"
        }
        
        command_lower = command.lower()
        
        # Extract target segment
        if "vip" in command_lower or "premium" in command_lower:
            details["target_segment"] = ["vip"]
        elif "new customers" in command_lower or "new clients" in command_lower:
            details["target_segment"] = ["new"]
        elif "lapsed" in command_lower or "haven't been" in command_lower:
            details["target_segment"] = ["lapsed"]
        elif "all customers" in command_lower or "everyone" in command_lower:
            details["target_segment"] = ["regular", "vip", "new", "lapsed"]
        
        # Extract promotional message
        if "%" in command_lower:
            # Extract percentage discount
            import re
            percent_match = re.search(r'(\d+)%', command_lower)
            if percent_match:
                percent = percent_match.group(1)
                details["message"] = f"🔥 Special Offer: {percent}% OFF your next visit! Book now and save. Limited time only."
                details["subject"] = f"{percent}% OFF - Limited Time Offer!"
        
        elif "weekend" in command_lower:
            details["message"] = "🌟 Weekend Special: Book your appointment this weekend and get premium treatment at regular prices!"
            details["subject"] = "Weekend Special Offer!"
            
        elif "new service" in command_lower or "new services" in command_lower:
            details["message"] = "✨ Exciting News! We've added new premium services. Be among the first to try them with 15% off!"
            details["subject"] = "New Services Available!"
            
        elif "appointment" in command_lower or "booking" in command_lower:
            details["message"] = "📅 We have openings this week! Book your appointment now and skip the wait."
            details["subject"] = "Open Appointments Available"
            
        else:
            # Generic promotional message
            details["message"] = "🔥 Special offer just for you! Visit us this week for premium barbershop services."
            details["subject"] = "Special Offer from Your Barbershop"
        
        # Customize name based on content
        if "weekend" in command_lower:
            details["name"] = "Weekend Promotion Campaign"
        elif "%" in command_lower:
            details["name"] = "Discount Promotion Campaign"
        elif "new service" in command_lower:
            details["name"] = "New Services Launch Campaign"
        
        return details

    def generate_email_template(self, message: str, context: Dict[str, Any] = None) -> str:
        """Generate professional email HTML template"""
        
        barbershop_name = context.get("barbershop_name", "Your Local Barbershop") if context else "Your Local Barbershop"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #333; margin-bottom: 10px;">{barbershop_name}</h1>
                    <p style="color: #666; margin: 0;">Premium Barbershop Services</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <p style="font-size: 18px; color: #333; margin: 0; text-align: center;">{message}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="tel:+1234567890" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">📞 Book Now</a>
                </div>
                
                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
                    <p>Thank you for choosing {barbershop_name}!</p>
                    <p>Reply STOP to unsubscribe from promotional emails.</p>
                </div>
            </div>
        </body>
        </html>
        """

    def get_customers_by_segment(self, segments: List[str]) -> List[Customer]:
        """Get customers by segment for targeting"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                placeholders = ','.join('?' for _ in segments)
                query = f"""
                    SELECT * FROM customers 
                    WHERE barbershop_id = ? AND segment IN ({placeholders})
                    ORDER BY last_visit DESC
                """
                
                params = [self.barbershop_id] + segments
                rows = conn.execute(query, params).fetchall()
                
                customers = []
                for row in rows:
                    customer = Customer(
                        id=row['id'],
                        name=row['name'],
                        phone=row['phone'],
                        email=row['email'],
                        last_visit=datetime.fromisoformat(row['last_visit']) if row['last_visit'] else None,
                        total_visits=row['total_visits'],
                        preferred_contact=row['preferred_contact'],
                        segment=row['segment']
                    )
                    customers.append(customer)
                
                return customers
                
        except Exception as e:
            logger.error(f"Error getting customers by segment: {e}")
            return []

    def save_campaign(self, campaign: Campaign):
        """Save campaign to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO campaigns (id, barbershop_id, name, type, message, target_segment, 
                                         scheduled_time, status, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    campaign.id,
                    self.barbershop_id,
                    campaign.name,
                    campaign.type.value,
                    campaign.message,
                    json.dumps(campaign.target_segment),
                    campaign.scheduled_time.isoformat(),
                    campaign.status.value,
                    campaign.created_by
                ))
        except Exception as e:
            logger.error(f"Error saving campaign: {e}")

    def update_campaign(self, campaign: Campaign):
        """Update campaign in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE campaigns 
                    SET status = ?, completed_at = ?, metrics = ?
                    WHERE id = ?
                """, (
                    campaign.status.value,
                    datetime.now().isoformat(),
                    json.dumps(campaign.metrics) if campaign.metrics else None,
                    campaign.id
                ))
        except Exception as e:
            logger.error(f"Error updating campaign: {e}")

    def record_campaign_send(self, campaign_id: str, customer_id: int, method: str, delivered: bool):
        """Record individual campaign send"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO campaign_sends (campaign_id, customer_id, method, delivered)
                    VALUES (?, ?, ?, ?)
                """, (campaign_id, customer_id, method, delivered))
        except Exception as e:
            logger.error(f"Error recording campaign send: {e}")

    async def get_campaign_analytics(self, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get marketing campaign analytics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # Get recent campaigns
                campaigns = conn.execute("""
                    SELECT * FROM campaigns 
                    WHERE barbershop_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 10
                """, (self.barbershop_id,)).fetchall()
                
                # Get send statistics
                stats = conn.execute("""
                    SELECT 
                        method,
                        COUNT(*) as total_sends,
                        SUM(CASE WHEN delivered THEN 1 ELSE 0 END) as delivered,
                        SUM(CASE WHEN opened THEN 1 ELSE 0 END) as opened,
                        SUM(CASE WHEN clicked THEN 1 ELSE 0 END) as clicked
                    FROM campaign_sends cs
                    JOIN campaigns c ON cs.campaign_id = c.id
                    WHERE c.barbershop_id = ?
                    GROUP BY method
                """, (self.barbershop_id,)).fetchall()
                
                analytics = {
                    "recent_campaigns": [dict(row) for row in campaigns],
                    "performance_by_method": [dict(row) for row in stats],
                    "summary": {
                        "total_campaigns": len(campaigns),
                        "active_campaigns": len([c for c in campaigns if c['status'] == 'running'])
                    }
                }
                
                return {
                    "success": True,
                    "analytics": analytics,
                    "message": f"Retrieved analytics for {len(campaigns)} campaigns"
                }
                
        except Exception as e:
            logger.error(f"Error getting campaign analytics: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to retrieve campaign analytics"
            }

    async def segment_customers(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Automatically segment customers based on behavior"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Update customer segments based on last visit
                today = datetime.now()
                
                # VIP customers: 8+ visits in last 6 months
                conn.execute("""
                    UPDATE customers 
                    SET segment = 'vip' 
                    WHERE barbershop_id = ? AND total_visits >= 8 
                    AND last_visit >= ?
                """, (self.barbershop_id, (today - timedelta(days=180)).isoformat()))
                
                # Lapsed customers: haven't visited in 60+ days
                conn.execute("""
                    UPDATE customers 
                    SET segment = 'lapsed' 
                    WHERE barbershop_id = ? AND last_visit < ?
                """, (self.barbershop_id, (today - timedelta(days=60)).isoformat()))
                
                # New customers: first visit within 30 days
                conn.execute("""
                    UPDATE customers 
                    SET segment = 'new' 
                    WHERE barbershop_id = ? AND total_visits <= 2 
                    AND last_visit >= ?
                """, (self.barbershop_id, (today - timedelta(days=30)).isoformat()))
                
                # Regular customers: everyone else
                conn.execute("""
                    UPDATE customers 
                    SET segment = 'regular' 
                    WHERE barbershop_id = ? AND segment NOT IN ('vip', 'lapsed', 'new')
                """, (self.barbershop_id,))
                
                # Get segment counts
                segments = conn.execute("""
                    SELECT segment, COUNT(*) as count 
                    FROM customers 
                    WHERE barbershop_id = ? 
                    GROUP BY segment
                """, (self.barbershop_id,)).fetchall()
                
                segment_data = {row[0]: row[1] for row in segments}
                
                return {
                    "success": True,
                    "message": "Customer segmentation completed successfully",
                    "segments": segment_data,
                    "action_taken": "Updated customer segments based on visit patterns"
                }
                
        except Exception as e:
            logger.error(f"Error segmenting customers: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to segment customers"
            }

    async def execute_follow_up_campaign(self, command: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Execute follow-up campaign for lapsed customers"""
        try:
            # First segment customers to identify lapsed ones
            await self.segment_customers("segment customers", context)
            
            # Get lapsed customers
            lapsed_customers = self.get_customers_by_segment(["lapsed"])
            
            if not lapsed_customers:
                return {
                    "success": True,
                    "message": "No lapsed customers found - great customer retention!",
                    "action_taken": "Checked for lapsed customers"
                }
            
            # Create personalized follow-up message
            follow_up_message = "We miss you! 😊 It's been a while since your last visit. Come back this week and get 25% off your next cut. We'd love to see you again!"
            
            # Create campaign for lapsed customers
            campaign_details = {
                "name": "Lapsed Customer Win-Back Campaign",
                "message": follow_up_message,
                "target_segment": ["lapsed"],
                "subject": "We Miss You - 25% Off Welcome Back Offer"
            }
            
            # Execute both SMS and email for maximum reach
            sms_result = await self.execute_sms_blast(f"SMS blast to lapsed customers: {follow_up_message}", context)
            email_result = await self.execute_email_blast(f"Email blast to lapsed customers: {follow_up_message}", context)
            
            return {
                "success": True,
                "message": f"Follow-up campaign launched for {len(lapsed_customers)} lapsed customers",
                "lapsed_customers_count": len(lapsed_customers),
                "sms_campaign": sms_result,
                "email_campaign": email_result,
                "action_taken": "Sent win-back messages via SMS and email to lapsed customers"
            }
            
        except Exception as e:
            logger.error(f"Error executing follow-up campaign: {e}")
            return {
                "success": False,
                "error": str(e),
                "message": "Failed to execute follow-up campaign"
            }

# Demo/Testing Functions
async def demo_marketing_agent():
    """Demo the executable marketing agent"""
    agent = ExecutableMarketingAgent("demo_shop_001")
    
    # Add some demo customers
    demo_customers = [
        {"name": "John Smith", "phone": "+1234567890", "email": "john@example.com", "segment": "regular"},
        {"name": "Sarah Johnson", "phone": "+1234567891", "email": "sarah@example.com", "segment": "vip"},
        {"name": "Mike Wilson", "phone": "+1234567892", "email": "mike@example.com", "segment": "lapsed"}
    ]
    
    for customer in demo_customers:
        with sqlite3.connect(agent.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO customers (barbershop_id, name, phone, email, segment, last_visit, total_visits)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                agent.barbershop_id,
                customer["name"],
                customer["phone"], 
                customer["email"],
                customer["segment"],
                datetime.now().isoformat(),
                5 if customer["segment"] == "vip" else 2
            ))
    
    print("🚀 Testing Executable Marketing Agent\n")
    
    # Test SMS blast
    print("1. Testing SMS Blast:")
    result = await agent.execute_command("SMS blast about 20% off weekend special")
    print(json.dumps(result, indent=2))
    
    print("\n2. Testing Email Campaign:")
    result = await agent.execute_command("Email blast about new premium services")
    print(json.dumps(result, indent=2))
    
    print("\n3. Testing Customer Segmentation:")
    result = await agent.execute_command("Segment customers by visit frequency")
    print(json.dumps(result, indent=2))
    
    print("\n4. Testing Follow-up Campaign:")
    result = await agent.execute_command("Follow up with lapsed customers")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    asyncio.run(demo_marketing_agent())