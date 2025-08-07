"""
Automated Business Recommendations Engine
Generates intelligent business recommendations using AI agents and business data analysis
"""

import asyncio
import json
import logging  
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum

# Import agent system
from .ai_agents.agent_manager import agent_manager
from .ai_agents.base_agent import MessageDomain, AgentPersonality

logger = logging.getLogger(__name__)

class RecommendationPriority(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium" 
    LOW = "low"

class RecommendationCategory(Enum):
    REVENUE_OPTIMIZATION = "revenue_optimization"
    CUSTOMER_ACQUISITION = "customer_acquisition"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    MARKETING_STRATEGY = "marketing_strategy"
    COST_MANAGEMENT = "cost_management"
    STAFF_PRODUCTIVITY = "staff_productivity"
    CUSTOMER_RETENTION = "customer_retention"
    TECHNOLOGY_ADOPTION = "technology_adoption"

@dataclass
class BusinessRecommendation:
    """Structure for automated business recommendations"""
    id: str
    title: str
    description: str
    category: RecommendationCategory
    priority: RecommendationPriority
    estimated_impact: Dict[str, Any]  # revenue_increase, cost_savings, time_savings
    implementation_effort: str  # low, medium, high
    implementation_time: str  # days, weeks, months
    prerequisites: List[str]
    action_steps: List[str]
    success_metrics: List[str]
    roi_estimate: float
    confidence_score: float
    source_agent: str
    created_at: str
    expires_at: Optional[str]
    metadata: Dict[str, Any]

@dataclass 
class RecommendationSuite:
    """Collection of recommendations for a business"""
    business_id: str
    business_context: Dict[str, Any]
    recommendations: List[BusinessRecommendation]
    analysis_summary: str
    total_potential_impact: Dict[str, Any]
    priority_matrix: Dict[str, List[str]]
    implementation_roadmap: List[Dict[str, Any]]
    generated_at: str
    next_review_date: str
    metadata: Dict[str, Any]

class BusinessRecommendationsEngine:
    """
    Automated engine that generates business recommendations based on:
    - Business performance data
    - Industry benchmarks  
    - AI agent analysis
    - Historical patterns
    """
    
    def __init__(self):
        self.recommendation_cache = {}
        self.business_profiles = {}
        self.recommendation_history = []
        self.performance_metrics = {
            'recommendations_generated': 0,
            'successful_implementations': 0,
            'average_roi': 0.0,
            'agent_utilization': {}
        }
        
        logger.info("✅ Business Recommendations Engine initialized")
    
    async def generate_recommendations(self, business_context: Dict[str, Any], 
                                     force_refresh: bool = False) -> RecommendationSuite:
        """
        Generate comprehensive business recommendations
        """
        
        business_id = business_context.get('business_id', 'default_business')
        
        # Check cache first (unless force refresh)
        if not force_refresh and business_id in self.recommendation_cache:
            cached_suite = self.recommendation_cache[business_id]
            # Return cached if less than 24 hours old
            if datetime.now() - datetime.fromisoformat(cached_suite.generated_at) < timedelta(hours=24):
                logger.info(f"📋 Returning cached recommendations for {business_id}")
                return cached_suite
        
        try:
            logger.info(f"🧠 Generating fresh recommendations for business: {business_id}")
            
            # Step 1: Analyze business context and identify key areas
            analysis_areas = await self._identify_analysis_areas(business_context)
            
            # Step 2: Generate recommendations for each area using specialized agents
            all_recommendations = []
            
            for area in analysis_areas:
                recommendations = await self._generate_area_recommendations(area, business_context)
                all_recommendations.extend(recommendations)
            
            # Step 3: Rank and prioritize recommendations
            prioritized_recommendations = await self._prioritize_recommendations(all_recommendations, business_context)
            
            # Step 4: Create implementation roadmap
            roadmap = await self._create_implementation_roadmap(prioritized_recommendations, business_context)
            
            # Step 5: Calculate total potential impact
            total_impact = await self._calculate_total_impact(prioritized_recommendations)
            
            # Step 6: Generate analysis summary
            analysis_summary = await self._generate_analysis_summary(prioritized_recommendations, business_context)
            
            # Step 7: Create priority matrix
            priority_matrix = self._create_priority_matrix(prioritized_recommendations)
            
            # Create recommendation suite
            suite = RecommendationSuite(
                business_id=business_id,
                business_context=business_context,
                recommendations=prioritized_recommendations,
                analysis_summary=analysis_summary,
                total_potential_impact=total_impact,
                priority_matrix=priority_matrix,
                implementation_roadmap=roadmap,
                generated_at=datetime.now().isoformat(),
                next_review_date=(datetime.now() + timedelta(days=7)).isoformat(),
                metadata={
                    'analysis_areas': len(analysis_areas),
                    'total_recommendations': len(prioritized_recommendations),
                    'generation_method': 'ai_agent_analysis',
                    'confidence_avg': sum(r.confidence_score for r in prioritized_recommendations) / len(prioritized_recommendations) if prioritized_recommendations else 0
                }
            )
            
            # Cache the suite
            self.recommendation_cache[business_id] = suite
            
            # Update performance metrics
            self.performance_metrics['recommendations_generated'] += len(prioritized_recommendations)
            
            logger.info(f"✅ Generated {len(prioritized_recommendations)} recommendations for {business_id}")
            return suite
            
        except Exception as e:
            logger.error(f"❌ Error generating recommendations: {e}")
            return await self._generate_fallback_recommendations(business_context)
    
    async def _identify_analysis_areas(self, business_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify key business areas that need analysis"""
        
        areas = []
        
        # Financial analysis area
        if business_context.get('monthly_revenue') or business_context.get('avg_ticket'):
            areas.append({
                'category': RecommendationCategory.REVENUE_OPTIMIZATION,
                'agent_type': AgentPersonality.FINANCIAL_COACH,
                'analysis_query': "Analyze current financial performance and identify revenue optimization opportunities",
                'priority': 'high' if business_context.get('monthly_revenue', 0) < 10000 else 'medium'
            })
        
        # Marketing analysis area  
        if business_context.get('customer_count') or business_context.get('social_media_followers'):
            areas.append({
                'category': RecommendationCategory.CUSTOMER_ACQUISITION,
                'agent_type': AgentPersonality.MARKETING_EXPERT,
                'analysis_query': "Evaluate marketing effectiveness and suggest customer acquisition strategies",
                'priority': 'high' if business_context.get('monthly_new_customers', 0) < 20 else 'medium'
            })
        
        # Operations analysis area
        if business_context.get('staff_count') or business_context.get('operating_hours'):
            areas.append({
                'category': RecommendationCategory.OPERATIONAL_EFFICIENCY,
                'agent_type': AgentPersonality.OPERATIONS_MANAGER,
                'analysis_query': "Review operational efficiency and staff productivity optimization",
                'priority': 'high' if business_context.get('staff_utilization', 100) < 80 else 'medium'
            })
        
        # Customer retention analysis
        if business_context.get('customer_retention_rate'):
            retention_rate = business_context.get('customer_retention_rate', 85)
            if retention_rate < 80:
                areas.append({
                    'category': RecommendationCategory.CUSTOMER_RETENTION,
                    'agent_type': AgentPersonality.MARKETING_EXPERT,
                    'analysis_query': "Analyze customer retention challenges and develop loyalty strategies",
                    'priority': 'critical'
                })
        
        # Cost management analysis
        if business_context.get('operating_costs') or business_context.get('rent_costs'):
            areas.append({
                'category': RecommendationCategory.COST_MANAGEMENT,
                'agent_type': AgentPersonality.FINANCIAL_COACH,
                'analysis_query': "Review operating costs and identify cost optimization opportunities",
                'priority': 'medium'
            })
        
        logger.info(f"📊 Identified {len(areas)} analysis areas")
        return areas
    
    async def _generate_area_recommendations(self, area: Dict[str, Any], 
                                           business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Generate recommendations for a specific business area"""
        
        try:
            # Get AI agent response for this area
            agent_response = await agent_manager.process_message(
                message=area['analysis_query'],
                context=business_context
            )
            
            if not agent_response or agent_response.total_confidence < 0.5:
                logger.warning(f"⚠️ Low confidence response for {area['category']}")
                return []
            
            recommendations = [] 
            
            # Extract recommendations from agent response
            agent_recommendations = agent_response.combined_recommendations or []
            agent_actions = agent_response.primary_response.action_items or []
            
            # Convert agent recommendations to structured format
            for i, recommendation_text in enumerate(agent_recommendations[:3]):  # Top 3 recommendations
                
                # Determine priority based on area priority and agent confidence
                if area['priority'] == 'critical':
                    priority = RecommendationPriority.CRITICAL
                elif area['priority'] == 'high' and agent_response.total_confidence > 0.8:
                    priority = RecommendationPriority.HIGH
                elif agent_response.total_confidence > 0.7:
                    priority = RecommendationPriority.MEDIUM
                else:
                    priority = RecommendationPriority.LOW
                
                # Generate estimated impact based on category
                estimated_impact = self._estimate_recommendation_impact(
                    area['category'], 
                    recommendation_text, 
                    business_context
                )
                
                # Create action steps from agent actions or derive from recommendation
                action_steps = []
                if i < len(agent_actions):
                    action_steps = [agent_actions[i].get('task', recommendation_text)]
                else:
                    action_steps = [f"Implement: {recommendation_text}"]
                
                recommendation = BusinessRecommendation(
                    id=f"{area['category'].value}_{i+1}_{datetime.now().strftime('%Y%m%d')}",
                    title=self._generate_recommendation_title(recommendation_text, area['category']),
                    description=recommendation_text,
                    category=area['category'],
                    priority=priority,
                    estimated_impact=estimated_impact,
                    implementation_effort=self._estimate_implementation_effort(recommendation_text),
                    implementation_time=self._estimate_implementation_time(recommendation_text),
                    prerequisites=self._identify_prerequisites(recommendation_text, area['category']),
                    action_steps=action_steps,
                    success_metrics=self._generate_success_metrics(area['category'], recommendation_text),
                    roi_estimate=estimated_impact.get('roi_percentage', 0.0),
                    confidence_score=agent_response.total_confidence,
                    source_agent=agent_response.primary_agent,
                    created_at=datetime.now().isoformat(),
                    expires_at=(datetime.now() + timedelta(days=30)).isoformat(),
                    metadata={
                        'agent_confidence': agent_response.total_confidence,
                        'collaboration_score': agent_response.collaboration_score,
                        'analysis_area': area['category'].value
                    }
                )
                
                recommendations.append(recommendation)
            
            logger.info(f"📝 Generated {len(recommendations)} recommendations for {area['category'].value}")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Error generating recommendations for {area['category']}: {e}")
            return []
    
    def _estimate_recommendation_impact(self, category: RecommendationCategory, 
                                      recommendation: str, business_context: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate the business impact of a recommendation"""
        
        current_revenue = business_context.get('monthly_revenue', 5000)
        current_customers = business_context.get('customer_count', 100)
        
        if category == RecommendationCategory.REVENUE_OPTIMIZATION:
            return {
                'revenue_increase_percentage': 15.0,
                'revenue_increase_monthly': current_revenue * 0.15,
                'roi_percentage': 25.0,
                'implementation_cost': current_revenue * 0.05
            }
        elif category == RecommendationCategory.CUSTOMER_ACQUISITION:
            new_customers = current_customers * 0.20  # 20% increase
            return {
                'new_customers_monthly': new_customers,
                'revenue_increase_monthly': new_customers * business_context.get('avg_ticket', 50),
                'roi_percentage': 30.0,
                'customer_acquisition_cost': 25.0
            }
        elif category == RecommendationCategory.OPERATIONAL_EFFICIENCY:
            return {
                'time_savings_hours': 10.0,
                'cost_savings_monthly': current_revenue * 0.08,
                'productivity_increase_percentage': 12.0,
                'roi_percentage': 20.0
            }
        elif category == RecommendationCategory.COST_MANAGEMENT:
            return {
                'cost_savings_monthly': current_revenue * 0.10,
                'cost_reduction_percentage': 10.0,
                'roi_percentage': 35.0,
                'payback_period_months': 3
            }
        else:
            return {
                'business_improvement_score': 7.5,
                'roi_percentage': 15.0,
                'qualitative_benefits': ['improved_customer_satisfaction', 'better_brand_reputation']
            }
    
    def _generate_recommendation_title(self, recommendation: str, category: RecommendationCategory) -> str:
        """Generate a concise title for the recommendation"""
        
        title_prefixes = {
            RecommendationCategory.REVENUE_OPTIMIZATION: "Boost Revenue:",
            RecommendationCategory.CUSTOMER_ACQUISITION: "Acquire Customers:",
            RecommendationCategory.OPERATIONAL_EFFICIENCY: "Improve Operations:",
            RecommendationCategory.MARKETING_STRATEGY: "Marketing Strategy:",
            RecommendationCategory.COST_MANAGEMENT: "Reduce Costs:",
            RecommendationCategory.CUSTOMER_RETENTION: "Retain Customers:",
        }
        
        prefix = title_prefixes.get(category, "Business Improvement:")
        
        # Extract key action from recommendation (first 40 characters)
        action = recommendation.split('.')[0][:40] + "..." if len(recommendation) > 40 else recommendation.split('.')[0]
        
        return f"{prefix} {action}"
    
    def _estimate_implementation_effort(self, recommendation: str) -> str:
        """Estimate implementation effort based on recommendation complexity"""
        
        effort_keywords = {
            'low': ['social media', 'post', 'promote', 'advertise', 'simple', 'basic'],
            'high': ['system', 'software', 'hire', 'renovate', 'restructure', 'technology'],
            'medium': ['training', 'process', 'strategy', 'improve', 'optimize']
        }
        
        recommendation_lower = recommendation.lower()
        
        for effort, keywords in effort_keywords.items():
            if any(keyword in recommendation_lower for keyword in keywords):
                return effort
        
        return 'medium'  # Default
    
    def _estimate_implementation_time(self, recommendation: str) -> str:
        """Estimate implementation timeframe"""
        
        timeframe_keywords = {
            '1-2 weeks': ['social media', 'post', 'advertise', 'promote'],
            '3-6 months': ['system', 'software', 'hire', 'major'],
            '1-2 months': ['training', 'process', 'strategy', 'improve']
        }
        
        recommendation_lower = recommendation.lower()
        
        for timeframe, keywords in timeframe_keywords.items():
            if any(keyword in recommendation_lower for keyword in keywords):
                return timeframe
        
        return '2-4 weeks'  # Default
    
    def _identify_prerequisites(self, recommendation: str, category: RecommendationCategory) -> List[str]:
        """Identify prerequisites for implementing the recommendation"""
        
        prerequisites_map = {
            RecommendationCategory.REVENUE_OPTIMIZATION: ["Financial analysis", "Budget allocation"],
            RecommendationCategory.CUSTOMER_ACQUISITION: ["Marketing budget", "Target audience definition"],
            RecommendationCategory.OPERATIONAL_EFFICIENCY: ["Staff training time", "Process documentation"],
            RecommendationCategory.COST_MANAGEMENT: ["Cost analysis", "Vendor negotiations"],
        }
        
        return prerequisites_map.get(category, ["Management approval", "Resource allocation"])
    
    def _generate_success_metrics(self, category: RecommendationCategory, recommendation: str) -> List[str]:
        """Generate success metrics for tracking recommendation performance"""
        
        metrics_map = {
            RecommendationCategory.REVENUE_OPTIMIZATION: [
                "Monthly revenue increase (%)",
                "Average transaction value",
                "Revenue per customer"
            ],
            RecommendationCategory.CUSTOMER_ACQUISITION: [
                "New customers per month",
                "Customer acquisition cost",
                "Conversion rate improvement"
            ],
            RecommendationCategory.OPERATIONAL_EFFICIENCY: [
                "Time savings per day (hours)",
                "Staff productivity increase (%)",
                "Customer wait time reduction"
            ],
            RecommendationCategory.COST_MANAGEMENT: [
                "Monthly cost savings ($)",
                "Cost reduction percentage",
                "ROI achievement timeline"
            ]
        }
        
        return metrics_map.get(category, ["Business improvement score", "Implementation success rate"])
    
    async def _prioritize_recommendations(self, recommendations: List[BusinessRecommendation], 
                                        business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Prioritize recommendations based on impact, effort, and business needs"""
        
        # Calculate priority score for each recommendation
        for rec in recommendations:
            score = 0
            
            # Priority weight
            priority_weights = {
                RecommendationPriority.CRITICAL: 40,
                RecommendationPriority.HIGH: 30,
                RecommendationPriority.MEDIUM: 20,
                RecommendationPriority.LOW: 10
            }
            score += priority_weights[rec.priority]
            
            # ROI weight
            score += min(rec.roi_estimate, 50)  # Cap at 50 points
            
            # Confidence weight
            score += rec.confidence_score * 20
            
            # Implementation effort weight (inverse - easier gets higher score)
            effort_weights = {'low': 15, 'medium': 10, 'high': 5}
            score += effort_weights.get(rec.implementation_effort, 10)
            
            # Store priority score in metadata
            rec.metadata['priority_score'] = score
        
        # Sort by priority score (highest first)
        sorted_recommendations = sorted(recommendations, key=lambda x: x.metadata.get('priority_score', 0), reverse=True)
        
        logger.info(f"📊 Prioritized {len(sorted_recommendations)} recommendations")
        return sorted_recommendations
    
    async def _create_implementation_roadmap(self, recommendations: List[BusinessRecommendation], 
                                           business_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create a phased implementation roadmap"""
        
        roadmap = []
        
        # Phase 1: Quick wins (1-2 weeks, low effort, high impact)
        phase1 = [r for r in recommendations if r.implementation_time == '1-2 weeks' and r.implementation_effort == 'low'][:3]
        if phase1:
            roadmap.append({
                'phase': 1,
                'title': 'Quick Wins',
                'timeframe': '1-2 weeks',
                'recommendations': [r.id for r in phase1],
                'expected_impact': sum(r.estimated_impact.get('roi_percentage', 0) for r in phase1) / len(phase1),
                'description': 'Low-effort, high-impact improvements for immediate results'
            })
        
        # Phase 2: Short-term improvements (2-4 weeks, medium effort)
        phase2 = [r for r in recommendations if r.implementation_time in ['2-4 weeks', '1-2 months'] and r.implementation_effort == 'medium'][:3]
        if phase2:
            roadmap.append({
                'phase': 2,
                'title': 'Short-term Improvements',
                'timeframe': '2-8 weeks',
                'recommendations': [r.id for r in phase2],
                'expected_impact': sum(r.estimated_impact.get('roi_percentage', 0) for r in phase2) / len(phase2),
                'description': 'Strategic improvements requiring moderate investment'
            })
        
        # Phase 3: Long-term transformations (3+ months, high effort)
        phase3 = [r for r in recommendations if r.implementation_effort == 'high'][:2]
        if phase3:
            roadmap.append({
                'phase': 3,
                'title': 'Long-term Transformations',
                'timeframe': '3-6 months',
                'recommendations': [r.id for r in phase3],
                'expected_impact': sum(r.estimated_impact.get('roi_percentage', 0) for r in phase3) / len(phase3),
                'description': 'Major improvements requiring significant investment'
            })
        
        return roadmap
    
    async def _calculate_total_impact(self, recommendations: List[BusinessRecommendation]) -> Dict[str, Any]:
        """Calculate total potential impact of all recommendations"""
        
        total_revenue_increase = 0
        total_cost_savings = 0
        total_new_customers = 0
        total_roi = 0
        
        for rec in recommendations:
            impact = rec.estimated_impact
            total_revenue_increase += impact.get('revenue_increase_monthly', 0)
            total_cost_savings += impact.get('cost_savings_monthly', 0)
            total_new_customers += impact.get('new_customers_monthly', 0)
            total_roi += impact.get('roi_percentage', 0)
        
        return {
            'total_revenue_increase_monthly': total_revenue_increase,
            'total_cost_savings_monthly': total_cost_savings,
            'total_new_customers_monthly': total_new_customers,
            'average_roi_percentage': total_roi / len(recommendations) if recommendations else 0,
            'total_recommendations': len(recommendations),
            'implementation_timeline': '3-6 months for full implementation'
        }
    
    async def _generate_analysis_summary(self, recommendations: List[BusinessRecommendation], 
                                       business_context: Dict[str, Any]) -> str:
        """Generate a summary of the analysis and recommendations"""
        
        top_categories = {}
        for rec in recommendations:
            category = rec.category.value
            if category not in top_categories:
                top_categories[category] = 0
            top_categories[category] += 1
        
        top_category = max(top_categories.items(), key=lambda x: x[1])[0] if top_categories else 'general'
        
        summary = f"""
Based on AI agent analysis of your barbershop business, we've identified {len(recommendations)} strategic recommendations 
across {len(top_categories)} business areas. The primary focus area is {top_category.replace('_', ' ')}, 
indicating significant opportunity for improvement.

Key findings:
• {len([r for r in recommendations if r.priority == RecommendationPriority.CRITICAL])} critical priorities requiring immediate attention
• {len([r for r in recommendations if r.priority == RecommendationPriority.HIGH])} high-impact opportunities with strong ROI potential
• Average recommendation confidence: {sum(r.confidence_score for r in recommendations) / len(recommendations):.1%}

The recommendations are designed to be implemented in phases, starting with quick wins that can show immediate results, 
followed by strategic improvements that build long-term competitive advantage.
"""
        
        return summary.strip()
    
    def _create_priority_matrix(self, recommendations: List[BusinessRecommendation]) -> Dict[str, List[str]]:
        """Create a priority matrix organizing recommendations by urgency and importance"""
        
        matrix = {
            'urgent_important': [],    # Critical & High priority
            'not_urgent_important': [], # Medium priority, high ROI
            'urgent_not_important': [], # High priority, low ROI  
            'not_urgent_not_important': [] # Low priority
        }
        
        for rec in recommendations:
            is_urgent = rec.priority in [RecommendationPriority.CRITICAL, RecommendationPriority.HIGH]
            is_important = rec.roi_estimate > 20  # ROI > 20%
            
            if is_urgent and is_important:
                matrix['urgent_important'].append(rec.id)
            elif not is_urgent and is_important:
                matrix['not_urgent_important'].append(rec.id)
            elif is_urgent and not is_important:
                matrix['urgent_not_important'].append(rec.id)
            else:
                matrix['not_urgent_not_important'].append(rec.id)
        
        return matrix
    
    async def _generate_fallback_recommendations(self, business_context: Dict[str, Any]) -> RecommendationSuite:
        """Generate basic fallback recommendations when AI analysis fails"""
        
        fallback_recommendations = [
            BusinessRecommendation(
                id="fallback_social_media",
                title="Boost Revenue: Improve Social Media Presence",
                description="Increase social media posting frequency and engagement to attract new customers",
                category=RecommendationCategory.MARKETING_STRATEGY,
                priority=RecommendationPriority.HIGH,
                estimated_impact={'revenue_increase_monthly': 500, 'roi_percentage': 25},
                implementation_effort='low',
                implementation_time='1-2 weeks',
                prerequisites=['Social media accounts', 'Content creation plan'],
                action_steps=['Post 3-4 times per week', 'Share before/after photos', 'Engage with customer comments'],
                success_metrics=['Follower growth', 'Engagement rate', 'New customer inquiries'],
                roi_estimate=25.0,
                confidence_score=0.7,
                source_agent='Fallback System',
                created_at=datetime.now().isoformat(),
                expires_at=(datetime.now() + timedelta(days=30)).isoformat(),
                metadata={'fallback': True}
            )
        ]
        
        return RecommendationSuite(
            business_id=business_context.get('business_id', 'fallback'),
            business_context=business_context,
            recommendations=fallback_recommendations,
            analysis_summary="Basic recommendations generated due to system limitations. Please try again later for full AI analysis.",
            total_potential_impact={'total_revenue_increase_monthly': 500},
            priority_matrix={'urgent_important': ['fallback_social_media']},
            implementation_roadmap=[{
                'phase': 1,
                'title': 'Quick Wins',
                'timeframe': '1-2 weeks',
                'recommendations': ['fallback_social_media']
            }],
            generated_at=datetime.now().isoformat(),
            next_review_date=(datetime.now() + timedelta(days=7)).isoformat(),
            metadata={'fallback': True}
        )
    
    def get_recommendations_status(self) -> Dict[str, Any]:
        """Get status of the recommendations engine"""
        
        return {
            'cached_businesses': len(self.recommendation_cache),
            'total_recommendations_generated': self.performance_metrics['recommendations_generated'],
            'engine_status': 'operational',
            'last_generation': max([suite.generated_at for suite in self.recommendation_cache.values()]) if self.recommendation_cache else None
        }
    
    async def track_implementation_success(self, recommendation_id: str, success_metrics: Dict[str, Any]):
        """Track the success of implemented recommendations"""
        
        # This would integrate with business metrics tracking
        # For now, update performance metrics
        self.performance_metrics['successful_implementations'] += 1
        
        logger.info(f"📈 Tracked implementation success for {recommendation_id}")

# Global instance
business_recommendations_engine = BusinessRecommendationsEngine()