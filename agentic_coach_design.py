#!/usr/bin/env python3
"""
Agentic Barbershop Business Coach - Single Intelligent Agent
Replaces 7 separate agents with one context-aware, learning system
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import asyncio
from dataclasses import dataclass
from enum import Enum

class BusinessDomain(Enum):
    FINANCIAL = "financial"
    OPERATIONS = "operations"
    MARKETING = "marketing"
    GROWTH = "growth"
    STAFF = "staff"
    CUSTOMER_EXPERIENCE = "customer_experience"
    STRATEGIC = "strategic"

class BusinessStage(Enum):
    STARTUP = "startup"  # 0-1 years
    GROWTH = "growth"    # 1-3 years
    ESTABLISHED = "established"  # 3-7 years
    ENTERPRISE = "enterprise"    # 7+ years or multi-location

@dataclass
class ShopContext:
    """Real barbershop data for personalized recommendations"""
    shop_id: str
    owner_name: str
    shop_name: str
    business_stage: BusinessStage
    monthly_revenue: Optional[float] = None
    monthly_appointments: Optional[int] = None
    staff_count: Optional[int] = None
    location_type: Optional[str] = None  # urban, suburban, rural
    avg_service_price: Optional[float] = None
    customer_retention_rate: Optional[float] = None
    peak_hours: Optional[List[str]] = None
    slow_periods: Optional[List[str]] = None
    competitor_count: Optional[int] = None
    review_rating: Optional[float] = None
    years_in_business: Optional[int] = None

@dataclass
class ConversationContext:
    """Maintains conversation history and context"""
    session_id: str
    user_id: str
    shop_context: ShopContext
    conversation_history: List[Dict[str, Any]]
    current_focus: Optional[BusinessDomain] = None
    ongoing_projects: List[str] = None
    last_recommendations: List[Dict[str, Any]] = None
    goals: List[str] = None
    pain_points: List[str] = None

class AgenticBusinessCoach:
    """
    Single intelligent agent that understands business context,
    maintains conversation memory, and provides increasingly 
    sophisticated recommendations as it learns more data.
    """
    
    def __init__(self):
        self.knowledge_base = self._initialize_knowledge_base()
        self.conversation_contexts = {}  # session_id -> ConversationContext
        self.learning_data = {}  # Accumulated insights across all shops
        
    def _initialize_knowledge_base(self) -> Dict[str, Any]:
        """Initialize comprehensive business knowledge base"""
        return {
            "revenue_optimization": {
                "pricing_strategies": {
                    "dynamic_pricing": {
                        "description": "Adjust prices based on demand, time, and customer segments",
                        "impact_range": "15-35% revenue increase",
                        "implementation_time": "1-2 weeks",
                        "success_factors": ["demand_analysis", "customer_segmentation", "competitive_positioning"]
                    },
                    "service_bundling": {
                        "description": "Package complementary services for higher average ticket",
                        "impact_range": "20-40% avg ticket increase", 
                        "implementation_time": "1 week",
                        "success_factors": ["service_synergy", "customer_education", "staff_training"]
                    },
                    "premium_positioning": {
                        "description": "Position as premium brand to justify higher prices",
                        "impact_range": "30-60% pricing power increase",
                        "implementation_time": "4-8 weeks",
                        "success_factors": ["brand_development", "service_excellence", "customer_experience"]
                    }
                },
                "cost_optimization": {
                    "supply_management": {
                        "impact_range": "5-15% cost reduction",
                        "strategies": ["bulk_purchasing", "vendor_negotiation", "inventory_optimization"]
                    },
                    "operational_efficiency": {
                        "impact_range": "10-25% efficiency gain",
                        "strategies": ["scheduling_optimization", "workflow_improvement", "technology_integration"]
                    }
                }
            },
            "customer_acquisition": {
                "digital_marketing": {
                    "google_my_business": {
                        "impact": "25-40% more local discovery",
                        "strategies": ["review_management", "post_optimization", "photo_updates"]
                    },
                    "social_media": {
                        "impact": "30-50% engagement increase",
                        "platforms": ["instagram", "tiktok", "facebook"],
                        "content_types": ["before_after", "process_videos", "customer_stories"]
                    },
                    "referral_programs": {
                        "impact": "2.3x customer acquisition rate",
                        "strategies": ["incentive_design", "tracking_system", "automation"]
                    }
                },
                "retention_strategies": {
                    "loyalty_programs": {
                        "impact": "60% lifetime value increase",
                        "types": ["points_based", "tier_based", "subscription_model"]
                    },
                    "personalization": {
                        "impact": "45% retention improvement",
                        "strategies": ["preference_tracking", "custom_recommendations", "personal_touches"]
                    }
                }
            },
            "operations_optimization": {
                "scheduling": {
                    "revenue_optimization": {
                        "impact": "15-25% capacity utilization improvement",
                        "strategies": ["peak_hour_pricing", "buffer_time_optimization", "no_show_management"]
                    },
                    "staff_efficiency": {
                        "impact": "20-30% productivity increase",
                        "strategies": ["skill_based_assignment", "workflow_standardization", "break_optimization"]
                    }
                },
                "inventory_management": {
                    "cost_reduction": {
                        "impact": "10-20% inventory cost savings",
                        "strategies": ["demand_forecasting", "automated_reordering", "waste_reduction"]
                    }
                }
            },
            "growth_strategies": {
                "service_expansion": {
                    "impact": "25-45% revenue increase",
                    "options": ["complementary_services", "premium_treatments", "retail_products"]
                },
                "location_expansion": {
                    "franchise_model": {
                        "success_rate": "75% vs 45% traditional expansion",
                        "requirements": ["systematized_operations", "proven_profitability", "replicable_training"]
                    },
                    "multi_location": {
                        "success_factors": ["management_systems", "brand_consistency", "operational_standards"]
                    }
                }
            },
            "staff_management": {
                "hiring": {
                    "success_indicators": ["cultural_fit", "skill_assessment", "growth_potential"],
                    "retention_strategies": ["competitive_compensation", "growth_opportunities", "positive_culture"]
                },
                "training": {
                    "technical_skills": ["cutting_techniques", "customer_service", "product_knowledge"],
                    "business_skills": ["upselling", "scheduling", "client_relations"]
                },
                "performance_management": {
                    "metrics": ["customer_satisfaction", "revenue_per_hour", "retention_rate"],
                    "improvement_strategies": ["coaching", "incentives", "skill_development"]
                }
            }
        }
    
    async def analyze_and_respond(self, 
                                 user_message: str, 
                                 session_id: str, 
                                 shop_context: ShopContext) -> Dict[str, Any]:
        """
        Main agentic reasoning engine that:
        1. Analyzes the business question in full context
        2. Determines the best approach across all domains
        3. Provides personalized, data-driven recommendations
        4. Learns from the interaction
        """
        
        # Get or create conversation context
        context = self._get_conversation_context(session_id, shop_context)
        
        # Analyze the message for intent and domain
        analysis = await self._analyze_message(user_message, context)
        
        # Generate contextual response using RAG + business intelligence
        response = await self._generate_intelligent_response(analysis, context)
        
        # Update conversation context and learning data
        self._update_context_and_learning(context, user_message, response)
        
        return response
    
    def _get_conversation_context(self, session_id: str, shop_context: ShopContext) -> ConversationContext:
        """Get or create conversation context with memory"""
        if session_id not in self.conversation_contexts:
            self.conversation_contexts[session_id] = ConversationContext(
                session_id=session_id,
                user_id=shop_context.shop_id,
                shop_context=shop_context,
                conversation_history=[],
                ongoing_projects=[],
                goals=[],
                pain_points=[]
            )
        return self.conversation_contexts[session_id]
    
    async def _analyze_message(self, message: str, context: ConversationContext) -> Dict[str, Any]:
        """
        Intelligent message analysis that understands:
        - Business intent and urgency
        - Relevant domains and cross-domain connections
        - Context from previous conversations
        - Shop-specific circumstances
        """
        
        # Intent classification (would use NLP in production)
        intents = self._classify_business_intent(message.lower())
        
        # Domain routing (can span multiple domains)
        relevant_domains = self._identify_relevant_domains(message, intents)
        
        # Context analysis
        context_factors = self._analyze_context_factors(context)
        
        # Urgency and priority assessment
        urgency = self._assess_urgency(message, context)
        
        return {
            "original_message": message,
            "intents": intents,
            "relevant_domains": relevant_domains,
            "context_factors": context_factors,
            "urgency": urgency,
            "requires_data": self._requires_real_data(intents),
            "followup_potential": self._assess_followup_potential(intents, context)
        }
    
    def _classify_business_intent(self, message: str) -> List[str]:
        """Classify business intents from the message"""
        intents = []
        
        # Revenue-related intents
        if any(word in message for word in ["revenue", "money", "profit", "income", "sales", "pricing"]):
            intents.append("revenue_optimization")
        
        # Customer-related intents
        if any(word in message for word in ["customer", "client", "retention", "acquisition", "marketing"]):
            intents.append("customer_management")
            
        # Operations-related intents
        if any(word in message for word in ["schedule", "efficiency", "operations", "workflow", "booking"]):
            intents.append("operations_optimization")
        
        # Growth-related intents
        if any(word in message for word in ["grow", "expand", "scale", "new location", "franchise"]):
            intents.append("growth_planning")
        
        # Staff-related intents
        if any(word in message for word in ["staff", "employee", "barber", "hiring", "training"]):
            intents.append("staff_management")
        
        # Problem-solving intents
        if any(word in message for word in ["problem", "issue", "struggling", "help", "stuck"]):
            intents.append("problem_solving")
        
        # Strategic intents
        if any(word in message for word in ["strategy", "plan", "future", "goals", "vision"]):
            intents.append("strategic_planning")
        
        return intents if intents else ["general_business_advice"]
    
    def _identify_relevant_domains(self, message: str, intents: List[str]) -> List[BusinessDomain]:
        """Map intents to business domains (can be multiple)"""
        domain_mapping = {
            "revenue_optimization": [BusinessDomain.FINANCIAL],
            "customer_management": [BusinessDomain.MARKETING, BusinessDomain.CUSTOMER_EXPERIENCE],
            "operations_optimization": [BusinessDomain.OPERATIONS],
            "growth_planning": [BusinessDomain.GROWTH, BusinessDomain.STRATEGIC],
            "staff_management": [BusinessDomain.STAFF],
            "problem_solving": [BusinessDomain.OPERATIONS, BusinessDomain.FINANCIAL],
            "strategic_planning": [BusinessDomain.STRATEGIC, BusinessDomain.GROWTH]
        }
        
        domains = []
        for intent in intents:
            domains.extend(domain_mapping.get(intent, [BusinessDomain.STRATEGIC]))
        
        return list(set(domains))  # Remove duplicates
    
    def _analyze_context_factors(self, context: ConversationContext) -> Dict[str, Any]:
        """Analyze contextual factors that influence recommendations"""
        shop = context.shop_context
        
        return {
            "business_maturity": shop.business_stage.value,
            "size_category": self._categorize_shop_size(shop),
            "financial_health": self._assess_financial_health(shop),
            "growth_potential": self._assess_growth_potential(shop),
            "operational_sophistication": self._assess_operational_sophistication(shop),
            "market_position": self._assess_market_position(shop),
            "conversation_history": len(context.conversation_history),
            "ongoing_projects": context.ongoing_projects,
            "previous_goals": context.goals
        }
    
    def _categorize_shop_size(self, shop: ShopContext) -> str:
        """Categorize shop size based on available metrics"""
        if shop.staff_count and shop.monthly_revenue:
            if shop.staff_count <= 2 and shop.monthly_revenue < 15000:
                return "small"
            elif shop.staff_count <= 5 and shop.monthly_revenue < 40000:
                return "medium"
            else:
                return "large"
        return "unknown"
    
    def _assess_financial_health(self, shop: ShopContext) -> str:
        """Assess financial health based on available data"""
        # Would use more sophisticated analysis with real data
        if shop.monthly_revenue and shop.staff_count:
            revenue_per_staff = shop.monthly_revenue / shop.staff_count
            if revenue_per_staff > 8000:
                return "healthy"
            elif revenue_per_staff > 5000:
                return "moderate"
            else:
                return "needs_attention"
        return "insufficient_data"
    
    def _assess_growth_potential(self, shop: ShopContext) -> str:
        """Assess growth potential based on context"""
        factors = []
        
        if shop.customer_retention_rate and shop.customer_retention_rate > 0.8:
            factors.append("high_retention")
        
        if shop.review_rating and shop.review_rating > 4.5:
            factors.append("excellent_reputation")
        
        if shop.business_stage in [BusinessStage.GROWTH, BusinessStage.ESTABLISHED]:
            factors.append("stable_foundation")
        
        if len(factors) >= 2:
            return "high"
        elif len(factors) == 1:
            return "moderate"
        else:
            return "developing"
    
    def _assess_operational_sophistication(self, shop: ShopContext) -> str:
        """Assess how sophisticated the operations are"""
        # This would be enhanced with real operational data
        if shop.business_stage == BusinessStage.ENTERPRISE:
            return "advanced"
        elif shop.business_stage == BusinessStage.ESTABLISHED:
            return "intermediate"
        else:
            return "basic"
    
    def _assess_market_position(self, shop: ShopContext) -> str:
        """Assess competitive market position"""
        if shop.avg_service_price and shop.review_rating:
            # Simplified assessment - would use market data in production
            if shop.avg_service_price > 45 and shop.review_rating > 4.5:
                return "premium"
            elif shop.avg_service_price > 30 and shop.review_rating > 4.0:
                return "competitive"
            else:
                return "value"
        return "unknown"
    
    def _assess_urgency(self, message: str, context: ConversationContext) -> str:
        """Assess urgency of the business need"""
        urgent_indicators = ["urgent", "emergency", "asap", "immediately", "crisis", "failing", "desperate"]
        moderate_indicators = ["soon", "quickly", "problem", "issue", "struggling"]
        
        message_lower = message.lower()
        
        if any(indicator in message_lower for indicator in urgent_indicators):
            return "high"
        elif any(indicator in message_lower for indicator in moderate_indicators):
            return "medium"
        else:
            return "low"
    
    def _requires_real_data(self, intents: List[str]) -> bool:
        """Determine if this query would benefit from real shop data"""
        data_dependent_intents = [
            "revenue_optimization", 
            "operations_optimization", 
            "problem_solving"
        ]
        return any(intent in data_dependent_intents for intent in intents)
    
    def _assess_followup_potential(self, intents: List[str], context: ConversationContext) -> str:
        """Assess potential for followup conversations"""
        complex_intents = ["growth_planning", "strategic_planning", "problem_solving"]
        
        if any(intent in complex_intents for intent in intents):
            return "high"
        elif len(context.conversation_history) > 0:
            return "medium"
        else:
            return "low"
    
    async def _generate_intelligent_response(self, 
                                           analysis: Dict[str, Any], 
                                           context: ConversationContext) -> Dict[str, Any]:
        """
        Generate intelligent, contextual response using:
        1. Business knowledge base
        2. Shop-specific context
        3. Conversation history
        4. Cross-domain reasoning
        """
        
        # Select most relevant knowledge areas
        knowledge_areas = self._select_knowledge_areas(analysis["relevant_domains"])
        
        # Generate personalized recommendations
        recommendations = self._generate_personalized_recommendations(
            analysis, context, knowledge_areas
        )
        
        # Create contextual response
        response_text = self._craft_contextual_response(analysis, context, recommendations)
        
        # Add followup suggestions
        followup_suggestions = self._generate_followup_suggestions(analysis, context)
        
        # Calculate confidence based on available data and context
        confidence = self._calculate_response_confidence(analysis, context)
        
        return {
            "response": response_text,
            "recommendations": recommendations,
            "followup_suggestions": followup_suggestions,
            "confidence": confidence,
            "domains_addressed": [domain.value for domain in analysis["relevant_domains"]],
            "requires_data": analysis["requires_data"],
            "urgency": analysis["urgency"],
            "session_id": context.session_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def _select_knowledge_areas(self, domains: List[BusinessDomain]) -> Dict[str, Any]:
        """Select relevant knowledge areas from the knowledge base"""
        knowledge_areas = {}
        
        for domain in domains:
            if domain == BusinessDomain.FINANCIAL:
                knowledge_areas.update(self.knowledge_base["revenue_optimization"])
            elif domain == BusinessDomain.MARKETING:
                knowledge_areas.update(self.knowledge_base["customer_acquisition"])
            elif domain == BusinessDomain.OPERATIONS:
                knowledge_areas.update(self.knowledge_base["operations_optimization"])
            elif domain == BusinessDomain.GROWTH:
                knowledge_areas.update(self.knowledge_base["growth_strategies"])
            elif domain == BusinessDomain.STAFF:
                knowledge_areas.update(self.knowledge_base["staff_management"])
        
        return knowledge_areas
    
    def _generate_personalized_recommendations(self, 
                                             analysis: Dict[str, Any],
                                             context: ConversationContext,
                                             knowledge_areas: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate personalized recommendations based on shop context"""
        recommendations = []
        shop = context.shop_context
        
        # Example: Revenue optimization for different business stages
        if BusinessDomain.FINANCIAL in analysis["relevant_domains"]:
            if shop.business_stage == BusinessStage.STARTUP:
                recommendations.append({
                    "id": "startup_pricing_001",
                    "type": "pricing",
                    "priority": "high",
                    "title": "Establish Competitive Pricing Foundation",
                    "description": f"Research local market rates and position {shop.shop_name} competitively while building reputation",
                    "estimated_impact": "+$1,200-2,400 monthly revenue",
                    "confidence": 0.85,
                    "time_to_implement": "1-2 weeks",
                    "personalization": f"Based on your {shop.business_stage.value} stage and {shop.location_type or 'local'} market"
                })
            elif shop.business_stage == BusinessStage.GROWTH:
                recommendations.append({
                    "id": "growth_pricing_001", 
                    "type": "pricing",
                    "priority": "high",
                    "title": "Implement Dynamic Pricing Strategy",
                    "description": f"Optimize pricing for {shop.shop_name} based on demand patterns and customer segments",
                    "estimated_impact": "+$1,800-3,200 monthly revenue",
                    "confidence": 0.92,
                    "time_to_implement": "2-3 weeks",
                    "personalization": f"Your {shop.monthly_appointments or 'booking'} volume supports tiered pricing"
                })
        
        # Add operations recommendations
        if BusinessDomain.OPERATIONS in analysis["relevant_domains"]:
            if shop.staff_count and shop.staff_count > 1:
                recommendations.append({
                    "id": "ops_scheduling_001",
                    "type": "scheduling",
                    "priority": "medium",
                    "title": "Optimize Multi-Barber Scheduling",
                    "description": f"Implement skill-based scheduling for your {shop.staff_count} barbers to maximize efficiency",
                    "estimated_impact": "+15-25% capacity utilization",
                    "confidence": 0.88,
                    "time_to_implement": "1 week",
                    "personalization": "Tailored for multi-barber operations"
                })
        
        return recommendations
    
    def _craft_contextual_response(self, 
                                 analysis: Dict[str, Any],
                                 context: ConversationContext, 
                                 recommendations: List[Dict[str, Any]]) -> str:
        """Craft a personalized, contextual response"""
        shop = context.shop_context
        
        # Personalize greeting based on conversation history
        if len(context.conversation_history) == 0:
            greeting = f"Hello {shop.owner_name}! I'm your AI business coach for {shop.shop_name}."
        else:
            greeting = f"Great to continue our conversation about {shop.shop_name}!"
        
        # Address the specific question with context
        main_response = self._generate_main_response_text(analysis, context)
        
        # Add personalized insights
        insights = self._generate_personalized_insights(context)
        
        response_parts = [greeting, main_response]
        if insights:
            response_parts.append(insights)
        
        return " ".join(response_parts)
    
    def _generate_main_response_text(self, analysis: Dict[str, Any], context: ConversationContext) -> str:
        """Generate the main response text addressing the user's question"""
        # This would be much more sophisticated with real NLG
        domains = analysis["relevant_domains"]
        shop = context.shop_context
        
        if BusinessDomain.FINANCIAL in domains:
            return f"Based on my analysis of barbershop revenue optimization strategies and {shop.shop_name}'s {shop.business_stage.value} stage, I see several opportunities to increase your profitability."
        
        elif BusinessDomain.GROWTH in domains:
            return f"For {shop.shop_name}'s growth trajectory, I've identified proven scaling strategies that align with your current {shop.business_stage.value} stage and market position."
        
        elif BusinessDomain.OPERATIONS in domains:
            return f"Looking at operational efficiency for {shop.shop_name}, there are several workflow optimizations that can improve your daily operations and customer experience."
        
        else:
            return f"I've analyzed your question in the context of {shop.shop_name}'s business situation and identified actionable strategies tailored to your needs."
    
    def _generate_personalized_insights(self, context: ConversationContext) -> str:
        """Generate personalized insights based on shop context"""
        shop = context.shop_context
        insights = []
        
        if shop.monthly_revenue and shop.staff_count:
            revenue_per_staff = shop.monthly_revenue / shop.staff_count
            if revenue_per_staff > 8000:
                insights.append(f"Your revenue per staff member (${revenue_per_staff:,.0f}) indicates strong performance.")
        
        if shop.review_rating and shop.review_rating > 4.5:
            insights.append(f"Your excellent {shop.review_rating} rating gives you leverage for premium positioning.")
        
        return " ".join(insights) if insights else ""
    
    def _generate_followup_suggestions(self, 
                                     analysis: Dict[str, Any], 
                                     context: ConversationContext) -> List[str]:
        """Generate intelligent followup suggestions"""
        suggestions = []
        
        if analysis["urgency"] == "high":
            suggestions.append("Would you like me to prioritize immediate action items?")
        
        if analysis["requires_data"]:
            suggestions.append("I could provide more specific recommendations if you share your booking or revenue data.")
        
        if BusinessDomain.FINANCIAL in analysis["relevant_domains"]:
            suggestions.append("Should we explore cost optimization strategies as well?")
        
        if len(context.conversation_history) > 2:
            suggestions.append("Ready to move forward with implementing any of our previous recommendations?")
        
        return suggestions[:3]  # Limit to 3 suggestions
    
    def _calculate_response_confidence(self, 
                                     analysis: Dict[str, Any], 
                                     context: ConversationContext) -> float:
        """Calculate confidence score based on available data and context"""
        base_confidence = 0.75
        
        # Increase confidence with more shop context
        if context.shop_context.monthly_revenue:
            base_confidence += 0.05
        if context.shop_context.staff_count:
            base_confidence += 0.05
        if context.shop_context.review_rating:
            base_confidence += 0.05
        
        # Increase confidence with conversation history
        if len(context.conversation_history) > 2:
            base_confidence += 0.05
        
        # Adjust based on business stage sophistication
        if context.shop_context.business_stage in [BusinessStage.ESTABLISHED, BusinessStage.ENTERPRISE]:
            base_confidence += 0.05
        
        return min(base_confidence, 0.95)
    
    def _update_context_and_learning(self, 
                                   context: ConversationContext, 
                                   user_message: str, 
                                   response: Dict[str, Any]):
        """Update conversation context and learning data"""
        
        # Update conversation history
        context.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "user_message": user_message,
            "agent_response": response["response"],
            "recommendations": response["recommendations"],
            "domains": response["domains_addressed"]
        })
        
        # Update ongoing projects based on recommendations
        for rec in response["recommendations"]:
            if rec["priority"] == "high":
                context.ongoing_projects.append(rec["title"])
        
        # Extract and store learning insights
        self._extract_learning_insights(context, user_message, response)
        
        # Limit conversation history to last 20 interactions
        if len(context.conversation_history) > 20:
            context.conversation_history = context.conversation_history[-20:]
    
    def _extract_learning_insights(self, 
                                 context: ConversationContext, 
                                 user_message: str, 
                                 response: Dict[str, Any]):
        """Extract insights for system-wide learning"""
        shop = context.shop_context
        
        # Store patterns for similar shops
        shop_profile = f"{shop.business_stage.value}_{shop.location_type or 'unknown'}"
        
        if shop_profile not in self.learning_data:
            self.learning_data[shop_profile] = {
                "common_questions": {},
                "successful_recommendations": {},
                "conversation_patterns": []
            }
        
        # Track common questions for this shop profile
        for domain in response["domains_addressed"]:
            if domain not in self.learning_data[shop_profile]["common_questions"]:
                self.learning_data[shop_profile]["common_questions"][domain] = 0
            self.learning_data[shop_profile]["common_questions"][domain] += 1
        
        # Track conversation patterns
        self.learning_data[shop_profile]["conversation_patterns"].append({
            "question_type": response["domains_addressed"],
            "urgency": response["urgency"],
            "confidence": response["confidence"],
            "timestamp": datetime.now().isoformat()
        })

# Usage example:
async def example_usage():
    coach = AgenticBusinessCoach()
    
    # Example shop context
    shop_context = ShopContext(
        shop_id="shop_001",
        owner_name="Mike",
        shop_name="Elite Cuts",
        business_stage=BusinessStage.GROWTH,
        monthly_revenue=25000.0,
        monthly_appointments=850,
        staff_count=3,
        location_type="urban",
        avg_service_price=35.0,
        customer_retention_rate=0.75,
        review_rating=4.6,
        years_in_business=3
    )
    
    # Example conversation
    response = await coach.analyze_and_respond(
        user_message="I want to increase my revenue but I'm not sure if I should raise prices or focus on getting more customers. What do you think?",
        session_id="session_001",
        shop_context=shop_context
    )
    
    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    asyncio.run(example_usage())