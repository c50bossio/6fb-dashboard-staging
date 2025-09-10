#!/usr/bin/env python3
"""
Structured Outputs Service - Type-safe AI responses using Instructor + Pydantic
Ensures reliable, validated outputs from AI models with automatic retry logic
"""

import asyncio
import logging
from datetime import datetime, date
from typing import Dict, List, Any, Optional, Union, Type, TypeVar
from enum import Enum
import json

import instructor
from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field, ValidationError, validator
from tenacity import retry, stop_after_attempt, wait_exponential

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)

# Common Enums for structured responses
class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ActionType(str, Enum):
    IMMEDIATE = "immediate"
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    MONITOR = "monitor"

# Business Intelligence Schemas
class BusinessMetric(BaseModel):
    """Individual business metric"""
    name: str = Field(description="Name of the metric")
    value: Union[float, int] = Field(description="Current value")
    unit: str = Field(description="Unit of measurement")
    change_percent: Optional[float] = Field(None, description="Percentage change from previous period")
    trend: Optional[str] = Field(None, description="Trend direction: up, down, stable")
    
class BusinessInsight(BaseModel):
    """Business insight with confidence and priority"""
    insight: str = Field(description="The business insight")
    confidence: ConfidenceLevel = Field(description="Confidence level in the insight")
    priority: PriorityLevel = Field(description="Priority level for action")
    supporting_data: List[str] = Field(default_factory=list, description="Data points supporting this insight")
    
class ActionableRecommendation(BaseModel):
    """Actionable business recommendation"""
    title: str = Field(description="Short title for the recommendation")
    description: str = Field(description="Detailed description")
    action_type: ActionType = Field(description="Type of action required")
    estimated_impact: str = Field(description="Expected impact description")
    implementation_time: str = Field(description="Estimated time to implement")
    resources_required: List[str] = Field(default_factory=list, description="Resources needed")
    
