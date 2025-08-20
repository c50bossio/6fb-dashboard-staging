"""
Customer Loyalty and Rewards API Router
Complete loyalty program management for barbershop platform
Includes points, tiers, rewards, referrals, and gamification
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
import uuid

# Import memory manager and services
from services.memory_manager import memory_manager
from services.loyalty_program_service import LoyaltyProgramService

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Redis for caching
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Initialize services
loyalty_service = LoyaltyProgramService(supabase, redis_client)

# Create router
router = APIRouter(prefix="/loyalty", tags=["Customer Loyalty"])
security = HTTPBearer()

# ============================================
# PYDANTIC MODELS
# ============================================

class LoyaltyProgramCreate(BaseModel):
    program_name: str = Field(..., max_length=255)
    program_description: Optional[str] = None
    program_type: str = Field(..., regex="^(points|visits|spending|tier|hybrid)$")
    earning_rules: Dict[str, Any]
    redemption_rules: Dict[str, Any]
    auto_enroll_new_customers: bool = True
    max_points_per_transaction: Optional[int] = None
    max_points_per_day: Optional[int] = None
    points_expiration_months: int = 12
    welcome_message: Optional[str] = None
    earning_notifications: bool = True
    redemption_notifications: bool = True
    expiration_warnings: bool = True

class LoyaltyProgramUpdate(BaseModel):
    program_name: Optional[str] = None
    program_description: Optional[str] = None
    earning_rules: Optional[Dict[str, Any]] = None
    redemption_rules: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    auto_enroll_new_customers: Optional[bool] = None
    max_points_per_transaction: Optional[int] = None
    max_points_per_day: Optional[int] = None
    points_expiration_months: Optional[int] = None
    welcome_message: Optional[str] = None
    earning_notifications: Optional[bool] = None
    redemption_notifications: Optional[bool] = None
    expiration_warnings: Optional[bool] = None

class PointsTransactionCreate(BaseModel):
    customer_id: str
    loyalty_program_id: str
    transaction_type: str = Field(..., regex="^(earned|redeemed|expired|adjusted|bonus)$")
    points_amount: int
    source_type: Optional[str] = None
    source_id: Optional[str] = None
    earning_rate: Optional[Decimal] = None
    base_amount: Optional[Decimal] = None
    multiplier: Optional[Decimal] = 1.0
    redemption_value: Optional[Decimal] = None
    redemption_type: Optional[str] = None
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class RewardRedemption(BaseModel):
    customer_id: str
    loyalty_program_id: str
    reward_type: str
    reward_name: str
    reward_description: Optional[str] = None
    points_redeemed: int = Field(..., gt=0)
    monetary_value: Decimal = Field(..., ge=0)
    discount_percentage: Optional[Decimal] = None
    expires_at: Optional[datetime] = None
    usage_restrictions: Optional[Dict[str, Any]] = None

class TierCreate(BaseModel):
    loyalty_program_id: str
    tier_name: str = Field(..., max_length=100)
    tier_description: Optional[str] = None
    tier_level: int = Field(..., gt=0)
    qualification_criteria: Dict[str, Any]
    benefits: Dict[str, Any]
    color_code: str = Field(default="#6B7280", regex="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None

class ReferralCreate(BaseModel):
    referrer_customer_id: str
    referee_email: Optional[EmailStr] = None
    referee_phone: Optional[str] = None
    referee_name: Optional[str] = None
    referral_method: Optional[str] = None
    referral_source: Optional[str] = None
    referrer_reward_type: Optional[str] = None
    referrer_reward_value: Optional[Decimal] = None
    referee_reward_type: Optional[str] = None
    referee_reward_value: Optional[Decimal] = None
    qualification_requirements: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    notes: Optional[str] = None

class LoyaltyProgramResponse(BaseModel):
    id: str
    barbershop_id: str
    program_name: str
    program_description: Optional[str]
    program_type: str
    earning_rules: Dict[str, Any]
    redemption_rules: Dict[str, Any]
    is_active: bool
    auto_enroll_new_customers: bool
    total_members: int
    active_members: int
    total_points_issued: int
    total_points_redeemed: int
    created_at: datetime
    updated_at: datetime

class CustomerPointsBalance(BaseModel):
    customer_id: str
    loyalty_program_id: str
    current_points: int
    lifetime_points_earned: int
    lifetime_points_redeemed: int
    current_tier: Optional[str]
    tier_progress: Decimal
    next_tier_threshold: Optional[int]
    member_since: date
    vip_status: bool

class LeaderboardEntry(BaseModel):
    customer_id: str
    customer_name: str
    total_points: int
    tier: Optional[str]
    position: int
    badge: Optional[str]

# ============================================
# AUTHENTICATION HELPERS
# ============================================

async def get_current_user_barbershop(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract barbershop_id from authenticated user"""
    try:
        # This would typically decode JWT and get user info
        # For now, using a simplified approach
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
# LOYALTY PROGRAM ENDPOINTS
# ============================================

