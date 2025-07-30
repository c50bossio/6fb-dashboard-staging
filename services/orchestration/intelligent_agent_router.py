#!/usr/bin/env python3
"""
Intelligent Agent Router for 6FB AI Agent System
Coordinates between Business Intelligence Agents, BMAD Orchestration, and Specialized Execution
"""

from typing import Dict, List, Optional, Any, Literal
from dataclasses import dataclass, field
from datetime import datetime
import json
import asyncio
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class AgentTier(Enum):
    """Agent tier classification"""
    BUSINESS = "business"           # Your original 4 AI agents
    ORCHESTRATION = "orchestration" # BMAD planning agents  
    SPECIALIZED = "specialized"     # Your 25 technical specialists

@dataclass
class AgentConfig:
    """Agent configuration and metadata"""
    id: str
    name: str
    tier: AgentTier
    specialties: List[str]
    when_to_use: str
    coordinates_with: List[str] = field(default_factory=list)
    execution_context: Dict[str, Any] = field(default_factory=dict)

@dataclass  
class RouteRequest:
    """Request routing information"""
    request_type: str
    content: str
    context: Dict[str, Any] = field(default_factory=dict)
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    requires_coordination: bool = False
    business_objective: Optional[str] = None

@dataclass
class RouteResponse:
    """Agent routing response"""
    primary_agent: str
    supporting_agents: List[str] = field(default_factory=list)
    coordination_workflow: Optional[str] = None
    estimated_complexity: Literal["simple", "moderate", "complex"] = "moderate"
    requires_context_preservation: bool = False

