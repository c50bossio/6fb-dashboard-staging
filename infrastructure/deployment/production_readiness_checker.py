#!/usr/bin/env python3
"""
Production Readiness Checker and Go-Live Verification System
Comprehensive verification of system readiness for production deployment
"""

import os
import asyncio
import logging
import json
import time
import subprocess
import sqlite3
import docker
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import psutil
import ssl
import socket
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/production-readiness.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CheckStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    WARNING = "warning"
    SKIP = "skip"

class CheckCategory(Enum):
    INFRASTRUCTURE = "infrastructure"
    SECURITY = "security"
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    MONITORING = "monitoring"
    BACKUP = "backup"
    COMPLIANCE = "compliance"

@dataclass
class ReadinessCheck:
    """Individual readiness check definition"""
    id: str
    name: str
    description: str
    category: CheckCategory
    critical: bool
    check_function: str
    expected_result: Any
    remediation_steps: List[str]
    
@dataclass
class CheckResult:
    """Result of a readiness check"""
    check_id: str
    status: CheckStatus
    message: str
    details: Dict[str, Any]
    execution_time: float
    timestamp: datetime
    remediation_required: bool = False

class InfrastructureChecker:
    """Infrastructure readiness checks"""
    
    @staticmethod
    async def check_system_resources() -> CheckResult:
        """Check system resource availability"""
        try:
            start_time = time.time()
            
            # Check CPU
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Check Memory
            memory = psutil.virtual_memory()
            
            # Check Disk
            disk = psutil.disk_usage('/')
            
            # Check Network
            network_interfaces = len(psutil.net_if_addrs())
            
            details = {
                'cpu_usage_percent': cpu_percent,
                'memory_total_gb': round(memory.total / (1024**3), 2),
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'memory_usage_percent': memory.percent,
                'disk_total_gb': round(disk.total / (1024**3), 2),
                'disk_free_gb': round(disk.free / (1024**3), 2),
                'disk_usage_percent': round((disk.used / disk.total) * 100, 2),
                'network_interfaces': network_interfaces
            }
            
            # Determine status
            issues = []
            if cpu_percent > 80:
                issues.append("High CPU usage")
            if memory.percent > 85:
                issues.append("High memory usage")
            if disk.percent > 90:
                issues.append("Low disk space")
            if memory.total < 2 * 1024**3:  # Less than 2GB
                issues.append("Insufficient memory")
            if disk.free < 5 * 1024**3:  # Less than 5GB free
                issues.append("Insufficient disk space")
                
            if issues:
                status = CheckStatus.FAIL if any("Insufficient" in issue for issue in issues) else CheckStatus.WARNING
                message = f"Resource issues detected: {', '.join(issues)}"
            else:
                status = CheckStatus.PASS
                message = "System resources are adequate"
                
            return CheckResult(
                check_id="infrastructure_resources",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="infrastructure_resources",
                status=CheckStatus.FAIL,
                message=f"System resource check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )
            
    @staticmethod
    async def check_docker_environment() -> CheckResult:
        """Check Docker environment"""
        try:
            start_time = time.time()
            
            # Check if Docker is available
            docker_client = docker.from_env()
            
            # Get Docker info
            docker_info = docker_client.info()
            
            # Check containers
            containers = docker_client.containers.list(all=True)
            running_containers = docker_client.containers.list()
            
            # Check images
            images = docker_client.images.list()
            
            details = {
                'docker_version': docker_info['ServerVersion'],
                'containers_total': len(containers),
                'containers_running': len(running_containers),
                'images_total': len(images),
                'storage_driver': docker_info.get('Driver', 'unknown'),
                'root_dir': docker_info.get('DockerRootDir', 'unknown')
            }
            
            # Check for required containers
            required_containers = ['agent-system-frontend-dev', 'agent-system-backend-dev']
            missing_containers = []
            
            container_names = [c.name for c in containers]
            for required in required_containers:
                if required not in container_names:
                    missing_containers.append(required)
                    
            if missing_containers:
                status = CheckStatus.FAIL
                message = f"Missing required containers: {', '.join(missing_containers)}"
            else:
                status = CheckStatus.PASS
                message = "Docker environment is properly configured"
                
            return CheckResult(
                check_id="infrastructure_docker",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="infrastructure_docker",
                status=CheckStatus.FAIL,
                message=f"Docker check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )
            
    @staticmethod
    async def check_network_connectivity() -> CheckResult:
        """Check network connectivity"""
        try:
            start_time = time.time()
            
            # Test external connectivity
            test_hosts = [
                ('google.com', 443),
                ('github.com', 443),
                ('registry.npmjs.org', 443)
            ]
            
            connectivity_results = {}
            for host, port in test_hosts:
                try:
                    sock = socket.create_connection((host, port), timeout=5)
                    sock.close()
                    connectivity_results[host] = True
                except Exception:
                    connectivity_results[host] = False
                    
            # Test internal connectivity
            internal_services = [
                ('localhost', 9999),  # Frontend
                ('localhost', 8001)   # Backend
            ]
            
            internal_results = {}
            for host, port in internal_services:
                try:
                    sock = socket.create_connection((host, port), timeout=2)
                    sock.close()
                    internal_results[f"{host}:{port}"] = True
                except Exception:
                    internal_results[f"{host}:{port}"] = False
                    
            details = {
                'external_connectivity': connectivity_results,
                'internal_services': internal_results
            }
            
            # Determine status
            external_failed = [host for host, result in connectivity_results.items() if not result]
            internal_failed = [service for service, result in internal_results.items() if not result]
            
            if external_failed and internal_failed:
                status = CheckStatus.FAIL
                message = f"Network connectivity issues: External: {external_failed}, Internal: {internal_failed}"
            elif external_failed:
                status = CheckStatus.WARNING
                message = f"External connectivity issues: {external_failed}"
            elif internal_failed:
                status = CheckStatus.WARNING
                message = f"Internal service connectivity issues: {internal_failed}"
            else:
                status = CheckStatus.PASS
                message = "Network connectivity is good"
                
            return CheckResult(
                check_id="infrastructure_network",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="infrastructure_network",
                status=CheckStatus.FAIL,
                message=f"Network connectivity check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )

class SecurityChecker:
    """Security readiness checks"""
    
    @staticmethod
    async def check_ssl_certificates() -> CheckResult:
        """Check SSL certificate validity"""
        try:
            start_time = time.time()
            
            # Test domains to check
            domains = ['localhost']  # Add production domains
            
            certificate_results = {}
            
            for domain in domains:
                try:
                    context = ssl.create_default_context()
                    with socket.create_connection((domain, 443), timeout=5) as sock:
                        with context.wrap_socket(sock, server_hostname=domain) as ssock:
                            cert = ssock.getpeercert()
                            
                            # Parse expiry date
                            expiry_str = cert['notAfter']
                            expiry_date = datetime.strptime(expiry_str, '%b %d %H:%M:%S %Y %Z')
                            days_until_expiry = (expiry_date - datetime.now()).days
                            
                            certificate_results[domain] = {
                                'valid': True,
                                'expiry_date': expiry_date.isoformat(),
                                'days_until_expiry': days_until_expiry,
                                'issuer': cert.get('issuer', [{}])[0].get('organizationName', 'Unknown')
                            }
                            
                except Exception as e:
                    certificate_results[domain] = {
                        'valid': False,
                        'error': str(e)
                    }
                    
            details = {'certificates': certificate_results}
            
            # Determine status
            invalid_certs = [domain for domain, result in certificate_results.items() if not result.get('valid', False)]
            expiring_soon = [
                domain for domain, result in certificate_results.items() 
                if result.get('valid', False) and result.get('days_until_expiry', 100) < 30
            ]
            
            if invalid_certs:
                status = CheckStatus.FAIL
                message = f"Invalid SSL certificates: {invalid_certs}"
            elif expiring_soon:
                status = CheckStatus.WARNING
                message = f"SSL certificates expiring soon: {expiring_soon}"
            else:
                status = CheckStatus.PASS
                message = "SSL certificates are valid"
                
            return CheckResult(
                check_id="security_ssl_certificates",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="security_ssl_certificates",
                status=CheckStatus.SKIP,
                message=f"SSL certificate check skipped: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now()
            )
            
    @staticmethod
    async def check_environment_secrets() -> CheckResult:
        """Check environment variable security"""
        try:
            start_time = time.time()
            
            # Required environment variables
            required_secrets = [
                'OPENAI_API_KEY',
                'ANTHROPIC_API_KEY',
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_ROLE_KEY'
            ]
            
            optional_secrets = [
                'STRIPE_SECRET_KEY',
                'PUSHER_SECRET',
                'SENTRY_DSN',
                'POSTHOG_API_KEY'
            ]
            
            secret_status = {}
            missing_required = []
            weak_secrets = []
            
            # Check required secrets
            for secret in required_secrets:
                value = os.getenv(secret)
                if value:
                    secret_status[secret] = {
                        'present': True,
                        'length': len(value),
                        'strong': len(value) > 20  # Basic strength check
                    }
                    
                    if len(value) < 20:
                        weak_secrets.append(secret)
                else:
                    secret_status[secret] = {'present': False}
                    missing_required.append(secret)
                    
            # Check optional secrets
            for secret in optional_secrets:
                value = os.getenv(secret)
                secret_status[secret] = {
                    'present': bool(value),
                    'length': len(value) if value else 0
                }
                
            details = {
                'secret_status': secret_status,
                'missing_required': missing_required,
                'weak_secrets': weak_secrets
            }
            
            # Determine status
            if missing_required:
                status = CheckStatus.FAIL
                message = f"Missing required secrets: {missing_required}"
            elif weak_secrets:
                status = CheckStatus.WARNING
                message = f"Weak secrets detected: {weak_secrets}"
            else:
                status = CheckStatus.PASS
                message = "Environment secrets are properly configured"
                
            return CheckResult(
                check_id="security_environment_secrets",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="security_environment_secrets",
                status=CheckStatus.FAIL,
                message=f"Environment secrets check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )

class PerformanceChecker:
    """Performance readiness checks"""
    
    @staticmethod
    async def check_application_performance() -> CheckResult:
        """Check application performance metrics"""
        try:
            start_time = time.time()
            
            # Test application endpoints
            endpoints = [
                'http://localhost:9999/api/health',
                'http://localhost:8001/health'
            ]
            
            performance_results = {}
            
            for endpoint in endpoints:
                try:
                    test_start = time.time()
                    
                    async with aiohttp.ClientSession() as session:
                        async with session.get(endpoint, timeout=10) as response:
                            response_time = (time.time() - test_start) * 1000  # ms
                            
                            performance_results[endpoint] = {
                                'status_code': response.status,
                                'response_time_ms': round(response_time, 2),
                                'accessible': True
                            }
                            
                except Exception as e:
                    performance_results[endpoint] = {
                        'accessible': False,
                        'error': str(e)
                    }
                    
            # Load testing (simplified)
            load_test_results = await PerformanceChecker._simple_load_test()
            
            details = {
                'endpoint_performance': performance_results,
                'load_test': load_test_results
            }
            
            # Determine status
            slow_endpoints = [
                url for url, result in performance_results.items() 
                if result.get('accessible', False) and result.get('response_time_ms', 0) > 2000
            ]
            
            failed_endpoints = [
                url for url, result in performance_results.items() 
                if not result.get('accessible', False)
            ]
            
            if failed_endpoints:
                status = CheckStatus.FAIL
                message = f"Failed endpoints: {failed_endpoints}"
            elif slow_endpoints:
                status = CheckStatus.WARNING
                message = f"Slow endpoints (>2s): {slow_endpoints}"
            else:
                status = CheckStatus.PASS
                message = "Application performance is acceptable"
                
            return CheckResult(
                check_id="performance_application",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="performance_application",
                status=CheckStatus.FAIL,
                message=f"Performance check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )
            
    @staticmethod
    async def _simple_load_test() -> Dict[str, Any]:
        """Simple load test"""
        try:
            endpoint = 'http://localhost:9999/api/health'
            concurrent_requests = 10
            
            async def make_request():
                try:
                    start_time = time.time()
                    async with aiohttp.ClientSession() as session:
                        async with session.get(endpoint, timeout=5) as response:
                            return {
                                'success': response.status == 200,
                                'response_time': (time.time() - start_time) * 1000
                            }
                except Exception:
                    return {'success': False, 'response_time': 0}
                    
            # Execute concurrent requests
            tasks = [make_request() for _ in range(concurrent_requests)]
            results = await asyncio.gather(*tasks)
            
            # Analyze results
            successful_requests = len([r for r in results if r['success']])
            response_times = [r['response_time'] for r in results if r['success']]
            
            if response_times:
                avg_response_time = sum(response_times) / len(response_times)
                max_response_time = max(response_times)
            else:
                avg_response_time = 0
                max_response_time = 0
                
            return {
                'total_requests': concurrent_requests,
                'successful_requests': successful_requests,
                'success_rate': (successful_requests / concurrent_requests) * 100,
                'avg_response_time_ms': round(avg_response_time, 2),
                'max_response_time_ms': round(max_response_time, 2)
            }
            
        except Exception as e:
            return {'error': str(e)}

class DatabaseChecker:
    """Database readiness checks"""
    
    @staticmethod
    async def check_database_connectivity() -> CheckResult:
        """Check database connectivity and health"""
        try:
            start_time = time.time()
            
            # Check SQLite database
            db_path = "/app/data/agent_system.db"
            db_results = {}
            
            if os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    
                    # Test query
                    cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
                    table_count = cursor.fetchone()[0]
                    
                    # Check database size
                    db_size_mb = os.path.getsize(db_path) / (1024 * 1024)
                    
                    # Test write operation
                    cursor.execute("CREATE TABLE IF NOT EXISTS health_check (id INTEGER PRIMARY KEY, timestamp TEXT)")
                    cursor.execute("INSERT INTO health_check (timestamp) VALUES (?)", (datetime.now().isoformat(),))
                    cursor.execute("DELETE FROM health_check WHERE timestamp < ?", 
                                 ((datetime.now() - timedelta(hours=1)).isoformat(),))
                    conn.commit()
                    
                    conn.close()
                    
                    db_results['sqlite'] = {
                        'accessible': True,
                        'table_count': table_count,
                        'size_mb': round(db_size_mb, 2),
                        'writable': True
                    }
                    
                except Exception as e:
                    db_results['sqlite'] = {
                        'accessible': False,
                        'error': str(e)
                    }
            else:
                db_results['sqlite'] = {
                    'accessible': False,
                    'error': 'Database file not found'
                }
                
            details = {'databases': db_results}
            
            # Determine status
            if not db_results['sqlite'].get('accessible', False):
                status = CheckStatus.FAIL
                message = f"Database connectivity failed: {db_results['sqlite'].get('error', 'Unknown error')}"
            else:
                status = CheckStatus.PASS
                message = "Database connectivity is healthy"
                
            return CheckResult(
                check_id="database_connectivity",
                status=status,
                message=message,
                details=details,
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=status == CheckStatus.FAIL
            )
            
        except Exception as e:
            return CheckResult(
                check_id="database_connectivity",
                status=CheckStatus.FAIL,
                message=f"Database check failed: {str(e)}",
                details={},
                execution_time=time.time() - start_time,
                timestamp=datetime.now(),
                remediation_required=True
            )

class ProductionReadinessOrchestrator:
    """Main production readiness orchestrator"""
    
    def __init__(self):
        self.checks = self._initialize_checks()
        self.results = []
        
    def _initialize_checks(self) -> List[ReadinessCheck]:
        """Initialize all readiness checks"""
        return [
            # Infrastructure checks
            ReadinessCheck(
                id="infrastructure_resources",
                name="System Resources",
                description="Check CPU, memory, disk, and network resources",
                category=CheckCategory.INFRASTRUCTURE,
                critical=True,
                check_function="InfrastructureChecker.check_system_resources",
                expected_result="adequate resources",
                remediation_steps=[
                    "Increase CPU allocation",
                    "Add more memory",
                    "Expand disk space",
                    "Check network configuration"
                ]
            ),
            ReadinessCheck(
                id="infrastructure_docker",
                name="Docker Environment",
                description="Verify Docker is properly configured and containers are available",
                category=CheckCategory.INFRASTRUCTURE,
                critical=True,
                check_function="InfrastructureChecker.check_docker_environment",
                expected_result="docker healthy",
                remediation_steps=[
                    "Install/update Docker",
                    "Start required containers",
                    "Check Docker daemon status",
                    "Verify container images"
                ]
            ),
            ReadinessCheck(
                id="infrastructure_network",
                name="Network Connectivity",
                description="Test internal and external network connectivity",
                category=CheckCategory.INFRASTRUCTURE,
                critical=True,
                check_function="InfrastructureChecker.check_network_connectivity",
                expected_result="connectivity good",
                remediation_steps=[
                    "Check firewall rules",
                    "Verify DNS resolution",
                    "Test service ports",
                    "Check network interfaces"
                ]
            ),
            
            # Security checks
            ReadinessCheck(
                id="security_ssl_certificates",
                name="SSL Certificates",
                description="Verify SSL certificates are valid and not expiring soon",
                category=CheckCategory.SECURITY,
                critical=False,
                check_function="SecurityChecker.check_ssl_certificates",
                expected_result="certificates valid",
                remediation_steps=[
                    "Renew SSL certificates",
                    "Update certificate configuration",
                    "Verify certificate chain",
                    "Test HTTPS endpoints"
                ]
            ),
            ReadinessCheck(
                id="security_environment_secrets",
                name="Environment Secrets",
                description="Check that required secrets are configured",
                category=CheckCategory.SECURITY,
                critical=True,
                check_function="SecurityChecker.check_environment_secrets",
                expected_result="secrets configured",
                remediation_steps=[
                    "Configure missing environment variables",
                    "Strengthen weak secrets",
                    "Verify secret rotation",
                    "Check secret storage security"
                ]
            ),
            
            # Performance checks
            ReadinessCheck(
                id="performance_application",
                name="Application Performance",
                description="Test application response times and load handling",
                category=CheckCategory.PERFORMANCE,
                critical=True,
                check_function="PerformanceChecker.check_application_performance",
                expected_result="performance acceptable",
                remediation_steps=[
                    "Optimize slow endpoints",
                    "Scale application instances",
                    "Check database queries",
                    "Review application code"
                ]
            ),
            
            # Database checks
            ReadinessCheck(
                id="database_connectivity",
                name="Database Connectivity",
                description="Verify database connections and basic operations",
                category=CheckCategory.RELIABILITY,
                critical=True,
                check_function="DatabaseChecker.check_database_connectivity",
                expected_result="database healthy",
                remediation_steps=[
                    "Start database service",
                    "Check database permissions",
                    "Verify database schema",
                    "Test database operations"
                ]
            )
        ]
        
    async def run_all_checks(self) -> Dict[str, Any]:
        """Run all readiness checks"""
        logger.info("Starting production readiness checks")
        start_time = time.time()
        
        self.results = []
        
        # Run each check
        for check in self.checks:
            logger.info(f"Running check: {check.name}")
            
            try:
                # Execute check function
                if check.check_function == "InfrastructureChecker.check_system_resources":
                    result = await InfrastructureChecker.check_system_resources()
                elif check.check_function == "InfrastructureChecker.check_docker_environment":
                    result = await InfrastructureChecker.check_docker_environment()
                elif check.check_function == "InfrastructureChecker.check_network_connectivity":
                    result = await InfrastructureChecker.check_network_connectivity()
                elif check.check_function == "SecurityChecker.check_ssl_certificates":
                    result = await SecurityChecker.check_ssl_certificates()
                elif check.check_function == "SecurityChecker.check_environment_secrets":
                    result = await SecurityChecker.check_environment_secrets()
                elif check.check_function == "PerformanceChecker.check_application_performance":
                    result = await PerformanceChecker.check_application_performance()
                elif check.check_function == "DatabaseChecker.check_database_connectivity":
                    result = await DatabaseChecker.check_database_connectivity()
                else:
                    result = CheckResult(
                        check_id=check.id,
                        status=CheckStatus.SKIP,
                        message="Check function not implemented",
                        details={},
                        execution_time=0,
                        timestamp=datetime.now()
                    )
                    
                self.results.append(result)
                
                logger.info(f"Check {check.name}: {result.status.value} - {result.message}")
                
            except Exception as e:
                error_result = CheckResult(
                    check_id=check.id,
                    status=CheckStatus.FAIL,
                    message=f"Check execution failed: {str(e)}",
                    details={},
                    execution_time=0,
                    timestamp=datetime.now(),
                    remediation_required=True
                )
                self.results.append(error_result)
                logger.error(f"Check {check.name} failed: {str(e)}")
                
        # Generate summary
        summary = await self._generate_summary()
        
        total_time = time.time() - start_time
        logger.info(f"Production readiness checks completed in {total_time:.2f}s")
        
        return summary
        
    async def _generate_summary(self) -> Dict[str, Any]:
        """Generate readiness summary"""
        total_checks = len(self.results)
        passed_checks = len([r for r in self.results if r.status == CheckStatus.PASS])
        failed_checks = len([r for r in self.results if r.status == CheckStatus.FAIL])
        warning_checks = len([r for r in self.results if r.status == CheckStatus.WARNING])
        skipped_checks = len([r for r in self.results if r.status == CheckStatus.SKIP])
        
        # Critical checks
        critical_check_ids = [c.id for c in self.checks if c.critical]
        critical_results = [r for r in self.results if r.check_id in critical_check_ids]
        critical_failures = [r for r in critical_results if r.status == CheckStatus.FAIL]
        
        # Determine overall readiness
        production_ready = len(critical_failures) == 0
        
        # Get remediation items
        remediation_required = [r for r in self.results if r.remediation_required]
        
        # Category breakdown
        category_breakdown = {}
        for category in CheckCategory:
            category_checks = [c for c in self.checks if c.category == category]
            category_results = [r for r in self.results if r.check_id in [c.id for c in category_checks]]
            
            category_breakdown[category.value] = {
                'total': len(category_results),
                'passed': len([r for r in category_results if r.status == CheckStatus.PASS]),
                'failed': len([r for r in category_results if r.status == CheckStatus.FAIL]),
                'warnings': len([r for r in category_results if r.status == CheckStatus.WARNING])
            }
            
        return {
            'overall_status': 'READY' if production_ready else 'NOT_READY',
            'production_ready': production_ready,
            'summary': {
                'total_checks': total_checks,
                'passed': passed_checks,
                'failed': failed_checks,
                'warnings': warning_checks,
                'skipped': skipped_checks,
                'success_rate': round((passed_checks / total_checks) * 100, 1) if total_checks > 0 else 0
            },
            'critical_checks': {
                'total': len(critical_results),
                'failed': len(critical_failures),
                'blocking_production': len(critical_failures) > 0
            },
            'category_breakdown': category_breakdown,
            'remediation_required': len(remediation_required),
            'detailed_results': [asdict(result) for result in self.results],
            'next_steps': self._generate_next_steps(),
            'timestamp': datetime.now().isoformat()
        }
        
    def _generate_next_steps(self) -> List[str]:
        """Generate next steps based on check results"""
        next_steps = []
        
        # Critical failures
        critical_failures = [
            r for r in self.results 
            if r.status == CheckStatus.FAIL and 
            any(c.critical for c in self.checks if c.id == r.check_id)
        ]
        
        if critical_failures:
            next_steps.append("❌ CRITICAL: Address failed critical checks before production deployment")
            for failure in critical_failures:
                check = next(c for c in self.checks if c.id == failure.check_id)
                next_steps.extend([f"  • {step}" for step in check.remediation_steps])
                
        # Warnings
        warnings = [r for r in self.results if r.status == CheckStatus.WARNING]
        if warnings:
            next_steps.append("⚠️  WARNING: Address warnings for optimal production performance")
            
        # General recommendations
        if not critical_failures:
            next_steps.extend([
                "✅ System appears ready for production deployment",
                "🔄 Run final smoke tests after deployment",
                "📊 Monitor system metrics closely during initial rollout",
                "🔔 Ensure monitoring and alerting systems are active"
            ])
            
        return next_steps
        
    async def generate_go_live_checklist(self) -> Dict[str, Any]:
        """Generate comprehensive go-live checklist"""
        
        checklist_items = [
            # Pre-deployment
            {
                'category': 'Pre-Deployment',
                'items': [
                    'All production readiness checks passed',
                    'Environment variables configured',
                    'SSL certificates installed and valid',
                    'Database migrations completed',
                    'Monitoring systems configured',
                    'Backup systems verified',
                    'Load balancer configured',
                    'DNS records updated'
                ]
            },
            
            # Deployment
            {
                'category': 'Deployment',
                'items': [
                    'Blue-green deployment ready',
                    'Rollback procedures tested',
                    'Database backups created',
                    'Maintenance mode configured',
                    'Deployment scripts tested',
                    'Container images available',
                    'Health checks configured',
                    'Feature flags ready'
                ]
            },
            
            # Post-deployment
            {
                'category': 'Post-Deployment',
                'items': [
                    'Service health checks passing',
                    'Application functionality verified',
                    'Database connectivity confirmed',
                    'API endpoints responding',
                    'User authentication working',
                    'Performance metrics acceptable',
                    'Security scans completed',
                    'Monitoring alerts active'
                ]
            },
            
            # Monitoring
            {
                'category': 'Monitoring & Operations',
                'items': [
                    'Application metrics streaming',
                    'Error tracking active',
                    'Log aggregation working',
                    'Alert notifications configured',
                    'Dashboard accessible',
                    'On-call procedures active',
                    'Incident response ready',
                    'Performance baselines set'
                ]
            }
        ]
        
        return {
            'go_live_checklist': checklist_items,
            'estimated_deployment_time': '2-4 hours',
            'required_personnel': [
                'DevOps Engineer',
                'Backend Developer', 
                'Frontend Developer',
                'QA Engineer',
                'Product Manager'
            ],
            'emergency_contacts': {
                'technical_lead': 'technical-lead@company.com',
                'devops_team': 'devops@company.com',
                'on_call': 'oncall@company.com'
            },
            'rollback_criteria': [
                'Response time > 5 seconds',
                'Error rate > 5%',
                'Service availability < 95%',
                'Critical functionality broken'
            ]
        }

# Usage example
async def main():
    # Initialize production readiness checker
    checker = ProductionReadinessOrchestrator()
    
    # Run all checks
    results = await checker.run_all_checks()
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"PRODUCTION READINESS REPORT")
    print(f"{'='*60}")
    print(f"Overall Status: {results['overall_status']}")
    print(f"Production Ready: {results['production_ready']}")
    print(f"Success Rate: {results['summary']['success_rate']}%")
    print(f"")
    print(f"Checks Summary:")
    print(f"  Passed: {results['summary']['passed']}")
    print(f"  Failed: {results['summary']['failed']}")
    print(f"  Warnings: {results['summary']['warnings']}")
    print(f"  Skipped: {results['summary']['skipped']}")
    
    # Print next steps
    print(f"\nNext Steps:")
    for step in results['next_steps']:
        print(f"  {step}")
    
    # Generate go-live checklist
    checklist = await checker.generate_go_live_checklist()
    
    print(f"\n{'='*60}")
    print(f"GO-LIVE CHECKLIST")
    print(f"{'='*60}")
    
    for category in checklist['go_live_checklist']:
        print(f"\n{category['category']}:")
        for item in category['items']:
            print(f"  ☐ {item}")
    
    # Save detailed results
    with open('/tmp/production_readiness_report.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
        
    print(f"\nDetailed report saved to: /tmp/production_readiness_report.json")

if __name__ == "__main__":
    asyncio.run(main())