@router.post("/programs/create", response_model=LoyaltyProgramResponse)
async def create_loyalty_program(
    program_data: LoyaltyProgramCreate,
    user_context = Depends(get_current_user_barbershop)
):
    """Create a new loyalty program for the barbershop"""
    try:
        # Create loyalty program
        program = await loyalty_service.create_loyalty_program(
            barbershop_id=user_context["barbershop_id"],
            program_data=program_data.dict()
        )
        
        return LoyaltyProgramResponse(**program)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create loyalty program: {str(e)}")

@router.get("/programs/{program_id}", response_model=LoyaltyProgramResponse)
async def get_loyalty_program(
    program_id: str,
    user_context = Depends(get_current_user_barbershop)
):
    """Get loyalty program details"""
    try:
        program = await loyalty_service.get_loyalty_program(
            program_id=program_id,
            barbershop_id=user_context["barbershop_id"]
        )
        
        if not program:
            raise HTTPException(status_code=404, detail="Loyalty program not found")
        
        return LoyaltyProgramResponse(**program)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get loyalty program: {str(e)}")

@router.get("/programs", response_model=List[LoyaltyProgramResponse])
async def list_loyalty_programs(
    user_context = Depends(get_current_user_barbershop),
    active_only: bool = Query(default=True)
):
    """List all loyalty programs for the barbershop"""
    try:
        programs = await loyalty_service.list_loyalty_programs(
            barbershop_id=user_context["barbershop_id"],
            active_only=active_only
        )
        
        return [LoyaltyProgramResponse(**program) for program in programs]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list loyalty programs: {str(e)}")

@router.put("/programs/{program_id}", response_model=LoyaltyProgramResponse)
async def update_loyalty_program(
    program_id: str,
    update_data: LoyaltyProgramUpdate,
    user_context = Depends(get_current_user_barbershop)
):
    """Update loyalty program"""
    try:
        program = await loyalty_service.update_loyalty_program(
            program_id=program_id,
            barbershop_id=user_context["barbershop_id"],
            update_data=update_data.dict(exclude_unset=True)
        )
        
        if not program:
            raise HTTPException(status_code=404, detail="Loyalty program not found")
        
        return LoyaltyProgramResponse(**program)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update loyalty program: {str(e)}")

# ============================================
# POINTS MANAGEMENT ENDPOINTS
# ============================================

