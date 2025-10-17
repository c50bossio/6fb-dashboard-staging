#!/usr/bin/env python3
"""
Test Script for Complete Booking Notification System
Tests all notification flows: booking confirmation, payment confirmation, reminders, cancellations
"""

import asyncio
import requests
import json
from datetime import datetime, timedelta
import uuid
import os
import sys

# Add the parent directory to the path to import our services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configuration
FAST_API_BASE_URL = os.getenv('FASTAPI_BACKEND_URL', 'http://localhost:8001')
NEXT_JS_BASE_URL = os.getenv('NEXT_PUBLIC_APP_URL', 'http://localhost:9999')
API_KEY = os.getenv('FASTAPI_API_KEY', 'development-key')

# Test data
TEST_BOOKING_DATA = {
    "booking_id": str(uuid.uuid4()),
    "user_id": str(uuid.uuid4()),
    "customer_name": "John Doe",
    "customer_email": "john.doe@test.com",
    "customer_phone": "+1234567890",
    "barbershop_name": "Test Barbershop",
    "barber_name": "Mike The Barber",
    "service_name": "Haircut & Beard Trim",
    "appointment_date": (datetime.now() + timedelta(days=1)).isoformat(),
    "appointment_duration": 45,
    "total_price": 35.00,
    "booking_status": "confirmed",
    "payment_status": "succeeded",
    "payment_method": "card",
    "notes": "Test booking for notification system"
}

def make_request(method, url, data=None, headers=None):
    """Make HTTP request with error handling"""
    try:
        default_headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {API_KEY}'
        }
        if headers:
            default_headers.update(headers)
        
        if method.upper() == 'GET':
            response = requests.get(url, headers=default_headers)
        elif method.upper() == 'POST':
            response = requests.post(url, json=data, headers=default_headers)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return {
            'success': response.status_code < 400,
            'status_code': response.status_code,
            'data': response.json() if response.content else None,
            'error': None
        }
    except Exception as e:
        return {
            'success': False,
            'status_code': None,
            'data': None,
            'error': str(e)
        }

def test_notification_service_health():
    """Test if notification services are running"""
    print("\n=== Testing Notification Service Health ===")
    
    # Test FastAPI backend health
    result = make_request('GET', f'{FAST_API_BASE_URL}/api/v1/booking-notifications/health')
    if result['success']:
        print("✅ FastAPI notification service is healthy")
        print(f"   Status: {result['data']}")
    else:
        print(f"❌ FastAPI notification service health check failed: {result['error']}")
        return False
    
    return True

