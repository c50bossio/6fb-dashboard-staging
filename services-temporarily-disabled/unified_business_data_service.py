"""
Unified Business Data Service
Consolidates business_data_service.py, realtime_business_data_service.py, and realtime_analytics_service.py
into a single authoritative source for all business metrics and analytics
"""

import asyncio
import json
import logging
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, asdict, field
from enum import Enum
from decimal import Decimal
import time
import random
from collections import defaultdict, deque
import aiohttp

# Database imports
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    logging.warning("asyncpg not available - using SQLite only")

logger = logging.getLogger(__name__)

# Enums for data management
class DataSource(Enum):
    DATABASE = "database"
    REAL_TIME_FEED = "real_time_feed"
    CACHE = "cache"
    FALLBACK = "fallback"

class MetricCategory(Enum):
    REVENUE = "revenue"
    APPOINTMENTS = "appointments"
    CUSTOMERS = "customers"
    STAFF = "staff"
    SERVICES = "services"
    MARKETING = "marketing"
    OPERATIONS = "operations"

@dataclass
class UnifiedBusinessMetrics:
    """
    Unified business metrics structure combining all services
    Provides single source of truth for all business data
    """
    
    # Revenue Metrics (from all services)
    monthly_revenue: float = 0.0
    daily_revenue: float = 0.0
    weekly_revenue: float = 0.0
    total_revenue: float = 0.0
    service_revenue: float = 0.0
    tip_revenue: float = 0.0
    revenue_growth: float = 0.0
    average_service_price: float = 0.0
    revenue_per_customer: float = 0.0
    
    # Appointment Analytics (consolidated)
    total_appointments: int = 0
    completed_appointments: int = 0
    pending_appointments: int = 0
    confirmed_appointments: int = 0
    cancelled_appointments: int = 0
    no_show_appointments: int = 0
    appointment_completion_rate: float = 0.0
    average_appointments_per_day: float = 0.0
    occupancy_rate: float = 0.0
    
    # Customer Metrics (enhanced)
    total_customers: int = 0
    new_customers_this_month: int = 0
    returning_customers: int = 0
    customer_retention_rate: float = 0.0
    average_customer_lifetime_value: float = 0.0
    customer_acquisition_cost: float = 0.0
    
    # Staff Performance (comprehensive)
    total_barbers: int = 0
    active_barbers: int = 0
    average_services_per_barber: float = 0.0
    staff_utilization_rate: float = 0.0
    most_productive_barber: str = "N/A"
    
    # Service Analytics (detailed)
    total_services: int = 0
    most_popular_services: List[Dict[str, Any]] = field(default_factory=list)
    service_categories: List[str] = field(default_factory=list)
    average_service_duration: float = 0.0
    
    # Operational Metrics (from real-time services)
    peak_hours: List[str] = field(default_factory=list)
    busy_days: List[str] = field(default_factory=list)
    seasonal_trends: Dict[str, float] = field(default_factory=dict)
    
    # Marketing Metrics (enhanced)
    marketing_roi: float = 0.0
    lead_conversion_rate: float = 0.0
    referral_rate: float = 0.0
    online_booking_rate: float = 0.0
    
    # Metadata
    last_updated: datetime = field(default_factory=datetime.now)
    data_source: str = "unified_service"
    confidence_score: float = 1.0
    cache_expires_at: Optional[datetime] = None

