"""
Payment Processing Service
Handles Stripe integration for payments, refunds, and financial transactions
"""

import os
import stripe
from datetime import datetime
from typing import Dict, List, Optional, Any
from decimal import Decimal
import logging
import json

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

class PaymentService:
    """
    Comprehensive payment processing service using Stripe
    """
    
    def __init__(self, supabase_client=None):
        """Initialize payment service"""
        self.supabase = supabase_client
        self.stripe_key = os.getenv('STRIPE_SECRET_KEY')
        self.webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        if self.stripe_key:
            stripe.api_key = self.stripe_key
            self.stripe_enabled = True
        else:
            self.stripe_enabled = False
            logger.warning("Stripe not configured - using mock payment processing")
    
    async def create_or_update_customer(self, customer_data: Dict) -> Dict:
        """
        Create or update a Stripe customer
        """
        try:
            if not self.stripe_enabled:
                return {
                    'id': f"mock_cus_{customer_data.get('email', 'test')}",
                    'email': customer_data.get('email'),
                    'created': datetime.now().isoformat()
                }
            
            # Check if customer exists
            existing_customer = None
            if customer_data.get('stripe_customer_id'):
                try:
                    existing_customer = stripe.Customer.retrieve(customer_data['stripe_customer_id'])
                except stripe.error.StripeError:
                    pass
            
            if existing_customer:
                # Update existing customer
                customer = stripe.Customer.modify(
                    existing_customer.id,
                    email=customer_data.get('email'),
                    name=f"{customer_data.get('first_name', '')} {customer_data.get('last_name', '')}".strip(),
                    phone=customer_data.get('phone'),
                    metadata={
                        'customer_id': customer_data.get('id'),
                        'barbershop_id': customer_data.get('barbershop_id')
                    }
                )
            else:
                # Create new customer
                customer = stripe.Customer.create(
                    email=customer_data.get('email'),
                    name=f"{customer_data.get('first_name', '')} {customer_data.get('last_name', '')}".strip(),
                    phone=customer_data.get('phone'),
                    metadata={
                        'customer_id': customer_data.get('id'),
                        'barbershop_id': customer_data.get('barbershop_id')
                    }
                )
            
            # Store Stripe customer ID in database
            if self.supabase and customer_data.get('id'):
                self.supabase.table('customers').update({
                    'stripe_customer_id': customer.id
                }).eq('id', customer_data['id']).execute()
            
            return {
                'id': customer.id,
                'email': customer.email,
                'created': customer.created
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating customer: {str(e)}")
            raise
    
    async def create_payment_intent(self, amount: float, currency: str = 'usd', 
                                  customer_id: str = None, metadata: Dict = None) -> Dict:
        """
        Create a payment intent for processing payment
        """
        try:
            if not self.stripe_enabled:
                return {
                    'payment_id': f"mock_pi_{datetime.now().timestamp()}",
                    'client_secret': 'mock_secret',
                    'status': 'requires_payment_method',
                    'amount': amount
                }
            
            # Convert amount to cents
            amount_cents = int(amount * 100)
            
            # Create payment intent
            intent_data = {
                'amount': amount_cents,
                'currency': currency,
                'automatic_payment_methods': {'enabled': True},
                'metadata': metadata or {}
            }
            
            if customer_id:
                # Get Stripe customer ID
                stripe_customer_id = await self._get_stripe_customer_id(customer_id)
                if stripe_customer_id:
                    intent_data['customer'] = stripe_customer_id
            
            payment_intent = stripe.PaymentIntent.create(**intent_data)
            
            # Store payment intent in database
            if self.supabase:
                payment_record = {
                    'payment_intent_id': payment_intent.id,
                    'amount': amount,
                    'currency': currency,
                    'status': payment_intent.status,
                    'customer_id': customer_id,
                    'metadata': json.dumps(metadata or {}),
                    'created_at': datetime.now().isoformat()
                }
                self.supabase.table('payments').insert(payment_record).execute()
            
            return {
                'payment_id': payment_intent.id,
                'client_secret': payment_intent.client_secret,
                'status': payment_intent.status,
                'amount': amount
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating payment intent: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating payment intent: {str(e)}")
            raise
    
    async def confirm_payment(self, payment_intent_id: str, payment_method_id: str = None) -> Dict:
        """
        Confirm a payment intent
        """
        try:
            if not self.stripe_enabled:
                return {
                    'payment_id': payment_intent_id,
                    'status': 'succeeded',
                    'confirmed': True
                }
            
            # Confirm the payment
            if payment_method_id:
                payment_intent = stripe.PaymentIntent.confirm(
                    payment_intent_id,
                    payment_method=payment_method_id
                )
            else:
                payment_intent = stripe.PaymentIntent.confirm(payment_intent_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('payments').update({
                    'status': payment_intent.status,
                    'confirmed_at': datetime.now().isoformat()
                }).eq('payment_intent_id', payment_intent_id).execute()
            
            return {
                'payment_id': payment_intent.id,
                'status': payment_intent.status,
                'confirmed': payment_intent.status == 'succeeded'
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error confirming payment: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error confirming payment: {str(e)}")
            raise
    
    async def cancel_payment_intent(self, payment_intent_id: str) -> Dict:
        """
        Cancel a payment intent
        """
        try:
            if not self.stripe_enabled:
                return {
                    'payment_id': payment_intent_id,
                    'status': 'canceled',
                    'canceled': True
                }
            
            payment_intent = stripe.PaymentIntent.cancel(payment_intent_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('payments').update({
                    'status': 'canceled',
                    'canceled_at': datetime.now().isoformat()
                }).eq('payment_intent_id', payment_intent_id).execute()
            
            return {
                'payment_id': payment_intent.id,
                'status': payment_intent.status,
                'canceled': True
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling payment: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error canceling payment: {str(e)}")
            raise
    
    async def create_refund(self, payment_intent_id: str, amount: float = None, reason: str = None) -> Dict:
        """
        Create a refund for a payment
        """
        try:
            if not self.stripe_enabled:
                return {
                    'refund_id': f"mock_re_{datetime.now().timestamp()}",
                    'status': 'succeeded',
                    'amount': amount
                }
            
            refund_data = {
                'payment_intent': payment_intent_id,
                'metadata': {'reason': reason or 'requested_by_customer'}
            }
            
            if amount:
                refund_data['amount'] = int(amount * 100)  # Convert to cents
            
            refund = stripe.Refund.create(**refund_data)
            
            # Store refund in database
            if self.supabase:
                refund_record = {
                    'refund_id': refund.id,
                    'payment_intent_id': payment_intent_id,
                    'amount': refund.amount / 100,  # Convert back to dollars
                    'status': refund.status,
                    'reason': reason,
                    'created_at': datetime.now().isoformat()
                }
                self.supabase.table('refunds').insert(refund_record).execute()
            
            return {
                'refund_id': refund.id,
                'status': refund.status,
                'amount': refund.amount / 100
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating refund: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            raise
    
    async def add_payment_method(self, customer_id: str, payment_method_id: str) -> Dict:
        """
        Add a payment method to a customer
        """
        try:
            if not self.stripe_enabled:
                return {
                    'payment_method_id': payment_method_id,
                    'attached': True
                }
            
            stripe_customer_id = await self._get_stripe_customer_id(customer_id)
            if not stripe_customer_id:
                raise ValueError("Stripe customer not found")
            
            # Attach payment method to customer
            payment_method = stripe.PaymentMethod.attach(
                payment_method_id,
                customer=stripe_customer_id
            )
            
            # Set as default if it's the first payment method
            customer = stripe.Customer.retrieve(stripe_customer_id)
            if not customer.invoice_settings.default_payment_method:
                stripe.Customer.modify(
                    stripe_customer_id,
                    invoice_settings={'default_payment_method': payment_method_id}
                )
            
            return {
                'payment_method_id': payment_method.id,
                'attached': True,
                'card': {
                    'brand': payment_method.card.brand if payment_method.card else None,
                    'last4': payment_method.card.last4 if payment_method.card else None
                }
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error adding payment method: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error adding payment method: {str(e)}")
            raise
    
    async def list_payment_methods(self, customer_id: str) -> List[Dict]:
        """
        List all payment methods for a customer
        """
        try:
            if not self.stripe_enabled:
                return []
            
            stripe_customer_id = await self._get_stripe_customer_id(customer_id)
            if not stripe_customer_id:
                return []
            
            payment_methods = stripe.PaymentMethod.list(
                customer=stripe_customer_id,
                type='card'
            )
            
            return [
                {
                    'id': pm.id,
                    'type': pm.type,
                    'card': {
                        'brand': pm.card.brand,
                        'last4': pm.card.last4,
                        'exp_month': pm.card.exp_month,
                        'exp_year': pm.card.exp_year
                    } if pm.card else None
                }
                for pm in payment_methods.data
            ]
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error listing payment methods: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Error listing payment methods: {str(e)}")
            return []
    
    async def process_tip(self, booking_id: str, tip_amount: float) -> Dict:
        """
        Process a tip payment for a booking
        """
        try:
            if not self.stripe_enabled:
                return {
                    'tip_id': f"mock_tip_{booking_id}",
                    'amount': tip_amount,
                    'status': 'succeeded'
                }
            
            # Get booking details
            if self.supabase:
                booking_response = self.supabase.table('appointments').select('*').eq('id', booking_id).execute()
                if not booking_response.data:
                    raise ValueError("Booking not found")
                
                booking = booking_response.data[0]
                
                # Create payment for tip
                tip_payment = await self.create_payment_intent(
                    amount=tip_amount,
                    customer_id=booking['customer_id'],
                    metadata={
                        'type': 'tip',
                        'booking_id': booking_id,
                        'barber_id': booking['barber_id']
                    }
                )
                
                # Store tip record
                tip_record = {
                    'booking_id': booking_id,
                    'barber_id': booking['barber_id'],
                    'customer_id': booking['customer_id'],
                    'amount': tip_amount,
                    'payment_intent_id': tip_payment['payment_id'],
                    'created_at': datetime.now().isoformat()
                }
                self.supabase.table('tips').insert(tip_record).execute()
                
                return {
                    'tip_id': tip_payment['payment_id'],
                    'amount': tip_amount,
                    'status': 'requires_confirmation'
                }
            
            return {'error': 'Database not configured'}
            
        except Exception as e:
            logger.error(f"Error processing tip: {str(e)}")
            raise
    
    async def create_subscription(self, customer_id: str, price_id: str, trial_days: int = 0) -> Dict:
        """
        Create a subscription for recurring services
        """
        try:
            if not self.stripe_enabled:
                return {
                    'subscription_id': f"mock_sub_{customer_id}",
                    'status': 'active',
                    'price_id': price_id
                }
            
            stripe_customer_id = await self._get_stripe_customer_id(customer_id)
            if not stripe_customer_id:
                raise ValueError("Stripe customer not found")
            
            subscription_data = {
                'customer': stripe_customer_id,
                'items': [{'price': price_id}],
                'metadata': {'customer_id': customer_id}
            }
            
            if trial_days > 0:
                subscription_data['trial_period_days'] = trial_days
            
            subscription = stripe.Subscription.create(**subscription_data)
            
            # Store subscription in database
            if self.supabase:
                subscription_record = {
                    'subscription_id': subscription.id,
                    'customer_id': customer_id,
                    'price_id': price_id,
                    'status': subscription.status,
                    'current_period_start': datetime.fromtimestamp(subscription.current_period_start).isoformat(),
                    'current_period_end': datetime.fromtimestamp(subscription.current_period_end).isoformat(),
                    'created_at': datetime.now().isoformat()
                }
                self.supabase.table('subscriptions').insert(subscription_record).execute()
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'price_id': price_id
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating subscription: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error creating subscription: {str(e)}")
            raise
    
    async def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> Dict:
        """
        Cancel a subscription
        """
        try:
            if not self.stripe_enabled:
                return {
                    'subscription_id': subscription_id,
                    'canceled': True
                }
            
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.cancel(subscription_id)
            
            # Update database
            if self.supabase:
                self.supabase.table('subscriptions').update({
                    'status': 'canceled' if not at_period_end else 'canceling',
                    'canceled_at': datetime.now().isoformat()
                }).eq('subscription_id', subscription_id).execute()
            
            return {
                'subscription_id': subscription.id,
                'canceled': True,
                'cancel_at_period_end': at_period_end
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error canceling subscription: {str(e)}")
            raise
    
    async def _get_stripe_customer_id(self, customer_id: str) -> Optional[str]:
        """Get Stripe customer ID from database"""
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table('customers').select('stripe_customer_id').eq('id', customer_id).execute()
            if response.data and response.data[0].get('stripe_customer_id'):
                return response.data[0]['stripe_customer_id']
            return None
        except Exception as e:
            logger.error(f"Error fetching Stripe customer ID: {str(e)}")
            return None
    
    async def handle_webhook(self, payload: bytes, signature: str) -> Dict:
        """
        Handle Stripe webhook events
        """
        try:
            if not self.stripe_enabled or not self.webhook_secret:
                return {'received': True}
            
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            
            # Handle different event types
            if event.type == 'payment_intent.succeeded':
                await self._handle_payment_succeeded(event.data.object)
            elif event.type == 'payment_intent.payment_failed':
                await self._handle_payment_failed(event.data.object)
            elif event.type == 'customer.subscription.created':
                await self._handle_subscription_created(event.data.object)
            elif event.type == 'customer.subscription.deleted':
                await self._handle_subscription_canceled(event.data.object)
            elif event.type == 'invoice.payment_succeeded':
                await self._handle_invoice_paid(event.data.object)
            
            return {'received': True, 'event_type': event.type}
            
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Webhook signature verification failed: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error handling webhook: {str(e)}")
            raise
    
    async def _handle_payment_succeeded(self, payment_intent):
        """Handle successful payment webhook"""
        try:
            if self.supabase:
                # Update payment record
                self.supabase.table('payments').update({
                    'status': 'succeeded',
                    'succeeded_at': datetime.now().isoformat()
                }).eq('payment_intent_id', payment_intent.id).execute()
                
                # Update related booking if exists
                if payment_intent.metadata.get('booking_id'):
                    self.supabase.table('appointments').update({
                        'payment_status': 'paid'
                    }).eq('id', payment_intent.metadata['booking_id']).execute()
            
            logger.info(f"Payment succeeded: {payment_intent.id}")
            
        except Exception as e:
            logger.error(f"Error handling payment success: {str(e)}")
    
    async def _handle_payment_failed(self, payment_intent):
        """Handle failed payment webhook"""
        try:
            if self.supabase:
                self.supabase.table('payments').update({
                    'status': 'failed',
                    'failed_at': datetime.now().isoformat()
                }).eq('payment_intent_id', payment_intent.id).execute()
            
            logger.warning(f"Payment failed: {payment_intent.id}")
            
        except Exception as e:
            logger.error(f"Error handling payment failure: {str(e)}")
    
    async def _handle_subscription_created(self, subscription):
        """Handle subscription creation webhook"""
        logger.info(f"Subscription created: {subscription.id}")
    
    async def _handle_subscription_canceled(self, subscription):
        """Handle subscription cancellation webhook"""
        logger.info(f"Subscription canceled: {subscription.id}")
    
    async def _handle_invoice_paid(self, invoice):
        """Handle invoice payment webhook"""
        logger.info(f"Invoice paid: {invoice.id}")