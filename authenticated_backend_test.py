#!/usr/bin/env python3
"""
Authenticated Backend Testing Suite with Development Bypass
Tests authenticated endpoints using the dev-bypass-token
"""

import requests
import json
import time
from datetime import datetime

class AuthenticatedBackendTester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        # Use the development bypass token
        self.session.headers.update({"Authorization": "Bearer dev-bypass-token"})
        self.test_results = {"authenticated_tests": {}, "errors": []}
        
    def test_endpoint(self, method: str, endpoint: str, data: dict = None, test_name: str = None):
        """Test endpoint with authentication"""
        if not test_name:
            test_name = f"{method.upper()} {endpoint}"
            
        try:
            start_time = time.time()
            
            if method.upper() == "GET":
                response = self.session.get(f"{self.base_url}{endpoint}", timeout=10)
            elif method.upper() == "POST":
                response = self.session.post(f"{self.base_url}{endpoint}", json=data, timeout=10)
            elif method.upper() == "PUT":
                response = self.session.put(f"{self.base_url}{endpoint}", json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            duration = (time.time() - start_time) * 1000
            
            result = {
                "status_code": response.status_code,
                "success": response.status_code < 400,
                "duration_ms": duration,
                "timestamp": datetime.now().isoformat()
            }
            
            try:
                result["response_data"] = response.json()
            except:
                result["response_text"] = response.text[:200]
                
            self.test_results["authenticated_tests"][test_name] = result
            
            status = "✅" if result["success"] else "❌"
            print(f"{status} {test_name}: {response.status_code} ({duration:.2f}ms)")
            
            if not result["success"]:
                self.test_results["errors"].append({
                    "test": test_name,
                    "status_code": response.status_code,
                    "error": response.text
                })
                
            return result
            
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {str(e)}")
            self.test_results["errors"].append({
                "test": test_name,
                "error": str(e)
            })
            return None
    
    def run_authenticated_tests(self):
        """Run comprehensive authenticated endpoint tests"""
        print("🔐 Testing Authenticated Endpoints with Development Bypass")
        print("=" * 60)
        
        # Test authentication endpoint first
        me_result = self.test_endpoint("GET", "/api/v1/auth/me", test_name="Authentication Test")
        if not me_result or not me_result["success"]:
            print("❌ Authentication failed - stopping tests")
            return
            
        print(f"✅ Authenticated as: {me_result.get('response_data', {}).get('email', 'Unknown')}")
        
        # Core authenticated endpoints
        print("\n🌐 Testing Core Authenticated Endpoints...")
        self.test_endpoint("POST", "/api/v1/chat", {
            "message": "How can I improve my barbershop revenue?",
            "agent_id": "business_coach"
        }, "AI Chat")
        
        self.test_endpoint("GET", "/api/v1/dashboard/stats", test_name="Dashboard Stats")
        self.test_endpoint("GET", "/api/v1/dashboard/recent-bookings", test_name="Recent Bookings")
        
        # Agentic Coach endpoints
        print("\n🤖 Testing Agentic Coach...")
        self.test_endpoint("POST", "/api/v1/agentic-coach/chat", {
            "message": "How can I increase customer retention?",
            "shop_context": {"type": "traditional", "location": "urban"},
            "session_id": "test-session"
        }, "Agentic Coach Chat")
        
        self.test_endpoint("PUT", "/api/v1/agentic-coach/shop-context", {
            "shop_type": "modern",
            "location": "suburban",
            "staff_count": 3
        }, "Update Shop Context")
        
        self.test_endpoint("GET", "/api/v1/agentic-coach/learning-insights", test_name="Learning Insights")
        
        # Settings endpoints
        print("\n⚙️ Testing Settings...")
        barbershop_settings = {
            "barbershop": {
                "name": "Test Elite Barbershop",
                "address": "123 Test Street",
                "phone": "+1-555-TEST",
                "email": "test@barbershop.com"
            }
        }
        
        self.test_endpoint("POST", "/api/v1/settings/barbershop", barbershop_settings, "Save Barbershop Settings")
        self.test_endpoint("GET", "/api/v1/settings/barbershop", test_name="Get Barbershop Settings")
        
        notification_settings = {
            "emailEnabled": True,
            "smsEnabled": True,
            "campaignAlerts": True
        }
        
        self.test_endpoint("PUT", "/api/v1/settings/notifications", notification_settings, "Save Notifications")
        self.test_endpoint("GET", "/api/v1/settings/notifications", test_name="Get Notifications")
        
        business_hours = {
            "monday": {"enabled": True, "shifts": [{"open": "09:00", "close": "18:00"}]},
            "saturday": {"enabled": True, "shifts": [{"open": "10:00", "close": "16:00"}]}
        }
        
        self.test_endpoint("PUT", "/api/v1/settings/business-hours", business_hours, "Save Business Hours")
        self.test_endpoint("GET", "/api/v1/settings/business-hours", test_name="Get Business Hours")
        
        # Notification system
        print("\n📧 Testing Notifications...")
        self.test_endpoint("GET", "/api/v1/notifications/history", test_name="Notification History")
        self.test_endpoint("GET", "/api/v1/notifications/queue/status", test_name="Queue Status")
        
        test_notification = {
            "type": "email",
            "recipient": "test@example.com",
            "subject": "Test",
            "content": "Test notification"
        }
        
        self.test_endpoint("POST", "/api/v1/notifications/send", test_notification, "Send Notification")
        self.test_endpoint("POST", "/api/v1/notifications/test", {"type": "email"}, "Test Email")
        
        # Billing endpoints
        print("\n💰 Testing Billing...")
        self.test_endpoint("GET", "/api/v1/billing/current", test_name="Current Billing")
        self.test_endpoint("GET", "/api/v1/billing/history", test_name="Billing History")
        
        # Generate summary
        self.generate_summary()
        
    def generate_summary(self):
        """Generate test summary"""
        total_tests = len(self.test_results["authenticated_tests"])
        passed_tests = sum(1 for r in self.test_results["authenticated_tests"].values() if r["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"\n📊 AUTHENTICATED TEST SUMMARY")
        print("=" * 40)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ({passed_tests/total_tests*100:.1f}%)")
        print(f"Failed: {failed_tests}")
        
        if self.test_results["errors"]:
            print(f"\n❌ FAILED TESTS ({len(self.test_results['errors'])}):")
            for error in self.test_results["errors"]:
                print(f"  - {error['test']}: {error.get('status_code', 'ERROR')}")
        
        # Calculate average response time
        response_times = [r["duration_ms"] for r in self.test_results["authenticated_tests"].values() if "duration_ms" in r]
        if response_times:
            avg_response = sum(response_times) / len(response_times)
            print(f"\n⚡ Performance: {avg_response:.2f}ms average response time")
            
        # Save results
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"authenticated_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2, default=str)
            
        print(f"\n💾 Results saved to: {filename}")

def main():
    """Run authenticated backend tests"""
    tester = AuthenticatedBackendTester()
    
    # Verify backend is running
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Backend health check failed: {response.status_code}")
            return
    except:
        print("❌ Cannot connect to backend at localhost:8001")
        return
        
    print("✅ Backend is running")
    tester.run_authenticated_tests()

if __name__ == "__main__":
    main()