"""
Operations Manager Agent
Specialized AI agent for operational efficiency, scheduling, staff management, and process optimization
"""

import asyncio
import json
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

from .base_agent import BaseAgent, AgentPersonality, MessageDomain, AgentResponse

logger = logging.getLogger(__name__)

class OperationsManagerAgent(BaseAgent):
    """
    Specialized agent focused on operational efficiency and business process optimization
    """
    
    def __init__(self):
        super().__init__(
            personality=AgentPersonality.OPERATIONS_MANAGER,
            name="David",
            description="Operations Management Consultant specializing in small business efficiency and workflow optimization"
        )
    
    def _initialize_personality(self):
        """Initialize Operations Manager personality traits and expertise"""
        # RAG-compatible knowledge types
        self.expertise_areas = [
            "operational_best_practices",
            "scheduling_analytics",
            "staff_management",
            "workflow_optimization",
            "inventory_management",
            "customer_flow_management",
            "quality_control",
            "process_automation",
            "performance_metrics",
            "resource_allocation"
        ]
        
        # RAG system knowledge domains for enhanced responses
        if self.rag_service:
            self.knowledge_domains = [
                "barbershop_operations",
                "staff_management",
                "operational_excellence",
                "quality_control",
                "scheduling_optimization"
            ]
        
        self.personality_traits = {
            "communication_style": "Systematic, process-focused, and solution-oriented",
            "approach": "Data-driven optimization with practical implementation",
            "tone": "Professional and methodical, uses operational terminology",
            "decision_making": "Efficiency-focused with scalability consideration",
            "priorities": ["Operational efficiency", "Customer satisfaction", "Staff productivity"],
            "catchphrases": [
                "Efficiency is doing things right, effectiveness is doing the right things",
                "Smooth operations create happy customers",
                "Systems create consistency, consistency creates quality"
            ]
        }
        
        self.response_templates = {
            "scheduling": "Your current scheduling system shows {inefficiency}. Here's how to optimize...",
            "staff_management": "For effective staff management, focus on {key_area}...",
            "workflow": "Your workflow can be improved by {optimization}...",
            "customer_flow": "Customer flow optimization requires {solution}..."
        }
    
    async def analyze_message(self, message: str, context: Dict[str, Any]) -> Tuple[bool, float]:
        """Analyze if this message requires operations expertise"""
        
        operations_keywords = [
            # Scheduling & Time Management
            'schedule', 'scheduling', 'appointment', 'booking', 'time management',
            'calendar', 'availability', 'time slots', 'peak hours', 'busy times',
            # Staff & Personnel
            'staff', 'employee', 'barber', 'team', 'hiring', 'training',
            'productivity', 'performance', 'management', 'scheduling staff',
            # Operations & Efficiency  
            'operations', 'efficiency', 'workflow', 'process', 'system',
            'optimization', 'streamline', 'improve operations', 'improve efficiency', 'bottleneck', 'wait time',
            # Customer Service Operations
            'customer flow', 'waiting', 'queue', 'service time', 'capacity',
            'customer experience', 'service quality', 'consistency',
            # Business Management
            'inventory', 'supplies', 'equipment', 'maintenance', 'organization'
        ]
        
        message_lower = message.lower()
        keyword_matches = sum(1 for keyword in operations_keywords if keyword in message_lower)
        
        # High confidence for direct operations questions
        if keyword_matches >= 2:
            confidence = min(0.95, 0.75 + (keyword_matches * 0.04))
            return True, confidence
        
        # Medium confidence for single operations keyword
        elif keyword_matches == 1:
            confidence = 0.78
            return True, confidence
        
        # Check for indirect operations context
        indirect_operations = [
            'too busy', 'running behind', 'manage better', 'more organized',
            'staff issues', 'customer complaints', 'quality problems'
        ]
        
        for phrase in indirect_operations:
            if phrase in message_lower:
                return True, 0.72
        
        return False, 0.0
    
    async def generate_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate operations management response with RAG-enhanced knowledge"""
        
        try:
            # Get relevant knowledge from RAG system first
            relevant_knowledge = await self.get_relevant_knowledge(message, limit=2)
            
            # Extract business context
            business_name = context.get('business_name', 'Your Barbershop')
            staff_count = context.get('staff_count', 3)
            daily_customers = context.get('daily_customers', 25)
            avg_service_time = context.get('avg_service_time', 45)  # minutes
            operating_hours = context.get('operating_hours', 10)   # hours per day
            
            # Analyze the specific operations topic
            operations_topic = self._identify_operations_topic(message)
            
            # Generate specialized response based on topic
            if operations_topic == "scheduling":
                response_text, recommendations = await self._generate_scheduling_advice(
                    message, staff_count, daily_customers, avg_service_time, operating_hours
                )
            elif operations_topic == "staff_management":
                response_text, recommendations = await self._generate_staff_advice(
                    message, staff_count, daily_customers
                )
            elif operations_topic == "workflow":
                response_text, recommendations = await self._generate_workflow_advice(
                    message, avg_service_time, daily_customers
                )
            elif operations_topic == "customer_flow":
                response_text, recommendations = await self._generate_customer_flow_advice(
                    message, daily_customers, operating_hours
                )
            elif operations_topic == "quality_control":
                response_text, recommendations = await self._generate_quality_advice(
                    message, context
                )
            else:
                response_text, recommendations = await self._generate_general_operations_advice(
                    message, context
                )
            
            # Enhance response with RAG knowledge if available
            if relevant_knowledge:
                response_text = await self.enhance_response_with_knowledge(response_text, message)
            
            # Store successful interaction as knowledge for future learning
            await self.store_interaction_knowledge(message, response_text, context)
            
            # Add conversation to history
            self.add_to_conversation_history(message, response_text)
            
            # Format and return response
            return self.format_response(
                response_text=response_text,
                recommendations=recommendations,
                context=context,
                confidence=0.91 if relevant_knowledge else 0.86
            )
            
        except Exception as e:
            logger.error(f"Operations Manager error: {e}")
            return self._generate_fallback_response(message, context)
    
    def _identify_operations_topic(self, message: str) -> str:
        """Identify the specific operations topic being discussed"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['schedule', 'appointment', 'booking', 'calendar']):
            return "scheduling"
        elif any(word in message_lower for word in ['staff', 'employee', 'team', 'hiring', 'training']):
            return "staff_management"
        elif any(word in message_lower for word in ['workflow', 'process', 'system', 'efficiency']):
            return "workflow"
        elif any(word in message_lower for word in ['customer flow', 'waiting', 'queue', 'wait time']):
            return "customer_flow"
        elif any(word in message_lower for word in ['quality', 'consistency', 'standard', 'service quality']):
            return "quality_control"
        else:
            return "general_operations"
    
    async def _generate_scheduling_advice(self, message: str, staff_count: int, 
                                        daily_customers: int, avg_service_time: int, 
                                        operating_hours: int) -> Tuple[str, List[str]]:
        """Generate scheduling optimization advice"""
        
        # Calculate scheduling metrics
        total_daily_capacity = (operating_hours * 60 * staff_count) // avg_service_time
        utilization_rate = (daily_customers / total_daily_capacity) * 100
        optimal_buffer = 15  # 15-minute buffer between appointments
        
        response = f"""**Scheduling Optimization Analysis**

Current Metrics:
• Staff: {staff_count} barbers
• Daily Customers: {daily_customers}
• Average Service Time: {avg_service_time} minutes
• Capacity Utilization: {utilization_rate:.1f}%
• Theoretical Daily Capacity: {total_daily_capacity} customers

**Scheduling Efficiency Assessment:**
{self._get_utilization_assessment(utilization_rate)}

**The Optimal Scheduling Formula:**
• Peak Hours (10AM-2PM, 5PM-7PM): Book at 90% capacity
• Standard Hours: Book at 75% capacity  
• Buffer Time: {optimal_buffer} minutes between appointments
• Emergency Slots: Reserve 10% capacity for walk-ins/extensions

**Key Insight:** Perfect scheduling balances maximum utilization with service quality and staff sanity."""
        
        recommendations = [
            f"Implement {optimal_buffer}-minute buffers between appointments to prevent delays",
            "Create peak/off-peak pricing to distribute demand more evenly throughout the day",
            "Use scheduling software with automated reminders to reduce no-shows by 15-20%",
            "Block schedule popular services (beard trims) during less busy hours",
            "Reserve 2-3 emergency slots daily for premium customers or service extensions"
        ]
        
        return response, recommendations
    
    async def _generate_staff_advice(self, message: str, staff_count: int, 
                                   daily_customers: int) -> Tuple[str, List[str]]:
        """Generate staff management advice"""
        
        customers_per_staff = daily_customers / staff_count
        optimal_ratio = 12  # 12 customers per barber per day for quality service
        
        response = f"""**Staff Management Strategy**

Current Staffing Metrics:
• Total Staff: {staff_count} barbers
• Daily Customers: {daily_customers}
• Customers per Barber: {customers_per_staff:.1f}/day
• Optimal Ratio: ~{optimal_ratio} customers per barber/day

**Staffing Assessment:**
{self._get_staffing_assessment(customers_per_staff, optimal_ratio)}

**The High-Performance Team Framework:**

**1. Clear Standards & Training**
Consistency comes from systems, not just talent.

**2. Performance Metrics**
Track customer satisfaction, service time, and revenue per barber.

**3. Growth & Development**
Invest in your team's skills to increase their value and retention.

**4. Efficient Communication**
Daily briefings and clear processes prevent confusion and conflicts."""
        
        recommendations = [
            "Create standardized service protocols for consistency across all barbers",
            "Implement monthly one-on-one performance reviews with specific metrics",
            "Cross-train staff on multiple services to increase flexibility and coverage",
            "Establish clear opening/closing checklists to ensure smooth daily operations",
            "Create a structured onboarding program for new hires (2-week minimum)"
        ]
        
        return response, recommendations
    
    async def _generate_workflow_advice(self, message: str, avg_service_time: int, 
                                      daily_customers: int) -> Tuple[str, List[str]]:
        """Generate workflow optimization advice"""
        
        target_service_time = 40  # Target 40 minutes for quality haircut
        efficiency_opportunity = max(0, avg_service_time - target_service_time)
        
        response = f"""**Workflow Optimization Strategy**

Current Performance:
• Average Service Time: {avg_service_time} minutes
• Target Service Time: {target_service_time} minutes
• Daily Customers: {daily_customers}

**Workflow Efficiency Analysis:**
{self._get_workflow_assessment(avg_service_time, target_service_time)}

**The Optimized Barbershop Workflow:**

**1. Pre-Service Setup (2 minutes)**
• Station prepared and sanitized
• Customer welcomed and consultation completed

**2. Core Service Delivery ({target_service_time-10} minutes)**
• Focused, uninterrupted haircut execution
• Minimal conversation distractions during cutting

**3. Finishing & Payment (8 minutes)**
• Final styling, cleanup, product recommendations
• Payment processing and next appointment booking

**The goal:** Deliver exceptional quality while maintaining efficient throughput."""
        
        recommendations = [
            "Standardize station setup procedures to save 3-5 minutes between customers",
            "Create pre-service consultation templates to streamline decision-making",
            "Implement 'service time targets' for different service types",
            "Use timer system to track and improve individual service efficiency",
            "Design optimal tool organization to minimize movement during service"
        ]
        
        return response, recommendations
    
    async def _generate_customer_flow_advice(self, message: str, daily_customers: int, 
                                           operating_hours: int) -> Tuple[str, List[str]]:
        """Generate customer flow optimization advice"""
        
        customers_per_hour = daily_customers / operating_hours
        peak_multiplier = 2.5  # Peak hours see 2.5x average flow
        peak_customers = customers_per_hour * peak_multiplier
        
        response = f"""**Customer Flow Management Strategy**

Current Flow Metrics:
• Daily Customers: {daily_customers}
• Operating Hours: {operating_hours}
• Average Flow: {customers_per_hour:.1f} customers/hour
• Estimated Peak Flow: {peak_customers:.1f} customers/hour

**Customer Flow Optimization:**

**1. Demand Distribution**
Smooth out peaks and valleys through strategic scheduling and pricing.

**2. Wait Time Management**
Perception of wait time is as important as actual wait time.

**3. Space Utilization**
Design your layout to handle peak capacity without feeling cramped.

**4. Communication Systems**
Keep customers informed about wait times and service progress.

**Ideal Flow:** Customers should feel welcomed, informed, and valued throughout their entire experience."""
        
        recommendations = [
            "Create a comfortable waiting area with entertainment and refreshments",
            "Implement real-time wait tracking and communicate delays proactively",
            "Offer 'express services' during peak times for simple cuts",
            "Use appointment confirmation and arrival notifications to manage flow",
            "Design clear traffic flow patterns to avoid congestion during busy periods"
        ]
        
        return response, recommendations
    
    async def _generate_quality_advice(self, message: str, context: Dict[str, Any]) -> Tuple[str, List[str]]:
        """Generate quality control advice"""
        
        response = f"""**Quality Control System Implementation**

Quality is your competitive advantage. Consistent, excellent service builds reputation and justifies premium pricing.

**The Quality Assurance Framework:**

**1. Service Standards**
Define exactly what "excellent service" means for each service type.

**2. Training & Certification**
Ensure every team member can deliver to your standards consistently.

**3. Customer Feedback Systems**
Regular feedback collection and response to maintain quality awareness.

**4. Continuous Improvement**
Regular service audits and staff development to raise the bar.

**Quality Metrics to Track:**
• Customer satisfaction scores
• Service consistency ratings
• Repeat customer percentage
• Average service ratings"""
        
        recommendations = [
            "Create detailed service checklists for each type of haircut and service",
            "Implement peer review system where barbers evaluate each other's work",
            "Establish customer feedback collection process (surveys, follow-up calls)",
            "Schedule monthly team meetings to discuss quality improvements",
            "Create standard operating procedures (SOPs) for all services and processes"
        ]
        
        return response, recommendations
    
    async def _generate_general_operations_advice(self, message: str, 
                                                context: Dict[str, Any]) -> Tuple[str, List[str]]:
        """Generate general operations guidance"""
        
        response = f"""**Operations Excellence Framework**

Great operations aren't visible to customers - they just experience the results: shorter waits, consistent quality, smooth service, and happy staff.

**The Four Pillars of Barbershop Operations:**

**1. Systems & Processes**
Document everything so quality doesn't depend on individual memory or mood.

**2. Performance Measurement**
You can't improve what you don't measure. Track key metrics consistently.

**3. Continuous Improvement**
Regular review and optimization of all processes and systems.

**4. Team Development**
Invest in your people - they deliver the customer experience.

**Remember:** The goal isn't perfection, it's consistent excellence that customers can rely on."""
        
        recommendations = [
            "Create operations manual documenting all key processes and procedures",
            "Implement weekly operational review meetings to identify and solve problems",
            "Establish key performance indicators (KPIs) for tracking operational success",
            "Develop systematic approach to staff training and development",
            "Create customer feedback loop to identify operational pain points"
        ]
        
        return response, recommendations
    
    def _get_utilization_assessment(self, utilization_rate: float) -> str:
        """Get assessment of scheduling utilization"""
        if utilization_rate < 60:
            return "LOW UTILIZATION: Significant capacity available for growth or optimization."
        elif utilization_rate < 80:
            return "GOOD UTILIZATION: Healthy capacity with room for peak demand."
        elif utilization_rate < 95:
            return "HIGH UTILIZATION: Efficient scheduling with minimal waste."
        else:
            return "OVER-UTILIZATION: Risk of delays, staff burnout, and quality issues."
    
    def _get_staffing_assessment(self, customers_per_staff: float, optimal_ratio: float) -> str:
        """Get assessment of staffing levels"""
        if customers_per_staff < optimal_ratio * 0.7:
            return "UNDERSTAFFED UTILIZATION: Staff may be underutilized or business has growth potential."
        elif customers_per_staff <= optimal_ratio:
            return "OPTIMAL STAFFING: Good balance of workload and service quality."
        elif customers_per_staff <= optimal_ratio * 1.3:
            return "HIGH WORKLOAD: Staff is busy but manageable with good systems."
        else:
            return "OVERSTAFFED DEMAND: Risk of staff burnout and declining service quality."
    
    def _get_workflow_assessment(self, current_time: int, target_time: int) -> str:
        """Get assessment of workflow efficiency"""
        if current_time <= target_time:
            return f"EFFICIENT WORKFLOW: Service time is at or below target. Focus on maintaining quality."
        elif current_time <= target_time * 1.15:
            return f"SLIGHTLY SLOW: {current_time - target_time} minutes above target. Minor optimization needed."
        else:
            return f"WORKFLOW OPTIMIZATION NEEDED: {current_time - target_time} minutes above target. Significant efficiency gains possible."
    
    def calculate_business_impact(self, recommendations: List[str], context: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate operational impact of recommendations"""
        
        daily_customers = context.get('daily_customers', 25)
        current_revenue = context.get('monthly_revenue', 4500)
        
        # Operations impact estimates
        efficiency_gain = random.uniform(0.15, 0.25)  # 15-25% efficiency improvement
        capacity_increase = random.uniform(0.10, 0.20)  # 10-20% capacity increase
        
        return {
            'revenue_impact': {
                'potential_increase': capacity_increase * 0.7,  # Revenue increase from capacity
                'confidence': 0.84,
                'timeframe': '3_months',
                'dollar_amount': current_revenue * capacity_increase * 0.7
            },
            'customer_impact': {
                'retention_improvement': 0.12,  # Better experience = better retention
                'new_customer_potential': capacity_increase,
                'satisfaction_boost': 0.15,  # Smoother operations = happier customers
                'reduced_wait_times': 0.30
            },
            'operational_impact': {
                'efficiency_gain': efficiency_gain,
                'cost_reduction': 0.08,  # Better systems reduce waste
                'time_savings': 0.20,    # Streamlined processes
                'staff_productivity': 0.18
            },
            'risk_assessment': {
                'implementation_risk': 'low',
                'investment_required': 'low',
                'success_probability': 0.88
            }
        }
    
    def _get_primary_domain(self) -> MessageDomain:
        """Get the primary domain this agent handles"""
        return MessageDomain.OPERATIONS
    
    def _generate_follow_up_questions(self, context: Dict[str, Any]) -> List[str]:
        """Generate operations-specific follow-up questions"""
        return [
            "What's your biggest operational challenge right now - scheduling, staff management, or customer flow?",
            "Do you currently use any scheduling or management software?",
            "How many staff members do you have, and what are their roles?",
            "What are your busiest hours, and how do you currently handle peak demand?"
        ]
    
    def _generate_fallback_response(self, message: str, context: Dict[str, Any]) -> AgentResponse:
        """Generate fallback response for errors"""
        
        fallback_text = """I'm experiencing some technical difficulties, but I can still help with your operations question!

As your operations manager, here are my fundamental principles for smooth barbershop operations:

1. **Systems Create Consistency** - Document your processes so quality doesn't depend on memory
2. **Measure What Matters** - Track customer wait times, service times, and satisfaction
3. **Plan for Peak Hours** - Your busiest times reveal your operational strengths and weaknesses
4. **Invest in Your Team** - Well-trained, well-organized staff deliver better customer experiences

What specific operational challenge are you facing? Scheduling, staff management, customer flow, or something else?"""
        
        recommendations = [
            "Create standardized opening and closing checklists",
            "Implement appointment confirmation system to reduce no-shows",
            "Design clear service protocols for consistency"
        ]
        
        return self.format_response(
            response_text=fallback_text,
            recommendations=recommendations,
            context=context,
            confidence=0.65
        )

# Global instance
operations_manager_agent = OperationsManagerAgent()