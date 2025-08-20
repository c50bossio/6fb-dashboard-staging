"""
Shop Service Layer - Business logic for shop management
Handles caching, background jobs, notifications, and complex business operations
"""

import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, date
from decimal import Decimal
import redis
from supabase import create_client, Client
from pydantic import BaseModel
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not supabase_key:
    raise Exception("Missing Supabase configuration")

supabase: Client = create_client(supabase_url, supabase_key)

# Initialize Redis for caching
try:
    redis_client = redis.Redis(
        host='localhost',
        port=6379,
        db=0,
        decode_responses=True
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    logger.warning("Redis not available, caching disabled")
    redis_client = None
    REDIS_AVAILABLE = False

# Cache configuration
CACHE_TTL = {
    'shop_info': 3600,  # 1 hour
    'shop_metrics': 300,  # 5 minutes
    'staff_list': 1800,  # 30 minutes
    'services': 1800,  # 30 minutes
    'products': 900,  # 15 minutes
    'schedule': 600,  # 10 minutes
    'analytics': 300,  # 5 minutes
}

class ShopService:
    """Service layer for shop management operations"""
    
    @staticmethod
    def get_cache_key(shop_id: str, key_type: str, suffix: str = "") -> str:
        """Generate a cache key"""
        return f"shop:{shop_id}:{key_type}{':' + suffix if suffix else ''}"
    
    @staticmethod
    async def get_cached_data(cache_key: str) -> Optional[Dict]:
        """Get data from cache"""
        if not REDIS_AVAILABLE:
            return None
        
        try:
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache read error: {e}")
        
        return None
    
    @staticmethod
    async def set_cached_data(cache_key: str, data: Dict, ttl: int = 300):
        """Set data in cache"""
        if not REDIS_AVAILABLE:
            return
        
        try:
            redis_client.setex(cache_key, ttl, json.dumps(data, default=str))
        except Exception as e:
            logger.error(f"Cache write error: {e}")
    
    @staticmethod
    async def invalidate_cache(shop_id: str, patterns: List[str] = None):
        """Invalidate cache for a shop"""
        if not REDIS_AVAILABLE:
            return
        
        try:
            if patterns:
                for pattern in patterns:
                    keys = redis_client.keys(f"shop:{shop_id}:{pattern}*")
                    if keys:
                        redis_client.delete(*keys)
            else:
                # Invalidate all shop cache
                keys = redis_client.keys(f"shop:{shop_id}:*")
                if keys:
                    redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Cache invalidation error: {e}")
    
    @staticmethod
    async def get_shop_dashboard_data(shop_id: str) -> Dict:
        """Get comprehensive dashboard data with caching"""
        cache_key = ShopService.get_cache_key(shop_id, "dashboard")
        
        # Check cache first
        cached_data = await ShopService.get_cached_data(cache_key)
        if cached_data:
            logger.info(f"Returning cached dashboard data for shop {shop_id}")
            return cached_data
        
        # Fetch fresh data
        dashboard_data = {
            'metrics': await ShopService.get_shop_metrics(shop_id),
            'recent_appointments': await ShopService.get_recent_appointments(shop_id),
            'top_services': await ShopService.get_top_services(shop_id),
            'staff_performance': await ShopService.get_staff_performance(shop_id),
            'alerts': await ShopService.get_shop_alerts(shop_id)
        }
        
        # Cache the data
        await ShopService.set_cached_data(cache_key, dashboard_data, CACHE_TTL['shop_metrics'])
        
        return dashboard_data
    
    @staticmethod
    async def get_shop_metrics(shop_id: str) -> Dict:
        """Calculate comprehensive shop metrics"""
        try:
            # Try to use stored procedure first
            metrics_response = supabase.rpc('get_shop_dashboard_metrics', {'p_barbershop_id': shop_id}).execute()
            
            if metrics_response.data:
                return metrics_response.data
            
            # Fallback to manual calculation
            return await ShopService._calculate_metrics_manually(shop_id)
        except Exception as e:
            logger.error(f"Error getting shop metrics: {e}")
            return ShopService._get_default_metrics()
    
    @staticmethod
    async def _calculate_metrics_manually(shop_id: str) -> Dict:
        """Manual calculation of shop metrics"""
        metrics = {
            'total_revenue': 0,
            'today_revenue': 0,
            'week_revenue': 0,
            'month_revenue': 0,
            'total_appointments': 0,
            'today_appointments': 0,
            'completed_appointments': 0,
            'cancellation_rate': 0,
            'average_service_value': 0,
            'total_customers': 0,
            'new_customers_month': 0,
            'returning_customers': 0,
            'average_rating': 0
        }
        
        try:
            today = datetime.now().date()
            week_ago = today - timedelta(days=7)
            month_start = today.replace(day=1)
            
            # Revenue calculations
            transactions = supabase.table('transactions').select('*').eq('barbershop_id', shop_id).execute()
            
            for transaction in transactions.data:
                trans_date = datetime.fromisoformat(transaction['processed_at'].replace('Z', '+00:00')).date()
                amount = float(transaction.get('net_amount', 0))
                
                metrics['total_revenue'] += amount
                if trans_date == today:
                    metrics['today_revenue'] += amount
                if trans_date >= week_ago:
                    metrics['week_revenue'] += amount
                if trans_date >= month_start:
                    metrics['month_revenue'] += amount
            
            # Customer metrics
            customers = supabase.table('customers').select('*').eq('barbershop_id', shop_id).execute()
            metrics['total_customers'] = len(customers.data)
            
            for customer in customers.data:
                if customer.get('created_at'):
                    created_date = datetime.fromisoformat(customer['created_at'].replace('Z', '+00:00')).date()
                    if created_date >= month_start:
                        metrics['new_customers_month'] += 1
                
                if customer.get('total_visits', 0) > 1:
                    metrics['returning_customers'] += 1
            
            # Appointment metrics
            bookings = supabase.table('bookings').select('*').eq('shop_id', shop_id).execute()
            
            total_bookings = len(bookings.data)
            completed = 0
            cancelled = 0
            
            for booking in bookings.data:
                booking_date = datetime.fromisoformat(booking['created_at'].replace('Z', '+00:00')).date()
                
                if booking_date == today:
                    metrics['today_appointments'] += 1
                
                if booking.get('status') == 'completed':
                    completed += 1
                elif booking.get('status') in ['cancelled', 'no_show']:
                    cancelled += 1
            
            metrics['total_appointments'] = total_bookings
            metrics['completed_appointments'] = completed
            
            if total_bookings > 0:
                metrics['cancellation_rate'] = (cancelled / total_bookings) * 100
                metrics['average_service_value'] = metrics['total_revenue'] / completed if completed > 0 else 0
            
            # Get average rating from reviews
            reviews = supabase.table('gmb_reviews').select('rating').eq('business_id', shop_id).execute()
            if reviews.data:
                total_rating = sum(r['rating'] for r in reviews.data)
                metrics['average_rating'] = total_rating / len(reviews.data)
            else:
                metrics['average_rating'] = 4.5  # Default
                
        except Exception as e:
            logger.error(f"Error calculating metrics manually: {e}")
        
        return metrics
    
    @staticmethod
    def _get_default_metrics() -> Dict:
        """Return default metrics structure"""
        return {
            'total_revenue': 0,
            'today_revenue': 0,
            'week_revenue': 0,
            'month_revenue': 0,
            'total_appointments': 0,
            'today_appointments': 0,
            'completed_appointments': 0,
            'cancellation_rate': 0,
            'average_service_value': 0,
            'total_customers': 0,
            'new_customers_month': 0,
            'returning_customers': 0,
            'average_rating': 0
        }
    
    @staticmethod
    async def get_recent_appointments(shop_id: str, limit: int = 10) -> List[Dict]:
        """Get recent appointments with customer info"""
        try:
            # Get recent bookings with customer info
            bookings = supabase.table('bookings').select(
                '*, customers(name, email, phone)'
            ).eq('shop_id', shop_id).order('created_at', desc=True).limit(limit).execute()
            
            appointments = []
            for booking in bookings.data:
                appointments.append({
                    'id': booking['id'],
                    'customer_name': booking.get('customers', {}).get('name', 'Unknown'),
                    'customer_email': booking.get('customers', {}).get('email'),
                    'service': booking.get('service_name', 'Service'),
                    'appointment_time': booking.get('appointment_time'),
                    'status': booking.get('status', 'pending'),
                    'price': booking.get('price', 0)
                })
            
            return appointments
        except Exception as e:
            logger.error(f"Error getting recent appointments: {e}")
            return []
    
    @staticmethod
    async def get_top_services(shop_id: str, limit: int = 5) -> List[Dict]:
        """Get top performing services"""
        try:
            # Get services with booking count
            services = supabase.table('services').select('*').eq('barbershop_id', shop_id).eq('is_active', True).execute()
            
            # Get booking counts for each service
            service_stats = []
            for service in services.data:
                # Count bookings for this service
                bookings = supabase.table('bookings').select('id').eq('shop_id', shop_id).eq('service_id', service['id']).execute()
                
                service_stats.append({
                    'id': service['id'],
                    'name': service['name'],
                    'category': service['category'],
                    'price': service['price'],
                    'duration': service['duration_minutes'],
                    'booking_count': len(bookings.data),
                    'revenue': len(bookings.data) * service['price']
                })
            
            # Sort by booking count and return top services
            service_stats.sort(key=lambda x: x['booking_count'], reverse=True)
            
            return service_stats[:limit]
        except Exception as e:
            logger.error(f"Error getting top services: {e}")
            return []
    
    @staticmethod
    async def get_staff_performance(shop_id: str) -> List[Dict]:
        """Get staff performance metrics"""
        try:
            # Get all staff members
            staff = supabase.table('barbershop_staff').select(
                '*, profiles(full_name, email)'
            ).eq('barbershop_id', shop_id).eq('is_active', True).execute()
            
            performance = []
            for member in staff.data:
                # Get transactions for this staff member
                transactions = supabase.table('transactions').select('*').eq(
                    'barbershop_id', shop_id
                ).eq('barber_id', member['user_id']).execute()
                
                total_revenue = sum(float(t.get('amount', 0)) for t in transactions.data)
                total_services = len([t for t in transactions.data if t.get('transaction_type') == 'service'])
                
                # Get bookings for this staff member
                bookings = supabase.table('bookings').select('*').eq(
                    'shop_id', shop_id
                ).eq('barber_id', member['user_id']).execute()
                
                completed_bookings = len([b for b in bookings.data if b.get('status') == 'completed'])
                
                performance.append({
                    'id': member['user_id'],
                    'name': member.get('profiles', {}).get('full_name', 'Unknown'),
                    'role': member['role'],
                    'total_revenue': total_revenue,
                    'total_services': total_services,
                    'completed_appointments': completed_bookings,
                    'commission_rate': member.get('commission_rate', 0),
                    'rating': 4.5  # Would need to calculate from reviews
                })
            
            return performance
        except Exception as e:
            logger.error(f"Error getting staff performance: {e}")
            return []
    
    @staticmethod
    async def get_shop_alerts(shop_id: str) -> List[Dict]:
        """Get important alerts for shop owner"""
        alerts = []
        
        try:
            # Check for low stock products
            products = supabase.table('products').select('*').eq('barbershop_id', shop_id).execute()
            
            low_stock = []
            out_of_stock = []
            
            for product in products.data:
                if product['current_stock'] == 0:
                    out_of_stock.append(product['name'])
                elif product['current_stock'] <= product.get('min_stock_level', 5):
                    low_stock.append(product['name'])
            
            if out_of_stock:
                alerts.append({
                    'type': 'critical',
                    'category': 'inventory',
                    'message': f"{len(out_of_stock)} products are out of stock",
                    'details': out_of_stock[:5]  # Show first 5
                })
            
            if low_stock:
                alerts.append({
                    'type': 'warning',
                    'category': 'inventory',
                    'message': f"{len(low_stock)} products are running low",
                    'details': low_stock[:5]
                })
            
            # Check for upcoming appointments without staff
            today = datetime.now().date()
            bookings = supabase.table('bookings').select('*').eq('shop_id', shop_id).gte('appointment_date', str(today)).execute()
            
            unassigned = [b for b in bookings.data if not b.get('barber_id')]
            if unassigned:
                alerts.append({
                    'type': 'warning',
                    'category': 'scheduling',
                    'message': f"{len(unassigned)} appointments need staff assignment",
                    'details': []
                })
            
            # Check for pending reviews to respond to
            reviews = supabase.table('gmb_reviews').select('*').eq('business_id', shop_id).is_('owner_response', None).execute()
            
            if reviews.data:
                alerts.append({
                    'type': 'info',
                    'category': 'reviews',
                    'message': f"{len(reviews.data)} reviews await your response",
                    'details': []
                })
            
            # Check for financial alerts (e.g., pending payouts)
            financial = supabase.table('financial_arrangements').select('*').eq('barbershop_id', shop_id).eq('is_active', True).execute()
            
            pending_payouts = 0
            for arrangement in financial.data:
                # Check if payout is due (simplified logic)
                pending_payouts += 1
            
            if pending_payouts > 0:
                alerts.append({
                    'type': 'info',
                    'category': 'financial',
                    'message': f"{pending_payouts} barbers have pending payouts",
                    'details': []
                })
                
        except Exception as e:
            logger.error(f"Error getting shop alerts: {e}")
        
        return alerts
    
    @staticmethod
    async def optimize_staff_schedule(shop_id: str, date_range: Dict) -> Dict:
        """AI-powered schedule optimization"""
        try:
            # Get historical booking patterns
            bookings = supabase.table('bookings').select('*').eq('shop_id', shop_id).execute()
            
            # Analyze patterns by day and time
            patterns = {}
            for booking in bookings.data:
                if booking.get('appointment_time'):
                    dt = datetime.fromisoformat(booking['appointment_time'].replace('Z', '+00:00'))
                    day = dt.strftime('%A')
                    hour = dt.hour
                    
                    if day not in patterns:
                        patterns[day] = {}
                    if hour not in patterns[day]:
                        patterns[day][hour] = 0
                    patterns[day][hour] += 1
            
            # Generate optimized schedule recommendations
            recommendations = {
                'peak_hours': [],
                'suggested_staff': {},
                'break_times': []
            }
            
            for day, hours in patterns.items():
                if hours:
                    # Find peak hours
                    sorted_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)
                    peak = sorted_hours[:3] if len(sorted_hours) >= 3 else sorted_hours
                    
                    recommendations['peak_hours'].append({
                        'day': day,
                        'hours': [h[0] for h in peak]
                    })
                    
                    # Suggest staff levels
                    total_bookings = sum(hours.values())
                    avg_per_hour = total_bookings / len(hours)
                    
                    recommendations['suggested_staff'][day] = {
                        'minimum': max(1, int(avg_per_hour / 2)),
                        'recommended': max(2, int(avg_per_hour)),
                        'peak': max(3, int(max(hours.values()) / 2))
                    }
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error optimizing schedule: {e}")
            return {}
    
    @staticmethod
    async def calculate_commission_payouts(shop_id: str, period: Dict) -> List[Dict]:
        """Calculate commission payouts for all staff"""
        try:
            # Use stored procedure
            commission_response = supabase.rpc('calculate_barber_commission', {
                'p_barbershop_id': shop_id,
                'p_start_date': str(period['start_date']),
                'p_end_date': str(period['end_date'])
            }).execute()
            
            payouts = []
            for commission in commission_response.data:
                # Get financial arrangement for booth rent
                arrangement = supabase.table('financial_arrangements').select('*').eq(
                    'barbershop_id', shop_id
                ).eq('barber_id', commission['barber_id']).eq('is_active', True).single().execute()
                
                booth_rent = 0
                if arrangement.data and arrangement.data.get('financial_model') == 'booth_rent':
                    booth_rent = float(arrangement.data.get('booth_rent_amount', 0))
                
                net_payout = float(commission['commission_amount']) - booth_rent
                
                payouts.append({
                    'barber_id': commission['barber_id'],
                    'barber_name': commission['barber_name'],
                    'total_services': float(commission['total_services']),
                    'total_products': float(commission['total_products']),
                    'commission_rate': float(commission['commission_rate']),
                    'commission_amount': float(commission['commission_amount']),
                    'booth_rent': booth_rent,
                    'net_payout': net_payout,
                    'period_start': period['start_date'],
                    'period_end': period['end_date']
                })
            
            return payouts
            
        except Exception as e:
            logger.error(f"Error calculating commissions: {e}")
            return []
    
    @staticmethod
    async def generate_financial_report(shop_id: str, report_type: str, period: Dict) -> Dict:
        """Generate comprehensive financial reports"""
        report = {
            'type': report_type,
            'period': period,
            'generated_at': datetime.now().isoformat(),
            'data': {}
        }
        
        try:
            if report_type == 'revenue':
                # Revenue report
                transactions = supabase.table('transactions').select('*').eq(
                    'barbershop_id', shop_id
                ).gte('processed_at', period['start_date']).lte('processed_at', period['end_date']).execute()
                
                revenue_by_type = {}
                revenue_by_day = {}
                revenue_by_barber = {}
                
                for transaction in transactions.data:
                    trans_type = transaction.get('transaction_type', 'unknown')
                    amount = float(transaction.get('net_amount', 0))
                    date = datetime.fromisoformat(transaction['processed_at'].replace('Z', '+00:00')).date()
                    barber_id = transaction.get('barber_id')
                    
                    # By type
                    if trans_type not in revenue_by_type:
                        revenue_by_type[trans_type] = 0
                    revenue_by_type[trans_type] += amount
                    
                    # By day
                    date_str = str(date)
                    if date_str not in revenue_by_day:
                        revenue_by_day[date_str] = 0
                    revenue_by_day[date_str] += amount
                    
                    # By barber
                    if barber_id:
                        if barber_id not in revenue_by_barber:
                            revenue_by_barber[barber_id] = 0
                        revenue_by_barber[barber_id] += amount
                
                report['data'] = {
                    'total_revenue': sum(revenue_by_type.values()),
                    'by_type': revenue_by_type,
                    'by_day': revenue_by_day,
                    'by_barber': revenue_by_barber,
                    'average_daily': sum(revenue_by_day.values()) / len(revenue_by_day) if revenue_by_day else 0
                }
                
            elif report_type == 'expenses':
                # Expense report (simplified - would need expense tracking table)
                report['data'] = {
                    'total_expenses': 0,
                    'categories': {},
                    'note': 'Expense tracking not yet implemented'
                }
                
            elif report_type == 'profit_loss':
                # P&L report
                revenue_report = await ShopService.generate_financial_report(shop_id, 'revenue', period)
                expense_report = await ShopService.generate_financial_report(shop_id, 'expenses', period)
                
                total_revenue = revenue_report['data'].get('total_revenue', 0)
                total_expenses = expense_report['data'].get('total_expenses', 0)
                
                report['data'] = {
                    'total_revenue': total_revenue,
                    'total_expenses': total_expenses,
                    'net_profit': total_revenue - total_expenses,
                    'profit_margin': ((total_revenue - total_expenses) / total_revenue * 100) if total_revenue > 0 else 0
                }
                
        except Exception as e:
            logger.error(f"Error generating financial report: {e}")
            report['error'] = str(e)
        
        return report
    
    @staticmethod
    async def send_notification(shop_id: str, notification_type: str, data: Dict):
        """Send notifications to shop owner or staff"""
        try:
            # Get shop owner
            shop = supabase.table('barbershops').select('owner_id, name').eq('id', shop_id).single().execute()
            
            if not shop.data:
                return
            
            # Get owner profile
            owner = supabase.table('profiles').select('email, full_name').eq('id', shop.data['owner_id']).single().execute()
            
            if not owner.data:
                return
            
            # Create notification record
            notification = {
                'user_id': shop.data['owner_id'],
                'type': notification_type,
                'title': data.get('title', 'Shop Notification'),
                'message': data.get('message', ''),
                'data': data,
                'is_read': False,
                'created_at': datetime.now().isoformat()
            }
            
            supabase.table('notifications').insert(notification).execute()
            
            # TODO: Send email/SMS notification based on preferences
            logger.info(f"Notification sent to shop {shop_id}: {notification_type}")
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    @staticmethod
    async def process_bulk_operation(shop_id: str, operation_type: str, data: List[Dict]) -> Dict:
        """Process bulk operations efficiently"""
        results = {
            'successful': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            if operation_type == 'import_customers':
                for customer_data in data:
                    try:
                        customer_data['barbershop_id'] = shop_id
                        supabase.table('customers').insert(customer_data).execute()
                        results['successful'] += 1
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append(str(e))
                        
            elif operation_type == 'update_services':
                for service_data in data:
                    try:
                        service_id = service_data.pop('id')
                        supabase.table('services').update(service_data).eq('id', service_id).eq('barbershop_id', shop_id).execute()
                        results['successful'] += 1
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append(str(e))
                        
            elif operation_type == 'bulk_schedule':
                for schedule_data in data:
                    try:
                        schedule_data['barbershop_id'] = shop_id
                        supabase.table('staff_schedule').insert(schedule_data).execute()
                        results['successful'] += 1
                    except Exception as e:
                        results['failed'] += 1
                        results['errors'].append(str(e))
                        
            # Invalidate relevant cache
            await ShopService.invalidate_cache(shop_id)
            
        except Exception as e:
            logger.error(f"Error in bulk operation: {e}")
            results['errors'].append(str(e))
        
        return results

# Export service
__all__ = ['ShopService']