#!/usr/bin/env python3
"""
AI Behavioral Learning Module
Analyzes customer behavior patterns for intelligent rebooking and personalization
"""

import sqlite3
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict, Counter
import statistics
from dataclasses import dataclass

class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects"""
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

@dataclass
class BookingPattern:
    """Customer booking pattern analysis"""
    avg_days_between_visits: float
    preferred_days_of_week: List[str]
    preferred_times: List[str]
    seasonal_variations: Dict[str, Any]
    frequency_trend: str  # increasing, stable, decreasing

@dataclass
class ServicePreference:
    """Customer service preference analysis"""
    most_frequent_services: List[Dict[str, Any]]
    service_combinations: List[List[str]]
    price_sensitivity: float
    upgrade_propensity: float

@dataclass
class BarberRelationship:
    """Customer-barber relationship analysis"""
    preferred_barbers: Dict[str, float]  # barber_id -> preference score
    satisfaction_scores: Dict[str, float]
    loyalty_score: float
    switching_pattern: str

@dataclass
class CommunicationProfile:
    """Customer communication preference analysis"""
    preferred_channel: str  # sms, email, phone
    optimal_timing: Dict[str, int]  # day_of_week -> hour
    response_patterns: Dict[str, float]
    reminder_preferences: Dict[str, Any]

class CustomerBehaviorAnalyzer:
    """Analyzes customer behavior patterns for personalized experiences"""
    
    def __init__(self):
        self.db_path = 'booking_system.db'
    
    def analyze_customer_behavior(self, customer_id: int) -> Dict[str, Any]:
        """Comprehensive analysis of customer behavior patterns"""
        
        # Get customer appointment history
        appointments = self._get_customer_appointments(customer_id)
        
        if len(appointments) < 2:
            return self._default_behavior_profile(customer_id)
        
        # Analyze different aspects of behavior
        booking_patterns = self._analyze_booking_patterns(appointments)
        service_preferences = self._analyze_service_preferences(appointments)
        barber_relationships = self._analyze_barber_relationships(appointments)
        communication_profile = self._analyze_communication_patterns(customer_id, appointments)
        
        # Calculate overall insights
        behavior_profile = {
            'customer_id': customer_id,
            'booking_patterns': booking_patterns.__dict__,
            'service_preferences': service_preferences.__dict__,
            'barber_relationships': barber_relationships.__dict__,
            'communication_profile': communication_profile.__dict__,
            'predictive_insights': self._generate_predictive_insights(appointments),
            'last_analyzed': datetime.now().isoformat(),
            'confidence_score': self._calculate_confidence_score(appointments)
        }
        
        # Store updated behavior profile
        self._store_behavior_profile(customer_id, behavior_profile)
        
        return behavior_profile
    
    def _get_customer_appointments(self, customer_id: int) -> List[Dict[str, Any]]:
        """Get customer's appointment history with related data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT a.*, s.name as service_name, s.category as service_category,
                   b.display_name as barber_name, l.name as location_name,
                   u.full_name as customer_name, u.phone as customer_phone
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            JOIN barbers b ON a.barber_id = b.id
            JOIN locations l ON a.location_id = l.id
            JOIN users u ON a.customer_id = u.id
            WHERE a.customer_id = ? AND a.status IN ('completed', 'confirmed')
            ORDER BY a.appointment_datetime ASC
        """, (customer_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        appointments = []
        for row in rows:
            appointments.append({
                'id': row[0],
                'customer_id': row[1],
                'barber_id': row[2],
                'service_id': row[3],
                'location_id': row[4],
                'appointment_datetime': datetime.fromisoformat(row[5]),
                'duration': row[6],
                'price': row[7],
                'status': row[8],
                'notes': row[9],
                'service_name': row[13],  # s.name
                'service_category': row[14],  # s.category
                'barber_name': row[15],  # b.display_name
                'location_name': row[16],  # l.name
                'customer_name': row[17],  # u.full_name
                'customer_phone': row[18] # u.phone
            })
        
        return appointments
    
    def _analyze_booking_patterns(self, appointments: List[Dict[str, Any]]) -> BookingPattern:
        """Analyze customer booking timing and frequency patterns"""
        
        # Calculate days between visits
        days_between = []
        for i in range(1, len(appointments)):
            prev_date = appointments[i-1]['appointment_datetime']
            curr_date = appointments[i]['appointment_datetime']
            days_diff = (curr_date - prev_date).days
            days_between.append(days_diff)
        
        avg_days_between = statistics.mean(days_between) if days_between else 30
        
        # Analyze preferred days of week
        day_counts = Counter()
        for apt in appointments:
            day_name = apt['appointment_datetime'].strftime('%A')
            day_counts[day_name] += 1
        
        preferred_days = [day for day, count in day_counts.most_common(3)]
        
        # Analyze preferred times
        hour_counts = Counter()
        for apt in appointments:
            hour = apt['appointment_datetime'].hour
            if 9 <= hour < 12:
                time_slot = "morning"
            elif 12 <= hour < 17:
                time_slot = "afternoon"
            else:
                time_slot = "evening"
            hour_counts[time_slot] += 1
        
        preferred_times = [time for time, count in hour_counts.most_common(2)]
        
        # Analyze seasonal variations
        seasonal_data = defaultdict(list)
        for apt in appointments:
            month = apt['appointment_datetime'].month
            if month in [12, 1, 2]:
                season = "winter"
            elif month in [3, 4, 5]:
                season = "spring"
            elif month in [6, 7, 8]:
                season = "summer"
            else:
                season = "fall"
            seasonal_data[season].append(apt)
        
        seasonal_variations = {}
        for season, season_apts in seasonal_data.items():
            if len(season_apts) > 0:
                avg_price = statistics.mean([apt['price'] for apt in season_apts])
                service_types = Counter([apt['service_name'] for apt in season_apts])
                seasonal_variations[season] = {
                    'avg_price': avg_price,
                    'visit_count': len(season_apts),
                    'top_services': dict(service_types.most_common(3))
                }
        
        # Determine frequency trend
        if len(days_between) >= 3:
            recent_avg = statistics.mean(days_between[-3:])
            early_avg = statistics.mean(days_between[:3])
            if recent_avg < early_avg * 0.8:
                frequency_trend = "increasing"
            elif recent_avg > early_avg * 1.2:
                frequency_trend = "decreasing"
            else:
                frequency_trend = "stable"
        else:
            frequency_trend = "stable"
        
        return BookingPattern(
            avg_days_between_visits=avg_days_between,
            preferred_days_of_week=preferred_days,
            preferred_times=preferred_times,
            seasonal_variations=seasonal_variations,
            frequency_trend=frequency_trend
        )
    
    def _analyze_service_preferences(self, appointments: List[Dict[str, Any]]) -> ServicePreference:
        """Analyze customer service preferences and patterns"""
        
        # Most frequent services
        service_counts = Counter()
        service_prices = defaultdict(list)
        
        for apt in appointments:
            service_counts[apt['service_name']] += 1
            service_prices[apt['service_name']].append(apt['price'])
        
        most_frequent_services = []
        for service, count in service_counts.most_common(5):
            avg_price = statistics.mean(service_prices[service])
            most_frequent_services.append({
                'service_name': service,
                'frequency': count,
                'avg_price': avg_price,
                'last_booked': max([apt['appointment_datetime'] for apt in appointments if apt['service_name'] == service]).isoformat()
            })
        
        # Analyze service combinations (services booked together or in sequence)
        service_combinations = []
        for i in range(len(appointments) - 1):
            curr_service = appointments[i]['service_name']
            next_service = appointments[i + 1]['service_name']
            if curr_service != next_service:
                service_combinations.append([curr_service, next_service])
        
        # Calculate price sensitivity
        prices = [apt['price'] for apt in appointments]
        if len(set(prices)) > 1:
            price_variance = statistics.stdev(prices)
            price_sensitivity = 1.0 - (price_variance / statistics.mean(prices))
        else:
            price_sensitivity = 0.5  # Neutral if all same price
        
        # Calculate upgrade propensity
        price_trend_data = []
        for i in range(1, len(appointments)):
            price_change = appointments[i]['price'] - appointments[i-1]['price']
            price_trend_data.append(price_change)
        
        if price_trend_data:
            avg_price_change = statistics.mean(price_trend_data)
            upgrade_propensity = max(0, min(1, (avg_price_change + 20) / 40))  # Normalize to 0-1
        else:
            upgrade_propensity = 0.5
        
        return ServicePreference(
            most_frequent_services=most_frequent_services,
            service_combinations=service_combinations,
            price_sensitivity=price_sensitivity,
            upgrade_propensity=upgrade_propensity
        )
    
    def _analyze_barber_relationships(self, appointments: List[Dict[str, Any]]) -> BarberRelationship:
        """Analyze customer-barber relationship patterns"""
        
        # Calculate barber preferences based on frequency and recency
        barber_data = defaultdict(list)
        for apt in appointments:
            barber_data[str(apt['barber_id'])].append(apt)
        
        preferred_barbers = {}
        for barber_id, barber_apts in barber_data.items():
            frequency_score = len(barber_apts) / len(appointments)
            
            # Recency bonus - more recent appointments get higher weight
            recency_scores = []
            for apt in barber_apts:
                days_ago = (datetime.now() - apt['appointment_datetime']).days
                recency_score = max(0, 1 - (days_ago / 365))  # Decay over a year
                recency_scores.append(recency_score)
            
            avg_recency = statistics.mean(recency_scores) if recency_scores else 0
            
            # Combined preference score
            preference_score = (frequency_score * 0.7) + (avg_recency * 0.3)
            preferred_barbers[barber_id] = preference_score
        
        # Estimate satisfaction scores (in a real system, this would use actual ratings)
        satisfaction_scores = {}
        for barber_id, barber_apts in barber_data.items():
            # Proxy for satisfaction: repeat bookings and price paid
            repeat_rate = len(barber_apts) / len(appointments)
            avg_price = statistics.mean([apt['price'] for apt in barber_apts])
            overall_avg_price = statistics.mean([apt['price'] for apt in appointments])
            
            # Higher price suggests satisfaction with premium service
            price_satisfaction = min(1.0, avg_price / max(overall_avg_price, 1))
            satisfaction_proxy = (repeat_rate * 0.6) + (price_satisfaction * 0.4)
            satisfaction_scores[barber_id] = min(1.0, satisfaction_proxy)
        
        # Calculate loyalty score
        top_barber_appointments = max([len(apts) for apts in barber_data.values()])
        loyalty_score = top_barber_appointments / len(appointments)
        
        # Determine switching pattern
        unique_barbers = len(barber_data)
        if unique_barbers == 1:
            switching_pattern = "loyal"
        elif unique_barbers >= len(appointments) * 0.7:
            switching_pattern = "explorer"
        else:
            switching_pattern = "selective"
        
        return BarberRelationship(
            preferred_barbers=preferred_barbers,
            satisfaction_scores=satisfaction_scores,
            loyalty_score=loyalty_score,
            switching_pattern=switching_pattern
        )
    
    def _analyze_communication_patterns(self, customer_id: int, appointments: List[Dict[str, Any]]) -> CommunicationProfile:
        """Analyze customer communication preferences"""
        
        # For now, use proxy data from appointment patterns
        # In a real system, this would analyze actual communication interactions
        
        # Infer preferred channel from contact info
        customer_phone = appointments[0].get('customer_phone') if appointments else None
        preferred_channel = "sms" if customer_phone else "email"
        
        # Analyze booking timing to infer optimal communication times
        booking_hours = [apt['appointment_datetime'].hour for apt in appointments]
        optimal_timing = {}
        
        for apt in appointments:
            day_of_week = apt['appointment_datetime'].strftime('%A')
            hour = apt['appointment_datetime'].hour
            if day_of_week not in optimal_timing or abs(hour - 12) < abs(optimal_timing[day_of_week] - 12):
                optimal_timing[day_of_week] = hour
        
        # Response patterns (proxy based on booking consistency)
        response_patterns = {
            'booking_lead_time': statistics.mean([
                (datetime.now() - apt['appointment_datetime']).days 
                for apt in appointments 
                if apt['appointment_datetime'] > datetime.now()
            ]) if any(apt['appointment_datetime'] > datetime.now() for apt in appointments) else 7,
            'cancellation_rate': 0.05,  # Default low rate
            'reschedule_rate': 0.1      # Default low rate
        }
        
        # Reminder preferences based on booking patterns
        reminder_preferences = {
            'advance_notice': 24,  # hours
            'frequency': 'single',
            'method': preferred_channel
        }
        
        return CommunicationProfile(
            preferred_channel=preferred_channel,
            optimal_timing=optimal_timing,
            response_patterns=response_patterns,
            reminder_preferences=reminder_preferences
        )
    
    def _generate_predictive_insights(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate predictive insights for future bookings"""
        
        if len(appointments) < 3:
            return {'next_booking_prediction': None, 'confidence': 'low'}
        
        # Predict next booking date
        days_between = []
        for i in range(1, len(appointments)):
            prev_date = appointments[i-1]['appointment_datetime']
            curr_date = appointments[i]['appointment_datetime']
            days_diff = (curr_date - prev_date).days
            days_between.append(days_diff)
        
        avg_interval = statistics.mean(days_between)
        last_appointment = appointments[-1]['appointment_datetime']
        predicted_next_booking = last_appointment + timedelta(days=avg_interval)
        
        # Predict likely service
        recent_services = [apt['service_name'] for apt in appointments[-3:]]
        service_counter = Counter(recent_services)
        likely_service = service_counter.most_common(1)[0][0]
        
        # Predict likely barber
        recent_barbers = [apt['barber_name'] for apt in appointments[-3:]]
        barber_counter = Counter(recent_barbers)
        likely_barber = barber_counter.most_common(1)[0][0]
        
        # Calculate confidence based on consistency
        service_consistency = service_counter[likely_service] / len(recent_services)
        barber_consistency = barber_counter[likely_barber] / len(recent_barbers)
        interval_consistency = 1 - (statistics.stdev(days_between[-3:]) / avg_interval) if len(days_between) >= 3 else 0.5
        
        overall_confidence = (service_consistency + barber_consistency + interval_consistency) / 3
        
        return {
            'next_booking_prediction': {
                'predicted_date': predicted_next_booking.isoformat(),
                'likely_service': likely_service,
                'likely_barber': likely_barber,
                'confidence_score': overall_confidence
            },
            'churn_risk': self._calculate_churn_risk(appointments),
            'upsell_opportunities': self._identify_upsell_opportunities(appointments),
            'optimal_contact_time': (predicted_next_booking - timedelta(days=3)).isoformat()
        }
    
    def _calculate_churn_risk(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate customer churn risk"""
        
        if len(appointments) < 2:
            return {'risk_level': 'unknown', 'score': 0.5}
        
        # Calculate expected next visit based on pattern
        days_between = []
        for i in range(1, len(appointments)):
            prev_date = appointments[i-1]['appointment_datetime']
            curr_date = appointments[i]['appointment_datetime']
            days_diff = (curr_date - prev_date).days
            days_between.append(days_diff)
        
        avg_interval = statistics.mean(days_between)
        last_appointment = appointments[-1]['appointment_datetime']
        expected_next_visit = last_appointment + timedelta(days=avg_interval)
        days_overdue = (datetime.now() - expected_next_visit).days
        
        # Calculate risk score
        if days_overdue <= 0:
            risk_score = 0.1  # Low risk - not overdue
        elif days_overdue <= avg_interval * 0.5:
            risk_score = 0.3  # Medium-low risk
        elif days_overdue <= avg_interval:
            risk_score = 0.6  # Medium-high risk
        else:
            risk_score = 0.9  # High risk
        
        # Determine risk level
        if risk_score < 0.3:
            risk_level = 'low'
        elif risk_score < 0.6:
            risk_level = 'medium'
        else:
            risk_level = 'high'
        
        return {
            'risk_level': risk_level,
            'score': risk_score,
            'days_overdue': max(0, days_overdue),
            'expected_next_visit': expected_next_visit.isoformat()
        }
    
    def _identify_upsell_opportunities(self, appointments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify potential upsell opportunities"""
        
        opportunities = []
        
        # Analyze service categories
        service_categories = Counter([apt.get('service_category', 'other') for apt in appointments])
        
        # If customer only gets haircuts, suggest add-ons
        if service_categories.get('haircut', 0) > 0 and len(service_categories) == 1:
            opportunities.append({
                'type': 'service_addition',
                'suggestion': 'beard_trim',
                'reason': 'Customers who get haircuts often enjoy beard services',
                'confidence': 0.7
            })
        
        # If customer books frequently, suggest packages
        if len(appointments) >= 6:
            opportunities.append({
                'type': 'package_deal',
                'suggestion': 'monthly_package',
                'reason': 'Frequent customers save with monthly packages',
                'confidence': 0.8
            })
        
        # Price upgrade opportunities
        avg_price = statistics.mean([apt['price'] for apt in appointments])
        recent_avg_price = statistics.mean([apt['price'] for apt in appointments[-3:]])
        
        if recent_avg_price >= avg_price:
            opportunities.append({
                'type': 'premium_service',
                'suggestion': 'premium_cut',
                'reason': 'Spending pattern suggests openness to premium services',
                'confidence': 0.6
            })
        
        return opportunities
    
    def _calculate_confidence_score(self, appointments: List[Dict[str, Any]]) -> float:
        """Calculate overall confidence in behavior analysis"""
        
        # Factors that increase confidence
        data_points = len(appointments)
        time_span_days = (appointments[-1]['appointment_datetime'] - appointments[0]['appointment_datetime']).days
        consistency_factors = []
        
        # Consistency in timing
        if data_points >= 3:
            days_between = []
            for i in range(1, len(appointments)):
                prev_date = appointments[i-1]['appointment_datetime']
                curr_date = appointments[i]['appointment_datetime']
                days_diff = (curr_date - prev_date).days
                days_between.append(days_diff)
            
            if len(days_between) > 1:
                interval_variance = statistics.stdev(days_between) / statistics.mean(days_between)
                consistency_factors.append(1 - min(1, interval_variance))
        
        # Consistency in services
        service_variety = len(set([apt['service_name'] for apt in appointments]))
        service_consistency = 1 - (service_variety / data_points)
        consistency_factors.append(service_consistency)
        
        # Base confidence on data volume
        volume_score = min(1.0, data_points / 10)  # Max confidence at 10+ appointments
        
        # Time span score (more data over longer time = higher confidence)
        time_score = min(1.0, time_span_days / 365)  # Max confidence at 1+ year of data
        
        # Combine factors
        if consistency_factors:
            avg_consistency = statistics.mean(consistency_factors)
            overall_confidence = (volume_score * 0.4) + (time_score * 0.3) + (avg_consistency * 0.3)
        else:
            overall_confidence = (volume_score * 0.6) + (time_score * 0.4)
        
        return min(1.0, overall_confidence)
    
    def _default_behavior_profile(self, customer_id: int) -> Dict[str, Any]:
        """Default behavior profile for new customers"""
        return {
            'customer_id': customer_id,
            'booking_patterns': {
                'avg_days_between_visits': 28,
                'preferred_days_of_week': ['Friday', 'Saturday'],
                'preferred_times': ['afternoon'],
                'seasonal_variations': {},
                'frequency_trend': 'stable'
            },
            'service_preferences': {
                'most_frequent_services': [],
                'service_combinations': [],
                'price_sensitivity': 0.5,
                'upgrade_propensity': 0.5
            },
            'barber_relationships': {
                'preferred_barbers': {},
                'satisfaction_scores': {},
                'loyalty_score': 0.5,
                'switching_pattern': 'new'
            },
            'communication_profile': {
                'preferred_channel': 'sms',
                'optimal_timing': {'Friday': 14, 'Saturday': 10},
                'response_patterns': {'booking_lead_time': 7},
                'reminder_preferences': {'advance_notice': 24, 'frequency': 'single', 'method': 'sms'}
            },
            'predictive_insights': {
                'next_booking_prediction': None,
                'churn_risk': {'risk_level': 'unknown', 'score': 0.5},
                'upsell_opportunities': []
            },
            'last_analyzed': datetime.now().isoformat(),
            'confidence_score': 0.1
        }
    
    def _store_behavior_profile(self, customer_id: int, behavior_profile: Dict[str, Any]):
        """Store behavior profile in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Convert profile to JSON strings for storage using custom encoder
        barber_preferences = json.dumps(behavior_profile['barber_relationships']['preferred_barbers'], cls=DateTimeEncoder)
        service_patterns = json.dumps(behavior_profile['service_preferences'], cls=DateTimeEncoder)
        timing_preferences = json.dumps(behavior_profile['booking_patterns'], cls=DateTimeEncoder)
        communication_preferences = json.dumps(behavior_profile['communication_profile'], cls=DateTimeEncoder)
        booking_behavior = json.dumps(behavior_profile['predictive_insights'], cls=DateTimeEncoder)
        seasonal_patterns = json.dumps(behavior_profile['booking_patterns']['seasonal_variations'], cls=DateTimeEncoder)
        
        cursor.execute("""
            INSERT OR REPLACE INTO customer_behavior 
            (customer_id, barber_preferences, service_patterns, timing_preferences, 
             communication_preferences, booking_behavior, seasonal_patterns, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (customer_id, barber_preferences, service_patterns, timing_preferences,
              communication_preferences, booking_behavior, seasonal_patterns))
        
        conn.commit()
        conn.close()
    
    def get_rebooking_suggestion(self, customer_id: int) -> Optional[Dict[str, Any]]:
        """Generate intelligent rebooking suggestion for customer"""
        
        behavior_profile = self.analyze_customer_behavior(customer_id)
        
        if not behavior_profile['predictive_insights']['next_booking_prediction']:
            return None
        
        prediction = behavior_profile['predictive_insights']['next_booking_prediction']
        
        # Generate personalized message
        likely_service = prediction['likely_service']
        likely_barber = prediction['likely_barber']
        predicted_date = datetime.fromisoformat(prediction['predicted_date'])
        
        # Format date in a friendly way
        days_until = (predicted_date - datetime.now()).days
        if days_until <= 0:
            date_phrase = "now"
        elif days_until <= 3:
            date_phrase = f"in {days_until} days"
        elif days_until <= 7:
            date_phrase = "next week"
        else:
            date_phrase = f"in {days_until} days"
        
        # Create personalized message
        avg_days = behavior_profile['booking_patterns']['avg_days_between_visits']
        message = f"Hey! It's been about {int(avg_days)} days since your last {likely_service} with {likely_barber}. Ready to book again {date_phrase}?"
        
        return {
            'customer_id': customer_id,
            'message': message,
            'suggested_service': likely_service,
            'suggested_barber': likely_barber,
            'suggested_date': predicted_date.isoformat(),
            'confidence': prediction['confidence_score'],
            'optimal_contact_time': behavior_profile['predictive_insights']['optimal_contact_time']
        }

# Initialize analyzer instance
behavior_analyzer = CustomerBehaviorAnalyzer()