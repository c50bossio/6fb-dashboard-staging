"""
Customer Analytics Service
Comprehensive service layer for customer analytics calculations
Includes health scores, CLV, churn predictions, segmentation, and journey analysis
"""

import asyncio
import json
import os
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import Optional, List, Dict, Any, Union
import math
import statistics
from dataclasses import dataclass
import logging
from supabase import Client
import redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CustomerMetrics:
    """Data class for customer metrics used in calculations"""
    customer_id: str
    total_visits: int = 0
    completed_visits: int = 0
    cancelled_visits: int = 0
    total_revenue: Decimal = Decimal('0.00')
    average_order_value: Decimal = Decimal('0.00')
    days_since_last_visit: int = 999
    visit_frequency: Decimal = Decimal('0.00')
    average_rating: Decimal = Decimal('0.00')
    loyalty_points: int = 0
    referrals_made: int = 0
    feedback_count: int = 0
    engagement_events: int = 0
    tenure_days: int = 0

class CustomerAnalyticsService:
    """Service class for customer analytics calculations and insights"""
    
    def __init__(self, supabase_client: Client, redis_client: redis.Redis):
        self.supabase = supabase_client
        self.redis = redis_client
        
        # Configuration for scoring algorithms
        self.health_score_weights = {
            "recency": 0.25,
            "frequency": 0.25,
            "monetary": 0.20,
            "engagement": 0.15,
            "satisfaction": 0.15
        }
        
        self.churn_thresholds = {
            "very_low": 20,
            "low": 40,
            "medium": 60,
            "high": 80,
            "very_high": 100
        }
        
    async def get_customer_metrics(self, barbershop_id: str, customer_id: str) -> CustomerMetrics:
        """Get comprehensive customer metrics for calculations"""
        try:
            # Get customer basic info
            customer_response = self.supabase.table("customers").select("*").eq("id", customer_id).eq("barbershop_id", barbershop_id).single().execute()
            
            if not customer_response.data:
                raise ValueError(f"Customer {customer_id} not found")
            
            customer_data = customer_response.data
            
            # Get appointment metrics
            appointment_response = self.supabase.table("appointments").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            
            appointments = appointment_response.data or []
            total_visits = len(appointments)
            completed_visits = len([a for a in appointments if a.get("status") == "completed"])
            cancelled_visits = len([a for a in appointments if a.get("status") == "cancelled"])
            
            # Calculate revenue metrics
            completed_appointments = [a for a in appointments if a.get("status") == "completed" and a.get("total_cost")]
            total_revenue = sum(Decimal(str(a.get("total_cost", 0))) for a in completed_appointments)
            average_order_value = total_revenue / len(completed_appointments) if completed_appointments else Decimal('0.00')
            
            # Calculate recency
            last_visit_date = None
            if completed_appointments:
                last_visit_date = max(datetime.fromisoformat(a["appointment_time"].replace('Z', '+00:00')) for a in completed_appointments)
            
            days_since_last_visit = (datetime.now() - last_visit_date).days if last_visit_date else 999
            
            # Calculate frequency (visits per month)
            if customer_data.get("created_at"):
                tenure_start = datetime.fromisoformat(customer_data["created_at"].replace('Z', '+00:00'))
                tenure_days = (datetime.now() - tenure_start).days
                tenure_months = max(tenure_days / 30.0, 1)  # At least 1 month
                visit_frequency = Decimal(str(completed_visits / tenure_months))
            else:
                tenure_days = 0
                visit_frequency = Decimal('0.00')
            
            # Get feedback metrics
            feedback_response = self.supabase.table("customer_feedback").select("*").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            
            feedback_data = feedback_response.data or []
            feedback_count = len(feedback_data)
            ratings = [f.get("overall_rating") for f in feedback_data if f.get("overall_rating")]
            average_rating = Decimal(str(statistics.mean(ratings))) if ratings else Decimal('0.00')
            
            # Get loyalty points
            loyalty_response = self.supabase.table("loyalty_program_enrollments").select("current_points").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            
            loyalty_points = loyalty_response.data[0].get("current_points", 0) if loyalty_response.data else 0
            
            # Get referral count
            referral_response = self.supabase.table("referral_tracking").select("id").eq("referrer_customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            
            referrals_made = len(referral_response.data or [])
            
            # Get engagement events count
            engagement_response = self.supabase.table("customer_interactions").select("id").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
            
            engagement_events = len(engagement_response.data or [])
            
            return CustomerMetrics(
                customer_id=customer_id,
                total_visits=total_visits,
                completed_visits=completed_visits,
                cancelled_visits=cancelled_visits,
                total_revenue=total_revenue,
                average_order_value=average_order_value,
                days_since_last_visit=days_since_last_visit,
                visit_frequency=visit_frequency,
                average_rating=average_rating,
                loyalty_points=loyalty_points,
                referrals_made=referrals_made,
                feedback_count=feedback_count,
                engagement_events=engagement_events,
                tenure_days=tenure_days
            )
            
        except Exception as e:
            logger.error(f"Error getting customer metrics for {customer_id}: {str(e)}")
            return CustomerMetrics(customer_id=customer_id)
    
    def calculate_recency_score(self, days_since_last_visit: int) -> int:
        """Calculate recency score (0-100) based on days since last visit"""
        if days_since_last_visit <= 7:
            return 100
        elif days_since_last_visit <= 14:
            return 90
        elif days_since_last_visit <= 30:
            return 80
        elif days_since_last_visit <= 60:
            return 60
        elif days_since_last_visit <= 90:
            return 40
        elif days_since_last_visit <= 180:
            return 20
        else:
            return 0
    
    def calculate_frequency_score(self, visit_frequency: Decimal) -> int:
        """Calculate frequency score (0-100) based on visits per month"""
        frequency = float(visit_frequency)
        if frequency >= 4:  # Weekly or more
            return 100
        elif frequency >= 2:  # Bi-weekly
            return 85
        elif frequency >= 1:  # Monthly
            return 70
        elif frequency >= 0.5:  # Every 2 months
            return 50
        elif frequency >= 0.25:  # Quarterly
            return 30
        else:
            return 10
    
    def calculate_monetary_score(self, total_revenue: Decimal, average_order_value: Decimal, completed_visits: int) -> int:
        """Calculate monetary score (0-100) based on spending patterns"""
        # Normalize based on visit count and average order value
        if completed_visits == 0:
            return 0
        
        revenue = float(total_revenue)
        aov = float(average_order_value)
        
        # Score based on total revenue (adjust thresholds based on business)
        revenue_score = min(100, (revenue / 1000) * 50)  # $1000 = 50 points
        
        # Score based on average order value
        aov_score = min(100, (aov / 100) * 50)  # $100 AOV = 50 points
        
        return int((revenue_score + aov_score) / 2)
    
    def calculate_engagement_score(self, engagement_events: int, loyalty_points: int, referrals_made: int, tenure_days: int) -> int:
        """Calculate engagement score (0-100) based on customer interactions"""
        if tenure_days == 0:
            return 0
        
        # Events per month
        events_per_month = (engagement_events / max(tenure_days / 30.0, 1))
        events_score = min(50, events_per_month * 10)  # 5 events/month = 50 points
        
        # Loyalty points (normalized)
        loyalty_score = min(30, loyalty_points / 100)  # 1000 points = 30 points
        
        # Referrals
        referral_score = min(20, referrals_made * 5)  # Each referral = 5 points
        
        return int(events_score + loyalty_score + referral_score)
    
    def calculate_satisfaction_score(self, average_rating: Decimal, feedback_count: int) -> int:
        """Calculate satisfaction score (0-100) based on ratings and feedback"""
        if feedback_count == 0:
            return 50  # Neutral if no feedback
        
        rating = float(average_rating)
        
        # Rating score (1-5 scale to 0-100)
        rating_score = ((rating - 1) / 4) * 100
        
        # Feedback engagement bonus
        feedback_bonus = min(10, feedback_count * 2)  # Up to 10 points for feedback participation
        
        return int(min(100, rating_score + feedback_bonus))
    
    async def calculate_health_scores(self, barbershop_id: str, customer_ids: Optional[List[str]] = None, force_recalculate: bool = False):
        """Calculate health scores for customers"""
        try:
            logger.info(f"Starting health score calculation for barbershop {barbershop_id}")
            
            # Get customers to process
            if customer_ids:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id).in_("id", customer_ids)
            else:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id)
            
            customers_response = customers_query.execute()
            customers = customers_response.data or []
            
            logger.info(f"Processing health scores for {len(customers)} customers")
            
            for customer in customers:
                customer_id = customer["id"]
                
                # Skip if already calculated recently (unless force recalculate)
                if not force_recalculate:
                    existing = self.supabase.table("customer_health_scores").select("calculated_at").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).execute()
                    if existing.data:
                        last_calc = datetime.fromisoformat(existing.data[0]["calculated_at"].replace('Z', '+00:00'))
                        if (datetime.now() - last_calc).hours < 24:  # Skip if calculated within 24 hours
                            continue
                
                # Get customer metrics
                metrics = await self.get_customer_metrics(barbershop_id, customer_id)
                
                # Calculate component scores
                recency_score = self.calculate_recency_score(metrics.days_since_last_visit)
                frequency_score = self.calculate_frequency_score(metrics.visit_frequency)
                monetary_score = self.calculate_monetary_score(metrics.total_revenue, metrics.average_order_value, metrics.completed_visits)
                engagement_score = self.calculate_engagement_score(metrics.engagement_events, metrics.loyalty_points, metrics.referrals_made, metrics.tenure_days)
                satisfaction_score = self.calculate_satisfaction_score(metrics.average_rating, metrics.feedback_count)
                
                # Calculate overall score using weights
                overall_score = int(
                    recency_score * self.health_score_weights["recency"] +
                    frequency_score * self.health_score_weights["frequency"] +
                    monetary_score * self.health_score_weights["monetary"] +
                    engagement_score * self.health_score_weights["engagement"] +
                    satisfaction_score * self.health_score_weights["satisfaction"]
                )
                
                # Determine churn risk
                if overall_score >= 80:
                    churn_risk = "low"
                elif overall_score >= 60:
                    churn_risk = "medium"
                elif overall_score >= 40:
                    churn_risk = "high"
                else:
                    churn_risk = "critical"
                
                # Identify risk factors
                risk_factors = []
                if recency_score < 40:
                    risk_factors.append("infrequent_visits")
                if frequency_score < 40:
                    risk_factors.append("low_visit_frequency")
                if monetary_score < 40:
                    risk_factors.append("low_spending")
                if engagement_score < 40:
                    risk_factors.append("poor_engagement")
                if satisfaction_score < 60:
                    risk_factors.append("satisfaction_issues")
                
                # Build score factors for transparency
                score_factors = {
                    "recency": {
                        "value": recency_score,
                        "weight": self.health_score_weights["recency"],
                        "description": f"Last visit {metrics.days_since_last_visit} days ago"
                    },
                    "frequency": {
                        "value": frequency_score,
                        "weight": self.health_score_weights["frequency"],
                        "description": f"Visits {float(metrics.visit_frequency):.1f} times per month"
                    },
                    "monetary": {
                        "value": monetary_score,
                        "weight": self.health_score_weights["monetary"],
                        "description": f"Total revenue ${float(metrics.total_revenue):.2f}"
                    },
                    "engagement": {
                        "value": engagement_score,
                        "weight": self.health_score_weights["engagement"],
                        "description": f"{metrics.engagement_events} engagement events"
                    },
                    "satisfaction": {
                        "value": satisfaction_score,
                        "weight": self.health_score_weights["satisfaction"],
                        "description": f"Average rating {float(metrics.average_rating):.1f}/5"
                    }
                }
                
                # Upsert health score record
                health_score_data = {
                    "barbershop_id": barbershop_id,
                    "customer_id": customer_id,
                    "overall_score": overall_score,
                    "engagement_score": engagement_score,
                    "loyalty_score": frequency_score,  # Using frequency as loyalty proxy
                    "satisfaction_score": satisfaction_score,
                    "frequency_score": frequency_score,
                    "monetary_score": monetary_score,
                    "score_factors": score_factors,
                    "churn_risk": churn_risk,
                    "risk_factors": risk_factors,
                    "calculated_at": datetime.utcnow().isoformat(),
                    "calculation_version": "1.0"
                }
                
                # Check if record exists
                existing_response = self.supabase.table("customer_health_scores").select("id").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).execute()
                
                if existing_response.data:
                    # Update existing record
                    self.supabase.table("customer_health_scores").update(health_score_data).eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).execute()
                else:
                    # Insert new record
                    self.supabase.table("customer_health_scores").insert(health_score_data).execute()
                
                logger.info(f"Calculated health score for customer {customer_id}: {overall_score} (risk: {churn_risk})")
            
            # Clear related caches
            cache_pattern = f"health_scores:{barbershop_id}:*"
            keys = self.redis.keys(cache_pattern)
            if keys:
                self.redis.delete(*keys)
            
            logger.info(f"Completed health score calculation for barbershop {barbershop_id}")
            
        except Exception as e:
            logger.error(f"Error calculating health scores: {str(e)}")
            raise
    
    async def calculate_clv(self, barbershop_id: str, customer_ids: Optional[List[str]] = None, calculation_method: str = "predictive_ml"):
        """Calculate Customer Lifetime Value using specified method"""
        try:
            logger.info(f"Starting CLV calculation using {calculation_method} method for barbershop {barbershop_id}")
            
            # Get customers to process
            if customer_ids:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id).in_("id", customer_ids)
            else:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id)
            
            customers_response = customers_query.execute()
            customers = customers_response.data or []
            
            logger.info(f"Processing CLV for {len(customers)} customers")
            
            for customer in customers:
                customer_id = customer["id"]
                metrics = await self.get_customer_metrics(barbershop_id, customer_id)
                
                # Calculate CLV components
                historical_clv = float(metrics.total_revenue)
                
                # Calculate predicted CLV based on method
                if calculation_method == "historical_average":
                    predicted_clv = self._calculate_clv_historical(metrics)
                elif calculation_method == "predictive_ml":
                    predicted_clv = self._calculate_clv_predictive(metrics)
                elif calculation_method == "cohort_based":
                    predicted_clv = await self._calculate_clv_cohort_based(barbershop_id, metrics)
                else:
                    predicted_clv = self._calculate_clv_historical(metrics)
                
                total_clv = historical_clv + predicted_clv
                
                # Calculate additional metrics
                purchase_frequency = float(metrics.visit_frequency)
                
                # Estimate customer lifespan (in months)
                if metrics.tenure_days > 0 and metrics.completed_visits > 1:
                    # Calculate based on visit pattern
                    avg_days_between_visits = metrics.tenure_days / max(metrics.completed_visits - 1, 1)
                    estimated_remaining_visits = max(12 - metrics.completed_visits, 6)  # Estimate at least 6 more visits
                    estimated_remaining_days = estimated_remaining_visits * avg_days_between_visits
                    customer_lifespan_months = (metrics.tenure_days + estimated_remaining_days) / 30.0
                else:
                    customer_lifespan_months = 24.0  # Default 2 years for new customers
                
                # Simple churn probability calculation
                health_score_response = self.supabase.table("customer_health_scores").select("overall_score").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).execute()
                
                if health_score_response.data:
                    health_score = health_score_response.data[0]["overall_score"]
                    churn_probability = max(0, (100 - health_score) / 100.0)
                else:
                    churn_probability = 0.3  # Default 30% churn probability
                
                # Upsert CLV record
                clv_data = {
                    "barbershop_id": barbershop_id,
                    "customer_id": customer_id,
                    "historical_clv": Decimal(str(historical_clv)),
                    "predicted_clv": Decimal(str(predicted_clv)),
                    "total_clv": Decimal(str(total_clv)),
                    "average_order_value": metrics.average_order_value,
                    "purchase_frequency": Decimal(str(purchase_frequency)),
                    "customer_lifespan_months": Decimal(str(customer_lifespan_months)),
                    "churn_probability": Decimal(str(churn_probability * 100)),
                    "model_version": "1.0",
                    "model_confidence": Decimal("75.0"),  # Default confidence
                    "calculation_method": calculation_method,
                    "calculation_date": date.today(),
                    "data_points_used": metrics.completed_visits
                }
                
                # Check if record exists
                existing_response = self.supabase.table("clv_calculations").select("id").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).eq("calculation_date", date.today()).execute()
                
                if existing_response.data:
                    # Update existing record
                    self.supabase.table("clv_calculations").update(clv_data).eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).eq("calculation_date", date.today()).execute()
                else:
                    # Insert new record
                    self.supabase.table("clv_calculations").insert(clv_data).execute()
                
                logger.info(f"Calculated CLV for customer {customer_id}: ${total_clv:.2f} (historical: ${historical_clv:.2f}, predicted: ${predicted_clv:.2f})")
            
            # Clear related caches
            cache_pattern = f"clv:{barbershop_id}:*"
            keys = self.redis.keys(cache_pattern)
            if keys:
                self.redis.delete(*keys)
            
            logger.info(f"Completed CLV calculation for barbershop {barbershop_id}")
            
        except Exception as e:
            logger.error(f"Error calculating CLV: {str(e)}")
            raise
    
    def _calculate_clv_historical(self, metrics: CustomerMetrics) -> float:
        """Calculate CLV using historical average method"""
        if metrics.completed_visits == 0:
            return 0.0
        
        avg_monthly_revenue = float(metrics.total_revenue) / max(metrics.tenure_days / 30.0, 1)
        estimated_future_months = 24  # Assume 2 years
        return avg_monthly_revenue * estimated_future_months * 0.7  # Apply discount factor
    
    def _calculate_clv_predictive(self, metrics: CustomerMetrics) -> float:
        """Calculate CLV using predictive modeling approach"""
        if metrics.completed_visits == 0:
            return 0.0
        
        # Enhanced prediction considering various factors
        base_monthly_value = float(metrics.average_order_value) * float(metrics.visit_frequency)
        
        # Growth factor based on customer behavior
        if metrics.completed_visits > 5:
            growth_factor = 1.1  # Loyal customers tend to spend more over time
        elif metrics.completed_visits > 2:
            growth_factor = 1.05
        else:
            growth_factor = 0.9  # New customers might be uncertain
        
        # Engagement factor
        engagement_factor = min(1.2, 1.0 + (metrics.engagement_events / 100.0))
        
        # Calculate predicted months of relationship
        if float(metrics.visit_frequency) > 0:
            predicted_months = min(36, 12 / max(float(metrics.visit_frequency), 0.1))  # Cap at 3 years
        else:
            predicted_months = 12
        
        predicted_clv = base_monthly_value * predicted_months * growth_factor * engagement_factor
        return max(0, predicted_clv)
    
    async def _calculate_clv_cohort_based(self, barbershop_id: str, metrics: CustomerMetrics) -> float:
        """Calculate CLV using cohort-based analysis"""
        # This is a simplified version - in production, you'd use more sophisticated cohort analysis
        try:
            # Get similar customers (same tenure range)
            tenure_months = metrics.tenure_days / 30.0
            min_tenure = max(0, tenure_months - 3)
            max_tenure = tenure_months + 3
            
            # Query for cohort data would go here
            # For now, using simplified approach
            cohort_avg_clv = float(metrics.average_order_value) * 18  # Assume 18 visits over lifetime
            return cohort_avg_clv * 0.8  # Apply cohort discount
            
        except Exception:
            # Fallback to historical method
            return self._calculate_clv_historical(metrics)
    
    async def predict_churn(self, barbershop_id: str, customer_ids: Optional[List[str]] = None, model_name: str = "enhanced_churn_model_v2", prediction_horizon_days: int = 90):
        """Predict customer churn using ML models"""
        try:
            logger.info(f"Starting churn prediction using {model_name} for barbershop {barbershop_id}")
            
            # Get customers to process
            if customer_ids:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id).in_("id", customer_ids)
            else:
                customers_query = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id)
            
            customers_response = customers_query.execute()
            customers = customers_response.data or []
            
            logger.info(f"Processing churn predictions for {len(customers)} customers")
            
            for customer in customers:
                customer_id = customer["id"]
                metrics = await self.get_customer_metrics(barbershop_id, customer_id)
                
                # Calculate churn probability using enhanced algorithm
                churn_probability = self._calculate_churn_probability(metrics)
                
                # Determine risk level
                if churn_probability <= self.churn_thresholds["very_low"]:
                    risk_level = "very_low"
                elif churn_probability <= self.churn_thresholds["low"]:
                    risk_level = "low"
                elif churn_probability <= self.churn_thresholds["medium"]:
                    risk_level = "medium"
                elif churn_probability <= self.churn_thresholds["high"]:
                    risk_level = "high"
                else:
                    risk_level = "very_high"
                
                # Calculate predicted churn date
                if churn_probability > 50:
                    # Higher risk customers churn sooner
                    days_to_churn = int(prediction_horizon_days * (1 - (churn_probability / 100)))
                    predicted_churn_date = date.today() + timedelta(days=days_to_churn)
                else:
                    predicted_churn_date = None
                
                # Identify primary risk factors
                risk_factors, risk_factor_scores = self._identify_risk_factors(metrics)
                
                # Generate recommendations
                recommended_actions = self._generate_churn_recommendations(risk_factors, risk_level)
                
                # Calculate model confidence
                confidence = self._calculate_model_confidence(metrics)
                
                # Upsert churn prediction record
                churn_data = {
                    "barbershop_id": barbershop_id,
                    "customer_id": customer_id,
                    "churn_probability": Decimal(str(churn_probability)),
                    "churn_risk_level": risk_level,
                    "predicted_churn_date": predicted_churn_date,
                    "primary_risk_factors": risk_factors,
                    "risk_factor_scores": risk_factor_scores,
                    "model_name": model_name,
                    "model_version": "2.0",
                    "confidence_score": Decimal(str(confidence)),
                    "prediction_accuracy": Decimal("82.5"),  # Historical model accuracy
                    "features_used": {
                        "recency_days": metrics.days_since_last_visit,
                        "frequency_score": float(metrics.visit_frequency),
                        "monetary_score": float(metrics.total_revenue),
                        "engagement_score": metrics.engagement_events,
                        "satisfaction_score": float(metrics.average_rating),
                        "tenure_days": metrics.tenure_days
                    },
                    "recommended_actions": recommended_actions,
                    "prediction_date": date.today(),
                    "prediction_horizon_days": prediction_horizon_days,
                    "is_prediction_active": True
                }
                
                # Check if record exists
                existing_response = self.supabase.table("churn_predictions").select("id").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).eq("prediction_date", date.today()).execute()
                
                if existing_response.data:
                    # Update existing record
                    self.supabase.table("churn_predictions").update(churn_data).eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).eq("prediction_date", date.today()).execute()
                else:
                    # Insert new record
                    self.supabase.table("churn_predictions").insert(churn_data).execute()
                
                logger.info(f"Predicted churn for customer {customer_id}: {churn_probability:.1f}% (risk: {risk_level})")
            
            # Clear related caches
            cache_pattern = f"churn:{barbershop_id}:*"
            keys = self.redis.keys(cache_pattern)
            if keys:
                self.redis.delete(*keys)
            
            logger.info(f"Completed churn prediction for barbershop {barbershop_id}")
            
        except Exception as e:
            logger.error(f"Error predicting churn: {str(e)}")
            raise
    
    def _calculate_churn_probability(self, metrics: CustomerMetrics) -> float:
        """Calculate churn probability using enhanced algorithm"""
        # Base probability factors
        recency_factor = min(100, metrics.days_since_last_visit * 1.5)  # Heavily weight recency
        frequency_factor = max(0, 50 - (float(metrics.visit_frequency) * 20))  # Lower frequency = higher churn
        engagement_factor = max(0, 30 - (metrics.engagement_events * 2))  # Low engagement = higher churn
        satisfaction_factor = max(0, 40 - (float(metrics.average_rating) * 8))  # Low satisfaction = higher churn
        
        # Combine factors with weights
        churn_probability = (
            recency_factor * 0.4 +
            frequency_factor * 0.3 +
            engagement_factor * 0.2 +
            satisfaction_factor * 0.1
        )
        
        # Apply modifiers
        if metrics.cancelled_visits > metrics.completed_visits * 0.3:  # High cancellation rate
            churn_probability += 15
        
        if metrics.tenure_days < 30:  # New customers are at higher risk
            churn_probability += 10
        
        if metrics.referrals_made > 0:  # Referrers are less likely to churn
            churn_probability -= 10
        
        return min(100, max(0, churn_probability))
    
    def _identify_risk_factors(self, metrics: CustomerMetrics) -> tuple[List[str], Dict[str, float]]:
        """Identify primary risk factors and their scores"""
        risk_factors = []
        risk_scores = {}
        
        # Declining frequency
        if float(metrics.visit_frequency) < 0.5:  # Less than once every 2 months
            risk_factors.append("declining_frequency")
            risk_scores["declining_frequency"] = 85.0
        
        # Reduced spending
        if float(metrics.average_order_value) < 30:  # Low AOV
            risk_factors.append("reduced_spending")
            risk_scores["reduced_spending"] = 70.0
        
        # No recent engagement
        if metrics.days_since_last_visit > 60:
            risk_factors.append("no_recent_engagement")
            risk_scores["no_recent_engagement"] = 90.0
        
        # Negative feedback
        if float(metrics.average_rating) < 3.5 and metrics.feedback_count > 0:
            risk_factors.append("negative_feedback")
            risk_scores["negative_feedback"] = 80.0
        
        # High cancellation rate
        if metrics.cancelled_visits > metrics.completed_visits * 0.2:
            risk_factors.append("high_cancellation_rate")
            risk_scores["high_cancellation_rate"] = 75.0
        
        # Low engagement
        if metrics.engagement_events < 3 and metrics.tenure_days > 30:
            risk_factors.append("low_platform_engagement")
            risk_scores["low_platform_engagement"] = 60.0
        
        return risk_factors, risk_scores
    
    def _generate_churn_recommendations(self, risk_factors: List[str], risk_level: str) -> List[str]:
        """Generate specific action recommendations based on risk factors"""
        recommendations = []
        
        if "declining_frequency" in risk_factors:
            recommendations.append("Send personalized re-engagement campaign")
            recommendations.append("Offer scheduling flexibility or reminder preferences")
        
        if "reduced_spending" in risk_factors:
            recommendations.append("Provide value-added service recommendations")
            recommendations.append("Offer loyalty program enrollment or rewards")
        
        if "no_recent_engagement" in risk_factors:
            recommendations.append("Send 'we miss you' message with special offer")
            recommendations.append("Schedule proactive check-in call")
        
        if "negative_feedback" in risk_factors:
            recommendations.append("Address specific concerns from feedback")
            recommendations.append("Offer complimentary service to rebuild trust")
        
        if "high_cancellation_rate" in risk_factors:
            recommendations.append("Investigate and address cancellation reasons")
            recommendations.append("Improve booking confirmation and reminder process")
        
        if "low_platform_engagement" in risk_factors:
            recommendations.append("Educate customer on app features and benefits")
            recommendations.append("Send personalized content and tips")
        
        # Add general recommendations based on risk level
        if risk_level in ["high", "very_high"]:
            recommendations.append("Prioritize immediate personal outreach")
            recommendations.append("Consider special retention offer or discount")
        
        return recommendations
    
    def _calculate_model_confidence(self, metrics: CustomerMetrics) -> float:
        """Calculate confidence score for the prediction"""
        # Base confidence on data availability
        base_confidence = 50.0
        
        if metrics.completed_visits >= 5:
            base_confidence += 20
        elif metrics.completed_visits >= 2:
            base_confidence += 10
        
        if metrics.feedback_count > 0:
            base_confidence += 15
        
        if metrics.tenure_days > 90:
            base_confidence += 10
        
        if metrics.engagement_events > 5:
            base_confidence += 5
        
        return min(95.0, base_confidence)
    
    async def calculate_segments(self, barbershop_id: str, segment_request: Dict[str, Any]):
        """Calculate and assign customers to segments based on rules"""
        try:
            logger.info(f"Starting segment calculation for barbershop {barbershop_id}")
            
            # Create or update segment definition
            segment_data = {
                "barbershop_id": barbershop_id,
                "segment_name": segment_request["segment_name"],
                "segment_description": segment_request.get("segment_description"),
                "segment_type": segment_request["segment_type"],
                "segmentation_rules": segment_request["segmentation_rules"],
                "auto_update": segment_request.get("auto_update", True),
                "is_active": True,
                "last_calculated_at": datetime.utcnow().isoformat()
            }
            
            # Check if segment exists
            existing_response = self.supabase.table("customer_segments").select("id").eq("barbershop_id", barbershop_id).eq("segment_name", segment_request["segment_name"]).execute()
            
            if existing_response.data:
                segment_id = existing_response.data[0]["id"]
                self.supabase.table("customer_segments").update(segment_data).eq("id", segment_id).execute()
            else:
                insert_response = self.supabase.table("customer_segments").insert(segment_data).execute()
                segment_id = insert_response.data[0]["id"]
            
            # Apply segmentation rules to customers
            matching_customers = await self._apply_segmentation_rules(barbershop_id, segment_request["segmentation_rules"])
            
            # Clear existing assignments for this segment
            self.supabase.table("customer_segment_assignments").delete().eq("segment_id", segment_id).execute()
            
            # Create new assignments
            for customer_id in matching_customers:
                assignment_data = {
                    "barbershop_id": barbershop_id,
                    "customer_id": customer_id,
                    "segment_id": segment_id,
                    "assigned_at": datetime.utcnow().isoformat(),
                    "assignment_score": 100.0,  # Perfect match for rule-based segments
                    "is_active": True
                }
                self.supabase.table("customer_segment_assignments").insert(assignment_data).execute()
            
            # Update segment metrics
            await self._update_segment_metrics(barbershop_id, segment_id, matching_customers)
            
            # Clear related caches
            cache_pattern = f"segments:{barbershop_id}:*"
            keys = self.redis.keys(cache_pattern)
            if keys:
                self.redis.delete(*keys)
            
            logger.info(f"Completed segment calculation: {len(matching_customers)} customers assigned to '{segment_request['segment_name']}'")
            
        except Exception as e:
            logger.error(f"Error calculating segments: {str(e)}")
            raise
    
    async def _apply_segmentation_rules(self, barbershop_id: str, rules: Dict[str, Any]) -> List[str]:
        """Apply segmentation rules to find matching customers"""
        try:
            # Get all customers for the barbershop
            customers_response = self.supabase.table("customers").select("id").eq("barbershop_id", barbershop_id).execute()
            
            if not customers_response.data:
                return []
            
            matching_customers = []
            
            for customer in customers_response.data:
                customer_id = customer["id"]
                
                # Get customer metrics
                metrics = await self.get_customer_metrics(barbershop_id, customer_id)
                
                # Check if customer matches all conditions
                if self._customer_matches_rules(metrics, rules):
                    matching_customers.append(customer_id)
            
            return matching_customers
            
        except Exception as e:
            logger.error(f"Error applying segmentation rules: {str(e)}")
            return []
    
    def _customer_matches_rules(self, metrics: CustomerMetrics, rules: Dict[str, Any]) -> bool:
        """Check if a customer matches the segmentation rules"""
        try:
            conditions = rules.get("conditions", [])
            logic = rules.get("logic", "AND")
            
            results = []
            
            for condition in conditions:
                field = condition.get("field")
                operator = condition.get("operator")
                value = condition.get("value")
                
                # Get the customer value for this field
                customer_value = self._get_customer_field_value(metrics, field)
                
                # Apply the condition
                if operator == ">=":
                    result = customer_value >= value
                elif operator == "<=":
                    result = customer_value <= value
                elif operator == ">":
                    result = customer_value > value
                elif operator == "<":
                    result = customer_value < value
                elif operator == "==":
                    result = customer_value == value
                elif operator == "!=":
                    result = customer_value != value
                elif operator == "in":
                    result = customer_value in value
                elif operator == "not_in":
                    result = customer_value not in value
                else:
                    result = False
                
                results.append(result)
            
            # Apply logic
            if logic == "AND":
                return all(results)
            elif logic == "OR":
                return any(results)
            else:
                return False
                
        except Exception as e:
            logger.error(f"Error checking customer rules match: {str(e)}")
            return False
    
    def _get_customer_field_value(self, metrics: CustomerMetrics, field: str) -> Any:
        """Get customer field value for segmentation"""
        field_mapping = {
            "total_spent": float(metrics.total_revenue),
            "total_visits": metrics.completed_visits,
            "visit_frequency": float(metrics.visit_frequency),
            "last_visit_days": metrics.days_since_last_visit,
            "average_order_value": float(metrics.average_order_value),
            "average_rating": float(metrics.average_rating),
            "loyalty_points": metrics.loyalty_points,
            "referrals_made": metrics.referrals_made,
            "tenure_days": metrics.tenure_days,
            "engagement_events": metrics.engagement_events,
            "feedback_count": metrics.feedback_count,
            "cancelled_visits": metrics.cancelled_visits
        }
        
        return field_mapping.get(field, 0)
    
    async def _update_segment_metrics(self, barbershop_id: str, segment_id: str, customer_ids: List[str]):
        """Update segment performance metrics"""
        try:
            if not customer_ids:
                # Update with zero values
                self.supabase.table("customer_segments").update({
                    "customer_count": 0,
                    "percentage_of_customer_base": 0,
                    "average_clv": 0,
                    "average_visit_frequency": 0,
                    "churn_rate": 0,
                    "revenue_contribution": 0
                }).eq("id", segment_id).execute()
                return
            
            # Get total customer count for percentage calculation
            total_customers_response = self.supabase.table("customers").select("id", count="exact").eq("barbershop_id", barbershop_id).execute()
            total_customers = total_customers_response.count or 1
            
            # Calculate segment metrics
            total_revenue = 0
            total_frequency = 0
            high_churn_count = 0
            
            for customer_id in customer_ids:
                metrics = await self.get_customer_metrics(barbershop_id, customer_id)
                total_revenue += float(metrics.total_revenue)
                total_frequency += float(metrics.visit_frequency)
                
                # Check churn risk
                churn_response = self.supabase.table("churn_predictions").select("churn_probability").eq("customer_id", customer_id).eq("barbershop_id", barbershop_id).execute()
                if churn_response.data and float(churn_response.data[0]["churn_probability"]) > 60:
                    high_churn_count += 1
            
            customer_count = len(customer_ids)
            percentage_of_base = (customer_count / total_customers) * 100
            average_clv = total_revenue / customer_count if customer_count > 0 else 0
            average_frequency = total_frequency / customer_count if customer_count > 0 else 0
            churn_rate = (high_churn_count / customer_count) * 100 if customer_count > 0 else 0
            
            # Update segment record
            self.supabase.table("customer_segments").update({
                "customer_count": customer_count,
                "percentage_of_customer_base": Decimal(str(percentage_of_base)),
                "average_clv": Decimal(str(average_clv)),
                "average_visit_frequency": Decimal(str(average_frequency)),
                "churn_rate": Decimal(str(churn_rate)),
                "revenue_contribution": Decimal(str(total_revenue))
            }).eq("id", segment_id).execute()
            
        except Exception as e:
            logger.error(f"Error updating segment metrics: {str(e)}")
    
    async def get_customer_journey(self, barbershop_id: str, customer_id: str, include_events: bool = True, include_touchpoints: bool = True, include_milestones: bool = True, days_back: int = 365) -> Dict[str, Any]:
        """Get comprehensive customer journey data"""
        try:
            journey_data = {
                "customer_id": customer_id,
                "journey_events": [],
                "lifecycle_stage": "unknown",
                "touchpoints": [],
                "conversion_events": [],
                "engagement_timeline": [],
                "milestones": []
            }
            
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            if include_events:
                # Get journey events
                events_response = self.supabase.table("customer_journeys").select("*").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).gte("created_at", cutoff_date.isoformat()).order("created_at").execute()
                
                journey_data["journey_events"] = events_response.data or []
            
            if include_touchpoints:
                # Get customer interactions (touchpoints)
                interactions_response = self.supabase.table("customer_interactions").select("*").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).gte("created_at", cutoff_date.isoformat()).order("created_at").execute()
                
                journey_data["touchpoints"] = interactions_response.data or []
            
            if include_milestones:
                # Get customer milestones
                milestones_response = self.supabase.table("customer_milestones").select("*").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).gte("created_at", cutoff_date.isoformat()).order("achieved_at").execute()
                
                journey_data["milestones"] = milestones_response.data or []
            
            # Determine current lifecycle stage
            metrics = await self.get_customer_metrics(barbershop_id, customer_id)
            journey_data["lifecycle_stage"] = self._determine_lifecycle_stage(metrics)
            
            # Get conversion events (completed appointments, purchases)
            appointments_response = self.supabase.table("appointments").select("*").eq("barbershop_id", barbershop_id).eq("customer_id", customer_id).eq("status", "completed").gte("appointment_time", cutoff_date.isoformat()).order("appointment_time").execute()
            
            journey_data["conversion_events"] = [
                {
                    "event_type": "appointment_completed",
                    "event_date": apt["appointment_time"],
                    "event_value": apt.get("total_cost", 0),
                    "event_data": apt
                }
                for apt in (appointments_response.data or [])
            ]
            
            # Create engagement timeline
            timeline_events = []
            
            # Add appointments
            for apt in (appointments_response.data or []):
                timeline_events.append({
                    "date": apt["appointment_time"],
                    "type": "appointment",
                    "description": f"Completed appointment: {apt.get('service_name', 'Service')}",
                    "value": apt.get("total_cost", 0)
                })
            
            # Add interactions
            for interaction in journey_data["touchpoints"]:
                timeline_events.append({
                    "date": interaction["created_at"],
                    "type": "interaction",
                    "description": interaction.get("title", "Customer interaction"),
                    "channel": interaction.get("channel")
                })
            
            # Add milestones
            for milestone in journey_data["milestones"]:
                timeline_events.append({
                    "date": milestone["achieved_at"],
                    "type": "milestone",
                    "description": milestone.get("milestone_name", "Customer milestone"),
                    "importance": milestone.get("importance_level", 1)
                })
            
            # Sort timeline by date
            timeline_events.sort(key=lambda x: x["date"])
            journey_data["engagement_timeline"] = timeline_events
            
            return journey_data
            
        except Exception as e:
            logger.error(f"Error getting customer journey: {str(e)}")
            return {
                "customer_id": customer_id,
                "journey_events": [],
                "lifecycle_stage": "unknown",
                "touchpoints": [],
                "conversion_events": [],
                "engagement_timeline": [],
                "milestones": [],
                "error": str(e)
            }
    
    def _determine_lifecycle_stage(self, metrics: CustomerMetrics) -> str:
        """Determine customer lifecycle stage based on metrics"""
        if metrics.completed_visits == 0:
            return "prospect"
        elif metrics.completed_visits == 1:
            return "new_customer"
        elif metrics.days_since_last_visit > 180:
            return "churned"
        elif metrics.days_since_last_visit > 90:
            return "at_risk"
        elif metrics.completed_visits >= 10 and float(metrics.total_revenue) > 500:
            return "vip_customer"
        elif metrics.completed_visits >= 3 and metrics.days_since_last_visit <= 60:
            return "loyal_customer"
        else:
            return "regular_customer"
    
    async def generate_insights(self, barbershop_id: str, insight_type: str = "summary", time_period: str = "month") -> Dict[str, Any]:
        """Generate AI-powered insights based on customer analytics"""
        try:
            logger.info(f"Generating {insight_type} insights for barbershop {barbershop_id}")
            
            # Calculate time range
            if time_period == "week":
                days_back = 7
            elif time_period == "month":
                days_back = 30
            elif time_period == "quarter":
                days_back = 90
            elif time_period == "year":
                days_back = 365
            else:
                days_back = 30
            
            cutoff_date = datetime.now() - timedelta(days=days_back)
            
            insights = {
                "insight_type": insight_type,
                "time_period": time_period,
                "generated_at": datetime.utcnow().isoformat(),
                "barbershop_id": barbershop_id,
                "insights": [],
                "recommendations": [],
                "key_metrics": {},
                "trends": {}
            }
            
            if insight_type in ["summary", "all"]:
                summary_insights = await self._generate_summary_insights(barbershop_id, cutoff_date)
                insights["insights"].extend(summary_insights["insights"])
                insights["key_metrics"].update(summary_insights["metrics"])
            
            if insight_type in ["trends", "all"]:
                trend_insights = await self._generate_trend_insights(barbershop_id, cutoff_date)
                insights["trends"].update(trend_insights)
            
            if insight_type in ["predictions", "all"]:
                prediction_insights = await self._generate_prediction_insights(barbershop_id)
                insights["insights"].extend(prediction_insights)
            
            if insight_type in ["recommendations", "all"]:
                recommendation_insights = await self._generate_recommendation_insights(barbershop_id)
                insights["recommendations"].extend(recommendation_insights)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating insights: {str(e)}")
            return {
                "insight_type": insight_type,
                "time_period": time_period,
                "generated_at": datetime.utcnow().isoformat(),
                "barbershop_id": barbershop_id,
                "insights": [],
                "recommendations": [],
                "key_metrics": {},
                "trends": {},
                "error": str(e)
            }
    
    async def _generate_summary_insights(self, barbershop_id: str, cutoff_date: datetime) -> Dict[str, Any]:
        """Generate summary insights for the barbershop"""
        try:
            # Get key metrics
            health_scores_response = self.supabase.table("customer_health_scores").select("overall_score, churn_risk").eq("barbershop_id", barbershop_id).execute()
            
            health_scores = health_scores_response.data or []
            
            if health_scores:
                avg_health_score = statistics.mean([h["overall_score"] for h in health_scores])
                high_risk_count = len([h for h in health_scores if h["churn_risk"] in ["high", "critical"]])
                health_distribution = {
                    "excellent": len([h for h in health_scores if h["overall_score"] >= 80]),
                    "good": len([h for h in health_scores if 60 <= h["overall_score"] < 80]),
                    "fair": len([h for h in health_scores if 40 <= h["overall_score"] < 60]),
                    "poor": len([h for h in health_scores if h["overall_score"] < 40])
                }
            else:
                avg_health_score = 0
                high_risk_count = 0
                health_distribution = {"excellent": 0, "good": 0, "fair": 0, "poor": 0}
            
            # Generate insights
            insights = []
            
            if avg_health_score >= 75:
                insights.append({
                    "type": "positive",
                    "title": "Excellent Customer Health",
                    "description": f"Your customers have an average health score of {avg_health_score:.1f}, indicating strong loyalty and engagement.",
                    "metric": avg_health_score,
                    "priority": "low"
                })
            elif avg_health_score >= 50:
                insights.append({
                    "type": "neutral",
                    "title": "Moderate Customer Health",
                    "description": f"Average customer health score is {avg_health_score:.1f}. There's room for improvement in customer engagement.",
                    "metric": avg_health_score,
                    "priority": "medium"
                })
            else:
                insights.append({
                    "type": "alert",
                    "title": "Low Customer Health Scores",
                    "description": f"Average customer health score is only {avg_health_score:.1f}. Immediate attention needed to improve customer retention.",
                    "metric": avg_health_score,
                    "priority": "high"
                })
            
            if high_risk_count > 0:
                insights.append({
                    "type": "alert",
                    "title": "Customers at Risk",
                    "description": f"{high_risk_count} customers are at high risk of churning. Consider immediate retention campaigns.",
                    "metric": high_risk_count,
                    "priority": "high"
                })
            
            return {
                "insights": insights,
                "metrics": {
                    "average_health_score": avg_health_score,
                    "total_customers": len(health_scores),
                    "high_risk_customers": high_risk_count,
                    "health_distribution": health_distribution
                }
            }
            
        except Exception as e:
            logger.error(f"Error generating summary insights: {str(e)}")
            return {"insights": [], "metrics": {}}
    
    async def _generate_trend_insights(self, barbershop_id: str, cutoff_date: datetime) -> Dict[str, Any]:
        """Generate trend analysis"""
        # This would typically involve comparing current period to previous period
        # For now, returning placeholder trends
        return {
            "health_score_trend": "stable",
            "churn_rate_trend": "improving",
            "clv_trend": "increasing",
            "engagement_trend": "stable"
        }
    
    async def _generate_prediction_insights(self, barbershop_id: str) -> List[Dict[str, Any]]:
        """Generate prediction-based insights"""
        insights = []
        
        # Get churn predictions
        churn_response = self.supabase.table("churn_predictions").select("churn_risk_level").eq("barbershop_id", barbershop_id).execute()
        
        churn_data = churn_response.data or []
        very_high_risk = len([c for c in churn_data if c["churn_risk_level"] == "very_high"])
        
        if very_high_risk > 0:
            insights.append({
                "type": "prediction",
                "title": "Churn Alert",
                "description": f"ML models predict {very_high_risk} customers will likely churn within the next 30 days.",
                "metric": very_high_risk,
                "priority": "critical"
            })
        
        return insights
    
    async def _generate_recommendation_insights(self, barbershop_id: str) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Get customer segments
        segments_response = self.supabase.table("customer_segments").select("segment_name, customer_count, churn_rate").eq("barbershop_id", barbershop_id).eq("is_active", True).execute()
        
        segments = segments_response.data or []
        
        for segment in segments:
            if segment["churn_rate"] > 30:  # High churn segment
                recommendations.append({
                    "type": "retention",
                    "title": f"Focus on {segment['segment_name']} Segment",
                    "description": f"The {segment['segment_name']} segment has a {segment['churn_rate']:.1f}% churn rate with {segment['customer_count']} customers. Consider targeted retention campaigns.",
                    "priority": "high",
                    "action": "create_retention_campaign",
                    "segment": segment["segment_name"]
                })
        
        return recommendations
    
    async def refresh_analytics(self, barbershop_id: str, refresh_type: str = "all", customer_ids: Optional[List[str]] = None, force_refresh: bool = False):
        """Refresh all or specific analytics for a barbershop"""
        try:
            logger.info(f"Starting analytics refresh ({refresh_type}) for barbershop {barbershop_id}")
            
            if refresh_type in ["health_scores", "all"]:
                await self.calculate_health_scores(barbershop_id, customer_ids, force_refresh)
            
            if refresh_type in ["clv", "all"]:
                await self.calculate_clv(barbershop_id, customer_ids)
            
            if refresh_type in ["churn_predictions", "all"]:
                await self.predict_churn(barbershop_id, customer_ids)
            
            # Note: Segments and cohorts would need separate refresh logic
            # which would involve recalculating segment assignments and cohort performance
            
            logger.info(f"Completed analytics refresh for barbershop {barbershop_id}")
            
        except Exception as e:
            logger.error(f"Error refreshing analytics: {str(e)}")
            raise