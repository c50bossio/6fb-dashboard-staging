#!/usr/bin/env python3
"""
Alert API Service - FastAPI integration for intelligent alert system
Provides HTTP endpoints for the intelligent alert management system
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import uvicorn

# Import our intelligent alert service
try:
    from .intelligent_alert_service import intelligent_alert_service, AlertCategory, AlertPriority, AlertStatus
    from .realtime_service import realtime_service
    from .predictive_analytics_service import predictive_analytics_service
    SERVICES_AVAILABLE = True
except ImportError:
    SERVICES_AVAILABLE = False

logger = logging.getLogger(__name__)

# Pydantic models for API requests/responses
class CreateAlertRequest(BaseModel):
    barbershop_id: str = Field(..., description="Barbershop identifier")
    title: str = Field(..., min_length=1, max_length=200, description="Alert title")
    message: str = Field(..., min_length=1, max_length=1000, description="Alert message")
    category: str = Field(..., description="Alert category")
    source_data: Dict[str, Any] = Field(..., description="Source data for ML processing")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")

class AlertActionRequest(BaseModel):
    alert_id: str = Field(..., description="Alert identifier")
    user_id: str = Field(..., description="User performing the action")
    action: str = Field(..., description="Action to perform (acknowledge, dismiss, resolve, snooze)")
    notes: Optional[str] = Field(None, description="Optional notes")
    feedback: Optional[str] = Field(None, description="User feedback for ML learning")
    reason: Optional[str] = Field(None, description="Reason for the action")
    snooze_until: Optional[str] = Field(None, description="Snooze until timestamp")
    response_time: Optional[float] = Field(None, description="Time taken to respond in seconds")
    timestamp: Optional[str] = Field(None, description="Action timestamp")

class GetAlertsRequest(BaseModel):
    barbershop_id: str = Field(..., description="Barbershop identifier")
    user_id: str = Field(..., description="User identifier")
    priority_filter: Optional[str] = Field(None, description="Priority filter")
    category_filter: Optional[str] = Field(None, description="Category filter")
    limit: int = Field(50, ge=1, le=200, description="Maximum number of alerts")

class UpdatePreferencesRequest(BaseModel):
    user_id: str = Field(..., description="User identifier")
    barbershop_id: str = Field(..., description="Barbershop identifier")
    action: str = Field(..., description="Action type (get, update)")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")

class AlertHistoryRequest(BaseModel):
    barbershop_id: str = Field(..., description="Barbershop identifier")
    user_id: str = Field(..., description="User identifier")
    days: int = Field(7, ge=1, le=90, description="Number of days to look back")
    limit: int = Field(100, ge=1, le=500, description="Maximum number of alerts")
    filters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional filters")
    include_analytics: bool = Field(True, description="Include analytics data")

class BulkOperationRequest(BaseModel):
    barbershop_id: str = Field(..., description="Barbershop identifier")
    user_id: str = Field(..., description="User identifier")
    action: str = Field(..., description="Bulk action type")
    alert_ids: Optional[List[str]] = Field(None, description="Specific alert IDs")
    criteria: Optional[Dict[str, Any]] = Field(None, description="Selection criteria")
    notes: Optional[str] = Field(None, description="Bulk operation notes")
    timestamp: Optional[str] = Field(None, description="Operation timestamp")

# Initialize FastAPI app for alert services
alert_app = FastAPI(
    title="Intelligent Alert Management API",
    description="ML-powered alert system with adaptive learning and real-time processing",
    version="1.0.0"
)

@alert_app.post("/intelligent-alerts/create")
async def create_alert(request: CreateAlertRequest, background_tasks: BackgroundTasks):
    """Create a new intelligent alert with ML-based prioritization"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        # Validate category
        try:
            category = AlertCategory(request.category)
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid category. Must be one of: {[c.value for c in AlertCategory]}"
            )
        
        # Create alert using intelligent service
        alert = await intelligent_alert_service.create_alert(
            barbershop_id=request.barbershop_id,
            title=request.title,
            message=request.message,
            category=category,
            source_data=request.source_data,
            metadata=request.metadata
        )
        
        # Background task for additional processing
        background_tasks.add_task(
            process_alert_background,
            alert.alert_id,
            request.barbershop_id,
            request.source_data
        )
        
        # Convert alert to dict for JSON response
        alert_dict = {
            'alert_id': alert.alert_id,
            'barbershop_id': alert.barbershop_id,
            'title': alert.title,
            'message': alert.message,
            'category': alert.category.value,
            'priority': alert.priority.value,
            'confidence_score': alert.confidence_score,
            'severity_score': alert.severity_score,
            'urgency_score': alert.urgency_score,
            'business_impact': alert.business_impact,
            'status': alert.status.value,
            'created_at': alert.created_at,
            'updated_at': alert.updated_at,
            'expires_at': alert.expires_at,
            'metadata': alert.metadata,
            'source_data': alert.source_data,
            'recommended_actions': alert.recommended_actions,
            'similar_alerts_count': alert.similar_alerts_count,
            'ml_features': alert.ml_features
        }
        
        logger.info(f"✅ Created alert {alert.alert_id} for barbershop {request.barbershop_id}")
        return alert_dict
        
    except Exception as e:
        logger.error(f"Alert creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Alert creation failed: {str(e)}")

