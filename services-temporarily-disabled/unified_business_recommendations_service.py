"""
Unified Business Recommendations Service
Consolidates business_recommendations_engine.py and business_recommendations_service.py
into a single, comprehensive service with AI agent integration and database persistence
"""

import asyncio
import json
import logging
import sqlite3
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict, field
from enum import Enum
from collections import defaultdict

# Import AI agent system (from engine)
try:
    from .ai_agents.agent_manager import agent_manager
    from .ai_agents.base_agent import MessageDomain, AgentPersonality
    AGENT_MANAGER_AVAILABLE = True
except ImportError:
    AGENT_MANAGER_AVAILABLE = False
    logging.warning("Agent Manager not available")

# Import AI orchestrator (from service)
try:
    from .ai_orchestrator_service import ai_orchestrator
    AI_ORCHESTRATOR_AVAILABLE = True
except ImportError:
    AI_ORCHESTRATOR_AVAILABLE = False
    logging.warning("AI Orchestrator not available")

# Import predictive analytics (from service)
try:
    from .predictive_analytics_service import PredictiveAnalyticsService
    PREDICTIVE_ANALYTICS_AVAILABLE = True
except ImportError:
    PREDICTIVE_ANALYTICS_AVAILABLE = False
    logging.warning("Predictive Analytics not available")

logger = logging.getLogger(__name__)

# Enhanced enums combining both services
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
    PRICING_OPTIMIZATION = "pricing_optimization"
    INVENTORY_MANAGEMENT = "inventory_management"

class RecommendationStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISMISSED = "dismissed"

@dataclass
class BusinessRecommendation:
    """Enhanced recommendation structure combining both services"""
    id: str
    title: str
    description: str
    category: RecommendationCategory
    priority: RecommendationPriority
    status: RecommendationStatus = RecommendationStatus.PENDING
    
    # Impact and effort (from engine)
    estimated_impact: Dict[str, Any] = field(default_factory=dict)  # revenue_increase, cost_savings, time_savings
    implementation_effort: str = "medium"  # low, medium, high
    implementation_time: str = "2-4 weeks"  # days, weeks, months
    roi_estimate: float = 0.0
    
    # Action items (from engine)
    prerequisites: List[str] = field(default_factory=list)
    action_steps: List[str] = field(default_factory=list)
    success_metrics: List[str] = field(default_factory=list)
    
    # Metadata (enhanced from both services)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    generated_by: str = "ai_system"  # ai_system, agent_collaboration, predictive_analytics
    confidence_score: float = 0.0
    business_context: Dict[str, Any] = field(default_factory=dict)
    
    # Implementation tracking (from service)
    implementation_notes: List[str] = field(default_factory=list)
    completion_percentage: float = 0.0
    assigned_to: Optional[str] = None

@dataclass
class RecommendationSuite:
    """Collection of recommendations for comprehensive business guidance"""
    id: str
    business_name: str
    generated_at: datetime
    recommendations: List[BusinessRecommendation] = field(default_factory=list)
    total_revenue_impact: float = 0.0
    total_cost_savings: float = 0.0
    implementation_roadmap: List[Dict[str, Any]] = field(default_factory=list)
    priority_summary: Dict[str, int] = field(default_factory=dict)
    category_summary: Dict[str, int] = field(default_factory=dict)

