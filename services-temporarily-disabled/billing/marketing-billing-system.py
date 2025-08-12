#!/usr/bin/env python3
"""
Marketing Automation Billing System
Comprehensive billing, pricing, and financial tracking for all marketing services
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from decimal import Decimal, ROUND_HALF_UP
import logging

class BillingCycle(Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"

class ServiceStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"
    PENDING = "pending"

class PaymentStatus(Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    OVERDUE = "overdue"
    REFUNDED = "refunded"

class ServiceType(Enum):
    SMS_MARKETING = "sms_marketing"
    EMAIL_MARKETING = "email_marketing"
    WEBSITE_GENERATION = "website_generation"
    GMB_AUTOMATION = "gmb_automation"
    SOCIAL_MEDIA = "social_media"
    REVIEW_MANAGEMENT = "review_management"

@dataclass
class ServicePlan:
    """Service plan configuration"""
    service_type: ServiceType
    plan_name: str
    monthly_price: Decimal
    features: List[str]
    usage_limits: Dict[str, int]
    overage_rates: Dict[str, Decimal]
    setup_fee: Optional[Decimal] = None
    annual_discount: Optional[Decimal] = None

@dataclass
class ServiceSubscription:
    """Customer service subscription"""
    subscription_id: str
    business_id: str
    service_type: ServiceType
    plan: ServicePlan
    status: ServiceStatus
    billing_cycle: BillingCycle
    start_date: datetime
    next_billing_date: datetime
    current_usage: Dict[str, int]
    total_paid: Decimal
    created_at: datetime
    updated_at: datetime
    end_date: Optional[datetime] = None

@dataclass
class Invoice:
    """Service invoice"""
    invoice_id: str
    business_id: str
    billing_period_start: datetime
    billing_period_end: datetime
    line_items: List[Dict[str, Any]]
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    payment_status: PaymentStatus
    due_date: datetime
    created_at: datetime
    paid_at: Optional[datetime] = None

@dataclass
class UsageRecord:
    """Usage tracking record"""
    record_id: str
    business_id: str
    service_type: ServiceType
    usage_type: str  # messages, emails, posts, etc.
    quantity: int
    cost: Decimal
    timestamp: datetime
    metadata: Optional[Dict[str, Any]] = None

class MarketingBillingSystem:
    """
    Comprehensive billing system for marketing automation services
    Handles pricing, usage tracking, invoicing, and financial analytics
    """
    
    def __init__(self):
        # Service plan definitions
        self.service_plans = self._initialize_service_plans()
        
        # Active subscriptions
        self.subscriptions: Dict[str, ServiceSubscription] = {}
        
        # Usage tracking
        self.usage_records: List[UsageRecord] = []
        
        # Invoicing
        self.invoices: Dict[str, Invoice] = {}
        
        # Financial analytics
        self.revenue_tracking = {
            "monthly_revenue": {},
            "profit_margins": {},
            "customer_metrics": {}
        }
        
        # Tax configuration
        self.tax_rate = Decimal('0.08')  # 8% default tax rate
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _initialize_service_plans(self) -> Dict[ServiceType, Dict[str, ServicePlan]]:
        """Initialize all service plans with pricing"""
        
        return {
            ServiceType.SMS_MARKETING: {
                "starter": ServicePlan(
                    service_type=ServiceType.SMS_MARKETING,
                    plan_name="SMS Starter",
                    monthly_price=Decimal('33.00'),
                    features=[
                        "600 monthly messages",
                        "Basic templates",
                        "Delivery tracking",
                        "Customer support"
                    ],
                    usage_limits={"messages": 600},
                    overage_rates={"messages": Decimal('0.054')},
                    annual_discount=Decimal('0.15')  # 15% annual discount
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.SMS_MARKETING,
                    plan_name="SMS Professional",
                    monthly_price=Decimal('51.00'),
                    features=[
                        "1200 monthly messages",
                        "Advanced templates",
                        "Automation workflows",
                        "Analytics dashboard",
                        "Priority support"
                    ],
                    usage_limits={"messages": 1200},
                    overage_rates={"messages": Decimal('0.054')},
                    annual_discount=Decimal('0.15')
                ),
                "business": ServicePlan(
                    service_type=ServiceType.SMS_MARKETING,
                    plan_name="SMS Business",
                    monthly_price=Decimal('78.00'),
                    features=[
                        "2400 monthly messages",
                        "Custom templates",
                        "Advanced automation",
                        "Detailed analytics",
                        "API access",
                        "Priority support"
                    ],
                    usage_limits={"messages": 2400},
                    overage_rates={"messages": Decimal('0.054')},
                    annual_discount=Decimal('0.20')  # 20% annual discount
                )
            },
            
            ServiceType.EMAIL_MARKETING: {
                "starter": ServicePlan(
                    service_type=ServiceType.EMAIL_MARKETING,
                    plan_name="Email Starter",
                    monthly_price=Decimal('19.00'),
                    features=[
                        "5000 monthly emails",
                        "Basic templates",
                        "Automation",
                        "Analytics"
                    ],
                    usage_limits={"emails": 5000},
                    overage_rates={"emails": Decimal('0.025')},
                    annual_discount=Decimal('0.15')
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.EMAIL_MARKETING,
                    plan_name="Email Professional",
                    monthly_price=Decimal('29.00'),
                    features=[
                        "10000 monthly emails",
                        "Advanced templates",
                        "A/B testing",
                        "Detailed analytics",
                        "API access"
                    ],
                    usage_limits={"emails": 10000},
                    overage_rates={"emails": Decimal('0.025')},
                    annual_discount=Decimal('0.15')
                )
            },
            
            ServiceType.WEBSITE_GENERATION: {
                "basic": ServicePlan(
                    service_type=ServiceType.WEBSITE_GENERATION,
                    plan_name="Website Basic",
                    monthly_price=Decimal('19.00'),
                    features=[
                        "Custom website",
                        "Mobile responsive",
                        "Basic SEO",
                        "Contact forms"
                    ],
                    usage_limits={"websites": 1, "updates": 2},
                    overage_rates={"updates": Decimal('25.00')},
                    setup_fee=Decimal('97.00'),
                    annual_discount=Decimal('0.15')
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.WEBSITE_GENERATION,
                    plan_name="Website Professional",
                    monthly_price=Decimal('29.00'),
                    features=[
                        "Premium website",
                        "Advanced SEO",
                        "Online booking",
                        "Analytics",
                        "Priority updates"
                    ],
                    usage_limits={"websites": 1, "updates": 4},
                    overage_rates={"updates": Decimal('20.00')},
                    setup_fee=Decimal('197.00'),
                    annual_discount=Decimal('0.20')
                )
            },
            
            ServiceType.GMB_AUTOMATION: {
                "basic": ServicePlan(
                    service_type=ServiceType.GMB_AUTOMATION,
                    plan_name="GMB Basic",
                    monthly_price=Decimal('29.00'),
                    features=[
                        "8 monthly posts",
                        "20 review responses",
                        "Basic analytics",
                        "Photo management"
                    ],
                    usage_limits={"posts": 8, "responses": 20},
                    overage_rates={"posts": Decimal('2.50'), "responses": Decimal('1.50')},
                    annual_discount=Decimal('0.15')
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.GMB_AUTOMATION,
                    plan_name="GMB Professional",
                    monthly_price=Decimal('49.00'),
                    features=[
                        "16 monthly posts",
                        "50 review responses",
                        "Advanced analytics",
                        "Event posting",
                        "Offer campaigns"
                    ],
                    usage_limits={"posts": 16, "responses": 50},
                    overage_rates={"posts": Decimal('2.25'), "responses": Decimal('1.25')},
                    annual_discount=Decimal('0.20')
                )
            },
            
            ServiceType.SOCIAL_MEDIA: {
                "basic": ServicePlan(
                    service_type=ServiceType.SOCIAL_MEDIA,
                    plan_name="Social Basic",
                    monthly_price=Decimal('39.00'),
                    features=[
                        "12 monthly posts",
                        "AI-generated content",
                        "2 platforms",
                        "Basic analytics"
                    ],
                    usage_limits={"posts": 12, "platforms": 2},
                    overage_rates={"posts": Decimal('3.00')},
                    annual_discount=Decimal('0.15')
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.SOCIAL_MEDIA,
                    plan_name="Social Professional",
                    monthly_price=Decimal('69.00'),
                    features=[
                        "24 monthly posts",
                        "AI-generated content",
                        "2 platforms",
                        "Story automation",
                        "Advanced analytics"
                    ],
                    usage_limits={"posts": 24, "platforms": 2},
                    overage_rates={"posts": Decimal('2.75')},
                    annual_discount=Decimal('0.20')
                )
            },
            
            ServiceType.REVIEW_MANAGEMENT: {
                "basic": ServicePlan(
                    service_type=ServiceType.REVIEW_MANAGEMENT,
                    plan_name="Review Basic",
                    monthly_price=Decimal('25.00'),
                    features=[
                        "2 platforms monitored",
                        "15 monthly responses",
                        "Sentiment analysis",
                        "Email alerts"
                    ],
                    usage_limits={"platforms": 2, "responses": 15},
                    overage_rates={"responses": Decimal('1.75')},
                    annual_discount=Decimal('0.15')
                ),
                "professional": ServicePlan(
                    service_type=ServiceType.REVIEW_MANAGEMENT,
                    plan_name="Review Professional",
                    monthly_price=Decimal('45.00'),
                    features=[
                        "4 platforms monitored",
                        "35 monthly responses",
                        "Advanced sentiment analysis",
                        "Custom templates",
                        "SMS alerts"
                    ],
                    usage_limits={"platforms": 4, "responses": 35},
                    overage_rates={"responses": Decimal('1.50')},
                    annual_discount=Decimal('0.20')
                )
            }
        }
    
    async def create_subscription(self, 
                                business_id: str,
                                service_type: ServiceType,
                                plan_name: str,
                                billing_cycle: BillingCycle = BillingCycle.MONTHLY) -> Dict[str, Any]:
        """Create a new service subscription"""
        
        try:
            # Get the service plan
            if service_type not in self.service_plans or plan_name not in self.service_plans[service_type]:
                return {
                    "success": False,
                    "error": f"Invalid service type or plan: {service_type.value} - {plan_name}"
                }
            
            plan = self.service_plans[service_type][plan_name]
            
            # Create subscription
            subscription_id = f"sub_{service_type.value}_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Calculate next billing date
            start_date = datetime.now()
            if billing_cycle == BillingCycle.MONTHLY:
                next_billing = start_date + timedelta(days=30)
            elif billing_cycle == BillingCycle.QUARTERLY:
                next_billing = start_date + timedelta(days=90)
            else:  # ANNUAL
                next_billing = start_date + timedelta(days=365)
            
            subscription = ServiceSubscription(
                subscription_id=subscription_id,
                business_id=business_id,
                service_type=service_type,
                plan=plan,
                status=ServiceStatus.ACTIVE,
                billing_cycle=billing_cycle,
                start_date=start_date,
                next_billing_date=next_billing,
                current_usage={key: 0 for key in plan.usage_limits.keys()},
                total_paid=Decimal('0.00'),
                created_at=start_date,
                updated_at=start_date
            )
            
            self.subscriptions[subscription_id] = subscription
            
            # Generate initial invoice
            initial_invoice = await self._generate_invoice(subscription_id)
            
            self.logger.info(f"Created subscription {subscription_id} for business {business_id}")
            
            return {
                "success": True,
                "subscription_id": subscription_id,
                "plan_details": {
                    "service": service_type.value,
                    "plan": plan_name,
                    "monthly_price": float(plan.monthly_price),
                    "features": plan.features,
                    "usage_limits": plan.usage_limits,
                    "billing_cycle": billing_cycle.value
                },
                "initial_invoice": initial_invoice,
                "next_billing_date": next_billing.isoformat(),
                "setup_fee": float(plan.setup_fee) if plan.setup_fee else 0
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create subscription: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def track_usage(self, 
                        business_id: str,
                        service_type: ServiceType,
                        usage_type: str,
                        quantity: int,
                        cost: Decimal,
                        metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Track service usage for billing"""
        
        try:
            # Create usage record
            record_id = f"usage_{business_id}_{service_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            usage_record = UsageRecord(
                record_id=record_id,
                business_id=business_id,
                service_type=service_type,
                usage_type=usage_type,
                quantity=quantity,
                cost=cost,
                timestamp=datetime.now(),
                metadata=metadata
            )
            
            self.usage_records.append(usage_record)
            
            # Update subscription usage
            subscription = self._find_active_subscription(business_id, service_type)
            if subscription:
                if usage_type in subscription.current_usage:
                    subscription.current_usage[usage_type] += quantity
                    subscription.updated_at = datetime.now()
                
                # Check for overages
                overage_charges = self._calculate_overage_charges(subscription)
                
                return {
                    "success": True,
                    "record_id": record_id,
                    "current_usage": subscription.current_usage,
                    "usage_limits": subscription.plan.usage_limits,
                    "overage_charges": overage_charges,
                    "next_billing_date": subscription.next_billing_date.isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": f"No active subscription found for {business_id} - {service_type.value}"
                }
                
        except Exception as e:
            self.logger.error(f"Failed to track usage: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _generate_invoice(self, subscription_id: str) -> Dict[str, Any]:
        """Generate invoice for subscription"""
        
        try:
            subscription = self.subscriptions.get(subscription_id)
            if not subscription:
                return {"success": False, "error": "Subscription not found"}
            
            # Calculate billing period
            if subscription.billing_cycle == BillingCycle.MONTHLY:
                period_start = subscription.next_billing_date - timedelta(days=30)
            elif subscription.billing_cycle == BillingCycle.QUARTERLY:
                period_start = subscription.next_billing_date - timedelta(days=90)
            else:  # ANNUAL
                period_start = subscription.next_billing_date - timedelta(days=365)
            
            period_end = subscription.next_billing_date
            
            # Build line items
            line_items = []
            subtotal = Decimal('0.00')
            
            # Base plan charge
            plan_charge = subscription.plan.monthly_price
            if subscription.billing_cycle == BillingCycle.QUARTERLY:
                plan_charge *= 3
            elif subscription.billing_cycle == BillingCycle.ANNUAL:
                plan_charge *= 12
                # Apply annual discount
                if subscription.plan.annual_discount:
                    discount_amount = plan_charge * subscription.plan.annual_discount
                    plan_charge -= discount_amount
                    line_items.append({
                        "description": f"Annual discount ({subscription.plan.annual_discount:.0%})",
                        "quantity": 1,
                        "unit_price": float(-discount_amount),
                        "total": float(-discount_amount)
                    })
            
            line_items.append({
                "description": f"{subscription.plan.plan_name} - {subscription.billing_cycle.value.title()} Plan",
                "quantity": 1,
                "unit_price": float(plan_charge),
                "total": float(plan_charge)
            })
            subtotal += plan_charge
            
            # Setup fee (first invoice only)
            if subscription.plan.setup_fee and subscription.total_paid == 0:
                line_items.append({
                    "description": "Setup Fee",
                    "quantity": 1,
                    "unit_price": float(subscription.plan.setup_fee),
                    "total": float(subscription.plan.setup_fee)
                })
                subtotal += subscription.plan.setup_fee
            
            # Overage charges
            overage_charges = self._calculate_overage_charges(subscription)
            for usage_type, charge in overage_charges.items():
                if charge > 0:
                    overage_quantity = subscription.current_usage[usage_type] - subscription.plan.usage_limits[usage_type]
                    unit_price = subscription.plan.overage_rates[usage_type]
                    
                    line_items.append({
                        "description": f"Overage: {usage_type} ({overage_quantity} extra)",
                        "quantity": overage_quantity,
                        "unit_price": float(unit_price),
                        "total": float(charge)
                    })
                    subtotal += charge
            
            # Calculate tax
            tax_amount = subtotal * self.tax_rate
            total_amount = subtotal + tax_amount
            
            # Create invoice
            invoice_id = f"inv_{subscription.business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            invoice = Invoice(
                invoice_id=invoice_id,
                business_id=subscription.business_id,
                billing_period_start=period_start,
                billing_period_end=period_end,
                line_items=line_items,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                payment_status=PaymentStatus.PENDING,
                due_date=datetime.now() + timedelta(days=30),
                created_at=datetime.now()
            )
            
            self.invoices[invoice_id] = invoice
            
            return {
                "success": True,
                "invoice": {
                    "invoice_id": invoice_id,
                    "business_id": subscription.business_id,
                    "billing_period": f"{period_start.strftime('%Y-%m-%d')} to {period_end.strftime('%Y-%m-%d')}",
                    "line_items": line_items,
                    "subtotal": float(subtotal),
                    "tax_amount": float(tax_amount),
                    "total_amount": float(total_amount),
                    "due_date": invoice.due_date.isoformat(),
                    "payment_status": PaymentStatus.PENDING.value
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate invoice: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _find_active_subscription(self, business_id: str, service_type: ServiceType) -> Optional[ServiceSubscription]:
        """Find active subscription for business and service type"""
        
        for subscription in self.subscriptions.values():
            if (subscription.business_id == business_id and 
                subscription.service_type == service_type and 
                subscription.status == ServiceStatus.ACTIVE):
                return subscription
        return None
    
    def _calculate_overage_charges(self, subscription: ServiceSubscription) -> Dict[str, Decimal]:
        """Calculate overage charges for subscription"""
        
        overage_charges = {}
        
        for usage_type, current_usage in subscription.current_usage.items():
            limit = subscription.plan.usage_limits.get(usage_type, 0)
            if current_usage > limit:
                overage_quantity = current_usage - limit
                rate = subscription.plan.overage_rates.get(usage_type, Decimal('0'))
                overage_charges[usage_type] = overage_quantity * rate
            else:
                overage_charges[usage_type] = Decimal('0')
        
        return overage_charges
    
    async def process_payment(self, 
                            invoice_id: str,
                            payment_amount: Decimal,
                            payment_method: str = "credit_card") -> Dict[str, Any]:
        """Process payment for invoice"""
        
        try:
            invoice = self.invoices.get(invoice_id)
            if not invoice:
                return {"success": False, "error": "Invoice not found"}
            
            if invoice.payment_status != PaymentStatus.PENDING:
                return {"success": False, "error": f"Invoice already {invoice.payment_status.value}"}
            
            # Simulate payment processing
            # In production, this would integrate with Stripe, PayPal, etc.
            
            if payment_amount >= invoice.total_amount:
                invoice.payment_status = PaymentStatus.PAID
                invoice.paid_at = datetime.now()
                
                # Update subscription
                subscription = self._find_subscription_by_business(invoice.business_id)
                if subscription:
                    subscription.total_paid += payment_amount
                    
                    # Reset usage for new billing period
                    subscription.current_usage = {key: 0 for key in subscription.plan.usage_limits.keys()}
                    
                    # Update next billing date
                    if subscription.billing_cycle == BillingCycle.MONTHLY:
                        subscription.next_billing_date += timedelta(days=30)
                    elif subscription.billing_cycle == BillingCycle.QUARTERLY:
                        subscription.next_billing_date += timedelta(days=90)
                    else:  # ANNUAL
                        subscription.next_billing_date += timedelta(days=365)
                
                # Track revenue
                self._track_revenue(invoice.business_id, payment_amount)
                
                self.logger.info(f"Payment processed for invoice {invoice_id}: ${payment_amount}")
                
                return {
                    "success": True,
                    "payment_status": PaymentStatus.PAID.value,
                    "amount_paid": float(payment_amount),
                    "payment_date": invoice.paid_at.isoformat(),
                    "next_billing_date": subscription.next_billing_date.isoformat() if subscription else None
                }
            else:
                invoice.payment_status = PaymentStatus.FAILED
                return {
                    "success": False,
                    "error": f"Insufficient payment amount. Required: ${invoice.total_amount}, Received: ${payment_amount}"
                }
                
        except Exception as e:
            self.logger.error(f"Payment processing failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _find_subscription_by_business(self, business_id: str) -> Optional[ServiceSubscription]:
        """Find any active subscription for business"""
        
        for subscription in self.subscriptions.values():
            if subscription.business_id == business_id and subscription.status == ServiceStatus.ACTIVE:
                return subscription
        return None
    
    def _track_revenue(self, business_id: str, amount: Decimal):
        """Track revenue for analytics"""
        
        current_month = datetime.now().strftime('%Y-%m')
        
        if current_month not in self.revenue_tracking["monthly_revenue"]:
            self.revenue_tracking["monthly_revenue"][current_month] = Decimal('0.00')
        
        self.revenue_tracking["monthly_revenue"][current_month] += amount
        
        # Track per customer
        if business_id not in self.revenue_tracking["customer_metrics"]:
            self.revenue_tracking["customer_metrics"][business_id] = {
                "total_revenue": Decimal('0.00'),
                "payments_count": 0,
                "first_payment": datetime.now(),
                "last_payment": datetime.now()
            }
        
        customer_metrics = self.revenue_tracking["customer_metrics"][business_id]
        customer_metrics["total_revenue"] += amount
        customer_metrics["payments_count"] += 1
        customer_metrics["last_payment"] = datetime.now()
    
    async def get_business_billing_summary(self, business_id: str) -> Dict[str, Any]:
        """Get comprehensive billing summary for a business"""
        
        try:
            # Get all subscriptions for this business
            business_subscriptions = [
                sub for sub in self.subscriptions.values() 
                if sub.business_id == business_id
            ]
            
            if not business_subscriptions:
                return {
                    "success": False,
                    "message": "No subscriptions found for this business"
                }
            
            # Get all invoices for this business
            business_invoices = [
                inv for inv in self.invoices.values()
                if inv.business_id == business_id
            ]
            
            # Calculate totals
            total_paid = sum(sub.total_paid for sub in business_subscriptions)
            monthly_recurring_revenue = sum(
                sub.plan.monthly_price for sub in business_subscriptions 
                if sub.status == ServiceStatus.ACTIVE
            )
            
            # Current usage summary
            current_usage = {}
            for sub in business_subscriptions:
                if sub.status == ServiceStatus.ACTIVE:
                    current_usage[sub.service_type.value] = {
                        "plan": sub.plan.plan_name,
                        "usage": sub.current_usage,
                        "limits": sub.plan.usage_limits,
                        "next_billing": sub.next_billing_date.isoformat()
                    }
            
            # Recent invoices
            recent_invoices = sorted(business_invoices, key=lambda x: x.created_at, reverse=True)[:5]
            invoice_summary = []
            for inv in recent_invoices:
                invoice_summary.append({
                    "invoice_id": inv.invoice_id,
                    "total_amount": float(inv.total_amount),
                    "status": inv.payment_status.value,
                    "due_date": inv.due_date.isoformat(),
                    "paid_at": inv.paid_at.isoformat() if inv.paid_at else None
                })
            
            return {
                "success": True,
                "business_id": business_id,
                "summary": {
                    "active_subscriptions": len([s for s in business_subscriptions if s.status == ServiceStatus.ACTIVE]),
                    "monthly_recurring_revenue": float(monthly_recurring_revenue),
                    "total_paid_to_date": float(total_paid),
                    "account_status": "Good Standing" if all(s.status == ServiceStatus.ACTIVE for s in business_subscriptions) else "Needs Attention"
                },
                "current_services": current_usage,
                "recent_invoices": invoice_summary,
                "upcoming_charges": self._calculate_upcoming_charges(business_subscriptions)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get billing summary: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _calculate_upcoming_charges(self, subscriptions: List[ServiceSubscription]) -> Dict[str, Any]:
        """Calculate upcoming charges for subscriptions"""
        
        upcoming_charges = {}
        
        for sub in subscriptions:
            if sub.status == ServiceStatus.ACTIVE:
                next_charge_date = sub.next_billing_date
                base_charge = sub.plan.monthly_price
                
                if sub.billing_cycle == BillingCycle.QUARTERLY:
                    base_charge *= 3
                elif sub.billing_cycle == BillingCycle.ANNUAL:
                    base_charge *= 12
                    if sub.plan.annual_discount:
                        base_charge *= (1 - sub.plan.annual_discount)
                
                # Add potential overage charges
                estimated_overages = sum(self._calculate_overage_charges(sub).values())
                
                upcoming_charges[sub.service_type.value] = {
                    "base_charge": float(base_charge),
                    "estimated_overages": float(estimated_overages),
                    "total_estimated": float(base_charge + estimated_overages),
                    "billing_date": next_charge_date.isoformat(),
                    "billing_cycle": sub.billing_cycle.value
                }
        
        return upcoming_charges
    
    async def get_financial_analytics(self) -> Dict[str, Any]:
        """Get comprehensive financial analytics"""
        
        try:
            # Monthly revenue trends
            monthly_trends = {}
            for month, revenue in self.revenue_tracking["monthly_revenue"].items():
                monthly_trends[month] = float(revenue)
            
            # Total metrics
            total_revenue = sum(self.revenue_tracking["monthly_revenue"].values())
            total_customers = len(self.revenue_tracking["customer_metrics"])
            avg_revenue_per_customer = total_revenue / total_customers if total_customers > 0 else 0
            
            # Service popularity
            service_popularity = {}
            for subscription in self.subscriptions.values():
                service = subscription.service_type.value
                if service not in service_popularity:
                    service_popularity[service] = {"subscriptions": 0, "revenue": 0}
                
                service_popularity[service]["subscriptions"] += 1
                service_popularity[service]["revenue"] += float(subscription.total_paid)
            
            # Profit margin analysis (estimated)
            profit_margins = {}
            for service_type, plans in self.service_plans.items():
                service_name = service_type.value
                # Simplified profit calculation based on our cost structure
                costs = {
                    "sms_marketing": 0.20,      # 20% of revenue (AWS costs)
                    "email_marketing": 0.15,    # 15% of revenue (SendGrid costs)
                    "website_generation": 0.10, # 10% of revenue (hosting costs)
                    "gmb_automation": 0.12,     # 12% of revenue (API costs)
                    "social_media": 0.18,       # 18% of revenue (content generation)
                    "review_management": 0.14   # 14% of revenue (monitoring costs)
                }
                
                cost_ratio = costs.get(service_name, 0.15)
                profit_margin = (1 - cost_ratio) * 100
                profit_margins[service_name] = f"{profit_margin:.0f}%"
            
            return {
                "success": True,
                "analytics_period": "All time",
                "revenue_metrics": {
                    "total_revenue": float(total_revenue),
                    "monthly_trends": monthly_trends,
                    "avg_revenue_per_customer": float(avg_revenue_per_customer),
                    "total_customers": total_customers
                },
                "service_metrics": {
                    "service_popularity": service_popularity,
                    "profit_margins": profit_margins
                },
                "business_health": {
                    "active_subscriptions": len([s for s in self.subscriptions.values() if s.status == ServiceStatus.ACTIVE]),
                    "churn_rate": "3.2%",  # Would be calculated from actual data
                    "growth_rate": "15.8%", # Would be calculated from monthly trends
                    "customer_lifetime_value": float(avg_revenue_per_customer * 18)  # Estimated 18 month average
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get financial analytics: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_subscription(self, 
                                subscription_id: str,
                                changes: Dict[str, Any]) -> Dict[str, Any]:
        """Update subscription settings"""
        
        try:
            subscription = self.subscriptions.get(subscription_id)
            if not subscription:
                return {"success": False, "error": "Subscription not found"}
            
            updated_fields = []
            
            # Update plan
            if "plan_name" in changes:
                new_plan_name = changes["plan_name"]
                if new_plan_name in self.service_plans[subscription.service_type]:
                    subscription.plan = self.service_plans[subscription.service_type][new_plan_name]
                    subscription.current_usage = {key: 0 for key in subscription.plan.usage_limits.keys()}
                    updated_fields.append("plan")
            
            # Update billing cycle
            if "billing_cycle" in changes:
                new_cycle = BillingCycle(changes["billing_cycle"])
                subscription.billing_cycle = new_cycle
                updated_fields.append("billing_cycle")
            
            # Update status
            if "status" in changes:
                new_status = ServiceStatus(changes["status"])
                subscription.status = new_status
                updated_fields.append("status")
            
            subscription.updated_at = datetime.now()
            
            self.logger.info(f"Updated subscription {subscription_id}: {updated_fields}")
            
            return {
                "success": True,
                "subscription_id": subscription_id,
                "updated_fields": updated_fields,
                "current_plan": subscription.plan.plan_name,
                "billing_cycle": subscription.billing_cycle.value,
                "status": subscription.status.value
            }
            
        except Exception as e:
            self.logger.error(f"Failed to update subscription: {str(e)}")
            return {"success": False, "error": str(e)}

# Usage example
async def example_billing_system():
    """Example of using the billing system"""
    
    billing_system = MarketingBillingSystem()
    
    # Create subscription
    subscription_result = await billing_system.create_subscription(
        business_id="business_001",
        service_type=ServiceType.SMS_MARKETING,
        plan_name="professional",
        billing_cycle=BillingCycle.MONTHLY
    )
    
    print("Subscription Creation:")
    print(json.dumps(subscription_result, indent=2, default=str))
    
    if subscription_result["success"]:
        # Track some usage
        usage_result = await billing_system.track_usage(
            business_id="business_001",
            service_type=ServiceType.SMS_MARKETING,
            usage_type="messages",
            quantity=500,
            cost=Decimal('27.00')
        )
        
        print("\nUsage Tracking:")
        print(json.dumps(usage_result, indent=2, default=str))
        
        # Get billing summary
        billing_summary = await billing_system.get_business_billing_summary("business_001")
        
        print("\nBilling Summary:")
        print(json.dumps(billing_summary, indent=2, default=str))
        
        # Get financial analytics
        analytics = await billing_system.get_financial_analytics()
        
        print("\nFinancial Analytics:")
        print(json.dumps(analytics, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(example_billing_system())