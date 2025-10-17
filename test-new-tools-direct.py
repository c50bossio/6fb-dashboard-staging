#!/usr/bin/env python3
"""
Direct test of new AgentKit tools without needing FastAPI server
"""
import asyncio
import sys
import json
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
from dotenv import load_dotenv
load_dotenv('.env.local')

# Import the new tools directly
from services.agentkit.tools import (
    get_inventory_status,
    forecast_revenue,
    get_customer_metrics,
    TOOL_FUNCTIONS
)

DEMO_BARBERSHOP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async def test_inventory_tracking():
    """Test the new inventory tracking tool"""
    print("\n" + "="*80)
    print("TEST 1: INVENTORY TRACKING")
    print("="*80)
    print("Query: 'Show me my inventory status'\n")

    try:
        result = await get_inventory_status(
            barbershop_id=DEMO_BARBERSHOP_ID
        )

        print(f"✅ Tool executed successfully")
        print(f"\nResults:")
        print(f"  - Total Products: {result.get('total_products', 0)}")
        print(f"  - Low Stock Items: {result.get('low_stock_items', 0)}")
        print(f"  - Out of Stock: {result.get('out_of_stock_items', 0)}")
        print(f"  - Total Inventory Value: ${result.get('total_inventory_value', 0):.2f}")
        print(f"  - Total Cost Value: ${result.get('total_cost_value', 0):.2f}")
        print(f"  - Potential Profit: ${result.get('potential_profit', 0):.2f}")

        if result.get('products'):
            print(f"\n  Sample Products:")
            for product in result['products'][:3]:
                status = "⚠️ LOW STOCK" if product['is_low_stock'] else "✅ In Stock"
                print(f"    - {product['name']}: {product['current_stock']} units {status}")
        else:
            print(f"\n  ⚠️ No products in inventory (table may be empty)")

        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_revenue_forecasting():
    """Test the new revenue forecasting tool"""
    print("\n" + "="*80)
    print("TEST 2: REVENUE FORECASTING")
    print("="*80)
    print("Query: 'Forecast my revenue for the next 30 days'\n")

    try:
        result = await forecast_revenue(
            barbershop_id=DEMO_BARBERSHOP_ID,
            forecast_days=30,
            historical_days=90
        )

        print(f"✅ Tool executed successfully")
        print(f"\nResults:")
        print(f"  - Forecast Period: {result.get('forecast_period_days', 0)} days")
        print(f"  - Historical Data: {result.get('historical_appointments', 0)} appointments over {result.get('days_with_appointments', 0)} days")
        print(f"  - Estimated Revenue: ${result.get('estimated_revenue', 0):.2f}")
        print(f"  - Confidence: {result.get('confidence', 'unknown').upper()}")
        print(f"  - Trend: {result.get('trend', 'unknown').upper()}")
        print(f"\n  Daily Averages:")
        print(f"    - Daily: ${result.get('daily_average', 0):.2f}")
        print(f"    - Weekly: ${result.get('weekly_average', 0):.2f}")
        print(f"    - Monthly: ${result.get('monthly_estimate', 0):.2f}")

        if result.get('forecast_range'):
            fr = result['forecast_range']
            print(f"\n  Forecast Range:")
            print(f"    - Low: ${fr.get('low', 0):.2f}")
            print(f"    - Expected: ${fr.get('expected', 0):.2f}")
            print(f"    - High: ${fr.get('high', 0):.2f}")

        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_customer_metrics():
    """Test the fixed customer metrics tool"""
    print("\n" + "="*80)
    print("TEST 3: CUSTOMER METRICS (FIXED)")
    print("="*80)
    print("Query: 'How many customers do we have?'\n")

    try:
        result = await get_customer_metrics(
            barbershop_id=DEMO_BARBERSHOP_ID
        )

        print(f"✅ Tool executed successfully")
        print(f"\nResults:")
        print(f"  - Total Customers: {result.get('total_customers', 0)}")
        print(f"  - Total Appointments: {result.get('total_appointments', 0)}")
        print(f"  - Average Visits per Customer: {result.get('average_visits_per_customer', 0):.2f}")

        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


async def test_tool_registry():
    """Verify all tools are registered"""
    print("\n" + "="*80)
    print("TEST 4: TOOL REGISTRY")
    print("="*80)

    print(f"\nRegistered Tools ({len(TOOL_FUNCTIONS)}):")
    for i, tool_name in enumerate(TOOL_FUNCTIONS.keys(), 1):
        print(f"  {i}. {tool_name}")

    expected_tools = [
        'get_revenue_by_date_range',
        'get_appointment_metrics',
        'get_top_services',
        'get_commission_summary',
        'get_customer_metrics',
        'get_inventory_status',
        'forecast_revenue'
    ]

    missing_tools = [t for t in expected_tools if t not in TOOL_FUNCTIONS]

    if missing_tools:
        print(f"\n❌ Missing tools: {missing_tools}")
        return False
    else:
        print(f"\n✅ All 7 tools are properly registered!")
        return True


async def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("AGENTKIT NEW TOOLS - DIRECT TESTING")
    print("="*80)
    print("Testing new tools directly without FastAPI server")
    print("This verifies the tools work at the code level\n")

    results = []

    # Test 1: Inventory Tracking
    results.append(("Inventory Tracking", await test_inventory_tracking()))

    # Test 2: Revenue Forecasting
    results.append(("Revenue Forecasting", await test_revenue_forecasting()))

    # Test 3: Customer Metrics (Fixed)
    results.append(("Customer Metrics Fix", await test_customer_metrics()))

    # Test 4: Tool Registry
    results.append(("Tool Registry", await test_tool_registry()))

    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)

    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)

    print(f"\n{passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED! All new tools are working correctly.")
    else:
        print(f"\n⚠️ {total - passed} test(s) failed - see details above")


if __name__ == "__main__":
    asyncio.run(main())
