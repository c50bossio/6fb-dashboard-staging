"""
OpenAI AgentKit - Database Query Tools

Provides database access functions that agents can call via OpenAI function calling.
These tools allow agents to fetch REAL data from the Supabase database.

Tools Available:
1. get_revenue_by_date_range - Calculate revenue for a date range
2. get_appointment_metrics - Get appointment statistics
3. get_top_services - Find most popular services
4. get_commission_summary - Calculate barber commissions
5. get_customer_metrics - Get customer statistics
6. get_inventory_status - Track product inventory levels and reorder needs
7. forecast_revenue - Predict future revenue based on historical trends
"""

import logging
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, Dict, List, Any
from supabase import create_client, Client

from .config import AgentKitConfig

logger = logging.getLogger(__name__)


# ============================================================================
# SUPABASE CLIENT INITIALIZATION
# ============================================================================

def get_supabase_client() -> Client:
    """
    Get authenticated Supabase client for database queries.

    Returns:
        Supabase client instance
    """
    if not AgentKitConfig.SUPABASE_URL or not AgentKitConfig.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase configuration missing")

    return create_client(
        AgentKitConfig.SUPABASE_URL,
        AgentKitConfig.SUPABASE_SERVICE_ROLE_KEY
    )


# ============================================================================
# DATABASE QUERY TOOLS
# ============================================================================

