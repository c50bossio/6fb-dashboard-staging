"""
AI-Powered Optimal Scheduling Service
Provides intelligent booking suggestions to maximize revenue, efficiency, and customer satisfaction
"""

import os
import sqlite3
import json
import logging
import asyncio
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
from collections import defaultdict
import statistics

# AI Provider imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

logger = logging.getLogger(__name__)

class OptimizationGoal(Enum):
    REVENUE = "revenue"
    EFFICIENCY = "efficiency"
    CUSTOMER_SATISFACTION = "customer_satisfaction"
    BALANCED = "balanced"

class TimeSlotPriority(Enum):
    PEAK_DEMAND = "peak_demand"
    HIGH_VALUE = "high_value"
    OPTIMAL_EFFICIENCY = "optimal_efficiency"
    CUSTOMER_PREFERRED = "customer_preferred"

@dataclass
class SchedulingRecommendation:
    """AI-generated scheduling recommendation"""
    recommended_time: datetime
    confidence_score: float
    priority: TimeSlotPriority
    revenue_impact: float
    efficiency_score: float
    reasoning: str
    alternative_slots: List[datetime]
    barber_id: Optional[str] = None
    service_id: Optional[str] = None
    estimated_revenue: float = 0.0
    customer_satisfaction_score: float = 0.0

@dataclass
class BookingPattern:
    """Historical booking pattern data"""
    hour_of_day: int
    day_of_week: int
    service_type: str
    average_revenue: float
    booking_frequency: int
    customer_satisfaction: float
    cancellation_rate: float
    no_show_rate: float
    
@dataclass
class BarberUtilization:
    """Barber utilization analytics"""
    barber_id: str
    barber_name: str
    total_slots: int
    booked_slots: int
    utilization_rate: float
    average_service_duration: float
    average_revenue_per_hour: float
    customer_rating: float
    preferred_services: List[str]