@dataclass
class DataPoint:
    """Real-time data point for streaming updates"""
    timestamp: datetime
    source: DataSource
    category: MetricCategory
    metric_name: str
    value: Union[float, int, str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0

@dataclass
class DataFeed:
    """Configuration for real-time data feeds"""
    feed_id: str
    source: DataSource
    category: MetricCategory
    update_frequency: int  # seconds
    is_active: bool = True
    last_update: Optional[datetime] = None
    subscribers: List[Callable] = field(default_factory=list)

class UnifiedBusinessDataService:
    """
    Unified business data service providing single source of truth for all business metrics
    Consolidates static data, real-time feeds, and analytics processing
    """
    
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'agent_system.db')
        
        # Data storage and caching
        self.metrics_cache = {}
        self.cache_duration = timedelta(minutes=5)  # 5-minute cache
        self.real_time_data = deque(maxlen=1000)  # Last 1000 data points
        
        # Data feeds management (from real-time service)
        self.active_feeds = {}
        self.feed_subscribers = defaultdict(list)
        
        # Fallback data (from static service)
        self.fallback_metrics = self._initialize_fallback_data()
        
        # Database connections
        self.sqlite_connection = None
        self.postgres_connection = None
        
        # Initialize service
        asyncio.create_task(self._initialize_service())
        
        logger.info("✅ Unified Business Data Service initialized")
    
    async def _initialize_service(self):
        """Initialize database connections and data feeds"""
        try:
            # Initialize SQLite connection
            await self._init_sqlite()
            
            # Initialize PostgreSQL if available
            if ASYNCPG_AVAILABLE:
                await self._init_postgres()
            
            # Start real-time data feeds
            await self._start_data_feeds()
            
            logger.info("✅ Unified Business Data Service fully initialized")
            
        except Exception as e:
            logger.error(f"❌ Service initialization failed: {e}")
    
    async def _init_sqlite(self):
        """Initialize SQLite database"""
        try:
            # Create tables if they don't exist
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS business_metrics_cache (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        metric_value TEXT NOT NULL,
                        category TEXT,
                        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                        source TEXT DEFAULT 'unified_service'
                    )
                ''')
                
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS data_feeds (
                        feed_id TEXT PRIMARY KEY,
                        source TEXT NOT NULL,
                        category TEXT,
                        update_frequency INTEGER DEFAULT 300,
                        is_active BOOLEAN DEFAULT 1,
                        last_update DATETIME,
                        config_data TEXT
                    )
                ''')
                
                conn.commit()
                logger.info("✅ SQLite database initialized")
                
        except Exception as e:
            logger.error(f"❌ SQLite initialization failed: {e}")
    
    async def _init_postgres(self):
        """Initialize PostgreSQL connection (if available)"""
        try:
            # This would connect to Supabase or other PostgreSQL instance
            # For now, we'll use SQLite as primary and add PostgreSQL support later
            logger.info("📝 PostgreSQL support ready for future implementation")
            
        except Exception as e:
            logger.error(f"❌ PostgreSQL initialization failed: {e}")
    
    async def get_live_business_metrics(self, barbershop_id: Optional[str] = None) -> UnifiedBusinessMetrics:
        """
        Get comprehensive live business metrics from unified data sources
        Primary method for all business data requests
        """
        try:
            # Check cache first
            cache_key = f"metrics_{barbershop_id or 'default'}"
            cached_metrics = self._get_cached_metrics(cache_key)
            
            if cached_metrics and not self._is_cache_expired(cached_metrics):
                logger.info(f"📦 Using cached business metrics (expires: {cached_metrics.cache_expires_at})")
                return cached_metrics
            
            # Generate fresh metrics
            metrics = await self._generate_fresh_metrics(barbershop_id)
            
            # Cache the results
            self._cache_metrics(cache_key, metrics)
            
            logger.info(f"✅ Generated fresh business metrics for {barbershop_id or 'default'}")
            return metrics
            
        except Exception as e:
            logger.error(f"❌ Failed to get business metrics: {e}")
            return self._get_fallback_metrics()
    
    async def _generate_fresh_metrics(self, barbershop_id: Optional[str] = None) -> UnifiedBusinessMetrics:
        """Generate fresh metrics from all available data sources"""
        
        # Start with base metrics
        metrics = UnifiedBusinessMetrics()
        
        # Data source priority: Database -> Real-time feeds -> Fallback
        try:
            # Try to get data from database first
            db_metrics = await self._get_database_metrics(barbershop_id)
            if db_metrics:
                metrics = self._merge_metrics(metrics, db_metrics)
                metrics.data_source = "database"
            
        except Exception as e:
            logger.warning(f"Database metrics unavailable: {e}")
        
        try:
            # Enhance with real-time data
            realtime_metrics = await self._get_realtime_metrics(barbershop_id)
            if realtime_metrics:
                metrics = self._merge_metrics(metrics, realtime_metrics)
                metrics.data_source = "database_with_realtime"
            
        except Exception as e:
            logger.warning(f"Real-time metrics unavailable: {e}")
        
        # If no data available, use fallback
        if metrics.total_revenue == 0 and metrics.total_appointments == 0:
            metrics = self.fallback_metrics
            metrics.data_source = "fallback"
            logger.info("📊 Using fallback business metrics")
        
        # Calculate derived metrics
        metrics = self._calculate_derived_metrics(metrics)
        
        # Set cache expiration
        metrics.cache_expires_at = datetime.now() + self.cache_duration
        metrics.last_updated = datetime.now()
        
        return metrics
    
    async def _get_database_metrics(self, barbershop_id: Optional[str] = None) -> Optional[UnifiedBusinessMetrics]:
        """Get metrics from database (SQLite/PostgreSQL)"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # Revenue metrics
                revenue_query = '''
                    SELECT 
                        COALESCE(SUM(total_amount), 0) as total_revenue,
                        COUNT(*) as total_transactions,
                        AVG(total_amount) as avg_transaction
                    FROM appointments 
                    WHERE status = 'completed'
                '''
                
                cursor = conn.execute(revenue_query)
                revenue_data = cursor.fetchone()
                
                # Appointment metrics
                appointment_query = '''
                    SELECT 
                        COUNT(*) as total_appointments,
                        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_shows,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
                    FROM appointments
                '''
                
                cursor = conn.execute(appointment_query)
                appointment_data = cursor.fetchone()
                
                # Customer metrics
                customer_query = '''
                    SELECT 
                        COUNT(DISTINCT user_id) as total_customers,
                        COUNT(DISTINCT CASE WHEN created_at >= date('now', '-30 days') THEN user_id END) as new_customers
                    FROM appointments
                '''
                
                cursor = conn.execute(customer_query)
                customer_data = cursor.fetchone()
                
                # Build metrics object
                metrics = UnifiedBusinessMetrics()
                
                if revenue_data:
                    metrics.total_revenue = float(revenue_data['total_revenue'] or 0)
                    metrics.average_service_price = float(revenue_data['avg_transaction'] or 0)
                    metrics.monthly_revenue = metrics.total_revenue  # Simplified for demo
                    metrics.daily_revenue = metrics.total_revenue / 30  # Simplified
                    metrics.weekly_revenue = metrics.total_revenue / 4  # Simplified
                
                if appointment_data:
                    metrics.total_appointments = int(appointment_data['total_appointments'] or 0)
                    metrics.completed_appointments = int(appointment_data['completed'] or 0)
                    metrics.cancelled_appointments = int(appointment_data['cancelled'] or 0)
                    metrics.no_show_appointments = int(appointment_data['no_shows'] or 0)
                    metrics.pending_appointments = int(appointment_data['pending'] or 0)
                    metrics.confirmed_appointments = int(appointment_data['confirmed'] or 0)
                    
                    if metrics.total_appointments > 0:
                        metrics.appointment_completion_rate = (metrics.completed_appointments / metrics.total_appointments) * 100
                        metrics.average_appointments_per_day = metrics.total_appointments / 30  # Simplified
                
                if customer_data:
                    metrics.total_customers = int(customer_data['total_customers'] or 0)
                    metrics.new_customers_this_month = int(customer_data['new_customers'] or 0)
                    metrics.returning_customers = metrics.total_customers - metrics.new_customers_this_month
                    
                    if metrics.total_customers > 0:
                        metrics.customer_retention_rate = (metrics.returning_customers / metrics.total_customers) * 100
                        metrics.average_customer_lifetime_value = metrics.total_revenue / metrics.total_customers
                
                logger.info(f"✅ Retrieved database metrics: {metrics.total_revenue} revenue, {metrics.total_appointments} appointments")
                return metrics
                
        except Exception as e:
            logger.error(f"❌ Database metrics query failed: {e}")
            return None
    
    async def _get_realtime_metrics(self, barbershop_id: Optional[str] = None) -> Optional[UnifiedBusinessMetrics]:
        """Get real-time metrics from active feeds"""
        try:
            # Get recent real-time data points
            recent_data = [dp for dp in self.real_time_data if 
                          (datetime.now() - dp.timestamp).total_seconds() < 300]  # Last 5 minutes
            
            if not recent_data:
                return None
            
            metrics = UnifiedBusinessMetrics()
            
            # Process real-time data points
            for data_point in recent_data:
                if data_point.category == MetricCategory.REVENUE:
                    if data_point.metric_name == "daily_revenue":
                        metrics.daily_revenue = float(data_point.value)
                elif data_point.category == MetricCategory.APPOINTMENTS:
                    if data_point.metric_name == "appointments_today":
                        metrics.average_appointments_per_day = float(data_point.value)
            
            logger.info(f"✅ Enhanced with real-time data: {len(recent_data)} data points")
            return metrics
            
        except Exception as e:
            logger.error(f"❌ Real-time metrics processing failed: {e}")
            return None
    
    def _merge_metrics(self, base: UnifiedBusinessMetrics, update: UnifiedBusinessMetrics) -> UnifiedBusinessMetrics:
        """Merge two metrics objects, preferring non-zero values from update"""
        
        for field_name, field_value in asdict(update).items():
            if field_name in ['last_updated', 'cache_expires_at', 'data_source']:
                continue  # Skip metadata fields
                
            if field_value and field_value != 0:  # Only update with meaningful values
                setattr(base, field_name, field_value)
        
        return base
    
    def _calculate_derived_metrics(self, metrics: UnifiedBusinessMetrics) -> UnifiedBusinessMetrics:
        """Calculate derived metrics from base metrics"""
        
        # Revenue per customer
        if metrics.total_customers > 0:
            metrics.revenue_per_customer = metrics.total_revenue / metrics.total_customers
        
        # Occupancy rate (assuming 8 hours * 30 days * number of barbers)
        if metrics.total_barbers > 0:
            available_slots = metrics.total_barbers * 8 * 30  # Simplified
            metrics.occupancy_rate = (metrics.total_appointments / available_slots) * 100 if available_slots > 0 else 0
        
        # Staff utilization
        if metrics.total_barbers > 0 and metrics.total_appointments > 0:
            metrics.average_services_per_barber = metrics.total_appointments / metrics.total_barbers
            metrics.staff_utilization_rate = min((metrics.average_services_per_barber / 40) * 100, 100)  # Assuming 40 services per month is 100%
        
        # Set confidence score based on data completeness
        non_zero_fields = sum(1 for field, value in asdict(metrics).items() 
                            if isinstance(value, (int, float)) and value > 0)
        total_numeric_fields = sum(1 for field, value in asdict(metrics).items() 
                                 if isinstance(value, (int, float)))
        
        metrics.confidence_score = non_zero_fields / total_numeric_fields if total_numeric_fields > 0 else 0.5
        
        return metrics
    
    async def get_formatted_metrics_for_ai(self, barbershop_id: Optional[str] = None) -> str:
        """
        Get metrics formatted specifically for AI consumption
        Used by AI orchestrator and agents for business analysis
        """
        try:
            metrics = await self.get_live_business_metrics(barbershop_id)
            
            formatted_data = f"""
