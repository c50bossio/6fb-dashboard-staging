#!/usr/bin/env python3
"""
Comprehensive FastAPI Backend Testing Suite for 6FB AI Agent System
Tests all endpoints, validates responses, checks performance, and analyzes security
"""

import asyncio
import json
import time
import requests
import sqlite3
import os
import sys
from datetime import datetime
from typing import Dict, List, Any, Optional
import traceback
from concurrent.futures import ThreadPoolExecutor
import statistics

class BackendTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results = {
            "summary": {},
            "endpoint_tests": {},
            "database_tests": {},
            "ai_service_tests": {},
            "performance_tests": {},
            "security_tests": {},
            "errors": []
        }
        self.auth_token = None
        self.test_user_data = {
            "email": "test@barbershop.com",
            "password": "testpassword123",
            "shop_name": "Test Barbershop"
        }
        
    def log_result(self, test_name: str, success: bool, details: Any = None, error: str = None):
        """Log test result with timestamp"""
        result = {
            "timestamp": datetime.now().isoformat(),
            "success": success,
            "details": details,
            "error": error,
            "duration_ms": getattr(self, '_test_start_time', 0)
        }
        
        if hasattr(self, '_test_start_time'):
            result["duration_ms"] = (time.time() - self._test_start_time) * 1000
            
        self.test_results["endpoint_tests"][test_name] = result
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details if success else error}")
        
        if error:
            self.test_results["errors"].append({
                "test": test_name,
                "error": error,
                "timestamp": datetime.now().isoformat()
            })
    
    def start_test_timer(self):
        """Start timing a test"""
        self._test_start_time = time.time()
    
    def test_endpoint(self, method: str, endpoint: str, data: Dict = None, 
                     headers: Dict = None, expected_status: int = 200,
                     test_name: str = None) -> Optional[Dict]:
        """Generic endpoint testing method"""
        if not test_name:
            test_name = f"{method.upper()} {endpoint}"
            
        self.start_test_timer()
        
        try:
            url = f"{self.base_url}{endpoint}"
            
            if headers and self.auth_token:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            elif self.auth_token:
                headers = {"Authorization": f"Bearer {self.auth_token}"}
                
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers, timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers, timeout=10)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers, timeout=10)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            # Check status code
            if response.status_code != expected_status:
                self.log_result(test_name, False, 
                              error=f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return None
            
            # Try to parse JSON response
            try:
                response_data = response.json()
                self.log_result(test_name, True, 
                              details=f"Status: {response.status_code}, Response keys: {list(response_data.keys()) if isinstance(response_data, dict) else 'Non-dict response'}")
                return response_data
            except json.JSONDecodeError:
                # Non-JSON response is OK for some endpoints
                self.log_result(test_name, True, 
                              details=f"Status: {response.status_code}, Non-JSON response: {response.text[:100]}")
                return {"raw_response": response.text}
            
        except requests.exceptions.Timeout:
            self.log_result(test_name, False, error="Request timeout (10s)")
            return None
        except requests.exceptions.ConnectionError:
            self.log_result(test_name, False, error="Connection error - is the server running?")
            return None
        except Exception as e:
            self.log_result(test_name, False, error=f"Unexpected error: {str(e)}")
            return None
    
    def test_authentication_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # Test user registration
        register_data = self.test_endpoint(
            "POST", "/api/v1/auth/register", 
            data=self.test_user_data,
            test_name="User Registration"
        )
        
        if register_data and "access_token" in register_data:
            self.auth_token = register_data["access_token"]
            print(f"✅ Got auth token: {self.auth_token[:20]}...")
        
        # Test user login (alternative authentication)
        login_data = self.test_endpoint(
            "POST", "/api/v1/auth/login",
            data={"email": self.test_user_data["email"], "password": self.test_user_data["password"]},
            test_name="User Login"
        )
        
        if login_data and "access_token" in login_data:
            self.auth_token = login_data["access_token"]
        
        # Test getting current user
        self.test_endpoint("GET", "/api/v1/auth/me", test_name="Get Current User")
        
        # Test logout
        self.test_endpoint("POST", "/api/v1/auth/logout", test_name="User Logout")
    
    def test_core_endpoints(self):
        """Test all core API endpoints"""
        print("\n🌐 Testing Core API Endpoints...")
        
        # Root and health endpoints
        self.test_endpoint("GET", "/", test_name="Root Endpoint")
        self.test_endpoint("GET", "/health", test_name="Health Check")
        self.test_endpoint("GET", "/api/v1/health", test_name="Detailed Health Check")
        
        # Agent endpoints
        self.test_endpoint("GET", "/api/v1/agents", test_name="Get Available Agents")
        
        # Chat endpoint
        self.test_endpoint("POST", "/api/v1/chat", 
                          data={"message": "How can I improve my barbershop revenue?", "agent_id": "business_coach"},
                          test_name="AI Chat Endpoint")
        
        # Dashboard endpoints
        self.test_endpoint("GET", "/api/v1/dashboard/stats", test_name="Dashboard Statistics")
        self.test_endpoint("GET", "/api/v1/dashboard/recent-bookings", test_name="Recent Bookings")
        
        # Database endpoints
        self.test_endpoint("GET", "/api/v1/database/health", test_name="Database Health")
        self.test_endpoint("GET", "/api/v1/database/stats", test_name="Database Statistics")
        self.test_endpoint("GET", "/api/v1/database/info", test_name="Database Information")
    
    def test_agentic_coach_endpoints(self):
        """Test AI Agentic Coach endpoints"""
        print("\n🤖 Testing Agentic Coach Endpoints...")
        
        # Test coach chat
        coach_request = {
            "message": "How can I increase customer retention?",
            "shop_context": {"type": "traditional", "location": "urban"},
            "session_id": "test-session-123"
        }
        self.test_endpoint("POST", "/api/v1/agentic-coach/chat", 
                          data=coach_request, test_name="Agentic Coach Chat")
        
        # Test shop context update
        context_data = {
            "shop_type": "modern",
            "location": "suburban",
            "staff_count": 3,
            "services": ["haircut", "beard_trim", "styling"]
        }
        self.test_endpoint("PUT", "/api/v1/agentic-coach/shop-context",
                          data=context_data, test_name="Update Shop Context")
        
        # Test conversation history
        self.test_endpoint("GET", "/api/v1/agentic-coach/conversation-history/test-session-123",
                          test_name="Get Conversation History")
        
        # Test learning insights
        self.test_endpoint("GET", "/api/v1/agentic-coach/learning-insights",
                          test_name="Get Learning Insights")
    
    def test_settings_endpoints(self):
        """Test settings management endpoints"""
        print("\n⚙️ Testing Settings Endpoints...")
        
        # Test barbershop settings
        barbershop_settings = {
            "barbershop": {
                "name": "Test Elite Barbershop",
                "address": "123 Test Street, Test City",
                "phone": "+1-555-TEST",
                "email": "test@barbershop.com"
            },
            "notifications": {
                "emailEnabled": True,
                "smsEnabled": False,
                "campaignAlerts": True
            }
        }
        
        self.test_endpoint("POST", "/api/v1/settings/barbershop",
                          data=barbershop_settings, test_name="Save Barbershop Settings")
        
        self.test_endpoint("GET", "/api/v1/settings/barbershop",
                          test_name="Get Barbershop Settings")
        
        # Test notification settings
        notification_settings = {
            "emailEnabled": True,
            "smsEnabled": True,
            "campaignAlerts": False,
            "bookingAlerts": True
        }
        
        self.test_endpoint("PUT", "/api/v1/settings/notifications",
                          data=notification_settings, test_name="Save Notification Settings")
        
        self.test_endpoint("GET", "/api/v1/settings/notifications",
                          test_name="Get Notification Settings")
        
        # Test business hours settings
        business_hours = {
            "monday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "tuesday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "wednesday": {"enabled": False, "shifts": []},
            "saturday": {"enabled": True, "shifts": [{"open": "10:00", "close": "16:00"}]}
        }
        
        self.test_endpoint("PUT", "/api/v1/settings/business-hours",
                          data=business_hours, test_name="Save Business Hours")
        
        self.test_endpoint("GET", "/api/v1/settings/business-hours",
                          test_name="Get Business Hours")
    
    def test_notification_endpoints(self):
        """Test notification system endpoints"""
        print("\n📧 Testing Notification Endpoints...")
        
        # Test notification sending
        test_notification = {
            "type": "email",
            "recipient": self.test_user_data["email"],
            "subject": "Test Notification",
            "content": "This is a test notification from the API testing suite."
        }
        
        self.test_endpoint("POST", "/api/v1/notifications/send",
                          data=test_notification, test_name="Send Notification")
        
        # Test notification testing
        self.test_endpoint("POST", "/api/v1/notifications/test",
                          data={"type": "email"}, test_name="Test Email Notification")
        
        # Test notification history
        self.test_endpoint("GET", "/api/v1/notifications/history",
                          test_name="Get Notification History")
        
        # Test notification queue
        queue_notification = {
            "type": "sms",
            "recipient": "+1234567890",
            "content": "Test queued SMS notification",
            "priority": 5
        }
        
        self.test_endpoint("POST", "/api/v1/notifications/queue",
                          data=queue_notification, test_name="Queue Notification")
        
        # Test queue status
        self.test_endpoint("GET", "/api/v1/notifications/queue/status",
                          test_name="Get Queue Status")
    
    def test_billing_endpoints(self):
        """Test billing and usage endpoints"""
        print("\n💰 Testing Billing Endpoints...")
        
        self.test_endpoint("GET", "/api/v1/billing/current", test_name="Get Current Billing")
        self.test_endpoint("GET", "/api/v1/billing/history", test_name="Get Billing History")
    
    def test_ai_orchestrator_endpoints(self):
        """Test AI Orchestrator and advanced AI endpoints"""
        print("\n🧠 Testing AI Orchestrator Endpoints...")
        
        # Test enhanced AI chat
        enhanced_chat_request = {
            "message": "Analyze my barbershop's performance and suggest improvements",
            "session_id": "test-enhanced-session",
            "business_context": {
                "shop_type": "premium",
                "monthly_revenue": 15000,
                "customer_count": 200
            }
        }
        
        self.test_endpoint("POST", "/api/v1/ai/enhanced-chat",
                          data=enhanced_chat_request, test_name="Enhanced AI Chat")
        
        # Test AI provider status
        self.test_endpoint("GET", "/api/v1/ai/provider-status", test_name="AI Provider Status")
        
        # Test agent system status
        self.test_endpoint("GET", "/api/v1/ai/agents/status", test_name="Agent System Status")
        
        # Test AI insights
        self.test_endpoint("GET", "/api/v1/ai/insights", test_name="Get AI Insights")
        
        insight_request = {
            "user_id": "test-user",
            "business_context": {"shop_type": "modern", "location": "urban"},
            "force_refresh": True
        }
        
        self.test_endpoint("POST", "/api/v1/ai/insights/generate",
                          data=insight_request, test_name="Generate AI Insights")
    
    def test_predictive_analytics_endpoints(self):
        """Test predictive analytics endpoints"""
        print("\n📊 Testing Predictive Analytics Endpoints...")
        
        # Test predictive analytics
        self.test_endpoint("GET", "/api/v1/ai/predictive",
                          test_name="Get Predictive Analytics")
        
        # Test predictive forecast generation
        forecast_request = {
            "user_id": "test-user",
            "forecast_type": "comprehensive",
            "business_context": {"monthly_bookings": 150, "average_service_price": 35},
            "time_horizon": "weekly"
        }
        
        self.test_endpoint("POST", "/api/v1/ai/predictive/generate",
                          data=forecast_request, test_name="Generate Predictive Forecast")
        
        # Test predictive dashboard
        self.test_endpoint("GET", "/api/v1/ai/predictive/dashboard/test-barbershop",
                          test_name="Get Predictive Dashboard")
    
    def test_business_recommendations_endpoints(self):
        """Test business recommendations engine endpoints"""
        print("\n💼 Testing Business Recommendations Endpoints...")
        
        # Test recommendations generation
        recommendations_request = {
            "business_context": {
                "barbershop_id": "test-barbershop",
                "monthly_revenue": 12000,
                "customer_retention_rate": 0.75,
                "average_service_price": 32
            },
            "force_refresh": True,
            "user_id": "test-user"
        }
        
        self.test_endpoint("POST", "/api/v1/business/recommendations/generate",
                          data=recommendations_request, test_name="Generate Business Recommendations")
        
        # Test recommendations engine status
        self.test_endpoint("GET", "/api/v1/business/recommendations/status",
                          test_name="Get Recommendations Engine Status")
        
        # Test enhanced recommendations
        enhanced_request = {
            "barbershop_id": "test-barbershop",
            "analysis_type": "comprehensive",
            "enhanced_ai": True
        }
        
        self.test_endpoint("POST", "/api/business-recommendations/generate",
                          data=enhanced_request, test_name="Generate Enhanced Recommendations")
    
    def test_performance_monitoring_endpoints(self):
        """Test AI performance monitoring endpoints"""
        print("\n⚡ Testing Performance Monitoring Endpoints...")
        
        # Test real-time metrics
        self.test_endpoint("GET", "/api/v1/ai/performance/realtime",
                          test_name="Get Real-time Performance Metrics")
        
        # Test performance report
        self.test_endpoint("GET", "/api/v1/ai/performance/report",
                          test_name="Get System Performance Report")
        
        # Test monitoring system status
        self.test_endpoint("GET", "/api/v1/ai/performance/status",
                          test_name="Get Monitoring System Status")
        
        # Test component health
        self.test_endpoint("GET", "/api/v1/ai/performance/component/ai_orchestrator",
                          test_name="Get Component Health")
        
        # Test recording performance metric
        metric_request = {
            "component": "test_component",
            "metric": "response_time",
            "value": 1.23,
            "metadata": {"test": True}
        }
        
        self.test_endpoint("POST", "/api/v1/ai/performance/record",
                          data=metric_request, test_name="Record Performance Metric")
    
    def test_knowledge_base_endpoints(self):
        """Test enhanced knowledge base endpoints"""
        print("\n📚 Testing Knowledge Base Endpoints...")
        
        # Test knowledge status
        self.test_endpoint("GET", "/api/v1/knowledge/enhanced/status",
                          test_name="Get Knowledge Base Status")
        
        # Test knowledge search
        search_request = {
            "query": "How to increase customer retention in barbershops",
            "domains": ["customer_service", "marketing"],
            "business_context": {"shop_type": "premium"}
        }
        
        self.test_endpoint("POST", "/api/v1/knowledge/enhanced/search",
                          data=search_request, test_name="Search Knowledge Base")
        
        # Test contextual insights
        insights_request = {
            "query": "Best practices for barbershop marketing",
            "context": {"location": "urban", "target_audience": "young_professionals"}
        }
        
        self.test_endpoint("POST", "/api/v1/knowledge/enhanced/insights",
                          data=insights_request, test_name="Get Contextual Insights")
        
        # Test contextual search
        contextual_search_request = {
            "query": "Revenue optimization strategies",
            "context": {"shop_size": "medium", "current_revenue": 10000},
            "user_role": "shop_owner",
            "preferred_domains": ["financial_management", "business_strategy"]
        }
        
        self.test_endpoint("POST", "/api/v1/knowledge/enhanced/contextual-search",
                          data=contextual_search_request, test_name="Enhanced Contextual Search")
    
    def test_database_operations(self):
        """Test database connectivity and operations"""
        print("\n🗄️ Testing Database Operations...")
        
        try:
            db_path = "/Users/bossio/6FB AI Agent System/data/agent_system.db"
            
            if not os.path.exists(db_path):
                self.test_results["database_tests"]["database_file_exists"] = {
                    "success": False,
                    "error": f"Database file not found at {db_path}"
                }
                print(f"❌ Database file not found at {db_path}")
                return
            
            # Test database connection
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            
            # Test table existence
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = [row[0] for row in cursor.fetchall()]
            
            expected_tables = ["users", "sessions", "chat_history", "agents", "shop_profiles"]
            
            for table in expected_tables:
                if table in tables:
                    self.test_results["database_tests"][f"table_{table}_exists"] = {"success": True}
                    print(f"✅ Table {table} exists")
                else:
                    self.test_results["database_tests"][f"table_{table}_exists"] = {
                        "success": False, 
                        "error": f"Table {table} missing"
                    }
                    print(f"❌ Table {table} missing")
            
            # Test table structures
            for table in tables:
                cursor = conn.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                self.test_results["database_tests"][f"table_{table}_structure"] = {
                    "success": True,
                    "columns": [dict(col) for col in columns]
                }
                print(f"✅ Table {table} has {len(columns)} columns")
            
            # Test basic operations
            cursor = conn.execute("SELECT COUNT(*) FROM users")
            user_count = cursor.fetchone()[0]
            self.test_results["database_tests"]["user_count"] = {
                "success": True,
                "count": user_count
            }
            print(f"✅ Database has {user_count} users")
            
            conn.close()
            
        except Exception as e:
            error_msg = f"Database test error: {str(e)}"
            self.test_results["database_tests"]["connection_error"] = {
                "success": False,
                "error": error_msg
            }
            print(f"❌ {error_msg}")
    
    def test_ai_services_integration(self):
        """Test AI services integration and availability"""
        print("\n🤖 Testing AI Services Integration...")
        
        ai_services = [
            ("AI Orchestrator", "/api/v1/ai/provider-status"),
            ("Business Recommendations", "/api/v1/business/recommendations/status"),
            ("Performance Monitoring", "/api/v1/ai/performance/status"),
            ("Knowledge Base", "/api/v1/knowledge/enhanced/status")
        ]
        
        for service_name, endpoint in ai_services:
            response = self.test_endpoint("GET", endpoint, test_name=f"{service_name} Status")
            
            if response:
                self.test_results["ai_service_tests"][service_name.lower().replace(" ", "_")] = {
                    "success": True,
                    "status": response.get("success", False),
                    "details": response
                }
            else:
                self.test_results["ai_service_tests"][service_name.lower().replace(" ", "_")] = {
                    "success": False,
                    "error": "Service not responding"
                }
    
    def test_performance_benchmarks(self):
        """Test API performance under various conditions"""
        print("\n⚡ Testing Performance Benchmarks...")
        
        # Test response times for key endpoints
        key_endpoints = [
            ("GET", "/health"),
            ("GET", "/api/v1/agents"),
            ("GET", "/api/v1/dashboard/stats"),
            ("POST", "/api/v1/chat", {"message": "Quick test", "agent_id": "business_coach"})
        ]
        
        for method, endpoint, *data in key_endpoints:
            response_times = []
            
            for i in range(5):  # Test 5 times
                start_time = time.time()
                
                if method == "GET":
                    response = self.session.get(f"{self.base_url}{endpoint}", 
                                              headers={"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else None,
                                              timeout=10)
                else:
                    response = self.session.post(f"{self.base_url}{endpoint}", 
                                               json=data[0] if data else None,
                                               headers={"Authorization": f"Bearer {self.auth_token}"} if self.auth_token else None,
                                               timeout=10)
                
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                response_times.append(response_time)
            
            avg_response_time = statistics.mean(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)
            
            self.test_results["performance_tests"][f"{method}_{endpoint.replace('/', '_')}"] = {
                "avg_response_time_ms": avg_response_time,
                "min_response_time_ms": min_response_time,
                "max_response_time_ms": max_response_time,
                "all_response_times": response_times,
                "success": avg_response_time < 5000  # Fail if average > 5 seconds
            }
            
            status = "✅" if avg_response_time < 1000 else "⚠️" if avg_response_time < 5000 else "❌"
            print(f"{status} {method} {endpoint}: {avg_response_time:.2f}ms avg ({min_response_time:.2f}ms - {max_response_time:.2f}ms)")
    
    def test_error_handling(self):
        """Test error handling and edge cases"""
        print("\n🚨 Testing Error Handling...")
        
        # Test invalid endpoints
        self.test_endpoint("GET", "/api/v1/nonexistent", expected_status=404, test_name="Invalid Endpoint")
        
        # Test malformed requests
        self.test_endpoint("POST", "/api/v1/chat", data="invalid json string", expected_status=422, test_name="Malformed JSON Request")
        
        # Test missing required fields
        self.test_endpoint("POST", "/api/v1/auth/login", data={}, expected_status=422, test_name="Missing Login Fields")
        
        # Test invalid authentication
        old_token = self.auth_token
        self.auth_token = "invalid-token-123"
        self.test_endpoint("GET", "/api/v1/auth/me", expected_status=401, test_name="Invalid Authentication Token")
        self.auth_token = old_token
        
        # Test rate limiting (if implemented)
        # Note: This might be commented out to avoid triggering actual rate limits during testing
        """
        print("Testing rate limiting...")
        for i in range(20):
            response = self.session.get(f"{self.base_url}/health")
            if response.status_code == 429:
                print(f"✅ Rate limiting triggered after {i+1} requests")
                break
        """
    
    def generate_comprehensive_report(self):
        """Generate comprehensive test report"""
        print("\n📊 Generating Comprehensive Report...")
        
        # Calculate summary statistics
        total_tests = len(self.test_results["endpoint_tests"])
        passed_tests = sum(1 for result in self.test_results["endpoint_tests"].values() if result["success"])
        failed_tests = total_tests - passed_tests
        
        # Database test statistics
        db_tests = len(self.test_results["database_tests"])
        db_passed = sum(1 for result in self.test_results["database_tests"].values() if result["success"])
        
        # AI service statistics
        ai_tests = len(self.test_results["ai_service_tests"])
        ai_passed = sum(1 for result in self.test_results["ai_service_tests"].values() if result["success"])
        
        # Performance statistics
        perf_tests = len(self.test_results["performance_tests"])
        fast_responses = sum(1 for result in self.test_results["performance_tests"].values() 
                           if result["avg_response_time_ms"] < 1000)
        
        self.test_results["summary"] = {
            "test_timestamp": datetime.now().isoformat(),
            "total_endpoint_tests": total_tests,
            "passed_endpoint_tests": passed_tests,
            "failed_endpoint_tests": failed_tests,
            "endpoint_success_rate": (passed_tests / total_tests * 100) if total_tests > 0 else 0,
            "database_tests": db_tests,
            "database_passed": db_passed,
            "ai_service_tests": ai_tests,
            "ai_services_passed": ai_passed,
            "performance_tests": perf_tests,
            "fast_responses": fast_responses,
            "total_errors": len(self.test_results["errors"]),
            "backend_status": "HEALTHY" if (passed_tests / total_tests) > 0.8 else "NEEDS_ATTENTION"
        }
        
        return self.test_results
    
    def run_comprehensive_test_suite(self):
        """Run all tests in the comprehensive suite"""
        print("🚀 Starting Comprehensive FastAPI Backend Testing Suite")
        print("=" * 60)
        
        try:
            # Core functionality tests
            self.test_authentication_flow()
            self.test_core_endpoints()
            self.test_agentic_coach_endpoints()
            self.test_settings_endpoints()
            self.test_notification_endpoints()
            self.test_billing_endpoints()
            
            # Advanced AI tests
            self.test_ai_orchestrator_endpoints()
            self.test_predictive_analytics_endpoints()
            self.test_business_recommendations_endpoints()
            self.test_performance_monitoring_endpoints()
            self.test_knowledge_base_endpoints()
            
            # Infrastructure tests
            self.test_database_operations()
            self.test_ai_services_integration()
            self.test_performance_benchmarks()
            self.test_error_handling()
            
            # Generate final report
            final_report = self.generate_comprehensive_report()
            
            print("\n📋 COMPREHENSIVE TEST SUMMARY")
            print("=" * 60)
            print(f"Total Endpoint Tests: {final_report['summary']['total_endpoint_tests']}")
            print(f"Passed: {final_report['summary']['passed_endpoint_tests']} ({final_report['summary']['endpoint_success_rate']:.1f}%)")
            print(f"Failed: {final_report['summary']['failed_endpoint_tests']}")
            print(f"Database Tests: {final_report['summary']['database_passed']}/{final_report['summary']['database_tests']}")
            print(f"AI Services: {final_report['summary']['ai_services_passed']}/{final_report['summary']['ai_service_tests']}")
            print(f"Fast Responses: {final_report['summary']['fast_responses']}/{final_report['summary']['performance_tests']}")
            print(f"Backend Status: {final_report['summary']['backend_status']}")
            
            if final_report['summary']['total_errors'] > 0:
                print(f"\n⚠️ {final_report['summary']['total_errors']} ERRORS DETECTED:")
                for error in self.test_results["errors"][-5:]:  # Show last 5 errors
                    print(f"  - {error['test']}: {error['error']}")
            
            return final_report
            
        except KeyboardInterrupt:
            print("\n\n⏹️ Testing interrupted by user")
            return self.generate_comprehensive_report()
        except Exception as e:
            print(f"\n❌ Fatal error during testing: {str(e)}")
            traceback.print_exc()
            return self.generate_comprehensive_report()

def main():
    """Main function to run the comprehensive backend test suite"""
    tester = BackendTester()
    
    # Check if backend is running
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ FastAPI backend is running and accessible")
        else:
            print(f"⚠️ Backend responded with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to FastAPI backend at localhost:8001")
        print("Please ensure the backend is running with: python fastapi_backend.py")
        return
    
    # Run comprehensive test suite
    results = tester.run_comprehensive_test_suite()
    
    # Save results to file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"backend_test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print(f"\n💾 Detailed results saved to: {results_file}")
    print("🎉 Comprehensive backend testing complete!")

if __name__ == "__main__":
    main()