class IntelligentAgentRouter:
    """
    Routes requests to optimal agent combinations with business intelligence
    """
    
    def __init__(self):
        self.agents = self._initialize_agent_registry()
        self.routing_history = []
        self.performance_metrics = {}
        
    def _initialize_agent_registry(self) -> Dict[str, AgentConfig]:
        """Initialize the complete agent registry"""
        
        agents = {}
        
        # Tier 1: Business Intelligence Agents (Your Original 4)
        agents.update({
            "master-coach": AgentConfig(
                id="master-coach",
                name="Master Coach",
                tier=AgentTier.BUSINESS,
                specialties=["strategic_guidance", "business_coaching", "decision_making"],
                when_to_use="Strategic business decisions and high-level coaching",
                coordinates_with=["financial-agent", "growth-agent", "operations-agent"]
            ),
            "financial-agent": AgentConfig(
                id="financial-agent", 
                name="Financial Agent",
                tier=AgentTier.BUSINESS,
                specialties=["revenue_optimization", "financial_analysis", "pricing"],
                when_to_use="Revenue optimization and financial planning",
                coordinates_with=["data-scientist", "performance-engineer"]
            ),
            "growth-agent": AgentConfig(
                id="growth-agent",
                name="Growth Agent", 
                tier=AgentTier.BUSINESS,
                specialties=["expansion_planning", "market_analysis", "scaling"],
                when_to_use="Business growth and expansion strategies", 
                coordinates_with=["ux-designer", "system-architect", "devops-infrastructure-architect"]
            ),
            "operations-agent": AgentConfig(
                id="operations-agent",
                name="Operations Agent",
                tier=AgentTier.BUSINESS, 
                specialties=["efficiency_optimization", "process_improvement", "automation"],
                when_to_use="Operational efficiency and process optimization",
                coordinates_with=["backend-systems-specialist", "performance-engineer", "site-reliability-engineer"]
            )
        })
        
        # Tier 2: BMAD Orchestration Agents (Your New 10)
        agents.update({
            "bmad-orchestrator": AgentConfig(
                id="bmad-orchestrator",
                name="BMAD Orchestrator", 
                tier=AgentTier.ORCHESTRATION,
                specialties=["workflow_coordination", "multi_agent_management", "context_preservation"],
                when_to_use="Complex multi-agent workflows and coordination",
                coordinates_with=["analyst", "architect", "pm", "dev"]
            ),
            "analyst": AgentConfig(
                id="analyst", 
                name="Mary - Business Analyst",
                tier=AgentTier.ORCHESTRATION,
                specialties=["requirements_analysis", "market_research", "competitive_analysis"],
                when_to_use="Project analysis and requirements gathering",
                coordinates_with=["data-scientist", "ux-designer"]
            ),
            "architect": AgentConfig(
                id="architect",
                name="System Architect",
                tier=AgentTier.ORCHESTRATION, 
                specialties=["system_design", "architecture_planning", "technical_strategy"],
                when_to_use="System architecture and technical planning",
                coordinates_with=["system-architect", "database-administrator", "security-specialist"]
            ),
            "pm": AgentConfig(
                id="pm",
                name="Project Manager", 
                tier=AgentTier.ORCHESTRATION,
                specialties=["project_planning", "timeline_estimation", "resource_allocation"],
                when_to_use="Project management and coordination",
                coordinates_with=["qa-engineer", "performance-engineer"]
            ),
            "dev": AgentConfig(
                id="dev",
                name="Development Coordinator",
                tier=AgentTier.ORCHESTRATION,
                specialties=["development_coordination", "implementation_guidance", "code_architecture"],
                when_to_use="Development coordination and implementation",
                coordinates_with=["production-fullstack-dev", "frontend-specialist", "backend-systems-specialist"]
            ),
            "qa": AgentConfig(
                id="qa",
                name="Quality Assurance Lead",
                tier=AgentTier.ORCHESTRATION,
                specialties=["test_strategy", "quality_planning", "automated_testing"],
                when_to_use="Quality assurance and testing strategy",
                coordinates_with=["qa-engineer", "automated-test-generator"]
            ),
            "ux-expert": AgentConfig(
                id="ux-expert", 
                name="UX Expert",
                tier=AgentTier.ORCHESTRATION,
                specialties=["user_experience", "interface_design", "usability"],
                when_to_use="User experience design and optimization",
                coordinates_with=["ux-designer", "frontend-specialist", "pwa-specialist"]
            ),
            "po": AgentConfig(
                id="po",
                name="Product Owner",
                tier=AgentTier.ORCHESTRATION,
                specialties=["product_strategy", "user_stories", "requirements"],
                when_to_use="Product strategy and requirements definition", 
                coordinates_with=["data-scientist", "technical-documentation-writer"]
            ),
            "sm": AgentConfig(
                id="sm",
                name="Scrum Master",
                tier=AgentTier.ORCHESTRATION,
                specialties=["agile_processes", "team_coordination", "sprint_planning"],
                when_to_use="Agile process facilitation and team coordination",
                coordinates_with=["code-reviewer", "automated-test-generator"]
            )
        })
        
        # Tier 3: Specialized Execution Agents (Your Original 25)
        specialized_agents = [
            ("frontend-specialist", "Frontend Specialist", ["react", "nextjs", "javascript", "css", "browser_issues"]),
            ("backend-systems-specialist", "Backend Systems Specialist", ["apis", "databases", "middleware", "performance"]),
            ("data-scientist", "Data Scientist", ["sql", "analytics", "bigquery", "data_insights"]),
            ("security-specialist", "Security Specialist", ["authentication", "authorization", "vulnerability_assessment"]),
            ("performance-engineer", "Performance Engineer", ["optimization", "profiling", "bottleneck_analysis"]),
            ("devops-infrastructure-architect", "DevOps Infrastructure Architect", ["deployment", "containerization", "ci_cd"]),
            ("database-administrator", "Database Administrator", ["query_optimization", "migrations", "performance"]),
            ("qa-engineer", "QA Engineer", ["testing", "quality_assurance", "automation"]),
            ("automated-test-generator", "Automated Test Generator", ["test_creation", "coverage_analysis"]),
            ("code-reviewer", "Code Reviewer", ["code_quality", "best_practices", "review"]),
            ("debugger", "Debugger", ["error_investigation", "bug_resolution", "troubleshooting"]),
            ("system-architect", "System Architect", ["architecture_design", "system_planning"]),
            ("technical-documentation-writer", "Technical Documentation Writer", ["documentation", "api_docs", "guides"]),
            ("ux-designer", "UX Designer", ["ui_design", "wireframes", "user_research"]),
            ("production-fullstack-dev", "Production Fullstack Developer", ["enterprise_development", "full_stack"]),
            ("pwa-specialist", "PWA Specialist", ["progressive_web_apps", "service_workers", "offline"]),
            ("site-reliability-engineer", "Site Reliability Engineer", ["monitoring", "incident_response", "slo_management"]),
            ("error-monitoring-specialist", "Error Monitoring Specialist", ["error_tracking", "logging", "monitoring"]),
            ("authentication-specialist", "Authentication Specialist", ["oauth", "jwt", "sso", "mfa"]),
            ("third-party-api-connector", "Third-party API Connector", ["api_integration", "webhooks", "rate_limiting"]),
            ("api-integration-specialist", "API Integration Specialist", ["external_apis", "integration"]),
            ("code-consistency-specialist", "Code Consistency Specialist", ["code_patterns", "standardization"]),
            ("code-optimization-specialist", "Code Optimization Specialist", ["code_optimization", "deduplication"]),
            ("message-queue-specialist", "Message Queue Specialist", ["message_queues", "async_processing"]),
            ("data-engineer", "Data Engineer", ["etl", "data_pipelines", "data_warehousing"])
        ]
        
        for agent_id, name, specialties in specialized_agents:
            agents[agent_id] = AgentConfig(
                id=agent_id,
                name=name,
                tier=AgentTier.SPECIALIZED,
                specialties=specialties,
                when_to_use=f"Specialized {specialties[0]} tasks and implementation"
            )
            
        return agents
    
    async def route_request(self, request: RouteRequest) -> RouteResponse:
        """
        Route request to optimal agent combination with intelligent analysis
        """
        logger.info(f"Routing request: {request.request_type}")
        
        # Step 1: Analyze request characteristics
        request_analysis = self._analyze_request(request)
        
        # Step 2: Determine optimal routing strategy
        routing_strategy = self._determine_routing_strategy(request_analysis)
        
        # Step 3: Select primary and supporting agents
        primary_agent = self._select_primary_agent(request_analysis, routing_strategy)
        supporting_agents = self._select_supporting_agents(primary_agent, request_analysis)
        
        # Step 4: Determine coordination workflow if needed
        coordination_workflow = None
        if request.requires_coordination or len(supporting_agents) > 2:
            coordination_workflow = self._determine_coordination_workflow(
                primary_agent, supporting_agents, request_analysis
            )
        
        # Step 5: Create routing response
        response = RouteResponse(
            primary_agent=primary_agent,
            supporting_agents=supporting_agents,
            coordination_workflow=coordination_workflow,
            estimated_complexity=request_analysis["complexity"],
            requires_context_preservation=len(supporting_agents) > 0
        )
        
        # Step 6: Log routing decision for performance analysis
        self._log_routing_decision(request, response)
        
        return response
    
    def _analyze_request(self, request: RouteRequest) -> Dict[str, Any]:
        """Analyze request to determine optimal routing"""
        
        analysis = {
            "keywords": self._extract_keywords(request.content),
            "domain": self._identify_domain(request.content),
            "complexity": self._assess_complexity(request.content, request.context),
            "business_impact": self._assess_business_impact(request.business_objective),
            "technical_depth": self._assess_technical_depth(request.content),
            "coordination_needs": self._assess_coordination_needs(request.content)
        }
        
        return analysis
    
    def _determine_routing_strategy(self, analysis: Dict[str, Any]) -> str:
        """Determine optimal routing strategy based on request analysis"""
        
        # Business-first strategy for high business impact
        if analysis["business_impact"] == "high":
            return "business_first"
        
        # Technical-first strategy for low business impact, high technical depth  
        elif analysis["business_impact"] == "low" and analysis["technical_depth"] == "high":
            return "technical_first"
        
        # Orchestration-first strategy for complex coordination needs
        elif analysis["coordination_needs"] == "high":
            return "orchestration_first"
        
        # Direct routing for simple, focused requests
        else:
            return "direct"
    
    def _select_primary_agent(self, analysis: Dict[str, Any], strategy: str) -> str:
        """Select primary agent based on analysis and strategy"""
        
        domain = analysis["domain"]
        keywords = analysis["keywords"]
        
        # Business-first routing
        if strategy == "business_first":
            business_agents = {
                "strategy": "master-coach",
                "financial": "financial-agent", 
                "revenue": "financial-agent",
                "growth": "growth-agent",
                "expansion": "growth-agent",
                "operations": "operations-agent",
                "efficiency": "operations-agent"
            }
            
            for keyword in keywords:
                if keyword in business_agents:
                    return business_agents[keyword]
            
            return "master-coach"  # Default business agent
        
        # Orchestration-first routing
        elif strategy == "orchestration_first":
            orchestration_agents = {
                "analyze": "analyst",
                "architecture": "architect", 
                "plan": "pm",
                "coordinate": "bmad-orchestrator",
                "design": "ux-expert",
                "quality": "qa",
                "product": "po",
                "agile": "sm"
            }
            
            for keyword in keywords:
                if keyword in orchestration_agents:
                    return orchestration_agents[keyword]
            
            return "bmad-orchestrator"  # Default orchestration agent
        
        # Technical-first and direct routing
        else:
            # Match keywords to specialized agents
            for agent_id, agent_config in self.agents.items():
                if agent_config.tier == AgentTier.SPECIALIZED:
                    for specialty in agent_config.specialties:
                        if specialty in keywords or any(k in specialty for k in keywords):
                            return agent_id
            
            # Fallback to orchestration if no direct match
            return "bmad-orchestrator"
    
    def _select_supporting_agents(self, primary_agent: str, analysis: Dict[str, Any]) -> List[str]:
        """Select supporting agents based on primary agent and request analysis"""
        
        supporting = []
        primary_config = self.agents[primary_agent]
        
        # Add coordinating agents from primary agent's configuration
        supporting.extend(primary_config.coordinates_with)
        
        # Add agents based on complexity and domain
        if analysis["complexity"] == "complex":
            # For complex requests, add orchestration support
            if primary_config.tier == AgentTier.SPECIALIZED:
                supporting.append("bmad-orchestrator")
            
            # Add quality assurance for complex implementations
            if "implementation" in analysis["keywords"]:
                supporting.extend(["qa", "code-reviewer"])
        
        # Remove duplicates and primary agent
        supporting = list(set(supporting))
        if primary_agent in supporting:
            supporting.remove(primary_agent)
        
        return supporting[:4]  # Limit to 4 supporting agents for manageability
    
    def _determine_coordination_workflow(self, primary: str, supporting: List[str], analysis: Dict[str, Any]) -> str:
        """Determine coordination workflow for multi-agent tasks"""
        
        if analysis["complexity"] == "complex" and len(supporting) > 2:
            return "orchestrated_workflow"
        elif analysis["business_impact"] == "high":
            return "business_validation_workflow"
        elif "implementation" in analysis["keywords"]:
            return "development_workflow"
        else:
            return "collaborative_workflow"
    
    def _extract_keywords(self, content: str) -> List[str]:
        """Extract relevant keywords from request content"""
        # Simple keyword extraction - could be enhanced with NLP
        keywords = []
        content_lower = content.lower()
        
        keyword_patterns = {
            # Business keywords
            "strategy", "strategic", "business", "revenue", "financial", "growth", 
            "expansion", "operations", "efficiency", "coaching",
            
            # Technical keywords  
            "api", "database", "frontend", "backend", "security", "authentication",
            "performance", "optimization", "testing", "deployment", "monitoring",
            "design", "ux", "ui", "architecture", "implementation", "development",
            
            # Process keywords
            "analyze", "plan", "coordinate", "review", "debug", "optimize",
            "integrate", "migrate", "document", "automate"
        }
        
        for pattern in keyword_patterns:
            if pattern in content_lower:
                keywords.append(pattern)
        
        return keywords
    
    def _identify_domain(self, content: str) -> str:
        """Identify the primary domain of the request"""
        content_lower = content.lower()
        
        domain_indicators = {
            "business": ["strategy", "revenue", "growth", "operations", "coaching", "financial"],
            "frontend": ["ui", "ux", "react", "nextjs", "javascript", "css", "browser"],
            "backend": ["api", "server", "database", "middleware", "fastapi", "python"],
            "devops": ["deployment", "docker", "kubernetes", "ci/cd", "infrastructure"],
            "security": ["auth", "security", "vulnerability", "encryption", "compliance"],
            "data": ["analytics", "sql", "database", "insights", "reporting"],
            "quality": ["testing", "qa", "quality", "review", "coverage"]
        }
        
        for domain, indicators in domain_indicators.items():
            if any(indicator in content_lower for indicator in indicators):
                return domain
        
        return "general"
    
    def _assess_complexity(self, content: str, context: Dict[str, Any]) -> str:
        """Assess request complexity"""
        complexity_indicators = {
            "complex": ["architecture", "system", "multiple", "integrate", "comprehensive", "enterprise"],
            "moderate": ["implement", "create", "develop", "optimize", "analyze"],
            "simple": ["fix", "update", "check", "review", "explain"]
        }
        
        content_lower = content.lower()
        
        for complexity, indicators in complexity_indicators.items():
            if any(indicator in content_lower for indicator in indicators):
                return complexity
        
        # Consider context complexity
        if len(context) > 3 or any(isinstance(v, (list, dict)) for v in context.values()):
            return "moderate"
        
        return "simple"
    
    def _assess_business_impact(self, business_objective: Optional[str]) -> str:
        """Assess business impact level"""
        if not business_objective:
            return "low"
        
        high_impact_keywords = ["revenue", "growth", "strategy", "critical", "urgent", "customer"]
        objective_lower = business_objective.lower()
        
        if any(keyword in objective_lower for keyword in high_impact_keywords):
            return "high"
        
        return "medium"
    
    def _assess_technical_depth(self, content: str) -> str:
        """Assess technical depth required"""
        technical_indicators = {
            "high": ["architecture", "performance", "security", "database", "optimization"],
            "medium": ["implementation", "integration", "api", "frontend", "backend"], 
            "low": ["ui", "styling", "content", "documentation"]
        }
        
        content_lower = content.lower()
        
        for depth, indicators in technical_indicators.items():
            if any(indicator in content_lower for indicator in indicators):
                return depth
        
        return "medium"
    
    def _assess_coordination_needs(self, content: str) -> str:
        """Assess coordination complexity"""
        coordination_keywords = ["multiple", "coordinate", "integrate", "comprehensive", "end-to-end", "full-stack"]
        content_lower = content.lower()
        
        if any(keyword in content_lower for keyword in coordination_keywords):
            return "high"
        elif "implement" in content_lower or "create" in content_lower:
            return "medium"
        else:
            return "low"
    
    def _log_routing_decision(self, request: RouteRequest, response: RouteResponse):
        """Log routing decision for performance analysis"""
        routing_record = {
            "timestamp": datetime.now().isoformat(),
            "request_type": request.request_type,
            "primary_agent": response.primary_agent,
            "supporting_agents": response.supporting_agents,
            "complexity": response.estimated_complexity,
            "coordination_workflow": response.coordination_workflow
        }
        
        self.routing_history.append(routing_record)
        
        # Keep only last 1000 routing decisions
        if len(self.routing_history) > 1000:
            self.routing_history = self.routing_history[-1000:]
    
    def get_agent_info(self, agent_id: str) -> Optional[AgentConfig]:
        """Get agent configuration information"""
        return self.agents.get(agent_id)
    
    def list_agents_by_tier(self, tier: AgentTier) -> List[AgentConfig]:
        """List all agents in a specific tier"""
        return [agent for agent in self.agents.values() if agent.tier == tier]
    
    def get_routing_analytics(self) -> Dict[str, Any]:
        """Get routing performance analytics"""
        if not self.routing_history:
            return {"message": "No routing history available"}
        
        total_routes = len(self.routing_history)
        
        # Agent usage statistics
        agent_usage = {}
        for record in self.routing_history:
            agent = record["primary_agent"]
            agent_usage[agent] = agent_usage.get(agent, 0) + 1
        
        # Complexity distribution
        complexity_dist = {}
        for record in self.routing_history:
            complexity = record["complexity"]
            complexity_dist[complexity] = complexity_dist.get(complexity, 0) + 1
        
        return {
            "total_routes": total_routes,
            "agent_usage": agent_usage,
            "complexity_distribution": complexity_dist,
            "most_used_agent": max(agent_usage, key=agent_usage.get) if agent_usage else None,
            "average_supporting_agents": sum(len(r["supporting_agents"]) for r in self.routing_history) / total_routes
        }

