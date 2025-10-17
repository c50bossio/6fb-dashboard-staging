#!/usr/bin/env python3
"""
CrewAI Agent System for 6FB AI Agent System
Implements multiple specialized agents that collaborate to handle barbershop operations
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json

from crewai import Agent, Crew, Task, Process
from crewai.tools import tool
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

# Import our vector store service for RAG
from services.vector_store_service import get_vector_service

logger = logging.getLogger(__name__)

# Initialize LLMs for different agents (Latest Models - Dec 2024)
try:
    # Primary: GPT-4o-mini (most reliable and available)
    openai_llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Advanced reasoning: o3-mini (when available)
    openai_advanced_llm = ChatOpenAI(
        model="gpt-4o",  # Fallback to gpt-4o until o3 is available
        temperature=0.3,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Fallback to basic model if advanced fails
    fallback_llm = openai_llm
    
except Exception as e:
    logger.warning(f"OpenAI initialization failed: {e}")
    openai_llm = None
    openai_advanced_llm = None
    fallback_llm = None

# Custom tools for agents to use
@tool("search_customers")
def search_customers(query: str, barbershop_id: str) -> str:
    """Search customer database for relevant information"""
    vector_service = get_vector_service()
    results = vector_service.search(query, collection='customers', barbershop_id=barbershop_id)
    return json.dumps(results[:3])

@tool("search_appointments")
def search_appointments(query: str, barbershop_id: str) -> str:
    """Search appointment history and schedule"""
    vector_service = get_vector_service()
    results = vector_service.search(query, collection='appointments', barbershop_id=barbershop_id)
    return json.dumps(results[:3])

@tool("search_services")
def search_services(query: str, barbershop_id: str) -> str:
    """Search available services and pricing"""
    vector_service = get_vector_service()
    results = vector_service.search(query, collection='services', barbershop_id=barbershop_id)
    return json.dumps(results[:3])

@tool("check_availability")
def check_availability(date: str, barbershop_id: str) -> str:
    """Check appointment availability for a specific date"""
    # Simplified availability check - in production, query actual calendar
    available_slots = [
        "9:00 AM", "10:00 AM", "11:00 AM",
        "2:00 PM", "3:00 PM", "4:00 PM"
    ]
    return f"Available slots on {date}: {', '.join(available_slots)}"

@tool("calculate_metrics")
def calculate_metrics(metric_type: str, barbershop_id: str) -> str:
    """Calculate business metrics and analytics"""
    # Simplified metrics - in production, query actual data
    metrics = {
        "revenue": {"daily": 1250, "weekly": 8750, "monthly": 35000},
        "appointments": {"daily": 15, "weekly": 105, "monthly": 420},
        "customer_retention": "78%",
        "popular_services": ["Haircut", "Beard Trim", "Hot Shave"]
    }
    return json.dumps(metrics.get(metric_type, metrics))

class BarbershopCrewAgents:
    """
    Manages the crew of specialized agents for barbershop operations
    """
    
    def __init__(self):
        """Initialize all agents with their specific roles and capabilities"""
        
        # Initialize agents with fallback LLM handling
        base_llm = openai_llm or fallback_llm
        advanced_llm = openai_advanced_llm or base_llm
        
        if not base_llm:
            raise ValueError("No LLM available - check your API keys in environment variables")
        
        # Booking Agent - Handles appointment scheduling
        self.booking_agent = Agent(
            role="Booking Assistant",
            goal="Help customers schedule appointments and manage bookings efficiently",
            backstory="""You are an experienced booking coordinator for a high-end barbershop. 
            You understand customer preferences, can check availability, and provide excellent 
            service while managing the appointment schedule.""",
            llm=base_llm,
            tools=[search_customers, search_appointments, check_availability],
            max_iter=3,
            verbose=True
        )
        
        # Stylist Agent - Provides hair and grooming recommendations
        self.stylist_agent = Agent(
            role="Expert Hair Stylist",
            goal="Provide professional hair styling advice and service recommendations",
            backstory="""You are a master barber with 15 years of experience. You understand 
            different hair types, face shapes, and current trends. You provide personalized 
            recommendations and educate customers about proper grooming.""",
            llm=base_llm,  # Use reliable model for customer-facing responses
            tools=[search_services],
            max_iter=3,
            verbose=True
        )
        
        # Inventory Agent - Manages product inventory
        self.inventory_agent = Agent(
            role="Inventory Manager",
            goal="Track product inventory, suggest reorders, and manage stock levels",
            backstory="""You manage inventory for a busy barbershop. You track product usage, 
            predict demand, and ensure the shop never runs out of essential supplies while 
            minimizing excess inventory.""",
            llm=base_llm,
            tools=[],  # Would connect to inventory database in production
            max_iter=2,
            verbose=True
        )
        
        # Analytics Agent - Provides business insights (uses advanced reasoning)
        self.analytics_agent = Agent(
            role="Business Analytics Expert",
            goal="Analyze business data and provide actionable insights",
            backstory="""You are a data analyst specializing in small business optimization. 
            You analyze appointment patterns, revenue trends, and customer behavior to help 
            the barbershop grow and improve efficiency.""",
            llm=advanced_llm,  # Use more capable model for complex analysis
            tools=[calculate_metrics, search_appointments],
            max_iter=3,
            verbose=True
        )
        
        # Customer Service Agent - Handles general inquiries
        self.customer_service_agent = Agent(
            role="Customer Service Representative",
            goal="Provide friendly and helpful customer support",
            backstory="""You are a friendly customer service expert who knows everything about 
            the barbershop. You handle inquiries, resolve issues, and ensure every customer 
            has a positive experience.""",
            llm=base_llm,
            tools=[search_customers, search_services, search_appointments],
            max_iter=3,
            verbose=True
        )
        
        # Manager Agent - Orchestrates other agents (uses advanced reasoning)
        self.manager_agent = Agent(
            role="Barbershop Manager",
            goal="Coordinate operations and delegate tasks to appropriate team members",
            backstory="""You are the barbershop manager who oversees all operations. You 
            understand each team member's strengths and delegate tasks accordingly to ensure 
            smooth operations and customer satisfaction.""",
            llm=advanced_llm,  # Use more capable model for strategic decisions
            tools=[],
            max_iter=2,
            verbose=True
        )
    
    def create_booking_crew(self) -> Crew:
        """Create a crew for handling booking requests"""
        
        booking_task = Task(
            description="""Help the customer book an appointment. Check availability, 
            suggest suitable time slots, and confirm the booking details.""",
            expected_output="Confirmed appointment details or available time slots",
            agent=self.booking_agent
        )
        
        return Crew(
            agents=[self.booking_agent],
            tasks=[booking_task],
            process=Process.sequential,
            verbose=True
        )
    
    def create_recommendation_crew(self) -> Crew:
        """Create a crew for providing styling recommendations"""
        
        style_task = Task(
            description="""Provide personalized hair styling recommendations based on 
            customer preferences, face shape, and current trends.""",
            expected_output="Detailed styling recommendations with service suggestions",
            agent=self.stylist_agent
        )
        
        service_task = Task(
            description="""Recommend specific services and products that match the 
            styling recommendations.""",
            expected_output="List of recommended services with pricing",
            agent=self.customer_service_agent
        )
        
        return Crew(
            agents=[self.stylist_agent, self.customer_service_agent],
            tasks=[style_task, service_task],
            process=Process.sequential,
            verbose=True
        )
    
    def create_analytics_crew(self) -> Crew:
        """Create a crew for business analytics and insights"""
        
        metrics_task = Task(
            description="""Analyze current business metrics including revenue, 
            appointments, and customer retention.""",
            expected_output="Comprehensive metrics report with trends",
            agent=self.analytics_agent
        )
        
        insights_task = Task(
            description="""Based on the metrics, provide actionable insights and 
            recommendations for business improvement.""",
            expected_output="Strategic recommendations for growth",
            agent=self.manager_agent
        )
        
        return Crew(
            agents=[self.analytics_agent, self.manager_agent],
            tasks=[metrics_task, insights_task],
            process=Process.sequential,
            verbose=True
        )
    
    def create_full_service_crew(self) -> Crew:
        """Create a comprehensive crew with all agents collaborating"""
        
        # Define tasks for each agent
        inquiry_task = Task(
            description="Understand the customer's needs and determine the appropriate service",
            expected_output="Clear understanding of customer requirements",
            agent=self.customer_service_agent
        )
        
        recommendation_task = Task(
            description="Provide styling recommendations if needed",
            expected_output="Styling advice and service suggestions",
            agent=self.stylist_agent
        )
        
        booking_task = Task(
            description="Handle appointment booking if requested",
            expected_output="Booking confirmation or availability",
            agent=self.booking_agent
        )
        
        analytics_task = Task(
            description="Track this interaction for business insights",
            expected_output="Interaction logged for analytics",
            agent=self.analytics_agent
        )
        
        coordination_task = Task(
            description="Ensure all tasks are completed and summarize the outcome",
            expected_output="Complete summary of the interaction",
            agent=self.manager_agent
        )
        
        return Crew(
            agents=[
                self.customer_service_agent,
                self.stylist_agent,
                self.booking_agent,
                self.analytics_agent,
                self.manager_agent
            ],
            tasks=[
                inquiry_task,
                recommendation_task,
                booking_task,
                analytics_task,
                coordination_task
            ],
            process=Process.hierarchical,
            manager_llm=openai_llm,
            verbose=True
        )
    
    async def execute_task(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a task with the appropriate crew
        
        Args:
            task_type: Type of task (booking, recommendation, analytics, full_service)
            input_data: Input data for the task
        
        Returns:
            Task results and metadata
        """
        try:
            # Select appropriate crew
            if task_type == "booking":
                crew = self.create_booking_crew()
            elif task_type == "recommendation":
                crew = self.create_recommendation_crew()
            elif task_type == "analytics":
                crew = self.create_analytics_crew()
            else:
                crew = self.create_full_service_crew()
            
            # Execute the crew's tasks
            result = crew.kickoff(inputs=input_data)
            
            return {
                "success": True,
                "task_type": task_type,
                "result": str(result),
                "agents_used": [agent.role for agent in crew.agents],
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Crew execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_type": task_type,
                "timestamp": datetime.now().isoformat()
            }
    
    def get_agent_info(self) -> List[Dict[str, str]]:
        """Get information about available agents"""
        
        # Determine which models are being used
        base_model = "gpt-4o-mini" if openai_llm else "fallback"
        advanced_model = "gpt-4o" if openai_advanced_llm else base_model
        
        agents = [
            {
                "name": "Booking Assistant",
                "role": self.booking_agent.role,
                "capabilities": "Schedule appointments, check availability, manage bookings",
                "model": base_model,
                "cost_optimized": True
            },
            {
                "name": "Expert Stylist",
                "role": self.stylist_agent.role,
                "capabilities": "Hair styling advice, trend recommendations, grooming tips",
                "model": base_model,
                "cost_optimized": True
            },
            {
                "name": "Inventory Manager",
                "role": self.inventory_agent.role,
                "capabilities": "Track inventory, predict demand, suggest reorders",
                "model": base_model,
                "cost_optimized": True
            },
            {
                "name": "Analytics Expert",
                "role": self.analytics_agent.role,
                "capabilities": "Business metrics, trend analysis, growth insights",
                "model": advanced_model,
                "cost_optimized": False
            },
            {
                "name": "Customer Service",
                "role": self.customer_service_agent.role,
                "capabilities": "Answer questions, resolve issues, provide information",
                "model": base_model,
                "cost_optimized": True
            },
            {
                "name": "Manager",
                "role": self.manager_agent.role,
                "capabilities": "Coordinate operations, delegate tasks, oversee quality",
                "model": advanced_model,
                "cost_optimized": False
            }
        ]
        
        return agents

# Singleton instance
crew_agents = None

def get_crew_agents() -> BarbershopCrewAgents:
    """Get or create the crew agents singleton"""
    global crew_agents
    if crew_agents is None:
        crew_agents = BarbershopCrewAgents()
    return crew_agents