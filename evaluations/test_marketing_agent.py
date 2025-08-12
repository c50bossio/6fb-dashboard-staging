#!/usr/bin/env python3
"""
Marketing Agent (Sophia) Unit Tests
==================================

Comprehensive unit tests for the Marketing Agent focusing on:
- Customer acquisition strategies
- Competitive response planning
- Social media campaign optimization
- Brand positioning analysis
- Customer retention programs
- Marketing ROI analysis
"""

import pytest
import json
import statistics
from typing import Dict, List, Any, Optional
from unittest.mock import Mock, patch
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

class MarketingAgent:
    """Mock Marketing Agent for testing"""
    
    def __init__(self):
        self.agent_id = 'sophia'
        self.name = 'Sophia (Marketing)'
        self.specialties = ['marketing', 'customer acquisition', 'social media', 'campaigns', 'branding']
        
    async def develop_competitive_response(self, competitive_data: Dict[str, Any]) -> Dict[str, Any]:
        """Develop competitive response strategy"""
        competitor_info = competitive_data['competitor_info']
        shop_advantages = competitive_data.get('shop_advantages', [])
        current_performance = competitive_data.get('current_performance', {})
        
        # Analyze competitive threat level
        threat_level = self._assess_competitive_threat(competitor_info)
        
        # Determine strategy based on threat and advantages
        if competitor_info.get('pricing', '').endswith('lower') and threat_level == 'high':
            strategy = 'differentiation_and_retention'
            focus = 'value_over_price'
        elif threat_level == 'low':
            strategy = 'monitor_and_maintain'
            focus = 'current_strengths'
        else:
            strategy = 'aggressive_response'
            focus = 'market_share_protection'
        
        # Generate immediate actions based on strategy
        immediate_actions = self._generate_immediate_actions(strategy, shop_advantages, competitor_info)
        
        # Develop content strategy
        content_strategy = self._develop_content_strategy(strategy, shop_advantages)
        
        # Create promotional campaign
        promotional_campaign = self._design_promotional_campaign(strategy, competitor_info)
        
        # Calculate implementation timeline
        timeline = self._create_implementation_timeline(strategy, immediate_actions)
        
        return {
            'strategy': strategy,
            'threat_level': threat_level,
            'focus_area': focus,
            'immediate_actions': immediate_actions,
            'content_strategy': content_strategy,
            'promotional_campaign': promotional_campaign,
            'implementation_timeline': timeline,
            'success_metrics': self._define_success_metrics(strategy),
            'budget_allocation': self._recommend_budget_allocation(strategy, threat_level),
            'confidence_score': self._calculate_strategy_confidence(threat_level, len(shop_advantages))
        }
    
    def _assess_competitive_threat(self, competitor_info: Dict[str, Any]) -> str:
        """Assess competitive threat level"""
        threat_factors = 0
        
        # Distance factor
        distance = competitor_info.get('distance', '')
        if 'block' in distance or 'nearby' in distance:
            threat_factors += 2
        elif 'mile' in distance:
            threat_factors += 1
        
        # Pricing factor
        pricing = competitor_info.get('pricing', '')
        if 'lower' in pricing:
            threat_factors += 2
        elif 'similar' in pricing:
            threat_factors += 1
        
        # Services factor
        services = competitor_info.get('services', [])
        if len(services) > 3:
            threat_factors += 1
        
        # Special factors
        if competitor_info.get('grand_opening'):
            threat_factors += 1
        
        if threat_factors >= 4:
            return 'high'
        elif threat_factors >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _generate_immediate_actions(self, strategy: str, advantages: List[str], competitor_info: Dict[str, Any]) -> List[str]:
        """Generate immediate response actions"""
        actions = []
        
        if strategy == 'differentiation_and_retention':
            actions.extend([
                'Launch customer loyalty program',
                'Highlight experience/quality in marketing',
                'Create exclusive services for regulars',
                'Implement referral incentive program'
            ])
            
            if 'Established clientele' in advantages:
                actions.append('Leverage customer testimonials and reviews')
            
            if 'Premium location' in advantages:
                actions.append('Emphasize convenience and accessibility')
        
        elif strategy == 'aggressive_response':
            actions.extend([
                'Match competitive pricing selectively',
                'Launch aggressive promotional campaign',
                'Increase advertising spend',
                'Create limited-time offers'
            ])
        
        elif strategy == 'monitor_and_maintain':
            actions.extend([
                'Maintain current service quality',
                'Monitor competitor performance',
                'Prepare contingency plans',
                'Focus on customer satisfaction'
            ])
        
        # Add time-sensitive actions
        if competitor_info.get('grand_opening') == 'next_week':
            actions.insert(0, 'Execute immediate customer retention outreach')
        
        return actions
    
    def _develop_content_strategy(self, strategy: str, advantages: List[str]) -> str:
        """Develop content marketing strategy"""
        if strategy == 'differentiation_and_retention':
            content = 'Before/after showcases, customer testimonials, '
            content += 'staff expertise highlights, behind-the-scenes content'
            
            if 'Experienced staff' in advantages:
                content += ', barber skill demonstrations'
        
        elif strategy == 'aggressive_response':
            content = 'Promotional content, limited-time offers, '
            content += 'competitive comparisons, value propositions'
        
        else:
            content = 'Regular service showcases, customer features, '
            content += 'community involvement, educational content'
        
        return content
    
    def _design_promotional_campaign(self, strategy: str, competitor_info: Dict[str, Any]) -> str:
        """Design promotional campaign"""
        if strategy == 'differentiation_and_retention':
            return 'Referral bonus for existing customers bringing new clients'
        
        elif strategy == 'aggressive_response':
            if competitor_info.get('grand_opening'):
                return 'Counter-opening special: 20% off for new customers this month'
            else:
                return 'Price-match guarantee with added value services'
        
        else:
            return 'Customer appreciation month with loyalty rewards'
    
    def _create_implementation_timeline(self, strategy: str, actions: List[str]) -> Dict[str, List[str]]:
        """Create implementation timeline"""
        if strategy == 'differentiation_and_retention':
            return {
                'week_1': ['Launch loyalty program', 'Create testimonial content'],
                'week_2': ['Implement referral program', 'Begin social media campaign'],
                'week_3': ['Analyze initial results', 'Adjust messaging'],
                'month_2': ['Expand successful tactics', 'Plan long-term retention']
            }
        
        elif strategy == 'aggressive_response':
            return {
                'week_1': ['Launch promotional pricing', 'Increase ad spend'],
                'week_2': ['Monitor competitor response', 'Adjust tactics'],
                'week_3': ['Evaluate customer acquisition', 'Optimize campaigns'],
                'month_2': ['Transition to sustainable strategy']
            }
        
        else:
            return {
                'ongoing': ['Monitor competitor', 'Maintain quality'],
                'monthly': ['Review performance metrics', 'Adjust as needed']
            }
    
    def _define_success_metrics(self, strategy: str) -> List[str]:
        """Define success metrics for strategy"""
        base_metrics = ['customer_retention_rate', 'new_customer_acquisition', 'revenue_growth']
        
        if strategy == 'differentiation_and_retention':
            base_metrics.extend(['customer_satisfaction_score', 'referral_rate', 'average_customer_lifetime'])
        
        elif strategy == 'aggressive_response':
            base_metrics.extend(['market_share_change', 'cost_per_acquisition', 'competitive_win_rate'])
        
        return base_metrics
    
    def _recommend_budget_allocation(self, strategy: str, threat_level: str) -> Dict[str, float]:
        """Recommend budget allocation percentages"""
        if strategy == 'differentiation_and_retention':
            return {
                'loyalty_programs': 30,
                'content_creation': 25,
                'referral_incentives': 20,
                'social_media_ads': 15,
                'customer_experience': 10
            }
        
        elif strategy == 'aggressive_response':
            multiplier = 1.5 if threat_level == 'high' else 1.2
            return {
                'promotional_pricing': 35 * multiplier,
                'advertising': 30 * multiplier,
                'promotional_campaigns': 20,
                'competitive_analysis': 10,
                'contingency': 5
            }
        
        else:
            return {
                'maintenance_marketing': 40,
                'customer_satisfaction': 30,
                'monitoring_tools': 15,
                'improvement_initiatives': 15
            }
    
    def _calculate_strategy_confidence(self, threat_level: str, advantages_count: int) -> float:
        """Calculate confidence score for strategy"""
        base_confidence = 0.7
        
        # Adjust for threat level
        threat_adjustments = {'low': 0.1, 'medium': 0.0, 'high': -0.1}
        base_confidence += threat_adjustments.get(threat_level, 0.0)
        
        # Adjust for competitive advantages
        advantage_boost = min(advantages_count * 0.05, 0.15)
        base_confidence += advantage_boost
        
        return min(max(base_confidence, 0.3), 1.0)
    
    async def design_customer_acquisition_campaign(self, campaign_data: Dict[str, Any]) -> Dict[str, Any]:
        """Design customer acquisition campaign"""
        target_audience = campaign_data['target_audience']
        budget = campaign_data['budget']
        timeline = campaign_data['timeline']
        current_metrics = campaign_data.get('current_metrics', {})
        
        # Analyze target audience
        audience_segments = self._analyze_target_audience(target_audience)
        
        # Recommend channels based on audience and budget
        channels = self._recommend_marketing_channels(audience_segments, budget)
        
        # Create messaging strategy
        messaging = self._develop_messaging_strategy(audience_segments)
        
        # Design campaign funnel
        funnel = self._design_acquisition_funnel(channels, audience_segments)
        
        # Calculate expected outcomes
        projections = self._calculate_campaign_projections(channels, budget, timeline)
        
        return {
            'target_segments': audience_segments,
            'recommended_channels': channels,
            'messaging_strategy': messaging,
            'campaign_funnel': funnel,
            'budget_allocation': self._allocate_campaign_budget(channels, budget),
            'timeline_milestones': self._create_campaign_timeline(timeline),
            'success_metrics': self._define_acquisition_metrics(),
            'projected_outcomes': projections,
            'optimization_plan': self._create_optimization_plan(),
            'confidence_score': self._calculate_campaign_confidence(budget, len(channels))
        }
    
    def _analyze_target_audience(self, target_audience: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze and segment target audience"""
        demographics = target_audience.get('demographics', {})
        preferences = target_audience.get('preferences', [])
        behaviors = target_audience.get('behaviors', [])
        
        segments = []
        
        # Professional segment
        if demographics.get('age_range') == '25-45' and 'professional' in preferences:
            segments.append({
                'name': 'working_professionals',
                'size_estimate': '40%',
                'key_motivators': ['convenience', 'quality', 'professional_appearance'],
                'preferred_times': ['evenings', 'weekends'],
                'communication_style': 'professional_efficient'
            })
        
        # Young adults segment
        if 'style_conscious' in behaviors or 'social_media_active' in behaviors:
            segments.append({
                'name': 'style_conscious_young_adults',
                'size_estimate': '30%',
                'key_motivators': ['trending_styles', 'social_media_worthy', 'value'],
                'preferred_times': ['after_school', 'weekends'],
                'communication_style': 'casual_trendy'
            })
        
        # Family segment
        if 'family_oriented' in preferences:
            segments.append({
                'name': 'family_customers',
                'size_estimate': '20%',
                'key_motivators': ['family_friendly', 'reliability', 'value'],
                'preferred_times': ['weekends', 'school_holidays'],
                'communication_style': 'warm_trustworthy'
            })
        
        # Local community segment
        segments.append({
            'name': 'local_community',
            'size_estimate': '10%',
            'key_motivators': ['local_business_support', 'community_connection'],
            'preferred_times': ['flexible'],
            'communication_style': 'personal_community_focused'
        })
        
        return segments
    
    def _recommend_marketing_channels(self, segments: List[Dict[str, Any]], budget: float) -> Dict[str, Dict[str, Any]]:
        """Recommend marketing channels based on segments and budget"""
        channels = {}
        
        # Social Media (effective for young adults)
        if any(seg['name'] == 'style_conscious_young_adults' for seg in segments):
            channels['social_media'] = {
                'platforms': ['Instagram', 'TikTok', 'Facebook'],
                'content_types': ['before_after_photos', 'style_videos', 'customer_features'],
                'targeting': 'style_conscious_demographics',
                'estimated_reach': '2000-5000',
                'cost_effectiveness': 'high'
            }
        
        # Google Ads (effective for professionals)
        if any(seg['name'] == 'working_professionals' for seg in segments):
            channels['google_ads'] = {
                'campaign_types': ['search', 'local'],
                'keywords': ['barber_near_me', 'mens_haircut', 'professional_grooming'],
                'targeting': 'local_professional_demographics',
                'estimated_reach': '1000-3000',
                'cost_effectiveness': 'medium'
            }
        
        # Local community outreach
        channels['community_outreach'] = {
            'activities': ['local_events', 'business_partnerships', 'referral_programs'],
            'targeting': 'geographic_local',
            'estimated_reach': '500-1500',
            'cost_effectiveness': 'high'
        }
        
        # Adjust channels based on budget
        if budget < 1000:
            # Focus on low-cost, high-impact channels
            channels = {k: v for k, v in channels.items() if v['cost_effectiveness'] == 'high'}
        
        return channels
    
    def _develop_messaging_strategy(self, segments: List[Dict[str, Any]]) -> Dict[str, str]:
        """Develop messaging strategy for each segment"""
        messaging = {}
        
        for segment in segments:
            if segment['name'] == 'working_professionals':
                messaging['working_professionals'] = (
                    "Professional grooming for busy professionals. "
                    "Quality cuts, convenient scheduling, consistent results."
                )
            
            elif segment['name'] == 'style_conscious_young_adults':
                messaging['style_conscious_young_adults'] = (
                    "Trending cuts and fresh styles. "
                    "Your look, our expertise. Share-worthy results every time."
                )
            
            elif segment['name'] == 'family_customers':
                messaging['family_customers'] = (
                    "Family-friendly barbershop with reliable service. "
                    "Quality cuts for all ages in a welcoming environment."
                )
            
            elif segment['name'] == 'local_community':
                messaging['local_community'] = (
                    "Your neighborhood barbershop. "
                    "Supporting local community, one great cut at a time."
                )
        
        return messaging
    
    def _design_acquisition_funnel(self, channels: Dict[str, Any], segments: List[Dict[str, Any]]) -> Dict[str, List[str]]:
        """Design customer acquisition funnel"""
        return {
            'awareness': [
                'Social media content and ads',
                'Google search presence',
                'Local community visibility',
                'Word-of-mouth referrals'
            ],
            'interest': [
                'Website/social media engagement',
                'Service information viewing',
                'Location and hours checking',
                'Review reading'
            ],
            'consideration': [
                'Pricing comparison',
                'Barber profiles viewing',
                'Before/after gallery browsing',
                'Online booking exploration'
            ],
            'conversion': [
                'First appointment booking',
                'New customer offer redemption',
                'Service completion',
                'Payment and scheduling next visit'
            ],
            'retention': [
                'Follow-up communication',
                'Loyalty program enrollment',
                'Referral program participation',
                'Repeat booking patterns'
            ]
        }
    
    def _calculate_campaign_projections(self, channels: Dict[str, Any], budget: float, timeline: str) -> Dict[str, Any]:
        """Calculate projected campaign outcomes"""
        # Base calculations on industry averages
        total_reach = sum(
            int(channel.get('estimated_reach', '1000').split('-')[1])
            for channel in channels.values()
        )
        
        # Conversion rate estimates by channel
        conversion_rates = {
            'social_media': 0.02,  # 2%
            'google_ads': 0.05,    # 5%
            'community_outreach': 0.08,  # 8%
            'referral_programs': 0.15    # 15%
        }
        
        # Calculate projected new customers
        projected_customers = 0
        for channel_name, channel_data in channels.items():
            reach = int(channel_data.get('estimated_reach', '1000').split('-')[1])
            conversion_rate = conversion_rates.get(channel_name, 0.03)
            projected_customers += reach * conversion_rate
        
        # Calculate ROI projections
        average_customer_value = 35  # Average service price
        customer_lifetime_visits = 8  # Per year
        customer_lifetime_value = average_customer_value * customer_lifetime_visits
        
        projected_revenue = projected_customers * customer_lifetime_value
        roi = ((projected_revenue - budget) / budget) * 100 if budget > 0 else 0
        
        return {
            'projected_reach': total_reach,
            'projected_new_customers': int(projected_customers),
            'projected_revenue': projected_revenue,
            'cost_per_acquisition': budget / projected_customers if projected_customers > 0 else 0,
            'projected_roi_percent': roi,
            'timeline_breakdown': self._create_monthly_projections(projected_customers, timeline)
        }
    
    def _create_monthly_projections(self, total_customers: float, timeline: str) -> Dict[str, int]:
        """Create monthly customer acquisition projections"""
        if timeline == '3_months':
            months = 3
        elif timeline == '6_months':
            months = 6
        else:
            months = 1
        
        # Assume ramp-up pattern: slower start, accelerating growth
        monthly_distribution = []
        for month in range(months):
            # Exponential growth pattern
            factor = (month + 1) / months
            monthly_distribution.append(factor ** 1.5)
        
        # Normalize to total customers
        total_factors = sum(monthly_distribution)
        monthly_customers = [
            int((factor / total_factors) * total_customers)
            for factor in monthly_distribution
        ]
        
        return {
            f'month_{i+1}': customers
            for i, customers in enumerate(monthly_customers)
        }
    
    def _allocate_campaign_budget(self, channels: Dict[str, Any], total_budget: float) -> Dict[str, float]:
        """Allocate budget across marketing channels"""
        channel_weights = {
            'social_media': 0.35,      # High engagement, lower cost
            'google_ads': 0.30,        # High intent, higher cost
            'community_outreach': 0.20, # Low cost, high trust
            'referral_programs': 0.15   # High conversion, incentive cost
        }
        
        allocation = {}
        for channel in channels.keys():
            weight = channel_weights.get(channel, 0.10)
            allocation[channel] = total_budget * weight
        
        return allocation
    
    def _create_campaign_timeline(self, timeline: str) -> Dict[str, List[str]]:
        """Create detailed campaign timeline"""
        if timeline == '3_months':
            return {
                'month_1': [
                    'Launch social media campaigns',
                    'Set up Google Ads',
                    'Begin community outreach',
                    'Create initial content'
                ],
                'month_2': [
                    'Optimize based on initial data',
                    'Expand successful campaigns',
                    'Launch referral program',
                    'Analyze customer feedback'
                ],
                'month_3': [
                    'Scale winning strategies',
                    'Plan retention campaigns',
                    'Evaluate overall ROI',
                    'Prepare next phase'
                ]
            }
        else:
            return {
                'week_1': ['Campaign setup and launch'],
                'week_2': ['Monitor and initial optimization'],
                'week_3': ['Data analysis and adjustments'],
                'week_4': ['Results evaluation and planning']
            }
    
    def _define_acquisition_metrics(self) -> List[str]:
        """Define key metrics for acquisition campaign"""
        return [
            'cost_per_acquisition',
            'customer_lifetime_value',
            'conversion_rate_by_channel',
            'reach_and_impressions',
            'engagement_rate',
            'booking_conversion_rate',
            'retention_rate_new_customers',
            'referral_rate_from_new_customers',
            'roi_by_channel',
            'customer_satisfaction_new_customers'
        ]
    
    def _create_optimization_plan(self) -> Dict[str, List[str]]:
        """Create campaign optimization plan"""
        return {
            'weekly_optimizations': [
                'Review channel performance data',
                'Adjust budget allocation to top performers',
                'A/B test messaging and creative',
                'Optimize targeting parameters'
            ],
            'monthly_reviews': [
                'Comprehensive performance analysis',
                'Customer feedback collection and analysis',
                'Competitive landscape review',
                'Strategy refinement based on data'
            ],
            'continuous_improvements': [
                'Landing page optimization',
                'Booking process streamlining',
                'Customer service enhancement',
                'Retention program development'
            ]
        }
    
    def _calculate_campaign_confidence(self, budget: float, channel_count: int) -> float:
        """Calculate confidence score for campaign success"""
        base_confidence = 0.6
        
        # Budget factor (more budget = higher confidence)
        if budget >= 2000:
            budget_boost = 0.2
        elif budget >= 1000:
            budget_boost = 0.1
        else:
            budget_boost = 0.0
        
        # Channel diversity factor
        channel_boost = min(channel_count * 0.05, 0.15)
        
        final_confidence = base_confidence + budget_boost + channel_boost
        
        return min(max(final_confidence, 0.3), 0.95)
    
    async def analyze_social_media_performance(self, social_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze social media marketing performance"""
        platforms = social_data['platforms']
        metrics = social_data['metrics']
        content_types = social_data.get('content_types', [])
        
        # Analyze performance by platform
        platform_analysis = {}
        for platform, data in platforms.items():
            platform_analysis[platform] = self._analyze_platform_performance(platform, data)
        
        # Content performance analysis
        content_analysis = self._analyze_content_performance(content_types, metrics)
        
        # Audience insights
        audience_insights = self._extract_audience_insights(platforms)
        
        # Optimization recommendations
        optimizations = self._generate_social_optimizations(platform_analysis, content_analysis)
        
        return {
            'platform_performance': platform_analysis,
            'content_performance': content_analysis,
            'audience_insights': audience_insights,
            'optimization_recommendations': optimizations,
            'overall_social_score': self._calculate_social_score(platform_analysis),
            'growth_projections': self._project_social_growth(platform_analysis),
            'competitive_benchmark': self._benchmark_social_performance(platform_analysis)
        }
    
    def _analyze_platform_performance(self, platform: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze performance for specific platform"""
        followers = data.get('followers', 0)
        engagement_rate = data.get('engagement_rate', 0)
        reach = data.get('reach', 0)
        conversions = data.get('conversions', 0)
        
        # Calculate performance scores
        follower_growth = data.get('follower_growth', 0)
        engagement_score = min(engagement_rate * 10, 10)  # Scale to 10
        reach_efficiency = (reach / followers) if followers > 0 else 0
        conversion_rate = (conversions / reach) if reach > 0 else 0
        
        # Platform-specific benchmarks
        benchmarks = {
            'Instagram': {'engagement_rate': 0.045, 'reach_rate': 0.25},
            'Facebook': {'engagement_rate': 0.035, 'reach_rate': 0.20},
            'TikTok': {'engagement_rate': 0.055, 'reach_rate': 0.30}
        }
        
        platform_benchmark = benchmarks.get(platform, {'engagement_rate': 0.04, 'reach_rate': 0.22})
        
        return {
            'platform': platform,
            'performance_score': (engagement_score + (reach_efficiency * 10) + (conversion_rate * 100)) / 3,
            'vs_benchmark': {
                'engagement': 'above' if engagement_rate > platform_benchmark['engagement_rate'] else 'below',
                'reach': 'above' if reach_efficiency > platform_benchmark['reach_rate'] else 'below'
            },
            'growth_trend': 'positive' if follower_growth > 0 else 'negative' if follower_growth < 0 else 'stable',
            'recommendations': self._generate_platform_recommendations(platform, data, platform_benchmark)
        }
    
    def _analyze_content_performance(self, content_types: List[str], metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze content performance by type"""
        content_performance = {}
        
        for content_type in content_types:
            # Simulate content performance data
            if content_type == 'before_after_photos':
                performance = {
                    'engagement_rate': 0.08,  # High engagement
                    'conversion_rate': 0.06,  # Good conversion
                    'shareability': 'high',
                    'brand_impact': 'strong'
                }
            elif content_type == 'style_videos':
                performance = {
                    'engagement_rate': 0.12,  # Very high engagement
                    'conversion_rate': 0.04,  # Moderate conversion
                    'shareability': 'very_high',
                    'brand_impact': 'moderate'
                }
            elif content_type == 'customer_testimonials':
                performance = {
                    'engagement_rate': 0.05,  # Moderate engagement
                    'conversion_rate': 0.08,  # High conversion
                    'shareability': 'medium',
                    'brand_impact': 'very_strong'
                }
            else:
                performance = {
                    'engagement_rate': 0.04,
                    'conversion_rate': 0.03,
                    'shareability': 'medium',
                    'brand_impact': 'moderate'
                }
            
            content_performance[content_type] = performance
        
        # Identify top performing content
        top_content = max(content_performance.items(), 
                         key=lambda x: x[1]['engagement_rate'] * x[1]['conversion_rate'])
        
        return {
            'by_content_type': content_performance,
            'top_performing_content': top_content[0],
            'content_recommendations': self._recommend_content_strategy(content_performance)
        }
    
    def _extract_audience_insights(self, platforms: Dict[str, Any]) -> Dict[str, Any]:
        """Extract audience insights from platform data"""
        # Aggregate audience data across platforms
        total_followers = sum(platform.get('followers', 0) for platform in platforms.values())
        
        # Demographic insights (simulated)
        demographics = {
            'age_groups': {
                '18-25': 0.25,
                '26-35': 0.35,
                '36-45': 0.25,
                '46+': 0.15
            },
            'gender_split': {
                'male': 0.70,
                'female': 0.30
            },
            'location': {
                'local_area': 0.80,
                'nearby_areas': 0.15,
                'other': 0.05
            }
        }
        
        # Behavior insights
        behavior_patterns = {
            'peak_engagement_times': ['6-8 PM weekdays', '10 AM-2 PM weekends'],
            'preferred_content': ['before_after', 'style_videos', 'tips'],
            'engagement_style': 'visual_first',
            'booking_behavior': 'mobile_preferred'
        }
        
        return {
            'total_audience_size': total_followers,
            'demographics': demographics,
            'behavior_patterns': behavior_patterns,
            'growth_segments': self._identify_growth_segments(demographics),
            'engagement_preferences': self._analyze_engagement_preferences(behavior_patterns)
        }
    
    def _generate_social_optimizations(self, platform_analysis: Dict[str, Any], 
                                     content_analysis: Dict[str, Any]) -> List[str]:
        """Generate social media optimization recommendations"""
        optimizations = []
        
        # Platform-specific optimizations
        for platform, analysis in platform_analysis.items():
            if analysis['performance_score'] < 5:
                optimizations.append(f'Improve {platform} strategy - performance below average')
            
            if analysis['vs_benchmark']['engagement'] == 'below':
                optimizations.append(f'Increase engagement on {platform} through interactive content')
        
        # Content optimizations
        top_content = content_analysis['top_performing_content']
        optimizations.append(f'Increase {top_content} content - highest performing type')
        
        # General optimizations
        optimizations.extend([
            'Post during peak engagement times (6-8 PM weekdays)',
            'Use location-based hashtags to reach local audience',
            'Implement user-generated content campaigns',
            'Create consistent posting schedule',
            'Engage with followers through comments and DMs'
        ])
        
        return optimizations
    
    def _calculate_social_score(self, platform_analysis: Dict[str, Any]) -> float:
        """Calculate overall social media performance score"""
        if not platform_analysis:
            return 0.0
        
        scores = [analysis['performance_score'] for analysis in platform_analysis.values()]
        return statistics.mean(scores)
    
    def _project_social_growth(self, platform_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Project social media growth based on current performance"""
        total_current_followers = sum(
            analysis.get('followers', 0) 
            for analysis in platform_analysis.values()
        )
        
        # Growth projection based on performance trends
        growth_rate = 0.05  # 5% monthly growth baseline
        
        # Adjust based on current performance
        avg_performance = self._calculate_social_score(platform_analysis)
        if avg_performance > 7:
            growth_rate = 0.08  # 8% for high performance
        elif avg_performance < 4:
            growth_rate = 0.02  # 2% for low performance
        
        return {
            'monthly_growth_rate': growth_rate,
            'projected_followers_3_months': int(total_current_followers * (1 + growth_rate) ** 3),
            'projected_followers_6_months': int(total_current_followers * (1 + growth_rate) ** 6),
            'projected_engagement_growth': growth_rate * 0.8  # Engagement grows slower than followers
        }
    
    def _benchmark_social_performance(self, platform_analysis: Dict[str, Any]) -> Dict[str, str]:
        """Benchmark social performance against industry standards"""
        avg_score = self._calculate_social_score(platform_analysis)
        
        if avg_score >= 8:
            overall_rating = 'excellent'
        elif avg_score >= 6:
            overall_rating = 'good'
        elif avg_score >= 4:
            overall_rating = 'average'
        else:
            overall_rating = 'needs_improvement'
        
        return {
            'overall_rating': overall_rating,
            'industry_position': 'above_average' if avg_score > 5 else 'below_average',
            'improvement_potential': 'high' if avg_score < 6 else 'moderate'
        }
    
    def _generate_platform_recommendations(self, platform: str, data: Dict[str, Any], 
                                         benchmark: Dict[str, float]) -> List[str]:
        """Generate platform-specific recommendations"""
        recommendations = []
        
        engagement_rate = data.get('engagement_rate', 0)
        if engagement_rate < benchmark['engagement_rate']:
            recommendations.append(f'Increase engagement through polls, questions, and interactive stories')
        
        if platform == 'Instagram':
            recommendations.extend([
                'Use Instagram Reels for higher reach',
                'Optimize hashtag strategy with local and niche tags',
                'Share customer stories in highlights'
            ])
        elif platform == 'TikTok':
            recommendations.extend([
                'Create trending haircut transformation videos',
                'Use popular sounds and effects',
                'Participate in relevant challenges'
            ])
        elif platform == 'Facebook':
            recommendations.extend([
                'Share community involvement and local events',
                'Use Facebook Events for special promotions',
                'Encourage customer reviews and check-ins'
            ])
        
        return recommendations
    
    def _recommend_content_strategy(self, content_performance: Dict[str, Any]) -> List[str]:
        """Recommend content strategy based on performance"""
        recommendations = []
        
        # Find best performing content types
        sorted_content = sorted(
            content_performance.items(),
            key=lambda x: x[1]['engagement_rate'] * x[1]['conversion_rate'],
            reverse=True
        )
        
        top_content = sorted_content[0][0]
        recommendations.append(f'Prioritize {top_content} - highest ROI content type')
        
        # Content mix recommendations
        recommendations.extend([
            'Maintain 60% educational/showcase content, 40% promotional',
            'Post customer transformations weekly',
            'Share barber tips and techniques monthly',
            'Feature customer stories and testimonials',
            'Create seasonal and trending content'
        ])
        
        return recommendations
    
    def _identify_growth_segments(self, demographics: Dict[str, Any]) -> List[str]:
        """Identify audience segments with growth potential"""
        segments = []
        
        age_groups = demographics.get('age_groups', {})
        
        # Identify underrepresented segments
        if age_groups.get('18-25', 0) < 0.3:
            segments.append('young_adults')
        
        if age_groups.get('46+', 0) < 0.2:
            segments.append('mature_professionals')
        
        gender_split = demographics.get('gender_split', {})
        if gender_split.get('female', 0) < 0.4:
            segments.append('female_customers')
        
        return segments
    
    def _analyze_engagement_preferences(self, behavior_patterns: Dict[str, Any]) -> Dict[str, str]:
        """Analyze audience engagement preferences"""
        return {
            'content_preference': behavior_patterns.get('preferred_content', ['visual'])[0],
            'interaction_style': behavior_patterns.get('engagement_style', 'visual_first'),
            'optimal_posting_time': behavior_patterns.get('peak_engagement_times', ['evening'])[0],
            'device_preference': behavior_patterns.get('booking_behavior', 'mobile_preferred')
        }

class TestMarketingAgent:
    """Unit tests for Marketing Agent (Sophia)"""
    
    @pytest.fixture
    def marketing_agent(self):
        return MarketingAgent()
    
    @pytest.fixture
    def competitive_data(self):
        return {
            'competitor_info': {
                'distance': '2 blocks',
                'pricing': '20% lower',
                'services': ['haircuts', 'shaves', 'styling'],
                'grand_opening': 'next_week'
            },
            'shop_advantages': ['Established clientele', 'Premium location', 'Experienced staff'],
            'current_performance': {
                'monthly_revenue': 15000,
                'customer_retention': 0.85,
                'new_customers_per_month': 45
            }
        }
    
    @pytest.fixture
    def campaign_data(self):
        return {
            'target_audience': {
                'demographics': {'age_range': '25-45'},
                'preferences': ['professional', 'quality'],
                'behaviors': ['style_conscious', 'social_media_active']
            },
            'budget': 2000,
            'timeline': '3_months',
            'current_metrics': {
                'customer_acquisition_cost': 25,
                'conversion_rate': 0.03
            }
        }
    
    @pytest.fixture
    def social_media_data(self):
        return {
            'platforms': {
                'Instagram': {
                    'followers': 1200,
                    'engagement_rate': 0.045,
                    'reach': 2500,
                    'conversions': 15,
                    'follower_growth': 50
                },
                'Facebook': {
                    'followers': 800,
                    'engagement_rate': 0.03,
                    'reach': 1600,
                    'conversions': 8,
                    'follower_growth': 20
                }
            },
            'metrics': {
                'total_reach': 4100,
                'total_conversions': 23,
                'engagement_rate': 0.038
            },
            'content_types': ['before_after_photos', 'style_videos', 'customer_testimonials']
        }
    
    @pytest.mark.asyncio
    async def test_competitive_response_strategy(self, marketing_agent, competitive_data):
        """Test competitive response strategy development"""
        result = await marketing_agent.develop_competitive_response(competitive_data)
        
        # Verify response structure
        assert 'strategy' in result
        assert 'threat_level' in result
        assert 'immediate_actions' in result
        assert 'content_strategy' in result
        assert 'promotional_campaign' in result
        
        # Verify strategy logic for high threat scenario
        assert result['threat_level'] in ['low', 'medium', 'high']
        assert result['strategy'] in ['differentiation_and_retention', 'aggressive_response', 'monitor_and_maintain']
        assert isinstance(result['immediate_actions'], list)
        assert len(result['immediate_actions']) > 0
    
    @pytest.mark.asyncio
    async def test_competitive_response_high_threat(self, marketing_agent):
        """Test competitive response for high threat scenario"""
        high_threat_data = {
            'competitor_info': {
                'distance': '1 block',
                'pricing': '30% lower',
                'services': ['haircuts', 'shaves', 'styling', 'beard_grooming'],
                'grand_opening': 'next_week'
            },
            'shop_advantages': ['Established clientele']
        }
        
        result = await marketing_agent.develop_competitive_response(high_threat_data)
        
        # Should identify high threat
        assert result['threat_level'] == 'high'
        
        # Should recommend differentiation strategy
        assert result['strategy'] == 'differentiation_and_retention'
        
        # Should include customer retention actions
        actions_text = ' '.join(result['immediate_actions'])
        assert 'loyalty' in actions_text.lower() or 'retention' in actions_text.lower()
    
    @pytest.mark.asyncio
    async def test_competitive_response_low_threat(self, marketing_agent):
        """Test competitive response for low threat scenario"""
        low_threat_data = {
            'competitor_info': {
                'distance': '5 miles',
                'pricing': 'similar',
                'services': ['haircuts'],
                'grand_opening': False
            },
            'shop_advantages': ['Established clientele', 'Premium location', 'Experienced staff']
        }
        
        result = await marketing_agent.develop_competitive_response(low_threat_data)
        
        # Should identify low threat
        assert result['threat_level'] == 'low'
        
        # Should recommend monitoring strategy
        assert result['strategy'] == 'monitor_and_maintain'
    
    @pytest.mark.asyncio
    async def test_customer_acquisition_campaign(self, marketing_agent, campaign_data):
        """Test customer acquisition campaign design"""
        result = await marketing_agent.design_customer_acquisition_campaign(campaign_data)
        
        # Verify response structure
        assert 'target_segments' in result
        assert 'recommended_channels' in result
        assert 'messaging_strategy' in result
        assert 'campaign_funnel' in result
        assert 'projected_outcomes' in result
        
        # Verify segmentation
        segments = result['target_segments']
        assert isinstance(segments, list)
        assert len(segments) > 0
        assert all('name' in segment for segment in segments)
        
        # Verify channel recommendations
        channels = result['recommended_channels']
        assert isinstance(channels, dict)
        assert len(channels) > 0
    
    @pytest.mark.asyncio
    async def test_acquisition_campaign_budget_allocation(self, marketing_agent, campaign_data):
        """Test budget allocation in acquisition campaign"""
        result = await marketing_agent.design_customer_acquisition_campaign(campaign_data)
        
        budget_allocation = result['budget_allocation']
        
        # Verify budget allocation
        assert isinstance(budget_allocation, dict)
        total_allocated = sum(budget_allocation.values())
        assert abs(total_allocated - campaign_data['budget']) < 100  # Allow small rounding differences
        
        # Verify all allocations are positive
        assert all(amount > 0 for amount in budget_allocation.values())
    
    @pytest.mark.asyncio
    async def test_acquisition_campaign_projections(self, marketing_agent, campaign_data):
        """Test acquisition campaign outcome projections"""
        result = await marketing_agent.design_customer_acquisition_campaign(campaign_data)
        
        projections = result['projected_outcomes']
        
        # Verify projection structure
        assert 'projected_new_customers' in projections
        assert 'projected_revenue' in projections
        assert 'cost_per_acquisition' in projections
        assert 'projected_roi_percent' in projections
        
        # Verify realistic projections
        assert projections['projected_new_customers'] > 0
        assert projections['projected_revenue'] > 0
        assert projections['cost_per_acquisition'] > 0
    
    @pytest.mark.asyncio
    async def test_acquisition_low_budget_campaign(self, marketing_agent):
        """Test acquisition campaign with low budget"""
        low_budget_data = {
            'target_audience': {
                'demographics': {'age_range': '25-45'},
                'preferences': ['professional'],
                'behaviors': ['local_focused']
            },
            'budget': 500,  # Low budget
            'timeline': '1_month'
        }
        
        result = await marketing_agent.design_customer_acquisition_campaign(low_budget_data)
        
        # Should focus on cost-effective channels
        channels = result['recommended_channels']
        assert 'community_outreach' in channels  # Low cost option
        
        # Should have realistic projections for low budget
        projections = result['projected_outcomes']
        assert projections['projected_new_customers'] < 50  # Realistic for low budget
    
    @pytest.mark.asyncio
    async def test_social_media_performance_analysis(self, marketing_agent, social_media_data):
        """Test social media performance analysis"""
        result = await marketing_agent.analyze_social_media_performance(social_media_data)
        
        # Verify response structure
        assert 'platform_performance' in result
        assert 'content_performance' in result
        assert 'audience_insights' in result
        assert 'optimization_recommendations' in result
        
        # Verify platform analysis
        platform_performance = result['platform_performance']
        assert 'Instagram' in platform_performance
        assert 'Facebook' in platform_performance
        
        for platform_data in platform_performance.values():
            assert 'performance_score' in platform_data
            assert 'vs_benchmark' in platform_data
            assert 'recommendations' in platform_data
    
    @pytest.mark.asyncio
    async def test_social_media_content_analysis(self, marketing_agent, social_media_data):
        """Test social media content performance analysis"""
        result = await marketing_agent.analyze_social_media_performance(social_media_data)
        
        content_performance = result['content_performance']
        
        # Verify content analysis structure
        assert 'by_content_type' in content_performance
        assert 'top_performing_content' in content_performance
        assert 'content_recommendations' in content_performance
        
        # Verify content types analyzed
        content_types = content_performance['by_content_type']
        assert 'before_after_photos' in content_types
        assert 'style_videos' in content_types
        assert 'customer_testimonials' in content_types
        
        # Verify each content type has performance metrics
        for content_type, metrics in content_types.items():
            assert 'engagement_rate' in metrics
            assert 'conversion_rate' in metrics
    
    @pytest.mark.asyncio
    async def test_social_media_optimization_recommendations(self, marketing_agent, social_media_data):
        """Test social media optimization recommendations"""
        result = await marketing_agent.analyze_social_media_performance(social_media_data)
        
        optimizations = result['optimization_recommendations']
        
        # Verify recommendations are provided
        assert isinstance(optimizations, list)
        assert len(optimizations) > 0
        
        # Verify recommendations are actionable
        assert any('content' in rec.lower() for rec in optimizations)
        assert any('engagement' in rec.lower() for rec in optimizations)
    
    def test_threat_assessment(self, marketing_agent):
        """Test competitive threat assessment logic"""
        # High threat scenario
        high_threat_competitor = {
            'distance': '1 block',
            'pricing': '30% lower',
            'services': ['haircuts', 'shaves', 'styling', 'beard_grooming'],
            'grand_opening': 'next_week'
        }
        threat_level = marketing_agent._assess_competitive_threat(high_threat_competitor)
        assert threat_level == 'high'
        
        # Low threat scenario
        low_threat_competitor = {
            'distance': '10 miles',
            'pricing': 'higher',
            'services': ['haircuts'],
            'grand_opening': False
        }
        threat_level = marketing_agent._assess_competitive_threat(low_threat_competitor)
        assert threat_level == 'low'
    
    def test_audience_segmentation(self, marketing_agent):
        """Test target audience segmentation"""
        target_audience = {
            'demographics': {'age_range': '25-45'},
            'preferences': ['professional', 'quality'],
            'behaviors': ['style_conscious', 'social_media_active', 'family_oriented']
        }
        
        segments = marketing_agent._analyze_target_audience(target_audience)
        
        # Should create multiple segments
        assert len(segments) > 1
        
        # Should include working professionals segment
        segment_names = [seg['name'] for seg in segments]
        assert 'working_professionals' in segment_names
        
        # Should include style-conscious segment
        assert 'style_conscious_young_adults' in segment_names
    
    def test_channel_recommendation_logic(self, marketing_agent):
        """Test marketing channel recommendation logic"""
        segments = [
            {
                'name': 'working_professionals',
                'key_motivators': ['convenience', 'quality']
            },
            {
                'name': 'style_conscious_young_adults',
                'key_motivators': ['trending_styles', 'social_media_worthy']
            }
        ]
        
        budget = 2000
        channels = marketing_agent._recommend_marketing_channels(segments, budget)
        
        # Should recommend appropriate channels for segments
        assert 'google_ads' in channels  # For professionals
        assert 'social_media' in channels  # For young adults
        
        # Should include community outreach (always recommended)
        assert 'community_outreach' in channels
    
    def test_low_budget_channel_filtering(self, marketing_agent):
        """Test channel filtering for low budget scenarios"""
        segments = [{'name': 'working_professionals'}]
        low_budget = 500
        
        channels = marketing_agent._recommend_marketing_channels(segments, low_budget)
        
        # Should prioritize cost-effective channels
        cost_effective_channels = [
            channel for channel, data in channels.items()
            if data.get('cost_effectiveness') == 'high'
        ]
        assert len(cost_effective_channels) > 0
    
    def test_campaign_confidence_calculation(self, marketing_agent):
        """Test campaign confidence score calculation"""
        # High budget, multiple channels
        high_confidence = marketing_agent._calculate_campaign_confidence(3000, 4)
        
        # Low budget, single channel
        low_confidence = marketing_agent._calculate_campaign_confidence(500, 1)
        
        # Medium scenario
        medium_confidence = marketing_agent._calculate_campaign_confidence(1500, 2)
        
        assert high_confidence > low_confidence
        assert medium_confidence > low_confidence
        assert high_confidence <= 0.95
        assert low_confidence >= 0.3

# Performance benchmarks specific to Marketing Agent
class TestMarketingAgentPerformance:
    """Performance tests for Marketing Agent"""
    
    @pytest.mark.asyncio
    async def test_competitive_analysis_response_time(self):
        """Test competitive analysis response time"""
        import time
        
        agent = MarketingAgent()
        test_data = {
            'competitor_info': {
                'distance': '2 blocks',
                'pricing': '20% lower',
                'services': ['haircuts', 'shaves'],
                'grand_opening': 'next_week'
            },
            'shop_advantages': ['Established clientele', 'Premium location']
        }
        
        start_time = time.time()
        result = await agent.develop_competitive_response(test_data)
        end_time = time.time()
        
        response_time = end_time - start_time
        
        # Should complete within 1 second
        assert response_time < 1.0
        assert 'strategy' in result
    
    @pytest.mark.asyncio
    async def test_campaign_design_comprehensiveness(self):
        """Test comprehensiveness of campaign design"""
        agent = MarketingAgent()
        campaign_data = {
            'target_audience': {
                'demographics': {'age_range': '18-65'},
                'preferences': ['professional', 'trendy', 'family_friendly'],
                'behaviors': ['style_conscious', 'social_media_active', 'local_focused']
            },
            'budget': 5000,
            'timeline': '6_months'
        }
        
        result = await agent.design_customer_acquisition_campaign(campaign_data)
        
        # Should create comprehensive campaign
        assert len(result['target_segments']) >= 3  # Multiple segments
        assert len(result['recommended_channels']) >= 3  # Multiple channels
        assert len(result['success_metrics']) >= 8  # Comprehensive metrics
        
        # Should have detailed timeline
        timeline = result['timeline_milestones']
        assert len(timeline) >= 3  # Multi-month planning
    
    @pytest.mark.asyncio
    async def test_social_media_analysis_accuracy(self):
        """Test social media analysis accuracy"""
        agent = MarketingAgent()
        
        # Test with good performance data
        good_performance_data = {
            'platforms': {
                'Instagram': {
                    'followers': 2000,
                    'engagement_rate': 0.08,  # Above benchmark
                    'reach': 5000,
                    'conversions': 40,
                    'follower_growth': 100
                }
            },
            'metrics': {'total_reach': 5000, 'total_conversions': 40},
            'content_types': ['before_after_photos', 'style_videos']
        }
        
        result = await agent.analyze_social_media_performance(good_performance_data)
        
        # Should recognize good performance
        instagram_analysis = result['platform_performance']['Instagram']
        assert instagram_analysis['performance_score'] > 6
        assert instagram_analysis['vs_benchmark']['engagement'] == 'above'
        
        # Should show optimistic growth projections
        growth = result['growth_projections']
        assert growth['monthly_growth_rate'] >= 0.05

if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])