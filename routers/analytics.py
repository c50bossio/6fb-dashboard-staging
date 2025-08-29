"""
Analytics Router - Provides business analytics and insights
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import authentication
from routers.auth import get_current_user

# Create router
router = APIRouter()

# Pydantic models
class DateRangeRequest(BaseModel):
    start_date: str
    end_date: str

class MetricsRequest(BaseModel):
    barbershop_id: Optional[str] = None
    date_range: Optional[DateRangeRequest] = None
    metrics: Optional[List[str]] = None

# Endpoints
@router.get("/overview")
async def get_analytics_overview(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get analytics overview for the authenticated user's barbershop"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Generate sample analytics data
    return {
        "barbershop_id": barbershop_id,
        "period": "last_30_days",
        "revenue": {
            "total": 15750.00,
            "growth": 12.5,
            "average_per_day": 525.00,
            "projection_next_month": 17500.00
        },
        "appointments": {
            "total": 450,
            "completed": 420,
            "cancelled": 20,
            "no_shows": 10,
            "average_per_day": 15,
            "completion_rate": 93.3
        },
        "customers": {
            "total": 280,
            "new": 45,
            "returning": 235,
            "retention_rate": 83.9,
            "average_visits": 1.6
        },
        "services": {
            "most_popular": "Classic Haircut",
            "highest_revenue": "Premium Package",
            "average_duration": 35,
            "average_price": 35.00
        },
        "staff": {
            "total_barbers": 4,
            "average_utilization": 75.5,
            "top_performer": "Mike Barber",
            "bookings_per_barber": 112.5
        }
    }

@router.get("/revenue")
async def get_revenue_analytics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    period: str = "month"
):
    """Get revenue analytics"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Generate sample revenue data
    days = 30 if period == "month" else 7 if period == "week" else 365
    daily_revenue = []
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=days-i-1)).date().isoformat()
        revenue = random.uniform(400, 700) if i % 7 not in [0, 6] else random.uniform(200, 400)
        daily_revenue.append({
            "date": date,
            "revenue": round(revenue, 2),
            "appointments": int(revenue / 35)
        })
    
    total_revenue = sum(d["revenue"] for d in daily_revenue)
    
    return {
        "barbershop_id": barbershop_id,
        "period": period,
        "total_revenue": round(total_revenue, 2),
        "average_daily": round(total_revenue / days, 2),
        "best_day": max(daily_revenue, key=lambda x: x["revenue"]),
        "worst_day": min(daily_revenue, key=lambda x: x["revenue"]),
        "daily_breakdown": daily_revenue[-7:],  # Last 7 days
        "growth_percentage": random.uniform(5, 15)
    }

@router.get("/customers")
async def get_customer_analytics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get customer analytics"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    return {
        "barbershop_id": barbershop_id,
        "total_customers": 280,
        "segments": {
            "new": 45,
            "regular": 150,
            "vip": 35,
            "inactive": 50
        },
        "demographics": {
            "age_groups": {
                "18-25": 25,
                "26-35": 35,
                "36-45": 25,
                "46+": 15
            },
            "average_age": 32
        },
        "behavior": {
            "average_visits_per_month": 1.8,
            "average_spend": 45.00,
            "preferred_days": ["Friday", "Saturday"],
            "preferred_times": ["10:00 AM", "2:00 PM", "5:00 PM"]
        },
        "retention": {
            "rate": 83.9,
            "churn_rate": 16.1,
            "lifetime_value": 540.00
        },
        "satisfaction": {
            "average_rating": 4.7,
            "nps_score": 72,
            "review_count": 156
        }
    }

@router.get("/services")
async def get_service_analytics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get service performance analytics"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    services = [
        {
            "id": "haircut-001",
            "name": "Classic Haircut",
            "bookings": 250,
            "revenue": 8750.00,
            "average_price": 35.00,
            "average_duration": 30,
            "popularity_rank": 1,
            "growth": 10.5
        },
        {
            "id": "beard-001",
            "name": "Beard Trim",
            "bookings": 150,
            "revenue": 3000.00,
            "average_price": 20.00,
            "average_duration": 15,
            "popularity_rank": 2,
            "growth": 15.2
        },
        {
            "id": "package-001",
            "name": "Premium Package",
            "bookings": 50,
            "revenue": 4000.00,
            "average_price": 80.00,
            "average_duration": 60,
            "popularity_rank": 3,
            "growth": 25.0
        }
    ]
    
    return {
        "barbershop_id": barbershop_id,
        "services": services,
        "total_services": len(services),
        "total_bookings": sum(s["bookings"] for s in services),
        "total_revenue": sum(s["revenue"] for s in services),
        "most_profitable": max(services, key=lambda x: x["revenue"])["name"],
        "most_popular": max(services, key=lambda x: x["bookings"])["name"],
        "fastest_growing": max(services, key=lambda x: x["growth"])["name"]
    }

