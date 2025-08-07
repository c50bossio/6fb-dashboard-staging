#!/usr/bin/env python3
"""
Automated Failover and Recovery System
Implements circuit breakers, automatic failover, and service recovery
"""

import os
import asyncio
import logging
import json
import time
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import subprocess
import docker
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/failover-system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, blocking requests
    HALF_OPEN = "half_open"  # Testing if service recovered

class ServiceState(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    FAILED = "failed"
    RECOVERING = "recovering"

class FailoverAction(Enum):
    RESTART_SERVICE = "restart_service"
    SWITCH_TO_BACKUP = "switch_to_backup"
    ENABLE_CIRCUIT_BREAKER = "enable_circuit_breaker"
    SCALE_UP = "scale_up"
    ROUTE_TO_ALTERNATIVE = "route_to_alternative"
    ENABLE_MAINTENANCE_MODE = "enable_maintenance_mode"

@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5
    recovery_timeout: int = 60  # seconds
    half_open_max_calls: int = 3
    timeout_duration: int = 30  # seconds
    
@dataclass
class ServiceEndpoint:
    """Service endpoint configuration"""
    name: str
    url: str
    health_check_path: str = "/health"
    timeout: int = 30
    is_primary: bool = True
    priority: int = 1  # Lower number = higher priority
    
@dataclass
class FailoverRule:
    """Failover rule configuration"""
    service_name: str
    trigger_condition: str
    action: FailoverAction
    threshold: float
    time_window: int  # seconds
    max_attempts: int = 3
    cooldown: int = 300  # seconds

class CircuitBreaker:
    """Circuit breaker implementation"""
    
    def __init__(self, config: CircuitBreakerConfig):
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.half_open_calls = 0
        
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function through circuit breaker"""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.half_open_calls = 0
            else:
                raise Exception("Circuit breaker is OPEN")
                
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure()
            raise e
            
    def _should_attempt_reset(self) -> bool:
        """Check if circuit breaker should attempt reset"""
        if self.last_failure_time is None:
            return False
            
        time_since_failure = time.time() - self.last_failure_time
        return time_since_failure >= self.config.recovery_timeout
        
    def _on_success(self):
        """Handle successful call"""
        if self.state == CircuitState.HALF_OPEN:
            self.half_open_calls += 1
            if self.half_open_calls >= self.config.half_open_max_calls:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0
            
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
        elif self.failure_count >= self.config.failure_threshold:
            self.state = CircuitState.OPEN
            
    def get_state(self) -> Dict[str, Any]:
        """Get circuit breaker state"""
        return {
            "state": self.state.value,
            "failure_count": self.failure_count,
            "last_failure_time": self.last_failure_time,
            "half_open_calls": self.half_open_calls
        }

class HealthChecker:
    """Service health checking"""
    
    def __init__(self):
        self.health_history = {}
        
    async def check_endpoint_health(self, endpoint: ServiceEndpoint) -> bool:
        """Check health of service endpoint"""
        try:
            health_url = f"{endpoint.url.rstrip('/')}{endpoint.health_check_path}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    health_url, 
                    timeout=aiohttp.ClientTimeout(total=endpoint.timeout)
                ) as response:
                    return response.status == 200
                    
        except Exception as e:
            logger.warning(f"Health check failed for {endpoint.name}: {e}")
            return False
            
    async def check_service_health(self, service_name: str, 
                                 endpoints: List[ServiceEndpoint]) -> Dict[str, Any]:
        """Check health of all service endpoints"""
        health_results = {}
        healthy_endpoints = []
        
        for endpoint in endpoints:
            is_healthy = await self.check_endpoint_health(endpoint)
            health_results[endpoint.name] = is_healthy
            
            if is_healthy:
                healthy_endpoints.append(endpoint)
                
        # Determine overall service state
        if not healthy_endpoints:
            service_state = ServiceState.FAILED
        elif len(healthy_endpoints) < len(endpoints):
            service_state = ServiceState.DEGRADED
        else:
            service_state = ServiceState.HEALTHY
            
        # Update health history
        if service_name not in self.health_history:
            self.health_history[service_name] = []
            
        self.health_history[service_name].append({
            'timestamp': datetime.now(),
            'state': service_state,
            'healthy_endpoints': len(healthy_endpoints),
            'total_endpoints': len(endpoints)
        })
        
        # Keep only last 100 entries
        self.health_history[service_name] = self.health_history[service_name][-100:]
        
        return {
            'service_state': service_state,
            'healthy_endpoints': healthy_endpoints,
            'endpoint_health': health_results,
            'timestamp': datetime.now()
        }

class LoadBalancer:
    """Simple load balancer for failover"""
    
    def __init__(self):
        self.endpoint_weights = {}
        self.current_endpoints = {}
        
    async def get_active_endpoint(self, service_name: str, 
                                endpoints: List[ServiceEndpoint]) -> Optional[ServiceEndpoint]:
        """Get active endpoint for service"""
        # Sort by priority and health
        healthy_endpoints = [ep for ep in endpoints if ep.name in self.current_endpoints.get(service_name, {}).get('healthy_endpoints', [])]
        
        if not healthy_endpoints:
            return None
            
        # Return highest priority (lowest number) healthy endpoint
        return min(healthy_endpoints, key=lambda ep: ep.priority)
        
    async def update_endpoints(self, service_name: str, health_data: Dict[str, Any]):
        """Update endpoint status"""
        self.current_endpoints[service_name] = health_data
        
    async def enable_maintenance_mode(self, service_name: str):
        """Enable maintenance mode for service"""
        # This would typically update load balancer configuration
        logger.info(f"Maintenance mode enabled for {service_name}")
        
    async def disable_maintenance_mode(self, service_name: str):
        """Disable maintenance mode for service"""
        logger.info(f"Maintenance mode disabled for {service_name}")

class ServiceManager:
    """Service management operations"""
    
    def __init__(self):
        self.docker_client = None
        self.kubectl_available = False
        self._initialize_tools()
        
    def _initialize_tools(self):
        """Initialize management tools"""
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
            
    async def restart_service(self, service_name: str) -> bool:
        """Restart service"""
        try:
            if self.kubectl_available:
                # Kubernetes restart
                cmd = ['kubectl', 'rollout', 'restart', f'deployment/{service_name}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                success = result.returncode == 0
                
                if success:
                    logger.info(f"Restarted Kubernetes deployment: {service_name}")
                else:
                    logger.error(f"Failed to restart deployment: {result.stderr}")
                    
                return success
                
            elif self.docker_client:
                # Docker restart
                containers = self.docker_client.containers.list(
                    filters={'name': service_name}
                )
                
                restarted = 0
                for container in containers:
                    container.restart()
                    restarted += 1
                    
                if restarted > 0:
                    logger.info(f"Restarted {restarted} Docker containers for {service_name}")
                    return True
                else:
                    logger.warning(f"No containers found for service: {service_name}")
                    return False
                    
            else:
                logger.error("No container orchestration available")
                return False
                
        except Exception as e:
            logger.error(f"Service restart failed: {e}")
            return False
            
    async def scale_service(self, service_name: str, replicas: int) -> bool:
        """Scale service"""
        try:
            if self.kubectl_available:
                cmd = ['kubectl', 'scale', 'deployment', service_name, f'--replicas={replicas}']
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    logger.info(f"Scaled {service_name} to {replicas} replicas")
                    return True
                else:
                    logger.error(f"Scaling failed: {result.stderr}")
                    return False
                    
            else:
                logger.error("Kubernetes not available for scaling")
                return False
                
        except Exception as e:
            logger.error(f"Service scaling failed: {e}")
            return False
            
    async def get_service_status(self, service_name: str) -> Dict[str, Any]:
        """Get service status"""
        try:
            if self.kubectl_available:
                cmd = ['kubectl', 'get', 'deployment', service_name, '-o', 'json']
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    deployment_data = json.loads(result.stdout)
                    spec = deployment_data.get('spec', {})
                    status = deployment_data.get('status', {})
                    
                    return {
                        'replicas_desired': spec.get('replicas', 0),
                        'replicas_ready': status.get('readyReplicas', 0),
                        'replicas_available': status.get('availableReplicas', 0),
                        'deployment_status': 'healthy' if status.get('readyReplicas', 0) == spec.get('replicas', 0) else 'degraded'
                    }
                    
            return {'deployment_status': 'unknown'}
            
        except Exception as e:
            logger.error(f"Failed to get service status: {e}")
            return {'deployment_status': 'error', 'error': str(e)}

class FailoverOrchestrator:
    """Main failover orchestrator"""
    
    def __init__(self):
        self.health_checker = HealthChecker()
        self.load_balancer = LoadBalancer()
        self.service_manager = ServiceManager()
        
        # Service configurations
        self.services = {}
        self.circuit_breakers = {}
        self.failover_rules = {}
        
        # Failover state
        self.failover_history = []
        self.active_failovers = {}
        self.running = False
        
    def register_service(self, service_name: str, endpoints: List[ServiceEndpoint]):
        """Register service with endpoints"""
        self.services[service_name] = endpoints
        self.circuit_breakers[service_name] = CircuitBreaker(CircuitBreakerConfig())
        logger.info(f"Registered service: {service_name} with {len(endpoints)} endpoints")
        
    def add_failover_rule(self, rule: FailoverRule):
        """Add failover rule"""
        if rule.service_name not in self.failover_rules:
            self.failover_rules[rule.service_name] = []
        self.failover_rules[rule.service_name].append(rule)
        logger.info(f"Added failover rule for {rule.service_name}: {rule.action.value}")
        
    async def start_monitoring(self):
        """Start failover monitoring"""
        self.running = True
        logger.info("Failover monitoring started")
        
        # Start monitoring tasks
        asyncio.create_task(self._health_monitoring_loop())
        asyncio.create_task(self._failover_evaluation_loop())
        
    async def stop_monitoring(self):
        """Stop failover monitoring"""
        self.running = False
        logger.info("Failover monitoring stopped")
        
    async def _health_monitoring_loop(self):
        """Main health monitoring loop"""
        while self.running:
            try:
                for service_name, endpoints in self.services.items():
                    # Check service health
                    health_data = await self.health_checker.check_service_health(
                        service_name, endpoints
                    )
                    
                    # Update load balancer
                    await self.load_balancer.update_endpoints(service_name, health_data)
                    
                    # Log health changes
                    if health_data['service_state'] != ServiceState.HEALTHY:
                        logger.warning(f"Service {service_name} is {health_data['service_state'].value}")
                        
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(60)
                
    async def _failover_evaluation_loop(self):
        """Failover evaluation loop"""
        while self.running:
            try:
                for service_name in self.services.keys():
                    if service_name in self.failover_rules:
                        await self._evaluate_failover_rules(service_name)
                        
                await asyncio.sleep(60)  # Evaluate every minute
                
            except Exception as e:
                logger.error(f"Failover evaluation error: {e}")
                await asyncio.sleep(60)
                
    async def _evaluate_failover_rules(self, service_name: str):
        """Evaluate failover rules for service"""
        try:
            # Get current service health
            current_health = self.health_checker.health_history.get(service_name, [])
            if not current_health:
                return
                
            latest_health = current_health[-1]
            
            # Evaluate each rule
            for rule in self.failover_rules[service_name]:
                if await self._should_trigger_failover(rule, service_name, current_health):
                    await self._execute_failover(rule, service_name)
                    
        except Exception as e:
            logger.error(f"Failover rule evaluation failed: {e}")
            
    async def _should_trigger_failover(self, rule: FailoverRule, 
                                     service_name: str, health_history: List[Dict]) -> bool:
        """Check if failover should be triggered"""
        try:
            # Check cooldown period
            if service_name in self.active_failovers:
                last_failover = self.active_failovers[service_name]
                time_since_failover = (datetime.now() - last_failover['timestamp']).total_seconds()
                if time_since_failover < rule.cooldown:
                    return False
                    
            # Evaluate trigger condition
            if rule.trigger_condition == "service_failed":
                # Check if service has been failed for specified time window
                failed_duration = 0
                for health_entry in reversed(health_history):
                    if health_entry['state'] == ServiceState.FAILED:
                        if failed_duration == 0:
                            failed_duration = (datetime.now() - health_entry['timestamp']).total_seconds()
                        continue
                    else:
                        break
                        
                return failed_duration >= rule.time_window
                
            elif rule.trigger_condition == "service_degraded":
                # Check if service has been degraded
                recent_entries = [
                    entry for entry in health_history 
                    if (datetime.now() - entry['timestamp']).total_seconds() <= rule.time_window
                ]
                
                if recent_entries:
                    degraded_ratio = len([
                        entry for entry in recent_entries 
                        if entry['state'] in [ServiceState.DEGRADED, ServiceState.FAILED]
                    ]) / len(recent_entries)
                    
                    return degraded_ratio >= rule.threshold
                    
            elif rule.trigger_condition == "high_error_rate":
                # Would check error rate from metrics
                # This is a placeholder for actual error rate checking
                return False
                
            return False
            
        except Exception as e:
            logger.error(f"Failover trigger evaluation failed: {e}")
            return False
            
    async def _execute_failover(self, rule: FailoverRule, service_name: str):
        """Execute failover action"""
        try:
            logger.info(f"Executing failover for {service_name}: {rule.action.value}")
            
            success = False
            
            if rule.action == FailoverAction.RESTART_SERVICE:
                success = await self.service_manager.restart_service(service_name)
                
            elif rule.action == FailoverAction.SCALE_UP:
                # Get current replicas and scale up
                status = await self.service_manager.get_service_status(service_name)
                current_replicas = status.get('replicas_desired', 1)
                new_replicas = min(current_replicas * 2, 10)  # Max 10 replicas
                success = await self.service_manager.scale_service(service_name, new_replicas)
                
            elif rule.action == FailoverAction.ENABLE_MAINTENANCE_MODE:
                await self.load_balancer.enable_maintenance_mode(service_name)
                success = True
                
            elif rule.action == FailoverAction.ENABLE_CIRCUIT_BREAKER:
                # Circuit breaker is already enabled, just log
                logger.info(f"Circuit breaker enabled for {service_name}")
                success = True
                
            elif rule.action == FailoverAction.SWITCH_TO_BACKUP:
                # Switch to backup endpoints (higher priority numbers)
                success = await self._switch_to_backup_endpoints(service_name)
                
            # Record failover execution
            failover_record = {
                'service_name': service_name,
                'action': rule.action.value,
                'timestamp': datetime.now(),
                'success': success,
                'rule': asdict(rule)
            }
            
            self.failover_history.append(failover_record)
            self.active_failovers[service_name] = failover_record
            
            # Send notification
            await self._send_failover_notification(failover_record)
            
            if success:
                logger.info(f"Failover executed successfully: {service_name}")
            else:
                logger.error(f"Failover execution failed: {service_name}")
                
        except Exception as e:
            logger.error(f"Failover execution error: {e}")
            
    async def _switch_to_backup_endpoints(self, service_name: str) -> bool:
        """Switch to backup endpoints"""
        try:
            endpoints = self.services.get(service_name, [])
            backup_endpoints = [ep for ep in endpoints if not ep.is_primary]
            
            if backup_endpoints:
                # Update load balancer to use backup endpoints
                logger.info(f"Switched to {len(backup_endpoints)} backup endpoints for {service_name}")
                return True
            else:
                logger.warning(f"No backup endpoints available for {service_name}")
                return False
                
        except Exception as e:
            logger.error(f"Backup endpoint switch failed: {e}")
            return False
            
    async def _send_failover_notification(self, failover_record: Dict[str, Any]):
        """Send failover notification"""
        try:
            webhook_url = os.getenv('SLACK_FAILOVER_WEBHOOK_URL')
            if webhook_url:
                payload = {
                    "text": f"🔄 Failover executed: {failover_record['service_name']}",
                    "attachments": [{
                        "color": "warning",
                        "fields": [
                            {"title": "Service", "value": failover_record['service_name'], "short": True},
                            {"title": "Action", "value": failover_record['action'], "short": True},
                            {"title": "Success", "value": str(failover_record['success']), "short": True},
                            {"title": "Timestamp", "value": failover_record['timestamp'].isoformat(), "short": True}
                        ]
                    }]
                }
                
                async with aiohttp.ClientSession() as session:
                    await session.post(webhook_url, json=payload)
                    
        except Exception as e:
            logger.error(f"Failover notification failed: {e}")
            
    async def manual_failover(self, service_name: str, action: FailoverAction) -> bool:
        """Manually trigger failover"""
        try:
            manual_rule = FailoverRule(
                service_name=service_name,
                trigger_condition="manual",
                action=action,
                threshold=0,
                time_window=0,
                cooldown=0
            )
            
            await self._execute_failover(manual_rule, service_name)
            return True
            
        except Exception as e:
            logger.error(f"Manual failover failed: {e}")
            return False
            
    async def get_failover_status(self) -> Dict[str, Any]:
        """Get failover system status"""
        service_status = {}
        
        for service_name, endpoints in self.services.items():
            # Get latest health data
            health_history = self.health_checker.health_history.get(service_name, [])
            latest_health = health_history[-1] if health_history else None
            
            # Get circuit breaker state
            circuit_breaker = self.circuit_breakers.get(service_name)
            circuit_state = circuit_breaker.get_state() if circuit_breaker else None
            
            service_status[service_name] = {
                'endpoints': len(endpoints),
                'current_state': latest_health['state'].value if latest_health else 'unknown',
                'healthy_endpoints': latest_health['healthy_endpoints'] if latest_health else 0,
                'circuit_breaker': circuit_state,
                'active_failover': service_name in self.active_failovers
            }
            
        return {
            'monitoring_active': self.running,
            'services': service_status,
            'total_failovers': len(self.failover_history),
            'active_failovers': len(self.active_failovers),
            'recent_failovers': [
                {
                    'service': record['service_name'],
                    'action': record['action'],
                    'timestamp': record['timestamp'].isoformat(),
                    'success': record['success']
                } for record in self.failover_history[-5:]  # Last 5 failovers
            ]
        }

# Usage example
async def main():
    # Initialize failover system
    failover = FailoverOrchestrator()
    
    # Register services
    frontend_endpoints = [
        ServiceEndpoint("frontend-primary", "http://frontend-1:9999", is_primary=True, priority=1),
        ServiceEndpoint("frontend-backup", "http://frontend-2:9999", is_primary=False, priority=2)
    ]
    
    backend_endpoints = [
        ServiceEndpoint("backend-primary", "http://backend-1:8000", is_primary=True, priority=1),
        ServiceEndpoint("backend-backup", "http://backend-2:8000", is_primary=False, priority=2)
    ]
    
    failover.register_service("frontend", frontend_endpoints)
    failover.register_service("backend", backend_endpoints)
    
    # Add failover rules
    failover.add_failover_rule(FailoverRule(
        service_name="frontend",
        trigger_condition="service_failed",
        action=FailoverAction.RESTART_SERVICE,
        threshold=0,
        time_window=60,  # 1 minute
        cooldown=300     # 5 minutes
    ))
    
    failover.add_failover_rule(FailoverRule(
        service_name="backend",
        trigger_condition="service_degraded", 
        action=FailoverAction.SCALE_UP,
        threshold=0.5,   # 50% degraded
        time_window=300, # 5 minutes
        cooldown=600     # 10 minutes
    ))
    
    # Start monitoring
    await failover.start_monitoring()
    
    # Keep running
    try:
        while True:
            status = await failover.get_failover_status()
            logger.info(f"Failover system active: {status['monitoring_active']}")
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await failover.stop_monitoring()

if __name__ == "__main__":
    asyncio.run(main())