async def get_revenue_by_date_range(
    start_date: str,
    end_date: str,
    barbershop_id: str,
    barber_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate total revenue for a date range.

    Queries the appointments table to sum revenue since that's where barbershop_id exists.

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        barbershop_id: UUID of the barbershop
        barber_id: Optional UUID of specific barber (for individual barber queries)

    Returns:
        Dictionary with revenue metrics:
        - total_revenue: Total revenue amount (service_price + tips)
        - appointment_count: Number of appointments
        - service_revenue: Revenue from services only
        - tips_revenue: Tips received
        - average_service_price: Average service price
        - date_range: The queried date range
    """
    try:
        supabase = get_supabase_client()

        # Query appointments table (has barbershop_id and price fields)
        query = supabase.table('appointments') \
            .select('service_price, tip_amount, total_amount, scheduled_at, status') \
            .eq('barbershop_id', barbershop_id) \
            .gte('scheduled_at', f"{start_date}T00:00:00") \
            .lte('scheduled_at', f"{end_date}T23:59:59") \
            .in_('status', ['CONFIRMED', 'COMPLETED'])  # Only count confirmed/completed

        # Filter by barber if specified
        if barber_id:
            query = query.eq('barber_id', barber_id)

        # Execute query
        response = query.execute()
        appointments = response.data if response.data else []

        # Calculate metrics from appointments
        service_revenue = sum(Decimal(str(a.get('service_price', 0))) for a in appointments)
        tips_revenue = sum(Decimal(str(a.get('tip_amount', 0))) for a in appointments)
        total_revenue = service_revenue + tips_revenue
        appointment_count = len(appointments)
        average_service_price = service_revenue / appointment_count if appointment_count > 0 else Decimal('0')

        # Estimate commission (assume 40% to shop, 60% to barber standard)
        estimated_commission = total_revenue * Decimal('0.6')
        net_revenue_to_shop = total_revenue - estimated_commission

        # Count by status
        confirmed = len([a for a in appointments if a.get('status') == 'CONFIRMED'])
        completed = len([a for a in appointments if a.get('status') == 'COMPLETED'])

        result = {
            "success": True,
            "total_revenue": float(total_revenue),
            "service_revenue": float(service_revenue),
            "tips_revenue": float(tips_revenue),
            "appointment_count": appointment_count,
            "confirmed_appointments": confirmed,
            "completed_appointments": completed,
            "average_service_price": float(average_service_price),
            "estimated_commission": float(estimated_commission),
            "net_revenue_to_shop": float(net_revenue_to_shop),
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }

        logger.info(f"Revenue query successful: ${total_revenue} from {appointment_count} appointments")
        return result

    except Exception as e:
        logger.error(f"Error querying revenue: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "total_revenue": 0,
            "appointment_count": 0
        }


async def get_appointment_metrics(
    start_date: str,
    end_date: str,
    barbershop_id: str,
    barber_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get appointment statistics for a date range.

    Args:
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        barbershop_id: UUID of the barbershop
        barber_id: Optional UUID of specific barber

    Returns:
        Dictionary with appointment metrics:
        - total_appointments: Total number of appointments
        - confirmed: Number of confirmed appointments
        - completed: Number of completed appointments
        - cancelled: Number of cancelled appointments
        - no_shows: Number of no-show appointments
        - total_revenue: Revenue from appointments (service_price + tips)
        - average_service_price: Average service price
        - total_tips: Total tips received
    """
    try:
        supabase = get_supabase_client()

        # Build query
        query = supabase.table('appointments') \
            .select('status, service_price, tip_amount, scheduled_at') \
            .eq('barbershop_id', barbershop_id) \
            .gte('scheduled_at', f"{start_date}T00:00:00") \
            .lte('scheduled_at', f"{end_date}T23:59:59")

        if barber_id:
            query = query.eq('barber_id', barber_id)

        response = query.execute()
        appointments = response.data if response.data else []

        # Calculate metrics
        total_appointments = len(appointments)
        confirmed = len([a for a in appointments if a.get('status') == 'CONFIRMED'])
        completed = len([a for a in appointments if a.get('status') == 'COMPLETED'])
        cancelled = len([a for a in appointments if a.get('status') == 'CANCELLED'])
        no_shows = len([a for a in appointments if a.get('status') == 'NO_SHOW'])

        # Revenue calculations
        total_revenue = sum(
            Decimal(str(a.get('service_price', 0))) + Decimal(str(a.get('tip_amount', 0)))
            for a in appointments
        )
        total_service_revenue = sum(Decimal(str(a.get('service_price', 0))) for a in appointments)
        total_tips = sum(Decimal(str(a.get('tip_amount', 0))) for a in appointments)
        average_service_price = total_service_revenue / total_appointments if total_appointments > 0 else Decimal('0')

        result = {
            "success": True,
            "total_appointments": total_appointments,
            "by_status": {
                "confirmed": confirmed,
                "completed": completed,
                "cancelled": cancelled,
                "no_shows": no_shows
            },
            "revenue_metrics": {
                "total_revenue": float(total_revenue),
                "service_revenue": float(total_service_revenue),
                "total_tips": float(total_tips),
                "average_service_price": float(average_service_price)
            },
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }

        logger.info(f"Appointment metrics query successful: {total_appointments} appointments")
        return result

    except Exception as e:
        logger.error(f"Error querying appointments: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "total_appointments": 0
        }


async def get_top_services(
    barbershop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 5
) -> Dict[str, Any]:
    """
    Get the most popular services by booking count and revenue.

    Args:
        barbershop_id: UUID of the barbershop
        start_date: Optional start date in YYYY-MM-DD format
        end_date: Optional end date in YYYY-MM-DD format
        limit: Number of top services to return (default 5)

    Returns:
        Dictionary with top services:
        - services: List of services with booking_count and total_revenue
    """
    try:
        supabase = get_supabase_client()

        # Build query with join to services table
        query = supabase.table('appointments') \
            .select('service_id, service_price, services(id, name, duration_minutes, description)') \
            .eq('barbershop_id', barbershop_id) \
            .in_('status', ['CONFIRMED', 'COMPLETED'])

        if start_date and end_date:
            query = query.gte('scheduled_at', f"{start_date}T00:00:00") \
                         .lte('scheduled_at', f"{end_date}T23:59:59")

        response = query.execute()
        appointments = response.data if response.data else []

        # Aggregate by service
        service_metrics = {}
        for apt in appointments:
            service_id = apt.get('service_id')
            if not service_id or not apt.get('services'):
                continue

            service_info = apt['services']
            service_name = service_info.get('name', 'Unknown Service')

            if service_id not in service_metrics:
                service_metrics[service_id] = {
                    "service_name": service_name,
                    "service_duration": service_info.get('duration_minutes', 0),
                    "booking_count": 0,
                    "total_revenue": Decimal('0')
                }

            service_metrics[service_id]["booking_count"] += 1
            service_metrics[service_id]["total_revenue"] += Decimal(str(apt.get('service_price', 0)))

        # Sort by booking count and convert to list
        sorted_services = sorted(
            service_metrics.values(),
            key=lambda x: x['booking_count'],
            reverse=True
        )[:limit]

        # Convert Decimal to float for JSON serialization
        for service in sorted_services:
            service['total_revenue'] = float(service['total_revenue'])
            service['average_price'] = float(service['total_revenue'] / service['booking_count']) if service['booking_count'] > 0 else 0

        result = {
            "success": True,
            "services": sorted_services,
            "date_range": {
                "start": start_date or "all_time",
                "end": end_date or "all_time"
            }
        }

        logger.info(f"Top services query successful: {len(sorted_services)} services")
        return result

    except Exception as e:
        logger.error(f"Error querying top services: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "services": []
        }


async def get_commission_summary(
    barber_id: str,
    start_date: str,
    end_date: str,
    barbershop_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calculate commission earned by a barber for a date range.

    Uses appointments table since commission data isn't in transactions table.
    Assumes standard 60/40 split (60% to barber, 40% to shop).

    Args:
        barber_id: UUID of the barber
        start_date: Start date in YYYY-MM-DD format
        end_date: End date in YYYY-MM-DD format
        barbershop_id: Optional UUID of barbershop (for multi-shop barbers)

    Returns:
        Dictionary with commission metrics:
        - total_commission: Total commission earned (estimated at 60%)
        - appointment_count: Number of appointments
        - total_services_revenue: Total revenue from services
        - commission_rate: Commission rate (60%)
    """
    try:
        supabase = get_supabase_client()

        # Query appointments for this barber
        query = supabase.table('appointments') \
            .select('service_price, tip_amount, scheduled_at, status') \
            .eq('barber_id', barber_id) \
            .gte('scheduled_at', f"{start_date}T00:00:00") \
            .lte('scheduled_at', f"{end_date}T23:59:59") \
            .in_('status', ['CONFIRMED', 'COMPLETED'])

        if barbershop_id:
            query = query.eq('barbershop_id', barbershop_id)

        response = query.execute()
        appointments = response.data if response.data else []

        # Calculate metrics
        total_services_revenue = sum(Decimal(str(a.get('service_price', 0))) for a in appointments)
        total_tips = sum(Decimal(str(a.get('tip_amount', 0))) for a in appointments)

        # Assume 60% commission rate (standard in barbershop industry)
        commission_rate = Decimal('0.6')
        total_commission = (total_services_revenue * commission_rate) + total_tips  # Tips usually go 100% to barber

        result = {
            "success": True,
            "total_commission": float(total_commission),
            "appointment_count": len(appointments),
            "total_services_revenue": float(total_services_revenue),
            "total_tips": float(total_tips),
            "commission_rate": float(commission_rate * 100),  # Convert to percentage (60%)
            "date_range": {
                "start": start_date,
                "end": end_date
            },
            "note": "Commission calculated using standard 60/40 split. Tips go 100% to barber."
        }

        logger.info(f"Commission summary successful: ${total_commission} from {len(appointments)} appointments")
        return result

    except Exception as e:
        logger.error(f"Error querying commissions: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "total_commission": 0
        }


async def get_customer_metrics(
    barbershop_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get customer statistics for a barbershop.

    Args:
        barbershop_id: UUID of the barbershop
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering

    Returns:
        Dictionary with customer metrics:
        - total_customers: Total unique customers
        - new_customers: New customers in date range
        - returning_customers: Returning customers
        - average_visits: Average visits per customer
    """
    try:
        supabase = get_supabase_client()

        # Get all customers for this barbershop
        query = supabase.table('appointments') \
            .select('client_id, created_at') \
            .eq('barbershop_id', barbershop_id) \
            .in_('status', ['CONFIRMED', 'COMPLETED'])

        if start_date and end_date:
            query = query.gte('scheduled_at', f"{start_date}T00:00:00") \
                         .lte('scheduled_at', f"{end_date}T23:59:59")

        response = query.execute()
        appointments = response.data if response.data else []

        # Count unique customers
        customer_ids = set()
        for apt in appointments:
            client_id = apt.get('client_id')
            if client_id:
                customer_ids.add(client_id)

        total_customers = len(customer_ids)
        total_appointments = len(appointments)
        average_visits = total_appointments / total_customers if total_customers > 0 else 0

        result = {
            "success": True,
            "total_customers": total_customers,
            "total_appointments": total_appointments,
            "average_visits_per_customer": round(average_visits, 2),
            "date_range": {
                "start": start_date or "all_time",
                "end": end_date or "all_time"
            }
        }

        logger.info(f"Customer metrics query successful: {total_customers} unique customers")
        return result

    except Exception as e:
        logger.error(f"Error querying customer metrics: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "total_customers": 0
        }


async def get_inventory_status(
    barbershop_id: str,
    category: Optional[str] = None,
    low_stock_only: bool = False
) -> Dict[str, Any]:
    """
    Track product inventory levels and identify items needing reorder.

    Queries the products table to get current inventory status, calculates
    inventory value, and flags items below reorder threshold.

    Args:
        barbershop_id: UUID of the barbershop
        category: Optional category filter (e.g., 'hair_care', 'beard_care', 'styling')
        low_stock_only: If True, only return items needing reorder

    Returns:
        Dictionary with inventory metrics:
        - total_products: Total number of products
        - low_stock_items: Count of items below reorder point
        - out_of_stock_items: Count of items with 0 stock
        - total_inventory_value: Total retail value of inventory
        - total_cost_value: Total cost value of inventory
        - products: List of product details with stock levels
    """
    try:
        supabase = get_supabase_client()

        # Build query - only select columns that exist in actual database
        query = supabase.table('products') \
            .select('id, name, brand, category, sku, current_stock, '
                   'min_stock_level, reorder_point, cost_price, retail_price, '
                   'is_active, track_inventory') \
            .eq('barbershop_id', barbershop_id) \
            .eq('is_active', True)

        # Filter by category if provided
        if category:
            query = query.eq('category', category)

        response = query.execute()
        products = response.data if response.data else []

        # Calculate metrics
        total_products = 0
        low_stock_items = 0
        out_of_stock_items = 0
        total_inventory_value = Decimal('0')
        total_cost_value = Decimal('0')

        product_list = []

        for product in products:
            # Skip if track_inventory is False
            if not product.get('track_inventory', True):
                continue

            current_stock = product.get('current_stock', 0) or 0
            reorder_point = product.get('reorder_point', 0) or 0
            retail_price = Decimal(str(product.get('retail_price', 0) or 0))
            cost_price = Decimal(str(product.get('cost_price', 0) or 0))

            # Check stock status
            is_low_stock = current_stock <= reorder_point
            is_out_of_stock = current_stock == 0

            # Skip if filtering for low stock only
            if low_stock_only and not is_low_stock:
                continue

            total_products += 1
            if is_low_stock:
                low_stock_items += 1
            if is_out_of_stock:
                out_of_stock_items += 1

            # Calculate values
            product_inventory_value = retail_price * current_stock
            product_cost_value = cost_price * current_stock
            total_inventory_value += product_inventory_value
            total_cost_value += product_cost_value

            # Build product info
            product_info = {
                "id": product.get('id'),
                "name": product.get('name'),
                "brand": product.get('brand'),
                "category": product.get('category'),
                "sku": product.get('sku'),
                "current_stock": current_stock,
                "reorder_point": reorder_point,
                "min_stock_level": product.get('min_stock_level', 0) or 0,
                "retail_price": float(retail_price),
                "cost_price": float(cost_price),
                "inventory_value": float(product_inventory_value),
                "is_low_stock": is_low_stock,
                "is_out_of_stock": is_out_of_stock,
                "needs_reorder": is_low_stock
            }

            product_list.append(product_info)

        # Sort by stock status (low stock first)
        product_list.sort(key=lambda x: (not x['is_low_stock'], x['current_stock']))

        result = {
            "success": True,
            "total_products": total_products,
            "low_stock_items": low_stock_items,
            "out_of_stock_items": out_of_stock_items,
            "total_inventory_value": float(total_inventory_value),
            "total_cost_value": float(total_cost_value),
            "potential_profit": float(total_inventory_value - total_cost_value),
            "products": product_list,
            "category_filter": category or "all",
            "showing_low_stock_only": low_stock_only
        }

        logger.info(f"Inventory status query successful: {total_products} products, "
                   f"{low_stock_items} low stock items")
        return result

    except Exception as e:
        logger.error(f"Error querying inventory status: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "total_products": 0,
            "products": []
        }


async def forecast_revenue(
    barbershop_id: str,
    forecast_days: int = 30,
    historical_days: int = 90
) -> Dict[str, Any]:
    """
    Predict future revenue based on historical appointment trends.

    Analyzes past appointments and revenue data to calculate average revenue
    per day/week/month and project forward based on trends. Includes confidence
    metrics and considers seasonality patterns.

    Args:
        barbershop_id: UUID of the barbershop
        forecast_days: Number of days to forecast (default 30)
        historical_days: Number of days of history to analyze (default 90)

    Returns:
        Dictionary with revenue forecast:
        - forecast_period_days: Days being forecasted
        - historical_period_days: Days of history analyzed
        - estimated_revenue: Projected revenue for forecast period
        - confidence: Confidence level (high/medium/low)
        - daily_average: Average daily revenue from historical data
        - weekly_average: Average weekly revenue
        - trend: Revenue trend (increasing/stable/decreasing)
        - historical_total: Total revenue in historical period
    """
    try:
        supabase = get_supabase_client()

        # Calculate date ranges
        today = date.today()
        historical_start = today - timedelta(days=historical_days)
        historical_end = today

        # Query historical appointments
        query = supabase.table('appointments') \
            .select('service_price, tip_amount, scheduled_at, status') \
            .eq('barbershop_id', barbershop_id) \
            .gte('scheduled_at', f"{historical_start}T00:00:00") \
            .lte('scheduled_at', f"{historical_end}T23:59:59") \
            .in_('status', ['CONFIRMED', 'COMPLETED'])

        response = query.execute()
        appointments = response.data if response.data else []

        # If no data, return low confidence forecast
        if not appointments:
            return {
                "success": True,
                "forecast_period_days": forecast_days,
                "historical_period_days": historical_days,
                "estimated_revenue": 0.0,
                "confidence": "low",
                "daily_average": 0.0,
                "weekly_average": 0.0,
                "trend": "insufficient_data",
                "historical_total": 0.0,
                "message": "No historical data available for forecasting. Please ensure appointments exist."
            }

        # Calculate total historical revenue
        historical_revenue = sum(
            Decimal(str(apt.get('service_price', 0))) + Decimal(str(apt.get('tip_amount', 0)))
            for apt in appointments
        )

        # Calculate averages
        actual_days_with_data = len(set(
            datetime.fromisoformat(apt['scheduled_at'].replace('Z', '+00:00')).date()
            for apt in appointments
        ))

        daily_average = historical_revenue / actual_days_with_data if actual_days_with_data > 0 else Decimal('0')
        weekly_average = daily_average * 7

        # Simple linear trend analysis (compare first half to second half)
        midpoint = len(appointments) // 2
        first_half_revenue = sum(
            Decimal(str(apt.get('service_price', 0))) + Decimal(str(apt.get('tip_amount', 0)))
            for apt in appointments[:midpoint]
        )
        second_half_revenue = sum(
            Decimal(str(apt.get('service_price', 0))) + Decimal(str(apt.get('tip_amount', 0)))
            for apt in appointments[midpoint:]
        )

        # Determine trend
        if second_half_revenue > first_half_revenue * Decimal('1.1'):  # 10% increase
            trend = "increasing"
            trend_multiplier = Decimal('1.05')  # 5% boost for forecast
        elif second_half_revenue < first_half_revenue * Decimal('0.9'):  # 10% decrease
            trend = "decreasing"
            trend_multiplier = Decimal('0.95')  # 5% reduction for forecast
        else:
            trend = "stable"
            trend_multiplier = Decimal('1.0')

        # Calculate forecast
        base_forecast = daily_average * forecast_days
        estimated_revenue = base_forecast * trend_multiplier

        # Determine confidence based on data quality
        if actual_days_with_data >= historical_days * 0.8 and len(appointments) >= 50:
            confidence = "high"
        elif actual_days_with_data >= historical_days * 0.5 and len(appointments) >= 20:
            confidence = "medium"
        else:
            confidence = "low"

        result = {
            "success": True,
            "forecast_period_days": forecast_days,
            "historical_period_days": historical_days,
            "estimated_revenue": float(estimated_revenue),
            "confidence": confidence,
            "daily_average": float(daily_average),
            "weekly_average": float(weekly_average),
            "monthly_estimate": float(daily_average * 30),
            "trend": trend,
            "historical_total": float(historical_revenue),
            "historical_appointments": len(appointments),
            "days_with_appointments": actual_days_with_data,
            "forecast_range": {
                "low": float(estimated_revenue * Decimal('0.85')),  # 15% lower
                "expected": float(estimated_revenue),
                "high": float(estimated_revenue * Decimal('1.15'))  # 15% higher
            },
            "date_range": {
                "historical_start": str(historical_start),
                "historical_end": str(historical_end),
                "forecast_start": str(today),
                "forecast_end": str(today + timedelta(days=forecast_days))
            }
        }

        logger.info(f"Revenue forecast successful: ${estimated_revenue} for {forecast_days} days "
                   f"with {confidence} confidence")
        return result

    except Exception as e:
        logger.error(f"Error forecasting revenue: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
            "estimated_revenue": 0
        }


# ============================================================================
# TOOL REGISTRY FOR OPENAI FUNCTION CALLING
# ============================================================================

# Tool schemas in OpenAI format
TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_revenue_by_date_range",
            "description": "Calculate total revenue, commissions, and transaction count for a specific date range. Use this when users ask about revenue, earnings, or income for a time period.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date in YYYY-MM-DD format"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date in YYYY-MM-DD format"
                    },
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "barber_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Optional UUID of specific barber for individual queries"
                    }
                },
                "required": ["start_date", "end_date", "barbershop_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_appointment_metrics",
            "description": "Get appointment statistics including total appointments, status breakdown (confirmed, completed, cancelled, no-shows), and revenue from appointments. Use this when users ask about booking performance or appointment data.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date in YYYY-MM-DD format"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date in YYYY-MM-DD format"
                    },
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "barber_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Optional UUID of specific barber"
                    }
                },
                "required": ["start_date", "end_date", "barbershop_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_services",
            "description": "Get the most popular services by booking count and total revenue. Use this when users ask about best-selling services or what services are most popular.",
            "parameters": {
                "type": "object",
                "properties": {
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional start date in YYYY-MM-DD format"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional end date in YYYY-MM-DD format"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of top services to return (default 5)",
                        "default": 5
                    }
                },
                "required": ["barbershop_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_commission_summary",
            "description": "Calculate commission earned by a specific barber for a date range. Use this when barbers ask about their earnings or commissions.",
            "parameters": {
                "type": "object",
                "properties": {
                    "barber_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barber"
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Start date in YYYY-MM-DD format"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "End date in YYYY-MM-DD format"
                    },
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "Optional UUID of barbershop for multi-shop barbers"
                    }
                },
                "required": ["barber_id", "start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_metrics",
            "description": "Get customer statistics including total customers, average visits per customer, and appointment counts. Use this when users ask about customer base or retention.",
            "parameters": {
                "type": "object",
                "properties": {
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "start_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional start date in YYYY-MM-DD format"
                    },
                    "end_date": {
                        "type": "string",
                        "format": "date",
                        "description": "Optional end date in YYYY-MM-DD format"
                    }
                },
                "required": ["barbershop_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_status",
            "description": "Track product inventory levels and identify items needing reorder. Returns current stock, low stock items, inventory value, and reorder alerts. Use this when users ask about inventory, stock levels, or what products need to be reordered.",
            "parameters": {
                "type": "object",
                "properties": {
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter (e.g., 'hair_care', 'beard_care', 'styling', 'tools', 'accessories')"
                    },
                    "low_stock_only": {
                        "type": "boolean",
                        "description": "If true, only return items that need reordering (below reorder point)",
                        "default": False
                    }
                },
                "required": ["barbershop_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "forecast_revenue",
            "description": "Predict future revenue based on historical appointment trends and patterns. Analyzes past data to project forward with confidence metrics. Use this when users ask about future revenue, revenue projections, or financial forecasting.",
            "parameters": {
                "type": "object",
                "properties": {
                    "barbershop_id": {
                        "type": "string",
                        "format": "uuid",
                        "description": "UUID of the barbershop"
                    },
                    "forecast_days": {
                        "type": "integer",
                        "description": "Number of days to forecast into the future (default 30)",
                        "default": 30
                    },
                    "historical_days": {
                        "type": "integer",
                        "description": "Number of days of historical data to analyze (default 90)",
                        "default": 90
                    }
                },
                "required": ["barbershop_id"]
            }
        }
    }
]


# Tool execution mapping
TOOL_FUNCTIONS = {
    "get_revenue_by_date_range": get_revenue_by_date_range,
    "get_appointment_metrics": get_appointment_metrics,
    "get_top_services": get_top_services,
    "get_commission_summary": get_commission_summary,
    "get_customer_metrics": get_customer_metrics,
    "get_inventory_status": get_inventory_status,
    "forecast_revenue": forecast_revenue,
}


async def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a database tool by name.

    Args:
        tool_name: Name of the tool to execute
        arguments: Dictionary of arguments for the tool

    Returns:
        Tool execution result
    """
    if tool_name not in TOOL_FUNCTIONS:
        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}"
        }

    try:
        tool_function = TOOL_FUNCTIONS[tool_name]
        result = await tool_function(**arguments)
        return result
    except Exception as e:
        logger.error(f"Error executing tool {tool_name}: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e)
        }


# Export all
__all__ = [
    "get_revenue_by_date_range",
    "get_appointment_metrics",
    "get_top_services",
    "get_commission_summary",
    "get_customer_metrics",
    "get_inventory_status",
    "forecast_revenue",
    "TOOL_SCHEMAS",
    "TOOL_FUNCTIONS",
    "execute_tool",
]
