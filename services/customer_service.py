"""
Customer Management Service
Handles customer profiles, preferences, history, and loyalty programs
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import logging
import hashlib
import json

logger = logging.getLogger(__name__)

class CustomerService:
    """
    Comprehensive customer management service
    """
    
    def __init__(self, supabase_client=None):
        """Initialize customer service with database client"""
        self.supabase = supabase_client
        self.loyalty_tiers = self._initialize_loyalty_tiers()
    
    def _initialize_loyalty_tiers(self) -> Dict:
        """Initialize loyalty program tiers and benefits"""
        return {
            "bronze": {
                "min_points": 0,
                "max_points": 499,
                "benefits": {
                    "discount_percentage": 0,
                    "priority_booking": False,
                    "free_services_per_year": 0,
                    "birthday_discount": 10
                }
            },
            "silver": {
                "min_points": 500,
                "max_points": 1499,
                "benefits": {
                    "discount_percentage": 5,
                    "priority_booking": False,
                    "free_services_per_year": 1,
                    "birthday_discount": 15
                }
            },
            "gold": {
                "min_points": 1500,
                "max_points": 2999,
                "benefits": {
                    "discount_percentage": 10,
                    "priority_booking": True,
                    "free_services_per_year": 2,
                    "birthday_discount": 20,
                    "exclusive_barber_access": True
                }
            },
            "platinum": {
                "min_points": 3000,
                "max_points": None,
                "benefits": {
                    "discount_percentage": 15,
                    "priority_booking": True,
                    "free_services_per_year": 4,
                    "birthday_discount": 25,
                    "exclusive_barber_access": True,
                    "vip_events": True,
                    "complimentary_products": True
                }
            }
        }
    
    async def create_customer_profile(self, customer_data: Dict) -> Dict:
        """
        Create a new customer profile with preferences
        """
        try:
            # Generate customer ID if not provided
            if 'id' not in customer_data:
                customer_data['id'] = self._generate_customer_id(customer_data.get('email', ''))
            
            # Initialize profile data
            profile = {
                'id': customer_data['id'],
                'email': customer_data['email'],
                'phone': customer_data.get('phone', ''),
                'first_name': customer_data.get('first_name', ''),
                'last_name': customer_data.get('last_name', ''),
                'date_of_birth': customer_data.get('date_of_birth'),
                'gender': customer_data.get('gender'),
                'preferences': self._initialize_preferences(customer_data.get('preferences', {})),
                'loyalty_points': 0,
                'loyalty_tier': 'bronze',
                'total_spent': 0,
                'visit_count': 0,
                'last_visit': None,
                'first_visit': datetime.now().isoformat(),
                'average_rating_given': None,
                'tags': customer_data.get('tags', []),
                'notes': customer_data.get('notes', ''),
                'marketing_consent': customer_data.get('marketing_consent', False),
                'sms_consent': customer_data.get('sms_consent', False),
                'email_consent': customer_data.get('email_consent', True),
                'referral_source': customer_data.get('referral_source'),
                'referred_by': customer_data.get('referred_by'),
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            if self.supabase:
                response = self.supabase.table('customers').insert(profile).execute()
                return response.data[0]
            
            return profile
            
        except Exception as e:
            logger.error(f"Error creating customer profile: {str(e)}")
            raise
    
    def _generate_customer_id(self, email: str) -> str:
        """Generate unique customer ID"""
        timestamp = datetime.now().isoformat()
        return hashlib.md5(f"{email}{timestamp}".encode()).hexdigest()[:12]
    
    def _initialize_preferences(self, preferences: Dict) -> Dict:
        """Initialize customer preferences with defaults"""
        return {
            'preferred_barbers': preferences.get('preferred_barbers', []),
            'preferred_services': preferences.get('preferred_services', []),
            'preferred_products': preferences.get('preferred_products', []),
            'preferred_days': preferences.get('preferred_days', []),
            'preferred_times': preferences.get('preferred_times', []),
            'preferred_appointment_duration': preferences.get('preferred_appointment_duration'),
            'hair_type': preferences.get('hair_type'),
            'hair_length': preferences.get('hair_length'),
            'style_preferences': preferences.get('style_preferences', []),
            'allergies': preferences.get('allergies', []),
            'special_requirements': preferences.get('special_requirements', []),
            'reminder_preference': preferences.get('reminder_preference', '24_hours'),
            'communication_preference': preferences.get('communication_preference', 'sms'),
            'language': preferences.get('language', 'en')
        }
    
    async def get_customer_profile(self, customer_id: str) -> Optional[Dict]:
        """
        Retrieve customer profile with full details
        """
        if not self.supabase:
            return None
        
        try:
            response = self.supabase.table('customers').select('*').eq('id', customer_id).execute()
            
            if response.data:
                customer = response.data[0]
                # Enhance with calculated fields
                customer['loyalty_benefits'] = self._get_loyalty_benefits(customer['loyalty_tier'])
                customer['upcoming_appointments'] = await self._get_upcoming_appointments(customer_id)
                customer['recent_services'] = await self._get_recent_services(customer_id)
                customer['favorite_services'] = await self._get_favorite_services(customer_id)
                return customer
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching customer profile: {str(e)}")
            return None
    
    async def update_customer_preferences(self, customer_id: str, preferences: Dict) -> Dict:
        """
        Update customer preferences
        """
        try:
            current_profile = await self.get_customer_profile(customer_id)
            if not current_profile:
                raise ValueError("Customer not found")
            
            # Merge preferences
            updated_preferences = {**current_profile.get('preferences', {}), **preferences}
            
            update_data = {
                'preferences': updated_preferences,
                'updated_at': datetime.now().isoformat()
            }
            
            if self.supabase:
                response = self.supabase.table('customers').update(update_data).eq('id', customer_id).execute()
                return response.data[0]
            
            return {'id': customer_id, **update_data}
            
        except Exception as e:
            logger.error(f"Error updating customer preferences: {str(e)}")
            raise
    
    async def add_loyalty_points(self, customer_id: str, points: int, reason: str) -> Dict:
        """
        Add loyalty points to customer account
        """
        try:
            customer = await self.get_customer_profile(customer_id)
            if not customer:
                raise ValueError("Customer not found")
            
            new_points = customer['loyalty_points'] + points
            new_tier = self._calculate_loyalty_tier(new_points)
            
            # Update customer points and tier
            update_data = {
                'loyalty_points': new_points,
                'loyalty_tier': new_tier,
                'updated_at': datetime.now().isoformat()
            }
            
            if self.supabase:
                # Update customer
                self.supabase.table('customers').update(update_data).eq('id', customer_id).execute()
                
                # Log transaction
                transaction = {
                    'customer_id': customer_id,
                    'points': points,
                    'reason': reason,
                    'balance_after': new_points,
                    'created_at': datetime.now().isoformat()
                }
                self.supabase.table('loyalty_transactions').insert(transaction).execute()
            
            # Check for tier upgrade
            if new_tier != customer['loyalty_tier']:
                await self._handle_tier_change(customer_id, customer['loyalty_tier'], new_tier)
            
            return {
                'customer_id': customer_id,
                'points_added': points,
                'new_balance': new_points,
                'tier': new_tier,
                'tier_changed': new_tier != customer['loyalty_tier']
            }
            
        except Exception as e:
            logger.error(f"Error adding loyalty points: {str(e)}")
            raise
    
    def _calculate_loyalty_tier(self, points: int) -> str:
        """Calculate loyalty tier based on points"""
        for tier_name, tier_config in self.loyalty_tiers.items():
            min_points = tier_config['min_points']
            max_points = tier_config['max_points']
            
            if max_points is None:
                if points >= min_points:
                    return tier_name
            elif min_points <= points <= max_points:
                return tier_name
        
        return 'bronze'
    
    def _get_loyalty_benefits(self, tier: str) -> Dict:
        """Get benefits for a loyalty tier"""
        return self.loyalty_tiers.get(tier, self.loyalty_tiers['bronze'])['benefits']
    
    async def _handle_tier_change(self, customer_id: str, old_tier: str, new_tier: str) -> None:
        """Handle loyalty tier change notifications and benefits"""
        try:
            # Log tier change
            if self.supabase:
                tier_change = {
                    'customer_id': customer_id,
                    'old_tier': old_tier,
                    'new_tier': new_tier,
                    'changed_at': datetime.now().isoformat()
                }
                self.supabase.table('tier_changes').insert(tier_change).execute()
            
            # TODO: Send notification about tier change
            # TODO: Apply new benefits immediately
            
            logger.info(f"Customer {customer_id} upgraded from {old_tier} to {new_tier}")
            
        except Exception as e:
            logger.error(f"Error handling tier change: {str(e)}")
    
    async def get_customer_history(self, customer_id: str, limit: int = 50) -> Dict:
        """
        Get comprehensive customer history
        """
        if not self.supabase:
            return {'appointments': [], 'total_spent': 0, 'services': []}
        
        try:
            # Get appointment history
            appointments = self.supabase.table('appointments').select('*').eq(
                'customer_id', customer_id
            ).order('start_time', desc=True).limit(limit).execute()
            
            # Calculate statistics
            total_spent = sum(apt.get('total_price', 0) for apt in appointments.data)
            total_appointments = len(appointments.data)
            
            # Get service frequency
            service_frequency = {}
            for apt in appointments.data:
                service_id = apt.get('service_id')
                if service_id:
                    service_frequency[service_id] = service_frequency.get(service_id, 0) + 1
            
            # Get barber frequency
            barber_frequency = {}
            for apt in appointments.data:
                barber_id = apt.get('barber_id')
                if barber_id:
                    barber_frequency[barber_id] = barber_frequency.get(barber_id, 0) + 1
            
            # Calculate average days between visits
            if len(appointments.data) > 1:
                dates = [datetime.fromisoformat(apt['start_time']) for apt in appointments.data]
                dates.sort()
                deltas = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                avg_days_between = sum(deltas) / len(deltas) if deltas else 0
            else:
                avg_days_between = 0
            
            return {
                'appointments': appointments.data,
                'total_spent': total_spent,
                'total_appointments': total_appointments,
                'service_frequency': service_frequency,
                'barber_frequency': barber_frequency,
                'avg_days_between_visits': avg_days_between,
                'last_visit': appointments.data[0]['start_time'] if appointments.data else None,
                'customer_since': appointments.data[-1]['start_time'] if appointments.data else None
            }
            
        except Exception as e:
            logger.error(f"Error fetching customer history: {str(e)}")
            return {'appointments': [], 'total_spent': 0}
    
    async def _get_upcoming_appointments(self, customer_id: str) -> List[Dict]:
        """Get customer's upcoming appointments"""
        if not self.supabase:
            return []
        
        try:
            now = datetime.now().isoformat()
            response = self.supabase.table('appointments').select('*').eq(
                'customer_id', customer_id
            ).gte('start_time', now).in_(
                'status', ['confirmed', 'pending']
            ).order('start_time').limit(5).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Error fetching upcoming appointments: {str(e)}")
            return []
    
    async def _get_recent_services(self, customer_id: str) -> List[Dict]:
        """Get customer's recent services"""
        if not self.supabase:
            return []
        
        try:
            response = self.supabase.table('appointments').select(
                'service_id, services(name, category)'
            ).eq(
                'customer_id', customer_id
            ).eq('status', 'completed').order(
                'completed_at', desc=True
            ).limit(10).execute()
            
            return response.data
            
        except Exception as e:
            logger.error(f"Error fetching recent services: {str(e)}")
            return []
    
    async def _get_favorite_services(self, customer_id: str) -> List[Dict]:
        """Get customer's most frequently booked services"""
        if not self.supabase:
            return []
        
        try:
            # Get service frequency from completed appointments
            response = self.supabase.table('appointments').select(
                'service_id'
            ).eq(
                'customer_id', customer_id
            ).eq('status', 'completed').execute()
            
            # Count frequency
            service_counts = {}
            for apt in response.data:
                service_id = apt['service_id']
                service_counts[service_id] = service_counts.get(service_id, 0) + 1
            
            # Sort by frequency and get top 5
            top_services = sorted(service_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Get service details
            favorite_services = []
            for service_id, count in top_services:
                service_response = self.supabase.table('services').select('*').eq('id', service_id).execute()
                if service_response.data:
                    service = service_response.data[0]
                    service['booking_count'] = count
                    favorite_services.append(service)
            
            return favorite_services
            
        except Exception as e:
            logger.error(f"Error fetching favorite services: {str(e)}")
            return []
    
    async def search_customers(self, query: str, filters: Dict = None) -> List[Dict]:
        """
        Search customers with filters
        """
        if not self.supabase:
            return []
        
        try:
            # Start with base query
            search_query = self.supabase.table('customers').select('*')
            
            # Apply text search
            if query:
                search_query = search_query.or_(
                    f"email.ilike.%{query}%,"
                    f"phone.ilike.%{query}%,"
                    f"first_name.ilike.%{query}%,"
                    f"last_name.ilike.%{query}%"
                )
            
            # Apply filters
            if filters:
                if filters.get('loyalty_tier'):
                    search_query = search_query.eq('loyalty_tier', filters['loyalty_tier'])
                
                if filters.get('min_visits'):
                    search_query = search_query.gte('visit_count', filters['min_visits'])
                
                if filters.get('last_visit_after'):
                    search_query = search_query.gte('last_visit', filters['last_visit_after'])
                
                if filters.get('tags'):
                    search_query = search_query.contains('tags', filters['tags'])
            
            response = search_query.limit(50).execute()
            return response.data
            
        except Exception as e:
            logger.error(f"Error searching customers: {str(e)}")
            return []
    
    async def merge_customer_profiles(self, primary_id: str, secondary_id: str) -> Dict:
        """
        Merge two customer profiles (e.g., when duplicate accounts are found)
        """
        try:
            primary = await self.get_customer_profile(primary_id)
            secondary = await self.get_customer_profile(secondary_id)
            
            if not primary or not secondary:
                raise ValueError("One or both customer profiles not found")
            
            # Merge data (primary takes precedence)
            merged_data = {
                'loyalty_points': primary['loyalty_points'] + secondary['loyalty_points'],
                'total_spent': primary['total_spent'] + secondary['total_spent'],
                'visit_count': primary['visit_count'] + secondary['visit_count'],
                'tags': list(set(primary.get('tags', []) + secondary.get('tags', []))),
                'updated_at': datetime.now().isoformat()
            }
            
            # Recalculate tier
            merged_data['loyalty_tier'] = self._calculate_loyalty_tier(merged_data['loyalty_points'])
            
            if self.supabase:
                # Update primary profile
                self.supabase.table('customers').update(merged_data).eq('id', primary_id).execute()
                
                # Transfer appointments
                self.supabase.table('appointments').update(
                    {'customer_id': primary_id}
                ).eq('customer_id', secondary_id).execute()
                
                # Transfer loyalty transactions
                self.supabase.table('loyalty_transactions').update(
                    {'customer_id': primary_id}
                ).eq('customer_id', secondary_id).execute()
                
                # Mark secondary as merged
                self.supabase.table('customers').update(
                    {'status': 'merged', 'merged_into': primary_id}
                ).eq('id', secondary_id).execute()
            
            logger.info(f"Merged customer {secondary_id} into {primary_id}")
            return {'primary_id': primary_id, 'merged_data': merged_data}
            
        except Exception as e:
            logger.error(f"Error merging customer profiles: {str(e)}")
            raise