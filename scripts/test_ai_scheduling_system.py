#!/usr/bin/env python3
"""
AI Scheduling System Integration Test
Comprehensive testing of the AI-powered scheduling optimization system
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Add services directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'services'))

from ai_scheduling_service import AISchedulingService, OptimizationGoal, SchedulingRecommendation

class AISchedulingSystemTester:
    """Test suite for AI scheduling system"""
    
    def __init__(self):
        self.service = AISchedulingService()
        self.test_results = {}
        
    async def run_comprehensive_tests(self):
        """Run all AI scheduling system tests"""
        print("🚀 AI Scheduling System Comprehensive Test Suite")
        print("=" * 60)
        
        # Test 1: Basic recommendation generation
        await self.test_basic_recommendations()
        
        # Test 2: Different optimization goals
        await self.test_optimization_goals()
        
        # Test 3: Historical pattern analysis
        await self.test_pattern_analysis()
        
        # Test 4: Performance analytics
        await self.test_performance_analytics()
        
        # Test 5: Real-time optimization
        await self.test_real_time_optimization()
        
        # Test 6: ML model integration
        await self.test_ml_integration()
        
        # Generate final report
        await self.generate_test_report()
        
    async def test_basic_recommendations(self):
        """Test basic scheduling recommendations"""
        print("\n📅 Test 1: Basic Scheduling Recommendations")
        print("-" * 40)
        
        try:
            recommendations = await self.service.get_optimal_scheduling_recommendations(
                barbershop_id="test_barbershop_123",
                service_id="haircut_premium",
                customer_id="customer_456",
                optimization_goal=OptimizationGoal.BALANCED,
                limit=5
            )
            
            if recommendations:
                print(f"✅ Generated {len(recommendations)} recommendations")
                for i, rec in enumerate(recommendations[:3], 1):
                    print(f"   {i}. {rec.recommended_time.strftime('%A, %B %d at %I:%M %p')}")
                    print(f"      Confidence: {rec.confidence_score:.1f}%")
                    print(f"      Priority: {rec.priority.value}")
                    print(f"      Revenue Impact: ${rec.revenue_impact:.2f}")
                    print(f"      Reasoning: {rec.reasoning}")
                    print()
                
                self.test_results['basic_recommendations'] = {
                    'status': 'passed',
                    'recommendation_count': len(recommendations),
                    'avg_confidence': sum(r.confidence_score for r in recommendations) / len(recommendations),
                    'top_revenue_impact': max(r.revenue_impact for r in recommendations)
                }
            else:
                print("❌ No recommendations generated")
                self.test_results['basic_recommendations'] = {'status': 'failed', 'error': 'No recommendations'}
                
        except Exception as e:
            print(f"❌ Error: {e}")
            self.test_results['basic_recommendations'] = {'status': 'error', 'error': str(e)}
    
    async def test_optimization_goals(self):
        """Test different optimization goals"""
        print("\n🎯 Test 2: Optimization Goals")
        print("-" * 40)
        
        goals = [OptimizationGoal.REVENUE, OptimizationGoal.EFFICIENCY, OptimizationGoal.CUSTOMER_SATISFACTION]
        goal_results = {}
        
        for goal in goals:
            try:
                print(f"\nTesting {goal.value} optimization...")
                recommendations = await self.service.get_optimal_scheduling_recommendations(
                    barbershop_id="test_barbershop_123",
                    service_id="full_service",
                    optimization_goal=goal,
                    limit=3
                )
                
                if recommendations:
                    avg_revenue = sum(r.revenue_impact for r in recommendations) / len(recommendations)
                    avg_efficiency = sum(r.efficiency_score for r in recommendations) / len(recommendations)
                    avg_satisfaction = sum(r.customer_satisfaction_score for r in recommendations) / len(recommendations)
                    
                    print(f"✅ {goal.value}: Avg Revenue Impact ${avg_revenue:.2f}, Efficiency {avg_efficiency:.1f}%, Satisfaction {avg_satisfaction:.1f}%")
                    
                    goal_results[goal.value] = {
                        'recommendation_count': len(recommendations),
                        'avg_revenue_impact': avg_revenue,
                        'avg_efficiency_score': avg_efficiency,
                        'avg_satisfaction_score': avg_satisfaction
                    }
                else:
                    print(f"❌ {goal.value}: No recommendations")
                    goal_results[goal.value] = {'error': 'No recommendations'}
                    
            except Exception as e:
                print(f"❌ {goal.value}: Error - {e}")
                goal_results[goal.value] = {'error': str(e)}
        
        self.test_results['optimization_goals'] = goal_results
    
    async def test_pattern_analysis(self):
        """Test historical booking pattern analysis"""
        print("\n📊 Test 3: Pattern Analysis")
        print("-" * 40)
        
        try:
            patterns = await self.service._analyze_booking_patterns(
                barbershop_id="test_barbershop_123",
                service_id="haircut_classic"
            )
            
            print("✅ Pattern Analysis Results:")
            print(f"   Peak Hours: {patterns.get('peak_hours', [])[:3]}")
            print(f"   Peak Days: {patterns.get('peak_days', [])[:3]}")
            print(f"   Avg Lead Time: {patterns.get('avg_lead_time', 0):.1f} days")
            print(f"   Hourly Demand Distribution: {len(patterns.get('hourly_demand', {}))} hours analyzed")
            
            self.test_results['pattern_analysis'] = {
                'status': 'passed',
                'peak_hours_identified': len(patterns.get('peak_hours', [])),
                'peak_days_identified': len(patterns.get('peak_days', [])),
                'avg_lead_time': patterns.get('avg_lead_time', 0),
                'data_completeness': len(patterns.get('hourly_demand', {})) / 24
            }
            
        except Exception as e:
            print(f"❌ Pattern Analysis Error: {e}")
            self.test_results['pattern_analysis'] = {'status': 'error', 'error': str(e)}
    
    async def test_performance_analytics(self):
        """Test scheduling performance analytics"""
        print("\n📈 Test 4: Performance Analytics")
        print("-" * 40)
        
        try:
            performance = await self.service.analyze_scheduling_performance(
                barbershop_id="test_barbershop_123"
            )
            
            if 'error' not in performance:
                print("✅ Performance Analytics:")
                print(f"   Acceptance Rate: {performance.get('acceptance_rate', 0)}%")
                print(f"   Avg Confidence: {performance.get('avg_confidence_score', 0)}%")
                print(f"   Avg Revenue Impact: ${performance.get('avg_revenue_impact', 0):.2f}")
                print(f"   Performance Grade: {performance.get('performance_grade', 'N/A')}")
                
                self.test_results['performance_analytics'] = performance
            else:
                print(f"❌ Performance Analytics Error: {performance['error']}")
                self.test_results['performance_analytics'] = {'status': 'error', 'error': performance['error']}
                
        except Exception as e:
            print(f"❌ Performance Analytics Error: {e}")
            self.test_results['performance_analytics'] = {'status': 'error', 'error': str(e)}
    
    async def test_real_time_optimization(self):
        """Test real-time scheduling optimization"""
        print("\n⚡ Test 5: Real-time Optimization")
        print("-" * 40)
        
        try:
            # Simulate getting available slots
            available_slots = await self.service._get_available_time_slots(
                barbershop_id="test_barbershop_123",
                service_id="beard_trim",
                days_ahead=7
            )
            
            print(f"✅ Found {len(available_slots)} available time slots")
            
            if available_slots:
                # Test slot scoring
                booking_patterns = await self.service._analyze_booking_patterns("test_barbershop_123")
                barber_utilization = await self.service._analyze_barber_utilization("test_barbershop_123")
                
                scored_slots = []
                for slot in available_slots[:5]:  # Test first 5 slots
                    score_data = await self.service._calculate_slot_score(
                        slot, booking_patterns, barber_utilization, OptimizationGoal.BALANCED
                    )
                    scored_slots.append(score_data)
                
                # Sort by score
                scored_slots.sort(key=lambda x: x['overall_score'], reverse=True)
                
                print("   Top 3 Optimized Slots:")
                for i, slot_data in enumerate(scored_slots[:3], 1):
                    time_str = slot_data['time'].strftime('%A %I:%M %p')
                    print(f"   {i}. {time_str} - Score: {slot_data['overall_score']:.1f}")
                
                self.test_results['real_time_optimization'] = {
                    'status': 'passed',
                    'available_slots_found': len(available_slots),
                    'slots_scored': len(scored_slots),
                    'top_score': scored_slots[0]['overall_score'] if scored_slots else 0
                }
            else:
                print("   No available slots found (expected for test data)")
                self.test_results['real_time_optimization'] = {
                    'status': 'passed',
                    'note': 'No slots available for test barbershop'
                }
                
        except Exception as e:
            print(f"❌ Real-time Optimization Error: {e}")
            self.test_results['real_time_optimization'] = {'status': 'error', 'error': str(e)}
    
    async def test_ml_integration(self):
        """Test machine learning integration"""
        print("\n🤖 Test 6: ML Integration")
        print("-" * 40)
        
        try:
            # Test AI reasoning generation
            slot_data = {
                'time': datetime.now() + timedelta(days=2, hours=14),
                'revenue_score': 85.0,
                'efficiency_score': 78.0,
                'satisfaction_score': 82.0,
                'overall_score': 81.7,
                'confidence': 87.0
            }
            
            booking_patterns = await self.service._analyze_booking_patterns("test_barbershop_123")
            
            reasoning = await self.service._generate_ai_reasoning(
                slot_data, booking_patterns, OptimizationGoal.BALANCED
            )
            
            print("✅ AI Reasoning Generation:")
            print(f"   Generated reasoning: {reasoning[:100]}...")
            
            # Test AI provider availability
            ai_providers = []
            if self.service.openai_client:
                ai_providers.append('OpenAI')
            if self.service.anthropic_client:
                ai_providers.append('Anthropic')
            
            print(f"   Available AI Providers: {', '.join(ai_providers) if ai_providers else 'None (using rule-based)'}")
            
            self.test_results['ml_integration'] = {
                'status': 'passed',
                'reasoning_generated': bool(reasoning),
                'reasoning_length': len(reasoning),
                'ai_providers_available': ai_providers,
                'using_ai_providers': len(ai_providers) > 0
            }
            
        except Exception as e:
            print(f"❌ ML Integration Error: {e}")
            self.test_results['ml_integration'] = {'status': 'error', 'error': str(e)}
    
    async def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n📋 COMPREHENSIVE TEST REPORT")
        print("=" * 60)
        
        # Calculate overall statistics
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() 
                          if isinstance(result, dict) and result.get('status') == 'passed')
        error_tests = sum(1 for result in self.test_results.values() 
                         if isinstance(result, dict) and result.get('status') == 'error')
        
        print(f"Total Tests Run: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Errors: {error_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        print("\n📊 DETAILED RESULTS:")
        
        for test_name, result in self.test_results.items():
            print(f"\n{test_name.replace('_', ' ').title()}:")
            if isinstance(result, dict):
                if result.get('status') == 'passed':
                    print("  ✅ PASSED")
                    for key, value in result.items():
                        if key != 'status':
                            print(f"     {key}: {value}")
                elif result.get('status') == 'error':
                    print("  ❌ ERROR")
                    print(f"     Error: {result.get('error', 'Unknown error')}")
                else:
                    print("  📊 RESULTS")
                    for key, value in result.items():
                        print(f"     {key}: {value}")
        
        # Generate summary insights
        print("\n🎯 KEY INSIGHTS:")
        insights = self._generate_insights()
        for insight in insights:
            print(f"• {insight}")
        
        # Save detailed report to file
        report_file = f"ai_scheduling_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                'test_timestamp': datetime.now().isoformat(),
                'overall_stats': {
                    'total_tests': total_tests,
                    'passed_tests': passed_tests,
                    'error_tests': error_tests,
                    'success_rate': (passed_tests/total_tests)*100
                },
                'detailed_results': self.test_results,
                'insights': insights
            }, f, indent=2, default=str)
        
        print(f"\n📄 Detailed report saved to: {report_file}")
        
    def _generate_insights(self):
        """Generate insights from test results"""
        insights = []
        
        # Basic functionality insight
        if self.test_results.get('basic_recommendations', {}).get('status') == 'passed':
            rec_count = self.test_results['basic_recommendations'].get('recommendation_count', 0)
            avg_confidence = self.test_results['basic_recommendations'].get('avg_confidence', 0)
            insights.append(f"AI system successfully generates {rec_count} recommendations with {avg_confidence:.1f}% average confidence")
        
        # Optimization goals insight
        if 'optimization_goals' in self.test_results:
            goal_count = len([g for g in self.test_results['optimization_goals'].values() if 'error' not in g])
            insights.append(f"Successfully tested {goal_count} optimization goals with differentiated results")
        
        # Pattern analysis insight
        if self.test_results.get('pattern_analysis', {}).get('status') == 'passed':
            completeness = self.test_results['pattern_analysis'].get('data_completeness', 0)
            insights.append(f"Pattern analysis covers {completeness*100:.1f}% of daily hours with historical data")
        
        # ML integration insight
        if 'ml_integration' in self.test_results:
            ml_result = self.test_results['ml_integration']
            if ml_result.get('using_ai_providers'):
                providers = ', '.join(ml_result.get('ai_providers_available', []))
                insights.append(f"AI providers ({providers}) are active for intelligent reasoning generation")
            else:
                insights.append("Using rule-based reasoning (AI providers not configured)")
        
        # Performance insight
        if 'performance_analytics' in self.test_results:
            perf = self.test_results['performance_analytics']
            if 'performance_grade' in perf:
                insights.append(f"System performance grade: {perf['performance_grade']} with {perf.get('acceptance_rate', 0)}% acceptance rate")
        
        return insights

async def main():
    """Run the comprehensive AI scheduling system test"""
    tester = AISchedulingSystemTester()
    await tester.run_comprehensive_tests()

if __name__ == "__main__":
    asyncio.run(main())