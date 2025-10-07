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
            .select('customer_id, client_id, created_at') \
            .eq('barbershop_id', barbershop_id) \
            .in_('status', ['CONFIRMED', 'COMPLETED'])

        if start_date and end_date:
            query = query.gte('scheduled_at', f"{start_date}T00:00:00") \
                         .lte('scheduled_at', f"{end_date}T23:59:59")

        response = query.execute()
        appointments = response.data if response.data else []

        # Count unique customers (use customer_id or client_id)
        customer_ids = set()
        for apt in appointments:
            customer_id = apt.get('customer_id') or apt.get('client_id')
            if customer_id:
                customer_ids.add(customer_id)

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
    }
]


# Tool execution mapping
TOOL_FUNCTIONS = {
    "get_revenue_by_date_range": get_revenue_by_date_range,
    "get_appointment_metrics": get_appointment_metrics,
    "get_top_services": get_top_services,
    "get_commission_summary": get_commission_summary,
    "get_customer_metrics": get_customer_metrics,
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
    "TOOL_SCHEMAS",
    "TOOL_FUNCTIONS",
    "execute_tool",
]
