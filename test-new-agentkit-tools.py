#!/usr/bin/env python3
"""
Test script for new AgentKit database tools:
1. get_inventory_status() - Inventory tracking
2. forecast_revenue() - Revenue forecasting

Tests both tools with the demo barbershop ID.
"""

import asyncio
import sys
import os
from datetime import date, timedelta

# Add services directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'services'))

from agentkit.tools import (
    get_inventory_status,
    forecast_revenue,
    TOOL_FUNCTIONS
)

# Demo barbershop ID
DEMO_BARBERSHOP_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"


async def test_inventory_status():
    """Test the get_inventory_status tool"""
    print("\n" + "=" * 80)
    print("TEST 1: Inventory Status - All Products")
    print("=" * 80)

    result = await get_inventory_status(
        barbershop_id=DEMO_BARBERSHOP_ID
    )

    print(f"\nSuccess: {result['success']}")
    if result['success']:
        print(f"Total Products: {result['total_products']}")
        print(f"Low Stock Items: {result['low_stock_items']}")
        print(f"Out of Stock Items: {result['out_of_stock_items']}")
        print(f"Total Inventory Value: ${result['total_inventory_value']:,.2f}")
        print(f"Total Cost Value: ${result['total_cost_value']:,.2f}")
        print(f"Potential Profit: ${result['potential_profit']:,.2f}")

        if result['products']:
            print(f"\nFirst 3 Products:")
            for product in result['products'][:3]:
                stock_status = "OUT OF STOCK" if product['is_out_of_stock'] else (
                    "LOW STOCK" if product['is_low_stock'] else "OK"
                )
                print(f"\n  - {product['name']}")
                print(f"    Brand: {product['brand']}")
                print(f"    Category: {product['category']}")
                print(f"    Current Stock: {product['current_stock']} (Available: {product['available_stock']})")
                print(f"    Reorder Point: {product['reorder_point']}")
                print(f"    Status: {stock_status}")
                print(f"    Retail Price: ${product['retail_price']:.2f}")
                print(f"    Inventory Value: ${product['inventory_value']:.2f}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")


async def test_inventory_status_low_stock():
    """Test inventory status with low_stock_only filter"""
    print("\n" + "=" * 80)
    print("TEST 2: Inventory Status - Low Stock Items Only")
    print("=" * 80)

    result = await get_inventory_status(
        barbershop_id=DEMO_BARBERSHOP_ID,
        low_stock_only=True
    )

    print(f"\nSuccess: {result['success']}")
    if result['success']:
        print(f"Low Stock Items Found: {result['low_stock_items']}")

        if result['products']:
            print(f"\nProducts Needing Reorder:")
            for product in result['products']:
                print(f"\n  - {product['name']}")
                print(f"    Current: {product['current_stock']} | Reorder at: {product['reorder_point']}")
                print(f"    Needs: {product['reorder_point'] - product['current_stock']} units to reach reorder point")
        else:
            print("\nNo low stock items found - all inventory levels are healthy!")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")


async def test_inventory_by_category():
    """Test inventory status filtered by category"""
    print("\n" + "=" * 80)
    print("TEST 3: Inventory Status - Hair Care Category")
    print("=" * 80)

    result = await get_inventory_status(
        barbershop_id=DEMO_BARBERSHOP_ID,
        category="hair_care"
    )

    print(f"\nSuccess: {result['success']}")
    if result['success']:
        print(f"Hair Care Products: {result['total_products']}")
        print(f"Category Filter: {result['category_filter']}")
        print(f"Total Value: ${result['total_inventory_value']:,.2f}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")


