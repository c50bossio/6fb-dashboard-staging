#!/usr/bin/env python3
"""
SMS Marketing Agent - 10% Cheaper Than Textedly
Provides cost-effective SMS campaigns with 101-146% profit margins
"""

import boto3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging

class SMSPlan(Enum):
    STARTER = "starter"
    PROFESSIONAL = "professional" 
    BUSINESS = "business"
    ENTERPRISE = "enterprise"
    PREMIUM = "premium"

@dataclass
class SMSPricingTier:
    """SMS pricing tier configuration"""
    plan_name: str
    monthly_price: float
    included_messages: int
    cost_per_message: float
    overage_rate: float
    textedly_equivalent: float
    our_cost: float
    profit_margin: float

class SMSMarketingAgent:
    """
    SMS Marketing Agent with competitive pricing and high margins
    10% cheaper than Textedly while maintaining 101-146% profit margins
    """
    
    def __init__(self):
        self.sns_client = boto3.client('sns', region_name='us-east-1')
        self.pricing_tiers = self._initialize_pricing_tiers()
        self.monthly_base_cost = 11.00  # AWS SNS monthly fees
        self.cost_per_message = 0.00895  # AWS SNS per-message cost
        
    def _initialize_pricing_tiers(self) -> Dict[SMSPlan, SMSPricingTier]:
        """Initialize competitive pricing tiers (10% cheaper than Textedly)"""
        return {
            SMSPlan.STARTER: SMSPricingTier(
                plan_name="Starter",
                monthly_price=33.00,  # 10% cheaper than Textedly's $37
                included_messages=600,
                cost_per_message=0.055,
                overage_rate=0.054,  # 10% cheaper than Textedly's $0.06
                textedly_equivalent=37.00,
                our_cost=16.40,  # $11 base + (600 * $0.00895)
                profit_margin=1.01  # 101% margin
            ),
            SMSPlan.PROFESSIONAL: SMSPricingTier(
                plan_name="Professional",
                monthly_price=51.00,  # 10% cheaper than Textedly's $57
                included_messages=1200,
                cost_per_message=0.043,
                overage_rate=0.054,
                textedly_equivalent=57.00,
                our_cost=21.80,  # $11 base + (1200 * $0.00895)
                profit_margin=1.34  # 134% margin
            ),
            SMSPlan.BUSINESS: SMSPricingTier(
                plan_name="Business",
                monthly_price=78.00,  # 10% cheaper than Textedly's $87
                included_messages=2400,
                cost_per_message=0.033,
                overage_rate=0.054,
                textedly_equivalent=87.00,
                our_cost=32.60,  # $11 base + (2400 * $0.00895)
                profit_margin=1.39  # 139% margin
            ),
            SMSPlan.ENTERPRISE: SMSPricingTier(
                plan_name="Enterprise",
                monthly_price=120.00,  # 10% cheaper than Textedly's $133
                included_messages=4200,
                cost_per_message=0.029,
                overage_rate=0.054,
                textedly_equivalent=133.00,
                our_cost=48.80,  # $11 base + (4200 * $0.00895)
                profit_margin=1.46  # 146% margin
            ),
            SMSPlan.PREMIUM: SMSPricingTier(
                plan_name="Premium",
                monthly_price=159.00,  # 10% cheaper than Textedly's $177
                included_messages=6000,
                cost_per_message=0.027,
                overage_rate=0.054,
                textedly_equivalent=177.00,
                our_cost=65.40,  # $11 base + (6000 * $0.00895)
                profit_margin=1.43  # 143% margin
            )
        }
    
    async def send_sms_campaign(self, 
                              campaign_data: Dict[str, Any],
                              shop_id: str,
                              plan: SMSPlan) -> Dict[str, Any]:
        """Send SMS campaign with usage tracking and billing"""
        
        try:
            # Validate plan and usage limits
            plan_config = self.pricing_tiers[plan]
            current_usage = await self._get_monthly_usage(shop_id)
            
            message_count = len(campaign_data['recipients'])
            total_usage = current_usage + message_count
            
            # Calculate billing
            billing_info = self._calculate_billing(plan_config, current_usage, message_count)
            
            # Check if within limits or calculate overages
            if total_usage > plan_config.included_messages:
                overage_messages = total_usage - plan_config.included_messages
                overage_cost = overage_messages * plan_config.overage_rate
                billing_info['overage_charges'] = overage_cost
            
            # Send messages via AWS SNS
            results = []
            for recipient in campaign_data['recipients']:
                result = await self._send_individual_sms(
                    phone_number=recipient['phone'],
                    message=campaign_data['message'],
                    shop_id=shop_id
                )
                results.append(result)
            
            # Update usage tracking
            await self._update_usage_tracking(shop_id, message_count, billing_info)
            
            # Calculate ROI metrics
            roi_metrics = await self._calculate_campaign_roi(campaign_data, results, billing_info)
            
            return {
                'success': True,
                'campaign_id': f"sms_{shop_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'messages_sent': len([r for r in results if r['success']]),
                'messages_failed': len([r for r in results if not r['success']]),
                'billing_info': billing_info,
                'roi_metrics': roi_metrics,
                'cost_comparison': {
                    'our_cost': billing_info['actual_cost'],
                    'textedly_equivalent': plan_config.textedly_equivalent,
                    'customer_savings': plan_config.textedly_equivalent - plan_config.monthly_price,
                    'our_profit_margin': f"{plan_config.profit_margin:.0%}"
                }
            }
            
        except Exception as e:
            logging.error(f"SMS campaign failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'campaign_id': None
            }
    
    async def _send_individual_sms(self, phone_number: str, message: str, shop_id: str) -> Dict[str, Any]:
        """Send individual SMS via AWS SNS"""
        try:
            # Format phone number for AWS SNS
            formatted_phone = self._format_phone_number(phone_number)
            
            response = self.sns_client.publish(
                PhoneNumber=formatted_phone,
                Message=message,
                MessageAttributes={
                    'shop_id': {
                        'DataType': 'String',
                        'StringValue': shop_id
                    },
                    'service': {
                        'DataType': 'String', 
                        'StringValue': '6FB_SMS_Agent'
                    }
                }
            )
            
            return {
                'success': True,
                'message_id': response['MessageId'],
                'phone_number': phone_number,
                'cost': self.cost_per_message
            }
            
        except Exception as e:
            logging.error(f"Failed to send SMS to {phone_number}: {str(e)}")
            return {
                'success': False,
                'phone_number': phone_number,
                'error': str(e),
                'cost': 0
            }
    
    def _calculate_billing(self, plan_config: SMSPricingTier, current_usage: int, new_messages: int) -> Dict[str, Any]:
        """Calculate billing for SMS campaign"""
        
        # Base monthly cost
        base_cost = plan_config.monthly_price
        
        # Calculate actual AWS costs
        aws_base_cost = self.monthly_base_cost
        aws_message_cost = new_messages * self.cost_per_message
        actual_cost = aws_base_cost + aws_message_cost
        
        # Calculate profit
        profit = base_cost - actual_cost
        profit_margin = (profit / actual_cost) if actual_cost > 0 else 0
        
        return {
            'plan': plan_config.plan_name,
            'base_monthly_price': base_cost,
            'messages_included': plan_config.included_messages,
            'current_usage': current_usage,
            'new_messages': new_messages,
            'actual_cost': actual_cost,
            'profit': profit,
            'profit_margin_percent': f"{profit_margin:.1%}",
            'overage_charges': 0,  # Will be updated if applicable
            'savings_vs_textedly': plan_config.textedly_equivalent - plan_config.monthly_price
        }
    
    async def _calculate_campaign_roi(self, campaign_data: Dict[str, Any], results: List[Dict], billing_info: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate ROI metrics for SMS campaign"""
        
        successful_sends = len([r for r in results if r['success']])
        
        # Estimated response rates based on industry averages
        estimated_response_rate = 0.45  # 45% average SMS response rate
        estimated_conversion_rate = 0.15  # 15% of responses book appointments
        
        estimated_responses = successful_sends * estimated_response_rate
        estimated_bookings = estimated_responses * estimated_conversion_rate
        estimated_revenue = estimated_bookings * 35.00  # Average $35 per booking
        
        campaign_cost = billing_info['actual_cost']
        roi_percentage = ((estimated_revenue - campaign_cost) / campaign_cost * 100) if campaign_cost > 0 else 0
        
        return {
            'messages_sent': successful_sends,
            'estimated_responses': int(estimated_responses),
            'estimated_bookings': int(estimated_bookings),
            'estimated_revenue': estimated_revenue,
            'campaign_cost': campaign_cost,
            'estimated_roi_percentage': f"{roi_percentage:.0f}%",
            'cost_per_booking': campaign_cost / estimated_bookings if estimated_bookings > 0 else 0,
            'revenue_multiple': estimated_revenue / campaign_cost if campaign_cost > 0 else 0
        }
    
    def _format_phone_number(self, phone_number: str) -> str:
        """Format phone number for AWS SNS (+1XXXXXXXXXX)"""
        # Remove all non-digits
        digits_only = ''.join(filter(str.isdigit, phone_number))
        
        # Add +1 country code if not present
        if len(digits_only) == 10:
            return f"+1{digits_only}"
        elif len(digits_only) == 11 and digits_only.startswith('1'):
            return f"+{digits_only}"
        else:
            return f"+1{digits_only[-10:]}"  # Use last 10 digits
    
    async def _get_monthly_usage(self, shop_id: str) -> int:
        """Get current month SMS usage for shop"""
        # TODO: Implement database query for usage tracking
        # For now, return 0 - this will be connected to the database
        return 0
    
    async def _update_usage_tracking(self, shop_id: str, message_count: int, billing_info: Dict[str, Any]):
        """Update SMS usage tracking in database"""
        # TODO: Implement database update for usage tracking
        # This will store usage data for billing and analytics
        pass
    
    def get_pricing_info(self) -> Dict[str, Any]:
        """Get pricing information for all plans"""
        pricing_info = {}
        
        for plan, config in self.pricing_tiers.items():
            pricing_info[plan.value] = {
                'plan_name': config.plan_name,
                'monthly_price': config.monthly_price,
                'included_messages': config.included_messages,
                'cost_per_message': config.cost_per_message,
                'overage_rate': config.overage_rate,
                'textedly_price': config.textedly_equivalent,
                'savings_vs_textedly': config.textedly_equivalent - config.monthly_price,
                'our_profit_margin': f"{config.profit_margin:.0%}",
                'value_proposition': f"Save ${config.textedly_equivalent - config.monthly_price:.0f}/month vs Textedly"
            }
        
        return {
            'pricing_tiers': pricing_info,
            'competitive_advantage': "10% cheaper than Textedly with superior AI automation",
            'profit_margins': "101-146% profit margins across all plans"
        }
    
    def generate_campaign_template(self, campaign_type: str, shop_data: Dict[str, Any]) -> str:
        """Generate SMS campaign template based on campaign type"""
        
        shop_name = shop_data.get('name', 'Barbershop')
        owner_name = shop_data.get('owner_name', 'there')
        
        templates = {
            'appointment_reminder': f"Hi! Just a reminder about your appointment at {shop_name} tomorrow at {{time}}. Reply CONFIRM or call us. Thanks!",
            
            'birthday_special': f"🎉 Happy Birthday from {shop_name}! Celebrate with 20% off your next cut. Book this week! Reply STOP to opt out.",
            
            'reengagement': f"We miss you at {shop_name}! It's been a while since your last visit. Ready for a fresh cut? Book today and save 15%.",
            
            'slow_day_promotion': f"Last-minute opening at {shop_name} today! Book now and get $5 off. First come, first served! Reply YES to book.",
            
            'new_service_announcement': f"New service alert! {shop_name} now offers {{service_name}}. Book your appointment and be among the first to try it!",
            
            'holiday_promotion': f"{{holiday}} Special at {shop_name}! {{discount_text}} Book now through {{end_date}}. Reply BOOK or call us!"
        }
        
        return templates.get(campaign_type, f"Message from {shop_name}: {{custom_message}}")

# Initialize SMS Marketing Agent
sms_agent = SMSMarketingAgent()

# Usage example for testing
async def example_campaign():
    """Example SMS campaign for testing"""
    
    campaign_data = {
        'recipients': [
            {'phone': '+15551234567', 'name': 'John Doe'},
            {'phone': '+15559876543', 'name': 'Jane Smith'}
        ],
        'message': '🎉 Special offer at Elite Cuts! Book this week and save 20%. Reply BOOK or call (555) 123-4567!',
        'campaign_type': 'promotion'
    }
    
    result = await sms_agent.send_sms_campaign(
        campaign_data=campaign_data,
        shop_id='shop_001',
        plan=SMSPlan.PROFESSIONAL
    )
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Get pricing info
    pricing = sms_agent.get_pricing_info()
    print("SMS Marketing Agent - Pricing Information:")
    print(json.dumps(pricing, indent=2))