#!/usr/bin/env python3
"""
Technical Operations Agent - Specialized AI agent for technical system operations
Handles system monitoring, performance optimization, security, and technical recommendations
"""

import logging
import time
from datetime import datetime
from typing import Dict, List, Any, Optional

from .base_agent import BaseAgent, TaskResult
from ..structured_outputs import (
    TechnicalAnalysisResponse, 
    SystemPerformanceReport,
    SecurityAuditSummary,
    TechnologyRecommendation
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TechnicalOperationsAgent(BaseAgent):
    """
    Specialized agent for technical operations and system management
    
    Capabilities:
    - System performance monitoring and optimization
    - Appointment scheduling efficiency analysis  
    - Technology stack recommendations
    - Integration planning and implementation
    - Data security and compliance monitoring
    - Automation opportunity identification
    - Infrastructure scaling recommendations
    - Database optimization and maintenance
    """
    
    def __init__(self):
        super().__init__(
            agent_name="Technical Operations Agent",
            agent_type="technical_operations",
            model_preference="openai",
            default_model="gpt-4o-mini"
        )
        
        self.specializations = [
            "system_performance_monitoring",
            "database_optimization", 
            "security_auditing",
            "integration_planning",
            "automation_identification",
            "infrastructure_scaling",
            "appointment_system_optimization",
            "technology_stack_analysis",
            "compliance_monitoring",
            "performance_troubleshooting"
        ]
        
        logger.info(f"{self.agent_name} initialized with {len(self.specializations)} specializations")
    
    def get_system_prompt(self) -> str:
        """Get the system prompt for technical operations analysis"""
        return """You are an expert Technical Operations Agent specializing in system monitoring, 
        performance optimization, and technical infrastructure for barbershop businesses.
        
        Your expertise includes:
        - System performance analysis and optimization
        - Database query optimization and maintenance
        - Security auditing and vulnerability assessment
        - API and integration architecture planning
        - Appointment scheduling system optimization
        - Technology stack evaluation and recommendations
        - Infrastructure scaling and capacity planning
        - Automation opportunity identification
        - Compliance monitoring (PCI-DSS, GDPR, SOC2)
        - Performance troubleshooting and incident response
        
        Provide technical recommendations that are:
        - Specific and actionable with clear implementation steps
        - Cost-effective and ROI-focused for small businesses
        - Scalable for growing barbershop operations
        - Security-conscious and compliance-aware
        - Performance-optimized for real-time operations
        - Integration-friendly with existing systems
        
        Always include:
        - Technical analysis with specific metrics
        - Implementation priority levels (Critical/High/Medium/Low)
        - Cost estimates and timeline projections
        - Risk assessment and mitigation strategies
        - Monitoring and success metrics
        """
    
    def get_specialized_capabilities(self) -> List[str]:
        """Return technical operations specific capabilities"""
        return [
            "system_performance_analysis",
            "database_optimization",
            "security_vulnerability_assessment",
            "api_integration_planning",
            "appointment_scheduling_optimization",
            "technology_stack_evaluation", 
            "infrastructure_capacity_planning",
            "automation_workflow_design",
            "compliance_audit_reporting",
            "performance_bottleneck_identification",
            "disaster_recovery_planning",
            "monitoring_dashboard_design",
            "load_testing_analysis",
            "data_migration_planning",
            "third_party_integration_assessment"
        ]
    
    async def process_task(self, task: Dict[str, Any]) -> TaskResult:
        """Process technical operations analysis task"""
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
                # Generate detailed technical analysis
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
                    "analysis_depth": "comprehensive",
                    "recommendation_priority": "high" if "critical" in message.lower() or "urgent" in message.lower() else "medium"
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
        """Determine the type of technical operations task"""
        message_lower = message.lower()
        
        # Performance monitoring and optimization
        if any(keyword in message_lower for keyword in [
            "performance", "slow", "speed", "optimization", "bottleneck", "latency"
        ]):
            return "performance_analysis"
        
        # Security and compliance
        elif any(keyword in message_lower for keyword in [
            "security", "vulnerability", "compliance", "audit", "breach", "gdpr", "pci"
        ]):
            return "security_assessment"
        
        # System integration and APIs
        elif any(keyword in message_lower for keyword in [
            "integration", "api", "connect", "sync", "webhook", "third-party"
        ]):
            return "integration_planning"
        
        # Database and data management
        elif any(keyword in message_lower for keyword in [
            "database", "query", "data", "storage", "backup", "migration"
        ]):
            return "database_optimization"
        
        # Appointment scheduling system
        elif any(keyword in message_lower for keyword in [
            "appointment", "scheduling", "booking", "calendar", "availability"
        ]):
            return "scheduling_optimization"
        
        # Infrastructure and scaling
        elif any(keyword in message_lower for keyword in [
            "infrastructure", "scaling", "server", "hosting", "capacity", "load"
        ]):
            return "infrastructure_planning"
        
        # Automation and workflow
        elif any(keyword in message_lower for keyword in [
            "automation", "workflow", "process", "efficiency", "streamline"
        ]):
            return "automation_analysis"
        
        # Technology recommendations
        elif any(keyword in message_lower for keyword in [
            "technology", "tool", "software", "platform", "recommend", "upgrade"
        ]):
            return "technology_recommendation"
        
        # Monitoring and alerting
        elif any(keyword in message_lower for keyword in [
            "monitor", "alert", "dashboard", "reporting", "metrics", "analytics"
        ]):
            return "monitoring_setup"
        
        else:
            return "general_technical_analysis"
    
    def _build_analysis_prompt(self, message: str, context: Dict[str, Any], task_type: str) -> str:
        """Build comprehensive analysis prompt based on task type"""
        
        base_prompt = f"""
        Technical Operations Analysis Request: {message}
        
        Task Type: {task_type}
        
        Context Information:
        """
        
        # Add context information
        if context:
            base_prompt += f"\n- Business Context: {context}\n"
        
        # Add task-specific analysis requirements
        task_specific_prompts = {
            "performance_analysis": """
            Please provide a comprehensive performance analysis including:
            1. Performance bottleneck identification and root cause analysis
            2. Specific optimization recommendations with implementation steps
            3. Expected performance improvements and metrics
            4. Cost-benefit analysis of proposed optimizations
            5. Timeline and resource requirements for implementation
            6. Monitoring strategy for ongoing performance tracking
            """,
            
            "security_assessment": """
            Please provide a thorough security assessment including:
            1. Security vulnerability analysis and risk assessment
            2. Compliance requirements (GDPR, PCI-DSS, SOC2) evaluation
            3. Specific security hardening recommendations
            4. Data protection and privacy controls assessment
            5. Incident response and disaster recovery planning
            6. Security monitoring and alerting setup recommendations
            """,
            
            "integration_planning": """
            Please provide detailed integration planning including:
            1. Integration architecture design and data flow analysis
            2. API requirements and authentication mechanisms
            3. Third-party service evaluation and selection criteria
            4. Data synchronization and consistency strategies
            5. Error handling and fallback mechanisms
            6. Testing and validation procedures for integrations
            """,
            
            "database_optimization": """
            Please provide comprehensive database optimization including:
            1. Database performance analysis and query optimization
            2. Index strategy and database schema improvements
            3. Data archiving and cleanup recommendations
            4. Backup and disaster recovery strategy
            5. Database scaling and replication planning
            6. Data migration and upgrade procedures
            """,
            
            "scheduling_optimization": """
            Please provide appointment scheduling optimization including:
            1. Current scheduling system analysis and inefficiencies
            2. Booking flow optimization and user experience improvements
            3. Resource allocation and availability management
            4. Double-booking prevention and conflict resolution
            5. Integration with calendar systems and notifications
            6. Analytics and reporting for scheduling performance
            """,
            
            "infrastructure_planning": """
            Please provide infrastructure planning analysis including:
            1. Current infrastructure assessment and capacity analysis
            2. Scaling requirements and growth projections
            3. Cloud vs on-premise recommendations
            4. Cost optimization and resource allocation
            5. High availability and disaster recovery planning
            6. Monitoring and alerting infrastructure setup
            """,
            
            "automation_analysis": """
            Please provide automation opportunity analysis including:
            1. Manual process identification and efficiency assessment
            2. Automation workflow design and implementation strategy
            3. Tool and platform recommendations for automation
            4. ROI calculation and cost-benefit analysis
            5. Change management and training requirements
            6. Success metrics and monitoring for automated processes
            """,
            
            "technology_recommendation": """
            Please provide technology recommendations including:
            1. Current technology stack assessment and gaps analysis
            2. Specific tool and platform recommendations with justification
            3. Implementation roadmap and migration planning
            4. Cost analysis and budget requirements
            5. Training and adoption strategies
            6. Risk assessment and mitigation planning
            """,
            
            "monitoring_setup": """
            Please provide monitoring and alerting setup including:
            1. Monitoring strategy and key performance indicators
            2. Dashboard design and visualization recommendations
            3. Alerting thresholds and escalation procedures
            4. Log aggregation and analysis setup
            5. Performance baseline establishment
            6. Reporting and analytics framework design
            """
        }
        
        specific_prompt = task_specific_prompts.get(
            task_type, 
            """
            Please provide a comprehensive technical analysis including:
            1. Current state assessment and problem identification
            2. Specific technical recommendations with implementation details
            3. Risk assessment and mitigation strategies
            4. Cost and timeline estimates
            5. Success metrics and monitoring approach
            """
        )
        
        base_prompt += specific_prompt
        
        base_prompt += """
        
        Please structure your response with:
        - Executive Summary (2-3 sentences)
        - Technical Analysis (detailed findings)
        - Specific Recommendations (actionable steps)
        - Implementation Timeline (phases and milestones)
        - Cost Estimates (resources and budget)
        - Success Metrics (measurable outcomes)
        - Risk Assessment (potential issues and mitigation)
        """
        
        return base_prompt
    
    def _calculate_confidence(self, task_type: str, context: Dict[str, Any]) -> float:
        """Calculate confidence score based on task complexity and available context"""
        base_confidence = 0.75
        
        # Adjust based on task type complexity
        task_complexity_modifiers = {
            "performance_analysis": 0.85,
            "security_assessment": 0.90,
            "integration_planning": 0.80,
            "database_optimization": 0.85,
            "scheduling_optimization": 0.90,
            "infrastructure_planning": 0.75,
            "automation_analysis": 0.80,
            "technology_recommendation": 0.85,
            "monitoring_setup": 0.80,
            "general_technical_analysis": 0.70
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
            "performance_analysis": ["system_performance_monitoring", "performance_troubleshooting"],
            "security_assessment": ["security_auditing", "compliance_monitoring"],
            "integration_planning": ["integration_planning", "technology_stack_analysis"],
            "database_optimization": ["database_optimization"],
            "scheduling_optimization": ["appointment_system_optimization"],
            "infrastructure_planning": ["infrastructure_scaling"],
            "automation_analysis": ["automation_identification"],
            "technology_recommendation": ["technology_stack_analysis"],
            "monitoring_setup": ["system_performance_monitoring"],
            "general_technical_analysis": ["system_performance_monitoring", "technology_stack_analysis"]
        }
        
        return specialization_mapping.get(task_type, ["system_performance_monitoring"])
    
    async def analyze_system_performance(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze system performance metrics and provide optimization recommendations"""
        try:
            analysis = {
                "performance_score": self._calculate_performance_score(metrics),
                "bottlenecks": self._identify_bottlenecks(metrics),
                "recommendations": self._generate_performance_recommendations(metrics),
                "monitoring_suggestions": self._suggest_monitoring_improvements(metrics)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Performance analysis failed: {e}")
            return {"error": str(e)}
    
    async def assess_security_posture(self, system_config: Dict[str, Any]) -> Dict[str, Any]:
        """Assess security posture and identify vulnerabilities"""
        try:
            assessment = {
                "security_score": self._calculate_security_score(system_config),
                "vulnerabilities": self._identify_vulnerabilities(system_config),
                "compliance_status": self._check_compliance(system_config),
                "hardening_recommendations": self._generate_security_recommendations(system_config)
            }
            
            return assessment
            
        except Exception as e:
            logger.error(f"Security assessment failed: {e}")
            return {"error": str(e)}
    
    def _calculate_performance_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate overall performance score from metrics"""
        # Mock performance scoring logic
        response_time = metrics.get("response_time", 1000)  # milliseconds
        cpu_usage = metrics.get("cpu_usage", 50)  # percentage
        memory_usage = metrics.get("memory_usage", 60)  # percentage
        
        # Simple scoring algorithm (in production, this would be more sophisticated)
        response_score = max(0, 100 - (response_time / 10))
        cpu_score = max(0, 100 - cpu_usage)
        memory_score = max(0, 100 - memory_usage)
        
        return (response_score + cpu_score + memory_score) / 3
    
    def _identify_bottlenecks(self, metrics: Dict[str, Any]) -> List[str]:
        """Identify performance bottlenecks from metrics"""
        bottlenecks = []
        
        if metrics.get("response_time", 0) > 2000:
            bottlenecks.append("High response time detected")
        
        if metrics.get("cpu_usage", 0) > 80:
            bottlenecks.append("High CPU utilization")
        
        if metrics.get("memory_usage", 0) > 85:
            bottlenecks.append("High memory usage")
        
        if metrics.get("database_query_time", 0) > 1000:
            bottlenecks.append("Slow database queries")
        
        return bottlenecks
    
    def _generate_performance_recommendations(self, metrics: Dict[str, Any]) -> List[str]:
        """Generate performance optimization recommendations"""
        recommendations = []
        
        if metrics.get("response_time", 0) > 2000:
            recommendations.append("Implement caching strategy to reduce response times")
            recommendations.append("Optimize database queries and add appropriate indexes")
        
        if metrics.get("cpu_usage", 0) > 80:
            recommendations.append("Scale horizontally or upgrade CPU resources")
            recommendations.append("Implement background job processing for heavy tasks")
        
        if metrics.get("memory_usage", 0) > 85:
            recommendations.append("Optimize memory usage and implement garbage collection tuning")
            recommendations.append("Consider increasing available memory or implementing memory caching")
        
        return recommendations
    
    def _suggest_monitoring_improvements(self, metrics: Dict[str, Any]) -> List[str]:
        """Suggest monitoring and alerting improvements"""
        return [
            "Set up automated alerts for response time > 2000ms",
            "Implement comprehensive application performance monitoring (APM)",
            "Create dashboards for real-time system metrics visualization",
            "Set up log aggregation for better troubleshooting",
            "Implement health check endpoints for service monitoring"
        ]
    
    def _calculate_security_score(self, system_config: Dict[str, Any]) -> float:
        """Calculate security score from system configuration"""
        # Mock security scoring logic
        score = 70  # Base score
        
        if system_config.get("https_enabled", False):
            score += 10
        
        if system_config.get("authentication_enabled", False):
            score += 10
        
        if system_config.get("firewall_configured", False):
            score += 5
        
        if system_config.get("regular_backups", False):
            score += 5
        
        return min(score, 100)
    
    def _identify_vulnerabilities(self, system_config: Dict[str, Any]) -> List[str]:
        """Identify security vulnerabilities"""
        vulnerabilities = []
        
        if not system_config.get("https_enabled", False):
            vulnerabilities.append("HTTPS not enabled - data transmission not encrypted")
        
        if not system_config.get("authentication_enabled", False):
            vulnerabilities.append("No authentication system implemented")
        
        if not system_config.get("input_validation", False):
            vulnerabilities.append("Input validation not implemented - SQL injection risk")
        
        if not system_config.get("rate_limiting", False):
            vulnerabilities.append("No rate limiting - DDoS attack vulnerability")
        
        return vulnerabilities
    
    def _check_compliance(self, system_config: Dict[str, Any]) -> Dict[str, str]:
        """Check compliance with various standards"""
        return {
            "GDPR": "Partial" if system_config.get("data_encryption", False) else "Non-compliant",
            "PCI-DSS": "Compliant" if system_config.get("payment_encryption", False) else "Non-compliant",
            "SOC2": "In Progress" if system_config.get("audit_logging", False) else "Non-compliant"
        }
    
    def _generate_security_recommendations(self, system_config: Dict[str, Any]) -> List[str]:
        """Generate security hardening recommendations"""
        recommendations = []
        
        if not system_config.get("https_enabled", False):
            recommendations.append("Enable HTTPS with SSL/TLS certificates")
        
        if not system_config.get("authentication_enabled", False):
            recommendations.append("Implement multi-factor authentication (MFA)")
        
        if not system_config.get("firewall_configured", False):
            recommendations.append("Configure Web Application Firewall (WAF)")
        
        recommendations.extend([
            "Implement comprehensive audit logging",
            "Set up automated security scanning and vulnerability assessments",
            "Create incident response procedures and disaster recovery plans",
            "Implement data encryption at rest and in transit",
            "Set up regular security training for staff"
        ])
        
        return recommendations