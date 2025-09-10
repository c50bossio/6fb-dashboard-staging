#!/usr/bin/env python3
"""
Customer Success Agent - Specialized AI agent for customer relationship management
Handles customer journey optimization, retention strategies, and satisfaction improvement
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base_agent import BaseAgent, TaskResult
from ..structured_outputs import (
    CustomerAnalysisResponse,
    CustomerJourneyMap,
    RetentionStrategy,
    SatisfactionReport
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CustomerSuccessAgent(BaseAgent):
    """
    Specialized agent for customer success and relationship management
    
    Capabilities:
    - Customer journey mapping and optimization
    - Satisfaction score tracking and improvement strategies
    - Retention program design and implementation
    - Customer feedback analysis and action planning
    - Loyalty program optimization
    - Churn prediction and prevention strategies
    - Customer segmentation and personalization
    - Service quality improvement recommendations
    """
    
    def __init__(self):
        super().__init__(
            agent_name="Customer Success Agent",
            agent_type="customer_success",
            model_preference="openai",
            default_model="gpt-4o-mini"
        )
        
        self.specializations = [
            "customer_journey_optimization",
            "retention_strategy_development",
            "satisfaction_improvement",
            "loyalty_program_design",
            "churn_prevention",
            "customer_segmentation",
            "feedback_analysis",
            "service_quality_enhancement",
            "personalization_strategies",
            "customer_lifecycle_management"
        ]
        
        logger.info(f"{self.agent_name} initialized with {len(self.specializations)} specializations")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for customer success analysis"""
        return """You are an expert Customer Success Agent specializing in customer relationship 
        management and satisfaction optimization for barbershop businesses.
        
        Your expertise includes:
        - Customer journey mapping and experience optimization
        - Customer satisfaction measurement and improvement strategies
        - Retention program design and churn prevention
        - Loyalty program development and optimization
        - Customer feedback analysis and actionable insights
        - Customer segmentation and personalized service strategies
        - Service quality enhancement and staff training recommendations
        - Customer lifecycle management and value maximization
        - Referral program design and word-of-mouth marketing
        - Customer communication and relationship building
        
        Provide customer success recommendations that are:
        - Data-driven with clear metrics and KPIs
        - Actionable with specific implementation steps
        - Personalized for different customer segments
        - Cost-effective and ROI-focused for small businesses
        - Scalable as the business grows
        - Focused on long-term relationship building
        
        Always include:
        - Customer satisfaction metrics and targets
        - Specific retention strategies with expected outcomes
        - Implementation timelines and resource requirements
        - Success measurement and tracking methods
        - Cost-benefit analysis of recommended programs
        """
    
    def get_specialized_capabilities(self) -> List[str]:
        """Return customer success specific capabilities"""
        return [
            "customer_satisfaction_analysis",
            "retention_rate_optimization",
            "customer_journey_mapping",
            "loyalty_program_design",
            "churn_prediction_modeling",
            "customer_segmentation_analysis",
            "feedback_sentiment_analysis",
            "service_quality_assessment",
            "personalization_strategy_development",
            "customer_lifetime_value_optimization",
            "referral_program_creation",
            "customer_communication_planning",
            "satisfaction_survey_design",
            "customer_onboarding_optimization",
            "win_back_campaign_development"
        ]
    
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process customer success analysis task"""
        start_time = time.time()
        
        try:
            message = task.get("message", "")
            context = task.get("context", {})
            structured_output_model = task.get("structured_output_model")
            
            logger.info(f"{self.agent_name} processing: {message[:50]}...")
            
            # Analyze task type and determine appropriate response
            task_type = self._determine_task_type(message, context)
            response = None
            tokens_used = 0
            
            if structured_output_model:
                # Generate structured response using the output service
                response = await self._generate_structured_response(
                    prompt=message,
                    output_model=structured_output_model,
                    system_prompt=self.get_system_prompt()
                )
                result_content = response
            else:
                # Generate detailed customer success analysis
                analysis_prompt = self._build_analysis_prompt(message, context, task_type)
                
                # Use LLM to generate response
                messages = [
                    {"role": "system", "content": self.get_system_prompt()},
                    {"role": "user", "content": analysis_prompt}
                ]
                
                response_content, tokens_used = await self._call_llm(messages)
                result_content = response_content
                
            execution_time = time.time() - start_time
            
            # Calculate confidence based on task type and context
            confidence = self._calculate_confidence(task_type, context)
            
            logger.info(f"{self.agent_name} completed analysis in {execution_time:.2f}s")
            
            return TaskResult(
                success=True,
                result=result_content,
                execution_time=execution_time,
                tokens_used=getattr(response, 'usage', {}).get('total_tokens', 0) if response and hasattr(response, 'usage') else tokens_used,
                confidence=confidence,
                metadata={
                    "task_type": task_type,
                    "specialization_used": self._get_relevant_specializations(task_type),
                    "analysis_focus": "customer_centric",
                    "recommendation_category": self._categorize_recommendations(task_type)
                }
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"{self.agent_name} task failed: {e}")
            
            return TaskResult(
                success=False,
                result=None,
                error=str(e),
                execution_time=execution_time,
                confidence=0.0
            )
    
    def _determine_task_type(self, message: str, context: Dict[str, Any]) -> str:
        """Determine the type of customer success task"""
        message_lower = message.lower()
        
        # Customer retention and churn
        if any(keyword in message_lower for keyword in [
            "retention", "churn", "leaving", "lost customers", "keep customers"
        ]):
            return "retention_analysis"
        
        # Customer satisfaction and feedback
        elif any(keyword in message_lower for keyword in [
            "satisfaction", "feedback", "reviews", "complaints", "survey", "rating"
        ]):
            return "satisfaction_analysis"
        
        # Customer journey and experience
        elif any(keyword in message_lower for keyword in [
            "journey", "experience", "onboarding", "touchpoint", "process"
        ]):
            return "journey_optimization"
        
        # Loyalty programs and rewards
        elif any(keyword in message_lower for keyword in [
            "loyalty", "reward", "program", "points", "membership", "vip"
        ]):
            return "loyalty_program_development"
        
        # Customer segmentation
        elif any(keyword in message_lower for keyword in [
            "segment", "group", "type", "persona", "demographic", "behavior"
        ]):
            return "customer_segmentation"
        
        # Referral and word-of-mouth
        elif any(keyword in message_lower for keyword in [
            "referral", "recommend", "word of mouth", "friends", "family"
        ]):
            return "referral_strategy"
        
        # Service quality and improvement
        elif any(keyword in message_lower for keyword in [
            "service quality", "improvement", "training", "staff", "service"
        ]):
            return "service_quality_enhancement"
        
        # Customer communication
        elif any(keyword in message_lower for keyword in [
            "communication", "message", "email", "sms", "contact", "follow-up"
        ]):
            return "communication_strategy"
        
        # Customer acquisition and onboarding
        elif any(keyword in message_lower for keyword in [
            "new customer", "onboard", "welcome", "first visit", "acquisition"
        ]):
            return "onboarding_optimization"
        
        else:
            return "general_customer_analysis"
    
    def _build_analysis_prompt(self, message: str, context: Dict[str, Any], task_type: str) -> str:
        """Build comprehensive analysis prompt based on task type"""
        
        base_prompt = f"""
        Customer Success Analysis Request: {message}
        
        Task Type: {task_type}
        
        Context Information:
        """
        
        # Add context information
        if context:
            base_prompt += f"\n- Business Context: {context}\n"
        
        # Add task-specific analysis requirements
        task_specific_prompts = {
            "retention_analysis": """
            Please provide a comprehensive customer retention analysis including:
            1. Customer churn analysis and identification of at-risk segments
            2. Root cause analysis for customer departures
            3. Retention strategy development with specific tactics
            4. Win-back campaign design for lost customers
            5. Loyalty incentives and retention program recommendations
            6. Customer lifetime value optimization strategies
            """,
            
            "satisfaction_analysis": """
            Please provide detailed customer satisfaction analysis including:
            1. Satisfaction metrics analysis and benchmark comparison
            2. Feedback sentiment analysis and common themes identification
            3. Service quality improvement recommendations
            4. Staff training and development priorities
            5. Customer complaint resolution process optimization
            6. Satisfaction measurement and tracking system design
            """,
            
            "journey_optimization": """
            Please provide customer journey optimization including:
            1. Current customer journey mapping and pain point identification
            2. Touchpoint optimization and experience enhancement
            3. Onboarding process improvement recommendations
            4. Service delivery workflow optimization
            5. Customer communication timing and channel optimization
            6. Digital experience and convenience improvements
            """,
            
            "loyalty_program_development": """
            Please provide loyalty program development including:
            1. Loyalty program structure and reward system design
            2. Customer tier and benefit level recommendations
            3. Point earning and redemption mechanics
            4. Program promotion and customer adoption strategies
            5. Technology platform requirements and integration
            6. Program success metrics and ROI tracking
            """,
            
            "customer_segmentation": """
            Please provide customer segmentation analysis including:
            1. Customer segment identification based on behavior and value
            2. Segment-specific needs and preferences analysis
            3. Personalized service and marketing strategies by segment
            4. Pricing and service tier recommendations
            5. Targeted retention and growth strategies
            6. Segment performance tracking and optimization
            """,
            
            "referral_strategy": """
            Please provide referral strategy development including:
            1. Referral program design and incentive structure
            2. Customer advocacy identification and activation
            3. Word-of-mouth marketing amplification tactics
            4. Social proof and testimonial collection strategies
            5. Referral tracking and reward fulfillment systems
            6. Program promotion and customer education
            """,
            
            "service_quality_enhancement": """
            Please provide service quality enhancement including:
            1. Current service quality assessment and gap analysis
            2. Staff training and skill development recommendations
            3. Service standard development and implementation
            4. Quality assurance and monitoring systems
            5. Customer feedback integration into service improvement
            6. Service recovery and complaint resolution procedures
            """,
            
            "communication_strategy": """
            Please provide customer communication strategy including:
            1. Communication channel optimization and customer preferences
            2. Automated messaging and follow-up sequence design
            3. Personalized communication based on customer segments
            4. Appointment reminders and confirmation optimization
            5. Post-service follow-up and feedback collection
            6. Emergency communication and service disruption protocols
            """,
            
            "onboarding_optimization": """
            Please provide customer onboarding optimization including:
            1. New customer welcome process design and automation
            2. First appointment experience optimization
            3. Customer education and expectation setting
            4. Service introduction and upselling opportunities
            5. Early relationship building and trust establishment
            6. Onboarding success measurement and improvement
            """
        }
        
        specific_prompt = task_specific_prompts.get(
            task_type, 
            """
            Please provide a comprehensive customer success analysis including:
            1. Current customer situation assessment
            2. Customer satisfaction and retention improvement opportunities
            3. Specific customer success strategies and tactics
            4. Implementation roadmap and resource requirements
            5. Success metrics and performance tracking methods
            """
        )
        
        base_prompt += specific_prompt
        
        base_prompt += """
        
        Please structure your response with:
        - Executive Summary (key insights and priorities)
        - Customer Analysis (current state and opportunities)
        - Strategic Recommendations (specific actions and tactics)
        - Implementation Plan (timeline and resource allocation)
        - Success Metrics (KPIs and measurement methods)
        - Expected Outcomes (benefits and ROI projections)
        """
        
        return base_prompt
    
    def _calculate_confidence(self, task_type: str, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on task complexity and available context"""
        base_confidence = 0.80
        
        # Adjust based on task type complexity
        task_complexity_modifiers = {
            "retention_analysis": 0.85,
            "satisfaction_analysis": 0.90,
            "journey_optimization": 0.85,
            "loyalty_program_development": 0.80,
            "customer_segmentation": 0.80,
            "referral_strategy": 0.85,
            "service_quality_enhancement": 0.90,
            "communication_strategy": 0.85,
            "onboarding_optimization": 0.85,
            "general_customer_analysis": 0.75
        }
        
        confidence = task_complexity_modifiers.get(task_type, base_confidence)
        
        # Adjust based on context availability
        if context:
            if len(context) >= 3:
                confidence += 0.05
            elif len(context) >= 1:
                confidence += 0.02
        else:
            confidence -= 0.05
        
        return min(confidence, 0.95)  # Cap at 95%
    
    def _get_relevant_specializations(self, task_type: str) -> List[str]:
        """Get relevant specializations for the task type"""
        specialization_mapping = {
            "retention_analysis": ["retention_strategy_development", "churn_prevention"],
            "satisfaction_analysis": ["satisfaction_improvement", "feedback_analysis"],
            "journey_optimization": ["customer_journey_optimization"],
            "loyalty_program_development": ["loyalty_program_design"],
            "customer_segmentation": ["customer_segmentation"],
            "referral_strategy": ["customer_lifecycle_management"],
            "service_quality_enhancement": ["service_quality_enhancement"],
            "communication_strategy": ["customer_lifecycle_management"],
            "onboarding_optimization": ["customer_journey_optimization"],
            "general_customer_analysis": ["satisfaction_improvement", "retention_strategy_development"]
        }
        
        return specialization_mapping.get(task_type, ["satisfaction_improvement"])
    
    def _categorize_recommendations(self, task_type: str) -> str:
        """Categorize the type of recommendations provided"""
        category_mapping = {
            "retention_analysis": "retention_strategies",
            "satisfaction_analysis": "satisfaction_improvement",
            "journey_optimization": "experience_enhancement",
            "loyalty_program_development": "loyalty_programs",
            "customer_segmentation": "personalization",
            "referral_strategy": "growth_strategies",
            "service_quality_enhancement": "service_improvement",
            "communication_strategy": "communication_optimization",
            "onboarding_optimization": "onboarding_enhancement",
            "general_customer_analysis": "comprehensive_customer_strategy"
        }
        
        return category_mapping.get(task_type, "general_recommendations")
    
    async def analyze_customer_satisfaction(self, satisfaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer satisfaction metrics and provide improvement recommendations"""
        try:
            analysis = {
                "satisfaction_score": self._calculate_satisfaction_score(satisfaction_data),
                "satisfaction_trends": self._analyze_satisfaction_trends(satisfaction_data),
                "improvement_opportunities": self._identify_improvement_opportunities(satisfaction_data),
                "action_recommendations": self._generate_satisfaction_recommendations(satisfaction_data)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Customer satisfaction analysis failed: {e}")
            return {"error": str(e)}
    
    async def develop_retention_strategy(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Develop comprehensive customer retention strategy"""
        try:
            strategy = {
                "churn_risk_analysis": self._analyze_churn_risk(customer_data),
                "retention_tactics": self._generate_retention_tactics(customer_data),
                "loyalty_recommendations": self._design_loyalty_program(customer_data),
                "implementation_plan": self._create_retention_implementation_plan(customer_data)
            }
            
            return strategy
            
        except Exception as e:
            logger.error(f"Retention strategy development failed: {e}")
            return {"error": str(e)}
    
    def _calculate_satisfaction_score(self, satisfaction_data: Dict[str, Any]) -> float:
        """Calculate overall customer satisfaction score"""
        ratings = satisfaction_data.get("ratings", [])
        if not ratings:
            return 0.0
        
        return sum(ratings) / len(ratings)
    
    def _analyze_satisfaction_trends(self, satisfaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze satisfaction trends over time"""
        return {
            "trend_direction": "improving",  # Mock data - would be calculated from real data
            "trend_strength": "moderate",
            "seasonal_patterns": "stable",
            "notable_changes": []
        }
    
    def _identify_improvement_opportunities(self, satisfaction_data: Dict[str, Any]) -> List[str]:
        """Identify specific areas for satisfaction improvement"""
        opportunities = []
        
        avg_score = self._calculate_satisfaction_score(satisfaction_data)
        
        if avg_score < 4.0:
            opportunities.append("Overall service quality needs significant improvement")
        elif avg_score < 4.5:
            opportunities.append("Service consistency could be improved")
        
        # Check specific service areas
        service_scores = satisfaction_data.get("service_scores", {})
        for service, score in service_scores.items():
            if score < 4.0:
                opportunities.append(f"{service} service needs improvement (score: {score})")
        
        return opportunities
    
    def _generate_satisfaction_recommendations(self, satisfaction_data: Dict[str, Any]) -> List[str]:
        """Generate specific recommendations to improve satisfaction"""
        recommendations = []
        
        avg_score = self._calculate_satisfaction_score(satisfaction_data)
        
        if avg_score < 4.0:
            recommendations.extend([
                "Implement comprehensive staff training program",
                "Establish service quality standards and monitoring",
                "Create customer feedback collection system",
                "Develop service recovery procedures for complaints"
            ])
        
        recommendations.extend([
            "Implement post-service follow-up communication",
            "Create customer loyalty rewards program",
            "Optimize appointment booking and reminder system",
            "Enhance facility cleanliness and ambiance"
        ])
        
        return recommendations
    
    def _analyze_churn_risk(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer churn risk"""
        return {
            "high_risk_customers": customer_data.get("inactive_customers", 0),
            "churn_predictors": [
                "Long time since last visit",
                "Declining visit frequency",
                "Low satisfaction scores",
                "Price sensitivity indicators"
            ],
            "at_risk_segments": ["Price-sensitive customers", "Infrequent visitors"],
            "churn_prevention_priority": "high"
        }
    
    def _generate_retention_tactics(self, customer_data: Dict[str, Any]) -> List[str]:
        """Generate specific customer retention tactics"""
        return [
            "Implement win-back email campaigns for inactive customers",
            "Create personalized service packages based on customer history",
            "Develop customer appreciation events and special offers",
            "Establish customer feedback loops and service recovery processes",
            "Implement loyalty points program with meaningful rewards",
            "Create VIP tier with exclusive benefits for high-value customers",
            "Send personalized birthday and anniversary offers",
            "Implement referral rewards program"
        ]
    
    def _design_loyalty_program(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Design customer loyalty program structure"""
        return {
            "program_type": "points_based",
            "earning_structure": {
                "per_visit": 10,
                "per_dollar": 1,
                "referral_bonus": 50
            },
            "reward_tiers": {
                "bronze": {"threshold": 100, "benefits": ["5% discount"]},
                "silver": {"threshold": 300, "benefits": ["10% discount", "priority booking"]},
                "gold": {"threshold": 500, "benefits": ["15% discount", "free services"]}
            },
            "special_rewards": [
                "Free haircut after 10 visits",
                "Birthday month 20% discount",
                "Referral bonus rewards"
            ]
        }
    
    def _create_retention_implementation_plan(self, customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create implementation plan for retention strategies"""
        return {
            "phase_1": {
                "duration": "Month 1-2",
                "activities": [
                    "Set up customer segmentation and risk scoring",
                    "Implement basic loyalty points system",
                    "Create win-back email campaigns"
                ]
            },
            "phase_2": {
                "duration": "Month 3-4", 
                "activities": [
                    "Launch full loyalty program with tiers",
                    "Implement personalized service recommendations",
                    "Create customer feedback collection system"
                ]
            },
            "phase_3": {
                "duration": "Month 5-6",
                "activities": [
                    "Optimize program based on initial results",
                    "Add advanced personalization features",
                    "Scale successful retention tactics"
                ]
            }
        }