#!/usr/bin/env python3
"""
Master Coach Agent - Specialized AI agent for strategic business coaching and leadership
Handles high-level strategy, leadership development, and comprehensive business guidance
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base_agent import BaseAgent, TaskResult
from ..structured_outputs import (
    StrategicPlanResponse,
    LeadershipAssessment,
    BusinessGrowthPlan,
    OperationalExcellenceReport
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MasterCoachAgent(BaseAgent):
    """
    Specialized agent for strategic business coaching and leadership development
    
    Capabilities:
    - Strategic business planning and execution
    - Leadership development and team management
    - Operational excellence and process improvement
    - Growth strategy formulation and implementation
    - Problem-solving and decision support
    - Best practice identification and adoption
    - Vision and goal setting
    - Change management and transformation
    """
    
    def __init__(self):
        super().__init__(
            agent_name="Master Coach Agent",
            agent_type="master_coach",
            model_preference="openai",
            default_model="gpt-4o-mini"
        )
        
        self.specializations = [
            "strategic_planning",
            "leadership_development",
            "operational_excellence",
            "growth_strategy",
            "change_management",
            "team_building",
            "decision_making_frameworks",
            "performance_optimization",
            "business_transformation",
            "executive_coaching"
        ]
        
        logger.info(f"{self.agent_name} initialized with {len(self.specializations)} specializations")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for strategic coaching analysis"""
        return """You are an expert Master Coach Agent specializing in strategic business 
        leadership and comprehensive business guidance for barbershop and beauty business owners.
        
        Your expertise includes:
        - Strategic business planning, vision setting, and long-term goal development
        - Leadership development, team management, and organizational effectiveness
        - Operational excellence, process optimization, and quality management
        - Growth strategy formulation, market expansion, and scaling operations
        - Problem-solving frameworks, decision-making processes, and critical thinking
        - Change management, business transformation, and adaptation strategies
        - Performance management, KPI development, and accountability systems
        - Best practice identification, implementation, and continuous improvement
        - Executive coaching, mindset development, and personal effectiveness
        - Culture building, team dynamics, and organizational development
        
        Provide strategic coaching recommendations that are:
        - Visionary yet practical with clear implementation roadmaps
        - Leadership-focused with emphasis on personal and team development
        - Systems-thinking oriented with holistic business perspective
        - Growth-minded while building sustainable foundations
        - Adaptive and resilient for changing market conditions
        - Evidence-based with proven frameworks and methodologies
        
        Always include:
        - Strategic vision and clear objectives
        - Leadership development priorities and action plans
        - Implementation frameworks with milestones and accountability
        - Change management considerations and risk mitigation
        - Performance measurement and continuous improvement processes
        - Personal and professional development recommendations
        """
    
    def get_specialized_capabilities(self) -> List[str]:
        """Return master coaching specific capabilities"""
        return [
            "strategic_vision_development",
            "leadership_assessment_coaching",
            "operational_excellence_design",
            "growth_strategy_formulation",
            "change_management_planning",
            "team_development_programs",
            "decision_framework_creation",
            "performance_system_design",
            "transformation_roadmap_development",
            "executive_development_planning",
            "culture_building_strategies",
            "succession_planning_development",
            "crisis_management_preparation",
            "innovation_strategy_development",
            "stakeholder_management_optimization"
        ]
    
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process strategic coaching task"""
        start_time = time.time()
        
        try:
            message = task.get("message", "")
            context = task.get("context", {})
            relevant_knowledge = task.get("relevant_knowledge", [])
            structured_output_model = task.get("structured_output_model")
            
            logger.info(f"{self.agent_name} processing: {message[:50]}...")
            
            # Analyze task type and determine appropriate response
            task_type = self._determine_task_type(message, context)
            response = None
            tokens_used = 0
            
            # Format relevant knowledge for context enhancement
            knowledge_context = self._format_knowledge_context(relevant_knowledge)
            enhanced_context = {**context}
            if knowledge_context:
                enhanced_context["business_knowledge"] = knowledge_context
                logger.info(f"Enhanced context with {len(relevant_knowledge)} knowledge documents")
            
            if structured_output_model:
                # Generate structured response using the output service
                response = await self._generate_structured_response(
                    prompt=message,
                    output_model=structured_output_model,
                    system_prompt=self.get_system_prompt()
                )
                result_content = response
            else:
                # Generate detailed strategic coaching analysis
                analysis_prompt = self._build_analysis_prompt(message, enhanced_context, task_type)
                
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
                    "coaching_approach": "strategic_holistic",
                    "focus_area": self._categorize_focus_area(task_type)
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
        """Determine the type of strategic coaching task"""
        message_lower = message.lower()
        
        # Strategic planning and vision
        if any(keyword in message_lower for keyword in [
            "strategy", "strategic", "vision", "mission", "planning", "direction"
        ]):
            return "strategic_planning"
        
        # Leadership and team development
        elif any(keyword in message_lower for keyword in [
            "leadership", "leader", "team", "staff", "management", "development"
        ]):
            return "leadership_development"
        
        # Operational excellence and processes
        elif any(keyword in message_lower for keyword in [
            "operations", "process", "efficiency", "workflow", "systems", "quality"
        ]):
            return "operational_excellence"
        
        # Growth and expansion strategies
        elif any(keyword in message_lower for keyword in [
            "growth", "expand", "scale", "scaling", "expansion", "grow"
        ]):
            return "growth_strategy"
        
        # Change management and transformation
        elif any(keyword in message_lower for keyword in [
            "change", "transformation", "transition", "evolve", "adapt", "pivot"
        ]):
            return "change_management"
        
        # Problem solving and decision making
        elif any(keyword in message_lower for keyword in [
            "problem", "challenge", "decision", "solve", "issue", "difficulty"
        ]):
            return "problem_solving"
        
        # Performance and optimization
        elif any(keyword in message_lower for keyword in [
            "performance", "optimization", "improve", "better", "enhance", "optimize"
        ]):
            return "performance_optimization"
        
        # Culture and organizational development
        elif any(keyword in message_lower for keyword in [
            "culture", "values", "environment", "workplace", "organization", "morale"
        ]):
            return "culture_development"
        
        # Crisis management and recovery
        elif any(keyword in message_lower for keyword in [
            "crisis", "emergency", "recovery", "difficult", "struggling", "trouble"
        ]):
            return "crisis_management"
        
        # Innovation and competitive advantage
        elif any(keyword in message_lower for keyword in [
            "innovation", "competitive", "advantage", "differentiate", "unique", "standout"
        ]):
            return "innovation_strategy"
        
        else:
            return "comprehensive_business_coaching"
    
    def _build_analysis_prompt(self, message: str, context: Dict[str, Any], task_type: str) -> str:
        """Build comprehensive analysis prompt based on task type"""
        
        base_prompt = f"""
        Strategic Business Coaching Request: {message}
        
        Task Type: {task_type}
        
        Context Information:
        """
        
        # Add context information
        if context:
            # Include business knowledge if available
            if "business_knowledge" in context:
                base_prompt += f"\n{context['business_knowledge']}\n"
                # Remove business_knowledge from regular context to avoid duplication
                regular_context = {k: v for k, v in context.items() if k != "business_knowledge"}
                if regular_context:
                    base_prompt += f"\n- Business Context: {regular_context}\n"
            else:
                base_prompt += f"\n- Business Context: {context}\n"
        
        # Add task-specific analysis requirements
        task_specific_prompts = {
            "strategic_planning": """
            Please provide comprehensive strategic planning guidance including:
            1. Vision and mission development with core values alignment
            2. Strategic objectives setting and goal hierarchy development
            3. Market analysis and competitive positioning strategy
            4. Resource allocation and capability building priorities
            5. Implementation roadmap with milestones and accountability
            6. Performance measurement and strategic review processes
            """,
            
            "leadership_development": """
            Please provide leadership development guidance including:
            1. Leadership assessment and personal development planning
            2. Team building and staff development strategies
            3. Communication and conflict resolution skill building
            4. Delegation, empowerment, and accountability systems
            5. Leadership style adaptation and situational management
            6. Succession planning and leadership pipeline development
            """,
            
            "operational_excellence": """
            Please provide operational excellence guidance including:
            1. Current operations assessment and efficiency analysis
            2. Process optimization and workflow improvement strategies
            3. Quality management and service standardization
            4. Technology integration and automation opportunities
            5. Performance monitoring and continuous improvement systems
            6. Best practice implementation and knowledge management
            """,
            
            "growth_strategy": """
            Please provide growth strategy guidance including:
            1. Growth opportunity assessment and market analysis
            2. Scaling strategy development and resource planning
            3. Market expansion and customer acquisition strategies
            4. Operational scaling and infrastructure development
            5. Financial planning and investment requirements
            6. Risk management and sustainable growth planning
            """,
            
            "change_management": """
            Please provide change management guidance including:
            1. Change readiness assessment and stakeholder analysis
            2. Change strategy development and communication planning
            3. Implementation roadmap with risk mitigation strategies
            4. Resistance management and employee engagement
            5. Training and development for new capabilities
            6. Change measurement and continuous adaptation
            """,
            
            "problem_solving": """
            Please provide problem-solving guidance including:
            1. Problem definition and root cause analysis
            2. Solution generation and evaluation frameworks
            3. Decision-making criteria and stakeholder considerations
            4. Implementation planning and resource allocation
            5. Risk assessment and contingency planning
            6. Success measurement and learning capture
            """,
            
            "performance_optimization": """
            Please provide performance optimization guidance including:
            1. Current performance assessment and gap analysis
            2. Key performance indicator development and tracking
            3. Performance improvement strategies and initiatives
            4. Individual and team performance management
            5. Systems and process optimization opportunities
            6. Performance culture development and accountability
            """,
            
            "culture_development": """
            Please provide culture development guidance including:
            1. Current culture assessment and desired state definition
            2. Values clarification and behavior expectation setting
            3. Culture change strategy and communication planning
            4. Employee engagement and empowerment initiatives
            5. Recognition and reward system alignment
            6. Culture measurement and continuous reinforcement
            """,
            
            "crisis_management": """
            Please provide crisis management guidance including:
            1. Crisis assessment and immediate response priorities
            2. Stakeholder communication and reputation management
            3. Operational continuity and recovery planning
            4. Financial stabilization and resource optimization
            5. Team morale and leadership during crisis
            6. Long-term recovery and resilience building
            """,
            
            "innovation_strategy": """
            Please provide innovation strategy guidance including:
            1. Innovation opportunity assessment and ideation
            2. Competitive differentiation and value proposition development
            3. Innovation process and culture development
            4. Technology adoption and digital transformation
            5. Customer experience innovation and service design
            6. Innovation measurement and portfolio management
            """
        }
        
        specific_prompt = task_specific_prompts.get(
            task_type, 
            """
            Please provide comprehensive business coaching guidance including:
            1. Current situation assessment and opportunity identification
            2. Strategic recommendations and implementation priorities
            3. Leadership and organizational development needs
            4. Operational improvements and efficiency gains
            5. Growth opportunities and scaling considerations
            6. Risk management and sustainability planning
            """
        )
        
        base_prompt += specific_prompt
        
        base_prompt += """
        
        Please structure your response with:
        - Executive Summary (key insights and strategic priorities)
        - Situation Assessment (current state and opportunities)
        - Strategic Recommendations (specific strategies and frameworks)
        - Implementation Plan (phases, timelines, and responsibilities)
        - Leadership Development (personal and team growth priorities)
        - Success Metrics (KPIs and measurement frameworks)
        - Next Steps (immediate actions and long-term milestones)
        """
        
        return base_prompt
    
    def _calculate_confidence(self, task_type: str, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on task complexity and available context"""
        base_confidence = 0.88
        
        # Adjust based on task type complexity
        task_complexity_modifiers = {
            "strategic_planning": 0.90,
            "leadership_development": 0.92,
            "operational_excellence": 0.88,
            "growth_strategy": 0.85,
            "change_management": 0.85,
            "problem_solving": 0.90,
            "performance_optimization": 0.88,
            "culture_development": 0.85,
            "crisis_management": 0.80,
            "innovation_strategy": 0.82,
            "comprehensive_business_coaching": 0.85
        }
        
        confidence = task_complexity_modifiers.get(task_type, base_confidence)
        
        # Adjust based on context availability
        if context:
            if len(context) >= 3:
                confidence += 0.05
            elif len(context) >= 1:
                confidence += 0.02
        else:
            confidence -= 0.03
        
        return min(confidence, 0.95)  # Cap at 95%
    
    def _get_relevant_specializations(self, task_type: str) -> List[str]:
        """Get relevant specializations for the task type"""
        specialization_mapping = {
            "strategic_planning": ["strategic_planning", "business_transformation"],
            "leadership_development": ["leadership_development", "executive_coaching"],
            "operational_excellence": ["operational_excellence", "performance_optimization"],
            "growth_strategy": ["growth_strategy", "strategic_planning"],
            "change_management": ["change_management", "business_transformation"],
            "problem_solving": ["decision_making_frameworks", "executive_coaching"],
            "performance_optimization": ["performance_optimization", "operational_excellence"],
            "culture_development": ["team_building", "leadership_development"],
            "crisis_management": ["change_management", "decision_making_frameworks"],
            "innovation_strategy": ["growth_strategy", "business_transformation"],
            "comprehensive_business_coaching": ["strategic_planning", "leadership_development"]
        }
        
        return specialization_mapping.get(task_type, ["strategic_planning"])
    
    def _categorize_focus_area(self, task_type: str) -> str:
        """Categorize the coaching focus area"""
        focus_mapping = {
            "strategic_planning": "strategic_leadership",
            "leadership_development": "people_leadership",
            "operational_excellence": "operational_leadership",
            "growth_strategy": "growth_leadership",
            "change_management": "transformational_leadership",
            "problem_solving": "analytical_leadership",
            "performance_optimization": "performance_leadership",
            "culture_development": "cultural_leadership",
            "crisis_management": "crisis_leadership",
            "innovation_strategy": "innovative_leadership",
            "comprehensive_business_coaching": "holistic_leadership"
        }
        
        return focus_mapping.get(task_type, "general_business_coaching")
    
    async def develop_strategic_plan(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Develop comprehensive strategic business plan"""
        try:
            strategic_plan = {
                "vision_mission": self._develop_vision_mission(business_data),
                "strategic_objectives": self._define_strategic_objectives(business_data),
                "implementation_roadmap": self._create_implementation_roadmap(business_data),
                "success_metrics": self._define_success_metrics(business_data)
            }
            
            return strategic_plan
            
        except Exception as e:
            logger.error(f"Strategic plan development failed: {e}")
            return {"error": str(e)}
    
    async def assess_leadership_capabilities(self, leadership_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess and develop leadership capabilities"""
        try:
            assessment = {
                "leadership_strengths": self._identify_leadership_strengths(leadership_data),
                "development_opportunities": self._identify_development_opportunities(leadership_data),
                "development_plan": self._create_leadership_development_plan(leadership_data),
                "coaching_recommendations": self._generate_coaching_recommendations(leadership_data)
            }
            
            return assessment
            
        except Exception as e:
            logger.error(f"Leadership assessment failed: {e}")
            return {"error": str(e)}
    
    def _develop_vision_mission(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Develop vision and mission statements"""
        business_type = business_data.get("business_type", "barbershop")
        location = business_data.get("location", "local community")
        
        return {
            "vision": f"To be the premier {business_type} in {location}, known for exceptional service, skilled craftsmanship, and creating lasting relationships with our clients.",
            "mission": f"We provide superior {business_type} services that exceed expectations, delivered by passionate professionals in a welcoming environment that celebrates style, confidence, and community.",
            "core_values": [
                "Excellence in craftsmanship and service delivery",
                "Respect for clients, team members, and community",
                "Continuous learning and skill development",
                "Integrity in all business practices",
                "Innovation while honoring traditional values"
            ]
        }
    
    def _define_strategic_objectives(self, business_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Define strategic objectives with measurable goals"""
        return [
            {
                "objective": "Financial Excellence",
                "description": "Achieve sustainable profitability and financial growth",
                "goals": [
                    "Increase revenue by 25% within 12 months",
                    "Improve profit margins to 20% or higher",
                    "Build cash reserves equal to 6 months of expenses"
                ]
            },
            {
                "objective": "Customer Excellence", 
                "description": "Deliver exceptional customer experiences and build loyalty",
                "goals": [
                    "Achieve customer satisfaction score of 4.8+ out of 5",
                    "Increase customer retention rate to 85%+",
                    "Build customer base by 30% through referrals"
                ]
            },
            {
                "objective": "Operational Excellence",
                "description": "Optimize operations for efficiency and quality",
                "goals": [
                    "Reduce wait times to under 10 minutes",
                    "Achieve 95% appointment booking efficiency",
                    "Implement quality management systems"
                ]
            },
            {
                "objective": "Team Excellence",
                "description": "Build and develop a high-performing team",
                "goals": [
                    "Achieve team satisfaction score of 4.5+ out of 5",
                    "Reduce staff turnover to under 20% annually",
                    "Implement comprehensive training and development program"
                ]
            }
        ]
    
    def _create_implementation_roadmap(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create strategic implementation roadmap"""
        return {
            "phase_1": {
                "timeframe": "Months 1-3: Foundation Building",
                "priorities": [
                    "Establish baseline metrics and measurement systems",
                    "Implement core operational processes and quality standards",
                    "Launch team development and training initiatives",
                    "Begin customer experience optimization"
                ]
            },
            "phase_2": {
                "timeframe": "Months 4-8: Growth Acceleration", 
                "priorities": [
                    "Execute customer acquisition and retention strategies",
                    "Scale successful operational improvements",
                    "Expand service offerings and revenue streams",
                    "Strengthen team capabilities and leadership"
                ]
            },
            "phase_3": {
                "timeframe": "Months 9-12: Excellence Mastery",
                "priorities": [
                    "Achieve operational excellence and efficiency targets",
                    "Maximize customer satisfaction and loyalty",
                    "Optimize financial performance and profitability",
                    "Prepare for sustainable long-term growth"
                ]
            }
        }
    
    def _define_success_metrics(self, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Define success metrics and KPIs"""
        return {
            "financial_metrics": [
                "Monthly recurring revenue (MRR)",
                "Gross profit margin percentage",
                "Customer acquisition cost (CAC)",
                "Customer lifetime value (CLV)",
                "Cash flow and working capital"
            ],
            "operational_metrics": [
                "Appointment booking rate",
                "Service completion time",
                "Resource utilization rate",
                "Quality scores and service standards",
                "Operational efficiency ratios"
            ],
            "customer_metrics": [
                "Customer satisfaction (CSAT) scores",
                "Net Promoter Score (NPS)",
                "Customer retention rate",
                "Referral rate and word-of-mouth",
                "Customer complaint resolution time"
            ],
            "team_metrics": [
                "Employee satisfaction scores",
                "Staff retention rate",
                "Productivity per team member",
                "Training completion rates",
                "Internal promotion rate"
            ]
        }
    
    def _identify_leadership_strengths(self, leadership_data: Dict[str, Any]) -> List[str]:
        """Identify current leadership strengths"""
        # In production, this would analyze actual assessment data
        return [
            "Strong technical expertise and industry knowledge",
            "Passion for service excellence and customer satisfaction",
            "Commitment to continuous learning and improvement",
            "Good relationships with team members and clients",
            "Entrepreneurial mindset and business acumen"
        ]
    
    def _identify_development_opportunities(self, leadership_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """Identify leadership development opportunities"""
        return [
            {
                "area": "Strategic Thinking",
                "description": "Develop long-term strategic planning and systems thinking capabilities",
                "priority": "high"
            },
            {
                "area": "Team Leadership",
                "description": "Enhance delegation, coaching, and performance management skills",
                "priority": "high"
            },
            {
                "area": "Financial Management",
                "description": "Strengthen financial analysis, budgeting, and investment decision skills",
                "priority": "medium"
            },
            {
                "area": "Change Management",
                "description": "Build capabilities for leading organizational change and transformation",
                "priority": "medium"
            },
            {
                "area": "Communication",
                "description": "Improve public speaking, presentation, and stakeholder communication",
                "priority": "low"
            }
        ]
    
    def _create_leadership_development_plan(self, leadership_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create comprehensive leadership development plan"""
        return {
            "90_day_priorities": [
                "Complete leadership assessment and 360-degree feedback",
                "Establish regular one-on-one meetings with team members",
                "Implement weekly strategic planning and review sessions",
                "Begin financial management skills development program"
            ],
            "6_month_goals": [
                "Develop and communicate clear vision and strategic direction",
                "Implement performance management and coaching systems",
                "Complete financial management certification or training",
                "Establish leadership accountability and measurement systems"
            ],
            "12_month_objectives": [
                "Achieve measurable improvements in team engagement and performance",
                "Successfully lead at least one significant change initiative",
                "Demonstrate proficiency in financial analysis and decision making",
                "Build succession planning and leadership pipeline"
            ],
            "ongoing_development": [
                "Regular executive coaching sessions",
                "Industry leadership development programs",
                "Peer mentoring and networking groups",
                "Continuous learning through books, courses, and conferences"
            ]
        }
    
    def _generate_coaching_recommendations(self, leadership_data: Dict[str, Any]) -> List[str]:
        """Generate specific coaching recommendations"""
        return [
            "Implement weekly strategic thinking sessions for long-term planning",
            "Establish regular team meetings with structured agendas and accountability",
            "Create personal development plans for each team member",
            "Develop decision-making frameworks for consistent and effective choices",
            "Practice delegation skills with increasing responsibility and autonomy",
            "Set up financial dashboards and regular business performance reviews",
            "Join industry leadership groups for peer learning and networking",
            "Schedule quarterly leadership effectiveness assessments and adjustments"
        ]