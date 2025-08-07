#!/usr/bin/env python3
"""
Performance and Load Testing Suite for FastAPI Backend
Tests concurrent requests, response times, memory usage, and scalability
"""

import asyncio
import aiohttp
import time
import statistics
import psutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import json

class PerformanceLoadTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results = {
            "load_tests": {},
            "performance_metrics": {},
            "resource_usage": {},
            "stress_tests": {},
            "timestamp": datetime.now().isoformat()
        }
        
    async def single_request_test(self, session, endpoint, method="GET", data=None, headers=None):
        """Single request with timing"""
        start_time = time.time()
        
        try:
            if method.upper() == "GET":
                async with session.get(f"{self.base_url}{endpoint}", headers=headers) as response:
                    await response.text()
                    return {
                        "status": response.status,
                        "response_time": (time.time() - start_time) * 1000,
                        "success": response.status < 400
                    }
            elif method.upper() == "POST":
                async with session.post(f"{self.base_url}{endpoint}", json=data, headers=headers) as response:
                    await response.text()
                    return {
                        "status": response.status,
                        "response_time": (time.time() - start_time) * 1000,
                        "success": response.status < 400
                    }
        except Exception as e:
            return {
                "status": 0,
                "response_time": (time.time() - start_time) * 1000,
                "success": False,
                "error": str(e)
            }
    
    async def concurrent_load_test(self, endpoint, concurrent_users=10, requests_per_user=5, method="GET", data=None):
        """Test concurrent load on endpoint"""
        print(f"🔄 Load testing {method} {endpoint} with {concurrent_users} concurrent users, {requests_per_user} requests each")
        
        headers = {"Authorization": "Bearer dev-bypass-token"} if endpoint.startswith("/api/v1/") else None
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            # Create tasks for all requests
            for user in range(concurrent_users):
                for request in range(requests_per_user):
                    task = self.single_request_test(session, endpoint, method, data, headers)
                    tasks.append(task)
            
            # Execute all requests concurrently
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time
            
            # Process results
            successful_requests = [r for r in results if isinstance(r, dict) and r.get("success", False)]
            failed_requests = [r for r in results if isinstance(r, dict) and not r.get("success", False)]
            error_requests = [r for r in results if isinstance(r, Exception)]
            
            response_times = [r["response_time"] for r in successful_requests]
            
            test_result = {
                "total_requests": len(tasks),
                "successful_requests": len(successful_requests),
                "failed_requests": len(failed_requests),
                "error_requests": len(error_requests),
                "success_rate": len(successful_requests) / len(tasks) * 100,
                "total_time_seconds": total_time,
                "requests_per_second": len(tasks) / total_time,
                "response_times": {
                    "min_ms": min(response_times) if response_times else 0,
                    "max_ms": max(response_times) if response_times else 0,
                    "avg_ms": statistics.mean(response_times) if response_times else 0,
                    "median_ms": statistics.median(response_times) if response_times else 0,
                    "p95_ms": self.percentile(response_times, 95) if response_times else 0,
                    "p99_ms": self.percentile(response_times, 99) if response_times else 0
                }
            }
            
            print(f"✅ {test_result['success_rate']:.1f}% success rate, {test_result['requests_per_second']:.2f} RPS, {test_result['response_times']['avg_ms']:.2f}ms avg")
            
            return test_result
    
    def percentile(self, data, percentile):
        """Calculate percentile"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)
        if index == int(index):
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def monitor_system_resources(self, duration_seconds=10):
        """Monitor system resource usage during tests"""
        print(f"📊 Monitoring system resources for {duration_seconds} seconds...")
        
        cpu_usage = []
        memory_usage = []
        
        start_time = time.time()
        while time.time() - start_time < duration_seconds:
            cpu_usage.append(psutil.cpu_percent(interval=0.1))
            memory_usage.append(psutil.virtual_memory().percent)
            time.sleep(0.5)
        
        return {
            "cpu_usage": {
                "avg_percent": statistics.mean(cpu_usage),
                "max_percent": max(cpu_usage),
                "min_percent": min(cpu_usage)
            },
            "memory_usage": {
                "avg_percent": statistics.mean(memory_usage),
                "max_percent": max(memory_usage),
                "min_percent": min(memory_usage)
            },
            "duration_seconds": duration_seconds
        }
    
    async def stress_test_endpoints(self):
        """Stress test key endpoints with increasing load"""
        print("\n💥 Running Stress Tests...")
        
        endpoints_to_test = [
            ("/health", "GET", None),
            ("/api/v1/agents", "GET", None),
            ("/api/v1/dashboard/stats", "GET", None),
            ("/api/v1/ai/provider-status", "GET", None)
        ]
        
        stress_levels = [5, 10, 20, 50]  # Concurrent users
        
        for endpoint, method, data in endpoints_to_test:
            endpoint_results = {}
            
            for stress_level in stress_levels:
                print(f"🔥 Stress testing {endpoint} with {stress_level} concurrent users")
                
                result = await self.concurrent_load_test(
                    endpoint=endpoint,
                    concurrent_users=stress_level,
                    requests_per_user=3,
                    method=method,
                    data=data
                )
                
                endpoint_results[f"{stress_level}_users"] = result
                
                # Break if success rate drops below 90%
                if result["success_rate"] < 90:
                    print(f"⚠️ Success rate dropped to {result['success_rate']:.1f}% at {stress_level} users")
                    break
                    
                # Small delay between stress levels
                await asyncio.sleep(1)
            
            self.results["stress_tests"][endpoint] = endpoint_results
    
    async def run_comprehensive_performance_tests(self):
        """Run all performance tests"""
        print("🚀 Comprehensive Performance and Load Testing Suite")
        print("=" * 60)
        
        # 1. Baseline performance test
        print("\n📏 Baseline Performance Tests...")
        
        baseline_endpoints = [
            ("/health", "GET"),
            ("/", "GET"),
            ("/api/v1/agents", "GET"),
            ("/api/v1/dashboard/stats", "GET"),
            ("/api/v1/ai/provider-status", "GET")
        ]
        
        for endpoint, method in baseline_endpoints:
            result = await self.concurrent_load_test(
                endpoint=endpoint,
                concurrent_users=1,
                requests_per_user=10,
                method=method
            )
            self.results["performance_metrics"][f"baseline_{endpoint.replace('/', '_')}"] = result
        
        # 2. Moderate load tests
        print("\n⚡ Moderate Load Tests...")
        
        moderate_load_endpoints = [
            ("/health", "GET"),
            ("/api/v1/agents", "GET"),
            ("/api/v1/dashboard/stats", "GET")
        ]
        
        for endpoint, method in moderate_load_endpoints:
            result = await self.concurrent_load_test(
                endpoint=endpoint,
                concurrent_users=10,
                requests_per_user=5,
                method=method
            )
            self.results["load_tests"][f"moderate_{endpoint.replace('/', '_')}"] = result
        
        # 3. Resource monitoring during load
        print("\n📊 Resource Monitoring During Load...")
        
        # Start resource monitoring in background
        resource_monitor = threading.Thread(
            target=lambda: self.results["resource_usage"].update(
                self.monitor_system_resources(duration_seconds=15)
            )
        )
        resource_monitor.start()
        
        # Run load test while monitoring
        await self.concurrent_load_test(
            endpoint="/api/v1/agents",
            concurrent_users=15,
            requests_per_user=10,
            method="GET"
        )
        
        resource_monitor.join()
        
        # 4. Stress tests
        await self.stress_test_endpoints()
        
        # 5. Complex endpoint tests
        print("\n🧠 Complex Endpoint Tests...")
        
        complex_tests = [
            ("/api/v1/ai/enhanced-chat", "POST", {
                "message": "How to improve barbershop revenue?",
                "session_id": "test-session"
            }),
            ("/api/v1/business/recommendations/generate", "POST", {
                "business_context": {"barbershop_id": "test-shop"},
                "force_refresh": True
            })
        ]
        
        for endpoint, method, data in complex_tests:
            result = await self.concurrent_load_test(
                endpoint=endpoint,
                concurrent_users=5,
                requests_per_user=3,
                method=method,
                data=data
            )
            self.results["load_tests"][f"complex_{endpoint.replace('/', '_')}"] = result
    
    def generate_performance_report(self):
        """Generate comprehensive performance report"""
        print("\n📊 PERFORMANCE TEST SUMMARY")
        print("=" * 50)
        
        # Overall statistics
        total_tests = len(self.results["performance_metrics"]) + len(self.results["load_tests"])
        
        # Calculate average response times
        all_response_times = []
        for test_category in ["performance_metrics", "load_tests"]:
            for test_name, test_data in self.results[test_category].items():
                if "response_times" in test_data and "avg_ms" in test_data["response_times"]:
                    all_response_times.append(test_data["response_times"]["avg_ms"])
        
        avg_response_time = statistics.mean(all_response_times) if all_response_times else 0
        
        # Success rates
        success_rates = []
        for test_category in ["performance_metrics", "load_tests"]:
            for test_name, test_data in self.results[test_category].items():
                if "success_rate" in test_data:
                    success_rates.append(test_data["success_rate"])
        
        avg_success_rate = statistics.mean(success_rates) if success_rates else 0
        
        print(f"Total Tests: {total_tests}")
        print(f"Average Response Time: {avg_response_time:.2f}ms")
        print(f"Average Success Rate: {avg_success_rate:.1f}%")
        
        # Resource usage
        if self.results["resource_usage"]:
            cpu_data = self.results["resource_usage"]["cpu_usage"]
            memory_data = self.results["resource_usage"]["memory_usage"]
            print(f"CPU Usage: {cpu_data['avg_percent']:.1f}% avg (max: {cpu_data['max_percent']:.1f}%)")
            print(f"Memory Usage: {memory_data['avg_percent']:.1f}% avg (max: {memory_data['max_percent']:.1f}%)")
        
        # Performance recommendations
        recommendations = []
        
        if avg_response_time > 1000:
            recommendations.append("⚠️ High average response time - consider optimization")
        elif avg_response_time < 200:
            recommendations.append("✅ Excellent response times")
        
        if avg_success_rate < 95:
            recommendations.append("⚠️ Low success rate - investigate errors")
        elif avg_success_rate >= 99:
            recommendations.append("✅ Excellent reliability")
        
        if self.results["resource_usage"]:
            if self.results["resource_usage"]["cpu_usage"]["max_percent"] > 80:
                recommendations.append("⚠️ High CPU usage during load - may need scaling")
            if self.results["resource_usage"]["memory_usage"]["max_percent"] > 80:
                recommendations.append("⚠️ High memory usage - check for memory leaks")
        
        if recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for rec in recommendations:
                print(f"  {rec}")
        
        # Save detailed results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"performance_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n💾 Detailed results saved to: {filename}")
        
        return self.results

async def main():
    """Run performance and load tests"""
    tester = PerformanceLoadTester()
    
    # Check if backend is accessible
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8001/health", timeout=5) as response:
                if response.status != 200:
                    print(f"❌ Backend health check failed: {response.status}")
                    return
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return
    
    print("✅ Backend is accessible")
    
    # Run comprehensive tests
    await tester.run_comprehensive_performance_tests()
    
    # Generate report
    tester.generate_performance_report()
    
    print("\n🎉 Performance testing complete!")

if __name__ == "__main__":
    asyncio.run(main())