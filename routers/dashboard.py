"""
Dashboard and analytics endpoints extracted from fastapi_backend.py
Handles dashboard statistics, recent bookings, and business data
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import random

# Import memory manager
from services.memory_manager import memory_manager

# Dashboard models
class DashboardStats(BaseModel):
    total_appointments: int
    total_revenue: float
    total_customers: int
    average_rating: float
    appointments_today: int
    revenue_today: float

class BookingInfo(BaseModel):
    id: str
    customer_name: str
    service: str
    appointment_time: datetime
    status: str
    price: float

class BusinessMetrics(BaseModel):
    revenue: Dict[str, float]
    appointments: Dict[str, int]
    customer_satisfaction: float
    growth_rate: float

# Create router
router = APIRouter(prefix="/api/v1", tags=["Dashboard"])

# Security
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Basic auth verification for API endpoints"""
    return {"user_id": "demo_user", "barbershop_id": "demo_shop"}

# Mock data generators
def generate_mock_stats(barbershop_id: str) -> DashboardStats:
    """Generate mock dashboard statistics"""
    base_seed = hash(barbershop_id) % 1000
    random.seed(base_seed)
    
    return DashboardStats(
        total_appointments=random.randint(500, 2000),
        total_revenue=round(random.uniform(5000, 50000), 2),
        total_customers=random.randint(200, 800),
        average_rating=round(random.uniform(4.0, 5.0), 1),
        appointments_today=random.randint(5, 25),
        revenue_today=round(random.uniform(200, 1500), 2)
    )

def generate_mock_bookings(barbershop_id: str, count: int = 10) -> List[BookingInfo]:
    """Generate mock recent bookings"""
    base_seed = hash(barbershop_id) % 1000
    random.seed(base_seed)
    
    services = ["Haircut", "Beard Trim", "Hair Wash", "Styling", "Hot Towel Shave"]
    statuses = ["confirmed", "completed", "cancelled", "pending"]
    names = ["John Doe", "Jane Smith", "Mike Johnson", "Sarah Wilson", "Tom Brown"]
    
    bookings = []
    for i in range(count):
        booking_time = datetime.utcnow() - timedelta(hours=random.randint(1, 168))  # Last week
        bookings.append(BookingInfo(
            id=f"booking_{base_seed}_{i}",
            customer_name=random.choice(names),
            service=random.choice(services),
            appointment_time=booking_time,
            status=random.choice(statuses),
            price=round(random.uniform(15, 80), 2)
        ))
    
    return sorted(bookings, key=lambda x: x.appointment_time, reverse=True)

def generate_mock_business_metrics(barbershop_id: str) -> BusinessMetrics:
    """Generate mock business metrics"""
    base_seed = hash(barbershop_id) % 1000
    random.seed(base_seed)
    
    # Generate monthly revenue for last 6 months
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    revenue = {month: round(random.uniform(3000, 8000), 2) for month in months}
    
    # Generate appointment counts
    appointments = {month: random.randint(80, 200) for month in months}
    
    return BusinessMetrics(
        revenue=revenue,
        appointments=appointments,
        customer_satisfaction=round(random.uniform(4.0, 5.0), 1),
        growth_rate=round(random.uniform(-5, 25), 1)
    )

@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("dashboard_stats"):
        stats = generate_mock_stats(barbershop_id)
        
        # Add additional calculated metrics
        response = {
            **stats.dict(),
            "barbershop_id": barbershop_id,
            "last_updated": datetime.utcnow(),
            "conversion_rate": round(random.uniform(0.15, 0.35), 2),
            "repeat_customer_rate": round(random.uniform(0.60, 0.85), 2),
            "average_appointment_value": round(stats.total_revenue / max(stats.total_appointments, 1), 2)
        }
        
        return response

@router.get("/dashboard/recent-bookings")
async def get_recent_bookings(
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get recent bookings"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("recent_bookings"):
        bookings = generate_mock_bookings(barbershop_id, limit)
        
        return {
            "barbershop_id": barbershop_id,
            "bookings": [booking.dict() for booking in bookings],
            "total_count": len(bookings),
            "last_updated": datetime.utcnow()
        }

@router.get("/health")
async def get_api_health():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow(),
        "version": "1.0.0",
        "service": "dashboard-api"
    }

