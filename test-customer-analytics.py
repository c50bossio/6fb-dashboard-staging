#!/usr/bin/env python3
"""
Customer Analytics API Test Script
Tests all customer analytics endpoints for functionality and performance
"""

import asyncio
import json
import time
import requests
from datetime import datetime, timedelta
import sys
import os

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Test configuration
FASTAPI_URL = os.getenv('FASTAPI_URL', 'http://localhost:8001')
NEXTJS_URL = os.getenv('NEXTJS_URL', 'http://localhost:9999')

# Test data
TEST_BARBERSHOP_ID = "test-barbershop-id"
TEST_CUSTOMER_ID = "test-customer-id"
TEST_AUTH_TOKEN = "Bearer test-token"  # Replace with actual token for real testing

class CustomerAnalyticsTestSuite:
    """Comprehensive test suite for customer analytics endpoints"""
    
    def __init__(self):
        self.fastapi_url = FASTAPI_URL
        self.nextjs_url = NEXTJS_URL
        self.headers = {
            'Authorization': TEST_AUTH_TOKEN,
            'Content-Type': 'application/json'
        }
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_time: float = 0):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            'test_name': test_name,
            'success': success,
            'details': details,
            'response_time': response_time,
            'timestamp': datetime.now().isoformat()
        })
        print(f"{status} {test_name} ({response_time:.3f}s) - {details}")
    
    def test_endpoint(self, method: str, url: str, test_name: str, data: dict = None, params: dict = None):
        """Generic endpoint testing method"""
        try:
            start_time = time.time()
            
            if method.upper() == 'GET':
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == 'POST':
                response = requests.post(url, headers=self.headers, json=data, params=params, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    self.log_test(test_name, True, f"Status: {response.status_code}", response_time)
                    return response_data
                except json.JSONDecodeError:
                    self.log_test(test_name, False, f"Invalid JSON response", response_time)
                    return None
            else:
                self.log_test(test_name, False, f"HTTP {response.status_code}: {response.text[:100]}", response_time)
                return None
                
        except requests.exceptions.RequestException as e:
            self.log_test(test_name, False, f"Request failed: {str(e)}")
            return None
        except Exception as e:
            self.log_test(test_name, False, f"Unexpected error: {str(e)}")
            return None
    
    def test_fastapi_health_scores(self):
        """Test FastAPI health scores endpoints"""
        print("\n🧪 Testing FastAPI Health Scores Endpoints")
        
        # Test GET health scores
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-health-scores",
            "FastAPI GET Health Scores",
            params={'limit': 10, 'include_trends': True}
        )
        
        # Test POST calculate health scores
        self.test_endpoint(
            'POST',
            f"{self.fastapi_url}/customer-health-scores/calculate",
            "FastAPI Calculate Health Scores",
            data={'force_recalculate': True}
        )
    
    def test_fastapi_clv(self):
        """Test FastAPI CLV endpoints"""
        print("\n🧪 Testing FastAPI CLV Endpoints")
        
        # Test GET CLV
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-clv",
            "FastAPI GET CLV",
            params={'limit': 10, 'sort_by': 'total_clv'}
        )
        
        # Test POST calculate CLV
        self.test_endpoint(
            'POST',
            f"{self.fastapi_url}/customer-clv/calculate",
            "FastAPI Calculate CLV",
            data={},
            params={'calculation_method': 'predictive_ml'}
        )
    
    def test_fastapi_churn(self):
        """Test FastAPI churn prediction endpoints"""
        print("\n🧪 Testing FastAPI Churn Prediction Endpoints")
        
        # Test GET churn predictions
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-churn-risk",
            "FastAPI GET Churn Risk",
            params={'limit': 10, 'days_ahead': 90}
        )
        
        # Test POST predict churn
        self.test_endpoint(
            'POST',
            f"{self.fastapi_url}/customer-churn-risk/predict",
            "FastAPI Predict Churn",
            data={},
            params={'model_name': 'enhanced_churn_model_v2'}
        )
    
    def test_fastapi_segments(self):
        """Test FastAPI customer segments endpoints"""
        print("\n🧪 Testing FastAPI Customer Segments Endpoints")
        
        # Test GET segments
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-segments",
            "FastAPI GET Customer Segments",
            params={'include_metrics': True}
        )
        
        # Test POST calculate segments
        segment_data = {
            'segment_name': 'Test High Value Customers',
            'segment_type': 'value',
            'segmentation_rules': {
                'conditions': [
                    {'field': 'total_spent', 'operator': '>=', 'value': 500}
                ],
                'logic': 'AND'
            },
            'auto_update': True
        }
        
        self.test_endpoint(
            'POST',
            f"{self.fastapi_url}/customer-segments/calculate",
            "FastAPI Calculate Customer Segments",
            data=segment_data
        )
    
    def test_fastapi_cohorts(self):
        """Test FastAPI customer cohorts endpoints"""
        print("\n🧪 Testing FastAPI Customer Cohorts Endpoints")
        
        # Test GET cohorts
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-cohorts",
            "FastAPI GET Customer Cohorts",
            params={'include_performance': True}
        )
    
    def test_fastapi_journey(self):
        """Test FastAPI customer journey endpoints"""
        print("\n🧪 Testing FastAPI Customer Journey Endpoints")
        
        # Test GET customer journey
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-journey/{TEST_CUSTOMER_ID}",
            "FastAPI GET Customer Journey",
            params={
                'include_events': True,
                'include_touchpoints': True,
                'include_milestones': True,
                'days_back': 365
            }
        )
    
    def test_fastapi_insights(self):
        """Test FastAPI analytics insights endpoints"""
        print("\n🧪 Testing FastAPI Analytics Insights Endpoints")
        
        # Test GET insights
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/customer-analytics/insights",
            "FastAPI GET Analytics Insights",
            params={'insight_type': 'summary', 'time_period': 'month'}
        )
        
        # Test POST refresh analytics
        refresh_data = {
            'refresh_type': 'health_scores',
            'force_refresh': False
        }
        
        self.test_endpoint(
            'POST',
            f"{self.fastapi_url}/customer-analytics/refresh",
            "FastAPI Refresh Analytics",
            data=refresh_data
        )
    
    def test_fastapi_health_check(self):
        """Test FastAPI health check endpoint"""
        print("\n🧪 Testing FastAPI Health Check")
        
        self.test_endpoint(
            'GET',
            f"{self.fastapi_url}/health",
            "FastAPI Health Check"
        )
    
    def test_nextjs_endpoints(self):
        """Test Next.js API routes"""
        print("\n🧪 Testing Next.js API Routes")
        
        # Test health scores
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/health-scores",
            "Next.js Health Scores",
            params={'limit': 5}
        )
        
        # Test CLV
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/clv",
            "Next.js CLV",
            params={'limit': 5}
        )
        
        # Test churn predictions
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/churn",
            "Next.js Churn Risk",
            params={'limit': 5}
        )
        
        # Test segments
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/segments",
            "Next.js Customer Segments"
        )
        
        # Test cohorts
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/cohorts",
            "Next.js Customer Cohorts"
        )
        
        # Test journey
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/journey",
            "Next.js Customer Journey",
            params={'customer_id': TEST_CUSTOMER_ID}
        )
        
        # Test insights
        self.test_endpoint(
            'GET',
            f"{self.nextjs_url}/api/customers/analytics/insights",
            "Next.js Analytics Insights",
            params={'insight_type': 'summary'}
        )
    
    def test_performance_benchmarks(self):
        """Test performance benchmarks"""
        print("\n🧪 Testing Performance Benchmarks")
        
        # Test multiple concurrent requests
        start_time = time.time()
        endpoints = [
            f"{self.fastapi_url}/customer-health-scores?limit=50",
            f"{self.fastapi_url}/customer-clv?limit=50",
            f"{self.fastapi_url}/customer-churn-risk?limit=50",
            f"{self.fastapi_url}/customer-segments",
            f"{self.fastapi_url}/customer-cohorts"
        ]
        
        successful_requests = 0
        for endpoint in endpoints:
            try:
                response = requests.get(endpoint, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    successful_requests += 1
            except:
                pass
        
        total_time = time.time() - start_time
        
        if successful_requests >= len(endpoints) * 0.8:  # 80% success rate
            self.log_test(
                "Performance Benchmark", 
                True, 
                f"{successful_requests}/{len(endpoints)} requests successful", 
                total_time
            )
        else:
            self.log_test(
                "Performance Benchmark", 
                False, 
                f"Only {successful_requests}/{len(endpoints)} requests successful", 
                total_time
            )
    
    def test_error_handling(self):
        """Test error handling scenarios"""
        print("\n🧪 Testing Error Handling")
        
        # Test invalid authentication
        invalid_headers = {'Authorization': 'Bearer invalid-token', 'Content-Type': 'application/json'}
        
        try:
            response = requests.get(
                f"{self.fastapi_url}/customer-health-scores",
                headers=invalid_headers,
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_test("Invalid Auth Handling", True, "Correctly returned 401")
            else:
                self.log_test("Invalid Auth Handling", False, f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Auth Handling", False, f"Unexpected error: {str(e)}")
        
        # Test invalid customer ID
        try:
            response = requests.get(
                f"{self.fastapi_url}/customer-journey/invalid-customer-id",
                headers=self.headers,
                timeout=10
            )
            
            # Should handle gracefully (either 404 or empty data)
            if response.status_code in [200, 404]:
                self.log_test("Invalid Customer ID Handling", True, f"Status: {response.status_code}")
            else:
                self.log_test("Invalid Customer ID Handling", False, f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Customer ID Handling", False, f"Unexpected error: {str(e)}")
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Customer Analytics API Test Suite")
        print(f"FastAPI URL: {self.fastapi_url}")
        print(f"Next.js URL: {self.nextjs_url}")
        print("=" * 60)
        
        # FastAPI endpoint tests
        self.test_fastapi_health_check()
        self.test_fastapi_health_scores()
        self.test_fastapi_clv()
        self.test_fastapi_churn()
        self.test_fastapi_segments()
        self.test_fastapi_cohorts()
        self.test_fastapi_journey()
        self.test_fastapi_insights()
        
        # Next.js API route tests
        self.test_nextjs_endpoints()
        
        # Performance and error handling tests
        self.test_performance_benchmarks()
        self.test_error_handling()
        
        # Generate summary report
        self.generate_summary_report()
    
    def generate_summary_report(self):
        """Generate and display test summary report"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY REPORT")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t['success']])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Average response time
        response_times = [t['response_time'] for t in self.test_results if t['response_time'] > 0]
        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            print(f"Average Response Time: {avg_response_time:.3f}s")
        
        # Failed tests details
        if failed_tests > 0:
            print(f"\n❌ Failed Tests:")
            for test in self.test_results:
                if not test['success']:
                    print(f"  - {test['test_name']}: {test['details']}")
        
        # Performance insights
        slow_tests = [t for t in self.test_results if t['response_time'] > 5.0 and t['success']]
        if slow_tests:
            print(f"\n⚠️ Slow Tests (>5s):")
            for test in slow_tests:
                print(f"  - {test['test_name']}: {test['response_time']:.3f}s")
        
        print("\n" + "=" * 60)
        
        # Save detailed report to file
        report_filename = f"customer_analytics_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_filename, 'w') as f:
            json.dump({
                'summary': {
                    'total_tests': total_tests,
                    'passed_tests': passed_tests,
                    'failed_tests': failed_tests,
                    'success_rate': (passed_tests/total_tests)*100,
                    'average_response_time': avg_response_time if response_times else 0,
                    'test_timestamp': datetime.now().isoformat()
                },
                'detailed_results': self.test_results
            }, f, indent=2)
        
        print(f"📄 Detailed report saved to: {report_filename}")

def main():
    """Main test execution function"""
    print("🔧 Customer Analytics API Test Suite")
    print("=" * 60)
    
    # Check if services are running
    test_suite = CustomerAnalyticsTestSuite()
    
    try:
        # Quick connectivity check
        fastapi_response = requests.get(f"{FASTAPI_URL}/health", timeout=5)
        print(f"✅ FastAPI service accessible (Status: {fastapi_response.status_code})")
    except:
        print(f"❌ FastAPI service not accessible at {FASTAPI_URL}")
        print("   Make sure FastAPI backend is running on port 8001")
    
    try:
        nextjs_response = requests.get(f"{NEXTJS_URL}/api/health", timeout=5)
        print(f"✅ Next.js service accessible")
    except:
        print(f"⚠️ Next.js service not accessible at {NEXTJS_URL}")
        print("   Make sure Next.js frontend is running on port 9999")
    
    print("\n🏃‍♂️ Running comprehensive test suite...")
    test_suite.run_all_tests()
    
    return test_suite.test_results

if __name__ == "__main__":
    main()