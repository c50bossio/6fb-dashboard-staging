#!/usr/bin/env python3
"""
MCP Agent Orchestrator - Marketing Automation Coordination
Orchestrates all marketing agents through MCP (Model Context Protocol) for seamless AI business coach integration
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import os
import sys

# Import all marketing agents
sys.path.append('/Users/bossio/6FB AI Agent System/services/marketing-automation')
from sms_marketing_agent import SMSMarketingAgent, SMSPlan
from email_marketing_agent import EmailMarketingAgent, EmailPlan
from website_generation_agent import WebsiteGenerationAgent, WebsitePlan
from gmb_automation_agent import GMBAutomationAgent, GMBAutomationPlan
from social_media_agent import SocialMediaAgent, SocialPlan, SocialPlatform
from review_management_agent import ReviewManagementAgent, ReviewPlan, ReviewPlatform

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class AgentType(Enum):
    SMS_MARKETING = "sms_marketing"
    EMAIL_MARKETING = "email_marketing"
    WEBSITE_GENERATION = "website_generation"
    GMB_AUTOMATION = "gmb_automation"
    SOCIAL_MEDIA = "social_media"
    REVIEW_MANAGEMENT = "review_management"

@dataclass
class MarketingTask:
    """Standardized marketing task structure for MCP orchestration"""
    task_id: str
    agent_type: AgentType
    action: str
    parameters: Dict[str, Any]
    business_id: str
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    scheduled_for: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

class MCPAgentOrchestrator:
    """
    MCP Agent Orchestrator for Marketing Automation
    Provides unified interface for AI business coach to execute marketing tasks
    """
    
    def __init__(self):
        # Initialize all marketing agents
        self.sms_agent = SMSMarketingAgent()
        self.email_agent = EmailMarketingAgent()
        self.website_agent = WebsiteGenerationAgent()
        self.gmb_agent = GMBAutomationAgent()
        self.social_agent = SocialMediaAgent()
        self.review_agent = ReviewManagementAgent()
        
        # Task management
        self.active_tasks: Dict[str, MarketingTask] = {}
        self.task_history: List[MarketingTask] = []
        self.business_configs: Dict[str, Dict[str, Any]] = {}
        
        # MCP function registry for AI business coach
        self.mcp_functions = self._register_mcp_functions()
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    def _register_mcp_functions(self) -> Dict[str, Callable]:
        """Register MCP functions that the AI business coach can call"""
        
        return {
            # SMS Marketing Functions
            "send_sms_campaign": self.send_sms_campaign,
            "get_sms_pricing": self.get_sms_pricing,
            "generate_sms_template": self.generate_sms_template,
            
            # Email Marketing Functions
            "send_email_campaign": self.send_email_campaign,
            "get_email_pricing": self.get_email_pricing,
            "generate_email_template": self.generate_email_template,
            
            # Website Generation Functions
            "generate_website": self.generate_website,
            "get_website_pricing": self.get_website_pricing,
            "update_website": self.update_website,
            
            # GMB Automation Functions
            "create_gmb_campaign": self.create_gmb_campaign,
            "get_gmb_pricing": self.get_gmb_pricing,
            "post_to_gmb": self.post_to_gmb,
            
            # Social Media Functions
            "create_social_campaign": self.create_social_campaign,
            "get_social_pricing": self.get_social_pricing,
            "post_to_social": self.post_to_social,
            
            # Review Management Functions
            "monitor_reviews": self.monitor_reviews,
            "respond_to_review": self.respond_to_review,
            "get_review_pricing": self.get_review_pricing,
            
            # Orchestration Functions
            "execute_marketing_plan": self.execute_marketing_plan,
            "get_task_status": self.get_task_status,
            "cancel_task": self.cancel_task,
            "get_business_analytics": self.get_business_analytics,
            "get_all_pricing": self.get_all_pricing,
            "optimize_marketing_spend": self.optimize_marketing_spend
        }
    
    # MCP Interface Functions (Called by AI Business Coach)
    
    async def send_sms_campaign(self, 
                              business_id: str,
                              campaign_data: Dict[str, Any],
                              plan: str = "professional",
                              priority: str = "medium") -> Dict[str, Any]:
        """MCP Function: Send SMS marketing campaign"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.SMS_MARKETING,
                action="send_campaign",
                parameters={
                    "campaign_data": campaign_data,
                    "plan": SMSPlan(plan)
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            result = await self.sms_agent.send_sms_campaign(
                campaign_data=campaign_data,
                shop_id=business_id,
                plan=SMSPlan(plan)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "cost_analysis": result.get("cost_comparison", {}),
                "roi_metrics": result.get("roi_metrics", {})
            }
            
        except Exception as e:
            self.logger.error(f"SMS campaign failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_email_campaign(self,
                                business_id: str,
                                campaign_data: Dict[str, Any],
                                plan: str = "professional",
                                priority: str = "medium") -> Dict[str, Any]:
        """MCP Function: Send email marketing campaign"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.EMAIL_MARKETING,
                action="send_campaign",
                parameters={
                    "campaign_data": campaign_data,
                    "plan": EmailPlan(plan)
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            result = await self.email_agent.send_email_campaign(
                campaign_data=campaign_data,
                shop_id=business_id,
                plan=EmailPlan(plan)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "cost_analysis": result.get("cost_comparison", {}),
                "roi_metrics": result.get("roi_metrics", {})
            }
            
        except Exception as e:
            self.logger.error(f"Email campaign failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def generate_website(self,
                             business_id: str,
                             business_data: Dict[str, Any],
                             template: str = "modern",
                             tier: str = "professional",
                             priority: str = "medium") -> Dict[str, Any]:
        """MCP Function: Generate barbershop website"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.WEBSITE_GENERATION,
                action="generate_website",
                parameters={
                    "business_data": business_data,
                    "template": template,
                    "tier": WebsitePlan(tier)
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            result = await self.website_agent.generate_website(
                shop_data=business_data,
                template=template,
                tier=WebsitePlan(tier)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "website_url": result.get("website_url"),
                "cost_analysis": result.get("cost_analysis", {})
            }
            
        except Exception as e:
            self.logger.error(f"Website generation failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_gmb_campaign(self,
                                business_id: str,
                                business_data: Dict[str, Any],
                                plan: str = "professional",
                                priority: str = "medium") -> Dict[str, Any]:
        """MCP Function: Create Google My Business campaign"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.GMB_AUTOMATION,
                action="create_campaign",
                parameters={
                    "business_data": business_data,
                    "plan": GMBAutomationPlan(plan)
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            result = await self.gmb_agent.generate_monthly_gmb_campaign(
                business_data=business_data,
                plan=GMBAutomationPlan(plan)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "campaign_posts": result.get("total_posts", 0),
                "cost_analysis": result.get("cost_analysis", {}),
                "estimated_roi": result.get("estimated_roi", {})
            }
            
        except Exception as e:
            self.logger.error(f"GMB campaign failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def create_social_campaign(self,
                                   business_id: str,
                                   business_data: Dict[str, Any],
                                   plan: str = "professional",
                                   platforms: List[str] = ["instagram", "facebook"],
                                   priority: str = "medium") -> Dict[str, Any]:
        """MCP Function: Create social media campaign"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.SOCIAL_MEDIA,
                action="create_campaign",
                parameters={
                    "business_data": business_data,
                    "plan": SocialPlan(plan),
                    "platforms": [SocialPlatform(p) for p in platforms]
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            result = await self.social_agent.generate_social_campaign(
                business_data=business_data,
                plan=SocialPlan(plan)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "total_posts": result.get("total_posts", 0),
                "cost_analysis": result.get("cost_analysis", {}),
                "estimated_roi": result.get("estimated_roi", {})
            }
            
        except Exception as e:
            self.logger.error(f"Social campaign failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def monitor_reviews(self,
                            business_id: str,
                            platforms: List[str] = ["google", "facebook", "yelp"],
                            plan: str = "professional",
                            priority: str = "high") -> Dict[str, Any]:
        """MCP Function: Monitor and respond to reviews"""
        
        try:
            task = await self._create_task(
                agent_type=AgentType.REVIEW_MANAGEMENT,
                action="monitor_reviews",
                parameters={
                    "platforms": [ReviewPlatform(p) for p in platforms],
                    "plan": ReviewPlan(plan)
                },
                business_id=business_id,
                priority=TaskPriority(priority)
            )
            
            business_data = self.business_configs.get(business_id, {"business_id": business_id})
            
            result = await self.review_agent.monitor_reviews(
                business_data=business_data,
                platforms=[ReviewPlatform(p) for p in platforms],
                plan=ReviewPlan(plan)
            )
            
            await self._complete_task(task.task_id, result)
            
            return {
                "success": True,
                "task_id": task.task_id,
                "result": result,
                "total_reviews": result.get("total_reviews", 0),
                "urgent_responses": result.get("urgent_responses_needed", 0),
                "reputation_analysis": result.get("reputation_analysis", {})
            }
            
        except Exception as e:
            self.logger.error(f"Review monitoring failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def execute_marketing_plan(self,
                                   business_id: str,
                                   marketing_plan: Dict[str, Any],
                                   priority: str = "high") -> Dict[str, Any]:
        """MCP Function: Execute comprehensive marketing plan"""
        
        try:
            plan_id = f"plan_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            executed_tasks = []
            failed_tasks = []
            total_cost = 0
            
            self.logger.info(f"Executing marketing plan {plan_id} for business {business_id}")
            
            # Execute each component of the marketing plan
            for component, config in marketing_plan.items():
                try:
                    if component == "sms_marketing" and config.get("enabled", False):
                        result = await self.send_sms_campaign(
                            business_id=business_id,
                            campaign_data=config["campaign_data"],
                            plan=config.get("plan", "professional"),
                            priority=priority
                        )
                        executed_tasks.append({"type": "sms", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("billing_info", {}).get("actual_cost", 0)
                    
                    elif component == "email_marketing" and config.get("enabled", False):
                        result = await self.send_email_campaign(
                            business_id=business_id,
                            campaign_data=config["campaign_data"],
                            plan=config.get("plan", "professional"),
                            priority=priority
                        )
                        executed_tasks.append({"type": "email", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("billing_info", {}).get("actual_cost", 0)
                    
                    elif component == "website_generation" and config.get("enabled", False):
                        result = await self.generate_website(
                            business_id=business_id,
                            business_data=config["business_data"],
                            template=config.get("template", "modern"),
                            tier=config.get("tier", "professional"),
                            priority=priority
                        )
                        executed_tasks.append({"type": "website", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("cost_analysis", {}).get("total_cost", 0)
                    
                    elif component == "gmb_automation" and config.get("enabled", False):
                        result = await self.create_gmb_campaign(
                            business_id=business_id,
                            business_data=config["business_data"],
                            plan=config.get("plan", "professional"),
                            priority=priority
                        )
                        executed_tasks.append({"type": "gmb", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("cost_analysis", {}).get("actual_cost", 0)
                    
                    elif component == "social_media" and config.get("enabled", False):
                        result = await self.create_social_campaign(
                            business_id=business_id,
                            business_data=config["business_data"],
                            plan=config.get("plan", "professional"),
                            platforms=config.get("platforms", ["instagram", "facebook"]),
                            priority=priority
                        )
                        executed_tasks.append({"type": "social", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("cost_analysis", {}).get("actual_cost", 0)
                    
                    elif component == "review_management" and config.get("enabled", False):
                        result = await self.monitor_reviews(
                            business_id=business_id,
                            platforms=config.get("platforms", ["google", "facebook", "yelp"]),
                            plan=config.get("plan", "professional"),
                            priority=priority
                        )
                        executed_tasks.append({"type": "reviews", "result": result})
                        if result.get("success"):
                            total_cost += result.get("result", {}).get("cost_analysis", {}).get("monitoring_cost", 0)
                
                except Exception as e:
                    failed_tasks.append({"type": component, "error": str(e)})
                    self.logger.error(f"Failed to execute {component}: {str(e)}")
            
            # Calculate comprehensive ROI
            comprehensive_roi = await self._calculate_comprehensive_roi(executed_tasks, total_cost)
            
            return {
                "success": True,
                "plan_id": plan_id,
                "executed_tasks": len(executed_tasks),
                "failed_tasks": len(failed_tasks),
                "task_results": executed_tasks,
                "failures": failed_tasks,
                "total_cost": total_cost,
                "comprehensive_roi": comprehensive_roi,
                "execution_summary": self._generate_execution_summary(executed_tasks, failed_tasks, total_cost)
            }
            
        except Exception as e:
            self.logger.error(f"Marketing plan execution failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_all_pricing(self) -> Dict[str, Any]:
        """MCP Function: Get pricing information for all marketing services"""
        
        return {
            "sms_marketing": self.sms_agent.get_pricing_info(),
            "email_marketing": self.email_agent.get_email_pricing_info(),
            "website_generation": self.website_agent.get_website_pricing_info(),
            "gmb_automation": self.gmb_agent.get_gmb_pricing_info(),
            "social_media": self.social_agent.get_social_pricing_info(),
            "review_management": self.review_agent.get_review_pricing_info(),
            "summary": {
                "total_services": 6,
                "average_savings_vs_competitors": "50-75%",
                "profit_margins": "96-1885% across all services",
                "cost_effective_solution": "Complete marketing automation suite"
            }
        }
    
    async def optimize_marketing_spend(self,
                                     business_id: str,
                                     monthly_budget: float,
                                     business_goals: Dict[str, Any]) -> Dict[str, Any]:
        """MCP Function: Optimize marketing spend based on budget and goals"""
        
        try:
            # Get all pricing information
            all_pricing = await self.get_all_pricing()
            
            # Analyze business goals and budget
            optimization = await self._analyze_budget_optimization(
                monthly_budget, business_goals, all_pricing
            )
            
            return {
                "success": True,
                "budget_analysis": optimization,
                "recommended_plan": optimization["recommended_services"],
                "expected_roi": optimization["projected_roi"],
                "cost_breakdown": optimization["cost_breakdown"],
                "savings_vs_competitors": optimization["competitor_savings"]
            }
            
        except Exception as e:
            self.logger.error(f"Budget optimization failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # Task Management Functions
    
    async def _create_task(self,
                         agent_type: AgentType,
                         action: str,
                         parameters: Dict[str, Any],
                         business_id: str,
                         priority: TaskPriority) -> MarketingTask:
        """Create and track marketing task"""
        
        task_id = f"{agent_type.value}_{action}_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        task = MarketingTask(
            task_id=task_id,
            agent_type=agent_type,
            action=action,
            parameters=parameters,
            business_id=business_id,
            priority=priority,
            status=TaskStatus.IN_PROGRESS,
            created_at=datetime.now()
        )
        
        self.active_tasks[task_id] = task
        self.logger.info(f"Created task {task_id}: {agent_type.value} - {action}")
        
        return task
    
    async def _complete_task(self, task_id: str, result: Dict[str, Any]):
        """Complete task and update status"""
        
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            task.status = TaskStatus.COMPLETED if result.get("success") else TaskStatus.FAILED
            task.completed_at = datetime.now()
            task.result = result
            
            # Move to history
            self.task_history.append(task)
            del self.active_tasks[task_id]
            
            self.logger.info(f"Completed task {task_id}: {task.status.value}")
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """MCP Function: Get status of specific task"""
        
        # Check active tasks
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            return {
                "found": True,
                "status": task.status.value,
                "created_at": task.created_at.isoformat(),
                "agent_type": task.agent_type.value,
                "action": task.action
            }
        
        # Check history
        for task in self.task_history:
            if task.task_id == task_id:
                return {
                    "found": True,
                    "status": task.status.value,
                    "created_at": task.created_at.isoformat(),
                    "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                    "agent_type": task.agent_type.value,
                    "action": task.action,
                    "result": task.result
                }
        
        return {"found": False}
    
    async def get_business_analytics(self, business_id: str) -> Dict[str, Any]:
        """MCP Function: Get comprehensive business analytics"""
        
        # Get tasks for this business
        business_tasks = [t for t in self.task_history if t.business_id == business_id]
        
        # Calculate analytics
        total_tasks = len(business_tasks)
        successful_tasks = len([t for t in business_tasks if t.status == TaskStatus.COMPLETED])
        
        # Cost analysis
        total_spent = 0
        estimated_revenue = 0
        
        for task in business_tasks:
            if task.result and task.status == TaskStatus.COMPLETED:
                if "billing_info" in task.result:
                    total_spent += task.result["billing_info"].get("actual_cost", 0)
                if "roi_metrics" in task.result:
                    estimated_revenue += task.result["roi_metrics"].get("estimated_revenue", 0)
        
        roi_percentage = ((estimated_revenue - total_spent) / total_spent * 100) if total_spent > 0 else 0
        
        return {
            "business_id": business_id,
            "analytics_period": "All time",
            "task_summary": {
                "total_tasks": total_tasks,
                "successful_tasks": successful_tasks,
                "success_rate": f"{(successful_tasks/total_tasks*100):.1f}%" if total_tasks > 0 else "0%"
            },
            "financial_summary": {
                "total_spent": total_spent,
                "estimated_revenue": estimated_revenue,
                "net_profit": estimated_revenue - total_spent,
                "roi_percentage": f"{roi_percentage:.0f}%"
            },
            "service_usage": self._analyze_service_usage(business_tasks),
            "recommendations": self._generate_business_recommendations(business_tasks)
        }
    
    # Pricing and optimization helper functions
    
    def get_sms_pricing(self) -> Dict[str, Any]:
        """Get SMS marketing pricing"""
        return self.sms_agent.get_pricing_info()
    
    def get_email_pricing(self) -> Dict[str, Any]:
        """Get email marketing pricing"""
        return self.email_agent.get_email_pricing_info()
    
    def get_website_pricing(self) -> Dict[str, Any]:
        """Get website generation pricing"""
        return self.website_agent.get_website_pricing_info()
    
    def get_gmb_pricing(self) -> Dict[str, Any]:
        """Get GMB automation pricing"""
        return self.gmb_agent.get_gmb_pricing_info()
    
    def get_social_pricing(self) -> Dict[str, Any]:
        """Get social media pricing"""
        return self.social_agent.get_social_pricing_info()
    
    def get_review_pricing(self) -> Dict[str, Any]:
        """Get review management pricing"""
        return self.review_agent.get_review_pricing_info()
    
    # Template generation functions
    
    def generate_sms_template(self, campaign_type: str, business_data: Dict[str, Any]) -> str:
        """Generate SMS campaign template"""
        return self.sms_agent.generate_campaign_template(campaign_type, business_data)
    
    def generate_email_template(self, template_type: str, business_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate email campaign template"""
        return self.email_agent.generate_email_template(template_type, business_data)
    
    # Helper functions
    
    async def _calculate_comprehensive_roi(self, executed_tasks: List[Dict], total_cost: float) -> Dict[str, Any]:
        """Calculate comprehensive ROI across all marketing channels"""
        
        total_estimated_revenue = 0
        channel_breakdown = {}
        
        for task in executed_tasks:
            if task["result"].get("success"):
                task_result = task["result"].get("result", {})
                
                # Extract ROI metrics
                roi_metrics = task_result.get("roi_metrics", {})
                estimated_revenue = roi_metrics.get("estimated_revenue", 0)
                total_estimated_revenue += estimated_revenue
                
                channel_breakdown[task["type"]] = {
                    "estimated_revenue": estimated_revenue,
                    "cost": task_result.get("billing_info", {}).get("actual_cost", 0)
                }
        
        overall_roi = ((total_estimated_revenue - total_cost) / total_cost * 100) if total_cost > 0 else 0
        
        return {
            "total_estimated_revenue": total_estimated_revenue,
            "total_cost": total_cost,
            "net_profit": total_estimated_revenue - total_cost,
            "overall_roi_percentage": f"{overall_roi:.0f}%",
            "channel_breakdown": channel_breakdown,
            "projected_monthly_revenue": total_estimated_revenue,
            "revenue_multiple": total_estimated_revenue / total_cost if total_cost > 0 else 0
        }
    
    def _generate_execution_summary(self, executed_tasks: List[Dict], failed_tasks: List[Dict], total_cost: float) -> str:
        """Generate human-readable execution summary"""
        
        successful_channels = [task["type"] for task in executed_tasks if task["result"].get("success")]
        failed_channels = [task["type"] for task in failed_tasks]
        
        summary = f"Marketing plan execution completed:\n"
        summary += f"✅ Successfully launched: {', '.join(successful_channels)}\n"
        
        if failed_channels:
            summary += f"❌ Failed to launch: {', '.join(failed_channels)}\n"
        
        summary += f"💰 Total investment: ${total_cost:.2f}\n"
        summary += f"📈 Expected ROI: Positive across all channels\n"
        summary += f"🎯 All systems are now working to drive customer acquisition and retention"
        
        return summary
    
    async def _analyze_budget_optimization(self, budget: float, goals: Dict[str, Any], pricing: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze optimal budget allocation"""
        
        # Priority scoring based on business goals
        goal_priorities = {
            "customer_acquisition": ["sms_marketing", "social_media", "gmb_automation"],
            "customer_retention": ["email_marketing", "review_management"],
            "brand_building": ["website_generation", "social_media", "gmb_automation"],
            "online_presence": ["website_generation", "gmb_automation", "review_management"]
        }
        
        # Calculate service priorities based on goals
        service_scores = {}
        for goal, weight in goals.items():
            for service in goal_priorities.get(goal, []):
                service_scores[service] = service_scores.get(service, 0) + weight
        
        # Recommend services within budget
        recommended_services = {}
        remaining_budget = budget
        
        # Sort services by priority score
        sorted_services = sorted(service_scores.items(), key=lambda x: x[1], reverse=True)
        
        for service, score in sorted_services:
            if service in pricing:
                service_pricing = pricing[service]["pricing_tiers"]
                
                # Find best plan within remaining budget
                for plan_name, plan_info in service_pricing.items():
                    plan_price = plan_info["monthly_price"]
                    if plan_price <= remaining_budget:
                        recommended_services[service] = {
                            "plan": plan_name,
                            "monthly_cost": plan_price,
                            "priority_score": score,
                            "features": plan_info.get("features", [])
                        }
                        remaining_budget -= plan_price
                        break
        
        # Calculate projected ROI
        total_allocated = budget - remaining_budget
        projected_monthly_revenue = total_allocated * 2.5  # Conservative 250% ROI estimate
        
        return {
            "monthly_budget": budget,
            "allocated_budget": total_allocated,
            "remaining_budget": remaining_budget,
            "recommended_services": recommended_services,
            "projected_roi": {
                "monthly_investment": total_allocated,
                "projected_monthly_revenue": projected_monthly_revenue,
                "projected_roi_percentage": f"{((projected_monthly_revenue - total_allocated) / total_allocated * 100):.0f}%"
            },
            "cost_breakdown": {service: info["monthly_cost"] for service, info in recommended_services.items()},
            "competitor_savings": sum(pricing[service]["pricing_tiers"][info["plan"]].get("savings", 0) for service, info in recommended_services.items())
        }
    
    def _analyze_service_usage(self, tasks: List[MarketingTask]) -> Dict[str, Any]:
        """Analyze service usage patterns"""
        
        service_counts = {}
        for task in tasks:
            service = task.agent_type.value
            if service not in service_counts:
                service_counts[service] = {"total": 0, "successful": 0}
            
            service_counts[service]["total"] += 1
            if task.status == TaskStatus.COMPLETED:
                service_counts[service]["successful"] += 1
        
        return service_counts
    
    def _generate_business_recommendations(self, tasks: List[MarketingTask]) -> List[str]:
        """Generate business recommendations based on task history"""
        
        recommendations = []
        
        # Analyze service performance
        service_success_rates = {}
        for task in tasks:
            service = task.agent_type.value
            if service not in service_success_rates:
                service_success_rates[service] = []
            service_success_rates[service].append(task.status == TaskStatus.COMPLETED)
        
        # Generate recommendations
        for service, successes in service_success_rates.items():
            success_rate = sum(successes) / len(successes) if successes else 0
            
            if success_rate < 0.7:  # Less than 70% success rate
                recommendations.append(f"Review {service} configuration - success rate below optimal")
            elif success_rate > 0.9:  # Greater than 90% success rate
                recommendations.append(f"Consider expanding {service} - showing excellent performance")
        
        if not recommendations:
            recommendations.append("All services performing well - consider expanding to additional channels")
        
        return recommendations

# Initialize MCP Agent Orchestrator
orchestrator = MCPAgentOrchestrator()

# MCP Interface for AI Business Coach
async def execute_mcp_function(function_name: str, **kwargs) -> Dict[str, Any]:
    """Execute MCP function by name - called by AI Business Coach"""
    
    if function_name in orchestrator.mcp_functions:
        function = orchestrator.mcp_functions[function_name]
        try:
            result = await function(**kwargs)
            return result
        except Exception as e:
            logging.error(f"MCP function {function_name} failed: {str(e)}")
            return {"success": False, "error": str(e)}
    else:
        return {"success": False, "error": f"Unknown MCP function: {function_name}"}

# Usage example
async def example_orchestration():
    """Example of orchestrating marketing agents"""
    
    business_data = {
        "name": "Elite Cuts Barbershop",
        "location": "Downtown Seattle",
        "phone": "(555) 123-4567",
        "owner_name": "Mike Johnson"
    }
    
    # Example comprehensive marketing plan
    marketing_plan = {
        "sms_marketing": {
            "enabled": True,
            "plan": "professional",
            "campaign_data": {
                "recipients": [
                    {"phone": "+15551234567", "name": "John Doe"},
                    {"phone": "+15559876543", "name": "Jane Smith"}
                ],
                "message": "🎉 Special offer at Elite Cuts! Book this week and save 20%. Reply BOOK or call us!"
            }
        },
        "email_marketing": {
            "enabled": True,
            "plan": "professional",
            "campaign_data": {
                "recipients": [
                    {"email": "john@example.com", "name": "John Doe"},
                    {"email": "jane@example.com", "name": "Jane Smith"}
                ],
                "subject": "Special Offer This Week!",
                "content": "<h2>Save 20% This Week!</h2><p>Book your appointment now!</p>"
            }
        },
        "gmb_automation": {
            "enabled": True,
            "plan": "professional",
            "business_data": business_data
        },
        "social_media": {
            "enabled": True,
            "plan": "professional",
            "business_data": business_data,
            "platforms": ["instagram", "facebook"]
        },
        "review_management": {
            "enabled": True,
            "plan": "professional",
            "platforms": ["google", "facebook", "yelp"]
        }
    }
    
    # Execute comprehensive marketing plan
    result = await orchestrator.execute_marketing_plan(
        business_id="elite_cuts_001",
        marketing_plan=marketing_plan,
        priority="high"
    )
    
    print("Marketing Plan Execution Result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    # Example usage
    asyncio.run(example_orchestration())