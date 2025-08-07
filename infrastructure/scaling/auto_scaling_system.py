#!/usr/bin/env python3
"""
Auto-Scaling and Resource Optimization System
Implements intelligent auto-scaling based on metrics and cost optimization
"""

import os
import asyncio
import logging
import json
import time
import psutil
import docker
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import subprocess
import aiohttp
import numpy as np
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/auto-scaling.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ScalingDirection(Enum):
    UP = "up"
    DOWN = "down"
    MAINTAIN = "maintain"

class ResourceType(Enum):
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"
    NETWORK = "network"

@dataclass
class ScalingMetrics:
    """Scaling decision metrics"""
    cpu_utilization: float
    memory_utilization: float
    request_rate: float
    response_time: float
    error_rate: float
    queue_depth: int
    active_connections: int
    timestamp: datetime

@dataclass
class ScalingRule:
    """Auto-scaling rule configuration"""
    name: str
    metric_name: str
    threshold_up: float
    threshold_down: float
    min_replicas: int
    max_replicas: int
    scale_up_cooldown: int  # seconds
    scale_down_cooldown: int  # seconds
    scale_step: int = 1
    evaluation_periods: int = 3
    
@dataclass
class ResourceLimit:
    """Resource limits and requests"""
    cpu_request: str
    cpu_limit: str
    memory_request: str
    memory_limit: str
    
@dataclass
class CostMetrics:
    """Cost tracking metrics"""
    hourly_cost: float
    daily_cost: float
    monthly_projection: float
    cost_per_request: float
    efficiency_score: float
    timestamp: datetime

