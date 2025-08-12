"""
Real-Time Service
Handles WebSocket connections and real-time data streaming for dashboard updates
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
import random
import os

# Pusher service for WebSocket
try:
    import pusher
    PUSHER_AVAILABLE = True
except ImportError:
    PUSHER_AVAILABLE = False

logger = logging.getLogger(__name__)

class RealtimeService:
    """
    Manages real-time data streaming and WebSocket connections
    """
    
    def __init__(self):
        self.pusher_client = None
        self.active_connections = {}
        self.data_generators = {}
        self.streaming_tasks = {}
        self.setup_pusher()
        
    def setup_pusher(self):
        """Initialize Pusher WebSocket service"""
        if not PUSHER_AVAILABLE:
            logger.warning("Pusher not available, using mock WebSocket service")
            return
            
        try:
            pusher_app_id = os.getenv('PUSHER_APP_ID')
            pusher_key = os.getenv('PUSHER_KEY') 
            pusher_secret = os.getenv('PUSHER_SECRET')
            pusher_cluster = os.getenv('PUSHER_CLUSTER', 'us2')
            
            if pusher_app_id and pusher_key and pusher_secret:
                self.pusher_client = pusher.Pusher(
                    app_id=pusher_app_id,
                    key=pusher_key,
                    secret=pusher_secret,
                    cluster=pusher_cluster,
                    ssl=True
                )
                logger.info("✅ Pusher WebSocket service initialized")
            else:
                logger.warning("⚠️ Pusher credentials not found, using mock service")
        except Exception as e:
            logger.error(f"⚠️ Pusher setup failed: {e}")
    
    async def start_dashboard_streaming(self, user_id: str, session_id: str):
        """Start real-time streaming for dashboard metrics"""
        channel_name = f"dashboard-{user_id}"
        
        # Store connection info
        self.active_connections[session_id] = {
            'user_id': user_id,
            'channel': channel_name,
            'started_at': datetime.now().isoformat(),
            'metrics_enabled': True,
            'notifications_enabled': True
        }
        
        # Start streaming tasks
        await self._start_metrics_streaming(channel_name, session_id)
        await self._start_notifications_streaming(channel_name, session_id)
        
        logger.info(f"✅ Started dashboard streaming for user {user_id} on channel {channel_name}")
        
    async def _start_metrics_streaming(self, channel_name: str, session_id: str):
        """Start streaming dashboard metrics"""
        async def stream_metrics():
            while session_id in self.active_connections:
                try:
                    # Generate real-time metrics
                    metrics = await self._generate_realtime_metrics()
                    
                    # Send via Pusher
                    await self._send_to_channel(channel_name, 'metrics-update', {
                        'metrics': metrics,
                        'timestamp': datetime.now().isoformat(),
                        'session_id': session_id
                    })
                    
                    # Stream every 5 seconds
                    await asyncio.sleep(5)
                    
                except Exception as e:
                    logger.error(f"Metrics streaming error: {e}")
                    await asyncio.sleep(10)  # Retry after 10 seconds
        
        # Store task for cleanup
        self.streaming_tasks[f"metrics-{session_id}"] = asyncio.create_task(stream_metrics())
    
    async def _start_notifications_streaming(self, channel_name: str, session_id: str):
        """Start streaming business notifications"""
        async def stream_notifications():
            while session_id in self.active_connections:
                try:
                    # Generate business events
                    notification = await self._generate_business_notification()
                    
                    if notification:
                        await self._send_to_channel(channel_name, 'notification', {
                            'notification': notification,
                            'timestamp': datetime.now().isoformat(),
                            'session_id': session_id
                        })
                    
                    # Check for notifications every 15 seconds
                    await asyncio.sleep(15)
                    
                except Exception as e:
                    logger.error(f"Notifications streaming error: {e}")
                    await asyncio.sleep(20)
        
        # Store task for cleanup
        self.streaming_tasks[f"notifications-{session_id}"] = asyncio.create_task(stream_notifications())
    
    async def _generate_realtime_metrics(self) -> Dict[str, Any]:
        """Generate realistic real-time business metrics"""
        base_time = datetime.now()
        
        # Simulate realistic barbershop metrics with time-based patterns
        current_hour = base_time.hour
        
        # Peak hours: 10am-2pm and 5pm-7pm
        is_peak_hour = (10 <= current_hour <= 14) or (17 <= current_hour <= 19)
        peak_multiplier = 1.5 if is_peak_hour else 0.7
        
        # Weekend boost
        is_weekend = base_time.weekday() >= 5
        weekend_multiplier = 1.3 if is_weekend else 1.0
        
        base_revenue = 450 * peak_multiplier * weekend_multiplier
        base_bookings = 12 * peak_multiplier * weekend_multiplier
        
        return {
            'total_revenue': round(base_revenue + random.uniform(-50, 100), 2),
            'daily_bookings': int(base_bookings + random.uniform(-2, 5)),
            'active_customers': random.randint(15, 45),
            'satisfaction_rating': round(random.uniform(4.1, 4.8), 1),
            'utilization_rate': round(random.uniform(0.65, 0.95), 2),
            'average_wait_time': random.randint(5, 25),
            'peak_hour_indicator': is_peak_hour,
            'current_hour': current_hour,
            'trending_services': [
                {'name': 'Haircut + Beard Trim', 'bookings': random.randint(8, 15)},
                {'name': 'Premium Styling', 'bookings': random.randint(3, 8)},
                {'name': 'Quick Trim', 'bookings': random.randint(5, 12)}
            ],
            'hourly_revenue': [
                {'hour': i, 'revenue': random.randint(20, 80) * (1.5 if (10 <= i <= 14) or (17 <= i <= 19) else 0.7)}
                for i in range(max(0, current_hour - 6), current_hour + 1)
            ]
        }
    
    async def _generate_business_notification(self) -> Optional[Dict[str, Any]]:
        """Generate business event notifications"""
        
        # Only generate notifications occasionally (20% chance)
        if random.random() > 0.2:
            return None
        
        notification_types = [
            {
                'type': 'booking_milestone',
                'title': 'Booking Milestone Reached',
                'message': f"You've reached {random.randint(50, 100)} bookings this week!",
                'priority': 'success',
                'action': 'View booking analytics'
            },
            {
                'type': 'customer_feedback',
                'title': 'New 5-Star Review',
                'message': f"'{random.choice(['Amazing haircut!', 'Best barber in town!', 'Professional service!'])}'",
                'priority': 'info',
                'action': 'View all reviews'
            },
            {
                'type': 'revenue_alert',
                'title': 'Daily Revenue Goal Met',
                'message': f"Today's revenue: ${random.randint(400, 600)}. Target exceeded!",
                'priority': 'success',
                'action': 'View revenue details'
            },
            {
                'type': 'scheduling_alert',
                'title': 'Peak Hour Approaching',
                'message': "High booking activity expected in the next hour",
                'priority': 'warning',
                'action': 'Check schedule'
            },
            {
                'type': 'ai_insight',
                'title': 'AI Business Insight',
                'message': f"Your {random.choice(['customer retention', 'service efficiency', 'peak hour utilization'])} improved by {random.randint(5, 15)}% this week",
                'priority': 'info',
                'action': 'Get AI recommendations'
            }
        ]
        
        notification = random.choice(notification_types)
        notification.update({
            'id': f"notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}",
            'timestamp': datetime.now().isoformat(),
            'read': False
        })
        
        return notification
    
    async def _send_to_channel(self, channel_name: str, event_name: str, data: Dict[str, Any]):
        """Send data to WebSocket channel"""
        if self.pusher_client:
            try:
                self.pusher_client.trigger(channel_name, event_name, data)
                logger.debug(f"📡 Sent {event_name} to channel {channel_name}")
            except Exception as e:
                logger.error(f"Failed to send to Pusher: {e}")
        else:
            # Mock WebSocket for development
            logger.debug(f"🔧 Mock WebSocket: {channel_name}/{event_name} - {json.dumps(data, indent=2)}")
    
    async def send_ai_response_stream(self, user_id: str, response_data: Dict[str, Any]):
        """Stream AI response in real-time"""
        channel_name = f"dashboard-{user_id}"
        
        await self._send_to_channel(channel_name, 'ai-response', {
            'response': response_data,
            'timestamp': datetime.now().isoformat(),
            'type': 'ai_chat'
        })
        
        logger.info(f"📤 Streamed AI response to user {user_id}")
    
    async def send_business_event(self, user_id: str, event_type: str, event_data: Dict[str, Any]):
        """Send business event notification"""
        channel_name = f"dashboard-{user_id}"
        
        await self._send_to_channel(channel_name, 'business-event', {
            'event_type': event_type,
            'data': event_data,
            'timestamp': datetime.now().isoformat()
        })
        
        logger.info(f"📢 Sent business event {event_type} to user {user_id}")
    
    async def stop_dashboard_streaming(self, session_id: str):
        """Stop real-time streaming for a session"""
        if session_id in self.active_connections:
            # Cancel streaming tasks
            for task_name in [f"metrics-{session_id}", f"notifications-{session_id}"]:
                if task_name in self.streaming_tasks:
                    self.streaming_tasks[task_name].cancel()
                    del self.streaming_tasks[task_name]
            
            # Remove connection
            connection_info = self.active_connections.pop(session_id, {})
            logger.info(f"⏹️ Stopped streaming for session {session_id} (user: {connection_info.get('user_id', 'unknown')})")
    
    def get_active_connections(self) -> Dict[str, Any]:
        """Get information about active connections"""
        return {
            'total_connections': len(self.active_connections),
            'connections': {
                session_id: {
                    'user_id': conn['user_id'],
                    'channel': conn['channel'],
                    'duration': str(datetime.now() - datetime.fromisoformat(conn['started_at'])),
                    'streaming_tasks': len([t for t in self.streaming_tasks.keys() if session_id in t])
                }
                for session_id, conn in self.active_connections.items()
            }
        }
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get real-time service status"""
        return {
            'pusher_available': PUSHER_AVAILABLE and self.pusher_client is not None,
            'active_connections': len(self.active_connections),
            'streaming_tasks': len(self.streaming_tasks),
            'service_status': 'operational' if (PUSHER_AVAILABLE and self.pusher_client) else 'mock_mode'
        }

# Global instance
realtime_service = RealtimeService()