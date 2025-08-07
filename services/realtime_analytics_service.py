"""
Real-Time Analytics Service
Provides live dashboard data for AI agents with comprehensive business metrics
"""

import asyncio
import json
import logging
import sqlite3
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from decimal import Decimal
import asyncpg
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local')

logger = logging.getLogger(__name__)

@dataclass
class BusinessMetrics:
    """Comprehensive business metrics structure"""
    
    # Revenue Metrics
    total_revenue: float = 0.0
    monthly_revenue: float = 0.0
    daily_revenue: float = 0.0
    weekly_revenue: float = 0.0
    service_revenue: float = 0.0
    tip_revenue: float = 0.0
    revenue_growth: float = 0.0
    
    # Booking Metrics
    total_appointments: int = 0
    completed_appointments: int = 0
    cancelled_appointments: int = 0
    no_show_appointments: int = 0
    pending_appointments: int = 0
    confirmed_appointments: int = 0
    appointment_completion_rate: float = 0.0
    average_appointments_per_day: float = 0.0
    
    # Customer Metrics
    total_customers: int = 0
    new_customers_this_month: int = 0
    returning_customers: int = 0
    customer_retention_rate: float = 0.0
    average_customer_lifetime_value: float = 0.0
    
    # Staff Performance
    total_barbers: int = 0
    active_barbers: int = 0
    top_performing_barber: Optional[str] = None
    average_service_duration: float = 0.0
    
    # Business Intelligence
    peak_booking_hours: List[int] = None
    most_popular_services: List[Dict] = None
    busiest_days: List[str] = None
    occupancy_rate: float = 0.0
    
    # Financial Health
    average_service_price: float = 0.0
    payment_success_rate: float = 0.0
    outstanding_payments: float = 0.0
    
    # Time-based Analysis
    last_updated: str = ""
    data_freshness: str = "live"  # live, cached, stale
    
    def __post_init__(self):
        if self.peak_booking_hours is None:
            self.peak_booking_hours = []
        if self.most_popular_services is None:
            self.most_popular_services = []
        if self.busiest_days is None:
            self.busiest_days = []

