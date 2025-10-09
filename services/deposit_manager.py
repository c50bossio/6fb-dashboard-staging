"""
Stripe Deposit Manager for Walk-In No-Show Protection
Handles payment intent creation, hold authorization, release, and capture for deposits.
"""

import os
from typing import Optional, Dict
import stripe

# Initialize Stripe with secret key
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Validate Stripe configuration
if not stripe.api_key:
    print("⚠️  WARNING: STRIPE_SECRET_KEY not configured. Deposit functionality will be disabled.")


class DepositManager:
    """
    Manages Stripe payment intents for walk-in deposit protection.
    Deposits are held as pending charges and captured/released based on attendance.
    """

    def __init__(self):
        self.default_deposit_amount_cents = 1500  # $15 default deposit

    def create_deposit_hold(
        self,
        amount_cents: int,
        customer_name: str,
        phone_number: str,
        barbershop_id: str,
        service_name: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Create a Stripe PaymentIntent with manual capture to hold deposit.

        Args:
            amount_cents: Amount to hold in cents (e.g., 1500 = $15.00)
            customer_name: Name of customer for metadata
            phone_number: Customer phone for metadata
            barbershop_id: Barbershop ID for tracking
            service_name: Optional service name for description

        Returns:
            Dict with 'payment_intent_id' and 'client_secret' for frontend Stripe.js

        Raises:
            stripe.error.StripeError: If Stripe API call fails
            ValueError: If amount is invalid
        """
        if not stripe.api_key:
            raise ValueError("Stripe not configured. Cannot create deposit hold.")

        if amount_cents < 50:  # Stripe minimum is $0.50
            raise ValueError(f"Deposit amount too small: ${amount_cents/100:.2f}. Minimum is $0.50")

        if amount_cents > 999999:  # Stripe maximum
            raise ValueError(f"Deposit amount too large: ${amount_cents/100:.2f}. Maximum is $9,999.99")

        try:
            # Create PaymentIntent with capture_method='manual' to hold funds
            payment_intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency='usd',
                capture_method='manual',  # Hold funds, don't capture immediately
                description=f"Walk-in deposit - {service_name}" if service_name else "Walk-in deposit",
                metadata={
                    'customer_name': customer_name,
                    'phone_number': phone_number,
                    'barbershop_id': barbershop_id,
                    'type': 'walk_in_deposit'
                }
            )

            print(f"✓ Deposit hold created: {payment_intent.id} for ${amount_cents/100:.2f}")

            return {
                'payment_intent_id': payment_intent.id,
                'client_secret': payment_intent.client_secret
            }

        except stripe.error.CardError as e:
            # Card was declined
            print(f"✗ Card declined: {e.user_message}")
            raise

        except stripe.error.StripeError as e:
            # Other Stripe errors
            print(f"✗ Stripe error creating deposit: {e.user_message}")
            raise

        except Exception as e:
            print(f"✗ Unexpected error creating deposit: {e}")
            raise

    def release_deposit(self, stripe_payment_intent_id: str) -> Dict[str, str]:
        """
        Release (cancel) a held deposit when customer completes their appointment.

        Args:
            stripe_payment_intent_id: Stripe PaymentIntent ID to release

        Returns:
            Dict with 'status' and 'message'

        Raises:
            stripe.error.StripeError: If Stripe API call fails
        """
        if not stripe.api_key:
            raise ValueError("Stripe not configured. Cannot release deposit.")

        try:
            # Cancel the payment intent to release the hold
            payment_intent = stripe.PaymentIntent.cancel(stripe_payment_intent_id)

            print(f"✓ Deposit released: {stripe_payment_intent_id}")

            return {
                'status': 'released',
                'message': f"Deposit of ${payment_intent.amount/100:.2f} released successfully"
            }

        except stripe.error.InvalidRequestError as e:
            # Payment intent already captured or canceled
            if 'already been canceled' in str(e):
                return {
                    'status': 'already_released',
                    'message': 'Deposit was already released'
                }
            elif 'cannot be canceled because it has a status of succeeded' in str(e):
                return {
                    'status': 'already_captured',
                    'message': 'Deposit was already captured (customer was charged)'
                }
            raise

        except stripe.error.StripeError as e:
            print(f"✗ Stripe error releasing deposit: {e.user_message}")
            raise

        except Exception as e:
            print(f"✗ Unexpected error releasing deposit: {e}")
            raise

    def capture_deposit(self, stripe_payment_intent_id: str) -> Dict[str, str]:
        """
        Capture a held deposit when customer no-shows.

        Args:
            stripe_payment_intent_id: Stripe PaymentIntent ID to capture

        Returns:
            Dict with 'status', 'message', and 'charge_id'

        Raises:
            stripe.error.StripeError: If Stripe API call fails
        """
        if not stripe.api_key:
            raise ValueError("Stripe not configured. Cannot capture deposit.")

        try:
            # Capture the payment intent to charge the customer
            payment_intent = stripe.PaymentIntent.capture(stripe_payment_intent_id)

            print(f"✓ Deposit captured: {stripe_payment_intent_id} (${payment_intent.amount/100:.2f})")

            return {
                'status': 'captured',
                'message': f"Deposit of ${payment_intent.amount/100:.2f} captured for no-show",
                'charge_id': payment_intent.latest_charge
            }

        except stripe.error.InvalidRequestError as e:
            # Payment intent cannot be captured (wrong status)
            if 'cannot be captured' in str(e):
                if 'canceled' in str(e):
                    return {
                        'status': 'already_released',
                        'message': 'Deposit was already released (cannot capture)'
                    }
                elif 'succeeded' in str(e):
                    return {
                        'status': 'already_captured',
                        'message': 'Deposit was already captured'
                    }
            raise

        except stripe.error.StripeError as e:
            print(f"✗ Stripe error capturing deposit: {e.user_message}")
            raise

        except Exception as e:
            print(f"✗ Unexpected error capturing deposit: {e}")
            raise

    def get_payment_intent_status(self, stripe_payment_intent_id: str) -> Dict:
        """
        Retrieve current status of a payment intent.

        Args:
            stripe_payment_intent_id: Stripe PaymentIntent ID

        Returns:
            Dict with payment intent details

        Raises:
            stripe.error.StripeError: If Stripe API call fails
        """
        if not stripe.api_key:
            raise ValueError("Stripe not configured.")

        try:
            payment_intent = stripe.PaymentIntent.retrieve(stripe_payment_intent_id)

            return {
                'id': payment_intent.id,
                'status': payment_intent.status,
                'amount': payment_intent.amount,
                'captured': payment_intent.status == 'succeeded',
                'canceled': payment_intent.status == 'canceled',
                'customer_name': payment_intent.metadata.get('customer_name'),
                'phone_number': payment_intent.metadata.get('phone_number')
            }

        except stripe.error.StripeError as e:
            print(f"✗ Stripe error retrieving payment intent: {e.user_message}")
            raise


# Global instance
deposit_manager = DepositManager()
