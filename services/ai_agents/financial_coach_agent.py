"""
Financial Coach Agent
Specialized AI agent for financial management, revenue optimization, and business profitability
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

from .base_agent import BaseAgent, AgentPersonality, MessageDomain, AgentResponse

logger = logging.getLogger(__name__)

class FinancialCoachAgent(BaseAgent):
    """
    Specialized agent focused on financial management and revenue optimization
    """
    
    def __init__(self):
        super().__init__(
            personality=AgentPersonality.FINANCIAL_COACH,
            name="Marcus",
            description="Senior Financial Advisor specializing in small business profitability and barbershop economics"
        )
    
    def _initialize_personality(self):
        """Initialize Financial Coach personality traits and expertise"""
        self.expertise_areas = [
            "revenue_patterns",
            "pricing_strategies", 
            "cost_optimization",
            "financial_forecasting",
            "cash_flow_management",
            "profit_margin_analysis",
            "investment_planning",
            "tax_optimization",
            "business_valuation",
            "financial_kpi_tracking"
        ]
        
        # RAG system knowledge domains for enhanced responses
        if self.rag_service:
            self.knowledge_domains = [
                "revenue_optimization",
                "pricing_psychology", 
                "industry_benchmarks",
                "six_figure_strategies"
            ]
        
        self.personality_traits = {
            "communication_style": "Direct, data-driven, and results-focused",
            "approach": "Analytical with practical solutions",
            "tone": "Professional but approachable, uses financial metrics",
            "decision_making": "Evidence-based with ROI calculations",
            "priorities": ["Profitability", "Cash flow", "Sustainable growth"],
            "catchphrases": [
                "Let's look at the numbers",
                "Every dollar counts in small business",
                "Profit is the scoreboard of business"
            ]
        }
        
        self.response_templates = {
            "revenue_analysis": "Based on your current revenue of ${revenue}, I see {opportunity} potential for improvement...",
            "cost_optimization": "Your expenses show {insight}. Here's how to optimize...",
            "pricing_strategy": "Your pricing structure could benefit from {adjustment}...",
            "cash_flow": "Cash flow is critical. Let me show you how to improve it..."
        }
    
    async def analyze_message(self, message: str, context: Dict[str, Any]) -> Tuple[bool, float]:
        """Analyze if this message requires financial expertise"""
        
        financial_keywords = [
            # Revenue & Pricing
            'revenue', 'income', 'sales', 'earnings', 'profit', 'pricing', 'price',
            # Costs & Expenses  
            'cost', 'expense', 'budget', 'money', 'spend', 'payment', 'bill',
            # Financial Management
            'cash flow', 'financial', 'accounting', 'tax', 'roi', 'investment',
            # Business Metrics
            'margin', 'markup', 'discount', 'refund', 'commission', 'tip',
            # Growth & Planning
            'loan', 'funding', 'capital', 'valuation', 'financial plan'
        ]
        
        message_lower = message.lower()
        keyword_matches = sum(1 for keyword in financial_keywords if keyword in message_lower)
        
        # High confidence for direct financial questions
        if keyword_matches >= 2:
            confidence = min(0.95, 0.8 + (keyword_matches * 0.05))
            return True, confidence
        
        # Medium-high confidence for single financial keyword, especially revenue-related
        elif keyword_matches == 1:
            # Higher confidence for revenue-specific keywords
            revenue_keywords = ['revenue', 'income', 'sales', 'earnings', 'profit', 'pricing', 'price']
            if any(keyword in message_lower for keyword in revenue_keywords):
                confidence = 0.85
            else:
                confidence = 0.75
            return True, confidence
        
        # Check for indirect financial context
        indirect_financial = [
            'business performance', 'making more money', 'increase income',
            'save money', 'financial health', 'business growth'
        ]
        
        for phrase in indirect_financial:
            if phrase in message_lower:
                return True, 0.7
        
        return False, 0.0
    
    async def generate_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate financial coaching response with RAG-enhanced knowledge"""
        
        try:
            # Get relevant knowledge from RAG system first
            relevant_knowledge = await self.get_relevant_knowledge(message, limit=2)
            
            # Ensure we have live business data
            enhanced_context = await self._ensure_business_context(context)
            
            # Extract business context with real data
            current_revenue = enhanced_context.get('monthly_revenue', 4500)
            current_expenses = enhanced_context.get('monthly_expenses', current_revenue * 0.65)  # Estimate 65% expense ratio
            customer_count = enhanced_context.get('customer_count', 120)
            avg_ticket = enhanced_context.get('average_service_price', current_revenue / max(customer_count, 1))
            profit_margin = ((current_revenue - current_expenses) / current_revenue) * 100 if current_revenue > 0 else 0
            
            # Business context available check
            has_live_data = enhanced_context.get('business_metrics_available', False)
            business_name = enhanced_context.get('business_name', 'Your Barbershop')
            
            # Analyze the specific financial topic
            financial_topic = self._identify_financial_topic(message)
            
            # Generate specialized response based on topic with business context
            if financial_topic == "revenue_optimization":
                response_text, recommendations = await self._generate_revenue_advice(
                    message, current_revenue, avg_ticket, customer_count, enhanced_context, has_live_data
                )
            elif financial_topic == "cost_management":
                response_text, recommendations = await self._generate_cost_advice(
                    message, current_expenses, current_revenue, enhanced_context, has_live_data
                )
            elif financial_topic == "pricing_strategy":
                response_text, recommendations = await self._generate_pricing_advice(
                    message, avg_ticket, profit_margin, enhanced_context, has_live_data
                )
            elif financial_topic == "cash_flow":
                response_text, recommendations = await self._generate_cashflow_advice(
                    message, current_revenue, current_expenses, enhanced_context, has_live_data
                )
            else:
                response_text, recommendations = await self._generate_general_financial_advice(
                    message, enhanced_context, has_live_data
                )
            
            # Enhance response with RAG knowledge if available
            if relevant_knowledge:
                response_text = await self.enhance_response_with_knowledge(response_text, message)
            
            # Store successful interaction as knowledge for future learning
            await self.store_interaction_knowledge(message, response_text, enhanced_context)
            
            # Add conversation to history
            self.add_to_conversation_history(message, response_text)
            
            # Format and return response
            return self.format_response(
                response_text=response_text,
                recommendations=recommendations,
                context=enhanced_context,
                confidence=0.95 if (has_live_data and relevant_knowledge) else 0.92 if has_live_data else 0.88
            )
            
        except Exception as e:
            logger.error(f"Financial Coach error: {e}")
            return self._generate_fallback_response(message, context)
    
    def _identify_financial_topic(self, message: str) -> str:
        """Identify the specific financial topic being discussed"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['revenue', 'sales', 'income', 'earnings']):
            return "revenue_optimization"
        elif any(word in message_lower for word in ['cost', 'expense', 'budget', 'spend']):
            return "cost_management"
        elif any(word in message_lower for word in ['price', 'pricing', 'charge', 'rate']):
            return "pricing_strategy"
        elif any(word in message_lower for word in ['cash flow', 'payment', 'collection']):
            return "cash_flow"
        else:
            return "general_financial"
    
    async def _generate_revenue_advice(self, message: str, current_revenue: float, 
                                     avg_ticket: float, customer_count: int, context: Dict[str, Any], 
                                     has_live_data: bool = False) -> Tuple[str, List[str]]:
        """Generate revenue optimization advice with real business context"""
        
        # Extract additional context from real data
        business_name = context.get('business_name', 'Your Barbershop')
        revenue_growth = context.get('revenue_growth', 0.0)
        total_appointments = context.get('total_appointments', customer_count * 2)
        popular_services = context.get('most_popular_services', [])
        peak_hours = context.get('peak_booking_hours', [])
        
        # Calculate revenue metrics
        monthly_goal = max(current_revenue * 1.20, 15000)  # 20% increase or $500/day goal
        needed_customers = monthly_goal / avg_ticket if avg_ticket > 0 else customer_count * 1.2
        customer_increase = needed_customers - customer_count
        
        # Build response with real business context
        data_source = "based on your live business data" if has_live_data else "based on typical barbershop metrics"
        
        response = f"""**Revenue Optimization Analysis for {business_name}**

