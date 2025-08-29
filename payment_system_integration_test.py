#!/usr/bin/env python3
"""
Complete Payment System Integration Test
Tests all three payment methods with the FastAPI backend
"""
import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8001"
BARBERSHOP_ID = "1"
BARBER_ID = "barber_1"

def test_products_endpoint():
    """Test loading products from the POS system"""
    print("🔍 Testing Products Endpoint...")
    
    response = requests.get(f"{BASE_URL}/api/pos/products?barbershop_id={BARBERSHOP_ID}")
    
    if response.status_code == 200:
        products = response.json()
        print(f"✅ Products loaded: {len(products)} items available")
        for product in products[:3]:  # Show first 3 products
            print(f"   - {product['name']}: ${product['price']} (Stock: {product['current_stock']})")
        return products
    else:
        print(f"❌ Products endpoint failed: {response.status_code}")
        return []

def test_cash_payment(products):
    """Test traditional cash/card payment processing"""
    print("\n💵 Testing Cash Payment...")
    
    if not products:
        print("❌ No products available for cash payment test")
        return False
    
    product = products[0]  # Use first product
    receipt_number = f"CASH-{int(time.time())}"
    
    sale_data = {
        "barbershop_id": BARBERSHOP_ID,
        "product_id": product["id"],
        "quantity": 1,
        "unit_price": product["price"],
        "barber_id": BARBER_ID,
        "payment_method": "cash",
        "receipt_number": receipt_number
    }
    
    response = requests.post(f"{BASE_URL}/api/pos/sales", json=sale_data)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Cash payment processed: ${result['total_price']}")
        print(f"   Sale ID: {result['sale_id']}")
        return True
    else:
        print(f"❌ Cash payment failed: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Raw response: {response.text}")
        return False

def test_payment_link(products):
    """Test Payment Link creation and SMS/Email delivery"""
    print("\n🔗 Testing Payment Link...")
    
    if not products:
        print("❌ No products available for payment link test")
        return False
    
    cart_items = [
        {
            "id": products[0]["id"],
            "name": products[0]["name"],
            "price": products[0]["price"],
            "quantity": 2,
            "tax_rate": products[0].get("tax_rate", 0)
        }
    ]
    
    payment_link_data = {
        "barbershopId": BARBERSHOP_ID,
        "barberId": BARBER_ID,
        "cartItems": cart_items,
        "customerContact": "555-123-4567",
        "contactMethod": "sms",
        "expiresInHours": 24
    }
    
    response = requests.post(f"{BASE_URL}/api/pos/payment-link", json=payment_link_data)
    
    if response.status_code == 200:
        result = response.json()
        payment_link = result["paymentLink"]
        print(f"✅ Payment link created: ${payment_link['amount']}")
        print(f"   Link ID: {payment_link['id']}")
        print(f"   URL: {payment_link['url'][:50]}...")
        print(f"   Delivery: {payment_link['send_result']['message']}")
        return True
    else:
        print(f"❌ Payment link failed: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Raw response: {response.text}")
        return False

def test_qr_payment(products):
    """Test QR Code payment session creation"""
    print("\n📱 Testing QR Code Payment...")
    
    if not products:
        print("❌ No products available for QR payment test")
        return False
    
    cart_items = [
        {
            "id": products[1]["id"] if len(products) > 1 else products[0]["id"],
            "name": products[1]["name"] if len(products) > 1 else products[0]["name"],
            "price": products[1]["price"] if len(products) > 1 else products[0]["price"],
            "quantity": 1
        }
    ]
    
    total_amount = cart_items[0]["price"] * cart_items[0]["quantity"]
    
    qr_payment_data = {
        "barbershopId": BARBERSHOP_ID,
        "barberId": BARBER_ID,
        "cartItems": cart_items,
        "totalAmount": total_amount
    }
    
    response = requests.post(f"{BASE_URL}/api/pos/qr-payment", json=qr_payment_data)
    
    if response.status_code == 200:
        result = response.json()
        qr_session = result["qrSession"]
        print(f"✅ QR payment session created: ${qr_session['amount']}")
        print(f"   Session ID: {qr_session['sessionId']}")
        print(f"   QR Data: {qr_session['qrCodeData'][:50]}...")
        print(f"   Expires: {qr_session['expiresAt']}")
        return True
    else:
        print(f"❌ QR payment failed: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Raw response: {response.text}")
        return False