# Global router instance
router = IntelligentAgentRouter()

async def route_agent_request(
    request_type: str,
    content: str,
    context: Dict[str, Any] = None,
    business_objective: str = None,
    priority: str = "medium"
) -> RouteResponse:
    """
    Route a request to the optimal agent combination
    
    Args:
        request_type: Type of request (e.g., "analyze", "implement", "optimize")
        content: Request content/description
        context: Additional context information
        business_objective: Business objective if applicable
        priority: Request priority level
        
    Returns:
        RouteResponse with agent routing information
    """
    request = RouteRequest(
        request_type=request_type,
        content=content,
        context=context or {},
        business_objective=business_objective,
        priority=priority,
        requires_coordination="coordinate" in content.lower() or "multiple" in content.lower()
    )
    
    return await router.route_request(request)

if __name__ == "__main__":
    # Test the router
    async def test_router():
        # Test business request
        response = await route_agent_request(
            request_type="analyze",
            content="Analyze our revenue optimization opportunities for the barbershop booking system",
            business_objective="Increase monthly recurring revenue by 25%"
        )
        print(f"Business Request - Primary: {response.primary_agent}, Supporting: {response.supporting_agents}")
        
        # Test technical request  
        response = await route_agent_request(
            request_type="implement",
            content="Implement real-time notifications for booking updates using WebSocket",
            context={"technology": "fastapi", "frontend": "nextjs"}
        )
        print(f"Technical Request - Primary: {response.primary_agent}, Supporting: {response.supporting_agents}")
        
        # Test complex coordination request
        response = await route_agent_request(
            request_type="coordinate", 
            content="Coordinate the development of a comprehensive analytics dashboard with real-time data",
            business_objective="Improve business intelligence and decision making",
            priority="high"
        )
        print(f"Complex Request - Primary: {response.primary_agent}, Supporting: {response.supporting_agents}")
        print(f"Workflow: {response.coordination_workflow}")
    
    # Run test
    asyncio.run(test_router())