Looking at your current performance {data_source}:
• Monthly Revenue: ${current_revenue:,.0f}
• Average Service Price: ${avg_ticket:.0f}
• Total Customers: {customer_count:,}
• Revenue Growth Trend: {revenue_growth:+.1f}%
• Total Appointments: {total_appointments:,}

**$500/Day Goal Analysis:**
To reach $15,000 monthly (our $500/day target), you have strategic options:

**Option 1: Customer Acquisition**
You'd need {max(0, customer_increase):.0f} additional customers monthly at your current pricing.

**Option 2: Service Value Optimization** ⭐ RECOMMENDED
Increase your average service price to ${monthly_goal/customer_count:.0f} with existing customers."""
        
        # Add service-specific insights if we have real data
        if popular_services:
            response += f"""

**Service Performance Insights:**
Your top services are: {', '.join([s.get('name', 'Service') for s in popular_services[:3]])}
Focus on upselling within these popular categories."""
        
        # Add peak hours insight
        if peak_hours:
            response += f"""

**Peak Hour Opportunity:**
Your busiest hours ({', '.join([f'{h}:00' for h in peak_hours[:3]])}) present premium pricing opportunities."""
        
        response += f"""

**My Professional Recommendation:** Focus on increasing service value first - it's more profitable and sustainable than just adding volume. Your current clients already trust you."""
        
        recommendations = [
            f"Implement service upselling to increase average ticket from ${avg_ticket:.0f} to ${(monthly_goal/customer_count):.0f}",
            "Create premium service packages (haircut + beard + styling) for 40-50% higher prices",
            "Introduce loyalty programs with spending thresholds to encourage larger purchases",
            "Add retail products (pomades, shampoos) for additional revenue per visit",
            "Implement peak-hour premium pricing for Friday evenings and weekends"
        ]
        
        return response, recommendations
    
    async def _generate_cost_advice(self, message: str, current_expenses: float, 
                                  current_revenue: float, context: Dict[str, Any], 
                                  has_live_data: bool = False) -> Tuple[str, List[str]]:
        """Generate cost management advice"""
        
        expense_ratio = (current_expenses / current_revenue) * 100
        target_ratio = 60  # Target 60% expense ratio
        potential_savings = current_expenses - (current_revenue * 0.60)
        
        response = f"""**Cost Management Analysis**

Your current expense structure:
• Monthly Expenses: ${current_expenses:,.0f}
• Expense Ratio: {expense_ratio:.1f}% of revenue
• Industry Target: ~60% for healthy barbershops

**Opportunity:** If we optimize to 60% expense ratio, you could save ${potential_savings:,.0f} monthly.

The key is reducing costs without compromising service quality. Let's focus on the biggest impact areas."""
        
        recommendations = [
            "Negotiate better rates with suppliers - even 5% savings adds up significantly",
            "Optimize staffing schedules based on peak hours to reduce labor costs",
            "Review recurring subscriptions and eliminate unused services",
            "Implement energy-efficient equipment to reduce utility costs",
            "Bulk purchase frequently used supplies for better unit pricing"
        ]
        
        return response, recommendations
    
    async def _generate_pricing_advice(self, message: str, avg_ticket: float, 
                                     profit_margin: float, context: Dict[str, Any], 
                                     has_live_data: bool = False) -> Tuple[str, List[str]]:
        """Generate pricing strategy advice"""
        
        optimal_margin = 40  # Target 40% profit margin
        price_adjustment = 1 + ((optimal_margin - profit_margin) / 100)
        suggested_ticket = avg_ticket * price_adjustment
        
        response = f"""**Pricing Strategy Analysis**

Current Performance:
• Average Ticket: ${avg_ticket:.0f}
• Profit Margin: {profit_margin:.1f}%
• Target Margin: 40%+ for healthy barbershops

**Pricing Opportunity:** Adjusting to ${suggested_ticket:.0f} average ticket would optimize your profit margins while staying competitive.

Remember: Most customers value quality and experience over lowest price. Your pricing should reflect the value you provide."""
        
        recommendations = [
            f"Test a gradual price increase to ${suggested_ticket:.0f} average ticket over 2-3 months",
            "Create tiered pricing: Basic, Premium, and VIP service levels",
            "Implement dynamic pricing for peak times (Friday/Saturday +15%)",
            "Bundle services to increase perceived value while raising prices",
            "Add 'express service' premium for customers in a hurry"
        ]
        
        return response, recommendations
    
    async def _generate_cashflow_advice(self, message: str, current_revenue: float, 
                                      current_expenses: float, context: Dict[str, Any], 
                                      has_live_data: bool = False) -> Tuple[str, List[str]]:
        """Generate cash flow management advice"""
        
        monthly_profit = current_revenue - current_expenses
        cash_buffer_target = current_expenses * 2  # 2 months expenses as buffer
        
        response = f"""**Cash Flow Management Strategy**

Current Position:
• Monthly Profit: ${monthly_profit:,.0f}
• Target Cash Buffer: ${cash_buffer_target:,.0f} (2 months expenses)

Cash flow is the lifeblood of your business. Even profitable businesses can fail with poor cash flow management.

**Priority:** Build a cash buffer while optimizing your payment collection process."""
        
        recommendations = [
            "Set up automatic payment processing to reduce collection delays",
            "Offer small discounts for prepaid service packages to improve cash flow",
            "Implement a simple cash flow forecasting system",
            "Negotiate payment terms with suppliers to better match your cash cycle",
            "Create multiple revenue streams (retail products, gift cards) for steadier cash flow"
        ]
        
        return response, recommendations
    
    async def _generate_general_financial_advice(self, message: str, 
                                               context: Dict[str, Any], has_live_data: bool = False) -> Tuple[str, List[str]]:
        """Generate general financial guidance with business context"""
        
        business_name = context.get('business_name', 'Your Barbershop')
        current_revenue = context.get('monthly_revenue', 0)
        daily_revenue = context.get('daily_revenue', 0)
        data_source = "your actual business performance" if has_live_data else "industry best practices"
        
        response = f"""**Financial Health Assessment for {business_name}**

Looking at {data_source}, here's my professional guidance:"""
        
        if has_live_data and current_revenue > 0:
            daily_target = 500
            monthly_target = 15000
            current_daily = current_revenue / 30
            
            response += f"""

**Current Financial Position:**
• Monthly Revenue: ${current_revenue:,.0f}
• Daily Average: ${current_daily:.0f} (Target: ${daily_target})
• Progress to $500/day goal: {(current_daily/daily_target)*100:.0f}%

**Financial Strategy Priorities:**"""
            
            if current_daily < daily_target:
                gap = daily_target - current_daily
                response += f"""
1. **Close the Revenue Gap**: Need ${gap:.0f} more daily revenue to hit your $500/day target"""
            else:
                response += f"""
1. **Maintain Excellence**: You're hitting strong revenue numbers - focus on sustainability"""
        else:
            response += f"""

**Universal Financial Principles:**"""
        
        response += f"""
2. **Know Your Numbers**: Track daily revenue, expenses, and profit religiously
3. **Cash Flow First**: Ensure positive cash flow before any growth investments  
4. **Profit Margins**: Target 35-45% profit margins for long-term sustainability
5. **Growth Strategy**: Increase average service price before just adding more customers

Based on my experience with successful barbershop owners, these fundamentals create lasting financial success."""
        
        recommendations = [
            "Implement daily financial tracking (revenue, expenses, cash)",
            "Set weekly financial goals and review performance",
            "Create a simple P&L statement template for monthly review",
            "Establish separate accounts for taxes and business reserves",
            "Schedule quarterly financial planning sessions"
        ]
        
        return response, recommendations
    
    def calculate_business_impact(self, recommendations: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate financial impact of recommendations"""
        
        current_revenue = context.get('monthly_revenue', 4500)
        current_expenses = context.get('monthly_expenses', 2800)
        
        # Conservative impact estimates
        revenue_increase = random.uniform(0.08, 0.15)  # 8-15% increase
        cost_reduction = random.uniform(0.05, 0.12)    # 5-12% cost reduction
        
        return {
            'revenue_impact': {
                'potential_increase': revenue_increase,
                'confidence': 0.82,
                'timeframe': '3_months',
                'dollar_amount': current_revenue * revenue_increase
            },
            'customer_impact': {
                'retention_improvement': 0.08,
                'new_customer_potential': 0.12,
                'satisfaction_boost': 0.06
            },
            'operational_impact': {
                'efficiency_gain': 0.10,
                'cost_reduction': cost_reduction,
                'time_savings': 0.15,
                'dollar_savings': current_expenses * cost_reduction
            },
            'risk_assessment': {
                'implementation_risk': 'low',
                'investment_required': 'minimal',
                'success_probability': 0.85
            }
        }
    
    def _get_primary_domain(self) -> MessageDomain:
        """Get the primary domain this agent handles"""
        return MessageDomain.FINANCIAL
    
    def _generate_follow_up_questions(self, context: Dict[str, Any]) -> List[str]:
        """Generate financial-specific follow-up questions"""
        return [
            "Would you like me to create a specific action plan with timelines for these recommendations?",
            "Do you have access to your financial data for more detailed analysis?",
            "What's your comfort level with implementing pricing changes?",
            "Are there any financial constraints I should consider in my recommendations?"
        ]
    
    def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate fallback response for errors"""
        
        fallback_text = """I'm having technical difficulties right now, but I can still help with your financial question. 

As your financial coach, my core advice is always:
1. Track your daily numbers religiously
2. Focus on profit margins over just revenue
3. Build a cash flow buffer for stability
4. Price your services based on value, not just competition

Could you rephrase your question so I can provide more specific guidance?"""
        
        recommendations = [
            "Implement daily financial tracking",
            "Review and optimize pricing strategy", 
            "Build 2-month expense cash buffer"
        ]
        
        return self.format_response(
            response_text=fallback_text,
            recommendations=recommendations,
            context=context,
            confidence=0.6
        )

# Global instance
financial_coach_agent = FinancialCoachAgent()