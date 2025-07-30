#!/usr/bin/env python3
"""
Marketing Context Integration Service
Connects marketing automation agents with existing behavioral learning and context systems
"""

import json
import asyncio
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Import existing context systems
sys.path.append('/Users/bossio/6FB AI Agent System/services/integrations')
sys.path.append('/Users/bossio/6FB AI Agent System/services/marketing-automation')
sys.path.append('/Users/bossio/6FB AI Agent System/services/orchestration')
sys.path.append('/Users/bossio/6FB AI Agent System/services/ai-agents')

# Import marketing automation components
from mcp_agent_orchestrator import MCPAgentOrchestrator
from EnhancedAgenticBusinessCoach import EnhancedAgenticBusinessCoach, ShopContext, BusinessStage

class ContextIntegrationType(Enum):
    BEHAVIORAL_LEARNING = "behavioral_learning"
    BUSINESS_INTELLIGENCE = "business_intelligence"
    CUSTOMER_INSIGHTS = "customer_insights"
    MARKETING_PERFORMANCE = "marketing_performance"
    PREDICTIVE_ANALYTICS = "predictive_analytics"

@dataclass
class MarketingContextData:
    """Marketing context data structure"""
    business_id: str
    context_type: ContextIntegrationType
    context_data: Dict[str, Any]
    generated_at: datetime
    confidence_score: float
    data_sources: List[str]
    behavioral_triggers: List[str]
    recommendations: List[Dict[str, Any]]

