#!/usr/bin/env python3
"""
Campaign Management Service
Comprehensive customer campaign management with multi-channel delivery,
A/B testing, automation, and performance tracking.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any, Union
import logging
from dataclasses import dataclass
import re

# Database and external services
from supabase import create_client, Client
import os

# Email and SMS services (Node.js services - we'll use subprocess for now)
import subprocess
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CampaignTemplate:
    name: str
    category: str
    type: str
    subject: Optional[str]
    content: str
    variables: List[str]
    triggers: Dict[str, Any]

class CampaignManagementService:
    def __init__(self):
        # Initialize Supabase client
        self.supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_service_key:
            raise ValueError("Missing Supabase configuration")
            
        self.supabase: Client = create_client(self.supabase_url, self.supabase_service_key)
        
        # Initialize communication services (simplified for direct integration)
        self.email_service = self._create_email_service()
        self.sms_service = self._create_sms_service()
        
        # Campaign templates
        self.templates = self._load_campaign_templates()
        
        # Rate limiting for delivery
        self.email_rate_limit = 100  # emails per minute
        self.sms_rate_limit = 60     # SMS per minute

    def _create_email_service(self):
        """Create email service wrapper"""
        return EmailServiceWrapper()

    def _create_sms_service(self):
        """Create SMS service wrapper"""
        return SMSServiceWrapper()

class EmailServiceWrapper:
    """Wrapper for SendGrid email service"""
    
    async def send_campaign_email(self, to_email: str, to_name: str, subject: str, 
                                 html_content: str, campaign_id: str) -> Optional[str]:
        """Send campaign email using SendGrid service"""
        try:
            # Create email message structure
            message = {
                'to': [{'email': to_email, 'name': to_name}],
                'from': {'email': os.getenv('SENDGRID_FROM_EMAIL', 'noreply@bookedbarber.com'),
                        'name': os.getenv('SENDGRID_FROM_NAME', 'BookedBarber')},
                'subject': subject,
                'html': html_content,
                'custom_args': {
                    'campaign_id': campaign_id,
                    'type': 'campaign'
                }
            }
            
            # For now, we'll simulate sending (replace with actual SendGrid integration)
            # In production, you'd call the Node.js service or use Python SendGrid SDK
            message_id = f"msg_{uuid.uuid4().hex[:16]}"
            logger.info(f"Email sent to {to_email}: {message_id}")
            return message_id
            
        except Exception as e:
            logger.error(f"Error sending email: {str(e)}")
            return None

class SMSServiceWrapper:
    """Wrapper for Twilio SMS service"""
    
    async def send_campaign_sms(self, to_phone: str, message: str, barbershop_id: str) -> Optional[str]:
        """Send campaign SMS using Twilio service"""
        try:
            # For now, we'll simulate sending (replace with actual Twilio integration)
            # In production, you'd call the Node.js service or use Python Twilio SDK
            message_id = f"sms_{uuid.uuid4().hex[:16]}"
            logger.info(f"SMS sent to {to_phone}: {message_id}")
            return message_id
            
        except Exception as e:
            logger.error(f"Error sending SMS: {str(e)}")
            return None

    def _load_campaign_templates(self) -> Dict[str, CampaignTemplate]:
        """Load predefined campaign templates"""
        return {
            "welcome_series_1": CampaignTemplate(
                name="Welcome Email 1 - New Customer",
                category="welcome",
                type="email",
                subject="Welcome to {{barbershop_name}}! 🎉",
                content="""
                <h1>Welcome {{customer_first_name}}!</h1>
                <p>Thank you for choosing {{barbershop_name}} for your grooming needs. We're excited to have you as part of our community!</p>
                
                <h2>What's Next?</h2>
                <ul>
                    <li>Download our mobile app for easy booking</li>
                    <li>Follow us on social media for styling tips</li>
                    <li>Join our loyalty program and earn points</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{app_download_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Download Our App</a>
                </div>
                
                <p>Looking forward to your next visit!</p>
                <p>— The {{barbershop_name}} Team</p>
                """,
                variables=["customer_first_name", "barbershop_name", "app_download_link"],
                triggers={"days_after_signup": 0}
            ),
            
            "welcome_series_2": CampaignTemplate(
                name="Welcome Email 2 - Booking Reminder",
                category="welcome",
                type="email",
                subject="Ready for your first cut? Book now at {{barbershop_name}}",
                content="""
                <h1>Hi {{customer_first_name}},</h1>
                <p>We noticed you haven't booked your first appointment yet. Don't worry, we're here to make it easy!</p>
                
                <h2>Our Most Popular Services:</h2>
                <ul>
                    <li>Classic Haircut - ${{haircut_price}}</li>
                    <li>Beard Trim - ${{beard_price}}</li>
                    <li>Hot Towel Shave - ${{shave_price}}</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Book Your First Cut</a>
                </div>
                
                <p><strong>New Customer Special:</strong> Get 15% off your first service!</p>
                """,
                variables=["customer_first_name", "barbershop_name", "haircut_price", "beard_price", "shave_price", "booking_link"],
                triggers={"days_after_signup": 3, "has_no_appointments": True}
            ),
            
            "birthday_campaign": CampaignTemplate(
                name="Birthday Celebration",
                category="birthday",
                type="email",
                subject="🎂 Happy Birthday {{customer_first_name}}! Your gift awaits",
                content="""
                <h1>🎉 Happy Birthday {{customer_first_name}}!</h1>
                <p>Wishing you an amazing birthday from all of us at {{barbershop_name}}!</p>
                
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                    <h2>🎁 Your Birthday Gift</h2>
                    <p style="font-size: 24px; font-weight: bold; color: #007bff;">25% OFF</p>
                    <p>Any service during your birthday month!</p>
                    <p><strong>Code: BIRTHDAY{{birth_month}}</strong></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Book Your Birthday Cut</a>
                </div>
                
                <p>Valid until {{expiry_date}}. Cannot be combined with other offers.</p>
                """,
                variables=["customer_first_name", "barbershop_name", "birth_month", "booking_link", "expiry_date"],
                triggers={"birthday_month": True}
            ),
            
            "win_back_campaign": CampaignTemplate(
                name="We Miss You - Win Back",
                category="reactivation",
                type="email",
                subject="We miss you {{customer_first_name}}! Come back with 20% off",
                content="""
                <h1>We miss you, {{customer_first_name}}!</h1>
                <p>It's been {{days_since_visit}} days since your last visit to {{barbershop_name}}, and we wanted to reach out.</p>
                
                <p>Your barber {{preferred_barber}} has been asking about you. Why not book your next appointment and catch up?</p>
                
                <div style="background: #fff3cd; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                    <h2>🎯 Welcome Back Offer</h2>
                    <p style="font-size: 24px; font-weight: bold; color: #856404;">20% OFF</p>
                    <p>Your next service with us!</p>
                    <p><strong>Code: WELCOME20</strong></p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_link}}" style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Book Your Return Visit</a>
                </div>
                
                <p>Valid for the next 14 days. We can't wait to see you again!</p>
                """,
                variables=["customer_first_name", "barbershop_name", "days_since_visit", "preferred_barber", "booking_link"],
                triggers={"days_since_last_visit": 60}
            ),
            
            "vip_campaign": CampaignTemplate(
                name="VIP Exclusive Offer",
                category="promotional",
                type="email",
                subject="🌟 VIP Exclusive: New premium service just for you",
                content="""
                <h1>🌟 VIP Exclusive for {{customer_first_name}}</h1>
                <p>As one of our most valued customers, you get first access to our new premium services!</p>
                
                <h2>Introducing: Luxury Grooming Experience</h2>
                <ul>
                    <li>Hot stone facial treatment</li>
                    <li>Premium beard oil and styling</li>
                    <li>Complimentary scalp massage</li>
                    <li>Luxury aftercare products</li>
                </ul>
                
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                    <h3>VIP Early Access Pricing</h3>
                    <p style="font-size: 20px;"><s>$150</s> <strong style="color: #dc3545;">$99</strong></p>
                    <p>Save $51 as our VIP customer!</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{booking_link}}" style="background: #6f42c1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Book VIP Service</a>
                </div>
                
                <p>Limited spots available. VIP pricing valid until {{expiry_date}}.</p>
                """,
                variables=["customer_first_name", "barbershop_name", "booking_link", "expiry_date"],
                triggers={"customer_tier": "vip", "total_spent": 500}
            ),
            
            "referral_campaign": CampaignTemplate(
                name="Refer a Friend",
                category="referral",
                type="email",
                subject="Share the love! Get $15 for every friend you refer",
                content="""
                <h1>Share the {{barbershop_name}} Love!</h1>
                <p>Hi {{customer_first_name}}, know someone who could use a fresh cut?</p>
                
                <div style="background: #d4edda; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
                    <h2>🤝 Referral Rewards</h2>
                    <p><strong>You get $15</strong> when your friend books their first appointment</p>
                    <p><strong>They get 20% off</strong> their first service</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{{referral_link}}" style="background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Refer Friends Now</a>
                </div>
                
                <p>Your referral code: <strong>{{referral_code}}</strong></p>
                <p>Share this code or use the link above to track your referrals!</p>
                """,
                variables=["customer_first_name", "barbershop_name", "referral_link", "referral_code"],
                triggers={"customer_visits": 3, "satisfaction_score": 4}
            ),
            
            # SMS Templates
            "sms_appointment_reminder": CampaignTemplate(
                name="SMS Appointment Reminder",
                category="reminder",
                type="sms",
                subject=None,
                content="Hi {{customer_first_name}}! Reminder: You have an appointment at {{barbershop_name}} tomorrow at {{appointment_time}}. Reply STOP to opt out.",
                variables=["customer_first_name", "barbershop_name", "appointment_time"],
                triggers={"hours_before_appointment": 24}
            ),
            
            "sms_birthday": CampaignTemplate(
                name="SMS Birthday Wishes",
                category="birthday",
                type="sms",
                subject=None,
                content="🎂 Happy Birthday {{customer_first_name}}! Enjoy 25% off any service this month with code BIRTHDAY{{birth_month}}. Book: {{booking_link}}",
                variables=["customer_first_name", "birth_month", "booking_link"],
                triggers={"birthday_month": True}
            ),
            
            "sms_win_back": CampaignTemplate(
                name="SMS Win Back",
                category="reactivation",
                type="sms",
                subject=None,
                content="We miss you {{customer_first_name}}! Get 20% off your next cut at {{barbershop_name}} with code WELCOME20. Book: {{booking_link}}",
                variables=["customer_first_name", "barbershop_name", "booking_link"],
                triggers={"days_since_last_visit": 60}
            )
        }

    async def create_campaign_definition(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new campaign definition"""
        try:
            # Insert campaign definition
            result = self.supabase.table('campaign_definitions').insert({
                'id': str(uuid.uuid4()),
                'barbershop_id': campaign_data['barbershop_id'],
                'campaign_name': campaign_data['campaign_name'],
                'campaign_description': campaign_data.get('campaign_description'),
                'campaign_type': campaign_data['campaign_type'],
                'campaign_category': campaign_data.get('campaign_category'),
                'target_segments': campaign_data.get('target_segments', []),
                'target_criteria': campaign_data.get('target_criteria', {}),
                'channels': campaign_data['channels'],
                'trigger_type': campaign_data['trigger_type'],
                'trigger_criteria': campaign_data.get('trigger_criteria', {}),
                'send_schedule': campaign_data.get('send_schedule', {}),
                'frequency_cap': campaign_data.get('frequency_cap', {}),
                'primary_goal': campaign_data['primary_goal'],
                'success_metrics': campaign_data.get('success_metrics', {}),
                'target_conversion_rate': campaign_data.get('target_conversion_rate'),
                'is_active': campaign_data.get('is_active', True),
                'is_template': campaign_data.get('is_template', False),
                'auto_optimize': campaign_data.get('auto_optimize', False)
            }).execute()
            
            if result.data:
                campaign = result.data[0]
                logger.info(f"Created campaign: {campaign['id']}")
                return campaign
            else:
                raise Exception("Failed to create campaign")
                
        except Exception as e:
            logger.error(f"Error creating campaign: {str(e)}")
            raise

    async def list_campaigns(self, barbershop_id: str, page: int = 1, limit: int = 20, filters: Dict[str, Any] = None) -> Dict[str, Any]:
        """List campaigns for a barbershop with pagination and filters"""
        try:
            offset = (page - 1) * limit
            
            # Build query
            query = self.supabase.table('campaign_definitions').select('*').eq('barbershop_id', barbershop_id)
            
            # Apply filters
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            
            # Get total count
            count_result = query.execute()
            total_count = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            result = query.order('created_at', desc=True).range(offset, offset + limit - 1).execute()
            
            campaigns = result.data if result.data else []
            
            # Get execution counts for each campaign
            for campaign in campaigns:
                exec_result = self.supabase.table('campaign_executions')\
                    .select('id, status')\
                    .eq('campaign_definition_id', campaign['id'])\
                    .execute()
                
                executions = exec_result.data if exec_result.data else []
                campaign['execution_count'] = len(executions)
                campaign['active_executions'] = len([e for e in executions if e['status'] in ['running', 'scheduled']])
            
            return {
                'campaigns': campaigns,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error listing campaigns: {str(e)}")
            raise

    async def get_campaign_definition(self, campaign_id: str, barbershop_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific campaign definition"""
        try:
            result = self.supabase.table('campaign_definitions')\
                .select('*')\
                .eq('id', campaign_id)\
                .eq('barbershop_id', barbershop_id)\
                .single()\
                .execute()
            
            return result.data if result.data else None
            
        except Exception as e:
            logger.error(f"Error getting campaign: {str(e)}")
            return None

    async def create_campaign_execution(self, execution_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a campaign execution record"""
        try:
            # Get target audience count
            campaign = await self.get_campaign_definition(
                execution_data['campaign_definition_id'],
                execution_data['barbershop_id']
            )
            
            if not campaign:
                raise Exception("Campaign definition not found")
            
            # Calculate target audience
            target_count = await self._calculate_target_audience_size(
                barbershop_id=execution_data['barbershop_id'],
                target_criteria=campaign.get('target_criteria', {}),
                target_segments=campaign.get('target_segments', [])
            )
            
            # Insert execution record
            result = self.supabase.table('campaign_executions').insert({
                'id': str(uuid.uuid4()),
                'barbershop_id': execution_data['barbershop_id'],
                'campaign_definition_id': execution_data['campaign_definition_id'],
                'execution_name': execution_data['execution_name'],
                'execution_type': execution_data.get('execution_type', 'standard'),
                'scheduled_start_time': execution_data.get('scheduled_start_time'),
                'scheduled_end_time': execution_data.get('scheduled_end_time'),
                'target_customer_count': target_count,
                'test_variants': execution_data.get('test_variants', {}),
                'control_percentage': execution_data.get('control_percentage', 0),
                'status': 'scheduled' if execution_data.get('scheduled_start_time') else 'running'
            }).execute()
            
            if result.data:
                execution = result.data[0]
                logger.info(f"Created campaign execution: {execution['id']}")
                return execution
            else:
                raise Exception("Failed to create campaign execution")
                
        except Exception as e:
            logger.error(f"Error creating campaign execution: {str(e)}")
            raise

    async def execute_campaign_async(self, execution_id: str, barbershop_id: str):
        """Execute a campaign asynchronously"""
        try:
            logger.info(f"Starting campaign execution: {execution_id}")
            
            # Get execution and campaign details
            execution_result = self.supabase.table('campaign_executions')\
                .select('*, campaign_definitions(*)')\
                .eq('id', execution_id)\
                .eq('barbershop_id', barbershop_id)\
                .single()\
                .execute()
            
            if not execution_result.data:
                raise Exception("Campaign execution not found")
            
            execution = execution_result.data
            campaign = execution['campaign_definitions']
            
            # Update status to running
            self.supabase.table('campaign_executions')\
                .update({'status': 'running', 'actual_start_time': datetime.utcnow().isoformat()})\
                .eq('id', execution_id)\
                .execute()
            
            # Get target customers
            customers = await self._get_target_customers(
                barbershop_id=barbershop_id,
                target_criteria=campaign.get('target_criteria', {}),
                target_segments=campaign.get('target_segments', [])
            )
            
            # Update eligible customer count
            self.supabase.table('campaign_executions')\
                .update({'eligible_customer_count': len(customers)})\
                .eq('id', execution_id)\
                .execute()
            
            # Send messages to customers
            sent_count = 0
            delivered_count = 0
            
            for customer in customers:
                try:
                    # Check frequency cap
                    if await self._check_frequency_cap(
                        customer['id'], 
                        campaign.get('frequency_cap', {}),
                        barbershop_id
                    ):
                        continue  # Skip this customer due to frequency cap
                    
                    # Send messages through configured channels
                    channels = campaign.get('channels', {})
                    
                    for channel_type, channel_config in channels.items():
                        if channel_type == 'email' and customer.get('email'):
                            success = await self._send_email_message(
                                customer=customer,
                                campaign=campaign,
                                execution=execution,
                                channel_config=channel_config,
                                barbershop_id=barbershop_id
                            )
                            if success:
                                sent_count += 1
                                delivered_count += 1
                                
                        elif channel_type == 'sms' and customer.get('phone'):
                            success = await self._send_sms_message(
                                customer=customer,
                                campaign=campaign,
                                execution=execution,
                                channel_config=channel_config,
                                barbershop_id=barbershop_id
                            )
                            if success:
                                sent_count += 1
                                delivered_count += 1
                    
                    # Rate limiting
                    await asyncio.sleep(0.1)  # Prevent overwhelming services
                    
                except Exception as e:
                    logger.error(f"Error sending to customer {customer['id']}: {str(e)}")
                    continue
            
            # Update final metrics
            self.supabase.table('campaign_executions')\
                .update({
                    'status': 'completed',
                    'actual_end_time': datetime.utcnow().isoformat(),
                    'messages_sent': sent_count,
                    'messages_delivered': delivered_count
                })\
                .eq('id', execution_id)\
                .execute()
            
            logger.info(f"Campaign execution completed: {execution_id}, sent: {sent_count}")
            
        except Exception as e:
            logger.error(f"Error executing campaign {execution_id}: {str(e)}")
            
            # Update status to failed
            self.supabase.table('campaign_executions')\
                .update({
                    'status': 'failed',
                    'failure_reason': str(e),
                    'actual_end_time': datetime.utcnow().isoformat()
                })\
                .eq('id', execution_id)\
                .execute()

    async def _calculate_target_audience_size(self, barbershop_id: str, target_criteria: Dict[str, Any], target_segments: List[str]) -> int:
        """Calculate the size of target audience"""
        try:
            query = self.supabase.table('customers').select('id', count='exact').eq('barbershop_id', barbershop_id)
            
            # Apply criteria filters
            if target_criteria:
                # Add filters based on criteria
                # This is a simplified version - you'd implement more complex logic based on your criteria structure
                pass
            
            # Apply segment filters
            if target_segments:
                # Get customers in specified segments
                segment_result = self.supabase.table('customer_segment_assignments')\
                    .select('customer_id')\
                    .eq('barbershop_id', barbershop_id)\
                    .in_('segment_id', target_segments)\
                    .eq('is_active', True)\
                    .execute()
                
                if segment_result.data:
                    customer_ids = [assignment['customer_id'] for assignment in segment_result.data]
                    query = query.in_('id', customer_ids)
            
            result = query.execute()
            return result.count if hasattr(result, 'count') else len(result.data or [])
            
        except Exception as e:
            logger.error(f"Error calculating target audience size: {str(e)}")
            return 0

    async def _get_target_customers(self, barbershop_id: str, target_criteria: Dict[str, Any], target_segments: List[str]) -> List[Dict[str, Any]]:
        """Get list of target customers for campaign"""
        try:
            # Start with base customer query
            query = self.supabase.table('customers')\
                .select('id, email, phone, first_name, last_name, created_at')\
                .eq('barbershop_id', barbershop_id)
            
            # Apply segment filters if specified
            if target_segments:
                segment_result = self.supabase.table('customer_segment_assignments')\
                    .select('customer_id')\
                    .eq('barbershop_id', barbershop_id)\
                    .in_('segment_id', target_segments)\
                    .eq('is_active', True)\
                    .execute()
                
                if segment_result.data:
                    customer_ids = [assignment['customer_id'] for assignment in segment_result.data]
                    query = query.in_('id', customer_ids)
                else:
                    return []  # No customers in specified segments
            
            # Apply additional criteria filters
            if target_criteria:
                # Example criteria processing
                if 'last_visit_days' in target_criteria:
                    days_threshold = target_criteria['last_visit_days']
                    cutoff_date = (datetime.now() - timedelta(days=days_threshold['min'])).date()
                    # You would need to join with appointments table here
                
                if 'total_spent_min' in target_criteria:
                    min_spent = target_criteria['total_spent_min']
                    # You would filter by customer lifetime value
            
            result = query.execute()
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error getting target customers: {str(e)}")
            return []

    async def _check_frequency_cap(self, customer_id: str, frequency_cap: Dict[str, Any], barbershop_id: str) -> bool:
        """Check if customer has hit frequency cap"""
        if not frequency_cap:
            return False
        
        try:
            # Get recent communications for this customer
            time_window = frequency_cap.get('time_window_days', 7)
            max_messages = frequency_cap.get('max_messages', 5)
            
            cutoff_date = datetime.now() - timedelta(days=time_window)
            
            result = self.supabase.table('customer_communications')\
                .select('id', count='exact')\
                .eq('customer_id', customer_id)\
                .eq('barbershop_id', barbershop_id)\
                .gte('created_at', cutoff_date.isoformat())\
                .execute()
            
            recent_count = result.count if hasattr(result, 'count') else len(result.data or [])
            return recent_count >= max_messages
            
        except Exception as e:
            logger.error(f"Error checking frequency cap: {str(e)}")
            return False

    async def _send_email_message(self, customer: Dict[str, Any], campaign: Dict[str, Any], 
                                 execution: Dict[str, Any], channel_config: Dict[str, Any], barbershop_id: str) -> bool:
        """Send email message to customer"""
        try:
            # Get barbershop details for personalization
            barbershop_result = self.supabase.table('barbershops')\
                .select('name, address, phone')\
                .eq('id', barbershop_id)\
                .single()\
                .execute()
            
            barbershop = barbershop_result.data if barbershop_result.data else {}
            
            # Personalize content
            subject = self._personalize_content(
                channel_config.get('subject', campaign['campaign_name']),
                customer,
                barbershop
            )
            
            content = self._personalize_content(
                channel_config.get('message', ''),
                customer,
                barbershop
            )
            
            # Send email
            message_id = await self.email_service.send_campaign_email(
                to_email=customer['email'],
                to_name=f"{customer.get('first_name', '')} {customer.get('last_name', '')}".strip(),
                subject=subject,
                html_content=content,
                campaign_id=campaign['id']
            )
            
            if message_id:
                # Record communication
                await self._record_communication(
                    barbershop_id=barbershop_id,
                    customer_id=customer['id'],
                    campaign_execution_id=execution['id'],
                    channel='email',
                    subject=subject,
                    content=content,
                    external_message_id=message_id,
                    status='sent'
                )
                
                # Record campaign response
                await self._record_campaign_response(
                    barbershop_id=barbershop_id,
                    campaign_execution_id=execution['id'],
                    customer_id=customer['id'],
                    channel='email',
                    message_id=message_id,
                    subject_line=subject
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending email to {customer['email']}: {str(e)}")
            return False

    async def _send_sms_message(self, customer: Dict[str, Any], campaign: Dict[str, Any], 
                               execution: Dict[str, Any], channel_config: Dict[str, Any], barbershop_id: str) -> bool:
        """Send SMS message to customer"""
        try:
            # Get barbershop details for personalization
            barbershop_result = self.supabase.table('barbershops')\
                .select('name, address, phone')\
                .eq('id', barbershop_id)\
                .single()\
                .execute()
            
            barbershop = barbershop_result.data if barbershop_result.data else {}
            
            # Personalize content
            content = self._personalize_content(
                channel_config.get('message', ''),
                customer,
                barbershop
            )
            
            # Send SMS
            message_id = await self.sms_service.send_campaign_sms(
                to_phone=customer['phone'],
                message=content,
                barbershop_id=barbershop_id
            )
            
            if message_id:
                # Record communication
                await self._record_communication(
                    barbershop_id=barbershop_id,
                    customer_id=customer['id'],
                    campaign_execution_id=execution['id'],
                    channel='sms',
                    subject=None,
                    content=content,
                    external_message_id=message_id,
                    status='sent'
                )
                
                # Record campaign response
                await self._record_campaign_response(
                    barbershop_id=barbershop_id,
                    campaign_execution_id=execution['id'],
                    customer_id=customer['id'],
                    channel='sms',
                    message_id=message_id
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error sending SMS to {customer['phone']}: {str(e)}")
            return False

    def _personalize_content(self, content: str, customer: Dict[str, Any], barbershop: Dict[str, Any]) -> str:
        """Personalize campaign content with customer and barbershop data"""
        try:
            # Customer personalization
            content = content.replace('{{customer_first_name}}', customer.get('first_name', 'Valued Customer'))
            content = content.replace('{{customer_last_name}}', customer.get('last_name', ''))
            content = content.replace('{{customer_email}}', customer.get('email', ''))
            
            # Barbershop personalization
            content = content.replace('{{barbershop_name}}', barbershop.get('name', 'Our Barbershop'))
            content = content.replace('{{barbershop_address}}', barbershop.get('address', ''))
            content = content.replace('{{barbershop_phone}}', barbershop.get('phone', ''))
            
            # Dynamic links (you'd implement these based on your frontend routing)
            content = content.replace('{{booking_link}}', f"https://yourdomain.com/book?shop={barbershop.get('id', '')}")
            content = content.replace('{{app_download_link}}', "https://yourdomain.com/download")
            
            # Date/time personalization
            content = content.replace('{{current_date}}', datetime.now().strftime('%B %d, %Y'))
            content = content.replace('{{current_year}}', str(datetime.now().year))
            
            # Birthday specific
            if customer.get('date_of_birth'):
                birth_date = datetime.strptime(customer['date_of_birth'], '%Y-%m-%d')
                content = content.replace('{{birth_month}}', str(birth_date.month).zfill(2))
            
            return content
            
        except Exception as e:
            logger.error(f"Error personalizing content: {str(e)}")
            return content

    async def _record_communication(self, barbershop_id: str, customer_id: str, campaign_execution_id: str,
                                   channel: str, subject: Optional[str], content: str, 
                                   external_message_id: str, status: str):
        """Record communication in customer_communications table"""
        try:
            self.supabase.table('customer_communications').insert({
                'id': str(uuid.uuid4()),
                'barbershop_id': barbershop_id,
                'customer_id': customer_id,
                'communication_type': channel,
                'direction': 'outbound',
                'subject': subject,
                'message_content': content,
                'category': 'promotional',
                'campaign_execution_id': campaign_execution_id,
                'is_automated': True,
                'status': status,
                'external_message_id': external_message_id,
                'sent_at': datetime.utcnow().isoformat()
            }).execute()
            
        except Exception as e:
            logger.error(f"Error recording communication: {str(e)}")

    async def _record_campaign_response(self, barbershop_id: str, campaign_execution_id: str,
                                       customer_id: str, channel: str, message_id: str,
                                       subject_line: Optional[str] = None):
        """Record campaign response tracking"""
        try:
            self.supabase.table('campaign_responses').insert({
                'id': str(uuid.uuid4()),
                'barbershop_id': barbershop_id,
                'campaign_execution_id': campaign_execution_id,
                'customer_id': customer_id,
                'channel': channel,
                'message_id': message_id,
                'sent_at': datetime.utcnow().isoformat(),
                'subject_line': subject_line
            }).execute()
            
        except Exception as e:
            logger.error(f"Error recording campaign response: {str(e)}")

    async def get_campaign_performance(self, campaign_id: str, barbershop_id: str,
                                     execution_id: Optional[str] = None,
                                     date_from: Optional[date] = None,
                                     date_to: Optional[date] = None) -> Dict[str, Any]:
        """Get campaign performance metrics"""
        try:
            # Base query for executions
            exec_query = self.supabase.table('campaign_executions')\
                .select('*')\
                .eq('campaign_definition_id', campaign_id)\
                .eq('barbershop_id', barbershop_id)
            
            if execution_id:
                exec_query = exec_query.eq('id', execution_id)
            
            if date_from:
                exec_query = exec_query.gte('created_at', date_from.isoformat())
            
            if date_to:
                exec_query = exec_query.lte('created_at', date_to.isoformat())
            
            executions_result = exec_query.execute()
            executions = executions_result.data if executions_result.data else []
            
            # Calculate aggregate metrics
            total_sent = sum(e.get('messages_sent', 0) for e in executions)
            total_delivered = sum(e.get('messages_delivered', 0) for e in executions)
            total_opened = sum(e.get('messages_opened', 0) for e in executions)
            total_clicked = sum(e.get('messages_clicked', 0) for e in executions)
            total_conversions = sum(e.get('conversions', 0) for e in executions)
            total_revenue = sum(e.get('revenue_generated', 0) for e in executions)
            
            # Calculate rates
            delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
            open_rate = (total_opened / total_delivered * 100) if total_delivered > 0 else 0
            click_rate = (total_clicked / total_opened * 100) if total_opened > 0 else 0
            conversion_rate = (total_conversions / total_clicked * 100) if total_clicked > 0 else 0
            
            # Get detailed response data
            responses_query = self.supabase.table('campaign_responses')\
                .select('*')\
                .eq('barbershop_id', barbershop_id)
            
            if execution_id:
                responses_query = responses_query.eq('campaign_execution_id', execution_id)
            else:
                execution_ids = [e['id'] for e in executions]
                if execution_ids:
                    responses_query = responses_query.in_('campaign_execution_id', execution_ids)
            
            responses_result = responses_query.execute()
            responses = responses_result.data if responses_result.data else []
            
            return {
                'overview': {
                    'total_executions': len(executions),
                    'messages_sent': total_sent,
                    'messages_delivered': total_delivered,
                    'messages_opened': total_opened,
                    'messages_clicked': total_clicked,
                    'conversions': total_conversions,
                    'revenue_generated': total_revenue,
                    'delivery_rate': round(delivery_rate, 2),
                    'open_rate': round(open_rate, 2),
                    'click_rate': round(click_rate, 2),
                    'conversion_rate': round(conversion_rate, 2)
                },
                'executions': executions,
                'responses': responses,
                'channel_breakdown': self._calculate_channel_breakdown(responses),
                'time_series': self._calculate_time_series_data(responses)
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign performance: {str(e)}")
            raise

    def _calculate_channel_breakdown(self, responses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate performance breakdown by channel"""
        channels = {}
        
        for response in responses:
            channel = response.get('channel', 'unknown')
            if channel not in channels:
                channels[channel] = {
                    'sent': 0,
                    'delivered': 0,
                    'opened': 0,
                    'clicked': 0,
                    'conversions': 0
                }
            
            channels[channel]['sent'] += 1
            if response.get('delivered_at'):
                channels[channel]['delivered'] += 1
            if response.get('opened_at'):
                channels[channel]['opened'] += 1
            if response.get('clicked_at'):
                channels[channel]['clicked'] += 1
            if response.get('converted'):
                channels[channel]['conversions'] += 1
        
        return channels

    def _calculate_time_series_data(self, responses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculate time series data for charts"""
        daily_data = {}
        
        for response in responses:
            sent_date = datetime.fromisoformat(response['sent_at']).date()
            date_str = sent_date.isoformat()
            
            if date_str not in daily_data:
                daily_data[date_str] = {
                    'date': date_str,
                    'sent': 0,
                    'delivered': 0,
                    'opened': 0,
                    'clicked': 0,
                    'conversions': 0
                }
            
            daily_data[date_str]['sent'] += 1
            if response.get('delivered_at'):
                daily_data[date_str]['delivered'] += 1
            if response.get('opened_at'):
                daily_data[date_str]['opened'] += 1
            if response.get('clicked_at'):
                daily_data[date_str]['clicked'] += 1
            if response.get('converted'):
                daily_data[date_str]['conversions'] += 1
        
        return sorted(daily_data.values(), key=lambda x: x['date'])

    async def pause_campaign(self, campaign_id: str, barbershop_id: str) -> Dict[str, Any]:
        """Pause running campaign executions"""
        try:
            # Update all running executions for this campaign
            result = self.supabase.table('campaign_executions')\
                .update({'status': 'paused'})\
                .eq('campaign_definition_id', campaign_id)\
                .eq('barbershop_id', barbershop_id)\
                .eq('status', 'running')\
                .execute()
            
            affected_count = len(result.data) if result.data else 0
            
            return {
                'paused_executions': affected_count,
                'message': f'Paused {affected_count} running executions'
            }
            
        except Exception as e:
            logger.error(f"Error pausing campaign: {str(e)}")
            raise

    async def resume_campaign(self, campaign_id: str, barbershop_id: str) -> Dict[str, Any]:
        """Resume paused campaign executions"""
        try:
            # Update all paused executions for this campaign
            result = self.supabase.table('campaign_executions')\
                .update({'status': 'running'})\
                .eq('campaign_definition_id', campaign_id)\
                .eq('barbershop_id', barbershop_id)\
                .eq('status', 'paused')\
                .execute()
            
            affected_count = len(result.data) if result.data else 0
            
            return {
                'resumed_executions': affected_count,
                'message': f'Resumed {affected_count} paused executions'
            }
            
        except Exception as e:
            logger.error(f"Error resuming campaign: {str(e)}")
            raise

    async def get_campaign_templates(self, category: Optional[str] = None, campaign_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get available campaign templates"""
        templates = []
        
        for template_id, template in self.templates.items():
            if category and template.category != category:
                continue
            if campaign_type and template.type != campaign_type:
                continue
            
            templates.append({
                'id': template_id,
                'name': template.name,
                'category': template.category,
                'type': template.type,
                'subject': template.subject,
                'content': template.content,
                'variables': template.variables,
                'triggers': template.triggers
            })
        
        return templates

    async def setup_automated_campaigns(self, barbershop_id: str, campaign_types: List[str],
                                       welcome_config: Optional[Dict[str, Any]] = None,
                                       birthday_config: Optional[Dict[str, Any]] = None,
                                       win_back_config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Set up automated campaigns"""
        created_campaigns = []
        
        try:
            for campaign_type in campaign_types:
                if campaign_type == 'welcome':
                    campaigns = await self._create_welcome_series(barbershop_id, welcome_config or {})
                    created_campaigns.extend(campaigns)
                    
                elif campaign_type == 'birthday':
                    campaign = await self._create_birthday_campaign(barbershop_id, birthday_config or {})
                    created_campaigns.append(campaign)
                    
                elif campaign_type == 'win_back':
                    campaign = await self._create_win_back_campaign(barbershop_id, win_back_config or {})
                    created_campaigns.append(campaign)
            
            return {
                'created_campaigns': created_campaigns,
                'message': f'Successfully created {len(created_campaigns)} automated campaigns'
            }
            
        except Exception as e:
            logger.error(f"Error setting up automated campaigns: {str(e)}")
            raise

    async def _create_welcome_series(self, barbershop_id: str, config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create welcome email series"""
        campaigns = []
        
        # Welcome Email 1 - Immediate
        welcome_1 = await self.create_campaign_definition({
            'barbershop_id': barbershop_id,
            'campaign_name': 'Welcome Series - Email 1',
            'campaign_description': 'Initial welcome email sent immediately after signup',
            'campaign_type': 'email',
            'campaign_category': 'welcome',
            'target_criteria': {'new_customer': True, 'days_since_signup': 0},
            'channels': {
                'email': {
                    'subject': self.templates['welcome_series_1'].subject,
                    'message': self.templates['welcome_series_1'].content,
                    'personalization': True
                }
            },
            'trigger_type': 'behavioral',
            'trigger_criteria': {'event': 'customer_signup'},
            'primary_goal': 'customer_onboarding',
            'is_active': True
        })
        campaigns.append(welcome_1)
        
        # Welcome Email 2 - Day 3
        welcome_2 = await self.create_campaign_definition({
            'barbershop_id': barbershop_id,
            'campaign_name': 'Welcome Series - Email 2',
            'campaign_description': 'Booking encouragement email sent 3 days after signup',
            'campaign_type': 'email',
            'campaign_category': 'welcome',
            'target_criteria': {'new_customer': True, 'days_since_signup': 3, 'has_no_appointments': True},
            'channels': {
                'email': {
                    'subject': self.templates['welcome_series_2'].subject,
                    'message': self.templates['welcome_series_2'].content,
                    'personalization': True
                }
            },
            'trigger_type': 'scheduled',
            'trigger_criteria': {'days_after_signup': 3},
            'primary_goal': 'first_appointment_booking',
            'is_active': True
        })
        campaigns.append(welcome_2)
        
        return campaigns

    async def _create_birthday_campaign(self, barbershop_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create automated birthday campaign"""
        return await self.create_campaign_definition({
            'barbershop_id': barbershop_id,
            'campaign_name': 'Automated Birthday Campaign',
            'campaign_description': 'Monthly birthday wishes with special offers',
            'campaign_type': 'multi_channel',
            'campaign_category': 'birthday',
            'target_criteria': {'has_birthday_this_month': True},
            'channels': {
                'email': {
                    'subject': self.templates['birthday_campaign'].subject,
                    'message': self.templates['birthday_campaign'].content,
                    'personalization': True
                },
                'sms': {
                    'message': self.templates['sms_birthday'].content,
                    'personalization': True
                }
            },
            'trigger_type': 'scheduled',
            'trigger_criteria': {'monthly_birthday_check': True},
            'send_schedule': {'monthly': True, 'day_of_month': 1},
            'primary_goal': 'customer_retention',
            'is_active': True
        })

    async def _create_win_back_campaign(self, barbershop_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """Create automated win-back campaign"""
        return await self.create_campaign_definition({
            'barbershop_id': barbershop_id,
            'campaign_name': 'Automated Win-Back Campaign',
            'campaign_description': 'Re-engage customers who haven\'t visited in 60+ days',
            'campaign_type': 'multi_channel',
            'campaign_category': 'reactivation',
            'target_criteria': {'days_since_last_visit': {'min': 60, 'max': 180}},
            'channels': {
                'email': {
                    'subject': self.templates['win_back_campaign'].subject,
                    'message': self.templates['win_back_campaign'].content,
                    'personalization': True
                },
                'sms': {
                    'message': self.templates['sms_win_back'].content,
                    'personalization': True
                }
            },
            'trigger_type': 'behavioral',
            'trigger_criteria': {'days_since_last_visit': 60},
            'frequency_cap': {'time_window_days': 30, 'max_messages': 1},
            'primary_goal': 'customer_reactivation',
            'is_active': True
        })

    async def get_campaign_responses(self, campaign_id: str, barbershop_id: str,
                                   execution_id: Optional[str] = None,
                                   page: int = 1, limit: int = 50,
                                   response_type: Optional[str] = None) -> Dict[str, Any]:
        """Get campaign responses with pagination"""
        try:
            offset = (page - 1) * limit
            
            # Get executions for this campaign
            if execution_id:
                execution_ids = [execution_id]
            else:
                exec_result = self.supabase.table('campaign_executions')\
                    .select('id')\
                    .eq('campaign_definition_id', campaign_id)\
                    .eq('barbershop_id', barbershop_id)\
                    .execute()
                
                execution_ids = [e['id'] for e in (exec_result.data or [])]
            
            if not execution_ids:
                return {'responses': [], 'pagination': {'page': page, 'limit': limit, 'total': 0, 'pages': 0}}
            
            # Build query
            query = self.supabase.table('campaign_responses')\
                .select('*, customers(first_name, last_name, email)')\
                .eq('barbershop_id', barbershop_id)\
                .in_('campaign_execution_id', execution_ids)
            
            if response_type:
                query = query.eq('response_type', response_type)
            
            # Get total count
            count_result = query.execute()
            total_count = len(count_result.data) if count_result.data else 0
            
            # Get paginated results
            result = query.order('sent_at', desc=True).range(offset, offset + limit - 1).execute()
            
            responses = result.data if result.data else []
            
            return {
                'responses': responses,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting campaign responses: {str(e)}")
            raise

    async def send_test_campaign(self, campaign_definition_id: str, barbershop_id: str,
                                test_email: Optional[str] = None, test_phone: Optional[str] = None,
                                channel: str = 'email') -> Dict[str, Any]:
        """Send a test campaign to specified contact"""
        try:
            # Get campaign definition
            campaign = await self.get_campaign_definition(campaign_definition_id, barbershop_id)
            if not campaign:
                raise Exception("Campaign not found")
            
            # Get barbershop details
            barbershop_result = self.supabase.table('barbershops')\
                .select('name, address, phone')\
                .eq('id', barbershop_id)\
                .single()\
                .execute()
            
            barbershop = barbershop_result.data if barbershop_result.data else {}
            
            # Create test customer data
            test_customer = {
                'id': 'test-customer',
                'first_name': 'Test',
                'last_name': 'Customer',
                'email': test_email,
                'phone': test_phone
            }
            
            # Get channel configuration
            channels = campaign.get('channels', {})
            
            if channel == 'email' and test_email and 'email' in channels:
                # Send test email
                channel_config = channels['email']
                
                subject = self._personalize_content(
                    channel_config.get('subject', 'Test Campaign'),
                    test_customer,
                    barbershop
                )
                
                content = self._personalize_content(
                    channel_config.get('message', ''),
                    test_customer,
                    barbershop
                )
                
                # Add test indicator to subject
                subject = f"[TEST] {subject}"
                
                message_id = await self.email_service.send_campaign_email(
                    to_email=test_email,
                    to_name="Test Customer",
                    subject=subject,
                    html_content=content,
                    campaign_id=campaign['id']
                )
                
                return {
                    'success': True,
                    'channel': 'email',
                    'recipient': test_email,
                    'message_id': message_id,
                    'subject': subject
                }
                
            elif channel == 'sms' and test_phone and 'sms' in channels:
                # Send test SMS
                channel_config = channels['sms']
                
                content = self._personalize_content(
                    channel_config.get('message', ''),
                    test_customer,
                    barbershop
                )
                
                # Add test indicator
                content = f"[TEST] {content}"
                
                message_id = await self.sms_service.send_campaign_sms(
                    to_phone=test_phone,
                    message=content,
                    barbershop_id=barbershop_id
                )
                
                return {
                    'success': True,
                    'channel': 'sms',
                    'recipient': test_phone,
                    'message_id': message_id,
                    'content': content
                }
            
            else:
                raise Exception(f"Invalid channel or missing recipient for {channel}")
                
        except Exception as e:
            logger.error(f"Error sending test campaign: {str(e)}")
            raise

    async def get_campaigns_overview(self, barbershop_id: str, 
                                   date_from: Optional[date] = None,
                                   date_to: Optional[date] = None) -> Dict[str, Any]:
        """Get overall campaign analytics overview"""
        try:
            # Set default date range if not provided
            if not date_to:
                date_to = date.today()
            if not date_from:
                date_from = date_to - timedelta(days=30)
            
            # Get campaign executions in date range
            exec_result = self.supabase.table('campaign_executions')\
                .select('*')\
                .eq('barbershop_id', barbershop_id)\
                .gte('created_at', date_from.isoformat())\
                .lte('created_at', date_to.isoformat())\
                .execute()
            
            executions = exec_result.data if exec_result.data else []
            
            # Calculate aggregate metrics
            total_campaigns = len(executions)
            total_sent = sum(e.get('messages_sent', 0) for e in executions)
            total_delivered = sum(e.get('messages_delivered', 0) for e in executions)
            total_opened = sum(e.get('messages_opened', 0) for e in executions)
            total_clicked = sum(e.get('messages_clicked', 0) for e in executions)
            total_conversions = sum(e.get('conversions', 0) for e in executions)
            total_revenue = sum(e.get('revenue_generated', 0) for e in executions)
            
            # Calculate performance by status
            status_breakdown = {}
            for execution in executions:
                status = execution.get('status', 'unknown')
                if status not in status_breakdown:
                    status_breakdown[status] = 0
                status_breakdown[status] += 1
            
            # Get top performing campaigns
            top_campaigns = sorted(
                executions,
                key=lambda x: x.get('conversion_rate', 0),
                reverse=True
            )[:5]
            
            return {
                'date_range': {
                    'from': date_from.isoformat(),
                    'to': date_to.isoformat()
                },
                'summary': {
                    'total_campaigns': total_campaigns,
                    'messages_sent': total_sent,
                    'messages_delivered': total_delivered,
                    'messages_opened': total_opened,
                    'messages_clicked': total_clicked,
                    'conversions': total_conversions,
                    'revenue_generated': total_revenue,
                    'avg_delivery_rate': (total_delivered / total_sent * 100) if total_sent > 0 else 0,
                    'avg_open_rate': (total_opened / total_delivered * 100) if total_delivered > 0 else 0,
                    'avg_click_rate': (total_clicked / total_opened * 100) if total_opened > 0 else 0,
                    'avg_conversion_rate': (total_conversions / total_clicked * 100) if total_clicked > 0 else 0
                },
                'status_breakdown': status_breakdown,
                'top_campaigns': top_campaigns
            }
            
        except Exception as e:
            logger.error(f"Error getting campaigns overview: {str(e)}")
            raise

    async def get_customer_segments(self, barbershop_id: str) -> List[Dict[str, Any]]:
        """Get customer segments for targeting"""
        try:
            result = self.supabase.table('customer_segments')\
                .select('*')\
                .eq('barbershop_id', barbershop_id)\
                .eq('is_active', True)\
                .order('segment_name')\
                .execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            logger.error(f"Error getting customer segments: {str(e)}")
            raise

    async def clone_campaign(self, campaign_id: str, barbershop_id: str, new_name: str) -> Dict[str, Any]:
        """Clone an existing campaign"""
        try:
            # Get original campaign
            original = await self.get_campaign_definition(campaign_id, barbershop_id)
            if not original:
                raise Exception("Campaign not found")
            
            # Create new campaign with modified data
            clone_data = original.copy()
            clone_data['campaign_name'] = new_name
            clone_data['is_active'] = False  # Start as inactive
            
            # Remove fields that shouldn't be copied
            for field in ['id', 'created_at', 'updated_at']:
                clone_data.pop(field, None)
            
            # Create the clone
            cloned_campaign = await self.create_campaign_definition(clone_data)
            
            return cloned_campaign
            
        except Exception as e:
            logger.error(f"Error cloning campaign: {str(e)}")
            raise

    async def delete_campaign(self, campaign_id: str, barbershop_id: str):
        """Delete a campaign (only if not executed)"""
        try:
            # Check if campaign has any executions
            exec_result = self.supabase.table('campaign_executions')\
                .select('id')\
                .eq('campaign_definition_id', campaign_id)\
                .eq('barbershop_id', barbershop_id)\
                .execute()
            
            if exec_result.data:
                raise Exception("Cannot delete campaign that has been executed")
            
            # Delete the campaign
            self.supabase.table('campaign_definitions')\
                .delete()\
                .eq('id', campaign_id)\
                .eq('barbershop_id', barbershop_id)\
                .execute()
            
            logger.info(f"Deleted campaign: {campaign_id}")
            
        except Exception as e:
            logger.error(f"Error deleting campaign: {str(e)}")
            raise