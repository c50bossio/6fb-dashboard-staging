#!/usr/bin/env python3
"""
Automated Incident Response System
Implements automated incident detection, response, and recovery
"""

import os
import asyncio
import logging
import json
import yaml
import requests
import time
import subprocess
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/incident-response.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class IncidentSeverity(Enum):
    CRITICAL = "critical"    # Service down, major functionality broken
    HIGH = "high"           # Significant degradation
    MEDIUM = "medium"       # Minor issues, some features affected
    LOW = "low"             # Minor issues, no user impact

class IncidentStatus(Enum):
    DETECTED = "detected"
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    CLOSED = "closed"

class AutomationAction(Enum):
    RESTART_SERVICE = "restart_service"
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    SWITCH_TRAFFIC = "switch_traffic"
    ROLLBACK_DEPLOYMENT = "rollback_deployment"
    CLEAR_CACHE = "clear_cache"
    RESTART_DATABASE = "restart_database"
    NOTIFY_ONCALL = "notify_oncall"

@dataclass
class Incident:
    """Incident data structure"""
    id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    service: str
    start_time: datetime
    end_time: Optional[datetime] = None
    assigned_to: Optional[str] = None
    automation_attempts: List[str] = None
    manual_steps: List[str] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    
@dataclass
class AutomationRule:
    """Automation rule configuration"""
    name: str
    trigger_condition: str
    actions: List[AutomationAction]
    max_attempts: int = 3
    cooldown_minutes: int = 5
    requires_approval: bool = False
    escalation_delay_minutes: int = 15
    
@dataclass
class Runbook:
    """Incident response runbook"""
    name: str
    title: str
    description: str
    severity: IncidentSeverity
    automated_steps: List[Dict[str, Any]]
    manual_steps: List[str]
    escalation_contacts: List[str]
    estimated_resolution_time: int  # minutes

class PagerDutyIntegration:
    """PagerDuty integration for incident management"""
    
    def __init__(self):
        self.api_token = os.getenv('PAGERDUTY_API_TOKEN')
        self.service_id = os.getenv('PAGERDUTY_SERVICE_ID')
        self.base_url = "https://api.pagerduty.com"
        
    async def create_incident(self, incident: Incident) -> str:
        """Create incident in PagerDuty"""
        try:
            headers = {
                'Authorization': f'Token token={self.api_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.pagerduty+json;version=2'
            }
            
            payload = {
                'incident': {
                    'type': 'incident',
                    'title': incident.title,
                    'service': {
                        'id': self.service_id,
                        'type': 'service_reference'
                    },
                    'urgency': 'high' if incident.severity in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH] else 'low',
                    'body': {
                        'type': 'incident_body',
                        'details': incident.description
                    }
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/incidents",
                    json=payload,
                    headers=headers
                ) as response:
                    if response.status == 201:
                        data = await response.json()
                        return data['incident']['id']
                    else:
                        logger.error(f"Failed to create PagerDuty incident: {response.status}")
                        return None
                        
        except Exception as e:
            logger.error(f"Error creating PagerDuty incident: {e}")
            return None
            
    async def update_incident(self, incident_id: str, status: str, resolution_note: str = None):
        """Update incident in PagerDuty"""
        try:
            headers = {
                'Authorization': f'Token token={self.api_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.pagerduty+json;version=2'
            }
            
            payload = {
                'incident': {
                    'type': 'incident',
                    'status': status
                }
            }
            
            if resolution_note:
                payload['incident']['resolution'] = resolution_note
                
            async with aiohttp.ClientSession() as session:
                async with session.put(
                    f"{self.base_url}/incidents/{incident_id}",
                    json=payload,
                    headers=headers
                ) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.error(f"Error updating PagerDuty incident: {e}")
            return False

