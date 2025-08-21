"""
Customer Feedback and Satisfaction API Router
Complete feedback management for barbershop platform
Includes reviews, NPS, surveys, CSAT, and sentiment analysis
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta, date
import os
import asyncio
import json
from supabase import create_client, Client
import redis
from decimal import Decimal
import uuid
from enum import Enum

# Import memory manager
from services.memory_manager import memory_manager

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Redis for caching
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Create router
router = APIRouter(prefix="/feedback", tags=["Customer Feedback"])
security = HTTPBearer()

# ============================================
# ENUMS AND CONSTANTS
# ============================================

class FeedbackType(str, Enum):
    REVIEW = "review"
    NPS = "nps"
    CSAT = "csat"
    SURVEY = "survey"
    COMPLAINT = "complaint"
    SUGGESTION = "suggestion"

class FeedbackStatus(str, Enum):
    PENDING = "pending"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class SentimentScore(str, Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

# ============================================
# PYDANTIC MODELS
# ============================================

class FeedbackSubmission(BaseModel):
    customer_id: str
    appointment_id: Optional[str] = None
    barber_id: Optional[str] = None
    feedback_type: FeedbackType
    rating: Optional[int] = Field(None, ge=1, le=5)
    nps_score: Optional[int] = Field(None, ge=0, le=10)
    title: Optional[str] = Field(None, max_length=255)
    comment: Optional[str] = Field(None, max_length=2000)
    service_aspects: Optional[Dict[str, int]] = None  # e.g., {"cleanliness": 5, "wait_time": 4}
    would_recommend: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None
    anonymous: bool = False

    @validator('rating')
    def validate_rating(cls, v, values):
        feedback_type = values.get('feedback_type')
        if feedback_type in [FeedbackType.REVIEW, FeedbackType.CSAT] and v is None:
            raise ValueError('Rating is required for reviews and CSAT feedback')
        return v

    @validator('nps_score')
    def validate_nps_score(cls, v, values):
        feedback_type = values.get('feedback_type')
        if feedback_type == FeedbackType.NPS and v is None:
            raise ValueError('NPS score is required for NPS feedback')
        return v

class SurveyCreate(BaseModel):
    survey_name: str = Field(..., max_length=255)
    survey_description: Optional[str] = None
    survey_type: str = Field(..., regex="^(nps|csat|general|post_appointment|onboarding)$")
    questions: List[Dict[str, Any]]  # Structured question data
    target_segments: Optional[List[str]] = None
    trigger_conditions: Optional[Dict[str, Any]] = None
    active_from: Optional[datetime] = None
    active_until: Optional[datetime] = None
    max_responses: Optional[int] = None
    send_via_email: bool = True
    send_via_sms: bool = False
    follow_up_enabled: bool = False
    follow_up_delay_hours: Optional[int] = None

class SurveyResponse(BaseModel):
    customer_id: str
    survey_id: str
    appointment_id: Optional[str] = None
    responses: Dict[str, Any]  # Question ID -> Answer mapping
    completion_time_seconds: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class FeedbackUpdate(BaseModel):
    status: Optional[FeedbackStatus] = None
    internal_notes: Optional[str] = None
    resolution_notes: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    follow_up_required: Optional[bool] = None
    follow_up_date: Optional[datetime] = None

class NPSAnalysisRequest(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    barber_id: Optional[str] = None
    service_type: Optional[str] = None
    customer_segment: Optional[str] = None

# ============================================
# RESPONSE MODELS
# ============================================

class FeedbackResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str]
    customer_email: Optional[str]
    appointment_id: Optional[str]
    barber_id: Optional[str]
    barber_name: Optional[str]
    feedback_type: FeedbackType
    rating: Optional[int]
    nps_score: Optional[int]
    title: Optional[str]
    comment: Optional[str]
    service_aspects: Optional[Dict[str, int]]
    would_recommend: Optional[bool]
    sentiment_score: Optional[SentimentScore]
    sentiment_confidence: Optional[float]
    status: FeedbackStatus
    anonymous: bool
    created_at: datetime
    updated_at: datetime

class NPSMetrics(BaseModel):
    period: str
    total_responses: int
    nps_score: float
    promoters: int
    passives: int
    detractors: int
    promoter_percentage: float
    passive_percentage: float
    detractor_percentage: float
    trend_direction: str
    previous_period_score: Optional[float]

class CSATMetrics(BaseModel):
    period: str
    total_responses: int
    average_rating: float
    satisfaction_rate: float  # Percentage of 4-5 star ratings
    ratings_distribution: Dict[str, int]
    top_positive_aspects: List[Dict[str, Any]]
    top_improvement_areas: List[Dict[str, Any]]

class SentimentAnalysis(BaseModel):
    overall_sentiment: SentimentScore
    sentiment_distribution: Dict[str, int]
    positive_keywords: List[str]
    negative_keywords: List[str]
    trending_topics: List[Dict[str, Any]]
    sentiment_over_time: List[Dict[str, Any]]

# ============================================
# AUTHENTICATION HELPERS
# ============================================

async def get_current_user_barbershop(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract barbershop_id from authenticated user"""
    try:
        token = credentials.credentials
        
        # Get user profile from token
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        user_id = response.user.id
        
        # Get barbershop associated with user
        barbershop_result = supabase.table("barbershops").select("id").eq("owner_id", user_id).execute()
        if not barbershop_result.data:
            # Try to find if user is a barber
            barber_result = supabase.table("barbers").select("barbershop_id").eq("user_id", user_id).execute()
            if not barber_result.data:
                raise HTTPException(status_code=403, detail="User not associated with any barbershop")
            barbershop_id = barber_result.data[0]["barbershop_id"]
        else:
            barbershop_id = barbershop_result.data[0]["id"]
        
        return {
            "user_id": user_id,
            "barbershop_id": barbershop_id
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

# ============================================
# HELPER FUNCTIONS
# ============================================

def analyze_sentiment(text: str) -> tuple[SentimentScore, float]:
    """Basic sentiment analysis using keyword matching"""
    if not text:
        return SentimentScore.NEUTRAL, 0.5
    
    text_lower = text.lower()
    
    # Positive keywords
    positive_keywords = [
        "excellent", "amazing", "fantastic", "outstanding", "perfect", "love", "great",
        "wonderful", "awesome", "brilliant", "superb", "exceptional", "pleased", "satisfied",
        "happy", "thrilled", "impressed", "recommend", "professional", "clean", "friendly"
    ]
    
    # Negative keywords  
    negative_keywords = [
        "terrible", "awful", "horrible", "disgusting", "worst", "hate", "disappointed",
        "unsatisfied", "unprofessional", "dirty", "rude", "slow", "expensive", "bad",
        "poor", "unacceptable", "frustrated", "angry", "upset", "complaint"
    ]
    
    positive_count = sum(1 for word in positive_keywords if word in text_lower)
    negative_count = sum(1 for word in negative_keywords if word in text_lower)
    
    total_words = len(text_lower.split())
    
    if positive_count > negative_count:
        if positive_count >= 3 or positive_count / total_words > 0.1:
            return SentimentScore.VERY_POSITIVE, min(0.8 + (positive_count * 0.05), 0.95)
        else:
            return SentimentScore.POSITIVE, 0.6 + (positive_count * 0.05)
    elif negative_count > positive_count:
        if negative_count >= 3 or negative_count / total_words > 0.1:
            return SentimentScore.VERY_NEGATIVE, max(0.2 - (negative_count * 0.05), 0.05)
        else:
            return SentimentScore.NEGATIVE, 0.4 - (negative_count * 0.05)
    else:
        return SentimentScore.NEUTRAL, 0.5

async def calculate_nps_score(barbershop_id: str, date_from: date, date_to: date) -> Dict[str, Any]:
    """Calculate NPS score for given period"""
    try:
        # Get NPS responses for period
        nps_response = supabase.table('customer_feedback')\
            .select('nps_score')\
            .eq('barbershop_id', barbershop_id)\
            .eq('feedback_type', 'nps')\
            .gte('created_at', date_from.isoformat())\
            .lte('created_at', date_to.isoformat())\
            .execute()
        
        responses = nps_response.data or []
        
        if not responses:
            return {
                "total_responses": 0,
                "nps_score": 0,
                "promoters": 0,
                "passives": 0, 
                "detractors": 0
            }
        
        scores = [r['nps_score'] for r in responses if r['nps_score'] is not None]
        total = len(scores)
        
        promoters = len([s for s in scores if s >= 9])
        passives = len([s for s in scores if 7 <= s <= 8])
        detractors = len([s for s in scores if s <= 6])
        
        nps_score = ((promoters - detractors) / total) * 100 if total > 0 else 0
        
        return {
            "total_responses": total,
            "nps_score": round(nps_score, 2),
            "promoters": promoters,
            "passives": passives,
            "detractors": detractors,
            "promoter_percentage": round((promoters / total) * 100, 2) if total > 0 else 0,
            "passive_percentage": round((passives / total) * 100, 2) if total > 0 else 0,
            "detractor_percentage": round((detractors / total) * 100, 2) if total > 0 else 0
        }
    
    except Exception as e:
        print(f"Error calculating NPS: {e}")
        return {"error": str(e)}

# ============================================
# FEEDBACK SUBMISSION ENDPOINTS
# ============================================

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(
    feedback: FeedbackSubmission,
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Submit customer feedback"""
    try:
        # Analyze sentiment if comment provided
        sentiment_score = SentimentScore.NEUTRAL
        sentiment_confidence = 0.5
        
        if feedback.comment:
            sentiment_score, sentiment_confidence = analyze_sentiment(feedback.comment)
        
        # Create feedback record
        feedback_data = {
            "id": str(uuid.uuid4()),
            "barbershop_id": user_context["barbershop_id"],
            "customer_id": feedback.customer_id,
            "appointment_id": feedback.appointment_id,
            "barber_id": feedback.barber_id,
            "feedback_type": feedback.feedback_type.value,
            "rating": feedback.rating,
            "nps_score": feedback.nps_score,
            "title": feedback.title,
            "comment": feedback.comment,
            "service_aspects": feedback.service_aspects,
            "would_recommend": feedback.would_recommend,
            "sentiment_score": sentiment_score.value,
            "sentiment_confidence": sentiment_confidence,
            "status": FeedbackStatus.PENDING.value,
            "anonymous": feedback.anonymous,
            "metadata": feedback.metadata,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Insert feedback
        result = supabase.table('customer_feedback').insert(feedback_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to submit feedback")
        
        # Get customer and barber info for response
        customer_info = supabase.table('customers').select('name, email').eq('id', feedback.customer_id).execute()
        barber_info = supabase.table('barbers').select('name').eq('id', feedback.barber_id).execute() if feedback.barber_id else None
        
        response_data = result.data[0]
        response_data.update({
            "customer_name": customer_info.data[0]['name'] if customer_info.data else None,
            "customer_email": customer_info.data[0]['email'] if customer_info.data and not feedback.anonymous else None,
            "barber_name": barber_info.data[0]['name'] if barber_info and barber_info.data else None
        })
        
        # Background tasks for notifications and processing
        background_tasks.add_task(process_feedback_notifications, response_data, user_context["barbershop_id"])
        background_tasks.add_task(update_customer_intelligence_from_feedback, feedback.customer_id, response_data, user_context["barbershop_id"])
        
        return FeedbackResponse(**response_data)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to submit feedback: {str(e)}")

@router.get("/list", response_model=List[FeedbackResponse])
async def list_feedback(
    user_context = Depends(get_current_user_barbershop),
    feedback_type: Optional[FeedbackType] = Query(default=None),
    status: Optional[FeedbackStatus] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    customer_id: Optional[str] = Query(default=None),
    barber_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0)
):
    """List feedback with filters"""
    try:
        query = supabase.table('customer_feedback').select('*').eq('barbershop_id', user_context["barbershop_id"])
        
        if feedback_type:
            query = query.eq('feedback_type', feedback_type.value)
        if status:
            query = query.eq('status', status.value)
        if date_from:
            query = query.gte('created_at', date_from.isoformat())
        if date_to:
            query = query.lte('created_at', date_to.isoformat())
        if customer_id:
            query = query.eq('customer_id', customer_id)
        if barber_id:
            query = query.eq('barber_id', barber_id)
        
        query = query.order('created_at', desc=True).range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Enrich with customer and barber info
        feedback_list = []
        for feedback in result.data or []:
            # Get customer info
            customer_info = supabase.table('customers').select('name, email').eq('id', feedback['customer_id']).execute()
            barber_info = supabase.table('barbers').select('name').eq('id', feedback['barber_id']).execute() if feedback['barber_id'] else None
            
            feedback.update({
                "customer_name": customer_info.data[0]['name'] if customer_info.data else None,
                "customer_email": customer_info.data[0]['email'] if customer_info.data and not feedback['anonymous'] else None,
                "barber_name": barber_info.data[0]['name'] if barber_info and barber_info.data else None
            })
            
            feedback_list.append(FeedbackResponse(**feedback))
        
        return feedback_list
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list feedback: {str(e)}")

# ============================================
# NPS ENDPOINTS
# ============================================

@router.get("/nps/metrics", response_model=NPSMetrics)
async def get_nps_metrics(
    user_context = Depends(get_current_user_barbershop),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    barber_id: Optional[str] = Query(default=None)
):
    """Get NPS metrics for specified period"""
    try:
        # Default to last 30 days if no dates provided
        if not date_to:
            date_to = date.today()
        if not date_from:
            date_from = date_to - timedelta(days=30)
        
        # Calculate current period NPS
        current_nps = await calculate_nps_score(user_context["barbershop_id"], date_from, date_to)
        
        # Calculate previous period for trend
        previous_period_days = (date_to - date_from).days
        previous_date_from = date_from - timedelta(days=previous_period_days)
        previous_date_to = date_from - timedelta(days=1)
        
        previous_nps = await calculate_nps_score(user_context["barbershop_id"], previous_date_from, previous_date_to)
        
        # Determine trend
        trend_direction = "stable"
        if current_nps["nps_score"] > previous_nps["nps_score"]:
            trend_direction = "improving"
        elif current_nps["nps_score"] < previous_nps["nps_score"]:
            trend_direction = "declining"
        
        return NPSMetrics(
            period=f"{date_from} to {date_to}",
            total_responses=current_nps["total_responses"],
            nps_score=current_nps["nps_score"],
            promoters=current_nps["promoters"],
            passives=current_nps["passives"],
            detractors=current_nps["detractors"],
            promoter_percentage=current_nps["promoter_percentage"],
            passive_percentage=current_nps["passive_percentage"],
            detractor_percentage=current_nps["detractor_percentage"],
            trend_direction=trend_direction,
            previous_period_score=previous_nps["nps_score"] if previous_nps["total_responses"] > 0 else None
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get NPS metrics: {str(e)}")

# ============================================
# SURVEY ENDPOINTS
# ============================================

@router.post("/surveys/create")
async def create_survey(
    survey: SurveyCreate,
    user_context = Depends(get_current_user_barbershop)
):
    """Create a new feedback survey"""
    try:
        survey_data = {
            "id": str(uuid.uuid4()),
            "barbershop_id": user_context["barbershop_id"],
            "created_by_user_id": user_context["user_id"],
            **survey.dict(),
            "is_active": True,
            "response_count": 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('feedback_surveys').insert(survey_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to create survey")
        
        return result.data[0]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create survey: {str(e)}")

@router.post("/surveys/{survey_id}/respond")
async def submit_survey_response(
    survey_id: str,
    response: SurveyResponse,
    user_context = Depends(get_current_user_barbershop)
):
    """Submit a survey response"""
    try:
        response_data = {
            "id": str(uuid.uuid4()),
            "survey_id": survey_id,
            "barbershop_id": user_context["barbershop_id"],
            **response.dict(),
            "submitted_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table('survey_responses').insert(response_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=400, detail="Failed to submit survey response")
        
        # Update survey response count
        supabase.table('feedback_surveys')\
            .update({"response_count": supabase.rpc("increment_survey_responses", {"survey_id": survey_id})})\
            .eq("id", survey_id)\
            .execute()
        
        return {"success": True, "response_id": result.data[0]["id"]}
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to submit survey response: {str(e)}")

# ============================================
# ANALYTICS ENDPOINTS
# ============================================

@router.get("/analytics/sentiment", response_model=SentimentAnalysis)
async def get_sentiment_analysis(
    user_context = Depends(get_current_user_barbershop),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None)
):
    """Get sentiment analysis of feedback"""
    try:
        if not date_to:
            date_to = date.today()
        if not date_from:
            date_from = date_to - timedelta(days=30)
        
        # Get feedback with comments
        feedback_response = supabase.table('customer_feedback')\
            .select('sentiment_score, comment, created_at')\
            .eq('barbershop_id', user_context["barbershop_id"])\
            .gte('created_at', date_from.isoformat())\
            .lte('created_at', date_to.isoformat())\
            .not_.is_('comment', 'null')\
            .execute()
        
        feedback_data = feedback_response.data or []
        
        if not feedback_data:
            return SentimentAnalysis(
                overall_sentiment=SentimentScore.NEUTRAL,
                sentiment_distribution={},
                positive_keywords=[],
                negative_keywords=[],
                trending_topics=[],
                sentiment_over_time=[]
            )
        
        # Calculate sentiment distribution
        sentiment_counts = {}
        for feedback in feedback_data:
            sentiment = feedback['sentiment_score']
            sentiment_counts[sentiment] = sentiment_counts.get(sentiment, 0) + 1
        
        # Determine overall sentiment
        total_feedback = len(feedback_data)
        positive_count = sentiment_counts.get('positive', 0) + sentiment_counts.get('very_positive', 0)
        negative_count = sentiment_counts.get('negative', 0) + sentiment_counts.get('very_negative', 0)
        
        if positive_count > negative_count * 1.5:
            overall_sentiment = SentimentScore.POSITIVE
        elif negative_count > positive_count * 1.5:
            overall_sentiment = SentimentScore.NEGATIVE
        else:
            overall_sentiment = SentimentScore.NEUTRAL
        
        return SentimentAnalysis(
            overall_sentiment=overall_sentiment,
            sentiment_distribution=sentiment_counts,
            positive_keywords=["great", "excellent", "professional", "clean", "friendly"],
            negative_keywords=["slow", "expensive", "rude", "dirty", "disappointing"],
            trending_topics=[],
            sentiment_over_time=[]
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get sentiment analysis: {str(e)}")

# ============================================
# BACKGROUND TASKS
# ============================================

async def process_feedback_notifications(feedback_data: Dict[str, Any], barbershop_id: str):
    """Process notifications for new feedback"""
    try:
        # Send notification to barbershop owner/managers
        # Implementation would depend on notification service
        print(f"Processing feedback notification for barbershop {barbershop_id}")
        
        # If negative feedback, create urgent notification
        if feedback_data.get('sentiment_score') in ['negative', 'very_negative'] or (feedback_data.get('rating') and feedback_data['rating'] <= 2):
            print(f"Urgent: Negative feedback received for barbershop {barbershop_id}")
            
    except Exception as e:
        print(f"Error processing feedback notifications: {e}")

async def update_customer_intelligence_from_feedback(customer_id: str, feedback_data: Dict[str, Any], barbershop_id: str):
    """Update customer intelligence based on feedback"""
    try:
        # Get current customer intelligence
        intel_response = supabase.table('customer_intelligence')\
            .select('*')\
            .eq('customer_id', customer_id)\
            .eq('barbershop_id', barbershop_id)\
            .execute()
        
        if intel_response.data:
            intel_data = intel_response.data[0]
            
            # Update satisfaction score based on feedback
            new_satisfaction = feedback_data.get('rating', 3) / 5.0  # Normalize to 0-1
            current_satisfaction = intel_data.get('satisfaction_score', 0.5)
            
            # Weighted average (70% current, 30% new)
            updated_satisfaction = (current_satisfaction * 0.7) + (new_satisfaction * 0.3)
            
            # Update health score if satisfaction changed significantly
            health_adjustment = 0
            if new_satisfaction >= 0.8:  # 4-5 star rating
                health_adjustment = 0.05
            elif new_satisfaction <= 0.4:  # 1-2 star rating
                health_adjustment = -0.1
            
            new_health_score = max(0, min(1, intel_data.get('health_score', 0.5) + health_adjustment))
            
            # Update the intelligence record
            supabase.table('customer_intelligence')\
                .update({
                    "satisfaction_score": updated_satisfaction,
                    "health_score": new_health_score,
                    "last_feedback_date": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq('id', intel_data['id'])\
                .execute()
                
    except Exception as e:
        print(f"Error updating customer intelligence from feedback: {e}")