"""
Customer Analytics API Router
Comprehensive customer analytics endpoints for barbershop platform
Includes health scores, CLV, churn predictions, segments, cohorts, and journey analytics
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta, date
import os
import asyncio
import json
from supabase import create_client, Client
import redis
from decimal import Decimal

# Import memory manager and services
from services.memory_manager import memory_manager
from services.customer_analytics_service import CustomerAnalyticsService

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Redis for caching
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Initialize services
analytics_service = CustomerAnalyticsService(supabase, redis_client)

# Create router
router = APIRouter()
security = HTTPBearer()

# ============================================
# PYDANTIC MODELS
# ============================================

class CustomerHealthScore(BaseModel):
    customer_id: str
    overall_score: int = Field(..., ge=0, le=100)
    engagement_score: int = Field(..., ge=0, le=100)
    loyalty_score: int = Field(..., ge=0, le=100)
    satisfaction_score: int = Field(..., ge=0, le=100)
    frequency_score: int = Field(..., ge=0, le=100)
    monetary_score: int = Field(..., ge=0, le=100)
    score_factors: Dict[str, Any] = {}
    churn_risk: str = Field(..., regex="^(low|medium|high|critical)$")
    risk_factors: List[str] = []
    trend_percentage: Optional[float] = None
    calculated_at: datetime

class CustomerCLV(BaseModel):
    customer_id: str
    historical_clv: float
    predicted_clv: float
    total_clv: float
    average_order_value: float
    purchase_frequency: float
    customer_lifespan_months: float
    churn_probability: float
    model_confidence: Optional[float] = None
    calculation_date: date

class ChurnPrediction(BaseModel):
    customer_id: str
    churn_probability: float = Field(..., ge=0, le=100)
    churn_risk_level: str = Field(..., regex="^(very_low|low|medium|high|very_high)$")
    predicted_churn_date: Optional[date] = None
    primary_risk_factors: List[str]
    risk_factor_scores: Dict[str, float]
    model_confidence: float
    recommended_actions: List[str]
    prediction_date: date

class CustomerSegment(BaseModel):
    id: str
    segment_name: str
    segment_description: Optional[str] = None
    segment_type: str
    customer_count: int = 0
    percentage_of_customer_base: float = 0
    average_clv: float = 0
    average_visit_frequency: float = 0
    churn_rate: float = 0
    revenue_contribution: float = 0
    segmentation_rules: Dict[str, Any]

class CustomerCohort(BaseModel):
    id: str
    cohort_name: str
    cohort_type: str
    total_customers: int = 0
    active_customers: int = 0
    retention_rate: float = 0
    average_lifetime_value: float = 0
    churn_rate: float = 0
    performance_data: Dict[str, Any] = {}
    cohort_criteria: Dict[str, Any]

class CustomerJourney(BaseModel):
    customer_id: str
    journey_events: List[Dict[str, Any]]
    lifecycle_stage: str
    touchpoints: List[Dict[str, Any]]
    conversion_events: List[Dict[str, Any]]
    engagement_timeline: List[Dict[str, Any]]
    milestones: List[Dict[str, Any]]

class AnalyticsRefreshRequest(BaseModel):
    refresh_type: str = Field(..., regex="^(health_scores|clv|churn_predictions|segments|cohorts|all)$")
    customer_ids: Optional[List[str]] = None
    force_refresh: bool = False

class SegmentCalculationRequest(BaseModel):
    segment_name: str
    segment_description: Optional[str] = None
    segment_type: str = Field(..., regex="^(demographic|behavioral|value|lifecycle|custom)$")
    segmentation_rules: Dict[str, Any]
    auto_update: bool = True

# ============================================
# UTILITY FUNCTIONS
# ============================================

async def get_barbershop_id_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extract barbershop_id from JWT token"""
    try:
        # Verify JWT token and extract user info
        response = supabase.auth.get_user(credentials.credentials)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        user_id = response.user.id
        
        # Get user profile to determine barbershop association
        profile_response = supabase.table("profiles").select("barbershop_id").eq("id", user_id).single().execute()
        
        if not profile_response.data or not profile_response.data.get("barbershop_id"):
            raise HTTPException(status_code=403, detail="User not associated with a barbershop")
        
        return profile_response.data["barbershop_id"]
        
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def format_decimal(value: Any) -> float:
    """Convert Decimal to float for JSON serialization"""
    if isinstance(value, Decimal):
        return float(value)
    return value

# ============================================
# HEALTH SCORES ENDPOINTS
# ============================================

