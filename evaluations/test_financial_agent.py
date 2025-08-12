#!/usr/bin/env python3
"""
Financial Agent (Elena) Unit Tests
=================================

Comprehensive unit tests for the Financial Agent focusing on:
- Revenue analysis and predictions
- Pricing optimization
- Cost analysis
- Profit margin calculations
- Financial decision support
- ROI calculations
"""

import pytest
import json
import statistics
from typing import Dict, List, Any
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

class FinancialAgent:
    """Mock Financial Agent for testing"""
    
    def __init__(self):
        self.agent_id = 'elena'
        self.name = 'Elena (Finance)'
        self.specialties = ['finance', 'revenue', 'costs', 'budgeting', 'pricing', 'profitability']
        
    async def analyze_pricing_strategy(self, pricing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze pricing strategy and provide recommendations"""
        current_price = pricing_data['current_price']
        proposed_price = pricing_data['proposed_price']
        monthly_volume = pricing_data['monthly_haircuts']
        competition = pricing_data['local_competition']
        cost_per_unit = pricing_data['cost_per_haircut']
        
        # Calculate price increase percentage
        increase_percentage = (proposed_price - current_price) / current_price
        
        # Market position analysis
        avg_competition = statistics.mean(competition)
        market_position = 'premium' if proposed_price > avg_competition * 1.1 else 'competitive'
        
        # Risk assessment
        if increase_percentage > 0.20:
            risk_level = 'high'
            expected_loss_rate = min(increase_percentage * 0.6, 0.20)
        elif increase_percentage > 0.10:
            risk_level = 'moderate'
            expected_loss_rate = increase_percentage * 0.4
        else:
            risk_level = 'low'
            expected_loss_rate = increase_percentage * 0.2
        
        # Revenue impact calculation
        new_volume = monthly_volume * (1 - expected_loss_rate)
        old_revenue = current_price * monthly_volume
        new_revenue = proposed_price * new_volume
        revenue_change = new_revenue - old_revenue
        
        # Recommendation logic
        if market_position == 'premium' and risk_level == 'high':
            recommendation = 'gradual_increase'
            suggested_price = min(proposed_price, avg_competition * 0.95)
        elif increase_percentage > 0.15:
            recommendation = 'gradual_increase'
            suggested_price = current_price * 1.12
        else:
            recommendation = 'proceed_with_increase'
            suggested_price = proposed_price
        
        return {
            'recommendation': recommendation,
            'suggested_price': round(suggested_price, 2),
            'market_position': market_position,
            'risk_level': risk_level,
            'expected_loss_rate': round(expected_loss_rate, 3),
            'revenue_impact': round(revenue_change, 2),
            'implementation_plan': self._generate_implementation_plan(suggested_price, risk_level),
            'monitoring_metrics': ['customer_retention', 'booking_volume', 'revenue_per_day'],
            'confidence_score': self._calculate_confidence(risk_level, market_position)
        }
    
    def _generate_implementation_plan(self, price: float, risk_level: str) -> str:
        """Generate implementation plan based on risk level"""
        if risk_level == 'high':
            return f'Gradual rollout: Test ${price} with 25% of customers for 4 weeks, monitor retention'
        elif risk_level == 'moderate':
            return f'Phase implementation: ${price} for new customers first, existing customers after 2 weeks'
        else:
            return f'Direct implementation: Switch to ${price} with 1-week customer notification'
    
    def _calculate_confidence(self, risk_level: str, market_position: str) -> float:
        """Calculate confidence score for recommendation"""
        risk_scores = {'low': 0.9, 'moderate': 0.75, 'high': 0.6}
        position_scores = {'competitive': 0.85, 'premium': 0.7}
        
        return (risk_scores.get(risk_level, 0.5) + position_scores.get(market_position, 0.5)) / 2
    
    async def analyze_revenue_trends(self, revenue_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze revenue trends and predict future performance"""
        revenue_history = revenue_data['revenue_history']
        external_factors = revenue_data.get('external_factors', [])
        shop_changes = revenue_data.get('shop_changes', [])
        
        if len(revenue_history) < 2:
            return {'error': 'Insufficient data for trend analysis'}
        
        # Calculate trend
        if len(revenue_history) >= 3:
            # Use linear regression approach
            trend = (revenue_history[-1] - revenue_history[-3]) / 2
        else:
            trend = revenue_history[-1] - revenue_history[-2]
        
        # Seasonal adjustment
        seasonal_factor = self._calculate_seasonal_factor(revenue_data.get('months', []))
        
        # External factors impact
        external_impact = self._assess_external_impact(external_factors)
        shop_impact = self._assess_shop_changes_impact(shop_changes)
        
        # Base prediction
        base_prediction = revenue_history[-1] + trend
        
        # Apply adjustments
        adjusted_prediction = base_prediction * (1 + seasonal_factor + external_impact + shop_impact)
        
        # Confidence range
        volatility = statistics.stdev(revenue_history) if len(revenue_history) > 1 else revenue_history[0] * 0.1
        confidence_range = [
            max(0, adjusted_prediction - volatility),
            adjusted_prediction + volatility
        ]
        
        return {
            'predicted_revenue': round(adjusted_prediction),
            'confidence_range': [round(r) for r in confidence_range],
            'trend_direction': 'increasing' if trend > 0 else 'decreasing' if trend < 0 else 'stable',
            'trend_strength': abs(trend) / revenue_history[-1] if revenue_history[-1] > 0 else 0,
            'key_factors': {
                'seasonal_impact': seasonal_factor,
                'external_impact': external_impact,
                'shop_changes_impact': shop_impact
            },
            'recommendations': self._generate_revenue_recommendations(trend, external_factors, shop_changes),
            'confidence_score': self._calculate_revenue_confidence(len(revenue_history), volatility, adjusted_prediction)
        }
    
    def _calculate_seasonal_factor(self, months: List[str]) -> float:
        """Calculate seasonal adjustment factor"""
        if not months:
            return 0.0
        
        current_month = months[-1].lower() if months else ''
        
        # Seasonal multipliers based on barbershop industry patterns
        seasonal_factors = {
            'january': -0.15,  # Post-holiday slowdown
            'february': -0.10,  # Winter slow period
            'march': 0.05,     # Spring pickup
            'april': 0.10,     # Spring strong
            'may': 0.15,       # Prom/graduation season
            'june': 0.20,      # Wedding season
            'july': -0.05,     # Summer vacation
            'august': -0.10,   # Summer vacation
            'september': 0.10,  # Back to school
            'october': 0.05,   # Fall pickup
            'november': 0.15,  # Holiday prep
            'december': 0.20   # Holiday season
        }
        
        return seasonal_factors.get(current_month, 0.0)
    
    def _assess_external_impact(self, external_factors: List[str]) -> float:
        """Assess impact of external factors on revenue"""
        impact = 0.0
        
        for factor in external_factors:
            factor_lower = factor.lower()
            if 'competitor' in factor_lower and 'opened' in factor_lower:
                impact -= 0.08  # -8% for new competition
            elif 'spring break' in factor_lower:
                impact += 0.05  # +5% for spring break
            elif 'festival' in factor_lower:
                impact += 0.10  # +10% for local events
            elif 'construction' in factor_lower:
                impact -= 0.12  # -12% for accessibility issues
            elif 'economic' in factor_lower and 'downturn' in factor_lower:
                impact -= 0.15  # -15% for economic issues
        
        return impact
    
    def _assess_shop_changes_impact(self, shop_changes: List[str]) -> float:
        """Assess impact of internal shop changes"""
        impact = 0.0
        
        for change in shop_changes:
            change_lower = change.lower()
            if 'new barber' in change_lower or 'added barber' in change_lower:
                impact += 0.12  # +12% for increased capacity
            elif 'extended hours' in change_lower:
                impact += 0.08  # +8% for more availability
            elif 'renovation' in change_lower:
                impact += 0.15  # +15% for improved experience
            elif 'lost barber' in change_lower or 'barber left' in change_lower:
                impact -= 0.10  # -10% for reduced capacity
            elif 'price increase' in change_lower:
                impact -= 0.05  # -5% for potential customer loss
        
        return impact
    
    def _generate_revenue_recommendations(self, trend: float, external_factors: List[str], shop_changes: List[str]) -> List[str]:
        """Generate revenue optimization recommendations"""
        recommendations = []
        
        if trend < 0:
            recommendations.append('Focus on customer retention strategies')
            recommendations.append('Analyze and address causes of decline')
        
        if any('competitor' in factor.lower() for factor in external_factors):
            recommendations.append('Differentiate services from competition')
            recommendations.append('Implement customer loyalty program')
        
        if any('new barber' in change.lower() for change in shop_changes):
            recommendations.append('Cross-train staff for service consistency')
            recommendations.append('Market expanded capacity to customers')
        
        if not recommendations:
            recommendations.append('Maintain current successful strategies')
            recommendations.append('Look for growth opportunities')
        
        return recommendations
    
    def _calculate_revenue_confidence(self, data_points: int, volatility: float, prediction: float) -> float:
        """Calculate confidence score for revenue prediction"""
        # Base confidence on data quality
        data_confidence = min(data_points / 6, 1.0)  # Max confidence with 6+ data points
        
        # Volatility factor (lower volatility = higher confidence)
        volatility_factor = max(0.3, 1.0 - (volatility / prediction) if prediction > 0 else 0.3)
        
        return (data_confidence + volatility_factor) / 2
    
    async def calculate_profitability_metrics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive profitability metrics"""
        revenue = financial_data['revenue']
        costs = financial_data['costs']
        
        # Basic profitability metrics
        gross_profit = revenue - costs['direct_costs']
        net_profit = gross_profit - costs['overhead_costs']
        gross_margin = (gross_profit / revenue) * 100 if revenue > 0 else 0
        net_margin = (net_profit / revenue) * 100 if revenue > 0 else 0
        
        # Per-service metrics
        services_performed = financial_data.get('services_performed', 1)
        profit_per_service = net_profit / services_performed if services_performed > 0 else 0
        revenue_per_service = revenue / services_performed if services_performed > 0 else 0
        
        # Efficiency metrics
        labor_efficiency = (revenue / costs['labor_costs']) if costs['labor_costs'] > 0 else 0
        overhead_ratio = (costs['overhead_costs'] / revenue) * 100 if revenue > 0 else 0
        
        # Benchmarking
        industry_benchmarks = {
            'gross_margin': 65,  # Industry average 60-70%
            'net_margin': 20,    # Industry average 15-25%
            'labor_ratio': 45    # Industry average 40-50%
        }
        
        performance_vs_benchmark = {
            'gross_margin': 'above' if gross_margin > industry_benchmarks['gross_margin'] else 'below',
            'net_margin': 'above' if net_margin > industry_benchmarks['net_margin'] else 'below',
            'overall_rating': 'good' if net_margin >= 15 else 'needs_improvement'
        }
        
        return {
            'profitability_metrics': {
                'gross_profit': round(gross_profit, 2),
                'net_profit': round(net_profit, 2),
                'gross_margin_percent': round(gross_margin, 1),
                'net_margin_percent': round(net_margin, 1)
            },
            'per_service_metrics': {
                'profit_per_service': round(profit_per_service, 2),
                'revenue_per_service': round(revenue_per_service, 2),
                'services_performed': services_performed
            },
            'efficiency_metrics': {
                'labor_efficiency': round(labor_efficiency, 2),
                'overhead_ratio_percent': round(overhead_ratio, 1)
            },
            'benchmark_comparison': performance_vs_benchmark,
            'improvement_opportunities': self._identify_improvement_opportunities(
                gross_margin, net_margin, overhead_ratio, costs
            )
        }
    
    def _identify_improvement_opportunities(self, gross_margin: float, net_margin: float, 
                                         overhead_ratio: float, costs: Dict[str, float]) -> List[str]:
        """Identify opportunities for profitability improvement"""
        opportunities = []
        
        if gross_margin < 60:
            opportunities.append('Review service pricing - gross margin below industry standard')
        
        if net_margin < 15:
            opportunities.append('Reduce operating costs - net margin below industry standard')
        
        if overhead_ratio > 25:
            opportunities.append('Optimize overhead costs - ratio higher than recommended')
        
        if costs.get('supplies_cost', 0) / costs.get('direct_costs', 1) > 0.15:
            opportunities.append('Review supplier agreements for better rates')
        
        if not opportunities:
            opportunities.append('Consider premium service offerings to increase margins')
        
        return opportunities

class TestFinancialAgent:
    """Unit tests for Financial Agent (Elena)"""
    
    @pytest.fixture
    def financial_agent(self):
        return FinancialAgent()
    
    @pytest.fixture
    def sample_pricing_data(self):
        return {
            'current_price': 25,
            'proposed_price': 30,
            'monthly_haircuts': 400,
            'local_competition': [28, 32, 35],
            'cost_per_haircut': 8,
            'customer_satisfaction': 4.2
        }
    
    @pytest.fixture
    def sample_revenue_data(self):
        return {
            'revenue_history': [3200, 2800, 3500],
            'months': ['January', 'February', 'March'],
            'external_factors': ['Spring break approaching', 'New competitor opened'],
            'shop_changes': ['Added new barber', 'Extended hours']
        }
    
    @pytest.fixture
    def sample_financial_data(self):
        return {
            'revenue': 15000,
            'costs': {
                'direct_costs': 5000,
                'labor_costs': 6000,
                'overhead_costs': 2500,
                'supplies_cost': 800
            },
            'services_performed': 400
        }
    
    @pytest.mark.asyncio
    async def test_pricing_strategy_analysis(self, financial_agent, sample_pricing_data):
        """Test pricing strategy analysis functionality"""
        result = await financial_agent.analyze_pricing_strategy(sample_pricing_data)
        
        # Verify response structure
        assert 'recommendation' in result
        assert 'suggested_price' in result
        assert 'risk_level' in result
        assert 'revenue_impact' in result
        assert 'implementation_plan' in result
        
        # Verify recommendation logic
        assert result['recommendation'] in ['gradual_increase', 'proceed_with_increase', 'reconsider']
        assert isinstance(result['suggested_price'], (int, float))
        assert result['risk_level'] in ['low', 'moderate', 'high']
        
        # Verify suggested price is reasonable
        assert result['suggested_price'] >= sample_pricing_data['current_price']
        assert result['suggested_price'] <= sample_pricing_data['proposed_price'] * 1.1
    
    @pytest.mark.asyncio
    async def test_pricing_strategy_high_increase(self, financial_agent):
        """Test pricing strategy with high price increase"""
        high_increase_data = {
            'current_price': 20,
            'proposed_price': 35,  # 75% increase
            'monthly_haircuts': 300,
            'local_competition': [25, 28, 30],
            'cost_per_haircut': 7
        }
        
        result = await financial_agent.analyze_pricing_strategy(high_increase_data)
        
        # Should recommend gradual increase due to high risk
        assert result['recommendation'] == 'gradual_increase'
        assert result['risk_level'] == 'high'
        assert result['suggested_price'] < high_increase_data['proposed_price']
    
    @pytest.mark.asyncio
    async def test_pricing_strategy_competitive_pricing(self, financial_agent):
        """Test pricing strategy with competitive pricing"""
        competitive_data = {
            'current_price': 25,
            'proposed_price': 27,  # Small increase, competitive
            'monthly_haircuts': 400,
            'local_competition': [28, 30, 32],
            'cost_per_haircut': 8
        }
        
        result = await financial_agent.analyze_pricing_strategy(competitive_data)
        
        # Should approve moderate increase
        assert result['recommendation'] in ['proceed_with_increase', 'gradual_increase']
        assert result['risk_level'] in ['low', 'moderate']
        assert result['market_position'] == 'competitive'
    
    @pytest.mark.asyncio
    async def test_revenue_trend_analysis(self, financial_agent, sample_revenue_data):
        """Test revenue trend analysis"""
        result = await financial_agent.analyze_revenue_trends(sample_revenue_data)
        
        # Verify response structure
        assert 'predicted_revenue' in result
        assert 'confidence_range' in result
        assert 'trend_direction' in result
        assert 'recommendations' in result
        
        # Verify prediction logic
        assert isinstance(result['predicted_revenue'], int)
        assert len(result['confidence_range']) == 2
        assert result['confidence_range'][0] <= result['predicted_revenue'] <= result['confidence_range'][1]
        assert result['trend_direction'] in ['increasing', 'decreasing', 'stable']
    
    @pytest.mark.asyncio
    async def test_revenue_trend_with_growth_factors(self, financial_agent):
        """Test revenue prediction with positive growth factors"""
        growth_data = {
            'revenue_history': [3000, 3200, 3400],
            'months': ['January', 'February', 'March'],
            'external_factors': ['Spring break approaching'],
            'shop_changes': ['Added new barber', 'Extended hours']
        }
        
        result = await financial_agent.analyze_revenue_trends(growth_data)
        
        # Should predict growth due to positive factors
        assert result['predicted_revenue'] > growth_data['revenue_history'][-1]
        assert result['trend_direction'] == 'increasing'
        assert result['key_factors']['shop_changes_impact'] > 0
    
    @pytest.mark.asyncio
    async def test_revenue_trend_with_negative_factors(self, financial_agent):
        """Test revenue prediction with negative factors"""
        decline_data = {
            'revenue_history': [3500, 3200, 3000],
            'months': ['January', 'February', 'March'],
            'external_factors': ['New competitor opened', 'Economic downturn'],
            'shop_changes': ['Lost experienced barber']
        }
        
        result = await financial_agent.analyze_revenue_trends(decline_data)
        
        # Should show declining trend
        assert result['trend_direction'] == 'decreasing'
        assert result['key_factors']['external_impact'] < 0
        assert 'retention' in ' '.join(result['recommendations']).lower()
    
    @pytest.mark.asyncio
    async def test_revenue_trend_insufficient_data(self, financial_agent):
        """Test revenue analysis with insufficient data"""
        insufficient_data = {
            'revenue_history': [3000],
            'months': ['March'],
            'external_factors': [],
            'shop_changes': []
        }
        
        result = await financial_agent.analyze_revenue_trends(insufficient_data)
        
        # Should handle insufficient data gracefully
        assert 'error' in result or 'predicted_revenue' in result
    
    @pytest.mark.asyncio
    async def test_profitability_metrics_calculation(self, financial_agent, sample_financial_data):
        """Test profitability metrics calculation"""
        result = await financial_agent.calculate_profitability_metrics(sample_financial_data)
        
        # Verify response structure
        assert 'profitability_metrics' in result
        assert 'per_service_metrics' in result
        assert 'efficiency_metrics' in result
        assert 'benchmark_comparison' in result
        
        # Verify calculations
        profitability = result['profitability_metrics']
        assert profitability['gross_profit'] == 10000  # 15000 - 5000
        assert profitability['net_profit'] == 7500     # 10000 - 2500
        assert profitability['gross_margin_percent'] == 66.7  # (10000/15000) * 100
        assert profitability['net_margin_percent'] == 50.0    # (7500/15000) * 100
        
        # Verify per-service metrics
        per_service = result['per_service_metrics']
        assert per_service['profit_per_service'] == 18.75  # 7500/400
        assert per_service['revenue_per_service'] == 37.5  # 15000/400
    
    @pytest.mark.asyncio
    async def test_profitability_benchmarking(self, financial_agent):
        """Test profitability benchmarking against industry standards"""
        poor_performance_data = {
            'revenue': 10000,
            'costs': {
                'direct_costs': 6000,
                'labor_costs': 5000,
                'overhead_costs': 3000,
                'supplies_cost': 1000
            },
            'services_performed': 300
        }
        
        result = await financial_agent.calculate_profitability_metrics(poor_performance_data)
        
        # Should identify below-benchmark performance
        benchmark = result['benchmark_comparison']
        assert benchmark['overall_rating'] == 'needs_improvement'
        
        # Should provide improvement opportunities
        opportunities = result['improvement_opportunities']
        assert len(opportunities) > 0
        assert any('margin' in opp.lower() for opp in opportunities)
    
    @pytest.mark.asyncio
    async def test_profitability_excellent_performance(self, financial_agent):
        """Test profitability with excellent performance"""
        excellent_data = {
            'revenue': 20000,
            'costs': {
                'direct_costs': 6000,
                'labor_costs': 8000,
                'overhead_costs': 2000,
                'supplies_cost': 600
            },
            'services_performed': 500
        }
        
        result = await financial_agent.calculate_profitability_metrics(excellent_data)
        
        # Should show good performance
        profitability = result['profitability_metrics']
        assert profitability['gross_margin_percent'] >= 60
        assert profitability['net_margin_percent'] >= 20
        
        benchmark = result['benchmark_comparison']
        assert benchmark['overall_rating'] == 'good'
    
    def test_seasonal_factor_calculation(self, financial_agent):
        """Test seasonal factor calculation"""
        # Test different months
        spring_factor = financial_agent._calculate_seasonal_factor(['march'])
        summer_factor = financial_agent._calculate_seasonal_factor(['july'])
        holiday_factor = financial_agent._calculate_seasonal_factor(['december'])
        
        assert spring_factor > 0  # Positive spring factor
        assert summer_factor < 0  # Negative summer factor
        assert holiday_factor > spring_factor  # Holiday season stronger
    
    def test_external_impact_assessment(self, financial_agent):
        """Test external factors impact assessment"""
        positive_factors = ['Spring break approaching', 'Local festival']
        negative_factors = ['New competitor opened', 'Construction nearby']
        mixed_factors = ['Spring break approaching', 'New competitor opened']
        
        positive_impact = financial_agent._assess_external_impact(positive_factors)
        negative_impact = financial_agent._assess_external_impact(negative_factors)
        mixed_impact = financial_agent._assess_external_impact(mixed_factors)
        
        assert positive_impact > 0
        assert negative_impact < 0
        assert abs(mixed_impact) < abs(positive_impact)  # Mixed should be more neutral
    
    def test_shop_changes_impact_assessment(self, financial_agent):
        """Test shop changes impact assessment"""
        positive_changes = ['Added new barber', 'Extended hours', 'Renovation complete']
        negative_changes = ['Lost experienced barber', 'Reduced hours']
        
        positive_impact = financial_agent._assess_shop_changes_impact(positive_changes)
        negative_impact = financial_agent._assess_shop_changes_impact(negative_changes)
        
        assert positive_impact > 0
        assert negative_impact < 0
    
    def test_confidence_score_calculation(self, financial_agent):
        """Test confidence score calculation"""
        # High confidence scenario
        high_confidence = financial_agent._calculate_confidence('low', 'competitive')
        
        # Low confidence scenario  
        low_confidence = financial_agent._calculate_confidence('high', 'premium')
        
        # Medium confidence scenario
        medium_confidence = financial_agent._calculate_confidence('moderate', 'competitive')
        
        assert high_confidence > low_confidence
        assert medium_confidence > low_confidence
        assert high_confidence <= 1.0
        assert low_confidence >= 0.0

# Performance benchmarks specific to Financial Agent
class TestFinancialAgentPerformance:
    """Performance tests for Financial Agent"""
    
    @pytest.mark.asyncio
    async def test_pricing_analysis_response_time(self):
        """Test pricing analysis response time"""
        import time
        
        agent = FinancialAgent()
        test_data = {
            'current_price': 25,
            'proposed_price': 30,
            'monthly_haircuts': 400,
            'local_competition': [28, 32, 35],
            'cost_per_haircut': 8
        }
        
        start_time = time.time()
        result = await agent.analyze_pricing_strategy(test_data)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should complete within 1 second
        assert response_time < 1.0
        assert 'recommendation' in result
    
    @pytest.mark.asyncio
    async def test_revenue_analysis_accuracy(self):
        """Test revenue prediction accuracy with known scenarios"""
        agent = FinancialAgent()
        
        # Test scenario with clear upward trend
        upward_trend_data = {
            'revenue_history': [2000, 2500, 3000],
            'months': ['January', 'February', 'March'],
            'external_factors': [],
            'shop_changes': []
        }
        
        result = await agent.analyze_revenue_trends(upward_trend_data)
        
        # Should predict higher revenue
        assert result['predicted_revenue'] > 3000
        assert result['trend_direction'] == 'increasing'
        
        # Test scenario with clear downward trend
        downward_trend_data = {
            'revenue_history': [4000, 3500, 3000],
            'months': ['January', 'February', 'March'],
            'external_factors': [],
            'shop_changes': []
        }
        
        result = await agent.analyze_revenue_trends(downward_trend_data)
        
        # Should predict lower revenue
        assert result['predicted_revenue'] < 3000
        assert result['trend_direction'] == 'decreasing'
    
    @pytest.mark.asyncio
    async def test_bulk_profitability_calculations(self):
        """Test bulk profitability calculations for performance"""
        import time
        
        agent = FinancialAgent()
        test_scenarios = []
        
        # Generate 100 test scenarios
        for i in range(100):
            test_scenarios.append({
                'revenue': 10000 + (i * 100),
                'costs': {
                    'direct_costs': 3000 + (i * 30),
                    'labor_costs': 4000 + (i * 40),
                    'overhead_costs': 2000 + (i * 20),
                    'supplies_cost': 500 + (i * 5)
                },
                'services_performed': 300 + i
            })
        
        start_time = time.time()
        
        for scenario in test_scenarios:
            result = await agent.calculate_profitability_metrics(scenario)
            assert 'profitability_metrics' in result
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should process 100 scenarios in under 5 seconds
        assert total_time < 5.0
        
        # Average time per calculation should be under 50ms
        avg_time = total_time / len(test_scenarios)
        assert avg_time < 0.05

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])