@router.post("/points/earn")
async def earn_points(
    transaction: PointsTransactionCreate,
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Award points to a customer"""
    try:
        # Validate transaction type
        if transaction.transaction_type not in ["earned", "bonus"]:
            raise HTTPException(status_code=400, detail="Invalid transaction type for earning points")
        
        result = await loyalty_service.process_points_transaction(
            barbershop_id=user_context["barbershop_id"],
            transaction_data=transaction.dict(),
            processed_by_user_id=user_context["user_id"]
        )
        
        # Add background task for notifications
        background_tasks.add_task(
            loyalty_service.send_points_earned_notification,
            customer_id=transaction.customer_id,
            points_amount=transaction.points_amount,
            barbershop_id=user_context["barbershop_id"]
        )
        
        return {
            "success": True,
            "transaction_id": result["transaction_id"],
            "new_balance": result["new_balance"],
            "tier_upgraded": result.get("tier_upgraded", False),
            "new_tier": result.get("new_tier")
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to earn points: {str(e)}")

@router.post("/points/redeem")
async def redeem_points(
    redemption: RewardRedemption,
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Redeem points for rewards"""
    try:
        result = await loyalty_service.redeem_points(
            barbershop_id=user_context["barbershop_id"],
            redemption_data=redemption.dict(),
            processed_by_user_id=user_context["user_id"]
        )
        
        # Add background task for notifications
        background_tasks.add_task(
            loyalty_service.send_redemption_notification,
            customer_id=redemption.customer_id,
            reward_name=redemption.reward_name,
            barbershop_id=user_context["barbershop_id"]
        )
        
        return {
            "success": True,
            "redemption_id": result["redemption_id"],
            "redemption_code": result["redemption_code"],
            "remaining_balance": result["remaining_balance"],
            "expires_at": result.get("expires_at")
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to redeem points: {str(e)}")

@router.get("/points/balance/{customer_id}", response_model=CustomerPointsBalance)
async def get_points_balance(
    customer_id: str,
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None)
):
    """Get customer's points balance and tier status"""
    try:
        balance = await loyalty_service.get_customer_points_balance(
            customer_id=customer_id,
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id
        )
        
        if not balance:
            raise HTTPException(status_code=404, detail="Customer not enrolled in loyalty program")
        
        return CustomerPointsBalance(**balance)
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get points balance: {str(e)}")

@router.get("/points/history/{customer_id}")
async def get_points_history(
    customer_id: str,
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    transaction_type: Optional[str] = Query(default=None)
):
    """Get customer's points transaction history"""
    try:
        history = await loyalty_service.get_points_history(
            customer_id=customer_id,
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id,
            limit=limit,
            offset=offset,
            transaction_type=transaction_type
        )
        
        return {
            "transactions": history["transactions"],
            "total_count": history["total_count"],
            "summary": history["summary"]
        }
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get points history: {str(e)}")

# ============================================
# TIER MANAGEMENT ENDPOINTS
# ============================================

@router.post("/tiers")
async def create_tier(
    tier_data: TierCreate,
    user_context = Depends(get_current_user_barbershop)
):
    """Create a new loyalty tier"""
    try:
        tier = await loyalty_service.create_loyalty_tier(
            barbershop_id=user_context["barbershop_id"],
            tier_data=tier_data.dict()
        )
        
        return tier
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create tier: {str(e)}")

@router.get("/tiers")
async def get_tiers(
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None)
):
    """Get all loyalty tiers"""
    try:
        tiers = await loyalty_service.get_loyalty_tiers(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id
        )
        
        return tiers
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get tiers: {str(e)}")

@router.post("/tiers/check-upgrade")
async def check_tier_upgrade(
    customer_id: str = Query(...),
    program_id: Optional[str] = Query(default=None),
    user_context = Depends(get_current_user_barbershop)
):
    """Check if customer is eligible for tier upgrade"""
    try:
        upgrade_info = await loyalty_service.check_tier_upgrade_eligibility(
            customer_id=customer_id,
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id
        )
        
        return upgrade_info
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to check tier upgrade: {str(e)}")

