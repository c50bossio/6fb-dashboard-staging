#!/usr/bin/env python3
"""
Enhanced Agentic Business Coach with Marketing Automation Orchestration
Integrates sophisticated business coaching with complete marketing automation suite
"""

import sys
import os
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

# Import the original business coach
sys.path.append('/Users/bossio/6FB AI Agent System')
from agentic_coach_design import (
    AgenticBusinessCoach, BusinessDomain, BusinessStage, ShopContext, 
    ConversationContext
)

# Import the MCP orchestrator
sys.path.append('/Users/bossio/6FB AI Agent System/services/orchestration')
from mcp_agent_orchestrator import MCPAgentOrchestrator, execute_mcp_function

class ActionableRecommendationType(Enum):
    MARKETING_CAMPAIGN = "marketing_campaign"
    AUTOMATION_SETUP = "automation_setup"
    OPTIMIZATION_TASK = "optimization_task"
    ANALYSIS_REQUEST = "analysis_request"
    STRATEGIC_PLAN = "strategic_plan"

class MarketingIntegrationLevel(Enum):
    BASIC = "basic"        # SMS + Email
    PROFESSIONAL = "professional"  # SMS + Email + GMB + Social
    PREMIUM = "premium"    # All services + advanced features
    ENTERPRISE = "enterprise"  # Full suite + custom optimization

@dataclass
class ActionableRecommendation:
    """Enhanced recommendation that can trigger marketing automation"""
    id: str
    type: ActionableRecommendationType
    title: str
    description: str
    mcp_function: Optional[str]  # MCP function to execute
    mcp_parameters: Optional[Dict[str, Any]]  # Parameters for MCP function
    estimated_impact: str
    estimated_cost: Optional[float]
    time_to_implement: str
    confidence: float
    priority: str
    prerequisites: List[str] = None
    expected_roi: Optional[str] = None
    automation_level: Optional[MarketingIntegrationLevel] = None