class AISchedulingService:
    """AI-powered scheduling optimization service"""
    
    def __init__(self, db_path: str = "database/agent_system.db"):
        self.db_path = db_path
        self.openai_client = None
        self.anthropic_client = None
        self._init_ai_providers()
        self._init_database()
        
        # Caching for performance
        self._booking_patterns_cache = {}
        self._barber_utilization_cache = {}
        self._last_cache_update = None
        
    def _init_ai_providers(self):
        """Initialize AI providers for intelligent recommendations"""
        if OPENAI_AVAILABLE:
            try:
                openai_key = os.getenv('OPENAI_API_KEY')
                if openai_key:
                    self.openai_client = openai.AsyncOpenAI(api_key=openai_key)
                    logger.info("✅ OpenAI initialized for scheduling AI")
            except Exception as e:
                logger.warning(f"⚠️ OpenAI setup failed: {e}")
        
        if ANTHROPIC_AVAILABLE:
            try:
                anthropic_key = os.getenv('ANTHROPIC_API_KEY')
                if anthropic_key:
                    self.anthropic_client = anthropic.AsyncAnthropic(api_key=anthropic_key)
                    logger.info("✅ Anthropic initialized for scheduling AI")
            except Exception as e:
                logger.warning(f"⚠️ Anthropic setup failed: {e}")
    
    def _init_database(self):
        """Initialize scheduling analytics tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Booking patterns analytics table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS booking_patterns (
                id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                hour_of_day INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL,
                service_type TEXT NOT NULL,
                average_revenue REAL DEFAULT 0.0,
                booking_frequency INTEGER DEFAULT 0,
                customer_satisfaction REAL DEFAULT 0.0,
                cancellation_rate REAL DEFAULT 0.0,
                no_show_rate REAL DEFAULT 0.0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (barbershop_id) REFERENCES barbershops (id)
            )
        ''')
        
        # AI scheduling recommendations log
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS ai_scheduling_recommendations (
                id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                customer_id TEXT,
                service_id TEXT,
                barber_id TEXT,
                recommended_time TIMESTAMP NOT NULL,
                confidence_score REAL NOT NULL,
                priority TEXT NOT NULL,
                revenue_impact REAL DEFAULT 0.0,
                efficiency_score REAL DEFAULT 0.0,
                reasoning TEXT,
                alternative_slots TEXT,
                accepted BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (barbershop_id) REFERENCES barbershops (id)
            )
        ''')
        
        # Barber performance analytics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS barber_performance (
                id TEXT PRIMARY KEY,
                barber_id TEXT NOT NULL,
                barbershop_id TEXT NOT NULL,
                date DATE NOT NULL,
                total_appointments INTEGER DEFAULT 0,
                completed_appointments INTEGER DEFAULT 0,
                total_revenue REAL DEFAULT 0.0,
                average_service_time REAL DEFAULT 0.0,
                customer_rating REAL DEFAULT 0.0,
                utilization_rate REAL DEFAULT 0.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(barber_id, date),
                FOREIGN KEY (barber_id) REFERENCES users (id),
                FOREIGN KEY (barbershop_id) REFERENCES barbershops (id)
            )
        ''')
        
        # Optimal time slots cache
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS optimal_time_slots (
                id TEXT PRIMARY KEY,
                barbershop_id TEXT NOT NULL,
                service_type TEXT NOT NULL,
                day_of_week INTEGER NOT NULL,
                hour_of_day INTEGER NOT NULL,
                revenue_score REAL DEFAULT 0.0,
                efficiency_score REAL DEFAULT 0.0,
                demand_score REAL DEFAULT 0.0,
                overall_score REAL DEFAULT 0.0,
                last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (barbershop_id) REFERENCES barbershops (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    async def get_optimal_scheduling_recommendations(
        self,
        barbershop_id: str,
        service_id: str,
        customer_id: Optional[str] = None,
        barber_id: Optional[str] = None,
        preferred_dates: Optional[List[datetime]] = None,
        optimization_goal: OptimizationGoal = OptimizationGoal.BALANCED,
        limit: int = 5
    ) -> List[SchedulingRecommendation]:
        """
        Generate AI-powered optimal scheduling recommendations
        """
        try:
            # Analyze historical patterns
            booking_patterns = await self._analyze_booking_patterns(barbershop_id, service_id)
            
            # Get barber utilization data
            barber_utilization = await self._analyze_barber_utilization(barbershop_id, barber_id)
            
            # Get current availability
            available_slots = await self._get_available_time_slots(
                barbershop_id, service_id, barber_id, preferred_dates
            )
            
            # Score each available slot
            scored_slots = []
            for slot in available_slots:
                score_data = await self._calculate_slot_score(
                    slot, booking_patterns, barber_utilization, optimization_goal
                )
                scored_slots.append(score_data)
            
            # Sort by overall score and take top recommendations
            scored_slots.sort(key=lambda x: x['overall_score'], reverse=True)
            top_slots = scored_slots[:limit]
            
            # Generate AI reasoning for top recommendations
            recommendations = []
            for slot_data in top_slots:
                reasoning = await self._generate_ai_reasoning(
                    slot_data, booking_patterns, optimization_goal
                )
                
                recommendation = SchedulingRecommendation(
                    recommended_time=slot_data['time'],
                    confidence_score=slot_data['confidence'],
                    priority=self._determine_priority(slot_data),
                    revenue_impact=slot_data['revenue_score'],
                    efficiency_score=slot_data['efficiency_score'],
                    reasoning=reasoning,
                    alternative_slots=[s['time'] for s in scored_slots[limit:limit+3]],
                    barber_id=slot_data.get('barber_id'),
                    service_id=service_id,
                    estimated_revenue=slot_data.get('estimated_revenue', 0.0),
                    customer_satisfaction_score=slot_data.get('satisfaction_score', 0.0)
                )
                recommendations.append(recommendation)
            
            # Log recommendations for learning
            await self._log_recommendations(barbershop_id, recommendations)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating scheduling recommendations: {e}")
            return []
    
    async def _analyze_booking_patterns(
        self, 
        barbershop_id: str, 
        service_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze historical booking patterns using ML techniques"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query historical appointments
            query = '''
                SELECT 
                    strftime('%H', scheduled_at) as hour,
                    strftime('%w', scheduled_at) as day_of_week,
                    s.category as service_type,
                    a.total_amount,
                    a.status,
                    julianday(a.updated_at) - julianday(a.created_at) as booking_lead_time
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.barbershop_id = ?
                AND a.scheduled_at > datetime('now', '-90 days')
            '''
            
            params = [barbershop_id]
            if service_id:
                query += " AND a.service_id = ?"
                params.append(service_id)
                
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            # Process data into patterns
            patterns = {
                'hourly_demand': defaultdict(int),
                'daily_demand': defaultdict(int),
                'service_revenue': defaultdict(list),
                'completion_rates': defaultdict(int),
                'lead_times': [],
                'peak_hours': [],
                'peak_days': []
            }
            
            total_bookings = len(results)
            if total_bookings == 0:
                return self._get_default_patterns()
            
            for row in results:
                hour, day, service_type, revenue, status, lead_time = row
                
                patterns['hourly_demand'][int(hour)] += 1
                patterns['daily_demand'][int(day)] += 1
                patterns['service_revenue'][service_type].append(float(revenue or 0))
                
                if status == 'COMPLETED':
                    patterns['completion_rates'][f"{hour}_{day}"] += 1
                    
                if lead_time:
                    patterns['lead_times'].append(float(lead_time))
            
            # Calculate peak times
            patterns['peak_hours'] = sorted(
                patterns['hourly_demand'].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:3]
            
            patterns['peak_days'] = sorted(
                patterns['daily_demand'].items(),
                key=lambda x: x[1], 
                reverse=True
            )[:3]
            
            # Calculate average lead time
            patterns['avg_lead_time'] = statistics.mean(patterns['lead_times']) if patterns['lead_times'] else 1.0
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error analyzing booking patterns: {e}")
            return self._get_default_patterns()
    
    async def _analyze_barber_utilization(
        self,
        barbershop_id: str,
        barber_id: Optional[str] = None
    ) -> Dict[str, BarberUtilization]:
        """Analyze barber utilization and performance metrics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Query barber performance data
            query = '''
                SELECT 
                    u.id,
                    u.name,
                    COUNT(a.id) as total_appointments,
                    SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed,
                    AVG(s.duration_minutes) as avg_duration,
                    AVG(a.total_amount) as avg_revenue,
                    AVG(COALESCE(rating.value, 4.0)) as avg_rating
                FROM users u
                LEFT JOIN appointments a ON u.id = a.barber_id AND a.scheduled_at > datetime('now', '-30 days')
                LEFT JOIN services s ON a.service_id = s.id
                LEFT JOIN (
                    SELECT barber_id, AVG(rating) as value
                    FROM appointment_ratings
                    GROUP BY barber_id
                ) rating ON u.id = rating.barber_id
                WHERE u.role = 'BARBER'
                AND EXISTS (SELECT 1 FROM barbershop_staff bs WHERE bs.user_id = u.id AND bs.barbershop_id = ?)
            '''
            
            params = [barbershop_id]
            if barber_id:
                query += " AND u.id = ?"
                params.append(barber_id)
                
            query += " GROUP BY u.id, u.name"
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            conn.close()
            
            barber_data = {}
            for row in results:
                b_id, name, total, completed, avg_duration, avg_revenue, avg_rating = row
                
                utilization_rate = (completed / max(total, 1)) if total > 0 else 0.0
                revenue_per_hour = (avg_revenue * 60 / max(avg_duration, 30)) if avg_duration else 0.0
                
                barber_data[b_id] = BarberUtilization(
                    barber_id=b_id,
                    barber_name=name,
                    total_slots=total or 0,
                    booked_slots=completed or 0,
                    utilization_rate=utilization_rate,
                    average_service_duration=avg_duration or 30.0,
                    average_revenue_per_hour=revenue_per_hour,
                    customer_rating=avg_rating or 4.0,
                    preferred_services=await self._get_barber_preferred_services(b_id)
                )
            
            return barber_data
            
        except Exception as e:
            logger.error(f"Error analyzing barber utilization: {e}")
            return {}
    
    async def _get_available_time_slots(
        self,
        barbershop_id: str,
        service_id: str,
        barber_id: Optional[str] = None,
        preferred_dates: Optional[List[datetime]] = None,
        days_ahead: int = 14
    ) -> List[Dict[str, Any]]:
        """Get available time slots within the specified period"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get service duration
            cursor.execute("SELECT duration_minutes FROM services WHERE id = ?", (service_id,))
            duration_result = cursor.fetchone()
            service_duration = duration_result[0] if duration_result else 30
            
            # Get business hours
            cursor.execute("SELECT business_hours FROM barbershops WHERE id = ?", (barbershop_id,))
            hours_result = cursor.fetchone()
            business_hours = json.loads(hours_result[0] if hours_result and hours_result[0] else '{}')
            
            # Default business hours if none set
            default_hours = {
                'monday': {'open': '09:00', 'close': '18:00', 'closed': False},
                'tuesday': {'open': '09:00', 'close': '18:00', 'closed': False},
                'wednesday': {'open': '09:00', 'close': '18:00', 'closed': False},
                'thursday': {'open': '09:00', 'close': '18:00', 'closed': False},
                'friday': {'open': '09:00', 'close': '18:00', 'closed': False},
                'saturday': {'open': '08:00', 'close': '17:00', 'closed': False},
                'sunday': {'open': '10:00', 'close': '16:00', 'closed': False}
            }
            
            for day, hours in default_hours.items():
                if day not in business_hours:
                    business_hours[day] = hours
            
            available_slots = []
            start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            for day_offset in range(days_ahead):
                current_date = start_date + timedelta(days=day_offset)
                day_name = current_date.strftime('%A').lower()
                
                if day_name not in business_hours or business_hours[day_name].get('closed', False):
                    continue
                
                # Skip if not in preferred dates (if specified)
                if preferred_dates and not any(
                    abs((current_date - pref_date).days) <= 1 for pref_date in preferred_dates
                ):
                    continue
                
                day_hours = business_hours[day_name]
                open_time = datetime.strptime(day_hours['open'], '%H:%M').time()
                close_time = datetime.strptime(day_hours['close'], '%H:%M').time()
                
                # Generate 30-minute slots
                current_time = datetime.combine(current_date.date(), open_time)
                end_time = datetime.combine(current_date.date(), close_time)
                
                while current_time + timedelta(minutes=service_duration) <= end_time:
                    # Check if slot is available
                    if await self._is_slot_available(current_time, service_duration, barber_id, barbershop_id):
                        slot_data = {
                            'time': current_time,
                            'duration': service_duration,
                            'barber_id': barber_id,
                            'day_of_week': current_time.weekday(),
                            'hour_of_day': current_time.hour
                        }
                        available_slots.append(slot_data)
                    
                    current_time += timedelta(minutes=30)
            
            conn.close()
            return available_slots
            
        except Exception as e:
            logger.error(f"Error getting available time slots: {e}")
            return []
    
    async def _calculate_slot_score(
        self,
        slot_data: Dict[str, Any],
        booking_patterns: Dict[str, Any],
        barber_utilization: Dict[str, BarberUtilization],
        optimization_goal: OptimizationGoal
    ) -> Dict[str, Any]:
        """Calculate comprehensive score for a time slot"""
        try:
            slot_time = slot_data['time']
            hour = slot_time.hour
            day_of_week = slot_time.weekday()
            barber_id = slot_data.get('barber_id')
            
            # Revenue score based on historical data
            hourly_demand = booking_patterns.get('hourly_demand', {})
            total_demand = sum(hourly_demand.values()) or 1
            demand_ratio = hourly_demand.get(hour, 0) / total_demand
            revenue_score = demand_ratio * 100
            
            # Efficiency score based on barber utilization
            efficiency_score = 50.0  # Default
            if barber_id and barber_id in barber_utilization:
                barber = barber_utilization[barber_id]
                efficiency_score = (barber.utilization_rate * 40) + (barber.customer_rating * 10)
            
            # Customer satisfaction score based on historical patterns
            peak_hours = [hour for hour, count in booking_patterns.get('peak_hours', [])]
            satisfaction_score = 80.0 if hour in peak_hours else 60.0
            
            # Time preference penalties/bonuses
            time_bonus = 0.0
            if 9 <= hour <= 11:  # Morning premium
                time_bonus += 10.0
            elif 14 <= hour <= 16:  # Afternoon premium
                time_bonus += 15.0
            elif hour < 9 or hour > 17:  # Early/late penalty
                time_bonus -= 20.0
            
            # Weekend bonus
            if day_of_week in [5, 6]:  # Saturday, Sunday
                time_bonus += 10.0
            
            # Calculate overall score based on optimization goal
            if optimization_goal == OptimizationGoal.REVENUE:
                overall_score = revenue_score * 0.7 + efficiency_score * 0.2 + satisfaction_score * 0.1
            elif optimization_goal == OptimizationGoal.EFFICIENCY:
                overall_score = efficiency_score * 0.7 + revenue_score * 0.2 + satisfaction_score * 0.1
            elif optimization_goal == OptimizationGoal.CUSTOMER_SATISFACTION:
                overall_score = satisfaction_score * 0.7 + revenue_score * 0.15 + efficiency_score * 0.15
            else:  # BALANCED
                overall_score = (revenue_score + efficiency_score + satisfaction_score) / 3
            
            overall_score += time_bonus
            
            # Calculate confidence based on data availability
            confidence = min(100.0, (len(booking_patterns.get('hourly_demand', {})) / 24) * 100)
            
            return {
                'time': slot_time,
                'revenue_score': revenue_score,
                'efficiency_score': efficiency_score,
                'satisfaction_score': satisfaction_score,
                'overall_score': max(0, overall_score),
                'confidence': confidence,
                'barber_id': barber_id,
                'estimated_revenue': self._estimate_slot_revenue(slot_data, booking_patterns)
            }
            
        except Exception as e:
            logger.error(f"Error calculating slot score: {e}")
            return {
                'time': slot_data['time'],
                'revenue_score': 50.0,
                'efficiency_score': 50.0,
                'satisfaction_score': 50.0,
                'overall_score': 50.0,
                'confidence': 50.0,
                'barber_id': slot_data.get('barber_id'),
                'estimated_revenue': 0.0
            }
    
    async def _generate_ai_reasoning(
        self,
        slot_data: Dict[str, Any],
        booking_patterns: Dict[str, Any],
        optimization_goal: OptimizationGoal
    ) -> str:
        """Generate AI-powered reasoning for scheduling recommendations"""
        try:
            if not (self.openai_client or self.anthropic_client):
                return self._generate_rule_based_reasoning(slot_data, booking_patterns, optimization_goal)
            
            slot_time = slot_data['time']
            context = f"""
            Time Slot: {slot_time.strftime('%A, %B %d at %I:%M %p')}
            Revenue Score: {slot_data['revenue_score']:.1f}/100
            Efficiency Score: {slot_data['efficiency_score']:.1f}/100
            Customer Satisfaction Score: {slot_data['satisfaction_score']:.1f}/100
            Overall Score: {slot_data['overall_score']:.1f}/100
            
            Historical Data:
            - Peak booking hours: {booking_patterns.get('peak_hours', [])}
            - Average lead time: {booking_patterns.get('avg_lead_time', 1.0)} days
            - Optimization goal: {optimization_goal.value}
            
            Generate a brief, customer-friendly explanation for why this time slot is recommended.
            Focus on the benefits and include specific reasons based on the data.
            Keep it under 100 words and make it actionable.
            """
            
            if self.anthropic_client:
                response = await self.anthropic_client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=150,
                    messages=[{
                        "role": "user",
                        "content": context
                    }]
                )
                return response.content[0].text.strip()
            
            elif self.openai_client:
                response = await self.openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    max_tokens=150,
                    messages=[{
                        "role": "user",
                        "content": context
                    }]
                )
                return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating AI reasoning: {e}")
            return self._generate_rule_based_reasoning(slot_data, booking_patterns, optimization_goal)
    
    def _generate_rule_based_reasoning(
        self,
        slot_data: Dict[str, Any],
        booking_patterns: Dict[str, Any],
        optimization_goal: OptimizationGoal
    ) -> str:
        """Generate rule-based reasoning when AI providers are not available"""
        slot_time = slot_data['time']
        hour = slot_time.hour
        day_name = slot_time.strftime('%A')
        
        reasons = []
        
        # Time-based reasoning
        if 9 <= hour <= 11:
            reasons.append("morning appointment with high availability")
        elif 14 <= hour <= 16:
            reasons.append("popular afternoon slot with good revenue potential")
        elif hour < 9:
            reasons.append("early morning slot ideal for busy schedules")
        elif hour > 17:
            reasons.append("evening appointment perfect for after-work convenience")
        
        # Day-based reasoning
        if slot_time.weekday() in [5, 6]:
            reasons.append("weekend slot with premium demand")
        else:
            reasons.append("weekday appointment with reliable availability")
        
        # Goal-based reasoning
        if optimization_goal == OptimizationGoal.REVENUE:
            reasons.append("optimized for maximum revenue generation")
        elif optimization_goal == OptimizationGoal.EFFICIENCY:
            reasons.append("designed for optimal scheduling efficiency")
        elif optimization_goal == OptimizationGoal.CUSTOMER_SATISFACTION:
            reasons.append("selected for highest customer satisfaction")
        else:
            reasons.append("balanced for optimal overall experience")
        
        base_reason = f"Recommended {day_name} at {slot_time.strftime('%I:%M %p')} - "
        return base_reason + ", ".join(reasons[:2]) + "."
    
    async def _is_slot_available(
        self,
        slot_time: datetime,
        duration_minutes: int,
        barber_id: Optional[str],
        barbershop_id: str
    ) -> bool:
        """Check if a time slot is available"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check for conflicting appointments
            query = '''
                SELECT COUNT(*) FROM appointments
                WHERE barbershop_id = ?
                AND status IN ('PENDING', 'CONFIRMED')
                AND (
                    (scheduled_at <= ? AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') > ?) OR
                    (scheduled_at < ? AND datetime(scheduled_at, '+' || duration_minutes || ' minutes') >= ?)
                )
            '''
            
            end_time = slot_time + timedelta(minutes=duration_minutes)
            params = [barbershop_id, slot_time, slot_time, end_time, end_time]
            
            if barber_id:
                query += " AND barber_id = ?"
                params.append(barber_id)
            
            cursor.execute(query, params)
            conflict_count = cursor.fetchone()[0]
            conn.close()
            
            return conflict_count == 0
            
        except Exception as e:
            logger.error(f"Error checking slot availability: {e}")
            return False
    
    def _determine_priority(self, slot_data: Dict[str, Any]) -> TimeSlotPriority:
        """Determine priority level for a time slot"""
        overall_score = slot_data['overall_score']
        revenue_score = slot_data['revenue_score']
        efficiency_score = slot_data['efficiency_score']
        
        if overall_score >= 80:
            if revenue_score >= 70:
                return TimeSlotPriority.HIGH_VALUE
            elif efficiency_score >= 70:
                return TimeSlotPriority.OPTIMAL_EFFICIENCY
            else:
                return TimeSlotPriority.PEAK_DEMAND
        else:
            return TimeSlotPriority.CUSTOMER_PREFERRED
    
    def _estimate_slot_revenue(
        self,
        slot_data: Dict[str, Any],
        booking_patterns: Dict[str, Any]
    ) -> float:
        """Estimate potential revenue for a time slot"""
        # This would typically use historical data and service pricing
        # For now, returning a calculated estimate based on patterns
        base_revenue = 50.0  # Base service price
        
        hour = slot_data['time'].hour
        hourly_demand = booking_patterns.get('hourly_demand', {})
        
        if hourly_demand:
            total_demand = sum(hourly_demand.values())
            hour_demand_ratio = hourly_demand.get(hour, 0) / max(total_demand, 1)
            revenue_multiplier = 1.0 + (hour_demand_ratio * 0.5)  # Up to 50% increase
            base_revenue *= revenue_multiplier
        
        return round(base_revenue, 2)
    
    async def _get_barber_preferred_services(self, barber_id: str) -> List[str]:
        """Get barber's preferred/most common services"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT s.category, COUNT(*) as frequency
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.barber_id = ?
                AND a.scheduled_at > datetime('now', '-90 days')
                GROUP BY s.category
                ORDER BY frequency DESC
                LIMIT 3
            ''', (barber_id,))
            
            results = cursor.fetchall()
            conn.close()
            
            return [category for category, _ in results]
            
        except Exception as e:
            logger.error(f"Error getting barber preferred services: {e}")
            return []
    
    async def _log_recommendations(
        self,
        barbershop_id: str,
        recommendations: List[SchedulingRecommendation]
    ):
        """Log recommendations for machine learning and improvement"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for rec in recommendations:
                rec_id = f"rec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{rec.recommended_time.strftime('%H%M')}"
                
                cursor.execute('''
                    INSERT INTO ai_scheduling_recommendations
                    (id, barbershop_id, service_id, barber_id, recommended_time, 
                     confidence_score, priority, revenue_impact, efficiency_score, reasoning,
                     alternative_slots)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    rec_id,
                    barbershop_id,
                    rec.service_id,
                    rec.barber_id,
                    rec.recommended_time,
                    rec.confidence_score,
                    rec.priority.value,
                    rec.revenue_impact,
                    rec.efficiency_score,
                    rec.reasoning,
                    json.dumps([alt.isoformat() for alt in rec.alternative_slots])
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging recommendations: {e}")
    
    def _get_default_patterns(self) -> Dict[str, Any]:
        """Return default booking patterns when no historical data is available"""
        return {
            'hourly_demand': {9: 5, 10: 8, 11: 10, 12: 6, 13: 4, 14: 12, 15: 15, 16: 10, 17: 6},
            'daily_demand': {0: 8, 1: 12, 2: 10, 3: 11, 4: 15, 5: 20, 6: 15},
            'service_revenue': {'haircut': [35.0, 45.0, 55.0], 'grooming': [25.0, 30.0]},
            'completion_rates': {},
            'lead_times': [1.0, 2.0, 3.0],
            'peak_hours': [(14, 15), (15, 15), (10, 10)],
            'peak_days': [(5, 20), (1, 12), (4, 15)],
            'avg_lead_time': 2.0
        }
    
    async def analyze_scheduling_performance(
        self,
        barbershop_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Analyze the performance of AI scheduling recommendations"""
        try:
            if not start_date:
                start_date = datetime.now() - timedelta(days=30)
            if not end_date:
                end_date = datetime.now()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get recommendation acceptance rate
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_recommendations,
                    SUM(CASE WHEN accepted = 1 THEN 1 ELSE 0 END) as accepted_recommendations,
                    AVG(confidence_score) as avg_confidence,
                    AVG(revenue_impact) as avg_revenue_impact
                FROM ai_scheduling_recommendations
                WHERE barbershop_id = ?
                AND created_at BETWEEN ? AND ?
            ''', (barbershop_id, start_date, end_date))
            
            performance_data = cursor.fetchone()
            conn.close()
            
            if performance_data and performance_data[0] > 0:
                total, accepted, avg_confidence, avg_revenue = performance_data
                acceptance_rate = (accepted / total) * 100 if total > 0 else 0
                
                return {
                    'total_recommendations': total,
                    'accepted_recommendations': accepted,
                    'acceptance_rate': round(acceptance_rate, 2),
                    'avg_confidence_score': round(avg_confidence or 0, 2),
                    'avg_revenue_impact': round(avg_revenue or 0, 2),
                    'performance_grade': self._calculate_performance_grade(acceptance_rate, avg_confidence or 0)
                }
            else:
                return {
                    'total_recommendations': 0,
                    'accepted_recommendations': 0,
                    'acceptance_rate': 0,
                    'avg_confidence_score': 0,
                    'avg_revenue_impact': 0,
                    'performance_grade': 'No Data'
                }
            
        except Exception as e:
            logger.error(f"Error analyzing scheduling performance: {e}")
            return {'error': str(e)}
    
    def _calculate_performance_grade(self, acceptance_rate: float, confidence_score: float) -> str:
        """Calculate performance grade based on metrics"""
        combined_score = (acceptance_rate + confidence_score) / 2
        
        if combined_score >= 90:
            return 'A+'
        elif combined_score >= 80:
            return 'A'
        elif combined_score >= 70:
            return 'B+'
        elif combined_score >= 60:
            return 'B'
        elif combined_score >= 50:
            return 'C'
        else:
            return 'D'

# Initialize service instance
ai_scheduling_service = AISchedulingService()

if __name__ == "__main__":
    # Example usage
    async def test_scheduling():
        service = AISchedulingService()
        
        # Test getting recommendations
        recommendations = await service.get_optimal_scheduling_recommendations(
            barbershop_id="barbershop_123",
            service_id="haircut_premium",
            optimization_goal=OptimizationGoal.BALANCED,
            limit=5
        )
        
        print("AI Scheduling Recommendations:")
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec.recommended_time.strftime('%A, %B %d at %I:%M %p')}")
            print(f"   Confidence: {rec.confidence_score:.1f}%")
            print(f"   Priority: {rec.priority.value}")
            print(f"   Revenue Impact: ${rec.revenue_impact:.2f}")
            print(f"   Reasoning: {rec.reasoning}")
        
        # Test performance analysis
        performance = await service.analyze_scheduling_performance("barbershop_123")
        print(f"\nScheduling AI Performance: {performance}")
    
    asyncio.run(test_scheduling())