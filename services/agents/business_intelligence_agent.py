#!/usr/bin/env python3
"""
Business Intelligence Agent - AI agent specialized in business analytics,
revenue insights, performance metrics, and strategic recommendations
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta

from langchain_core.messages import SystemMessage, HumanMessage

try:
    from .base_agent import BaseAgent, TaskResult
    from ..structured_outputs import BusinessAnalysisResponse, BusinessMetric, BusinessInsight, ActionableRecommendation
except ImportError:
    # Fallback imports for testing
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from base_agent import BaseAgent, TaskResult

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BusinessIntelligenceAgent(BaseAgent):
    """AI Agent specialized in business intelligence and analytics"""
    
    def __init__(self):
        super().__init__(
            agent_name="Business Intelligence Agent",
            agent_type="business_intelligence",
            model_preference="openai",
            default_model="gpt-4o-mini"
        )
        
        # Business-specific configuration
        self.config.update({
            "analysis_depth": "comprehensive",
            "include_forecasting": True,
            "benchmark_comparison": True,
            "min_data_confidence": 0.7
        })
    
    def get_system_prompt(self) -> str:
        """Get business intelligence system prompt"""
        return """You are an expert business intelligence analyst specializing in barbershop and salon operations.

Your expertise includes:
- Revenue analysis and forecasting
- Customer behavior analytics
- Service performance metrics
- Staff productivity analysis
- Seasonal trend identification
- Competitive benchmarking
- ROI calculations
- Business growth strategies

Key principles:
1. Always provide data-driven insights with specific numbers
2. Focus on actionable recommendations that drive revenue
3. Consider both short-term optimizations and long-term growth
4. Factor in industry benchmarks and seasonal patterns
5. Prioritize high-impact, low-effort improvements
6. Consider staff workload and customer satisfaction balance

