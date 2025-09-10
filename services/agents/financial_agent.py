#!/usr/bin/env python3
"""
Financial Agent - Specialized AI agent for financial analysis and strategic planning
Handles cash flow, profitability, budgeting, and financial optimization for barbershops
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base_agent import BaseAgent, TaskResult
from ..structured_outputs import (
    FinancialAnalysisResponse,
    CashFlowProjection,
    ProfitabilityReport,
    BudgetPlan
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FinancialAgent(BaseAgent):
    """
    Specialized agent for financial analysis and strategic planning
    
    Capabilities:
    - Cash flow analysis and projection
    - Cost structure optimization
    - Revenue stream diversification strategies
    - Investment ROI analysis
    - Budget planning and variance analysis
    - Financial risk assessment and mitigation
    - Pricing optimization strategies
    - Financial performance benchmarking
    """
    
    def __init__(self):
        super().__init__(
            agent_name="Financial Agent",
            agent_type="financial",
            model_preference="openai",
            default_model="gpt-4o-mini"
        )
        
        self.specializations = [
            "cash_flow_analysis",
            "profitability_optimization",
            "cost_structure_analysis",
            "revenue_diversification",
            "budget_planning",
            "investment_analysis",
            "pricing_optimization",
            "financial_risk_assessment",
            "tax_optimization",
            "financial_forecasting"
        ]
        
        logger.info(f"{self.agent_name} initialized with {len(self.specializations)} specializations")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for financial analysis"""
        return """You are an expert Financial Agent specializing in comprehensive financial 
        analysis and strategic planning for barbershop and beauty businesses.
        
        Your expertise includes:
        - Cash flow analysis, forecasting, and working capital management
        - Profitability analysis and margin optimization strategies
        - Cost structure analysis and expense optimization
        - Revenue stream analysis and diversification opportunities
        - Budget development, monitoring, and variance analysis
        - Investment analysis and capital allocation decisions
        - Pricing strategy optimization and competitive analysis
        - Financial risk assessment and mitigation planning
        - Tax planning and optimization strategies
        - Financial performance benchmarking and KPI tracking
        
        Provide financial recommendations that are:
        - Data-driven with clear financial metrics and ratios
        - Practical and implementable for small business owners
        - Risk-conscious with appropriate risk management strategies
        - Growth-oriented while maintaining financial stability
        - Tax-efficient and compliant with regulations
        - Benchmarked against industry standards
        
        Always include:
        - Clear financial analysis with key performance indicators
        - Actionable recommendations with implementation steps
        - Risk assessment and mitigation strategies
        - Expected financial outcomes and return on investment
        - Timeline for implementation and results
        - Monitoring and review processes
        """
    
    def get_specialized_capabilities(self) -> List[str]:
        """Return financial specific capabilities"""
        return [
            "financial_statement_analysis",
            "cash_flow_forecasting",
            "profitability_analysis",
            "cost_optimization_strategies",
            "revenue_enhancement_planning",
            "budget_development_monitoring",
            "investment_decision_analysis",
            "pricing_strategy_optimization",
            "financial_ratio_analysis",
            "risk_assessment_planning",
            "tax_strategy_optimization",
            "capital_structure_analysis",
            "break_even_analysis",
            "scenario_planning_modeling",
            "financial_dashboard_design"
        ]
    
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process financial analysis task"""
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
                # Generate detailed financial analysis
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
                    "analysis_type": "quantitative",
                    "financial_focus": self._categorize_financial_focus(task_type)
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
        """Determine the type of financial task"""
        message_lower = message.lower()
        
        # Cash flow analysis and management
        if any(keyword in message_lower for keyword in [
            "cash flow", "cash", "liquidity", "working capital", "payment"
        ]):
            return "cash_flow_analysis"
        
        # Profitability and margin analysis
        elif any(keyword in message_lower for keyword in [
            "profit", "margin", "profitability", "earnings", "income"
        ]):
            return "profitability_analysis"
        
        # Cost analysis and optimization
        elif any(keyword in message_lower for keyword in [
            "cost", "expense", "overhead", "reduce costs", "cost cutting"
        ]):
            return "cost_optimization"
        
        # Revenue analysis and growth
        elif any(keyword in message_lower for keyword in [
            "revenue", "sales", "income", "earnings", "grow revenue"
        ]):
            return "revenue_analysis"
        
        # Budget planning and management
        elif any(keyword in message_lower for keyword in [
            "budget", "budgeting", "planning", "forecast", "projection"
        ]):
            return "budget_planning"
        
        # Investment and capital decisions
        elif any(keyword in message_lower for keyword in [
            "investment", "capital", "expand", "equipment", "roi", "return"
        ]):
            return "investment_analysis"
        
        # Pricing strategy and optimization
        elif any(keyword in message_lower for keyword in [
            "pricing", "price", "rates", "fees", "pricing strategy"
        ]):
            return "pricing_optimization"
        
        # Financial performance and ratios
        elif any(keyword in message_lower for keyword in [
            "performance", "ratio", "financial health", "metrics", "kpi"
        ]):
            return "financial_performance"
        
        # Risk assessment and management
        elif any(keyword in message_lower for keyword in [
            "risk", "uncertainty", "volatility", "insurance", "protection"
        ]):
            return "risk_assessment"
        
        # Tax planning and optimization
        elif any(keyword in message_lower for keyword in [
            "tax", "taxes", "deduction", "tax planning", "tax optimization"
        ]):
            return "tax_optimization"
        
        else:
            return "comprehensive_financial_analysis"
    
    def _build_analysis_prompt(self, message: str, context: Dict[str, Any], task_type: str) -> str:
        """Build comprehensive analysis prompt based on task type"""
        
        base_prompt = f"""
        Financial Analysis Request: {message}
        
        Task Type: {task_type}
        
        Context Information:
        """
        
        # Add context information
        if context:
            base_prompt += f"\n- Business Context: {context}\n"
        
        # Add task-specific analysis requirements
        task_specific_prompts = {
            "cash_flow_analysis": """
            Please provide comprehensive cash flow analysis including:
            1. Current cash flow statement analysis and trends
            2. Cash flow forecasting for next 6-12 months
            3. Working capital management optimization
            4. Seasonal cash flow patterns and planning
            5. Cash flow improvement strategies and tactics
            6. Emergency cash reserve recommendations
            """,
            
            "profitability_analysis": """
            Please provide detailed profitability analysis including:
            1. Gross profit margin analysis by service type
            2. Operating profit margin trends and benchmarking
            3. Service-level profitability and contribution analysis
            4. Profit improvement opportunities and strategies
            5. Cost allocation and overhead analysis
            6. Profitability forecasting and targets
            """,
            
            "cost_optimization": """
            Please provide cost optimization analysis including:
            1. Cost structure analysis and categorization
            2. Fixed vs variable cost analysis and optimization
            3. Overhead cost reduction opportunities
            4. Supplier negotiation and procurement strategies
            5. Process efficiency improvements for cost savings
            6. Cost-benefit analysis of optimization initiatives
            """,
            
            "revenue_analysis": """
            Please provide revenue analysis including:
            1. Revenue stream analysis and diversification opportunities
            2. Customer lifetime value and retention impact
            3. Pricing impact on revenue and volume
            4. Seasonal revenue patterns and planning
            5. Revenue growth strategies and initiatives
            6. Revenue forecasting and target setting
            """,
            
            "budget_planning": """
            Please provide budget planning analysis including:
            1. Annual budget development and monthly breakdown
            2. Revenue and expense forecasting methodology
            3. Budget variance analysis and monitoring systems
            4. Flexible budgeting for different scenarios
            5. Capital expenditure planning and prioritization
            6. Budget control and approval processes
            """,
            
            "investment_analysis": """
            Please provide investment analysis including:
            1. Capital investment opportunities evaluation
            2. Return on investment (ROI) calculations and projections
            3. Payback period and net present value analysis
            4. Risk assessment for investment decisions
            5. Financing options and capital structure optimization
            6. Investment prioritization and implementation timeline
            """,
            
            "pricing_optimization": """
            Please provide pricing optimization including:
            1. Current pricing analysis and competitive benchmarking
            2. Price elasticity analysis and demand sensitivity
            3. Cost-plus and value-based pricing strategies
            4. Service tier and package pricing recommendations
            5. Dynamic and promotional pricing strategies
            6. Pricing implementation and customer communication
            """,
            
            "financial_performance": """
            Please provide financial performance analysis including:
            1. Key financial ratio analysis and trends
            2. Industry benchmarking and competitive positioning
            3. Financial strength and stability assessment
            4. Performance improvement opportunities
            5. Financial dashboard and KPI recommendations
            6. Regular monitoring and review processes
            """,
            
            "risk_assessment": """
            Please provide financial risk assessment including:
            1. Business risk identification and categorization
            2. Financial risk exposure and impact analysis
            3. Risk mitigation strategies and insurance needs
            4. Scenario planning and stress testing
            5. Contingency planning and emergency procedures
            6. Risk monitoring and management systems
            """,
            
            "tax_optimization": """
            Please provide tax optimization analysis including:
            1. Tax liability analysis and planning strategies
            2. Deduction optimization and expense categorization
            3. Business structure and tax efficiency evaluation
            4. Quarterly tax planning and payment strategies
            5. Record-keeping and documentation requirements
            6. Professional tax advisory recommendations
            """
        }
        
        specific_prompt = task_specific_prompts.get(
            task_type, 
            """
            Please provide a comprehensive financial analysis including:
            1. Current financial situation assessment
            2. Financial performance analysis and trends
            3. Strategic financial recommendations
            4. Implementation plan and timeline
            5. Expected outcomes and benefits
            6. Monitoring and review processes
            """
        )
        
        base_prompt += specific_prompt
        
        base_prompt += """
        
        Please structure your response with:
        - Executive Summary (key findings and recommendations)
        - Financial Analysis (current state and trends)
        - Strategic Recommendations (specific actions and strategies)
        - Implementation Plan (timeline and resource requirements)
        - Financial Projections (expected outcomes and benefits)
        - Risk Assessment (potential challenges and mitigation)
        - Monitoring Plan (KPIs and review processes)
        """
        
        return base_prompt
    
    def _calculate_confidence(self, task_type: str, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on task complexity and available context"""
        base_confidence = 0.85
        
        # Adjust based on task type complexity
        task_complexity_modifiers = {
            "cash_flow_analysis": 0.90,
            "profitability_analysis": 0.88,
            "cost_optimization": 0.85,
            "revenue_analysis": 0.87,
            "budget_planning": 0.85,
            "investment_analysis": 0.80,
            "pricing_optimization": 0.85,
            "financial_performance": 0.88,
            "risk_assessment": 0.82,
            "tax_optimization": 0.80,
            "comprehensive_financial_analysis": 0.75
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
            "cash_flow_analysis": ["cash_flow_analysis", "financial_forecasting"],
            "profitability_analysis": ["profitability_optimization"],
            "cost_optimization": ["cost_structure_analysis"],
            "revenue_analysis": ["revenue_diversification"],
            "budget_planning": ["budget_planning", "financial_forecasting"],
            "investment_analysis": ["investment_analysis"],
            "pricing_optimization": ["pricing_optimization"],
            "financial_performance": ["profitability_optimization", "financial_forecasting"],
            "risk_assessment": ["financial_risk_assessment"],
            "tax_optimization": ["tax_optimization"],
            "comprehensive_financial_analysis": ["cash_flow_analysis", "profitability_optimization"]
        }
        
        return specialization_mapping.get(task_type, ["financial_forecasting"])
    
    def _categorize_financial_focus(self, task_type: str) -> str:
        """Categorize the financial focus area"""
        focus_mapping = {
            "cash_flow_analysis": "liquidity_management",
            "profitability_analysis": "profit_optimization",
            "cost_optimization": "expense_management",
            "revenue_analysis": "growth_strategies",
            "budget_planning": "financial_planning",
            "investment_analysis": "capital_allocation",
            "pricing_optimization": "revenue_optimization",
            "financial_performance": "performance_measurement",
            "risk_assessment": "risk_management",
            "tax_optimization": "tax_efficiency",
            "comprehensive_financial_analysis": "holistic_financial_strategy"
        }
        
        return focus_mapping.get(task_type, "general_financial_analysis")
    
    async def analyze_financial_performance(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze comprehensive financial performance"""
        try:
            analysis = {
                "profitability_metrics": self._calculate_profitability_metrics(financial_data),
                "liquidity_analysis": self._analyze_liquidity(financial_data),
                "efficiency_ratios": self._calculate_efficiency_ratios(financial_data),
                "growth_analysis": self._analyze_growth_trends(financial_data),
                "recommendations": self._generate_financial_recommendations(financial_data)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Financial performance analysis failed: {e}")
            return {"error": str(e)}
    
    async def forecast_cash_flow(self, historical_data: Dict[str, Any], periods: int = 12) -> Dict[str, Any]:
        """Forecast cash flow for specified periods"""
        try:
            forecast = {
                "cash_flow_projection": self._project_cash_flow(historical_data, periods),
                "seasonal_adjustments": self._apply_seasonal_adjustments(historical_data),
                "scenario_analysis": self._perform_scenario_analysis(historical_data),
                "recommendations": self._generate_cash_flow_recommendations(historical_data)
            }
            
            return forecast
            
        except Exception as e:
            logger.error(f"Cash flow forecasting failed: {e}")
            return {"error": str(e)}
    
    def _calculate_profitability_metrics(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key profitability metrics"""
        revenue = financial_data.get("revenue", 0)
        cost_of_goods_sold = financial_data.get("cogs", 0)
        operating_expenses = financial_data.get("operating_expenses", 0)
        
        gross_profit = revenue - cost_of_goods_sold
        operating_profit = gross_profit - operating_expenses
        
        return {
            "gross_profit_margin": (gross_profit / max(revenue, 1)) * 100,
            "operating_profit_margin": (operating_profit / max(revenue, 1)) * 100,
            "net_profit_margin": (financial_data.get("net_profit", operating_profit) / max(revenue, 1)) * 100,
            "gross_profit": gross_profit,
            "operating_profit": operating_profit,
            "revenue_growth": self._calculate_growth_rate(financial_data.get("historical_revenue", []))
        }
    
    def _analyze_liquidity(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze liquidity position"""
        current_assets = financial_data.get("current_assets", 0)
        current_liabilities = financial_data.get("current_liabilities", 0)
        cash = financial_data.get("cash", 0)
        
        return {
            "current_ratio": current_assets / max(current_liabilities, 1),
            "cash_ratio": cash / max(current_liabilities, 1),
            "working_capital": current_assets - current_liabilities,
            "cash_runway_months": self._calculate_cash_runway(financial_data),
            "liquidity_status": self._assess_liquidity_status(current_assets, current_liabilities, cash)
        }
    
    def _calculate_efficiency_ratios(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate operational efficiency ratios"""
        revenue = financial_data.get("revenue", 0)
        total_assets = financial_data.get("total_assets", 0)
        inventory = financial_data.get("inventory", 0)
        accounts_receivable = financial_data.get("accounts_receivable", 0)
        
        return {
            "asset_turnover": revenue / max(total_assets, 1),
            "inventory_turnover": financial_data.get("cogs", 0) / max(inventory, 1),
            "receivables_turnover": revenue / max(accounts_receivable, 1),
            "days_sales_outstanding": (accounts_receivable / max(revenue, 1)) * 365,
            "efficiency_score": self._calculate_efficiency_score(financial_data)
        }
    
    def _analyze_growth_trends(self, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze business growth trends"""
        historical_revenue = financial_data.get("historical_revenue", [])
        historical_profit = financial_data.get("historical_profit", [])
        
        return {
            "revenue_growth_rate": self._calculate_growth_rate(historical_revenue),
            "profit_growth_rate": self._calculate_growth_rate(historical_profit),
            "growth_sustainability": self._assess_growth_sustainability(financial_data),
            "growth_drivers": self._identify_growth_drivers(financial_data),
            "growth_constraints": self._identify_growth_constraints(financial_data)
        }
    
    def _generate_financial_recommendations(self, financial_data: Dict[str, Any]) -> List[str]:
        """Generate specific financial recommendations"""
        recommendations = []
        
        profitability = self._calculate_profitability_metrics(financial_data)
        liquidity = self._analyze_liquidity(financial_data)
        
        # Profitability recommendations
        if profitability["gross_profit_margin"] < 60:
            recommendations.append("Improve gross profit margin through pricing optimization or cost reduction")
        
        if profitability["operating_profit_margin"] < 20:
            recommendations.append("Reduce operating expenses to improve profitability")
        
        # Liquidity recommendations
        if liquidity["current_ratio"] < 1.5:
            recommendations.append("Improve working capital management and cash position")
        
        if liquidity["cash_runway_months"] < 3:
            recommendations.append("Build emergency cash reserves for financial stability")
        
        # Growth recommendations
        if profitability["revenue_growth"] < 10:
            recommendations.append("Implement revenue growth strategies to increase market share")
        
        return recommendations
    
    def _calculate_growth_rate(self, historical_values: List[float]) -> float:
        """Calculate compound annual growth rate from historical data"""
        if len(historical_values) < 2:
            return 0.0
        
        periods = len(historical_values) - 1
        if historical_values[0] == 0:
            return 0.0
        
        growth_rate = ((historical_values[-1] / historical_values[0]) ** (1/periods)) - 1
        return growth_rate * 100
    
    def _calculate_cash_runway(self, financial_data: Dict[str, Any]) -> float:
        """Calculate months of cash runway"""
        cash = financial_data.get("cash", 0)
        monthly_burn_rate = financial_data.get("monthly_expenses", 0)
        
        if monthly_burn_rate <= 0:
            return float('inf')
        
        return cash / monthly_burn_rate
    
    def _assess_liquidity_status(self, current_assets: float, current_liabilities: float, cash: float) -> str:
        """Assess overall liquidity status"""
        current_ratio = current_assets / max(current_liabilities, 1)
        
        if current_ratio >= 2.0 and cash >= current_liabilities * 0.5:
            return "excellent"
        elif current_ratio >= 1.5 and cash >= current_liabilities * 0.3:
            return "good"
        elif current_ratio >= 1.0 and cash >= current_liabilities * 0.2:
            return "fair"
        else:
            return "poor"
    
    def _calculate_efficiency_score(self, financial_data: Dict[str, Any]) -> float:
        """Calculate overall operational efficiency score"""
        # Simple efficiency scoring (would be more sophisticated in production)
        revenue = financial_data.get("revenue", 0)
        expenses = financial_data.get("operating_expenses", 0)
        
        if revenue == 0:
            return 0.0
        
        efficiency_ratio = (revenue - expenses) / revenue
        return max(0, efficiency_ratio * 100)
    
    def _assess_growth_sustainability(self, financial_data: Dict[str, Any]) -> str:
        """Assess sustainability of current growth"""
        profitability = self._calculate_profitability_metrics(financial_data)
        liquidity = self._analyze_liquidity(financial_data)
        
        if (profitability["operating_profit_margin"] > 15 and 
            liquidity["current_ratio"] > 1.5 and
            profitability["revenue_growth"] > 0):
            return "sustainable"
        elif profitability["revenue_growth"] > 20:
            return "aggressive"
        else:
            return "challenged"
    
    def _identify_growth_drivers(self, financial_data: Dict[str, Any]) -> List[str]:
        """Identify key growth drivers"""
        return [
            "Customer acquisition and retention programs",
            "Service expansion and upselling opportunities",
            "Pricing optimization and value proposition enhancement",
            "Operational efficiency improvements",
            "Market expansion and location growth"
        ]
    
    def _identify_growth_constraints(self, financial_data: Dict[str, Any]) -> List[str]:
        """Identify constraints limiting growth"""
        constraints = []
        
        liquidity = self._analyze_liquidity(financial_data)
        profitability = self._calculate_profitability_metrics(financial_data)
        
        if liquidity["cash_runway_months"] < 6:
            constraints.append("Limited cash flow constraining investment capacity")
        
        if profitability["operating_profit_margin"] < 10:
            constraints.append("Low profitability limiting reinvestment capability")
        
        constraints.extend([
            "Market saturation and competitive pressures",
            "Staffing capacity and skilled labor availability",
            "Capital requirements for expansion"
        ])
        
        return constraints
    
    def _project_cash_flow(self, historical_data: Dict[str, Any], periods: int) -> Dict[str, Any]:
        """Project future cash flow"""
        # Simplified projection model (would be more sophisticated in production)
        monthly_revenue = historical_data.get("monthly_revenue", 10000)
        monthly_expenses = historical_data.get("monthly_expenses", 7000)
        growth_rate = historical_data.get("growth_rate", 0.05) / 12  # Monthly growth
        
        projection = {}
        current_revenue = monthly_revenue
        current_expenses = monthly_expenses
        
        for month in range(1, periods + 1):
            current_revenue *= (1 + growth_rate)
            current_expenses *= (1 + growth_rate * 0.8)  # Expenses grow slower
            
            projection[f"month_{month}"] = {
                "revenue": current_revenue,
                "expenses": current_expenses,
                "net_cash_flow": current_revenue - current_expenses
            }
        
        return projection
    
    def _apply_seasonal_adjustments(self, historical_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply seasonal adjustments to projections"""
        return {
            "seasonal_factors": {
                "q1": 0.9,  # Slower start to year
                "q2": 1.1,  # Spring/summer pickup
                "q3": 1.0,  # Normal summer
                "q4": 1.2   # Holiday season boost
            },
            "adjustment_rationale": "Based on typical barbershop seasonal patterns"
        }
    
    def _perform_scenario_analysis(self, historical_data: Dict[str, Any]) -> Dict[str, Any]:
        """Perform scenario analysis for cash flow"""
        base_monthly_flow = historical_data.get("monthly_revenue", 10000) - historical_data.get("monthly_expenses", 7000)
        
        return {
            "optimistic": {
                "cash_flow_change": base_monthly_flow * 1.3,
                "assumptions": "20% revenue growth, 10% expense increase"
            },
            "base_case": {
                "cash_flow_change": base_monthly_flow,
                "assumptions": "Current trends continue"
            },
            "pessimistic": {
                "cash_flow_change": base_monthly_flow * 0.7,
                "assumptions": "15% revenue decline, expenses remain stable"
            }
        }
    
    def _generate_cash_flow_recommendations(self, historical_data: Dict[str, Any]) -> List[str]:
        """Generate cash flow management recommendations"""
        return [
            "Implement monthly cash flow monitoring and forecasting",
            "Negotiate extended payment terms with suppliers",
            "Offer incentives for early customer payments",
            "Build cash reserves equal to 3-6 months of expenses",
            "Consider invoice factoring for improved cash flow",
            "Implement seasonal cash flow planning and management",
            "Review and optimize payment timing for major expenses",
            "Establish line of credit for cash flow smoothing"
        ]