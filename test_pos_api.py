#!/usr/bin/env python3
"""
Test script for POS API endpoints
Run this after starting the backend server to verify everything works
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Configuration
BASE_URL = "http://localhost:8000"
TEST_BARBERSHOP_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_BARBER_ID = "550e8400-e29b-41d4-a716-446655440001"

def test_endpoint(endpoint, method="GET", data=None, params=None):
    """Test a single API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, params=params)
        elif method == "POST":
            response = requests.post(url, json=data, params=params)
        
        print(f"\n{'='*60}")
        print(f"Testing: {method} {endpoint}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print(f"Response: {json.dumps(result, indent=2, default=str)[:500]}...")
                return result
            except:
                print(f"Response: {response.text[:200]}...")
                return None
        else:
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"Exception: {e}")
        return None

def main():
    print("🧪 Testing POS API Endpoints")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Barbershop ID: {TEST_BARBERSHOP_ID}")
    
    # Test 1: Get POS Products
    print("\n📦 Test 1: Get POS Products")
    products = test_endpoint(
        "/api/v1/pos/products",
        params={
            "barbershop_id": TEST_BARBERSHOP_ID,
            "in_stock_only": "false"
        }
    )
    
    if not products:
        print("❌ No products found. Make sure you have products in your database.")
        print("   Add some test products first!")
        return False
    
    print(f"✅ Found {len(products)} products")
    test_product = products[0] if products else None
    
    # Test 2: Create a test sale (if we have a product)
    if test_product:
        print("\n💰 Test 2: Create Product Sale")
        sale_data = {
            "barbershop_id": TEST_BARBERSHOP_ID,
            "product_id": test_product["id"],
            "quantity": 1,
            "unit_price": float(test_product["price"]),
            "barber_id": TEST_BARBER_ID,
            "payment_method": "cash",
            "receipt_number": f"TEST-{int(datetime.now().timestamp())}"
        }
        
        sale_result = test_endpoint("/api/v1/pos/sales", method="POST", data=sale_data)
        
        if sale_result:
            print("✅ Sale created successfully")
            test_sale_id = sale_result.get("id")
            
            # Test 3: Get sale receipt
            if test_sale_id:
                print("\n🧾 Test 3: Get Receipt Data")
                test_endpoint(f"/api/v1/pos/receipt/{test_sale_id}")
        else:
            print("❌ Failed to create sale")
    
    # Test 4: Get sales history
    print("\n📊 Test 4: Get Sales History")
    test_endpoint(
        "/api/v1/pos/sales",
        params={
            "barbershop_id": TEST_BARBERSHOP_ID,
            "limit": 5
        }
    )
    
    # Test 5: Get analytics
    print("\n📈 Test 5: Get Top Products Analytics")
    test_endpoint(
        "/api/v1/pos/analytics/top-products",
        params={
            "barbershop_id": TEST_BARBERSHOP_ID,
            "days": 30,
            "limit": 5
        }
    )
    
    # Test 6: Get daily sales analytics
    print("\n📅 Test 6: Get Daily Sales Analytics")
    test_endpoint(
        "/api/v1/pos/analytics/daily-sales",
        params={
            "barbershop_id": TEST_BARBERSHOP_ID,
            "days": 7
        }
    )
    
    # Test 7: Stock adjustment
    if test_product:
        print("\n📦 Test 7: Adjust Stock")
        stock_data = {
            "product_id": test_product["id"],
            "adjustment": 5,
            "reason": "Test stock adjustment"
        }
        test_endpoint("/api/v1/pos/stock/adjust", method="POST", data=stock_data)
    
    # Test 8: Product recommendations
    if test_product:
        print("\n💡 Test 8: Get Product Recommendations")
        test_endpoint(
            f"/api/v1/pos/recommendations/{test_product['id']}",
            params={
                "barbershop_id": TEST_BARBERSHOP_ID,
                "limit": 3
            }
        )
    
    print("\n" + "="*60)
    print("🎉 POS API Testing Complete!")
    print("\nNext Steps:")
    print("1. Check that all endpoints returned 200 status codes")
    print("2. Verify data looks correct in the responses")
    print("3. Test the frontend components")
    print("4. Add more test products if needed")
    
    return True

if __name__ == "__main__":
    main()