@router.post("/tiers/upgrade/{customer_id}")
async def upgrade_customer_tier(
    customer_id: str,
    new_tier_id: str = Query(...),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Manually upgrade customer to new tier"""
    try:
        result = await loyalty_service.upgrade_customer_tier(
            customer_id=customer_id,
            new_tier_id=new_tier_id,
            barbershop_id=user_context["barbershop_id"],
            processed_by_user_id=user_context["user_id"]
        )
        
        # Add background task for tier upgrade notification
        background_tasks.add_task(
            loyalty_service.send_tier_upgrade_notification,
            customer_id=customer_id,
            new_tier_name=result["new_tier_name"],
            barbershop_id=user_context["barbershop_id"]
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to upgrade tier: {str(e)}")

# ============================================
# REWARDS CATALOG ENDPOINTS
# ============================================

@router.get("/rewards/available")
async def get_available_rewards(
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None),
    customer_tier: Optional[str] = Query(default=None)
):
    """Get available rewards catalog"""
    try:
        rewards = await loyalty_service.get_available_rewards(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id,
            customer_tier=customer_tier
        )
        
        return rewards
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get available rewards: {str(e)}")

@router.get("/rewards/redemptions")
async def get_redemption_history(
    user_context = Depends(get_current_user_barbershop),
    customer_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
    status: Optional[str] = Query(default=None)
):
    """Get reward redemption history"""
    try:
        history = await loyalty_service.get_redemption_history(
            barbershop_id=user_context["barbershop_id"],
            customer_id=customer_id,
            limit=limit,
            offset=offset,
            status=status
        )
        
        return history
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get redemption history: {str(e)}")

# ============================================
# REFERRAL TRACKING ENDPOINTS
# ============================================

@router.post("/referrals/track")
async def track_referral(
    referral_data: ReferralCreate,
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Track a customer referral"""
    try:
        referral = await loyalty_service.create_referral(
            barbershop_id=user_context["barbershop_id"],
            referral_data=referral_data.dict()
        )
        
        # Add background task to send referral invitation
        background_tasks.add_task(
            loyalty_service.send_referral_invitation,
            referral_id=referral["id"],
            barbershop_id=user_context["barbershop_id"]
        )
        
        return referral
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to track referral: {str(e)}")

@router.get("/referrals")
async def get_referrals(
    user_context = Depends(get_current_user_barbershop),
    customer_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0)
):
    """Get referral tracking data"""
    try:
        referrals = await loyalty_service.get_referrals(
            barbershop_id=user_context["barbershop_id"],
            customer_id=customer_id,
            status=status,
            limit=limit,
            offset=offset
        )
        
        return referrals
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get referrals: {str(e)}")