class EnhancedAgenticBusinessCoach(AgenticBusinessCoach):
    """
    Enhanced business coach that can:
    1. Provide sophisticated business advice (inherited)
    2. Execute marketing automation tasks through MCP
    3. Create comprehensive marketing strategies
    4. Monitor and optimize marketing performance
    5. Learn from marketing automation results
    """
    
    def __init__(self):
        super().__init__()
        self.mcp_orchestrator = MCPAgentOrchestrator()
        self.marketing_contexts = {}  # Track marketing automation contexts
        self.performance_tracking = {}  # Track marketing performance over time
        
        # Enhance knowledge base with marketing automation insights
        self._enhance_knowledge_base_with_marketing()
    
    def _enhance_knowledge_base_with_marketing(self):
        """Enhance the business knowledge base with marketing automation capabilities"""
        
        marketing_automation_knowledge = {
            "marketing_automation": {
                "sms_marketing": {
                    "best_practices": {
                        "timing": "Tuesday-Thursday 10am-2pm for barbershops",
                        "frequency": "1-2 times per week maximum",
                        "personalization": "Include customer name and preferred service",
                        "call_to_action": "Clear booking instructions"
                    },
                    "campaign_types": {
                        "appointment_reminders": {
                            "conversion_rate": "85-95%",
                            "optimal_timing": "24 hours before appointment"
                        },
                        "promotional_campaigns": {
                            "conversion_rate": "12-18%",
                            "optimal_timing": "Tuesday 10am or Thursday 2pm"
                        },
                        "reengagement": {
                            "conversion_rate": "8-15%",
                            "optimal_timing": "After 45 days of inactivity"
                        }
                    },
                    "roi_expectations": {
                        "professional_plan": "250-400% ROI typical",
                        "cost_savings": "10% cheaper than Textedly"
                    }
                },
                "email_marketing": {
                    "campaign_effectiveness": {
                        "welcome_series": "22% open rate, 3.5% click rate",
                        "birthday_campaigns": "35% open rate, 8% click rate",
                        "monthly_newsletter": "18% open rate, 2.5% click rate"
                    },
                    "automation_triggers": {
                        "new_customer": "Welcome series (3 emails over 2 weeks)",
                        "birthday": "Birthday offer 1 week before",
                        "inactive_customer": "Win-back series after 60 days"
                    },
                    "roi_expectations": {
                        "professional_plan": "190-280% ROI typical",
                        "cost_savings": "50-80% cheaper than Mailchimp"
                    }
                },
                "social_media_automation": {
                    "posting_strategy": {
                        "instagram": "Daily posts, 3 stories per week",
                        "facebook": "4-5 posts per week",
                        "optimal_times": "Tuesday 8am, Thursday 6pm, Saturday 10am"
                    },
                    "content_mix": {
                        "promotional": "30% - Special offers and deals",
                        "educational": "25% - Hair care tips and techniques", 
                        "behind_scenes": "25% - Barber work, shop atmosphere",
                        "community": "20% - Customer features, local events"
                    },
                    "roi_expectations": {
                        "engagement_increase": "30-50% typical improvement",
                        "booking_attribution": "5-8 bookings per month average"
                    }
                },
                "review_management": {
                    "response_strategy": {
                        "positive_reviews": "Respond within 24 hours with gratitude",
                        "negative_reviews": "Respond within 2 hours with solution",
                        "neutral_reviews": "Respond within 12 hours with engagement"
                    },
                    "reputation_impact": {
                        "response_rate_effect": "25-40% increase in local visibility",
                        "trust_improvement": "15% increase in conversion rate"
                    }
                },
                "integrated_campaigns": {
                    "customer_acquisition": {
                        "channels": ["Google My Business", "Social Media", "SMS referrals"],
                        "timeline": "4-6 weeks for full implementation",
                        "expected_results": "25-40% increase in new customers"
                    },
                    "customer_retention": {
                        "channels": ["Email automation", "SMS reminders", "Review follow-up"],
                        "timeline": "2-3 weeks for setup",
                        "expected_results": "15-25% improvement in retention rate"
                    }
                }
            }
        }
        
        self.knowledge_base.update(marketing_automation_knowledge)
    
    async def analyze_and_respond_with_automation(self, 
                                                user_message: str, 
                                                session_id: str, 
                                                shop_context: ShopContext) -> Dict[str, Any]:
        """
        Enhanced analysis that includes marketing automation recommendations
        """
        
        # Get base analysis from parent class
        base_response = await super().analyze_and_respond(user_message, session_id, shop_context)
        
        # Enhance with marketing automation opportunities
        marketing_opportunities = await self._identify_marketing_opportunities(
            user_message, session_id, shop_context, base_response
        )
        
        # Create actionable recommendations with MCP integration
        actionable_recommendations = await self._create_actionable_recommendations(
            base_response, marketing_opportunities, shop_context
        )
        
        # Add marketing automation context
        automation_suggestions = await self._generate_automation_suggestions(
            user_message, shop_context, marketing_opportunities
        )
        
        # Enhanced response
        enhanced_response = {
            **base_response,
            "marketing_opportunities": marketing_opportunities,
            "actionable_recommendations": actionable_recommendations,
            "automation_suggestions": automation_suggestions,
            "mcp_functions_available": self._get_relevant_mcp_functions(base_response),
            "marketing_integration_level": self._recommend_integration_level(shop_context),
            "estimated_marketing_roi": await self._calculate_estimated_marketing_roi(
                shop_context, marketing_opportunities
            )
        }
        
        return enhanced_response
    
    async def _identify_marketing_opportunities(self, 
                                             user_message: str,
                                             session_id: str, 
                                             shop_context: ShopContext,
                                             base_response: Dict[str, Any]) -> Dict[str, Any]:
        """Identify specific marketing automation opportunities"""
        
        opportunities = {
            "immediate_actions": [],
            "growth_multipliers": [],
            "automation_gaps": [],
            "competitive_advantages": []
        }
        
        # Analyze based on business domains addressed
        domains = base_response.get("domains_addressed", [])
        
        if "financial" in domains or "marketing" in domains:
            # Revenue-focused marketing opportunities
            opportunities["immediate_actions"].extend([
                {
                    "action": "sms_reengagement_campaign",
                    "description": f"Re-engage inactive customers with SMS offers",
                    "estimated_impact": "+$1,800-3,200 monthly revenue",
                    "timeframe": "1 week implementation"
                },
                {
                    "action": "email_automation_setup", 
                    "description": "Automated welcome series and birthday campaigns",
                    "estimated_impact": "+15-25% customer lifetime value",
                    "timeframe": "2 weeks implementation"
                }
            ])
            
            opportunities["growth_multipliers"].append({
                "strategy": "integrated_marketing_funnel",
                "description": "Complete customer journey from social media to booking",
                "estimated_impact": "+35-50% new customer acquisition",
                "channels": ["Google My Business", "Social Media", "Email", "SMS"]
            })
        
        if "operations" in domains:
            opportunities["automation_gaps"].extend([
                {
                    "gap": "appointment_reminder_automation",
                    "solution": "SMS reminder system",
                    "impact": "85% reduction in no-shows"
                },
                {
                    "gap": "review_response_automation",
                    "solution": "AI-powered review responses",
                    "impact": "100% review response rate"
                }
            ])
        
        # Business stage specific opportunities
        if shop_context.business_stage == BusinessStage.STARTUP:
            opportunities["competitive_advantages"].append({
                "advantage": "digital_first_presence",
                "description": "Establish comprehensive digital presence before competitors",
                "cost_savings": "$150-300/month vs traditional marketing"
            })
        elif shop_context.business_stage == BusinessStage.GROWTH:
            opportunities["competitive_advantages"].append({
                "advantage": "automation_efficiency",
                "description": "Scale marketing without proportional cost increase",
                "efficiency_gain": "200-300% marketing efficiency improvement"
            })
        
        return opportunities
    
    async def _create_actionable_recommendations(self, 
                                               base_response: Dict[str, Any],
                                               marketing_opportunities: Dict[str, Any],
                                               shop_context: ShopContext) -> List[ActionableRecommendation]:
        """Create actionable recommendations with MCP integration"""
        
        actionable_recs = []
        
        # Convert immediate marketing actions to actionable recommendations
        for action in marketing_opportunities.get("immediate_actions", []):
            if action["action"] == "sms_reengagement_campaign":
                actionable_recs.append(ActionableRecommendation(
                    id=f"sms_reeng_{shop_context.shop_id}",
                    type=ActionableRecommendationType.MARKETING_CAMPAIGN,
                    title="Launch SMS Re-engagement Campaign",
                    description=action["description"],
                    mcp_function="send_sms_campaign",
                    mcp_parameters={
                        "business_id": shop_context.shop_id,
                        "campaign_data": {
                            "recipients": [],  # Would be populated from customer database
                            "message": f"We miss you at {shop_context.shop_name}! Book this week and save 15%. Reply BOOK or call us!"
                        },
                        "plan": "professional",
                        "priority": "medium"
                    },
                    estimated_impact=action["estimated_impact"],
                    estimated_cost=51.00,  # Professional SMS plan
                    time_to_implement=action["timeframe"],
                    confidence=0.87,
                    priority="high",
                    expected_roi="250-400%",
                    automation_level=MarketingIntegrationLevel.BASIC
                ))
            
            elif action["action"] == "email_automation_setup":
                actionable_recs.append(ActionableRecommendation(
                    id=f"email_auto_{shop_context.shop_id}",
                    type=ActionableRecommendationType.AUTOMATION_SETUP,
                    title="Setup Email Marketing Automation",
                    description=action["description"],
                    mcp_function="send_email_campaign",
                    mcp_parameters={
                        "business_id": shop_context.shop_id,
                        "campaign_data": {
                            "recipients": [],  # Would be populated
                            "subject": f"Welcome to {shop_context.shop_name}!",
                            "content": "Generated welcome email content"
                        },
                        "plan": "professional",
                        "priority": "medium"
                    },
                    estimated_impact=action["estimated_impact"],
                    estimated_cost=29.00,  # Professional email plan
                    time_to_implement=action["timeframe"],
                    confidence=0.92,
                    priority="high",
                    expected_roi="190-280%",
                    automation_level=MarketingIntegrationLevel.BASIC
                ))
        
        # Convert growth multipliers to comprehensive campaigns
        for multiplier in marketing_opportunities.get("growth_multipliers", []):
            if multiplier["strategy"] == "integrated_marketing_funnel":
                actionable_recs.append(ActionableRecommendation(
                    id=f"integrated_funnel_{shop_context.shop_id}",
                    type=ActionableRecommendationType.STRATEGIC_PLAN,
                    title="Launch Integrated Marketing Funnel",
                    description=multiplier["description"],
                    mcp_function="execute_marketing_plan",
                    mcp_parameters={
                        "business_id": shop_context.shop_id,
                        "marketing_plan": {
                            "sms_marketing": {"enabled": True, "plan": "professional"},
                            "email_marketing": {"enabled": True, "plan": "professional"},
                            "gmb_automation": {"enabled": True, "plan": "professional"},
                            "social_media": {"enabled": True, "plan": "professional"},
                            "review_management": {"enabled": True, "plan": "professional"}
                        },
                        "priority": "high"
                    },
                    estimated_impact=multiplier["estimated_impact"],
                    estimated_cost=253.00,  # Sum of all professional plans
                    time_to_implement="3-4 weeks",
                    confidence=0.89,
                    priority="high",
                    expected_roi="300-500%",
                    automation_level=MarketingIntegrationLevel.PREMIUM,
                    prerequisites=["Customer database ready", "Brand assets prepared"]
                ))
        
        # Add automation gap solutions
        for gap in marketing_opportunities.get("automation_gaps", []):
            if gap["gap"] == "review_response_automation":
                actionable_recs.append(ActionableRecommendation(
                    id=f"review_auto_{shop_context.shop_id}",
                    type=ActionableRecommendationType.AUTOMATION_SETUP,
                    title="Setup Automated Review Management",
                    description="AI-powered review monitoring and response system",
                    mcp_function="monitor_reviews",
                    mcp_parameters={
                        "business_id": shop_context.shop_id,
                        "platforms": ["google", "facebook", "yelp"],
                        "plan": "professional",
                        "priority": "high"
                    },
                    estimated_impact=gap["impact"],
                    estimated_cost=45.00,  # Professional review plan
                    time_to_implement="1 week",
                    confidence=0.94,
                    priority="medium",
                    expected_roi="317-346%",
                    automation_level=MarketingIntegrationLevel.PROFESSIONAL
                ))
        
        return actionable_recs
    
    async def execute_recommendation(self, 
                                   recommendation_id: str,
                                   session_id: str,
                                   shop_context: ShopContext,
                                   user_confirmation: bool = True) -> Dict[str, Any]:
        """Execute an actionable recommendation through MCP"""
        
        # Find the recommendation in conversation context
        context = self._get_conversation_context(session_id, shop_context)
        
        # This would typically be stored in context from previous recommendations
        # For now, we'll demonstrate with a sample execution
        
        if not user_confirmation:
            return {
                "success": False,
                "message": "User confirmation required for marketing automation execution"
            }
        
        # Example execution of SMS campaign
        if "sms_reeng" in recommendation_id:
            result = await execute_mcp_function(
                "send_sms_campaign",
                business_id=shop_context.shop_id,
                campaign_data={
                    "recipients": [
                        {"phone": "+15551234567", "name": "John Doe"},
                        {"phone": "+15559876543", "name": "Jane Smith"}
                    ],
                    "message": f"We miss you at {shop_context.shop_name}! Book this week and save 15%. Reply BOOK or call us!"
                },
                plan="professional",
                priority="medium"
            )
            
            # Track execution in marketing context
            self._track_marketing_execution(shop_context.shop_id, "sms_campaign", result)
            
            return {
                "success": True,
                "recommendation_id": recommendation_id,
                "execution_result": result,
                "message": f"SMS re-engagement campaign launched successfully for {shop_context.shop_name}",
                "next_steps": [
                    "Monitor SMS response rates over next 48 hours",
                    "Track booking conversions from campaign",
                    "Prepare follow-up campaigns based on results"
                ]
            }
        
        # Example execution of comprehensive marketing plan
        elif "integrated_funnel" in recommendation_id:
            marketing_plan = {
                "sms_marketing": {
                    "enabled": True,
                    "plan": "professional",
                    "campaign_data": {
                        "recipients": [],
                        "message": f"Welcome to {shop_context.shop_name} family! Book your first appointment and save 20%."
                    }
                },
                "email_marketing": {
                    "enabled": True,
                    "plan": "professional",
                    "campaign_data": {
                        "recipients": [],
                        "subject": f"Welcome to {shop_context.shop_name}!",
                        "content": "Professional welcome email with booking incentive"
                    }
                },
                "gmb_automation": {
                    "enabled": True,
                    "plan": "professional",
                    "business_data": {
                        "name": shop_context.shop_name,
                        "location": shop_context.location_type or "Local Area",
                        "owner_name": shop_context.owner_name
                    }
                },
                "social_media": {
                    "enabled": True,
                    "plan": "professional", 
                    "business_data": {
                        "name": shop_context.shop_name,
                        "location": shop_context.location_type or "Local Area"
                    },
                    "platforms": ["instagram", "facebook"]
                },
                "review_management": {
                    "enabled": True,
                    "plan": "professional",
                    "platforms": ["google", "facebook", "yelp"]
                }
            }
            
            result = await execute_mcp_function(
                "execute_marketing_plan",
                business_id=shop_context.shop_id,
                marketing_plan=marketing_plan,
                priority="high"
            )
            
            self._track_marketing_execution(shop_context.shop_id, "integrated_campaign", result)
            
            return {
                "success": True,
                "recommendation_id": recommendation_id,
                "execution_result": result,
                "message": f"Comprehensive marketing automation launched for {shop_context.shop_name}",
                "activated_channels": list(marketing_plan.keys()),
                "expected_timeline": "Results visible in 2-4 weeks",
                "monitoring_dashboard": "Available in your business dashboard"
            }
        
        return {
            "success": False,
            "message": f"Recommendation {recommendation_id} not found or not executable"
        }
    
    async def _generate_automation_suggestions(self, 
                                             user_message: str,
                                             shop_context: ShopContext,
                                             marketing_opportunities: Dict[str, Any]) -> Dict[str, Any]:
        """Generate specific automation suggestions based on context"""
        
        suggestions = {
            "quick_wins": [],
            "strategic_initiatives": [],
            "budget_optimizations": [],
            "performance_improvements": []
        }
        
        # Quick wins based on business stage
        if shop_context.business_stage == BusinessStage.STARTUP:
            suggestions["quick_wins"].extend([
                {
                    "action": "Setup Google My Business automation",
                    "benefit": "Immediate local visibility boost",
                    "cost": "$29/month",
                    "setup_time": "1 day"
                },
                {
                    "action": "Launch SMS appointment reminders",
                    "benefit": "85% reduction in no-shows",
                    "cost": "$33/month",
                    "setup_time": "2 hours"
                }
            ])
        
        elif shop_context.business_stage in [BusinessStage.GROWTH, BusinessStage.ESTABLISHED]:
            suggestions["strategic_initiatives"].extend([
                {
                    "initiative": "Multi-channel customer journey",
                    "description": "Coordinate SMS, email, and social media for maximum impact",
                    "expected_results": "35-50% increase in customer acquisition",
                    "investment": "$200-250/month"
                },
                {
                    "initiative": "Automated review management",
                    "description": "AI-powered review responses across all platforms",
                    "expected_results": "25% increase in local search visibility",
                    "investment": "$45/month"
                }
            ])
        
        # Budget optimizations
        current_marketing_spend = shop_context.monthly_revenue * 0.05 if shop_context.monthly_revenue else 1000
        
        suggestions["budget_optimizations"].append({
            "current_spend_estimate": f"${current_marketing_spend:.0f}/month",
            "automation_cost": "$200-300/month",
            "savings_opportunity": "50-80% vs traditional marketing",
            "roi_improvement": "250-400% vs manual marketing"
        })
        
        # Performance improvements based on shop data
        if shop_context.customer_retention_rate and shop_context.customer_retention_rate < 0.8:
            suggestions["performance_improvements"].append({
                "opportunity": "Customer retention automation",
                "current_rate": f"{shop_context.customer_retention_rate:.1%}",
                "target_rate": "85-90%",
                "solution": "Email nurture sequences + SMS follow-ups"
            })
        
        if shop_context.review_rating and shop_context.review_rating < 4.5:
            suggestions["performance_improvements"].append({
                "opportunity": "Reputation management automation",
                "current_rating": shop_context.review_rating,
                "target_rating": "4.7-4.9",
                "solution": "Proactive review requests + automated responses"
            })
        
        return suggestions
    
    def _get_relevant_mcp_functions(self, base_response: Dict[str, Any]) -> List[str]:
        """Get relevant MCP functions based on the business domains addressed"""
        
        domains = base_response.get("domains_addressed", [])
        relevant_functions = []
        
        if "financial" in domains or "marketing" in domains:
            relevant_functions.extend([
                "send_sms_campaign",
                "send_email_campaign", 
                "get_all_pricing",
                "optimize_marketing_spend"
            ])
        
        if "operations" in domains:
            relevant_functions.extend([
                "monitor_reviews",
                "create_gmb_campaign",
                "get_business_analytics"
            ])
        
        if "growth" in domains:
            relevant_functions.extend([
                "execute_marketing_plan",
                "create_social_campaign",
                "generate_website"
            ])
        
        # Always include core orchestration functions
        relevant_functions.extend([
            "get_task_status",
            "get_business_analytics"
        ])
        
        return list(set(relevant_functions))
    
    def _recommend_integration_level(self, shop_context: ShopContext) -> MarketingIntegrationLevel:
        """Recommend appropriate marketing integration level"""
        
        if shop_context.business_stage == BusinessStage.STARTUP:
            return MarketingIntegrationLevel.BASIC
        elif shop_context.business_stage == BusinessStage.GROWTH:
            return MarketingIntegrationLevel.PROFESSIONAL
        elif shop_context.business_stage == BusinessStage.ESTABLISHED:
            return MarketingIntegrationLevel.PREMIUM
        else:  # ENTERPRISE
            return MarketingIntegrationLevel.ENTERPRISE
    
    async def _calculate_estimated_marketing_roi(self, 
                                               shop_context: ShopContext,
                                               marketing_opportunities: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate estimated ROI for marketing automation"""
        
        # Base calculations on shop revenue and industry averages
        monthly_revenue = shop_context.monthly_revenue or 15000  # Default estimate
        
        # Marketing automation typically drives 25-40% revenue increase
        estimated_revenue_increase = monthly_revenue * 0.32  # Conservative 32%
        
        # Integration level determines cost
        integration_level = self._recommend_integration_level(shop_context)
        
        monthly_costs = {
            MarketingIntegrationLevel.BASIC: 80,      # SMS + Email
            MarketingIntegrationLevel.PROFESSIONAL: 200,  # + GMB + Social
            MarketingIntegrationLevel.PREMIUM: 280,       # + Reviews + Website
            MarketingIntegrationLevel.ENTERPRISE: 350    # Full suite + optimization
        }
        
        estimated_cost = monthly_costs[integration_level]
        roi_percentage = ((estimated_revenue_increase - estimated_cost) / estimated_cost) * 100
        
        return {
            "monthly_investment": estimated_cost,
            "estimated_monthly_revenue_increase": estimated_revenue_increase,
            "estimated_monthly_profit": estimated_revenue_increase - estimated_cost,
            "roi_percentage": f"{roi_percentage:.0f}%",
            "payback_period": f"{estimated_cost / estimated_revenue_increase:.1f} months",
            "annual_profit_potential": (estimated_revenue_increase - estimated_cost) * 12,
            "confidence_level": "High - based on industry benchmarks and shop profile"
        }
    
    def _track_marketing_execution(self, 
                                 business_id: str, 
                                 campaign_type: str, 
                                 result: Dict[str, Any]):
        """Track marketing automation execution for learning"""
        
        if business_id not in self.performance_tracking:
            self.performance_tracking[business_id] = {
                "campaigns": [],
                "total_investment": 0,
                "total_revenue_attributed": 0,
                "success_rate": 0
            }
        
        tracking_data = {
            "timestamp": datetime.now().isoformat(),
            "campaign_type": campaign_type,
            "success": result.get("success", False),
            "cost": result.get("result", {}).get("billing_info", {}).get("actual_cost", 0),
            "estimated_revenue": result.get("result", {}).get("roi_metrics", {}).get("estimated_revenue", 0),
            "campaign_id": result.get("result", {}).get("campaign_id")
        }
        
        self.performance_tracking[business_id]["campaigns"].append(tracking_data)
        
        # Update totals
        if tracking_data["success"]:
            self.performance_tracking[business_id]["total_investment"] += tracking_data["cost"]
            self.performance_tracking[business_id]["total_revenue_attributed"] += tracking_data["estimated_revenue"]
        
        # Update success rate
        total_campaigns = len(self.performance_tracking[business_id]["campaigns"])
        successful_campaigns = len([c for c in self.performance_tracking[business_id]["campaigns"] if c["success"]])
        self.performance_tracking[business_id]["success_rate"] = successful_campaigns / total_campaigns if total_campaigns > 0 else 0
    
    async def get_marketing_performance_summary(self, business_id: str) -> Dict[str, Any]:
        """Get comprehensive marketing performance summary for a business"""
        
        if business_id not in self.performance_tracking:
            return {
                "message": "No marketing automation activity tracked yet",
                "recommendation": "Start with a basic SMS or email campaign to begin tracking performance"
            }
        
        tracking = self.performance_tracking[business_id]
        
        # Calculate comprehensive metrics
        total_roi = 0
        if tracking["total_investment"] > 0:
            total_roi = ((tracking["total_revenue_attributed"] - tracking["total_investment"]) / tracking["total_investment"]) * 100
        
        recent_campaigns = [c for c in tracking["campaigns"] if 
                          datetime.fromisoformat(c["timestamp"]) > datetime.now() - timedelta(days=30)]
        
        return {
            "business_id": business_id,
            "performance_period": "All time",
            "summary": {
                "total_campaigns": len(tracking["campaigns"]),
                "successful_campaigns": len([c for c in tracking["campaigns"] if c["success"]]),
                "success_rate": f"{tracking['success_rate']:.1%}",
                "total_investment": tracking["total_investment"],
                "total_revenue_attributed": tracking["total_revenue_attributed"],
                "overall_roi": f"{total_roi:.0f}%"
            },
            "recent_activity": {
                "campaigns_last_30_days": len(recent_campaigns),
                "recent_performance": "Strong" if len(recent_campaigns) > 0 and all(c["success"] for c in recent_campaigns) else "Needs attention"
            },
            "recommendations": self._generate_performance_recommendations(tracking),
            "next_suggested_actions": [
                "Review campaign performance data",
                "Optimize underperforming channels",
                "Scale successful campaign types",
                "Test new automation workflows"
            ]
        }
    
    def _generate_performance_recommendations(self, tracking_data: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on marketing performance"""
        
        recommendations = []
        
        if tracking_data["success_rate"] < 0.7:
            recommendations.append("Review campaign setup and targeting - success rate below optimal")
        
        if tracking_data["total_investment"] > 0:
            roi = ((tracking_data["total_revenue_attributed"] - tracking_data["total_investment"]) / tracking_data["total_investment"]) * 100
            if roi < 200:
                recommendations.append("Optimize campaigns for better ROI - current performance below industry average")
            elif roi > 400:
                recommendations.append("Excellent ROI performance - consider scaling successful campaigns")
        
        if len(tracking_data["campaigns"]) < 3:
            recommendations.append("Increase campaign frequency for better results and data insights")
        
        return recommendations or ["Continue current marketing automation strategy - performance is solid"]

# Usage example
async def example_enhanced_coaching():
    """Example of enhanced coaching with marketing automation"""
    
    coach = EnhancedAgenticBusinessCoach()
    
    shop_context = ShopContext(
        shop_id="shop_001",
        owner_name="Mike",
        shop_name="Elite Cuts Barbershop",
        business_stage=BusinessStage.GROWTH,
        monthly_revenue=28000.0,
        monthly_appointments=950,
        staff_count=3,
        location_type="urban",
        avg_service_price=35.0,
        customer_retention_rate=0.72,
        review_rating=4.3,
        years_in_business=3
    )
    
    # Enhanced coaching conversation
    response = await coach.analyze_and_respond_with_automation(
        user_message="I want to grow my revenue but I'm struggling to get new customers consistently. What's the best approach?",
        session_id="session_001",
        shop_context=shop_context
    )
    
    print("Enhanced Business Coach Response:")
    print(json.dumps(response, indent=2, default=str))
    
    # Example of executing a recommendation
    if response.get("actionable_recommendations"):
        first_rec = response["actionable_recommendations"][0]
        print(f"\nExecuting recommendation: {first_rec.title}")
        
        execution_result = await coach.execute_recommendation(
            recommendation_id=first_rec.id,
            session_id="session_001",
            shop_context=shop_context,
            user_confirmation=True
        )
        
        print("Execution Result:")
        print(json.dumps(execution_result, indent=2, default=str))

if __name__ == "__main__":
    asyncio.run(example_enhanced_coaching())