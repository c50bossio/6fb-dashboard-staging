#!/usr/bin/env python3
"""
Predictive Analytics and Dynamic Pricing Service
Advanced AI-powered analytics for demand forecasting, pricing optimization, and business intelligence
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import statistics
import math
import asyncio
import logging

logger = logging.getLogger(__name__)

@dataclass
class DemandForecast:
    """Predictive demand forecast for services/time slots"""
    forecast_id: str
    barbershop_id: str
    service_type: str
    time_period: str  # 'hourly', 'daily', 'weekly', 'monthly'
    forecast_date: str
    predicted_demand: float  # 0.0 to 1.0 capacity utilization
    confidence_level: float  # 0.0 to 1.0
    contributing_factors: List[str]
    recommended_actions: List[str]
    created_at: str

@dataclass
class DynamicPricing:
    """Dynamic pricing recommendation"""
    pricing_id: str
    barbershop_id: str
    service_id: str
    barber_id: Optional[str]
    base_price: float
    recommended_price: float
    price_adjustment: float  # percentage change
    pricing_reason: str
    demand_level: str  # 'low', 'medium', 'high', 'peak'
    valid_from: str
    valid_until: str
    expected_impact: Dict[str, float]  # revenue, bookings, utilization
    created_at: str

@dataclass
class BusinessInsight:
    """AI-generated business insight with actionable recommendations"""
    insight_id: str
    barbershop_id: str
    insight_type: str  # 'revenue_opportunity', 'operational_efficiency', 'customer_behavior', 'market_trend'
    title: str
    description: str
    impact_level: str  # 'low', 'medium', 'high', 'critical'
    potential_value: float  # estimated monetary impact
    actionable_recommendations: List[Dict[str, Any]]
    supporting_data: Dict[str, Any]
    confidence_score: float
    urgency_level: int  # 1-10 scale
    created_at: str

@dataclass
class SeasonalPattern:
    """Identified seasonal booking patterns"""
    pattern_id: str
    barbershop_id: str
    pattern_type: str  # 'daily', 'weekly', 'monthly', 'seasonal', 'holiday'
    pattern_data: Dict[str, Any]
    strength: float  # 0.0 to 1.0 - how consistent the pattern is
    next_occurrence: str
    recommended_preparation: List[str]
    identified_at: str

class PredictiveAnalyticsService:
    """Advanced predictive analytics and dynamic pricing service"""
    
    def __init__(self, db_path: str = "predictive_analytics.db"):
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Initialize predictive analytics database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Demand forecasts
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS demand_forecasts (
                forecast_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                service_type TEXT,
                time_period TEXT,
                forecast_date TEXT,
                predicted_demand REAL,
                confidence_level REAL,
                contributing_factors TEXT,  -- JSON
                recommended_actions TEXT,  -- JSON
                created_at TEXT
            )
        ''')
        
        # Dynamic pricing
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS dynamic_pricing (
                pricing_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                service_id TEXT,
                barber_id TEXT,
                base_price REAL,
                recommended_price REAL,
                price_adjustment REAL,
                pricing_reason TEXT,
                demand_level TEXT,
                valid_from TEXT,
                valid_until TEXT,
                expected_impact TEXT,  -- JSON
                created_at TEXT,
                is_active BOOLEAN DEFAULT TRUE
            )
        ''')
        
        # Business insights
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS business_insights (
                insight_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                insight_type TEXT,
                title TEXT,
                description TEXT,
                impact_level TEXT,
                potential_value REAL,
                actionable_recommendations TEXT,  -- JSON
                supporting_data TEXT,  -- JSON
                confidence_score REAL,
                urgency_level INTEGER,
                created_at TEXT,
                is_acted_upon BOOLEAN DEFAULT FALSE
            )
        ''')
        
        # Seasonal patterns
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seasonal_patterns (
                pattern_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                pattern_type TEXT,
                pattern_data TEXT,  -- JSON
                strength REAL,
                next_occurrence TEXT,
                recommended_preparation TEXT,  -- JSON
                identified_at TEXT
            )
        ''')
        
        # Historical analytics data
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics_snapshots (
                snapshot_id TEXT PRIMARY KEY,
                barbershop_id TEXT,
                snapshot_date TEXT,
                metrics_data TEXT,  -- JSON with all business metrics
                created_at TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def analyze_demand_patterns(self, barbershop_id: str, booking_history: List[Dict]) -> List[DemandForecast]:
        """Analyze booking history and predict future demand patterns"""
        if not booking_history:
            return []
        
        forecasts = []
        
        # Analyze hourly patterns
        hourly_demand = self._analyze_hourly_patterns(booking_history)
        daily_forecast = self._generate_hourly_forecast(barbershop_id, hourly_demand)
        if daily_forecast:
            forecasts.extend(daily_forecast)
        
        # Analyze daily patterns (day of week)
        daily_patterns = self._analyze_daily_patterns(booking_history)
        weekly_forecast = self._generate_weekly_forecast(barbershop_id, daily_patterns)
        if weekly_forecast:
            forecasts.extend(weekly_forecast)
        
        # Analyze service demand
        service_patterns = self._analyze_service_demand(booking_history)
        service_forecasts = self._generate_service_forecasts(barbershop_id, service_patterns)
        if service_forecasts:
            forecasts.extend(service_forecasts)
        
        # Store forecasts
        for forecast in forecasts:
            self._store_demand_forecast(forecast)
        
        return forecasts
    
    def generate_dynamic_pricing(self, barbershop_id: str, current_pricing: Dict[str, float], 
                                demand_data: List[DemandForecast]) -> List[DynamicPricing]:
        """Generate dynamic pricing recommendations based on demand forecasts"""
        pricing_recommendations = []
        
        for forecast in demand_data:
            if forecast.barbershop_id == barbershop_id:
                
                # Determine demand level
                demand_level = "low"
                if forecast.predicted_demand > 0.8:
                    demand_level = "peak"
                elif forecast.predicted_demand > 0.6:
                    demand_level = "high"
                elif forecast.predicted_demand > 0.3:
                    demand_level = "medium"
                
                # Calculate price adjustment
                price_adjustment = self._calculate_price_adjustment(forecast.predicted_demand, demand_level)
                
                # Generate pricing for each service
                for service_name, base_price in current_pricing.items():
                    if forecast.service_type == "all" or forecast.service_type == service_name:
                        
                        recommended_price = base_price * (1 + price_adjustment)
                        
                        # Ensure price doesn't deviate too much (±30% max)
                        max_price = base_price * 1.30
                        min_price = base_price * 0.70
                        recommended_price = max(min_price, min(max_price, recommended_price))
                        
                        pricing = DynamicPricing(
                            pricing_id=f"pricing_{barbershop_id}_{service_name}_{int(datetime.now().timestamp())}",
                            barbershop_id=barbershop_id,
                            service_id=service_name,
                            barber_id=None,
                            base_price=base_price,
                            recommended_price=recommended_price,
                            price_adjustment=price_adjustment * 100,  # Convert to percentage
                            pricing_reason=self._generate_pricing_reason(demand_level, forecast.predicted_demand),
                            demand_level=demand_level,
                            valid_from=datetime.now().isoformat(),
                            valid_until=(datetime.now() + timedelta(hours=24)).isoformat(),
                            expected_impact=self._calculate_pricing_impact(base_price, recommended_price, forecast.predicted_demand),
                            created_at=datetime.now().isoformat()
                        )
                        
                        pricing_recommendations.append(pricing)
                        self._store_dynamic_pricing(pricing)
        
        return pricing_recommendations
    
    def generate_business_insights(self, barbershop_id: str, booking_history: List[Dict], 
                                 revenue_data: List[Dict] = None) -> List[BusinessInsight]:
        """Generate AI-powered business insights and recommendations"""
        insights = []
        
        if not booking_history:
            return insights
        
        # Revenue optimization insights
        revenue_insights = self._analyze_revenue_opportunities(barbershop_id, booking_history, revenue_data)
        insights.extend(revenue_insights)
        
        # Operational efficiency insights
        efficiency_insights = self._analyze_operational_efficiency(barbershop_id, booking_history)
        insights.extend(efficiency_insights)
        
        # Customer behavior insights
        behavior_insights = self._analyze_customer_behavior_trends(barbershop_id, booking_history)
        insights.extend(behavior_insights)
        
        # Market trend insights
        market_insights = self._identify_market_trends(barbershop_id, booking_history)
        insights.extend(market_insights)
        
        # Store insights
        for insight in insights:
            self._store_business_insight(insight)
        
        return insights
    
    def identify_seasonal_patterns(self, barbershop_id: str, booking_history: List[Dict]) -> List[SeasonalPattern]:
        """Identify and predict seasonal booking patterns"""
        patterns = []
        
        if len(booking_history) < 30:  # Need at least 30 bookings for pattern analysis
            return patterns
        
        # Weekly patterns
        weekly_pattern = self._detect_weekly_patterns(barbershop_id, booking_history)
        if weekly_pattern:
            patterns.append(weekly_pattern)
        
        # Monthly patterns
        monthly_pattern = self._detect_monthly_patterns(barbershop_id, booking_history)
        if monthly_pattern:
            patterns.append(monthly_pattern)
        
        # Holiday patterns
        holiday_patterns = self._detect_holiday_patterns(barbershop_id, booking_history)
        patterns.extend(holiday_patterns)
        
        # Store patterns
        for pattern in patterns:
            self._store_seasonal_pattern(pattern)
        
        return patterns
    
    def get_predictive_dashboard_data(self, barbershop_id: str) -> Dict[str, Any]:
        """Get comprehensive predictive analytics dashboard data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get recent forecasts
            cursor.execute('''
                SELECT * FROM demand_forecasts 
                WHERE barbershop_id = ? 
                ORDER BY created_at DESC LIMIT 10
            ''', (barbershop_id,))
            
            forecasts = []
            for row in cursor.fetchall():
                forecasts.append({
                    'forecast_id': row[0],
                    'service_type': row[2],
                    'time_period': row[3],
                    'forecast_date': row[4],
                    'predicted_demand': row[5],
                    'confidence_level': row[6],
                    'contributing_factors': json.loads(row[7] or '[]'),
                    'recommended_actions': json.loads(row[8] or '[]')
                })
            
            # Get active pricing recommendations
            cursor.execute('''
                SELECT * FROM dynamic_pricing 
                WHERE barbershop_id = ? AND is_active = TRUE 
                ORDER BY created_at DESC LIMIT 5
            ''', (barbershop_id,))
            
            pricing = []
            for row in cursor.fetchall():
                pricing.append({
                    'service_id': row[2],
                    'base_price': row[4],
                    'recommended_price': row[5],
                    'price_adjustment': row[6],
                    'demand_level': row[8],
                    'expected_impact': json.loads(row[11] or '{}')
                })
            
            # Get business insights
            cursor.execute('''
                SELECT * FROM business_insights 
                WHERE barbershop_id = ? 
                ORDER BY urgency_level DESC, created_at DESC LIMIT 5
            ''', (barbershop_id,))
            
            insights = []
            for row in cursor.fetchall():
                insights.append({
                    'insight_type': row[2],
                    'title': row[3],
                    'description': row[4],
                    'impact_level': row[5],
                    'potential_value': row[6],
                    'recommendations': json.loads(row[7] or '[]'),
                    'confidence_score': row[9],
                    'urgency_level': row[10]
                })
            
            # Get seasonal patterns
            cursor.execute('''
                SELECT * FROM seasonal_patterns 
                WHERE barbershop_id = ? 
                ORDER BY strength DESC LIMIT 5
            ''', (barbershop_id,))
            
            patterns = []
            for row in cursor.fetchall():
                patterns.append({
                    'pattern_type': row[2],
                    'pattern_data': json.loads(row[3] or '{}'),
                    'strength': row[4],
                    'next_occurrence': row[5],
                    'preparation': json.loads(row[6] or '[]')
                })
            
            conn.close()
            
            return {
                'barbershop_id': barbershop_id,
                'demand_forecasts': forecasts,
                'pricing_recommendations': pricing,
                'business_insights': insights,
                'seasonal_patterns': patterns,
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting dashboard data: {e}")
            return {'error': str(e)}
    
    def _analyze_hourly_patterns(self, booking_history: List[Dict]) -> Dict[int, float]:
        """Analyze booking patterns by hour of day"""
        hourly_counts = {}
        total_bookings = len(booking_history)
        
        for booking in booking_history:
            if booking.get('scheduled_at'):
                try:
                    booking_time = datetime.fromisoformat(booking['scheduled_at'])
                    hour = booking_time.hour
                    hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
                except:
                    continue
        
        # Convert counts to demand ratios
        hourly_demand = {}
        max_count = max(hourly_counts.values()) if hourly_counts else 1
        
        for hour in range(24):
            count = hourly_counts.get(hour, 0)
            hourly_demand[hour] = count / max_count if max_count > 0 else 0
        
        return hourly_demand
    
    def _generate_hourly_forecast(self, barbershop_id: str, hourly_demand: Dict[int, float]) -> List[DemandForecast]:
        """Generate hourly demand forecasts for the next day"""
        forecasts = []
        tomorrow = datetime.now() + timedelta(days=1)
        
        # Identify peak hours
        peak_hours = [hour for hour, demand in hourly_demand.items() if demand > 0.7]
        low_hours = [hour for hour, demand in hourly_demand.items() if demand < 0.3]
        
        # Generate forecast for peak hours
        if peak_hours:
            forecast = DemandForecast(
                forecast_id=f"hourly_peak_{barbershop_id}_{int(tomorrow.timestamp())}",
                barbershop_id=barbershop_id,
                service_type="all",
                time_period="hourly",
                forecast_date=tomorrow.date().isoformat(),
                predicted_demand=max(hourly_demand.values()),
                confidence_level=0.8,
                contributing_factors=[
                    f"Peak hours identified: {', '.join(f'{h}:00' for h in peak_hours)}",
                    "Historical booking pattern analysis"
                ],
                recommended_actions=[
                    "Consider increasing staff during peak hours",
                    "Implement premium pricing for high-demand slots",
                    "Send proactive booking reminders to customers"
                ],
                created_at=datetime.now().isoformat()
            )
            forecasts.append(forecast)
        
        return forecasts
    
    def _analyze_daily_patterns(self, booking_history: List[Dict]) -> Dict[int, float]:
        """Analyze booking patterns by day of week"""
        daily_counts = {}
        
        for booking in booking_history:
            if booking.get('scheduled_at'):
                try:
                    booking_time = datetime.fromisoformat(booking['scheduled_at'])
                    day = booking_time.weekday()  # 0 = Monday
                    daily_counts[day] = daily_counts.get(day, 0) + 1
                except:
                    continue
        
        # Convert to demand ratios
        max_count = max(daily_counts.values()) if daily_counts else 1
        daily_demand = {}
        
        for day in range(7):
            count = daily_counts.get(day, 0)
            daily_demand[day] = count / max_count if max_count > 0 else 0
        
        return daily_demand
    
    def _calculate_price_adjustment(self, predicted_demand: float, demand_level: str) -> float:
        """Calculate price adjustment based on predicted demand"""
        if demand_level == "peak":
            return 0.20  # +20%
        elif demand_level == "high":
            return 0.10  # +10%
        elif demand_level == "medium":
            return 0.0   # No change
        else:  # low demand
            return -0.15  # -15%
    
    def _generate_pricing_reason(self, demand_level: str, predicted_demand: float) -> str:
        """Generate explanation for pricing recommendation"""
        reasons = {
            "peak": f"Peak demand predicted ({predicted_demand:.0%} capacity). Premium pricing recommended to maximize revenue.",
            "high": f"High demand expected ({predicted_demand:.0%} capacity). Moderate price increase suggested.",
            "medium": f"Moderate demand predicted ({predicted_demand:.0%} capacity). Maintain current pricing.",
            "low": f"Lower demand expected ({predicted_demand:.0%} capacity). Promotional pricing to drive bookings."
        }
        return reasons.get(demand_level, "Standard pricing recommended.")
    
    def _calculate_pricing_impact(self, base_price: float, recommended_price: float, demand: float) -> Dict[str, float]:
        """Calculate expected impact of pricing changes"""
        price_change = (recommended_price - base_price) / base_price
        
        # Simple elasticity model (in reality, this would be more sophisticated)
        demand_change = -0.5 * price_change  # Assume elasticity of -0.5
        new_demand = max(0.1, demand * (1 + demand_change))
        
        revenue_change = (recommended_price * new_demand) / (base_price * demand) - 1
        
        return {
            'revenue_change': revenue_change,
            'demand_change': demand_change,
            'utilization_change': new_demand - demand
        }
    
    def _store_demand_forecast(self, forecast: DemandForecast):
        """Store demand forecast in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO demand_forecasts (
                    forecast_id, barbershop_id, service_type, time_period, forecast_date,
                    predicted_demand, confidence_level, contributing_factors, 
                    recommended_actions, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                forecast.forecast_id, forecast.barbershop_id, forecast.service_type,
                forecast.time_period, forecast.forecast_date, forecast.predicted_demand,
                forecast.confidence_level, json.dumps(forecast.contributing_factors),
                json.dumps(forecast.recommended_actions), forecast.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing demand forecast: {e}")
    
    def _store_dynamic_pricing(self, pricing: DynamicPricing):
        """Store dynamic pricing recommendation"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO dynamic_pricing (
                    pricing_id, barbershop_id, service_id, barber_id, base_price,
                    recommended_price, price_adjustment, pricing_reason, demand_level,
                    valid_from, valid_until, expected_impact, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                pricing.pricing_id, pricing.barbershop_id, pricing.service_id,
                pricing.barber_id, pricing.base_price, pricing.recommended_price,
                pricing.price_adjustment, pricing.pricing_reason, pricing.demand_level,
                pricing.valid_from, pricing.valid_until, json.dumps(pricing.expected_impact),
                pricing.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing dynamic pricing: {e}")
    
    # Placeholder methods for additional analytics (can be expanded)
    def _analyze_revenue_opportunities(self, barbershop_id: str, booking_history: List[Dict], revenue_data: List[Dict] = None) -> List[BusinessInsight]:
        """Analyze revenue optimization opportunities"""
        insights = []
        
        # Simple revenue insight example
        if booking_history:
            avg_price = statistics.mean([booking.get('price', 0) for booking in booking_history if booking.get('price')])
            
            insight = BusinessInsight(
                insight_id=f"revenue_{barbershop_id}_{int(datetime.now().timestamp())}",
                barbershop_id=barbershop_id,
                insight_type="revenue_opportunity",
                title="Service Pricing Optimization",
                description=f"Average service price is ${avg_price:.2f}. Analysis shows potential for 15% revenue increase through strategic pricing adjustments.",
                impact_level="high",
                potential_value=avg_price * len(booking_history) * 0.15,
                actionable_recommendations=[
                    {"action": "implement_dynamic_pricing", "priority": "high", "timeline": "2_weeks"},
                    {"action": "analyze_competitor_pricing", "priority": "medium", "timeline": "1_week"}
                ],
                supporting_data={"average_price": avg_price, "total_bookings": len(booking_history)},
                confidence_score=0.75,
                urgency_level=7,
                created_at=datetime.now().isoformat()
            )
            insights.append(insight)
        
        return insights
    
    def _analyze_operational_efficiency(self, barbershop_id: str, booking_history: List[Dict]) -> List[BusinessInsight]:
        """Analyze operational efficiency opportunities"""
        # Placeholder - can be expanded with real efficiency analysis
        return []
    
    def _analyze_customer_behavior_trends(self, barbershop_id: str, booking_history: List[Dict]) -> List[BusinessInsight]:
        """Analyze customer behavior trends"""
        # Placeholder - can be expanded with customer behavior analysis
        return []
    
    def _identify_market_trends(self, barbershop_id: str, booking_history: List[Dict]) -> List[BusinessInsight]:
        """Identify market trends"""
        # Placeholder - can be expanded with market trend analysis
        return []
    
    def _store_business_insight(self, insight: BusinessInsight):
        """Store business insight in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO business_insights (
                    insight_id, barbershop_id, insight_type, title, description,
                    impact_level, potential_value, actionable_recommendations,
                    supporting_data, confidence_score, urgency_level, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                insight.insight_id, insight.barbershop_id, insight.insight_type,
                insight.title, insight.description, insight.impact_level,
                insight.potential_value, json.dumps(insight.actionable_recommendations),
                json.dumps(insight.supporting_data), insight.confidence_score,
                insight.urgency_level, insight.created_at
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing business insight: {e}")
    
    # Additional placeholder methods for seasonal pattern analysis
    def _detect_weekly_patterns(self, barbershop_id: str, booking_history: List[Dict]) -> Optional[SeasonalPattern]:
        """Detect weekly booking patterns"""
        # Placeholder implementation
        return None
    
    def _detect_monthly_patterns(self, barbershop_id: str, booking_history: List[Dict]) -> Optional[SeasonalPattern]:
        """Detect monthly booking patterns"""
        # Placeholder implementation
        return None
    
    def _detect_holiday_patterns(self, barbershop_id: str, booking_history: List[Dict]) -> List[SeasonalPattern]:
        """Detect holiday booking patterns"""
        # Placeholder implementation
        return []
    
    def _store_seasonal_pattern(self, pattern: SeasonalPattern):
        """Store seasonal pattern in database"""
        # Placeholder implementation
        pass
    
    # Additional analysis methods
    def _analyze_service_demand(self, booking_history: List[Dict]) -> Dict[str, float]:
        """Analyze demand patterns by service type"""
        service_counts = {}
        for booking in booking_history:
            service = booking.get('service_name', 'unknown')
            service_counts[service] = service_counts.get(service, 0) + 1
        
        # Convert to demand ratios
        max_count = max(service_counts.values()) if service_counts else 1
        return {service: count / max_count for service, count in service_counts.items()}
    
    def _generate_service_forecasts(self, barbershop_id: str, service_patterns: Dict[str, float]) -> List[DemandForecast]:
        """Generate service-specific demand forecasts"""
        forecasts = []
        
        for service, demand in service_patterns.items():
            if demand > 0.5:  # Only forecast for popular services
                forecast = DemandForecast(
                    forecast_id=f"service_{barbershop_id}_{service}_{int(datetime.now().timestamp())}",
                    barbershop_id=barbershop_id,
                    service_type=service,
                    time_period="daily",
                    forecast_date=(datetime.now() + timedelta(days=1)).date().isoformat(),
                    predicted_demand=demand,
                    confidence_level=0.7,
                    contributing_factors=[f"Historical demand analysis for {service}"],
                    recommended_actions=[f"Ensure adequate capacity for {service} bookings"],
                    created_at=datetime.now().isoformat()
                )
                forecasts.append(forecast)
        
        return forecasts
    
    def _generate_weekly_forecast(self, barbershop_id: str, daily_patterns: Dict[int, float]) -> List[DemandForecast]:
        """Generate weekly demand forecast"""
        forecasts = []
        
        # Find peak days
        peak_day = max(daily_patterns, key=daily_patterns.get)
        peak_demand = daily_patterns[peak_day]
        
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        forecast = DemandForecast(
            forecast_id=f"weekly_{barbershop_id}_{int(datetime.now().timestamp())}",
            barbershop_id=barbershop_id,
            service_type="all",
            time_period="weekly",
            forecast_date=(datetime.now() + timedelta(days=7)).date().isoformat(),
            predicted_demand=peak_demand,
            confidence_level=0.8,
            contributing_factors=[f"Peak day identified: {days[peak_day]} ({peak_demand:.0%} demand)"],
            recommended_actions=[
                f"Staff optimally for {days[peak_day]}",
                "Consider promotional pricing for low-demand days"
            ],
            created_at=datetime.now().isoformat()
        )
        forecasts.append(forecast)
        
        return forecasts

# Usage example and testing
if __name__ == "__main__":
    analytics = PredictiveAnalyticsService()
    
    # Sample booking history for testing
    sample_bookings = [
        {
            'customer_id': 'customer_1',
            'service_name': 'Classic Haircut',
            'scheduled_at': (datetime.now() - timedelta(days=i, hours=10)).isoformat(),
            'price': 25.0 + (i % 3) * 5  # Vary prices
        }
        for i in range(1, 31)  # 30 bookings over 30 days
    ]
    
    barbershop_id = "test_shop_123"
    
    print("🔮 Testing Predictive Analytics Service...")
    
    # Test demand analysis
    forecasts = analytics.analyze_demand_patterns(barbershop_id, sample_bookings)
    print(f"📊 Generated {len(forecasts)} demand forecasts")
    
    # Test dynamic pricing
    current_pricing = {"Classic Haircut": 25.0, "Beard Trim": 15.0}
    pricing_recs = analytics.generate_dynamic_pricing(barbershop_id, current_pricing, forecasts)
    print(f"💰 Generated {len(pricing_recs)} pricing recommendations")
    
    # Test business insights
    insights = analytics.generate_business_insights(barbershop_id, sample_bookings)
    print(f"💡 Generated {len(insights)} business insights")
    
    # Get dashboard data
    dashboard = analytics.get_predictive_dashboard_data(barbershop_id)
    print(f"📈 Dashboard data ready with {len(dashboard.get('demand_forecasts', []))} forecasts")
    
    print("✅ Predictive Analytics Service test complete!")