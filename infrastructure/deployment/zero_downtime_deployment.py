#!/usr/bin/env python3
"""
Zero-Downtime Deployment System
Implements blue-green and canary deployment strategies
"""

import os
import asyncio
import logging
import docker
import yaml
import json
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import subprocess
from concurrent.futures import ThreadPoolExecutor
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/deployment-system.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DeploymentStrategy(Enum):
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    ROLLING = "rolling"

@dataclass
class DeploymentConfig:
    """Deployment configuration"""
    strategy: DeploymentStrategy
    image_tag: str
    health_check_url: str
    health_check_timeout: int = 300  # seconds
    canary_traffic_percentage: int = 10
    canary_duration: int = 1800  # 30 minutes
    rollback_threshold: float = 0.05  # 5% error rate
    max_deployment_time: int = 3600  # 1 hour
    
@dataclass
class ServiceConfig:
    """Service configuration"""
    name: str
    image: str
    port: int
    health_endpoint: str
    replicas: int = 2
    cpu_limit: str = "1000m"
    memory_limit: str = "1Gi"
    environment: Dict[str, str] = None

class HealthChecker:
    """Health check utility"""
    
    @staticmethod
    async def check_service_health(url: str, timeout: int = 30) -> Tuple[bool, Dict[str, Any]]:
        """Check service health"""
        try:
            response = requests.get(url, timeout=timeout)
            if response.status_code == 200:
                return True, response.json()
            else:
                return False, {"error": f"HTTP {response.status_code}"}
        except Exception as e:
            return False, {"error": str(e)}
            
    @staticmethod
    async def wait_for_healthy(url: str, timeout: int = 300) -> bool:
        """Wait for service to become healthy"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            healthy, _ = await HealthChecker.check_service_health(url)
            if healthy:
                return True
            await asyncio.sleep(5)
        return False

class TrafficManager:
    """Traffic management for deployments"""
    
    def __init__(self):
        self.nginx_config_path = "/etc/nginx/conf.d/app.conf"
        self.nginx_template_path = "/etc/nginx/templates/app.conf.template"
        
    async def set_traffic_split(self, blue_weight: int, green_weight: int):
        """Set traffic split between blue and green environments"""
        logger.info(f"Setting traffic split - Blue: {blue_weight}%, Green: {green_weight}%")
        
        # Read nginx template
        with open(self.nginx_template_path, 'r') as f:
            template = f.read()
            
        # Replace placeholders
        config = template.replace("{{BLUE_WEIGHT}}", str(blue_weight))
        config = config.replace("{{GREEN_WEIGHT}}", str(green_weight))
        
        # Write new config
        with open(self.nginx_config_path, 'w') as f:
            f.write(config)
            
        # Reload nginx
        subprocess.run(["nginx", "-s", "reload"], check=True)
        
    async def enable_canary(self, canary_percentage: int):
        """Enable canary deployment with specified traffic percentage"""
        logger.info(f"Enabling canary deployment: {canary_percentage}% traffic")
        await self.set_traffic_split(100 - canary_percentage, canary_percentage)
        
    async def disable_canary(self):
        """Disable canary deployment"""
        logger.info("Disabling canary deployment")
        await self.set_traffic_split(100, 0)
        
    async def switch_to_green(self):
        """Switch all traffic to green environment"""
        logger.info("Switching all traffic to green environment")
        await self.set_traffic_split(0, 100)

class KubernetesManager:
    """Kubernetes deployment manager"""
    
    def __init__(self):
        self.namespace = "6fb-ai-agent"
        
    async def deploy_service(self, service_config: ServiceConfig, environment: str) -> bool:
        """Deploy service to Kubernetes"""
        try:
            deployment_manifest = self._generate_deployment_manifest(service_config, environment)
            service_manifest = self._generate_service_manifest(service_config, environment)
            
            # Apply manifests
            await self._apply_manifest(deployment_manifest)
            await self._apply_manifest(service_manifest)
            
            # Wait for rollout to complete
            deployment_name = f"{service_config.name}-{environment}"
            await self._wait_for_rollout(deployment_name)
            
            return True
            
        except Exception as e:
            logger.error(f"Kubernetes deployment failed: {e}")
            return False
            
    def _generate_deployment_manifest(self, service_config: ServiceConfig, environment: str) -> Dict:
        """Generate Kubernetes deployment manifest"""
        return {
            "apiVersion": "apps/v1",
            "kind": "Deployment",
            "metadata": {
                "name": f"{service_config.name}-{environment}",
                "namespace": self.namespace,
                "labels": {
                    "app": service_config.name,
                    "environment": environment,
                    "version": service_config.image.split(':')[-1]
                }
            },
            "spec": {
                "replicas": service_config.replicas,
                "selector": {
                    "matchLabels": {
                        "app": service_config.name,
                        "environment": environment
                    }
                },
                "template": {
                    "metadata": {
                        "labels": {
                            "app": service_config.name,
                            "environment": environment
                        }
                    },
                    "spec": {
                        "containers": [{
                            "name": service_config.name,
                            "image": service_config.image,
                            "ports": [{
                                "containerPort": service_config.port
                            }],
                            "env": [
                                {"name": k, "value": v} 
                                for k, v in (service_config.environment or {}).items()
                            ],
                            "resources": {
                                "limits": {
                                    "cpu": service_config.cpu_limit,
                                    "memory": service_config.memory_limit
                                }
                            },
                            "livenessProbe": {
                                "httpGet": {
                                    "path": service_config.health_endpoint,
                                    "port": service_config.port
                                },
                                "initialDelaySeconds": 30,
                                "periodSeconds": 10
                            },
                            "readinessProbe": {
                                "httpGet": {
                                    "path": service_config.health_endpoint,
                                    "port": service_config.port
                                },
                                "initialDelaySeconds": 5,
                                "periodSeconds": 5
                            }
                        }]
                    }
                }
            }
        }
        
    def _generate_service_manifest(self, service_config: ServiceConfig, environment: str) -> Dict:
        """Generate Kubernetes service manifest"""
        return {
            "apiVersion": "v1",
            "kind": "Service",
            "metadata": {
                "name": f"{service_config.name}-{environment}",
                "namespace": self.namespace,
                "labels": {
                    "app": service_config.name,
                    "environment": environment
                }
            },
            "spec": {
                "selector": {
                    "app": service_config.name,
                    "environment": environment
                },
                "ports": [{
                    "port": service_config.port,
                    "targetPort": service_config.port
                }]
            }
        }
        
    async def _apply_manifest(self, manifest: Dict):
        """Apply Kubernetes manifest"""
        # Write manifest to temporary file
        manifest_file = f"/tmp/manifest_{int(time.time())}.yaml"
        with open(manifest_file, 'w') as f:
            yaml.dump(manifest, f)
            
        # Apply with kubectl
        subprocess.run(["kubectl", "apply", "-f", manifest_file], check=True)
        os.remove(manifest_file)
        
    async def _wait_for_rollout(self, deployment_name: str):
        """Wait for deployment rollout to complete"""
        cmd = ["kubectl", "rollout", "status", f"deployment/{deployment_name}", 
               f"--namespace={self.namespace}", "--timeout=600s"]
        subprocess.run(cmd, check=True)

class MetricsCollector:
    """Collect deployment metrics"""
    
    def __init__(self):
        self.prometheus_url = os.getenv('PROMETHEUS_URL', 'http://prometheus:9090')
        
    async def get_error_rate(self, service: str, duration: str = "5m") -> float:
        """Get service error rate from Prometheus"""
        try:
            query = f'rate(http_requests_total{{service="{service}",status=~"5.."}}[{duration}]) / rate(http_requests_total{{service="{service}"}}[{duration}])'
            response = requests.get(f"{self.prometheus_url}/api/v1/query", params={"query": query})
            data = response.json()
            
            if data['data']['result']:
                return float(data['data']['result'][0]['value'][1])
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to get error rate: {e}")
            return 0.0
            
    async def get_response_time(self, service: str, duration: str = "5m") -> float:
        """Get service response time from Prometheus"""
        try:
            query = f'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{{service="{service}"}}[{duration}]))'
            response = requests.get(f"{self.prometheus_url}/api/v1/query", params={"query": query})
            data = response.json()
            
            if data['data']['result']:
                return float(data['data']['result'][0]['value'][1])
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to get response time: {e}")
            return 0.0
            
    async def get_throughput(self, service: str, duration: str = "5m") -> float:
        """Get service throughput from Prometheus"""
        try:
            query = f'rate(http_requests_total{{service="{service}"}}[{duration}])'
            response = requests.get(f"{self.prometheus_url}/api/v1/query", params={"query": query})
            data = response.json()
            
            if data['data']['result']:
                return float(data['data']['result'][0]['value'][1])
            return 0.0
            
        except Exception as e:
            logger.error(f"Failed to get throughput: {e}")
            return 0.0

class DeploymentOrchestrator:
    """Main deployment orchestrator"""
    
    def __init__(self):
        self.k8s_manager = KubernetesManager()
        self.traffic_manager = TrafficManager()
        self.metrics_collector = MetricsCollector()
        self.health_checker = HealthChecker()
        
    async def deploy(self, deployment_config: DeploymentConfig, services: List[ServiceConfig]) -> bool:
        """Execute deployment with specified strategy"""
        logger.info(f"Starting {deployment_config.strategy.value} deployment")
        
        try:
            if deployment_config.strategy == DeploymentStrategy.BLUE_GREEN:
                return await self._blue_green_deployment(deployment_config, services)
            elif deployment_config.strategy == DeploymentStrategy.CANARY:
                return await self._canary_deployment(deployment_config, services)
            elif deployment_config.strategy == DeploymentStrategy.ROLLING:
                return await self._rolling_deployment(deployment_config, services)
            else:
                raise ValueError(f"Unknown deployment strategy: {deployment_config.strategy}")
                
        except Exception as e:
            logger.error(f"Deployment failed: {e}")
            await self._rollback(deployment_config, services)
            return False
            
    async def _blue_green_deployment(self, config: DeploymentConfig, services: List[ServiceConfig]) -> bool:
        """Execute blue-green deployment"""
        logger.info("Starting blue-green deployment")
        
        # Deploy to green environment
        for service in services:
            service.image = f"{service.image.split(':')[0]}:{config.image_tag}"
            success = await self.k8s_manager.deploy_service(service, "green")
            if not success:
                return False
                
        # Wait for green environment to be healthy
        for service in services:
            health_url = f"http://{service.name}-green:{service.port}{service.health_endpoint}"
            healthy = await self.health_checker.wait_for_healthy(health_url, config.health_check_timeout)
            if not healthy:
                logger.error(f"Green environment health check failed for {service.name}")
                return False
                
        # Validate green environment performance
        await asyncio.sleep(60)  # Allow metrics to stabilize
        
        for service in services:
            error_rate = await self.metrics_collector.get_error_rate(f"{service.name}-green")
            if error_rate > config.rollback_threshold:
                logger.error(f"High error rate in green environment: {error_rate}")
                return False
                
        # Switch traffic to green
        await self.traffic_manager.switch_to_green()
        
        # Monitor for a period
        await asyncio.sleep(300)  # 5 minutes
        
        # Final validation
        for service in services:
            error_rate = await self.metrics_collector.get_error_rate(f"{service.name}-green")
            if error_rate > config.rollback_threshold:
                logger.error(f"High error rate after traffic switch: {error_rate}")
                await self.traffic_manager.set_traffic_split(100, 0)  # Rollback
                return False
                
        logger.info("Blue-green deployment completed successfully")
        return True
        
    async def _canary_deployment(self, config: DeploymentConfig, services: List[ServiceConfig]) -> bool:
        """Execute canary deployment"""
        logger.info("Starting canary deployment")
        
        # Deploy canary version
        for service in services:
            service.image = f"{service.image.split(':')[0]}:{config.image_tag}"
            service.replicas = 1  # Start with single replica for canary
            success = await self.k8s_manager.deploy_service(service, "canary")
            if not success:
                return False
                
        # Wait for canary to be healthy
        for service in services:
            health_url = f"http://{service.name}-canary:{service.port}{service.health_endpoint}"
            healthy = await self.health_checker.wait_for_healthy(health_url, config.health_check_timeout)
            if not healthy:
                logger.error(f"Canary health check failed for {service.name}")
                return False
                
        # Enable canary traffic
        await self.traffic_manager.enable_canary(config.canary_traffic_percentage)
        
        # Monitor canary for specified duration
        start_time = time.time()
        while time.time() - start_time < config.canary_duration:
            for service in services:
                error_rate = await self.metrics_collector.get_error_rate(f"{service.name}-canary")
                if error_rate > config.rollback_threshold:
                    logger.error(f"High error rate in canary: {error_rate}")
                    await self.traffic_manager.disable_canary()
                    return False
                    
            await asyncio.sleep(60)  # Check every minute
            
        # Gradually increase canary traffic
        traffic_percentages = [25, 50, 75, 100]
        for percentage in traffic_percentages:
            await self.traffic_manager.enable_canary(percentage)
            await asyncio.sleep(300)  # 5 minutes at each level
            
            # Monitor metrics
            for service in services:
                error_rate = await self.metrics_collector.get_error_rate(f"{service.name}-canary")
                if error_rate > config.rollback_threshold:
                    logger.error(f"High error rate at {percentage}% traffic: {error_rate}")
                    await self.traffic_manager.disable_canary()
                    return False
                    
        # Full deployment - replace blue with canary
        for service in services:
            service.replicas = 2  # Scale up to normal replica count
            success = await self.k8s_manager.deploy_service(service, "blue")
            if not success:
                return False
                
        await self.traffic_manager.set_traffic_split(100, 0)
        
        logger.info("Canary deployment completed successfully")
        return True
        
    async def _rolling_deployment(self, config: DeploymentConfig, services: List[ServiceConfig]) -> bool:
        """Execute rolling deployment"""
        logger.info("Starting rolling deployment")
        
        for service in services:
            service.image = f"{service.image.split(':')[0]}:{config.image_tag}"
            
            # Update deployment with rolling strategy
            success = await self.k8s_manager.deploy_service(service, "blue")
            if not success:
                return False
                
            # Wait for health check
            health_url = f"http://{service.name}-blue:{service.port}{service.health_endpoint}"
            healthy = await self.health_checker.wait_for_healthy(health_url, config.health_check_timeout)
            if not healthy:
                logger.error(f"Rolling deployment health check failed for {service.name}")
                return False
                
            # Monitor metrics
            await asyncio.sleep(60)
            error_rate = await self.metrics_collector.get_error_rate(f"{service.name}-blue")
            if error_rate > config.rollback_threshold:
                logger.error(f"High error rate in rolling deployment: {error_rate}")
                return False
                
        logger.info("Rolling deployment completed successfully")
        return True
        
    async def _rollback(self, config: DeploymentConfig, services: List[ServiceConfig]):
        """Rollback deployment"""
        logger.info("Starting deployment rollback")
        
        try:
            # Switch traffic back to blue/stable environment
            await self.traffic_manager.set_traffic_split(100, 0)
            
            # Scale down failed deployments
            for service in services:
                try:
                    subprocess.run([
                        "kubectl", "scale", "deployment", 
                        f"{service.name}-green", 
                        "--replicas=0",
                        f"--namespace={self.k8s_manager.namespace}"
                    ], check=True)
                    
                    subprocess.run([
                        "kubectl", "scale", "deployment", 
                        f"{service.name}-canary", 
                        "--replicas=0",
                        f"--namespace={self.k8s_manager.namespace}"
                    ], check=True)
                except subprocess.CalledProcessError:
                    pass  # Deployment might not exist
                    
            logger.info("Rollback completed")
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")

# Deployment automation scripts
class DeploymentAutomation:
    """Automated deployment workflows"""
    
    def __init__(self):
        self.orchestrator = DeploymentOrchestrator()
        
    async def deploy_from_git(self, repo_url: str, branch: str, strategy: DeploymentStrategy) -> bool:
        """Deploy from Git repository"""
        logger.info(f"Deploying from {repo_url}:{branch}")
        
        try:
            # Clone repository
            clone_dir = f"/tmp/deploy_{int(time.time())}"
            subprocess.run(["git", "clone", "-b", branch, repo_url, clone_dir], check=True)
            
            # Build Docker image
            image_tag = f"deploy-{int(time.time())}"
            subprocess.run([
                "docker", "build", "-t", f"6fb-ai-agent:{image_tag}", clone_dir
            ], check=True)
            
            # Push to registry
            subprocess.run([
                "docker", "push", f"6fb-ai-agent:{image_tag}"
            ], check=True)
            
            # Create deployment config
            deployment_config = DeploymentConfig(
                strategy=strategy,
                image_tag=image_tag,
                health_check_url="http://app/health"
            )
            
            # Create service configs
            services = [
                ServiceConfig(
                    name="frontend",
                    image="6fb-ai-agent-frontend",
                    port=9999,
                    health_endpoint="/api/health"
                ),
                ServiceConfig(
                    name="backend",
                    image="6fb-ai-agent-backend",
                    port=8000,
                    health_endpoint="/health"
                )
            ]
            
            # Execute deployment
            success = await self.orchestrator.deploy(deployment_config, services)
            
            # Cleanup
            shutil.rmtree(clone_dir)
            
            return success
            
        except Exception as e:
            logger.error(f"Automated deployment failed: {e}")
            return False
            
    async def schedule_deployment(self, cron_expression: str, config: Dict[str, Any]):
        """Schedule automated deployments"""
        # Implementation would integrate with a job scheduler like Celery or cron
        pass

# Usage example
async def main():
    # Example deployment configuration
    deployment_config = DeploymentConfig(
        strategy=DeploymentStrategy.BLUE_GREEN,
        image_tag="v2.1.0",
        health_check_url="http://app/health",
        health_check_timeout=300,
        rollback_threshold=0.05
    )
    
    # Service configurations
    services = [
        ServiceConfig(
            name="frontend",
            image="6fb-ai-agent-frontend",
            port=9999,
            health_endpoint="/api/health",
            replicas=2
        ),
        ServiceConfig(
            name="backend",
            image="6fb-ai-agent-backend",
            port=8000,
            health_endpoint="/health",
            replicas=2
        )
    ]
    
    # Execute deployment
    orchestrator = DeploymentOrchestrator()
    success = await orchestrator.deploy(deployment_config, services)
    
    if success:
        logger.info("Deployment completed successfully")
    else:
        logger.error("Deployment failed")

if __name__ == "__main__":
    asyncio.run(main())