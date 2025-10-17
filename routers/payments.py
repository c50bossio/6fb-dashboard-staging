"""
Payment Processing Router
Handles Stripe Connect account management, bank accounts, and payouts
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import stripe
import os
import json
import logging
from supabase import create_client, Client

# Configure logging
logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/payments", tags=["payments"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL", "")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(supabase_url, supabase_key) if supabase_url and supabase_key else None

# ==========================================
# Pydantic Models
# ==========================================

class CreateConnectedAccountRequest(BaseModel):
    business_type: str = Field(..., description="individual or company")
    business_name: Optional[str] = Field(None, description="Name of the business")
    email: str = Field(..., description="Email for the account")
    country: str = Field(default="US", description="Country code")
    account_type: str = Field(default="express", description="express, standard, or custom")

class OnboardingLinkRequest(BaseModel):
    account_id: str = Field(..., description="Stripe Connect account ID")
    refresh_url: str = Field(..., description="URL to refresh onboarding")
    return_url: str = Field(..., description="URL to return after onboarding")

class BankAccountRequest(BaseModel):
    account_id: str = Field(..., description="Stripe Connect account ID")
    account_number: str = Field(..., description="Bank account number")
    routing_number: str = Field(..., description="Bank routing number")
    account_holder_name: str = Field(..., description="Name on the account")
    account_holder_type: str = Field(default="individual", description="individual or company")

class PayoutSettingsRequest(BaseModel):
    schedule: str = Field(default="daily", description="daily, weekly, monthly, manual")
    delay_days: int = Field(default=2, description="Days to delay payouts")
    day_of_week: Optional[int] = Field(None, description="1-7 for weekly payouts")
    day_of_month: Optional[int] = Field(None, description="1-31 for monthly payouts")
    minimum_amount: Optional[float] = Field(None, description="Minimum payout amount")

class ConnectAccountResponse(BaseModel):
    account_id: str
    onboarding_completed: bool
    charges_enabled: bool
    payouts_enabled: bool
    verification_status: str
    requirements: Dict[str, Any]

# ==========================================
# Authentication Dependencies
# ==========================================

async def get_current_user(authorization: str = None):
    """Get current user from authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Extract token from Bearer scheme
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
    
    # Verify with Supabase
    if supabase:
        try:
            user = supabase.auth.get_user(token)
            if user and user.user:
                return user.user
        except Exception as e:
            logger.error(f"Auth error: {e}")
    
    raise HTTPException(status_code=401, detail="Invalid authentication")

# ==========================================
# Stripe Connect Account Management
# ==========================================

