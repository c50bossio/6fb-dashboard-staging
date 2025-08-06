#!/usr/bin/env python3
"""
Payment API Bridge Script
Bridges Next.js API routes with PaymentProcessingService
"""

import sys
import json
import os
from pathlib import Path

# Add the parent directory to the Python path to import services
sys.path.append(str(Path(__file__).parent.parent))

from services.payment_processing_service import PaymentProcessingService

def create_payment_intent(request_data):
    """Create a payment intent"""
    try:
        service = PaymentProcessingService()
        
        result = service.create_payment_intent(
            booking_id=request_data['booking_id'],
            customer_id=request_data['customer_id'],
            barber_id=request_data['barber_id'],
            service_id=request_data['service_id'],
            payment_type=request_data.get('payment_type', 'full_payment')
        )
        
        if result.success:
            # Get service info for frontend
            service_info = service.get_service_price(request_data['service_id'])
            
            return {
                'success': True,
                'client_secret': result.client_secret,
                'amount': result.amount,
                'payment_intent_id': result.payment_intent_id,
                'service_info': service_info
            }
        else:
            return {
                'success': False,
                'error': result.error
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'Payment intent creation failed: {str(e)}'
        }

def confirm_payment(request_data):
    """Confirm a payment"""
    try:
        service = PaymentProcessingService()
        
        result = service.confirm_payment(
            payment_intent_id=request_data['payment_intent_id']
        )
        
        if result.success:
            return {
                'success': True,
                'payment_intent_id': result.payment_intent_id,
                'amount': result.amount,
                'receipt_url': result.receipt_url,
                'booking_id': request_data.get('booking_id'),
                'payment_status': 'succeeded'
            }
        else:
            return {
                'success': False,
                'error': result.error
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'Payment confirmation failed: {str(e)}'
        }

def get_services(request_data):
    """Get all available services"""
    try:
        service = PaymentProcessingService()
        services = service.get_all_services()
        
        return {
            'success': True,
            'services': services
        }
            
    except Exception as e:
        return {
            'success': False,
            'error': f'Services fetch failed: {str(e)}'
        }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Missing action parameter'
        }))
        sys.exit(1)
    
    action = sys.argv[1]
    
    try:
        # Read request data from stdin
        request_data = json.loads(sys.stdin.read())
        
        if action == 'create-intent':
            result = create_payment_intent(request_data)
        elif action == 'confirm-payment':
            result = confirm_payment(request_data)
        elif action == 'get-services':
            result = get_services(request_data)
        else:
            result = {
                'success': False,
                'error': f'Unknown action: {action}'
            }
        
        # Output result as JSON
        print(json.dumps(result))
        
    except json.JSONDecodeError:
        print(json.dumps({
            'success': False,
            'error': 'Invalid JSON input'
        }))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': f'Script error: {str(e)}'
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()