#!/usr/bin/env python3
"""
Booking Intelligence Service
Provides smart booking recommendations, history tracking, and personalized rebooking
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import uuid
import asyncio
from .ai_booking_intelligence import AIBookingIntelligence

@dataclass
class BookingPreference:
    """Customer booking preferences derived from history"""
    customer_id: str
    preferred_barbers: List[str]  # List of barber IDs
    preferred_services: List[str]  # List of service IDs  
    preferred_times: List[str]    # List of preferred time slots (e.g., "10:00", "14:30")
    preferred_days: List[int]     # List of preferred days (0=Monday, 6=Sunday)
    average_booking_frequency: int  # Days between bookings
    last_booking_date: Optional[str]
    total_bookings: int
    favorite_barbershop: Optional[str]
    notes_patterns: List[str]     # Common request patterns
    created_at: str
    updated_at: str

@dataclass
class SmartRecommendation:
    """AI-powered booking recommendation"""
    recommendation_id: str
    customer_id: str
    recommendation_type: str  # "next_appointment", "preferred_time", "new_service"
    title: str
    description: str
    suggested_barber_id: Optional[str]
    suggested_service_id: Optional[str]
    suggested_datetime: Optional[str]
    confidence_score: float  # 0.0 to 1.0
    reasoning: str
    created_at: str

@dataclass
class BookingPattern:
    """Identified patterns in customer booking behavior"""
    pattern_id: str
    customer_id: str
    pattern_type: str  # "frequency", "service_progression", "seasonal", "time_preference"
    pattern_data: Dict[str, Any]
    confidence: float
    detected_at: str

class BookingIntelligenceService:
    """Service for booking intelligence, history tracking, and smart recommendations"""
    
    def __init__(self, db_path: str = "booking_intelligence.db"):
        self.db_path = db_path
        self.ai_intelligence = AIBookingIntelligence()
        self.init_database()
    
    def init_database(self):
        """Initialize SQLite database with intelligence tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Booking preferences table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS booking_preferences (
                customer_id TEXT PRIMARY KEY,
                preferred_barbers TEXT,  -- JSON array
                preferred_services TEXT, -- JSON array
                preferred_times TEXT,    -- JSON array
                preferred_days TEXT,     -- JSON array
                average_booking_frequency INTEGER,
                last_booking_date TEXT,
                total_bookings INTEGER DEFAULT 0,
                favorite_barbershop TEXT,
                notes_patterns TEXT,     -- JSON array
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        # Smart recommendations table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS smart_recommendations (
                recommendation_id TEXT PRIMARY KEY,
                customer_id TEXT,
                recommendation_type TEXT,
                title TEXT,
                description TEXT,
                suggested_barber_id TEXT,
                suggested_service_id TEXT,
                suggested_datetime TEXT,
                confidence_score REAL,
                reasoning TEXT,
                is_viewed BOOLEAN DEFAULT FALSE,
                is_accepted BOOLEAN DEFAULT FALSE,
                created_at TEXT,
                expires_at TEXT
            )
        ''')
        
        # Booking patterns table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS booking_patterns (
                pattern_id TEXT PRIMARY KEY,
                customer_id TEXT,
                pattern_type TEXT,
                pattern_data TEXT,  -- JSON
                confidence REAL,
                detected_at TEXT
            )
        ''')
        
        # Booking history (denormalized for analytics)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS booking_history (
                booking_id TEXT PRIMARY KEY,
                customer_id TEXT,
                customer_name TEXT,
                customer_email TEXT,
                barbershop_id TEXT,
                barbershop_name TEXT,
                barber_id TEXT,
                barber_name TEXT,
                service_id TEXT,
                service_name TEXT,
                service_category TEXT,
                scheduled_at TEXT,
                duration_minutes INTEGER,
                price REAL,
                status TEXT,
                customer_notes TEXT,
                created_at TEXT,
                completed_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def track_booking(self, booking_data: Dict[str, Any]) -> bool:
        """Track a new booking in the history and update preferences"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Store in booking history
            booking_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO booking_history (
                    booking_id, customer_id, customer_name, customer_email,
                    barbershop_id, barbershop_name, barber_id, barber_name,
                    service_id, service_name, service_category, scheduled_at,
                    duration_minutes, price, status, customer_notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                booking_id,
                booking_data.get('customer_id'),
                booking_data.get('customer_name'),
                booking_data.get('customer_email'),
                booking_data.get('barbershop_id'),
                booking_data.get('barbershop_name'),
                booking_data.get('barber_id'),
                booking_data.get('barber_name'),
                booking_data.get('service_id'),
                booking_data.get('service_name'),
                booking_data.get('service_category'),
                booking_data.get('scheduled_at'),
                booking_data.get('duration_minutes'),
                booking_data.get('price'),
                booking_data.get('status', 'confirmed'),
                booking_data.get('customer_notes'),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            
            # Update customer preferences
            self._update_customer_preferences(booking_data['customer_id'])
            
            # Generate new recommendations
            self._generate_smart_recommendations(booking_data['customer_id'])
            
            conn.close()
            return True
            
        except Exception as e:
            print(f"Error tracking booking: {e}")
            return False
    
    def get_customer_preferences(self, customer_id: str) -> Optional[BookingPreference]:
        """Get customer preferences"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM booking_preferences WHERE customer_id = ?
            ''', (customer_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return None
            
            return BookingPreference(
                customer_id=row[0],
                preferred_barbers=json.loads(row[1] or '[]'),
                preferred_services=json.loads(row[2] or '[]'),
                preferred_times=json.loads(row[3] or '[]'),
                preferred_days=json.loads(row[4] or '[]'),
                average_booking_frequency=row[5] or 30,
                last_booking_date=row[6],
                total_bookings=row[7] or 0,
                favorite_barbershop=row[8],
                notes_patterns=json.loads(row[9] or '[]'),
                created_at=row[10],
                updated_at=row[11]
            )
            
        except Exception as e:
            print(f"Error getting customer preferences: {e}")
            return None
    
    def get_smart_recommendations(self, customer_id: str, limit: int = 5, use_ai: bool = True) -> List[SmartRecommendation]:
        """Get active smart recommendations for customer (AI-powered when available)"""
        try:
            recommendations = []
            
            # Try to get AI-powered recommendations first
            if use_ai:
                try:
                    booking_history = self.get_booking_history(customer_id, limit=20)
                    if booking_history:
                        # Run AI recommendations asynchronously
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        ai_recommendations = loop.run_until_complete(
                            self.ai_intelligence.generate_smart_recommendations(customer_id, booking_history)
                        )
                        loop.close()
                        
                        # Convert AI recommendations to SmartRecommendation format
                        for ai_rec in ai_recommendations:
                            rec = SmartRecommendation(
                                recommendation_id=ai_rec.recommendation_id,
                                customer_id=ai_rec.customer_id,
                                recommendation_type=ai_rec.recommendation_type,
                                title=ai_rec.title,
                                description=ai_rec.description,
                                suggested_barber_id=None,  # AI doesn't specify specific IDs yet
                                suggested_service_id=None,
                                suggested_datetime=None,
                                confidence_score=ai_rec.confidence_score,
                                reasoning=ai_rec.reasoning,
                                created_at=ai_rec.generated_at
                            )
                            recommendations.append(rec)
                        
                        if recommendations:
                            return recommendations[:limit]
                            
                except Exception as ai_error:
                    print(f"AI recommendations failed, falling back to rule-based: {ai_error}")
            
            # Fallback to rule-based recommendations
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM smart_recommendations 
                WHERE customer_id = ? AND expires_at > ?
                ORDER BY confidence_score DESC, created_at DESC
                LIMIT ?
            ''', (customer_id, datetime.now().isoformat(), limit))
            
            for row in cursor.fetchall():
                recommendations.append(SmartRecommendation(
                    recommendation_id=row[0],
                    customer_id=row[1],
                    recommendation_type=row[2],
                    title=row[3],
                    description=row[4],
                    suggested_barber_id=row[5],
                    suggested_service_id=row[6],
                    suggested_datetime=row[7],
                    confidence_score=row[8],
                    reasoning=row[9],
                    created_at=row[12]
                ))
            
            conn.close()
            return recommendations
            
        except Exception as e:
            print(f"Error getting recommendations: {e}")
            return []
    
    def get_booking_history(self, customer_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get customer booking history"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM booking_history 
                WHERE customer_id = ?
                ORDER BY scheduled_at DESC
                LIMIT ?
            ''', (customer_id, limit))
            
            history = []
            columns = [description[0] for description in cursor.description]
            
            for row in cursor.fetchall():
                history.append(dict(zip(columns, row)))
            
            conn.close()
            return history
            
        except Exception as e:
            print(f"Error getting booking history: {e}")
            return []
    
    def suggest_rebooking(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """Suggest optimal rebooking based on customer preferences and history"""
        preferences = self.get_customer_preferences(customer_id)
        if not preferences:
            return None
        
        # Calculate suggested next appointment date
        if preferences.last_booking_date:
            last_booking = datetime.fromisoformat(preferences.last_booking_date)
            suggested_date = last_booking + timedelta(days=preferences.average_booking_frequency)
        else:
            suggested_date = datetime.now() + timedelta(days=7)  # Default to 1 week
        
        # Find preferred time slot
        preferred_time = "10:00"  # Default
        if preferences.preferred_times:
            preferred_time = preferences.preferred_times[0]
        
        # Combine date and time
        suggested_datetime = suggested_date.replace(
            hour=int(preferred_time.split(':')[0]),
            minute=int(preferred_time.split(':')[1]),
            second=0,
            microsecond=0
        )
        
        return {
            'customer_id': customer_id,
            'suggested_datetime': suggested_datetime.isoformat(),
            'preferred_barber_id': preferences.preferred_barbers[0] if preferences.preferred_barbers else None,
            'preferred_service_id': preferences.preferred_services[0] if preferences.preferred_services else None,
            'confidence': 0.8 if preferences.total_bookings > 3 else 0.5,
            'reasoning': f"Based on your booking history of {preferences.total_bookings} appointments, "
                        f"with an average frequency of {preferences.average_booking_frequency} days"
        }
    
    def analyze_booking_patterns(self, customer_id: str) -> List[BookingPattern]:
        """Analyze customer booking patterns"""
        history = self.get_booking_history(customer_id, limit=50)
        if len(history) < 2:
            return []
        
        patterns = []
        
        # Time preference pattern
        time_counts = {}
        for booking in history:
            if booking['scheduled_at']:
                booking_time = datetime.fromisoformat(booking['scheduled_at'])
                hour = booking_time.hour
                time_counts[hour] = time_counts.get(hour, 0) + 1
        
        if time_counts:
            most_common_hour = max(time_counts, key=time_counts.get)
            confidence = time_counts[most_common_hour] / len(history)
            
            if confidence > 0.4:  # If more than 40% of bookings at same hour
                patterns.append(BookingPattern(
                    pattern_id=str(uuid.uuid4()),
                    customer_id=customer_id,
                    pattern_type="time_preference",
                    pattern_data={
                        "preferred_hour": most_common_hour,
                        "frequency": time_counts[most_common_hour],
                        "percentage": confidence
                    },
                    confidence=confidence,
                    detected_at=datetime.now().isoformat()
                ))
        
        # Service progression pattern
        services = [booking['service_name'] for booking in history if booking['service_name']]
        if len(set(services)) > 1:
            # Customer tries different services
            patterns.append(BookingPattern(
                pattern_id=str(uuid.uuid4()),
                customer_id=customer_id,
                pattern_type="service_exploration",
                pattern_data={
                    "unique_services": len(set(services)),
                    "service_variety": list(set(services)),
                    "exploration_rate": len(set(services)) / len(services)
                },
                confidence=0.7,
                detected_at=datetime.now().isoformat()
            ))
        
        return patterns
    
    def _update_customer_preferences(self, customer_id: str):
        """Update customer preferences based on booking history"""
        history = self.get_booking_history(customer_id, limit=20)
        if not history:
            return
        
        # Calculate preferences from history
        barber_counts = {}
        service_counts = {}
        time_counts = {}
        day_counts = {}
        barbershop_counts = {}
        
        for booking in history:
            if booking['barber_id']:
                barber_counts[booking['barber_id']] = barber_counts.get(booking['barber_id'], 0) + 1
            if booking['service_id']:
                service_counts[booking['service_id']] = service_counts.get(booking['service_id'], 0) + 1
            if booking['barbershop_id']:
                barbershop_counts[booking['barbershop_id']] = barbershop_counts.get(booking['barbershop_id'], 0) + 1
            
            if booking['scheduled_at']:
                booking_time = datetime.fromisoformat(booking['scheduled_at'])
                hour_minute = f"{booking_time.hour:02d}:{booking_time.minute:02d}"
                day_of_week = booking_time.weekday()
                
                time_counts[hour_minute] = time_counts.get(hour_minute, 0) + 1
                day_counts[day_of_week] = day_counts.get(day_of_week, 0) + 1
        
        # Sort by frequency
        preferred_barbers = sorted(barber_counts.keys(), key=lambda x: barber_counts[x], reverse=True)[:3]
        preferred_services = sorted(service_counts.keys(), key=lambda x: service_counts[x], reverse=True)[:3]
        preferred_times = sorted(time_counts.keys(), key=lambda x: time_counts[x], reverse=True)[:3]
        preferred_days = sorted(day_counts.keys(), key=lambda x: day_counts[x], reverse=True)[:3]
        favorite_barbershop = max(barbershop_counts, key=barbershop_counts.get) if barbershop_counts else None
        
        # Calculate average booking frequency
        dates = [datetime.fromisoformat(booking['scheduled_at']) for booking in history if booking['scheduled_at']]
        if len(dates) > 1:
            dates.sort()
            intervals = [(dates[i] - dates[i-1]).days for i in range(1, len(dates))]
            avg_frequency = sum(intervals) / len(intervals)
        else:
            avg_frequency = 30  # Default to monthly
        
        # Store preferences
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        now = datetime.now().isoformat()
        last_booking_date = dates[-1].isoformat() if dates else None
        
        cursor.execute('''
            INSERT OR REPLACE INTO booking_preferences (
                customer_id, preferred_barbers, preferred_services, preferred_times,
                preferred_days, average_booking_frequency, last_booking_date, 
                total_bookings, favorite_barbershop, notes_patterns, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            customer_id,
            json.dumps(preferred_barbers),
            json.dumps(preferred_services),
            json.dumps(preferred_times),
            json.dumps(preferred_days),
            int(avg_frequency),
            last_booking_date,
            len(history),
            favorite_barbershop,
            json.dumps([]),  # TODO: Extract patterns from notes
            now,
            now
        ))
        
        conn.commit()
        conn.close()
    
    def _generate_smart_recommendations(self, customer_id: str):
        """Generate smart recommendations for customer"""
        preferences = self.get_customer_preferences(customer_id)
        if not preferences:
            return
        
        recommendations = []
        
        # Next appointment recommendation
        if preferences.last_booking_date:
            last_booking = datetime.fromisoformat(preferences.last_booking_date)
            days_since = (datetime.now() - last_booking).days
            
            if days_since >= preferences.average_booking_frequency * 0.8:
                recommendations.append(SmartRecommendation(
                    recommendation_id=str(uuid.uuid4()),
                    customer_id=customer_id,
                    recommendation_type="next_appointment",
                    title="Time for your next appointment!",
                    description=f"It's been {days_since} days since your last visit. Book your next appointment now.",
                    suggested_barber_id=preferences.preferred_barbers[0] if preferences.preferred_barbers else None,
                    suggested_service_id=preferences.preferred_services[0] if preferences.preferred_services else None,
                    suggested_datetime=(datetime.now() + timedelta(days=3)).isoformat(),
                    confidence_score=0.9,
                    reasoning="Based on your typical booking frequency",
                    created_at=datetime.now().isoformat()
                ))
        
        # Store recommendations
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for rec in recommendations:
            expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            cursor.execute('''
                INSERT OR REPLACE INTO smart_recommendations (
                    recommendation_id, customer_id, recommendation_type, title, description,
                    suggested_barber_id, suggested_service_id, suggested_datetime,
                    confidence_score, reasoning, created_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                rec.recommendation_id, rec.customer_id, rec.recommendation_type,
                rec.title, rec.description, rec.suggested_barber_id, rec.suggested_service_id,
                rec.suggested_datetime, rec.confidence_score, rec.reasoning,
                rec.created_at, expires_at
            ))
        
        conn.commit()
        conn.close()
    
    def get_ai_customer_insights(self, customer_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get AI-powered customer insights"""
        try:
            booking_history = self.get_booking_history(customer_id, limit=50)
            if not booking_history:
                return []
            
            # Run AI behavior analysis asynchronously
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            insights = loop.run_until_complete(
                self.ai_intelligence.analyze_customer_behavior(customer_id, booking_history)
            )
            loop.close()
            
            # Convert to dictionary format
            result = []
            for insight in insights:
                result.append({
                    'insight_id': insight.insight_id,
                    'insight_type': insight.insight_type,
                    'insight_text': insight.insight_text,
                    'actionable_recommendations': insight.actionable_recommendations,
                    'confidence_score': insight.confidence_score,
                    'supporting_data': insight.supporting_data,
                    'ai_model_used': insight.ai_model_used,
                    'generated_at': insight.generated_at
                })
            
            return result[:limit]
            
        except Exception as e:
            print(f"Error getting AI customer insights: {e}")
            return []
    
    def get_analytics_summary(self, customer_id: str) -> Dict[str, Any]:
        """Get customer booking analytics summary"""
        history = self.get_booking_history(customer_id)
        preferences = self.get_customer_preferences(customer_id)
        patterns = self.analyze_booking_patterns(customer_id)
        
        if not history:
            return {'message': 'No booking history available'}
        
        # Calculate metrics
        total_spent = sum(booking['price'] for booking in history if booking['price'])
        avg_price = total_spent / len(history) if history else 0
        
        service_distribution = {}
        for booking in history:
            service = booking['service_name']
            if service:
                service_distribution[service] = service_distribution.get(service, 0) + 1
        
        return {
            'customer_id': customer_id,
            'total_bookings': len(history),
            'total_spent': total_spent,
            'average_booking_price': avg_price,
            'most_recent_booking': history[0]['scheduled_at'] if history else None,
            'favorite_service': max(service_distribution, key=service_distribution.get) if service_distribution else None,
            'service_distribution': service_distribution,
            'booking_frequency_days': preferences.average_booking_frequency if preferences else None,
            'identified_patterns': len(patterns),
            'loyalty_score': min(len(history) / 10, 1.0),  # 0-1 score based on booking count
            'preferences_available': preferences is not None
        }

# Usage example and testing
if __name__ == "__main__":
    # Initialize service
    service = BookingIntelligenceService()
    
    # Example booking data
    sample_booking = {
        'customer_id': 'customer_123',
        'customer_name': 'John Doe',
        'customer_email': 'john@example.com',
        'barbershop_id': 'shop_456',
        'barbershop_name': 'Downtown Barbershop',
        'barber_id': 'barber_789',
        'barber_name': 'Mike the Barber',
        'service_id': 'service_101',
        'service_name': 'Classic Haircut',
        'service_category': 'haircut',
        'scheduled_at': datetime.now().isoformat(),
        'duration_minutes': 30,
        'price': 25.00,
        'status': 'confirmed',
        'customer_notes': 'Regular trim, not too short'
    }
    
    # Track booking
    service.track_booking(sample_booking)
    
    # Get analytics
    analytics = service.get_analytics_summary('customer_123')
    print("Analytics Summary:", json.dumps(analytics, indent=2))
    
    # Get recommendations
    recommendations = service.get_smart_recommendations('customer_123')
    print("Smart Recommendations:", len(recommendations))
    
    # Get rebooking suggestion
    rebooking = service.suggest_rebooking('customer_123')
    print("Rebooking Suggestion:", json.dumps(rebooking, indent=2, default=str) if rebooking else None)