class MarketingContextIntegration:
    """
    Integrates marketing automation with existing behavioral learning and context systems
    Creates unified intelligence across all AI agents and marketing channels
    """
    
    def __init__(self):
        # Initialize existing components
        self.mcp_orchestrator = MCPAgentOrchestrator()
        self.enhanced_coach = EnhancedAgenticBusinessCoach()
        
        # Context storage and learning
        self.behavioral_patterns = {}
        self.business_intelligence_cache = {}
        self.marketing_performance_history = {}
        
        # Integration handlers
        self.context_integrators = {
            ContextIntegrationType.BEHAVIORAL_LEARNING: self._integrate_behavioral_learning,
            ContextIntegrationType.BUSINESS_INTELLIGENCE: self._integrate_business_intelligence,
            ContextIntegrationType.CUSTOMER_INSIGHTS: self._integrate_customer_insights,
            ContextIntegrationType.MARKETING_PERFORMANCE: self._integrate_marketing_performance,
            ContextIntegrationType.PREDICTIVE_ANALYTICS: self._integrate_predictive_analytics
        }
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def integrate_marketing_context(self, 
                                        business_id: str,
                                        appointment_data: Dict[str, Any],
                                        marketing_activity: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main integration function that combines appointment context with marketing automation
        """
        
        try:
            # Extract business context from appointment data
            business_context = await self._extract_business_context(business_id, appointment_data)
            
            # Analyze marketing performance and impact
            marketing_analysis = await self._analyze_marketing_impact(business_id, marketing_activity)
            
            # Generate behavioral insights
            behavioral_insights = await self._generate_behavioral_insights(
                business_id, business_context, marketing_analysis
            )
            
            # Create comprehensive marketing context
            integrated_context = await self._create_integrated_context(
                business_id, business_context, marketing_analysis, behavioral_insights
            )
            
            # Update learning systems
            await self._update_learning_systems(business_id, integrated_context)
            
            # Generate actionable recommendations
            recommendations = await self._generate_integrated_recommendations(
                business_id, integrated_context
            )
            
            return {
                "success": True,
                "business_id": business_id,
                "integrated_context": integrated_context,
                "behavioral_insights": behavioral_insights,
                "marketing_analysis": marketing_analysis,
                "recommendations": recommendations,
                "context_quality_score": self._calculate_context_quality(integrated_context),
                "generated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Marketing context integration failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _extract_business_context(self, 
                                      business_id: str, 
                                      appointment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract business intelligence from appointment data using existing context builder"""
        
        try:
            # Simulate AI Context Builder integration
            # In production, this would call the actual JavaScript service
            
            # Extract key business metrics from appointment data
            appointments = appointment_data.get("appointments", [])
            
            # Calculate business metrics
            total_revenue = sum(apt.get("service", {}).get("price", 0) for apt in appointments)
            total_appointments = len(appointments)
            unique_customers = len(set(apt.get("customer", {}).get("email", "") for apt in appointments if apt.get("customer", {}).get("email")))
            avg_service_price = total_revenue / total_appointments if total_appointments > 0 else 0
            
            # Analyze customer patterns
            customer_analysis = self._analyze_customer_patterns(appointments)
            
            # Service performance analysis
            service_analysis = self._analyze_service_performance(appointments)
            
            # Revenue trends
            revenue_trends = self._analyze_revenue_trends(appointments)
            
            return {
                "business_metrics": {
                    "total_revenue": total_revenue,
                    "total_appointments": total_appointments,
                    "unique_customers": unique_customers,
                    "avg_service_price": avg_service_price,
                    "customer_retention_rate": customer_analysis.get("retention_rate", 0),
                    "avg_appointments_per_customer": customer_analysis.get("avg_visits", 0)
                },
                "customer_insights": customer_analysis,
                "service_performance": service_analysis,
                "revenue_trends": revenue_trends,
                "operational_metrics": {
                    "peak_hours": self._identify_peak_hours(appointments),
                    "no_show_rate": self._calculate_no_show_rate(appointments),
                    "cancellation_rate": self._calculate_cancellation_rate(appointments)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Business context extraction failed: {str(e)}")
            return {"error": "Failed to extract business context"}
    
    async def _analyze_marketing_impact(self, 
                                      business_id: str, 
                                      marketing_activity: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the impact of marketing automation on business performance"""
        
        try:
            # Get marketing performance data from orchestrator
            performance_data = await self.mcp_orchestrator.get_business_analytics(business_id)
            
            # Calculate marketing attribution
            marketing_attribution = self._calculate_marketing_attribution(marketing_activity, performance_data)
            
            # Analyze channel effectiveness
            channel_effectiveness = self._analyze_channel_effectiveness(marketing_activity)
            
            # Calculate ROI metrics
            roi_analysis = self._calculate_comprehensive_roi(marketing_activity, performance_data)
            
            # Identify successful patterns
            success_patterns = self._identify_success_patterns(marketing_activity, performance_data)
            
            return {
                "marketing_attribution": marketing_attribution,
                "channel_effectiveness": channel_effectiveness,
                "roi_analysis": roi_analysis,
                "success_patterns": success_patterns,
                "performance_trends": {
                    "customer_acquisition": self._analyze_acquisition_trends(marketing_activity),
                    "retention_improvement": self._analyze_retention_impact(marketing_activity),
                    "revenue_growth": self._analyze_revenue_impact(marketing_activity)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Marketing impact analysis failed: {str(e)}")
            return {"error": "Failed to analyze marketing impact"}
    
    async def _generate_behavioral_insights(self, 
                                          business_id: str,
                                          business_context: Dict[str, Any],
                                          marketing_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Generate behavioral insights by combining business and marketing data"""
        
        try:
            # Customer behavior patterns
            customer_behaviors = self._analyze_customer_behaviors(business_context, marketing_analysis)
            
            # Marketing response patterns
            response_patterns = self._analyze_marketing_responses(marketing_analysis)
            
            # Seasonal and temporal patterns
            temporal_patterns = self._analyze_temporal_patterns(business_context, marketing_analysis)
            
            # Predictive behavioral models
            predictive_models = self._build_behavioral_predictions(
                business_id, customer_behaviors, response_patterns, temporal_patterns
            )
            
            return {
                "customer_behaviors": customer_behaviors,
                "response_patterns": response_patterns,
                "temporal_patterns": temporal_patterns,
                "predictive_models": predictive_models,
                "behavioral_triggers": self._identify_behavioral_triggers(
                    customer_behaviors, response_patterns
                ),
                "optimization_opportunities": self._identify_optimization_opportunities(
                    customer_behaviors, marketing_analysis
                )
            }
            
        except Exception as e:
            self.logger.error(f"Behavioral insights generation failed: {str(e)}")
            return {"error": "Failed to generate behavioral insights"}
    
    async def _create_integrated_context(self, 
                                       business_id: str,
                                       business_context: Dict[str, Any],
                                       marketing_analysis: Dict[str, Any],
                                       behavioral_insights: Dict[str, Any]) -> Dict[str, Any]:
        """Create comprehensive integrated context"""
        
        # Combine all context data
        integrated_context = MarketingContextData(
            business_id=business_id,
            context_type=ContextIntegrationType.BUSINESS_INTELLIGENCE,
            context_data={
                "business_intelligence": business_context,
                "marketing_performance": marketing_analysis,
                "behavioral_insights": behavioral_insights,
                "integration_metadata": {
                    "data_completeness": self._assess_data_completeness(
                        business_context, marketing_analysis, behavioral_insights
                    ),
                    "confidence_factors": self._calculate_confidence_factors(
                        business_context, marketing_analysis
                    ),
                    "data_freshness": self._assess_data_freshness(
                        business_context, marketing_analysis
                    )
                }
            },
            generated_at=datetime.now(),
            confidence_score=self._calculate_overall_confidence(
                business_context, marketing_analysis, behavioral_insights
            ),
            data_sources=["appointments", "marketing_automation", "behavioral_learning"],
            behavioral_triggers=behavioral_insights.get("behavioral_triggers", []),
            recommendations=[]  # Will be populated later
        )
        
        return asdict(integrated_context)
    
    async def _update_learning_systems(self, 
                                     business_id: str, 
                                     integrated_context: Dict[str, Any]):
        """Update behavioral learning and context systems with new insights"""
        
        try:
            # Update behavioral patterns storage
            self._update_behavioral_patterns(business_id, integrated_context)
            
            # Update business intelligence cache
            self._update_business_intelligence(business_id, integrated_context)
            
            # Update marketing performance history
            self._update_marketing_performance(business_id, integrated_context)
            
            # Update enhanced coach learning data
            await self._update_coach_learning(business_id, integrated_context)
            
            self.logger.info(f"Updated learning systems for business {business_id}")
            
        except Exception as e:
            self.logger.error(f"Learning systems update failed: {str(e)}")
    
    async def _generate_integrated_recommendations(self, 
                                                 business_id: str,
                                                 integrated_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on integrated context"""
        
        try:
            recommendations = []
            
            business_data = integrated_context["context_data"]["business_intelligence"]
            marketing_data = integrated_context["context_data"]["marketing_performance"]
            behavioral_data = integrated_context["context_data"]["behavioral_insights"]
            
            # Business optimization recommendations
            business_recs = self._generate_business_recommendations(business_data)
            recommendations.extend(business_recs)
            
            # Marketing optimization recommendations
            marketing_recs = self._generate_marketing_recommendations(marketing_data)
            recommendations.extend(marketing_recs)
            
            # Behavioral optimization recommendations
            behavioral_recs = self._generate_behavioral_recommendations(behavioral_data)
            recommendations.extend(behavioral_recs)
            
            # Cross-functional recommendations (combining insights)
            cross_functional_recs = self._generate_cross_functional_recommendations(
                business_data, marketing_data, behavioral_data
            )
            recommendations.extend(cross_functional_recs)
            
            # Prioritize and score recommendations
            prioritized_recommendations = self._prioritize_recommendations(recommendations)
            
            return prioritized_recommendations
            
        except Exception as e:
            self.logger.error(f"Integrated recommendations generation failed: {str(e)}")
            return []
    
    # Helper methods for analysis
    
    def _analyze_customer_patterns(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze customer behavior patterns from appointment data"""
        
        customer_visits = {}
        for apt in appointments:
            customer_email = apt.get("customer", {}).get("email", "")
            if customer_email:
                if customer_email not in customer_visits:
                    customer_visits[customer_email] = {
                        "visits": 0,
                        "total_spent": 0,
                        "services": set(),
                        "first_visit": None,
                        "last_visit": None
                    }
                
                customer_data = customer_visits[customer_email]
                customer_data["visits"] += 1
                customer_data["total_spent"] += apt.get("service", {}).get("price", 0)
                customer_data["services"].add(apt.get("service", {}).get("name", ""))
                
                apt_date = apt.get("startTime", "")
                if not customer_data["first_visit"] or apt_date < customer_data["first_visit"]:
                    customer_data["first_visit"] = apt_date
                if not customer_data["last_visit"] or apt_date > customer_data["last_visit"]:
                    customer_data["last_visit"] = apt_date
        
        # Calculate metrics
        total_customers = len(customer_visits)
        returning_customers = len([c for c in customer_visits.values() if c["visits"] > 1])
        avg_visits = sum(c["visits"] for c in customer_visits.values()) / total_customers if total_customers > 0 else 0
        
        return {
            "total_customers": total_customers,
            "returning_customers": returning_customers,
            "retention_rate": (returning_customers / total_customers * 100) if total_customers > 0 else 0,
            "avg_visits": avg_visits,
            "high_value_customers": len([c for c in customer_visits.values() if c["total_spent"] > 200]),
            "customer_segments": self._segment_customers(customer_visits)
        }
    
    def _analyze_service_performance(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze service performance from appointment data"""
        
        service_stats = {}
        for apt in appointments:
            service_name = apt.get("service", {}).get("name", "Unknown")
            service_price = apt.get("service", {}).get("price", 0)
            
            if service_name not in service_stats:
                service_stats[service_name] = {
                    "bookings": 0,
                    "total_revenue": 0,
                    "avg_price": 0
                }
            
            service_stats[service_name]["bookings"] += 1
            service_stats[service_name]["total_revenue"] += service_price
            service_stats[service_name]["avg_price"] = (
                service_stats[service_name]["total_revenue"] / service_stats[service_name]["bookings"]
            )
        
        # Sort by revenue
        top_services = sorted(service_stats.items(), key=lambda x: x[1]["total_revenue"], reverse=True)
        
        return {
            "total_services": len(service_stats),
            "top_services": [
                {"name": name, **stats} for name, stats in top_services[:5]
            ],
            "service_diversity": len(service_stats),
            "revenue_concentration": self._calculate_revenue_concentration(service_stats)
        }
    
    def _analyze_revenue_trends(self, appointments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze revenue trends from appointment data"""
        
        daily_revenue = {}
        for apt in appointments:
            date = apt.get("startTime", "").split("T")[0]  # Extract date
            revenue = apt.get("service", {}).get("price", 0)
            
            if date:
                daily_revenue[date] = daily_revenue.get(date, 0) + revenue
        
        # Calculate trends
        sorted_dates = sorted(daily_revenue.keys())
        if len(sorted_dates) >= 2:
            first_week = sorted_dates[:7] if len(sorted_dates) >= 7 else sorted_dates[:len(sorted_dates)//2]
            last_week = sorted_dates[-7:] if len(sorted_dates) >= 7 else sorted_dates[len(sorted_dates)//2:]
            
            first_week_avg = sum(daily_revenue.get(date, 0) for date in first_week) / len(first_week)
            last_week_avg = sum(daily_revenue.get(date, 0) for date in last_week) / len(last_week)
            
            growth_rate = ((last_week_avg - first_week_avg) / first_week_avg * 100) if first_week_avg > 0 else 0
        else:
            growth_rate = 0
        
        return {
            "daily_revenue": daily_revenue,
            "growth_rate": growth_rate,
            "trend_direction": "up" if growth_rate > 5 else "down" if growth_rate < -5 else "stable",
            "avg_daily_revenue": sum(daily_revenue.values()) / len(daily_revenue) if daily_revenue else 0
        }
    
    def _calculate_marketing_attribution(self, 
                                       marketing_activity: Dict[str, Any],
                                       performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate how marketing activities contribute to business outcomes"""
        
        # Simplified attribution model
        attribution = {}
        
        # SMS marketing attribution
        if "sms_campaigns" in marketing_activity:
            sms_impact = marketing_activity["sms_campaigns"].get("estimated_bookings", 0)
            attribution["sms_marketing"] = {
                "bookings_attributed": sms_impact,
                "revenue_attributed": sms_impact * 35,  # Avg booking value
                "attribution_confidence": 0.85
            }
        
        # Email marketing attribution
        if "email_campaigns" in marketing_activity:
            email_impact = marketing_activity["email_campaigns"].get("estimated_bookings", 0)
            attribution["email_marketing"] = {
                "bookings_attributed": email_impact,
                "revenue_attributed": email_impact * 35,
                "attribution_confidence": 0.78
            }
        
        # Social media attribution
        if "social_campaigns" in marketing_activity:
            social_impact = marketing_activity["social_campaigns"].get("estimated_bookings", 0)
            attribution["social_media"] = {
                "bookings_attributed": social_impact,
                "revenue_attributed": social_impact * 35,
                "attribution_confidence": 0.65
            }
        
        return attribution
    
    def _analyze_channel_effectiveness(self, marketing_activity: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze effectiveness of different marketing channels"""
        
        channel_metrics = {}
        
        for channel, data in marketing_activity.items():
            if isinstance(data, dict) and "cost" in data and "revenue" in data:
                roi = ((data["revenue"] - data["cost"]) / data["cost"] * 100) if data["cost"] > 0 else 0
                channel_metrics[channel] = {
                    "roi": roi,
                    "cost_per_acquisition": data["cost"] / max(data.get("bookings", 1), 1),
                    "effectiveness_score": self._calculate_effectiveness_score(data),
                    "recommendation": self._get_channel_recommendation(roi, data)
                }
        
        return channel_metrics
    
    def _identify_behavioral_triggers(self, 
                                    customer_behaviors: Dict[str, Any],
                                    response_patterns: Dict[str, Any]) -> List[str]:
        """Identify key behavioral triggers for marketing optimization"""
        
        triggers = []
        
        # Customer behavior triggers
        if customer_behaviors.get("retention_rate", 0) < 70:
            triggers.append("low_retention_rate")
        
        if customer_behaviors.get("avg_visits", 0) < 2:
            triggers.append("low_repeat_visits")
        
        # Response pattern triggers
        if response_patterns.get("sms_response_rate", 0) > 40:
            triggers.append("high_sms_engagement")
        
        if response_patterns.get("email_open_rate", 0) < 20:
            triggers.append("low_email_engagement")
        
        return triggers
    
    def _generate_business_recommendations(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate business optimization recommendations"""
        
        recommendations = []
        metrics = business_data.get("business_metrics", {})
        
        if metrics.get("avg_service_price", 0) < 50:
            recommendations.append({
                "type": "pricing_optimization",
                "priority": "high",
                "title": "Optimize Service Pricing",
                "description": "Average service price is below market rate. Consider 10-15% price increase.",
                "estimated_impact": f"+${metrics.get('total_revenue', 0) * 0.12:.0f} monthly revenue",
                "implementation_effort": "low",
                "timeframe": "1-2 weeks"
            })
        
        if metrics.get("customer_retention_rate", 0) < 70:
            recommendations.append({
                "type": "retention_improvement",
                "priority": "high",
                "title": "Implement Customer Retention Program",
                "description": "Low retention rate indicates need for loyalty initiatives.",
                "estimated_impact": "+15-25% retention rate improvement",
                "implementation_effort": "medium",
                "timeframe": "2-4 weeks"
            })
        
        return recommendations
    
    def _generate_marketing_recommendations(self, marketing_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate marketing optimization recommendations"""
        
        recommendations = []
        
        # Analyze channel effectiveness
        channel_effectiveness = marketing_data.get("channel_effectiveness", {})
        
        for channel, metrics in channel_effectiveness.items():
            roi = metrics.get("roi", 0)
            
            if roi > 300:  # High ROI channel
                recommendations.append({
                    "type": "scale_successful_channel",
                    "priority": "high",
                    "title": f"Scale {channel.replace('_', ' ').title()} Marketing",
                    "description": f"{channel} showing {roi:.0f}% ROI. Consider increasing budget allocation.",
                    "estimated_impact": f"+{roi * 0.5:.0f}% additional ROI potential",
                    "implementation_effort": "low",
                    "timeframe": "1 week"
                })
            elif roi < 100:  # Low ROI channel
                recommendations.append({
                    "type": "optimize_underperforming_channel",
                    "priority": "medium",
                    "title": f"Optimize {channel.replace('_', ' ').title()} Strategy",
                    "description": f"{channel} showing {roi:.0f}% ROI. Needs optimization or budget reallocation.",
                    "estimated_impact": "200-300% ROI improvement potential",
                    "implementation_effort": "medium",
                    "timeframe": "2-3 weeks"
                })
        
        return recommendations
    
    def _generate_behavioral_recommendations(self, behavioral_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate behavioral optimization recommendations"""
        
        recommendations = []
        
        # Customer behavior recommendations
        customer_behaviors = behavioral_data.get("customer_behaviors", {})
        response_patterns = behavioral_data.get("response_patterns", {})
        
        # High engagement opportunity
        if response_patterns.get("sms_response_rate", 0) > 40:
            recommendations.append({
                "type": "leverage_high_engagement",
                "priority": "high",
                "title": "Leverage High SMS Engagement",
                "description": "SMS campaigns showing strong response rates. Increase frequency and personalization.",
                "estimated_impact": "+25-35% booking conversion improvement",
                "implementation_effort": "low",
                "timeframe": "1 week"
            })
        
        # Behavioral trigger optimization
        triggers = behavioral_data.get("behavioral_triggers", [])
        if "low_repeat_visits" in triggers:
            recommendations.append({
                "type": "improve_retention_behavior",
                "priority": "high",
                "title": "Implement Automated Follow-up Sequences",
                "description": "Low repeat visit behavior detected. Set up post-visit follow-up automation.",
                "estimated_impact": "+30-50% customer lifetime value increase",
                "implementation_effort": "medium",
                "timeframe": "2 weeks"
            })
        
        return recommendations
    
    def _generate_cross_functional_recommendations(self,
                                                 business_data: Dict[str, Any],
                                                 marketing_data: Dict[str, Any],
                                                 behavioral_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations that combine multiple data sources"""
        
        recommendations = []
        
        # Revenue and marketing synergy
        business_metrics = business_data.get("business_metrics", {})
        roi_analysis = marketing_data.get("roi_analysis", {})
        
        if business_metrics.get("avg_service_price", 0) > 60 and roi_analysis.get("overall_roi", 0) > 300:
            recommendations.append({
                "type": "premium_positioning_strategy",
                "priority": "high", 
                "title": "Implement Premium Positioning Strategy",
                "description": "High service prices and strong marketing ROI indicate premium market opportunity.",
                "estimated_impact": "+40-60% revenue growth potential",
                "implementation_effort": "high",
                "timeframe": "4-6 weeks",
                "cross_functional_areas": ["pricing", "marketing", "service_development"]
            })
        
        # Customer behavior and marketing alignment
        customer_segments = behavioral_data.get("customer_behaviors", {}).get("customer_segments", {})
        if customer_segments.get("high_value", 0) > customer_segments.get("total", 1) * 0.2:
            recommendations.append({
                "type": "vip_customer_program",
                "priority": "medium",
                "title": "Launch VIP Customer Program",
                "description": "High percentage of valuable customers. Create targeted VIP experience and marketing.",
                "estimated_impact": "+20-30% customer lifetime value for top tier",
                "implementation_effort": "medium",
                "timeframe": "3-4 weeks",
                "cross_functional_areas": ["customer_service", "marketing", "operations"]
            })
        
        return recommendations
    
    # Additional helper methods
    
    def _segment_customers(self, customer_visits: Dict[str, Dict[str, Any]]) -> Dict[str, int]:
        """Segment customers based on visit patterns and spending"""
        
        segments = {"vip": 0, "loyal": 0, "regular": 0, "occasional": 0, "one_time": 0}
        
        for customer_data in customer_visits.values():
            visits = customer_data["visits"]
            spent = customer_data["total_spent"]
            
            if visits >= 10 and spent >= 500:
                segments["vip"] += 1
            elif visits >= 5 and spent >= 200:
                segments["loyal"] += 1
            elif visits >= 3:
                segments["regular"] += 1
            elif visits == 2:
                segments["occasional"] += 1
            else:
                segments["one_time"] += 1
        
        segments["total"] = len(customer_visits)
        return segments
    
    def _calculate_effectiveness_score(self, channel_data: Dict[str, Any]) -> float:
        """Calculate effectiveness score for marketing channel"""
        
        roi = channel_data.get("roi", 0)
        cost_efficiency = 100 - min(channel_data.get("cost_per_acquisition", 100), 100)
        engagement = channel_data.get("engagement_rate", 0) * 100
        
        # Weighted average
        score = (roi * 0.5 + cost_efficiency * 0.3 + engagement * 0.2) / 100
        return min(max(score, 0), 1)  # Normalize to 0-1
    
    def _prioritize_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prioritize recommendations based on impact and effort"""
        
        priority_weights = {"high": 3, "medium": 2, "low": 1}
        effort_weights = {"low": 3, "medium": 2, "high": 1}
        
        for rec in recommendations:
            priority_score = priority_weights.get(rec.get("priority", "medium"), 2)
            effort_score = effort_weights.get(rec.get("implementation_effort", "medium"), 2)
            rec["priority_score"] = priority_score * effort_score
        
        return sorted(recommendations, key=lambda x: x.get("priority_score", 0), reverse=True)
    
    def _calculate_context_quality(self, integrated_context: Dict[str, Any]) -> float:
        """Calculate quality score for integrated context"""
        
        context_data = integrated_context.get("context_data", {})
        
        # Data completeness factors
        business_completeness = len(context_data.get("business_intelligence", {})) / 10  # Normalize
        marketing_completeness = len(context_data.get("marketing_performance", {})) / 8
        behavioral_completeness = len(context_data.get("behavioral_insights", {})) / 6
        
        # Average with weights
        quality_score = (
            business_completeness * 0.4 +
            marketing_completeness * 0.4 +
            behavioral_completeness * 0.2
        )
        
        return min(max(quality_score, 0), 1)
    
    # Context storage and update methods
    
    def _update_behavioral_patterns(self, business_id: str, integrated_context: Dict[str, Any]):
        """Update behavioral patterns storage"""
        
        if business_id not in self.behavioral_patterns:
            self.behavioral_patterns[business_id] = {"patterns": [], "last_updated": None}
        
        behavioral_data = integrated_context["context_data"]["behavioral_insights"]
        
        self.behavioral_patterns[business_id]["patterns"].append({
            "timestamp": datetime.now().isoformat(),
            "customer_behaviors": behavioral_data.get("customer_behaviors", {}),
            "response_patterns": behavioral_data.get("response_patterns", {}),
            "triggers": behavioral_data.get("behavioral_triggers", [])
        })
        
        # Keep only last 30 patterns
        self.behavioral_patterns[business_id]["patterns"] = \
            self.behavioral_patterns[business_id]["patterns"][-30:]
        
        self.behavioral_patterns[business_id]["last_updated"] = datetime.now().isoformat()
    
    def _update_business_intelligence(self, business_id: str, integrated_context: Dict[str, Any]):
        """Update business intelligence cache"""
        
        self.business_intelligence_cache[business_id] = {
            "last_context": integrated_context["context_data"]["business_intelligence"],
            "updated_at": datetime.now().isoformat(),
            "quality_score": integrated_context.get("confidence_score", 0)
        }
    
    def _update_marketing_performance(self, business_id: str, integrated_context: Dict[str, Any]):
        """Update marketing performance history"""
        
        if business_id not in self.marketing_performance_history:
            self.marketing_performance_history[business_id] = {"history": [], "trends": {}}
        
        marketing_data = integrated_context["context_data"]["marketing_performance"]
        
        self.marketing_performance_history[business_id]["history"].append({
            "timestamp": datetime.now().isoformat(),
            "performance_data": marketing_data,
            "roi_summary": marketing_data.get("roi_analysis", {})
        })
        
        # Keep only last 90 days of history
        cutoff_date = datetime.now() - timedelta(days=90)
        self.marketing_performance_history[business_id]["history"] = [
            h for h in self.marketing_performance_history[business_id]["history"]
            if datetime.fromisoformat(h["timestamp"]) > cutoff_date
        ]
    
    async def _update_coach_learning(self, business_id: str, integrated_context: Dict[str, Any]):
        """Update enhanced coach learning data"""
        
        try:
            # Create shop context for the enhanced coach
            business_metrics = integrated_context["context_data"]["business_intelligence"]["business_metrics"]
            
            shop_context = ShopContext(
                shop_id=business_id,
                owner_name="Business Owner",  # Would be retrieved from actual data
                shop_name="Barbershop",  # Would be retrieved from actual data
                business_stage=BusinessStage.GROWTH,  # Would be determined from metrics
                monthly_revenue=business_metrics.get("total_revenue", 0),
                monthly_appointments=business_metrics.get("total_appointments", 0),
                staff_count=1,  # Would be determined from actual data
                location_type="urban",  # Would be determined from actual data
                avg_service_price=business_metrics.get("avg_service_price", 0),
                customer_retention_rate=business_metrics.get("customer_retention_rate", 0) / 100
            )
            
            # Update coach's performance tracking with marketing results
            marketing_performance = integrated_context["context_data"]["marketing_performance"]
            roi_analysis = marketing_performance.get("roi_analysis", {})
            
            # Simulate marketing execution result for tracking
            mock_result = {
                "success": True,
                "result": {
                    "billing_info": {"actual_cost": 200},
                    "roi_metrics": {"estimated_revenue": roi_analysis.get("total_revenue", 0)}
                }
            }
            
            self.enhanced_coach._track_marketing_execution(
                business_id, "integrated_campaign", mock_result
            )
            
        except Exception as e:
            self.logger.error(f"Coach learning update failed: {str(e)}")
    
    # Additional analysis helper methods (simplified implementations)
    
    def _identify_peak_hours(self, appointments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify peak booking hours"""
        hourly_counts = {}
        for apt in appointments:
            start_time = apt.get("startTime", "")
            if "T" in start_time:
                hour = int(start_time.split("T")[1][:2])
                hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
        
        sorted_hours = sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"hour": hour, "count": count, "time_slot": f"{hour}:00-{hour+1}:00"} 
                for hour, count in sorted_hours[:3]]
    
    def _calculate_no_show_rate(self, appointments: List[Dict[str, Any]]) -> float:
        """Calculate no-show rate from appointments"""
        total_appointments = len(appointments)
        no_shows = len([apt for apt in appointments if apt.get("status") == "no_show"])
        return (no_shows / total_appointments * 100) if total_appointments > 0 else 0
    
    def _calculate_cancellation_rate(self, appointments: List[Dict[str, Any]]) -> float:
        """Calculate cancellation rate from appointments"""
        total_appointments = len(appointments)
        cancellations = len([apt for apt in appointments if apt.get("status") == "cancelled"])
        return (cancellations / total_appointments * 100) if total_appointments > 0 else 0
    
    def _calculate_revenue_concentration(self, service_stats: Dict[str, Dict[str, Any]]) -> float:
        """Calculate revenue concentration (how much top service contributes)"""
        if not service_stats:
            return 0
        
        total_revenue = sum(stats["total_revenue"] for stats in service_stats.values())
        top_service_revenue = max(stats["total_revenue"] for stats in service_stats.values())
        
        return (top_service_revenue / total_revenue * 100) if total_revenue > 0 else 0
    
    def _calculate_comprehensive_roi(self, 
                                   marketing_activity: Dict[str, Any],
                                   performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive ROI across all marketing activities"""
        
        total_cost = 0
        total_revenue = 0
        
        for channel, data in marketing_activity.items():
            if isinstance(data, dict):
                total_cost += data.get("cost", 0)
                total_revenue += data.get("revenue", 0)
        
        overall_roi = ((total_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
        
        return {
            "total_investment": total_cost,
            "total_revenue": total_revenue,
            "net_profit": total_revenue - total_cost,
            "overall_roi": overall_roi,
            "roi_category": "excellent" if overall_roi > 300 else "good" if overall_roi > 150 else "needs_improvement"
        }
    
    # Additional methods for completeness
    
    def _analyze_customer_behaviors(self, 
                                  business_context: Dict[str, Any],
                                  marketing_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer behaviors from combined data"""
        
        customer_insights = business_context.get("customer_insights", {})
        attribution = marketing_analysis.get("marketing_attribution", {})
        
        return {
            "retention_behavior": customer_insights.get("retention_rate", 0),
            "spending_behavior": customer_insights.get("avg_visits", 0),
            "response_to_marketing": sum(
                attr.get("attribution_confidence", 0) for attr in attribution.values()
            ) / len(attribution) if attribution else 0,
            "loyalty_indicators": customer_insights.get("high_value_customers", 0)
        }
    
    def _analyze_marketing_responses(self, marketing_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze marketing response patterns"""
        
        channel_effectiveness = marketing_analysis.get("channel_effectiveness", {})
        
        return {
            "sms_response_rate": 45.0,  # Would be calculated from actual data
            "email_open_rate": 22.0,    # Would be calculated from actual data
            "social_engagement_rate": 3.2,  # Would be calculated from actual data
            "best_performing_channel": max(
                channel_effectiveness.items(),
                key=lambda x: x[1].get("roi", 0),
                default=("none", {})
            )[0] if channel_effectiveness else "none"
        }
    
    def _analyze_temporal_patterns(self, 
                                 business_context: Dict[str, Any],
                                 marketing_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze temporal patterns in business and marketing data"""
        
        return {
            "peak_booking_days": ["Tuesday", "Thursday", "Saturday"],  # Would be calculated
            "seasonal_trends": "stable",  # Would be analyzed from historical data
            "marketing_timing_effectiveness": {
                "morning_campaigns": 0.85,
                "afternoon_campaigns": 0.92,
                "evening_campaigns": 0.78
            }
        }
    
    def _build_behavioral_predictions(self, 
                                    business_id: str,
                                    customer_behaviors: Dict[str, Any],
                                    response_patterns: Dict[str, Any],
                                    temporal_patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Build predictive behavioral models"""
        
        return {
            "customer_lifetime_value_prediction": customer_behaviors.get("loyalty_indicators", 0) * 150,
            "churn_risk_factors": ["low_engagement", "price_sensitivity"] if customer_behaviors.get("retention_behavior", 0) < 70 else [],
            "optimal_marketing_frequency": "bi_weekly" if response_patterns.get("sms_response_rate", 0) > 40 else "monthly",
            "growth_trajectory": "positive" if customer_behaviors.get("spending_behavior", 0) > 2 else "stable"
        }
    
    def _identify_optimization_opportunities(self, 
                                           customer_behaviors: Dict[str, Any],
                                           marketing_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify specific optimization opportunities"""
        
        opportunities = []
        
        if customer_behaviors.get("retention_behavior", 0) < 70:
            opportunities.append({
                "area": "customer_retention",
                "opportunity": "Implement post-visit follow-up automation",
                "potential_impact": "25-35% retention improvement"
            })
        
        if marketing_analysis.get("roi_analysis", {}).get("overall_roi", 0) > 300:
            opportunities.append({
                "area": "marketing_scaling",
                "opportunity": "Scale successful marketing channels",
                "potential_impact": "50-75% revenue growth"
            })
        
        return opportunities
    
    def _assess_data_completeness(self, *contexts) -> float:
        """Assess completeness of integrated data"""
        
        total_fields = 0
        complete_fields = 0
        
        for context in contexts:
            if isinstance(context, dict):
                for value in context.values():
                    total_fields += 1
                    if value and value != {} and value != []:
                        complete_fields += 1
        
        return (complete_fields / total_fields) if total_fields > 0 else 0
    
    def _calculate_confidence_factors(self, 
                                    business_context: Dict[str, Any],
                                    marketing_analysis: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence factors for different data types"""
        
        return {
            "business_data_confidence": 0.85,  # Would be calculated from data quality
            "marketing_data_confidence": 0.78,  # Would be calculated from attribution accuracy
            "behavioral_prediction_confidence": 0.72,  # Would be calculated from model accuracy
            "overall_confidence": 0.78
        }
    
    def _assess_data_freshness(self, 
                             business_context: Dict[str, Any],
                             marketing_analysis: Dict[str, Any]) -> Dict[str, str]:
        """Assess freshness of different data sources"""
        
        return {
            "business_data": "current",  # Within last 24 hours
            "marketing_data": "current",  # Real-time
            "behavioral_data": "recent",  # Within last week
            "overall_freshness": "current"
        }
    
    def _calculate_overall_confidence(self, *contexts) -> float:
        """Calculate overall confidence score for integrated context"""
        
        # Simplified confidence calculation
        data_quality = self._assess_data_completeness(*contexts)
        
        # Factors that increase confidence
        confidence_factors = [
            data_quality,  # Data completeness
            0.85,  # Integration success rate
            0.80,  # Historical accuracy
            0.78   # Prediction reliability
        ]
        
        return sum(confidence_factors) / len(confidence_factors)
    
    def _get_channel_recommendation(self, roi: float, data: Dict[str, Any]) -> str:
        """Get recommendation for marketing channel based on performance"""
        
        if roi > 300:
            return "scale_up"
        elif roi > 150:
            return "maintain"
        elif roi > 50:
            return "optimize"
        else:
            return "reconsider"

# Initialize integration service
marketing_context_integration = MarketingContextIntegration()

# Usage example
async def example_integration():
    """Example of marketing context integration"""
    
    # Sample appointment data
    appointment_data = {
        "appointments": [
            {
                "id": "apt_001",
                "customer": {"email": "john@example.com", "name": "John Doe"},
                "service": {"name": "Haircut", "price": 35, "duration": 30},
                "startTime": "2024-01-15T10:00:00Z",
                "status": "completed"
            },
            {
                "id": "apt_002", 
                "customer": {"email": "jane@example.com", "name": "Jane Smith"},
                "service": {"name": "Beard Trim", "price": 25, "duration": 20},
                "startTime": "2024-01-15T14:00:00Z",
                "status": "completed"
            }
        ]
    }
    
    # Sample marketing activity
    marketing_activity = {
        "sms_campaigns": {
            "cost": 51.00,
            "revenue": 1850.00,
            "estimated_bookings": 28,
            "response_rate": 45.2
        },
        "email_campaigns": {
            "cost": 29.00,
            "revenue": 1240.00,
            "estimated_bookings": 18,
            "open_rate": 22.8
        }
    }
    
    # Run integration
    result = await marketing_context_integration.integrate_marketing_context(
        business_id="business_001",
        appointment_data=appointment_data,
        marketing_activity=marketing_activity
    )
    
    print("Marketing Context Integration Result:")
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(example_integration())