@router.get("/customer-health-scores", response_model=List[CustomerHealthScore])
async def get_customer_health_scores(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_id: Optional[str] = Query(None, description="Filter by specific customer ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level: low, medium, high, critical"),
    limit: int = Query(100, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
    include_trends: bool = Query(True, description="Include trend analysis"),
):
    """
    Get customer health scores with optional filtering and trend analysis
    Health scores are calculated on a 0-100 scale based on engagement, frequency, and monetary factors
    """
    try:
        cache_key = f"health_scores:{barbershop_id}:{customer_id}:{risk_level}:{limit}:{offset}"
        
        # Try to get from cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query
        query = supabase.table("customer_health_scores").select("*").eq("barbershop_id", barbershop_id)
        
        if customer_id:
            query = query.eq("customer_id", customer_id)
        if risk_level:
            query = query.eq("churn_risk", risk_level)
        
        query = query.order("overall_score", desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Process and format results
        health_scores = []
        for score_data in response.data:
            # Format the response
            health_score = CustomerHealthScore(
                customer_id=score_data["customer_id"],
                overall_score=score_data["overall_score"],
                engagement_score=score_data["engagement_score"],
                loyalty_score=score_data["loyalty_score"],
                satisfaction_score=score_data["satisfaction_score"],
                frequency_score=score_data["frequency_score"],
                monetary_score=score_data["monetary_score"],
                score_factors=score_data.get("score_factors", {}),
                churn_risk=score_data["churn_risk"],
                risk_factors=score_data.get("risk_factors", []),
                trend_percentage=score_data.get("trend_percentage"),
                calculated_at=datetime.fromisoformat(score_data["calculated_at"].replace('Z', '+00:00'))
            )
            health_scores.append(health_score)
        
        # Cache the result for 1 hour
        redis_client.setex(cache_key, 3600, json.dumps(health_scores, default=str))
        
        return health_scores
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve health scores: {str(e)}")

@router.post("/customer-health-scores/calculate")
async def calculate_customer_health_scores(
    background_tasks: BackgroundTasks,
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_ids: Optional[List[str]] = None,
    force_recalculate: bool = False
):
    """
    Trigger calculation/recalculation of customer health scores
    Can be run for specific customers or all customers in the barbershop
    """
    try:
        # Add background task for health score calculation
        background_tasks.add_task(
            analytics_service.calculate_health_scores,
            barbershop_id,
            customer_ids,
            force_recalculate
        )
        
        return {
            "message": "Health score calculation started",
            "barbershop_id": barbershop_id,
            "customer_count": len(customer_ids) if customer_ids else "all",
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start health score calculation: {str(e)}")

# ============================================
# CUSTOMER LIFETIME VALUE ENDPOINTS
# ============================================

@router.get("/customer-clv", response_model=List[CustomerCLV])
async def get_customer_clv(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_id: Optional[str] = Query(None, description="Filter by specific customer ID"),
    min_clv: Optional[float] = Query(None, description="Minimum CLV threshold"),
    sort_by: str = Query("total_clv", description="Sort by: total_clv, predicted_clv, historical_clv"),
    sort_desc: bool = Query(True, description="Sort in descending order"),
    limit: int = Query(100, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
):
    """
    Get customer lifetime value calculations with filtering and sorting options
    """
    try:
        cache_key = f"clv:{barbershop_id}:{customer_id}:{min_clv}:{sort_by}:{sort_desc}:{limit}:{offset}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query
        query = supabase.table("clv_calculations").select("*").eq("barbershop_id", barbershop_id)
        
        if customer_id:
            query = query.eq("customer_id", customer_id)
        if min_clv:
            query = query.gte("total_clv", min_clv)
        
        query = query.order(sort_by, desc=sort_desc).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Process results
        clv_results = []
        for clv_data in response.data:
            clv = CustomerCLV(
                customer_id=clv_data["customer_id"],
                historical_clv=format_decimal(clv_data["historical_clv"]),
                predicted_clv=format_decimal(clv_data["predicted_clv"]),
                total_clv=format_decimal(clv_data["total_clv"]),
                average_order_value=format_decimal(clv_data["average_order_value"]),
                purchase_frequency=format_decimal(clv_data["purchase_frequency"]),
                customer_lifespan_months=format_decimal(clv_data["customer_lifespan_months"]),
                churn_probability=format_decimal(clv_data["churn_probability"]),
                model_confidence=format_decimal(clv_data.get("model_confidence")),
                calculation_date=datetime.strptime(clv_data["calculation_date"], "%Y-%m-%d").date()
            )
            clv_results.append(clv)
        
        # Cache for 2 hours
        redis_client.setex(cache_key, 7200, json.dumps(clv_results, default=str))
        
        return clv_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve CLV data: {str(e)}")

@router.post("/customer-clv/calculate")
async def calculate_customer_clv(
    background_tasks: BackgroundTasks,
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_ids: Optional[List[str]] = None,
    calculation_method: str = Query("predictive_ml", description="Method: historical_average, predictive_ml, cohort_based")
):
    """
    Trigger CLV calculation for customers using specified method
    """
    try:
        background_tasks.add_task(
            analytics_service.calculate_clv,
            barbershop_id,
            customer_ids,
            calculation_method
        )
        
        return {
            "message": "CLV calculation started",
            "barbershop_id": barbershop_id,
            "method": calculation_method,
            "customer_count": len(customer_ids) if customer_ids else "all",
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start CLV calculation: {str(e)}")

# ============================================
# CHURN PREDICTION ENDPOINTS
# ============================================

@router.get("/customer-churn-risk", response_model=List[ChurnPrediction])
async def get_customer_churn_risk(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_id: Optional[str] = Query(None, description="Filter by specific customer ID"),
    risk_level: Optional[str] = Query(None, description="Filter by risk level"),
    min_probability: Optional[float] = Query(None, description="Minimum churn probability threshold"),
    days_ahead: int = Query(90, description="Prediction horizon in days"),
    limit: int = Query(100, description="Number of records to return"),
    offset: int = Query(0, description="Number of records to skip"),
):
    """
    Get churn risk predictions with filtering options
    Returns customers with their churn probability and recommended intervention actions
    """
    try:
        cache_key = f"churn:{barbershop_id}:{customer_id}:{risk_level}:{min_probability}:{days_ahead}:{limit}:{offset}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query
        query = supabase.table("churn_predictions").select("*").eq("barbershop_id", barbershop_id)
        
        if customer_id:
            query = query.eq("customer_id", customer_id)
        if risk_level:
            query = query.eq("churn_risk_level", risk_level)
        if min_probability:
            query = query.gte("churn_probability", min_probability)
        
        # Filter by prediction horizon
        cutoff_date = datetime.now().date() + timedelta(days=days_ahead)
        query = query.lte("predicted_churn_date", cutoff_date.isoformat())
        
        query = query.order("churn_probability", desc=True).range(offset, offset + limit - 1)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Process results
        churn_predictions = []
        for pred_data in response.data:
            prediction = ChurnPrediction(
                customer_id=pred_data["customer_id"],
                churn_probability=format_decimal(pred_data["churn_probability"]),
                churn_risk_level=pred_data["churn_risk_level"],
                predicted_churn_date=datetime.strptime(pred_data["predicted_churn_date"], "%Y-%m-%d").date() if pred_data.get("predicted_churn_date") else None,
                primary_risk_factors=pred_data.get("primary_risk_factors", []),
                risk_factor_scores=pred_data.get("risk_factor_scores", {}),
                model_confidence=format_decimal(pred_data["confidence_score"]),
                recommended_actions=pred_data.get("recommended_actions", []),
                prediction_date=datetime.strptime(pred_data["prediction_date"], "%Y-%m-%d").date()
            )
            churn_predictions.append(prediction)
        
        # Cache for 4 hours
        redis_client.setex(cache_key, 14400, json.dumps(churn_predictions, default=str))
        
        return churn_predictions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve churn predictions: {str(e)}")

@router.post("/customer-churn-risk/predict")
async def predict_customer_churn(
    background_tasks: BackgroundTasks,
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    customer_ids: Optional[List[str]] = None,
    model_name: str = Query("enhanced_churn_model_v2", description="ML model to use for prediction"),
    prediction_horizon_days: int = Query(90, description="Prediction window in days")
):
    """
    Trigger churn prediction calculation using ML models
    """
    try:
        background_tasks.add_task(
            analytics_service.predict_churn,
            barbershop_id,
            customer_ids,
            model_name,
            prediction_horizon_days
        )
        
        return {
            "message": "Churn prediction started",
            "barbershop_id": barbershop_id,
            "model": model_name,
            "prediction_horizon_days": prediction_horizon_days,
            "customer_count": len(customer_ids) if customer_ids else "all",
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start churn prediction: {str(e)}")

# ============================================
# CUSTOMER SEGMENTS ENDPOINTS
# ============================================

@router.get("/customer-segments", response_model=List[CustomerSegment])
async def get_customer_segments(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    segment_type: Optional[str] = Query(None, description="Filter by segment type"),
    is_active: bool = Query(True, description="Filter by active segments"),
    include_metrics: bool = Query(True, description="Include segment performance metrics")
):
    """
    Get all customer segments for the barbershop with their current metrics
    """
    try:
        cache_key = f"segments:{barbershop_id}:{segment_type}:{is_active}:{include_metrics}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query
        query = supabase.table("customer_segments").select("*").eq("barbershop_id", barbershop_id)
        
        if segment_type:
            query = query.eq("segment_type", segment_type)
        if is_active:
            query = query.eq("is_active", True)
        
        query = query.order("customer_count", desc=True)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Process results
        segments = []
        for seg_data in response.data:
            segment = CustomerSegment(
                id=seg_data["id"],
                segment_name=seg_data["segment_name"],
                segment_description=seg_data.get("segment_description"),
                segment_type=seg_data["segment_type"],
                customer_count=seg_data.get("customer_count", 0),
                percentage_of_customer_base=format_decimal(seg_data.get("percentage_of_customer_base", 0)),
                average_clv=format_decimal(seg_data.get("average_clv", 0)),
                average_visit_frequency=format_decimal(seg_data.get("average_visit_frequency", 0)),
                churn_rate=format_decimal(seg_data.get("churn_rate", 0)),
                revenue_contribution=format_decimal(seg_data.get("revenue_contribution", 0)),
                segmentation_rules=seg_data.get("segmentation_rules", {})
            )
            segments.append(segment)
        
        # Cache for 1 hour
        redis_client.setex(cache_key, 3600, json.dumps(segments, default=str))
        
        return segments
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customer segments: {str(e)}")

@router.post("/customer-segments/calculate")
async def calculate_customer_segments(
    segment_request: SegmentCalculationRequest,
    background_tasks: BackgroundTasks,
    barbershop_id: str = Depends(get_barbershop_id_from_token)
):
    """
    Create or update a customer segment with dynamic rule-based calculation
    Automatically assigns customers to the segment based on the rules
    """
    try:
        # Start segment calculation in background
        background_tasks.add_task(
            analytics_service.calculate_segments,
            barbershop_id,
            segment_request.dict()
        )
        
        return {
            "message": "Segment calculation started",
            "barbershop_id": barbershop_id,
            "segment_name": segment_request.segment_name,
            "segment_type": segment_request.segment_type,
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start segment calculation: {str(e)}")

# ============================================
# CUSTOMER COHORTS ENDPOINTS
# ============================================

@router.get("/customer-cohorts", response_model=List[CustomerCohort])
async def get_customer_cohorts(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    cohort_type: Optional[str] = Query(None, description="Filter by cohort type"),
    is_active: bool = Query(True, description="Filter by active cohorts"),
    include_performance: bool = Query(True, description="Include performance metrics over time")
):
    """
    Get customer cohorts with retention and performance analysis
    """
    try:
        cache_key = f"cohorts:{barbershop_id}:{cohort_type}:{is_active}:{include_performance}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Build query
        query = supabase.table("customer_cohorts").select("*").eq("barbershop_id", barbershop_id)
        
        if cohort_type:
            query = query.eq("cohort_type", cohort_type)
        if is_active:
            query = query.eq("is_active", True)
        
        query = query.order("created_at", desc=True)
        
        response = query.execute()
        
        if not response.data:
            return []
        
        # Process results
        cohorts = []
        for cohort_data in response.data:
            cohort = CustomerCohort(
                id=cohort_data["id"],
                cohort_name=cohort_data["cohort_name"],
                cohort_type=cohort_data["cohort_type"],
                total_customers=cohort_data.get("total_customers", 0),
                active_customers=cohort_data.get("active_customers", 0),
                retention_rate=format_decimal(cohort_data.get("retention_rate", 0)),
                average_lifetime_value=format_decimal(cohort_data.get("average_lifetime_value", 0)),
                churn_rate=format_decimal(cohort_data.get("churn_rate", 0)),
                performance_data=cohort_data.get("performance_data", {}),
                cohort_criteria=cohort_data.get("cohort_criteria", {})
            )
            cohorts.append(cohort)
        
        # Cache for 2 hours
        redis_client.setex(cache_key, 7200, json.dumps(cohorts, default=str))
        
        return cohorts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customer cohorts: {str(e)}")

# ============================================
# CUSTOMER JOURNEY ENDPOINTS
# ============================================

@router.get("/customer-journey/{customer_id}", response_model=CustomerJourney)
async def get_customer_journey(
    customer_id: str,
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    include_events: bool = Query(True, description="Include detailed journey events"),
    include_touchpoints: bool = Query(True, description="Include touchpoint analysis"),
    include_milestones: bool = Query(True, description="Include customer milestones"),
    days_back: int = Query(365, description="Days of history to include")
):
    """
    Get complete customer journey visualization data including events, touchpoints, and milestones
    """
    try:
        cache_key = f"journey:{barbershop_id}:{customer_id}:{include_events}:{include_touchpoints}:{include_milestones}:{days_back}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Get journey data from analytics service
        journey_data = await analytics_service.get_customer_journey(
            barbershop_id, 
            customer_id, 
            include_events, 
            include_touchpoints, 
            include_milestones, 
            days_back
        )
        
        # Cache for 30 minutes (journey data changes frequently)
        redis_client.setex(cache_key, 1800, json.dumps(journey_data, default=str))
        
        return journey_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve customer journey: {str(e)}")

# ============================================
# ANALYTICS REFRESH ENDPOINTS
# ============================================

@router.post("/customer-analytics/refresh")
async def refresh_customer_analytics(
    refresh_request: AnalyticsRefreshRequest,
    background_tasks: BackgroundTasks,
    barbershop_id: str = Depends(get_barbershop_id_from_token)
):
    """
    Trigger comprehensive refresh of customer analytics data
    Can refresh all analytics or specific types (health_scores, clv, churn_predictions, segments, cohorts)
    """
    try:
        # Clear relevant caches if force refresh
        if refresh_request.force_refresh:
            cache_patterns = []
            if refresh_request.refresh_type in ["health_scores", "all"]:
                cache_patterns.append(f"health_scores:{barbershop_id}:*")
            if refresh_request.refresh_type in ["clv", "all"]:
                cache_patterns.append(f"clv:{barbershop_id}:*")
            if refresh_request.refresh_type in ["churn_predictions", "all"]:
                cache_patterns.append(f"churn:{barbershop_id}:*")
            if refresh_request.refresh_type in ["segments", "all"]:
                cache_patterns.append(f"segments:{barbershop_id}:*")
            if refresh_request.refresh_type in ["cohorts", "all"]:
                cache_patterns.append(f"cohorts:{barbershop_id}:*")
            
            # Clear matching cache keys
            for pattern in cache_patterns:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
        
        # Start analytics refresh in background
        background_tasks.add_task(
            analytics_service.refresh_analytics,
            barbershop_id,
            refresh_request.refresh_type,
            refresh_request.customer_ids,
            refresh_request.force_refresh
        )
        
        return {
            "message": "Analytics refresh started",
            "barbershop_id": barbershop_id,
            "refresh_type": refresh_request.refresh_type,
            "customer_count": len(refresh_request.customer_ids) if refresh_request.customer_ids else "all",
            "force_refresh": refresh_request.force_refresh,
            "status": "processing"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start analytics refresh: {str(e)}")

# ============================================
# ANALYTICS INSIGHTS ENDPOINTS
# ============================================

@router.get("/customer-analytics/insights")
async def get_analytics_insights(
    barbershop_id: str = Depends(get_barbershop_id_from_token),
    insight_type: str = Query("summary", description="Type of insights: summary, trends, predictions, recommendations"),
    time_period: str = Query("month", description="Time period: week, month, quarter, year"),
):
    """
    Get AI-powered insights and recommendations based on customer analytics
    """
    try:
        cache_key = f"insights:{barbershop_id}:{insight_type}:{time_period}"
        
        # Try cache first
        cached_result = redis_client.get(cache_key)
        if cached_result:
            return json.loads(cached_result)
        
        # Generate insights using analytics service
        insights = await analytics_service.generate_insights(
            barbershop_id,
            insight_type,
            time_period
        )
        
        # Cache insights for 6 hours
        redis_client.setex(cache_key, 21600, json.dumps(insights, default=str))
        
        return insights
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics insights: {str(e)}")

# ============================================
# HEALTH CHECK ENDPOINT
# ============================================

@router.get("/health")
async def health_check():
    """Health check endpoint for customer analytics service"""
    try:
        # Test database connection
        test_query = supabase.table("customer_health_scores").select("id").limit(1).execute()
        
        # Test Redis connection
        redis_client.ping()
        
        return {
            "status": "healthy",
            "service": "customer_analytics",
            "database": "connected",
            "cache": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")