@router.get("/staff")
async def get_staff_analytics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get staff performance analytics"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    staff = [
        {
            "id": "mike-001",
            "name": "Mike Barber",
            "bookings": 120,
            "revenue": 4200.00,
            "average_rating": 4.8,
            "utilization": 85,
            "specialties": ["Classic Cuts", "Beard Styling"],
            "performance_score": 92
        },
        {
            "id": "john-002",
            "name": "John Smith",
            "bookings": 100,
            "revenue": 3500.00,
            "average_rating": 4.6,
            "utilization": 70,
            "specialties": ["Modern Styles", "Fades"],
            "performance_score": 85
        },
        {
            "id": "alex-003",
            "name": "Alex Johnson",
            "bookings": 110,
            "revenue": 3850.00,
            "average_rating": 4.7,
            "utilization": 77,
            "specialties": ["Traditional Cuts", "Hot Shaves"],
            "performance_score": 88
        }
    ]
    
    return {
        "barbershop_id": barbershop_id,
        "staff": staff,
        "total_staff": len(staff),
        "average_utilization": sum(s["utilization"] for s in staff) / len(staff),
        "total_bookings": sum(s["bookings"] for s in staff),
        "total_revenue": sum(s["revenue"] for s in staff),
        "top_performer": max(staff, key=lambda x: x["performance_score"]),
        "average_rating": sum(s["average_rating"] for s in staff) / len(staff)
    }

@router.get("/trends")
async def get_trend_analytics(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get business trend analytics"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    return {
        "barbershop_id": barbershop_id,
        "trends": {
            "revenue": {
                "direction": "up",
                "percentage": 12.5,
                "forecast_next_month": 17500.00
            },
            "bookings": {
                "direction": "up",
                "percentage": 8.3,
                "forecast_next_month": 486
            },
            "new_customers": {
                "direction": "up",
                "percentage": 15.2,
                "forecast_next_month": 52
            },
            "average_ticket": {
                "direction": "up",
                "percentage": 4.1,
                "current": 35.00,
                "forecast": 36.44
            }
        },
        "insights": [
            "Revenue is growing faster than booking volume, indicating successful upselling",
            "New customer acquisition is accelerating - consider loyalty programs",
            "Friday and Saturday show highest booking rates",
            "Morning slots (9-11 AM) have lowest utilization"
        ],
        "recommendations": [
            "Implement dynamic pricing for peak hours",
            "Create early bird discounts for morning slots",
            "Launch referral program to boost new customer growth",
            "Add premium services to increase average ticket size"
        ]
    }

@router.post("/custom")
async def get_custom_analytics(
    request: MetricsRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get custom analytics based on specific metrics"""
    barbershop_id = request.barbershop_id or current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop specified"
        )
    
    # Generate custom metrics based on request
    metrics_data = {}
    
    if not request.metrics or "revenue" in request.metrics:
        metrics_data["revenue"] = {
            "total": 15750.00,
            "average_daily": 525.00,
            "growth": 12.5
        }
    
    if not request.metrics or "bookings" in request.metrics:
        metrics_data["bookings"] = {
            "total": 450,
            "completed": 420,
            "completion_rate": 93.3
        }
    
    if not request.metrics or "customers" in request.metrics:
        metrics_data["customers"] = {
            "total": 280,
            "new": 45,
            "retention_rate": 83.9
        }
    
    return {
        "barbershop_id": barbershop_id,
        "date_range": request.date_range.dict() if request.date_range else "last_30_days",
        "metrics": metrics_data,
        "generated_at": datetime.now().isoformat()
    }

@router.get("/export")
async def export_analytics(
    current_user: Dict[str, Any] = Depends(get_current_user),
    format: str = "json"
):
    """Export analytics data"""
    barbershop_id = current_user.get("barbershop_id")
    
    if not barbershop_id:
        raise HTTPException(
            status_code=400,
            detail="No barbershop associated with user"
        )
    
    # Generate export data
    export_data = {
        "barbershop_id": barbershop_id,
        "export_date": datetime.now().isoformat(),
        "format": format,
        "data": {
            "revenue": {"total": 15750.00, "growth": 12.5},
            "bookings": {"total": 450, "completed": 420},
            "customers": {"total": 280, "new": 45},
            "services": {"count": 12, "most_popular": "Classic Haircut"}
        }
    }
    
    if format == "csv":
        return {
            "message": "CSV export would be generated here",
            "preview": "date,revenue,bookings,customers\n2024-01-01,525.00,15,12"
        }
    
    return export_data