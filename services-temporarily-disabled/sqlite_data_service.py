"""
SQLite Data Service
Provides real data access from SQLite database for development
"""

import sqlite3
import logging
from datetime import datetime, timedelta, date
from typing import Dict, List, Optional, Any, Tuple
import os

logger = logging.getLogger(__name__)

class SQLiteDataService:
    """
    Service for querying real business data from SQLite database
    """
    
    def __init__(self, db_path: str = 'data/agent_system.db'):
        self.db_path = db_path
        self.connected = os.path.exists(db_path)
        
        if self.connected:
            logger.info(f"✅ Connected to SQLite database: {db_path}")
        else:
            logger.warning(f"⚠️ SQLite database not found: {db_path}")
    
    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)
    
    async def get_business_metrics(self, period_days: int = 30) -> Dict:
        """Get comprehensive business metrics from SQLite"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            metrics = {}
            
            # Get appointment metrics
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_show
                FROM appointments
                WHERE scheduled_at >= ?
            """, (start_date.isoformat(),))
            
            appointment_stats = cursor.fetchone()
            if appointment_stats:
                metrics['total_appointments'] = appointment_stats[0]
                metrics['completed_appointments'] = appointment_stats[1]
                metrics['pending_appointments'] = appointment_stats[2]
                metrics['confirmed_appointments'] = appointment_stats[3]
                metrics['cancelled_appointments'] = appointment_stats[4]
                metrics['no_show_appointments'] = appointment_stats[5]
            
            # Get revenue metrics
            cursor.execute("""
                SELECT 
                    SUM(amount) as total_revenue,
                    AVG(amount) as avg_transaction,
                    SUM(service_amount) as service_revenue,
                    SUM(tip_amount) as tip_revenue,
                    SUM(platform_fee) as platform_earnings
                FROM payments
                WHERE payment_status = 'COMPLETED'
                AND created_at >= ?
            """, (start_date.isoformat(),))
            
            revenue_stats = cursor.fetchone()
            if revenue_stats:
                metrics['monthly_revenue'] = float(revenue_stats[0] or 0)
                metrics['average_transaction'] = float(revenue_stats[1] or 0)
                metrics['service_revenue'] = float(revenue_stats[2] or 0)
                metrics['tip_revenue'] = float(revenue_stats[3] or 0)
                metrics['platform_earnings'] = float(revenue_stats[4] or 0)
                
                # Calculate daily and weekly averages
                metrics['daily_revenue'] = metrics['monthly_revenue'] / period_days
                metrics['weekly_revenue'] = metrics['monthly_revenue'] / (period_days / 7)
            
            # Get customer metrics
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT c.id) as total_customers,
                    COUNT(DISTINCT CASE 
                        WHEN c.created_at >= ? THEN c.id 
                    END) as new_customers
                FROM customers c
                WHERE c.is_active = 1
            """, (start_date.isoformat(),))
            
            customer_stats = cursor.fetchone()
            if customer_stats:
                metrics['total_customers'] = customer_stats[0]
                metrics['new_customers_this_month'] = customer_stats[1]
                metrics['returning_customers'] = metrics['total_customers'] - metrics['new_customers_this_month']
                
                if metrics['total_customers'] > 0:
                    metrics['customer_retention_rate'] = (metrics['returning_customers'] / metrics['total_customers']) * 100
                else:
                    metrics['customer_retention_rate'] = 0
            
            # Get average service price
            cursor.execute("""
                SELECT AVG(service_price) as avg_price
                FROM appointments
                WHERE status = 'COMPLETED'
                AND scheduled_at >= ?
            """, (start_date.isoformat(),))
            
            avg_price = cursor.fetchone()
            if avg_price and avg_price[0]:
                metrics['average_service_price'] = float(avg_price[0])
            else:
                metrics['average_service_price'] = 0
            
            # Get top services
            cursor.execute("""
                SELECT 
                    service_name,
                    COUNT(*) as bookings,
                    SUM(service_price) as revenue
                FROM appointments
                WHERE status = 'COMPLETED'
                AND scheduled_at >= ?
                GROUP BY service_name
                ORDER BY bookings DESC
                LIMIT 3
            """, (start_date.isoformat(),))
            
            top_services = cursor.fetchall()
            metrics['most_popular_services'] = [
                {'name': name, 'bookings': bookings, 'revenue': float(revenue or 0)}
                for name, bookings, revenue in top_services
            ]
            
            # Get barber count
            cursor.execute("SELECT COUNT(*) FROM barbers WHERE is_available = 1")
            barber_count = cursor.fetchone()
            metrics['total_barbers'] = barber_count[0] if barber_count else 0
            metrics['active_barbers'] = metrics['total_barbers']
            
            # Calculate derived metrics
            if metrics.get('completed_appointments', 0) > 0:
                metrics['appointment_completion_rate'] = (
                    metrics['completed_appointments'] / metrics['total_appointments'] * 100
                )
            else:
                metrics['appointment_completion_rate'] = 0
            
            # Estimate growth (compare to previous period)
            prev_start = start_date - timedelta(days=period_days)
            cursor.execute("""
                SELECT SUM(amount) as prev_revenue
                FROM payments
                WHERE payment_status = 'COMPLETED'
                AND created_at >= ? AND created_at < ?
            """, (prev_start.isoformat(), start_date.isoformat()))
            
            prev_revenue = cursor.fetchone()
            if prev_revenue and prev_revenue[0] and metrics.get('monthly_revenue', 0) > 0:
                prev_amount = float(prev_revenue[0])
                if prev_amount > 0:
                    metrics['revenue_growth'] = ((metrics['monthly_revenue'] - prev_amount) / prev_amount) * 100
                else:
                    metrics['revenue_growth'] = 100
            else:
                metrics['revenue_growth'] = 0
            
            conn.close()
            
            # Add metadata
            metrics['data_source'] = 'sqlite_database'
            metrics['data_freshness'] = 'live'
            metrics['last_updated'] = datetime.now().isoformat()
            
            logger.info(f"✅ Retrieved real metrics from SQLite: ${metrics.get('monthly_revenue', 0):.2f} revenue")
            return metrics
            
        except Exception as e:
            logger.error(f"Error fetching SQLite metrics: {e}")
            return {}
    
    async def get_complete_business_context(self, barbershop_id: str = None) -> Dict:
        """Get complete business context for AI agents"""
        metrics = await self.get_business_metrics()
        
        # Add additional context
        metrics['barbershop_id'] = barbershop_id or 'default'
        metrics['business_type'] = 'Barbershop'
        metrics['business_name'] = 'Your Barbershop'
        
        # Calculate additional metrics if not present
        if 'total_revenue' not in metrics:
            metrics['total_revenue'] = metrics.get('monthly_revenue', 0) * 12
        
        if 'average_appointments_per_day' not in metrics:
            metrics['average_appointments_per_day'] = (
                metrics.get('total_appointments', 0) / 30
            )
        
        if 'occupancy_rate' not in metrics:
            # Estimate occupancy (appointments / available slots)
            # Assuming 8 slots per barber per day
            available_slots = metrics.get('total_barbers', 4) * 8 * 30
            if available_slots > 0:
                metrics['occupancy_rate'] = (
                    metrics.get('total_appointments', 0) / available_slots * 100
                )
            else:
                metrics['occupancy_rate'] = 0
        
        # Get peak hours
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    CAST(strftime('%H', scheduled_at) AS INTEGER) as hour,
                    COUNT(*) as count
                FROM appointments
                WHERE status = 'COMPLETED'
                GROUP BY hour
                ORDER BY count DESC
                LIMIT 5
            """)
            
            peak_hours = cursor.fetchall()
            metrics['peak_booking_hours'] = [hour for hour, count in peak_hours]
            
            conn.close()
        except Exception as e:
            logger.error(f"Error fetching peak hours: {e}")
            metrics['peak_booking_hours'] = [10, 11, 14, 15, 16]
        
        return metrics
    
    async def get_business_metrics_by_date_range(self, start_date: datetime, end_date: datetime) -> Dict:
        """Get comprehensive business metrics for a specific date range"""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            metrics = {}
            period_days = (end_date - start_date).days
            
            # Get appointment metrics for date range
            cursor.execute("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END) as confirmed,
                    COUNT(CASE WHEN status = 'CANCELLED' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) as no_show
                FROM appointments
                WHERE scheduled_at >= ? AND scheduled_at <= ?
            """, (start_date.isoformat(), end_date.isoformat()))
            
            appointment_stats = cursor.fetchone()
            if appointment_stats:
                metrics['total_appointments'] = appointment_stats[0]
                metrics['completed_appointments'] = appointment_stats[1]
                metrics['pending_appointments'] = appointment_stats[2]
                metrics['confirmed_appointments'] = appointment_stats[3]
                metrics['cancelled_appointments'] = appointment_stats[4]
                metrics['no_show_appointments'] = appointment_stats[5]
            
            # Get revenue metrics for date range
            cursor.execute("""
                SELECT 
                    SUM(amount) as total_revenue,
                    AVG(amount) as avg_transaction,
                    SUM(service_amount) as service_revenue,
                    SUM(tip_amount) as tip_revenue,
                    SUM(platform_fee) as platform_earnings
                FROM payments
                WHERE payment_status = 'COMPLETED'
                AND created_at >= ? AND created_at <= ?
            """, (start_date.isoformat(), end_date.isoformat()))
            
            revenue_stats = cursor.fetchone()
            if revenue_stats:
                metrics['period_revenue'] = float(revenue_stats[0] or 0)
                metrics['average_transaction'] = float(revenue_stats[1] or 0)
                metrics['service_revenue'] = float(revenue_stats[2] or 0)
                metrics['tip_revenue'] = float(revenue_stats[3] or 0)
                metrics['platform_earnings'] = float(revenue_stats[4] or 0)
                
                # Calculate daily and weekly averages
                if period_days > 0:
                    metrics['daily_revenue'] = metrics['period_revenue'] / period_days
                    metrics['weekly_revenue'] = metrics['period_revenue'] / max(period_days / 7, 1)
                else:
                    metrics['daily_revenue'] = metrics['period_revenue']
                    metrics['weekly_revenue'] = metrics['period_revenue']
            
            # Get customer metrics for date range
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT c.id) as total_customers,
                    COUNT(DISTINCT CASE 
                        WHEN c.created_at >= ? AND c.created_at <= ? THEN c.id 
                    END) as new_customers_period
                FROM customers c
                WHERE c.is_active = 1
            """, (start_date.isoformat(), end_date.isoformat()))
            
            customer_stats = cursor.fetchone()
            if customer_stats:
                metrics['total_customers'] = customer_stats[0]
                metrics['new_customers_this_period'] = customer_stats[1]
                metrics['returning_customers'] = metrics['total_customers'] - metrics['new_customers_this_period']
                
                if metrics['total_customers'] > 0:
                    metrics['customer_retention_rate'] = (metrics['returning_customers'] / metrics['total_customers']) * 100
                else:
                    metrics['customer_retention_rate'] = 0
            
            # Get average service price for date range
            cursor.execute("""
                SELECT AVG(service_price) as avg_price
                FROM appointments
                WHERE status = 'COMPLETED'
                AND scheduled_at >= ? AND scheduled_at <= ?
            """, (start_date.isoformat(), end_date.isoformat()))
            
            avg_price = cursor.fetchone()
            if avg_price and avg_price[0]:
                metrics['average_service_price'] = float(avg_price[0])
            else:
                metrics['average_service_price'] = 0
            
            # Get top services for date range
            cursor.execute("""
                SELECT 
                    service_name,
                    COUNT(*) as bookings,
                    SUM(service_price) as revenue
                FROM appointments
                WHERE status = 'COMPLETED'
                AND scheduled_at >= ? AND scheduled_at <= ?
                GROUP BY service_name
                ORDER BY bookings DESC
                LIMIT 3
            """, (start_date.isoformat(), end_date.isoformat()))
            
            top_services = cursor.fetchall()
            metrics['most_popular_services'] = [
                {'name': name, 'bookings': bookings, 'revenue': float(revenue or 0)}
                for name, bookings, revenue in top_services
            ]
            
            # Get barber count (current staff, not date-dependent)
            cursor.execute("SELECT COUNT(*) FROM barbers WHERE is_available = 1")
            barber_count = cursor.fetchone()
            metrics['total_barbers'] = barber_count[0] if barber_count else 0
            metrics['active_barbers'] = metrics['total_barbers']
            
            # Calculate derived metrics
            if metrics.get('completed_appointments', 0) > 0 and metrics.get('total_appointments', 0) > 0:
                metrics['appointment_completion_rate'] = (
                    metrics['completed_appointments'] / metrics['total_appointments'] * 100
                )
            else:
                metrics['appointment_completion_rate'] = 0
            
            conn.close()
            
            # Add metadata
            metrics['data_source'] = 'sqlite_database'
            metrics['data_freshness'] = 'live'
            metrics['last_updated'] = datetime.now().isoformat()
            metrics['date_range'] = {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'period_days': period_days
            }
            
            logger.info(f"✅ Retrieved metrics for date range {start_date.date()} to {end_date.date()}: ${metrics.get('period_revenue', 0):.2f} revenue")
            return metrics
            
        except Exception as e:
            logger.error(f"Error fetching SQLite metrics by date range: {e}")
            return {}
    
    async def get_ytd_metrics(self, comparison_year: Optional[int] = None) -> Dict:
        """Get Year-to-Date business metrics with optional comparison to previous year"""
        try:
            current_year = datetime.now().year
            comparison_year = comparison_year or (current_year - 1)
            
            # Current YTD: January 1st to now
            ytd_start = datetime(current_year, 1, 1)
            ytd_end = datetime.now()
            
            # Previous year same period: January 1st to same date last year
            prev_ytd_start = datetime(comparison_year, 1, 1)
            prev_ytd_end = datetime(comparison_year, ytd_end.month, ytd_end.day)
            
            # Get current YTD metrics
            current_ytd = await self.get_business_metrics_by_date_range(ytd_start, ytd_end)
            
            # Get previous year same period metrics
            prev_ytd = await self.get_business_metrics_by_date_range(prev_ytd_start, prev_ytd_end)
            
            # Calculate year-over-year comparisons
            ytd_comparison = {
                'current_ytd': current_ytd,
                'previous_ytd': prev_ytd,
                'year_over_year_growth': {},
                'data_source': 'sqlite_database',
                'data_freshness': 'live',
                'last_updated': datetime.now().isoformat()
            }
            
            # Calculate growth percentages
            for metric in ['period_revenue', 'total_appointments', 'completed_appointments', 'total_customers']:
                current_val = current_ytd.get(metric, 0)
                prev_val = prev_ytd.get(metric, 0)
                
                if prev_val > 0:
                    growth = ((current_val - prev_val) / prev_val) * 100
                elif current_val > 0:
                    growth = 100  # New metric with no previous data
                else:
                    growth = 0
                
                ytd_comparison['year_over_year_growth'][metric] = {
                    'current': current_val,
                    'previous': prev_val,
                    'growth_percent': growth
                }
            
            logger.info(f"✅ Retrieved YTD metrics: ${current_ytd.get('period_revenue', 0):.2f} current vs ${prev_ytd.get('period_revenue', 0):.2f} previous")
            return ytd_comparison
            
        except Exception as e:
            logger.error(f"Error fetching YTD metrics: {e}")
            return {}
    
    async def get_previous_year_metrics(self, target_year: Optional[int] = None) -> Dict:
        """Get full previous year business metrics"""
        try:
            current_year = datetime.now().year
            target_year = target_year or (current_year - 1)
            
            # Full previous year: January 1st to December 31st
            prev_year_start = datetime(target_year, 1, 1)
            prev_year_end = datetime(target_year, 12, 31, 23, 59, 59)
            
            metrics = await self.get_business_metrics_by_date_range(prev_year_start, prev_year_end)
            
            # Add year identifier
            metrics['year'] = target_year
            metrics['period_type'] = 'full_year'
            
            logger.info(f"✅ Retrieved {target_year} full year metrics: ${metrics.get('period_revenue', 0):.2f} revenue")
            return metrics
            
        except Exception as e:
            logger.error(f"Error fetching previous year metrics: {e}")
            return {}
    
    async def get_comparison_metrics(self, start_date: datetime, end_date: datetime, 
                                   comparison_start: datetime, comparison_end: datetime) -> Dict:
        """Get metrics comparison between two date periods"""
        try:
            # Get metrics for both periods
            current_period = await self.get_business_metrics_by_date_range(start_date, end_date)
            comparison_period = await self.get_business_metrics_by_date_range(comparison_start, comparison_end)
            
            # Calculate comparison metrics
            comparison = {
                'current_period': current_period,
                'comparison_period': comparison_period,
                'period_comparison': {},
                'data_source': 'sqlite_database',
                'data_freshness': 'live',
                'last_updated': datetime.now().isoformat()
            }
            
            # Calculate percentage changes
            for metric in ['period_revenue', 'total_appointments', 'completed_appointments', 'total_customers']:
                current_val = current_period.get(metric, 0)
                comparison_val = comparison_period.get(metric, 0)
                
                if comparison_val > 0:
                    change_percent = ((current_val - comparison_val) / comparison_val) * 100
                elif current_val > 0:
                    change_percent = 100
                else:
                    change_percent = 0
                
                comparison['period_comparison'][metric] = {
                    'current': current_val,
                    'comparison': comparison_val,
                    'change_amount': current_val - comparison_val,
                    'change_percent': change_percent
                }
            
            logger.info(f"✅ Retrieved comparison metrics")
            return comparison
            
        except Exception as e:
            logger.error(f"Error fetching comparison metrics: {e}")
            return {}
    
    def _get_date_range_for_period(self, period_type: str) -> Tuple[datetime, datetime]:
        """Get start and end dates for predefined period types"""
        now = datetime.now()
        
        if period_type == 'ytd':
            start_date = datetime(now.year, 1, 1)
            end_date = now
        elif period_type == 'previous_year':
            start_date = datetime(now.year - 1, 1, 1)
            end_date = datetime(now.year - 1, 12, 31, 23, 59, 59)
        elif period_type == '7days':
            start_date = now - timedelta(days=7)
            end_date = now
        elif period_type == '30days':
            start_date = now - timedelta(days=30)
            end_date = now
        elif period_type == '90days':
            start_date = now - timedelta(days=90)
            end_date = now
        elif period_type == 'this_month':
            start_date = datetime(now.year, now.month, 1)
            end_date = now
        elif period_type == 'last_month':
            # Get first day of last month
            first_day_this_month = datetime(now.year, now.month, 1)
            last_day_prev_month = first_day_this_month - timedelta(days=1)
            start_date = datetime(last_day_prev_month.year, last_day_prev_month.month, 1)
            end_date = last_day_prev_month.replace(hour=23, minute=59, second=59)
        else:
            # Default to 30 days
            start_date = now - timedelta(days=30)
            end_date = now
            
        return start_date, end_date

# Create singleton instance
sqlite_data_service = SQLiteDataService()