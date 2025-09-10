#!/usr/bin/env python3
"""
Test script for enhanced business recommendations system
"""

import asyncio
import json
import sys
import os

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_enhanced_recommendations():
    """Test the enhanced business recommendations service"""
    try:
        print("🧪 Testing Enhanced Business Recommendations System...")
        
        # Import the enhanced service
        from services.business_recommendations_service import business_recommendations_service
        
        print("✅ Successfully imported business_recommendations_service")
        
        # Test with a demo barbershop
        barbershop_id = "demo-barbershop-001"
        
        print(f"🎯 Generating comprehensive recommendations for {barbershop_id}...")
        
        # Generate recommendations
        recommendations = await business_recommendations_service.generate_comprehensive_recommendations(
            barbershop_id=barbershop_id
        )
        
        print("\n📊 Recommendations Generated Successfully!")
        print("=" * 60)
        
        # Display summary
        print(f"Barbershop ID: {recommendations.get('barbershop_id')}")
        print(f"Generated At: {recommendations.get('generated_at')}")
        print(f"Confidence Score: {recommendations.get('confidence_score', 0):.2f}")
        print(f"Total Recommendations: {len(recommendations.get('recommendations', []))}")
        
        # Show AI enhancement stats
        ai_stats = recommendations.get('ai_enhancement_stats', {})
        if ai_stats:
            print(f"\n🤖 AI Enhancement Stats:")
            print(f"  - AI Recommendations: {ai_stats.get('ai_recommendations_count', 0)}")
            print(f"  - Total Recommendations: {ai_stats.get('total_recommendations', 0)}")
            print(f"  - AI Enhancement Ratio: {ai_stats.get('ai_enhancement_ratio', 0):.2f}")
            print(f"  - Confidence Boost: {ai_stats.get('confidence_boost', 0):.2f}")
        
        # Show top 3 recommendations
        recommendations_list = recommendations.get('recommendations', [])
        if recommendations_list:
            print(f"\n🎯 Top 3 Recommendations:")
            for i, rec in enumerate(recommendations_list[:3], 1):
                print(f"\n{i}. {rec.get('title', 'Unknown')}")
                print(f"   Category: {rec.get('category', 'N/A')}")
                print(f"   Impact Score: {rec.get('impact_score', 0):.2f}")
                print(f"   Confidence: {rec.get('confidence', 0):.2f}")
                print(f"   Estimated Value: ${rec.get('estimated_monthly_value', 0)}/month")
                print(f"   AI Generated: {'Yes' if rec.get('ai_generated', False) else 'No'}")
                if rec.get('agent_type'):
                    print(f"   Agent: {rec.get('agent_type')}")
        
        # Show estimated ROI
        roi = recommendations.get('estimated_roi', {})
        if roi:
            print(f"\n💰 Estimated ROI:")
            print(f"  - Monthly Revenue Increase: ${roi.get('monthly_revenue_increase', 0)}")
            print(f"  - Customer Retention Improvement: {roi.get('customer_retention_improvement', 0)*100:.1f}%")
            print(f"  - Operational Cost Savings: ${roi.get('operational_cost_savings', 0)}")
        
        # Show action plan summary
        action_plan = recommendations.get('action_plan', {})
        if action_plan:
            summary = action_plan.get('implementation_summary', {})
            print(f"\n⚡ Action Plan Summary:")
            print(f"  - Immediate Actions: {len(action_plan.get('immediate_actions', []))}")
            print(f"  - Short-term Actions: {len(action_plan.get('short_term_actions', []))}")
            print(f"  - Long-term Actions: {len(action_plan.get('long_term_actions', []))}")
            print(f"  - Total Estimated Value: ${action_plan.get('total_estimated_value', 0)}/month")
        
        print("\n✅ Enhanced Business Recommendations Test Completed Successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_recommendation_status():
    """Test recommendation status tracking"""
    try:
        print("\n🔍 Testing Recommendation Status...")
        
        from services.business_recommendations_service import business_recommendations_service
        
        barbershop_id = "demo-barbershop-001"
        status = await business_recommendations_service.get_recommendation_status(barbershop_id)
        
        print(f"Status for {barbershop_id}:")
        print(json.dumps(status, indent=2, default=str))
        
        return True
        
    except Exception as e:
        print(f"❌ Status test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Enhanced Business Recommendations Tests")
    print("=" * 60)
    
    success_count = 0
    total_tests = 2
    
    # Test 1: Generate recommendations
    if await test_enhanced_recommendations():
        success_count += 1
    
    # Test 2: Check status
    if await test_recommendation_status():
        success_count += 1
    
    print("\n" + "=" * 60)
    print(f"📈 Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        print("🎉 All tests passed! Enhanced recommendations system is working.")
    else:
        print(f"⚠️ {total_tests - success_count} test(s) failed.")
    
    return success_count == total_tests

if __name__ == "__main__":
    asyncio.run(main())