def test_terminal_payment(products):
    """Test Stripe Terminal payment intent creation"""
    print("\n💳 Testing Terminal Payment...")
    
    if not products:
        print("❌ No products available for terminal payment test")
        return False
    
    cart_items = [
        {
            "id": products[2]["id"] if len(products) > 2 else products[0]["id"],
            "name": products[2]["name"] if len(products) > 2 else products[0]["name"],
            "price": products[2]["price"] if len(products) > 2 else products[0]["price"],
            "quantity": 1
        }
    ]
    
    total_amount = cart_items[0]["price"] * cart_items[0]["quantity"]
    
    terminal_payment_data = {
        "barbershopId": BARBERSHOP_ID,
        "barberId": BARBER_ID,
        "cartItems": cart_items,
        "totalAmount": total_amount
    }
    
    response = requests.post(f"{BASE_URL}/api/stripe/terminal/payment-intent", json=terminal_payment_data)
    
    if response.status_code == 200:
        result = response.json()
        payment_intent = result["paymentIntent"]
        print(f"✅ Terminal payment intent created: ${payment_intent['amount']/100}")
        print(f"   Payment Intent ID: {payment_intent['id']}")
        print(f"   Status: {payment_intent['status']}")
        print(f"   Client Secret: {payment_intent['client_secret'][:30]}...")
        
        # Test payment collection simulation
        collect_response = requests.post(
            f"{BASE_URL}/api/stripe/terminal/collect-payment",
            params={
                "payment_intent_id": payment_intent["id"],
                "reader_id": "reader_test_123"
            }
        )
        
        if collect_response.status_code == 200:
            collect_result = collect_response.json()
            print(f"✅ Terminal payment collected successfully")
            print(f"   Final Status: {collect_result['paymentIntent']['status']}")
            charges = collect_result['paymentIntent']['charges']['data']
            if charges:
                charge = charges[0]
                card_details = charge['payment_method_details']['card_present']
                print(f"   Card: **** **** **** {card_details['last4']} ({card_details['brand'].upper()})")
        else:
            print(f"⚠️  Terminal payment collection simulation failed: {collect_response.status_code}")
        
        return True
    else:
        print(f"❌ Terminal payment failed: {response.status_code}")
        try:
            print(f"   Error: {response.json()}")
        except:
            print(f"   Raw response: {response.text}")
        return False

def test_backend_health():
    """Test backend health and connectivity"""
    print("🩺 Testing Backend Health...")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy and responsive")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def main():
    """Run complete payment system integration test"""
    print("🎯 6FB AI Agent System - Complete Payment System Integration Test")
    print("=" * 70)
    
    # Test backend connectivity
    if not test_backend_health():
        print("\n❌ Backend not available. Make sure FastAPI server is running on port 8001")
        return
    
    # Load products
    products = test_products_endpoint()
    if not products:
        print("\n❌ No products available. Cannot proceed with payment tests.")
        return
    
    # Run all payment method tests
    results = {
        "cash_payment": test_cash_payment(products),
        "payment_link": test_payment_link(products),
        "qr_payment": test_qr_payment(products),
        "terminal_payment": test_terminal_payment(products)
    }
    
    # Summary
    print("\n" + "=" * 70)
    print("📋 INTEGRATION TEST RESULTS")
    print("=" * 70)
    
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\n🎯 Overall Score: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 SUCCESS! All payment methods are fully integrated and functional!")
        print("\n📝 NEXT STEPS:")
        print("   1. Frontend authentication needs to be connected to FastAPI backend")
        print("   2. Real Stripe credentials can be configured when ready for live testing")
        print("   3. Database can be migrated to PostgreSQL for production")
        print("   4. Terminal hardware can be connected for real card-present transactions")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. Check the errors above.")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()