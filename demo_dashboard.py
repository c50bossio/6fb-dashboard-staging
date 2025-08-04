#!/usr/bin/env python3
"""
6FB AI Agent System Dashboard Demonstration
Comprehensive testing of all key dashboard functionality
"""

import requests
import json
import time
import webbrowser
from datetime import datetime
import os

class DashboardDemo:
    def __init__(self):
        self.frontend_url = "http://localhost:9999"
        self.backend_url = "http://localhost:8001"
        self.results = []
        
    def log_result(self, test_name, status, details=""):
        """Log test results with timestamp"""
        result = {
            "test": test_name,
            "status": "✓ PASS" if status else "❌ FAIL",
            "details": details,
            "timestamp": datetime.now().strftime("%H:%M:%S")
        }
        self.results.append(result)
        print(f"[{result['timestamp']}] {result['status']} {test_name}")
        if details:
            print(f"    → {details}")
        print()

    def test_frontend_access(self):
        """Test 1: Homepage Access"""
        print("🌐 TESTING HOMEPAGE ACCESS")
        print("=" * 50)
        
        try:
            response = requests.get(f"{self.frontend_url}", timeout=10)
            if response.status_code == 200:
                # Check for key elements in the HTML
                html_content = response.text
                has_title = "6FB AI Agent System" in html_content
                has_dashboard = "Dashboard" in html_content
                has_ai_components = "AI" in html_content
                
                self.log_result(
                    "Homepage Loading", 
                    True, 
                    f"Status: {response.status_code}, Title: {has_title}, Dashboard: {has_dashboard}"
                )
                
                # Open in browser for visual verification
                webbrowser.open(self.frontend_url)
                self.log_result("Browser Launch", True, "Homepage opened in default browser")
                
            else:
                self.log_result("Homepage Loading", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Homepage Loading", False, str(e))

    def test_backend_health(self):
        """Test 2: Backend API Health"""
        print("🔧 TESTING BACKEND API HEALTH")
        print("=" * 50)
        
        try:
            response = requests.get(f"{self.backend_url}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                self.log_result(
                    "Backend Health Check", 
                    True, 
                    f"Service: {health_data.get('service')}, Version: {health_data.get('version')}"
                )
            else:
                self.log_result("Backend Health Check", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Backend Health Check", False, str(e))

    def test_api_endpoints(self):
        """Test 3: Key API Endpoints"""
        print("🔌 TESTING API ENDPOINTS")
        print("=" * 50)
        
        # Test health endpoint
        endpoints_to_test = [
            ("/health", "Health Check Endpoint"),
            ("/api/health", "Frontend Health Endpoint"),
        ]
        
        for endpoint, description in endpoints_to_test:
            try:
                if endpoint.startswith("/api"):
                    url = f"{self.frontend_url}{endpoint}"
                else:
                    url = f"{self.backend_url}{endpoint}"
                    
                response = requests.get(url, timeout=5)
                self.log_result(
                    description,
                    response.status_code == 200,
                    f"URL: {url}, Status: {response.status_code}"
                )
                
            except Exception as e:
                self.log_result(description, False, str(e))

    def test_dashboard_components(self):
        """Test 4: Dashboard Component Verification"""
        print("📊 TESTING DASHBOARD COMPONENTS")
        print("=" * 50)
        
        # Check if key component files exist
        component_files = [
            ("components/dashboard/DashboardHeader.js", "Dashboard Header Component"),
            ("components/dashboard/MetricsOverview.js", "Metrics Overview Component"),
            ("components/navigation/OrganizedNavigation.js", "Navigation Component"),
            ("components/layout/DashboardLayout.js", "Dashboard Layout Component"),
        ]
        
        base_path = "/Users/bossio/6FB AI Agent System"
        
        for file_path, description in component_files:
            full_path = os.path.join(base_path, file_path)
            exists = os.path.exists(full_path)
            
            if exists:
                try:
                    with open(full_path, 'r') as f:
                        content = f.read()
                        has_react = "React" in content or "react" in content
                        has_export = "export" in content
                        is_functional = has_react and has_export
                        
                    self.log_result(
                        description,
                        is_functional,
                        f"File exists: {exists}, React component: {is_functional}"
                    )
                except Exception as e:
                    self.log_result(description, False, f"Error reading file: {e}")
            else:
                self.log_result(description, False, "File not found")

    def test_authentication_flow(self):
        """Test 5: Authentication System"""
        print("🔐 TESTING AUTHENTICATION SYSTEM")
        print("=" * 50)
        
        # Test login page accessibility
        try:
            login_url = f"{self.frontend_url}/login"
            response = requests.get(login_url, timeout=10)
            
            if response.status_code == 200:
                html_content = response.text
                has_login_form = "login" in html_content.lower()
                has_auth_provider = "supabase" in html_content.lower() or "auth" in html_content.lower()
                
                self.log_result(
                    "Login Page Access",
                    True,
                    f"Status: {response.status_code}, Has login form: {has_login_form}"
                )
                
                # Open login page for visual verification
                webbrowser.open(login_url)
                self.log_result("Login Page Browser Launch", True, "Login page opened for manual testing")
                
            else:
                self.log_result("Login Page Access", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_result("Login Page Access", False, str(e))

    def test_navigation_structure(self):
        """Test 6: Navigation Structure"""
        print("🧭 TESTING NAVIGATION STRUCTURE")
        print("=" * 50)
        
        # Check navigation configuration
        nav_config_path = "/Users/bossio/6FB AI Agent System/components/navigation/NavigationConfig.js"
        
        if os.path.exists(nav_config_path):
            try:
                with open(nav_config_path, 'r') as f:
                    content = f.read()
                    
                # Check for key navigation categories
                categories = ["Overview", "AI Tools", "Business", "Platform", "Company"]
                found_categories = [cat for cat in categories if cat in content]
                
                self.log_result(
                    "Navigation Configuration",
                    len(found_categories) >= 3,
                    f"Found categories: {found_categories}"
                )
                
            except Exception as e:
                self.log_result("Navigation Configuration", False, str(e))
        else:
            self.log_result("Navigation Configuration", False, "Navigation config file not found")

    def test_ai_integration(self):
        """Test 7: AI Integration"""
        print("🤖 TESTING AI INTEGRATION")
        print("=" * 50)
        
        # Check for AI-related environment variables and configurations
        env_file_path = "/Users/bossio/6FB AI Agent System/.env.local"
        
        ai_indicators = []
        
        # Check if AI service files exist
        ai_files = [
            "services/ai_agents.py",
            "services/openai_service.py",
            "components/ai/",
        ]
        
        base_path = "/Users/bossio/6FB AI Agent System"
        
        for ai_file in ai_files:
            full_path = os.path.join(base_path, ai_file)
            if os.path.exists(full_path):
                ai_indicators.append(ai_file)
        
        self.log_result(
            "AI Integration Components",
            len(ai_indicators) > 0,
            f"Found AI components: {ai_indicators}"
        )

    def test_real_time_features(self):
        """Test 8: Real-time Features"""
        print("⚡ TESTING REAL-TIME FEATURES")
        print("=" * 50)
        
        # Check for WebSocket/Pusher configuration
        try:
            response = requests.get(f"{self.frontend_url}", timeout=5)
            html_content = response.text
            
            has_pusher = "pusher" in html_content.lower()
            has_websocket = "websocket" in html_content.lower()
            has_realtime = has_pusher or has_websocket
            
            self.log_result(
                "Real-time Configuration",
                has_realtime,
                f"Pusher: {has_pusher}, WebSocket: {has_websocket}"
            )
            
        except Exception as e:
            self.log_result("Real-time Configuration", False, str(e))

    def run_complete_demo(self):
        """Run the complete dashboard demonstration"""
        print("🚀 6FB AI AGENT SYSTEM DASHBOARD DEMONSTRATION")
        print("=" * 60)
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()
        
        # Run all tests
        self.test_frontend_access()
        time.sleep(1)
        
        self.test_backend_health()
        time.sleep(1)
        
        self.test_api_endpoints()
        time.sleep(1)
        
        self.test_dashboard_components()
        time.sleep(1)
        
        self.test_authentication_flow()
        time.sleep(2)  # Give time for browser to open
        
        self.test_navigation_structure()
        time.sleep(1)
        
        self.test_ai_integration()
        time.sleep(1)
        
        self.test_real_time_features()
        
        # Summary
        self.print_summary()

    def print_summary(self):
        """Print demonstration summary"""
        print("\n" + "=" * 60)
        print("📋 DEMONSTRATION SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.results if "✓ PASS" in result["status"])
        total = len(self.results)
        
        print(f"Tests Completed: {total}")
        print(f"Tests Passed: {passed}")
        print(f"Tests Failed: {total - passed}")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        print()
        
        print("🔍 DETAILED RESULTS:")
        print("-" * 40)
        
        for result in self.results:
            status_icon = "✓" if "PASS" in result["status"] else "❌"
            print(f"{status_icon} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print("\n" + "=" * 60)
        print("🎯 DEMONSTRATION COMPLETE!")
        print("=" * 60)
        
        # Provide manual testing instructions
        print("\n📱 MANUAL TESTING INSTRUCTIONS:")
        print("-" * 30)
        print("1. Browser windows have been opened automatically")
        print("2. Navigate to: http://localhost:9999")
        print("3. Click on different navigation items")
        print("4. Test the sidebar collapse/expand")
        print("5. Try the dev bypass authentication at /login")
        print("6. Explore the dashboard features")
        print("\n🔗 Key URLs:")
        print(f"   Homepage: {self.frontend_url}")
        print(f"   Login: {self.frontend_url}/login")
        print(f"   API Health: {self.backend_url}/health")


if __name__ == "__main__":
    demo = DashboardDemo()
    demo.run_complete_demo()