Output format:
- Start with executive summary
- Present key metrics with context
- Provide insights with confidence levels
- Recommend specific actions with expected impact
- Include implementation timelines and resource requirements"""
    
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process business intelligence task"""
        message = task.get("message", "")
        context = task.get("context", {})
        structured_model = task.get("structured_output_model")
        
        try:
            # Determine analysis type
            analysis_type = self._determine_analysis_type(message)
            
            # Get system prompt with context
            system_prompt = self._get_contextual_system_prompt(analysis_type, context)
            
            # Prepare enhanced prompt
            enhanced_prompt = self._enhance_prompt(message, context, analysis_type)
            
            # Generate response
            if structured_model and structured_model == BusinessAnalysisResponse:
                # Use structured output for comprehensive analysis
                response = await self._generate_structured_response(
                    enhanced_prompt,
                    BusinessAnalysisResponse,
                    system_prompt
                )
                tokens_used = 0  # Structured output doesn't return token count directly
                result_content = response
            else:
                # Use regular LLM call
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=enhanced_prompt)
                ]
                response_text, tokens_used = await self._call_llm(messages)
                result_content = response_text
            
            # Calculate confidence based on data availability
            confidence = self._calculate_confidence(context, message)
            
            # Prepare metadata
            metadata = {
                "analysis_type": analysis_type,
                "data_sources": list(context.keys()) if context else [],
                "timestamp": datetime.now().isoformat(),
                "agent_version": "1.0.0"
            }
            
            return TaskResult(
                success=True,
                result=result_content,
                execution_time=0,  # Will be set by base class
                tokens_used=tokens_used,
                confidence=confidence,
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Business intelligence task failed: {e}")
            return TaskResult(
                success=False,
                result=None,
                error=str(e),
                execution_time=0,
                confidence=0.0
            )
    
    def _determine_analysis_type(self, message: str) -> str:
        """Determine the type of business analysis needed"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ["revenue", "income", "earnings", "profit"]):
            return "revenue_analysis"
        elif any(word in message_lower for word in ["customer", "client", "retention", "acquisition"]):
            return "customer_analysis"
        elif any(word in message_lower for word in ["service", "product", "offering", "menu"]):
            return "service_analysis"
        elif any(word in message_lower for word in ["staff", "employee", "barber", "productivity"]):
            return "staff_analysis"
        elif any(word in message_lower for word in ["forecast", "predict", "future", "trend"]):
            return "forecasting"
        elif any(word in message_lower for word in ["performance", "kpi", "metric", "dashboard"]):
            return "performance_analysis"
        elif any(word in message_lower for word in ["compare", "benchmark", "competition"]):
            return "competitive_analysis"
        else:
            return "general_business_analysis"
    
    def _get_contextual_system_prompt(self, analysis_type: str, context: Dict[str, Any]) -> str:
        """Get system prompt tailored to analysis type and available context"""
        base_prompt = self.get_system_prompt()
        
        type_specific_guidance = {
            "revenue_analysis": """
Focus specifically on:
- Revenue trends and patterns
- Average transaction value analysis
- Revenue per customer calculations
- Seasonal revenue variations
- Service mix impact on revenue
- Pricing optimization opportunities
""",
            "customer_analysis": """
Focus specifically on:
- Customer acquisition metrics
- Retention rates and churn analysis
- Customer lifetime value calculations
- Booking frequency patterns
- Customer satisfaction indicators
- Demographic analysis and targeting
""",
            "service_analysis": """
Focus specifically on:
- Service popularity and profitability
- Service duration and efficiency
- Upselling and cross-selling opportunities
- Service pricing analysis
- New service introduction recommendations
- Service bundling strategies
""",
            "staff_analysis": """
Focus specifically on:
- Staff productivity metrics
- Utilization rates and scheduling
- Commission vs. salary analysis
- Training and development needs
- Customer-staff matching optimization
- Staff retention strategies
""",
            "forecasting": """
Focus specifically on:
- Historical trend extrapolation
- Seasonal adjustment factors
- Growth projections with confidence intervals
- Scenario planning (best/worst/most likely)
- Key assumption documentation
- Risk factor identification
""",
            "performance_analysis": """
Focus specifically on:
- Key performance indicator tracking
- Benchmark comparisons
- Performance gap identification
- Root cause analysis
- Improvement opportunity prioritization
- Success metric recommendations
"""
        }
        
        specific_guidance = type_specific_guidance.get(analysis_type, "")
        
        # Add context-specific guidance
        context_guidance = ""
        if context:
            available_data = list(context.keys())
            context_guidance = f"\nAvailable data sources: {', '.join(available_data)}\n"
            context_guidance += "Use this specific data to provide precise, quantified insights."
        
        return base_prompt + specific_guidance + context_guidance
    
    def _enhance_prompt(self, message: str, context: Dict[str, Any], analysis_type: str) -> str:
        """Enhance the user prompt with context and structure"""
        enhanced_parts = [message]
        
        # Add context data if available
        if context:
            enhanced_parts.append("\n=== Available Business Data ===")
            for key, value in context.items():
                if isinstance(value, dict):
                    enhanced_parts.append(f"\n{key.title()}:")
                    for sub_key, sub_value in value.items():
                        enhanced_parts.append(f"  - {sub_key}: {sub_value}")
                elif isinstance(value, list):
                    enhanced_parts.append(f"\n{key.title()}: {', '.join(map(str, value))}")
                else:
                    enhanced_parts.append(f"\n{key.title()}: {value}")
        
        # Add specific analysis requirements
        analysis_requirements = {
            "revenue_analysis": [
                "Calculate revenue growth rates",
                "Identify top revenue-generating services",
                "Analyze revenue per customer trends",
                "Suggest revenue optimization strategies"
            ],
            "customer_analysis": [
                "Calculate customer acquisition cost",
                "Analyze customer retention patterns",
                "Identify high-value customer segments",
                "Recommend customer engagement strategies"
            ],
            "service_analysis": [
                "Rank services by profitability",
                "Analyze service demand patterns",
                "Identify underperforming services",
                "Suggest service optimization strategies"
            ],
            "staff_analysis": [
                "Calculate staff productivity metrics",
                "Analyze utilization rates",
                "Identify training opportunities",
                "Recommend scheduling optimizations"
            ]
        }
        
        requirements = analysis_requirements.get(analysis_type, [])
        if requirements:
            enhanced_parts.append("\n=== Analysis Requirements ===")
            for req in requirements:
                enhanced_parts.append(f"- {req}")
        
        # Add output format request
        enhanced_parts.append("""
=== Output Requirements ===
Provide a comprehensive analysis including:
1. Executive summary (2-3 sentences)
2. Key metrics with specific numbers
3. Top 3 insights with confidence levels
4. Top 3 actionable recommendations
5. Expected impact and implementation timeline
""")
        
        return "\n".join(enhanced_parts)
    
    def _calculate_confidence(self, context: Dict[str, Any], message: str) -> float:
        """Calculate confidence score based on available data and request complexity"""
        base_confidence = 0.5
        
        # Increase confidence based on available context
        if context:
            data_quality_factors = [
                len(context) > 3,  # Multiple data sources
                any(isinstance(v, dict) and len(v) > 5 for v in context.values()),  # Rich data
                any(isinstance(v, list) and len(v) > 10 for v in context.values()),  # Large datasets
                'revenue' in context or 'sales' in context,  # Financial data available
                'customers' in context or 'clients' in context,  # Customer data available
            ]
            
            confidence_boost = sum(data_quality_factors) * 0.1
            base_confidence += confidence_boost
        
        # Adjust based on request complexity
        complex_keywords = ["forecast", "predict", "compare", "benchmark", "optimize"]
        if any(keyword in message.lower() for keyword in complex_keywords):
            base_confidence -= 0.1  # Slightly lower confidence for complex requests
        
        return min(max(base_confidence, 0.1), 0.95)  # Clamp between 0.1 and 0.95
    
    def get_specialized_capabilities(self) -> List[str]:
        """Get business intelligence specific capabilities"""
        return [
            "revenue_analysis",
            "customer_analytics",
            "service_performance_analysis",
            "staff_productivity_metrics",
            "forecasting_and_trends",
            "competitive_benchmarking",
            "roi_calculations",
            "kpi_tracking",
            "business_optimization",
            "strategic_planning"
        ]
    
    async def analyze_revenue_trends(self, 
                                   revenue_data: Dict[str, Any],
                                   period: str = "monthly") -> BusinessAnalysisResponse:
        """Specialized method for revenue trend analysis"""
        prompt = f"""
Analyze the following revenue data for {period} trends:
{json.dumps(revenue_data, indent=2)}

Provide comprehensive revenue analysis including:
- Growth rates and trends
- Seasonal patterns
- Revenue drivers and obstacles
- Optimization opportunities
- Forecasting for next period
"""
        
        return await self._generate_structured_response(
            prompt,
            BusinessAnalysisResponse,
            self._get_contextual_system_prompt("revenue_analysis", revenue_data)
        )
    
    async def analyze_customer_behavior(self, 
                                      customer_data: Dict[str, Any]) -> BusinessAnalysisResponse:
        """Specialized method for customer behavior analysis"""
        prompt = f"""
Analyze the following customer behavior data:
{json.dumps(customer_data, indent=2)}

Provide comprehensive customer analysis including:
- Customer segments and profiles
- Retention and churn patterns
- Lifetime value calculations
- Acquisition channel performance
- Engagement optimization strategies
"""
        
        return await self._generate_structured_response(
            prompt,
            BusinessAnalysisResponse,
            self._get_contextual_system_prompt("customer_analysis", customer_data)
        )
    
    async def generate_business_forecast(self,
                                       historical_data: Dict[str, Any],
                                       forecast_period: str = "next_quarter") -> BusinessAnalysisResponse:
        """Generate business forecasting analysis"""
        prompt = f"""
Based on this historical business data, generate forecasts for {forecast_period}:
{json.dumps(historical_data, indent=2)}

Provide comprehensive forecasting including:
- Revenue projections with confidence intervals
- Customer growth expectations
- Seasonal adjustments
- Risk factors and assumptions
- Scenario planning (optimistic/realistic/pessimistic)
"""
        
        return await self._generate_structured_response(
            prompt,
            BusinessAnalysisResponse,
            self._get_contextual_system_prompt("forecasting", historical_data)
        )
    
    async def benchmark_performance(self,
                                  business_data: Dict[str, Any],
                                  industry_benchmarks: Optional[Dict[str, Any]] = None) -> BusinessAnalysisResponse:
        """Compare business performance against benchmarks"""
        benchmark_data = industry_benchmarks or {
            "average_revenue_per_customer": 45,
            "customer_retention_rate": 0.75,
            "staff_utilization_rate": 0.80,
            "average_service_price": 35,
            "booking_fill_rate": 0.85
        }
        
        prompt = f"""
Compare this business performance against industry benchmarks:

Business Data:
{json.dumps(business_data, indent=2)}

Industry Benchmarks:
{json.dumps(benchmark_data, indent=2)}

Provide comprehensive benchmark analysis including:
- Performance gaps identification
- Strengths and opportunities
- Competitive positioning
- Improvement priorities
- Action plans to reach benchmarks
"""
        
        return await self._generate_structured_response(
            prompt,
            BusinessAnalysisResponse,
            self._get_contextual_system_prompt("competitive_analysis", business_data)
        )

# Global agent instance
business_intelligence_agent = None

def get_business_intelligence_agent() -> BusinessIntelligenceAgent:
    """Get or create global business intelligence agent instance"""
    global business_intelligence_agent
    if business_intelligence_agent is None:
        business_intelligence_agent = BusinessIntelligenceAgent()
    return business_intelligence_agent

if __name__ == "__main__":
    # Test the business intelligence agent
    async def test_business_agent():
        agent = BusinessIntelligenceAgent()
        
        # Test data
        test_context = {
            "monthly_revenue": {
                "january": 42000,
                "february": 38000,
                "march": 47000,
                "april": 51000
            },
            "customer_metrics": {
                "new_customers": 45,
                "returning_customers": 180,
                "average_spend": 38.50,
                "retention_rate": 0.82
            },
            "service_data": {
                "haircuts": {"count": 320, "revenue": 11200},
                "beard_trims": {"count": 180, "revenue": 3600},
                "color_services": {"count": 45, "revenue": 4050}
            }
        }
        
        test_queries = [
            "How is my business performing this quarter?",
            "What are my top revenue opportunities?",
            "Analyze my customer retention trends",
            "Which services are most profitable?"
        ]
        
        for i, query in enumerate(test_queries):
            print(f"\n=== Test {i+1}: {query} ===")
            
            # Test regular response
            result = await agent.execute(
                message=query,
                context=test_context
            )
            
            if result.success:
                print(f"Success: {result.result[:200]}...")
                print(f"Confidence: {result.confidence:.2f}")
                print(f"Tokens: {result.tokens_used}")
            else:
                print(f"Error: {result.error}")
        
        # Test structured output
        print(f"\n=== Testing Structured Analysis ===")
        structured_result = await agent.execute(
            message="Provide comprehensive business analysis",
            context=test_context,
            structured_output_model=BusinessAnalysisResponse
        )
        
        if structured_result.success:
            analysis = structured_result.result
            if hasattr(analysis, 'summary'):
                print(f"Summary: {analysis.summary}")
                print(f"Metrics count: {len(analysis.key_metrics)}")
                print(f"Insights count: {len(analysis.insights)}")
                print(f"Recommendations count: {len(analysis.recommendations)}")
        
        # Test health check
        print(f"\n=== Agent Health Check ===")
        health = await agent.health_check()
        print(f"Healthy: {health['healthy']}")
        print(f"Status: {health['status']}")
        
        # Print agent status
        print(f"\n=== Agent Status ===")
        status = agent.get_status()
        for key, value in status.items():
            print(f"{key}: {value}")
    
    # Run tests
    asyncio.run(test_business_agent())