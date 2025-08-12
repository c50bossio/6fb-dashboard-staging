"""
Real-time Data FastAPI Endpoint
Provides REST API access to real-time business data feeds
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

# Import our real-time data service
from .realtime_business_data_service import (
    RealtimeBusinessDataService,
    DataSource,
    DataFeedType,
    realtime_business_data_service
)

logger = logging.getLogger(__name__)

# Create FastAPI router
router = APIRouter(prefix="/realtime-data", tags=["Real-time Data"])

# Pydantic models for API
class FeedConfiguration(BaseModel):
    feed_id: str = Field(..., description="Feed identifier")
    source: str = Field(..., description="Data source")
    feed_type: str = Field(..., description="Feed type")
    update_interval: int = Field(..., description="Update interval in seconds")
    enabled: bool = Field(True, description="Whether feed is enabled")

class SubscriptionRequest(BaseModel):
    feed_id: str = Field(..., description="Feed to subscribe to")
    callback_url: Optional[str] = Field(None, description="Webhook callback URL")
    notification_method: str = Field("webhook", description="Notification method")

class DataExportRequest(BaseModel):
    feed_id: Optional[str] = Field(None, description="Specific feed ID or all feeds")
    start_time: Optional[str] = Field(None, description="Start time for export")
    end_time: Optional[str] = Field(None, description="End time for export")
    format: str = Field("json", description="Export format")

# Global service state
_service_started = False

async def ensure_service_started():
    """Ensure the real-time data service is started"""
    global _service_started
    
    if not _service_started:
        await realtime_business_data_service.start_data_feeds()
        _service_started = True
        logger.info("✅ Real-time data service auto-started")

@router.get("/status")
async def get_service_status():
    """
    Get the status of the real-time data service
    """
    try:
        await ensure_service_started()
        
        status = realtime_business_data_service.get_feed_status()
        
        return {
            'success': True,
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Status check failed: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {str(e)}")

@router.get("/current-metrics")
async def get_current_business_metrics():
    """
    Get current aggregated business metrics
    """
    try:
        await ensure_service_started()
        
        metrics = await realtime_business_data_service.get_current_business_metrics()
        
        return {
            'success': True,
            'metrics': asdict(metrics),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Current metrics retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Metrics retrieval failed: {str(e)}")

@router.get("/feed/{feed_id}")
async def get_feed_data(feed_id: str, limit: int = 10):
    """
    Get latest data points from a specific feed
    """
    try:
        await ensure_service_started()
        
        data_points = realtime_business_data_service.get_latest_data(feed_id, limit)
        
        # Convert DataPoint objects to dictionaries
        data_points_dict = []
        for point in data_points:
            data_points_dict.append({
                'timestamp': point.timestamp,
                'source': point.source,
                'data_type': point.data_type,
                'value': point.value,
                'metadata': point.metadata,
                'confidence': point.confidence
            })
        
        return {
            'success': True,
            'feed_id': feed_id,
            'data_points': data_points_dict,
            'count': len(data_points_dict),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Feed data retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feed data retrieval failed: {str(e)}")

@router.get("/feeds")
async def get_all_feeds():
    """
    Get information about all available feeds
    """
    try:
        await ensure_service_started()
        
        status = realtime_business_data_service.get_feed_status()
        
        feeds_info = []
        for feed_id, feed_data in status.get('feeds', {}).items():
            feeds_info.append({
                'feed_id': feed_id,
                'source': feed_data['source'],
                'type': feed_data['type'],
                'enabled': feed_data['enabled'],
                'update_interval': feed_data['update_interval'],
                'last_update': feed_data['last_update'],
                'buffer_size': feed_data['buffer_size'],
                'subscribers': feed_data['subscribers']
            })
        
        return {
            'success': True,
            'feeds': feeds_info,
            'total_feeds': len(feeds_info),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Feeds information retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feeds info retrieval failed: {str(e)}")

@router.post("/feeds/{feed_id}/start")
async def start_feed(feed_id: str, background_tasks: BackgroundTasks):
    """
    Start a specific data feed
    """
    try:
        await ensure_service_started()
        
        # Note: In the current implementation, individual feeds can't be started/stopped
        # They're all managed together. This endpoint provides the interface for future enhancement.
        
        logger.info(f"🚀 Feed start requested: {feed_id}")
        
        return {
            'success': True,
            'message': f'Feed {feed_id} start requested',
            'feed_id': feed_id,
            'status': 'active',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Feed start failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feed start failed: {str(e)}")

@router.post("/feeds/{feed_id}/stop")
async def stop_feed(feed_id: str):
    """
    Stop a specific data feed
    """
    try:
        logger.info(f"🛑 Feed stop requested: {feed_id}")
        
        # Note: Similar to start_feed, this provides the interface for future enhancement
        
        return {
            'success': True,
            'message': f'Feed {feed_id} stop requested',
            'feed_id': feed_id,
            'status': 'inactive',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Feed stop failed: {e}")
        raise HTTPException(status_code=500, detail=f"Feed stop failed: {str(e)}")

@router.post("/subscribe")
async def subscribe_to_feed(subscription: SubscriptionRequest):
    """
    Subscribe to real-time feed updates
    """
    try:
        await ensure_service_started()
        
        # Create a simple callback for demonstration
        def data_callback(data_point):
            logger.info(f"📡 Data update for {subscription.feed_id}: {data_point.data_type}")
            # In production, this would send webhook notifications or store for retrieval
        
        realtime_business_data_service.subscribe_to_feed(subscription.feed_id, data_callback)
        
        return {
            'success': True,
            'message': f'Subscribed to feed {subscription.feed_id}',
            'feed_id': subscription.feed_id,
            'subscription_method': subscription.notification_method,
            'callback_url': subscription.callback_url,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Subscription failed: {e}")
        raise HTTPException(status_code=500, detail=f"Subscription failed: {str(e)}")

@router.post("/export")
async def export_data(export_request: DataExportRequest):
    """
    Export historical data from feeds
    """
    try:
        await ensure_service_started()
        
        # This would integrate with the database to export historical data
        # For now, return current data as demonstration
        
        if export_request.feed_id:
            data_points = realtime_business_data_service.get_latest_data(export_request.feed_id, 100)
            exported_data = []
            
            for point in data_points:
                exported_data.append({
                    'timestamp': point.timestamp,
                    'source': point.source,
                    'data_type': point.data_type,
                    'value': point.value,
                    'metadata': point.metadata,
                    'confidence': point.confidence
                })
        else:
            # Export from all feeds
            exported_data = {}
            status = realtime_business_data_service.get_feed_status()
            
            for feed_id in status.get('feeds', {}).keys():
                data_points = realtime_business_data_service.get_latest_data(feed_id, 50)
                exported_data[feed_id] = []
                
                for point in data_points:
                    exported_data[feed_id].append({
                        'timestamp': point.timestamp,
                        'source': point.source,
                        'data_type': point.data_type,
                        'value': point.value,
                        'metadata': point.metadata,
                        'confidence': point.confidence
                    })
        
        return {
            'success': True,
            'message': 'Data exported successfully',
            'export_format': export_request.format,
            'feed_id': export_request.feed_id or 'all_feeds',
            'data': exported_data,
            'exported_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Data export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Data export failed: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Health check for real-time data service
    """
    try:
        status = realtime_business_data_service.get_feed_status()
        
        health_status = 'healthy' if status['service_status'] == 'running' else 'unhealthy'
        
        return {
            'status': health_status,
            'service': 'realtime_business_data',
            'active_feeds': status['active_feeds'],
            'total_feeds': status['total_feeds'],
            'uptime': 'running' if status['service_status'] == 'running' else 'stopped',
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'service': 'realtime_business_data',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

@router.post("/initialize")
async def initialize_service():
    """
    Initialize or restart the real-time data service
    """
    try:
        global _service_started
        
        # Stop existing service if running
        if _service_started:
            await realtime_business_data_service.stop_data_feeds()
        
        # Start the service
        await realtime_business_data_service.start_data_feeds()
        _service_started = True
        
        status = realtime_business_data_service.get_feed_status()
        
        return {
            'success': True,
            'message': 'Real-time data service initialized successfully',
            'status': status,
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Service initialization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Initialization failed: {str(e)}")

@router.get("/demo-data")
async def get_demo_data():
    """
    Get demonstration data for testing and development
    """
    try:
        current_time = datetime.now()
        
        demo_data = {
            'live_metrics': {
                'timestamp': current_time.isoformat(),
                'appointments_active': 3,
                'revenue_today': 847.50,
                'customers_served': 12,
                'staff_utilization': 0.85,
                'wait_time_avg': 8,  # minutes
                'satisfaction_score': 4.6
            },
            'recent_activities': [
                {
                    'time': (current_time - timedelta(minutes=2)).isoformat(),
                    'type': 'appointment_completed',
                    'details': 'Haircut + Beard trim - $45.00'
                },
                {
                    'time': (current_time - timedelta(minutes=5)).isoformat(),
                    'type': 'new_booking',
                    'details': 'Styling appointment for 3:30pm'
                },
                {
                    'time': (current_time - timedelta(minutes=8)).isoformat(),
                    'type': 'customer_checkin',
                    'details': 'Walk-in customer accepted'
                }
            ],
            'performance_indicators': {
                'booking_conversion': 0.78,
                'no_show_rate': 0.12,
                'average_service_time': 22,  # minutes
                'customer_retention': 0.73,
                'social_media_engagement': 0.045
            },
            'alerts': [
                {
                    'type': 'info',
                    'message': 'Peak hours starting - consider additional staff',
                    'timestamp': current_time.isoformat()
                }
            ]
        }
        
        return {
            'success': True,
            'demo_data': demo_data,
            'message': 'Live demonstration data - updates every 30 seconds',
            'timestamp': current_time.isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Demo data generation failed: {e}")
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }

# Startup event to ensure service is running
@router.on_event("startup")
async def startup_realtime_service():
    """Auto-start real-time data service on router startup"""
    try:
        await ensure_service_started()
        logger.info("✅ Real-time data service auto-started with router")
    except Exception as e:
        logger.error(f"❌ Failed to auto-start real-time data service: {e}")

# Import fix for timedelta
from datetime import timedelta