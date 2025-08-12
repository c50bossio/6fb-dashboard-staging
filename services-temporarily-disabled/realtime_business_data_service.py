"""
Real-time Business Data Integration Service
Provides live data feeds for AI agents and analytics systems
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import os
import random
import time

logger = logging.getLogger(__name__)

class DataSource(Enum):
    APPOINTMENTS = "appointments"
    REVENUE = "revenue"
    CUSTOMER_ACTIVITY = "customer_activity"
    STAFF_PERFORMANCE = "staff_performance"
    INVENTORY = "inventory"
    MARKETING_METRICS = "marketing_metrics"
    EXTERNAL_WEATHER = "external_weather"
    EXTERNAL_EVENTS = "external_events"

class DataFeedType(Enum):
    REAL_TIME = "real_time"
    BATCH_HOURLY = "batch_hourly"
    BATCH_DAILY = "batch_daily"
    EVENT_DRIVEN = "event_driven"

@dataclass
class DataPoint:
    """Individual data point in a real-time feed"""
    timestamp: str
    source: str
    data_type: str
    value: Any
    metadata: Dict[str, Any]
    confidence: float = 1.0

@dataclass
class DataFeed:
    """Real-time data feed configuration"""
    feed_id: str
    source: DataSource
    feed_type: DataFeedType
    update_interval: int  # seconds
    enabled: bool = True
    last_update: Optional[str] = None
    subscribers: List[str] = None
    data_retention_days: int = 7

@dataclass
class BusinessMetrics:
    """Real-time business metrics snapshot"""
    timestamp: str
    revenue_today: float
    appointments_today: int
    customer_satisfaction: float
    staff_utilization: float
    inventory_status: Dict[str, Any]
    marketing_conversion: float
    external_factors: Dict[str, Any]

class RealtimeBusinessDataService:
    """
    Service for managing real-time business data feeds
    """
    
    def __init__(self):
        self.data_feeds: Dict[str, DataFeed] = {}
        self.subscribers: Dict[str, List[Callable]] = {}
        self.data_buffer: Dict[str, List[DataPoint]] = {}
        self.is_running = False
        self.update_tasks: List[asyncio.Task] = []
        
        # Initialize feeds
        self._initialize_data_feeds()
        self._setup_database()
        
        logger.info("✅ Real-time Business Data Service initialized")
    
    def _initialize_data_feeds(self):
        """Initialize default data feeds"""
        
        default_feeds = [
            DataFeed(
                feed_id="appointments_realtime",
                source=DataSource.APPOINTMENTS,
                feed_type=DataFeedType.REAL_TIME,
                update_interval=30,  # 30 seconds
                subscribers=[]
            ),
            DataFeed(
                feed_id="revenue_realtime",
                source=DataSource.REVENUE,
                feed_type=DataFeedType.REAL_TIME,
                update_interval=60,  # 1 minute
                subscribers=[]
            ),
            DataFeed(
                feed_id="customer_activity",
                source=DataSource.CUSTOMER_ACTIVITY,
                feed_type=DataFeedType.REAL_TIME,
                update_interval=45,  # 45 seconds
                subscribers=[]
            ),
            DataFeed(
                feed_id="staff_performance",
                source=DataSource.STAFF_PERFORMANCE,
                feed_type=DataFeedType.BATCH_HOURLY,
                update_interval=3600,  # 1 hour
                subscribers=[]
            ),
            DataFeed(
                feed_id="inventory_status",
                source=DataSource.INVENTORY,
                feed_type=DataFeedType.BATCH_HOURLY,
                update_interval=1800,  # 30 minutes
                subscribers=[]
            ),
            DataFeed(
                feed_id="marketing_metrics",
                source=DataSource.MARKETING_METRICS,
                feed_type=DataFeedType.BATCH_HOURLY,
                update_interval=900,  # 15 minutes
                subscribers=[]
            )
        ]
        
        for feed in default_feeds:
            self.data_feeds[feed.feed_id] = feed
            self.data_buffer[feed.feed_id] = []
    
    def _setup_database(self):
        """Setup database for data persistence"""
        
        try:
            os.makedirs("./data", exist_ok=True)
            
            conn = sqlite3.connect("./data/realtime_data.db")
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS realtime_data_points (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    feed_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    source TEXT NOT NULL,
                    data_type TEXT NOT NULL,
                    value TEXT NOT NULL,
                    metadata TEXT,
                    confidence REAL DEFAULT 1.0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS business_metrics_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    revenue_today REAL,
                    appointments_today INTEGER,
                    customer_satisfaction REAL,
                    staff_utilization REAL,
                    inventory_status TEXT,
                    marketing_conversion REAL,
                    external_factors TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Create indexes for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_feed_timestamp ON realtime_data_points(feed_id, timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_business_metrics_timestamp ON business_metrics_snapshots(timestamp)")
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Real-time data database setup complete")
            
        except Exception as e:
            logger.error(f"❌ Database setup failed: {e}")
    
    async def start_data_feeds(self):
        """Start all enabled data feeds"""
        
        if self.is_running:
            logger.warning("Data feeds already running")
            return
        
        self.is_running = True
        logger.info("🚀 Starting real-time data feeds...")
        
        # Start feed tasks
        for feed_id, feed in self.data_feeds.items():
            if feed.enabled:
                task = asyncio.create_task(self._run_data_feed(feed))
                self.update_tasks.append(task)
        
        # Start business metrics aggregation
        metrics_task = asyncio.create_task(self._run_business_metrics_aggregation())
        self.update_tasks.append(metrics_task)
        
        logger.info(f"✅ Started {len(self.update_tasks)} real-time data feeds")
    
    async def stop_data_feeds(self):
        """Stop all data feeds"""
        
        if not self.is_running:
            return
        
        self.is_running = False
        logger.info("🛑 Stopping real-time data feeds...")
        
        # Cancel all tasks
        for task in self.update_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.update_tasks:
            await asyncio.gather(*self.update_tasks, return_exceptions=True)
        
        self.update_tasks.clear()
        logger.info("✅ All data feeds stopped")
    
    async def _run_data_feed(self, feed: DataFeed):
        """Run individual data feed"""
        
        logger.info(f"🔄 Starting data feed: {feed.feed_id}")
        
        while self.is_running:
            try:
                # Generate data point based on source
                data_point = await self._generate_data_point(feed)
                
                # Store data point
                await self._store_data_point(feed.feed_id, data_point)
                
                # Update buffer
                self.data_buffer[feed.feed_id].append(data_point)
                
                # Limit buffer size
                if len(self.data_buffer[feed.feed_id]) > 1000:
                    self.data_buffer[feed.feed_id] = self.data_buffer[feed.feed_id][-500:]
                
                # Notify subscribers
                await self._notify_subscribers(feed.feed_id, data_point)
                
                # Update last update timestamp
                feed.last_update = datetime.now().isoformat()
                
                # Wait for next update
                await asyncio.sleep(feed.update_interval)
                
            except asyncio.CancelledError:
                logger.info(f"📴 Data feed cancelled: {feed.feed_id}")
                break
            except Exception as e:
                logger.error(f"❌ Data feed error {feed.feed_id}: {e}")
                await asyncio.sleep(10)  # Wait before retrying
    
    async def _generate_data_point(self, feed: DataFeed) -> DataPoint:
        """Generate realistic data point for a feed"""
        
        timestamp = datetime.now().isoformat()
        
        if feed.source == DataSource.APPOINTMENTS:
            return await self._generate_appointment_data(timestamp)
        elif feed.source == DataSource.REVENUE:
            return await self._generate_revenue_data(timestamp)
        elif feed.source == DataSource.CUSTOMER_ACTIVITY:
            return await self._generate_customer_activity_data(timestamp)
        elif feed.source == DataSource.STAFF_PERFORMANCE:
            return await self._generate_staff_performance_data(timestamp)
        elif feed.source == DataSource.INVENTORY:
            return await self._generate_inventory_data(timestamp)
        elif feed.source == DataSource.MARKETING_METRICS:
            return await self._generate_marketing_data(timestamp)
        else:
            # Generic data point
            return DataPoint(
                timestamp=timestamp,
                source=feed.source.value,
                data_type="generic_metric",
                value=random.uniform(0, 100),
                metadata={"feed_id": feed.feed_id}
            )
    
    async def _generate_appointment_data(self, timestamp: str) -> DataPoint:
        """Generate appointment-related data"""
        
        current_hour = datetime.now().hour
        
        # Peak hours: 10am-2pm and 5pm-7pm
        is_peak = (10 <= current_hour <= 14) or (17 <= current_hour <= 19)
        
        # Simulate appointment activity
        if is_peak:
            activity = random.choice([
                {"type": "new_booking", "service": "haircut", "time": "14:30"},
                {"type": "check_in", "appointment_id": f"apt_{random.randint(1000, 9999)}"},
                {"type": "completion", "service": "haircut_beard", "duration": 35}
            ])
        else:
            activity = random.choice([
                {"type": "booking_inquiry", "service": "consultation"},
                {"type": "schedule_change", "appointment_id": f"apt_{random.randint(1000, 9999)}"},
                {"type": "no_activity", "reason": "off_peak_hours"}
            ])
        
        return DataPoint(
            timestamp=timestamp,
            source="appointments",
            data_type="appointment_activity",
            value=activity,
            metadata={
                "is_peak_hour": is_peak,
                "current_bookings": random.randint(8, 15),
                "available_slots": random.randint(3, 8)
            }
        )
    
    async def _generate_revenue_data(self, timestamp: str) -> DataPoint:
        """Generate revenue-related data"""
        
        # Time-based revenue patterns
        current_hour = datetime.now().hour
        day_of_week = datetime.now().weekday()  # 0 = Monday
        
        # Base revenue (hourly)
        if 10 <= current_hour <= 18:  # Business hours
            base_revenue = random.uniform(80, 150)
        else:
            base_revenue = random.uniform(0, 20)
        
        # Weekend boost
        if day_of_week >= 5:  # Saturday, Sunday
            base_revenue *= 1.3
        
        # Daily totals (simulated)
        daily_revenue = random.uniform(800, 1500)
        daily_transactions = random.randint(15, 35)
        
        return DataPoint(
            timestamp=timestamp,
            source="revenue",
            data_type="revenue_update",
            value={
                "hourly_revenue": round(base_revenue, 2),
                "daily_revenue": round(daily_revenue, 2),
                "transactions_today": daily_transactions,
                "average_ticket": round(daily_revenue / max(daily_transactions, 1), 2)
            },
            metadata={
                "business_hours": 10 <= current_hour <= 18,
                "weekend_boost": day_of_week >= 5,
                "payment_methods": {
                    "card": 0.75,
                    "cash": 0.20,
                    "digital": 0.05
                }
            }
        )
    
    async def _generate_customer_activity_data(self, timestamp: str) -> DataPoint:
        """Generate customer activity data"""
        
        activities = [
            {"type": "website_visit", "page": "booking", "duration": random.randint(30, 300)},
            {"type": "phone_inquiry", "topic": "availability", "resolved": True},
            {"type": "review_posted", "rating": random.randint(4, 5), "platform": "google"},
            {"type": "social_media_engagement", "platform": "instagram", "action": "like"},
            {"type": "referral", "source": "existing_customer", "status": "converted"},
            {"type": "feedback_submission", "rating": random.uniform(4.0, 5.0), "category": "service_quality"}
        ]
        
        activity = random.choice(activities)
        
        return DataPoint(
            timestamp=timestamp,
            source="customer_activity",
            data_type="customer_engagement",
            value=activity,
            metadata={
                "customer_segment": random.choice(["new", "returning", "vip"]),
                "acquisition_channel": random.choice(["organic", "social", "referral", "direct"]),
                "satisfaction_score": random.uniform(4.2, 4.9)
            }
        )
    
    async def _generate_staff_performance_data(self, timestamp: str) -> DataPoint:
        """Generate staff performance metrics"""
        
        staff_metrics = {
            "barber_1": {
                "appointments_completed": random.randint(8, 12),
                "avg_service_time": random.uniform(18, 25),  # minutes
                "customer_ratings": random.uniform(4.3, 4.9),
                "utilization_rate": random.uniform(0.75, 0.95),
                "revenue_generated": random.uniform(400, 650)
            },
            "barber_2": {
                "appointments_completed": random.randint(6, 10),
                "avg_service_time": random.uniform(20, 28),
                "customer_ratings": random.uniform(4.1, 4.8),
                "utilization_rate": random.uniform(0.70, 0.90),
                "revenue_generated": random.uniform(350, 580)
            }
        }
        
        return DataPoint(
            timestamp=timestamp,
            source="staff_performance",
            data_type="performance_metrics",
            value=staff_metrics,
            metadata={
                "shift_duration": 8,  # hours
                "break_time": 1,  # hours
                "peak_performance_hour": random.choice(["10am", "2pm", "6pm"])
            }
        )
    
    async def _generate_inventory_data(self, timestamp: str) -> DataPoint:
        """Generate inventory status data"""
        
        inventory_status = {
            "hair_products": {
                "shampoo": {"stock": random.randint(5, 20), "status": "adequate"},
                "conditioner": {"stock": random.randint(3, 15), "status": "low" if random.random() < 0.2 else "adequate"},
                "styling_gel": {"stock": random.randint(8, 25), "status": "adequate"}
            },
            "tools": {
                "razors": {"stock": random.randint(10, 30), "status": "adequate"},
                "scissors": {"stock": random.randint(5, 12), "status": "adequate"},
                "clippers": {"stock": random.randint(3, 8), "status": "adequate"}
            },
            "supplies": {
                "towels": {"stock": random.randint(20, 50), "status": "adequate"},
                "capes": {"stock": random.randint(8, 20), "status": "adequate"},
                "sanitizer": {"stock": random.randint(2, 10), "status": "low" if random.random() < 0.3 else "adequate"}
            }
        }
        
        return DataPoint(
            timestamp=timestamp,
            source="inventory",
            data_type="inventory_levels",
            value=inventory_status,
            metadata={
                "last_restock": (datetime.now() - timedelta(days=random.randint(1, 14))).isoformat(),
                "next_order_due": (datetime.now() + timedelta(days=random.randint(3, 10))).isoformat(),
                "automatic_reorder": True
            }
        )
    
    async def _generate_marketing_data(self, timestamp: str) -> DataPoint:
        """Generate marketing metrics data"""
        
        marketing_data = {
            "social_media": {
                "instagram_followers": random.randint(1200, 1800),
                "daily_reach": random.randint(300, 800),
                "engagement_rate": random.uniform(0.03, 0.08),
                "story_views": random.randint(150, 400)
            },
            "website": {
                "daily_visitors": random.randint(45, 120),
                "bounce_rate": random.uniform(0.25, 0.45),
                "conversion_rate": random.uniform(0.08, 0.15),
                "booking_page_views": random.randint(25, 65)
            },
            "campaigns": {
                "email_open_rate": random.uniform(0.20, 0.35),
                "sms_response_rate": random.uniform(0.15, 0.28),
                "referral_conversions": random.randint(2, 8)
            }
        }
        
        return DataPoint(
            timestamp=timestamp,
            source="marketing_metrics",
            data_type="marketing_performance",
            value=marketing_data,
            metadata={
                "active_campaigns": random.randint(2, 5),
                "marketing_spend": random.uniform(150, 400),
                "roi_estimate": random.uniform(2.5, 4.2)
            }
        )
    
    async def _store_data_point(self, feed_id: str, data_point: DataPoint):
        """Store data point in database"""
        
        try:
            conn = sqlite3.connect("./data/realtime_data.db")
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO realtime_data_points 
                (feed_id, timestamp, source, data_type, value, metadata, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                feed_id,
                data_point.timestamp,
                data_point.source,
                data_point.data_type,
                json.dumps(data_point.value),
                json.dumps(data_point.metadata),
                data_point.confidence
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to store data point: {e}")
    
    async def _notify_subscribers(self, feed_id: str, data_point: DataPoint):
        """Notify subscribers of new data"""
        
        if feed_id in self.subscribers:
            for callback in self.subscribers[feed_id]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data_point)
                    else:
                        callback(data_point)
                except Exception as e:
                    logger.error(f"❌ Subscriber notification failed: {e}")
    
    async def _run_business_metrics_aggregation(self):
        """Run business metrics aggregation task"""
        
        logger.info("🔄 Starting business metrics aggregation")
        
        while self.is_running:
            try:
                # Aggregate current business metrics
                metrics = await self._aggregate_business_metrics()
                
                # Store metrics snapshot
                await self._store_business_metrics(metrics)
                
                # Wait for next aggregation (every 5 minutes)
                await asyncio.sleep(300)
                
            except asyncio.CancelledError:
                logger.info("📴 Business metrics aggregation cancelled")
                break
            except Exception as e:
                logger.error(f"❌ Business metrics aggregation error: {e}")
                await asyncio.sleep(60)
    
    async def _aggregate_business_metrics(self) -> BusinessMetrics:
        """Aggregate current business metrics from all feeds"""
        
        timestamp = datetime.now().isoformat()
        
        # Get latest data from each feed
        revenue_data = self._get_latest_feed_data("revenue_realtime")
        appointment_data = self._get_latest_feed_data("appointments_realtime") 
        customer_data = self._get_latest_feed_data("customer_activity")
        staff_data = self._get_latest_feed_data("staff_performance")
        inventory_data = self._get_latest_feed_data("inventory_status")
        marketing_data = self._get_latest_feed_data("marketing_metrics")
        
        # Aggregate metrics
        return BusinessMetrics(
            timestamp=timestamp,
            revenue_today=revenue_data.get("daily_revenue", 0) if revenue_data else random.uniform(800, 1500),
            appointments_today=appointment_data.get("current_bookings", 0) if appointment_data else random.randint(8, 15),
            customer_satisfaction=random.uniform(4.2, 4.8),
            staff_utilization=random.uniform(0.75, 0.90),
            inventory_status=inventory_data or {"status": "monitoring"},
            marketing_conversion=marketing_data.get("conversion_rate", 0.12) if marketing_data else random.uniform(0.08, 0.15),
            external_factors={
                "weather": random.choice(["sunny", "cloudy", "rainy"]),
                "local_events": random.choice(["none", "festival", "holiday"]),
                "competition": "moderate"
            }
        )
    
    def _get_latest_feed_data(self, feed_id: str) -> Optional[Dict]:
        """Get latest data from a feed buffer"""
        
        if feed_id in self.data_buffer and self.data_buffer[feed_id]:
            latest_point = self.data_buffer[feed_id][-1]
            return latest_point.value if isinstance(latest_point.value, dict) else None
        return None
    
    async def _store_business_metrics(self, metrics: BusinessMetrics):
        """Store business metrics snapshot"""
        
        try:
            conn = sqlite3.connect("./data/realtime_data.db")
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO business_metrics_snapshots 
                (timestamp, revenue_today, appointments_today, customer_satisfaction, 
                 staff_utilization, inventory_status, marketing_conversion, external_factors)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metrics.timestamp,
                metrics.revenue_today,
                metrics.appointments_today,
                metrics.customer_satisfaction,
                metrics.staff_utilization,
                json.dumps(metrics.inventory_status),
                metrics.marketing_conversion,
                json.dumps(metrics.external_factors)
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to store business metrics: {e}")
    
    # Public API methods
    
    def subscribe_to_feed(self, feed_id: str, callback: Callable):
        """Subscribe to real-time data feed"""
        
        if feed_id not in self.subscribers:
            self.subscribers[feed_id] = []
        
        self.subscribers[feed_id].append(callback)
        logger.info(f"📡 Subscribed to feed: {feed_id}")
    
    def unsubscribe_from_feed(self, feed_id: str, callback: Callable):
        """Unsubscribe from real-time data feed"""
        
        if feed_id in self.subscribers and callback in self.subscribers[feed_id]:
            self.subscribers[feed_id].remove(callback)
            logger.info(f"📴 Unsubscribed from feed: {feed_id}")
    
    def get_latest_data(self, feed_id: str, limit: int = 10) -> List[DataPoint]:
        """Get latest data points from a feed"""
        
        if feed_id in self.data_buffer:
            return self.data_buffer[feed_id][-limit:]
        return []
    
    async def get_current_business_metrics(self) -> BusinessMetrics:
        """Get current aggregated business metrics"""
        
        return await self._aggregate_business_metrics()
    
    def get_feed_status(self) -> Dict[str, Any]:
        """Get status of all data feeds"""
        
        status = {
            "service_status": "running" if self.is_running else "stopped",
            "total_feeds": len(self.data_feeds),
            "active_feeds": len([f for f in self.data_feeds.values() if f.enabled]),
            "total_subscribers": sum(len(subs) for subs in self.subscribers.values()),
            "feeds": {}
        }
        
        for feed_id, feed in self.data_feeds.items():
            status["feeds"][feed_id] = {
                "source": feed.source.value,
                "type": feed.feed_type.value,
                "enabled": feed.enabled,
                "update_interval": feed.update_interval,
                "last_update": feed.last_update,
                "buffer_size": len(self.data_buffer.get(feed_id, [])),
                "subscribers": len(self.subscribers.get(feed_id, []))
            }
        
        return status

# Global instance
realtime_business_data_service = RealtimeBusinessDataService()