class BusinessAnalysisResponse(BaseModel):
    """Complete business analysis response"""
    summary: str = Field(description="Executive summary of the analysis")
    key_metrics: List[BusinessMetric] = Field(description="Important business metrics")
    insights: List[BusinessInsight] = Field(description="Key business insights")
    recommendations: List[ActionableRecommendation] = Field(description="Actionable recommendations")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Overall confidence in analysis")
    analysis_date: datetime = Field(default_factory=datetime.now, description="When analysis was performed")
    
    @validator('confidence_score')
    def validate_confidence(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError('Confidence score must be between 0.0 and 1.0')
        return v

# Customer Service Schemas
class CustomerSentiment(str, Enum):
    VERY_NEGATIVE = "very_negative"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    POSITIVE = "positive"
    VERY_POSITIVE = "very_positive"

class AppointmentSuggestion(BaseModel):
    """Appointment booking suggestion"""
    appointment_date: date = Field(description="Suggested appointment date")
    appointment_time: str = Field(description="Suggested time (HH:MM format)")
    service_name: str = Field(description="Recommended service")
    barber_name: Optional[str] = Field(None, description="Recommended barber")
    duration_minutes: int = Field(description="Estimated duration in minutes")
    estimated_price: Optional[float] = Field(None, description="Estimated price")
    
class CustomerServiceResponse(BaseModel):
    """Customer service AI response"""
    response_text: str = Field(description="Main response to customer")
    sentiment: CustomerSentiment = Field(description="Detected customer sentiment")
    appointment_suggestions: List[AppointmentSuggestion] = Field(
        default_factory=list, 
        description="Suggested appointments if relevant"
    )
    follow_up_required: bool = Field(description="Whether follow-up is needed")
    escalation_required: bool = Field(description="Whether human escalation is needed")
    tags: List[str] = Field(default_factory=list, description="Categorization tags")
    
# Marketing Schemas
class MarketingChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    SOCIAL_MEDIA = "social_media"
    GOOGLE_ADS = "google_ads"
    FACEBOOK_ADS = "facebook_ads"
    INSTAGRAM = "instagram"
    WEBSITE = "website"
    REFERRAL = "referral"

class CampaignObjective(str, Enum):
    BRAND_AWARENESS = "brand_awareness"
    LEAD_GENERATION = "lead_generation"
    CUSTOMER_RETENTION = "customer_retention"
    REVENUE_GROWTH = "revenue_growth"
    APPOINTMENT_BOOKING = "appointment_booking"

class MarketingCampaign(BaseModel):
    """Marketing campaign structure"""
    title: str = Field(description="Campaign title")
    description: str = Field(description="Campaign description")
    objective: CampaignObjective = Field(description="Primary campaign objective")
    target_audience: str = Field(description="Target audience description")
    channels: List[MarketingChannel] = Field(description="Marketing channels to use")
    budget_range: str = Field(description="Suggested budget range")
    duration_weeks: int = Field(description="Campaign duration in weeks")
    key_messages: List[str] = Field(description="Key marketing messages")
    call_to_action: str = Field(description="Primary call to action")
    success_metrics: List[str] = Field(description="How to measure success")

class MarketingResponse(BaseModel):
    """Marketing AI response"""
    campaigns: List[MarketingCampaign] = Field(description="Suggested marketing campaigns")
    quick_wins: List[str] = Field(description="Quick marketing wins to implement")
    content_ideas: List[str] = Field(description="Content creation ideas")
    seasonal_opportunities: List[str] = Field(default_factory=list, description="Seasonal marketing opportunities")

# Technical Operations Schemas
class SystemStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"

class TechnicalIssue(BaseModel):
    """Technical issue identification"""
    title: str = Field(description="Issue title")
    severity: PriorityLevel = Field(description="Issue severity")
    description: str = Field(description="Detailed description")
    affected_systems: List[str] = Field(description="Systems affected by this issue")
    recommended_actions: List[str] = Field(description="Recommended actions to resolve")
    estimated_fix_time: str = Field(description="Estimated time to fix")

class SystemHealthReport(BaseModel):
    """System health assessment"""
    overall_status: SystemStatus = Field(description="Overall system status")
    individual_systems: Dict[str, SystemStatus] = Field(description="Status of individual systems")
    issues: List[TechnicalIssue] = Field(default_factory=list, description="Identified issues")
    performance_metrics: Dict[str, Union[int, float]] = Field(description="Key performance metrics")
    recommendations: List[str] = Field(description="System improvement recommendations")
    last_check: datetime = Field(default_factory=datetime.now, description="When health check was performed")

# Financial Analysis Schemas
class RevenueBreakdown(BaseModel):
    """Revenue breakdown by category"""
    category: str = Field(description="Revenue category")
    amount: float = Field(description="Amount in this category")
    percentage: float = Field(ge=0.0, le=100.0, description="Percentage of total revenue")
    change_from_previous: Optional[float] = Field(None, description="Change from previous period")

class FinancialSummary(BaseModel):
    """Financial analysis summary"""
    total_revenue: float = Field(description="Total revenue for period")
    revenue_breakdown: List[RevenueBreakdown] = Field(description="Revenue by category")
    profit_margin: float = Field(description="Profit margin percentage")
    expenses: Dict[str, float] = Field(description="Expense categories and amounts")
    commission_payments: float = Field(description="Total commission payments")
    growth_rate: float = Field(description="Revenue growth rate percentage")
    financial_health_score: float = Field(ge=0.0, le=10.0, description="Financial health score out of 10")
    key_insights: List[str] = Field(description="Key financial insights")
    action_items: List[str] = Field(description="Recommended financial actions")

# Additional specialized response schemas for all agents
class TechnicalAnalysisResponse(BaseModel):
    """Technical operations analysis response"""
    summary: str = Field(description="Technical analysis summary")
    system_health: SystemHealthReport = Field(description="Current system health status")
    performance_metrics: Dict[str, Union[int, float]] = Field(description="Performance metrics")
    recommendations: List[ActionableRecommendation] = Field(description="Technical recommendations")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Analysis confidence")
    analysis_date: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")
    
class CustomerAnalysisResponse(BaseModel):
    """Customer success analysis response"""
    summary: str = Field(description="Customer analysis summary")
    satisfaction_metrics: Dict[str, Union[int, float]] = Field(description="Customer satisfaction metrics")
    retention_analysis: Dict[str, Any] = Field(description="Customer retention analysis")
    churn_risk_factors: List[str] = Field(description="Identified churn risk factors")
    improvement_strategies: List[ActionableRecommendation] = Field(description="Customer success strategies")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Analysis confidence")
    analysis_date: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")
    
class MarketingAnalysisResponse(BaseModel):
    """Marketing analysis response"""
    summary: str = Field(description="Marketing analysis summary")
    campaign_performance: Dict[str, Union[int, float]] = Field(description="Campaign performance metrics")
    audience_insights: Dict[str, Any] = Field(description="Target audience analysis")
    recommended_campaigns: List[MarketingCampaign] = Field(description="Recommended marketing campaigns")
    roi_projections: Dict[str, float] = Field(description="Expected ROI projections")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Analysis confidence")
    analysis_date: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")
    
class FinancialAnalysisResponse(BaseModel):
    """Financial agent analysis response"""
    summary: str = Field(description="Financial analysis summary")
    financial_metrics: Dict[str, Union[int, float]] = Field(description="Key financial metrics")
    profitability_analysis: Dict[str, Any] = Field(description="Profitability breakdown")
    cash_flow_forecast: Dict[str, float] = Field(description="Cash flow projections")
    investment_recommendations: List[ActionableRecommendation] = Field(description="Investment recommendations")
    risk_assessment: Dict[str, Any] = Field(description="Financial risk analysis")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Analysis confidence")
    analysis_date: datetime = Field(default_factory=datetime.now, description="Analysis timestamp")
    
class StrategicPlanResponse(BaseModel):
    """Strategic planning response from master coach"""
    summary: str = Field(description="Strategic plan summary")
    vision_mission: Dict[str, str] = Field(description="Vision and mission statements")
    strategic_objectives: List[ActionableRecommendation] = Field(description="Strategic objectives")
    implementation_roadmap: List[Dict[str, Any]] = Field(description="Implementation timeline")
    success_metrics: List[BusinessMetric] = Field(description="Success measurement metrics")
    risk_mitigation: List[str] = Field(description="Risk mitigation strategies")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Plan confidence")
    analysis_date: datetime = Field(default_factory=datetime.now, description="Plan creation date")

# Additional schemas needed by specialized agents
class SystemPerformanceReport(BaseModel):
    """System performance analysis report"""
    overall_performance_score: float = Field(ge=0.0, le=10.0, description="Overall performance score")
    response_time_metrics: Dict[str, float] = Field(description="Response time analysis")
    resource_utilization: Dict[str, float] = Field(description="CPU, memory, disk usage")
    bottlenecks_identified: List[str] = Field(description="Performance bottlenecks")
    optimization_recommendations: List[ActionableRecommendation] = Field(description="Performance improvements")
    
class CustomerJourneyMap(BaseModel):
    """Customer journey analysis"""
    journey_stages: List[Dict[str, Any]] = Field(description="Customer journey stages")
    touchpoints: List[str] = Field(description="Customer touchpoints")
    pain_points: List[str] = Field(description="Identified pain points")
    opportunities: List[ActionableRecommendation] = Field(description="Improvement opportunities")
    satisfaction_metrics: Dict[str, float] = Field(description="Satisfaction at each stage")
    
class CampaignStrategy(BaseModel):
    """Marketing campaign strategy"""
    campaign_name: str = Field(description="Campaign name")
    target_demographics: Dict[str, Any] = Field(description="Target audience details")
    channels: List[MarketingChannel] = Field(description="Marketing channels to use")
    budget_allocation: Dict[str, float] = Field(description="Budget per channel")
    timeline: Dict[str, str] = Field(description="Campaign timeline")
    expected_roi: float = Field(description="Expected return on investment")
    kpis: List[str] = Field(description="Key performance indicators")
    
class CashFlowProjection(BaseModel):
    """Financial cash flow projection"""
    projection_period: str = Field(description="Time period for projection")
    monthly_projections: Dict[str, Dict[str, float]] = Field(description="Month-by-month cash flow")
    revenue_forecast: Dict[str, float] = Field(description="Revenue projections")
    expense_forecast: Dict[str, float] = Field(description="Expense projections")
    net_cash_flow: Dict[str, float] = Field(description="Net cash flow by period")
    break_even_analysis: Dict[str, Any] = Field(description="Break-even analysis")
    risk_factors: List[str] = Field(description="Cash flow risk factors")
    
class LeadershipAssessment(BaseModel):
    """Leadership and coaching assessment"""
    leadership_strengths: List[str] = Field(description="Identified leadership strengths")
    development_areas: List[str] = Field(description="Areas for improvement")
    coaching_recommendations: List[ActionableRecommendation] = Field(description="Coaching strategies")
    team_effectiveness_score: float = Field(ge=0.0, le=10.0, description="Team effectiveness rating")
    communication_assessment: Dict[str, Any] = Field(description="Communication style analysis")
    decision_making_style: str = Field(description="Decision-making approach")
    growth_opportunities: List[str] = Field(description="Leadership growth opportunities")
    
# Additional specialized schemas for all agents
class SecurityAuditSummary(BaseModel):
    """Security audit findings summary"""
    security_score: float = Field(ge=0.0, le=10.0, description="Overall security score")
    vulnerabilities_found: List[str] = Field(description="Security vulnerabilities")
    compliance_status: Dict[str, bool] = Field(description="Compliance checklist status")
    recommendations: List[ActionableRecommendation] = Field(description="Security improvements")
    risk_level: PriorityLevel = Field(description="Overall risk assessment")
    
class TechnologyRecommendation(BaseModel):
    """Technology upgrade recommendation"""
    technology_name: str = Field(description="Name of technology")
    current_version: Optional[str] = Field(None, description="Current version")
    recommended_version: str = Field(description="Recommended version")
    benefits: List[str] = Field(description="Benefits of upgrade")
    implementation_effort: str = Field(description="Implementation complexity")
    cost_estimate: Optional[float] = Field(None, description="Estimated cost")
    priority: PriorityLevel = Field(description="Upgrade priority")
    
class RetentionStrategy(BaseModel):
    """Customer retention strategy"""
    strategy_name: str = Field(description="Name of retention strategy")
    target_segments: List[str] = Field(description="Customer segments to target")
    tactics: List[ActionableRecommendation] = Field(description="Specific tactics")
    expected_improvement: float = Field(description="Expected retention improvement %")
    implementation_timeline: str = Field(description="Timeline for implementation")
    success_metrics: List[str] = Field(description="How to measure success")
    
class SatisfactionReport(BaseModel):
    """Customer satisfaction analysis"""
    overall_satisfaction: float = Field(ge=0.0, le=10.0, description="Overall satisfaction score")
    satisfaction_by_category: Dict[str, float] = Field(description="Satisfaction by service category")
    top_positive_feedback: List[str] = Field(description="Most common positive feedback")
    top_complaints: List[str] = Field(description="Most common complaints")
    improvement_areas: List[ActionableRecommendation] = Field(description="Areas for improvement")
    trend_analysis: Dict[str, Any] = Field(description="Satisfaction trends over time")
    
class BrandPositioning(BaseModel):
    """Brand positioning strategy"""
    brand_statement: str = Field(description="Core brand positioning statement")
    unique_value_proposition: str = Field(description="What makes the brand unique")
    target_audience: Dict[str, Any] = Field(description="Primary target audience")
    competitive_advantages: List[str] = Field(description="Key competitive advantages")
    brand_personality_traits: List[str] = Field(description="Brand personality characteristics")
    messaging_framework: Dict[str, str] = Field(description="Key brand messages")
    
class ContentPlan(BaseModel):
    """Marketing content strategy plan"""
    content_themes: List[str] = Field(description="Main content themes")
    content_calendar: Dict[str, List[str]] = Field(description="Content schedule by platform")
    content_types: List[str] = Field(description="Types of content to create")
    posting_frequency: Dict[str, str] = Field(description="Posting frequency by platform")
    engagement_strategies: List[str] = Field(description="Strategies to boost engagement")
    performance_metrics: List[str] = Field(description="Content performance KPIs")
    
class ProfitabilityReport(BaseModel):
    """Business profitability analysis"""
    gross_profit_margin: float = Field(description="Gross profit margin percentage")
    net_profit_margin: float = Field(description="Net profit margin percentage")
    profit_by_service: Dict[str, float] = Field(description="Profitability by service type")
    profit_by_period: Dict[str, float] = Field(description="Profit trends over time")
    cost_breakdown: Dict[str, float] = Field(description="Breakdown of cost categories")
    profitability_insights: List[str] = Field(description="Key profitability insights")
    optimization_opportunities: List[ActionableRecommendation] = Field(description="Profit optimization opportunities")
    
class BudgetPlan(BaseModel):
    """Financial budget planning"""
    budget_period: str = Field(description="Budget period (monthly, quarterly, annual)")
    revenue_projections: Dict[str, float] = Field(description="Projected revenue by category")
    expense_budgets: Dict[str, float] = Field(description="Budget allocation by expense category")
    capital_expenditures: Dict[str, float] = Field(description="Planned capital investments")
    contingency_fund: float = Field(description="Contingency fund allocation")
    budget_assumptions: List[str] = Field(description="Key assumptions underlying budget")
    variance_analysis: Dict[str, Any] = Field(description="Expected vs actual tracking")
    
class BusinessGrowthPlan(BaseModel):
    """Strategic business growth plan"""
    growth_objectives: List[str] = Field(description="Key growth objectives")
    growth_strategies: List[ActionableRecommendation] = Field(description="Growth strategies")
    market_expansion_opportunities: List[str] = Field(description="Market expansion possibilities")
    revenue_growth_targets: Dict[str, float] = Field(description="Revenue growth targets by period")
    investment_requirements: Dict[str, float] = Field(description="Required investments")
    success_milestones: List[Dict[str, Any]] = Field(description="Growth milestones")
    risk_mitigation: List[str] = Field(description="Growth-related risks and mitigation")
    
class OperationalExcellenceReport(BaseModel):
    """Operational excellence assessment"""
    operational_efficiency_score: float = Field(ge=0.0, le=10.0, description="Overall operational efficiency")
    process_optimization_opportunities: List[ActionableRecommendation] = Field(description="Process improvements")
    resource_utilization: Dict[str, float] = Field(description="Resource utilization metrics")
    bottleneck_analysis: List[str] = Field(description="Identified operational bottlenecks")
    best_practices: List[str] = Field(description="Recommended best practices")
    performance_benchmarks: Dict[str, float] = Field(description="Performance benchmarks")
    improvement_timeline: Dict[str, str] = Field(description="Implementation timeline")

class StructuredOutputService:
    """Service for generating structured outputs from AI models"""
    
    def __init__(self):
        """Initialize structured output service"""
        # Initialize AI clients
        self.openai_client = None
        self.anthropic_client = None
        
        # Initialize instructor clients
        self.openai_instructor = None
        self.anthropic_instructor = None
        
        self._initialize_clients()
        
        logger.info("Structured Output Service initialized")
    
    def _initialize_clients(self):
        """Initialize AI clients with instructor patching"""
        try:
            # Initialize OpenAI
            self.openai_client = AsyncOpenAI()
            self.openai_instructor = instructor.from_openai(self.openai_client)
            
            # Initialize Anthropic
            self.anthropic_client = AsyncAnthropic()
            self.anthropic_instructor = instructor.from_anthropic(self.anthropic_client)
            
        except Exception as e:
            logger.error(f"Failed to initialize AI clients: {e}")
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def generate_structured_response(self,
                                         prompt: str,
                                         response_model: Type[T],
                                         model: str = "gpt-4o-mini",
                                         provider: str = "openai",
                                         system_prompt: Optional[str] = None,
                                         max_retries: int = 2) -> T:
        """
        Generate structured response using specified model and schema
        
        Args:
            prompt: User prompt
            response_model: Pydantic model for response structure
            model: AI model to use
            provider: AI provider (openai or anthropic)
            system_prompt: Optional system prompt
            max_retries: Max retries for validation failures
            
        Returns:
            Structured response matching the specified model
        """
        try:
            if provider == "openai" and self.openai_instructor:
                return await self._generate_openai_structured(
                    prompt, response_model, model, system_prompt, max_retries
                )
            elif provider == "anthropic" and self.anthropic_instructor:
                return await self._generate_anthropic_structured(
                    prompt, response_model, model, system_prompt, max_retries
                )
            else:
                raise ValueError(f"Unsupported provider: {provider}")
                
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            raise
        except Exception as e:
            logger.error(f"Error generating structured response: {e}")
            raise
    
    async def _generate_openai_structured(self,
                                        prompt: str,
                                        response_model: Type[T],
                                        model: str,
                                        system_prompt: Optional[str],
                                        max_retries: int) -> T:
        """Generate structured response using OpenAI"""
        messages = []
        
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        
        messages.append({"role": "user", "content": prompt})
        
        response = await self.openai_instructor.chat.completions.create(
            model=model,
            response_model=response_model,
            messages=messages,
            max_retries=max_retries,
            temperature=0.7
        )
        
        return response
    
    async def _generate_anthropic_structured(self,
                                           prompt: str,
                                           response_model: Type[T],
                                           model: str,
                                           system_prompt: Optional[str],
                                           max_retries: int) -> T:
        """Generate structured response using Anthropic"""
        response = await self.anthropic_instructor.messages.create(
            model=model or "claude-3-5-sonnet-20241022",
            response_model=response_model,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
            max_retries=max_retries,
            max_tokens=2000
        )
        
        return response
    
    # Convenience methods for specific response types
    async def generate_business_analysis(self, 
                                       prompt: str, 
                                       system_context: Optional[str] = None) -> BusinessAnalysisResponse:
        """Generate structured business analysis"""
        system_prompt = f"""You are a business intelligence expert. Analyze the provided business data and generate insights.
{system_context or ''}

Provide a comprehensive analysis with specific metrics, actionable insights, and prioritized recommendations."""

        return await self.generate_structured_response(
            prompt=prompt,
            response_model=BusinessAnalysisResponse,
            system_prompt=system_prompt
        )
    
    async def generate_customer_service_response(self, 
                                               customer_message: str,
                                               context: Optional[Dict[str, Any]] = None) -> CustomerServiceResponse:
        """Generate structured customer service response"""
        context_str = ""
        if context:
            context_str = f"Customer context: {json.dumps(context, indent=2)}\n\n"
        
        system_prompt = f"""You are a helpful customer service AI for a barbershop. 
{context_str}
Respond professionally, detect sentiment, and provide appointment suggestions when relevant.
Always be helpful and aim to resolve the customer's needs."""
        
        return await self.generate_structured_response(
            prompt=customer_message,
            response_model=CustomerServiceResponse,
            system_prompt=system_prompt
        )
    
    async def generate_marketing_plan(self, 
                                    business_goals: str,
                                    target_audience: Optional[str] = None,
                                    budget: Optional[str] = None) -> MarketingResponse:
        """Generate structured marketing plan"""
        context = []
        if target_audience:
            context.append(f"Target audience: {target_audience}")
        if budget:
            context.append(f"Budget: {budget}")
        
        context_str = "\n".join(context) if context else ""
        
        system_prompt = f"""You are a marketing expert specializing in barbershop and salon marketing.
{context_str}

Create comprehensive marketing campaigns with specific channels, budgets, and success metrics.
Focus on practical, implementable strategies that drive real business results."""
        
        return await self.generate_structured_response(
            prompt=business_goals,
            response_model=MarketingResponse,
            system_prompt=system_prompt
        )
    
    async def generate_system_health_report(self, 
                                          system_data: str,
                                          alert_thresholds: Optional[Dict[str, float]] = None) -> SystemHealthReport:
        """Generate structured system health report"""
        system_prompt = f"""You are a technical operations expert. Analyze system health data and provide actionable insights.
        
Alert thresholds: {json.dumps(alert_thresholds or {}, indent=2)}

Assess system status, identify issues, and provide specific recommendations for improvements."""
        
        return await self.generate_structured_response(
            prompt=system_data,
            response_model=SystemHealthReport,
            system_prompt=system_prompt
        )
    
    async def generate_financial_analysis(self, 
                                        financial_data: str,
                                        period: Optional[str] = None) -> FinancialSummary:
        """Generate structured financial analysis"""
        period_str = f"Analysis period: {period}\n" if period else ""
        
        system_prompt = f"""You are a financial analyst specializing in service businesses.
{period_str}
Analyze the financial data and provide insights on revenue, expenses, profitability, and growth opportunities.
Focus on actionable financial insights that can improve business performance."""
        
        return await self.generate_structured_response(
            prompt=financial_data,
            response_model=FinancialSummary,
            system_prompt=system_prompt
        )
    
    async def validate_and_fix_response(self, 
                                      response_data: Dict[str, Any], 
                                      response_model: Type[T]) -> T:
        """Validate and attempt to fix malformed responses"""
        try:
            return response_model(**response_data)
        except ValidationError as e:
            logger.warning(f"Validation failed, attempting to fix: {e}")
            
            # Simple fix attempts
            fixed_data = response_data.copy()
            
            # Fix common issues
            for error in e.errors():
                field = error['loc'][0] if error['loc'] else None
                error_type = error['type']
                
                if error_type == 'value_error.missing':
                    # Provide default values for missing fields
                    if field and hasattr(response_model, '__fields__'):
                        field_info = response_model.__fields__.get(field)
                        if field_info and hasattr(field_info, 'default'):
                            fixed_data[field] = field_info.default
                
                elif error_type == 'type_error.float':
                    # Try to convert strings to floats
                    if field and isinstance(fixed_data.get(field), str):
                        try:
                            fixed_data[field] = float(fixed_data[field])
                        except ValueError:
                            fixed_data[field] = 0.0
                
                elif error_type == 'type_error.list':
                    # Ensure lists are actually lists
                    if field and not isinstance(fixed_data.get(field), list):
                        fixed_data[field] = []
            
            # Try validation again
            return response_model(**fixed_data)
    
    def get_schema(self, response_model: Type[BaseModel]) -> Dict[str, Any]:
        """Get JSON schema for a response model"""
        return response_model.model_json_schema()
    
    def get_example(self, response_model: Type[BaseModel]) -> Dict[str, Any]:
        """Get example data for a response model"""
        schema = response_model.model_json_schema()
        
        # Generate example based on schema
        example = {}
        properties = schema.get('properties', {})
        
        for field_name, field_info in properties.items():
            field_type = field_info.get('type')
            
            if field_type == 'string':
                example[field_name] = field_info.get('description', 'Example text')
            elif field_type == 'integer':
                example[field_name] = 42
            elif field_type == 'number':
                example[field_name] = 3.14
            elif field_type == 'boolean':
                example[field_name] = True
            elif field_type == 'array':
                example[field_name] = ['example_item']
            elif field_type == 'object':
                example[field_name] = {'key': 'value'}
        
        return example

# Global service instance
structured_output_service = None

def get_structured_output_service() -> StructuredOutputService:
    """Get or create global structured output service instance"""
    global structured_output_service
    if structured_output_service is None:
        structured_output_service = StructuredOutputService()
    return structured_output_service

if __name__ == "__main__":
    # Test structured outputs
    async def test_structured_outputs():
        service = StructuredOutputService()
        
        # Test business analysis
        print("=== Testing Business Analysis ===")
        try:
            business_prompt = """
            Analyze this business data:
            - Monthly revenue: $45,000 (up 15% from last month)
            - New customers: 120
            - Customer retention: 85%
            - Average service price: $35
            - Top services: Haircut (60%), Beard trim (25%), Color (15%)
            - Staff utilization: 78%
            """
            
            analysis = await service.generate_business_analysis(business_prompt)
            print(f"Summary: {analysis.summary}")
            print(f"Metrics count: {len(analysis.key_metrics)}")
            print(f"Insights count: {len(analysis.insights)}")
            print(f"Recommendations count: {len(analysis.recommendations)}")
            print(f"Confidence: {analysis.confidence_score}")
            
        except Exception as e:
            print(f"Business analysis test failed: {e}")
        
        # Test customer service
        print("\n=== Testing Customer Service ===")
        try:
            customer_message = "Hi, I need to book a haircut for this Friday afternoon. Do you have any availability?"
            
            response = await service.generate_customer_service_response(customer_message)
            print(f"Response: {response.response_text}")
            print(f"Sentiment: {response.sentiment}")
            print(f"Appointment suggestions: {len(response.appointment_suggestions)}")
            
        except Exception as e:
            print(f"Customer service test failed: {e}")
        
        # Test schema generation
        print("\n=== Testing Schema Generation ===")
        schema = service.get_schema(BusinessAnalysisResponse)
        print(f"Schema keys: {list(schema.keys())}")
        
        example = service.get_example(BusinessAnalysisResponse)
        print(f"Example keys: {list(example.keys())}")
    
    # Run tests
    asyncio.run(test_structured_outputs())