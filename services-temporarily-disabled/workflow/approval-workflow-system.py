#!/usr/bin/env python3
"""
Approval Workflow System
Comprehensive approval and control system for barbershop owners to manage marketing automation
Ensures human oversight while maintaining automation efficiency
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import sqlite3
import logging
from pathlib import Path

class ApprovalStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    AUTO_APPROVED = "auto_approved"
    EXPIRED = "expired"

class WorkflowType(Enum):
    MARKETING_CAMPAIGN = "marketing_campaign"
    CONTENT_CREATION = "content_creation"
    PRICE_CHANGE = "price_change"
    SERVICE_ADDITION = "service_addition"
    AUTOMATION_RULE = "automation_rule"
    CUSTOMER_COMMUNICATION = "customer_communication"

class Priority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class UserRole(Enum):
    BARBER = "barber"
    SHOP_OWNER = "shop_owner"
    ENTERPRISE_OWNER = "enterprise_owner"
    SYSTEM_ADMIN = "system_admin"

@dataclass
class ApprovalRequest:
    """Approval request data structure"""
    request_id: str
    business_id: str
    workflow_type: WorkflowType
    title: str
    description: str
    requested_action: Dict[str, Any]
    requester_id: str
    approver_ids: List[str]
    status: ApprovalStatus
    priority: Priority
    auto_approval_eligible: bool
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    approval_history: List[Dict[str, Any]]

@dataclass
class ApprovalRule:
    """Approval rule configuration"""
    rule_id: str
    business_id: str
    workflow_type: WorkflowType
    conditions: Dict[str, Any]
    auto_approve: bool
    required_approvers: List[str]
    approval_timeout_hours: int
    escalation_rules: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime

@dataclass
class UserPermission:
    """User permission configuration"""
    user_id: str
    business_id: str
    role: UserRole
    permissions: List[str]
    approval_limits: Dict[str, Any]
    auto_approval_settings: Dict[str, Any]
    notification_preferences: Dict[str, Any]

class ApprovalWorkflowSystem:
    """
    Comprehensive approval workflow system for marketing automation
    Provides control, oversight, and flexibility for barbershop owners
    """
    
    def __init__(self, database_path: str = '/Users/bossio/6FB AI Agent System/agent_system.db'):
        self.database_path = database_path
        self.logger = logging.getLogger(__name__)
        
        # Active approval requests
        self.pending_requests: Dict[str, ApprovalRequest] = {}
        
        # Approval rules and permissions
        self.approval_rules: Dict[str, List[ApprovalRule]] = {}
        self.user_permissions: Dict[str, UserPermission] = {}
        
        # Notification handlers
        self.notification_handlers: Dict[str, Callable] = {}
        
        # Auto-approval AI confidence thresholds
        self.auto_approval_thresholds = {
            WorkflowType.MARKETING_CAMPAIGN: 0.85,
            WorkflowType.CONTENT_CREATION: 0.90,
            WorkflowType.CUSTOMER_COMMUNICATION: 0.95,
            WorkflowType.AUTOMATION_RULE: 0.80,
            WorkflowType.PRICE_CHANGE: 0.70,
            WorkflowType.SERVICE_ADDITION: 0.75
        }
        
        # Initialize database and load configurations
        asyncio.create_task(self._initialize_workflow_tables())
        
        self.logger.info("Approval Workflow System initialized")
    
    async def _initialize_workflow_tables(self):
        """Initialize database tables for approval workflow"""
        try:
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Approval requests table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS approval_requests (
                        request_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        workflow_type TEXT NOT NULL,
                        title TEXT NOT NULL,
                        description TEXT NOT NULL,
                        requested_action TEXT NOT NULL,
                        requester_id TEXT NOT NULL,
                        approver_ids TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'pending',
                        priority TEXT NOT NULL DEFAULT 'medium',
                        auto_approval_eligible BOOLEAN DEFAULT 0,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        metadata TEXT DEFAULT '{}',
                        approval_history TEXT DEFAULT '[]'
                    )
                ''')
                
                # Approval rules table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS approval_rules (
                        rule_id TEXT PRIMARY KEY,
                        business_id TEXT NOT NULL,
                        workflow_type TEXT NOT NULL,
                        conditions TEXT NOT NULL,
                        auto_approve BOOLEAN DEFAULT 0,
                        required_approvers TEXT NOT NULL,
                        approval_timeout_hours INTEGER DEFAULT 24,
                        escalation_rules TEXT DEFAULT '[]',
                        is_active BOOLEAN DEFAULT 1,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # User permissions table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS user_permissions (
                        user_id TEXT NOT NULL,
                        business_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        permissions TEXT NOT NULL,
                        approval_limits TEXT DEFAULT '{}',
                        auto_approval_settings TEXT DEFAULT '{}',
                        notification_preferences TEXT DEFAULT '{}',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, business_id)
                    )
                ''')
                
                # Approval decisions table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS approval_decisions (
                        decision_id TEXT PRIMARY KEY,
                        request_id TEXT NOT NULL,
                        approver_id TEXT NOT NULL,
                        decision TEXT NOT NULL,
                        decision_reason TEXT,
                        decision_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (request_id) REFERENCES approval_requests(request_id)
                    )
                ''')
                
                db.commit()
                self.logger.info("Approval workflow database tables initialized")
                
        except Exception as e:
            self.logger.error(f"Failed to initialize workflow tables: {str(e)}")
    
    async def submit_approval_request(self,
                                    business_id: str,
                                    workflow_type: WorkflowType,
                                    title: str,
                                    description: str,
                                    requested_action: Dict[str, Any],
                                    requester_id: str,
                                    priority: Priority = Priority.MEDIUM,
                                    metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Submit a new approval request"""
        
        try:
            request_id = f"req_{business_id}_{workflow_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Determine approvers based on business rules
            approver_ids = await self._determine_approvers(business_id, workflow_type, requested_action)
            
            # Check if eligible for auto-approval
            auto_approval_eligible = await self._check_auto_approval_eligibility(
                business_id, workflow_type, requested_action, requester_id
            )
            
            # Set expiration time
            expires_at = datetime.now() + timedelta(hours=24)  # Default 24 hours
            
            # Create approval request
            request = ApprovalRequest(
                request_id=request_id,
                business_id=business_id,
                workflow_type=workflow_type,
                title=title,
                description=description,
                requested_action=requested_action,
                requester_id=requester_id,
                approver_ids=approver_ids,
                status=ApprovalStatus.PENDING,
                priority=priority,
                auto_approval_eligible=auto_approval_eligible,
                expires_at=expires_at,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata=metadata or {},
                approval_history=[]
            )
            
            # Store in database
            await self._store_approval_request(request)
            
            # Check for immediate auto-approval
            if auto_approval_eligible:
                approval_result = await self._process_auto_approval(request_id)
                if approval_result["auto_approved"]:
                    return {
                        "success": True,
                        "request_id": request_id,
                        "status": "auto_approved",
                        "message": "Request automatically approved and executed",
                        "execution_result": approval_result["execution_result"]
                    }
            
            # Send notifications to approvers
            await self._send_approval_notifications(request)
            
            self.logger.info(f"Approval request submitted: {request_id}")
            
            return {
                "success": True,
                "request_id": request_id,
                "status": "pending",
                "approvers": approver_ids,
                "expires_at": expires_at.isoformat(),
                "auto_approval_eligible": auto_approval_eligible,
                "estimated_response_time": "2-24 hours"
            }
            
        except Exception as e:
            self.logger.error(f"Failed to submit approval request: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def process_approval_decision(self,
                                      request_id: str,
                                      approver_id: str,
                                      decision: str,  # "approve" or "reject"
                                      decision_reason: str = None) -> Dict[str, Any]:
        """Process an approval decision"""
        
        try:
            # Get the request
            request = await self._get_approval_request(request_id)
            if not request:
                return {"success": False, "error": "Approval request not found"}
            
            if request.status != ApprovalStatus.PENDING:
                return {"success": False, "error": f"Request already {request.status.value}"}
            
            # Verify approver permissions
            if approver_id not in request.approver_ids:
                return {"success": False, "error": "User not authorized to approve this request"}
            
            # Record the decision
            decision_id = f"dec_{request_id}_{approver_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            await self._record_approval_decision(decision_id, request_id, approver_id, decision, decision_reason)
            
            # Update approval history
            request.approval_history.append({
                "decision_id": decision_id,
                "approver_id": approver_id,
                "decision": decision,
                "reason": decision_reason,
                "timestamp": datetime.now().isoformat()
            })
            
            # Determine final status
            if decision == "reject":
                request.status = ApprovalStatus.REJECTED
                await self._update_approval_request(request)
                
                # Send rejection notifications
                await self._send_decision_notifications(request, "rejected")
                
                return {
                    "success": True,
                    "request_id": request_id,
                    "final_status": "rejected",
                    "message": "Request has been rejected"
                }
            
            elif decision == "approve":
                # Check if all required approvals are received
                approved_count = len([h for h in request.approval_history if h["decision"] == "approve"])
                required_approvals = len(request.approver_ids)
                
                if approved_count >= required_approvals:
                    request.status = ApprovalStatus.APPROVED
                    await self._update_approval_request(request)
                    
                    # Execute the approved action
                    execution_result = await self._execute_approved_action(request)
                    
                    # Send approval notifications
                    await self._send_decision_notifications(request, "approved")
                    
                    return {
                        "success": True,
                        "request_id": request_id,
                        "final_status": "approved",
                        "message": "Request approved and executed",
                        "execution_result": execution_result
                    }
                else:
                    await self._update_approval_request(request)
                    return {
                        "success": True,
                        "request_id": request_id,
                        "final_status": "pending",
                        "message": f"Approval recorded. {required_approvals - approved_count} more approvals needed."
                    }
            
        except Exception as e:
            self.logger.error(f"Failed to process approval decision: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_pending_approvals(self, 
                                  business_id: str,
                                  approver_id: str = None) -> Dict[str, Any]:
        """Get pending approval requests for a business or approver"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                if approver_id:
                    # Get requests where this user is an approver
                    cursor.execute('''
                        SELECT * FROM approval_requests 
                        WHERE business_id = ? 
                            AND status = 'pending'
                            AND approver_ids LIKE ?
                        ORDER BY priority DESC, created_at ASC
                    ''', (business_id, f'%{approver_id}%'))
                else:
                    # Get all pending requests for the business
                    cursor.execute('''
                        SELECT * FROM approval_requests 
                        WHERE business_id = ? AND status = 'pending'
                        ORDER BY priority DESC, created_at ASC
                    ''', (business_id,))
                
                requests = cursor.fetchall()
                
                pending_requests = []
                for row in requests:
                    request_data = dict(row)
                    
                    # Parse JSON fields
                    request_data['requested_action'] = json.loads(request_data['requested_action'])
                    request_data['approver_ids'] = json.loads(request_data['approver_ids'])
                    request_data['metadata'] = json.loads(request_data['metadata'])
                    request_data['approval_history'] = json.loads(request_data['approval_history'])
                    
                    # Calculate time remaining
                    expires_at = datetime.fromisoformat(request_data['expires_at'])
                    time_remaining = expires_at - datetime.now()
                    request_data['hours_remaining'] = max(0, time_remaining.total_seconds() / 3600)
                    
                    pending_requests.append(request_data)
                
                return {
                    "success": True,
                    "business_id": business_id,
                    "pending_requests": pending_requests,
                    "total_count": len(pending_requests),
                    "urgent_count": len([r for r in pending_requests if r['priority'] == 'urgent']),
                    "expiring_soon_count": len([r for r in pending_requests if r['hours_remaining'] < 2])
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get pending approvals: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def configure_approval_rules(self,
                                     business_id: str,
                                     workflow_type: WorkflowType,
                                     rules: Dict[str, Any]) -> Dict[str, Any]:
        """Configure approval rules for a business and workflow type"""
        
        try:
            rule_id = f"rule_{business_id}_{workflow_type.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            approval_rule = ApprovalRule(
                rule_id=rule_id,
                business_id=business_id,
                workflow_type=workflow_type,
                conditions=rules.get('conditions', {}),
                auto_approve=rules.get('auto_approve', False),
                required_approvers=rules.get('required_approvers', []),
                approval_timeout_hours=rules.get('timeout_hours', 24),
                escalation_rules=rules.get('escalation_rules', []),
                is_active=True,
                created_at=datetime.now()
            )
            
            # Store in database
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                # Deactivate existing rules for this workflow type
                cursor.execute('''
                    UPDATE approval_rules 
                    SET is_active = 0 
                    WHERE business_id = ? AND workflow_type = ?
                ''', (business_id, workflow_type.value))
                
                # Insert new rule
                cursor.execute('''
                    INSERT INTO approval_rules 
                    (rule_id, business_id, workflow_type, conditions, auto_approve, required_approvers, 
                     approval_timeout_hours, escalation_rules, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    approval_rule.rule_id,
                    approval_rule.business_id,
                    approval_rule.workflow_type.value,
                    json.dumps(approval_rule.conditions),
                    approval_rule.auto_approve,
                    json.dumps(approval_rule.required_approvers),
                    approval_rule.approval_timeout_hours,
                    json.dumps(approval_rule.escalation_rules),
                    approval_rule.is_active,
                    approval_rule.created_at.isoformat()
                ))
                
                db.commit()
            
            self.logger.info(f"Approval rules configured for {business_id} - {workflow_type.value}")
            
            return {
                "success": True,
                "rule_id": rule_id,
                "message": f"Approval rules configured for {workflow_type.value}"
            }
            
        except Exception as e:
            self.logger.error(f"Failed to configure approval rules: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def set_user_permissions(self,
                                 user_id: str,
                                 business_id: str,
                                 role: UserRole,
                                 permissions: List[str],
                                 approval_limits: Dict[str, Any] = None,
                                 auto_approval_settings: Dict[str, Any] = None) -> Dict[str, Any]:
        """Set user permissions and approval settings"""
        
        try:
            user_permission = UserPermission(
                user_id=user_id,
                business_id=business_id,
                role=role,
                permissions=permissions,
                approval_limits=approval_limits or {},
                auto_approval_settings=auto_approval_settings or {},
                notification_preferences={"email": True, "sms": False, "push": True}
            )
            
            # Store in database
            with sqlite3.connect(self.database_path) as db:
                cursor = db.cursor()
                
                cursor.execute('''
                    INSERT OR REPLACE INTO user_permissions 
                    (user_id, business_id, role, permissions, approval_limits, auto_approval_settings, notification_preferences, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_permission.user_id,
                    user_permission.business_id,
                    user_permission.role.value,
                    json.dumps(user_permission.permissions),
                    json.dumps(user_permission.approval_limits),
                    json.dumps(user_permission.auto_approval_settings),
                    json.dumps(user_permission.notification_preferences),
                    datetime.now().isoformat()
                ))
                
                db.commit()
            
            self.logger.info(f"User permissions set for {user_id} in business {business_id}")
            
            return {
                "success": True,
                "message": f"Permissions configured for user {user_id}",
                "role": role.value,
                "permissions_count": len(permissions)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to set user permissions: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_approval_analytics(self, business_id: str, days: int = 30) -> Dict[str, Any]:
        """Get approval workflow analytics and insights"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                start_date = datetime.now() - timedelta(days=days)
                
                # Overall approval statistics
                cursor.execute('''
                    SELECT 
                        status,
                        workflow_type,
                        priority,
                        COUNT(*) as count,
                        AVG(
                            CASE 
                                WHEN status IN ('approved', 'rejected') 
                                THEN (julianday(updated_at) - julianday(created_at)) * 24 
                                ELSE NULL 
                            END
                        ) as avg_resolution_hours
                    FROM approval_requests 
                    WHERE business_id = ? AND created_at >= ?
                    GROUP BY status, workflow_type, priority
                ''', (business_id, start_date.isoformat()))
                
                stats = cursor.fetchall()
                
                # Approval trends by day
                cursor.execute('''
                    SELECT 
                        DATE(created_at) as date,
                        COUNT(*) as requests_submitted,
                        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
                        SUM(CASE WHEN status = 'auto_approved' THEN 1 ELSE 0 END) as auto_approved
                    FROM approval_requests 
                    WHERE business_id = ? AND created_at >= ?
                    GROUP BY DATE(created_at)
                    ORDER BY date DESC
                ''', (business_id, start_date.isoformat()))
                
                trends = cursor.fetchall()
                
                # Calculate metrics
                total_requests = sum(row['count'] for row in stats)
                approved_requests = sum(row['count'] for row in stats if row['status'] in ['approved', 'auto_approved'])
                rejected_requests = sum(row['count'] for row in stats if row['status'] == 'rejected')
                pending_requests = sum(row['count'] for row in stats if row['status'] == 'pending')
                
                approval_rate = (approved_requests / total_requests * 100) if total_requests > 0 else 0
                rejection_rate = (rejected_requests / total_requests * 100) if total_requests > 0 else 0
                
                # Auto-approval rate
                auto_approved = sum(row['count'] for row in stats if row['status'] == 'auto_approved')
                auto_approval_rate = (auto_approved / total_requests * 100) if total_requests > 0 else 0
                
                # Average resolution time
                resolution_times = [row['avg_resolution_hours'] for row in stats if row['avg_resolution_hours']]
                avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
                
                return {
                    "success": True,
                    "business_id": business_id,
                    "analysis_period_days": days,
                    "summary": {
                        "total_requests": total_requests,
                        "approval_rate": round(approval_rate, 1),
                        "rejection_rate": round(rejection_rate, 1),
                        "auto_approval_rate": round(auto_approval_rate, 1),
                        "pending_requests": pending_requests,
                        "avg_resolution_hours": round(avg_resolution_time, 1)
                    },
                    "by_workflow_type": {
                        row['workflow_type']: {
                            "total": row['count'],
                            "status": row['status'],
                            "avg_resolution_hours": round(row['avg_resolution_hours'] or 0, 1)
                        }
                        for row in stats
                    },
                    "daily_trends": [dict(row) for row in trends],
                    "insights": self._generate_approval_insights(stats, trends, total_requests, approval_rate, auto_approval_rate)
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get approval analytics: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _generate_approval_insights(self, stats, trends, total_requests, approval_rate, auto_approval_rate):
        """Generate insights from approval analytics"""
        
        insights = []
        
        # High approval rate insight
        if approval_rate > 90:
            insights.append({
                "type": "positive",
                "title": "High Approval Rate",
                "description": f"{approval_rate:.1f}% of requests are approved, indicating good alignment between requesters and approvers.",
                "recommendation": "Consider increasing auto-approval thresholds for routine requests."
            })
        
        # Low auto-approval rate insight
        if auto_approval_rate < 30 and total_requests > 10:
            insights.append({
                "type": "optimization",
                "title": "Low Auto-Approval Rate",
                "description": f"Only {auto_approval_rate:.1f}% of requests are auto-approved.",
                "recommendation": "Review and optimize auto-approval rules to reduce manual oversight for routine tasks."
            })
        
        # High rejection rate insight
        if approval_rate < 70 and total_requests > 5:
            insights.append({
                "type": "attention",
                "title": "High Rejection Rate",
                "description": f"Rejection rate of {100-approval_rate:.1f}% suggests misalignment in expectations.",
                "recommendation": "Review approval criteria and provide better guidance to requesters."
            })
        
        # Volume trends
        if len(trends) >= 7:
            recent_volume = sum(row['requests_submitted'] for row in trends[:7])
            earlier_volume = sum(row['requests_submitted'] for row in trends[7:14] if len(trends) > 14 else trends[7:])
            
            if recent_volume > earlier_volume * 1.5:
                insights.append({
                    "type": "trend",
                    "title": "Increasing Request Volume",
                    "description": "Approval request volume has increased significantly in recent days.",
                    "recommendation": "Consider additional approvers or enhanced auto-approval rules to handle increased volume."
                })
        
        return insights
    
    # Helper methods
    async def _determine_approvers(self, business_id: str, workflow_type: WorkflowType, requested_action: Dict[str, Any]) -> List[str]:
        """Determine required approvers based on business rules"""
        
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                # Get approval rules for this workflow type
                cursor.execute('''
                    SELECT required_approvers FROM approval_rules 
                    WHERE business_id = ? AND workflow_type = ? AND is_active = 1
                    ORDER BY created_at DESC LIMIT 1
                ''', (business_id, workflow_type.value))
                
                rule = cursor.fetchone()
                if rule:
                    return json.loads(rule['required_approvers'])
                
                # Default approvers based on user roles
                cursor.execute('''
                    SELECT user_id FROM user_permissions 
                    WHERE business_id = ? AND role IN ('shop_owner', 'enterprise_owner')
                ''', (business_id,))
                
                default_approvers = [row['user_id'] for row in cursor.fetchall()]
                return default_approvers[:2]  # Limit to 2 approvers by default
                
        except Exception as e:
            self.logger.error(f"Failed to determine approvers: {str(e)}")
            return []
    
    async def _check_auto_approval_eligibility(self, business_id: str, workflow_type: WorkflowType, 
                                             requested_action: Dict[str, Any], requester_id: str) -> bool:
        """Check if request is eligible for auto-approval"""
        
        try:
            # Get user permissions
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                cursor.execute('''
                    SELECT auto_approval_settings FROM user_permissions 
                    WHERE user_id = ? AND business_id = ?
                ''', (requester_id, business_id))
                
                user = cursor.fetchone()
                if not user:
                    return False
                
                auto_settings = json.loads(user['auto_approval_settings'])
                
                # Check if auto-approval is enabled for this workflow type
                if not auto_settings.get(workflow_type.value, {}).get('enabled', False):
                    return False
                
                # Check AI confidence threshold
                ai_confidence = requested_action.get('ai_confidence', 0)
                threshold = self.auto_approval_thresholds.get(workflow_type, 0.85)
                
                if ai_confidence < threshold:
                    return False
                
                # Check value/impact limits
                limits = auto_settings.get(workflow_type.value, {}).get('limits', {})
                action_value = requested_action.get('estimated_cost', 0)
                
                if action_value > limits.get('max_cost', 100):
                    return False
                
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to check auto-approval eligibility: {str(e)}")
            return False
    
    async def _process_auto_approval(self, request_id: str) -> Dict[str, Any]:
        """Process automatic approval"""
        
        try:
            request = await self._get_approval_request(request_id)
            if not request:
                return {"auto_approved": False, "error": "Request not found"}
            
            # Update status to auto-approved
            request.status = ApprovalStatus.AUTO_APPROVED
            request.approval_history.append({
                "decision_id": f"auto_{request_id}",
                "approver_id": "system",
                "decision": "auto_approve",
                "reason": "Meets auto-approval criteria",
                "timestamp": datetime.now().isoformat()
            })
            
            await self._update_approval_request(request)
            
            # Execute the approved action
            execution_result = await self._execute_approved_action(request)
            
            return {
                "auto_approved": True,
                "execution_result": execution_result
            }
            
        except Exception as e:
            self.logger.error(f"Failed to process auto-approval: {str(e)}")
            return {"auto_approved": False, "error": str(e)}
    
    async def _execute_approved_action(self, request: ApprovalRequest) -> Dict[str, Any]:
        """Execute the approved action"""
        
        try:
            action = request.requested_action
            workflow_type = request.workflow_type
            
            # Route to appropriate execution handler
            if workflow_type == WorkflowType.MARKETING_CAMPAIGN:
                return await self._execute_marketing_campaign(action)
            elif workflow_type == WorkflowType.CONTENT_CREATION:
                return await self._execute_content_creation(action)
            elif workflow_type == WorkflowType.AUTOMATION_RULE:
                return await self._execute_automation_rule(action)
            elif workflow_type == WorkflowType.CUSTOMER_COMMUNICATION:
                return await self._execute_customer_communication(action)
            else:
                return {"success": True, "message": "Action executed successfully", "details": "Generic execution"}
                
        except Exception as e:
            self.logger.error(f"Failed to execute approved action: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _execute_marketing_campaign(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved marketing campaign"""
        # This would integrate with the marketing agents
        return {
            "success": True,
            "campaign_id": f"camp_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Marketing campaign launched successfully",
            "estimated_reach": action.get('target_audience_size', 100),
            "channels": action.get('channels', ['sms', 'email'])
        }
    
    async def _execute_content_creation(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved content creation"""
        return {
            "success": True,
            "content_id": f"content_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Content created and scheduled successfully",
            "content_type": action.get('content_type', 'post'),
            "platforms": action.get('platforms', ['instagram', 'facebook'])
        }
    
    async def _execute_automation_rule(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved automation rule"""
        return {
            "success": True,
            "rule_id": f"rule_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Automation rule activated successfully",
            "rule_type": action.get('rule_type', 'trigger_based'),
            "conditions": action.get('conditions', {})
        }
    
    async def _execute_customer_communication(self, action: Dict[str, Any]) -> Dict[str, Any]:
        """Execute approved customer communication"""
        return {
            "success": True,
            "communication_id": f"comm_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "message": "Customer communication sent successfully",
            "recipients": action.get('recipient_count', 1),
            "channel": action.get('channel', 'email')
        }
    
    # Database helper methods
    async def _store_approval_request(self, request: ApprovalRequest):
        """Store approval request in database"""
        with sqlite3.connect(self.database_path) as db:
            cursor = db.cursor()
            
            cursor.execute('''
                INSERT INTO approval_requests 
                (request_id, business_id, workflow_type, title, description, requested_action, 
                 requester_id, approver_ids, status, priority, auto_approval_eligible, 
                 expires_at, created_at, updated_at, metadata, approval_history)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                request.request_id,
                request.business_id,
                request.workflow_type.value,
                request.title,
                request.description,
                json.dumps(request.requested_action),
                request.requester_id,
                json.dumps(request.approver_ids),
                request.status.value,
                request.priority.value,
                request.auto_approval_eligible,
                request.expires_at.isoformat(),
                request.created_at.isoformat(),
                request.updated_at.isoformat(),
                json.dumps(request.metadata),
                json.dumps(request.approval_history)
            ))
            
            db.commit()
    
    async def _get_approval_request(self, request_id: str) -> Optional[ApprovalRequest]:
        """Get approval request from database"""
        try:
            with sqlite3.connect(self.database_path) as db:
                db.row_factory = sqlite3.Row
                cursor = db.cursor()
                
                cursor.execute('SELECT * FROM approval_requests WHERE request_id = ?', (request_id,))
                row = cursor.fetchone()
                
                if not row:
                    return None
                
                return ApprovalRequest(
                    request_id=row['request_id'],
                    business_id=row['business_id'],
                    workflow_type=WorkflowType(row['workflow_type']),
                    title=row['title'],
                    description=row['description'],
                    requested_action=json.loads(row['requested_action']),
                    requester_id=row['requester_id'],
                    approver_ids=json.loads(row['approver_ids']),
                    status=ApprovalStatus(row['status']),
                    priority=Priority(row['priority']),
                    auto_approval_eligible=bool(row['auto_approval_eligible']),
                    expires_at=datetime.fromisoformat(row['expires_at']),
                    created_at=datetime.fromisoformat(row['created_at']),
                    updated_at=datetime.fromisoformat(row['updated_at']),
                    metadata=json.loads(row['metadata']),
                    approval_history=json.loads(row['approval_history'])
                )
                
        except Exception as e:
            self.logger.error(f"Failed to get approval request: {str(e)}")
            return None
    
    async def _update_approval_request(self, request: ApprovalRequest):
        """Update approval request in database"""
        with sqlite3.connect(self.database_path) as db:
            cursor = db.cursor()
            
            cursor.execute('''
                UPDATE approval_requests 
                SET status = ?, updated_at = ?, approval_history = ?
                WHERE request_id = ?
            ''', (
                request.status.value,
                datetime.now().isoformat(),
                json.dumps(request.approval_history),
                request.request_id
            ))
            
            db.commit()
    
    async def _record_approval_decision(self, decision_id: str, request_id: str, 
                                      approver_id: str, decision: str, reason: str = None):
        """Record approval decision in database"""
        with sqlite3.connect(self.database_path) as db:
            cursor = db.cursor()
            
            cursor.execute('''
                INSERT INTO approval_decisions 
                (decision_id, request_id, approver_id, decision, decision_reason, decision_timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                decision_id,
                request_id,
                approver_id,
                decision,
                reason,
                datetime.now().isoformat()
            ))
            
            db.commit()
    
    async def _send_approval_notifications(self, request: ApprovalRequest):
        """Send notifications to approvers"""
        # This would integrate with notification system
        self.logger.info(f"Approval notifications sent for request {request.request_id}")
    
    async def _send_decision_notifications(self, request: ApprovalRequest, decision: str):
        """Send notifications about approval decisions"""
        # This would integrate with notification system
        self.logger.info(f"Decision notification sent for request {request.request_id}: {decision}")

# Usage example and testing
async def example_approval_workflow():
    """Example of using the approval workflow system"""
    
    workflow = ApprovalWorkflowSystem()
    
    # Set up user permissions
    await workflow.set_user_permissions(
        user_id="owner_001",
        business_id="business_001",
        role=UserRole.SHOP_OWNER,
        permissions=["approve_marketing", "approve_content", "approve_pricing"],
        approval_limits={"max_campaign_cost": 500, "max_content_budget": 200},
        auto_approval_settings={
            "marketing_campaign": {"enabled": True, "limits": {"max_cost": 100}},
            "content_creation": {"enabled": True, "limits": {"max_cost": 50}}
        }
    )
    
    # Submit approval request
    approval_request = await workflow.submit_approval_request(
        business_id="business_001",
        workflow_type=WorkflowType.MARKETING_CAMPAIGN,
        title="SMS Campaign: New Customer Welcome Series",
        description="Automated SMS welcome series for new customers with 3 messages over 7 days",
        requested_action={
            "campaign_type": "sms_sequence",
            "target_audience": "new_customers",
            "message_count": 3,
            "estimated_cost": 75.00,
            "ai_confidence": 0.92,
            "channels": ["sms"],
            "duration_days": 7
        },
        requester_id="system_ai",
        priority=Priority.MEDIUM
    )
    
    print("Approval Request Result:")
    print(json.dumps(approval_request, indent=2, default=str))
    
    # Get pending approvals
    pending = await workflow.get_pending_approvals("business_001", "owner_001")
    print("\nPending Approvals:")
    print(json.dumps(pending, indent=2, default=str))
    
    # Process approval decision (if not auto-approved)
    if approval_request.get("status") == "pending":
        decision_result = await workflow.process_approval_decision(
            request_id=approval_request["request_id"],
            approver_id="owner_001",
            decision="approve",
            decision_reason="Looks good, launch the campaign"
        )
        
        print("\nApproval Decision Result:")
        print(json.dumps(decision_result, indent=2, default=str))
    
    # Get analytics
    analytics = await workflow.get_approval_analytics("business_001", days=30)
    print("\nApproval Analytics:")
    print(json.dumps(analytics, indent=2, default=str))

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(example_approval_workflow())