class UnifiedBusinessRecommendationsService:
    """
    Unified service combining features from both recommendation services:
    - AI agent integration (from engine)
    - Database persistence (from service) 
    - Sophisticated data structures (from engine)
    - Predictive analytics (from service)
    """
    
    def __init__(self):
        self.db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'agent_system.db')
        
        # Initialize AI services
        if AGENT_MANAGER_AVAILABLE:
            self.agent_manager = agent_manager
        else:
            self.agent_manager = None
            
        if AI_ORCHESTRATOR_AVAILABLE:
            self.ai_orchestrator = ai_orchestrator
        else:
            self.ai_orchestrator = None
            
        if PREDICTIVE_ANALYTICS_AVAILABLE:
            self.predictive_service = PredictiveAnalyticsService()
        else:
            self.predictive_service = None
        
        # Initialize database
        self._init_database()
        
        # Recommendation generation limits
        self.max_recommendations_per_suite = 10
        self.recommendation_refresh_hours = 24
        
        logger.info("✅ Unified Business Recommendations Service initialized")
    
    def _init_database(self):
        """Initialize database tables for persistent storage"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS recommendation_suites (
                        id TEXT PRIMARY KEY,
                        business_name TEXT NOT NULL,
                        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        total_revenue_impact REAL DEFAULT 0,
                        total_cost_savings REAL DEFAULT 0,
                        recommendations_data TEXT,
                        implementation_roadmap TEXT,
                        priority_summary TEXT,
                        category_summary TEXT
                    )
                ''')
                
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS recommendations (
                        id TEXT PRIMARY KEY,
                        suite_id TEXT,
                        title TEXT NOT NULL,
                        description TEXT,
                        category TEXT,
                        priority TEXT,
                        status TEXT DEFAULT 'pending',
                        estimated_impact TEXT,
                        implementation_effort TEXT,
                        implementation_time TEXT,
                        roi_estimate REAL DEFAULT 0,
                        prerequisites TEXT,
                        action_steps TEXT,
                        success_metrics TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        generated_by TEXT,
                        confidence_score REAL DEFAULT 0,
                        business_context TEXT,
                        implementation_notes TEXT,
                        completion_percentage REAL DEFAULT 0,
                        assigned_to TEXT,
                        FOREIGN KEY (suite_id) REFERENCES recommendation_suites(id)
                    )
                ''')
                
                conn.commit()
                logger.info("✅ Database initialized for unified recommendations service")
                
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
    
    async def generate_comprehensive_recommendations(self, business_context: Dict[str, Any]) -> RecommendationSuite:
        """
        Generate comprehensive business recommendations using all available AI services
        """
        try:
            business_name = business_context.get('business_name', 'Your Business')
            suite_id = f"suite_{uuid.uuid4().hex[:12]}"
            
            logger.info(f"🔄 Generating comprehensive recommendations for {business_name}")
            
            # Step 1: Generate agent-based recommendations (if available)
            agent_recommendations = []
            if self.agent_manager:
                agent_recommendations = await self._generate_agent_recommendations(business_context)
                logger.info(f"✅ Generated {len(agent_recommendations)} agent recommendations")
            
            # Step 2: Generate AI orchestrator recommendations (if available)
            orchestrator_recommendations = []
            if self.ai_orchestrator:
                orchestrator_recommendations = await self._generate_orchestrator_recommendations(business_context)
                logger.info(f"✅ Generated {len(orchestrator_recommendations)} orchestrator recommendations")
            
            # Step 3: Generate predictive analytics recommendations (if available)
            predictive_recommendations = []
            if self.predictive_service:
                predictive_recommendations = await self._generate_predictive_recommendations(business_context)
                logger.info(f"✅ Generated {len(predictive_recommendations)} predictive recommendations")
            
            # Step 4: Combine and deduplicate recommendations
            all_recommendations = agent_recommendations + orchestrator_recommendations + predictive_recommendations
            
            # Step 5: If no AI services available, generate fallback recommendations
            if not all_recommendations:
                all_recommendations = self._generate_fallback_recommendations(business_context)
                logger.info(f"⚠️ Using fallback recommendations: {len(all_recommendations)}")
            
            # Step 6: Deduplicate and prioritize
            final_recommendations = self._deduplicate_and_prioritize(all_recommendations)
            final_recommendations = final_recommendations[:self.max_recommendations_per_suite]
            
            # Step 7: Create recommendation suite
            suite = RecommendationSuite(
                id=suite_id,
                business_name=business_name,
                generated_at=datetime.now(),
                recommendations=final_recommendations
            )
            
            # Step 8: Calculate suite-level metrics
            suite = self._calculate_suite_metrics(suite)
            
            # Step 9: Generate implementation roadmap
            suite.implementation_roadmap = self._generate_implementation_roadmap(suite.recommendations)
            
            # Step 10: Save to database
            await self._save_recommendation_suite(suite)
            
            logger.info(f"✅ Generated {len(final_recommendations)} unified recommendations for {business_name}")
            return suite
            
        except Exception as e:
            logger.error(f"❌ Failed to generate recommendations: {e}")
            # Return basic suite with fallback recommendations
            return await self._generate_fallback_suite(business_context)
    
    async def _generate_agent_recommendations(self, business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Generate recommendations using AI agent collaboration"""
        recommendations = []
        
        try:
            # Create business analysis query
            analysis_query = self._build_business_analysis_query(business_context)
            
            # Get agent collaborative response
            agent_response = await self.agent_manager.process_message(
                message=analysis_query,
                context=business_context
            )
            
            if agent_response and agent_response.total_confidence > 0.6:
                # Convert agent recommendations to BusinessRecommendation objects
                for i, recommendation in enumerate(agent_response.combined_recommendations[:5]):
                    rec = BusinessRecommendation(
                        id=f"agent_{uuid.uuid4().hex[:8]}",
                        title=self._extract_recommendation_title(recommendation),
                        description=recommendation,
                        category=self._categorize_recommendation(recommendation),
                        priority=self._prioritize_recommendation(recommendation, business_context),
                        generated_by="ai_agent_collaboration",
                        confidence_score=agent_response.total_confidence,
                        business_context=business_context,
                        action_steps=self._extract_action_steps(recommendation),
                        success_metrics=self._extract_success_metrics(recommendation),
                        estimated_impact=self._estimate_recommendation_impact(recommendation, business_context)
                    )
                    recommendations.append(rec)
                    
        except Exception as e:
            logger.error(f"Agent recommendation generation failed: {e}")
            
        return recommendations
    
    async def _generate_orchestrator_recommendations(self, business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Generate recommendations using AI orchestrator"""
        recommendations = []
        
        try:
            # Use enhanced chat for strategic business recommendations
            query = f"""Based on the current business metrics and context, provide 3-5 specific, actionable business recommendations for improving performance. Focus on revenue growth, cost optimization, and operational efficiency.
            
            Current Context:
            - Monthly Revenue: ${business_context.get('monthly_revenue', 0):,.2f}
            - Customer Count: {business_context.get('customer_count', 0):,}
            - Average Service Price: ${business_context.get('average_service_price', 0):.2f}
            - Growth Rate: {business_context.get('revenue_growth', 0):+.1f}%
            """
            
            response = await self.ai_orchestrator.enhanced_chat(
                message=query,
                session_id=f"recommendations_{uuid.uuid4().hex[:8]}",
                business_context=business_context
            )
            
            if response and response.get('confidence', 0) > 0.7:
                # Parse AI response into structured recommendations
                ai_recommendations = self._parse_ai_response_to_recommendations(
                    response['response'], business_context
                )
                recommendations.extend(ai_recommendations)
                
        except Exception as e:
            logger.error(f"Orchestrator recommendation generation failed: {e}")
            
        return recommendations
    
    async def _generate_predictive_recommendations(self, business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Generate recommendations using predictive analytics"""
        recommendations = []
        
        try:
            if self.predictive_service:
                # Get predictive insights
                predictions = await self.predictive_service.generate_business_predictions(business_context)
                
                # Convert predictions to recommendations
                for prediction in predictions.get('recommendations', []):
                    rec = BusinessRecommendation(
                        id=f"predictive_{uuid.uuid4().hex[:8]}",
                        title=prediction.get('title', 'Predictive Recommendation'),
                        description=prediction.get('description', ''),
                        category=RecommendationCategory(prediction.get('category', 'operational_efficiency')),
                        priority=RecommendationPriority(prediction.get('priority', 'medium')),
                        generated_by="predictive_analytics",
                        confidence_score=prediction.get('confidence', 0.8),
                        business_context=business_context,
                        roi_estimate=prediction.get('roi_estimate', 0.0),
                        estimated_impact=prediction.get('estimated_impact', {})
                    )
                    recommendations.append(rec)
                    
        except Exception as e:
            logger.error(f"Predictive recommendation generation failed: {e}")
            
        return recommendations
    
    def _generate_fallback_recommendations(self, business_context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Generate basic recommendations when AI services are unavailable"""
        
        monthly_revenue = business_context.get('monthly_revenue', 0)
        customer_count = business_context.get('customer_count', 0)
        avg_service_price = business_context.get('average_service_price', 0)
        growth_rate = business_context.get('revenue_growth', 0)
        
        recommendations = []
        
        # Revenue optimization
        if monthly_revenue < 10000:  # Low revenue
            recommendations.append(BusinessRecommendation(
                id=f"fallback_{uuid.uuid4().hex[:8]}",
                title="Increase Service Pricing",
                description="Consider raising your service prices by 10-15% to improve revenue per customer.",
                category=RecommendationCategory.REVENUE_OPTIMIZATION,
                priority=RecommendationPriority.HIGH,
                generated_by="fallback_system",
                confidence_score=0.75,
                estimated_impact={"revenue_increase": monthly_revenue * 0.12},
                action_steps=[
                    "Analyze competitor pricing in your area",
                    "Test price increase with premium services first",
                    "Communicate value proposition to existing customers"
                ],
                success_metrics=["Monthly revenue increase", "Customer retention rate", "Average transaction value"]
            ))
        
        # Customer acquisition
        if customer_count < 100:
            recommendations.append(BusinessRecommendation(
                id=f"fallback_{uuid.uuid4().hex[:8]}",
                title="Implement Referral Program",
                description="Create a customer referral program to leverage word-of-mouth marketing.",
                category=RecommendationCategory.CUSTOMER_ACQUISITION,
                priority=RecommendationPriority.MEDIUM,
                generated_by="fallback_system",
                confidence_score=0.70,
                estimated_impact={"new_customers_per_month": 15},
                action_steps=[
                    "Design referral incentive structure",
                    "Create referral tracking system", 
                    "Promote program to existing customers"
                ],
                success_metrics=["Number of referrals", "Customer acquisition cost", "Program participation rate"]
            ))
        
        # Operational efficiency
        recommendations.append(BusinessRecommendation(
            id=f"fallback_{uuid.uuid4().hex[:8]}",
            title="Optimize Scheduling System",
            description="Implement automated scheduling to reduce no-shows and maximize bookings.",
            category=RecommendationCategory.OPERATIONAL_EFFICIENCY,
            priority=RecommendationPriority.MEDIUM,
            generated_by="fallback_system",
            confidence_score=0.65,
            estimated_impact={"time_savings_hours_per_week": 5, "no_show_reduction": 0.20},
            action_steps=[
                "Research online booking platforms",
                "Implement automated reminder system",
                "Train staff on new scheduling processes"
            ],
            success_metrics=["Booking efficiency", "No-show rate", "Staff time savings"]
        ))
        
        return recommendations
    
    def _deduplicate_and_prioritize(self, recommendations: List[BusinessRecommendation]) -> List[BusinessRecommendation]:
        """Remove duplicates and prioritize recommendations"""
        
        # Group by title similarity to detect duplicates
        unique_recommendations = []
        seen_titles = set()
        
        for rec in recommendations:
            title_key = rec.title.lower().replace(' ', '_')
            if title_key not in seen_titles:
                unique_recommendations.append(rec)
                seen_titles.add(title_key)
        
        # Sort by priority and confidence
        priority_weights = {
            RecommendationPriority.CRITICAL: 4,
            RecommendationPriority.HIGH: 3,
            RecommendationPriority.MEDIUM: 2,
            RecommendationPriority.LOW: 1
        }
        
        unique_recommendations.sort(
            key=lambda r: (priority_weights.get(r.priority, 0), r.confidence_score),
            reverse=True
        )
        
        return unique_recommendations
    
    def _calculate_suite_metrics(self, suite: RecommendationSuite) -> RecommendationSuite:
        """Calculate suite-level metrics and summaries"""
        
        total_revenue_impact = 0
        total_cost_savings = 0
        priority_counts = defaultdict(int)
        category_counts = defaultdict(int)
        
        for rec in suite.recommendations:
            # Calculate financial impact
            impact = rec.estimated_impact
            if isinstance(impact, dict):
                total_revenue_impact += impact.get('revenue_increase', 0)
                total_cost_savings += impact.get('cost_savings', 0)
            
            # Count priorities and categories
            priority_counts[rec.priority.value] += 1
            category_counts[rec.category.value] += 1
        
        suite.total_revenue_impact = total_revenue_impact
        suite.total_cost_savings = total_cost_savings
        suite.priority_summary = dict(priority_counts)
        suite.category_summary = dict(category_counts)
        
        return suite
    
    def _generate_implementation_roadmap(self, recommendations: List[BusinessRecommendation]) -> List[Dict[str, Any]]:
        """Generate implementation roadmap based on priority and dependencies"""
        
        roadmap = []
        
        # Group by implementation effort and time
        quick_wins = [r for r in recommendations if r.implementation_effort == "low"]
        medium_efforts = [r for r in recommendations if r.implementation_effort == "medium"]
        high_efforts = [r for r in recommendations if r.implementation_effort == "high"]
        
        # Phase 1: Quick wins (0-2 weeks)
        if quick_wins:
            roadmap.append({
                "phase": 1,
                "name": "Quick Wins",
                "timeframe": "0-2 weeks",
                "recommendations": [{"id": r.id, "title": r.title} for r in quick_wins[:3]],
                "focus": "Low-effort, high-impact improvements"
            })
        
        # Phase 2: Medium efforts (2-8 weeks)
        if medium_efforts:
            roadmap.append({
                "phase": 2,
                "name": "Strategic Improvements",
                "timeframe": "2-8 weeks", 
                "recommendations": [{"id": r.id, "title": r.title} for r in medium_efforts[:3]],
                "focus": "Moderate investment with significant returns"
            })
        
        # Phase 3: High efforts (2-6 months)
        if high_efforts:
            roadmap.append({
                "phase": 3,
                "name": "Transformational Changes",
                "timeframe": "2-6 months",
                "recommendations": [{"id": r.id, "title": r.title} for r in high_efforts[:2]],
                "focus": "Major initiatives for long-term growth"
            })
        
        return roadmap
    
    async def _save_recommendation_suite(self, suite: RecommendationSuite) -> bool:
        """Save recommendation suite to database"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Save suite
                conn.execute('''
                    INSERT OR REPLACE INTO recommendation_suites 
                    (id, business_name, generated_at, total_revenue_impact, total_cost_savings,
                     recommendations_data, implementation_roadmap, priority_summary, category_summary)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    suite.id,
                    suite.business_name,
                    suite.generated_at,
                    suite.total_revenue_impact,
                    suite.total_cost_savings,
                    json.dumps([asdict(r) for r in suite.recommendations]),
                    json.dumps(suite.implementation_roadmap),
                    json.dumps(suite.priority_summary),
                    json.dumps(suite.category_summary)
                ))
                
                # Save individual recommendations
                for rec in suite.recommendations:
                    conn.execute('''
                        INSERT OR REPLACE INTO recommendations
                        (id, suite_id, title, description, category, priority, status,
                         estimated_impact, implementation_effort, implementation_time, roi_estimate,
                         prerequisites, action_steps, success_metrics, created_at, updated_at,
                         generated_by, confidence_score, business_context, implementation_notes,
                         completion_percentage, assigned_to)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        rec.id, suite.id, rec.title, rec.description,
                        rec.category.value, rec.priority.value, rec.status.value,
                        json.dumps(rec.estimated_impact), rec.implementation_effort, rec.implementation_time,
                        rec.roi_estimate, json.dumps(rec.prerequisites), json.dumps(rec.action_steps),
                        json.dumps(rec.success_metrics), rec.created_at, rec.updated_at,
                        rec.generated_by, rec.confidence_score, json.dumps(rec.business_context),
                        json.dumps(rec.implementation_notes), rec.completion_percentage, rec.assigned_to
                    ))
                
                conn.commit()
                logger.info(f"✅ Saved recommendation suite {suite.id} to database")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to save recommendation suite: {e}")
            return False
    
    # Utility methods for recommendation processing
    def _build_business_analysis_query(self, context: Dict[str, Any]) -> str:
        """Build query for agent analysis"""
        return f"""Analyze this barbershop business and provide strategic recommendations:
        
        Business Metrics:
        - Monthly Revenue: ${context.get('monthly_revenue', 0):,.2f}
        - Total Customers: {context.get('customer_count', 0):,}
        - Average Service Price: ${context.get('average_service_price', 0):.2f}
        - Revenue Growth: {context.get('revenue_growth', 0):+.1f}%
        
        What are the top 3-5 actionable recommendations to improve this business?"""
    
    def _extract_recommendation_title(self, recommendation: str) -> str:
        """Extract title from recommendation text"""
        # Simple extraction - take first sentence or up to 60 chars
        title = recommendation.split('.')[0][:60]
        return title if title else "Business Improvement Recommendation"
    
    def _categorize_recommendation(self, recommendation: str) -> RecommendationCategory:
        """Categorize recommendation based on content"""
        rec_lower = recommendation.lower()
        
        if any(word in rec_lower for word in ['revenue', 'price', 'pricing', 'sales', 'income']):
            return RecommendationCategory.REVENUE_OPTIMIZATION
        elif any(word in rec_lower for word in ['customer', 'marketing', 'promotion', 'advertising']):
            return RecommendationCategory.CUSTOMER_ACQUISITION
        elif any(word in rec_lower for word in ['cost', 'expense', 'save', 'reduce', 'efficiency']):
            return RecommendationCategory.COST_MANAGEMENT
        elif any(word in rec_lower for word in ['staff', 'employee', 'productivity', 'training']):
            return RecommendationCategory.STAFF_PRODUCTIVITY
        else:
            return RecommendationCategory.OPERATIONAL_EFFICIENCY
    
    def _prioritize_recommendation(self, recommendation: str, context: Dict[str, Any]) -> RecommendationPriority:
        """Determine recommendation priority based on business context"""
        rec_lower = recommendation.lower()
        monthly_revenue = context.get('monthly_revenue', 0)
        
        # High priority for low revenue businesses
        if monthly_revenue < 5000 and any(word in rec_lower for word in ['revenue', 'income', 'sales']):
            return RecommendationPriority.HIGH
        
        # Critical priority for urgent issues
        if any(word in rec_lower for word in ['critical', 'urgent', 'immediately', 'asap']):
            return RecommendationPriority.CRITICAL
        
        # Medium priority by default
        return RecommendationPriority.MEDIUM
    
    def _extract_action_steps(self, recommendation: str) -> List[str]:
        """Extract action steps from recommendation text"""
        # Simple extraction - look for numbered points or bullet points
        steps = []
        lines = recommendation.split('\n')
        for line in lines:
            if any(marker in line for marker in ['1.', '2.', '3.', '-', '*', '•']):
                steps.append(line.strip())
        
        # If no steps found, create generic steps
        if not steps:
            steps = [
                "Research and plan implementation",
                "Execute the recommendation",
                "Monitor results and adjust as needed"
            ]
        
        return steps[:5]  # Limit to 5 steps
    
    def _extract_success_metrics(self, recommendation: str) -> List[str]:
        """Extract success metrics from recommendation text"""
        rec_lower = recommendation.lower()
        metrics = []
        
        if 'revenue' in rec_lower:
            metrics.append("Monthly revenue increase")
        if 'customer' in rec_lower:
            metrics.append("Customer acquisition rate")
        if 'efficiency' in rec_lower:
            metrics.append("Operational efficiency improvement")
        if 'cost' in rec_lower:
            metrics.append("Cost reduction percentage")
        
        # Default metrics if none found
        if not metrics:
            metrics = ["ROI measurement", "Goal achievement rate"]
        
        return metrics
    
    def _estimate_recommendation_impact(self, recommendation: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Estimate financial impact of recommendation"""
        monthly_revenue = context.get('monthly_revenue', 0)
        rec_lower = recommendation.lower()
        
        impact = {}
        
        if 'price' in rec_lower or 'pricing' in rec_lower:
            impact['revenue_increase'] = monthly_revenue * 0.10  # 10% increase
        elif 'customer' in rec_lower:
            impact['revenue_increase'] = monthly_revenue * 0.15  # 15% increase
        elif 'cost' in rec_lower or 'efficiency' in rec_lower:
            impact['cost_savings'] = monthly_revenue * 0.05  # 5% cost savings
            
        return impact
    
    def _parse_ai_response_to_recommendations(self, response: str, context: Dict[str, Any]) -> List[BusinessRecommendation]:
        """Parse AI response text into structured recommendations"""
        recommendations = []
        
        # Simple parsing - split by common delimiters
        sections = response.split('\n\n')
        
        for i, section in enumerate(sections[:5]):  # Limit to 5 recommendations
            if len(section.strip()) > 20:  # Minimum content length
                rec = BusinessRecommendation(
                    id=f"ai_orchestrator_{uuid.uuid4().hex[:8]}",
                    title=self._extract_recommendation_title(section),
                    description=section.strip(),
                    category=self._categorize_recommendation(section),
                    priority=self._prioritize_recommendation(section, context),
                    generated_by="ai_orchestrator",
                    confidence_score=0.8,
                    business_context=context,
                    estimated_impact=self._estimate_recommendation_impact(section, context)
                )
                recommendations.append(rec)
        
        return recommendations
    
    async def _generate_fallback_suite(self, business_context: Dict[str, Any]) -> RecommendationSuite:
        """Generate basic recommendation suite when AI services fail"""
        fallback_recommendations = self._generate_fallback_recommendations(business_context)
        
        suite = RecommendationSuite(
            id=f"fallback_{uuid.uuid4().hex[:12]}",
            business_name=business_context.get('business_name', 'Your Business'),
            generated_at=datetime.now(),
            recommendations=fallback_recommendations
        )
        
        suite = self._calculate_suite_metrics(suite)
        suite.implementation_roadmap = self._generate_implementation_roadmap(suite.recommendations)
        
        return suite

# Global service instance
unified_business_recommendations = UnifiedBusinessRecommendationsService()

# Convenience functions for backward compatibility
async def generate_business_recommendations(business_context: Dict[str, Any]) -> RecommendationSuite:
    """Generate business recommendations using the unified service"""
    return await unified_business_recommendations.generate_comprehensive_recommendations(business_context)

def get_recommendations_service() -> UnifiedBusinessRecommendationsService:
    """Get the unified recommendations service instance"""
    return unified_business_recommendations