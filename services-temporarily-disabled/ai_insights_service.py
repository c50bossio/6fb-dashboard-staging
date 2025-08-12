"""
AI Insights Service
Generates real-time AI-powered business insights and recommendations
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import random
import sqlite3
import os
from dataclasses import dataclass
from enum import Enum

# Import AI orchestrator for generating insights
from .ai_orchestrator_service import ai_orchestrator

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
    urgency: str  # low, medium, high
    data_points: Dict[str, Any]
    created_at: datetime
    expires_at: datetime
    metadata: Dict[str, Any] = None

class AIInsightsService:
    """
    Generates and manages real-time AI-powered business insights
    """
    
    def __init__(self, db_path: str = "./data/ai_insights.db"):
        self.db_path = db_path
        self.active_insights = {}
        self.insight_generators = {}
        self.setup_database()
        self.setup_insight_generators()
        
    def setup_database(self):
        """Initialize SQLite database for insights storage"""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_insights (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    recommendation TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    impact_score REAL NOT NULL,
                    urgency TEXT NOT NULL,
                    data_points TEXT NOT NULL,
                    metadata TEXT,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    is_active BOOLEAN DEFAULT 1
                )
            """)
            
            conn.execute("""
                CREATE TABLE IF NOT EXISTS insight_metrics (
                    id TEXT PRIMARY KEY,
                    insight_id TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    metric_value REAL NOT NULL,
                    recorded_at TEXT NOT NULL,
                    FOREIGN KEY (insight_id) REFERENCES ai_insights (id)
                )
            """)
            
            conn.commit()
            logger.info("✅ AI Insights database initialized")
    
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
    
    async def generate_real_time_insights(self, business_context: Dict = None) -> List[AIInsight]:
        """Generate real-time AI insights for the business"""
        insights = []
        
        try:
            # Generate different types of insights
            for insight_type, generator in self.insight_generators.items():
                try:
                    insight = await generator(business_context or {})
                    if insight:
                        insights.append(insight)
                        await self._store_insight(insight)
                except Exception as e:
                    logger.error(f"Failed to generate {insight_type.value} insight: {e}")
            
            # Filter and prioritize insights
            prioritized_insights = self._prioritize_insights(insights)
            
            logger.info(f"✅ Generated {len(prioritized_insights)} AI insights")
            return prioritized_insights
            
        except Exception as e:
            logger.error(f"Failed to generate real-time insights: {e}")
            return []
    
    async def _generate_revenue_insights(self, context: Dict) -> Optional[AIInsight]:
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
                'peak_hours': peak_hours
            }
            
            # Use AI to generate detailed recommendation
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
                
            except Exception:
                recommendation = 'Focus on upselling premium services during peak hours and consider promotional pricing for off-peak times.'
                confidence = 0.7
            
            return AIInsight(
                id=f"revenue_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
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
                metadata={'category': 'financial', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_customer_insights(self, context: Dict) -> Optional[AIInsight]:
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
                'target_score': 4.5
            }
            
            # Generate AI-powered recommendation
            ai_prompt = f"""
            Customer satisfaction is {satisfaction_score:.1f}/5.0, with {repeat_rate*100:.1f}% repeat customers and {no_show_rate*100:.1f}% no-show rate.
            Provide specific strategies to improve customer satisfaction and retention for a barbershop.
            """
            
            try:
                ai_response = await ai_orchestrator.enhanced_chat(
                    message=ai_prompt,
                    session_id=f"customer_insight_{datetime.now().timestamp()}",
                    business_context=context
                )
                
                recommendation = ai_response.get('response', 'Implement personalized follow-up messages and gather specific feedback after each service.')
                confidence = ai_response.get('confidence', 0.8)
                
            except Exception:
                recommendation = 'Implement personalized follow-up messages and gather specific feedback after each service.'
                confidence = 0.75
            
            return AIInsight(
                id=f"customer_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                type=InsightType.CUSTOMER_BEHAVIOR,
                title="Customer Satisfaction Alert",
                description=f"Satisfaction score is {satisfaction_score:.1f}/5.0, below optimal range",
                recommendation=recommendation,
                confidence=confidence,
                impact_score=7.5,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=3),
                metadata={'category': 'customer_service', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_operational_insights(self, context: Dict) -> Optional[AIInsight]:
        """Generate operational efficiency insights"""
        
        chair_utilization = context.get('chair_utilization', random.uniform(0.6, 0.9))
        avg_service_time = context.get('avg_service_time', random.uniform(25, 45))
        
        if chair_utilization < 0.75:
            insight_data = {
                'chair_utilization': chair_utilization,
                'avg_service_time': avg_service_time,
                'optimal_utilization': 0.85
            }
            
            return AIInsight(
                id=f"operations_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                type=InsightType.OPERATIONAL_EFFICIENCY,
                title="Chair Utilization Opportunity",
                description=f"Chair utilization is {chair_utilization*100:.1f}%, below optimal 85%",
                recommendation="Consider adjusting appointment durations and promoting off-peak booking incentives",
                confidence=0.8,
                impact_score=6.5,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=12),
                metadata={'category': 'operations', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_marketing_insights(self, context: Dict) -> Optional[AIInsight]:
        """Generate marketing insights"""
        
        social_engagement = context.get('social_engagement_rate', random.uniform(0.02, 0.08))
        new_customers = context.get('new_customers_this_week', random.randint(3, 15))
        
        if social_engagement < 0.04:
            insight_data = {
                'engagement_rate': social_engagement,
                'new_customers': new_customers,
                'target_engagement': 0.06
            }
            
            return AIInsight(
                id=f"marketing_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                type=InsightType.MARKETING_INSIGHT,
                title="Social Media Engagement Low",
                description=f"Social engagement rate is {social_engagement*100:.1f}%, below industry average",
                recommendation="Post before/after photos daily and engage with customer comments within 2 hours",
                confidence=0.85,
                impact_score=7.0,
                urgency="low",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=7),
                metadata={'category': 'marketing', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_scheduling_insights(self, context: Dict) -> Optional[AIInsight]:
        """Generate scheduling optimization insights"""
        
        booking_rate = context.get('booking_rate', random.uniform(0.7, 0.95))
        cancellation_rate = context.get('cancellation_rate', random.uniform(0.05, 0.12))
        
        if cancellation_rate > 0.08:
            insight_data = {
                'booking_rate': booking_rate,
                'cancellation_rate': cancellation_rate,
                'target_cancellation': 0.05
            }
            
            return AIInsight(
                id=f"scheduling_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                type=InsightType.SCHEDULING_OPTIMIZATION,
                title="High Cancellation Rate Alert",
                description=f"Cancellation rate is {cancellation_rate*100:.1f}%, above optimal 5%",
                recommendation="Implement 24-hour confirmation system and booking deposits for premium services",
                confidence=0.9,
                impact_score=8.0,
                urgency="high",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=6),
                metadata={'category': 'scheduling', 'auto_generated': True}
            )
        
        return None
    
    async def _generate_performance_alerts(self, context: Dict) -> Optional[AIInsight]:
        """Generate performance alerts"""
        
        # Check for critical performance issues
        system_performance = context.get('system_performance', random.uniform(0.8, 1.0))
        
        if system_performance < 0.9:
            insight_data = {
                'performance_score': system_performance,
                'threshold': 0.9
            }
            
            return AIInsight(
                id=f"performance_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                type=InsightType.PERFORMANCE_ALERT,
                title="System Performance Alert",
                description=f"System performance at {system_performance*100:.1f}%, below optimal threshold",
                recommendation="Check booking system response times and clear browser cache",
                confidence=0.95,
                impact_score=6.0,
                urgency="medium",
                data_points=insight_data,
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=2),
                metadata={'category': 'technical', 'auto_generated': True}
            )
        
        return None
    
    def _prioritize_insights(self, insights: List[AIInsight]) -> List[AIInsight]:
        """Prioritize insights based on urgency, impact, and confidence"""
        
        def priority_score(insight: AIInsight) -> float:
            urgency_weights = {'high': 3.0, 'medium': 2.0, 'low': 1.0}
            urgency_score = urgency_weights.get(insight.urgency, 1.0)
            
            return (insight.impact_score * insight.confidence * urgency_score)
        
        # Sort by priority score (highest first)
        prioritized = sorted(insights, key=priority_score, reverse=True)
        
        # Return top 5 insights to avoid overwhelming the user
        return prioritized[:5]
    
    async def _store_insight(self, insight: AIInsight):
        """Store insight in database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT INTO ai_insights 
                    (id, type, title, description, recommendation, confidence, 
                     impact_score, urgency, data_points, metadata, created_at, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    insight.id,
                    insight.type.value,
                    insight.title,
                    insight.description,
                    insight.recommendation,
                    insight.confidence,
                    insight.impact_score,
                    insight.urgency,
                    json.dumps(insight.data_points),
                    json.dumps(insight.metadata or {}),
                    insight.created_at.isoformat(),
                    insight.expires_at.isoformat()
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"Failed to store insight {insight.id}: {e}")
    
    async def get_active_insights(self, limit: int = 10) -> List[Dict]:
        """Get currently active insights"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM ai_insights 
                    WHERE is_active = 1 AND expires_at > ?
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (datetime.now().isoformat(), limit))
                
                insights = []
                for row in cursor.fetchall():
                    insights.append({
                        'id': row['id'],
                        'type': row['type'],
                        'title': row['title'],
                        'description': row['description'],
                        'recommendation': row['recommendation'],
                        'confidence': row['confidence'],
                        'impact_score': row['impact_score'],
                        'urgency': row['urgency'],
                        'data_points': json.loads(row['data_points']),
                        'metadata': json.loads(row['metadata'] or '{}'),
                        'created_at': row['created_at'],
                        'expires_at': row['expires_at']
                    })
                
                return insights
                
        except Exception as e:
            logger.error(f"Failed to get active insights: {e}")
            return []
    
    async def dismiss_insight(self, insight_id: str) -> bool:
        """Mark an insight as dismissed"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    UPDATE ai_insights 
                    SET is_active = 0
                    WHERE id = ?
                """, (insight_id,))
                conn.commit()
                return True
                
        except Exception as e:
            logger.error(f"Failed to dismiss insight {insight_id}: {e}")
            return False

# Global instance
ai_insights_service = AIInsightsService()