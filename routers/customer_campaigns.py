#!/usr/bin/env python3
"""
Customer Campaign Management Router
Fast and comprehensive campaign management for barbershop marketing automation
"""

from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta, date
import uuid
import json
from enum import Enum

# Import services
from services.campaign_management_service import CampaignManagementService
from services.supabase_auth import verify_token, get_user_barbershop

# Pydantic models for request/response
class CampaignType(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    MULTI_CHANNEL = "multi_channel"

class CampaignCategory(str, Enum):
    PROMOTIONAL = "promotional"
    RETENTION = "retention"
    REACTIVATION = "reactivation"
    NURTURE = "nurture"
    WELCOME = "welcome"
    BIRTHDAY = "birthday"
    REFERRAL = "referral"

class TriggerType(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    BEHAVIORAL = "behavioral"
    LIFECYCLE = "lifecycle"
    AUTOMATED = "automated"

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    FAILED = "failed"

class ChannelContent(BaseModel):
    subject: Optional[str] = None
    message: str
    template_id: Optional[str] = None
    personalization: bool = True
    short_url: bool = False

class CampaignDefinitionCreate(BaseModel):
    campaign_name: str
    campaign_description: Optional[str] = None
    campaign_type: CampaignType
    campaign_category: CampaignCategory
    target_segments: Optional[List[str]] = []
    target_criteria: Optional[Dict[str, Any]] = {}
    channels: Dict[str, ChannelContent]
    trigger_type: TriggerType
    trigger_criteria: Optional[Dict[str, Any]] = {}
    send_schedule: Optional[Dict[str, Any]] = {}
    frequency_cap: Optional[Dict[str, Any]] = {}
    primary_goal: str
    success_metrics: Optional[Dict[str, Any]] = {}
    target_conversion_rate: Optional[float] = None
    is_active: bool = True
    is_template: bool = False
    auto_optimize: bool = False

class CampaignExecutionCreate(BaseModel):
    campaign_definition_id: str
    execution_name: str
    execution_type: str = "standard"
    scheduled_start_time: Optional[datetime] = None
    scheduled_end_time: Optional[datetime] = None
    test_variants: Optional[Dict[str, Any]] = {}
    control_percentage: Optional[float] = 0

class AutomatedCampaignSetup(BaseModel):
    campaign_types: List[str]  # ['welcome', 'birthday', 'win_back']
    welcome_series_config: Optional[Dict[str, Any]] = {}
    birthday_config: Optional[Dict[str, Any]] = {}
    win_back_config: Optional[Dict[str, Any]] = {}

class TestCampaignRequest(BaseModel):
    campaign_definition_id: str
    test_email: Optional[EmailStr] = None
    test_phone: Optional[str] = None
    channel: str  # 'email' or 'sms'

# Router setup
router = APIRouter()
security = HTTPBearer()
campaign_service = CampaignManagementService()

async def get_current_user_barbershop(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract user and barbershop from JWT token"""
    try:
        user = verify_token(credentials.credentials)
        barbershop = get_user_barbershop(user['sub'])
        if not barbershop:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not associated with any barbershop"
            )
        return {
            'user_id': user['sub'],
            'barbershop_id': barbershop['id'],
            'role': barbershop.get('role', 'staff')
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

@router.post("/campaigns/create")
async def create_campaign(
    campaign_data: CampaignDefinitionCreate,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Create a new campaign definition"""
    try:
        # Add barbershop_id to campaign data
        campaign_dict = campaign_data.dict()
        campaign_dict['barbershop_id'] = user_data['barbershop_id']
        
        # Create campaign
        campaign = await campaign_service.create_campaign_definition(campaign_dict)
        
        return {
            "success": True,
            "message": "Campaign created successfully",
            "data": {
                "campaign_id": campaign['id'],
                "campaign_name": campaign['campaign_name'],
                "campaign_type": campaign['campaign_type'],
                "created_at": campaign['created_at']
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create campaign: {str(e)}"
        )

@router.get("/campaigns/list")
async def list_campaigns(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """List all campaigns for the barbershop with filtering"""
    try:
        filters = {}
        if status_filter:
            filters['status'] = status_filter
        if type_filter:
            filters['campaign_type'] = type_filter
        if category_filter:
            filters['campaign_category'] = category_filter
            
        campaigns = await campaign_service.list_campaigns(
            barbershop_id=user_data['barbershop_id'],
            page=page,
            limit=limit,
            filters=filters
        )
        
        return {
            "success": True,
            "data": campaigns
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve campaigns: {str(e)}"
        )

@router.post("/campaigns/{campaign_id}/execute")
async def execute_campaign(
    campaign_id: str,
    execution_data: CampaignExecutionCreate,
    background_tasks: BackgroundTasks,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Execute a campaign"""
    try:
        # Validate campaign ownership
        campaign = await campaign_service.get_campaign_definition(
            campaign_id, user_data['barbershop_id']
        )
        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )
        
        # Create execution record
        execution_dict = execution_data.dict()
        execution_dict['barbershop_id'] = user_data['barbershop_id']
        execution_dict['campaign_definition_id'] = campaign_id
        
        execution = await campaign_service.create_campaign_execution(execution_dict)
        
        # Start campaign execution in background
        background_tasks.add_task(
            campaign_service.execute_campaign_async,
            execution['id'],
            user_data['barbershop_id']
        )
        
        return {
            "success": True,
            "message": "Campaign execution started",
            "data": {
                "execution_id": execution['id'],
                "execution_name": execution['execution_name'],
                "status": execution['status'],
                "scheduled_start_time": execution['scheduled_start_time']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute campaign: {str(e)}"
        )

@router.get("/campaigns/{campaign_id}/performance")
async def get_campaign_performance(
    campaign_id: str,
    execution_id: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Get campaign performance metrics"""
    try:
        performance = await campaign_service.get_campaign_performance(
            campaign_id=campaign_id,
            barbershop_id=user_data['barbershop_id'],
            execution_id=execution_id,
            date_from=date_from,
            date_to=date_to
        )
        
        return {
            "success": True,
            "data": performance
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve performance metrics: {str(e)}"
        )

@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Pause a running campaign"""
    try:
        result = await campaign_service.pause_campaign(
            campaign_id, user_data['barbershop_id']
        )
        
        return {
            "success": True,
            "message": "Campaign paused successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause campaign: {str(e)}"
        )

@router.post("/campaigns/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: str,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Resume a paused campaign"""
    try:
        result = await campaign_service.resume_campaign(
            campaign_id, user_data['barbershop_id']
        )
        
        return {
            "success": True,
            "message": "Campaign resumed successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume campaign: {str(e)}"
        )

@router.get("/campaigns/templates")
async def get_campaign_templates(
    category: Optional[str] = None,
    type_filter: Optional[str] = None,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Get campaign templates"""
    try:
        templates = await campaign_service.get_campaign_templates(
            category=category,
            campaign_type=type_filter
        )
        
        return {
            "success": True,
            "data": templates
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve templates: {str(e)}"
        )

@router.post("/campaigns/automated/setup")
async def setup_automated_campaigns(
    setup_data: AutomatedCampaignSetup,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Set up automated campaigns (welcome, birthday, win-back)"""
    try:
        result = await campaign_service.setup_automated_campaigns(
            barbershop_id=user_data['barbershop_id'],
            campaign_types=setup_data.campaign_types,
            welcome_config=setup_data.welcome_series_config,
            birthday_config=setup_data.birthday_config,
            win_back_config=setup_data.win_back_config
        )
        
        return {
            "success": True,
            "message": "Automated campaigns set up successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to setup automated campaigns: {str(e)}"
        )

@router.get("/campaigns/{campaign_id}/responses")
async def get_campaign_responses(
    campaign_id: str,
    execution_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    response_type: Optional[str] = None,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Get customer responses for a campaign"""
    try:
        responses = await campaign_service.get_campaign_responses(
            campaign_id=campaign_id,
            barbershop_id=user_data['barbershop_id'],
            execution_id=execution_id,
            page=page,
            limit=limit,
            response_type=response_type
        )
        
        return {
            "success": True,
            "data": responses
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve campaign responses: {str(e)}"
        )

@router.post("/campaigns/test")
async def send_test_campaign(
    test_data: TestCampaignRequest,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Send a test campaign to specified email/phone"""
    try:
        result = await campaign_service.send_test_campaign(
            campaign_definition_id=test_data.campaign_definition_id,
            barbershop_id=user_data['barbershop_id'],
            test_email=test_data.test_email,
            test_phone=test_data.test_phone,
            channel=test_data.channel
        )
        
        return {
            "success": True,
            "message": "Test campaign sent successfully",
            "data": result
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test campaign: {str(e)}"
        )

# Campaign Analytics endpoints
@router.get("/campaigns/analytics/overview")
async def get_campaigns_overview(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Get overall campaign analytics for the barbershop"""
    try:
        overview = await campaign_service.get_campaigns_overview(
            barbershop_id=user_data['barbershop_id'],
            date_from=date_from,
            date_to=date_to
        )
        
        return {
            "success": True,
            "data": overview
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve campaigns overview: {str(e)}"
        )

@router.get("/campaigns/segments")
async def get_customer_segments(
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Get available customer segments for campaign targeting"""
    try:
        segments = await campaign_service.get_customer_segments(
            barbershop_id=user_data['barbershop_id']
        )
        
        return {
            "success": True,
            "data": segments
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve customer segments: {str(e)}"
        )

@router.post("/campaigns/{campaign_id}/clone")
async def clone_campaign(
    campaign_id: str,
    new_name: str,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Clone an existing campaign"""
    try:
        cloned_campaign = await campaign_service.clone_campaign(
            campaign_id=campaign_id,
            barbershop_id=user_data['barbershop_id'],
            new_name=new_name
        )
        
        return {
            "success": True,
            "message": "Campaign cloned successfully",
            "data": cloned_campaign
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone campaign: {str(e)}"
        )

@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    user_data: Dict = Depends(get_current_user_barbershop)
):
    """Delete a campaign (only if not executed)"""
    try:
        await campaign_service.delete_campaign(
            campaign_id=campaign_id,
            barbershop_id=user_data['barbershop_id']
        )
        
        return {
            "success": True,
            "message": "Campaign deleted successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete campaign: {str(e)}"
        )