#!/usr/bin/env python3
"""
Email Marketing Agent - Cost-Effective Email Campaigns
Using SendGrid API for high margins vs traditional email platforms
"""

import sendgrid
from sendgrid.helpers.mail import Mail, From, To, Subject, Content, Email
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
import os

class EmailPlan(Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"

@dataclass
class EmailPricingTier:
    """Email marketing pricing tier configuration"""
    plan_name: str
    monthly_price: float
    included_emails: int
    cost_per_thousand: float
    overage_rate: float
    competitor_equivalent: float
    our_cost: float
    profit_margin: float

class EmailMarketingAgent:
    """
    Email Marketing Agent with competitive pricing and high margins
    Using SendGrid API directly for 90%+ cost savings vs Mailchimp/Klaviyo
    """
    
    def __init__(self):
        self.sendgrid_client = sendgrid.SendGridAPIClient(
            api_key=os.environ.get('SENDGRID_API_KEY')
        )
        self.pricing_tiers = self._initialize_pricing_tiers()
        self.sendgrid_cost_per_email = 0.001  # $0.10 per 100 emails = $0.001 per email
        
    def _initialize_pricing_tiers(self) -> Dict[EmailPlan, EmailPricingTier]:
        """Initialize competitive email pricing tiers"""
        return {
            EmailPlan.STARTER: EmailPricingTier(
                plan_name="Email Starter",
                monthly_price=19.00,  # vs Mailchimp $39
                included_emails=5000,
                cost_per_thousand=3.80,  # $19/5k emails
                overage_rate=0.025,  # $2.50 per 100 additional emails
                competitor_equivalent=39.00,  # Mailchimp equivalent
                our_cost=5.00,  # 5k emails * $0.001
                profit_margin=2.80  # 280% margin
            ),
            EmailPlan.PROFESSIONAL: EmailPricingTier(
                plan_name="Email Professional", 
                monthly_price=29.00,  # vs Mailchimp $59
                included_emails=10000,
                cost_per_thousand=2.90,  # $29/10k emails
                overage_rate=0.025,
                competitor_equivalent=59.00,
                our_cost=10.00,  # 10k emails * $0.001
                profit_margin=1.90  # 190% margin
            ),
            EmailPlan.BUSINESS: EmailPricingTier(
                plan_name="Email Business",
                monthly_price=49.00,  # vs Mailchimp $99
                included_emails=25000,
                cost_per_thousand=1.96,  # $49/25k emails
                overage_rate=0.025,
                competitor_equivalent=99.00,
                our_cost=25.00,  # 25k emails * $0.001
                profit_margin=0.96  # 96% margin
            ),
            EmailPlan.ENTERPRISE: EmailPricingTier(
                plan_name="Email Enterprise",
                monthly_price=89.00,  # vs Mailchimp $299
                included_emails=100000,
                cost_per_thousand=0.89,  # $89/100k emails
                overage_rate=0.025,
                competitor_equivalent=299.00,
                our_cost=100.00,  # 100k emails * $0.001
                profit_margin=-0.12  # Loss leader for large volume
            )
        }
    
    async def send_email_campaign(self, 
                                campaign_data: Dict[str, Any],
                                shop_id: str,
                                plan: EmailPlan) -> Dict[str, Any]:
        """Send email campaign with usage tracking and billing"""
        
        try:
            # Validate plan and usage limits
            plan_config = self.pricing_tiers[plan]
            current_usage = await self._get_monthly_email_usage(shop_id)
            
            recipient_count = len(campaign_data['recipients'])
            total_usage = current_usage + recipient_count
            
            # Calculate billing
            billing_info = self._calculate_email_billing(plan_config, current_usage, recipient_count)
            
            # Check if within limits or calculate overages
            if total_usage > plan_config.included_emails:
                overage_emails = total_usage - plan_config.included_emails
                overage_cost = (overage_emails / 100) * plan_config.overage_rate
                billing_info['overage_charges'] = overage_cost
            
            # Send emails via SendGrid
            results = []
            for recipient in campaign_data['recipients']:
                result = await self._send_individual_email(
                    recipient=recipient,
                    subject=campaign_data['subject'],
                    content=campaign_data['content'],
                    from_email=campaign_data.get('from_email', f"noreply@{shop_id}.com"),
                    from_name=campaign_data.get('from_name', 'Your Barbershop'),
                    shop_id=shop_id
                )
                results.append(result)
                
                # Small delay to respect rate limits
                await asyncio.sleep(0.1)
            
            # Update usage tracking
            await self._update_email_usage_tracking(shop_id, recipient_count, billing_info)
            
            # Calculate ROI metrics
            roi_metrics = await self._calculate_email_roi(campaign_data, results, billing_info)
            
            return {
                'success': True,
                'campaign_id': f"email_{shop_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'emails_sent': len([r for r in results if r['success']]),
                'emails_failed': len([r for r in results if not r['success']]),
                'billing_info': billing_info,
                'roi_metrics': roi_metrics,
                'cost_comparison': {
                    'our_cost': billing_info['actual_cost'],
                    'mailchimp_equivalent': plan_config.competitor_equivalent,
                    'customer_savings': plan_config.competitor_equivalent - plan_config.monthly_price,
                    'our_profit_margin': f"{plan_config.profit_margin:.0%}"
                }
            }
            
        except Exception as e:
            logging.error(f"Email campaign failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'campaign_id': None
            }
    
    async def _send_individual_email(self, 
                                   recipient: Dict[str, Any],
                                   subject: str,
                                   content: str,
                                   from_email: str,
                                   from_name: str,
                                   shop_id: str) -> Dict[str, Any]:
        """Send individual email via SendGrid"""
        try:
            # Create email message
            message = Mail(
                from_email=From(from_email, from_name),
                to_emails=To(recipient['email'], recipient.get('name')),
                subject=Subject(subject),
                html_content=Content("text/html", content)
            )
            
            # Add custom headers for tracking
            message.custom_args = {
                'shop_id': shop_id,
                'service': '6FB_Email_Agent',
                'campaign_type': 'marketing'
            }
            
            # Send via SendGrid
            response = self.sendgrid_client.send(message)
            
            return {
                'success': True,
                'email': recipient['email'],
                'status_code': response.status_code,
                'cost': self.sendgrid_cost_per_email
            }
            
        except Exception as e:
            logging.error(f"Failed to send email to {recipient['email']}: {str(e)}")
            return {
                'success': False,
                'email': recipient['email'],
                'error': str(e),
                'cost': 0
            }
    
    def _calculate_email_billing(self, plan_config: EmailPricingTier, current_usage: int, new_emails: int) -> Dict[str, Any]:
        """Calculate billing for email campaign"""
        
        # Base monthly cost
        base_cost = plan_config.monthly_price
        
        # Calculate actual SendGrid costs
        sendgrid_cost = new_emails * self.sendgrid_cost_per_email
        
        # Calculate profit
        profit = base_cost - sendgrid_cost
        profit_margin = (profit / sendgrid_cost) if sendgrid_cost > 0 else 0
        
        return {
            'plan': plan_config.plan_name,
            'base_monthly_price': base_cost,
            'emails_included': plan_config.included_emails,
            'current_usage': current_usage,
            'new_emails': new_emails,
            'actual_cost': sendgrid_cost,
            'profit': profit,
            'profit_margin_percent': f"{profit_margin:.1%}",
            'overage_charges': 0,  # Will be updated if applicable
            'savings_vs_mailchimp': plan_config.competitor_equivalent - plan_config.monthly_price
        }
    
    async def _calculate_email_roi(self, campaign_data: Dict[str, Any], results: List[Dict], billing_info: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate ROI metrics for email campaign"""
        
        successful_sends = len([r for r in results if r['success']])
        
        # Industry average email marketing metrics
        estimated_open_rate = 0.22  # 22% average open rate for service businesses
        estimated_click_rate = 0.035  # 3.5% average click rate
        estimated_conversion_rate = 0.05  # 5% of clicks convert to bookings
        
        estimated_opens = successful_sends * estimated_open_rate
        estimated_clicks = estimated_opens * estimated_click_rate
        estimated_bookings = estimated_clicks * estimated_conversion_rate
        estimated_revenue = estimated_bookings * 35.00  # Average $35 per booking
        
        campaign_cost = billing_info['actual_cost']
        roi_percentage = ((estimated_revenue - campaign_cost) / campaign_cost * 100) if campaign_cost > 0 else 0
        
        return {
            'emails_sent': successful_sends,
            'estimated_opens': int(estimated_opens),
            'estimated_clicks': int(estimated_clicks),
            'estimated_bookings': int(estimated_bookings),
            'estimated_revenue': estimated_revenue,
            'campaign_cost': campaign_cost,
            'estimated_roi_percentage': f"{roi_percentage:.0f}%",
            'cost_per_booking': campaign_cost / estimated_bookings if estimated_bookings > 0 else 0,
            'revenue_multiple': estimated_revenue / campaign_cost if campaign_cost > 0 else 0
        }
    
    async def _get_monthly_email_usage(self, shop_id: str) -> int:
        """Get current month email usage for shop"""
        # TODO: Implement database query for usage tracking
        # For now, return 0 - this will be connected to the database
        return 0
    
    async def _update_email_usage_tracking(self, shop_id: str, email_count: int, billing_info: Dict[str, Any]):
        """Update email usage tracking in database"""
        # TODO: Implement database update for usage tracking
        # This will store usage data for billing and analytics
        pass
    
    def get_email_pricing_info(self) -> Dict[str, Any]:
        """Get email pricing information for all plans"""
        pricing_info = {}
        
        for plan, config in self.pricing_tiers.items():
            pricing_info[plan.value] = {
                'plan_name': config.plan_name,
                'monthly_price': config.monthly_price,
                'included_emails': config.included_emails,
                'cost_per_thousand': config.cost_per_thousand,
                'overage_rate': config.overage_rate,
                'mailchimp_price': config.competitor_equivalent,
                'savings_vs_mailchimp': config.competitor_equivalent - config.monthly_price,
                'our_profit_margin': f"{config.profit_margin:.0%}" if config.profit_margin > 0 else "Loss Leader",
                'value_proposition': f"Save ${config.competitor_equivalent - config.monthly_price:.0f}/month vs Mailchimp"
            }
        
        return {
            'pricing_tiers': pricing_info,
            'competitive_advantage': "50-80% cheaper than Mailchimp with superior AI automation",
            'profit_margins': "96-280% profit margins on most plans"
        }
    
    def generate_email_template(self, template_type: str, shop_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate email template based on campaign type"""
        
        shop_name = shop_data.get('name', 'Your Barbershop')
        owner_name = shop_data.get('owner_name', 'there')
        shop_address = shop_data.get('address', 'our location')
        shop_phone = shop_data.get('phone', '(555) 123-4567')
        
        templates = {
            'welcome_series': {
                'subject': f'Welcome to {shop_name}!',
                'content': f'''
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to {shop_name}!</h2>
                    <p>Hi {{name}},</p>
                    <p>Thanks for choosing {shop_name} for your grooming needs. We're excited to have you as part of our community!</p>
                    <p>Here's what you can expect:</p>
                    <ul>
                        <li>✂️ Professional cuts by experienced barbers</li>
                        <li>📅 Easy online booking at your convenience</li>
                        <li>💬 Personalized service recommendations</li>
                        <li>🎁 Exclusive member offers and discounts</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{booking_link}}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Your Next Appointment</a>
                    </div>
                    <p>Questions? Reply to this email or call us at {shop_phone}.</p>
                    <p>Best regards,<br>{owner_name}<br>{shop_name}</p>
                </body>
                </html>
                '''
            },
            
            'birthday_campaign': {
                'subject': f'🎉 Happy Birthday from {shop_name}!',
                'content': f'''
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007cba;">🎉 Happy Birthday {{name}}!</h2>
                    <p>The entire team at {shop_name} wants to wish you a fantastic birthday!</p>
                    <p>To celebrate, we're giving you a special birthday treat:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                        <h3 style="color: #007cba; margin: 0;">🎁 20% OFF Your Birthday Cut</h3>
                        <p style="margin: 10px 0;">Valid for the next 30 days</p>
                        <p style="font-size: 14px; color: #666;">Use code: BIRTHDAY20</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{booking_link}}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Claim Your Birthday Discount</a>
                    </div>
                    <p>Thanks for being an amazing customer. Here's to another year of great hair!</p>
                    <p>Celebrate in style,<br>{owner_name}<br>{shop_name}</p>
                </body>
                </html>
                '''
            },
            
            'reengagement': {
                'subject': f'We miss you at {shop_name}',
                'content': f'''
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">We miss you, {{name}}!</h2>
                    <p>It's been a while since we've seen you at {shop_name}, and we wanted to reach out.</p>
                    <p>Your hair was always looking fresh when you left our chair, and we'd love to help you maintain that great look.</p>
                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #856404; margin: 0;">👋 Come Back Special</h3>
                        <p style="margin: 10px 0; color: #856404;">15% off your next visit when you book this week</p>
                    </div>
                    <p>What's new with us:</p>
                    <ul>
                        <li>New stylists with fresh techniques</li>
                        <li>Extended hours for your convenience</li>
                        <li>Updated safety and cleanliness protocols</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{booking_link}}" style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Your Comeback Cut</a>
                    </div>
                    <p>Looking forward to seeing you soon!</p>
                    <p>Best,<br>{owner_name}<br>{shop_name}</p>
                    <p style="font-size: 12px; color: #666;">If you'd prefer not to receive these emails, <a href="{{unsubscribe_link}}">click here</a>.</p>
                </body>
                </html>
                '''
            },
            
            'monthly_newsletter': {
                'subject': f'{shop_name} Monthly Update',
                'content': f'''
                <html>
                <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007cba;">{shop_name} Monthly Update</h2>
                    <p>Hi {{name}},</p>
                    <p>Here's what's happening at {shop_name} this month:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">📅 This Month's Specials</h3>
                        <p>{{monthly_special_text}}</p>
                    </div>
                    
                    <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">✨ What's New</h3>
                        <p>{{whats_new_text}}</p>
                    </div>
                    
                    <div style="background-color: #fff2e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">💡 Hair Care Tip</h3>
                        <p>{{hair_care_tip}}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{booking_link}}" style="background-color: #007cba; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Book Your Next Appointment</a>
                    </div>
                    
                    <p>Thanks for being part of the {shop_name} family!</p>
                    <p>Best,<br>{owner_name}<br>{shop_name}</p>
                    <p style="font-size: 12px; color: #666; text-align: center;">
                        {shop_name} | {shop_address} | {shop_phone}<br>
                        <a href="{{unsubscribe_link}}">Unsubscribe</a>
                    </p>
                </body>
                </html>
                '''
            }
        }
        
        return templates.get(template_type, {
            'subject': f'Message from {shop_name}',
            'content': f'<html><body><p>{{custom_message}}</p><p>Best,<br>{shop_name}</p></body></html>'
        })

# Initialize Email Marketing Agent
email_agent = EmailMarketingAgent()

# Usage example for testing
async def example_email_campaign():
    """Example email campaign for testing"""
    
    campaign_data = {
        'recipients': [
            {'email': 'john@example.com', 'name': 'John Doe'},
            {'email': 'jane@example.com', 'name': 'Jane Smith'}
        ],
        'subject': '🎉 Special Offer at Elite Cuts!',
        'content': '''
        <html>
        <body>
            <h2>Special Offer This Week!</h2>
            <p>Book your appointment and save 20%!</p>
            <a href="https://book.elitecuts.com" style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none;">Book Now</a>
        </body>
        </html>
        ''',
        'from_email': 'mike@elitecuts.com',
        'from_name': 'Mike - Elite Cuts'
    }
    
    result = await email_agent.send_email_campaign(
        campaign_data=campaign_data,
        shop_id='shop_001',
        plan=EmailPlan.PROFESSIONAL
    )
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Get pricing info
    pricing = email_agent.get_email_pricing_info()
    print("Email Marketing Agent - Pricing Information:")
    print(json.dumps(pricing, indent=2))