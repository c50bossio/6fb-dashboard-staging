"""
AI Insights Service - Supabase Edition
Generates real-time AI-powered business insights and recommendations
Now uses unified Supabase PostgreSQL database instead of SQLite
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import random
import uuid
from dataclasses import dataclass
from enum import Enum

# Import unified Supabase client
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lib.supabase_client import get_supabase_client, DatabaseResult

# Import AI orchestrator for generating insights
try:
    from .ai_orchestrator_service import ai_orchestrator
    AI_ORCHESTRATOR_AVAILABLE = True
except ImportError:
    AI_ORCHESTRATOR_AVAILABLE = False
    ai_orchestrator = None

logger = logging.getLogger(__name__)

class InsightType(Enum):
    REVENUE_OPPORTUNITY = "revenue_opportunity"
    CUSTOMER_BEHAVIOR = "customer_behavior"
    OPERATIONAL_EFFICIENCY = "operational_efficiency"
    MARKETING_INSIGHT = "marketing_insight"
    SCHEDULING_OPTIMIZATION = "scheduling_optimization"
    PERFORMANCE_ALERT = "performance_alert"

@dataclass
class AIInsight:
    """Represents an AI-generated business insight"""
    id: str
    type: InsightType
    title: str
    description: str
    recommendation: str
    confidence: float
    impact_score: float  # 1-10 scale
    urgency: str  # low, medium, high, critical
    data_points: Dict[str, Any]
    created_at: datetime
    expires_at: datetime
    barbershop_id: str = None
    metadata: Dict[str, Any] = None

class AIInsightsServiceSupabase:
    """
    Generates and manages real-time AI-powered business insights
    Uses Supabase PostgreSQL for data persistence
    """
    
    def __init__(self, barbershop_id: Optional[str] = None):
        self.barbershop_id = barbershop_id
        self.supabase_client = get_supabase_client()
        self.active_insights = {}
        self.insight_generators = {}
        self.setup_insight_generators()
        
    def setup_insight_generators(self):
        """Setup different types of insight generators"""
        self.insight_generators = {
            InsightType.REVENUE_OPPORTUNITY: self._generate_revenue_insights,
            InsightType.CUSTOMER_BEHAVIOR: self._generate_customer_insights,
            InsightType.OPERATIONAL_EFFICIENCY: self._generate_operational_insights,
            InsightType.MARKETING_INSIGHT: self._generate_marketing_insights,
            InsightType.SCHEDULING_OPTIMIZATION: self._generate_scheduling_insights,
            InsightType.PERFORMANCE_ALERT: self._generate_performance_alerts
        }
    
    async def generate_real_time_insights(
        self, 
        barbershop_id: str, 
        business_context: Dict = None
    ) -> List[AIInsight]:
        """Generate real-time AI insights for the business"""
        insights = []
        
        try:
            # Generate different types of insights
            for insight_type, generator in self.insight_generators.items():
                try:
                    insight = await generator(business_context or {}, barbershop_id)
                    if insight:
                        insights.append(insight)
                        await self._store_insight_supabase(insight)
                except Exception as e:
                    logger.error(f"Failed to generate {insight_type.value} insight: {e}")
            
            # Filter and prioritize insights
            prioritized_insights = self._prioritize_insights(insights)
            
            logger.info(f"✅ Generated {len(prioritized_insights)} AI insights for barbershop {barbershop_id}")
            return prioritized_insights
            
        except Exception as e:
            logger.error(f"Failed to generate real-time insights: {e}")
            return []
    
    async def get_active_insights(self, barbershop_id: str) -> List[AIInsight]:
        """Get active insights for a barbershop from Supabase"""
        try:
            result = await self.supabase_client.get_active_insights(barbershop_id)
            
            if result.success:
                insights = []
                for data in result.data:
                    insight = self._convert_db_to_insight(data)
                    if insight:
                        insights.append(insight)
                
                logger.info(f"✅ Retrieved {len(insights)} active insights for barbershop {barbershop_id}")
                return insights
            else:
                logger.error(f"Failed to get active insights: {result.error}")
                return []
                
        except Exception as e:
            logger.error(f"Error getting active insights: {e}")
            return []
    
    async def update_insight_status(self, insight_id: str, is_active: bool) -> bool:
        """Update insight active status"""
        try:
            result = await self.supabase_client.update_insight_status(insight_id, is_active)
            
            if result.success:
                logger.info(f"✅ Updated insight {insight_id} status to {'active' if is_active else 'inactive'}")
                return True
            else:
                logger.error(f"Failed to update insight status: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating insight status: {e}")
            return False
    
    async def _store_insight_supabase(self, insight: AIInsight) -> bool:
        """Store insight in Supabase database"""
        try:
            result = await self.supabase_client.create_ai_insight(
                barbershop_id=insight.barbershop_id,
                insight_type=insight.type.value,
                title=insight.title,
                description=insight.description,
                recommendation=insight.recommendation,
                confidence=insight.confidence,
                impact_score=insight.impact_score,
                urgency=insight.urgency,
                data_points=insight.data_points,
                metadata=insight.metadata or {}
            )
            
            if result.success:
                logger.info(f"✅ Stored insight '{insight.title}' in Supabase")
                return True
            else:
                logger.error(f"Failed to store insight: {result.error}")
                return False
                
        except Exception as e:
            logger.error(f"Error storing insight in Supabase: {e}")
            return False
    
    def _convert_db_to_insight(self, db_data: Dict) -> Optional[AIInsight]:
        """Convert Supabase database record to AIInsight object"""
        try:
            return AIInsight(
                id=db_data['id'],
                type=InsightType(db_data['type']),
                title=db_data['title'],
                description=db_data['description'],
                recommendation=db_data['recommendation'],
                confidence=float(db_data['confidence']),
                impact_score=float(db_data['impact_score']),
                urgency=db_data['urgency'],
                data_points=db_data.get('data_points', {}),
                created_at=datetime.fromisoformat(db_data['created_at'].replace('Z', '+00:00')),
                expires_at=datetime.fromisoformat(db_data.get('expires_at', datetime.now().isoformat()).replace('Z', '+00:00')),
                barbershop_id=db_data.get('barbershop_id'),
                metadata=db_data.get('metadata', {})
            )
        except Exception as e:
            logger.error(f"Error converting DB data to insight: {e}")
            return None
    
    async def _generate_revenue_insights(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate revenue optimization insights"""
        
        # Simulate business data analysis
        current_revenue = context.get('daily_revenue', random.uniform(800, 1500))
        avg_revenue = context.get('avg_daily_revenue', 1200)
        peak_hours = context.get('peak_hours', ['10:00-14:00', '17:00-19:00'])
        
        if current_revenue < avg_revenue * 0.85:
            # Revenue is significantly below average
            insight_data = {
                'current_revenue': current_revenue,
                'avg_revenue': avg_revenue,
                'deficit_percentage': ((avg_revenue - current_revenue) / avg_revenue) * 100,
                'peak_hours': peak_hours,
                'analysis_date': datetime.now().isoformat()
            }
            
            # Use AI to generate detailed recommendation if available
            if AI_ORCHESTRATOR_AVAILABLE and ai_orchestrator:
                ai_prompt = f"""
                Current daily revenue is ${current_revenue:.2f}, which is {insight_data['deficit_percentage']:.1f}% below the average of ${avg_revenue:.2f}. 
                Peak hours are {', '.join(peak_hours)}. 
                Provide specific actionable recommendations to increase revenue today.
                """
                
                try:
                    ai_response = await ai_orchestrator.enhanced_chat(
                        message=ai_prompt,
                        session_id=f"revenue_insight_{datetime.now().timestamp()}",
                        business_context=context
                    )
                    
                    recommendation = ai_response.get('response', 'Focus on upselling premium services during peak hours and consider promotional pricing for off-peak times.')
                    confidence = ai_response.get('confidence', 0.8)
                    
                except Exception as e:
                    logger.warning(f"AI orchestrator failed, using fallback: {e}")
                    recommendation = 'Focus on upselling premium services during peak hours and consider promotional pricing for off-peak times.'
                    confidence = 0.7
            else:
                recommendation = 'Focus on upselling premium services during peak hours and consider promotional pricing for off-peak times.'
                confidence = 0.7
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.REVENUE_OPPORTUNITY,
                title="Revenue Recovery Opportunity",
                description=f"Daily revenue is ${current_revenue:.2f}, down {insight_data['deficit_percentage']:.1f}% from average",
                recommendation=recommendation,
                confidence=confidence,
                impact_score=8.5,
                urgency="high",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=8),
                barbershop_id=barbershop_id,
                metadata={'category': 'financial', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_customer_insights(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate customer behavior insights"""
        
        # Simulate customer data analysis
        satisfaction_score = context.get('avg_satisfaction', random.uniform(3.8, 4.8))
        repeat_rate = context.get('repeat_customer_rate', random.uniform(0.6, 0.85))
        no_show_rate = context.get('no_show_rate', random.uniform(0.05, 0.15))
        
        if satisfaction_score < 4.2:
            insight_data = {
                'satisfaction_score': satisfaction_score,
                'repeat_rate': repeat_rate,
                'no_show_rate': no_show_rate,
                'target_score': 4.5,
                'improvement_needed': 4.5 - satisfaction_score
            }
            
            recommendation = f"""
            Focus on improving customer satisfaction from {satisfaction_score:.1f} to 4.5+ stars:
            1. Implement post-service follow-up calls
            2. Address common service complaints
            3. Enhance waiting area experience
            4. Train staff on customer service excellence
            """
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.CUSTOMER_BEHAVIOR,
                title="Customer Satisfaction Below Target",
                description=f"Average satisfaction is {satisfaction_score:.1f}/5.0, below industry standard",
                recommendation=recommendation.strip(),
                confidence=0.85,
                impact_score=7.5,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=7),
                barbershop_id=barbershop_id,
                metadata={'category': 'customer_experience', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_operational_insights(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate operational efficiency insights"""
        
        utilization_rate = context.get('chair_utilization', random.uniform(0.6, 0.9))
        avg_service_time = context.get('avg_service_time', random.uniform(35, 55))
        staff_efficiency = context.get('staff_efficiency', random.uniform(0.7, 0.95))
        
        if utilization_rate < 0.75:
            insight_data = {
                'utilization_rate': utilization_rate,
                'target_utilization': 0.85,
                'avg_service_time': avg_service_time,
                'staff_efficiency': staff_efficiency,
                'potential_increase': (0.85 - utilization_rate) * 100
            }
            
            recommendation = f"""
            Increase chair utilization from {utilization_rate:.1%} to 85%:
            1. Optimize appointment scheduling
            2. Reduce service gaps during peak hours
            3. Implement standby booking system
            4. Cross-train staff for flexibility
            """
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.OPERATIONAL_EFFICIENCY,
                title="Low Chair Utilization Detected",
                description=f"Chair utilization is {utilization_rate:.1%}, {insight_data['potential_increase']:.1f}% below target",
                recommendation=recommendation.strip(),
                confidence=0.8,
                impact_score=6.5,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=3),
                barbershop_id=barbershop_id,
                metadata={'category': 'operations', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_marketing_insights(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate marketing and customer acquisition insights"""
        
        new_customer_rate = context.get('new_customer_rate', random.uniform(0.15, 0.35))
        social_media_engagement = context.get('social_engagement', random.uniform(0.02, 0.08))
        referral_rate = context.get('referral_rate', random.uniform(0.1, 0.3))
        
        if new_customer_rate < 0.2:
            insight_data = {
                'new_customer_rate': new_customer_rate,
                'target_rate': 0.25,
                'social_engagement': social_media_engagement,
                'referral_rate': referral_rate,
                'growth_opportunity': (0.25 - new_customer_rate) * 100
            }
            
            recommendation = f"""
            Boost new customer acquisition from {new_customer_rate:.1%} to 25%:
            1. Enhance Google My Business presence
            2. Launch referral incentive program
            3. Create Instagram before/after content
            4. Partner with local businesses
            5. Offer first-time customer discounts
            """
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.MARKETING_INSIGHT,
                title="Customer Acquisition Below Target",
                description=f"New customer rate is {new_customer_rate:.1%}, missing growth opportunities",
                recommendation=recommendation.strip(),
                confidence=0.75,
                impact_score=7.0,
                urgency="low",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=14),
                barbershop_id=barbershop_id,
                metadata={'category': 'marketing', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_scheduling_insights(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate scheduling optimization insights"""
        
        peak_hour_bookings = context.get('peak_hour_bookings', random.uniform(0.8, 1.0))
        off_peak_bookings = context.get('off_peak_bookings', random.uniform(0.3, 0.6))
        wait_times = context.get('avg_wait_time', random.uniform(5, 25))
        
        if wait_times > 15:
            insight_data = {
                'avg_wait_time': wait_times,
                'target_wait_time': 10,
                'peak_hour_bookings': peak_hour_bookings,
                'off_peak_bookings': off_peak_bookings,
                'time_savings_needed': wait_times - 10
            }
            
            recommendation = f"""
            Reduce average wait time from {wait_times:.1f} to 10 minutes:
            1. Implement time buffer between appointments
            2. Send arrival time notifications to customers
            3. Offer incentives for off-peak appointments
            4. Use queue management system
            """
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.SCHEDULING_OPTIMIZATION,
                title="Customer Wait Times Too High",
                description=f"Average wait time is {wait_times:.1f} minutes, above 10-minute target",
                recommendation=recommendation.strip(),
                confidence=0.9,
                impact_score=6.0,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=5),
                barbershop_id=barbershop_id,
                metadata={'category': 'scheduling', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_performance_alerts(self, context: Dict, barbershop_id: str) -> Optional[AIInsight]:
        """Generate performance alerts for critical issues"""
        
        daily_cancellations = context.get('cancellation_rate', random.uniform(0.05, 0.2))
        system_uptime = context.get('system_uptime', random.uniform(0.95, 1.0))
        payment_failure_rate = context.get('payment_failures', random.uniform(0.01, 0.05))
        
        if daily_cancellations > 0.15:
            insight_data = {
                'cancellation_rate': daily_cancellations,
                'acceptable_rate': 0.1,
                'revenue_impact': daily_cancellations * context.get('avg_booking_value', 50),
                'system_uptime': system_uptime,
                'payment_failure_rate': payment_failure_rate
            }
            
            recommendation = f"""
            URGENT: Daily cancellation rate is {daily_cancellations:.1%} (target: <10%):
            1. Implement stricter cancellation policies
            2. Send appointment reminders 24h and 2h before
            3. Require deposit for bookings
            4. Analyze cancellation patterns and causes
            """
            
            return AIInsight(
                id=str(uuid.uuid4()),
                type=InsightType.PERFORMANCE_ALERT,
                title="High Cancellation Rate Alert",
                description=f"Cancellation rate is {daily_cancellations:.1%}, significantly above normal",
                recommendation=recommendation.strip(),
                confidence=0.95,
                impact_score=9.0,
                urgency="critical",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=24),
                barbershop_id=barbershop_id,
                metadata={'category': 'performance', 'auto_generated': True, 'alert': True}
            )
        
        return None
    
    def _prioritize_insights(self, insights: List[AIInsight]) -> List[AIInsight]:
        """Prioritize insights based on urgency, impact, and confidence"""
        urgency_weights = {'critical': 10, 'high': 7, 'medium': 4, 'low': 1}
        
        def insight_priority(insight):
            urgency_weight = urgency_weights.get(insight.urgency, 1)
            return (urgency_weight * insight.impact_score * insight.confidence)
        
        return sorted(insights, key=insight_priority, reverse=True)
    
    async def health_check(self) -> Dict[str, Any]:
        """Check the health of the AI insights service"""
        try:
            # Test Supabase connection
            health_result = await self.supabase_client.health_check()
            
            if health_result.success:
                return {
                    'status': 'healthy',
                    'database': 'connected',
                    'ai_orchestrator': 'available' if AI_ORCHESTRATOR_AVAILABLE else 'unavailable',
                    'insight_generators': len(self.insight_generators),
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {
                    'status': 'unhealthy',
                    'database': 'disconnected',
                    'error': health_result.error,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }


# ==========================================
# SINGLETON INSTANCE
# ==========================================

_ai_insights_service = None

def get_ai_insights_service() -> AIInsightsServiceSupabase:
    """Get the singleton AI insights service instance"""
    global _ai_insights_service
    if _ai_insights_service is None:
        _ai_insights_service = AIInsightsServiceSupabase()
    return _ai_insights_service

# Convenience functions for backward compatibility
async def generate_insights(barbershop_id: str, context: Dict = None) -> List[AIInsight]:
    """Generate insights for a barbershop"""
    service = get_ai_insights_service()
    return await service.generate_real_time_insights(barbershop_id, context)

async def get_active_insights_for_shop(barbershop_id: str) -> List[AIInsight]:
    """Get active insights for a barbershop"""
    service = get_ai_insights_service()
    return await service.get_active_insights(barbershop_id)

if __name__ == "__main__":
    # Test the service
    async def test_service():
        service = get_ai_insights_service()
        health = await service.health_check()
        print(f"AI Insights Service Health: {health}")
        
        # Generate test insights
        test_context = {
            'daily_revenue': 950,
            'avg_daily_revenue': 1200,
            'avg_satisfaction': 4.0
        }
        
        insights = await service.generate_real_time_insights('test-barbershop-id', test_context)
        print(f"Generated {len(insights)} insights:")
        for insight in insights:
            print(f"- {insight.title} (urgency: {insight.urgency}, impact: {insight.impact_score})")
    
    asyncio.run(test_service())