class SlackIntegration:
    """Slack integration for incident communication"""
    
    def __init__(self):
        self.webhook_url = os.getenv('SLACK_INCIDENT_WEBHOOK_URL')
        self.channel = os.getenv('SLACK_INCIDENT_CHANNEL', '#incidents')
        
    async def send_incident_notification(self, incident: Incident, action: str = "created"):
        """Send incident notification to Slack"""
        try:
            color = {
                IncidentSeverity.CRITICAL: "danger",
                IncidentSeverity.HIGH: "warning", 
                IncidentSeverity.MEDIUM: "warning",
                IncidentSeverity.LOW: "good"
            }.get(incident.severity, "warning")
            
            payload = {
                "channel": self.channel,
                "username": "Incident Response Bot",
                "icon_emoji": ":rotating_light:",
                "text": f"Incident {action}: {incident.title}",
                "attachments": [{
                    "color": color,
                    "fields": [
                        {"title": "Incident ID", "value": incident.id, "short": True},
                        {"title": "Severity", "value": incident.severity.value.upper(), "short": True},
                        {"title": "Service", "value": incident.service, "short": True},
                        {"title": "Status", "value": incident.status.value.upper(), "short": True},
                        {"title": "Description", "value": incident.description, "short": False}
                    ],
                    "footer": "6FB AI Agent Incident Response",
                    "ts": int(incident.start_time.timestamp())
                }]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(self.webhook_url, json=payload) as response:
                    if response.status != 200:
                        logger.error(f"Failed to send Slack notification: {response.status}")
                        
        except Exception as e:
            logger.error(f"Error sending Slack notification: {e}")

class AutomationEngine:
    """Incident response automation engine"""
    
    def __init__(self):
        self.docker_client = None
        self.kubectl_available = False
        self._check_tooling()
        
    def _check_tooling(self):
        """Check available automation tooling"""
        try:
            import docker
            self.docker_client = docker.from_env()
            logger.info("Docker client initialized")
        except Exception:
            logger.warning("Docker client not available")
            
        try:
            subprocess.run(['kubectl', 'version', '--client'], 
                         capture_output=True, check=True)
            self.kubectl_available = True
            logger.info("kubectl available")
        except Exception:
            logger.warning("kubectl not available")
            
    async def execute_automation(self, action: AutomationAction, service: str, **kwargs) -> bool:
        """Execute automation action"""
        logger.info(f"Executing automation: {action.value} for service {service}")
        
        try:
            if action == AutomationAction.RESTART_SERVICE:
                return await self._restart_service(service)
            elif action == AutomationAction.SCALE_UP:
                return await self._scale_service(service, scale_up=True)
            elif action == AutomationAction.SCALE_DOWN:
                return await self._scale_service(service, scale_up=False)
            elif action == AutomationAction.SWITCH_TRAFFIC:
                return await self._switch_traffic(service, kwargs.get('target'))
            elif action == AutomationAction.ROLLBACK_DEPLOYMENT:
                return await self._rollback_deployment(service)
            elif action == AutomationAction.CLEAR_CACHE:
                return await self._clear_cache(service)
            elif action == AutomationAction.RESTART_DATABASE:
                return await self._restart_database()
            else:
                logger.warning(f"Unknown automation action: {action}")
                return False
                
        except Exception as e:
            logger.error(f"Automation execution failed: {e}")
            return False
            
    async def _restart_service(self, service: str) -> bool:
        """Restart service container or pod"""
        try:
            if self.kubectl_available:
                # Kubernetes restart
                cmd = ['kubectl', 'rollout', 'restart', f'deployment/{service}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                return result.returncode == 0
            elif self.docker_client:
                # Docker restart
                containers = self.docker_client.containers.list(
                    filters={'name': service}
                )
                for container in containers:
                    container.restart()
                return len(containers) > 0
            else:
                logger.error("No container orchestration available")
                return False
                
        except Exception as e:
            logger.error(f"Service restart failed: {e}")
            return False
            
    async def _scale_service(self, service: str, scale_up: bool = True) -> bool:
        """Scale service up or down"""
        try:
            if self.kubectl_available:
                # Get current replica count
                cmd = ['kubectl', 'get', 'deployment', service, '-o', 'jsonpath={.spec.replicas}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                current_replicas = int(result.stdout.strip())
                
                # Calculate new replica count
                if scale_up:
                    new_replicas = min(current_replicas * 2, 10)  # Max 10 replicas
                else:
                    new_replicas = max(current_replicas // 2, 1)  # Min 1 replica
                    
                # Scale deployment
                cmd = ['kubectl', 'scale', 'deployment', service, f'--replicas={new_replicas}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                return result.returncode == 0
            else:
                logger.error("Kubernetes not available for scaling")
                return False
                
        except Exception as e:
            logger.error(f"Service scaling failed: {e}")
            return False
            
    async def _switch_traffic(self, service: str, target: str) -> bool:
        """Switch traffic to different version"""
        try:
            # This would integrate with load balancer or ingress controller
            # Implementation depends on specific infrastructure
            logger.info(f"Switching traffic from {service} to {target}")
            return True
            
        except Exception as e:
            logger.error(f"Traffic switching failed: {e}")
            return False
            
    async def _rollback_deployment(self, service: str) -> bool:
        """Rollback deployment to previous version"""
        try:
            if self.kubectl_available:
                cmd = ['kubectl', 'rollout', 'undo', f'deployment/{service}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                return result.returncode == 0
            else:
                logger.error("Kubernetes not available for rollback")
                return False
                
        except Exception as e:
            logger.error(f"Deployment rollback failed: {e}")
            return False
            
    async def _clear_cache(self, service: str) -> bool:
        """Clear service cache"""
        try:
            # This would integrate with Redis or other cache systems
            logger.info(f"Clearing cache for service {service}")
            return True
            
        except Exception as e:
            logger.error(f"Cache clearing failed: {e}")
            return False
            
    async def _restart_database(self) -> bool:
        """Restart database service"""
        try:
            if self.docker_client:
                containers = self.docker_client.containers.list(
                    filters={'name': 'database'}
                )
                for container in containers:
                    container.restart()
                return len(containers) > 0
            else:
                logger.error("Docker not available for database restart")
                return False
                
        except Exception as e:
            logger.error(f"Database restart failed: {e}")
            return False

class RunbookManager:
    """Manages incident response runbooks"""
    
    def __init__(self):
        self.runbooks = {}
        self._load_default_runbooks()
        
    def _load_default_runbooks(self):
        """Load default runbooks"""
        # Service Down Runbook
        self.runbooks['service_down'] = Runbook(
            name='service_down',
            title='Service Down',
            description='Service is completely unavailable',
            severity=IncidentSeverity.CRITICAL,
            automated_steps=[
                {'action': AutomationAction.RESTART_SERVICE, 'wait_seconds': 30},
                {'action': AutomationAction.ROLLBACK_DEPLOYMENT, 'wait_seconds': 60},
                {'action': AutomationAction.SCALE_UP, 'wait_seconds': 30}
            ],
            manual_steps=[
                'Check service logs for error patterns',
                'Verify database connectivity',
                'Check external service dependencies',
                'Review recent deployments',
                'Escalate to engineering team if automation fails'
            ],
            escalation_contacts=['oncall-engineer@company.com'],
            estimated_resolution_time=15
        )
        
        # High Error Rate Runbook
        self.runbooks['high_error_rate'] = Runbook(
            name='high_error_rate',
            title='High Error Rate',
            description='Service experiencing elevated error rates',
            severity=IncidentSeverity.HIGH,
            automated_steps=[
                {'action': AutomationAction.SCALE_UP, 'wait_seconds': 60},
                {'action': AutomationAction.CLEAR_CACHE, 'wait_seconds': 30}
            ],
            manual_steps=[
                'Analyze error patterns in logs',
                'Check for resource constraints',
                'Review recent code changes',
                'Monitor error rate trends',
                'Consider rollback if errors persist'
            ],
            escalation_contacts=['dev-team@company.com'],
            estimated_resolution_time=30
        )
        
        # High Resource Usage Runbook
        self.runbooks['high_resource_usage'] = Runbook(
            name='high_resource_usage',
            title='High Resource Usage',
            description='Service consuming excessive CPU/Memory',
            severity=IncidentSeverity.MEDIUM,
            automated_steps=[
                {'action': AutomationAction.SCALE_UP, 'wait_seconds': 60}
            ],
            manual_steps=[
                'Identify resource-intensive processes',
                'Check for memory leaks',
                'Review database query performance',
                'Analyze traffic patterns',
                'Consider resource limit adjustments'
            ],
            escalation_contacts=['devops-team@company.com'],
            estimated_resolution_time=45
        )
        
    def get_runbook(self, incident_type: str) -> Optional[Runbook]:
        """Get runbook for incident type"""
        return self.runbooks.get(incident_type)
        
    def add_runbook(self, runbook: Runbook):
        """Add custom runbook"""
        self.runbooks[runbook.name] = runbook

class IncidentResponseOrchestrator:
    """Main incident response orchestrator"""
    
    def __init__(self):
        self.pagerduty = PagerDutyIntegration()
        self.slack = SlackIntegration()
        self.automation = AutomationEngine()
        self.runbook_manager = RunbookManager()
        self.active_incidents = {}
        self.automation_rules = []
        self.running = False
        
    def add_automation_rule(self, rule: AutomationRule):
        """Add automation rule"""
        self.automation_rules.append(rule)
        
    async def detect_incident(self, trigger_data: Dict[str, Any]) -> Optional[Incident]:
        """Detect and classify incident from trigger data"""
        try:
            # Extract incident information from trigger
            service = trigger_data.get('service', 'unknown')
            alert_name = trigger_data.get('alert_name', '')
            description = trigger_data.get('description', '')
            
            # Determine severity based on alert
            severity = self._classify_severity(alert_name, trigger_data)
            
            # Create incident
            incident = Incident(
                id=f"INC-{int(time.time())}",
                title=f"{alert_name} - {service}",
                description=description,
                severity=severity,
                status=IncidentStatus.DETECTED,
                service=service,
                start_time=datetime.now(),
                automation_attempts=[]
            )
            
            logger.info(f"Incident detected: {incident.id}")
            return incident
            
        except Exception as e:
            logger.error(f"Incident detection failed: {e}")
            return None
            
    def _classify_severity(self, alert_name: str, trigger_data: Dict[str, Any]) -> IncidentSeverity:
        """Classify incident severity"""
        critical_keywords = ['down', 'outage', 'unavailable', 'critical']
        high_keywords = ['high', 'elevated', 'degraded']
        
        alert_lower = alert_name.lower()
        
        if any(keyword in alert_lower for keyword in critical_keywords):
            return IncidentSeverity.CRITICAL
        elif any(keyword in alert_lower for keyword in high_keywords):
            return IncidentSeverity.HIGH
        else:
            return IncidentSeverity.MEDIUM
            
    async def handle_incident(self, incident: Incident) -> bool:
        """Handle incident with automation and escalation"""
        logger.info(f"Handling incident: {incident.id}")
        
        try:
            # Store incident
            self.active_incidents[incident.id] = incident
            
            # Create PagerDuty incident
            pagerduty_id = await self.pagerduty.create_incident(incident)
            if pagerduty_id:
                logger.info(f"PagerDuty incident created: {pagerduty_id}")
                
            # Send Slack notification
            await self.slack.send_incident_notification(incident)
            
            # Update status to investigating
            incident.status = IncidentStatus.INVESTIGATING
            
            # Execute automation
            success = await self._execute_automated_response(incident)
            
            if success:
                # Mark as resolved
                incident.status = IncidentStatus.RESOLVED
                incident.end_time = datetime.now()
                incident.resolution = "Resolved via automation"
                
                # Update PagerDuty
                if pagerduty_id:
                    await self.pagerduty.update_incident(
                        pagerduty_id, 'resolved', 'Resolved via automation'
                    )
                    
                # Send resolution notification
                await self.slack.send_incident_notification(incident, "resolved")
                
                logger.info(f"Incident resolved: {incident.id}")
                return True
            else:
                # Escalate to manual intervention
                await self._escalate_incident(incident)
                return False
                
        except Exception as e:
            logger.error(f"Incident handling failed: {e}")
            return False
            
    async def _execute_automated_response(self, incident: Incident) -> bool:
        """Execute automated response for incident"""
        try:
            incident.status = IncidentStatus.MITIGATING
            
            # Find matching automation rules
            matching_rules = self._find_matching_rules(incident)
            
            if not matching_rules:
                logger.info(f"No automation rules found for incident: {incident.id}")
                return False
                
            # Execute automation rules
            for rule in matching_rules:
                if await self._execute_rule(incident, rule):
                    logger.info(f"Automation rule '{rule.name}' succeeded")
                    return True
                else:
                    logger.warning(f"Automation rule '{rule.name}' failed")
                    
            # Try runbook automation
            runbook = self._find_matching_runbook(incident)
            if runbook:
                return await self._execute_runbook_automation(incident, runbook)
                
            return False
            
        except Exception as e:
            logger.error(f"Automated response execution failed: {e}")
            return False
            
    def _find_matching_rules(self, incident: Incident) -> List[AutomationRule]:
        """Find automation rules matching incident"""
        matching_rules = []
        
        for rule in self.automation_rules:
            # Simple condition matching (in production, this would be more sophisticated)
            if incident.service in rule.trigger_condition or incident.title in rule.trigger_condition:
                matching_rules.append(rule)
                
        return matching_rules
        
    def _find_matching_runbook(self, incident: Incident) -> Optional[Runbook]:
        """Find runbook matching incident"""
        # Simple mapping based on incident characteristics
        if 'down' in incident.title.lower():
            return self.runbook_manager.get_runbook('service_down')
        elif 'error' in incident.title.lower():
            return self.runbook_manager.get_runbook('high_error_rate')
        elif 'cpu' in incident.title.lower() or 'memory' in incident.title.lower():
            return self.runbook_manager.get_runbook('high_resource_usage')
            
        return None
        
    async def _execute_rule(self, incident: Incident, rule: AutomationRule) -> bool:
        """Execute specific automation rule"""
        try:
            for action in rule.actions:
                success = await self.automation.execute_automation(
                    action, incident.service
                )
                
                if success:
                    incident.automation_attempts.append(f"SUCCESS: {action.value}")
                    # Wait and verify if incident is resolved
                    await asyncio.sleep(30)
                    if await self._verify_incident_resolved(incident):
                        return True
                else:
                    incident.automation_attempts.append(f"FAILED: {action.value}")
                    
            return False
            
        except Exception as e:
            logger.error(f"Rule execution failed: {e}")
            return False
            
    async def _execute_runbook_automation(self, incident: Incident, runbook: Runbook) -> bool:
        """Execute automated steps from runbook"""
        try:
            logger.info(f"Executing runbook: {runbook.name}")
            
            for step in runbook.automated_steps:
                action = step['action']
                wait_seconds = step.get('wait_seconds', 30)
                
                success = await self.automation.execute_automation(
                    action, incident.service
                )
                
                if success:
                    incident.automation_attempts.append(f"SUCCESS: {action.value}")
                    await asyncio.sleep(wait_seconds)
                    
                    if await self._verify_incident_resolved(incident):
                        return True
                else:
                    incident.automation_attempts.append(f"FAILED: {action.value}")
                    
            return False
            
        except Exception as e:
            logger.error(f"Runbook automation failed: {e}")
            return False
            
    async def _verify_incident_resolved(self, incident: Incident) -> bool:
        """Verify if incident has been resolved"""
        try:
            # Check service health
            health_url = f"http://{incident.service}:8000/health"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(health_url, timeout=10) as response:
                    return response.status == 200
                    
        except Exception:
            return False
            
    async def _escalate_incident(self, incident: Incident):
        """Escalate incident to manual intervention"""
        logger.info(f"Escalating incident: {incident.id}")
        
        # Update status
        incident.status = IncidentStatus.INVESTIGATING
        
        # Send escalation notification
        await self.slack.send_incident_notification(incident, "escalated")
        
        # Find runbook and send manual steps
        runbook = self._find_matching_runbook(incident)
        if runbook:
            manual_steps = "\n".join([f"• {step}" for step in runbook.manual_steps])
            
            await self.slack.send_incident_notification(incident, f"manual_steps_required")
            
    async def start_monitoring(self):
        """Start incident response monitoring"""
        self.running = True
        logger.info("Incident response monitoring started")
        
        # This would typically listen to monitoring system alerts
        # For demo, we'll simulate incident detection
        
    async def stop_monitoring(self):
        """Stop incident response monitoring"""
        self.running = False
        logger.info("Incident response monitoring stopped")
        
    async def get_incident_status(self) -> Dict[str, Any]:
        """Get incident response system status"""
        active_count = len([i for i in self.active_incidents.values() 
                          if i.status != IncidentStatus.CLOSED])
        
        return {
            "monitoring_active": self.running,
            "active_incidents": active_count,
            "total_incidents": len(self.active_incidents),
            "automation_rules": len(self.automation_rules),
            "available_runbooks": len(self.runbook_manager.runbooks),
            "recent_incidents": list(self.active_incidents.values())[-5:]
        }

# Usage example
async def main():
    # Initialize incident response system
    incident_response = IncidentResponseOrchestrator()
    
    # Add automation rules
    incident_response.add_automation_rule(
        AutomationRule(
            name="service_down_restart",
            trigger_condition="service_down",
            actions=[AutomationAction.RESTART_SERVICE, AutomationAction.SCALE_UP],
            max_attempts=3
        )
    )
    
    # Start monitoring
    await incident_response.start_monitoring()
    
    # Simulate incident
    incident = await incident_response.detect_incident({
        'service': 'frontend',
        'alert_name': 'Service Down',
        'description': 'Frontend service is not responding'
    })
    
    if incident:
        await incident_response.handle_incident(incident)
        
    # Keep running
    try:
        while True:
            status = await incident_response.get_incident_status()
            logger.info(f"Active incidents: {status['active_incidents']}")
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await incident_response.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())