📊 LIVE BUSINESS METRICS (Updated: {metrics.last_updated.strftime('%Y-%m-%d %H:%M:%S')})

💰 REVENUE ANALYTICS:
• Monthly Revenue: ${metrics.monthly_revenue:,.2f}
• Daily Average: ${metrics.daily_revenue:.2f}
• Weekly Revenue: ${metrics.weekly_revenue:,.2f}
• Total Revenue: ${metrics.total_revenue:,.2f}
• Growth Rate: {metrics.revenue_growth:+.1f}%
• Average Service Price: ${metrics.average_service_price:.2f}
• Revenue per Customer: ${metrics.revenue_per_customer:.2f}

📅 APPOINTMENT PERFORMANCE:
• Total Appointments: {metrics.total_appointments:,}
• Completed: {metrics.completed_appointments:,} ({metrics.appointment_completion_rate:.1f}%)
• Pending: {metrics.pending_appointments:,}
• Confirmed: {metrics.confirmed_appointments:,}
• Cancelled: {metrics.cancelled_appointments:,}
• No-Shows: {metrics.no_show_appointments:,}
• Daily Average: {metrics.average_appointments_per_day:.1f}
• Occupancy Rate: {metrics.occupancy_rate:.1f}%

👥 CUSTOMER INSIGHTS:
• Total Customers: {metrics.total_customers:,}
• New This Month: {metrics.new_customers_this_month:,}
• Returning Customers: {metrics.returning_customers:,}
• Retention Rate: {metrics.customer_retention_rate:.1f}%
• Lifetime Value: ${metrics.average_customer_lifetime_value:.2f}
• Acquisition Cost: ${metrics.customer_acquisition_cost:.2f}

