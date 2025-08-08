#!/usr/bin/env python3
"""
Performance Testing Suite for 6FB AI Agent System
Tests concurrent user load, memory usage, and response times
"""

import asyncio
import aiohttp
import json
import logging
import time
import statistics
import psutil
import concurrent.futures
from datetime import datetime
from typing import List, Dict, Any
from dataclasses import dataclass, asdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class TestResult:
    """Single test result"""
    test_name: str
    success: bool
    response_time_ms: float
    status_code: int = 200
    error: str = None
    timestamp: datetime = None

@dataclass  
class LoadTestResults:
    """Load test results summary"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    avg_response_time_ms: float
    min_response_time_ms: float
    max_response_time_ms: float
    p95_response_time_ms: float
    p99_response_time_ms: float
    requests_per_second: float
    error_rate: float
    memory_usage_mb: float
    cpu_usage_percent: float
    test_duration_seconds: float

class PerformanceTester:
    """Performance testing suite for concurrent user scenarios"""
    
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.auth_token = None
        self.results: List[TestResult] = []
        
    async def setup_auth(self):
        """Setup authentication for tests"""
        try:
            async with aiohttp.ClientSession() as session:
                # Try dev bypass token first
                self.auth_token = "dev-bypass-token"
                
                # Test auth
                async with session.get(
                    f"{self.base_url}/api/v1/auth/me",
                    headers={"Authorization": f"Bearer {self.auth_token}"}
                ) as response:
                    if response.status == 200:
                        logger.info("✅ Authentication setup successful (dev bypass)")
                        return
                
                # If dev bypass fails, try to register/login
                test_user = {
                    "email": f"test_user_{int(time.time())}@example.com",
                    "password": "test_password_123",
                    "shop_name": "Performance Test Shop"
                }
                
                async with session.post(
                    f"{self.base_url}/api/v1/auth/register",
                    json=test_user
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        self.auth_token = data["access_token"]
                        logger.info("✅ Test user registered and authenticated")
                    else:
                        logger.warning("⚠️ Auth setup failed, using dev token")
                        self.auth_token = "dev-bypass-token"
                        
        except Exception as e:
            logger.warning(f"⚠️ Auth setup error: {e}, using dev token")
            self.auth_token = "dev-bypass-token"
    
    async def single_request_test(self, session: aiohttp.ClientSession, 
                                endpoint: str, method: str = "GET", 
                                json_data: Dict = None) -> TestResult:
        """Execute a single request and measure performance"""
        start_time = time.time()
        test_name = f"{method} {endpoint}"
        
        try:
            headers = {}
            if self.auth_token:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            
            request_kwargs = {
                "headers": headers,
                "timeout": aiohttp.ClientTimeout(total=30)
            }
            
            if json_data:
                request_kwargs["json"] = json_data
            
            async with session.request(
                method, 
                f"{self.base_url}{endpoint}", 
                **request_kwargs
            ) as response:
                # Ensure we read the response to complete the request
                await response.text()
                
                response_time = (time.time() - start_time) * 1000
                
                return TestResult(
                    test_name=test_name,
                    success=response.status < 400,
                    response_time_ms=response_time,
                    status_code=response.status,
                    timestamp=datetime.now()
                )
                
        except Exception as e:
            response_time = (time.time() - start_time) * 1000
            return TestResult(
                test_name=test_name,
                success=False,
                response_time_ms=response_time,
                error=str(e),
                timestamp=datetime.now()
            )
    
    async def concurrent_users_test(self, num_users: int = 50, 
                                  requests_per_user: int = 10) -> LoadTestResults:
        """Test system with concurrent users"""
        logger.info(f"🚀 Starting concurrent users test: {num_users} users, {requests_per_user} requests each")
        
        # Test endpoints with different priorities
        test_endpoints = [
            ("/health", "GET", None),
            ("/api/v1/dashboard/stats", "GET", None),
            ("/api/v1/agents", "GET", None),
            ("/api/v1/chat", "POST", {
                "message": "How is my business performing?",
                "agent_id": "business_coach",
                "session_id": f"test_session_{int(time.time())}"
            }),
            ("/api/v1/settings/barbershop", "GET", None),
        ]
        
        start_time = time.time()
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024
        
        # Create connector with connection pooling
        connector = aiohttp.TCPConnector(
            limit=100,  # Pool size
            limit_per_host=50,
            ttl_dns_cache=300,
            use_dns_cache=True,
        )
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # Create tasks for concurrent users
            tasks = []
            
            for user_id in range(num_users):
                for request_num in range(requests_per_user):
                    # Distribute requests across different endpoints
                    endpoint, method, json_data = test_endpoints[request_num % len(test_endpoints)]
                    
                    task = asyncio.create_task(
                        self.single_request_test(session, endpoint, method, json_data)
                    )
                    tasks.append(task)
            
            # Execute all requests concurrently
            logger.info(f"📊 Executing {len(tasks)} concurrent requests...")
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions and convert to TestResult objects
            valid_results = []
            for result in results:
                if isinstance(result, TestResult):
                    valid_results.append(result)
                elif isinstance(result, Exception):
                    valid_results.append(TestResult(
                        test_name="exception",
                        success=False,
                        response_time_ms=0,
                        error=str(result)
                    ))
        
        # Calculate performance metrics
        test_duration = time.time() - start_time
        final_memory = psutil.Process().memory_info().rss / 1024 / 1024
        cpu_usage = psutil.Process().cpu_percent()
        
        successful_results = [r for r in valid_results if r.success]
        failed_results = [r for r in valid_results if not r.success]
        
        if successful_results:
            response_times = [r.response_time_ms for r in successful_results]
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
            p99_response_time = statistics.quantiles(response_times, n=100)[98] # 99th percentile
        else:
            avg_response_time = min_response_time = max_response_time = 0
            p95_response_time = p99_response_time = 0
        
        return LoadTestResults(
            total_requests=len(valid_results),
            successful_requests=len(successful_results),
            failed_requests=len(failed_results),
            avg_response_time_ms=avg_response_time,
            min_response_time_ms=min_response_time,
            max_response_time_ms=max_response_time,
            p95_response_time_ms=p95_response_time,
            p99_response_time_ms=p99_response_time,
            requests_per_second=len(valid_results) / test_duration,
            error_rate=len(failed_results) / len(valid_results),
            memory_usage_mb=final_memory - initial_memory,
            cpu_usage_percent=cpu_usage,
            test_duration_seconds=test_duration
        )
    
    async def memory_stress_test(self, duration_minutes: int = 5) -> Dict[str, Any]:
        """Test memory usage under sustained load"""
        logger.info(f"🧠 Starting memory stress test for {duration_minutes} minutes...")
        
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        memory_samples = []
        process = psutil.Process()
        
        connector = aiohttp.TCPConnector(limit=20)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # Continuous request loop
            request_count = 0
            
            while time.time() < end_time:
                # Make rapid AI chat requests to stress memory
                chat_requests = [
                    self.single_request_test(
                        session, 
                        "/api/v1/chat", 
                        "POST", 
                        {
                            "message": f"Test message {request_count + i} - analyze my business performance and provide detailed insights about revenue, customers, and growth opportunities.",
                            "agent_id": "business_coach",
                            "session_id": f"stress_session_{request_count}"
                        }
                    ) for i in range(10)  # 10 concurrent requests
                ]
                
                # Execute batch
                await asyncio.gather(*chat_requests, return_exceptions=True)
                request_count += 10
                
                # Sample memory usage
                memory_mb = process.memory_info().rss / 1024 / 1024
                memory_samples.append({
                    'timestamp': time.time(),
                    'memory_mb': memory_mb,
                    'request_count': request_count
                })
                
                # Brief pause to prevent overwhelming
                await asyncio.sleep(1)
        
        # Analyze memory growth
        if len(memory_samples) >= 2:
            initial_memory = memory_samples[0]['memory_mb']
            final_memory = memory_samples[-1]['memory_mb']
            max_memory = max(sample['memory_mb'] for sample in memory_samples)
            
            # Calculate memory growth rate
            memory_growth = final_memory - initial_memory
            memory_growth_rate = memory_growth / duration_minutes  # MB per minute
            
            # Detect potential memory leaks
            memory_leak_detected = memory_growth_rate > 10  # More than 10MB/min growth
            
        else:
            initial_memory = final_memory = max_memory = 0
            memory_growth = memory_growth_rate = 0
            memory_leak_detected = False
        
        return {
            'test_duration_minutes': duration_minutes,
            'total_requests': request_count,
            'initial_memory_mb': initial_memory,
            'final_memory_mb': final_memory,
            'max_memory_mb': max_memory,
            'memory_growth_mb': memory_growth,
            'memory_growth_rate_mb_per_minute': memory_growth_rate,
            'memory_leak_detected': memory_leak_detected,
            'memory_samples': memory_samples[-20:]  # Keep last 20 samples
        }
    
    async def database_performance_test(self) -> Dict[str, Any]:
        """Test database performance under load"""
        logger.info("💾 Starting database performance test...")
        
        connector = aiohttp.TCPConnector(limit=50)
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # Test database-heavy operations
            start_time = time.time()
            
            # Concurrent database operations
            db_tasks = []
            
            # User operations
            for i in range(20):
                db_tasks.append(
                    self.single_request_test(session, "/api/v1/auth/me", "GET")
                )
            
            # Settings operations
            for i in range(20):
                db_tasks.append(
                    self.single_request_test(session, "/api/v1/settings/barbershop", "GET")
                )
            
            # Chat history operations (database writes)
            for i in range(10):
                db_tasks.append(
                    self.single_request_test(
                        session, 
                        "/api/v1/chat", 
                        "POST", 
                        {
                            "message": f"Database test message {i}",
                            "agent_id": "business_coach",
                            "session_id": f"db_test_session_{i}"
                        }
                    )
                )
            
            # Execute all database operations concurrently
            results = await asyncio.gather(*db_tasks, return_exceptions=True)
            
            test_duration = time.time() - start_time
            
            # Analyze results
            valid_results = [r for r in results if isinstance(r, TestResult)]
            successful_results = [r for r in valid_results if r.success]
            
            if successful_results:
                response_times = [r.response_time_ms for r in successful_results]
                avg_db_response_time = statistics.mean(response_times)
            else:
                avg_db_response_time = 0
        
        return {
            'total_db_operations': len(valid_results),
            'successful_db_operations': len(successful_results),
            'avg_db_response_time_ms': avg_db_response_time,
            'db_operations_per_second': len(valid_results) / test_duration,
            'test_duration_seconds': test_duration
        }
    
    def generate_report(self, load_results: LoadTestResults, 
                       memory_results: Dict, db_results: Dict) -> Dict[str, Any]:
        """Generate comprehensive performance report"""
        
        # Determine performance grade
        grade = "A"
        issues = []
        
        # Check failure rate
        if load_results.error_rate > 0.05:  # 5% error threshold
            grade = "C" if load_results.error_rate > 0.25 else "B"
            issues.append(f"High error rate: {load_results.error_rate:.1%}")
        
        # Check response times
        if load_results.avg_response_time_ms > 2000:  # 2 second threshold
            grade = "C" if load_results.avg_response_time_ms > 5000 else "B"
            issues.append(f"Slow response times: {load_results.avg_response_time_ms:.0f}ms avg")
        
        # Check memory growth
        if memory_results.get('memory_leak_detected', False):
            grade = "C"
            issues.append(f"Potential memory leak: +{memory_results.get('memory_growth_rate_mb_per_minute', 0):.1f}MB/min")
        
        # Check memory usage
        if load_results.memory_usage_mb > 500:  # 500MB threshold
            if grade == "A":
                grade = "B"
            issues.append(f"High memory usage: +{load_results.memory_usage_mb:.0f}MB")
        
        return {
            'test_timestamp': datetime.now().isoformat(),
            'performance_grade': grade,
            'issues': issues,
            'load_test': asdict(load_results),
            'memory_test': memory_results,
            'database_test': db_results,
            'recommendations': self.generate_recommendations(load_results, memory_results, db_results),
            'system_info': {
                'python_version': f"{psutil.version_info}",
                'cpu_count': psutil.cpu_count(),
                'total_memory_gb': psutil.virtual_memory().total / 1024**3,
                'available_memory_gb': psutil.virtual_memory().available / 1024**3
            }
        }
    
    def generate_recommendations(self, load_results: LoadTestResults, 
                               memory_results: Dict, db_results: Dict) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        if load_results.error_rate > 0.01:
            recommendations.append("Investigate error causes and improve error handling")
        
        if load_results.avg_response_time_ms > 1000:
            recommendations.append("Optimize slow endpoints and database queries")
        
        if memory_results.get('memory_growth_rate_mb_per_minute', 0) > 5:
            recommendations.append("Review memory management and implement more aggressive cleanup")
        
        if db_results.get('avg_db_response_time_ms', 0) > 100:
            recommendations.append("Optimize database queries and consider connection pooling")
        
        if load_results.requests_per_second < 100:
            recommendations.append("Consider horizontal scaling or connection pooling improvements")
        
        if not recommendations:
            recommendations.append("Performance looks good! Consider monitoring under higher loads.")
        
        return recommendations

async def main():
    """Run comprehensive performance tests"""
    print("🚀 Starting 6FB AI Agent System Performance Tests")
    print("="*60)
    
    tester = PerformanceTester()
    
    try:
        # Setup authentication
        await tester.setup_auth()
        
        # Run test suite
        print("\n📊 Running concurrent users test (50 users, 10 requests each)...")
        load_results = await tester.concurrent_users_test(num_users=50, requests_per_user=10)
        
        print("\n🧠 Running memory stress test (3 minutes)...")
        memory_results = await tester.memory_stress_test(duration_minutes=3)
        
        print("\n💾 Running database performance test...")
        db_results = await tester.database_performance_test()
        
        # Generate report
        report = tester.generate_report(load_results, memory_results, db_results)
        
        # Display results
        print("\n" + "="*60)
        print("📋 PERFORMANCE TEST REPORT")
        print("="*60)
        
        print(f"🏆 Overall Grade: {report['performance_grade']}")
        print(f"📅 Test Time: {report['test_timestamp']}")
        
        print(f"\n📈 Load Test Results:")
        print(f"  • Total Requests: {load_results.total_requests}")
        print(f"  • Success Rate: {(1-load_results.error_rate):.1%}")
        print(f"  • Avg Response Time: {load_results.avg_response_time_ms:.0f}ms")
        print(f"  • 95th Percentile: {load_results.p95_response_time_ms:.0f}ms")
        print(f"  • Requests/Second: {load_results.requests_per_second:.1f}")
        print(f"  • Memory Growth: +{load_results.memory_usage_mb:.0f}MB")
        
        print(f"\n🧠 Memory Test Results:")
        print(f"  • Test Duration: {memory_results['test_duration_minutes']} minutes")
        print(f"  • Memory Growth: +{memory_results['memory_growth_mb']:.0f}MB")
        print(f"  • Growth Rate: {memory_results['memory_growth_rate_mb_per_minute']:.1f}MB/min")
        print(f"  • Leak Detected: {'⚠️ YES' if memory_results['memory_leak_detected'] else '✅ NO'}")
        
        print(f"\n💾 Database Test Results:")
        print(f"  • Avg DB Response: {db_results['avg_db_response_time_ms']:.0f}ms")
        print(f"  • DB Operations/sec: {db_results['db_operations_per_second']:.1f}")
        
        if report['issues']:
            print(f"\n⚠️ Issues Found:")
            for issue in report['issues']:
                print(f"  • {issue}")
        
        print(f"\n💡 Recommendations:")
        for rec in report['recommendations']:
            print(f"  • {rec}")
        
        # Save report to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"performance_report_{timestamp}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"\n📄 Full report saved: {report_file}")
        
        # Determine if tests passed
        if report['performance_grade'] in ['A', 'B']:
            print(f"\n✅ Performance tests PASSED (Grade: {report['performance_grade']})")
            return True
        else:
            print(f"\n❌ Performance tests FAILED (Grade: {report['performance_grade']})")
            return False
    
    except Exception as e:
        print(f"\n❌ Performance tests failed with error: {e}")
        logger.error(f"Test error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)