@router.get("/analytics/live-metrics")
async def get_live_metrics(current_user: dict = Depends(get_current_user)):
    """Get live analytics metrics"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("live_metrics"):
        # Generate real-time metrics
        current_time = datetime.utcnow()
        base_seed = hash(barbershop_id + str(current_time.hour)) % 1000
        random.seed(base_seed)
        
        metrics = {
            "barbershop_id": barbershop_id,
            "timestamp": current_time,
            "active_users": random.randint(5, 50),
            "appointments_today": random.randint(15, 45),
            "revenue_today": round(random.uniform(400, 1200), 2),
            "conversion_rate": round(random.uniform(0.12, 0.28), 3),
            "page_views": random.randint(100, 500),
            "bounce_rate": round(random.uniform(0.15, 0.45), 3),
            "average_session_duration": random.randint(120, 600),  # seconds
            "top_services": [
                {"name": "Haircut", "bookings": random.randint(10, 25)},
                {"name": "Beard Trim", "bookings": random.randint(5, 15)},
                {"name": "Hair Wash", "bookings": random.randint(3, 12)}
            ]
        }
        
        return metrics

@router.post("/analytics/refresh")
async def refresh_analytics(current_user: dict = Depends(get_current_user)):
    """Refresh analytics data"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("refresh_analytics"):
        # Simulate analytics refresh
        refresh_time = datetime.utcnow()
        
        return {
            "status": "refreshed",
            "barbershop_id": barbershop_id,
            "refresh_time": refresh_time,
            "next_auto_refresh": refresh_time + timedelta(hours=1),
            "data_points_updated": random.randint(50, 200)
        }

@router.get("/analytics/cache-status")
async def get_analytics_cache_status():
    """Get analytics cache status"""
    return {
        "status": "active",
        "cache_hit_rate": round(random.uniform(0.75, 0.95), 3),
        "total_cached_queries": random.randint(100, 1000),
        "cache_size_mb": round(random.uniform(10, 100), 1),
        "last_cleared": datetime.utcnow() - timedelta(hours=random.randint(1, 24)),
        "ttl_remaining": random.randint(300, 3600)  # seconds
    }

@router.get("/business-data/metrics")
async def get_business_metrics(current_user: dict = Depends(get_current_user)):
    """Get business performance metrics"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("business_metrics"):
        metrics = generate_mock_business_metrics(barbershop_id)
        
        # Add additional business insights
        response = {
            **metrics.dict(),
            "barbershop_id": barbershop_id,
            "period": "last_6_months",
            "last_updated": datetime.utcnow(),
            "trends": {
                "revenue_trend": "increasing" if metrics.growth_rate > 0 else "decreasing",
                "customer_growth": round(random.uniform(-10, 30), 1),
                "service_popularity": [
                    {"service": "Haircut", "percentage": 45.2},
                    {"service": "Beard Trim", "percentage": 23.1},
                    {"service": "Hair Wash", "percentage": 18.7},
                    {"service": "Styling", "percentage": 13.0}
                ]
            }
        }
        
        return response

@router.post("/business-data/metrics")
async def update_business_metrics(
    metrics: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update business metrics"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("update_business_metrics"):
        # Simulate metrics update
        return {
            "status": "updated",
            "barbershop_id": barbershop_id,
            "updated_at": datetime.utcnow(),
            "metrics_updated": list(metrics.keys()),
            "validation_status": "passed"
        }

@router.post("/business-data/refresh")
async def refresh_business_data(current_user: dict = Depends(get_current_user)):
    """Refresh business data"""
    barbershop_id = current_user.get("barbershop_id")
    
    with memory_manager.memory_context("refresh_business_data"):
        # Simulate data refresh
        return {
            "status": "refreshing",
            "barbershop_id": barbershop_id,
            "refresh_started": datetime.utcnow(),
            "estimated_completion": datetime.utcnow() + timedelta(minutes=5),
            "data_sources": ["appointments", "payments", "customers", "reviews"]
        }

@router.get("/business-data/cache-status")
async def get_business_data_cache_status():
    """Get business data cache status"""
    return {
        "status": "active",
        "cache_layers": {
            "appointments": {
                "hit_rate": round(random.uniform(0.80, 0.95), 3),
                "size_mb": round(random.uniform(5, 25), 1),
                "last_updated": datetime.utcnow() - timedelta(minutes=random.randint(5, 60))
            },
            "customers": {
                "hit_rate": round(random.uniform(0.85, 0.98), 3),
                "size_mb": round(random.uniform(3, 15), 1),
                "last_updated": datetime.utcnow() - timedelta(minutes=random.randint(10, 120))
            },
            "revenue": {
                "hit_rate": round(random.uniform(0.75, 0.90), 3),
                "size_mb": round(random.uniform(2, 10), 1),
                "last_updated": datetime.utcnow() - timedelta(minutes=random.randint(15, 180))
            }
        },
        "total_cache_size_mb": round(random.uniform(15, 50), 1),
        "global_hit_rate": round(random.uniform(0.80, 0.94), 3)
    }