def test_booking_confirmation():
    """Test booking confirmation notification"""
    print("\n=== Testing Booking Confirmation Notification ===")
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/booking-confirmed'
    result = make_request('POST', url, TEST_BOOKING_DATA)
    
    if result['success']:
        print("✅ Booking confirmation notification sent successfully")
        print(f"   Response: {result['data']}")
        return result['data'].get('notification_id')
    else:
        print(f"❌ Booking confirmation failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return None

def test_payment_confirmation():
    """Test payment confirmation notification"""
    print("\n=== Testing Payment Confirmation Notification ===")
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/payment-confirmed'
    result = make_request('POST', url, TEST_BOOKING_DATA)
    
    if result['success']:
        print("✅ Payment confirmation notification sent successfully")
        print(f"   Response: {result['data']}")
        return result['data'].get('notification_id')
    else:
        print(f"❌ Payment confirmation failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return None

def test_appointment_reminders():
    """Test appointment reminder scheduling"""
    print("\n=== Testing Appointment Reminder Scheduling ===")
    
    # Schedule reminders for tomorrow
    future_booking = TEST_BOOKING_DATA.copy()
    future_booking['appointment_date'] = (datetime.now() + timedelta(days=1, hours=2)).isoformat()
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/appointment-reminders/schedule'
    result = make_request('POST', url, future_booking)
    
    if result['success']:
        print("✅ Appointment reminders scheduled successfully")
        print(f"   Response: {result['data']}")
        return True
    else:
        print(f"❌ Appointment reminder scheduling failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return False

def test_cancellation_notice():
    """Test booking cancellation notification"""
    print("\n=== Testing Cancellation Notice ===")
    
    cancelled_booking = TEST_BOOKING_DATA.copy()
    cancelled_booking['booking_status'] = 'cancelled'
    cancelled_booking['cancellation_reason'] = 'Customer requested cancellation'
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/booking-cancelled'
    result = make_request('POST', url, cancelled_booking)
    
    if result['success']:
        print("✅ Cancellation notice sent successfully")
        print(f"   Response: {result['data']}")
        return result['data'].get('notification_id')
    else:
        print(f"❌ Cancellation notice failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return None

def test_stripe_webhook():
    """Test Stripe webhook integration"""
    print("\n=== Testing Stripe Webhook Integration ===")
    
    webhook_payload = {
        "event_type": "payment_intent.succeeded",
        "booking_id": TEST_BOOKING_DATA['booking_id'],
        "data": {
            "payment_intent": {
                "id": "pi_test_12345",
                "amount": 3500,  # $35.00 in cents
                "currency": "usd",
                "status": "succeeded",
                "metadata": {
                    "booking_id": TEST_BOOKING_DATA['booking_id'],
                    "customer_email": TEST_BOOKING_DATA['customer_email'],
                    "customer_name": TEST_BOOKING_DATA['customer_name']
                }
            }
        },
        "timestamp": datetime.now().isoformat(),
        "source": "stripe"
    }
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/webhooks/stripe'
    result = make_request('POST', url, webhook_payload)
    
    if result['success']:
        print("✅ Stripe webhook processed successfully")
        print(f"   Response: {result['data']}")
        return True
    else:
        print(f"❌ Stripe webhook processing failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return False

def test_booking_wizard_webhook():
    """Test BookingWizard webhook integration"""
    print("\n=== Testing BookingWizard Webhook Integration ===")
    
    webhook_payload = {
        "event_type": "booking_completed",
        "booking_data": {
            "bookingId": TEST_BOOKING_DATA['booking_id'],
            "customerInfo": {
                "userId": TEST_BOOKING_DATA['user_id'],
                "name": TEST_BOOKING_DATA['customer_name'],
                "email": TEST_BOOKING_DATA['customer_email'],
                "phone": TEST_BOOKING_DATA['customer_phone']
            },
            "locationDetails": {
                "name": TEST_BOOKING_DATA['barbershop_name']
            },
            "barberDetails": {
                "name": TEST_BOOKING_DATA['barber_name']
            },
            "serviceDetails": {
                "name": TEST_BOOKING_DATA['service_name']
            },
            "dateTime": TEST_BOOKING_DATA['appointment_date'],
            "duration": TEST_BOOKING_DATA['appointment_duration'],
            "price": TEST_BOOKING_DATA['total_price'],
            "paymentMethod": TEST_BOOKING_DATA['payment_method'],
            "paymentStatus": TEST_BOOKING_DATA['payment_status']
        },
        "timestamp": datetime.now().isoformat(),
        "source": "booking_wizard"
    }
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/webhooks/booking-wizard'
    result = make_request('POST', url, webhook_payload)
    
    if result['success']:
        print("✅ BookingWizard webhook processed successfully")
        print(f"   Response: {result['data']}")
        return True
    else:
        print(f"❌ BookingWizard webhook processing failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return False

def test_notification_status(notification_id):
    """Test notification status checking"""
    if not notification_id:
        print("⚠️  Skipping notification status test - no notification ID")
        return False
    
    print(f"\n=== Testing Notification Status Check ===")
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/notifications/{notification_id}/status'
    result = make_request('GET', url)
    
    if result['success']:
        print("✅ Notification status retrieved successfully")
        print(f"   Status: {result['data']}")
        return True
    else:
        print(f"❌ Notification status check failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return False

def test_pending_notifications():
    """Test getting pending notifications"""
    print("\n=== Testing Pending Notifications Query ===")
    
    url = f'{FAST_API_BASE_URL}/api/v1/booking-notifications/notifications/pending'
    result = make_request('GET', url)
    
    if result['success']:
        print("✅ Pending notifications retrieved successfully")
        print(f"   Count: {result['data'].get('total', 0)}")
        return True
    else:
        print(f"❌ Pending notifications query failed: {result['error']}")
        print(f"   Status code: {result['status_code']}")
        return False

def run_comprehensive_test():
    """Run all notification system tests"""
    print("🚀 Starting Comprehensive Notification System Test")
    print("=" * 60)
    
    test_results = {
        'health_check': False,
        'booking_confirmation': False,
        'payment_confirmation': False,
        'appointment_reminders': False,
        'cancellation_notice': False,
        'stripe_webhook': False,
        'booking_wizard_webhook': False,
        'notification_status': False,
        'pending_notifications': False
    }
    
    # Test 1: Health check
    test_results['health_check'] = test_notification_service_health()
    
    # Test 2: Booking confirmation
    booking_notification_id = test_booking_confirmation()
    test_results['booking_confirmation'] = booking_notification_id is not None
    
    # Test 3: Payment confirmation
    payment_notification_id = test_payment_confirmation()
    test_results['payment_confirmation'] = payment_notification_id is not None
    
    # Test 4: Appointment reminders
    test_results['appointment_reminders'] = test_appointment_reminders()
    
    # Test 5: Cancellation notice
    cancellation_notification_id = test_cancellation_notice()
    test_results['cancellation_notice'] = cancellation_notification_id is not None
    
    # Test 6: Stripe webhook
    test_results['stripe_webhook'] = test_stripe_webhook()
    
    # Test 7: BookingWizard webhook
    test_results['booking_wizard_webhook'] = test_booking_wizard_webhook()
    
    # Test 8: Notification status
    test_results['notification_status'] = test_notification_status(booking_notification_id)
    
    # Test 9: Pending notifications
    test_results['pending_notifications'] = test_pending_notifications()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for test_name, passed in test_results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title():<30} {status}")
    
    print("\n" + "-" * 60)
    print(f"Results: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")
    
    if passed_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED! Notification system is working correctly.")
    else:
        failed_tests = [name for name, passed in test_results.items() if not passed]
        print(f"\n⚠️  SOME TESTS FAILED: {', '.join(failed_tests)}")
        print("\nCheck the FastAPI backend logs and ensure all services are running.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)