class MetricsCollector:
    """Collect scaling and performance metrics"""
    
    def __init__(self):
        self.prometheus_url = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090')
        self.docker_client = None
        self._initialize_docker()
        
    def _initialize_docker(self):
        """Initialize Docker client"""
        try:
            import docker
            self.docker_client = docker.from_env()
        except Exception as e:
            logger.warning(f"Docker client not available: {e}")
            
    async def collect_service_metrics(self, service_name: str) -> ScalingMetrics:
        """Collect metrics for a specific service"""
        try:
            # Get system metrics
            cpu_util = await self._get_cpu_utilization(service_name)
            memory_util = await self._get_memory_utilization(service_name)
            
            # Get application metrics from Prometheus
            request_rate = await self._get_prometheus_metric(
                f'rate(http_requests_total{{service="{service_name}"}}[5m])'
            )
            
            response_time = await self._get_prometheus_metric(
                f'histogram_quantile(0.95, http_request_duration_seconds_bucket{{service="{service_name}"}})'
            )
            
            error_rate = await self._get_prometheus_metric(
                f'rate(http_requests_total{{service="{service_name}",status=~"5.."}}[5m]) / '
                f'rate(http_requests_total{{service="{service_name}"}}[5m])'
            )
            
            # Get queue and connection metrics
            queue_depth = await self._get_prometheus_metric(
                f'queue_depth{{service="{service_name}"}}'
            )
            
            active_connections = await self._get_prometheus_metric(
                f'active_connections{{service="{service_name}"}}'
            )
            
            return ScalingMetrics(
                cpu_utilization=cpu_util,
                memory_utilization=memory_util,
                request_rate=request_rate,
                response_time=response_time,
                error_rate=error_rate,
                queue_depth=int(queue_depth),
                active_connections=int(active_connections),
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Failed to collect metrics for {service_name}: {e}")
            return ScalingMetrics(
                cpu_utilization=0.0,
                memory_utilization=0.0,
                request_rate=0.0,
                response_time=0.0,
                error_rate=0.0,
                queue_depth=0,
                active_connections=0,
                timestamp=datetime.now()
            )
            
    async def _get_cpu_utilization(self, service_name: str) -> float:
        """Get CPU utilization for service"""
        try:
            if self.docker_client:
                containers = self.docker_client.containers.list(
                    filters={'name': service_name}
                )
                if containers:
                    container = containers[0]
                    stats = container.stats(stream=False)
                    
                    # Calculate CPU percentage
                    cpu_delta = stats['cpu_stats']['cpu_usage']['total_usage'] - \
                               stats['precpu_stats']['cpu_usage']['total_usage']
                    system_delta = stats['cpu_stats']['system_cpu_usage'] - \
                                  stats['precpu_stats']['system_cpu_usage']
                    
                    if system_delta > 0:
                        cpu_percent = (cpu_delta / system_delta) * \
                                     len(stats['cpu_stats']['cpu_usage']['percpu_usage']) * 100
                        return min(cpu_percent, 100.0)
                        
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to get CPU utilization: {e}")
            return 0.0
            
    async def _get_memory_utilization(self, service_name: str) -> float:
        """Get memory utilization for service"""
        try:
            if self.docker_client:
                containers = self.docker_client.containers.list(
                    filters={'name': service_name}
                )
                if containers:
                    container = containers[0]
                    stats = container.stats(stream=False)
                    
                    # Calculate memory percentage
                    memory_usage = stats['memory_stats']['usage']
                    memory_limit = stats['memory_stats']['limit']
                    
                    if memory_limit > 0:
                        memory_percent = (memory_usage / memory_limit) * 100
                        return min(memory_percent, 100.0)
                        
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to get memory utilization: {e}")
            return 0.0
            
    async def _get_prometheus_metric(self, query: str) -> float:
        """Get metric value from Prometheus"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.prometheus_url}/api/v1/query",
                    params={'query': query}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['data']['result']:
                            return float(data['data']['result'][0]['value'][1])
                            
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to query Prometheus: {e}")
            return 0.0

class PredictiveScaler:
    """Predictive scaling based on historical patterns"""
    
    def __init__(self):
        self.metrics_history = {}
        self.prediction_window = 300  # 5 minutes
        
    def add_metrics(self, service_name: str, metrics: ScalingMetrics):
        """Add metrics to history"""
        if service_name not in self.metrics_history:
            self.metrics_history[service_name] = []
            
        self.metrics_history[service_name].append(metrics)
        
        # Keep only last 24 hours of data
        cutoff_time = datetime.now() - timedelta(hours=24)
        self.metrics_history[service_name] = [
            m for m in self.metrics_history[service_name] 
            if m.timestamp > cutoff_time
        ]
        
    def predict_load(self, service_name: str, minutes_ahead: int = 5) -> Tuple[float, float]:
        """Predict CPU and memory load for the next N minutes"""
        try:
            if service_name not in self.metrics_history or \
               len(self.metrics_history[service_name]) < 10:
                return 0.0, 0.0
                
            history = self.metrics_history[service_name]
            
            # Extract time series data
            cpu_values = [m.cpu_utilization for m in history[-60:]]  # Last hour
            memory_values = [m.memory_utilization for m in history[-60:]]
            
            # Simple linear prediction (in production, use more sophisticated models)
            cpu_trend = np.polyfit(range(len(cpu_values)), cpu_values, 1)
            memory_trend = np.polyfit(range(len(memory_values)), memory_values, 1)
            
            # Predict future values
            future_cpu = cpu_trend[0] * (len(cpu_values) + minutes_ahead) + cpu_trend[1]
            future_memory = memory_trend[0] * (len(memory_values) + minutes_ahead) + memory_trend[1]
            
            return max(0.0, min(100.0, future_cpu)), max(0.0, min(100.0, future_memory))
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            return 0.0, 0.0
            
    def detect_patterns(self, service_name: str) -> Dict[str, Any]:
        """Detect load patterns for better scaling decisions"""
        try:
            if service_name not in self.metrics_history:
                return {}
                
            history = self.metrics_history[service_name]
            
            # Group by hour of day
            hourly_patterns = {}
            for metric in history:
                hour = metric.timestamp.hour
                if hour not in hourly_patterns:
                    hourly_patterns[hour] = []
                hourly_patterns[hour].append(metric.cpu_utilization)
                
            # Calculate average load by hour
            avg_by_hour = {
                hour: np.mean(values) 
                for hour, values in hourly_patterns.items() 
                if len(values) > 0
            }
            
            return {
                'hourly_averages': avg_by_hour,
                'peak_hours': sorted(avg_by_hour.items(), key=lambda x: x[1], reverse=True)[:3],
                'low_hours': sorted(avg_by_hour.items(), key=lambda x: x[1])[:3]
            }
            
        except Exception as e:
            logger.error(f"Pattern detection failed: {e}")
            return {}

class CostOptimizer:
    """Cost optimization and tracking"""
    
    def __init__(self):
        self.cost_per_hour = {
            'cpu': 0.05,     # $0.05 per CPU hour
            'memory': 0.01,  # $0.01 per GB memory hour
            'storage': 0.1,  # $0.10 per GB storage per month
            'network': 0.12  # $0.12 per GB network transfer
        }
        
    async def calculate_service_cost(self, service_name: str, replicas: int, 
                                   resource_limits: ResourceLimit) -> CostMetrics:
        """Calculate current service costs"""
        try:
            # Parse resource limits
            cpu_cores = self._parse_cpu_limit(resource_limits.cpu_limit)
            memory_gb = self._parse_memory_limit(resource_limits.memory_limit)
            
            # Calculate hourly cost
            hourly_cpu_cost = cpu_cores * replicas * self.cost_per_hour['cpu']
            hourly_memory_cost = memory_gb * replicas * self.cost_per_hour['memory']
            hourly_cost = hourly_cpu_cost + hourly_memory_cost
            
            # Project daily and monthly costs
            daily_cost = hourly_cost * 24
            monthly_cost = daily_cost * 30
            
            # Get request rate for cost per request
            request_rate = await self._get_request_rate(service_name)
            cost_per_request = hourly_cost / max(request_rate * 3600, 1)  # per hour
            
            # Calculate efficiency score (requests per dollar)
            efficiency_score = (request_rate * 3600) / max(hourly_cost, 0.01)
            
            return CostMetrics(
                hourly_cost=hourly_cost,
                daily_cost=daily_cost,
                monthly_projection=monthly_cost,
                cost_per_request=cost_per_request,
                efficiency_score=efficiency_score,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Cost calculation failed: {e}")
            return CostMetrics(0, 0, 0, 0, 0, datetime.now())
            
    def _parse_cpu_limit(self, cpu_limit: str) -> float:
        """Parse CPU limit string to cores"""
        try:
            if cpu_limit.endswith('m'):
                return float(cpu_limit[:-1]) / 1000
            else:
                return float(cpu_limit)
        except:
            return 1.0
            
    def _parse_memory_limit(self, memory_limit: str) -> float:
        """Parse memory limit string to GB"""
        try:
            if memory_limit.endswith('Gi'):
                return float(memory_limit[:-2])
            elif memory_limit.endswith('Mi'):
                return float(memory_limit[:-2]) / 1024
            elif memory_limit.endswith('G'):
                return float(memory_limit[:-1])
            elif memory_limit.endswith('M'):
                return float(memory_limit[:-1]) / 1000
            else:
                return float(memory_limit) / (1024**3)  # Assume bytes
        except:
            return 1.0
            
    async def _get_request_rate(self, service_name: str) -> float:
        """Get current request rate"""
        try:
            prometheus_url = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090')
            query = f'rate(http_requests_total{{service="{service_name}"}}[5m])'
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{prometheus_url}/api/v1/query",
                    params={'query': query}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        if data['data']['result']:
                            return float(data['data']['result'][0]['value'][1])
                            
            return 0.0
            
        except Exception:
            return 0.0
            
    def recommend_optimization(self, current_metrics: ScalingMetrics, 
                             current_cost: CostMetrics) -> List[str]:
        """Recommend cost optimizations"""
        recommendations = []
        
        # Check for over-provisioning
        if current_metrics.cpu_utilization < 30 and current_metrics.memory_utilization < 30:
            recommendations.append("Consider reducing resource limits - low utilization detected")
            
        # Check for inefficient request handling
        if current_cost.cost_per_request > 0.01:  # $0.01 per request threshold
            recommendations.append("High cost per request - optimize application performance")
            
        # Check efficiency score
        if current_cost.efficiency_score < 100:  # Less than 100 requests per dollar per hour
            recommendations.append("Low efficiency score - consider scaling down or optimizing")
            
        # Check for high response times
        if current_metrics.response_time > 1000:  # 1 second
            recommendations.append("High response time - consider scaling up or optimizing code")
            
        return recommendations

class KubernetesScaler:
    """Kubernetes-specific scaling operations"""
    
    def __init__(self):
        self.kubectl_available = self._check_kubectl()
        
    def _check_kubectl(self) -> bool:
        """Check if kubectl is available"""
        try:
            subprocess.run(['kubectl', 'version', '--client'], 
                         capture_output=True, check=True)
            return True
        except:
            return False
            
    async def get_current_replicas(self, service_name: str) -> int:
        """Get current number of replicas"""
        try:
            if not self.kubectl_available:
                return 1
                
            cmd = ['kubectl', 'get', 'deployment', service_name, 
                   '-o', 'jsonpath={.spec.replicas}']
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                return int(result.stdout.strip())
            else:
                return 1
                
        except Exception as e:
            logger.error(f"Failed to get current replicas: {e}")
            return 1
            
    async def scale_deployment(self, service_name: str, replicas: int) -> bool:
        """Scale Kubernetes deployment"""
        try:
            if not self.kubectl_available:
                logger.warning("kubectl not available for scaling")
                return False
                
            cmd = ['kubectl', 'scale', 'deployment', service_name, 
                   f'--replicas={replicas}']
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info(f"Scaled {service_name} to {replicas} replicas")
                return True
            else:
                logger.error(f"Scaling failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Scaling operation failed: {e}")
            return False
            
    async def update_resource_limits(self, service_name: str, 
                                   resource_limits: ResourceLimit) -> bool:
        """Update resource limits for deployment"""
        try:
            if not self.kubectl_available:
                return False
                
            # Create patch for resource limits
            patch = {
                "spec": {
                    "template": {
                        "spec": {
                            "containers": [{
                                "name": service_name,
                                "resources": {
                                    "requests": {
                                        "cpu": resource_limits.cpu_request,
                                        "memory": resource_limits.memory_request
                                    },
                                    "limits": {
                                        "cpu": resource_limits.cpu_limit,
                                        "memory": resource_limits.memory_limit
                                    }
                                }
                            }]
                        }
                    }
                }
            }
            
            # Apply patch
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(patch, f)
                patch_file = f.name
                
            cmd = ['kubectl', 'patch', 'deployment', service_name, 
                   '--patch', f'@{patch_file}']
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            os.unlink(patch_file)
            
            return result.returncode == 0
            
        except Exception as e:
            logger.error(f"Resource limit update failed: {e}")
            return False

class AutoScalingOrchestrator:
    """Main auto-scaling orchestrator"""
    
    def __init__(self):
        self.metrics_collector = MetricsCollector()
        self.predictive_scaler = PredictiveScaler()
        self.cost_optimizer = CostOptimizer()
        self.k8s_scaler = KubernetesScaler()
        
        self.scaling_rules = {}
        self.last_scaling_action = {}
        self.running = False
        
    def add_scaling_rule(self, service_name: str, rule: ScalingRule):
        """Add scaling rule for service"""
        if service_name not in self.scaling_rules:
            self.scaling_rules[service_name] = []
        self.scaling_rules[service_name].append(rule)
        
    async def evaluate_scaling_decision(self, service_name: str) -> Tuple[ScalingDirection, int]:
        """Evaluate scaling decision for service"""
        try:
            # Collect current metrics
            metrics = await self.metrics_collector.collect_service_metrics(service_name)
            
            # Add to prediction history
            self.predictive_scaler.add_metrics(service_name, metrics)
            
            # Get predictive insights
            predicted_cpu, predicted_memory = self.predictive_scaler.predict_load(service_name)
            
            # Get current replica count
            current_replicas = await self.k8s_scaler.get_current_replicas(service_name)
            
            # Evaluate scaling rules
            scaling_decision = ScalingDirection.MAINTAIN
            target_replicas = current_replicas
            
            if service_name in self.scaling_rules:
                for rule in self.scaling_rules[service_name]:
                    decision, replicas = await self._evaluate_rule(
                        rule, metrics, predicted_cpu, predicted_memory, current_replicas
                    )
                    
                    # Take the most aggressive scaling decision
                    if decision == ScalingDirection.UP and scaling_decision != ScalingDirection.UP:
                        scaling_decision = decision
                        target_replicas = replicas
                    elif decision == ScalingDirection.DOWN and scaling_decision == ScalingDirection.MAINTAIN:
                        scaling_decision = decision
                        target_replicas = replicas
                        
            return scaling_decision, target_replicas
            
        except Exception as e:
            logger.error(f"Scaling evaluation failed: {e}")
            return ScalingDirection.MAINTAIN, 1
            
    async def _evaluate_rule(self, rule: ScalingRule, metrics: ScalingMetrics,
                           predicted_cpu: float, predicted_memory: float,
                           current_replicas: int) -> Tuple[ScalingDirection, int]:
        """Evaluate individual scaling rule"""
        try:
            # Select metric value based on rule
            if rule.metric_name == 'cpu':
                metric_value = max(metrics.cpu_utilization, predicted_cpu)
            elif rule.metric_name == 'memory':
                metric_value = max(metrics.memory_utilization, predicted_memory)
            elif rule.metric_name == 'response_time':
                metric_value = metrics.response_time
            elif rule.metric_name == 'error_rate':
                metric_value = metrics.error_rate * 100  # Convert to percentage
            elif rule.metric_name == 'request_rate':
                metric_value = metrics.request_rate
            else:
                return ScalingDirection.MAINTAIN, current_replicas
                
            # Check scaling conditions
            if metric_value > rule.threshold_up:
                # Scale up
                new_replicas = min(current_replicas + rule.scale_step, rule.max_replicas)
                return ScalingDirection.UP, new_replicas
            elif metric_value < rule.threshold_down:
                # Scale down
                new_replicas = max(current_replicas - rule.scale_step, rule.min_replicas)
                return ScalingDirection.DOWN, new_replicas
            else:
                return ScalingDirection.MAINTAIN, current_replicas
                
        except Exception as e:
            logger.error(f"Rule evaluation failed: {e}")
            return ScalingDirection.MAINTAIN, current_replicas
            
    async def execute_scaling(self, service_name: str, 
                            direction: ScalingDirection, target_replicas: int) -> bool:
        """Execute scaling decision"""
        try:
            # Check cooldown period
            if not self._check_cooldown(service_name, direction):
                logger.info(f"Scaling {service_name} skipped due to cooldown")
                return False
                
            # Execute scaling
            success = await self.k8s_scaler.scale_deployment(service_name, target_replicas)
            
            if success:
                # Record scaling action
                self.last_scaling_action[service_name] = {
                    'direction': direction,
                    'timestamp': datetime.now(),
                    'replicas': target_replicas
                }
                
                logger.info(f"Successfully scaled {service_name} to {target_replicas} replicas")
                
                # Send notification
                await self._send_scaling_notification(service_name, direction, target_replicas)
                
            return success
            
        except Exception as e:
            logger.error(f"Scaling execution failed: {e}")
            return False
            
    def _check_cooldown(self, service_name: str, direction: ScalingDirection) -> bool:
        """Check if scaling cooldown period has passed"""
        try:
            if service_name not in self.last_scaling_action:
                return True
                
            last_action = self.last_scaling_action[service_name]
            time_since_last = (datetime.now() - last_action['timestamp']).total_seconds()
            
            # Different cooldown periods for scale up vs scale down
            if direction == ScalingDirection.UP:
                cooldown = 300  # 5 minutes for scale up
            else:
                cooldown = 600  # 10 minutes for scale down
                
            return time_since_last > cooldown
            
        except Exception:
            return True
            
    async def _send_scaling_notification(self, service_name: str, 
                                       direction: ScalingDirection, replicas: int):
        """Send scaling notification"""
        try:
            # Send to Slack or other notification system
            webhook_url = os.getenv('SLACK_SCALING_WEBHOOK_URL')
            if webhook_url:
                payload = {
                    "text": f"🔧 Auto-scaling action: {service_name}",
                    "attachments": [{
                        "color": "good" if direction == ScalingDirection.UP else "warning",
                        "fields": [
                            {"title": "Service", "value": service_name, "short": True},
                            {"title": "Action", "value": f"Scaled {direction.value}", "short": True},
                            {"title": "Replicas", "value": str(replicas), "short": True}
                        ]
                    }]
                }
                
                async with aiohttp.ClientSession() as session:
                    await session.post(webhook_url, json=payload)
                    
        except Exception as e:
            logger.error(f"Failed to send scaling notification: {e}")
            
    async def start_auto_scaling(self):
        """Start auto-scaling loop"""
        self.running = True
        logger.info("Auto-scaling started")
        
        # Start scaling loop
        asyncio.create_task(self._scaling_loop())
        
        # Start cost monitoring
        asyncio.create_task(self._cost_monitoring_loop())
        
    async def stop_auto_scaling(self):
        """Stop auto-scaling"""
        self.running = False
        logger.info("Auto-scaling stopped")
        
    async def _scaling_loop(self):
        """Main scaling evaluation loop"""
        while self.running:
            try:
                for service_name in self.scaling_rules.keys():
                    # Evaluate scaling decision
                    direction, target_replicas = await self.evaluate_scaling_decision(service_name)
                    
                    # Execute scaling if needed
                    if direction != ScalingDirection.MAINTAIN:
                        await self.execute_scaling(service_name, direction, target_replicas)
                        
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"Scaling loop error: {e}")
                await asyncio.sleep(60)
                
    async def _cost_monitoring_loop(self):
        """Cost monitoring and optimization loop"""
        while self.running:
            try:
                for service_name in self.scaling_rules.keys():
                    # Get current metrics and costs
                    metrics = await self.metrics_collector.collect_service_metrics(service_name)
                    replicas = await self.k8s_scaler.get_current_replicas(service_name)
                    
                    # Assume default resource limits (would be retrieved from K8s in production)
                    resource_limits = ResourceLimit(
                        cpu_request="100m",
                        cpu_limit="500m",
                        memory_request="128Mi",
                        memory_limit="512Mi"
                    )
                    
                    cost_metrics = await self.cost_optimizer.calculate_service_cost(
                        service_name, replicas, resource_limits
                    )
                    
                    # Get optimization recommendations
                    recommendations = self.cost_optimizer.recommend_optimization(
                        metrics, cost_metrics
                    )
                    
                    if recommendations:
                        logger.info(f"Cost optimization recommendations for {service_name}: {recommendations}")
                        
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Cost monitoring loop error: {e}")
                await asyncio.sleep(300)
                
    async def get_scaling_status(self) -> Dict[str, Any]:
        """Get auto-scaling system status"""
        status = {
            "auto_scaling_active": self.running,
            "services": {},
            "total_scaling_rules": sum(len(rules) for rules in self.scaling_rules.values()),
            "recent_scaling_actions": []
        }
        
        # Get status for each service
        for service_name in self.scaling_rules.keys():
            try:
                current_replicas = await self.k8s_scaler.get_current_replicas(service_name)
                metrics = await self.metrics_collector.collect_service_metrics(service_name)
                
                status["services"][service_name] = {
                    "current_replicas": current_replicas,
                    "cpu_utilization": metrics.cpu_utilization,
                    "memory_utilization": metrics.memory_utilization,
                    "response_time": metrics.response_time,
                    "scaling_rules": len(self.scaling_rules[service_name])
                }
                
            except Exception as e:
                logger.error(f"Failed to get status for {service_name}: {e}")
                
        # Get recent scaling actions
        for service_name, action in self.last_scaling_action.items():
            if (datetime.now() - action['timestamp']).total_seconds() < 3600:  # Last hour
                status["recent_scaling_actions"].append({
                    "service": service_name,
                    "direction": action['direction'].value,
                    "replicas": action['replicas'],
                    "timestamp": action['timestamp'].isoformat()
                })
                
        return status

# Usage example
async def main():
    # Initialize auto-scaling system
    auto_scaler = AutoScalingOrchestrator()
    
    # Add scaling rules
    auto_scaler.add_scaling_rule("frontend", ScalingRule(
        name="frontend_cpu_scaling",
        metric_name="cpu",
        threshold_up=70.0,
        threshold_down=30.0,
        min_replicas=2,
        max_replicas=10,
        scale_up_cooldown=300,
        scale_down_cooldown=600
    ))
    
    auto_scaler.add_scaling_rule("backend", ScalingRule(
        name="backend_response_time_scaling",
        metric_name="response_time",
        threshold_up=2000.0,  # 2 seconds
        threshold_down=500.0,  # 0.5 seconds
        min_replicas=2,
        max_replicas=8,
        scale_up_cooldown=300,
        scale_down_cooldown=600
    ))
    
    # Start auto-scaling
    await auto_scaler.start_auto_scaling()
    
    # Keep running
    try:
        while True:
            status = await auto_scaler.get_scaling_status()
            logger.info(f"Auto-scaling active: {status['auto_scaling_active']}")
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        await auto_scaler.stop_auto_scaling()

if __name__ == "__main__":
    asyncio.run(main())