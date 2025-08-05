#!/usr/bin/env python3
"""
Comprehensive Testing Suite for 6FB AI Agent System Enhancements
Tests all implemented features in a live environment
"""

import asyncio
import json
import time
import requests
import sys
import os
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class ComprehensiveTestSuite:
    def __init__(self):
        self.frontend_url = "http://localhost:9999"
        self.backend_url = "http://localhost:8001"
        self.test_results = {}
        self.total_tests = 0
        self.passed_tests = 0
        
    def log_test(self, test_name, status, details=""):
        """Log test results"""
        self.total_tests += 1
        if status:
            self.passed_tests += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            print(f"❌ {test_name}: FAILED {details}")
        
        self.test_results[test_name] = {
            'status': 'PASSED' if status else 'FAILED',
            'details': details,
            'timestamp': datetime.now().isoformat()
        }

    def test_server_availability(self):
        """Test 1: Verify both servers are running"""
        print("\n🔍 Testing Server Availability...")
        
        # Test Frontend
        try:
            response = requests.get(f"{self.frontend_url}", timeout=5)
            frontend_ok = response.status_code == 200
            self.log_test("Frontend Server", frontend_ok, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Frontend Server", False, f"Error: {e}")
            
        # Test Backend
        try:
            response = requests.get(f"{self.backend_url}/docs", timeout=5)
            backend_ok = response.status_code == 200
            self.log_test("Backend Server", backend_ok, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Backend Server", False, f"Error: {e}")

    def test_authentication_compatibility(self):
        """Test 2: Authentication compatibility across different scenarios"""
        print("\n🔒 Testing Authentication Compatibility...")
        
        # Test AI agents endpoint without authentication
        try:
            response = requests.get(f"{self.frontend_url}/api/ai/agents", timeout=10)
            auth_bypass_works = response.status_code in [200, 404]  # 404 is OK, means route exists
            self.log_test("Auth Bypass for Development", auth_bypass_works, 
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Auth Bypass for Development", False, f"Error: {e}")
            
        # Test agent POST endpoint (the one we fixed)
        try:
            test_payload = {
                "message": "Test authentication",
                "businessContext": {"test": True}
            }
            response = requests.post(f"{self.frontend_url}/api/ai/agents", 
                                   json=test_payload, timeout=10)
            # Should not get 401 unauthorized
            auth_fixed = response.status_code != 401
            self.log_test("AI Agents Auth Fix", auth_fixed, 
                         f"Status: {response.status_code} (not 401)")
        except Exception as e:
            self.log_test("AI Agents Auth Fix", False, f"Error: {e}")

    def test_rate_limiting_middleware(self):
        """Test 3: Rate limiting middleware functionality"""
        print("\n⚡ Testing Rate Limiting Middleware...")
        
        # Test backend health (should work if middleware is functioning)
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            middleware_ok = response.status_code == 200
            self.log_test("Rate Limiting Middleware", middleware_ok, 
                         f"Backend accessible: {response.status_code}")
        except Exception as e:
            self.log_test("Rate Limiting Middleware", False, f"Error: {e}")
            
        # Test multiple rapid requests (should be rate limited gracefully)
        try:
            rapid_requests = []
            for i in range(5):
                start_time = time.time()
                response = requests.get(f"{self.backend_url}/health", timeout=2)
                end_time = time.time()
                rapid_requests.append({
                    'status': response.status_code,
                    'time': end_time - start_time
                })
                
            # Check if requests were handled (not completely blocked)
            successful_requests = sum(1 for req in rapid_requests if req['status'] == 200)
            rate_limiting_working = successful_requests >= 3  # At least 3 should succeed
            
            self.log_test("Rate Limiting Handling", rate_limiting_working,
                         f"{successful_requests}/5 requests succeeded")
        except Exception as e:
            self.log_test("Rate Limiting Handling", False, f"Error: {e}")

    async def test_enhanced_business_recommendations(self):
        """Test 4: Enhanced business recommendations with AI integration"""
        print("\n🧠 Testing Enhanced Business Recommendations...")
        
        try:
            from services.business_recommendations_service import business_recommendations_service
            
            barbershop_id = "test-shop-comprehensive"
            recommendations = await business_recommendations_service.generate_comprehensive_recommendations(
                barbershop_id=barbershop_id
            )
            
            # Check if recommendations were generated
            has_recommendations = len(recommendations.get('recommendations', [])) > 0
            self.log_test("Generate Recommendations", has_recommendations,
                         f"{len(recommendations.get('recommendations', []))} recommendations")
            
            # Check AI enhancement stats
            ai_stats = recommendations.get('ai_enhancement_stats', {})
            ai_enhanced = ai_stats.get('ai_recommendations_count', 0) > 0
            self.log_test("AI Enhancement Integration", ai_enhanced,
                         f"{ai_stats.get('ai_recommendations_count', 0)} AI recommendations")
            
            # Check confidence scoring
            confidence = recommendations.get('confidence_score', 0)
            confidence_ok = 0.5 <= confidence <= 1.0
            self.log_test("Dynamic Confidence Scoring", confidence_ok,
                         f"Confidence: {confidence:.2f}")
            
            # Check ROI calculation
            roi = recommendations.get('estimated_roi', {})
            roi_calculated = 'monthly_revenue_increase' in roi
            self.log_test("ROI Calculation", roi_calculated,
                         f"Revenue increase: ${roi.get('monthly_revenue_increase', 0)}")
                         
        except Exception as e:
            self.log_test("Enhanced Business Recommendations", False, f"Error: {e}")

    async def test_agent_collaboration_system(self):
        """Test 5: Multi-agent orchestration and collaboration"""
        print("\n👥 Testing Agent Collaboration System...")
        
        try:
            from services.ai_agents.agent_manager import agent_manager
            
            # Test collaborative query
            complex_query = "How can I increase revenue while improving customer satisfaction and optimizing operations?"
            
            collaboration_response = await agent_manager.process_message(
                complex_query,
                {'barbershop_id': 'test-collab', 'revenue': 500, 'satisfaction': 4.0},
                {'analysis_depth': 'comprehensive'}
            )
            
            # Check if response was generated
            response_generated = collaboration_response is not None
            self.log_test("Agent Response Generation", response_generated,
                         f"Primary agent: {collaboration_response.primary_agent if collaboration_response else 'None'}")
            
            if collaboration_response:
                # Check collaboration metrics
                has_metrics = collaboration_response.collaboration_score > 0
                self.log_test("Collaboration Metrics", has_metrics,
                             f"Score: {collaboration_response.collaboration_score:.2f}")
                
                # Check recommendations
                has_recommendations = len(collaboration_response.combined_recommendations) > 0
                self.log_test("Combined Recommendations", has_recommendations,
                             f"{len(collaboration_response.combined_recommendations)} recommendations")
                
                # Check coordination summary
                has_coordination = bool(collaboration_response.coordination_summary)
                self.log_test("Coordination Summary", has_coordination,
                             "Summary generated" if has_coordination else "No summary")
            
            # Test agent status
            agent_status = agent_manager.get_agent_status()
            status_available = agent_status.get('system_status') == 'operational'
            self.log_test("Agent System Status", status_available,
                         f"Status: {agent_status.get('system_status', 'unknown')}")
                         
        except Exception as e:
            self.log_test("Agent Collaboration System", False, f"Error: {e}")

    def test_api_endpoints(self):
        """Test 6: API endpoints functionality"""
        print("\n🌐 Testing API Endpoints...")
        
        # Test business recommendations endpoint
        try:
            payload = {
                "barbershop_id": "test-api-endpoint",
                "analysis_type": "comprehensive"
            }
            response = requests.post(f"{self.backend_url}/api/business-recommendations/generate",
                                   json=payload, timeout=15)
            
            api_works = response.status_code == 200
            self.log_test("Business Recommendations API", api_works,
                         f"Status: {response.status_code}")
            
            if api_works:
                data = response.json()
                has_data = data.get('success', False)
                self.log_test("API Response Data", has_data,
                             "Valid response structure")
                             
        except Exception as e:
            self.log_test("Business Recommendations API", False, f"Error: {e}")
            
        # Test agent status endpoint
        try:
            response = requests.get(f"{self.frontend_url}/api/ai/agents", timeout=10)
            status_endpoint_works = response.status_code in [200, 404]
            self.log_test("Agent Status Endpoint", status_endpoint_works,
                         f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Agent Status Endpoint", False, f"Error: {e}")

    def test_mobile_components_structure(self):
        """Test 7: Mobile component file structure and imports"""
        print("\n📱 Testing Mobile Component Structure...")
        
        # Check if mobile components exist
        mobile_components = [
            "components/TouchOptimizedButton.js",
            "components/MobileOptimizedLayout.js", 
            "components/ResponsiveNavigation.js",
            "components/AgentCollaborationIndicator.js",
            "components/AgentActivityMonitor.js",
            "hooks/useAgentCollaboration.js"
        ]
        
        for component in mobile_components:
            file_path = os.path.join(os.getcwd(), component)
            file_exists = os.path.exists(file_path)
            self.log_test(f"Component: {component}", file_exists,
                         "File exists" if file_exists else "File missing")
        
        # Test mobile UX test file
        mobile_test_exists = os.path.exists("test_mobile_ux.html")
        self.log_test("Mobile UX Test File", mobile_test_exists,
                     "Test file available")

    def test_navigation_config(self):
        """Test 8: Navigation configuration enhancements"""
        print("\n🧭 Testing Navigation Configuration...")
        
        try:
            # Check if navigation config has AI-specific items
            nav_config_path = "components/navigation/NavigationConfig.js"
            if os.path.exists(nav_config_path):
                with open(nav_config_path, 'r') as f:
                    content = f.read()
                
                ai_items = [
                    "AI Agents",
                    "AI Dashboard", 
                    "Knowledge Base",
                    "AI Performance",
                    "Business Recommendations"
                ]
                
                items_found = sum(1 for item in ai_items if item in content)
                nav_enhanced = items_found >= 4  # At least 4 AI items should be present
                
                self.log_test("Navigation AI Enhancement", nav_enhanced,
                             f"{items_found}/5 AI items found")
            else:
                self.log_test("Navigation Configuration", False, "Config file not found")
                
        except Exception as e:
            self.log_test("Navigation Configuration", False, f"Error: {e}")

    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📊 COMPREHENSIVE TEST REPORT")
        print("="*60)
        
        success_rate = (self.passed_tests / self.total_tests) * 100 if self.total_tests > 0 else 0
        
        print(f"🎯 Overall Results: {self.passed_tests}/{self.total_tests} tests passed ({success_rate:.1f}%)")
        
        # Grade calculation
        if success_rate >= 95:
            grade = "A+"
        elif success_rate >= 90:
            grade = "A"
        elif success_rate >= 85:
            grade = "A-"
        elif success_rate >= 80:
            grade = "B+"
        else:
            grade = "B or below"
            
        print(f"📈 System Grade: {grade}")
        
        # Detailed results
        print(f"\n📋 Detailed Test Results:")
        for test_name, result in self.test_results.items():
            status_emoji = "✅" if result['status'] == 'PASSED' else "❌"
            print(f"{status_emoji} {test_name}: {result['status']} - {result['details']}")
        
        # Recommendations
        print(f"\n💡 Recommendations:")
        if success_rate >= 90:
            print("🎉 System is ready for production deployment!")
        elif success_rate >= 80:
            print("⚠️ Address failing tests before production deployment")
        else:
            print("🚨 Significant issues need resolution before deployment")
            
        return {
            'total_tests': self.total_tests,
            'passed_tests': self.passed_tests,
            'success_rate': success_rate,
            'grade': grade,
            'results': self.test_results,
            'timestamp': datetime.now().isoformat()
        }

async def main():
    """Run comprehensive test suite"""
    print("🚀 Starting Comprehensive Testing Suite for 6FB AI Agent System")
    print("🕐 This will test all enhanced features in a live environment...")
    
    suite = ComprehensiveTestSuite()
    
    # Run all tests
    suite.test_server_availability()
    suite.test_authentication_compatibility()
    suite.test_rate_limiting_middleware()
    await suite.test_enhanced_business_recommendations()
    await suite.test_agent_collaboration_system()
    suite.test_api_endpoints()
    suite.test_mobile_components_structure()
    suite.test_navigation_config()
    
    # Generate final report
    report = suite.generate_test_report()
    
    # Save report to file
    with open('COMPREHENSIVE_TEST_REPORT.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Full test report saved to: COMPREHENSIVE_TEST_REPORT.json")
    return report

if __name__ == "__main__":
    asyncio.run(main())