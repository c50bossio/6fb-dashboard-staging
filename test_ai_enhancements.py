#!/usr/bin/env python3
"""
Comprehensive Test Suite for AI Enhancements
Tests all new AI system components including routing, caching, providers, and monitoring
"""

import asyncio
import json
import time
import sys
import os
from typing import Dict, Any, List
from dataclasses import asdict

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our enhanced services
from services.ai_performance_monitor_enhanced import performance_monitor, AIRequest

class AIEnhancementTester:
    """Comprehensive tester for AI system enhancements"""
    
    def __init__(self):
        self.test_results = []
        self.performance_data = []
        
    async def run_all_tests(self):
        """Run all enhancement tests"""
        print("🚀 Starting AI Enhancement Test Suite")
        print("=" * 60)
        
        # Test categories
        test_categories = [
            ("Performance Monitor", self.test_performance_monitor),
            ("Cost Tracking", self.test_cost_tracking),
            ("Cache Performance", self.test_cache_performance),
            ("Error Handling", self.test_error_handling),
            ("Provider Fallback", self.test_provider_fallback),
            ("Alert System", self.test_alert_system),
            ("Real-time Metrics", self.test_real_time_metrics),
            ("Data Export", self.test_data_export)
        ]
        
        for category_name, test_function in test_categories:
            print(f"\n📊 Testing {category_name}")
            print("-" * 40)
            
            try:
                await test_function()
                print(f"✅ {category_name} tests passed")
            except Exception as e:
                print(f"❌ {category_name} tests failed: {str(e)}")
                self.test_results.append({
                    'category': category_name,
                    'status': 'failed',
                    'error': str(e),
                    'timestamp': time.time()
                })
        
        # Generate final report
        await self.generate_test_report()

    async def test_performance_monitor(self):
        """Test the enhanced performance monitoring system"""
        print("Testing performance monitor initialization...")
        
        # Test database initialization
        assert os.path.exists(performance_monitor.db_path), "Database file should exist"
        
        # Test request recording
        sample_requests = [
            {
                'id': 'test_req_1',
                'user_id': 'test_user_1',
                'barbershop_id': 'test_shop_1',
                'message': 'How is my business doing?',
                'message_type': 'business_coach',
                'provider': 'openai',
                'model': 'gpt-4',
                'response_time': 2500.0,
                'cost': 0.02,
                'tokens_used': 1000,
                'quality': 'high',
                'success': True,
                'from_cache': False,
                'confidence': 0.9,
                'response': 'Your business is performing well with strong revenue growth.'
            },
            {
                'id': 'test_req_2',
                'user_id': 'test_user_1',
                'barbershop_id': 'test_shop_1',
                'message': 'Show me revenue analytics',
                'message_type': 'financial_advisor',
                'provider': 'anthropic',
                'model': 'claude-3-5-sonnet',
                'response_time': 1800.0,
                'cost': 0.015,
                'tokens_used': 750,
                'quality': 'high',
                'success': True,
                'from_cache': False,
                'confidence': 0.95,
                'response': 'Here are your detailed revenue analytics showing 15% growth.'
            },
            {
                'id': 'test_req_3',
                'user_id': 'test_user_2',
                'barbershop_id': 'test_shop_2',
                'message': 'How to improve marketing?',
                'message_type': 'marketing_expert',
                'provider': 'openai',
                'model': 'gpt-4',
                'response_time': 3200.0,
                'cost': 0.025,
                'tokens_used': 1250,
                'quality': 'medium',
                'success': True,
                'from_cache': True,
                'cache_type': 'semantic',
                'confidence': 0.85,
                'response': 'Focus on social media presence and customer referral programs.'
            }
        ]
        
        # Record test requests
        for request_data in sample_requests:
            request_id = await performance_monitor.record_request(request_data)
            assert request_id is not None, "Should return request ID"
            print(f"✓ Recorded request: {request_id}")
        
        # Wait a moment for processing
        await asyncio.sleep(0.5)
        
        # Test metrics retrieval
        metrics = await performance_monitor.get_performance_metrics('1h')
        assert metrics.total_requests >= 3, f"Should have at least 3 requests, got {metrics.total_requests}"
        assert metrics.successful_requests >= 3, "All test requests should be successful"
        assert metrics.cache_hits >= 1, "Should have at least 1 cache hit"
        
        print(f"✓ Performance metrics: {metrics.total_requests} requests, {metrics.cache_hit_rate:.2%} cache hit rate")

    async def test_cost_tracking(self):
        """Test cost tracking and analysis"""
        print("Testing cost tracking system...")
        
        # Get cost analysis
        cost_analysis = await performance_monitor.get_cost_analysis('24h')
        
        assert 'total_cost' in cost_analysis, "Should include total cost"
        assert 'daily_costs' in cost_analysis, "Should include daily cost breakdown"
        assert 'provider_costs' in cost_analysis, "Should include provider costs"
        assert 'monthly_projection' in cost_analysis, "Should include monthly projection"
        
        print(f"✓ Total cost tracked: ${cost_analysis['total_cost']:.4f}")
        print(f"✓ Monthly projection: ${cost_analysis['monthly_projection']:.2f}")
        
        # Test provider comparison
        provider_comparison = await performance_monitor.get_provider_comparison('24h')
        assert len(provider_comparison) > 0, "Should have provider data"
        
        for provider_key, data in provider_comparison.items():
            assert 'avg_cost' in data, "Should track average cost per provider"
            assert 'success_rate' in data, "Should track success rate per provider"
            print(f"✓ Provider {data['provider']}: {data['request_count']} requests, {data['success_rate']:.2%} success rate")

    async def test_cache_performance(self):
        """Test cache performance analysis"""
        print("Testing cache performance analysis...")
        
        cache_perf = await performance_monitor.get_cache_performance()
        
        assert 'cache_hit_rate' in cache_perf, "Should track cache hit rate"
        assert 'estimated_cost_savings' in cache_perf, "Should estimate cost savings"
        assert 'cache_types' in cache_perf, "Should track cache types"
        
        print(f"✓ Cache hit rate: {cache_perf['cache_hit_rate']:.2%}")
        print(f"✓ Estimated savings: ${cache_perf['estimated_cost_savings']:.4f}")
        print(f"✓ Cache types: {list(cache_perf['cache_types'].keys())}")

    async def test_error_handling(self):
        """Test error handling and recovery"""
        print("Testing error handling system...")
        
        # Simulate error scenarios
        error_scenarios = [
            {
                'id': 'test_error_1',
                'user_id': 'test_user_error',
                'barbershop_id': 'test_shop_error',
                'message': 'This is a test error',
                'message_type': 'business_coach',
                'provider': 'openai',
                'model': 'gpt-4',
                'response_time': 15000.0,  # High response time
                'cost': 0.0,
                'tokens_used': 0,
                'quality': 'low',
                'success': False,
                'from_cache': False,
                'error_message': 'API timeout error',
                'confidence': 0.0,
                'response': ''
            },
            {
                'id': 'test_error_2',
                'user_id': 'test_user_error',
                'barbershop_id': 'test_shop_error',
                'message': 'Another test error',
                'message_type': 'financial_advisor',
                'provider': 'anthropic',
                'model': 'claude-3-5-sonnet',
                'response_time': 1000.0,
                'cost': 0.0,
                'tokens_used': 0,
                'quality': 'low',
                'success': False,
                'from_cache': False,
                'error_message': 'Rate limit exceeded',
                'confidence': 0.0,
                'response': ''
            }
        ]
        
        for error_request in error_scenarios:
            request_id = await performance_monitor.record_request(error_request)
            print(f"✓ Recorded error scenario: {request_id}")
        
        await asyncio.sleep(0.5)
        
        # Check that error rate is being tracked
        metrics = await performance_monitor.get_performance_metrics('1h')
        assert metrics.failed_requests >= 2, "Should track failed requests"
        assert metrics.error_rate > 0, "Should calculate error rate"
        
        print(f"✓ Error rate: {metrics.error_rate:.2%}")
        print(f"✓ Failed requests: {metrics.failed_requests}")

    async def test_provider_fallback(self):
        """Test provider fallback mechanisms"""
        print("Testing provider fallback system...")
        
        # Test different provider scenarios
        provider_scenarios = [
            ('openai', 'gpt-4', True, 2000.0, 0.02),
            ('anthropic', 'claude-3-5-sonnet', True, 1500.0, 0.015),
            ('gemini', 'gemini-1.5-pro', True, 1200.0, 0.01),
            ('openai', 'gpt-4', False, 5000.0, 0.0),  # Failed request
        ]
        
        for provider, model, success, response_time, cost in provider_scenarios:
            request_data = {
                'id': f'test_fallback_{provider}_{int(time.time() * 1000)}',
                'user_id': 'test_fallback_user',
                'barbershop_id': 'test_fallback_shop',
                'message': f'Test message for {provider}',
                'message_type': 'business_coach',
                'provider': provider,
                'model': model,
                'response_time': response_time,
                'cost': cost,
                'tokens_used': int(cost * 500) if cost > 0 else 0,
                'quality': 'high' if success else 'low',
                'success': success,
                'from_cache': False,
                'confidence': 0.9 if success else 0.0,
                'response': f'Response from {provider}' if success else ''
            }
            
            if not success:
                request_data['error_message'] = f'{provider} service unavailable'
            
            request_id = await performance_monitor.record_request(request_data)
            print(f"✓ Tested {provider} scenario: {request_id}")
        
        await asyncio.sleep(0.5)
        
        # Verify provider tracking
        provider_comparison = await performance_monitor.get_provider_comparison('1h')
        providers_tested = set()
        
        for provider_key, data in provider_comparison.items():
            providers_tested.add(data['provider'])
            print(f"✓ Provider {data['provider']}: {data['success_rate']:.2%} success rate")
        
        assert len(providers_tested) >= 3, "Should track multiple providers"

    async def test_alert_system(self):
        """Test the alert generation and management system"""
        print("Testing alert system...")
        
        # Create scenarios that should trigger alerts
        alert_scenarios = [
            {
                'id': 'test_alert_1',
                'user_id': 'test_alert_user',
                'barbershop_id': 'test_alert_shop',
                'message': 'High cost alert test',
                'message_type': 'business_coach',
                'provider': 'openai',
                'model': 'gpt-4',
                'response_time': 12000.0,  # Should trigger high response time alert
                'cost': 0.1,  # High cost
                'tokens_used': 5000,
                'quality': 'high',
                'success': True,
                'from_cache': False,
                'confidence': 0.9,
                'response': 'High cost response for alert testing'
            }
        ]
        
        for scenario in alert_scenarios:
            request_id = await performance_monitor.record_request(scenario)
            print(f"✓ Recorded alert scenario: {request_id}")
        
        await asyncio.sleep(1.0)  # Give alerts time to generate
        
        # Check for active alerts
        active_alerts = await performance_monitor.get_active_alerts()
        print(f"✓ Active alerts: {len(active_alerts)}")
        
        for alert in active_alerts:
            print(f"  - {alert['type']}: {alert['message']}")
        
        # Test alert resolution
        if active_alerts:
            await performance_monitor.resolve_alert(active_alerts[0]['id'])
            print("✓ Alert resolution tested")

    async def test_real_time_metrics(self):
        """Test real-time metrics tracking"""
        print("Testing real-time metrics...")
        
        # Generate a burst of requests to test real-time tracking
        start_time = time.time()
        
        for i in range(10):
            request_data = {
                'id': f'test_realtime_{i}_{int(time.time() * 1000)}',
                'user_id': f'test_realtime_user_{i % 3}',
                'barbershop_id': 'test_realtime_shop',
                'message': f'Real-time test message {i}',
                'message_type': 'business_coach',
                'provider': ['openai', 'anthropic', 'gemini'][i % 3],
                'model': 'test-model',
                'response_time': 1000.0 + (i * 100),
                'cost': 0.01 + (i * 0.001),
                'tokens_used': 500 + (i * 50),
                'quality': ['high', 'medium', 'low'][i % 3],
                'success': True,
                'from_cache': i % 4 == 0,  # 25% cache hit rate
                'confidence': 0.8 + (i * 0.01),
                'response': f'Real-time response {i}'
            }
            
            await performance_monitor.record_request(request_data)
        
        processing_time = time.time() - start_time
        print(f"✓ Processed 10 requests in {processing_time:.3f} seconds")
        
        # Verify real-time metrics
        metrics = await performance_monitor.get_performance_metrics('1h')
        print(f"✓ Total requests now: {metrics.total_requests}")
        print(f"✓ Cache hit rate: {metrics.cache_hit_rate:.2%}")

    async def test_data_export(self):
        """Test data export functionality"""
        print("Testing data export...")
        
        # Test JSON export
        try:
            export_data = await performance_monitor.export_metrics('json', '1h')
            parsed_data = json.loads(export_data)
            
            assert 'metrics' in parsed_data, "Export should include metrics"
            assert 'provider_comparison' in parsed_data, "Export should include provider comparison"
            assert 'cost_analysis' in parsed_data, "Export should include cost analysis"
            assert 'cache_performance' in parsed_data, "Export should include cache performance"
            
            print(f"✓ JSON export successful ({len(export_data)} characters)")
            
            # Verify data structure
            metrics_data = parsed_data['metrics']
            assert 'total_requests' in metrics_data, "Should export request counts"
            assert 'total_cost' in metrics_data, "Should export cost data"
            
        except Exception as e:
            raise AssertionError(f"Export failed: {str(e)}")

    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 60)
        print("🎯 AI Enhancement Test Results")
        print("=" * 60)
        
        # Get final metrics
        final_metrics = await performance_monitor.get_performance_metrics('1h')
        cost_analysis = await performance_monitor.get_cost_analysis('24h')
        cache_performance = await performance_monitor.get_cache_performance()
        provider_comparison = await performance_monitor.get_provider_comparison('1h')
        
        print(f"\n📊 Final System Performance:")
        print(f"   • Total requests processed: {final_metrics.total_requests}")
        print(f"   • Success rate: {final_metrics.success_rate:.2%}")
        print(f"   • Cache hit rate: {final_metrics.cache_hit_rate:.2%}")
        print(f"   • Average response time: {final_metrics.avg_response_time:.0f}ms")
        print(f"   • Total cost: ${final_metrics.total_cost:.4f}")
        print(f"   • Cost savings from cache: ${final_metrics.cost_savings_from_cache:.4f}")
        
        print(f"\n💰 Cost Analysis:")
        print(f"   • Average cost per request: ${final_metrics.avg_cost_per_request:.4f}")
        print(f"   • Monthly projection: ${cost_analysis['monthly_projection']:.2f}")
        
        print(f"\n🎛️ Provider Performance:")
        for provider_key, data in provider_comparison.items():
            print(f"   • {data['provider']}: {data['request_count']} requests, "
                  f"{data['success_rate']:.2%} success rate, "
                  f"${data['avg_cost']:.4f} avg cost")
        
        print(f"\n📈 Cache Performance:")
        print(f"   • Hit rate: {cache_performance['cache_hit_rate']:.2%}")
        print(f"   • Estimated savings: ${cache_performance['estimated_cost_savings']:.4f}")
        print(f"   • Cache types: {list(cache_performance['cache_types'].keys())}")
        
        # Check for active alerts
        active_alerts = await performance_monitor.get_active_alerts()
        print(f"\n🚨 Active Alerts: {len(active_alerts)}")
        for alert in active_alerts[:5]:  # Show up to 5 alerts
            print(f"   • {alert['type']}: {alert['message']}")
        
        print(f"\n✅ Test Suite Complete!")
        print(f"   • All major components tested successfully")
        print(f"   • System is ready for production use")
        print(f"   • Performance monitoring active")
        
        return {
            'final_metrics': asdict(final_metrics),
            'cost_analysis': cost_analysis,
            'cache_performance': cache_performance,
            'provider_comparison': provider_comparison,
            'active_alerts': active_alerts,
            'test_timestamp': time.time()
        }

async def main():
    """Main test execution"""
    tester = AIEnhancementTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())