class RealtimeAnalyticsService:
    """
    Service for providing real-time business analytics to AI agents
    """
    
    def __init__(self):
        self.db_path = "database/agent_system.db"
        self.cache_duration = 300  # 5 minutes cache
        self.metrics_cache = {}
        self.last_cache_update = {}
        
        # PostgreSQL connection for production
        self.pg_connection_string = self._build_pg_connection_string()
        self.pg_pool = None
        
        # Initialize database connections
        asyncio.create_task(self._initialize_db_connections())
    
    def _build_pg_connection_string(self) -> Optional[str]:
        """Build PostgreSQL connection string from environment variables"""
        try:
            supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
            
            if supabase_url and supabase_key:
                # Extract database connection details from Supabase URL
                # Format: https://xxx.supabase.co
                project_id = supabase_url.replace('https://', '').replace('.supabase.co', '')
                return f"postgresql://postgres:{supabase_key}@db.{project_id}.supabase.co:5432/postgres"
            
            return None
        except Exception as e:
            logger.warning(f"Could not build PostgreSQL connection: {e}")
            return None
    
    async def _initialize_db_connections(self):
        """Initialize database connection pools"""
        try:
            if self.pg_connection_string:
                self.pg_pool = await asyncpg.create_pool(
                    self.pg_connection_string,
                    min_size=1,
                    max_size=5,
                    command_timeout=10
                )
                logger.info("✅ PostgreSQL connection pool initialized")
            else:
                logger.info("Using SQLite database for development")
                
        except Exception as e:
            logger.error(f"Database connection initialization failed: {e}")
    
    def _get_sqlite_connection(self) -> sqlite3.Connection:
        """Get SQLite database connection"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Return rows as dictionaries
            return conn
        except Exception as e:
            logger.error(f"SQLite connection failed: {e}")
            raise
    
    async def _execute_pg_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute PostgreSQL query safely"""
        try:
            if not self.pg_pool:
                return []
                
            async with self.pg_pool.acquire() as connection:
                rows = await connection.fetch(query, *params)
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"PostgreSQL query failed: {e}")
            return []
    
    def _execute_sqlite_query(self, query: str, params: tuple = ()) -> List[Dict]:
        """Execute SQLite query safely"""
        try:
            with self._get_sqlite_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"SQLite query failed: {e}")
            return []
    
    async def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.last_cache_update:
            return False
        
        last_update = self.last_cache_update[cache_key]
        return (datetime.now() - last_update).seconds < self.cache_duration
    
    async def get_live_business_metrics(self, barbershop_id: Optional[str] = None, force_refresh: bool = False) -> BusinessMetrics:
        """
        Get comprehensive real-time business metrics
        
        Args:
            barbershop_id: Specific barbershop to analyze (None for all)
            force_refresh: Skip cache and get fresh data
            
        Returns:
            BusinessMetrics object with all current business data
        """
        cache_key = f"business_metrics_{barbershop_id or 'all'}"
        
        # Return cached data if valid and not forcing refresh
        if not force_refresh and await self._is_cache_valid(cache_key):
            cached_metrics = self.metrics_cache.get(cache_key)
            if cached_metrics:
                logger.info(f"Returning cached metrics for {cache_key}")
                return cached_metrics
        
        logger.info(f"Fetching fresh business metrics for {cache_key}")
        
        try:
            # Get data from appropriate database
            if self.pg_pool:
                metrics = await self._get_pg_business_metrics(barbershop_id)
            else:
                metrics = await self._get_sqlite_business_metrics(barbershop_id)
            
            # Update cache
            self.metrics_cache[cache_key] = metrics
            self.last_cache_update[cache_key] = datetime.now()
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get business metrics: {e}")
            # Return cached data if available, otherwise empty metrics
            return self.metrics_cache.get(cache_key, BusinessMetrics())
    
    async def _get_pg_business_metrics(self, barbershop_id: Optional[str]) -> BusinessMetrics:
        """Get business metrics from PostgreSQL"""
        
        # Base WHERE clause for barbershop filtering
        where_clause = "WHERE b.id = $1" if barbershop_id else "WHERE 1=1"
        param_count = 1 if barbershop_id else 0
        
        # Revenue Analytics Query
        revenue_query = f"""
        SELECT 
            COALESCE(SUM(p.amount), 0) as total_revenue,
            COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('month', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as monthly_revenue,
            COALESCE(SUM(CASE WHEN p.created_at >= CURRENT_DATE THEN p.amount ELSE 0 END), 0) as daily_revenue,
            COALESCE(SUM(CASE WHEN p.created_at >= date_trunc('week', CURRENT_DATE) THEN p.amount ELSE 0 END), 0) as weekly_revenue,
            COALESCE(SUM(CASE WHEN p.payment_type = 'service' THEN p.amount ELSE 0 END), 0) as service_revenue,
            COALESCE(SUM(CASE WHEN p.payment_type = 'tip' THEN p.amount ELSE 0 END), 0) as tip_revenue,
            COALESCE(AVG(p.amount), 0) as average_service_price,
            COUNT(CASE WHEN p.status = 'COMPLETED' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as payment_success_rate,
            COALESCE(SUM(CASE WHEN p.status = 'PENDING' THEN p.amount ELSE 0 END), 0) as outstanding_payments
        FROM barbershops b
        LEFT JOIN appointments a ON a.barbershop_id = b.id
        LEFT JOIN payments p ON p.appointment_id = a.id
        {where_clause}
        """
        
        # Appointments Analytics Query
        appointments_query = f"""
        SELECT 
            COUNT(*) as total_appointments,
            COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = 'CANCELLED' THEN 1 END) as cancelled_appointments,
            COUNT(CASE WHEN a.status = 'NO_SHOW' THEN 1 END) as no_show_appointments,
            COUNT(CASE WHEN a.status = 'PENDING' THEN 1 END) as pending_appointments,
            COUNT(CASE WHEN a.status = 'CONFIRMED' THEN 1 END) as confirmed_appointments,
            COUNT(CASE WHEN a.status = 'COMPLETED' THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as completion_rate,
            COUNT(*)::FLOAT / NULLIF(EXTRACT(DAYS FROM (MAX(a.scheduled_at) - MIN(a.scheduled_at))), 0) as avg_appointments_per_day,
            AVG(EXTRACT(EPOCH FROM (a.end_time - a.start_time))/60) as avg_service_duration
        FROM barbershops b
        LEFT JOIN appointments a ON a.barbershop_id = b.id
        {where_clause}
        """
        
        # Customer Analytics Query
        customers_query = f"""
        SELECT 
            COUNT(DISTINCT u.id) as total_customers,
            COUNT(DISTINCT CASE WHEN u.created_at >= date_trunc('month', CURRENT_DATE) THEN u.id END) as new_customers_this_month,
            COUNT(DISTINCT CASE WHEN customer_stats.appointment_count > 1 THEN u.id END) as returning_customers,
            AVG(customer_stats.lifetime_value) as avg_customer_lifetime_value
        FROM barbershops b
        LEFT JOIN appointments a ON a.barbershop_id = b.id
        LEFT JOIN users u ON u.id = a.client_id
        LEFT JOIN LATERAL (
            SELECT 
                COUNT(*) as appointment_count,
                COALESCE(SUM(p.amount), 0) as lifetime_value
            FROM appointments a2
            LEFT JOIN payments p ON p.appointment_id = a2.id
            WHERE a2.client_id = u.id
        ) customer_stats ON true
        {where_clause}
        """
        
        # Staff Performance Query
        staff_query = f"""
        SELECT 
            COUNT(DISTINCT u.id) as total_barbers,
            COUNT(DISTINCT CASE WHEN barber_stats.recent_appointments > 0 THEN u.id END) as active_barbers,
            barber_performance.top_barber_name
        FROM barbershops b
        LEFT JOIN barbershop_barbers bb ON bb.barbershop_id = b.id
        LEFT JOIN users u ON u.id = bb.barber_id
        LEFT JOIN LATERAL (
            SELECT COUNT(*) as recent_appointments
            FROM appointments a2
            WHERE a2.barber_id = u.id 
            AND a2.scheduled_at >= CURRENT_DATE - INTERVAL '30 days'
        ) barber_stats ON true
        LEFT JOIN LATERAL (
            SELECT u2.full_name as top_barber_name
            FROM appointments a3
            LEFT JOIN users u2 ON u2.id = a3.barber_id
            WHERE a3.barbershop_id = b.id
            AND a3.status = 'COMPLETED'
            GROUP BY u2.id, u2.full_name
            ORDER BY COUNT(*) DESC
            LIMIT 1
        ) barber_performance ON true
        {where_clause}
        GROUP BY barber_performance.top_barber_name
        """
        
        # Execute queries
        params = (barbershop_id,) if barbershop_id else ()
        
        revenue_data = await self._execute_pg_query(revenue_query, params)
        appointments_data = await self._execute_pg_query(appointments_query, params)
        customers_data = await self._execute_pg_query(customers_query, params)
        staff_data = await self._execute_pg_query(staff_query, params)
        
        # Get additional analytics
        peak_hours = await self._get_peak_booking_hours_pg(barbershop_id)
        popular_services = await self._get_popular_services_pg(barbershop_id)
        busy_days = await self._get_busy_days_pg(barbershop_id)
        
        # Calculate derived metrics
        metrics = BusinessMetrics()
        
        if revenue_data:
            rev = revenue_data[0]
            metrics.total_revenue = float(rev.get('total_revenue', 0) or 0)
            metrics.monthly_revenue = float(rev.get('monthly_revenue', 0) or 0)
            metrics.daily_revenue = float(rev.get('daily_revenue', 0) or 0)
            metrics.weekly_revenue = float(rev.get('weekly_revenue', 0) or 0)
            metrics.service_revenue = float(rev.get('service_revenue', 0) or 0)
            metrics.tip_revenue = float(rev.get('tip_revenue', 0) or 0)
            metrics.average_service_price = float(rev.get('average_service_price', 0) or 0)
            metrics.payment_success_rate = float(rev.get('payment_success_rate', 0) or 0)
            metrics.outstanding_payments = float(rev.get('outstanding_payments', 0) or 0)
        
        if appointments_data:
            apt = appointments_data[0]
            metrics.total_appointments = int(apt.get('total_appointments', 0) or 0)
            metrics.completed_appointments = int(apt.get('completed_appointments', 0) or 0)
            metrics.cancelled_appointments = int(apt.get('cancelled_appointments', 0) or 0)
            metrics.no_show_appointments = int(apt.get('no_show_appointments', 0) or 0)
            metrics.pending_appointments = int(apt.get('pending_appointments', 0) or 0)
            metrics.confirmed_appointments = int(apt.get('confirmed_appointments', 0) or 0)
            metrics.appointment_completion_rate = float(apt.get('completion_rate', 0) or 0)
            metrics.average_appointments_per_day = float(apt.get('avg_appointments_per_day', 0) or 0)
            metrics.average_service_duration = float(apt.get('avg_service_duration', 0) or 0)
        
        if customers_data:
            cust = customers_data[0]
            metrics.total_customers = int(cust.get('total_customers', 0) or 0)
            metrics.new_customers_this_month = int(cust.get('new_customers_this_month', 0) or 0)
            metrics.returning_customers = int(cust.get('returning_customers', 0) or 0)
            metrics.average_customer_lifetime_value = float(cust.get('avg_customer_lifetime_value', 0) or 0)
            
            # Calculate retention rate
            total_customers = metrics.total_customers
            if total_customers > 0:
                metrics.customer_retention_rate = (metrics.returning_customers / total_customers) * 100
        
        if staff_data:
            staff = staff_data[0]
            metrics.total_barbers = int(staff.get('total_barbers', 0) or 0)
            metrics.active_barbers = int(staff.get('active_barbers', 0) or 0)
            metrics.top_performing_barber = staff.get('top_barber_name')
        
        # Calculate revenue growth (compare to last month)
        last_month_revenue_query = f"""
        SELECT COALESCE(SUM(p.amount), 0) as last_month_revenue
        FROM barbershops b
        LEFT JOIN appointments a ON a.barbershop_id = b.id
        LEFT JOIN payments p ON p.appointment_id = a.id
        WHERE p.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND p.created_at < date_trunc('month', CURRENT_DATE)
        {where_clause.replace('WHERE', 'AND') if barbershop_id else ''}
        """
        
        last_month_data = await self._execute_pg_query(last_month_revenue_query, params)
        if last_month_data and last_month_data[0]['last_month_revenue']:
            last_month = float(last_month_data[0]['last_month_revenue'])
            if last_month > 0:
                metrics.revenue_growth = ((metrics.monthly_revenue - last_month) / last_month) * 100
        
        # Set additional data
        metrics.peak_booking_hours = peak_hours
        metrics.most_popular_services = popular_services
        metrics.busiest_days = busy_days
        metrics.last_updated = datetime.now().isoformat()
        metrics.data_freshness = "live"
        
        # Calculate occupancy rate (simplified estimation)
        if metrics.total_barbers > 0 and metrics.average_service_duration > 0:
            # Assume 8-hour work days, 5 days a week
            total_capacity_minutes = metrics.total_barbers * 8 * 60 * 5  # per week
            total_service_minutes = metrics.total_appointments * metrics.average_service_duration
            if total_capacity_minutes > 0:
                metrics.occupancy_rate = min((total_service_minutes / total_capacity_minutes) * 100, 100)
        
        logger.info("✅ Successfully fetched PostgreSQL business metrics")
        return metrics
    
    async def _get_sqlite_business_metrics(self, barbershop_id: Optional[str]) -> BusinessMetrics:
        """Get business metrics from SQLite (development mode)"""
        
        # For SQLite, we'll create simplified queries that work with basic schema
        # This is primarily for development/testing
        
        metrics = BusinessMetrics()
        
        try:
            # Try to get basic appointment data if tables exist
            appointments_query = """
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled
            FROM appointments 
            WHERE 1=1
            """
            
            appointments_data = self._execute_sqlite_query(appointments_query)
            if appointments_data:
                apt = appointments_data[0]
                metrics.total_appointments = apt.get('total', 0)
                metrics.completed_appointments = apt.get('completed', 0)
                metrics.cancelled_appointments = apt.get('cancelled', 0)
                
                if metrics.total_appointments > 0:
                    metrics.appointment_completion_rate = (metrics.completed_appointments / metrics.total_appointments) * 100
            
            # Mock some realistic development data
            metrics.monthly_revenue = 12500.00
            metrics.daily_revenue = 450.00
            metrics.weekly_revenue = 2800.00
            metrics.total_revenue = 45000.00
            metrics.service_revenue = 38250.00
            metrics.tip_revenue = 6750.00
            metrics.revenue_growth = 8.5
            
            metrics.total_customers = 156
            metrics.new_customers_this_month = 23
            metrics.returning_customers = 133
            metrics.customer_retention_rate = 85.3
            metrics.average_customer_lifetime_value = 288.46
            
            metrics.total_barbers = 4
            metrics.active_barbers = 3
            metrics.top_performing_barber = "Mike Johnson"
            metrics.average_service_duration = 45.0
            
            metrics.peak_booking_hours = [10, 11, 14, 15, 16]
            metrics.busiest_days = ["Friday", "Saturday", "Thursday"]
            metrics.most_popular_services = [
                {"name": "Classic Cut", "bookings": 89, "revenue": 5340.00},
                {"name": "Beard Trim", "bookings": 67, "revenue": 2010.00},
                {"name": "Full Service", "bookings": 45, "revenue": 4050.00}
            ]
            
            metrics.average_service_price = 68.50
            metrics.payment_success_rate = 96.8
            metrics.outstanding_payments = 245.00
            metrics.occupancy_rate = 74.5
            
            metrics.last_updated = datetime.now().isoformat()
            metrics.data_freshness = "development_mock"
            
            logger.info("✅ Generated SQLite development metrics")
            
        except Exception as e:
            logger.error(f"SQLite metrics error: {e}")
            # Return basic empty metrics on error
            metrics.last_updated = datetime.now().isoformat()
            metrics.data_freshness = "error_fallback"
        
        return metrics
    
    async def _get_peak_booking_hours_pg(self, barbershop_id: Optional[str]) -> List[int]:
        """Get peak booking hours from PostgreSQL"""
        query = """
        SELECT 
            EXTRACT(hour FROM scheduled_at) as hour,
            COUNT(*) as bookings
        FROM appointments a
        {} 
        GROUP BY EXTRACT(hour FROM scheduled_at)
        ORDER BY bookings DESC
        LIMIT 5
        """.format("WHERE barbershop_id = $1" if barbershop_id else "WHERE 1=1")
        
        params = (barbershop_id,) if barbershop_id else ()
        data = await self._execute_pg_query(query, params)
        return [int(row['hour']) for row in data if row['hour'] is not None]
    
    async def _get_popular_services_pg(self, barbershop_id: Optional[str]) -> List[Dict]:
        """Get most popular services from PostgreSQL"""
        query = """
        SELECT 
            s.name,
            COUNT(a.id) as bookings,
            COALESCE(SUM(p.amount), 0) as revenue
        FROM appointments a
        JOIN services s ON s.id = a.service_id
        LEFT JOIN payments p ON p.appointment_id = a.id
        {}
        GROUP BY s.id, s.name
        ORDER BY bookings DESC
        LIMIT 5
        """.format("WHERE a.barbershop_id = $1" if barbershop_id else "WHERE 1=1")
        
        params = (barbershop_id,) if barbershop_id else ()
        data = await self._execute_pg_query(query, params)
        return [
            {
                "name": row['name'],
                "bookings": row['bookings'],
                "revenue": float(row['revenue'] or 0)
            }
            for row in data
        ]
    
    async def _get_busy_days_pg(self, barbershop_id: Optional[str]) -> List[str]:
        """Get busiest days of the week from PostgreSQL"""
        query = """
        SELECT 
            TO_CHAR(scheduled_at, 'Day') as day_name,
            COUNT(*) as bookings
        FROM appointments a
        {}
        GROUP BY TO_CHAR(scheduled_at, 'Day'), EXTRACT(dow FROM scheduled_at)
        ORDER BY bookings DESC
        LIMIT 3
        """.format("WHERE barbershop_id = $1" if barbershop_id else "WHERE 1=1")
        
        params = (barbershop_id,) if barbershop_id else ()
        data = await self._execute_pg_query(query, params)
        return [row['day_name'].strip() for row in data]
    
    def format_metrics_for_ai(self, metrics: BusinessMetrics) -> str:
        """
        Format business metrics in a way that's easily consumable by AI agents
        
        Args:
            metrics: BusinessMetrics object
            
        Returns:
            Formatted string with key business insights
        """
        
        # Create human-readable summary
        summary = f"""
CURRENT BUSINESS METRICS (Last Updated: {metrics.last_updated})

💰 REVENUE PERFORMANCE
• Total Revenue: ${metrics.total_revenue:,.2f}
• Monthly Revenue: ${metrics.monthly_revenue:,.2f}
• Daily Revenue: ${metrics.daily_revenue:,.2f}
• Revenue Growth: {metrics.revenue_growth:+.1f}%
• Average Service Price: ${metrics.average_service_price:.2f}

📅 BOOKING ANALYTICS
• Total Appointments: {metrics.total_appointments}
• Completed: {metrics.completed_appointments} ({metrics.appointment_completion_rate:.1f}% completion rate)
• Cancelled: {metrics.cancelled_appointments}
• No-Shows: {metrics.no_show_appointments}
• Average Appointments/Day: {metrics.average_appointments_per_day:.1f}

👥 CUSTOMER INSIGHTS
• Total Customers: {metrics.total_customers}
• New This Month: {metrics.new_customers_this_month}
• Retention Rate: {metrics.customer_retention_rate:.1f}%
• Average Customer Lifetime Value: ${metrics.average_customer_lifetime_value:.2f}

👨‍💼 STAFF PERFORMANCE
• Total Barbers: {metrics.total_barbers}
• Active Barbers: {metrics.active_barbers}
• Top Performer: {metrics.top_performing_barber or 'N/A'}
• Occupancy Rate: {metrics.occupancy_rate:.1f}%

🔥 BUSINESS INSIGHTS
• Peak Hours: {', '.join([f'{h}:00' for h in metrics.peak_booking_hours[:3]])}
• Busiest Days: {', '.join(metrics.busiest_days[:3])}
• Top Services: {', '.join([s['name'] for s in metrics.most_popular_services[:3]])}
• Payment Success Rate: {metrics.payment_success_rate:.1f}%

Data Quality: {metrics.data_freshness.upper()}
"""
        
        return summary.strip()
    
    async def get_formatted_metrics_for_ai(self, barbershop_id: Optional[str] = None, force_refresh: bool = False) -> str:
        """
        Get formatted business metrics ready for AI consumption
        
        Args:
            barbershop_id: Specific barbershop to analyze
            force_refresh: Force fresh data fetch
            
        Returns:
            Human-readable formatted metrics string
        """
        
        metrics = await self.get_live_business_metrics(barbershop_id, force_refresh)
        return self.format_metrics_for_ai(metrics)
    
    async def get_specific_metric(self, metric_name: str, barbershop_id: Optional[str] = None) -> Any:
        """
        Get a specific business metric by name
        
        Args:
            metric_name: Name of the metric to retrieve
            barbershop_id: Specific barbershop to analyze
            
        Returns:
            The specific metric value
        """
        
        metrics = await self.get_live_business_metrics(barbershop_id)
        return getattr(metrics, metric_name, None)
    
    async def get_metrics_json(self, barbershop_id: Optional[str] = None, force_refresh: bool = False) -> Dict:
        """
        Get business metrics as JSON dictionary
        
        Args:
            barbershop_id: Specific barbershop to analyze
            force_refresh: Force fresh data fetch
            
        Returns:
            Dictionary with all business metrics
        """
        
        metrics = await self.get_live_business_metrics(barbershop_id, force_refresh)
        return asdict(metrics)
    
    def get_cache_status(self) -> Dict:
        """Get current cache status for monitoring"""
        
        cache_info = {}
        for cache_key, last_update in self.last_cache_update.items():
            age_seconds = (datetime.now() - last_update).seconds
            cache_info[cache_key] = {
                'last_update': last_update.isoformat(),
                'age_seconds': age_seconds,
                'is_valid': age_seconds < self.cache_duration,
                'cache_duration': self.cache_duration
            }
        
        return {
            'cache_entries': len(self.metrics_cache),
            'cache_duration_seconds': self.cache_duration,
            'cache_details': cache_info,
            'database_type': 'postgresql' if self.pg_pool else 'sqlite'
        }

# Global instance
realtime_analytics_service = RealtimeAnalyticsService()