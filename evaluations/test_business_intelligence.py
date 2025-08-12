#!/usr/bin/env python3
"""
Business Intelligence Accuracy Validation Tests
===============================================

Comprehensive tests for business intelligence capabilities focusing on:
- Revenue prediction accuracy
- Customer behavior analysis
- Market trend identification
- Business performance metrics validation
- Predictive analytics accuracy
- Data-driven recommendation quality
"""

import pytest
import json
import statistics
import asyncio
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

@dataclass
class PredictionResult:
    """Business prediction result"""
    prediction_type: str
    predicted_value: float
    confidence_interval: Tuple[float, float]
    actual_value: Optional[float]
    accuracy_score: float
    factors_considered: List[str]
    prediction_date: str
    
@dataclass
class BusinessMetric:
    """Business performance metric"""
    metric_name: str
    current_value: float
    benchmark_value: float
    trend_direction: str
    variance_from_benchmark: float
    performance_rating: str

class BusinessIntelligenceEngine:
    """Mock business intelligence engine for testing"""
    
    def __init__(self):
        self.historical_data = {}
        self.business_benchmarks = {
            'barbershop_industry': {
                'profit_margin': {'min': 15, 'avg': 20, 'max': 25},
                'customer_retention': {'min': 60, 'avg': 75, 'max': 85},
                'average_service_price': {'min': 20, 'avg': 30, 'max': 45},
                'visits_per_customer_year': {'min': 8, 'avg': 12, 'max': 18},
                'staff_utilization': {'min': 65, 'avg': 80, 'max': 95},
                'customer_satisfaction': {'min': 3.5, 'avg': 4.2, 'max': 4.8}
            }
        }
        
        self.seasonal_patterns = {
            'monthly_multipliers': {
                1: 0.85,   # January - post-holiday slowdown
                2: 0.90,   # February - winter slow
                3: 1.05,   # March - spring pickup
                4: 1.10,   # April - spring strong
                5: 1.15,   # May - prom/graduation
                6: 1.20,   # June - wedding season
                7: 0.95,   # July - vacation dip
                8: 0.90,   # August - vacation continues
                9: 1.10,   # September - back to school
                10: 1.05,  # October - fall steady
                11: 1.15,  # November - holiday prep
                12: 1.25   # December - holiday peak
            },
            'weekly_patterns': {
                'monday': 0.7,
                'tuesday': 0.9,
                'wednesday': 1.0,
                'thursday': 1.2,
                'friday': 1.4,
                'saturday': 1.6,
                'sunday': 0.8
            }
        }
    
    async def predict_revenue(self, historical_data: Dict[str, Any], 
                            prediction_horizon: int = 1) -> PredictionResult:
        """Predict revenue for future periods"""
        revenue_history = historical_data.get('revenue_history', [])
        external_factors = historical_data.get('external_factors', [])
        business_changes = historical_data.get('business_changes', [])
        
        if len(revenue_history) < 2:
            raise ValueError("Insufficient historical data for prediction")
        
        # Calculate base trend
        if len(revenue_history) >= 3:
            # Linear regression approach
            trend = self._calculate_linear_trend(revenue_history)
        else:
            trend = revenue_history[-1] - revenue_history[-2]
        
        # Apply seasonal adjustments
        current_month = datetime.now().month
        future_month = (current_month + prediction_horizon - 1) % 12 + 1
        seasonal_factor = self.seasonal_patterns['monthly_multipliers'][future_month]
        
        # Calculate base prediction
        base_prediction = revenue_history[-1] + (trend * prediction_horizon)
        seasonal_prediction = base_prediction * seasonal_factor
        
        # Apply external factors
        external_impact = self._assess_external_factors_impact(external_factors)
        business_impact = self._assess_business_changes_impact(business_changes)
        
        final_prediction = seasonal_prediction * (1 + external_impact + business_impact)
        
        # Calculate confidence interval
        historical_variance = statistics.variance(revenue_history) if len(revenue_history) > 1 else revenue_history[0] * 0.1
        confidence_range = (
            max(0, final_prediction - historical_variance * 0.5),
            final_prediction + historical_variance * 0.5
        )
        
        # Identify factors considered
        factors_considered = ['historical_trend', 'seasonal_patterns']
        if external_factors:
            factors_considered.append('external_factors')
        if business_changes:
            factors_considered.append('business_changes')
        
        return PredictionResult(
            prediction_type='monthly_revenue',
            predicted_value=round(final_prediction),
            confidence_interval=confidence_range,
            actual_value=None,
            accuracy_score=0.0,  # Will be calculated when actual value is known
            factors_considered=factors_considered,
            prediction_date=datetime.now().strftime('%Y-%m-%d')
        )
    
    def _calculate_linear_trend(self, data: List[float]) -> float:
        """Calculate linear trend from historical data"""
        n = len(data)
        x_values = list(range(1, n + 1))
        
        # Calculate linear regression slope
        x_mean = statistics.mean(x_values)
        y_mean = statistics.mean(data)
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, data))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        slope = numerator / denominator if denominator != 0 else 0
        return slope
    
    def _assess_external_factors_impact(self, factors: List[str]) -> float:
        """Assess impact of external factors on business"""
        impact = 0.0
        
        for factor in factors:
            factor_lower = factor.lower()
            if 'competitor' in factor_lower and 'opened' in factor_lower:
                impact -= 0.08  # -8% for new competition
            elif 'economic downturn' in factor_lower:
                impact -= 0.15  # -15% for economic issues
            elif 'spring break' in factor_lower or 'holiday' in factor_lower:
                impact += 0.05  # +5% for seasonal events
            elif 'festival' in factor_lower or 'event' in factor_lower:
                impact += 0.10  # +10% for local events
            elif 'construction' in factor_lower:
                impact -= 0.12  # -12% for accessibility issues
        
        return impact
    
    def _assess_business_changes_impact(self, changes: List[str]) -> float:
        """Assess impact of internal business changes"""
        impact = 0.0
        
        for change in changes:
            change_lower = change.lower()
            if 'new barber' in change_lower or 'added staff' in change_lower:
                impact += 0.12  # +12% for increased capacity
            elif 'extended hours' in change_lower:
                impact += 0.08  # +8% for more availability
            elif 'renovation' in change_lower or 'remodel' in change_lower:
                impact += 0.15  # +15% for improved experience
            elif 'lost barber' in change_lower or 'staff left' in change_lower:
                impact -= 0.10  # -10% for reduced capacity
            elif 'price increase' in change_lower:
                impact -= 0.05  # -5% for potential customer loss
            elif 'new services' in change_lower:
                impact += 0.06  # +6% for service expansion
        
        return impact
    
    async def analyze_customer_behavior(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer behavior patterns and predict actions"""
        profile = customer_data['customer_profile']
        current_date = customer_data.get('current_date', datetime.now().strftime('%Y-%m-%d'))
        
        # Calculate days since last visit
        last_visit = datetime.strptime(profile['last_visit'], '%Y-%m-%d')
        current = datetime.strptime(current_date, '%Y-%m-%d')
        days_since_visit = (current - last_visit).days
        
        # Determine risk level
        expected_frequency = profile['visit_frequency']
        risk_level = self._calculate_customer_risk_level(days_since_visit, expected_frequency)
        
        # Predict next action
        predicted_action = self._predict_customer_action(days_since_visit, expected_frequency, profile)
        
        # Calculate customer lifetime value
        average_spend = profile.get('average_spend', 35)
        annual_visits = 365 / expected_frequency
        lifetime_value = average_spend * annual_visits * 3  # 3-year LTV
        
        # Determine intervention recommendations
        intervention_recommendations = self._generate_intervention_recommendations(
            risk_level, days_since_visit, profile
        )
        
        return {
            'customer_id': profile.get('name', 'unknown'),
            'risk_assessment': {
                'risk_level': risk_level,
                'days_overdue': max(0, days_since_visit - expected_frequency),
                'risk_score': self._calculate_risk_score(days_since_visit, expected_frequency)
            },
            'behavioral_prediction': {
                'predicted_action': predicted_action,
                'action_probability': self._calculate_action_probability(days_since_visit, expected_frequency),
                'predicted_timing': self._predict_action_timing(days_since_visit, expected_frequency)
            },
            'customer_value': {
                'lifetime_value': round(lifetime_value, 2),
                'annual_value': round(average_spend * annual_visits, 2),
                'value_tier': self._classify_customer_value(lifetime_value)
            },
            'intervention_strategy': {
                'recommended_actions': intervention_recommendations,
                'urgency_level': self._determine_intervention_urgency(risk_level),
                'channel_preference': profile.get('preferred_contact', 'text')
            }
        }
    
    def _calculate_customer_risk_level(self, days_since_visit: int, expected_frequency: int) -> str:
        """Calculate customer risk level based on visit patterns"""
        if days_since_visit <= expected_frequency:
            return 'low'
        elif days_since_visit <= expected_frequency * 1.5:
            return 'moderate'
        elif days_since_visit <= expected_frequency * 2:
            return 'high'
        else:
            return 'critical'
    
    def _predict_customer_action(self, days_since_visit: int, expected_frequency: int, 
                               profile: Dict[str, Any]) -> str:
        """Predict customer's next action"""
        overdue_ratio = days_since_visit / expected_frequency
        
        if overdue_ratio <= 1.0:
            return 'will_book_normally'
        elif overdue_ratio <= 1.3:
            return 'will_book_within_week'
        elif overdue_ratio <= 1.8:
            return 'needs_reminder'
        else:
            return 'at_risk_of_churn'
    
    def _calculate_risk_score(self, days_since_visit: int, expected_frequency: int) -> float:
        """Calculate numerical risk score (0.0 to 1.0)"""
        overdue_ratio = days_since_visit / expected_frequency
        risk_score = min(1.0, max(0.0, (overdue_ratio - 0.8) / 1.2))  # Risk starts at 80% of frequency
        return round(risk_score, 3)
    
    def _calculate_action_probability(self, days_since_visit: int, expected_frequency: int) -> float:
        """Calculate probability of customer taking action"""
        overdue_ratio = days_since_visit / expected_frequency
        
        if overdue_ratio <= 1.0:
            return 0.9  # 90% will book normally
        elif overdue_ratio <= 1.3:
            return 0.7  # 70% will book with gentle reminder
        elif overdue_ratio <= 1.8:
            return 0.4  # 40% will respond to targeted outreach
        else:
            return 0.1  # 10% chance of retention
    
    def _predict_action_timing(self, days_since_visit: int, expected_frequency: int) -> str:
        """Predict when customer will take action"""
        overdue_ratio = days_since_visit / expected_frequency
        
        if overdue_ratio <= 1.0:
            return 'within_normal_schedule'
        elif overdue_ratio <= 1.3:
            return 'within_1_week'
        elif overdue_ratio <= 1.8:
            return 'within_2_weeks_if_contacted'
        else:
            return 'unlikely_without_intervention'
    
    def _classify_customer_value(self, lifetime_value: float) -> str:
        """Classify customer by value tier"""
        if lifetime_value >= 1000:
            return 'high_value'
        elif lifetime_value >= 500:
            return 'medium_value'
        else:
            return 'low_value'
    
    def _generate_intervention_recommendations(self, risk_level: str, days_since_visit: int,
                                             profile: Dict[str, Any]) -> List[str]:
        """Generate intervention recommendations based on risk level"""
        recommendations = []
        
        if risk_level == 'low':
            recommendations = ['Maintain regular service quality', 'Send appointment reminders']
        elif risk_level == 'moderate':
            recommendations = ['Send friendly check-in message', 'Offer preferred appointment times']
        elif risk_level == 'high':
            recommendations = [
                'Send personalized retention message',
                'Offer small incentive (10% off next visit)',
                'Call personally to check satisfaction'
            ]
        else:  # critical
            recommendations = [
                'Immediate personal outreach',
                'Offer significant incentive (20% off + free service)',
                'Schedule manager follow-up call',
                'Ask for feedback on service improvement'
            ]
        
        # Add service-specific recommendations
        if 'beard_trim' in profile.get('service_history', []):
            recommendations.append('Highlight beard grooming specials')
        
        return recommendations
    
    def _determine_intervention_urgency(self, risk_level: str) -> str:
        """Determine urgency level for intervention"""
        urgency_map = {
            'low': 'routine',
            'moderate': 'prompt',
            'high': 'urgent',
            'critical': 'immediate'
        }
        return urgency_map.get(risk_level, 'routine')
    
    async def analyze_market_trends(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze market trends and competitive positioning"""
        local_data = market_data.get('local_market', {})
        competitor_data = market_data.get('competitors', [])
        industry_data = market_data.get('industry_trends', {})
        
        # Analyze competitive landscape
        competitive_analysis = self._analyze_competitive_landscape(competitor_data, local_data)
        
        # Identify market opportunities
        market_opportunities = self._identify_market_opportunities(local_data, industry_data)
        
        # Calculate market share and positioning
        market_positioning = self._calculate_market_positioning(local_data, competitor_data)
        
        # Predict market changes
        trend_predictions = self._predict_market_trends(industry_data)
        
        return {
            'competitive_landscape': competitive_analysis,
            'market_opportunities': market_opportunities,
            'market_positioning': market_positioning,
            'trend_predictions': trend_predictions,
            'strategic_recommendations': self._generate_market_strategy_recommendations(
                competitive_analysis, market_opportunities, market_positioning
            )
        }
    
    def _analyze_competitive_landscape(self, competitors: List[Dict[str, Any]], 
                                     local_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze competitive landscape"""
        if not competitors:
            return {'analysis': 'Limited competitive data available'}
        
        # Calculate competitive metrics
        competitor_prices = [c.get('average_price', 30) for c in competitors]
        competitor_ratings = [c.get('rating', 4.0) for c in competitors]
        
        own_price = local_data.get('average_price', 30)
        own_rating = local_data.get('rating', 4.0)
        
        return {
            'price_positioning': {
                'own_price': own_price,
                'market_average': statistics.mean(competitor_prices),
                'price_percentile': self._calculate_percentile(own_price, competitor_prices),
                'pricing_strategy': 'premium' if own_price > statistics.mean(competitor_prices) else 'competitive'
            },
            'quality_positioning': {
                'own_rating': own_rating,
                'market_average': statistics.mean(competitor_ratings),
                'rating_percentile': self._calculate_percentile(own_rating, competitor_ratings),
                'quality_advantage': own_rating > statistics.mean(competitor_ratings)
            },
            'competitive_intensity': len(competitors),
            'market_saturation': 'high' if len(competitors) > 5 else 'medium' if len(competitors) > 2 else 'low'
        }
    
    def _calculate_percentile(self, value: float, comparison_values: List[float]) -> float:
        """Calculate percentile ranking"""
        if not comparison_values:
            return 50.0
        
        sorted_values = sorted(comparison_values)
        position = sum(1 for v in sorted_values if v <= value)
        percentile = (position / len(sorted_values)) * 100
        return round(percentile, 1)
    
    def _identify_market_opportunities(self, local_data: Dict[str, Any], 
                                     industry_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify market opportunities"""
        opportunities = []
        
        # Demographic opportunities
        demographics = local_data.get('demographics', {})
        if demographics.get('young_professionals', 0) > 30:
            opportunities.append({
                'type': 'demographic',
                'opportunity': 'High concentration of young professionals',
                'potential': 'Offer premium grooming packages and executive services',
                'estimated_impact': 'medium'
            })
        
        # Service gap opportunities
        local_services = local_data.get('common_services', [])
        if 'beard_styling' not in local_services:
            opportunities.append({
                'type': 'service_gap',
                'opportunity': 'Limited beard styling services in area',
                'potential': 'Introduce specialized beard grooming services',
                'estimated_impact': 'high'
            })
        
        # Technology opportunities
        tech_adoption = industry_data.get('technology_trends', {})
        if tech_adoption.get('online_booking_adoption', 0) < 60:
            opportunities.append({
                'type': 'technology',
                'opportunity': 'Low online booking adoption in market',
                'potential': 'Gain competitive advantage with superior booking experience',
                'estimated_impact': 'medium'
            })
        
        return opportunities
    
    def _calculate_market_positioning(self, local_data: Dict[str, Any], 
                                    competitors: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate market positioning metrics"""
        total_market_capacity = local_data.get('market_size', 1000)
        own_customer_base = local_data.get('customer_count', 100)
        
        # Estimate competitor customer bases
        competitor_customers = sum(c.get('estimated_customers', 50) for c in competitors)
        
        market_share = (own_customer_base / total_market_capacity) * 100
        competitive_share = (own_customer_base / (own_customer_base + competitor_customers)) * 100
        
        return {
            'market_share_percent': round(market_share, 1),
            'competitive_share_percent': round(competitive_share, 1),
            'customer_base': own_customer_base,
            'market_position': self._classify_market_position(market_share),
            'growth_potential': self._assess_growth_potential(market_share, local_data)
        }
    
    def _classify_market_position(self, market_share: float) -> str:
        """Classify market position based on share"""
        if market_share >= 40:
            return 'market_leader'
        elif market_share >= 20:
            return 'strong_player'
        elif market_share >= 10:
            return 'established_player'
        else:
            return 'emerging_player'
    
    def _assess_growth_potential(self, current_share: float, local_data: Dict[str, Any]) -> str:
        """Assess growth potential in market"""
        market_saturation = current_share
        population_growth = local_data.get('population_growth_rate', 0)
        
        if market_saturation < 20 and population_growth > 2:
            return 'high'
        elif market_saturation < 40 or population_growth > 1:
            return 'medium'
        else:
            return 'low'
    
    def _predict_market_trends(self, industry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict market trends based on industry data"""
        return {
            'price_trends': {
                'direction': 'increasing',
                'rate': '3-5% annually',
                'factors': ['inflation', 'premium_service_demand']
            },
            'service_trends': {
                'emerging_services': ['beard_oils', 'scalp_treatments', 'premium_shaves'],
                'declining_services': ['basic_cuts_only'],
                'growth_services': ['grooming_packages', 'membership_programs']
            },
            'customer_behavior_trends': {
                'booking_preferences': 'online_mobile_first',
                'service_expectations': 'personalized_experience',
                'loyalty_factors': 'convenience_and_quality'
            },
            'technology_trends': {
                'adoption_priorities': ['online_booking', 'loyalty_apps', 'contactless_payment'],
                'future_technologies': ['ai_recommendations', 'virtual_consultations']
            }
        }
    
    def _generate_market_strategy_recommendations(self, competitive_analysis: Dict[str, Any],
                                                opportunities: List[Dict[str, Any]],
                                                positioning: Dict[str, Any]) -> List[str]:
        """Generate strategic recommendations based on market analysis"""
        recommendations = []
        
        # Competitive positioning recommendations
        if competitive_analysis.get('price_positioning', {}).get('pricing_strategy') == 'premium':
            recommendations.append('Emphasize premium service quality and experience to justify pricing')
        
        # Opportunity-based recommendations
        for opp in opportunities:
            if opp['estimated_impact'] == 'high':
                recommendations.append(f"Priority: {opp['potential']}")
            else:
                recommendations.append(f"Consider: {opp['potential']}")
        
        # Market position recommendations
        market_position = positioning.get('market_position', '')
        if market_position == 'emerging_player':
            recommendations.append('Focus on customer acquisition and brand building')
        elif market_position == 'market_leader':
            recommendations.append('Maintain leadership through innovation and customer retention')
        
        return recommendations
    
    async def validate_business_metrics(self, business_data: Dict[str, Any]) -> Dict[str, BusinessMetric]:
        """Validate business metrics against industry benchmarks"""
        metrics = {}
        benchmarks = self.business_benchmarks['barbershop_industry']
        
        for metric_name, benchmark_data in benchmarks.items():
            current_value = business_data.get(metric_name, benchmark_data['avg'])
            benchmark_value = benchmark_data['avg']
            
            # Calculate variance from benchmark
            variance = ((current_value - benchmark_value) / benchmark_value) * 100
            
            # Determine trend direction (simplified)
            trend_direction = 'stable'  # Would need historical data for accurate trend
            
            # Determine performance rating
            if current_value >= benchmark_data['max']:
                performance_rating = 'excellent'
            elif current_value >= benchmark_data['avg']:
                performance_rating = 'good'
            elif current_value >= benchmark_data['min']:
                performance_rating = 'acceptable'
            else:
                performance_rating = 'needs_improvement'
            
            metrics[metric_name] = BusinessMetric(
                metric_name=metric_name,
                current_value=current_value,
                benchmark_value=benchmark_value,
                trend_direction=trend_direction,
                variance_from_benchmark=round(variance, 1),
                performance_rating=performance_rating
            )
        
        return metrics

class TestBusinessIntelligence:
    """Test suite for business intelligence accuracy"""
    
    @pytest.fixture
    def bi_engine(self):
        return BusinessIntelligenceEngine()
    
    @pytest.fixture
    def revenue_data_growing(self):
        return {
            'revenue_history': [3000, 3200, 3400, 3600],
            'external_factors': ['Spring break approaching'],
            'business_changes': ['Added new barber', 'Extended Saturday hours']
        }
    
    @pytest.fixture
    def revenue_data_declining(self):
        return {
            'revenue_history': [4000, 3800, 3500, 3200],
            'external_factors': ['New competitor opened', 'Economic downturn'],
            'business_changes': ['Lost experienced barber']
        }
    
    @pytest.fixture
    def customer_data_at_risk(self):
        return {
            'customer_profile': {
                'name': 'John Smith',
                'visit_frequency': 21,  # Every 3 weeks
                'last_visit': '2025-07-15',
                'average_spend': 35,
                'preferred_barber': 'Mike',
                'service_history': ['haircut', 'beard_trim']
            },
            'current_date': '2025-08-12'  # 4 weeks later
        }
    
    @pytest.fixture
    def customer_data_loyal(self):
        return {
            'customer_profile': {
                'name': 'Regular Customer',
                'visit_frequency': 28,  # Every 4 weeks
                'last_visit': '2025-07-20',
                'average_spend': 45,
                'preferred_barber': 'Sarah',
                'service_history': ['haircut', 'beard_trim', 'shampoo']
            },
            'current_date': '2025-08-12'  # 3 weeks later
        }
    
    @pytest.fixture
    def market_data_competitive(self):
        return {
            'local_market': {
                'average_price': 32,
                'rating': 4.3,
                'customer_count': 250,
                'market_size': 2000,
                'demographics': {'young_professionals': 40},
                'common_services': ['haircut', 'shave'],
                'population_growth_rate': 2.5
            },
            'competitors': [
                {'name': 'Competitor A', 'average_price': 28, 'rating': 4.1, 'estimated_customers': 200},
                {'name': 'Competitor B', 'average_price': 35, 'rating': 4.0, 'estimated_customers': 180},
                {'name': 'Competitor C', 'average_price': 30, 'rating': 4.2, 'estimated_customers': 220}
            ],
            'industry_trends': {
                'technology_trends': {'online_booking_adoption': 45},
                'service_trends': ['premium_grooming', 'membership_programs']
            }
        }
    
    @pytest.fixture
    def business_metrics_data(self):
        return {
            'profit_margin': 22,
            'customer_retention': 78,
            'average_service_price': 35,
            'visits_per_customer_year': 14,
            'staff_utilization': 85,
            'customer_satisfaction': 4.4
        }
    
    @pytest.mark.asyncio
    async def test_revenue_prediction_accuracy_growing_trend(self, bi_engine, revenue_data_growing):
        """Test revenue prediction accuracy for growing business"""
        result = await bi_engine.predict_revenue(revenue_data_growing, prediction_horizon=1)
        
        # Verify prediction structure
        assert result.prediction_type == 'monthly_revenue'
        assert result.predicted_value > 0
        assert len(result.confidence_interval) == 2
        assert result.confidence_interval[0] <= result.predicted_value <= result.confidence_interval[1]
        
        # Verify prediction logic for growing trend
        last_revenue = revenue_data_growing['revenue_history'][-1]
        assert result.predicted_value > last_revenue  # Should predict growth
        
        # Verify factors are considered
        assert 'historical_trend' in result.factors_considered
        assert 'seasonal_patterns' in result.factors_considered
        assert 'business_changes' in result.factors_considered
        
        # Should account for positive business changes
        predicted_increase = result.predicted_value - last_revenue
        assert predicted_increase > 100  # Should predict meaningful growth
    
    @pytest.mark.asyncio
    async def test_revenue_prediction_accuracy_declining_trend(self, bi_engine, revenue_data_declining):
        """Test revenue prediction accuracy for declining business"""
        result = await bi_engine.predict_revenue(revenue_data_declining, prediction_horizon=1)
        
        # Verify prediction structure
        assert result.prediction_type == 'monthly_revenue'
        assert result.predicted_value > 0
        
        # Verify prediction logic for declining trend
        last_revenue = revenue_data_declining['revenue_history'][-1]
        assert result.predicted_value < last_revenue  # Should predict continued decline
        
        # Verify negative factors are considered
        assert 'external_factors' in result.factors_considered
        
        # Should account for negative factors
        predicted_decrease = last_revenue - result.predicted_value
        assert predicted_decrease > 0  # Should predict decline
    
    @pytest.mark.asyncio
    async def test_revenue_prediction_seasonal_adjustment(self, bi_engine):
        """Test seasonal adjustment in revenue predictions"""
        # Test December prediction (high season)
        december_data = {
            'revenue_history': [3000, 3000, 3000],  # Stable baseline
            'external_factors': [],
            'business_changes': []
        }
        
        # Mock December month for seasonal testing
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value.month = 12
            december_result = await bi_engine.predict_revenue(december_data)
        
        # December should have higher prediction due to seasonal factor
        assert december_result.predicted_value > 3000
        
        # Test July prediction (low season)
        with patch('datetime.datetime') as mock_datetime:
            mock_datetime.now.return_value.month = 7
            july_result = await bi_engine.predict_revenue(december_data)
        
        # July should have lower prediction
        assert july_result.predicted_value < december_result.predicted_value
    
    @pytest.mark.asyncio
    async def test_customer_behavior_analysis_at_risk(self, bi_engine, customer_data_at_risk):
        """Test customer behavior analysis for at-risk customer"""
        result = await bi_engine.analyze_customer_behavior(customer_data_at_risk)
        
        # Verify analysis structure
        assert 'risk_assessment' in result
        assert 'behavioral_prediction' in result
        assert 'customer_value' in result
        assert 'intervention_strategy' in result
        
        # Verify risk assessment for overdue customer
        risk_assessment = result['risk_assessment']
        assert risk_assessment['risk_level'] in ['moderate', 'high']  # 4 weeks vs 3 week frequency
        assert risk_assessment['days_overdue'] > 0
        assert risk_assessment['risk_score'] > 0.0
        
        # Verify behavioral prediction
        behavior = result['behavioral_prediction']
        assert behavior['predicted_action'] in ['will_book_within_week', 'needs_reminder', 'at_risk_of_churn']
        assert 0.0 <= behavior['action_probability'] <= 1.0
        
        # Verify intervention recommendations
        intervention = result['intervention_strategy']
        assert len(intervention['recommended_actions']) > 0
        assert intervention['urgency_level'] in ['routine', 'prompt', 'urgent', 'immediate']
    
    @pytest.mark.asyncio
    async def test_customer_behavior_analysis_loyal(self, bi_engine, customer_data_loyal):
        """Test customer behavior analysis for loyal customer"""
        result = await bi_engine.analyze_customer_behavior(customer_data_loyal)
        
        # Verify loyal customer assessment
        risk_assessment = result['risk_assessment']
        assert risk_assessment['risk_level'] == 'low'  # 3 weeks vs 4 week frequency
        assert risk_assessment['days_overdue'] == 0  # Not overdue
        
        # Verify high-value customer recognition
        customer_value = result['customer_value']
        assert customer_value['value_tier'] in ['medium_value', 'high_value']  # $45 spend is above average
        assert customer_value['lifetime_value'] > 500
        
        # Verify minimal intervention needed
        intervention = result['intervention_strategy']
        assert intervention['urgency_level'] == 'routine'
    
    @pytest.mark.asyncio
    async def test_customer_lifetime_value_calculation(self, bi_engine, customer_data_loyal):
        """Test customer lifetime value calculation accuracy"""
        result = await bi_engine.analyze_customer_behavior(customer_data_loyal)
        
        customer_value = result['customer_value']
        profile = customer_data_loyal['customer_profile']
        
        # Verify LTV calculation logic
        average_spend = profile['average_spend']  # $45
        visit_frequency = profile['visit_frequency']  # 28 days
        annual_visits = 365 / visit_frequency  # ~13 visits per year
        expected_annual_value = average_spend * annual_visits  # ~$585
        expected_lifetime_value = expected_annual_value * 3  # 3-year LTV ~$1755
        
        assert abs(customer_value['annual_value'] - expected_annual_value) < 50
        assert abs(customer_value['lifetime_value'] - expected_lifetime_value) < 150
    
    @pytest.mark.asyncio
    async def test_market_trend_analysis_competitive(self, bi_engine, market_data_competitive):
        """Test market trend analysis in competitive environment"""
        result = await bi_engine.analyze_market_trends(market_data_competitive)
        
        # Verify analysis structure
        assert 'competitive_landscape' in result
        assert 'market_opportunities' in result
        assert 'market_positioning' in result
        assert 'trend_predictions' in result
        assert 'strategic_recommendations' in result
        
        # Verify competitive analysis
        competitive = result['competitive_landscape']
        assert 'price_positioning' in competitive
        assert 'quality_positioning' in competitive
        assert competitive['competitive_intensity'] == 3  # 3 competitors
        
        # Verify market positioning calculation
        positioning = result['market_positioning']
        expected_market_share = (250 / 2000) * 100  # 12.5%
        assert abs(positioning['market_share_percent'] - expected_market_share) < 1
        assert positioning['market_position'] == 'established_player'  # 12.5% share
        
        # Verify opportunities identification
        opportunities = result['market_opportunities']
        assert len(opportunities) > 0
        
        # Should identify young professional opportunity
        demographic_opportunities = [opp for opp in opportunities if opp['type'] == 'demographic']
        assert len(demographic_opportunities) > 0
    
    @pytest.mark.asyncio
    async def test_competitive_positioning_analysis(self, bi_engine, market_data_competitive):
        """Test competitive positioning analysis accuracy"""
        result = await bi_engine.analyze_market_trends(market_data_competitive)
        
        competitive = result['competitive_landscape']
        local_data = market_data_competitive['local_market']
        competitors = market_data_competitive['competitors']
        
        # Verify price positioning
        price_pos = competitive['price_positioning']
        competitor_prices = [c['average_price'] for c in competitors]
        expected_avg = statistics.mean(competitor_prices)  # (28+35+30)/3 = 31
        
        assert abs(price_pos['market_average'] - expected_avg) < 1
        assert price_pos['own_price'] == local_data['average_price']  # 32
        assert price_pos['pricing_strategy'] in ['premium', 'competitive']
        
        # Verify quality positioning
        quality_pos = competitive['quality_positioning']
        competitor_ratings = [c['rating'] for c in competitors]
        expected_rating_avg = statistics.mean(competitor_ratings)
        
        assert abs(quality_pos['market_average'] - expected_rating_avg) < 0.1
        assert quality_pos['own_rating'] == local_data['rating']  # 4.3
        assert quality_pos['quality_advantage'] == (local_data['rating'] > expected_rating_avg)
    
    @pytest.mark.asyncio
    async def test_business_metrics_validation(self, bi_engine, business_metrics_data):
        """Test business metrics validation against benchmarks"""
        result = await bi_engine.validate_business_metrics(business_metrics_data)
        
        # Verify all key metrics are analyzed
        expected_metrics = ['profit_margin', 'customer_retention', 'average_service_price',
                          'visits_per_customer_year', 'staff_utilization', 'customer_satisfaction']
        
        for metric_name in expected_metrics:
            assert metric_name in result
            metric = result[metric_name]
            
            # Verify metric structure
            assert isinstance(metric, BusinessMetric)
            assert metric.metric_name == metric_name
            assert metric.current_value > 0
            assert metric.benchmark_value > 0
            assert metric.performance_rating in ['excellent', 'good', 'acceptable', 'needs_improvement']
        
        # Verify specific metric assessments
        profit_margin = result['profit_margin']
        assert profit_margin.current_value == 22
        assert profit_margin.performance_rating in ['good', 'excellent']  # 22% is above 20% benchmark
        
        customer_satisfaction = result['customer_satisfaction']
        assert customer_satisfaction.current_value == 4.4
        assert customer_satisfaction.performance_rating in ['good', 'excellent']  # 4.4 is above 4.2 benchmark
    
    @pytest.mark.asyncio
    async def test_prediction_confidence_intervals(self, bi_engine, revenue_data_growing):
        """Test prediction confidence intervals are realistic"""
        result = await bi_engine.predict_revenue(revenue_data_growing)
        
        confidence_interval = result.confidence_interval
        predicted_value = result.predicted_value
        
        # Confidence interval should be reasonable
        interval_width = confidence_interval[1] - confidence_interval[0]
        assert interval_width > 0
        assert interval_width < predicted_value  # Interval shouldn't be wider than the prediction itself
        
        # Predicted value should be within interval
        assert confidence_interval[0] <= predicted_value <= confidence_interval[1]
        
        # Interval should represent realistic variance
        historical_revenue = revenue_data_growing['revenue_history']
        historical_variance = statistics.variance(historical_revenue)
        
        # Interval width should be related to historical variance
        assert interval_width > historical_variance * 0.1  # At least 10% of variance
        assert interval_width < historical_variance * 2.0  # Not more than 200% of variance
    
    def test_external_factors_impact_assessment(self, bi_engine):
        """Test external factors impact assessment"""
        # Test positive factors
        positive_factors = ['Spring break approaching', 'Local festival this weekend']
        positive_impact = bi_engine._assess_external_factors_impact(positive_factors)
        assert positive_impact > 0
        
        # Test negative factors
        negative_factors = ['New competitor opened', 'Economic downturn', 'Construction blocking access']
        negative_impact = bi_engine._assess_external_factors_impact(negative_factors)
        assert negative_impact < 0
        
        # Test mixed factors
        mixed_factors = ['Spring break approaching', 'New competitor opened']
        mixed_impact = bi_engine._assess_external_factors_impact(mixed_factors)
        assert abs(mixed_impact) < abs(negative_impact)  # Should be more balanced
    
    def test_business_changes_impact_assessment(self, bi_engine):
        """Test business changes impact assessment"""
        # Test capacity-increasing changes
        capacity_changes = ['Added new barber', 'Extended hours', 'Renovation complete']
        capacity_impact = bi_engine._assess_business_changes_impact(capacity_changes)
        assert capacity_impact > 0
        
        # Test capacity-reducing changes
        reduction_changes = ['Lost experienced barber', 'Reduced hours due to staffing']
        reduction_impact = bi_engine._assess_business_changes_impact(reduction_changes)
        assert reduction_impact < 0
        
        # Test revenue impact should be proportional
        assert capacity_impact > 0.2  # Significant positive impact expected
        assert reduction_impact < -0.05  # Meaningful negative impact expected
    
    def test_customer_risk_scoring_accuracy(self, bi_engine):
        """Test customer risk scoring accuracy"""
        # Test low risk customer (on schedule)
        low_risk_score = bi_engine._calculate_risk_score(20, 21)  # 1 day early
        assert low_risk_score == 0.0
        
        # Test moderate risk customer (slightly overdue)
        moderate_risk_score = bi_engine._calculate_risk_score(28, 21)  # 1 week overdue
        assert 0.0 < moderate_risk_score < 0.5
        
        # Test high risk customer (significantly overdue)
        high_risk_score = bi_engine._calculate_risk_score(42, 21)  # 3 weeks overdue
        assert high_risk_score > 0.5
        
        # Test critical risk customer (very overdue)
        critical_risk_score = bi_engine._calculate_risk_score(60, 21)  # Way overdue
        assert critical_risk_score >= 0.8
    
    def test_market_share_calculation_accuracy(self, bi_engine):
        """Test market share calculation accuracy"""
        local_data = {'customer_count': 200, 'market_size': 1000}
        competitors = [
            {'estimated_customers': 150},
            {'estimated_customers': 100},
            {'estimated_customers': 120}
        ]
        
        positioning = bi_engine._calculate_market_positioning(local_data, competitors)
        
        # Market share should be 20% (200/1000)
        assert positioning['market_share_percent'] == 20.0
        
        # Competitive share should be higher (200/(200+150+100+120) = 200/570 ≈ 35%)
        expected_competitive_share = (200 / (200 + 150 + 100 + 120)) * 100
        assert abs(positioning['competitive_share_percent'] - expected_competitive_share) < 1
        
        # Market position should be "strong_player" (20% share)
        assert positioning['market_position'] == 'strong_player'

# Performance tests for business intelligence
class TestBusinessIntelligencePerformance:
    """Performance tests for business intelligence engine"""
    
    @pytest.mark.asyncio
    async def test_revenue_prediction_performance(self):
        """Test revenue prediction performance under load"""
        bi_engine = BusinessIntelligenceEngine()
        
        test_data = {
            'revenue_history': [3000, 3200, 3400, 3600, 3800],
            'external_factors': ['Spring season', 'Local event'],
            'business_changes': ['New services added']
        }
        
        # Test multiple predictions concurrently
        start_time = time.time()
        
        tasks = []
        for i in range(10):
            tasks.append(bi_engine.predict_revenue(test_data, prediction_horizon=i+1))
        
        results = await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time
        
        # Should complete all predictions efficiently
        assert total_time < 5.0  # 10 predictions in under 5 seconds
        assert len(results) == 10
        
        # All predictions should succeed
        for result in results:
            assert result.predicted_value > 0
            assert len(result.factors_considered) > 0
    
    @pytest.mark.asyncio
    async def test_customer_analysis_batch_performance(self):
        """Test customer analysis performance for batch processing"""
        bi_engine = BusinessIntelligenceEngine()
        
        # Generate batch of customer data
        customer_batch = []
        for i in range(50):
            customer_batch.append({
                'customer_profile': {
                    'name': f'Customer {i}',
                    'visit_frequency': 21 + (i % 7),  # Vary frequency
                    'last_visit': '2025-07-15',
                    'average_spend': 30 + (i % 20),
                    'preferred_barber': 'Test Barber',
                    'service_history': ['haircut']
                },
                'current_date': '2025-08-12'
            })
        
        start_time = time.time()
        
        # Process batch
        tasks = [bi_engine.analyze_customer_behavior(customer_data) for customer_data in customer_batch]
        results = await asyncio.gather(*tasks)
        
        total_time = time.time() - start_time
        
        # Should process batch efficiently
        assert total_time < 10.0  # 50 customers in under 10 seconds
        assert len(results) == 50
        
        # All analyses should succeed
        for result in results:
            assert 'risk_assessment' in result
            assert 'customer_value' in result
    
    @pytest.mark.asyncio
    async def test_market_analysis_comprehensive_performance(self):
        """Test comprehensive market analysis performance"""
        bi_engine = BusinessIntelligenceEngine()
        
        # Large market data set
        market_data = {
            'local_market': {
                'average_price': 32,
                'rating': 4.3,
                'customer_count': 250,
                'market_size': 2000,
                'demographics': {'young_professionals': 40, 'families': 35, 'seniors': 25},
                'common_services': ['haircut', 'shave', 'beard_trim'],
                'population_growth_rate': 2.5
            },
            'competitors': [
                {'name': f'Competitor {i}', 'average_price': 25 + i, 'rating': 3.8 + (i*0.1), 'estimated_customers': 150 + i*10}
                for i in range(20)  # 20 competitors
            ],
            'industry_trends': {
                'technology_trends': {'online_booking_adoption': 45},
                'service_trends': ['premium_grooming', 'membership_programs']
            }
        }
        
        start_time = time.time()
        result = await bi_engine.analyze_market_trends(market_data)
        analysis_time = time.time() - start_time
        
        # Should analyze large market efficiently
        assert analysis_time < 3.0  # Complex analysis in under 3 seconds
        
        # Should handle large competitor set
        competitive = result['competitive_landscape']
        assert competitive['competitive_intensity'] == 20
        assert 'price_positioning' in competitive
        assert 'quality_positioning' in competitive

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])