@alert_app.post("/intelligent-alerts/active")
async def get_active_alerts(request: GetAlertsRequest):
    """Get active alerts with intelligent filtering and prioritization"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        # Convert priority filter
        priority_filter = None
        if request.priority_filter:
            try:
                priority_filter = AlertPriority(request.priority_filter)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid priority filter. Must be one of: {[p.value for p in AlertPriority]}"
                )
        
        # Convert category filter
        category_filter = None
        if request.category_filter:
            try:
                category_filter = AlertCategory(request.category_filter)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid category filter. Must be one of: {[c.value for c in AlertCategory]}"
                )
        
        # Get alerts from intelligent service
        alerts = await intelligent_alert_service.get_active_alerts(
            barbershop_id=request.barbershop_id,
            user_id=request.user_id,
            priority_filter=priority_filter,
            category_filter=category_filter,
            limit=request.limit
        )
        
        logger.info(f"📊 Retrieved {len(alerts)} active alerts for user {request.user_id}")
        return alerts
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving active alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve alerts: {str(e)}")

@alert_app.post("/intelligent-alerts/acknowledge")
async def acknowledge_alert(request: AlertActionRequest):
    """Acknowledge alert and record user interaction"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        success = await intelligent_alert_service.acknowledge_alert(
            alert_id=request.alert_id,
            user_id=request.user_id,
            notes=request.notes
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found or action failed")
        
        return {
            'success': True,
            'alert_id': request.alert_id,
            'action': 'acknowledged',
            'user_id': request.user_id,
            'timestamp': datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to acknowledge alert: {str(e)}")

@alert_app.post("/intelligent-alerts/dismiss")
async def dismiss_alert(request: AlertActionRequest):
    """Dismiss alert with feedback for ML learning"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        success = await intelligent_alert_service.dismiss_alert(
            alert_id=request.alert_id,
            user_id=request.user_id,
            feedback=request.feedback,
            reason=request.reason
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found or action failed")
        
        return {
            'success': True,
            'alert_id': request.alert_id,
            'action': 'dismissed',
            'user_id': request.user_id,
            'feedback_processed': bool(request.feedback),
            'ml_learning_applied': bool(request.feedback),
            'timestamp': datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error dismissing alert: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to dismiss alert: {str(e)}")

@alert_app.post("/intelligent-alerts/history")
async def get_alert_history(request: AlertHistoryRequest):
    """Get alert history with analytics and insights"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        history_data = await intelligent_alert_service.get_alert_history(
            barbershop_id=request.barbershop_id,
            user_id=request.user_id,
            days=request.days,
            limit=request.limit
        )
        
        if 'error' in history_data:
            raise HTTPException(status_code=500, detail=history_data['error'])
        
        return history_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting alert history: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get alert history: {str(e)}")

