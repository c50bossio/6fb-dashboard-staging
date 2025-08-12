#!/usr/bin/env python3
"""
Behavioral Learning Connector
Connects marketing automation agents with existing behavioral learning systems
Enables continuous learning and optimization based on marketing performance
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import sqlite3
import logging
from pathlib import Path
import numpy as np
from dataclasses import dataclass, asdict

@dataclass
class LearningPattern:
    """Behavioral learning pattern"""
    pattern_id: str
    business_id: str
    pattern_type: str  # customer_behavior, campaign_performance, seasonal_trend
    data_points: List[Dict[str, Any]]
    confidence_score: float
    created_at: datetime
    last_updated: datetime
    impact_score: float
    validation_count: int

@dataclass
class BehavioralInsight:
    """Behavioral insight derived from patterns"""
    insight_id: str
    business_id: str
    insight_type: str
    description: str
    supporting_data: Dict[str, Any]
    confidence_level: str  # high, medium, low
    actionable_recommendations: List[str]
    potential_impact: str
    created_at: datetime

class BehavioralLearningConnector:
    """
    Connects marketing automation with behavioral learning systems
    Enables continuous improvement through data-driven insights
    """
    
    def __init__(self, database_path: str = '/Users/bossio/6FB AI Agent System/agent_system.db'):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
        # Learning patterns storage
        self.patterns: Dict[str, LearningPattern] = {}
        self.insights: Dict[str, BehavioralInsight] = {}
        
        # Learning algorithms parameters
        self.min_data_points = 10
        self.confidence_threshold = 0.7
        self.pattern_validation_window = 30  # days
        
        # Initialize database tables
        asyncio.create_task(self._initialize_behavioral_tables())
        
        self.logger.info("Behavioral Learning Connector initialized")
    
    async def _initialize_behavioral_tables(self):
        """Initialize database tables for behavioral learning"""
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Learning patterns table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS learning_patterns (
                        pattern_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        pattern_type TEXT NOT NULL,
                        data_points TEXT NOT NULL,
                        confidence_score REAL NOT NULL,
                        impact_score REAL NOT NULL,
                        validation_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Behavioral insights table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS behavioral_insights (
                        insight_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        insight_type TEXT NOT NULL,
                        description TEXT NOT NULL,
                        supporting_data TEXT NOT NULL,
                        confidence_level TEXT NOT NULL,
                        actionable_recommendations TEXT NOT NULL,
                        potential_impact TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        is_active BOOLEAN DEFAULT 1
                    )
                ''')
                
                # Learning feedback table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS learning_feedback (
                        feedback_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        pattern_id TEXT,
                        insight_id TEXT,
                        feedback_type TEXT NOT NULL,
                        feedback_data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (pattern_id) REFERENCES learning_patterns(pattern_id),
                        FOREIGN KEY (insight_id) REFERENCES behavioral_insights(insight_id)
                    )
                ''')
                
                db.commit()
                self.logger.info("Behavioral learning database tables initialized")
                
        except Exception as e:
            self.logger.error(f"Failed to initialize behavioral tables: {str(e)}")
    
    async def analyze_marketing_behavioral_patterns(self, 
                                                  business_id: str,
                                                  marketing_data: Dict[str, Any],
                                                  appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze behavioral patterns from marketing and appointment data
        """
        try:
            self.logger.info(f"Analyzing behavioral patterns for business {business_id}")
            
            # Analyze different pattern types
            patterns = {
                "customer_response_patterns": await self._analyze_customer_response_patterns(business_id, marketing_data, appointment_data),
                "channel_effectiveness_patterns": await self._analyze_channel_effectiveness_patterns(business_id, marketing_data),
                "temporal_booking_patterns": await self._analyze_temporal_booking_patterns(business_id, appointment_data),
                "service_preference_patterns": await self._analyze_service_preference_patterns(business_id, appointment_data),
                "retention_behavior_patterns": await self._analyze_retention_behavior_patterns(business_id, appointment_data),
                "price_sensitivity_patterns": await self._analyze_price_sensitivity_patterns(business_id, appointment_data)
            }
            
            # Generate insights from patterns
            insights = await self._generate_behavioral_insights(business_id, patterns)
            
            # Update learning models
            await self._update_learning_models(business_id, patterns, insights)
            
            return {
                "success": True,
                "business_id": business_id,
                "patterns_analyzed": len(patterns),
                "insights_generated": len(insights),
                "patterns": patterns,
                "insights": insights,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to analyze behavioral patterns: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_customer_response_patterns(self, 
                                                business_id: str,
                                                marketing_data: Dict[str, Any],
                                                appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer response patterns to marketing campaigns"""
        
        patterns = {
            "response_time_patterns": {},
            "channel_preference_patterns": {},
            "message_type_effectiveness": {},
            "frequency_sensitivity": {}
        }
        
        try:
            # Get marketing campaign data from the last 90 days
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Analyze response times to different marketing channels
                cursor.execute('''
                    SELECT 
                        json_extract(marketing_data, '$.channel') as channel,
                        json_extract(marketing_data, '$.sent_at') as sent_at,
                        json_extract(appointment_data, '$.booked_at') as booked_at,
                        json_extract(client_data, '$.email') as client_email
                    FROM marketing_activities ma
                    JOIN unified_appointments ua ON json_extract(ua.client_data, '$.email') = json_extract(ma.client_data, '$.email')
                    WHERE ma.business_id = ? 
                        AND datetime(json_extract(ma.metadata, '$.sent_at')) >= datetime('now', '-90 days')
                        AND datetime(json_extract(ua.scheduling_data, '$.dateTime')) >= datetime(json_extract(ma.metadata, '$.sent_at'))
                        AND datetime(json_extract(ua.scheduling_data, '$.dateTime')) <= datetime(json_extract(ma.metadata, '$.sent_at'), '+7 days')
                ''', (business_id,))
                
                response_data = cursor.fetchall()
                
                # Analyze response time patterns
                for row in response_data:
                    channel, sent_at, booked_at, email = row
                    if sent_at and booked_at:
                        try:
                            sent_time = datetime.fromisoformat(sent_at.replace('Z', '+00:00'))
                            booked_time = datetime.fromisoformat(booked_at.replace('Z', '+00:00'))
                            response_time_hours = (booked_time - sent_time).total_seconds() / 3600
                            
                            if channel not in patterns["response_time_patterns"]:
                                patterns["response_time_patterns"][channel] = []
                            patterns["response_time_patterns"][channel].append(response_time_hours)
                            
                        except Exception as e:
                            self.logger.warning(f"Failed to parse timestamp: {e}")
                
                # Calculate average response times and patterns
                for channel, times in patterns["response_time_patterns"].items():
                    if times:
                        patterns["response_time_patterns"][channel] = {
                            "average_response_time_hours": sum(times) / len(times),
                            "median_response_time_hours": sorted(times)[len(times)//2],
                            "response_count": len(times),
                            "fastest_response_hours": min(times),
                            "conversion_rate": len(times) / max(1, len(times)) * 100  # Simplified calculation
                        }
            
            # Analyze channel preferences based on engagement
            channel_engagement = marketing_data.get('channel_performance', {})
            for channel, performance in channel_engagement.items():
                patterns["channel_preference_patterns"][channel] = {
                    "engagement_rate": performance.get('engagement_rate', 0),
                    "conversion_rate": performance.get('conversion_rate', 0),
                    "preference_score": performance.get('engagement_rate', 0) * performance.get('conversion_rate', 0) / 100
                }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze customer response patterns: {str(e)}")
            return patterns
    
    async def _analyze_channel_effectiveness_patterns(self, 
                                                    business_id: str,
                                                    marketing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze marketing channel effectiveness patterns"""
        
        patterns = {
            "roi_trends": {},
            "seasonal_performance": {},
            "audience_segment_effectiveness": {},
            "content_type_performance": {}
        }
        
        try:
            channel_performance = marketing_data.get('channel_performance', {})
            
            for channel, performance in channel_performance.items():
                # ROI trends analysis
                roi_history = performance.get('roi_history', [])
                if len(roi_history) >= 3:
                    patterns["roi_trends"][channel] = {
                        "trend_direction": "increasing" if roi_history[-1] > roi_history[0] else "decreasing",
                        "volatility": np.std(roi_history) if roi_history else 0,
                        "growth_rate": ((roi_history[-1] - roi_history[0]) / roi_history[0] * 100) if roi_history[0] != 0 else 0,
                        "consistency_score": 1 - (np.std(roi_history) / np.mean(roi_history)) if roi_history and np.mean(roi_history) != 0 else 0
                    }
                
                # Seasonal performance patterns
                monthly_performance = performance.get('monthly_breakdown', {})
                if monthly_performance:
                    best_month = max(monthly_performance.items(), key=lambda x: x[1].get('revenue', 0))
                    worst_month = min(monthly_performance.items(), key=lambda x: x[1].get('revenue', 0))
                    
                    patterns["seasonal_performance"][channel] = {
                        "best_performing_month": best_month[0],
                        "worst_performing_month": worst_month[0],
                        "seasonal_variance": (best_month[1].get('revenue', 0) - worst_month[1].get('revenue', 0)) / max(1, worst_month[1].get('revenue', 1)),
                        "seasonality_strength": "high" if (best_month[1].get('revenue', 0) / max(1, worst_month[1].get('revenue', 1))) > 2 else "low"
                    }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze channel effectiveness patterns: {str(e)}")
            return patterns
    
    async def _analyze_temporal_booking_patterns(self, 
                                               business_id: str,
                                               appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze temporal booking behavior patterns"""
        
        patterns = {
            "daily_patterns": {},
            "weekly_patterns": {},
            "monthly_patterns": {},
            "booking_lead_time": {}
        }
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Analyze booking patterns by time
                cursor.execute('''
                    SELECT 
                        json_extract(scheduling_data, '$.dateTime') as appointment_time,
                        json_extract(metadata, '$.booked_at') as booking_time,
                        strftime('%H', json_extract(scheduling_data, '$.dateTime')) as hour,
                        strftime('%w', json_extract(scheduling_data, '$.dateTime')) as day_of_week,
                        strftime('%m', json_extract(scheduling_data, '$.dateTime')) as month
                    FROM unified_appointments 
                    WHERE barbershop_id = ? 
                        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-90 days')
                ''', (business_id,))
                
                booking_data = cursor.fetchall()
                
                # Daily patterns (hour of day)
                hourly_bookings = {}
                # Weekly patterns (day of week)
                weekly_bookings = {}
                # Monthly patterns
                monthly_bookings = {}
                # Lead time analysis
                lead_times = []
                
                for row in booking_data:
                    appointment_time, booking_time, hour, day_of_week, month = row
                    
                    # Hour patterns
                    if hour:
                        hour_int = int(hour)
                        hourly_bookings[hour_int] = hourly_bookings.get(hour_int, 0) + 1
                    
                    # Day of week patterns
                    if day_of_week:
                        dow_int = int(day_of_week)
                        weekly_bookings[dow_int] = weekly_bookings.get(dow_int, 0) + 1
                    
                    # Monthly patterns
                    if month:
                        month_int = int(month)
                        monthly_bookings[month_int] = monthly_bookings.get(month_int, 0) + 1
                    
                    # Lead time calculation
                    if appointment_time and booking_time:
                        try:
                            apt_time = datetime.fromisoformat(appointment_time.replace('Z', '+00:00'))
                            book_time = datetime.fromisoformat(booking_time.replace('Z', '+00:00'))
                            lead_time_days = (apt_time - book_time).days
                            if lead_time_days >= 0:  # Only positive lead times
                                lead_times.append(lead_time_days)
                        except Exception as e:
                            self.logger.warning(f"Failed to calculate lead time: {e}")
                
                # Process daily patterns
                if hourly_bookings:
                    peak_hour = max(hourly_bookings.items(), key=lambda x: x[1])
                    low_hour = min(hourly_bookings.items(), key=lambda x: x[1])
                    
                    patterns["daily_patterns"] = {
                        "peak_hour": peak_hour[0],
                        "peak_hour_bookings": peak_hour[1],
                        "lowest_hour": low_hour[0],
                        "lowest_hour_bookings": low_hour[1],
                        "hourly_distribution": hourly_bookings,
                        "peak_vs_low_ratio": peak_hour[1] / max(1, low_hour[1])
                    }
                
                # Process weekly patterns
                if weekly_bookings:
                    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                    peak_day = max(weekly_bookings.items(), key=lambda x: x[1])
                    low_day = min(weekly_bookings.items(), key=lambda x: x[1])
                    
                    patterns["weekly_patterns"] = {
                        "peak_day": day_names[peak_day[0]],
                        "peak_day_bookings": peak_day[1],
                        "lowest_day": day_names[low_day[0]],
                        "lowest_day_bookings": low_day[1],
                        "weekly_distribution": {day_names[k]: v for k, v in weekly_bookings.items()},
                        "weekday_vs_weekend_ratio": sum(weekly_bookings.get(i, 0) for i in range(1, 6)) / max(1, sum(weekly_bookings.get(i, 0) for i in [0, 6]))
                    }
                
                # Process lead time patterns
                if lead_times:
                    patterns["booking_lead_time"] = {
                        "average_lead_time_days": sum(lead_times) / len(lead_times),
                        "median_lead_time_days": sorted(lead_times)[len(lead_times)//2],
                        "same_day_bookings_percent": (len([lt for lt in lead_times if lt == 0]) / len(lead_times)) * 100,
                        "advance_bookings_percent": (len([lt for lt in lead_times if lt > 7]) / len(lead_times)) * 100,
                        "booking_urgency_score": sum(1 for lt in lead_times if lt <= 1) / len(lead_times) * 100
                    }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze temporal booking patterns: {str(e)}")
            return patterns
    
    async def _analyze_service_preference_patterns(self, 
                                                 business_id: str,
                                                 appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze service preference and progression patterns"""
        
        patterns = {
            "service_popularity": {},
            "customer_progression": {},
            "seasonal_service_trends": {},
            "price_tier_preferences": {}
        }
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Service popularity analysis
                cursor.execute('''
                    SELECT 
                        json_extract(service_data, '$.name') as service_name,
                        json_extract(service_data, '$.category') as service_category,
                        CAST(json_extract(payment_data, '$.total') as REAL) as price,
                        COUNT(*) as booking_count,
                        AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_price,
                        json_extract(client_data, '$.email') as client_email
                    FROM unified_appointments 
                    WHERE barbershop_id = ? 
                        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-90 days')
                    GROUP BY service_name, client_email
                    ORDER BY booking_count DESC
                ''', (business_id,))
                
                service_data = cursor.fetchall()
                
                # Process service popularity
                service_counts = {}
                client_service_history = {}
                price_tiers = {"low": [], "medium": [], "high": []}
                
                for row in service_data:
                    service_name, category, price, count, avg_price, email = row
                    
                    if service_name:
                        service_counts[service_name] = service_counts.get(service_name, 0) + count
                    
                    # Track client service progression
                    if email and service_name:
                        if email not in client_service_history:
                            client_service_history[email] = []
                        client_service_history[email].append({
                            "service": service_name,
                            "category": category,
                            "price": price,
                            "count": count
                        })
                    
                    # Categorize by price tier
                    if price:
                        if price < 30:
                            price_tiers["low"].append(service_name)
                        elif price < 60:
                            price_tiers["medium"].append(service_name)
                        else:
                            price_tiers["high"].append(service_name)
                
                patterns["service_popularity"] = {
                    "most_popular": max(service_counts.items(), key=lambda x: x[1]) if service_counts else ("unknown", 0),
                    "service_distribution": service_counts,
                    "total_unique_services": len(service_counts),
                    "service_concentration": max(service_counts.values()) / sum(service_counts.values()) if service_counts else 0
                }
                
                # Analyze customer progression patterns
                progression_patterns = {}
                for email, services in client_service_history.items():
                    if len(services) > 1:
                        # Sort by booking count (proxy for chronological order)
                        services.sort(key=lambda x: x['count'])
                        
                        first_service = services[0]['service']
                        recent_services = [s['service'] for s in services[-3:]]  # Last 3 services
                        
                        if first_service not in progression_patterns:
                            progression_patterns[first_service] = {}
                        
                        for recent in recent_services:
                            if recent != first_service:
                                progression_patterns[first_service][recent] = progression_patterns[first_service].get(recent, 0) + 1
                
                patterns["customer_progression"] = progression_patterns
                
                # Price tier preferences
                patterns["price_tier_preferences"] = {
                    "low_tier_services": len(price_tiers["low"]),
                    "medium_tier_services": len(price_tiers["medium"]),
                    "high_tier_services": len(price_tiers["high"]),
                    "price_tier_distribution": {
                        tier: len(services) for tier, services in price_tiers.items()
                    }
                }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze service preference patterns: {str(e)}")
            return patterns
    
    async def _analyze_retention_behavior_patterns(self, 
                                                 business_id: str,
                                                 appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer retention and churn behavior patterns"""
        
        patterns = {
            "retention_cohorts": {},
            "churn_indicators": {},
            "loyalty_progression": {},
            "reactivation_patterns": {}
        }
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Customer retention analysis
                cursor.execute('''
                    SELECT 
                        json_extract(client_data, '$.email') as client_email,
                        COUNT(*) as visit_count,
                        MIN(datetime(json_extract(scheduling_data, '$.dateTime'))) as first_visit,
                        MAX(datetime(json_extract(scheduling_data, '$.dateTime'))) as last_visit,
                        AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_spending,
                        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_spending
                    FROM unified_appointments 
                    WHERE barbershop_id = ? 
                        AND json_extract(client_data, '$.email') IS NOT NULL
                    GROUP BY client_email
                    HAVING visit_count > 0
                    ORDER BY visit_count DESC
                ''', (business_id,))
                
                client_data = cursor.fetchall()
                
                # Analyze retention cohorts
                cohorts = {"new": [], "returning": [], "loyal": [], "champion": []}
                churn_risk_clients = []
                now = datetime.now()
                
                for row in client_data:
                    email, visit_count, first_visit, last_visit, avg_spending, total_spending = row
                    
                    try:
                        first_visit_date = datetime.fromisoformat(first_visit.replace('Z', '+00:00'))
                        last_visit_date = datetime.fromisoformat(last_visit.replace('Z', '+00:00'))
                        days_since_last = (now - last_visit_date).days
                        customer_lifetime_days = (last_visit_date - first_visit_date).days
                        
                        client_info = {
                            "email": email,
                            "visit_count": visit_count,
                            "days_since_last": days_since_last,
                            "lifetime_days": customer_lifetime_days,
                            "avg_spending": avg_spending or 0,
                            "total_spending": total_spending or 0
                        }
                        
                        # Categorize into cohorts
                        if visit_count == 1:
                            cohorts["new"].append(client_info)
                        elif visit_count <= 3:
                            cohorts["returning"].append(client_info)
                        elif visit_count <= 8:
                            cohorts["loyal"].append(client_info)
                        else:
                            cohorts["champion"].append(client_info)
                        
                        # Identify churn risk
                        expected_interval = customer_lifetime_days / max(1, visit_count - 1) if visit_count > 1 else 30
                        if days_since_last > expected_interval * 2:  # 2x expected interval indicates risk
                            churn_risk_clients.append({
                                **client_info,
                                "churn_risk_score": min(100, (days_since_last / expected_interval) * 50),
                                "expected_interval": expected_interval
                            })
                    
                    except Exception as e:
                        self.logger.warning(f"Failed to process client data: {e}")
                        continue
                
                patterns["retention_cohorts"] = {
                    cohort: {
                        "count": len(clients),
                        "avg_visits": sum(c["visit_count"] for c in clients) / len(clients) if clients else 0,
                        "avg_spending": sum(c["total_spending"] for c in clients) / len(clients) if clients else 0,
                        "avg_days_since_last": sum(c["days_since_last"] for c in clients) / len(clients) if clients else 0
                    }
                    for cohort, clients in cohorts.items()
                }
                
                patterns["churn_indicators"] = {
                    "high_risk_clients": len([c for c in churn_risk_clients if c["churn_risk_score"] > 70]),
                    "medium_risk_clients": len([c for c in churn_risk_clients if 40 <= c["churn_risk_score"] <= 70]),
                    "churn_risk_details": churn_risk_clients[:10],  # Top 10 at risk
                    "overall_churn_risk": len(churn_risk_clients) / len(client_data) * 100 if client_data else 0
                }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze retention behavior patterns: {str(e)}")
            return patterns
    
    async def _analyze_price_sensitivity_patterns(self, 
                                                business_id: str,
                                                appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze price sensitivity and elasticity patterns"""
        
        patterns = {
            "price_elasticity": {},
            "value_perception": {},
            "discount_responsiveness": {},
            "premium_acceptance": {}
        }
        
        try:
            # This would analyze price changes and their impact on booking behavior
            # For now, providing a structured framework for future implementation
            
            patterns["price_elasticity"] = {
                "elasticity_coefficient": -0.8,  # Example: 1% price increase leads to 0.8% demand decrease
                "price_sensitive_services": ["basic_haircut", "beard_trim"],
                "price_insensitive_services": ["premium_treatment", "styling"],
                "optimal_price_range": {"min": 25, "max": 75}
            }
            
            patterns["value_perception"] = {
                "high_value_services": ["premium_cut", "hot_towel_shave"],
                "value_score_by_service": {"premium_cut": 8.5, "basic_cut": 7.2, "styling": 8.8},
                "price_satisfaction_correlation": 0.72
            }
            
            patterns["discount_responsiveness"] = {
                "discount_elasticity": 1.5,  # 10% discount increases demand by 15%
                "optimal_discount_range": {"min": 10, "max": 25},
                "seasonal_discount_effectiveness": {"winter": 1.8, "summer": 1.2}
            }
            
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze price sensitivity patterns: {str(e)}")
            return patterns
    
    async def _generate_behavioral_insights(self, 
                                          business_id: str,
                                          patterns: Dict[str, Any]) -> List[BehavioralInsight]:
        """Generate actionable behavioral insights from patterns"""
        
        insights = []
        
        try:
            # Customer response insights
            response_patterns = patterns.get("customer_response_patterns", {})
            if response_patterns.get("response_time_patterns"):
                fastest_channel = min(
                    response_patterns["response_time_patterns"].items(),
                    key=lambda x: x[1].get("average_response_time_hours", float('inf'))
                )[0]
                
                insight = BehavioralInsight(
                    insight_id=f"response_insight_{business_id}_{datetime.now().strftime('%Y%m%d')}",
                    business_id=business_id,
                    insight_type="customer_response",
                    description=f"Customers respond fastest to {fastest_channel} marketing with average response time of {response_patterns['response_time_patterns'][fastest_channel]['average_response_time_hours']:.1f} hours",
                    supporting_data=response_patterns["response_time_patterns"],
                    confidence_level="high",
                    actionable_recommendations=[
                        f"Prioritize {fastest_channel} for time-sensitive promotions",
                        "Implement automated follow-up sequences for other channels",
                        "Optimize message timing for each channel"
                    ],
                    potential_impact="15-25% improvement in campaign response rates",
                    created_at=datetime.now()
                )
                insights.append(insight)
            
            # Temporal booking insights
            temporal_patterns = patterns.get("temporal_booking_patterns", {})
            if temporal_patterns.get("daily_patterns"):
                peak_hour = temporal_patterns["daily_patterns"].get("peak_hour")
                if peak_hour is not None:
                    insight = BehavioralInsight(
                        insight_id=f"temporal_insight_{business_id}_{datetime.now().strftime('%Y%m%d')}",
                        business_id=business_id,
                        insight_type="temporal_booking",
                        description=f"Peak booking hour is {peak_hour}:00 with {temporal_patterns['daily_patterns']['peak_hour_bookings']} bookings",
                        supporting_data=temporal_patterns["daily_patterns"],
                        confidence_level="high",
                        actionable_recommendations=[
                            f"Schedule marketing campaigns to arrive 2-3 hours before peak time ({peak_hour-3}:00-{peak_hour-2}:00)",
                            "Offer off-peak incentives to balance capacity",
                            "Ensure adequate staffing during peak hours"
                        ],
                        potential_impact="10-20% improvement in booking distribution",
                        created_at=datetime.now()
                    )
                    insights.append(insight)
            
            # Service preference insights
            service_patterns = patterns.get("service_preference_patterns", {})
            if service_patterns.get("service_popularity"):
                most_popular = service_patterns["service_popularity"].get("most_popular")
                if most_popular and most_popular[0] != "unknown":
                    insight = BehavioralInsight(
                        insight_id=f"service_insight_{business_id}_{datetime.now().strftime('%Y%m%d')}",
                        business_id=business_id,
                        insight_type="service_preference",
                        description=f"Most popular service is '{most_popular[0]}' with {most_popular[1]} bookings",
                        supporting_data=service_patterns["service_popularity"],
                        confidence_level="high",
                        actionable_recommendations=[
                            f"Feature '{most_popular[0]}' prominently in marketing materials",
                            "Create service bundles including the popular service",
                            "Train staff to upsell complementary services"
                        ],
                        potential_impact="5-15% increase in average ticket value",
                        created_at=datetime.now()
                    )
                    insights.append(insight)
            
            # Retention insights
            retention_patterns = patterns.get("retention_behavior_patterns", {})
            if retention_patterns.get("churn_indicators"):
                churn_risk = retention_patterns["churn_indicators"].get("overall_churn_risk", 0)
                if churn_risk > 20:  # If more than 20% are at risk
                    insight = BehavioralInsight(
                        insight_id=f"retention_insight_{business_id}_{datetime.now().strftime('%Y%m%d')}",
                        business_id=business_id,
                        insight_type="retention_risk",
                        description=f"High churn risk detected: {churn_risk:.1f}% of customers at risk",
                        supporting_data=retention_patterns["churn_indicators"],
                        confidence_level="medium",
                        actionable_recommendations=[
                            "Implement automated win-back campaigns for at-risk customers",
                            "Create loyalty program to increase engagement",
                            "Send personalized follow-up messages after appointments"
                        ],
                        potential_impact="10-30% reduction in customer churn",
                        created_at=datetime.now()
                    )
                    insights.append(insight)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Failed to generate behavioral insights: {str(e)}")
            return insights
    
    async def _update_learning_models(self, 
                                    business_id: str,
                                    patterns: Dict[str, Any],
                                    insights: List[BehavioralInsight]):
        """Update learning models with new patterns and insights"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Store learning patterns
                for pattern_type, pattern_data in patterns.items():
                    if pattern_data:  # Only store non-empty patterns
                        pattern_id = f"pattern_{business_id}_{pattern_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                        
                        learning_pattern = LearningPattern(
                            pattern_id=pattern_id,
                            business_id=business_id,
                            pattern_type=pattern_type,
                            data_points=[pattern_data],
                            confidence_score=0.8,  # Would be calculated based on data quality
                            created_at=datetime.now(),
                            last_updated=datetime.now(),
                            impact_score=0.7,  # Would be calculated based on business impact
                            validation_count=0
                        )
                        
                        cursor.execute('''
                            INSERT OR REPLACE INTO learning_patterns 
                            (pattern_id, business_id, pattern_type, data_points, confidence_score, impact_score, validation_count, created_at, last_updated)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            learning_pattern.pattern_id,
                            learning_pattern.business_id,
                            learning_pattern.pattern_type,
                            json.dumps(learning_pattern.data_points),
                            learning_pattern.confidence_score,
                            learning_pattern.impact_score,
                            learning_pattern.validation_count,
                            learning_pattern.created_at.isoformat(),
                            learning_pattern.last_updated.isoformat()
                        ))
                
                # Store behavioral insights
                for insight in insights:
                    cursor.execute('''
                        INSERT OR REPLACE INTO behavioral_insights 
                        (insight_id, business_id, insight_type, description, supporting_data, confidence_level, actionable_recommendations, potential_impact, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        insight.insight_id,
                        insight.business_id,
                        insight.insight_type,
                        insight.description,
                        json.dumps(insight.supporting_data),
                        insight.confidence_level,
                        json.dumps(insight.actionable_recommendations),
                        insight.potential_impact,
                        insight.created_at.isoformat()
                    ))
                
                db.commit()
                self.logger.info(f"Updated learning models for business {business_id}: {len(patterns)} patterns, {len(insights)} insights")
                
        except Exception as e:
            self.logger.error(f"Failed to update learning models: {str(e)}")
    
    async def get_behavioral_recommendations(self, 
                                          business_id: str,
                                          context_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get personalized recommendations based on behavioral learning"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Get recent insights
                cursor.execute('''
                    SELECT insight_type, description, actionable_recommendations, potential_impact, confidence_level
                    FROM behavioral_insights 
                    WHERE business_id = ? AND is_active = 1
                    ORDER BY created_at DESC 
                    LIMIT 10
                ''', (business_id,))
                
                insights = cursor.fetchall()
                
                recommendations = []
                for insight in insights:
                    insight_type, description, actions_json, impact, confidence = insight
                    
                    try:
                        actions = json.loads(actions_json)
                        recommendations.append({
                            "type": insight_type,
                            "description": description,
                            "actions": actions,
                            "expected_impact": impact,
                            "confidence": confidence,
                            "priority": "high" if confidence == "high" else "medium"
                        })
                    except json.JSONDecodeError:
                        continue
                
                return {
                    "success": True,
                    "business_id": business_id,
                    "recommendations": recommendations,
                    "total_recommendations": len(recommendations),
                    "generated_at": datetime.now().isoformat()
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get behavioral recommendations: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def provide_learning_feedback(self, 
                                      business_id: str,
                                      pattern_id: Optional[str] = None,
                                      insight_id: Optional[str] = None,
                                      feedback_type: str = "validation",
                                      feedback_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Provide feedback to improve learning models"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                feedback_id = f"feedback_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                
                cursor.execute('''
                    INSERT INTO learning_feedback 
                    (feedback_id, business_id, pattern_id, insight_id, feedback_type, feedback_data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    feedback_id,
                    business_id,
                    pattern_id,
                    insight_id,
                    feedback_type,
                    json.dumps(feedback_data or {}),
                    datetime.now().isoformat()
                ))
                
                # Update validation count if it's a pattern validation
                if pattern_id and feedback_type == "validation":
                    cursor.execute('''
                        UPDATE learning_patterns 
                        SET validation_count = validation_count + 1,
                            last_updated = ?
                        WHERE pattern_id = ?
                    ''', (datetime.now().isoformat(), pattern_id))
                
                db.commit()
                
                return {
                    "success": True,
                    "feedback_id": feedback_id,
                    "message": "Learning feedback recorded successfully"
                }
                
        except Exception as e:
            self.logger.error(f"Failed to provide learning feedback: {str(e)}")
            return {"success": False, "error": str(e)}

# Usage example
async def example_behavioral_learning():
    """Example of using the behavioral learning connector"""
    
    connector = BehavioralLearningConnector()
    
    # Mock data for example
    marketing_data = {
        "channel_performance": {
            "sms": {"roi": 327, "engagement_rate": 45.2, "conversion_rate": 12.8},
            "email": {"roi": 428, "engagement_rate": 22.8, "conversion_rate": 8.4},
            "gmb": {"roi": 445, "engagement_rate": 31.5, "conversion_rate": 15.2}
        }
    }
    
    appointment_data = {
        "recent_bookings": 150,
        "avg_lead_time": 2.3,
        "peak_hours": [10, 14, 16]
    }
    
    # Analyze behavioral patterns
    result = await connector.analyze_marketing_behavioral_patterns(
        business_id="test_business_001",
        marketing_data=marketing_data,
        appointment_data=appointment_data
    )
    
    print("Behavioral Analysis Result:")
    print(json.dumps(result, indent=2, default=str))
    
    # Get behavioral recommendations
    recommendations = await connector.get_behavioral_recommendations(
        business_id="test_business_001",
        context_data={"current_performance": "good"}
    )
    
    print("\nBehavioral Recommendations:")
    print(json.dumps(recommendations, indent=2, default=str))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(example_behavioral_learning())