@router.put("/referrals/{referral_id}/status")
async def update_referral_status(
    referral_id: str,
    new_status: str = Query(...),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Update referral status and process rewards if qualified"""
    try:
        result = await loyalty_service.update_referral_status(
            referral_id=referral_id,
            new_status=new_status,
            barbershop_id=user_context["barbershop_id"]
        )
        
        # Add background task for reward processing if referral qualified
        if result.get("qualified") and result.get("rewards_processed"):
            background_tasks.add_task(
                loyalty_service.send_referral_reward_notification,
                referral_id=referral_id,
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update referral status: {str(e)}")

# ============================================
# GAMIFICATION ENDPOINTS
# ============================================

@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None),
    period: str = Query(default="all_time", regex="^(all_time|yearly|monthly|weekly)$"),
    limit: int = Query(default=10, le=50)
):
    """Get customer leaderboard"""
    try:
        leaderboard = await loyalty_service.get_leaderboard(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id,
            period=period,
            limit=limit
        )
        
        return [LeaderboardEntry(**entry) for entry in leaderboard]
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get leaderboard: {str(e)}")

@router.get("/achievements/{customer_id}")
async def get_customer_achievements(
    customer_id: str,
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None)
):
    """Get customer achievements and badges"""
    try:
        achievements = await loyalty_service.get_customer_achievements(
            customer_id=customer_id,
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id
        )
        
        return achievements
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get achievements: {str(e)}")

@router.get("/stats")
async def get_loyalty_stats(
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None)
):
    """Get loyalty program statistics"""
    try:
        stats = await loyalty_service.get_loyalty_program_stats(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id
        )
        
        return stats
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get loyalty stats: {str(e)}")

# ============================================
# AUTOMATION ENDPOINTS
# ============================================

@router.post("/automation/process-expired-points")
async def process_expired_points(
    user_context = Depends(get_current_user_barbershop),
    dry_run: bool = Query(default=True)
):
    """Process expired loyalty points"""
    try:
        result = await loyalty_service.process_expired_points(
            barbershop_id=user_context["barbershop_id"],
            dry_run=dry_run
        )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process expired points: {str(e)}")

@router.post("/automation/calculate-tier-upgrades")
async def calculate_tier_upgrades(
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None),
    dry_run: bool = Query(default=True)
):
    """Calculate and process tier upgrades for eligible customers"""
    try:
        result = await loyalty_service.calculate_tier_upgrades(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id,
            dry_run=dry_run
        )
        
        # Add background task for upgrade notifications if not dry run
        if not dry_run and result["upgrades_processed"] > 0:
            background_tasks.add_task(
                loyalty_service.send_bulk_tier_upgrade_notifications,
                upgrades=result["upgraded_customers"],
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to calculate tier upgrades: {str(e)}")

@router.post("/automation/birthday-bonuses")
async def process_birthday_bonuses(
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop),
    program_id: Optional[str] = Query(default=None),
    dry_run: bool = Query(default=True)
):
    """Process birthday bonus points for customers"""
    try:
        result = await loyalty_service.process_birthday_bonuses(
            barbershop_id=user_context["barbershop_id"],
            program_id=program_id,
            dry_run=dry_run
        )
        
        # Add background task for birthday notifications
        if not dry_run and result["bonuses_processed"] > 0:
            background_tasks.add_task(
                loyalty_service.send_birthday_bonus_notifications,
                customers=result["birthday_customers"],
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process birthday bonuses: {str(e)}")

# ============================================
# INTEGRATION ENDPOINTS
# ============================================

@router.post("/integration/appointment-completed")
async def handle_appointment_completed(
    appointment_id: str = Query(...),
    customer_id: str = Query(...),
    service_amount: Decimal = Query(...),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Handle appointment completion and award loyalty points"""
    try:
        result = await loyalty_service.process_appointment_completion(
            appointment_id=appointment_id,
            customer_id=customer_id,
            service_amount=service_amount,
            barbershop_id=user_context["barbershop_id"]
        )
        
        # Add background task for points earned notification
        if result["points_awarded"] > 0:
            background_tasks.add_task(
                loyalty_service.send_points_earned_notification,
                customer_id=customer_id,
                points_amount=result["points_awarded"],
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process appointment completion: {str(e)}")

@router.post("/integration/review-submitted")
async def handle_review_submitted(
    customer_id: str = Query(...),
    appointment_id: str = Query(...),
    rating: int = Query(..., ge=1, le=5),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Handle review submission and award bonus points"""
    try:
        result = await loyalty_service.process_review_submission(
            customer_id=customer_id,
            appointment_id=appointment_id,
            rating=rating,
            barbershop_id=user_context["barbershop_id"]
        )
        
        # Add background task for review bonus notification
        if result["points_awarded"] > 0:
            background_tasks.add_task(
                loyalty_service.send_review_bonus_notification,
                customer_id=customer_id,
                points_amount=result["points_awarded"],
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process review submission: {str(e)}")

# ============================================
# BULK OPERATIONS
# ============================================

@router.post("/bulk/enroll-customers")
async def bulk_enroll_customers(
    program_id: str = Query(...),
    customer_ids: List[str] = Query(...),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Bulk enroll customers into loyalty program"""
    try:
        result = await loyalty_service.bulk_enroll_customers(
            program_id=program_id,
            customer_ids=customer_ids,
            barbershop_id=user_context["barbershop_id"]
        )
        
        # Add background task for welcome notifications
        if result["enrolled_count"] > 0:
            background_tasks.add_task(
                loyalty_service.send_bulk_welcome_notifications,
                program_id=program_id,
                customer_ids=result["successfully_enrolled"],
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to bulk enroll customers: {str(e)}")

@router.post("/bulk/award-points")
async def bulk_award_points(
    customer_ids: List[str] = Query(...),
    points_amount: int = Query(...),
    reason: str = Query(...),
    program_id: Optional[str] = Query(default=None),
    background_tasks: BackgroundTasks,
    user_context = Depends(get_current_user_barbershop)
):
    """Bulk award points to multiple customers"""
    try:
        result = await loyalty_service.bulk_award_points(
            customer_ids=customer_ids,
            points_amount=points_amount,
            reason=reason,
            program_id=program_id,
            barbershop_id=user_context["barbershop_id"],
            processed_by_user_id=user_context["user_id"]
        )
        
        # Add background task for bulk notifications
        if result["points_awarded_count"] > 0:
            background_tasks.add_task(
                loyalty_service.send_bulk_points_awarded_notifications,
                customer_ids=result["successfully_awarded"],
                points_amount=points_amount,
                reason=reason,
                barbershop_id=user_context["barbershop_id"]
            )
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to bulk award points: {str(e)}")