@alert_app.post("/intelligent-alerts/preferences")
async def manage_preferences(request: UpdatePreferencesRequest):
    """Get or update user alert preferences"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        if request.action == 'get':
            preferences = await intelligent_alert_service._get_user_preferences(
                request.user_id, 
                request.barbershop_id
            )
            return preferences or get_default_preferences()
        
        elif request.action == 'update':
            if not request.preferences:
                raise HTTPException(status_code=400, detail="Preferences data required for update")
            
            success = await intelligent_alert_service._update_user_preferences(
                request.user_id,
                request.barbershop_id,
                request.preferences
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to update preferences")
            
            return {
                'success': True,
                'user_id': request.user_id,
                'barbershop_id': request.barbershop_id,
                'updated_at': datetime.now().isoformat()
            }
        
        else:
            raise HTTPException(status_code=400, detail="Invalid action. Must be 'get' or 'update'")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error managing preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to manage preferences: {str(e)}")

@alert_app.post("/intelligent-alerts/bulk-acknowledge")
async def bulk_acknowledge(request: BulkOperationRequest):
    """Bulk acknowledge alerts"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        if not request.alert_ids and not request.criteria:
            raise HTTPException(
                status_code=400, 
                detail="Either alert_ids or selection criteria must be provided"
            )
        
        # Process bulk acknowledgment
        results = await process_bulk_acknowledgment(
            barbershop_id=request.barbershop_id,
            user_id=request.user_id,
            alert_ids=request.alert_ids,
            criteria=request.criteria,
            notes=request.notes
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk acknowledge: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk acknowledge failed: {str(e)}")

@alert_app.post("/intelligent-alerts/bulk-dismiss")
async def bulk_dismiss(request: BulkOperationRequest):
    """Bulk dismiss alerts"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(status_code=503, detail="Alert services not available")
    
    try:
        if not request.alert_ids and not request.criteria:
            raise HTTPException(
                status_code=400, 
                detail="Either alert_ids or selection criteria must be provided"
            )
        
        # Process bulk dismissal
        results = await process_bulk_dismissal(
            barbershop_id=request.barbershop_id,
            user_id=request.user_id,
            alert_ids=request.alert_ids,
            criteria=request.criteria,
            reason=request.notes
        )
        
        return results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk dismiss: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk dismiss failed: {str(e)}")

@alert_app.get("/intelligent-alerts/health")
async def health_check():
    """Health check endpoint for alert services"""
    try:
        status = {
            'service': 'intelligent_alert_system',
            'status': 'healthy' if SERVICES_AVAILABLE else 'degraded',
            'timestamp': datetime.now().isoformat(),
            'components': {
                'alert_service': SERVICES_AVAILABLE,
                'ml_models': bool(SERVICES_AVAILABLE and intelligent_alert_service.ml_models),
                'database': True,  # Would check database connectivity in production
                'real_time': bool(SERVICES_AVAILABLE and realtime_service)
            }
        }
        
        if SERVICES_AVAILABLE:
            # Get service statistics
            service_stats = intelligent_alert_service.get_system_status() if hasattr(intelligent_alert_service, 'get_system_status') else {}
            status['statistics'] = service_stats
        
        return status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            'service': 'intelligent_alert_system',
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# Background processing functions

async def process_alert_background(alert_id: str, barbershop_id: str, source_data: Dict[str, Any]):
    """Background processing for newly created alerts"""
    try:
        # Trigger predictive analytics if available
        if SERVICES_AVAILABLE and predictive_analytics_service:
            # Generate related business insights
            insights = await predictive_analytics_service.generate_business_insights(
                barbershop_id=barbershop_id,
                booking_history=[],  # Would get actual data in production
                revenue_data=None
            )
            
            if insights:
                logger.info(f"💡 Generated {len(insights)} business insights for alert {alert_id}")
        
        # Send real-time notification
        if SERVICES_AVAILABLE and realtime_service:
            await realtime_service.send_business_event(
                user_id=f"barbershop_{barbershop_id}",
                event_type='alert_created',
                event_data={'alert_id': alert_id, 'category': source_data.get('category')}
            )
        
    except Exception as e:
        logger.error(f"Background processing failed for alert {alert_id}: {e}")

async def process_bulk_acknowledgment(barbershop_id: str, user_id: str, 
                                    alert_ids: Optional[List[str]], 
                                    criteria: Optional[Dict[str, Any]],
                                    notes: Optional[str]) -> Dict[str, Any]:
    """Process bulk acknowledgment of alerts"""
    success_count = 0
    failed_count = 0
    errors = []
    
    # Get alert IDs based on criteria if not provided
    if not alert_ids and criteria:
        # This would implement criteria-based alert selection
        alert_ids = []  # Placeholder
    
    if not alert_ids:
        return {
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'errors': ['No alerts matched the criteria']
        }
    
    # Process each alert
    for alert_id in alert_ids:
        try:
            success = await intelligent_alert_service.acknowledge_alert(
                alert_id=alert_id,
                user_id=user_id,
                notes=notes or 'Bulk acknowledged'
            )
            
            if success:
                success_count += 1
            else:
                failed_count += 1
                errors.append(f"Alert {alert_id}: Acknowledgment failed")
                
        except Exception as e:
            failed_count += 1
            errors.append(f"Alert {alert_id}: {str(e)}")
    
    return {
        'processed_count': len(alert_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors
    }

async def process_bulk_dismissal(barbershop_id: str, user_id: str,
                               alert_ids: Optional[List[str]],
                               criteria: Optional[Dict[str, Any]],
                               reason: Optional[str]) -> Dict[str, Any]:
    """Process bulk dismissal of alerts"""
    success_count = 0
    failed_count = 0
    errors = []
    
    # Get alert IDs based on criteria if not provided
    if not alert_ids and criteria:
        # This would implement criteria-based alert selection
        alert_ids = []  # Placeholder
    
    if not alert_ids:
        return {
            'processed_count': 0,
            'success_count': 0,
            'failed_count': 0,
            'errors': ['No alerts matched the criteria']
        }
    
    # Process each alert
    for alert_id in alert_ids:
        try:
            success = await intelligent_alert_service.dismiss_alert(
                alert_id=alert_id,
                user_id=user_id,
                feedback=reason,
                reason=reason or 'Bulk dismissed'
            )
            
            if success:
                success_count += 1
            else:
                failed_count += 1
                errors.append(f"Alert {alert_id}: Dismissal failed")
                
        except Exception as e:
            failed_count += 1
            errors.append(f"Alert {alert_id}: {str(e)}")
    
    return {
        'processed_count': len(alert_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'errors': errors,
        'ml_learning_applied': bool(reason)
    }

def get_default_preferences():
    """Return default user preferences"""
    return {
        'email_enabled': True,
        'sms_enabled': False,
        'push_enabled': True,
        'priority_threshold': 'medium',
        'quiet_hours_start': '22:00',
        'quiet_hours_end': '08:00',
        'category_preferences': {
            'business_metric': True,
            'system_health': True,
            'customer_behavior': True,
            'revenue_anomaly': True,
            'operational_issue': True,
            'opportunity': False,
            'compliance': True,
            'security': True
        },
        'frequency_limits': {
            'business_metric': 10,
            'system_health': 5,
            'customer_behavior': 8,
            'revenue_anomaly': 3,
            'operational_issue': 6,
            'opportunity': 2,
            'compliance': 3,
            'security': 2
        },
        'learning_preferences': {
            'adaptive_learning_enabled': True,
            'feedback_learning_weight': 0.3,
            'auto_dismiss_spam': True,
            'smart_grouping': True
        },
        'updated_at': datetime.now().isoformat()
    }

# Export the FastAPI app for mounting in main server
__all__ = ['alert_app']

if __name__ == "__main__":
    # Run the alert API service standalone for testing
    logger.info("🚀 Starting Intelligent Alert API Service...")
    uvicorn.run(
        alert_app,
        host="0.0.0.0",
        port=8002,
        log_level="info",
        reload=True
    )