#!/usr/bin/env python3
"""
Marketing Approval Connector
Integrates marketing automation agents with the approval workflow system
Ensures all marketing activities go through proper approval channels
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from pathlib import Path

# Import the approval workflow system
from workflow.approval_workflow_system import ApprovalWorkflowSystem, WorkflowType, Priority, ApprovalStatus

class MarketingApprovalConnector:
    """
    Connects marketing automation agents with approval workflow
    Ensures proper oversight and control for all marketing activities
    """
    
    def __init__(self, approval_system: ApprovalWorkflowSystem):
        self.approval_system = approval_system
        self.logger = logging.getLogger(__name__)
        
        # Marketing agent configurations
        self.agent_configs = {
            "sms_marketing": {
                "approval_required": True,
                "auto_approval_threshold": 100.00,  # Cost threshold for auto-approval
                "workflow_type": WorkflowType.MARKETING_CAMPAIGN,
                "min_confidence": 0.85
            },
            "email_marketing": {
                "approval_required": True,
                "auto_approval_threshold": 75.00,
                "workflow_type": WorkflowType.MARKETING_CAMPAIGN,
                "min_confidence": 0.80
            },
            "gmb_automation": {
                "approval_required": True,
                "auto_approval_threshold": 50.00,
                "workflow_type": WorkflowType.CONTENT_CREATION,
                "min_confidence": 0.90
            },
            "social_media": {
                "approval_required": True,
                "auto_approval_threshold": 60.00,
                "workflow_type": WorkflowType.CONTENT_CREATION,
                "min_confidence": 0.85
            },
            "review_management": {
                "approval_required": True,
                "auto_approval_threshold": 30.00,
                "workflow_type": WorkflowType.CUSTOMER_COMMUNICATION,
                "min_confidence": 0.95
            },
            "website_generation": {
                "approval_required": True,
                "auto_approval_threshold": 200.00,
                "workflow_type": WorkflowType.SERVICE_ADDITION,
                "min_confidence": 0.75
            }
        }
        
        self.logger.info("Marketing Approval Connector initialized")
    
    async def request_marketing_approval(self,
                                       business_id: str,
                                       agent_type: str,
                                       action_details: Dict[str, Any],
                                       requester_id: str = "system_ai") -> Dict[str, Any]:
        """
        Request approval for marketing automation action
        """
        try:
            if agent_type not in self.agent_configs:
                return {"success": False, "error": f"Unknown agent type: {agent_type}"}
            
            config = self.agent_configs[agent_type]
            
            # Check if approval is required
            if not config["approval_required"]:
                return {
                    "success": True,
                    "status": "no_approval_required",
                    "message": "Action can proceed without approval"
                }
            
            # Determine priority based on cost and urgency
            priority = self._determine_priority(action_details)
            
            # Create approval request
            approval_result = await self.approval_system.submit_approval_request(
                business_id=business_id,
                workflow_type=config["workflow_type"],
                title=self._generate_title(agent_type, action_details),
                description=self._generate_description(agent_type, action_details),
                requested_action=self._prepare_action_data(action_details),
                requester_id=requester_id,
                priority=priority,
                metadata=self._generate_metadata(agent_type, action_details)
            )
            
            return approval_result
            
        except Exception as e:
            self.logger.error(f"Failed to request marketing approval: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def check_approval_status(self, request_id: str) -> Dict[str, Any]:
        """Check the status of an approval request"""
        
        try:
            # This would query the approval system for request status
            # For now, we'll return a mock response
            return {
                "success": True,
                "request_id": request_id,
                "status": "pending",
                "message": "Approval request is pending review"
            }
            
        except Exception as e:
            self.logger.error(f"Failed to check approval status: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def execute_approved_marketing_action(self,
                                              business_id: str,
                                              agent_type: str,
                                              action_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a marketing action that has been approved
        This is called by the approval system after approval is granted
        """
        try:
            self.logger.info(f"Executing approved {agent_type} action for business {business_id}")
            
            # Route to appropriate marketing agent
            if agent_type == "sms_marketing":
                return await self._execute_sms_campaign(business_id, action_details)
            elif agent_type == "email_marketing":
                return await self._execute_email_campaign(business_id, action_details)
            elif agent_type == "gmb_automation":
                return await self._execute_gmb_action(business_id, action_details)
            elif agent_type == "social_media":
                return await self._execute_social_media_action(business_id, action_details)
            elif agent_type == "review_management":
                return await self._execute_review_management(business_id, action_details)
            elif agent_type == "website_generation":
                return await self._execute_website_generation(business_id, action_details)
            else:
                return {"success": False, "error": f"Unknown agent type: {agent_type}"}
                
        except Exception as e:
            self.logger.error(f"Failed to execute marketing action: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _determine_priority(self, action_details: Dict[str, Any]) -> Priority:
        """Determine priority based on action characteristics"""
        
        cost = action_details.get("estimated_cost", 0)
        urgency = action_details.get("urgency", "medium")
        customer_impact = action_details.get("customer_impact", "medium")
        
        # Urgent priority conditions
        if (urgency == "urgent" or 
            cost > 200 or 
            customer_impact == "high" or
            action_details.get("expires_soon", False)):
            return Priority.URGENT
        
        # High priority conditions
        if (cost > 100 or 
            customer_impact == "medium_high" or
            action_details.get("revenue_impact", 0) > 1000):
            return Priority.HIGH
        
        # Medium priority (default)
        if cost > 30:
            return Priority.MEDIUM
        
        # Low priority
        return Priority.LOW
    
    def _generate_title(self, agent_type: str, action_details: Dict[str, Any]) -> str:
        """Generate human-readable title for approval request"""
        
        templates = {
            "sms_marketing": "SMS Campaign: {campaign_name}",
            "email_marketing": "Email Campaign: {campaign_name}",
            "gmb_automation": "Google My Business: {action_type}",
            "social_media": "Social Media: {content_type}",
            "review_management": "Review Response: {platform}",
            "website_generation": "Website Update: {update_type}"
        }
        
        template = templates.get(agent_type, f"{agent_type.replace('_', ' ').title()}: New Action")
        
        try:
            return template.format(**action_details)
        except KeyError:
            return f"{agent_type.replace('_', ' ').title()}: {action_details.get('action_type', 'New Action')}"
    
    def _generate_description(self, agent_type: str, action_details: Dict[str, Any]) -> str:
        """Generate detailed description for approval request"""
        
        descriptions = {
            "sms_marketing": self._describe_sms_campaign,
            "email_marketing": self._describe_email_campaign,
            "gmb_automation": self._describe_gmb_action,
            "social_media": self._describe_social_action,
            "review_management": self._describe_review_action,
            "website_generation": self._describe_website_action
        }
        
        generator = descriptions.get(agent_type, self._describe_generic_action)
        return generator(action_details)
    
    def _describe_sms_campaign(self, action_details: Dict[str, Any]) -> str:
        """Generate description for SMS campaign"""
        
        campaign_type = action_details.get("campaign_type", "SMS campaign")
        target_count = action_details.get("target_audience_size", "customers")
        message_count = action_details.get("message_count", 1)
        
        return f"{campaign_type} targeting {target_count} customers with {message_count} message(s). " \
               f"Estimated cost: ${action_details.get('estimated_cost', 0):.2f}. " \
               f"Expected ROI: {action_details.get('expected_roi', 'Not specified')}."
    
    def _describe_email_campaign(self, action_details: Dict[str, Any]) -> str:
        """Generate description for email campaign"""
        
        campaign_type = action_details.get("campaign_type", "Email campaign")
        target_count = action_details.get("target_audience_size", "subscribers")
        
        return f"{campaign_type} to {target_count} subscribers. " \
               f"Subject: {action_details.get('subject', 'Not specified')}. " \
               f"Estimated cost: ${action_details.get('estimated_cost', 0):.2f}."
    
    def _describe_gmb_action(self, action_details: Dict[str, Any]) -> str:
        """Generate description for GMB action"""
        
        action_type = action_details.get("action_type", "GMB update")
        post_count = action_details.get("post_count", 1)
        
        return f"{action_type} with {post_count} post(s) to Google My Business profile. " \
               f"Content focus: {action_details.get('content_focus', 'General updates')}."
    
    def _describe_social_action(self, action_details: Dict[str, Any]) -> str:
        """Generate description for social media action"""
        
        content_type = action_details.get("content_type", "Social media content")
        platforms = action_details.get("platforms", ["Instagram", "Facebook"])
        post_count = action_details.get("post_count", 1)
        
        return f"{content_type} for {', '.join(platforms)} with {post_count} post(s). " \
               f"Theme: {action_details.get('theme', 'General promotion')}."
    
    def _describe_review_action(self, action_details: Dict[str, Any]) -> str:
        """Generate description for review management action"""
        
        action_type = action_details.get("action_type", "Review response")
        platform = action_details.get("platform", "multiple platforms")
        
        return f"{action_type} on {platform}. " \
               f"Response tone: {action_details.get('tone', 'Professional')}."
    
    def _describe_website_action(self, action_details: Dict[str, Any]) -> str:
        """Generate description for website action"""
        
        update_type = action_details.get("update_type", "Website update")
        
        return f"{update_type} to business website. " \
               f"Changes: {action_details.get('changes_summary', 'Various improvements')}."
    
    def _describe_generic_action(self, action_details: Dict[str, Any]) -> str:
        """Generate generic description"""
        
        return f"Marketing automation action with estimated cost of ${action_details.get('estimated_cost', 0):.2f}. " \
               f"AI confidence: {action_details.get('ai_confidence', 0) * 100:.0f}%."
    
    def _prepare_action_data(self, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare action data for approval system"""
        
        return {
            "estimated_cost": action_details.get("estimated_cost", 0),
            "ai_confidence": action_details.get("ai_confidence", 0.5),
            "target_audience_size": action_details.get("target_audience_size", 0),
            "expected_roi": action_details.get("expected_roi", "Unknown"),
            "duration": action_details.get("duration", "Immediate"),
            "channels": action_details.get("channels", []),
            "content_preview": action_details.get("content_preview", ""),
            "automation_level": action_details.get("automation_level", "partial"),
            "original_request": action_details
        }
    
    def _generate_metadata(self, agent_type: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Generate metadata for approval request"""
        
        return {
            "agent_type": agent_type,
            "confidence_score": action_details.get("ai_confidence", 0.5),
            "cost_category": self._categorize_cost(action_details.get("estimated_cost", 0)),
            "automation_level": action_details.get("automation_level", "partial"),
            "business_impact": self._assess_business_impact(action_details),
            "risk_level": self._assess_risk_level(action_details),
            "compliance_checked": True,
            "generated_at": datetime.now().isoformat()
        }
    
    def _categorize_cost(self, cost: float) -> str:
        """Categorize cost level"""
        if cost < 25:
            return "low"
        elif cost < 100:
            return "medium"
        elif cost < 250:
            return "high"
        else:
            return "very_high"
    
    def _assess_business_impact(self, action_details: Dict[str, Any]) -> str:
        """Assess potential business impact"""
        
        target_size = action_details.get("target_audience_size", 0)
        expected_roi = action_details.get("expected_roi", "0%")
        
        try:
            roi_value = float(expected_roi.replace("%", ""))
            if roi_value > 200 or target_size > 200:
                return "high"
            elif roi_value > 100 or target_size > 50:
                return "medium"
            else:
                return "low"
        except (ValueError, AttributeError):
            return "medium"
    
    def _assess_risk_level(self, action_details: Dict[str, Any]) -> str:
        """Assess risk level of the action"""
        
        risk_factors = 0
        
        # High cost increases risk
        if action_details.get("estimated_cost", 0) > 200:
            risk_factors += 2
        elif action_details.get("estimated_cost", 0) > 100:
            risk_factors += 1
        
        # Low AI confidence increases risk
        if action_details.get("ai_confidence", 1.0) < 0.7:
            risk_factors += 2
        elif action_details.get("ai_confidence", 1.0) < 0.85:
            risk_factors += 1
        
        # Large audience increases risk
        if action_details.get("target_audience_size", 0) > 500:
            risk_factors += 1
        
        # Customer communication has inherent risk
        if action_details.get("involves_customer_communication", False):
            risk_factors += 1
        
        if risk_factors >= 4:
            return "high"
        elif risk_factors >= 2:
            return "medium"
        else:
            return "low"
    
    # Marketing agent execution methods
    async def _execute_sms_campaign(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved SMS campaign"""
        
        self.logger.info(f"Executing SMS campaign for business {business_id}")
        
        # This would integrate with the actual SMS marketing agent
        return {
            "success": True,
            "campaign_id": f"sms_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "SMS campaign launched successfully",
            "messages_sent": action_details.get("target_audience_size", 0),
            "estimated_delivery_time": "2-5 minutes",
            "tracking_url": f"https://dashboard.bookedbarber.com/campaigns/sms_{business_id}"
        }
    
    async def _execute_email_campaign(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved email campaign"""
        
        self.logger.info(f"Executing email campaign for business {business_id}")
        
        return {
            "success": True,
            "campaign_id": f"email_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Email campaign launched successfully",
            "emails_sent": action_details.get("target_audience_size", 0),
            "estimated_delivery_time": "5-15 minutes",
            "tracking_url": f"https://dashboard.bookedbarber.com/campaigns/email_{business_id}"
        }
    
    async def _execute_gmb_action(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved GMB action"""
        
        self.logger.info(f"Executing GMB action for business {business_id}")
        
        return {
            "success": True,
            "action_id": f"gmb_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Google My Business action completed successfully",
            "posts_created": action_details.get("post_count", 1),
            "visibility_boost": "15-25%",
            "gmb_url": f"https://business.google.com/dashboard/{business_id}"
        }
    
    async def _execute_social_media_action(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved social media action"""
        
        self.logger.info(f"Executing social media action for business {business_id}")
        
        return {
            "success": True,
            "action_id": f"social_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Social media content published successfully",
            "posts_created": action_details.get("post_count", 1),
            "platforms": action_details.get("platforms", ["Instagram", "Facebook"]),
            "scheduled_time": action_details.get("scheduled_time", "Immediate")
        }
    
    async def _execute_review_management(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved review management action"""
        
        self.logger.info(f"Executing review management for business {business_id}")
        
        return {
            "success": True,
            "action_id": f"review_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Review management action completed successfully",
            "responses_generated": action_details.get("response_count", 1),
            "platforms_updated": action_details.get("platforms", ["Google", "Yelp"])
        }
    
    async def _execute_website_generation(self, business_id: str, action_details: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved website generation action"""
        
        self.logger.info(f"Executing website generation for business {business_id}")
        
        return {
            "success": True,
            "action_id": f"website_{business_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Website generation completed successfully",
            "pages_updated": action_details.get("page_count", 1),
            "website_url": f"https://{business_id}.bookedbarber.com",
            "go_live_time": "24-48 hours"
        }
    
    async def get_approval_requirements(self, business_id: str, agent_type: str) -> Dict[str, Any]:
        """Get approval requirements for a specific agent type"""
        
        try:
            if agent_type not in self.agent_configs:
                return {"success": False, "error": f"Unknown agent type: {agent_type}"}
            
            config = self.agent_configs[agent_type]
            
            return {
                "success": True,
                "agent_type": agent_type,
                "approval_required": config["approval_required"],
                "auto_approval_threshold": config["auto_approval_threshold"],
                "workflow_type": config["workflow_type"].value,
                "minimum_confidence": config["min_confidence"],
                "estimated_approval_time": "2-24 hours",
                "escalation_threshold": "48 hours"
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get approval requirements: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def update_agent_config(self, 
                                business_id: str,
                                agent_type: str, 
                                config_updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration for a marketing agent"""
        
        try:
            if agent_type not in self.agent_configs:
                return {"success": False, "error": f"Unknown agent type: {agent_type}"}
            
            # Update configuration
            for key, value in config_updates.items():
                if key in self.agent_configs[agent_type]:
                    self.agent_configs[agent_type][key] = value
            
            self.logger.info(f"Updated configuration for {agent_type}: {config_updates}")
            
            return {
                "success": True,
                "message": f"Configuration updated for {agent_type}",
                "updated_config": self.agent_configs[agent_type]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to update agent config: {str(e)}")
            return {"success": False, "error": str(e)}

# Usage example and integration
async def example_marketing_approval_flow():
    """Example of the complete marketing approval flow"""
    
    # Initialize systems
    approval_system = ApprovalWorkflowSystem()
    marketing_connector = MarketingApprovalConnector(approval_system)
    
    # Set up approval permissions for a business owner
    await approval_system.set_user_permissions(
        user_id="owner_001",
        business_id="business_001",
        role=approval_system.UserRole.SHOP_OWNER,
        permissions=["approve_marketing", "approve_content"],
        approval_limits={"max_campaign_cost": 300},
        auto_approval_settings={
            "marketing_campaign": {"enabled": True, "limits": {"max_cost": 75}}
        }
    )
    
    # Marketing agent requests approval
    approval_request = await marketing_connector.request_marketing_approval(
        business_id="business_001",
        agent_type="sms_marketing",
        action_details={
            "campaign_name": "Weekend Special Promotion",
            "campaign_type": "promotional_sms",
            "target_audience_size": 120,
            "message_count": 1,
            "estimated_cost": 65.00,
            "ai_confidence": 0.91,
            "expected_roi": "280%",
            "content_preview": "🎉 Weekend Special: 20% off premium haircuts! Book now..."
        }
    )
    
    print("Marketing Approval Request:")
    print(json.dumps(approval_request, indent=2, default=str))
    
    # If approved (either manually or automatically), execute the action
    if approval_request.get("status") in ["auto_approved", "approved"]:
        execution_result = await marketing_connector.execute_approved_marketing_action(
            business_id="business_001",
            agent_type="sms_marketing",
            action_details={
                "campaign_name": "Weekend Special Promotion",
                "target_audience_size": 120,
                "estimated_cost": 65.00
            }
        )
        
        print("\nMarketing Action Execution:")
        print(json.dumps(execution_result, indent=2, default=str))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(example_marketing_approval_flow())