@router.post("/connect/create", response_model=ConnectAccountResponse)
async def create_connected_account(
    request: CreateConnectedAccountRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Create a new Stripe Connected Account"""
    try:
        # Check if user already has a connected account
        if supabase:
            existing = supabase.table("stripe_connected_accounts").select("*").eq("user_id", current_user.id).execute()
            if existing.data and len(existing.data) > 0:
                account = existing.data[0]
                return ConnectAccountResponse(
                    account_id=account["stripe_account_id"],
                    onboarding_completed=account["onboarding_completed"],
                    charges_enabled=account["charges_enabled"],
                    payouts_enabled=account["payouts_enabled"],
                    verification_status=account["verification_status"] or "pending",
                    requirements=account["requirements"] or {}
                )
        
        # Create Stripe Connect account
        account_params = {
            "type": request.account_type,
            "country": request.country,
            "email": request.email,
            "capabilities": {
                "card_payments": {"requested": True},
                "transfers": {"requested": True}
            }
        }
        
        if request.business_type:
            account_params["business_type"] = request.business_type
        
        if request.business_name:
            account_params["company"] = {"name": request.business_name}
        
        stripe_account = stripe.Account.create(**account_params)
        
        # Save to database
        if supabase:
            # Get user's barbershop
            barbershop = supabase.table("barbershops").select("id").eq("owner_id", current_user.id).execute()
            barbershop_id = barbershop.data[0]["id"] if barbershop.data else None
            
            # Insert connected account record
            account_data = {
                "user_id": current_user.id,
                "barbershop_id": barbershop_id,
                "stripe_account_id": stripe_account.id,
                "account_type": request.account_type,
                "business_type": request.business_type,
                "business_name": request.business_name,
                "onboarding_completed": False,
                "details_submitted": False,
                "charges_enabled": False,
                "payouts_enabled": False,
                "verification_status": "pending",
                "capabilities": stripe_account.capabilities.to_dict() if stripe_account.capabilities else {},
                "requirements": stripe_account.requirements.to_dict() if stripe_account.requirements else {}
            }
            
            supabase.table("stripe_connected_accounts").insert(account_data).execute()
            
            # Update profile
            supabase.table("profiles").update({
                "stripe_connect_id": stripe_account.id,
                "stripe_connect_onboarded": False
            }).eq("id", current_user.id).execute()
            
            # Update barbershop if exists
            if barbershop_id:
                supabase.table("barbershops").update({
                    "stripe_connected_account_id": stripe_account.id,
                    "accepts_online_payments": False
                }).eq("id", barbershop_id).execute()
        
        # Schedule background task to check account status
        background_tasks.add_task(check_account_status, stripe_account.id, current_user.id)
        
        return ConnectAccountResponse(
            account_id=stripe_account.id,
            onboarding_completed=False,
            charges_enabled=False,
            payouts_enabled=False,
            verification_status="pending",
            requirements=stripe_account.requirements.to_dict() if stripe_account.requirements else {}
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating connected account: {e}")
        raise HTTPException(status_code=500, detail="Failed to create connected account")

@router.post("/connect/onboarding-link")
async def create_onboarding_link(
    request: OnboardingLinkRequest,
    current_user = Depends(get_current_user)
):
    """Generate Stripe Connect onboarding link"""
    try:
        # Verify account ownership
        if supabase:
            account = supabase.table("stripe_connected_accounts").select("*").eq("stripe_account_id", request.account_id).eq("user_id", current_user.id).execute()
            if not account.data:
                raise HTTPException(status_code=403, detail="Account not found or unauthorized")
        
        # Create account link
        account_link = stripe.AccountLink.create(
            account=request.account_id,
            refresh_url=request.refresh_url,
            return_url=request.return_url,
            type="account_onboarding"
        )
        
        return {"url": account_link.url, "expires_at": account_link.expires_at}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating onboarding link: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating onboarding link: {e}")
        raise HTTPException(status_code=500, detail="Failed to create onboarding link")

@router.get("/connect/status/{account_id}", response_model=ConnectAccountResponse)
async def get_account_status(
    account_id: str,
    current_user = Depends(get_current_user)
):
    """Get Stripe Connect account status"""
    try:
        # Verify account ownership
        if supabase:
            db_account = supabase.table("stripe_connected_accounts").select("*").eq("stripe_account_id", account_id).eq("user_id", current_user.id).execute()
            if not db_account.data:
                raise HTTPException(status_code=403, detail="Account not found or unauthorized")
        
        # Get latest status from Stripe
        stripe_account = stripe.Account.retrieve(account_id)
        
        # Update database with latest status
        if supabase:
            update_data = {
                "details_submitted": stripe_account.details_submitted,
                "charges_enabled": stripe_account.charges_enabled,
                "payouts_enabled": stripe_account.payouts_enabled,
                "capabilities": stripe_account.capabilities.to_dict() if stripe_account.capabilities else {},
                "requirements": stripe_account.requirements.to_dict() if stripe_account.requirements else {},
                "verification_status": "verified" if stripe_account.charges_enabled and stripe_account.payouts_enabled else "pending"
            }
            
            # Check if onboarding is complete
            if stripe_account.details_submitted and stripe_account.charges_enabled and stripe_account.payouts_enabled:
                update_data["onboarding_completed"] = True
                
                # Update profile
                supabase.table("profiles").update({
                    "stripe_connect_onboarded": True,
                    "payment_setup_completed": True,
                    "payment_setup_completed_at": datetime.now().isoformat()
                }).eq("id", current_user.id).execute()
                
                # Update barbershop
                barbershop = supabase.table("barbershops").select("id").eq("owner_id", current_user.id).execute()
                if barbershop.data:
                    supabase.table("barbershops").update({
                        "accepts_online_payments": True
                    }).eq("id", barbershop.data[0]["id"]).execute()
            
            supabase.table("stripe_connected_accounts").update(update_data).eq("stripe_account_id", account_id).execute()
        
        return ConnectAccountResponse(
            account_id=stripe_account.id,
            onboarding_completed=stripe_account.details_submitted and stripe_account.charges_enabled and stripe_account.payouts_enabled,
            charges_enabled=stripe_account.charges_enabled,
            payouts_enabled=stripe_account.payouts_enabled,
            verification_status="verified" if stripe_account.charges_enabled and stripe_account.payouts_enabled else "pending",
            requirements=stripe_account.requirements.to_dict() if stripe_account.requirements else {}
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error getting account status: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting account status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get account status")

# ==========================================
# Bank Account Management
# ==========================================

@router.post("/bank-account/add")
async def add_bank_account(
    request: BankAccountRequest,
    current_user = Depends(get_current_user)
):
    """Add a bank account for payouts"""
    try:
        # Verify account ownership
        if supabase:
            account = supabase.table("stripe_connected_accounts").select("*").eq("stripe_account_id", request.account_id).eq("user_id", current_user.id).execute()
            if not account.data:
                raise HTTPException(status_code=403, detail="Account not found or unauthorized")
        
        # Create bank account token
        bank_token = stripe.Token.create(
            bank_account={
                "country": "US",
                "currency": "usd",
                "account_holder_name": request.account_holder_name,
                "account_holder_type": request.account_holder_type,
                "routing_number": request.routing_number,
                "account_number": request.account_number
            }
        )
        
        # Attach to Connect account
        external_account = stripe.Account.create_external_account(
            request.account_id,
            external_account=bank_token.id
        )
        
        # Set as default for payouts
        stripe.Account.modify(
            request.account_id,
            external_account=external_account.id,
            default_for_currency=True
        )
        
        # Save to database
        if supabase:
            bank_data = {
                "user_id": current_user.id,
                "stripe_connected_account_id": account.data[0]["id"],
                "stripe_bank_account_id": external_account.id,
                "account_holder_name": request.account_holder_name,
                "account_holder_type": request.account_holder_type,
                "bank_name": external_account.bank_name if hasattr(external_account, 'bank_name') else None,
                "last4": external_account.last4,
                "routing_number_last4": external_account.routing_number[-4:] if hasattr(external_account, 'routing_number') else None,
                "currency": external_account.currency,
                "country": external_account.country,
                "status": "new",
                "is_default": True
            }
            
            # Set other accounts as non-default
            supabase.table("bank_accounts").update({"is_default": False}).eq("user_id", current_user.id).execute()
            
            # Insert new account
            supabase.table("bank_accounts").insert(bank_data).execute()
        
        return {
            "success": True,
            "bank_account_id": external_account.id,
            "last4": external_account.last4,
            "bank_name": external_account.bank_name if hasattr(external_account, 'bank_name') else None
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error adding bank account: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding bank account: {e}")
        raise HTTPException(status_code=500, detail="Failed to add bank account")

@router.get("/bank-accounts")
async def get_bank_accounts(current_user = Depends(get_current_user)):
    """Get user's bank accounts"""
    try:
        if not supabase:
            return {"accounts": []}
        
        accounts = supabase.table("bank_accounts").select("*").eq("user_id", current_user.id).eq("is_active", True).execute()
        
        return {"accounts": accounts.data if accounts.data else []}
        
    except Exception as e:
        logger.error(f"Error getting bank accounts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bank accounts")

# ==========================================
# Payout Configuration
# ==========================================

@router.post("/payout-settings")
async def update_payout_settings(
    request: PayoutSettingsRequest,
    current_user = Depends(get_current_user)
):
    """Update payout settings"""
    try:
        if not supabase:
            raise HTTPException(status_code=500, detail="Database not configured")
        
        # Get user's connected account
        account = supabase.table("stripe_connected_accounts").select("*").eq("user_id", current_user.id).execute()
        if not account.data:
            raise HTTPException(status_code=404, detail="No connected account found")
        
        stripe_account_id = account.data[0]["stripe_account_id"]
        
        # Update Stripe payout schedule
        schedule_params = {
            "interval": request.schedule
        }
        
        if request.schedule == "daily":
            schedule_params["delay_days"] = request.delay_days
        elif request.schedule == "weekly":
            schedule_params["weekly_anchor"] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][request.day_of_week - 1] if request.day_of_week else "monday"
        elif request.schedule == "monthly":
            schedule_params["monthly_anchor"] = request.day_of_month or 1
        
        stripe.Account.modify(
            stripe_account_id,
            settings={
                "payouts": {
                    "schedule": schedule_params
                }
            }
        )
        
        # Get barbershop
        barbershop = supabase.table("barbershops").select("id").eq("owner_id", current_user.id).execute()
        barbershop_id = barbershop.data[0]["id"] if barbershop.data else None
        
        # Update database
        payout_data = {
            "user_id": current_user.id,
            "barbershop_id": barbershop_id,
            "stripe_connected_account_id": account.data[0]["id"],
            "payout_method": "standard",
            "payout_schedule": request.schedule,
            "payout_day_of_week": request.day_of_week,
            "payout_day_of_month": request.day_of_month,
            "minimum_payout_amount": request.minimum_amount or 0,
            "auto_payout": True
        }
        
        # Upsert payout settings
        existing = supabase.table("payout_settings").select("id").eq("user_id", current_user.id).execute()
        if existing.data:
            supabase.table("payout_settings").update(payout_data).eq("id", existing.data[0]["id"]).execute()
        else:
            supabase.table("payout_settings").insert(payout_data).execute()
        
        # Update account payout schedule in database
        supabase.table("stripe_connected_accounts").update({
            "payout_schedule": schedule_params
        }).eq("id", account.data[0]["id"]).execute()
        
        return {"success": True, "message": "Payout settings updated"}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error updating payout settings: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating payout settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to update payout settings")