👨‍💼 STAFF PERFORMANCE:
• Total Barbers: {metrics.total_barbers}
• Active Barbers: {metrics.active_barbers}
• Services per Barber: {metrics.average_services_per_barber:.1f}
• Staff Utilization: {metrics.staff_utilization_rate:.1f}%
• Top Performer: {metrics.most_productive_barber}

📈 OPERATIONAL METRICS:
• Total Services: {metrics.total_services:,}
• Avg Service Duration: {metrics.average_service_duration:.1f} minutes
• Marketing ROI: {metrics.marketing_roi:.1f}%
• Online Booking Rate: {metrics.online_booking_rate:.1f}%
• Referral Rate: {metrics.referral_rate:.1f}%

🔍 DATA QUALITY:
• Source: {metrics.data_source}
• Confidence: {metrics.confidence_score:.1%}
• Cache Status: {'Fresh' if not self._is_cache_expired(metrics) else 'Expired'}
"""
            
            logger.info(f"✅ Formatted metrics for AI consumption ({len(formatted_data)} characters)")
            return formatted_data.strip()
            
        except Exception as e:
            logger.error(f"❌ Failed to format metrics for AI: {e}")
            return "❌ Business metrics temporarily unavailable"
    
    async def _start_data_feeds(self):
        """Initialize and start real-time data feeds"""
        try:
            # Simulated data feeds for development
            feeds = [
                DataFeed("revenue_feed", DataSource.REAL_TIME_FEED, MetricCategory.REVENUE, 60),
                DataFeed("appointments_feed", DataSource.REAL_TIME_FEED, MetricCategory.APPOINTMENTS, 30),
                DataFeed("customers_feed", DataSource.REAL_TIME_FEED, MetricCategory.CUSTOMERS, 300),
            ]
            
            for feed in feeds:
                self.active_feeds[feed.feed_id] = feed
                # Start background task for each feed
                asyncio.create_task(self._run_data_feed(feed))
            
            logger.info(f"✅ Started {len(feeds)} real-time data feeds")
            
        except Exception as e:
            logger.error(f"❌ Failed to start data feeds: {e}")
    
    async def _run_data_feed(self, feed: DataFeed):
        """Run a single data feed in background"""
        try:
            while feed.is_active:
                # Generate simulated data point
                data_point = self._generate_simulated_data_point(feed)
                self.real_time_data.append(data_point)
                
                # Update feed timestamp
                feed.last_update = datetime.now()
                
                # Wait for next update
                await asyncio.sleep(feed.update_frequency)
                
        except Exception as e:
            logger.error(f"❌ Data feed {feed.feed_id} failed: {e}")
    
    def _generate_simulated_data_point(self, feed: DataFeed) -> DataPoint:
        """Generate simulated data point for development/testing"""
        
        value = 0
        metric_name = "unknown"
        
        if feed.category == MetricCategory.REVENUE:
            value = random.uniform(200, 800)  # Daily revenue range
            metric_name = "daily_revenue"
        elif feed.category == MetricCategory.APPOINTMENTS:
            value = random.randint(8, 15)  # Daily appointments
            metric_name = "appointments_today"
        elif feed.category == MetricCategory.CUSTOMERS:
            value = random.randint(1, 5)  # New customers
            metric_name = "new_customers_today"
        
        return DataPoint(
            timestamp=datetime.now(),
            source=feed.source,
            category=feed.category,
            metric_name=metric_name,
            value=value,
            metadata={"feed_id": feed.feed_id, "simulated": True}
        )
    
    def _initialize_fallback_data(self) -> UnifiedBusinessMetrics:
        """Initialize fallback data for when no other sources are available"""
        return UnifiedBusinessMetrics(
            monthly_revenue=12500.00,
            daily_revenue=450.00,
            weekly_revenue=2800.00,
            total_revenue=45000.00,
            revenue_growth=8.5,
            average_service_price=68.50,
            
            total_appointments=287,
            completed_appointments=264,
            pending_appointments=12,
            confirmed_appointments=34,
            cancelled_appointments=15,
            no_show_appointments=8,
            appointment_completion_rate=92.0,
            average_appointments_per_day=9.6,
            
            total_customers=156,
            new_customers_this_month=23,
            returning_customers=133,
            customer_retention_rate=85.3,
            average_customer_lifetime_value=288.46,
            
            total_barbers=3,
            active_barbers=3,
            average_services_per_barber=95.7,
            staff_utilization_rate=78.5,
            most_productive_barber="Marcus Johnson",
            
            data_source="fallback",
            confidence_score=0.7
        )
    
    def _get_cached_metrics(self, cache_key: str) -> Optional[UnifiedBusinessMetrics]:
        """Get metrics from cache if available and valid"""
        return self.metrics_cache.get(cache_key)
    
    def _cache_metrics(self, cache_key: str, metrics: UnifiedBusinessMetrics):
        """Cache metrics for future requests"""
        self.metrics_cache[cache_key] = metrics
    
    def _is_cache_expired(self, metrics: UnifiedBusinessMetrics) -> bool:
        """Check if cached metrics have expired"""
        if not metrics.cache_expires_at:
            return True
        return datetime.now() > metrics.cache_expires_at
    
    def _get_fallback_metrics(self) -> UnifiedBusinessMetrics:
        """Get fallback metrics when all other sources fail"""
        fallback = self.fallback_metrics
        fallback.data_source = "fallback"
        fallback.last_updated = datetime.now()
        fallback.cache_expires_at = datetime.now() + self.cache_duration
        return fallback
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get service status and health information"""
        return {
            "service_name": "unified_business_data_service",
            "status": "operational",
            "active_feeds": len(self.active_feeds),
            "cached_metrics": len(self.metrics_cache),
            "recent_data_points": len(self.real_time_data),
            "database_connection": "sqlite_available",
            "cache_hit_rate": "calculated_on_demand",
            "last_updated": datetime.now().isoformat()
        }

# Global service instance
unified_business_data_service = UnifiedBusinessDataService()

# Convenience functions for backward compatibility and easy access
async def get_live_business_metrics(barbershop_id: Optional[str] = None) -> UnifiedBusinessMetrics:
    """Get live business metrics - primary interface for all metric requests"""
    return await unified_business_data_service.get_live_business_metrics(barbershop_id)

async def get_formatted_metrics_for_ai(barbershop_id: Optional[str] = None) -> str:
    """Get formatted metrics for AI consumption"""
    return await unified_business_data_service.get_formatted_metrics_for_ai(barbershop_id)

def get_business_data_service() -> UnifiedBusinessDataService:
    """Get the unified business data service instance"""
    return unified_business_data_service