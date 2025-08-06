"""
Payment Processing Service
Handles Stripe integration for booking payments, deposits, and full service charges
"""

import os
import sqlite3
import stripe
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import uuid
import json

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_...')

@dataclass
class PaymentResult:
    """Payment processing result"""
    success: bool
    payment_intent_id: Optional[str] = None
    client_secret: Optional[str] = None
    amount: Optional[int] = None
    error: Optional[str] = None
    receipt_url: Optional[str] = None

@dataclass
class ServicePrice:
    """Service pricing information"""
    service_id: str
    name: str
    base_price: float
    deposit_required: bool
    deposit_percentage: float
    duration_minutes: int
    category: str

class PaymentProcessingService:
    """Service for handling all payment processing operations"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self._init_database()
        self._init_service_prices()
    
    def _init_database(self):
        """Initialize payment processing tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Payment intents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_intents (
                intent_id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                barber_id TEXT NOT NULL,
                amount INTEGER NOT NULL,
                currency TEXT DEFAULT 'usd',
                payment_type TEXT NOT NULL,
                status TEXT DEFAULT 'requires_payment_method',
                client_secret TEXT,
                receipt_url TEXT,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id)
            )
        ''')
        
        # Service prices table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS service_prices (
                service_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                base_price REAL NOT NULL,
                deposit_required BOOLEAN DEFAULT 0,
                deposit_percentage REAL DEFAULT 20.0,
                duration_minutes INTEGER NOT NULL,
                category TEXT DEFAULT 'haircut',
                active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Payment history table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payment_history (
                payment_id TEXT PRIMARY KEY,
                booking_id TEXT NOT NULL,
                customer_id TEXT NOT NULL,
                payment_intent_id TEXT,
                amount INTEGER NOT NULL,
                payment_type TEXT NOT NULL,
                status TEXT NOT NULL,
                payment_method_type TEXT,
                receipt_url TEXT,
                refund_id TEXT,
                notes TEXT,
                processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (booking_id) REFERENCES bookings (id),
                FOREIGN KEY (payment_intent_id) REFERENCES payment_intents (intent_id)
            )
        ''')
        
        # Customer payment methods table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_payment_methods (
                method_id TEXT PRIMARY KEY,
                customer_id TEXT NOT NULL,
                stripe_payment_method_id TEXT NOT NULL,
                card_brand TEXT,
                card_last4 TEXT,
                exp_month INTEGER,
                exp_year INTEGER,
                is_default BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(customer_id, stripe_payment_method_id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _init_service_prices(self):
        """Initialize default service prices"""
        default_services = [
            ServicePrice(
                service_id='haircut_classic',
                name='Classic Haircut',
                base_price=35.00,
                deposit_required=False,
                deposit_percentage=0,
                duration_minutes=30,
                category='haircut'
            ),
            ServicePrice(
                service_id='haircut_premium',
                name='Premium Haircut & Style',
                base_price=55.00,
                deposit_required=True,
                deposit_percentage=25.0,
                duration_minutes=45,
                category='haircut'
            ),
            ServicePrice(
                service_id='beard_trim',
                name='Beard Trim & Shape',
                base_price=25.00,
                deposit_required=False,
                deposit_percentage=0,
                duration_minutes=20,
                category='grooming'
            ),
            ServicePrice(
                service_id='full_service',
                name='Full Service (Cut + Beard)',
                base_price=75.00,
                deposit_required=True,
                deposit_percentage=30.0,
                duration_minutes=60,
                category='package'
            ),
            ServicePrice(
                service_id='hot_towel_shave',
                name='Hot Towel Shave',
                base_price=45.00,
                deposit_required=True,
                deposit_percentage=50.0,
                duration_minutes=45,
                category='shave'
            ),
            ServicePrice(
                service_id='kids_cut',
                name='Kids Cut (Under 12)',
                base_price=25.00,
                deposit_required=False,
                deposit_percentage=0,
                duration_minutes=25,
                category='haircut'
            )
        ]
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for service in default_services:
            cursor.execute('''
                INSERT OR IGNORE INTO service_prices 
                (service_id, name, base_price, deposit_required, deposit_percentage, 
                 duration_minutes, category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                service.service_id,
                service.name,
                service.base_price,
                service.deposit_required,
                service.deposit_percentage,
                service.duration_minutes,
                service.category
            ))
        
        conn.commit()
        conn.close()
    
    def create_payment_intent(
        self,
        booking_id: str,
        customer_id: str,
        barber_id: str,
        service_id: str,
        payment_type: str = 'full_payment'  # 'full_payment', 'deposit', 'remaining_balance'
    ) -> PaymentResult:
        """Create a Stripe payment intent for booking"""
        try:
            # Get service pricing
            service = self.get_service_price(service_id)
            if not service:
                return PaymentResult(
                    success=False,
                    error=f"Service {service_id} not found"
                )
            
            # Calculate amount based on payment type
            if payment_type == 'deposit':
                if not service['deposit_required']:
                    return PaymentResult(
                        success=False,
                        error="Deposit not required for this service"
                    )
                amount = int(service['base_price'] * 100 * (service['deposit_percentage'] / 100))
            elif payment_type == 'full_payment':
                amount = int(service['base_price'] * 100)  # Convert to cents
            else:
                # remaining_balance - get from existing payment
                deposit_amount = int(service['base_price'] * 100 * (service['deposit_percentage'] / 100))
                full_amount = int(service['base_price'] * 100)
                amount = full_amount - deposit_amount
            
            # Get customer information
            customer_info = self._get_customer_info(customer_id)
            
            # Create Stripe payment intent
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency='usd',
                customer=customer_info.get('stripe_customer_id'),
                metadata={
                    'booking_id': booking_id,
                    'customer_id': customer_id,
                    'barber_id': barber_id,
                    'service_id': service_id,
                    'payment_type': payment_type,
                    'service_name': service['name']
                },
                description=f"{service['name']} - {payment_type.replace('_', ' ').title()}",
                receipt_email=customer_info.get('email'),
                automatic_payment_methods={
                    'enabled': True,
                }
            )
            
            # Store payment intent in database
            self._store_payment_intent(
                intent_id=intent.id,
                booking_id=booking_id,
                customer_id=customer_id,
                barber_id=barber_id,
                amount=amount,
                payment_type=payment_type,
                client_secret=intent.client_secret,
                metadata={
                    'service_id': service_id,
                    'service_name': service['name']
                }
            )
            
            return PaymentResult(
                success=True,
                payment_intent_id=intent.id,
                client_secret=intent.client_secret,
                amount=amount
            )
            
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            return PaymentResult(
                success=False,
                error=f"Payment processing error: {str(e)}"
            )
    
    def confirm_payment(self, payment_intent_id: str) -> PaymentResult:
        """Confirm payment and update booking status"""
        try:
            # Retrieve payment intent from Stripe
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if intent.status == 'succeeded':
                # Update database with successful payment
                self._update_payment_status(payment_intent_id, 'succeeded', intent.charges.data[0].receipt_url)
                
                # Update booking status if full payment
                metadata = intent.metadata
                if metadata.get('payment_type') == 'full_payment':
                    self._update_booking_payment_status(metadata['booking_id'], 'paid')
                elif metadata.get('payment_type') == 'deposit':
                    self._update_booking_payment_status(metadata['booking_id'], 'deposit_paid')
                
                # Record in payment history
                self._record_payment_history(
                    booking_id=metadata['booking_id'],
                    customer_id=metadata['customer_id'],
                    payment_intent_id=payment_intent_id,
                    amount=intent.amount,
                    payment_type=metadata.get('payment_type', 'full_payment'),
                    status='succeeded',
                    payment_method_type=intent.charges.data[0].payment_method_details.type if intent.charges.data else None,
                    receipt_url=intent.charges.data[0].receipt_url if intent.charges.data else None
                )
                
                return PaymentResult(
                    success=True,
                    payment_intent_id=payment_intent_id,
                    amount=intent.amount,
                    receipt_url=intent.charges.data[0].receipt_url if intent.charges.data else None
                )
            else:
                return PaymentResult(
                    success=False,
                    error=f"Payment not completed. Status: {intent.status}"
                )
                
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error=f"Stripe error: {str(e)}"
            )
        except Exception as e:
            return PaymentResult(
                success=False,
                error=f"Payment confirmation error: {str(e)}"
            )
    
    def process_refund(
        self,
        payment_intent_id: str,
        amount: Optional[int] = None,
        reason: str = "requested_by_customer"
    ) -> PaymentResult:
        """Process refund for a payment"""
        try:
            # Get the charge from payment intent
            intent = stripe.PaymentIntent.retrieve(payment_intent_id)
            
            if not intent.charges.data:
                return PaymentResult(
                    success=False,
                    error="No charges found for this payment"
                )
            
            charge_id = intent.charges.data[0].id
            
            # Create refund
            refund = stripe.Refund.create(
                charge=charge_id,
                amount=amount,  # Partial refund if amount specified
                reason=reason,
                metadata={
                    'original_payment_intent': payment_intent_id,
                    'booking_id': intent.metadata.get('booking_id')
                }
            )
            
            # Update booking status
            booking_id = intent.metadata.get('booking_id')
            if booking_id:
                if amount is None or amount == intent.amount:
                    # Full refund
                    self._update_booking_payment_status(booking_id, 'refunded')
                else:
                    # Partial refund
                    self._update_booking_payment_status(booking_id, 'partially_refunded')
            
            # Record refund in history
            self._record_payment_history(
                booking_id=booking_id,
                customer_id=intent.metadata.get('customer_id'),
                payment_intent_id=payment_intent_id,
                amount=-(refund.amount),  # Negative amount for refund
                payment_type='refund',
                status='succeeded',
                refund_id=refund.id,
                notes=f"Refund reason: {reason}"
            )
            
            return PaymentResult(
                success=True,
                payment_intent_id=payment_intent_id,
                amount=refund.amount
            )
            
        except stripe.error.StripeError as e:
            return PaymentResult(
                success=False,
                error=f"Stripe refund error: {str(e)}"
            )
        except Exception as e:
            return PaymentResult(
                success=False,
                error=f"Refund processing error: {str(e)}"
            )
    
    def get_service_price(self, service_id: str) -> Optional[Dict[str, Any]]:
        """Get service pricing information"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT service_id, name, base_price, deposit_required, deposit_percentage,
                   duration_minutes, category
            FROM service_prices 
            WHERE service_id = ? AND active = 1
        ''', (service_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            columns = ['service_id', 'name', 'base_price', 'deposit_required', 
                      'deposit_percentage', 'duration_minutes', 'category']
            return dict(zip(columns, result))
        return None
    
    def get_all_services(self) -> List[Dict[str, Any]]:
        """Get all active services with pricing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT service_id, name, base_price, deposit_required, deposit_percentage,
                   duration_minutes, category
            FROM service_prices 
            WHERE active = 1
            ORDER BY category, base_price
        ''')
        
        results = cursor.fetchall()
        conn.close()
        
        columns = ['service_id', 'name', 'base_price', 'deposit_required', 
                  'deposit_percentage', 'duration_minutes', 'category']
        
        return [dict(zip(columns, result)) for result in results]
    
    def get_payment_history(self, booking_id: str) -> List[Dict[str, Any]]:
        """Get payment history for a booking"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT payment_id, amount, payment_type, status, payment_method_type,
                   receipt_url, refund_id, notes, processed_at
            FROM payment_history 
            WHERE booking_id = ?
            ORDER BY processed_at DESC
        ''', (booking_id,))
        
        results = cursor.fetchall()
        conn.close()
        
        columns = ['payment_id', 'amount', 'payment_type', 'status', 
                  'payment_method_type', 'receipt_url', 'refund_id', 'notes', 'processed_at']
        
        return [dict(zip(columns, result)) for result in results]
    
    def _get_customer_info(self, customer_id: str) -> Dict[str, Any]:
        """Get customer information for payment processing"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # This would typically join with your customers table
        cursor.execute('''
            SELECT name, email, phone, stripe_customer_id
            FROM customers 
            WHERE id = ?
        ''', (customer_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'name': result[0],
                'email': result[1],
                'phone': result[2],
                'stripe_customer_id': result[3]
            }
        
        # Return default for demo
        return {
            'name': 'Demo Customer',
            'email': 'demo@example.com',
            'phone': '+1234567890',
            'stripe_customer_id': None
        }
    
    def _store_payment_intent(
        self,
        intent_id: str,
        booking_id: str,
        customer_id: str,
        barber_id: str,
        amount: int,
        payment_type: str,
        client_secret: str,
        metadata: Dict[str, Any]
    ):
        """Store payment intent in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO payment_intents
            (intent_id, booking_id, customer_id, barber_id, amount, payment_type,
             client_secret, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            intent_id,
            booking_id,
            customer_id,
            barber_id,
            amount,
            payment_type,
            client_secret,
            json.dumps(metadata)
        ))
        
        conn.commit()
        conn.close()
    
    def _update_payment_status(self, intent_id: str, status: str, receipt_url: Optional[str] = None):
        """Update payment intent status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE payment_intents 
            SET status = ?, receipt_url = ?, updated_at = ?
            WHERE intent_id = ?
        ''', (status, receipt_url, datetime.now(), intent_id))
        
        conn.commit()
        conn.close()
    
    def _update_booking_payment_status(self, booking_id: str, payment_status: str):
        """Update booking payment status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE bookings 
            SET payment_status = ?, updated_at = ?
            WHERE id = ?
        ''', (payment_status, datetime.now(), booking_id))
        
        conn.commit()
        conn.close()
    
    def _record_payment_history(
        self,
        booking_id: str,
        customer_id: str,
        payment_intent_id: str,
        amount: int,
        payment_type: str,
        status: str,
        payment_method_type: Optional[str] = None,
        receipt_url: Optional[str] = None,
        refund_id: Optional[str] = None,
        notes: Optional[str] = None
    ):
        """Record payment in history"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        payment_id = f"pay_{uuid.uuid4().hex[:8]}"
        
        cursor.execute('''
            INSERT INTO payment_history
            (payment_id, booking_id, customer_id, payment_intent_id, amount,
             payment_type, status, payment_method_type, receipt_url, refund_id, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            payment_id,
            booking_id,
            customer_id,
            payment_intent_id,
            amount,
            payment_type,
            status,
            payment_method_type,
            receipt_url,
            refund_id,
            notes
        ))
        
        conn.commit()
        conn.close()

# Example usage
if __name__ == "__main__":
    service = PaymentProcessingService()
    
    # Example: Create payment intent for a booking
    result = service.create_payment_intent(
        booking_id="booking_123",
        customer_id="customer_456",
        barber_id="barber_789",
        service_id="haircut_premium",
        payment_type="deposit"
    )
    
    print(f"Payment intent result: {result}")
    
    # Example: Get all services
    services = service.get_all_services()
    print(f"Available services: {services}")