@router.get("/payout-settings")
async def get_payout_settings(current_user = Depends(get_current_user)):
    """Get current payout settings"""
    try:
        if not supabase:
            return {"settings": None}
        
        settings = supabase.table("payout_settings").select("*").eq("user_id", current_user.id).execute()
        
        return {"settings": settings.data[0] if settings.data else None}
        
    except Exception as e:
        logger.error(f"Error getting payout settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get payout settings")

# ==========================================
# Helper Functions
# ==========================================

async def check_account_status(account_id: str, user_id: str):
    """Background task to check and update account status"""
    try:
        stripe_account = stripe.Account.retrieve(account_id)
        
        if supabase:
            update_data = {
                "details_submitted": stripe_account.details_submitted,
                "charges_enabled": stripe_account.charges_enabled,
                "payouts_enabled": stripe_account.payouts_enabled,
                "capabilities": stripe_account.capabilities.to_dict() if stripe_account.capabilities else {},
                "requirements": stripe_account.requirements.to_dict() if stripe_account.requirements else {}
            }
            
            if stripe_account.details_submitted and stripe_account.charges_enabled and stripe_account.payouts_enabled:
                update_data["onboarding_completed"] = True
                update_data["verification_status"] = "verified"
            
            supabase.table("stripe_connected_accounts").update(update_data).eq("stripe_account_id", account_id).execute()
            
    except Exception as e:
        logger.error(f"Error checking account status: {e}")

# ==========================================
# Health Check
# ==========================================

@router.get("/health")
async def health_check():
    """Check payment service health"""
    return {
        "status": "healthy",
        "stripe_configured": bool(stripe.api_key),
        "database_connected": bool(supabase),
        "timestamp": datetime.now().isoformat()
    }