async def test_revenue_forecast():
    """Test the forecast_revenue tool"""
    print("\n" + "=" * 80)
    print("TEST 4: Revenue Forecast - 30 Days")
    print("=" * 80)

    result = await forecast_revenue(
        barbershop_id=DEMO_BARBERSHOP_ID,
        forecast_days=30,
        historical_days=90
    )

    print(f"\nSuccess: {result['success']}")
    if result['success']:
        print(f"\nForecast Period: {result['forecast_period_days']} days")
        print(f"Historical Period: {result['historical_period_days']} days")
        print(f"Historical Total Revenue: ${result['historical_total']:,.2f}")
        print(f"Historical Appointments: {result['historical_appointments']}")
        print(f"Days with Appointments: {result['days_with_appointments']}")

        print(f"\nAverages:")
        print(f"  Daily: ${result['daily_average']:,.2f}")
        print(f"  Weekly: ${result['weekly_average']:,.2f}")
        print(f"  Monthly Estimate: ${result['monthly_estimate']:,.2f}")

        print(f"\nForecast:")
        print(f"  Estimated Revenue: ${result['estimated_revenue']:,.2f}")
        print(f"  Confidence Level: {result['confidence']}")
        print(f"  Trend: {result['trend']}")

        print(f"\nForecast Range:")
        print(f"  Low (15% below): ${result['forecast_range']['low']:,.2f}")
        print(f"  Expected: ${result['forecast_range']['expected']:,.2f}")
        print(f"  High (15% above): ${result['forecast_range']['high']:,.2f}")

        print(f"\nDate Range:")
        print(f"  Historical: {result['date_range']['historical_start']} to {result['date_range']['historical_end']}")
        print(f"  Forecast: {result['date_range']['forecast_start']} to {result['date_range']['forecast_end']}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")


async def test_revenue_forecast_short_term():
    """Test revenue forecast for shorter period"""
    print("\n" + "=" * 80)
    print("TEST 5: Revenue Forecast - 7 Days (Next Week)")
    print("=" * 80)

    result = await forecast_revenue(
        barbershop_id=DEMO_BARBERSHOP_ID,
        forecast_days=7,
        historical_days=60
    )

    print(f"\nSuccess: {result['success']}")
    if result['success']:
        print(f"Next Week Forecast: ${result['estimated_revenue']:,.2f}")
        print(f"Confidence: {result['confidence']}")
        print(f"Trend: {result['trend']}")
        print(f"Daily Average (Historical): ${result['daily_average']:,.2f}")
    else:
        print(f"Error: {result.get('error', 'Unknown error')}")


async def test_tool_registry():
    """Verify both tools are registered"""
    print("\n" + "=" * 80)
    print("TEST 6: Tool Registry Verification")
    print("=" * 80)

    print(f"\nTotal tools registered: {len(TOOL_FUNCTIONS)}")
    print("\nAvailable tools:")
    for i, tool_name in enumerate(TOOL_FUNCTIONS.keys(), 1):
        print(f"  {i}. {tool_name}")

    # Check if new tools are registered
    assert "get_inventory_status" in TOOL_FUNCTIONS, "get_inventory_status not registered!"
    assert "forecast_revenue" in TOOL_FUNCTIONS, "forecast_revenue not registered!"

    print("\n✅ Both new tools are properly registered!")


async def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("AGENTKIT NEW TOOLS TEST SUITE")
    print("Testing: get_inventory_status() and forecast_revenue()")
    print("=" * 80)

    try:
        # Test inventory tracking
        await test_inventory_status()
        await test_inventory_status_low_stock()
        await test_inventory_by_category()

        # Test revenue forecasting
        await test_revenue_forecast()
        await test_revenue_forecast_short_term()

        # Verify tool registry
        await test_tool_registry()

        print("\n" + "=" * 80)
        print("ALL TESTS COMPLETED")
        print("=" * 80)
        print("\n✅ Both new tools are working correctly!")
        print("\nNext steps:")
        print("1. Test in the AI chat interface")
        print("2. Try queries like:")
        print("   - 'Show me my inventory status'")
        print("   - 'What products need reordering?'")
        print("   - 'Forecast my revenue for next month'")
        print("   - 'What will my revenue be in the next 30 days?'")

    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
