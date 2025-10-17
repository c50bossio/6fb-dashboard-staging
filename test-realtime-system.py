#!/usr/bin/env python3
"""
Real-time System Testing Script
Tests all WebSocket functionality and real-time features
"""

import asyncio
import json
import os
import sys
import time
import websockets
import requests
from datetime import datetime
from typing import List, Dict

# Test configuration
TEST_CONFIG = {
    'websocket_url': 'ws://localhost:8000',
    'api_base_url': 'http://localhost:8000',
    'test_user': {
        'email': 'test@6fb.ai',
        'password': 'testpass123',
        'shop_name': 'Test Barbershop'
    }
}

class RealtimeSystemTester:
    def __init__(self):
        self.session_token = None
        self.websocket = None
        self.test_results = []
        
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Real-time System Tests")
        print("=" * 50)
        
        try:
            # 1. Test basic connectivity
            await self.test_backend_startup()
            
            # 2. Test authentication
            await self.test_authentication()
            
            # 3. Test WebSocket connection
            await self.test_websocket_connection()
            
            # 4. Test AI chat functionality
            await self.test_ai_chat()
            
            # 5. Test real-time notifications
            await self.test_notifications()
            
            # 6. Test live data updates
            await self.test_live_data()
            
            # 7. Test booking updates
            await self.test_booking_updates()
            
            # 8. Test dashboard metrics
            await self.test_dashboard_metrics()
            
            # 9. Test error handling
            await self.test_error_handling()
            
            # 10. Test reconnection logic
            await self.test_reconnection()
            
        except Exception as e:
            self.test_results.append({
                'test': 'System Test Suite',
                'status': 'FAILED',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
        
        finally:
            if self.websocket:
                await self.websocket.close()
            
            # Print results
            self.print_test_results()
    
    def log_test(self, test_name: str, status: str, details: str = "", error: str = ""):
        """Log test result"""
        result = {
            'test': test_name,
            'status': status,
            'details': details,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status_icon = "✅" if status == "PASSED" else "❌" if status == "FAILED" else "⚠️"
        print(f"{status_icon} {test_name}: {status}")
        if details:
            print(f"   {details}")
        if error:
            print(f"   Error: {error}")
        print()
    
    async def test_backend_startup(self):
        """Test if backend is running"""
        try:
            response = requests.get(f"{TEST_CONFIG['api_base_url']}/")
            if response.status_code == 200:
                data = response.json()
                features = data.get('features', {})
                
                details = f"Version: {data.get('version')}, Features: {list(features.keys())}"
                self.log_test("Backend Startup", "PASSED", details)
            else:
                self.log_test("Backend Startup", "FAILED", f"Status code: {response.status_code}")
        except Exception as e:
            self.log_test("Backend Startup", "FAILED", error=str(e))
    
    async def test_authentication(self):
        """Test user registration and authentication"""
        try:
            # Register test user
            register_data = TEST_CONFIG['test_user']
            response = requests.post(
                f"{TEST_CONFIG['api_base_url']}/api/v1/auth/register",
                json=register_data
            )
            
            if response.status_code in [200, 400]:  # 400 if user already exists
                # Try login
                login_data = {
                    'email': register_data['email'],
                    'password': register_data['password']
                }
                
                response = requests.post(
                    f"{TEST_CONFIG['api_base_url']}/api/v1/auth/login",
                    json=login_data
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.session_token = data.get('access_token')
                    user_info = data.get('user', {})
                    
                    details = f"User ID: {user_info.get('id')}, Email: {user_info.get('email')}"
                    self.log_test("Authentication", "PASSED", details)
                else:
                    self.log_test("Authentication", "FAILED", f"Login failed: {response.status_code}")
            else:
                self.log_test("Authentication", "FAILED", f"Registration failed: {response.status_code}")
                
        except Exception as e:
            self.log_test("Authentication", "FAILED", error=str(e))
    
    async def test_websocket_connection(self):
        """Test WebSocket connection and handshake"""
        if not self.session_token:
            self.log_test("WebSocket Connection", "SKIPPED", "No session token available")
            return
        
        try:
            uri = f"{TEST_CONFIG['websocket_url']}/ws/{self.session_token}"
            
            # Connect to WebSocket
            self.websocket = await websockets.connect(uri, ping_interval=30)
            
            # Wait for welcome message
            message = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
            data = json.loads(message)
            
            if data.get('type') == 'connection' and data.get('status') == 'connected':
                features = data.get('features', {})
                details = f"Connection ID: {data.get('connection_id')}, Features: {len(features)}"
                self.log_test("WebSocket Connection", "PASSED", details)
            else:
                self.log_test("WebSocket Connection", "FAILED", f"Unexpected welcome message: {data}")
                
        except Exception as e:
            self.log_test("WebSocket Connection", "FAILED", error=str(e))
    
    async def test_ai_chat(self):
        """Test AI chat functionality"""
        if not self.websocket:
            self.log_test("AI Chat", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Send chat message
            chat_message = {
                "type": "chat",
                "agent_id": "business_coach",
                "message": "Hello, this is a test message. Please respond.",
                "session_id": "test_session"
            }
            
            await self.websocket.send(json.dumps(chat_message))
            
            # Wait for typing indicator and response
            response_received = False
            typing_received = False
            
            for _ in range(10):  # Wait up to 10 messages
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=10.0)
                    data = json.loads(message)
                    
                    if data.get('type') == 'typing':
                        typing_received = True
                    elif data.get('type') == 'response':
                        response_received = True
                        agent_name = data.get('agent_name')
                        model = data.get('model', 'unknown')
                        details = f"Agent: {agent_name}, Model: {model}, Response length: {len(data.get('message', ''))}"
                        break
                        
                except asyncio.TimeoutError:
                    break
            
            if response_received:
                self.log_test("AI Chat", "PASSED", details)
            elif typing_received:
                self.log_test("AI Chat", "PARTIAL", "Typing received but no response")
            else:
                self.log_test("AI Chat", "FAILED", "No response received")
                
        except Exception as e:
            self.log_test("AI Chat", "FAILED", error=str(e))
    
    async def test_notifications(self):
        """Test real-time notifications"""
        if not self.websocket:
            self.log_test("Notifications", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Test notification API
            headers = {'Authorization': f'Bearer {self.session_token}'}
            notification_data = {
                'type': 'info',
                'title': 'Test Notification',
                'message': 'This is a test notification from the system test.',
                'priority': 'normal'
            }
            
            response = requests.post(
                f"{TEST_CONFIG['api_base_url']}/api/v1/notifications/send",
                json=notification_data,
                headers=headers
            )
            
            if response.status_code == 200:
                # Wait for notification via WebSocket
                try:
                    message = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                    data = json.loads(message)
                    
                    if data.get('type') == 'notification':
                        details = f"Title: {data.get('title')}, Priority: {data.get('priority')}"
                        self.log_test("Notifications", "PASSED", details)
                    else:
                        self.log_test("Notifications", "FAILED", f"Unexpected message type: {data.get('type')}")
                except asyncio.TimeoutError:
                    self.log_test("Notifications", "FAILED", "Notification not received via WebSocket")
            else:
                self.log_test("Notifications", "FAILED", f"API call failed: {response.status_code}")
                
        except Exception as e:
            self.log_test("Notifications", "FAILED", error=str(e))
    
    async def test_live_data(self):
        """Test live data requests"""
        if not self.websocket:
            self.log_test("Live Data", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Request live data
            live_data_request = {
                "type": "live_data_request",
                "table": "bookings",
                "filters": {}
            }
            
            await self.websocket.send(json.dumps(live_data_request))
            
            # Wait for response
            try:
                message = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                if data.get('type') == 'live_data':
                    table = data.get('table')
                    data_count = len(data.get('data', []))
                    details = f"Table: {table}, Records: {data_count}"
                    self.log_test("Live Data", "PASSED", details)
                elif data.get('type') == 'error':
                    self.log_test("Live Data", "FAILED", f"Error response: {data.get('message')}")
                else:
                    self.log_test("Live Data", "FAILED", f"Unexpected response type: {data.get('type')}")
                    
            except asyncio.TimeoutError:
                self.log_test("Live Data", "FAILED", "No response received")
                
        except Exception as e:
            self.log_test("Live Data", "FAILED", error=str(e))
    
    async def test_booking_updates(self):
        """Test booking update broadcasts"""
        if not self.websocket:
            self.log_test("Booking Updates", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Test booking update API
            headers = {'Authorization': f'Bearer {self.session_token}'}
            booking_data = {
                'booking_id': 'test_booking_123',
                'status': 'confirmed',
                'customer_id': 'test_customer',
                'barber_id': 'test_barber',
                'shop_id': 'test_shop'
            }
            
            response = requests.post(
                f"{TEST_CONFIG['api_base_url']}/api/v1/realtime/booking-update",
                json=booking_data,
                headers=headers
            )
            
            if response.status_code == 200:
                result = response.json()
                details = f"Booking ID: {result.get('booking_id')}, Notifications sent: {result.get('notifications_sent')}"
                self.log_test("Booking Updates", "PASSED", details)
            else:
                self.log_test("Booking Updates", "FAILED", f"API call failed: {response.status_code}")
                
        except Exception as e:
            self.log_test("Booking Updates", "FAILED", error=str(e))
    
    async def test_dashboard_metrics(self):
        """Test dashboard metrics requests"""
        if not self.websocket:
            self.log_test("Dashboard Metrics", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Request dashboard metrics
            metrics_request = {
                "type": "dashboard_metrics",
                "metrics_type": "overview"
            }
            
            await self.websocket.send(json.dumps(metrics_request))
            
            # Wait for response
            try:
                message = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                if data.get('type') == 'dashboard_metrics':
                    metrics_type = data.get('metrics_type')
                    metrics_data = data.get('data', {})
                    details = f"Type: {metrics_type}, Metrics count: {len(metrics_data)}"
                    self.log_test("Dashboard Metrics", "PASSED", details)
                else:
                    self.log_test("Dashboard Metrics", "FAILED", f"Unexpected response: {data}")
                    
            except asyncio.TimeoutError:
                self.log_test("Dashboard Metrics", "FAILED", "No response received")
                
        except Exception as e:
            self.log_test("Dashboard Metrics", "FAILED", error=str(e))
    
    async def test_error_handling(self):
        """Test error handling for invalid requests"""
        if not self.websocket:
            self.log_test("Error Handling", "SKIPPED", "No WebSocket connection")
            return
        
        try:
            # Send invalid message
            invalid_message = {
                "type": "invalid_type",
                "data": "This should trigger an error"
            }
            
            await self.websocket.send(json.dumps(invalid_message))
            
            # The server should handle this gracefully (no crash)
            # Send a valid ping to check if connection is still alive
            ping_message = {"type": "ping", "timestamp": time.time()}
            await self.websocket.send(json.dumps(ping_message))
            
            try:
                message = await asyncio.wait_for(self.websocket.recv(), timeout=5.0)
                data = json.loads(message)
                
                if data.get('type') == 'pong':
                    self.log_test("Error Handling", "PASSED", "Server handled invalid message gracefully")
                else:
                    self.log_test("Error Handling", "PARTIAL", f"Unexpected response: {data.get('type')}")
                    
            except asyncio.TimeoutError:
                self.log_test("Error Handling", "FAILED", "Server may have crashed on invalid message")
                
        except Exception as e:
            self.log_test("Error Handling", "FAILED", error=str(e))
    
    async def test_reconnection(self):
        """Test reconnection logic"""
        # This test is more complex and would require simulating connection drops
        # For now, we'll just test that multiple connections can be established
        try:
            if self.websocket:
                await self.websocket.close()
            
            # Reconnect
            await asyncio.sleep(1)
            await self.test_websocket_connection()
            
            if self.websocket:
                self.log_test("Reconnection", "PASSED", "Successfully reconnected")
            else:
                self.log_test("Reconnection", "FAILED", "Could not reconnect")
                
        except Exception as e:
            self.log_test("Reconnection", "FAILED", error=str(e))
    
    def print_test_results(self):
        """Print comprehensive test results"""
        print("\n" + "=" * 60)
        print("🧪 REAL-TIME SYSTEM TEST RESULTS")
        print("=" * 60)
        
        passed = len([r for r in self.test_results if r['status'] == 'PASSED'])
        failed = len([r for r in self.test_results if r['status'] == 'FAILED'])
        partial = len([r for r in self.test_results if r['status'] == 'PARTIAL'])
        skipped = len([r for r in self.test_results if r['status'] == 'SKIPPED'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Partial: {partial}")
        print(f"⏭️  Skipped: {skipped}")
        
        success_rate = (passed / total * 100) if total > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if r['status'] == 'FAILED']
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        # Show system readiness
        print(f"\n🚀 SYSTEM READINESS:")
        if success_rate >= 80:
            print("✅ System is ready for production!")
        elif success_rate >= 60:
            print("⚠️  System needs some improvements before production")
        else:
            print("❌ System requires significant fixes before production")
        
        print("\n" + "=" * 60)

async def main():
    """Main test runner"""
    tester = RealtimeSystemTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    print("6FB AI Agent System - Real-time Testing Suite")
    print("Make sure the WebSocket backend is running on localhost:8000")
    print()
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
    except Exception as e:
        print(f"\n\n💥 Test suite crashed: {e}")
        sys.exit(1)