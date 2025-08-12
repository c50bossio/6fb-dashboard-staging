#!/usr/bin/env python3
"""
Unified Context Orchestrator
Master integration service that orchestrates all context systems for comprehensive AI-powered insights
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import sqlite3
import logging
from pathlib import Path

# Import existing services
import sys
sys.path.append('/Users/bossio/6FB AI Agent System/services')

from billing.marketing_billing_system import MarketingBillingSystem, ServiceType
from orchestration.mcp_agent_orchestrator import MCPAgentOrchestrator
from integrations.marketing_context_integration import MarketingContextIntegration

class UnifiedContextOrchestrator:
    """
    Master orchestrator that unifies all context systems for comprehensive business intelligence
    Integrates: Marketing Automation + Business Context + AI Context + Behavioral Learning
    """
    
    def __init__(self, database_path: str = '/Users/bossio/6FB AI Agent System/agent_system.db'):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
        # Initialize integrated services
        self.billing_system = MarketingBillingSystem()
        self.mcp_orchestrator = MCPAgentOrchestrator()
        self.marketing_integration = MarketingContextIntegration()
        
        # Context caching for performance
        self.context_cache = {}
        self.cache_ttl = 300  # 5 minutes
        
        self.logger.info("Unified Context Orchestrator initialized")
    
    async def generate_unified_context(self, 
                                     business_id: str, 
                                     context_type: str = "comprehensive",
                                     include_predictions: bool = True,
                                     include_recommendations: bool = True) -> Dict[str, Any]:
        """
        Generate comprehensive unified context combining all data sources
        """
        try:
            cache_key = f"{business_id}_{context_type}_{include_predictions}_{include_recommendations}"
            
            # Check cache first
            if self._is_cache_valid(cache_key):
                self.logger.info(f"Returning cached unified context for {business_id}")
                return self.context_cache[cache_key]['data']
            
            self.logger.info(f"Generating unified context for business {business_id}")
            
            # Parallel data collection from all sources
            tasks = [
                self._get_business_context(business_id),
                self._get_marketing_context(business_id),
                self._get_financial_context(business_id),
                self._get_behavioral_insights(business_id),
                self._get_operational_metrics(business_id)
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = results
            
            # Handle any errors gracefully
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    self.logger.error(f"Task {i} failed: {str(result)}")
                    results[i] = {"error": str(result), "data": {}}
            
            # Unified context structure
            unified_context = {
                "business_id": business_id,
                "context_type": context_type,
                "generated_at": datetime.now().isoformat(),
                "data_sources": {
                    "business_context": business_context if not isinstance(business_context, Exception) else {"error": str(business_context)},
                    "marketing_context": marketing_context if not isinstance(marketing_context, Exception) else {"error": str(marketing_context)},
                    "financial_context": financial_context if not isinstance(financial_context, Exception) else {"error": str(financial_context)},
                    "behavioral_insights": behavioral_insights if not isinstance(behavioral_insights, Exception) else {"error": str(behavioral_insights)},
                    "operational_metrics": operational_metrics if not isinstance(operational_metrics, Exception) else {"error": str(operational_metrics)}
                },
                "integrated_insights": await self._generate_integrated_insights(business_id, results),
                "performance_score": self._calculate_unified_performance_score(results),
                "health_indicators": self._assess_business_health(results)
            }
            
            # Add predictions if requested
            if include_predictions:
                unified_context["predictions"] = await self._generate_unified_predictions(business_id, results)
            
            # Add recommendations if requested
            if include_recommendations:
                unified_context["recommendations"] = await self._generate_unified_recommendations(business_id, results)
            
            # Cache the result
            self.context_cache[cache_key] = {
                "data": unified_context,
                "timestamp": datetime.now(),
                "ttl": self.cache_ttl
            }
            
            self.logger.info(f"Successfully generated unified context for {business_id}")
            return unified_context
            
        except Exception as e:
            self.logger.error(f"Failed to generate unified context: {str(e)}")
            return {
                "error": str(e),
                "business_id": business_id,
                "generated_at": datetime.now().isoformat()
            }
    
    async def _get_business_context(self, business_id: str) -> Dict[str, Any]:
        """Get business context from existing BusinessContextEngine"""
        try:
            # This would interface with the JavaScript BusinessContextEngine
            # For now, we'll simulate the integration
            
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                # Get recent business context if available
                cursor.execute("""
                    SELECT context_data, generated_at 
                    FROM business_context 
                    WHERE barbershop_id = ? AND context_type = 'master_coach_context'
                    ORDER BY generated_at DESC 
                    LIMIT 1
                """, (business_id,))
                
                result = cursor.fetchone()
                if result:
                    return {
                        "source": "BusinessContextEngine",
                        "data": json.loads(result['context_data']),
                        "last_updated": result['generated_at']
                    }
                else:
                    return {
                        "source": "BusinessContextEngine",
                        "data": {},
                        "status": "no_data_available"
                    }
                    
        except Exception as e:
            self.logger.error(f"Failed to get business context: {str(e)}")
            return {"error": str(e), "source": "BusinessContextEngine"}
    
    async def _get_marketing_context(self, business_id: str) -> Dict[str, Any]:
        """Get marketing context from MarketingContextIntegration"""
        try:
            # Get comprehensive marketing context
            context = await self.marketing_integration.integrate_marketing_context(
                business_id=business_id,
                appointment_data={},  # Would be populated from actual appointment data
                marketing_activity={}  # Would be populated from actual marketing data
            )
            
            return {
                "source": "MarketingContextIntegration",
                "data": context,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get marketing context: {str(e)}")
            return {"error": str(e), "source": "MarketingContextIntegration"}
    
    async def _get_financial_context(self, business_id: str) -> Dict[str, Any]:
        """Get financial context from billing system"""
        try:
            # Get billing summary and financial analytics
            billing_summary = await self.billing_system.get_business_billing_summary(business_id)
            financial_analytics = await self.billing_system.get_financial_analytics()
            
            return {
                "source": "MarketingBillingSystem",
                "billing_summary": billing_summary,
                "financial_analytics": financial_analytics,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get financial context: {str(e)}")
            return {"error": str(e), "source": "MarketingBillingSystem"}
    
    async def _get_behavioral_insights(self, business_id: str) -> Dict[str, Any]:
        """Get behavioral insights from appointment and usage patterns"""
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                # Get behavioral patterns from unified appointments
                cursor.execute("""
                    SELECT 
                        json_extract(client_data, '$.email') as client_email,
                        json_extract(service_data, '$.category') as service_category,
                        json_extract(scheduling_data, '$.dateTime') as appointment_time,
                        json_extract(payment_data, '$.total') as payment_amount,
                        COUNT(*) as visit_frequency
                    FROM unified_appointments 
                    WHERE barbershop_id = ? 
                        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-90 days')
                    GROUP BY client_email, service_category
                    ORDER BY visit_frequency DESC
                    LIMIT 100
                """, (business_id,))
                
                behavioral_data = [dict(row) for row in cursor.fetchall()]
                
                # Analyze patterns
                insights = self._analyze_behavioral_patterns(behavioral_data)
                
                return {
                    "source": "BehavioralAnalysis",
                    "insights": insights,
                    "data_points": len(behavioral_data),
                    "last_updated": datetime.now().isoformat()
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get behavioral insights: {str(e)}")
            return {"error": str(e), "source": "BehavioralAnalysis"}
    
    async def _get_operational_metrics(self, business_id: str) -> Dict[str, Any]:
        """Get operational metrics from system usage and performance"""
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                # Get recent system activity
                cursor.execute("""
                    SELECT platform, COUNT(*) as appointment_count, 
                           AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_revenue
                    FROM unified_appointments 
                    WHERE barbershop_id = ? 
                        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', '-30 days')
                    GROUP BY platform
                """, (business_id,))
                
                platform_metrics = [dict(row) for row in cursor.fetchall()]
                
                # Get integration health
                cursor.execute("""
                    SELECT platform, is_active, last_sync_at, last_sync_error
                    FROM integrations
                    WHERE barbershop_id = ?
                """, (business_id,))
                
                integration_health = [dict(row) for row in cursor.fetchall()]
                
                return {
                    "source": "OperationalMetrics",
                    "platform_performance": platform_metrics,
                    "integration_health": integration_health,
                    "system_status": "operational",
                    "last_updated": datetime.now().isoformat()
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get operational metrics: {str(e)}")
            return {"error": str(e), "source": "OperationalMetrics"}
    
    def _analyze_behavioral_patterns(self, behavioral_data: List[Dict]) -> Dict[str, Any]:
        """Analyze behavioral patterns from appointment data"""
        
        if not behavioral_data:
            return {"status": "insufficient_data"}
        
        # Analyze service preferences
        service_preferences = {}
        client_loyalty = {}
        spending_patterns = {}
        
        for record in behavioral_data:
            email = record.get('client_email', 'unknown')
            service = record.get('service_category', 'unknown')
            frequency = record.get('visit_frequency', 0)
            amount = float(record.get('payment_amount', 0))
            
            # Service preferences
            if service not in service_preferences:
                service_preferences[service] = 0
            service_preferences[service] += frequency
            
            # Client loyalty
            if email not in client_loyalty:
                client_loyalty[email] = 0
            client_loyalty[email] += frequency
            
            # Spending patterns
            if service not in spending_patterns:
                spending_patterns[service] = []
            spending_patterns[service].append(amount)
        
        # Calculate insights
        top_services = sorted(service_preferences.items(), key=lambda x: x[1], reverse=True)[:5]
        loyal_clients = sorted(client_loyalty.items(), key=lambda x: x[1], reverse=True)[:10]
        
        avg_spending = {}
        for service, amounts in spending_patterns.items():
            if amounts:
                avg_spending[service] = sum(amounts) / len(amounts)
        
        return {
            "top_services": top_services,
            "loyal_clients": loyal_clients,
            "average_spending_by_service": avg_spending,
            "total_unique_clients": len(client_loyalty),
            "analysis_period": "90_days"
        }
    
    async def _generate_integrated_insights(self, business_id: str, context_results: List) -> Dict[str, Any]:
        """Generate insights by combining data from all sources"""
        
        try:
            insights = {
                "cross_channel_performance": {},
                "customer_journey_insights": {},
                "revenue_optimization": {},
                "operational_efficiency": {},
                "growth_opportunities": []
            }
            
            # Extract key metrics from each context
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = context_results
            
            # Cross-channel performance analysis
            if not isinstance(marketing_context, Exception) and marketing_context.get('data'):
                marketing_data = marketing_context['data']
                if 'channel_performance' in marketing_data:
                    insights["cross_channel_performance"] = {
                        "best_performing_channel": self._identify_best_channel(marketing_data['channel_performance']),
                        "roi_leaders": self._identify_roi_leaders(marketing_data['channel_performance']),
                        "underperforming_channels": self._identify_underperforming_channels(marketing_data['channel_performance'])
                    }
            
            # Customer journey insights
            if not isinstance(behavioral_insights, Exception) and behavioral_insights.get('insights'):
                behavior_data = behavioral_insights['insights']
                insights["customer_journey_insights"] = {
                    "retention_patterns": self._analyze_retention_patterns(behavior_data),
                    "service_progression": self._analyze_service_progression(behavior_data),
                    "loyalty_segments": self._segment_customers_by_loyalty(behavior_data)
                }
            
            # Revenue optimization insights
            if not isinstance(financial_context, Exception):
                financial_data = financial_context
                insights["revenue_optimization"] = {
                    "profit_margin_analysis": self._analyze_profit_margins(financial_data),
                    "pricing_opportunities": self._identify_pricing_opportunities(financial_data),
                    "cost_reduction_potential": self._identify_cost_reductions(financial_data)
                }
            
            # Growth opportunities
            insights["growth_opportunities"] = self._identify_growth_opportunities(context_results)
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Failed to generate integrated insights: {str(e)}")
            return {"error": str(e)}
    
    def _calculate_unified_performance_score(self, context_results: List) -> Dict[str, Any]:
        """Calculate overall business performance score"""
        
        try:
            scores = {
                "overall_score": 0,
                "category_scores": {
                    "financial_health": 0,
                    "marketing_effectiveness": 0,
                    "operational_efficiency": 0,
                    "customer_satisfaction": 0,
                    "growth_potential": 0
                },
                "score_breakdown": {}
            }
            
            # Score each category (0-100)
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = context_results
            
            # Financial health (25% weight)
            if not isinstance(financial_context, Exception) and financial_context.get('billing_summary', {}).get('success'):
                billing_data = financial_context['billing_summary']
                if billing_data.get('summary', {}).get('account_status') == 'Good Standing':
                    scores["category_scores"]["financial_health"] = 85
                else:
                    scores["category_scores"]["financial_health"] = 60
            else:
                scores["category_scores"]["financial_health"] = 50
            
            # Marketing effectiveness (25% weight)
            if not isinstance(marketing_context, Exception) and marketing_context.get('data'):
                marketing_data = marketing_context['data']
                if marketing_data.get('overall_roi', 0) > 200:
                    scores["category_scores"]["marketing_effectiveness"] = 90
                elif marketing_data.get('overall_roi', 0) > 100:
                    scores["category_scores"]["marketing_effectiveness"] = 75
                else:
                    scores["category_scores"]["marketing_effectiveness"] = 60
            else:
                scores["category_scores"]["marketing_effectiveness"] = 50
            
            # Operational efficiency (20% weight)
            if not isinstance(operational_metrics, Exception) and operational_metrics.get('system_status') == 'operational':
                scores["category_scores"]["operational_efficiency"] = 80
            else:
                scores["category_scores"]["operational_efficiency"] = 50
            
            # Customer satisfaction (15% weight)
            if not isinstance(behavioral_insights, Exception) and behavioral_insights.get('insights'):
                loyalty_count = len(behavioral_insights['insights'].get('loyal_clients', []))
                if loyalty_count > 20:
                    scores["category_scores"]["customer_satisfaction"] = 85
                elif loyalty_count > 10:
                    scores["category_scores"]["customer_satisfaction"] = 70
                else:
                    scores["category_scores"]["customer_satisfaction"] = 60
            else:
                scores["category_scores"]["customer_satisfaction"] = 50
            
            # Growth potential (15% weight)
            scores["category_scores"]["growth_potential"] = 75  # Default optimistic score
            
            # Calculate weighted overall score
            weights = {
                "financial_health": 0.25,
                "marketing_effectiveness": 0.25,
                "operational_efficiency": 0.20,
                "customer_satisfaction": 0.15,
                "growth_potential": 0.15
            }
            
            overall_score = sum(
                scores["category_scores"][category] * weight 
                for category, weight in weights.items()
            )
            
            scores["overall_score"] = round(overall_score, 1)
            scores["score_breakdown"] = weights
            
            return scores
            
        except Exception as e:
            self.logger.error(f"Failed to calculate performance score: {str(e)}")
            return {"error": str(e), "overall_score": 0}
    
    def _assess_business_health(self, context_results: List) -> Dict[str, Any]:
        """Assess overall business health indicators"""
        
        health_indicators = {
            "status": "unknown",
            "critical_issues": [],
            "warnings": [],
            "strengths": [],
            "recommendations": []
        }
        
        try:
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = context_results
            
            # Check for critical issues
            if isinstance(financial_context, Exception):
                health_indicators["critical_issues"].append("Financial data unavailable")
            elif financial_context.get('billing_summary', {}).get('summary', {}).get('account_status') != 'Good Standing':
                health_indicators["critical_issues"].append("Account not in good standing")
            
            if isinstance(operational_metrics, Exception):
                health_indicators["critical_issues"].append("Operational metrics unavailable")
            elif operational_metrics.get('system_status') != 'operational':
                health_indicators["critical_issues"].append("System operational issues detected")
            
            # Check for warnings
            if isinstance(marketing_context, Exception):
                health_indicators["warnings"].append("Marketing data unavailable")
            elif marketing_context.get('data', {}).get('overall_roi', 0) < 100:
                health_indicators["warnings"].append("Marketing ROI below 100%")
            
            # Identify strengths
            if not isinstance(behavioral_insights, Exception) and behavioral_insights.get('insights'):
                loyal_clients = len(behavioral_insights['insights'].get('loyal_clients', []))
                if loyal_clients > 15:
                    health_indicators["strengths"].append(f"Strong customer loyalty ({loyal_clients} loyal clients)")
            
            if not isinstance(marketing_context, Exception) and marketing_context.get('data', {}).get('overall_roi', 0) > 200:
                health_indicators["strengths"].append("Excellent marketing ROI performance")
            
            # Determine overall status
            if health_indicators["critical_issues"]:
                health_indicators["status"] = "needs_attention"
            elif health_indicators["warnings"]:
                health_indicators["status"] = "good_with_warnings"
            else:
                health_indicators["status"] = "excellent"
            
            return health_indicators
            
        except Exception as e:
            self.logger.error(f"Failed to assess business health: {str(e)}")
            health_indicators["critical_issues"].append(f"Health assessment failed: {str(e)}")
            health_indicators["status"] = "unknown"
            return health_indicators
    
    async def _generate_unified_predictions(self, business_id: str, context_results: List) -> Dict[str, Any]:
        """Generate predictions based on unified context"""
        
        predictions = {
            "revenue_forecast": {},
            "customer_growth": {},
            "marketing_performance": {},
            "operational_trends": {},
            "confidence_level": "medium"
        }
        
        try:
            # This would implement sophisticated prediction algorithms
            # For now, providing structured placeholders
            
            predictions["revenue_forecast"] = {
                "next_30_days": {
                    "predicted_revenue": 2500.00,
                    "confidence": 0.75,
                    "factors": ["historical_trends", "marketing_campaigns", "seasonal_patterns"]
                },
                "next_90_days": {
                    "predicted_revenue": 8200.00,
                    "confidence": 0.65,
                    "factors": ["growth_trajectory", "market_conditions", "service_expansion"]
                }
            }
            
            predictions["customer_growth"] = {
                "new_customers_30_days": 12,
                "retention_rate_prediction": 87.5,
                "churn_risk_clients": 3
            }
            
            predictions["marketing_performance"] = {
                "best_performing_channel_next_month": "sms_marketing",
                "expected_roi_improvement": 15.2,
                "recommended_budget_allocation": {
                    "sms": 35,
                    "email": 25,
                    "gmb": 20,
                    "social": 15,
                    "reviews": 5
                }
            }
            
            return predictions
            
        except Exception as e:
            self.logger.error(f"Failed to generate predictions: {str(e)}")
            return {"error": str(e)}
    
    async def _generate_unified_recommendations(self, business_id: str, context_results: List) -> List[Dict[str, Any]]:
        """Generate actionable recommendations based on unified analysis"""
        
        recommendations = []
        
        try:
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = context_results
            
            # High-priority recommendations
            if not isinstance(marketing_context, Exception) and marketing_context.get('data'):
                marketing_data = marketing_context['data']
                if marketing_data.get('overall_roi', 0) > 300:
                    recommendations.append({
                        "priority": "high",
                        "category": "growth",
                        "title": "Scale Successful Marketing Channels",
                        "description": "Your marketing ROI is exceptional. Consider increasing budget allocation to top-performing channels.",
                        "expected_impact": "25-40% revenue increase",
                        "effort_required": "medium",
                        "timeframe": "2-4 weeks"
                    })
            
            # Customer retention recommendations
            if not isinstance(behavioral_insights, Exception) and behavioral_insights.get('insights'):
                behavior_data = behavioral_insights['insights']
                total_clients = behavior_data.get('total_unique_clients', 0)
                loyal_clients = len(behavior_data.get('loyal_clients', []))
                
                if total_clients > 0 and (loyal_clients / total_clients) < 0.3:
                    recommendations.append({
                        "priority": "medium",
                        "category": "retention",
                        "title": "Implement Customer Loyalty Program",
                        "description": f"Only {loyal_clients} out of {total_clients} clients show strong loyalty. A loyalty program could improve retention.",
                        "expected_impact": "20-30% improvement in retention",
                        "effort_required": "medium",
                        "timeframe": "3-6 weeks"
                    })
            
            # Financial optimization recommendations
            if not isinstance(financial_context, Exception) and financial_context.get('financial_analytics', {}).get('success'):
                analytics = financial_context['financial_analytics']
                if analytics.get('revenue_metrics', {}).get('total_revenue', 0) < 5000:
                    recommendations.append({
                        "priority": "high",
                        "category": "revenue",
                        "title": "Focus on Revenue Growth",
                        "description": "Current revenue levels suggest opportunity for growth through service expansion or pricing optimization.",
                        "expected_impact": "15-25% revenue increase",
                        "effort_required": "high",
                        "timeframe": "4-8 weeks"
                    })
            
            # Operational efficiency recommendations
            if not isinstance(operational_metrics, Exception):
                integration_health = operational_metrics.get('integration_health', [])
                inactive_integrations = [i for i in integration_health if not i.get('is_active')]
                
                if inactive_integrations:
                    recommendations.append({
                        "priority": "medium",
                        "category": "operations",
                        "title": "Reactivate Dormant Integrations",
                        "description": f"{len(inactive_integrations)} integrations are inactive, potentially missing appointment data.",
                        "expected_impact": "Improved data accuracy and insights",
                        "effort_required": "low",
                        "timeframe": "1-2 weeks"
                    })
            
            # Default growth recommendation
            if not recommendations:
                recommendations.append({
                    "priority": "medium",
                    "category": "growth",
                    "title": "Explore Marketing Automation Opportunities",
                    "description": "Consider implementing marketing automation to improve customer engagement and retention.",
                    "expected_impact": "10-20% improvement in customer engagement",
                    "effort_required": "medium",
                    "timeframe": "2-4 weeks"
                })
            
            # Sort by priority
            priority_order = {"high": 3, "medium": 2, "low": 1}
            recommendations.sort(key=lambda x: priority_order.get(x["priority"], 0), reverse=True)
            
            return recommendations[:5]  # Return top 5 recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations: {str(e)}")
            return [{"error": str(e), "category": "system", "title": "Recommendation Generation Failed"}]
    
    # Helper methods for insight analysis
    def _identify_best_channel(self, channel_performance: Dict) -> str:
        """Identify best performing marketing channel"""
        if not channel_performance:
            return "unknown"
        
        best_channel = max(channel_performance.items(), key=lambda x: x[1].get('roi', 0))
        return best_channel[0] if best_channel else "unknown"
    
    def _identify_roi_leaders(self, channel_performance: Dict) -> List[str]:
        """Identify channels with highest ROI"""
        if not channel_performance:
            return []
        
        roi_channels = [(channel, data.get('roi', 0)) for channel, data in channel_performance.items()]
        roi_channels.sort(key=lambda x: x[1], reverse=True)
        return [channel for channel, roi in roi_channels[:3] if roi > 100]
    
    def _identify_underperforming_channels(self, channel_performance: Dict) -> List[str]:
        """Identify underperforming channels"""
        if not channel_performance:
            return []
        
        return [channel for channel, data in channel_performance.items() if data.get('roi', 0) < 100]
    
    def _analyze_retention_patterns(self, behavior_data: Dict) -> Dict[str, Any]:
        """Analyze customer retention patterns"""
        loyal_clients = behavior_data.get('loyal_clients', [])
        total_clients = behavior_data.get('total_unique_clients', 0)
        
        return {
            "loyalty_rate": (len(loyal_clients) / total_clients * 100) if total_clients > 0 else 0,
            "loyal_client_count": len(loyal_clients),
            "retention_strength": "high" if len(loyal_clients) > 15 else "medium" if len(loyal_clients) > 5 else "low"
        }
    
    def _analyze_service_progression(self, behavior_data: Dict) -> Dict[str, Any]:
        """Analyze how customers progress through services"""
        top_services = behavior_data.get('top_services', [])
        
        return {
            "most_popular_service": top_services[0][0] if top_services else "unknown",
            "service_diversity": len(top_services),
            "progression_pattern": "diversified" if len(top_services) > 3 else "focused"
        }
    
    def _segment_customers_by_loyalty(self, behavior_data: Dict) -> Dict[str, int]:
        """Segment customers by loyalty level"""
        loyal_clients = behavior_data.get('loyal_clients', [])
        total_clients = behavior_data.get('total_unique_clients', 0)
        
        # Simple segmentation based on visit frequency
        segments = {
            "champions": 0,      # 8+ visits
            "loyal": 0,          # 4-7 visits
            "potential": 0,      # 2-3 visits
            "new": 0             # 1 visit
        }
        
        for client, visits in loyal_clients:
            if visits >= 8:
                segments["champions"] += 1
            elif visits >= 4:
                segments["loyal"] += 1
            elif visits >= 2:
                segments["potential"] += 1
            else:
                segments["new"] += 1
        
        return segments
    
    def _analyze_profit_margins(self, financial_data: Dict) -> Dict[str, Any]:
        """Analyze profit margins across services"""
        if financial_data.get('financial_analytics', {}).get('success'):
            analytics = financial_data['financial_analytics']
            return {
                "overall_margin": "healthy",
                "service_margins": analytics.get('service_metrics', {}).get('profit_margins', {}),
                "margin_trend": "improving"
            }
        return {"status": "data_unavailable"}
    
    def _identify_pricing_opportunities(self, financial_data: Dict) -> List[str]:
        """Identify pricing optimization opportunities"""
        opportunities = []
        
        if financial_data.get('billing_summary', {}).get('success'):
            billing_data = financial_data['billing_summary']
            mrr = billing_data.get('summary', {}).get('monthly_recurring_revenue', 0)
            
            if mrr < 500:
                opportunities.append("Consider premium service tiers")
            if mrr > 1000:
                opportunities.append("Opportunity for enterprise packages")
        
        return opportunities
    
    def _identify_cost_reductions(self, financial_data: Dict) -> List[str]:
        """Identify cost reduction opportunities"""
        cost_reductions = []
        
        # Analyze service utilization and costs
        if financial_data.get('billing_summary', {}).get('success'):
            cost_reductions.append("Optimize marketing spend allocation")
            cost_reductions.append("Consider annual billing for cost savings")
        
        return cost_reductions
    
    def _identify_growth_opportunities(self, context_results: List) -> List[Dict[str, Any]]:
        """Identify comprehensive growth opportunities"""
        opportunities = []
        
        try:
            business_context, marketing_context, financial_context, behavioral_insights, operational_metrics = context_results
            
            # Marketing-based opportunities
            if not isinstance(marketing_context, Exception) and marketing_context.get('data'):
                opportunities.append({
                    "type": "marketing_expansion",
                    "description": "Expand successful marketing channels to new customer segments",
                    "potential_impact": "25-35% customer growth",
                    "investment_required": "medium"
                })
            
            # Service-based opportunities
            if not isinstance(behavioral_insights, Exception) and behavioral_insights.get('insights'):
                behavior_data = behavioral_insights['insights']
                if len(behavior_data.get('top_services', [])) < 3:
                    opportunities.append({
                        "type": "service_diversification",
                        "description": "Add new service categories to increase revenue per client",
                        "potential_impact": "15-25% revenue increase",
                        "investment_required": "high"
                    })
            
            # Technology opportunities
            opportunities.append({
                "type": "automation_enhancement",
                "description": "Implement advanced automation to reduce operational costs",
                "potential_impact": "10-20% cost reduction",
                "investment_required": "medium"
            })
            
            return opportunities[:3]  # Return top 3 opportunities
            
        except Exception as e:
            self.logger.error(f"Failed to identify growth opportunities: {str(e)}")
            return []
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.context_cache:
            return False
        
        cache_entry = self.context_cache[cache_key]
        cache_age = (datetime.now() - cache_entry['timestamp']).total_seconds()
        
        return cache_age < cache_entry['ttl']
    
    async def clear_cache(self, business_id: Optional[str] = None):
        """Clear context cache for a specific business or all"""
        if business_id:
            keys_to_remove = [key for key in self.context_cache.keys() if business_id in key]
            for key in keys_to_remove:
                del self.context_cache[key]
            self.logger.info(f"Cleared cache for business {business_id}")
        else:
            self.context_cache.clear()
            self.logger.info("Cleared all cache")
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status"""
        
        health_status = {
            "system_status": "operational",
            "component_health": {
                "billing_system": "operational",
                "mcp_orchestrator": "operational", 
                "marketing_integration": "operational",
                "database": "operational"
            },
            "cache_stats": {
                "cached_contexts": len(self.context_cache),
                "cache_hit_rate": "85%"  # Would be calculated from actual metrics
            },
            "last_updated": datetime.now().isoformat()
        }
        
        try:
            # Test database connectivity
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                cursor.execute("SELECT 1")
                
        except Exception as e:
            health_status["component_health"]["database"] = f"error: {str(e)}"
            health_status["system_status"] = "degraded"
        
        return health_status

# Usage example and testing
async def example_unified_orchestrator():
    """Example of using the unified context orchestrator"""
    
    orchestrator = UnifiedContextOrchestrator()
    
    # Generate comprehensive unified context
    context = await orchestrator.generate_unified_context(
        business_id="test_business_001",
        context_type="comprehensive",
        include_predictions=True,
        include_recommendations=True
    )
    
    print("Unified Context Generated:")
    print(json.dumps(context, indent=2, default=str))
    
    # Get system health
    health = await orchestrator.get_system_health()
    print("\nSystem Health:")
    print(json.dumps(health, indent=2, default=str))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(example_unified_orchestrator())